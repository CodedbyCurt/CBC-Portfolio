import "server-only";

import { z } from "zod";
import {
  getEmailDeliveryEnvironment,
  type EmailDeliveryEnvironment,
} from "@/lib/server/email-delivery-env";

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
export type EnquiryAllowedOrigins = z.infer<typeof allowedOriginsSchema>;
export type { EmailDeliveryEnvironment };
export { getEmailDeliveryEnvironment };

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
