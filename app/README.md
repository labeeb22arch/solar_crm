# Sunpay CRM — final combined front-end prototype

Front-end only, fake data only. Built for **Sunpay Renewable Energy LLP** (Deesa, Gujarat — solar EPC for residential, commercial and industrial sites). Started from `versions/v2-desk`, with the spreadsheet grid ported from `v3-ledger` and the five-part pulse from `v1-tracks`.

## Run

```bash
npm install
npm run dev      # http://127.0.0.1:5210
npm run build
```

**Demo sign-in:** email `1@crm`, no password (signs in as Admin). The app is branded "Solar CRM" with a plain sun mark; customer documents keep the Sunpay letterhead. This is a demo login, **not real security**: the details live in `src/data/demoAccounts.js` and are checked in the browser by `api.signIn()`. Supabase Auth will replace it. Session is kept in `localStorage` (`sunpay.app.session`). After signing in, the role switcher in the user menu (top right) lets you try every role; "Sign out" is in the same menu.

## What is built

- **Find a client in one step.** Search box always visible at the top (desktop and phone). It matches part of a name in any word order, phone (spaces, `+91` and a leading `0` are ignored), CRN, Project ID, DISCOM consumer number, city, channel partner and dealer. Results are grouped Customers / Pages / Actions, and each customer shows CRN, city, kWp and the status sentence. When the box is empty it shows "Recently opened". `⌘K` or `/` focuses it.
- **Quick look panel.** Clicking a customer anywhere opens a side panel with the status sentence, next step, milestone path, key facts and "Open full record".
- **Plain-English status everywhere.** Each customer gets a status sentence generated from the data (for example "Installed 5 Oct · Stuck: collect the balance payment (7 days)"), a next step with owner and due date (red when late), and key facts: phone with copy and call buttons, address, kWp, segment, branch, partner, payment method, amount due and subsidy.
- **Milestone path.** Booked → Finance ready → Installed → Grid connected → Subsidy received → Closed. Each milestone is worked out from the five parts of the job, not picked by hand. It shows the date reached, "by <date>", or "N days late". A mini version appears in list rows.
- **Customer record** (`/p/:id`): header, status, next step, milestones and key facts. Below that, five expandable parts (Booking & agreement · Payments & loan · Material & installation · Electricity board (DISCOM) · Handover & commission) with owner, status and age for each item. Also a timeline with filter chips and a composer, payments, team details and the Drive document list ("Link" for roles that may link documents).
- **Today at Sunpay** (Admin / Office home). A plain-language board with these sections:
  - new confirmed clients
  - installations today, tomorrow and this week (with team and address)
  - completed installations
  - DISCOM: files submitted, inspections to chase, net meters installed, name mismatches
  - loans and payments
  - subsidy
  - fully completed clients

  Every section has a "See all", which opens the Customers list pre-filtered. The v2 action queues sit in the **My tasks** tab.
- **Customers** (`/projects`): the v3 spreadsheet grid. It has saved views (All, Most stuck, Next step late, Loan customers, Payment due, Commercial & industrial, By milestone, plus your own), filters, grouping, column chooser and resize, keyboard movement, inline edit, bulk payment reminder, and CSV / Google Sheets export (Admin and Finance only). Columns include status sentence, milestone, next step, who and due. On phone it becomes a card list.
- **Overview**: the Today board, the milestone funnel, v1's five-part pulse tiles, a residential / commercial / industrial split, a branch split and the most-stuck list.
- **Partner home** (CPO / CP / Dealer): commission earned, pending, paid and upcoming, a "Needs your action" board (customers to call, waiting on documents, installations, new leads), the partner network (CPO and CP), and "My customers" with filter, status and milestones. Also Add lead and My commission.
- **Field / My jobs** (Technician, Installation Team): today's, upcoming and serials-pending jobs. Each job has a checklist, simulated barcode scan, manual entry, Excel import mock, site photos, report an issue and mark installed. Installation Team also gets Truck tally.
- **Stamp queue** (Stamp Staff): loan agreements, customer agreements and stamp paper, with Mark signed / Mark stamped.
- **Check access** (Admin, `/access`): every role and every demo identity with its customer count, the branches it sees, its commission lines and the pages it can open. Each row has a scope self-check (leak detector) and a "Try as" button.
- Other modules from the brief: quotation maker, feasibility report, name check, inventory, BOM, delivery challan, truck tally, DISCOM documents, install calendar, attendance, warranty, invoices, three commission pages, users and roles, activity log, and data import.
- **Feasibility report** (`/feasibility`, `src/docs/feasibility.js`): the 3-page PM Surya Ghar vendor feasibility report, a pdf-lib copy of SolarFlow's `feasibilityReport.js` (same coordinates, labels and pages). Vendor is SUNPAY RENEWABLE ENERGY LLP; EPC code, bank A/c and IFSC come from *Company sign & stamp* and stay blank until filled in. Pick a customer, fill any missing details (incl. PM Surya Ghar portal ID and Jan Samarth no., saved with `api.updateProjectFields`), check the live preview, "Highlight filled fields", Download PDF. District comes from the city (`src/docs/district.js`), PIN from the address.
- **DISCOM agreement** (`/grid/docs`, "Open agreement"; `src/docs/agreement/`): the 4-page PM Surya Ghar model agreement (pages 22–25), copied word for word from SolarFlow's Page1–Page4 with plain CSS (`agreement.css`). No stamp-paper page. Zoom, font size, highlights, Print, and Download PDF (html2canvas + jsPDF, highlights left out). The customer's signature goes on page 4 "SIGN:", Sunpay's stamp + signature on "Stamp & Sign:".
- **Company sign & stamp** (Admin, `/team/company`): upload photos of the stamp and the authorised signature; the paper is removed in the browser (`src/lib/cleanImage.js`), with before/after, cleaning strength and rotate. Saved in `app_state` key `company_assets` with EPC code, bank A/c and IFSC.
- **Customer signing link**: "Send signing link" on the customer record and the DISCOM page makes a 7-day, one-time link (`#/sign/<token>`) with Copy and WhatsApp. The public page needs no sign-in: the customer signs on screen or uploads a photo (cleaned to black ink). The signature is stored on the customer and logged on the timeline.
  - **Not private yet:** in this demo the whole database is loaded by the app, so the public link page could read other data. Before real customers use it, move `getSignRequest` / `submitSignature` to a Supabase RPC or edge function that checks the token and only returns first name, kWp and link state.
- **Residential proposal** (`/proposal?p=<id>`, `src/docs/proposal/`): multi-page A4 on-grid proposal for homes (cover, overview, how it works, system & BOM & warranties, generation, savings & returns, Loan & EMI for Bank Solar Loan / Personal Loan customers, commercial offer & payment schedule, terms, acceptance). Live preview with page jumps, zoom and Download PDF (html2canvas + jsPDF). Maths in `calc.js` (pure; `node src/docs/proposal/calc.test.mjs`), ported from the SolarFlow Toolbox quote generator, solar-savings and EMI tools. "Send for acceptance" saves a snapshot `p.proposal` (version, number `PRP-<crn digits>-v<n>`, inputs, totals) and a one-time link `p.proposalRequest`; the customer reads it on `#/sign/<token>` and accepts with the same draw-or-photo signature, which approves the quotation. Card on Documents, "Proposal" button on the customer record.
- **Proposal settings** (Admin, `/team/proposal-settings`, app_state key `proposal_settings`): package prices, equipment, warranties, tariff and savings assumptions, loan defaults, payment milestones, terms, validity. Defaults are placeholders (yellow banner until an Admin saves once). With Supabase, run `supabase/004_proposal.sql` once so the public link page can show and accept proposals.
- **Removed on request:** the MIS upload auto-updater and the gate pass maker, including their routes, menu entries, checklist items and API. Old URLs show "Page not found".
- **Navigation.** Side menu with the sun mark at the top, an icon chip on every item and the signed-in user card (role menu + theme toggle) at the bottom. For Admin / Office / Finance it is grouped into folding sections — Operations (Installations, Inventory, Procurement, Dispatch, Warranty, Vendors *Soon*), Money (Bills & invoices, Partner commission, Installation commission) and Team (Team, Team chat, Activity log); open/closed is remembered per browser (`solarcrm.nav.closed`). Partner, field and stamp roles keep a short flat menu. Bottom tabs on phone change by role. Every page has a one-line description, and empty states explain what will appear.
- **Theme ("Sunlit dashboard").** Warm off-white canvas (`#FBF7F1`) by default, warm charcoal in dark. Fonts: Plus Jakarta Sans (headings, numbers) + Inter (body), JetBrains Mono only for IDs. Sunpay orange for primary actions (`#B9501A` on light so white text passes AA), sun `#F2A03A` as a warm highlight, royal blue `#1F3FB4` for links and selected tabs. Stage colour groups: sales = violet, build = orange, grid / DISCOM = blue, done = green. Home has a greeting, KPI tiles with small charts (all figures from the existing api) and colourful stage chips. All tokens live at the top of `src/styles.css`.

## Role matrix (as implemented — `src/lib/access.js`, enforced in `src/data/api.js`)

| Role | Sees | Can do | Home |
|---|---|---|---|
| Admin | Everything, all branches (branch filter) | Everything incl. users, import, export, Check access | Today |
| Office Staff | Own branch. The "South (covers Main)" desk may switch between South and Main | Operations: edit items, notes, reminders, quotes, stamping, field. No users, import or export | Today |
| Finance | Everything (read-only banner) | Read and export only; every action disabled and refused by the API | Overview |
| CPO | Customers of all CPs and dealers under that office; their CP + dealer commission | Add leads, notes / follow-up, view docs | Partner home |
| CP | Own customers + their dealers' customers; own CP commission | Add leads (optionally for one of their dealers), link docs, notes | Partner home |
| Dealer | Only own customers; own dealer commission | Add leads, notes | Partner home |
| Technician | Only jobs assigned to them | Serial scan, checklist, photos, mark installed, report issue | My jobs |
| Installation Team | Only their crew's jobs | Same as technician + truck tally | My jobs |
| Stamp Staff | Only the agreement / stamp / loan-agreement queue | Mark signed / stamped | Stamp queue |

Partners never see installation or vendor commission, internal cost, company-wide commission, or other partners' customers. A CP does not see its dealers' commission, and a dealer does not see the CP's commission. Pages a role cannot open show a friendly "not available for your role" message, including when opened by direct URL. A customer outside a role's scope shows "This customer is not in your list".

## What is mocked

- All data is generated deterministically in `src/data/seed.js`: 150 projects, 3 CPOs, 8 CPs and 12 dealers, office desks scoped by branch, 4 crews and 6 technicians. Customers are weighted towards North Gujarat. Main Office is Deesa, and UGVCL is the most common DISCOM.
- About 8% of sites are Industrial (100–1000 kWp, GIDC estates).
- Phone numbers are `90000xxxxx`. Company letterhead details are kept in one `COMPANY` object.
- `src/data/api.js` is the only data access layer, using an in-memory store persisted to `localStorage` (`sunpay.final.db`). Scoping and permission checks live there, so a hosted Supabase backend with row-level security can mirror them.
- WhatsApp, calls, Google Drive, printing, the camera scan and the Excel import are simulated.

## Backend (Supabase)

- Project: `https://jhxtbudejgalkbncklep.supabase.co`. Settings live in `.env.local` (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`); without them the app runs on browser storage.
- Database setup: `supabase/001_setup.sql`, run once in Supabase → SQL Editor (already run on 20 Oct 2026). Tables: `projects` (one row per customer, full record in `data`), `activity`, `app_state` (inventory, attendance, saved views), `chat_messages`, `counters` + `next_project_number()` for CRN numbers. Live updates are on for `projects` and `chat_messages`.
- How it works: `src/data/remote.js` loads everything at start-up, saves only what changed (batched), and applies changes other people make live. `src/data/api.js` keeps all CRM logic and role scoping. On a brand-new database the app uploads the demo data once.
- Top-bar dot: "Saved to cloud" / "Saving…" / "Not saved — check connection" / "This browser only".
- Team chat (`/chat`): one shared room for Admin and Office staff, live for everyone.
- "Reset demo data" no longer wipes anything when Supabase is on; it only clears this browser's recently-opened list.

### Before real data
The demo sign-in (email only) does not create Supabase users, so the `demo_*` policies let the public key read and write everything. Before any real customer goes in: switch sign-in to Supabase Auth, add a `profiles` table (role, branch, partner, crew), and replace the `demo_*` policies with per-role policies that mirror `scopeFn` in `api.js`.

## Customer workspace redesign — 20 October 2026

The active app is this `app/` directory, served on port **5210**. The legacy prototype at the parent root is a separate version.

- Customers now uses compact horizontal cards, one search field, a Filter panel and three views: Needs attention, Active customers, Finished installations. Views can overlap: an installed customer may still need payment, subsidy or paperwork follow-up. Financial KPI panels, the table, stage strip and shortcut hints are removed from the daily directory.
- Full records use **Work / Documents / Payments / Updates** with one next action and a customer details column. Stage changes and team/date assignment remain role-gated. Global customer links open this workspace directly instead of the old quick-peek panel. Back links retain directory filters.
- Documents adds **Create / Links sent / Received documents**. Existing generators and signing APIs are reused. Prepared links are not evidence of WhatsApp delivery. Returned signatures can be viewed/downloaded; use the generator for the signed PDF, upload it manually in Google Drive, and save its link. There is no automatic Drive upload.
- Installation, inventory, BOM and dispatch share **Materials & Installation** navigation. The office Stamp queue is removed; legacy stamp-paper tasks stay stored but are excluded from the displayed customer workflow. Existing agreement PDF content is preserved. Commercial/industrial choices for new leads are marked coming soon; existing records remain accessible.
- These changes do not publish the app. Links generated on localhost cannot be opened by outside customers. Public HTTPS hosting and an end-to-end signing check are still required.
- Verification and visual evidence: `design-qa.md` and `design-reference/`. Production build and browser navigation checks passed. Shared cloud records were not edited for testing.
