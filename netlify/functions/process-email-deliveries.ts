import { createClient } from "@supabase/supabase-js";
import type { Config } from "@netlify/functions";
import { getEmailDeliveryEnvironment } from "../../lib/server/email-delivery-env";
import { runEmailDeliveryBatch } from "../../lib/server/email-delivery-worker";
import { createSupabaseEmailDeliveryStore } from "../../lib/server/supabase-email-delivery-store";

export default async function processEmailDeliveries(): Promise<void> {
  try {
    const environment = getEmailDeliveryEnvironment();
    const supabase = createClient(
      environment.SUPABASE_URL,
      environment.SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: {
          autoRefreshToken: false,
          detectSessionInUrl: false,
          persistSession: false,
        },
      },
    );
    const result = await runEmailDeliveryBatch(
      createSupabaseEmailDeliveryStore(supabase),
      {
        apiKey: environment.RESEND_API_KEY,
        fromEmail: environment.RESEND_FROM_EMAIL,
        ownerEmail: environment.ENQUIRY_NOTIFICATION_EMAIL,
      },
    );

    console.info("Email delivery batch completed.", result);
  } catch {
    console.error("Email delivery worker failed.");
    throw new Error("Email delivery worker execution failed.");
  }
}

export const config: Config = {
  schedule: "* * * * *",
};
