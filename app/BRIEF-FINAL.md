# Sunpay CRM — final combined prototype brief

Read `../versions/BRIEF.md` first: every hard rule there still applies (nothing from WaterSun, banned colours/fonts,
no Tailwind, no lucide, no stage sidebar, no card grid, no tabbed centred popup, fake data only, data layer in
`src/data/api.js`). No Docker. No backend yet — a hosted Supabase project will replace `api.js` later.

## Starting point

Copy `../versions/v2-desk` into this folder (not node_modules/dist) and evolve it. Port ideas and code from
`../versions/v3-ledger` (spreadsheet grid) and `../versions/v1-tracks` (five-track pulse). Don't edit the version folders.
Dev port: **5210** (`vite --host 127.0.0.1 --port 5210`).

## The three priorities from the client: easy to find clients, easy to get info, easy to follow info

### 1. Find a client in one step (every role)
- A search box always visible at the top of every screen (and on phone). Matches name (partial, any word order),
  phone (ignore spaces, +91, leading 0), CRN, Project ID, DISCOM consumer number, city, channel partner, dealer.
- Results show name, CRN, city, kWp and the one-line status sentence (below), grouped "Customers / Pages / Actions".
- "Recently opened" customers shown when the search is empty and on the home screen.
- Clicking any customer anywhere opens a quick-peek side panel (key facts + status + next step + "Open full record").

### 2. Get the important info at a glance
Every customer has, at the top of the record and in every list row:
- **Status sentence** in plain English, generated from data, e.g. "Waiting for SBI loan sanction since 12 Oct (6 days)"
  or "Installed 14 Oct · DISCOM inspection pending".
- **Next step** + who owns it + due/age. Red when overdue.
- **Key facts strip**: phone (copy + call link), address, kWp, segment, branch, CP/dealer, payment method,
  amount due (₹), subsidy status.
Use plain words, not codes. Never more than one click to reach phone number, balance due or current status.

### 3. Follow progress easily — a step up from a single stage pipeline
- **Milestone path** (top of record, also tiny in list rows): 6 customer-facing milestones that anyone understands:
  Booked → Finance ready → Installed → Grid connected → Subsidy received → Closed. Each shows date reached or
  "expected by". Derived from the five tracks; not a manually picked stage.
- **Five tracks underneath** (Sales & Agreement, Finance, Supply & Install, Grid, Closure) as compact expandable
  sections with their checklist items, status, owner, date. Stuck items show age ("12 days").
- **Timeline** (v2's chat-style feed) for history, with filter chips.
- Ageing / SLA: every item knows how long it has been in its state; home and lists can sort by "most stuck".

## Navigation and screens
- Keep v2's slim icon rail + command palette on desktop, bottom tabs on phone. Add text labels on hover AND a
  collapsible labelled mode (some staff won't know icons).
- **Default theme: light** (warm neutral greys, a small nod to the SolarFlow family), dark toggle kept.
  Keep v2's accent but make sure it is readable on light (use a darker shade for text/buttons on light).
- **Today** (v2 inbox) = home for Admin / Office staff.
- **Projects** = v3's spreadsheet grid (saved views, grouping, inline edit, export), with the status sentence,
  milestone mini-path and next-step columns.
- **Overview** dashboard for Admin/CPO = v1's five-track pulse tiles + milestone funnel + branch split + "most stuck".
- All other modules from the version brief remain reachable (quotation, feasibility, DISCOM docs, name check, BOM,
  challan, gate pass, truck tally, inventory, installs, attendance, warranty, invoices, 3 commissions, MIS, import,
  users, activity).

## Roles — every one must work end to end (demo role picker, no passwords)

| Role | Sees | Can do | Home |
|---|---|---|---|
| Admin | everything, all branches | everything incl. users, import, export | Today |
| Office Staff | their branch (switchable if allowed) | operations; no user management/export | Today |
| Finance | everything | read-only (banner, disabled actions) | Overview |
| CPO (Channel Partner Office) | all CPs and dealers under that office, their customers and commissions | add leads, follow up, view docs; no finance edits | Partner home |
| CP (Channel Partner) | own customers + their dealers' customers, own commission | add leads, upload/link docs, follow up | Partner home |
| Dealer | only own customers/leads, own commission | add leads, follow up | Partner home |
| Technician | assigned jobs only | serial scan, checklist, photos, mark installed, report issue | Field (phone) |
| Installation Team (in-house / third-party) | crew's jobs | same as technician + truck tally | Field (phone) |
| Stamp Staff | agreement/stamp queue only | mark stamped/signed | Stamp queue |

- **Partner home** (CPO/CP/Dealer): simple, phone-friendly. "My customers" list with status sentence + milestone path,
  "Add lead" form, "Needs your action" (missing documents, customer to call), commission earned/pending/paid.
  Partners never see other partners' data, internal cost, margins or company-wide commission figures.
- Fake data: 3 CPOs, ~8 CPs under them, ~12 dealers under CPs; branch-scoped office staff.
- Add a dev-only "Check access" page (Admin) listing each role and what it can see (counts), so access can be
  verified quickly.

## Done means
- `npm install` + `npm run build` pass; dev server on 5210.
- In the browser, switch to EVERY role and check: correct home, correct menu, data scoped correctly, forbidden
  pages show a friendly "not available for your role" message (also by direct URL).
- Search finds a customer by partial name, phone with spaces, and CRN.
- Light + dark, desktop + 375px phone, no console errors, no horizontal scroll.
- README.md: what's built, role matrix, what's mocked, how to run.
