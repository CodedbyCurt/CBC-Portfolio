import { createHmac } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const upstash = vi.hoisted(() => ({
  limit: vi.fn(),
  slidingWindow: vi.fn((count: number, window: string) => ({ count, window })),
  rateLimitOptions: null as Record<string, unknown> | null,
  redisOptions: null as Record<string, string> | null,
}));

vi.mock("@upstash/ratelimit", () => ({
  Ratelimit: class {
    static slidingWindow = upstash.slidingWindow;

    constructor(options: Record<string, unknown>) {
      upstash.rateLimitOptions = options;
    }

    limit(identifier: string) {
      return upstash.limit(identifier);
    }
  },
}));

vi.mock("@upstash/redis", () => ({
  Redis: class {
    constructor(options: Record<string, string>) {
      upstash.redisOptions = options;
    }
  },
}));

const environmentKeys = [
  "UPSTASH_REDIS_REST_URL",
  "UPSTASH_REDIS_REST_TOKEN",
  "RATE_LIMIT_HASH_SECRET",
] as const;
const originalEnvironment = Object.fromEntries(
  environmentKeys.map((key) => [key, process.env[key]]),
);
const clientIp = "198.51.100.42";
const hashSecret = "test-hash-secret-with-at-least-32-characters";
const validRateLimitEnvironment = {
  UPSTASH_REDIS_REST_URL: "https://redis.example.test",
  UPSTASH_REDIS_REST_TOKEN: "test-upstash-token",
  RATE_LIMIT_HASH_SECRET: hashSecret,
};

async function loadRateLimiter() {
  vi.resetModules();
  return import("@/lib/server/rate-limit");
}

describe("limitEnquiryAttempts", () => {
  beforeEach(() => {
    for (const key of environmentKeys) delete process.env[key];
    Object.assign(process.env, validRateLimitEnvironment);
    upstash.limit.mockReset();
    upstash.limit.mockResolvedValue({
      success: true,
      remaining: 4,
      reset: Date.now() + 60_000,
    });
    upstash.slidingWindow.mockClear();
    upstash.rateLimitOptions = null;
    upstash.redisOptions = null;
  });

  afterEach(() => {
    for (const key of environmentKeys) {
      const value = originalEnvironment[key];
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
    vi.restoreAllMocks();
  });

  it("accepts valid IPv4 and returns a safe allow result", async () => {
    const { limitEnquiryAttempts } = await loadRateLimiter();
    const result = await limitEnquiryAttempts(clientIp);

    expect(result).toMatchObject({
      allowed: true,
      limit: 5,
      remaining: 4,
    });
    expect(result).not.toHaveProperty("clientIp");
    expect(upstash.limit).toHaveBeenCalledOnce();
  });

  it("accepts valid IPv6", async () => {
    const { limitEnquiryAttempts } = await loadRateLimiter();

    await expect(limitEnquiryAttempts("2001:db8::1")).resolves.toMatchObject({
      allowed: true,
    });
  });

  it.each([undefined, null, "", "not-an-ip"])(
    "rejects a missing or invalid IP (%s)",
    async (ip) => {
      const { InvalidClientIpError, limitEnquiryAttempts } =
        await loadRateLimiter();

      await expect(limitEnquiryAttempts(ip)).rejects.toBeInstanceOf(
        InvalidClientIpError,
      );
      expect(upstash.limit).not.toHaveBeenCalled();
    },
  );

  it("uses the same HMAC identity for equivalent IPv6 representations", async () => {
    const { limitEnquiryAttempts } = await loadRateLimiter();

    await limitEnquiryAttempts("2001:0db8:0:0:0:0:0:1");
    await limitEnquiryAttempts("2001:db8::1");

    expect(upstash.limit.mock.calls[0]?.[0]).toBe(
      upstash.limit.mock.calls[1]?.[0],
    );
  });

  it("uses different identifiers for different addresses", async () => {
    const { limitEnquiryAttempts } = await loadRateLimiter();

    await limitEnquiryAttempts("198.51.100.42");
    await limitEnquiryAttempts("198.51.100.43");

    expect(upstash.limit.mock.calls[0]?.[0]).not.toBe(
      upstash.limit.mock.calls[1]?.[0],
    );
  });

  it("HMAC-hashes the address and configures a 5 per 10-minute sliding window", async () => {
    const { limitEnquiryAttempts } = await loadRateLimiter();

    await limitEnquiryAttempts(clientIp);

    const expectedIdentifier = createHmac("sha256", hashSecret)
      .update(clientIp)
      .digest("hex");
    expect(upstash.limit).toHaveBeenCalledWith(expectedIdentifier);
    expect(upstash.limit.mock.calls[0]?.[0]).not.toContain(clientIp);
    expect(upstash.rateLimitOptions).toMatchObject({
      prefix: "cbc-portfolio:enquiries",
      analytics: false,
      enableTelemetry: false,
      limiter: { count: 5, window: "10 m" },
    });
    expect(upstash.slidingWindow).toHaveBeenCalledWith(5, "10 m");
    expect(upstash.redisOptions).toEqual({
      url: validRateLimitEnvironment.UPSTASH_REDIS_REST_URL,
      token: validRateLimitEnvironment.UPSTASH_REDIS_REST_TOKEN,
    });
  });

  it("returns a safe rejection with retry timing", async () => {
    const reset = Date.now() + 120_000;
    upstash.limit.mockResolvedValue({
      success: false,
      remaining: 0,
      reset,
    });
    const { limitEnquiryAttempts } = await loadRateLimiter();

    const result = await limitEnquiryAttempts(clientIp);

    expect(result).toMatchObject({
      allowed: false,
      limit: 5,
      remaining: 0,
      resetAt: reset,
    });
    if (!result.allowed) expect(result.retryAfterSeconds).toBeGreaterThan(0);
    expect(result).not.toHaveProperty("clientIp");
  });

  it("fails closed on Upstash timeout and provider failures without leaking data", async () => {
    upstash.limit.mockResolvedValue({
      success: false,
      remaining: 0,
      reset: Date.now() + 60_000,
      reason: "timeout",
    });
    const consoleError = vi.spyOn(console, "error");
    const consoleWarn = vi.spyOn(console, "warn");
    const consoleLog = vi.spyOn(console, "log");
    const { limitEnquiryAttempts, RateLimitUnavailableError } =
      await loadRateLimiter();

    const timeoutError = await limitEnquiryAttempts(clientIp).catch(
      (error: unknown) => error,
    );
    expect(timeoutError).toBeInstanceOf(RateLimitUnavailableError);
    const timeoutMessage =
      timeoutError instanceof Error ? timeoutError.message : String(timeoutError);
    expect(timeoutMessage).not.toContain(clientIp);
    expect(timeoutMessage).not.toContain(hashSecret);

    upstash.limit.mockRejectedValue(
      new Error(`provider detail ${clientIp} ${hashSecret}`),
    );
    const serviceError = await limitEnquiryAttempts(clientIp).catch(
      (error: unknown) => error,
    );

    expect(serviceError).toBeInstanceOf(RateLimitUnavailableError);
    const serviceMessage =
      serviceError instanceof Error ? serviceError.message : String(serviceError);
    expect(serviceMessage).not.toContain(clientIp);
    expect(serviceMessage).not.toContain(hashSecret);
    expect(consoleError).not.toHaveBeenCalled();
    expect(consoleWarn).not.toHaveBeenCalled();
    expect(consoleLog).not.toHaveBeenCalled();
  });
});
