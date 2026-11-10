# CBC Portfolio Project Status

## Completed backend foundation

- The portfolio Supabase migration was applied and independently verified, as reported by the project owner.
- Server-only Supabase client, lazy environment validation, and enquiry schema are implemented.
- Repository Node.js version is pinned to 22.23.4.
- Latest production-only npm audit reported zero vulnerabilities; the full development-inclusive audit reported 13 findings (2 low, 11 moderate).

## Current stage

The portfolio site and enquiry email delivery are operational. Custom-domain DNS and HTTPS, Resend domain authentication, and IONOS mailbox delivery/forwarding to `codedbycurt@gmail.com` have been confirmed by the project owner.

- Added `POST /api/enquiries` with exact Origin checks, bounded JSON reading, schema validation, honeypot handling, and idempotent Supabase persistence.
- Added a Supabase-backed, atomic per-client rate limit of five requests per 15-minute window. Apply the rate-limit migration to the hosted CBC Portfolio database before this protection is active in production.
- The contact form now submits JSON to `/api/enquiries`, retains the same idempotency key for retries of the same payload, and reports loading, validation, success, and safe retry states accessibly.
- Tests cover API routes, form submission, email worker/store behavior, schema validation, and migration contracts; provider and database interactions in automated tests are mocked.
- The route relies on Next.js's Node.js default runtime because this app enables Cache Components, for which the installed Next.js documentation disallows a route `runtime` export.
- Added an additive migration for independently tracked owner and customer email deliveries. Its application to the CBC Portfolio Supabase project was reported by the project owner.
- The new queue creates an owner job for each inserted enquiry (for `codedbycurt@gmail.com`) and a customer job only when the email is non-null and non-empty after trimming. API email validation is authoritative; the trigger only checks email presence. It uses individual leases and claim tokens, up to five claims, bounded exponential retry delays, and service-role-only access without duplicating enquiry content.
- The Netlify Scheduled Function is operational. It claims up to five delivery jobs per minute and calls Resend's HTTPS API using a stable idempotency key per delivery record. Owner and customer outcomes are updated independently through the migration's claim-token-protected RPC functions.
- Resend domain authentication is working, and owner notification and customer confirmation emails have been successfully tested. Owner notifications go to `codedbycurt@gmail.com`; customer confirmations are sent only to a valid stored email and are replyable to `curt@codedbycurt.co.uk`. Email templates include escaped HTML and plain text.
- The worker depends on `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, and `ENQUIRY_NOTIFICATION_EMAIL`. Keep credentials server-side and review deployment settings if the worker configuration changes.
- Netlify configuration points scheduled functions to `netlify/functions`; the worker runs every minute on published deploys and is not an unrestricted request endpoint. Scheduled functions require manual invocation for preview testing.
- Netlify `SECRETS_SCAN_OMIT_KEYS` narrowly excludes `ENQUIRY_NOTIFICATION_EMAIL` and `RESEND_FROM_EMAIL`, which the confirmed build log flagged as email-address false positives; secret scanning remains enabled and all credential variables remain scanned.
- The existing enquiry notification columns and claim function remain unchanged. The worker uses only `portfolio_email_deliveries`; no CRM integration or direct email sending was added to the enquiry API.
- The project owner reports that a test enquiry was stored and verified in the hosted `portfolio_enquiries` table.

## Next milestone

Complete remaining security and launch-readiness review, with emphasis on public API abuse protection and verification of deployment safeguards.

## Outstanding work

- Apply the portfolio enquiry rate-limit migration to hosted Supabase and verify the function is available to the server role before deploying the endpoint change.
- Review remaining public endpoint abuse protections and deployment safeguards.
- Review preview Origin configuration and isolated Supabase credentials for Deploy Previews.
- Re-verify the email-delivery migration and queue RPC behavior if the hosted database configuration changes.
- Complete SEO, accessibility, performance, legal, analytics, deployment, and production verification.
- Complete demonstration websites.

The overall website is not complete.
