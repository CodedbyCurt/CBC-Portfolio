import { createClient } from "@supabase/supabase-js";
import type { Config } from "@netlify/functions";
import { getEmailDeliveryEnvironment } from "../../lib/server/email-delivery-env";
import {
  EmailDeliveryDatabaseError,
  EmailDeliveryWorkerError,
  runEmailDeliveryBatch,
} from "../../lib/server/email-delivery-worker";
import { createSupabaseEmailDeliveryStore } from "../../lib/server/supabase-email-delivery-store";

export default async function processEmailDeliveries(): Promise<void> {
  let category:
    | "environment_validation"
    | "unexpected_worker_failure" = "environment_validation";
  try {
    const environment = getEmailDeliveryEnvironment();
    category = "unexpected_worker_failure";
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
      fetch,
      (diagnostic) => {
        console.error("Email delivery diagnostic.", diagnostic);
      },
    );

    console.info("Email delivery batch completed.", result);
  } catch (error) {
    const diagnostic =
      error instanceof EmailDeliveryWorkerError
        ? error.diagnostic
        : {
            category:
              error instanceof EmailDeliveryDatabaseError
                ? "database_processing"
                : category,
            ...(error instanceof EmailDeliveryDatabaseError && error.code
              ? { code: error.code }
              : {}),
          };
    console.error("Email delivery worker failed.", diagnostic);
    throw new Error("Email delivery worker execution failed.");
  }
}

export const config: Config = {
  schedule: "* * * * *",
};
