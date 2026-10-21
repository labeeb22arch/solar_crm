# Sunpay CRM

The current React/Vite application is in `app/`.

## Run locally

```sh
cd app
npm ci
cp .env.example .env.local
npm run dev
```

Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in `app/.env.local` to use your Supabase backend. Never use a service-role key in the frontend.

Local URL: http://localhost:5210

## Build / deploy

```sh
cd app
npm ci
npm run build
```

Deploy `app/dist` to your static host. For GitHub Pages at `/solar_crm/`, build with:

```sh
npm run build -- --base=/solar_crm/
```

Provide the two `VITE_SUPABASE_*` variables in your hosting build environment or GitHub Actions secrets. They must be present when the build runs. Routes use URL hashes, so no server routing rewrite is needed.

Database setup scripts are in `app/supabase/`; local credentials and environment files are excluded. Example data scripts in `app/supabase/examples/` contain illustrative values only.

This is the current working CRM, including customer records, document workflows, procurement, installations, Finance, loan/subsidy tracking and warranty screens. Some cloud operations require their matching SQL/RPC setup; review the SQL scripts before enabling those operations. The requested completed-customer/Warranty separation and recoverable Trash are not implemented yet.
