import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";
import { createSupabaseEmailDeliveryStore } from "@/lib/server/supabase-email-delivery-store";

describe("Supabase email delivery store", () => {
  it("uses the migration RPC names, arguments, and claim token for state updates", async () => {
    const rpc = vi
      .fn()
      .mockResolvedValue({ data: [], error: null })
      .mockResolvedValueOnce({ data: [], error: null })
      .mockResolvedValueOnce({ data: true, error: null })
      .mockResolvedValueOnce({ data: true, error: null })
      .mockResolvedValueOnce({ data: true, error: null });
    const from = vi.fn();
    const client = { rpc, from } as unknown as SupabaseClient;
    const store = createSupabaseEmailDeliveryStore(client);

    await store.claimBatch(5);
    await store.complete("delivery-id", "claim-token", "provider-id");
    await store.retry("delivery-id", "claim-token", "provider_temporary");
    await store.fail("delivery-id", "claim-token", "provider_rejected");

    expect(rpc.mock.calls).toEqual([
      [
        "claim_portfolio_email_deliveries",
        { p_batch_size: 5 },
      ],
      [
        "complete_portfolio_email_delivery",
        {
          p_delivery_id: "delivery-id",
          p_claim_token: "claim-token",
          p_provider_message_id: "provider-id",
        },
      ],
      [
        "retry_portfolio_email_delivery",
        {
          p_delivery_id: "delivery-id",
          p_claim_token: "claim-token",
          p_error_code: "provider_temporary",
        },
      ],
      [
        "fail_portfolio_email_delivery",
        {
          p_delivery_id: "delivery-id",
          p_claim_token: "claim-token",
          p_error_code: "provider_rejected",
        },
      ],
    ]);
  });

  it("does not treat a false token-guarded transition as success", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: false, error: null });
    const client = { rpc, from: vi.fn() } as unknown as SupabaseClient;
    const store = createSupabaseEmailDeliveryStore(client);

    await expect(
      store.complete("delivery-id", "stale-token", null),
    ).resolves.toBe(false);
  });

  it("fetches only the linked enquiry fields needed to compose email", async () => {
    const maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
    const eq = vi.fn(() => ({ maybeSingle }));
    const select = vi.fn(() => ({ eq }));
    const from = vi.fn(() => ({ select }));
    const client = { rpc: vi.fn(), from } as unknown as SupabaseClient;
    const store = createSupabaseEmailDeliveryStore(client);

    await store.findEnquiry("enquiry-id");

    expect(from).toHaveBeenCalledWith("portfolio_enquiries");
    expect(select).toHaveBeenCalledWith("id, name, email, phone, message");
    expect(eq).toHaveBeenCalledWith("id", "enquiry-id");
  });
});
