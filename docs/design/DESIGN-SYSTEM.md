# Sunpay design system

Working specification, established 2026-10-22 from existing app/src/styles.css. This documents the current system; it does not claim a design system existed before implementation.

- Reuse CSS variables for warm canvas, white surfaces, orange primary action, text, borders, spacing and typography. Tokens remain defined once in styles.css. New customer-workspace and board styles live in `app/src/styles/customer-workspace.css`.
- Full-width working layouts; no fixed central width limit for Customers or Project Management.
- Customer record: four tabs and five full-width Overview disclosures. Labels above values, one section edit pencil at top right, no repeated empty-value messages.
- Stage details are an on-demand drawer. They must not permanently subtract from customer content width.
- Use one primary action per working section. Secondary actions use neutral buttons; advanced controls may collapse.
- Lists summarize; customer tabs perform work. Documents inbox tracks waiting/received links; document creation lives in customer Documents.
- Reuse CustomerFinance, WarrantyRecords, SerialScanner and shared API functions. No copied implementations or duplicate ledgers.
- Visible keyboard focus, accessible dialog names, text status labels and approximately 48px phone controls. Do not rely on drag, colour or icons alone.
- Test at narrow and wide widths. Project Management expands its 11 stages in the existing main menu. Keep the customer work area full width; no second sidebar. Warranty coverage is read-only in Completed; service history remains actionable.

Before a significant feature: identify user task, read the current decision log, capture current screen, ask the smallest useful design questions, agree on the workflow, implement, then verify behavior and layout.
