import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  getEnquiryAllowedOrigins,
  getRateLimitEnvironment,
  getSupabaseEnvironment,
} from "@/lib/server/env";

const environmentKeys = [
  "SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "UPSTASH_REDIS_REST_URL",
  "UPSTASH_REDIS_REST_TOKEN",
  "RATE_LIMIT_HASH_SECRET",
  "ENQUIRY_ALLOWED_ORIGINS",
] as const;

const originalEnvironment = Object.fromEntries(
  environmentKeys.map((key) => [key, process.env[key]]),
);
const validSupabaseEnvironment = {
  SUPABASE_URL: "https://portfolio.example.test",
  SUPABASE_SERVICE_ROLE_KEY: "test-service-role-key",
};
const validRateLimitEnvironment = {
  UPSTASH_REDIS_REST_URL: "https://redis.example.test",
  UPSTASH_REDIS_REST_TOKEN: "test-upstash-token",
  RATE_LIMIT_HASH_SECRET: "test-hash-secret-with-at-least-32-characters",
};

function clearServiceEnvironment() {
  for (const key of environmentKeys) delete process.env[key];
}

describe("server environment validation", () => {
  beforeEach(() => {
    clearServiceEnvironment();
    vi.stubEnv("NODE_ENV", "production");
  });

  afterEach(() => {
    for (const key of environmentKeys) {
      const value = originalEnvironment[key];
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
    vi.unstubAllEnvs();
  });

  it("rejects missing Supabase variables without exposing values", () => {
    expect(() => getSupabaseEnvironment()).toThrow("SUPABASE_URL");
    expect(() => getSupabaseEnvironment()).toThrow(
      "SUPABASE_SERVICE_ROLE_KEY",
    );
  });

  it("rejects malformed Supabase URLs", () => {
    process.env.SUPABASE_URL = "not a URL";
    process.env.SUPABASE_SERVICE_ROLE_KEY = validSupabaseEnvironment.SUPABASE_SERVICE_ROLE_KEY;

    expect(() => getSupabaseEnvironment()).toThrow("must be a valid URL");
  });

  it("rejects HTTP Supabase URLs in production", () => {
    process.env.SUPABASE_URL = "http://localhost:54321";
    process.env.SUPABASE_SERVICE_ROLE_KEY = validSupabaseEnvironment.SUPABASE_SERVICE_ROLE_KEY;

    expect(() => getSupabaseEnvironment()).toThrow("must use HTTPS");
  });

  it("allows recognized local Supabase HTTP during development", () => {
    vi.stubEnv("NODE_ENV", "development");
    process.env.SUPABASE_URL = "http://localhost:54321";
    process.env.SUPABASE_SERVICE_ROLE_KEY = validSupabaseEnvironment.SUPABASE_SERVICE_ROLE_KEY;

    expect(getSupabaseEnvironment().SUPABASE_URL).toBe(
      "http://localhost:54321",
    );
  });

  it("accepts hosted Supabase HTTPS", () => {
    Object.assign(process.env, validSupabaseEnvironment);

    expect(getSupabaseEnvironment().SUPABASE_URL).toBe(
      validSupabaseEnvironment.SUPABASE_URL,
    );
  });

  it("rejects malformed Upstash URLs and missing credentials", () => {
    Object.assign(process.env, validRateLimitEnvironment);
    process.env.UPSTASH_REDIS_REST_URL = "http://redis.example.test";

    expect(() => getRateLimitEnvironment()).toThrow(
      "must be an HTTPS URL without embedded credentials or a fragment",
    );
  });

  it("rejects missing Upstash credentials", () => {
    expect(() => getRateLimitEnvironment()).toThrow(
      "UPSTASH_REDIS_REST_URL",
    );
    expect(() => getRateLimitEnvironment()).toThrow(
      "UPSTASH_REDIS_REST_TOKEN",
    );
  });

  it("rejects an HMAC secret shorter than 32 characters", () => {
    Object.assign(process.env, {
      ...validRateLimitEnvironment,
      RATE_LIMIT_HASH_SECRET: "too-short",
    });

    expect(() => getRateLimitEnvironment()).toThrow(
      "must be at least 32 non-whitespace characters",
    );
  });

  it("validates Supabase and rate-limit configuration independently", () => {
    Object.assign(process.env, validSupabaseEnvironment);

    expect(getSupabaseEnvironment().SUPABASE_URL).toBe(
      validSupabaseEnvironment.SUPABASE_URL,
    );
    expect(() => getRateLimitEnvironment()).toThrow(
      "UPSTASH_REDIS_REST_URL",
    );

    clearServiceEnvironment();
    Object.assign(process.env, validRateLimitEnvironment);

    expect(getRateLimitEnvironment().UPSTASH_REDIS_REST_URL).toBe(
      validRateLimitEnvironment.UPSTASH_REDIS_REST_URL,
    );
    expect(() => getSupabaseEnvironment()).toThrow("SUPABASE_URL");
  });

  it("accepts a comma-separated list of exact HTTPS origins", () => {
    process.env.ENQUIRY_ALLOWED_ORIGINS =
      "https://portfolio.example.test,https://preview.example.test:8443";

    expect(getEnquiryAllowedOrigins()).toEqual([
      "https://portfolio.example.test",
      "https://preview.example.test:8443",
    ]);
  });

  it("rejects origins containing paths, wildcards, or HTTP outside development", () => {
    for (const origin of [
      "https://portfolio.example.test/contact",
      "https://*.example.test",
      "http://localhost:3000",
    ]) {
      process.env.ENQUIRY_ALLOWED_ORIGINS = origin;
      expect(() => getEnquiryAllowedOrigins()).toThrow(
        "must use exact HTTPS origins",
      );
    }
  });

  it("allows local HTTP origins only in development", () => {
    vi.stubEnv("NODE_ENV", "development");
    process.env.ENQUIRY_ALLOWED_ORIGINS = "http://localhost:3000";

    expect(getEnquiryAllowedOrigins()).toEqual(["http://localhost:3000"]);
  });
});
