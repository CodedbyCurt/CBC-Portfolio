-- Portfolio-only enquiry storage and notification outbox foundation.
-- Apply only to the CBC Portfolio hosted Supabase project.

BEGIN;

CREATE TABLE public.portfolio_enquiries (
    id uuid PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid(),
    idempotency_key uuid NOT NULL UNIQUE,
    name text NOT NULL,
    email text,
    phone text,
    message text NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT pg_catalog.now(),
    notification_status text NOT NULL DEFAULT 'pending',
    notification_attempt_count integer NOT NULL DEFAULT 0,
    last_notification_attempt_at timestamp with time zone,
    next_notification_attempt_at timestamp with time zone,
    notification_sent_at timestamp with time zone,
    notification_lease_expires_at timestamp with time zone,
    notification_claim_token uuid,
    last_notification_error_code text,

    CONSTRAINT portfolio_enquiries_name_length
        CHECK (
            name = pg_catalog.btrim(name)
            AND name <> ''
            AND pg_catalog.char_length(name) <= 100
        ),
    CONSTRAINT portfolio_enquiries_email_length
        CHECK (
            email IS NULL
            OR (
                email = pg_catalog.btrim(email)
                AND email <> ''
                AND pg_catalog.char_length(email) <= 254
            )
        ),
    CONSTRAINT portfolio_enquiries_phone_length
        CHECK (
            phone IS NULL
            OR (
                phone = pg_catalog.btrim(phone)
                AND phone <> ''
                AND pg_catalog.char_length(phone) <= 32
            )
        ),
    CONSTRAINT portfolio_enquiries_reply_method
        CHECK (email IS NOT NULL OR phone IS NOT NULL),
    CONSTRAINT portfolio_enquiries_message_length
        CHECK (
            message = pg_catalog.btrim(message)
            AND message <> ''
            AND pg_catalog.char_length(message) <= 4000
        ),
    CONSTRAINT portfolio_enquiries_notification_status
        CHECK (
            notification_status IN ('pending', 'sending', 'retry', 'sent', 'failed')
        ),
    CONSTRAINT portfolio_enquiries_attempt_count
        CHECK (notification_attempt_count BETWEEN 0 AND 5),
    CONSTRAINT portfolio_enquiries_error_code_length
        CHECK (
            last_notification_error_code IS NULL
            OR last_notification_error_code ~ '^[a-z0-9_]{1,64}$'
        ),
    CONSTRAINT portfolio_enquiries_notification_state
        CHECK (
            (
                notification_status = 'pending'
                AND notification_attempt_count = 0
                AND last_notification_attempt_at IS NULL
                AND next_notification_attempt_at IS NULL
                AND notification_sent_at IS NULL
                AND notification_lease_expires_at IS NULL
                AND notification_claim_token IS NULL
                AND last_notification_error_code IS NULL
            )
            OR (
                notification_status = 'sending'
                AND notification_attempt_count BETWEEN 1 AND 5
                AND last_notification_attempt_at IS NOT NULL
                AND last_notification_attempt_at >= created_at
                AND next_notification_attempt_at IS NULL
                AND notification_sent_at IS NULL
                AND notification_lease_expires_at IS NOT NULL
                AND notification_lease_expires_at > last_notification_attempt_at
                AND notification_claim_token IS NOT NULL
            )
            OR (
                notification_status = 'retry'
                AND notification_attempt_count BETWEEN 1 AND 4
                AND last_notification_attempt_at IS NOT NULL
                AND last_notification_attempt_at >= created_at
                AND next_notification_attempt_at IS NOT NULL
                AND next_notification_attempt_at > last_notification_attempt_at
                AND notification_sent_at IS NULL
                AND notification_lease_expires_at IS NULL
                AND notification_claim_token IS NULL
                AND last_notification_error_code IS NOT NULL
            )
            OR (
                notification_status = 'sent'
                AND notification_attempt_count BETWEEN 1 AND 5
                AND last_notification_attempt_at IS NOT NULL
                AND last_notification_attempt_at >= created_at
                AND next_notification_attempt_at IS NULL
                AND notification_sent_at IS NOT NULL
                AND notification_sent_at >= last_notification_attempt_at
                AND notification_lease_expires_at IS NULL
                AND notification_claim_token IS NULL
                AND last_notification_error_code IS NULL
            )
            OR (
                notification_status = 'failed'
                AND notification_attempt_count BETWEEN 1 AND 5
                AND last_notification_attempt_at IS NOT NULL
                AND last_notification_attempt_at >= created_at
                AND next_notification_attempt_at IS NULL
                AND notification_sent_at IS NULL
                AND notification_lease_expires_at IS NULL
                AND notification_claim_token IS NULL
                AND last_notification_error_code IS NOT NULL
            )
        )
);

COMMENT ON TABLE public.portfolio_enquiries IS
    'CBC Portfolio website enquiries and Formspree notification outbox state.';
COMMENT ON COLUMN public.portfolio_enquiries.idempotency_key IS
    'Client submission UUID; unique to make API retries idempotent.';
COMMENT ON COLUMN public.portfolio_enquiries.notification_claim_token IS
    'Fencing token for the current notification worker lease.';
COMMENT ON COLUMN public.portfolio_enquiries.last_notification_error_code IS
    'Short non-PII error category; never store provider response bodies or submitted content.';

CREATE INDEX portfolio_enquiries_created_at_idx
    ON public.portfolio_enquiries (created_at DESC);

CREATE INDEX portfolio_enquiries_due_notifications_idx
    ON public.portfolio_enquiries (notification_status, next_notification_attempt_at)
    WHERE notification_status IN ('pending', 'retry');

CREATE INDEX portfolio_enquiries_expired_leases_idx
    ON public.portfolio_enquiries (notification_lease_expires_at)
    WHERE notification_status = 'sending';

COMMENT ON COLUMN public.portfolio_enquiries.next_notification_attempt_at IS
    'Worker-managed retry time; use capped exponential backoff and stop after five total claims.';

ALTER TABLE public.portfolio_enquiries ENABLE ROW LEVEL SECURITY;

-- This table is new; revoke default/public grants and grant only the server role
-- the operations needed for submission and notification processing.
REVOKE ALL ON TABLE public.portfolio_enquiries
    FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE ON TABLE public.portfolio_enquiries TO service_role;

CREATE FUNCTION public.claim_portfolio_enquiry_notifications(
    p_batch_size integer DEFAULT 10
)
RETURNS TABLE (
    id uuid,
    claim_token uuid,
    name text,
    email text,
    phone text,
    message text,
    attempt_number integer
)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog, public
AS $function$
DECLARE
    v_now timestamp with time zone := pg_catalog.clock_timestamp();
BEGIN
    IF p_batch_size IS NULL OR p_batch_size < 1 OR p_batch_size > 100 THEN
        RAISE EXCEPTION 'p_batch_size must be between 1 and 100'
            USING ERRCODE = '22023';
    END IF;

    -- A fifth attempt whose lease expired has an ambiguous delivery outcome;
    -- stop automatic retries and retain a safe diagnostic for operator review.
    UPDATE public.portfolio_enquiries AS enquiry
    SET notification_status = 'failed',
        notification_lease_expires_at = NULL,
        notification_claim_token = NULL,
        next_notification_attempt_at = NULL,
        last_notification_error_code = 'lease_expired_after_max_attempts'
    WHERE enquiry.notification_status = 'sending'
      AND enquiry.notification_lease_expires_at <= v_now
      AND enquiry.notification_attempt_count >= 5;

    RETURN QUERY
    WITH candidates AS (
        SELECT enquiry.id
        FROM public.portfolio_enquiries AS enquiry
        WHERE enquiry.notification_attempt_count < 5
          AND (
              enquiry.notification_status = 'pending'
              OR (
                  enquiry.notification_status = 'retry'
                  AND enquiry.next_notification_attempt_at <= v_now
              )
              OR (
                  enquiry.notification_status = 'sending'
                  AND enquiry.notification_lease_expires_at <= v_now
              )
          )
        ORDER BY
              COALESCE(
                enquiry.next_notification_attempt_at,
                enquiry.notification_lease_expires_at,
                enquiry.created_at
            ),
            enquiry.created_at
        LIMIT p_batch_size
        FOR UPDATE OF enquiry SKIP LOCKED
    ),
    claimed AS (
        UPDATE public.portfolio_enquiries AS enquiry
        SET notification_status = 'sending',
            notification_attempt_count = enquiry.notification_attempt_count + 1,
            last_notification_attempt_at = v_now,
            next_notification_attempt_at = NULL,
            notification_sent_at = NULL,
            notification_lease_expires_at = v_now + interval '5 minutes',
            notification_claim_token = pg_catalog.gen_random_uuid()
        FROM candidates
        WHERE enquiry.id = candidates.id
        RETURNING
            enquiry.id,
            enquiry.notification_claim_token,
            enquiry.name,
            enquiry.email,
            enquiry.phone,
            enquiry.message,
            enquiry.notification_attempt_count
    )
    SELECT
        claimed.id,
        claimed.notification_claim_token,
        claimed.name,
        claimed.email,
        claimed.phone,
        claimed.message,
        claimed.notification_attempt_count
    FROM claimed;
END;
$function$;

COMMENT ON FUNCTION public.claim_portfolio_enquiry_notifications(integer) IS
    'Atomically leases eligible notifications, recovering expired leases and enforcing five total attempts.';

REVOKE ALL ON FUNCTION public.claim_portfolio_enquiry_notifications(integer)
    FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.claim_portfolio_enquiry_notifications(integer)
    TO service_role;

COMMIT;
