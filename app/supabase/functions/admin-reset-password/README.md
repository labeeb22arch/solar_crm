# Admin password reset

The Users page opens a reset dialog with email and direct password options.
Email uses the existing Supabase Auth recovery flow. Direct reset requires this
Edge Function in the same project as VITE_SUPABASE_URL.

Deploy `admin-reset-password` using the Supabase dashboard or CLI with JWT
verification enabled. Include `index.ts` and `handler.mjs`. The runtime supplies
SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY; never add the service key to Vite env.
The handler validates the caller with Auth and requires an active Admin profile
before calling Auth Admin for the target user. Passwords are never stored in CRM
records or logs.

Local checks: `node --test supabase/functions/admin-reset-password/handler.test.mjs`.
The connected Supabase account did not include the CRM project
`jhxtbudejgalkbncklep`, so this function has not been deployed or tested against
that project. Do not report direct resets as live until deployment and a test
with an explicitly designated test account succeed.

Email delivery and recovery redirects also need verification with a designated
test inbox; no emails or password changes were performed during implementation.
