import { describe, expect, it, vi } from "vitest";
import {
  createCustomerEmail,
  createOwnerEmail,
  EmailDeliveryDatabaseError,
  EmailDeliveryWorkerError,
  escapeEmailHtml,
  runEmailDeliveryBatch,
  type EmailDeliveryStore,
} from "@/lib/server/email-delivery-worker";

const config = {
  apiKey: "test-resend-api-key",
  fromEmail: "curt@codedbycurt.co.uk",
  ownerEmail: "codedbycurt@gmail.com",
};

const ownerDelivery = {
  delivery_id: "a1b2c3d4-e5f6-4789-8abc-123456789012",
  enquiry_id: "b1b2c3d4-e5f6-4789-8abc-123456789012",
  recipient_type: "owner",
  claim_token: "c1b2c3d4-e5f6-4789-8abc-123456789012",
  attempt_number: 1,
};

const customerDelivery = {
  ...ownerDelivery,
  delivery_id: "a1b2c3d4-e5f6-4789-8abc-123456789013",
  recipient_type: "customer",
  claim_token: "c1b2c3d4-e5f6-4789-8abc-123456789013",
};

const enquiry = {
  id: ownerDelivery.enquiry_id,
  name: "Sam <Builder>",
  email: "sam@example.test",
  phone: "+44 7000 000000",
  message: "Please help with <a> & quotes \"like this\".",
};

function createStore(options: {
  claims?: unknown;
  enquiryById?: Map<string, unknown>;
  claimError?: unknown;
} = {}) {
  const claimBatch = vi.fn(async (): Promise<unknown> => {
    if (options.claimError) {
      throw options.claimError === true
        ? new Error("private database detail")
        : options.claimError;
    }
    return options.claims ?? [ownerDelivery];
  });
  const findEnquiry = vi.fn(async (id: string): Promise<unknown> => {
    return options.enquiryById?.get(id) ?? enquiry;
  });
  const complete = vi.fn(async (): Promise<boolean> => true);
  const retry = vi.fn(async (): Promise<boolean> => true);
  const fail = vi.fn(async (): Promise<boolean> => true);
  const store: EmailDeliveryStore = {
    claimBatch,
    findEnquiry,
    complete,
    retry,
    fail,
  };
  return { store, claimBatch, findEnquiry, complete, retry, fail };
}

function createFetch(status: number, body: unknown = { id: "resend-message-id" }) {
  return vi.fn<typeof fetch>().mockResolvedValue(
    Response.json(body, { status }),
  );
}

describe("email delivery templates", () => {
  it("creates an owner notification with reply-to, contact details, and message", () => {
    const message = createOwnerEmail(enquiry, config);

    expect(message).toMatchObject({
      to: "codedbycurt@gmail.com",
      reply_to: "sam@example.test",
      subject: "New website enquiry — Coded by Curt",
    });
    expect(message.html).toContain("Sam &lt;Builder&gt;");
    expect(message.html).toContain("sam@example.test");
    expect(message.html).toContain("+44 7000 000000");
    expect(message.html).toContain("Please help with &lt;a&gt; &amp; quotes &quot;like this&quot;.");
    expect(message.text).toContain(enquiry.message);
  });

  it("creates a customer confirmation addressed to the stored email and replies to the business", () => {
    const message = createCustomerEmail(enquiry, config);

    expect(message).toMatchObject({
      to: "sam@example.test",
      reply_to: "curt@codedbycurt.co.uk",
      subject: "We’ve received your enquiry — Coded by Curt",
    });
    expect(message.html).toContain("Hi Sam &lt;Builder&gt;");
    expect(message.text).toContain("We’ve received your message");
    expect(message.text).not.toMatch(/within \d+|by tomorrow|response time/i);
  });

  it("escapes all HTML-special characters", () => {
    expect(escapeEmailHtml(`<>&"'\n`)).toBe("&lt;&gt;&amp;&quot;&#39;\n");
  });

  it("omits an invalid customer reply-to from the owner notification", () => {
    const message = createOwnerEmail({ ...enquiry, email: "invalid" }, config);
    expect(message.reply_to).toBeUndefined();
  });
});

describe("email delivery worker", () => {
  it("sends an owner notification through Resend and records provider acceptance", async () => {
    const store = createStore();
    const fetchRequest = createFetch(200);

    const result = await runEmailDeliveryBatch(store.store, config, fetchRequest);

    expect(result).toMatchObject({ claimed: 1, sent: 1 });
    expect(fetchRequest).toHaveBeenCalledOnce();
    expect(fetchRequest).toHaveBeenCalledWith(
      "https://api.resend.com/emails",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer test-resend-api-key",
          "Idempotency-Key": `cbc-portfolio-delivery-${ownerDelivery.delivery_id}`,
        }),
        signal: expect.any(AbortSignal),
      }),
    );
    const requestBody = JSON.parse(
      String(fetchRequest.mock.calls[0]?.[1]?.body),
    ) as Record<string, unknown>;
    expect(requestBody).toMatchObject({
      from: "Coded by Curt <curt@codedbycurt.co.uk>",
      to: ["codedbycurt@gmail.com"],
      reply_to: "sam@example.test",
      text: expect.stringContaining(enquiry.message),
    });
    expect(store.complete).toHaveBeenCalledWith(
      ownerDelivery.delivery_id,
      ownerDelivery.claim_token,
      "resend-message-id",
    );
    expect(store.retry).not.toHaveBeenCalled();
    expect(store.fail).not.toHaveBeenCalled();
  });

  it("sends a customer confirmation and supplies text and escaped HTML", async () => {
    const store = createStore({ claims: [customerDelivery] });
    const fetchRequest = createFetch(200);

    const result = await runEmailDeliveryBatch(store.store, config, fetchRequest);

    expect(result.sent).toBe(1);
    const requestBody = JSON.parse(
      String(fetchRequest.mock.calls[0]?.[1]?.body),
    ) as Record<string, unknown>;
    expect(requestBody).toMatchObject({
      to: ["sam@example.test"],
      reply_to: "curt@codedbycurt.co.uk",
      html: expect.stringContaining("Sam &lt;Builder&gt;"),
      text: expect.stringContaining("Thanks for sending your enquiry"),
    });
    expect(store.complete).toHaveBeenCalledWith(
      customerDelivery.delivery_id,
      customerDelivery.claim_token,
      "resend-message-id",
    );
  });

  it.each([
    [429, "retried"],
    [503, "retried"],
    [400, "failed"],
  ] as const)("classifies Resend status %s as %s", async (status, expected) => {
    const store = createStore();
    const fetchRequest = createFetch(status, { message: "private provider data" });

    const result = await runEmailDeliveryBatch(store.store, config, fetchRequest);

    expect(result[expected]).toBe(1);
    if (expected === "retried") {
      expect(store.retry).toHaveBeenCalledWith(
        ownerDelivery.delivery_id,
        ownerDelivery.claim_token,
        "provider_temporary",
      );
    } else {
      expect(store.fail).toHaveBeenCalledWith(
        ownerDelivery.delivery_id,
        ownerDelivery.claim_token,
        "provider_rejected",
      );
    }
    expect(JSON.stringify(result)).not.toContain("private provider data");
  });

  it("retries network failures without exposing provider details", async () => {
    const store = createStore();
    const fetchRequest = vi
      .fn<typeof fetch>()
      .mockRejectedValue(new Error("private provider network detail"));

    const result = await runEmailDeliveryBatch(store.store, config, fetchRequest);

    expect(result.retried).toBe(1);
    expect(store.retry).toHaveBeenCalledWith(
      ownerDelivery.delivery_id,
      ownerDelivery.claim_token,
      "provider_temporary",
    );
    expect(JSON.stringify(result)).not.toContain("private provider network detail");
  });

  it("uses the same Resend idempotency key when a job is retried", async () => {
    const store = createStore();
    const fetchRequest = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(Response.json({}, { status: 503 }))
      .mockResolvedValueOnce(Response.json({ id: "accepted" }, { status: 200 }));

    await runEmailDeliveryBatch(store.store, config, fetchRequest);
    await runEmailDeliveryBatch(store.store, config, fetchRequest);

    const firstHeaders = fetchRequest.mock.calls[0]?.[1]?.headers as HeadersInit;
    const secondHeaders = fetchRequest.mock.calls[1]?.[1]?.headers as HeadersInit;
    expect(new Headers(firstHeaders).get("Idempotency-Key")).toBe(
      `cbc-portfolio-delivery-${ownerDelivery.delivery_id}`,
    );
    expect(new Headers(secondHeaders).get("Idempotency-Key")).toBe(
      `cbc-portfolio-delivery-${ownerDelivery.delivery_id}`,
    );
    expect(store.retry).toHaveBeenCalledOnce();
    expect(store.complete).toHaveBeenCalledOnce();
  });

  it("processes owner and customer deliveries independently", async () => {
    const store = createStore({ claims: [ownerDelivery, customerDelivery] });
    const fetchRequest = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(Response.json({ id: "owner-accepted" }, { status: 200 }))
      .mockResolvedValueOnce(Response.json({}, { status: 400 }));

    const result = await runEmailDeliveryBatch(store.store, config, fetchRequest);

    expect(result).toMatchObject({ claimed: 2, sent: 1, failed: 1 });
    expect(store.complete).toHaveBeenCalledWith(
      ownerDelivery.delivery_id,
      ownerDelivery.claim_token,
      "owner-accepted",
    );
    expect(store.fail).toHaveBeenCalledWith(
      customerDelivery.delivery_id,
      customerDelivery.claim_token,
      "provider_rejected",
    );
  });

  it("does not send customer email when no valid address exists", async () => {
    const records = new Map<string, unknown>([
      [customerDelivery.enquiry_id, { ...enquiry, email: null }],
    ]);
    const store = createStore({
      claims: [customerDelivery],
      enquiryById: records,
    });
    const fetchRequest = createFetch(200);

    const result = await runEmailDeliveryBatch(store.store, config, fetchRequest);

    expect(result.failed).toBe(1);
    expect(fetchRequest).not.toHaveBeenCalled();
    expect(store.fail).toHaveBeenCalledWith(
      customerDelivery.delivery_id,
      customerDelivery.claim_token,
      "invalid_customer_email",
    );
  });

  it("uses claim tokens for state updates and reports stale-token rejection", async () => {
    const store = createStore();
    store.complete.mockResolvedValue(false);

    const result = await runEmailDeliveryBatch(
      store.store,
      config,
      createFetch(200),
    );

    expect(result.stateUpdateFailed).toBe(1);
    expect(store.complete).toHaveBeenCalledWith(
      ownerDelivery.delivery_id,
      ownerDelivery.claim_token,
      "resend-message-id",
    );
  });

  it("returns an empty result for an empty batch", async () => {
    const store = createStore({ claims: [] });
    const fetchRequest = createFetch(200);

    await expect(
      runEmailDeliveryBatch(store.store, config, fetchRequest),
    ).resolves.toEqual({
      claimed: 0,
      sent: 0,
      retried: 0,
      failed: 0,
      stateUpdateFailed: 0,
    });
    expect(fetchRequest).not.toHaveBeenCalled();
  });

  it("propagates unexpected claim failures without exposing provider or database details", async () => {
    const store = createStore({ claimError: true });

    const reportDiagnostic = vi.fn();

    await expect(
      runEmailDeliveryBatch(
        store.store,
        config,
        createFetch(200),
        reportDiagnostic,
      ),
    ).rejects.toMatchObject({
      diagnostic: { category: "initial_claim_rpc" },
    } satisfies Partial<EmailDeliveryWorkerError>);
    expect(reportDiagnostic).not.toHaveBeenCalled();
  });

  it("includes only an allowlisted database code for initial claim failures", async () => {
    const store = createStore({
      claimError: new EmailDeliveryDatabaseError({
        code: "42501",
        message: "private database detail",
      }),
    });

    await expect(
      runEmailDeliveryBatch(store.store, config, createFetch(200)),
    ).rejects.toMatchObject({
      diagnostic: { category: "initial_claim_rpc", code: "42501" },
    });
  });

  it("reports subsequent database processing with only a safe code", async () => {
    const store = createStore();
    store.findEnquiry.mockRejectedValue(
      new EmailDeliveryDatabaseError({
        code: "42501",
        message: "private customer information",
      }),
    );
    const reportDiagnostic = vi.fn();

    const result = await runEmailDeliveryBatch(
      store.store,
      config,
      createFetch(200),
      reportDiagnostic,
    );

    expect(result.retried).toBe(1);
    expect(reportDiagnostic).toHaveBeenCalledWith({
      category: "database_processing",
      code: "42501",
    });
    expect(JSON.stringify(reportDiagnostic.mock.calls)).not.toContain(
      "private customer information",
    );
  });

  it("reports stale claim-token transitions without exposing row details", async () => {
    const store = createStore();
    store.complete.mockResolvedValue(false);
    const reportDiagnostic = vi.fn();

    await runEmailDeliveryBatch(
      store.store,
      config,
      createFetch(200),
      reportDiagnostic,
    );

    expect(reportDiagnostic).toHaveBeenCalledWith({
      category: "database_processing",
      code: "stale_claim",
    });
  });
});
