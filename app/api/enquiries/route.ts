import { getContext } from "@netlify/functions";
import { isIP } from "node:net";
import { z } from "zod";
import {
  getEnquiryAllowedOrigins,
} from "@/lib/server/env";
import {
  enquirySchema,
  type ValidatedEnquiry,
} from "@/lib/server/enquiry-schema";
import {
  getSupabaseAdminClient,
} from "@/lib/server/supabase-admin";
import {
  InvalidClientIpError,
  RateLimitUnavailableError,
  limitEnquiryAttempts,
} from "@/lib/server/rate-limit";

const MAX_REQUEST_BYTES = 32 * 1024;
const SUCCESS_BODY = {
  success: true,
  message: "Thank you. Your enquiry has been received.",
} as const;
const UUID_SCHEMA = z.string().uuid();
const ENQUIRY_FIELDS = ["name", "email", "phone", "message"] as const;

type EnquiryDatabasePayload = ValidatedEnquiry & {
  idempotency_key: string;
};

type ExistingEnquiry = ValidatedEnquiry & {
  idempotency_key: string;
};

type IdempotencyResolution =
  | "matching"
  | "conflict"
  | "not_found"
  | "unknown";

class RequestBodyTooLargeError extends Error {}
class InvalidRequestBodyError extends Error {}

function jsonResponse(
  body: Record<string, unknown>,
  status: number,
  headers?: HeadersInit,
): Response {
  return Response.json(body, { status, headers });
}

function errorResponse(
  status: number,
  message: string,
  headers?: HeadersInit,
): Response {
  return jsonResponse({ success: false, message }, status, headers);
}

function isAllowedOrigin(originHeader: string | null): boolean {
  if (!originHeader || originHeader === "null") return false;

  let originUrl: URL;
  try {
    originUrl = new URL(originHeader);
  } catch {
    return false;
  }

  if (
    originUrl.origin !== originHeader ||
    originUrl.username ||
    originUrl.password ||
    originUrl.pathname !== "/" ||
    originUrl.search ||
    originUrl.hash
  ) {
    return false;
  }

  try {
    return getEnquiryAllowedOrigins().includes(originHeader);
  } catch {
    throw new Error("Enquiry origin configuration is unavailable.");
  }
}

function hasJsonContentType(contentType: string | null): boolean {
  return contentType?.split(";", 1)[0]?.trim().toLowerCase() === "application/json";
}

function hasOversizedContentLength(request: Request): boolean {
  const contentLength = request.headers.get("content-length");
  if (!contentLength || !/^\d+$/.test(contentLength)) return false;

  const declaredBytes = Number(contentLength);
  return !Number.isSafeInteger(declaredBytes) || declaredBytes > MAX_REQUEST_BYTES;
}

async function readJsonBody(request: Request): Promise<unknown> {
  if (hasOversizedContentLength(request)) {
    throw new RequestBodyTooLargeError();
  }

  if (!request.body) throw new InvalidRequestBodyError();

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let byteLength = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      byteLength += value.byteLength;
      if (byteLength > MAX_REQUEST_BYTES) {
        await reader.cancel().catch(() => undefined);
        throw new RequestBodyTooLargeError();
      }

      chunks.push(value);
    }
  } catch (error) {
    if (error instanceof RequestBodyTooLargeError) throw error;
    throw new InvalidRequestBodyError();
  } finally {
    reader.releaseLock();
  }

  const bytes = new Uint8Array(byteLength);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }

  try {
    return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
  } catch {
    throw new InvalidRequestBodyError();
  }
}

function getRequestFields(
  body: unknown,
): { enquiry: unknown; honeypotFilled: boolean } | null {
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return null;
  }

  const record = body as Record<string, unknown>;
  if (
    Object.hasOwn(record, "website") &&
    typeof record.website !== "string"
  ) {
    return null;
  }

  return {
    enquiry: {
      name: record.name,
      email: record.email,
      phone: record.phone,
      message: record.message,
    },
    honeypotFilled:
      typeof record.website === "string" && record.website.trim().length > 0,
  };
}

function validationResponse(error: z.ZodError): Response {
  const errors: Record<string, string> = {};

  for (const issue of error.issues) {
    const field = issue.path[0];
    if (
      typeof field === "string" &&
      ENQUIRY_FIELDS.includes(field as (typeof ENQUIRY_FIELDS)[number]) &&
      !errors[field]
    ) {
      errors[field] = issue.message;
    }
  }

  return jsonResponse(
    {
      success: false,
      message: "Please check the enquiry details and try again.",
      errors,
    },
    422,
  );
}

function hasSamePayload(
  existing: ExistingEnquiry,
  incoming: EnquiryDatabasePayload,
): boolean {
  return (
    existing.name === incoming.name &&
    existing.email === incoming.email &&
    existing.phone === incoming.phone &&
    existing.message === incoming.message
  );
}

async function resolveExistingEnquiry(
  idempotencyKey: string,
  incoming: EnquiryDatabasePayload,
): Promise<IdempotencyResolution> {
  try {
    const { data, error } = await getSupabaseAdminClient()
      .from("portfolio_enquiries")
      .select("idempotency_key, name, email, phone, message")
      .eq("idempotency_key", idempotencyKey)
      .maybeSingle();

    if (error) return "unknown";
    if (!data) return "not_found";
    return hasSamePayload(data as ExistingEnquiry, incoming)
      ? "matching"
      : "conflict";
  } catch {
    return "unknown";
  }
}

async function storeEnquiry(
  payload: EnquiryDatabasePayload,
): Promise<IdempotencyResolution | "stored"> {
  const existing = await resolveExistingEnquiry(
    payload.idempotency_key,
    payload,
  );
  if (existing !== "not_found") return existing;

  try {
    const { error } = await getSupabaseAdminClient()
      .from("portfolio_enquiries")
      .insert(payload);

    if (!error) return "stored";
  } catch {
    // The insert outcome may be ambiguous; resolve it by the idempotency key.
  }

  return resolveExistingEnquiry(payload.idempotency_key, payload);
}

async function processRequest(request: Request): Promise<Response> {
  if (!hasJsonContentType(request.headers.get("content-type"))) {
    return errorResponse(415, "Send this request as JSON.");
  }

  if (!request.headers.get("origin")) {
    return errorResponse(403, "This request is not allowed.");
  }

  let allowedOrigin: boolean;
  try {
    allowedOrigin = isAllowedOrigin(request.headers.get("origin"));
  } catch {
    return errorResponse(503, "Enquiries are temporarily unavailable.");
  }
  if (!allowedOrigin) return errorResponse(403, "This request is not allowed.");

  const idempotencyKey = request.headers.get("idempotency-key");
  if (!idempotencyKey || !UUID_SCHEMA.safeParse(idempotencyKey).success) {
    return errorResponse(400, "A valid idempotency key is required.");
  }

  let body: unknown;
  try {
    body = await readJsonBody(request);
  } catch (error) {
    if (error instanceof RequestBodyTooLargeError) {
      return errorResponse(413, "The request is too large.");
    }
    if (error instanceof InvalidRequestBodyError) {
      return errorResponse(400, "The request body must be valid JSON.");
    }
    throw error;
  }

  const requestFields = getRequestFields(body);
  if (!requestFields) return errorResponse(400, "The request body is invalid.");

  const parsedEnquiry = enquirySchema.safeParse(requestFields.enquiry);
  if (!parsedEnquiry.success) return validationResponse(parsedEnquiry.error);

  let clientIp: string | undefined;
  try {
    clientIp = getContext().ip;
  } catch {
    return errorResponse(503, "Enquiries are temporarily unavailable.");
  }
  if (!clientIp || isIP(clientIp) === 0) {
    return errorResponse(503, "Enquiries are temporarily unavailable.");
  }

  let rateLimit;
  try {
    rateLimit = await limitEnquiryAttempts(clientIp);
  } catch (error) {
    if (
      error instanceof InvalidClientIpError ||
      error instanceof RateLimitUnavailableError
    ) {
      return errorResponse(503, "Enquiries are temporarily unavailable.");
    }
    return errorResponse(503, "Enquiries are temporarily unavailable.");
  }

  if (!rateLimit.allowed) {
    return errorResponse(
      429,
      "Too many attempts. Please try again later.",
      { "Retry-After": String(rateLimit.retryAfterSeconds) },
    );
  }

  if (requestFields.honeypotFilled) {
    return jsonResponse(SUCCESS_BODY, 202);
  }

  const payload: EnquiryDatabasePayload = {
    idempotency_key: idempotencyKey,
    ...parsedEnquiry.data,
  };

  let persistenceResult: IdempotencyResolution | "stored";
  try {
    persistenceResult = await storeEnquiry(payload);
  } catch {
    return errorResponse(503, "Enquiries are temporarily unavailable.");
  }

  if (persistenceResult === "stored" || persistenceResult === "matching") {
    return jsonResponse(SUCCESS_BODY, 202);
  }
  if (persistenceResult === "conflict") {
    return errorResponse(
      409,
      "This idempotency key was already used for a different enquiry.",
    );
  }

  return errorResponse(503, "Enquiries are temporarily unavailable.");
}

export async function POST(request: Request): Promise<Response> {
  try {
    return await processRequest(request);
  } catch {
    return errorResponse(500, "An unexpected error occurred.");
  }
}
