import "server-only";

import { createHmac } from "node:crypto";
import { isIP } from "node:net";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import {
  getRateLimitEnvironment,
  type RateLimitEnvironment,
} from "@/lib/server/env";

const ENQUIRY_LIMIT = 5;
const ENQUIRY_WINDOW = "10 m";
const ENQUIRY_PREFIX = "cbc-portfolio:enquiries";
const UPSTASH_TIMEOUT_MS = 5000;

export type EnquiryRateLimitResult =
  | {
      allowed: true;
      limit: typeof ENQUIRY_LIMIT;
      remaining: number;
      resetAt: number;
    }
  | {
      allowed: false;
      limit: typeof ENQUIRY_LIMIT;
      remaining: 0;
      resetAt: number;
      retryAfterSeconds: number;
    };

export class InvalidClientIpError extends Error {
  constructor() {
    super("A valid client IP address is required for rate limiting.");
    this.name = "InvalidClientIpError";
  }
}

export class RateLimitUnavailableError extends Error {
  constructor() {
    super("Enquiry rate limiting is temporarily unavailable.");
    this.name = "RateLimitUnavailableError";
  }
}

let enquiryRateLimiter: Ratelimit | undefined;

function getEnquiryRateLimiter(environment: RateLimitEnvironment): Ratelimit {
  if (!enquiryRateLimiter) {
    const redis = new Redis({
      url: environment.UPSTASH_REDIS_REST_URL,
      token: environment.UPSTASH_REDIS_REST_TOKEN,
    });

    enquiryRateLimiter = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(ENQUIRY_LIMIT, ENQUIRY_WINDOW),
      prefix: ENQUIRY_PREFIX,
      analytics: false,
      enableTelemetry: false,
      timeout: UPSTASH_TIMEOUT_MS,
    });
  }

  return enquiryRateLimiter;
}

function hashClientIp(clientIp: string, secret: string): string {
  const canonicalIp =
    isIP(clientIp) === 6
      ? new URL(`http://[${clientIp}]/`).hostname.slice(1, -1)
      : clientIp;

  return createHmac("sha256", secret).update(canonicalIp).digest("hex");
}

export async function limitEnquiryAttempts(
  clientIp: string | null | undefined,
): Promise<EnquiryRateLimitResult> {
  if (typeof clientIp !== "string" || isIP(clientIp) === 0) {
    throw new InvalidClientIpError();
  }

  try {
    const environment = getRateLimitEnvironment();
    const identifier = hashClientIp(clientIp, environment.RATE_LIMIT_HASH_SECRET);
    const response = await getEnquiryRateLimiter(environment).limit(identifier);

    if (response.reason === "timeout") {
      throw new Error("Upstash rate-limit request timed out.");
    }

    if (response.success) {
      return {
        allowed: true,
        limit: ENQUIRY_LIMIT,
        remaining: response.remaining,
        resetAt: response.reset,
      };
    }

    return {
      allowed: false,
      limit: ENQUIRY_LIMIT,
      remaining: 0,
      resetAt: response.reset,
      retryAfterSeconds: Math.max(1, Math.ceil((response.reset - Date.now()) / 1000)),
    };
  } catch {
    throw new RateLimitUnavailableError();
  }
}
