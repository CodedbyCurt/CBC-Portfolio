# CBC Portfolio Project Status

## Completed backend foundation

- The portfolio Supabase migration was applied and independently verified, as reported by the project owner.
- Server-only Supabase client, lazy environment validation, enquiry schema, and Upstash rate limiter are implemented.
- Repository Node.js version is pinned to 22.
- Latest production-only npm audit reported zero vulnerabilities; the full development-inclusive audit reported 13 findings (2 low, 11 moderate).

## Current stage

Stage 1.4: server-side enquiry API implemented with persistent Vitest coverage.

- Added `POST /api/enquiries` with origin checks, bounded JSON reading, schema validation, trusted Netlify request IP, rate limiting, honeypot handling, and idempotent Supabase persistence.
- Added `@netlify/functions` 6.1.1 as a production dependency; it requires Node.js 22.12 or later.
- Added mocked API route tests; the current suite has 87 passing tests, including body-stream failures, exact-limit and invalid UTF-8 bodies, ambiguous insert outcomes, and a simulated concurrent idempotency race.
- The route relies on Next.js's Node.js default runtime because this app enables Cache Components, for which the installed Next.js documentation disallows a route `runtime` export.
- No live Supabase or Upstash calls were made, and the contact form remains unchanged.

## Next milestone

Verify trusted Netlify IP context and environment configuration in a Deploy Preview, then integrate the contact form as a separate milestone.

## Outstanding work

- Integrate the existing contact form after API verification.
- Implement the separate notification worker.
- Verify Netlify adapter/runtime behavior, preview origin allowlists, and isolated preview credentials.
- Complete SEO, accessibility, performance, legal, analytics, deployment, and production verification.
- Complete demonstration websites.

The overall website is not complete.
