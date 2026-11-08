# ADR 0011: Intuitiveness pass — 8-link menu, one progress model, help, languages, phone sizing

Accepted from the user's explicit direction ("fix these"), 2026-11-08. Builds on ADR 0010; supersedes the sidebar sections of ADR 0004/0005 and the separate "Project journey" + "Current work" blocks on the customer page.

Context: the intuitiveness audit (`docs/design/INTUITIVENESS-AUDIT-2026-11-08.md`) scored 6.6/10. Main losses: 18 menu links, 43% of text under 12.5px, 64% of phone tap targets under 44px, English only, no help, three progress ideas on one customer page.

Decisions:
1. Side menu for office roles has 8 links: Today, Overview, Customers, Documents, Materials & Delivery, Finance, Operations, Team. Other pages keep their routes and access rules and become tabs: Completed and Trash under Customers; Name check under Documents; Payments, Loans, Subsidy and both commissions under Finance; Attendance, Users, Team chat and Activity log under Team (`components/SectionTabs.jsx`, `FinanceTabs.jsx`). Entries use `menu: false` in `lib/nav.js`, so search and All pages still list them.
2. Customer page shows one progress card: five phases (Booking, Finance, Installation, DISCOM & meter, Completed) grouping the 11 stages (`PHASES` in `lib/projectPipeline.js`), the current stage and work, the shared next step, the main action, and "See all 11 stages". Stage IDs and movement rules are unchanged.
3. One dismissible tip per office screen and a five-step tour at first sign-in (`lib/helpTips.js`, `components/Help.jsx`); both can be shown again from the name menu. Stored per browser only.
4. Partner and field screens switch between English, Gujarati and Hindi (`lib/i18n.js`). Office screens and the shared frame stay English for now. Translations need native-speaker review.
5. Reading text is at least 13px (avatar initials and count badges excepted). On phones every button, tab, field and link target is at least 44px tall; the main action comes first and widest, Save sits on the right.

Consequences: no data, API or permission changes. Tips and language choice live in browser storage. Existing bookmarks still work.

Checks done: tests and build; menu, tabs, active highlight, tour once-only, tips, progress card, Gujarati partner/field screens and phone layouts in a local browser-storage copy (Admin, CP, Technician previews). Not done: real phones, other roles end to end, hosted backend.
