import { z } from "zod";

const EMAIL_TIMEOUT_MS = 10_000;
const DELIVERY_BATCH_SIZE = 5;
const resendEndpoint = "https://api.resend.com/emails";

const claimSchema = z.object({
  delivery_id: z.string().uuid(),
  enquiry_id: z.string().uuid(),
  recipient_type: z.string(),
  claim_token: z.string().uuid(),
  attempt_number: z.number().int().min(1).max(5),
});

const enquirySchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  email: z.string().nullable(),
  phone: z.string().nullable(),
  message: z.string(),
});

const emailSchema = z.email();

const safeDatabaseErrorCodes = new Set([
  "08000",
  "08001",
  "08003",
  "08006",
  "22023",
  "23503",
  "23505",
  "23514",
  "42703",
  "42883",
  "42P01",
  "42501",
  "PGRST116",
  "PGRST202",
  "PGRST204",
  "PGRST301",
]);

export type EmailDeliveryDiagnostic = {
  category:
    | "environment_validation"
    | "initial_claim_rpc"
    | "database_processing"
    | "unexpected_worker_failure";
  code?: string;
};

export type EmailDeliveryDiagnosticReporter = (
  diagnostic: EmailDeliveryDiagnostic,
) => void;

export class EmailDeliveryDatabaseError extends Error {
  readonly code?: string;

  constructor(error: unknown) {
    super("Email delivery database operation failed.");
    this.name = "EmailDeliveryDatabaseError";
    const rawCode =
      typeof error === "object" && error !== null && "code" in error
        ? error.code
        : undefined;
    if (
      typeof rawCode === "string" &&
      safeDatabaseErrorCodes.has(rawCode)
    ) {
      this.code = rawCode;
    }
  }
}

export class EmailDeliveryWorkerError extends Error {
  constructor(readonly diagnostic: EmailDeliveryDiagnostic) {
    super("Email delivery claim failed.");
    this.name = "EmailDeliveryWorkerError";
  }
}

function reportDiagnostic(
  reporter: EmailDeliveryDiagnosticReporter | undefined,
  category: EmailDeliveryDiagnostic["category"],
  error?: unknown,
): void {
  if (!reporter) return;

  const code = error instanceof EmailDeliveryDatabaseError ? error.code : undefined;
  reporter({
    category,
    ...(code ? { code } : {}),
  });
}

export type EmailDeliveryStore = {
  claimBatch(batchSize: number): Promise<unknown>;
  findEnquiry(enquiryId: string): Promise<unknown>;
  complete(
    deliveryId: string,
    claimToken: string,
    providerMessageId: string | null,
  ): Promise<boolean>;
  retry(
    deliveryId: string,
    claimToken: string,
    errorCode: string,
  ): Promise<boolean>;
  fail(
    deliveryId: string,
    claimToken: string,
    errorCode: string,
  ): Promise<boolean>;
};

export type EmailDeliveryConfig = {
  apiKey: string;
  fromEmail: string;
  ownerEmail: string;
};

type EmailMessage = {
  to: string;
  reply_to?: string;
  subject: string;
  html: string;
  text: string;
};

type DeliveryResult =
  | "sent"
  | "retried"
  | "failed"
  | "state-update-failed";

type ResendResult =
  | { kind: "sent"; providerMessageId: string | null }
  | { kind: "retry" }
  | { kind: "failed" };

export type EmailDeliveryBatchResult = {
  claimed: number;
  sent: number;
  retried: number;
  failed: number;
  stateUpdateFailed: number;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function escapeEmailHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function emailShell(title: string, content: string): string {
  return `<!doctype html>
<html lang="en">
  <body style="margin:0;background:#f4f1eb;color:#171717;font-family:Arial,Helvetica,sans-serif">
    <div style="max-width:620px;margin:32px auto;background:#ffffff;border:1px solid #dedbd4">
      <div style="background:#171717;padding:24px 32px;color:#ffffff">
        <p style="margin:0;color:#ff6b35;font-size:12px;font-weight:700;letter-spacing:2px;text-transform:uppercase">Coded by Curt</p>
        <h1 style="margin:14px 0 0;font-size:26px;line-height:1.2">${title}</h1>
      </div>
      <div style="padding:28px 32px;line-height:1.6">${content}</div>
      <div style="border-top:1px solid #dedbd4;padding:18px 32px;color:#666;font-size:12px">Practical websites for local trades.</div>
    </div>
  </body>
</html>`;
}

export function createOwnerEmail(
  enquiry: z.infer<typeof enquirySchema>,
  config: EmailDeliveryConfig,
): EmailMessage {
  const name = escapeEmailHtml(enquiry.name);
  const email = enquiry.email ? escapeEmailHtml(enquiry.email) : "Not provided";
  const phone = enquiry.phone ? escapeEmailHtml(enquiry.phone) : "Not provided";
  const message = escapeEmailHtml(enquiry.message);
  const replyTo =
    enquiry.email && emailSchema.safeParse(enquiry.email).success
      ? enquiry.email
      : undefined;

  return {
    to: config.ownerEmail,
    ...(replyTo ? { reply_to: replyTo } : {}),
    subject: "New website enquiry — Coded by Curt",
    html: emailShell(
      "New website enquiry",
      `<p>You’ve received a new enquiry through the CBC Portfolio website.</p>
       <table role="presentation" style="width:100%;border-collapse:collapse">
         <tr><th align="left" style="padding:8px 0;border-bottom:1px solid #dedbd4">Name</th><td style="padding:8px 0;border-bottom:1px solid #dedbd4">${name}</td></tr>
         <tr><th align="left" style="padding:8px 0;border-bottom:1px solid #dedbd4">Email</th><td style="padding:8px 0;border-bottom:1px solid #dedbd4">${email}</td></tr>
         <tr><th align="left" style="padding:8px 0;border-bottom:1px solid #dedbd4">Phone</th><td style="padding:8px 0;border-bottom:1px solid #dedbd4">${phone}</td></tr>
       </table>
       <h2 style="margin:24px 0 8px;font-size:16px">Message</h2>
       <div style="padding:16px;background:#f4f1eb;white-space:pre-wrap">${message}</div>`,
    ),
    text: [
      "New website enquiry — Coded by Curt",
      "",
      `Name: ${enquiry.name}`,
      `Email: ${enquiry.email ?? "Not provided"}`,
      `Phone: ${enquiry.phone ?? "Not provided"}`,
      "",
      "Message:",
      enquiry.message,
    ].join("\n"),
  };
}

export function createCustomerEmail(
  enquiry: z.infer<typeof enquirySchema>,
  config: EmailDeliveryConfig,
): EmailMessage {
  return {
    to: enquiry.email ?? "",
    reply_to: config.fromEmail,
    subject: "We’ve received your enquiry — Coded by Curt",
    html: emailShell(
      "Thanks for getting in touch",
      `<p>Hi ${escapeEmailHtml(enquiry.name)},</p>
       <p>Thanks for sending your enquiry. We’ve received your message and the details you shared.</p>
       <p>You can reply to this email if you’d like to add anything else.</p>`,
    ),
    text: [
      `Hi ${enquiry.name},`,
      "",
      "Thanks for sending your enquiry. We’ve received your message and the details you shared.",
      "",
      "You can reply to this email if you’d like to add anything else.",
      "",
      "Coded by Curt",
    ].join("\n"),
  };
}

function getProviderMessageId(value: unknown): string | null {
  if (!isRecord(value) || typeof value.id !== "string") return null;
  return value.id.length > 0 && value.id.length <= 256 ? value.id : null;
}

async function sendWithResend(
  message: EmailMessage,
  deliveryId: string,
  config: EmailDeliveryConfig,
  fetchRequest: typeof fetch,
): Promise<ResendResult> {
  let response: Response;
  try {
    response = await fetchRequest(resendEndpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        "Content-Type": "application/json",
        "Idempotency-Key": `cbc-portfolio-delivery-${deliveryId}`,
      },
      body: JSON.stringify({
        from: `Coded by Curt <${config.fromEmail}>`,
        to: [message.to],
        ...(message.reply_to ? { reply_to: message.reply_to } : {}),
        subject: message.subject,
        html: message.html,
        text: message.text,
      }),
      signal: AbortSignal.timeout(EMAIL_TIMEOUT_MS),
    });
  } catch {
    return { kind: "retry" };
  }

  if (!response.ok) {
    return response.status === 408 || response.status === 429 || response.status >= 500
      ? { kind: "retry" }
      : { kind: "failed" };
  }

  let responseBody: unknown;
  try {
    responseBody = await response.json();
  } catch {
    responseBody = null;
  }
  return { kind: "sent", providerMessageId: getProviderMessageId(responseBody) };
}

async function updateState(
  action: () => Promise<boolean>,
  outcome: Exclude<DeliveryResult, "state-update-failed">,
  reportDiagnostic: EmailDeliveryDiagnosticReporter | undefined,
): Promise<DeliveryResult> {
  try {
    if (await action()) return outcome;
    reportDiagnostic?.({
      category: "database_processing",
      code: "stale_claim",
    });
    return "state-update-failed";
  } catch (error) {
    reportDiagnostic?.({
      category: "database_processing",
      ...(error instanceof EmailDeliveryDatabaseError && error.code
        ? { code: error.code }
        : {}),
    });
    return "state-update-failed";
  }
}

async function processDelivery(
  delivery: z.infer<typeof claimSchema>,
  store: EmailDeliveryStore,
  config: EmailDeliveryConfig,
  fetchRequest: typeof fetch,
  diagnosticReporter: EmailDeliveryDiagnosticReporter | undefined,
): Promise<DeliveryResult> {
  const fail = (code: string) =>
    updateState(
      () => store.fail(delivery.delivery_id, delivery.claim_token, code),
      "failed",
      diagnosticReporter,
    );
  const retry = (code: string) =>
    updateState(
      () => store.retry(delivery.delivery_id, delivery.claim_token, code),
      "retried",
      diagnosticReporter,
    );

  if (delivery.recipient_type !== "owner" && delivery.recipient_type !== "customer") {
    return fail("invalid_recipient_type");
  }

  let enquiryValue: unknown;
  try {
    enquiryValue = await store.findEnquiry(delivery.enquiry_id);
  } catch (error) {
    reportDiagnostic(
      diagnosticReporter,
      "database_processing",
      error,
    );
    return retry("enquiry_lookup_error");
  }

  if (enquiryValue === null) return fail("enquiry_missing");
  const parsedEnquiry = enquirySchema.safeParse(enquiryValue);
  if (!parsedEnquiry.success) return fail("enquiry_invalid");
  const enquiry = parsedEnquiry.data;

  if (delivery.recipient_type === "customer" && !emailSchema.safeParse(enquiry.email).success) {
    return fail("invalid_customer_email");
  }

  const message =
    delivery.recipient_type === "owner"
      ? createOwnerEmail(enquiry, config)
      : createCustomerEmail(enquiry, config);
  const providerResult = await sendWithResend(
    message,
    delivery.delivery_id,
    config,
    fetchRequest,
  );

  if (providerResult.kind === "retry") return retry("provider_temporary");
  if (providerResult.kind === "failed") return fail("provider_rejected");

  return updateState(
    () =>
      store.complete(
        delivery.delivery_id,
        delivery.claim_token,
        providerResult.providerMessageId,
      ),
    "sent",
    diagnosticReporter,
  );
}

export async function runEmailDeliveryBatch(
  store: EmailDeliveryStore,
  config: EmailDeliveryConfig,
  fetchRequest: typeof fetch = fetch,
  diagnosticReporter?: EmailDeliveryDiagnosticReporter,
): Promise<EmailDeliveryBatchResult> {
  let rawClaims: unknown;
  try {
    rawClaims = await store.claimBatch(DELIVERY_BATCH_SIZE);
  } catch (error) {
    throw new EmailDeliveryWorkerError({
      category: "initial_claim_rpc",
      ...(error instanceof EmailDeliveryDatabaseError && error.code
        ? { code: error.code }
        : {}),
    });
  }
  const parsedClaims = z.array(claimSchema).safeParse(rawClaims);
  if (!parsedClaims.success) {
    throw new EmailDeliveryWorkerError({
      category: "initial_claim_rpc",
    });
  }

  const outcomes = await Promise.all(
    parsedClaims.data.map(async (delivery) => {
      try {
        return await processDelivery(
          delivery,
          store,
          config,
          fetchRequest,
          diagnosticReporter,
        );
      } catch {
        reportDiagnostic(
          diagnosticReporter,
          "unexpected_worker_failure",
        );
        try {
          const updated = await store.retry(
            delivery.delivery_id,
            delivery.claim_token,
            "worker_error",
          );
          return updated ? "retried" : "state-update-failed";
        } catch (error) {
          reportDiagnostic(
            diagnosticReporter,
            "database_processing",
            error,
          );
          return "state-update-failed";
        }
      }
    }),
  );

  return outcomes.reduce<EmailDeliveryBatchResult>(
    (result, outcome) => {
      result.claimed += 1;
      if (outcome === "sent") result.sent += 1;
      else if (outcome === "retried") result.retried += 1;
      else if (outcome === "failed") result.failed += 1;
      else result.stateUpdateFailed += 1;
      return result;
    },
    { claimed: 0, sent: 0, retried: 0, failed: 0, stateUpdateFailed: 0 },
  );
}
