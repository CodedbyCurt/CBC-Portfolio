import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  getEmailDeliveryEnvironment: vi.fn(),
  runEmailDeliveryBatch: vi.fn(),
  createSupabaseEmailDeliveryStore: vi.fn(),
}));

vi.mock("@supabase/supabase-js", () => ({
  createClient: mocks.createClient,
}));

vi.mock("../../lib/server/email-delivery-env", () => ({
  getEmailDeliveryEnvironment: mocks.getEmailDeliveryEnvironment,
}));

vi.mock("../../lib/server/email-delivery-worker", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("../../lib/server/email-delivery-worker")>();
  return {
    ...actual,
    runEmailDeliveryBatch: mocks.runEmailDeliveryBatch,
  };
});

vi.mock("../../lib/server/supabase-email-delivery-store", () => ({
  createSupabaseEmailDeliveryStore: mocks.createSupabaseEmailDeliveryStore,
}));

import processEmailDeliveries from "../../netlify/functions/process-email-deliveries";
import { EmailDeliveryWorkerError } from "../../lib/server/email-delivery-worker";

const environment = {
  SUPABASE_URL: "https://portfolio.example.test",
  SUPABASE_SERVICE_ROLE_KEY: "test-service-role-key",
  RESEND_API_KEY: "test-resend-api-key",
  RESEND_FROM_EMAIL: "curt@codedbycurt.co.uk",
  ENQUIRY_NOTIFICATION_EMAIL: "codedbycurt@gmail.com",
};

const emptyBatch = {
  claimed: 0,
  sent: 0,
  retried: 0,
  failed: 0,
  stateUpdateFailed: 0,
};

describe("Netlify email worker diagnostics", () => {
  beforeEach(() => {
    mocks.getEmailDeliveryEnvironment.mockReturnValue(environment);
    mocks.createClient.mockReturnValue({});
    mocks.createSupabaseEmailDeliveryStore.mockReturnValue({});
    mocks.runEmailDeliveryBatch.mockResolvedValue(emptyBatch);
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(console, "info").mockImplementation(() => {});
  });

  it("logs only the environment-validation category on configuration failure", async () => {
    mocks.getEmailDeliveryEnvironment.mockImplementation(() => {
      throw new Error("private environment value");
    });

    await expect(processEmailDeliveries()).rejects.toThrow(
      "Email delivery worker execution failed.",
    );

    expect(console.error).toHaveBeenCalledWith(
      "Email delivery worker failed.",
      { category: "environment_validation" },
    );
    expect(JSON.stringify(vi.mocked(console.error).mock.calls)).not.toContain(
      "private environment value",
    );
  });

  it("logs the initial claim RPC category and safe code", async () => {
    mocks.runEmailDeliveryBatch.mockRejectedValue(
      new EmailDeliveryWorkerError({
        category: "initial_claim_rpc",
        code: "42501",
      }),
    );

    await expect(processEmailDeliveries()).rejects.toThrow(
      "Email delivery worker execution failed.",
    );

    expect(console.error).toHaveBeenCalledWith(
      "Email delivery worker failed.",
      { category: "initial_claim_rpc", code: "42501" },
    );
  });

  it("logs subsequent database-processing diagnostics from the worker", async () => {
    mocks.runEmailDeliveryBatch.mockImplementation(
      async (
        _store: unknown,
        _config: unknown,
        _fetch: typeof fetch,
        reportDiagnostic: (diagnostic: {
          category: string;
          code?: string;
        }) => void,
      ) => {
        reportDiagnostic({
          category: "database_processing",
          code: "stale_claim",
        });
        return emptyBatch;
      },
    );

    await processEmailDeliveries();

    expect(console.error).toHaveBeenCalledWith(
      "Email delivery diagnostic.",
      { category: "database_processing", code: "stale_claim" },
    );
  });

  it("categorizes unexpected worker initialization errors without logging details", async () => {
    mocks.createClient.mockImplementation(() => {
      throw new Error("private client initialization detail");
    });

    await expect(processEmailDeliveries()).rejects.toThrow(
      "Email delivery worker execution failed.",
    );

    expect(console.error).toHaveBeenCalledWith(
      "Email delivery worker failed.",
      { category: "unexpected_worker_failure" },
    );
    expect(JSON.stringify(vi.mocked(console.error).mock.calls)).not.toContain(
      "private client initialization detail",
    );
  });
});
