-- Independent, portfolio-only email delivery queue.
-- Apply only to the CBC Portfolio hosted Supabase project.

BEGIN;

CREATE TABLE public.portfolio_email_deliveries (
    id uuid PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid(),
    enquiry_id uuid NOT NULL
        REFERENCES public.portfolio_enquiries (id) ON DELETE CASCADE,
    recipient_type text NOT NULL,
    status text NOT NULL DEFAULT 'pending',
    attempt_count integer NOT NULL DEFAULT 0,
    last_attempt_at timestamp with time zone,
    next_attempt_at timestamp with time zone,
    lease_expires_at timestamp with time zone,
    claim_token uuid UNIQUE,
    provider_message_id text,
    last_error_code text,
    sent_at timestamp with time zone,
    created_at timestamp with time zone NOT NULL DEFAULT pg_catalog.now(),

    CONSTRAINT portfolio_email_deliveries_recipient_type
        CHECK (recipient_type IN ('owner', 'customer')),
    CONSTRAINT portfolio_email_deliveries_status
        CHECK (status IN ('pending', 'sending', 'retry', 'sent', 'failed')),
    CONSTRAINT portfolio_email_deliveries_attempt_count
        CHECK (attempt_count BETWEEN 0 AND 5),
    CONSTRAINT portfolio_email_deliveries_provider_message_id
        CHECK (
            provider_message_id IS NULL
            OR (
                pg_catalog.btrim(provider_message_id) <> ''
                AND pg_catalog.char_length(provider_message_id) <= 256
            )
        ),
    CONSTRAINT portfolio_email_deliveries_error_code
        CHECK (
            last_error_code IS NULL
            OR last_error_code ~ '^[a-z0-9_]{1,64}$'
        ),
    CONSTRAINT portfolio_email_deliveries_state
        CHECK (
            (
                status = 'pending'
                AND attempt_count = 0
                AND last_attempt_at IS NULL
                AND next_attempt_at IS NULL
                AND lease_expires_at IS NULL
                AND claim_token IS NULL
                AND provider_message_id IS NULL
                AND last_error_code IS NULL
                AND sent_at IS NULL
            )
            OR (
                status = 'sending'
                AND attempt_count BETWEEN 1 AND 5
                AND last_attempt_at IS NOT NULL
                AND next_attempt_at IS NULL
                AND lease_expires_at IS NOT NULL
                AND lease_expires_at > last_attempt_at
                AND claim_token IS NOT NULL
                AND provider_message_id IS NULL
                AND last_error_code IS NULL
                AND sent_at IS NULL
            )
            OR (
                status = 'retry'
                AND attempt_count BETWEEN 1 AND 4
                AND last_attempt_at IS NOT NULL
                AND next_attempt_at IS NOT NULL
                AND next_attempt_at > last_attempt_at
                AND lease_expires_at IS NULL
                AND claim_token IS NULL
                AND provider_message_id IS NULL
                AND last_error_code IS NOT NULL
                AND sent_at IS NULL
            )
            OR (
                status = 'sent'
                AND attempt_count BETWEEN 1 AND 5
                AND last_attempt_at IS NOT NULL
                AND next_attempt_at IS NULL
                AND lease_expires_at IS NULL
                AND claim_token IS NULL
                AND last_error_code IS NULL
                AND sent_at IS NOT NULL
                AND sent_at >= last_attempt_at
            )
            OR (
                status = 'failed'
                AND attempt_count BETWEEN 1 AND 5
                AND last_attempt_at IS NOT NULL
                AND next_attempt_at IS NULL
                AND lease_expires_at IS NULL
                AND claim_token IS NULL
                AND provider_message_id IS NULL
                AND last_error_code IS NOT NULL
                AND sent_at IS NULL
            )
        ),
    CONSTRAINT portfolio_email_deliveries_enquiry_recipient
        UNIQUE (enquiry_id, recipient_type)
);

COMMENT ON TABLE public.portfolio_email_deliveries IS
    'Portfolio transactional email jobs, tracked independently per recipient type; contains no enquiry content or recipient address.';
COMMENT ON COLUMN public.portfolio_email_deliveries.recipient_type IS
    'The worker routes owner jobs to codedbycurt@gmail.com and customer jobs to the validated email on the linked enquiry.';
COMMENT ON COLUMN public.portfolio_email_deliveries.claim_token IS
    'Unique fencing token for the current lease; completion calls must present the current, unexpired token.';
COMMENT ON COLUMN public.portfolio_email_deliveries.last_error_code IS
    'Short non-PII category only; never store provider response bodies or submitted content.';
COMMENT ON COLUMN public.portfolio_email_deliveries.next_attempt_at IS
    'Retries use 1, 2, 4, then 8 minutes of backoff; five total claims are allowed before terminal failure.';

CREATE INDEX portfolio_email_deliveries_due_idx
    ON public.portfolio_email_deliveries (next_attempt_at, created_at)
    WHERE status IN ('pending', 'retry');

CREATE INDEX portfolio_email_deliveries_expired_lease_idx
    ON public.portfolio_email_deliveries (lease_expires_at)
    WHERE status = 'sending';

ALTER TABLE public.portfolio_email_deliveries ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.portfolio_email_deliveries
    FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE ON TABLE public.portfolio_email_deliveries
    TO service_role;

CREATE FUNCTION public.enqueue_portfolio_email_deliveries()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog, public
AS $function$
BEGIN
    INSERT INTO public.portfolio_email_deliveries (enquiry_id, recipient_type)
    VALUES (NEW.id, 'owner')
    ON CONFLICT (enquiry_id, recipient_type) DO NOTHING;

    IF NEW.email IS NOT NULL
       AND pg_catalog.btrim(NEW.email) <> ''
    THEN
        INSERT INTO public.portfolio_email_deliveries (enquiry_id, recipient_type)
        VALUES (NEW.id, 'customer')
        ON CONFLICT (enquiry_id, recipient_type) DO NOTHING;
    END IF;

    RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION public.enqueue_portfolio_email_deliveries()
    FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.enqueue_portfolio_email_deliveries()
    TO service_role;

CREATE TRIGGER portfolio_enquiries_enqueue_email_deliveries
AFTER INSERT ON public.portfolio_enquiries
FOR EACH ROW
EXECUTE FUNCTION public.enqueue_portfolio_email_deliveries();

CREATE FUNCTION public.claim_portfolio_email_deliveries(
    p_batch_size integer DEFAULT 10
)
RETURNS TABLE (
    delivery_id uuid,
    enquiry_id uuid,
    recipient_type text,
    claim_token uuid,
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

    UPDATE public.portfolio_email_deliveries AS delivery
    SET status = 'failed',
        lease_expires_at = NULL,
        claim_token = NULL,
        next_attempt_at = NULL,
        last_error_code = 'lease_expired_after_max_attempts'
    WHERE delivery.status = 'sending'
      AND delivery.lease_expires_at <= v_now
      AND delivery.attempt_count >= 5;

    RETURN QUERY
    WITH candidates AS (
        SELECT delivery.id
        FROM public.portfolio_email_deliveries AS delivery
        WHERE delivery.attempt_count < 5
          AND (
              delivery.status = 'pending'
              OR (
                  delivery.status = 'retry'
                  AND delivery.next_attempt_at <= v_now
              )
              OR (
                  delivery.status = 'sending'
                  AND delivery.lease_expires_at <= v_now
              )
          )
        ORDER BY
            COALESCE(
                delivery.next_attempt_at,
                delivery.lease_expires_at,
                delivery.created_at
            ),
            delivery.created_at
        LIMIT p_batch_size
        FOR UPDATE OF delivery SKIP LOCKED
    ),
    claimed AS (
        UPDATE public.portfolio_email_deliveries AS delivery
        SET status = 'sending',
            attempt_count = delivery.attempt_count + 1,
            last_attempt_at = v_now,
            next_attempt_at = NULL,
            lease_expires_at = v_now + interval '5 minutes',
            claim_token = pg_catalog.gen_random_uuid(),
            provider_message_id = NULL,
            last_error_code = NULL,
            sent_at = NULL
        FROM candidates
        WHERE delivery.id = candidates.id
        RETURNING
            delivery.id,
            delivery.enquiry_id,
            delivery.recipient_type,
            delivery.claim_token,
            delivery.attempt_count
    )
    SELECT
        claimed.id,
        claimed.enquiry_id,
        claimed.recipient_type,
        claimed.claim_token,
        claimed.attempt_count
    FROM claimed;
END;
$function$;

CREATE FUNCTION public.complete_portfolio_email_delivery(
    p_delivery_id uuid,
    p_claim_token uuid,
    p_provider_message_id text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog, public
AS $function$
BEGIN
    IF p_provider_message_id IS NOT NULL
       AND (
           pg_catalog.btrim(p_provider_message_id) = ''
           OR pg_catalog.char_length(p_provider_message_id) > 256
       )
    THEN
        RAISE EXCEPTION 'Invalid provider message ID'
            USING ERRCODE = '22023';
    END IF;

    UPDATE public.portfolio_email_deliveries AS delivery
    SET status = 'sent',
        next_attempt_at = NULL,
        lease_expires_at = NULL,
        claim_token = NULL,
        provider_message_id = p_provider_message_id,
        last_error_code = NULL,
        sent_at = pg_catalog.clock_timestamp()
    WHERE delivery.id = p_delivery_id
      AND delivery.status = 'sending'
      AND delivery.claim_token = p_claim_token
      AND delivery.lease_expires_at > pg_catalog.clock_timestamp();

    RETURN FOUND;
END;
$function$;

CREATE FUNCTION public.retry_portfolio_email_delivery(
    p_delivery_id uuid,
    p_claim_token uuid,
    p_error_code text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog, public
AS $function$
BEGIN
    IF p_error_code IS NULL OR p_error_code !~ '^[a-z0-9_]{1,64}$' THEN
        RAISE EXCEPTION 'Invalid email delivery error category'
            USING ERRCODE = '22023';
    END IF;

    UPDATE public.portfolio_email_deliveries AS delivery
    SET status = CASE
            WHEN delivery.attempt_count < 5 THEN 'retry'
            ELSE 'failed'
        END,
        next_attempt_at = CASE
            WHEN delivery.attempt_count < 5 THEN
                pg_catalog.clock_timestamp()
                    + pg_catalog.make_interval(
                        mins => LEAST(
                            60,
                            pg_catalog.power(
                                2::numeric,
                                (delivery.attempt_count - 1)::numeric
                            )::integer
                        )
                    )
            ELSE NULL
        END,
        lease_expires_at = NULL,
        claim_token = NULL,
        provider_message_id = NULL,
        last_error_code = p_error_code,
        sent_at = NULL
    WHERE delivery.id = p_delivery_id
      AND delivery.status = 'sending'
      AND delivery.claim_token = p_claim_token
      AND delivery.lease_expires_at > pg_catalog.clock_timestamp();

    RETURN FOUND;
END;
$function$;

CREATE FUNCTION public.fail_portfolio_email_delivery(
    p_delivery_id uuid,
    p_claim_token uuid,
    p_error_code text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog, public
AS $function$
BEGIN
    IF p_error_code IS NULL OR p_error_code !~ '^[a-z0-9_]{1,64}$' THEN
        RAISE EXCEPTION 'Invalid email delivery error category'
            USING ERRCODE = '22023';
    END IF;

    UPDATE public.portfolio_email_deliveries AS delivery
    SET status = 'failed',
        next_attempt_at = NULL,
        lease_expires_at = NULL,
        claim_token = NULL,
        provider_message_id = NULL,
        last_error_code = p_error_code,
        sent_at = NULL
    WHERE delivery.id = p_delivery_id
      AND delivery.status = 'sending'
      AND delivery.claim_token = p_claim_token
      AND delivery.lease_expires_at > pg_catalog.clock_timestamp();

    RETURN FOUND;
END;
$function$;

REVOKE ALL ON FUNCTION public.claim_portfolio_email_deliveries(integer)
    FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.complete_portfolio_email_delivery(uuid, uuid, text)
    FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.retry_portfolio_email_delivery(uuid, uuid, text)
    FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.fail_portfolio_email_delivery(uuid, uuid, text)
    FROM PUBLIC, anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION public.claim_portfolio_email_deliveries(integer)
    TO service_role;
GRANT EXECUTE ON FUNCTION public.complete_portfolio_email_delivery(uuid, uuid, text)
    TO service_role;
GRANT EXECUTE ON FUNCTION public.retry_portfolio_email_delivery(uuid, uuid, text)
    TO service_role;
GRANT EXECUTE ON FUNCTION public.fail_portfolio_email_delivery(uuid, uuid, text)
    TO service_role;

COMMIT;
