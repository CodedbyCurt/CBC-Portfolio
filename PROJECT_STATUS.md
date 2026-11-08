# CBC Portfolio Project Status

## Completed backend foundation

- The portfolio Supabase migration was applied and independently verified, as reported by the project owner.
- Server-only Supabase client, lazy environment validation, and enquiry schema are implemented.
- Repository Node.js version is pinned to 22.23.4.
- Latest production-only npm audit reported zero vulnerabilities; the full development-inclusive audit reported 13 findings (2 low, 11 moderate).

## Current stage

Stage 1.6: Resend delivery worker implemented; external configuration and end-to-end verification pending.

- Added `POST /api/enquiries` with exact Origin checks, bounded JSON reading, schema validation, honeypot handling, and idempotent Supabase persistence.
- Removed the Upstash and Netlify Functions dependencies from the API path. Distributed rate limiting is currently absent; the public endpoint is not production-ready without an effective request-volume control.
- The contact form now submits JSON to `/api/enquiries`, retains the same idempotency key for retries of the same payload, and reports loading, validation, success, and safe retry states accessibly.
- Added mocked API route, form submission, email worker/store, and SQL migration contract tests; the suite currently has 103 tests covering payload validation, safe retries, idempotency, accessible form states, independent recipient delivery, and queue invariants.
- The route relies on Next.js's Node.js default runtime because this app enables Cache Components, for which the installed Next.js documentation disallows a route `runtime` export.
- Added an additive migration for independently tracked owner and customer email deliveries. The project owner reports that it has been applied to the CBC Portfolio Supabase project.
- The new queue creates an owner job for each inserted enquiry (for `codedbycurt@gmail.com`) and a customer job only when the email is non-null and non-empty after trimming. API email validation is authoritative; the trigger only checks email presence. It uses individual leases and claim tokens, up to five claims, bounded exponential retry delays, and service-role-only access without duplicating enquiry content.
- Added a Netlify Scheduled Function that claims up to five delivery jobs per minute and calls Resend's HTTPS API using a stable idempotency key per delivery record. Owner and customer outcomes are updated independently through the migration's claim-token-protected RPC functions.
- Owner notifications go to `codedbycurt@gmail.com`; customer confirmations are sent only to a valid stored email, replyable to `curt@codedbycurt.co.uk`. Email templates include escaped HTML and plain text.
- Required worker settings are `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, and `ENQUIRY_NOTIFICATION_EMAIL`. Configure them in local `.env.local` for local work and in Netlify environment variables for deployed contexts; secrets must remain server-side.
- Netlify configuration points scheduled functions to `netlify/functions`; the worker runs every minute on published deploys and is not an unrestricted request endpoint. Scheduled functions require manual invocation for preview testing.
- The existing enquiry notification columns and claim function remain unchanged. The worker uses only `portfolio_email_deliveries`; no CRM integration or direct email sending was added to the enquiry API.
- The project owner reports that a local test enquiry was stored and verified in the hosted `portfolio_enquiries` table. No live Resend or Supabase requests were made during this implementation; provider and database interactions in tests are mocked.

## Next milestone

Configure and verify Resend domain authentication and Netlify environment variables, then invoke the scheduled worker against controlled test inboxes. Establish effective rate limiting before public launch and verify the full flow in an isolated deployment.

## Outstanding work

- Confirm the reported email-delivery migration application in CBC Portfolio and verify queue RPC behavior.
- Configure and verify `codedbycurt.co.uk` sender-domain authentication in Resend.
- Add the required server-side environment variables to the appropriate Netlify deploy contexts.
- Invoke the scheduled worker in Netlify with controlled test inboxes and verify independent delivery outcomes and retries.
- Implement distributed rate limiting before public launch; verify preview Origin configuration and isolated Supabase credentials.
- Verify API and contact form end-to-end in a Deploy Preview with isolated Supabase credentials and exact preview Origin configuration.
- Complete SEO, accessibility, performance, legal, analytics, deployment, and production verification.
- Complete demonstration websites.

The overall website is not complete.
