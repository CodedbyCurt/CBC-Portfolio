import "server-only";

import { createHmac } from "node:crypto";
import { isIP } from "node:net";
import { getSupabaseEnvironment } from "@/lib/server/env";
import { getSupabaseAdminClient } from "@/lib/server/supabase-admin";

const VERCEL_CLIENT_IP_HEADER = "x-vercel-forwarded-for";
const NETLIFY_CLIENT_IP_HEADER = "x-nf-client-connection-ip";
const RATE_LIMIT_RPC = "consume_portfolio_enquiry_rate_limit";

type RateLimitResult = {
  allowed: boolean;
  retry_after_seconds: number;
};

function isRateLimitResult(value: unknown): value is RateLimitResult {
  if (typeof value !== "object" || value === null) return false;
  if (!("allowed" in value) || typeof value.allowed !== "boolean") return false;
  return (
    "retry_after_seconds" in value &&
    typeof value.retry_after_seconds === "number" &&
    Number.isInteger(value.retry_after_seconds)
  );
}

function normalizeClientAddress(address: string): string | null {
  const family = isIP(address);
  if (family === 4) return `ipv4:${address}`;
  if (family !== 6) return null;

  const hostname = new URL(`http://[${address}]/`).hostname.slice(1, -1);
  const halves = hostname.split("::");
  const left = halves[0] ? halves[0].split(":") : [];
  const right = halves[1] ? halves[1].split(":") : [];
  const groups = [...left, ...Array(8 - left.length - right.length).fill("0"), ...right]
    .map((group) => Number.parseInt(group, 16));

  if (groups.length !== 8 || groups.some((group) => !Number.isInteger(group))) {
    return null;
  }

  const isIpv4Mapped =
    groups.slice(0, 5).every((group) => group === 0) && groups[5] === 0xffff;
  if (isIpv4Mapped) {
    const high = groups[6];
    const low = groups[7];
    return `ipv4:${high >> 8}.${high & 255}.${low >> 8}.${low & 255}`;
  }

  return `ipv6:${groups
    .slice(0, 4)
    .map((group) => group.toString(16).padStart(4, "0"))
    .join(":")}/64`;
}

export function getEnquiryClientAddress(request: Request): string | null {
  const forwardedAddress =
    request.headers.get(VERCEL_CLIENT_IP_HEADER) ??
    request.headers.get(NETLIFY_CLIENT_IP_HEADER);

  if (!forwardedAddress) {
    return process.env.NODE_ENV === "production" ? null : "127.0.0.1";
  }

  const address = forwardedAddress.trim();
  return normalizeClientAddress(address) ? address : null;
}

export async function consumeEnquiryRateLimit(
  clientAddress: string,
): Promise<{ allowed: boolean; retryAfterSeconds: number }> {
  const normalizedAddress = normalizeClientAddress(clientAddress);
  if (!normalizedAddress) throw new Error("Invalid enquiry client address.");

  const { SUPABASE_SERVICE_ROLE_KEY } = getSupabaseEnvironment();
  const fingerprint = createHmac("sha256", SUPABASE_SERVICE_ROLE_KEY)
    .update(`portfolio-enquiry-rate-limit:v1:${normalizedAddress}`)
    .digest("hex");
  const { data, error } = await getSupabaseAdminClient().rpc(RATE_LIMIT_RPC, {
    p_client_fingerprint: fingerprint,
  });

  if (error) throw new Error("Enquiry rate limiter is unavailable.");

  const result: unknown = Array.isArray(data) ? data[0] : data;
  if (!isRateLimitResult(result)) {
    throw new Error("Enquiry rate limiter returned an invalid response.");
  }

  return {
    allowed: result.allowed,
    retryAfterSeconds: Math.min(
      900,
      Math.max(1, result.retry_after_seconds),
    ),
  };
}
