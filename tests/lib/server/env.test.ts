import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  getEmailDeliveryEnvironment,
  getEnquiryAllowedOrigins,
  getSupabaseEnvironment,
} from "@/lib/server/env";

const environmentKeys = [
  "SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "ENQUIRY_ALLOWED_ORIGINS",
  "RESEND_API_KEY",
  "RESEND_FROM_EMAIL",
  "ENQUIRY_NOTIFICATION_EMAIL",
] as const;

const originalEnvironment = Object.fromEntries(
  environmentKeys.map((key) => [key, process.env[key]]),
);
const validSupabaseEnvironment = {
  SUPABASE_URL: "https://portfolio.example.test",
  SUPABASE_SERVICE_ROLE_KEY: "test-service-role-key",
};
const validEmailDeliveryEnvironment = {
  ...validSupabaseEnvironment,
  RESEND_API_KEY: "test-resend-api-key",
  RESEND_FROM_EMAIL: "curt@codedbycurt.co.uk",
  ENQUIRY_NOTIFICATION_EMAIL: "codedbycurt@gmail.com",
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

  it("validates all email-worker credentials and addresses without exposing secrets", () => {
    Object.assign(process.env, validEmailDeliveryEnvironment);

    expect(getEmailDeliveryEnvironment()).toMatchObject({
      SUPABASE_URL: validSupabaseEnvironment.SUPABASE_URL,
      RESEND_FROM_EMAIL: "curt@codedbycurt.co.uk",
      ENQUIRY_NOTIFICATION_EMAIL: "codedbycurt@gmail.com",
    });

    delete process.env.RESEND_API_KEY;
    expect(() => getEmailDeliveryEnvironment()).toThrow("RESEND_API_KEY");
    expect(() => getEmailDeliveryEnvironment()).not.toThrow(
      "test-resend-api-key",
    );
  });

  it("validates Supabase configuration independently from the Origin allowlist", () => {
    Object.assign(process.env, validSupabaseEnvironment);

    expect(getSupabaseEnvironment().SUPABASE_URL).toBe(
      validSupabaseEnvironment.SUPABASE_URL,
    );
    expect(() => getEnquiryAllowedOrigins()).toThrow(
      "ENQUIRY_ALLOWED_ORIGINS",
    );

    process.env.ENQUIRY_ALLOWED_ORIGINS = "https://portfolio.example.test";
    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;

    expect(getEnquiryAllowedOrigins()).toEqual([
      "https://portfolio.example.test",
    ]);
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
