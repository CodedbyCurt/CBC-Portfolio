-- Cross-instance rate limiting for the public CBC Portfolio enquiry endpoint.
-- Apply only to the CBC Portfolio hosted Supabase project.

BEGIN;

CREATE TABLE public.portfolio_enquiry_rate_limits (
    client_fingerprint text PRIMARY KEY
        CHECK (client_fingerprint ~ '^[0-9a-f]{64}$'),
    window_started_at timestamp with time zone NOT NULL,
    request_count smallint NOT NULL
        CHECK (request_count BETWEEN 1 AND 6)
);

COMMENT ON TABLE public.portfolio_enquiry_rate_limits IS
    'Short-lived HMAC client fingerprints and request counts for portfolio enquiry abuse protection.';
COMMENT ON COLUMN public.portfolio_enquiry_rate_limits.client_fingerprint IS
    'HMAC-SHA-256 of a normalized client network address; raw addresses are not stored.';

CREATE INDEX portfolio_enquiry_rate_limits_window_started_at_idx
    ON public.portfolio_enquiry_rate_limits (window_started_at);

ALTER TABLE public.portfolio_enquiry_rate_limits ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.portfolio_enquiry_rate_limits
    FROM PUBLIC, anon, authenticated, service_role;

CREATE FUNCTION public.consume_portfolio_enquiry_rate_limit(
    p_client_fingerprint text
)
RETURNS TABLE (
    allowed boolean,
    retry_after_seconds integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $function$
DECLARE
    v_now timestamp with time zone;
    v_window_started_at timestamp with time zone;
    v_request_count smallint;
BEGIN
    IF p_client_fingerprint IS NULL
       OR p_client_fingerprint !~ '^[0-9a-f]{64}$' THEN
        RAISE EXCEPTION 'Invalid portfolio enquiry client fingerprint'
            USING ERRCODE = '22023';
    END IF;

    PERFORM pg_catalog.pg_advisory_xact_lock(
        pg_catalog.hashtextextended(p_client_fingerprint, 0)
    );
    v_now := pg_catalog.clock_timestamp();

    v_window_started_at := pg_catalog.to_timestamp(
        pg_catalog.floor(pg_catalog.date_part('epoch', v_now) / 900) * 900
    );

    INSERT INTO public.portfolio_enquiry_rate_limits AS rate_limit (
        client_fingerprint,
        window_started_at,
        request_count
    )
    VALUES (p_client_fingerprint, v_window_started_at, 1)
    ON CONFLICT (client_fingerprint) DO UPDATE
    SET window_started_at = EXCLUDED.window_started_at,
        request_count = CASE
            WHEN rate_limit.window_started_at = EXCLUDED.window_started_at
                THEN LEAST(rate_limit.request_count + 1, 6)::smallint
            ELSE 1
        END
    RETURNING rate_limit.request_count INTO v_request_count;

    WITH expired AS (
        SELECT client_fingerprint
        FROM public.portfolio_enquiry_rate_limits
        WHERE window_started_at < v_now - interval '24 hours'
        ORDER BY window_started_at, client_fingerprint
        LIMIT 100
        FOR UPDATE SKIP LOCKED
    )
    DELETE FROM public.portfolio_enquiry_rate_limits AS rate_limit
    USING expired
    WHERE rate_limit.client_fingerprint = expired.client_fingerprint
      AND rate_limit.window_started_at < v_now - interval '24 hours';

    RETURN QUERY
    SELECT
        v_request_count <= 5,
        GREATEST(
            1,
            pg_catalog.ceil(
                pg_catalog.date_part(
                    'epoch',
                    v_window_started_at + interval '15 minutes' - v_now
                )
            )::integer
        );
END;
$function$;

REVOKE ALL ON FUNCTION public.consume_portfolio_enquiry_rate_limit(text)
    FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.consume_portfolio_enquiry_rate_limit(text)
    TO service_role;

COMMIT;
