# Solar CRM design system

Working specification, established 2026-10-22 from existing app/src/styles.css. This documents the current system; it does not claim a design system existed before implementation.

- Reuse CSS variables for warm canvas, white surfaces, orange primary action, text, borders, spacing and typography. Tokens remain defined once in styles.css. New customer-workspace and board styles live in `app/src/styles/customer-workspace.css`.
- Full-width working layouts; no fixed central width limit for Customers or Project Management.
- Customer record: four tabs and four full-width Overview disclosures. Labels above values, one section edit pencil at top right, no repeated empty-value messages.
- Stage details are an on-demand drawer. They must not permanently subtract from customer content width.
- Use one primary action per working section. Secondary actions use neutral buttons; advanced controls may collapse.
- Lists summarize; customer tabs perform work. Documents inbox tracks waiting/received links; document creation lives in customer Documents.
- Reuse CustomerFinance, WarrantyRecords, SerialScanner and shared API functions. No copied implementations or duplicate ledgers.
- Visible keyboard focus, accessible dialog names, text status labels and approximately 48px phone controls. Do not rely on drag, colour or icons alone.
- Test at narrow and wide widths. Project Management expands its 11 stages in the existing main menu. Keep the customer work area full width; no second sidebar. Warranty coverage is read-only in Completed; service history remains actionable.

Before a significant feature: identify user task, read the current decision log, capture current screen, ask the smallest useful design questions, agree on the workflow, implement, then verify behavior and layout.

Admin repair (2026-10-26): keep quotation, feasibility and DISCOM editors in customer Documents with a close action. Default supporting checklist contains five essentials; preserve other saved files in a collapsed group. Finance tags edit inline. Operations shows panel/inverter brands by default, with existing additional parameters under Other settings. Expected payments is removed from navigation and Finance overview.

2026-10-27: Overview includes total project value, money collected and money outstanding (same receipt ledger and financial role scope). Customer Finance uses Payments / Loan / Subsidy tabs; status chips confirm before saving, with history always visible. BOM, name check, documents and warranty open inside the customer record.

Project Management: two customer cards per desktop row, one on phones; newest update first. Last-updated relative time sits above the customer name, with exact stage-entry time for explicitly recorded stage changes. Payment history uses a table and a bottom-right recording timestamp per receipt.

Project Management card refinement: display only name, CRN, current stage, last updated and next-stage action; exact stage timing stays in history.
