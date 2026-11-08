import "server-only";

import { z } from "zod";

const localSupabaseHosts = new Set(["localhost", "127.0.0.1", "[::1]"]);

const supabaseUrlSchema = z.string().superRefine((value, context) => {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    context.addIssue({
      code: "custom",
      message: "must be a valid URL",
    });
    return;
  }

  const isLocalDevelopmentUrl =
    process.env.NODE_ENV === "development" &&
    url.protocol === "http:" &&
    localSupabaseHosts.has(url.hostname) &&
    url.port === "54321";

  if (
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    (url.protocol !== "https:" && !isLocalDevelopmentUrl)
  ) {
      context.addIssue({
        code: "custom",
        message:
          "must use HTTPS, or local Supabase HTTP on port 54321 during development",
      });
  }
});

const supabaseEnvironmentSchema = z.object({
  SUPABASE_URL: supabaseUrlSchema,
  SUPABASE_SERVICE_ROLE_KEY: z
    .string()
    .refine((value) => value.trim().length > 0, {
      message: "is required",
    }),
});

const rateLimitEnvironmentSchema = z.object({
  UPSTASH_REDIS_REST_URL: z.string().superRefine((value, context) => {
    let url: URL;
    try {
      url = new URL(value);
    } catch {
      context.addIssue({
        code: "custom",
        message: "must be a valid HTTPS URL",
      });
      return;
    }

    if (
      url.protocol !== "https:" ||
      !url.hostname ||
      url.username ||
      url.password ||
      url.hash
    ) {
      context.addIssue({
        code: "custom",
        message: "must be an HTTPS URL without embedded credentials or a fragment",
      });
    }
  }),
  UPSTASH_REDIS_REST_TOKEN: z.string().refine((value) => value.trim().length > 0, {
    message: "is required",
  }),
  RATE_LIMIT_HASH_SECRET: z.string().refine((value) => value.trim().length >= 32, {
    message: "must be at least 32 non-whitespace characters",
  }),
});

const allowedOriginsSchema = z
  .string()
  .superRefine((value, context) => {
    const origins = value.split(",").map((origin) => origin.trim());

    if (origins.some((origin) => origin.length === 0)) {
      context.addIssue({
        code: "custom",
        message: "must be a comma-separated list of exact origins",
      });
      return;
    }

    origins.forEach((origin, index) => {
      let url: URL;
      try {
        url = new URL(origin);
      } catch {
        context.addIssue({
          code: "custom",
          message: "must contain valid exact origins",
          path: [index],
        });
        return;
      }

      const isLocalDevelopmentOrigin =
        process.env.NODE_ENV === "development" &&
        url.protocol === "http:" &&
        localSupabaseHosts.has(url.hostname);

      if (
        url.hostname.includes("*") ||
        url.origin !== origin ||
        url.username ||
        url.password ||
        url.pathname !== "/" ||
        url.search ||
        url.hash ||
        (url.protocol !== "https:" && !isLocalDevelopmentOrigin)
      ) {
        context.addIssue({
          code: "custom",
          message:
            "must use exact HTTPS origins (local HTTP origins are allowed only during development)",
          path: [index],
        });
      }
    });
  })
  .transform((value) => value.split(",").map((origin) => origin.trim()));

export type SupabaseEnvironment = z.infer<typeof supabaseEnvironmentSchema>;
export type RateLimitEnvironment = z.infer<typeof rateLimitEnvironmentSchema>;
export type EnquiryAllowedOrigins = z.infer<typeof allowedOriginsSchema>;

export function getSupabaseEnvironment(): SupabaseEnvironment {
  const result = supabaseEnvironmentSchema.safeParse({
    SUPABASE_URL: process.env.SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  });

  if (!result.success) {
    const details = result.error.issues
      .map((issue) => `${String(issue.path[0] ?? "Supabase configuration")}: ${issue.message}`)
      .join("; ");

    throw new Error(`Invalid server environment configuration: ${details}`);
  }

  return result.data;
}

export function getRateLimitEnvironment(): RateLimitEnvironment {
  const result = rateLimitEnvironmentSchema.safeParse({
    UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL,
    UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN,
    RATE_LIMIT_HASH_SECRET: process.env.RATE_LIMIT_HASH_SECRET,
  });

  if (!result.success) {
    const details = result.error.issues
      .map((issue) => `${String(issue.path[0] ?? "Rate limit configuration")}: ${issue.message}`)
      .join("; ");

    throw new Error(`Invalid server environment configuration: ${details}`);
  }

  return result.data;
}

export function getEnquiryAllowedOrigins(): EnquiryAllowedOrigins {
  const result = allowedOriginsSchema.safeParse(
    process.env.ENQUIRY_ALLOWED_ORIGINS,
  );

  if (!result.success) {
    const details = result.error.issues
      .map((issue) => `${String(issue.path[0] ?? "ENQUIRY_ALLOWED_ORIGINS")}: ${issue.message}`)
      .join("; ");

    throw new Error(`Invalid server environment configuration: ${details}`);
  }

  return result.data;
}
