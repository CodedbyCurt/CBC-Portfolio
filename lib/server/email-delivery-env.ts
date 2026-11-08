import { z } from "zod";

const localSupabaseHosts = new Set(["localhost", "127.0.0.1", "[::1]"]);

const emailDeliveryEnvironmentSchema = z.object({
  SUPABASE_URL: z.string().trim().url().superRefine((value, context) => {
    let url: URL;
    try {
      url = new URL(value);
    } catch {
      context.addIssue({ code: "custom", message: "must be a valid URL" });
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
        message: "must use HTTPS, or local Supabase HTTP on port 54321 during development",
      });
    }
  }),
  SUPABASE_SERVICE_ROLE_KEY: z.string().trim().min(1, "is required"),
  RESEND_API_KEY: z.string().trim().min(1, "is required"),
  RESEND_FROM_EMAIL: z.string().trim().pipe(z.email()),
  ENQUIRY_NOTIFICATION_EMAIL: z.string().trim().pipe(z.email()),
});

export type EmailDeliveryEnvironment = z.infer<
  typeof emailDeliveryEnvironmentSchema
>;

export function getEmailDeliveryEnvironment(): EmailDeliveryEnvironment {
  const result = emailDeliveryEnvironmentSchema.safeParse({
    SUPABASE_URL: process.env.SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    RESEND_API_KEY: process.env.RESEND_API_KEY,
    RESEND_FROM_EMAIL: process.env.RESEND_FROM_EMAIL,
    ENQUIRY_NOTIFICATION_EMAIL: process.env.ENQUIRY_NOTIFICATION_EMAIL,
  });

  if (!result.success) {
    const details = result.error.issues
      .map((issue) => `${String(issue.path[0] ?? "Email delivery configuration")}: ${issue.message}`)
      .join("; ");

    throw new Error(`Invalid server environment configuration: ${details}`);
  }

  return result.data;
}
