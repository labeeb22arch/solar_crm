# Sunpay customer workspace — design QA

final result: passed

## Visual truth and state

- Selected source: `design-reference/customer-workspace.png` (1487 × 1058 pixels); directory source: `design-reference/customer-directory.png`.
- Implementation: `http://localhost:5210/#/p/PRJ-2026-0099`, Admin preview, light theme, Work tab, Materials & Installation expanded.
- Desktop: CSS viewport 1440 × 1024; final fullPage screenshot `design-reference/workspace-desktop.png`, 1440 × 1024 pixels.
- Mobile: CSS viewport 390 × 844; `design-reference/workspace-mobile.png`, 390 × 844 pixels. No document-level horizontal overflow.
- Source normalized to 1440 × 1024 at 1× density. Comparison removes the implementation's retained 72px global-search bar and compares equally sized main-content regions at the same scale.
- Combined visual evidence: `design-reference/workspace-comparison.png`. Focused evidence: `design-reference/workspace-focus.png`; header type, next action, tabs, work groups and customer details were inspected together.
- Live demo records were retained. Names, amount due, real stage, number of tasks, branch and overdue dates intentionally differ from the fictional mock. The implementation is an adaptation of the selected composition to existing records, not a replacement dataset.

## Findings and comparison history

1. P2 mobile header: the long customer name was squeezed between the avatar and stage badge. Fixed title flex basis, stage wrapping and action placement. Recaptured at 390 × 844: name now reads naturally, stage and actions wrap beneath, no horizontal overflow.
2. P2 readability and proportions: initial task text and details were too small, with an overly narrow details column. Increased task text to 14px, secondary text to 12px, details to 14px and desktop customer title to 32px; changed work/details ratio to 1.85:1. Final combined and focused comparisons show the intended hierarchy, readable task controls and stable columns.
3. Capture correction: initial viewport-only browser images were clipped at the native surface's 782px height. Replaced the final evidence with fullPage 1440 × 1024 / 390 × 844 captures. Captured the record after navigating from the directory and confirmed main scrollTop=0. No comparison relies on a scrolled header.
4. No remaining actionable P0/P1/P2 findings within the customer-directory/workspace scope. More task rows require scrolling because the existing installation track has seven tasks rather than the mock's four; preserving those tasks is intentional.

## Fidelity surfaces

- Typography: existing Plus Jakarta Sans headings and Inter body retained; 32px desktop customer title, 14px task/detail text, clear 22px next action and 20px section titles. Long names wrap on mobile. No borrowed WaterSun fonts.
- Layout rhythm: single-column customer cards, clear heading/search/view order, one next action, four workspace tabs and work/details columns. On mobile the columns stack and tabs remain horizontally accessible.
- Color/tokens: warm white/ivory surfaces, rust-orange selected state and primary buttons, muted dividers; decorative navigation gradients and colored icon tiles removed on the shared shell. Existing dark-theme tokens work with the new components.
- Assets: existing Sunpay mark, initial-letter avatars and installed Tabler icons reused. No photographic or decorative raster assets were needed. Generated images are references only, not flattened UI.
- Copy/content: stages remain readable and editable inside Work; completed installations with pending tasks receive explanatory wording on cards. Stamp-paper tasks are omitted from this client's presentation without deleting stored records. Documents labels distinguish prepared links from confirmed delivery and show the local-hosting limitation.

## Verification

- Production build: `npm --prefix app run build` passed; existing bundle-size advisory remains.
- Search by full demo name returned one customer. Stage filter Pending Installation returned 13 matching customers. Needs attention and Finished installations tabs were reachable.
- Customer card keyboard activation opened the full record. Back navigation returns to the directory; search/filter query is carried in the return link.
- Work groups expand; Change stage reveals its selector; Assign team opens its form; cancel closes it. Saving uses existing update APIs and also completes the team-assignment task. Save mutations were not exercised against shared cloud records during visual QA.
- Documents: Create renders existing generators; Links sent and Received documents render appropriate empty states, signature controls and local-only notice. No links were sent externally and no signature was fabricated. Received signature downloads use actual signature data; signed PDFs are prepared through the existing generators. Google Drive upload remains manual.
- Payments renders existing amounts, payment entries, loan tasks and subsidy history. Updates renders real history and a note/call-history composer.
- Grouped Materials & Installation navigation opens existing installation, inventory, BOM and dispatch routes. Duplicate supply subnavigation is hidden inside that workspace.
- Finance preview had zero Change stage buttons and zero editable task selectors; Admin preview restored afterward. No authentication or server permissions changed.
- Light and dark desktop states inspected; mobile screenshot inspected. Browser console error entries checked: none observed during the completed flow.

## Follow-up / limits

- Public HTTPS hosting and external-phone signing are not implemented or verified by this UI change. The preview remains on localhost.
- Received documents currently expose returned signatures and the existing document generators, not an automatic signed-PDF ingestion pipeline. Drive upload is a manual workflow, not an authenticated integration.
- P3: further refinement can shorten very long stage names and simplify customer-specific task wording.
- No full accessibility certification or exhaustive role regression was performed. Existing unrelated module flows and document content were not redesigned.
