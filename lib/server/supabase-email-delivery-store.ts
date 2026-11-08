import type { SupabaseClient } from "@supabase/supabase-js";
import {
  EmailDeliveryDatabaseError,
  type EmailDeliveryStore,
} from "@/lib/server/email-delivery-worker";

function throwOnRpcError(error: unknown): void {
  if (error) throw new EmailDeliveryDatabaseError(error);
}

export function createSupabaseEmailDeliveryStore(
  client: SupabaseClient,
): EmailDeliveryStore {
  return {
    async claimBatch(batchSize) {
      const { data, error } = await client.rpc(
        "claim_portfolio_email_deliveries",
        { p_batch_size: batchSize },
      );
      throwOnRpcError(error);
      return data;
    },

    async findEnquiry(enquiryId) {
      const { data, error } = await client
        .from("portfolio_enquiries")
        .select("id, name, email, phone, message")
        .eq("id", enquiryId)
        .maybeSingle();
      throwOnRpcError(error);
      return data;
    },

    async complete(deliveryId, claimToken, providerMessageId) {
      const { data, error } = await client.rpc(
        "complete_portfolio_email_delivery",
        {
          p_delivery_id: deliveryId,
          p_claim_token: claimToken,
          p_provider_message_id: providerMessageId,
        },
      );
      throwOnRpcError(error);
      return data === true;
    },

    async retry(deliveryId, claimToken, errorCode) {
      const { data, error } = await client.rpc(
        "retry_portfolio_email_delivery",
        {
          p_delivery_id: deliveryId,
          p_claim_token: claimToken,
          p_error_code: errorCode,
        },
      );
      throwOnRpcError(error);
      return data === true;
    },

    async fail(deliveryId, claimToken, errorCode) {
      const { data, error } = await client.rpc(
        "fail_portfolio_email_delivery",
        {
          p_delivery_id: deliveryId,
          p_claim_token: claimToken,
          p_error_code: errorCode,
        },
      );
      throwOnRpcError(error);
      return data === true;
    },
  };
}
