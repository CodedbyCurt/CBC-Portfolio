import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  class InvalidClientIpError extends Error {}
  class RateLimitUnavailableError extends Error {}

  const query = {
    insert: vi.fn(),
    select: vi.fn(),
    eq: vi.fn(),
    maybeSingle: vi.fn(),
  };

  return {
    InvalidClientIpError,
    RateLimitUnavailableError,
    getContext: vi.fn((): { ip?: string } => ({ ip: "198.51.100.42" })),
    getSupabaseAdminClient: vi.fn(() => ({
      from: vi.fn(() => query),
    })),
    limitEnquiryAttempts: vi.fn(),
    query,
  };
});

vi.mock("@netlify/functions", () => ({
  getContext: mocks.getContext,
}));

vi.mock("@/lib/server/supabase-admin", () => ({
  getSupabaseAdminClient: mocks.getSupabaseAdminClient,
}));

vi.mock("@/lib/server/rate-limit", () => ({
  InvalidClientIpError: mocks.InvalidClientIpError,
  RateLimitUnavailableError: mocks.RateLimitUnavailableError,
  limitEnquiryAttempts: mocks.limitEnquiryAttempts,
}));

import { POST } from "@/app/api/enquiries/route";

const ROUTE_URL = "https://portfolio.example.test/api/enquiries";
const ALLOWED_ORIGIN = "https://portfolio.example.test";
const IDEMPOTENCY_KEY = "123e4567-e89b-42d3-a456-426614174000";
const MAX_BODY_BYTES = 32 * 1024;
const validPayload = {
  name: "Example Customer",
  email: "customer@example.test",
  phone: "+1 (202) 555-0101",
  message: "I would like to discuss a website.",
};
const successfulRateLimit = {
  allowed: true as const,
  limit: 5 as const,
  remaining: 4,
  resetAt: Date.now() + 60_000,
};
const originalEnvironment = {
  origins: process.env.ENQUIRY_ALLOWED_ORIGINS,
};

function setNodeEnvironment(value: string) {
  vi.stubEnv("NODE_ENV", value);
}

function makeRequest(
  body: unknown = validPayload,
  options: {
    origin?: string | null;
    idempotencyKey?: string | null;
    contentType?: string;
    headers?: HeadersInit;
    rawBody?: string;
  } = {},
): Request {
  const headers = new Headers(options.headers);
  headers.set("content-type", options.contentType ?? "application/json");
  if (options.origin !== null) {
    headers.set("origin", options.origin ?? ALLOWED_ORIGIN);
  }
  if (options.idempotencyKey !== null) {
    headers.set("idempotency-key", options.idempotencyKey ?? IDEMPOTENCY_KEY);
  }

  return new Request(ROUTE_URL, {
    method: "POST",
    headers,
    body: options.rawBody ?? JSON.stringify(body),
  });
}

function createStreamRequest(
  chunks: string[],
  headers: HeadersInit = {},
): { request: Request; wasCancelled: () => boolean } {
  let cancelled = false;
  const encoder = new TextEncoder();
  let chunkIndex = 0;
  const stream = new ReadableStream<Uint8Array>({
    pull(controller) {
      if (chunkIndex >= chunks.length) {
        controller.close();
        return;
      }
      controller.enqueue(encoder.encode(chunks[chunkIndex]));
      chunkIndex += 1;
    },
    cancel() {
      cancelled = true;
    },
  });
  const request = new Request(ROUTE_URL, {
    method: "POST",
    headers: new Headers({
      "content-type": "application/json",
      origin: ALLOWED_ORIGIN,
      "idempotency-key": IDEMPOTENCY_KEY,
      ...Object.fromEntries(new Headers(headers)),
    }),
    body: stream,
    duplex: "half",
  } as RequestInit);

  return { request, wasCancelled: () => cancelled };
}

async function responseJson(response: Response) {
  return response.json() as Promise<Record<string, unknown>>;
}

function matchingStoredRow() {
  return {
    idempotency_key: IDEMPOTENCY_KEY,
    ...validPayload,
  };
}

describe("POST /api/enquiries", () => {
  beforeEach(() => {
    process.env.ENQUIRY_ALLOWED_ORIGINS = ALLOWED_ORIGIN;
    setNodeEnvironment("test");
    mocks.getContext.mockReset();
    mocks.getContext.mockReturnValue({ ip: "198.51.100.42" });
    mocks.getSupabaseAdminClient.mockReset();
    mocks.getSupabaseAdminClient.mockReturnValue({
      from: vi.fn(() => mocks.query),
    });
    mocks.limitEnquiryAttempts.mockReset();
    mocks.limitEnquiryAttempts.mockResolvedValue(successfulRateLimit);
    mocks.query.insert.mockReset();
    mocks.query.insert.mockResolvedValue({ error: null });
    mocks.query.select.mockReset();
    mocks.query.select.mockReturnValue(mocks.query);
    mocks.query.eq.mockReset();
    mocks.query.eq.mockReturnValue(mocks.query);
    mocks.query.maybeSingle.mockReset();
    mocks.query.maybeSingle.mockResolvedValue({ data: null, error: null });
  });

  afterEach(() => {
    if (originalEnvironment.origins === undefined) {
      delete process.env.ENQUIRY_ALLOWED_ORIGINS;
    } else {
      process.env.ENQUIRY_ALLOWED_ORIGINS = originalEnvironment.origins;
    }
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("stores a new enquiry and returns the generic 202 acknowledgement", async () => {
    const response = await POST(makeRequest());

    expect(response.status).toBe(202);
    expect(await responseJson(response)).toEqual({
      success: true,
      message: "Thank you. Your enquiry has been received.",
    });
    expect(mocks.query.insert).toHaveBeenCalledWith({
      idempotency_key: IDEMPOTENCY_KEY,
      ...validPayload,
    });
    expect(mocks.getContext).toHaveBeenCalledOnce();
    expect(mocks.limitEnquiryAttempts).toHaveBeenCalledWith("198.51.100.42");
  });

  it.each([
    ["email-only", { ...validPayload, phone: "" }, null],
    ["phone-only", { ...validPayload, email: "" }, null],
  ])("accepts %s contact and stores normalized values", async (_label, payload) => {
    const response = await POST(makeRequest(payload));
    const inserted = mocks.query.insert.mock.calls[0]?.[0];

    expect(response.status).toBe(202);
    expect(inserted?.email).toBe(payload.email || null);
    expect(inserted?.phone).toBe(payload.phone || null);
  });

  it.each([
    ["missing", null],
    ["null", "null"],
    ["malformed", "not an origin"],
    ["unapproved", "https://attacker.example.test"],
    ["path-bearing", `${ALLOWED_ORIGIN}/path`],
  ])("rejects %s Origin", async (_label, origin) => {
    const response = await POST(makeRequest(validPayload, { origin }));

    expect(response.status).toBe(403);
    expect(mocks.limitEnquiryAttempts).not.toHaveBeenCalled();
    expect(mocks.query.insert).not.toHaveBeenCalled();
  });

  it("fails closed when the origin allowlist is missing or invalid", async () => {
    delete process.env.ENQUIRY_ALLOWED_ORIGINS;

    const response = await POST(makeRequest());

    expect(response.status).toBe(503);
    expect(mocks.query.insert).not.toHaveBeenCalled();
  });

  it("rejects malformed JSON", async () => {
    const response = await POST(
      makeRequest(null, { rawBody: '{"name":' }),
    );

    expect(response.status).toBe(400);
  });

  it("returns a safe error when the request body stream fails while reading", async () => {
    let readCount = 0;
    const stream = new ReadableStream<Uint8Array>({
      pull(controller) {
        if (readCount === 0) {
          controller.enqueue(new TextEncoder().encode('{"name":'));
          readCount += 1;
          return;
        }
        controller.error(new Error("private stream failure"));
      },
    });
    const request = new Request(ROUTE_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        origin: ALLOWED_ORIGIN,
        "idempotency-key": IDEMPOTENCY_KEY,
      },
      body: stream,
      duplex: "half",
    } as RequestInit);

    const response = await POST(request);
    const body = JSON.stringify(await responseJson(response));

    expect(response.status).toBe(400);
    expect(body).not.toContain("private stream failure");
    expect(mocks.query.insert).not.toHaveBeenCalled();
  });

  it("accepts a valid request whose body is exactly at the byte limit", async () => {
    const compactBody = JSON.stringify({ ...validPayload, ignored: "" });
    const compactLength = new TextEncoder().encode(compactBody).byteLength;
    const rawBody = JSON.stringify({
      ...validPayload,
      ignored: "x".repeat(MAX_BODY_BYTES - compactLength),
    });

    expect(new TextEncoder().encode(rawBody).byteLength).toBe(MAX_BODY_BYTES);

    const response = await POST(makeRequest(null, { rawBody }));

    expect(response.status).toBe(202);
    expect(mocks.query.insert).toHaveBeenCalledWith({
      idempotency_key: IDEMPOTENCY_KEY,
      ...validPayload,
    });
  });

  it("rejects invalid UTF-8 request data without inserting it", async () => {
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(
          new Uint8Array([
            0x7b, 0x22, 0x6e, 0x61, 0x6d, 0x65, 0x22, 0x3a, 0x22, 0xff, 0x22,
            0x7d,
          ]),
        );
        controller.close();
      },
    });
    const request = new Request(ROUTE_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        origin: ALLOWED_ORIGIN,
        "idempotency-key": IDEMPOTENCY_KEY,
      },
      body: stream,
      duplex: "half",
    } as RequestInit);

    const response = await POST(request);

    expect(response.status).toBe(400);
    expect(mocks.query.insert).not.toHaveBeenCalled();
  });

  it("rejects unsupported content types", async () => {
    const response = await POST(
      makeRequest(validPayload, { contentType: "text/plain" }),
    );

    expect(response.status).toBe(415);
  });

  it("rejects an oversized declared Content-Length before reading the body", async () => {
    const response = await POST(
      makeRequest(validPayload, {
        headers: { "content-length": String(MAX_BODY_BYTES + 1) },
      }),
    );

    expect(response.status).toBe(413);
    expect(mocks.getContext).not.toHaveBeenCalled();
  });

  it("rejects actual streamed bytes over the limit and cancels the stream", async () => {
    const { request, wasCancelled } = createStreamRequest([
      " ".repeat(MAX_BODY_BYTES - 1),
      "xx",
    ]);

    const response = await POST(request);

    expect(response.status).toBe(413);
    expect(wasCancelled()).toBe(true);
    expect(mocks.getContext).not.toHaveBeenCalled();
  });

  it("enforces actual bytes when Content-Length is absent or misleading", async () => {
    for (const headers of [{}, { "content-length": "1" }] as HeadersInit[]) {
      const { request } = createStreamRequest(
        ['{"name":"' + "x".repeat(MAX_BODY_BYTES) + '"}'],
        headers,
      );
      const response = await POST(request);
      expect(response.status).toBe(413);
    }
  });

  it.each([
    ["missing", null],
    ["invalid", "not-a-uuid"],
  ])("rejects a %s idempotency key", async (_label, idempotencyKey) => {
    const response = await POST(makeRequest(validPayload, { idempotencyKey }));

    expect(response.status).toBe(400);
    expect(mocks.getContext).not.toHaveBeenCalled();
  });

  it("returns field-specific validation errors without echoing submitted values", async () => {
    const privateValue = "private invalid email payload";
    const response = await POST(
      makeRequest({ ...validPayload, email: privateValue }),
    );

    expect(response.status).toBe(422);
    const body = await responseJson(response);
    expect(body.errors).toMatchObject({ email: expect.any(String) });
    expect(JSON.stringify(body)).not.toContain(privateValue);
    expect(mocks.getContext).not.toHaveBeenCalled();
  });

  it("rejects requests with both contact methods missing", async () => {
    const response = await POST(
      makeRequest({ ...validPayload, email: " ", phone: "" }),
    );

    expect(response.status).toBe(422);
    expect(mocks.query.insert).not.toHaveBeenCalled();
  });

  it("uses only Netlify context IP and ignores spoofed forwarding headers", async () => {
    const response = await POST(
      makeRequest(validPayload, {
        headers: {
          "x-forwarded-for": "203.0.113.99",
          forwarded: "for=203.0.113.100",
        },
      }),
    );

    expect(response.status).toBe(202);
    expect(mocks.limitEnquiryAttempts).toHaveBeenCalledWith("198.51.100.42");
    expect(mocks.limitEnquiryAttempts).not.toHaveBeenCalledWith(
      "203.0.113.99",
    );
  });

  it.each([
    ["missing", undefined],
    ["invalid", "not-an-ip"],
  ])("fails closed for %s Netlify context IP", async (_label, ip) => {
    mocks.getContext.mockImplementation(() => ({ ip }));

    const response = await POST(makeRequest());

    expect(response.status).toBe(503);
    expect(mocks.limitEnquiryAttempts).not.toHaveBeenCalled();
  });

  it("fails closed when getContext throws", async () => {
    mocks.getContext.mockImplementation(() => {
      throw new Error("context unavailable");
    });

    const response = await POST(makeRequest());

    expect(response.status).toBe(503);
    expect(mocks.query.insert).not.toHaveBeenCalled();
  });

  it("returns 429 with Retry-After when rate limited", async () => {
    mocks.limitEnquiryAttempts.mockResolvedValue({
      allowed: false,
      limit: 5,
      remaining: 0,
      resetAt: Date.now() + 30_000,
      retryAfterSeconds: 30,
    });

    const response = await POST(makeRequest());

    expect(response.status).toBe(429);
    expect(response.headers.get("retry-after")).toBe("30");
    expect(mocks.query.insert).not.toHaveBeenCalled();
  });

  it("returns 503 when rate limiting is unavailable", async () => {
    mocks.limitEnquiryAttempts.mockRejectedValue(
      new mocks.RateLimitUnavailableError("private provider error"),
    );

    const response = await POST(makeRequest());

    expect(response.status).toBe(503);
    expect(JSON.stringify(await responseJson(response))).not.toContain(
      "private provider error",
    );
  });

  it("returns opaque 202 for a filled honeypot without inserting", async () => {
    const normal = await POST(makeRequest());
    const honeypot = await POST(
      makeRequest({ ...validPayload, website: "spam.example.test" }),
    );

    expect(honeypot.status).toBe(202);
    expect(await responseJson(honeypot)).toEqual(await responseJson(normal));
    expect(mocks.limitEnquiryAttempts).toHaveBeenCalledTimes(2);
    expect(mocks.query.insert).toHaveBeenCalledOnce();
  });

  it("rate-limits honeypot submissions before returning their acknowledgement", async () => {
    mocks.limitEnquiryAttempts.mockResolvedValue({
      allowed: false,
      limit: 5,
      remaining: 0,
      resetAt: Date.now() + 10_000,
      retryAfterSeconds: 10,
    });

    const response = await POST(
      makeRequest({ ...validPayload, website: "private honeypot value" }),
    );

    expect(response.status).toBe(429);
    expect(mocks.limitEnquiryAttempts).toHaveBeenCalledOnce();
    expect(mocks.query.insert).not.toHaveBeenCalled();
  });

  it("rejects a non-string honeypot field as an invalid request", async () => {
    const response = await POST(
      makeRequest({ ...validPayload, website: { value: "spam" } }),
    );

    expect(response.status).toBe(400);
    expect(mocks.limitEnquiryAttempts).not.toHaveBeenCalled();
  });

  it("returns 202 for an existing idempotency key with matching payload", async () => {
    mocks.query.maybeSingle.mockResolvedValue({
      data: matchingStoredRow(),
      error: null,
    });

    const response = await POST(makeRequest());

    expect(response.status).toBe(202);
    expect(mocks.query.insert).not.toHaveBeenCalled();
    expect(mocks.query.eq).toHaveBeenCalledWith(
      "idempotency_key",
      IDEMPOTENCY_KEY,
    );
  });
  it("returns 409 when an idempotency key is reused with different details", async () => {
    mocks.query.maybeSingle.mockResolvedValue({
      data: { ...matchingStoredRow(), message: "A different message." },
      error: null,
    });

    const response = await POST(makeRequest());

    expect(response.status).toBe(409);
  });

  it.each([
    ["unique violation", { code: "23505" }],
    ["ambiguous insert error", { code: "08006" }],
  ])("resolves a race after a %s through lookup", async (_label, error) => {
    mocks.query.insert.mockResolvedValue({ error });
    mocks.query.maybeSingle
      .mockResolvedValueOnce({ data: null, error: null })
      .mockResolvedValueOnce({ data: matchingStoredRow(), error: null });

    const response = await POST(makeRequest());

    expect(response.status).toBe(202);
    expect(mocks.query.maybeSingle).toHaveBeenCalledTimes(2);
  });

  it("returns 409 when an ambiguous insert resolves to a different normalized payload", async () => {
    mocks.query.insert.mockResolvedValue({
      error: { code: "08006", message: "private insert response" },
    });
    mocks.query.maybeSingle
      .mockResolvedValueOnce({ data: null, error: null })
      .mockResolvedValueOnce({
        data: {
          ...matchingStoredRow(),
          message: "A previously stored message.",
        },
        error: null,
      });

    const response = await POST(makeRequest());

    expect(response.status).toBe(409);
    expect(mocks.query.insert).toHaveBeenCalledOnce();
  });

  it("returns 202 when an insert throws but lookup finds the matching row", async () => {
    mocks.query.insert.mockRejectedValue(
      new Error("private ambiguous insert exception"),
    );
    mocks.query.maybeSingle
      .mockResolvedValueOnce({ data: null, error: null })
      .mockResolvedValueOnce({ data: matchingStoredRow(), error: null });

    const response = await POST(makeRequest());

    expect(response.status).toBe(202);
    expect(await responseJson(response)).toEqual({
      success: true,
      message: "Thank you. Your enquiry has been received.",
    });
    expect(mocks.query.maybeSingle).toHaveBeenCalledTimes(2);
  });

  it("returns a safe 503 when both the insert and subsequent lookup throw", async () => {
    mocks.query.insert.mockRejectedValue(
      new Error("private insert provider response"),
    );
    mocks.query.maybeSingle
      .mockResolvedValueOnce({ data: null, error: null })
      .mockRejectedValueOnce(new Error("private lookup provider response"));

    const response = await POST(makeRequest());
    const body = JSON.stringify(await responseJson(response));

    expect(response.status).toBe(503);
    expect(body).not.toContain("private");
    expect(mocks.query.maybeSingle).toHaveBeenCalledTimes(2);
  });

  it("does not overwrite a winning concurrent submission with a different payload", async () => {
    const persisted: Array<Record<string, unknown>> = [];
    let lookupCount = 0;

    mocks.query.maybeSingle.mockImplementation(async () => {
      lookupCount += 1;
      if (lookupCount <= 2) return { data: null, error: null };
      return { data: persisted[0] ?? null, error: null };
    });
    mocks.query.insert.mockImplementation(
      async (payload: Record<string, unknown>) => {
        if (persisted.length > 0) return { error: { code: "23505" } };
        persisted.push(payload);
        return { error: null };
      },
    );

    const firstPayload = validPayload;
    const secondPayload = {
      ...validPayload,
      message: "A different submission using the same key.",
    };
    const [firstResponse, secondResponse] = await Promise.all([
      POST(makeRequest(firstPayload)),
      POST(makeRequest(secondPayload)),
    ]);

    expect(firstResponse.status).toBe(202);
    expect(secondResponse.status).toBe(409);
    expect(mocks.query.insert).toHaveBeenCalledTimes(2);
    expect(persisted).toEqual([
      { idempotency_key: IDEMPOTENCY_KEY, ...firstPayload },
    ]);
  });

  it("returns 503 when an insert fails and lookup cannot establish the outcome", async () => {
    mocks.query.insert.mockResolvedValue({
      error: { code: "08006", message: "sensitive database response" },
    });
    mocks.query.maybeSingle
      .mockResolvedValueOnce({ data: null, error: null })
      .mockResolvedValueOnce({
        data: null,
        error: { message: "sensitive lookup response" },
      });

    const response = await POST(makeRequest());

    expect(response.status).toBe(503);
    const body = JSON.stringify(await responseJson(response));
    expect(body).not.toContain("sensitive");
  });

  it("returns 503 when Supabase insertion fails without a matching row", async () => {
    mocks.query.insert.mockResolvedValue({
      error: { code: "42501", message: "private database error" },
    });
    mocks.query.maybeSingle
      .mockResolvedValueOnce({ data: null, error: null })
      .mockResolvedValueOnce({ data: null, error: null });

    const response = await POST(makeRequest());

    expect(response.status).toBe(503);
  });

  it("returns a safe 503 if Supabase client construction fails", async () => {
    mocks.getSupabaseAdminClient.mockImplementation(() => {
      throw new Error("service role secret must not escape");
    });

    const response = await POST(makeRequest());

    expect(response.status).toBe(503);
    expect(JSON.stringify(await responseJson(response))).not.toContain(
      "service role secret",
    );
  });

  it("returns a generic 500 for an unexpected request-processing error", async () => {
    const request = {
      get headers(): Headers {
        throw new Error("unexpected sensitive error");
      },
    } as Request;

    const response = await POST(request);

    expect(response.status).toBe(500);
    expect(JSON.stringify(await responseJson(response))).not.toContain(
      "unexpected sensitive error",
    );
  });

  it("does not log sensitive request or provider data or make email requests", async () => {
    const sensitiveValue = "private customer details";
    const consoleError = vi.spyOn(console, "error");
    const consoleWarn = vi.spyOn(console, "warn");
    const consoleLog = vi.spyOn(console, "log");
    const fetch = vi.spyOn(globalThis, "fetch");
    mocks.query.insert.mockResolvedValue({
      error: { code: "08006", message: sensitiveValue },
    });
    mocks.query.maybeSingle
      .mockResolvedValueOnce({ data: null, error: null })
      .mockResolvedValueOnce({
        data: null,
        error: { message: sensitiveValue },
      });

    const response = await POST(
      makeRequest({ ...validPayload, message: sensitiveValue }),
    );
    const body = JSON.stringify(await responseJson(response));

    expect(body).not.toContain(sensitiveValue);
    expect(consoleError).not.toHaveBeenCalled();
    expect(consoleWarn).not.toHaveBeenCalled();
    expect(consoleLog).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("does not include the trusted IP in response bodies", async () => {
    const response = await POST(makeRequest());

    expect(JSON.stringify(await responseJson(response))).not.toContain(
      "198.51.100.42",
    );
  });
});
