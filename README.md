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

From the repository root, run `npm run deploy` to build the current app and push only its production assets to the `gh-pages` branch. This requires GitHub push access. Then enable Settings → Pages → Deploy from a branch → `gh-pages` → `/ (root)` using an account with Admin or Maintainer access.

Use `npm run deploy -- --build-only` to validate the build without pushing.

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

This is the current working CRM, including customer records, document workflows, procurement, installations, Finance, loan/subsidy tracking and warranty screens. Some cloud operations require their matching SQL/RPC setup; review the SQL scripts before enabling those operations. Active customers are separate from Completed (warranty/service), and Trash supports recoverable removal. Project Management follows the end-to-end pipeline with stages expanding under Project Management in the main menu and confirmed next-stage moves. Today and Overview use the same current-stage tasks. Warranty records live in Completed.

## Product and engineering decisions

- [Architecture decision records](docs/adr/README.md)
- [Design system](docs/design/DESIGN-SYSTEM.md)
- [Current customer-workspace design session](docs/design/WORKING-SESSION.md)
- [Engineering follow-up](docs/engineering/BACKLOG.md)

Run `npm test` from the repository root for the domain regression suite.
