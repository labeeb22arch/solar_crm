# Customer workspace design session — 2026-10-22

## Original decisions (revised below by ADR 0004)
- Full-width customer list opening a full-width customer workspace.
- Project Management: all existing stages as Kanban columns.
- Ask for confirmation before moving to the next stage.
- Customer record must support payments, equipment/panel details, serial numbers and warranties.

## Additional accepted decisions
- Primary workflow: edit details, make documents, update stage; all other customer operations remain accessible.
- Completed is a separate sidebar area for finished projects and warranties.
- Trash is last in the sidebar and recoverable.

## Evidence from this session
1. Customer record: needs improvement. Header/progress strip consume most first viewport; title wraps early; permanent stage panel reduces working width. Screenshot: /private/tmp/sunpay-workspace-review/01-customer-before.jpg.
2. Customer list: needs improvement. Search, tabs, stage filters and spacing consume most first viewport; one customer row begins near the bottom. Shared tokens and consistent buttons are working strengths.

## Accessibility observations and limits
Keep visible labels and keyboard actions. Kanban must have a button equivalent to drag/drop. Long names must wrap without clipping. Screenshots cannot establish screen-reader compliance or real phone-camera operation; verify these separately.

## Feature/access checklist
- Payments: customer Finance tab; existing ledger/API.
- Documents: customer Documents tab; tracking inbox separate.
- Panel/inverter/structure details: Overview Technical & material order.
- Serial numbers: inline scan/manual entry into Overview Serial numbers, retaining shared scanner/API.
- Warranty: read-only coverage and technical record in Completed; service issue form/history remain available.
- Stage: on-demand drawer and Project Management, same confirmed next-stage action.
- Trash: recoverable archive/restore with reason; all customer data retained. No permanent delete control.

## Maintenance
Keep this working note current while discussing. Record accepted structural decisions as new ADRs; keep unresolved questions here. Check the feature/access list before adding another screen or storage field.

## Delivery verification
- 16 automated checks pass; production build passes.
- Browser verified full-width workspace, inline serial editor, confirmation/cancel, active list, Completed and Trash navigation. No live customer moved, archived or financially edited for testing.
- Physical camera, real phone layout and native drag/drop remain unverified. The accessible move button and cancellation were verified.
- Review: REVIEW-2026-10-22.md.

## Revised feedback — pipeline-first, 2026-10-22
ADR 0004 supersedes the board layout and active-customer Warranty tab. Project Management now has a vertical stage selector and a single customer work list. Today prioritizes current-stage work; Overview summarizes the same pipeline. Stage task selection comes from actual tasks in the selected stage, preserves role visibility and never auto-completes tasks. Loan/subsidy are plain sidebar destinations. Customer details use aligned full-width disclosures; the expanded journey is optional. Documents exposes three consistent choices and defaults to the current requirement. Completed owns read-only warranty coverage and technical records, with service issues still actionable.

Verification: 17 automated test files pass; production build passes. Browser verified stage selection, document switching, quotation preparation/cancel, four customer tabs, direct finance tracking links and completed warranty detail. No live customer record modified. Physical phone and screen reader remain unverified.

## Main-menu stage navigation — ADR 0005
The user clarified that Project Management itself should expand into its 11 stages in the main sidebar. Removed the secondary stage rail; stage customers now use the full content width. Direct stage URLs and confirmed movement remain intact.

Verified main-menu expand/collapse, all 11 stage links, direct-stage selection, full-width customer content and production build. All 17 test files pass. Shared menu is available under More; physical phone rendering remains unverified.

## Supporting document links — ADR 0006
Inspected Watersun Final constants.js document labels and registration/operational checklists, plus LeadsTab and RegistrationTab. Added the deduplicated document catalogue to customer Documents, with received checkboxes, Add link → Open document buttons, retained previous links and CRM actor/time. Existing generated-file links and legacy Drive slots are reused. Added customer Drive-folder and Google Maps site links; current-location capture is initiated only by staff. No automatic Drive upload, folder creation, account switch or original-upload attribution is claimed.

Validation: all 18 test files pass; production build passes. Browser checked document entries, folder editor and light-bill editor/cancel. Existing cloud customer files, checkboxes and location were not changed during testing. Physical phone/geolocation and access to the user's new Google account remain unverified.

## Solar CRM and richer demo data — ADR 0007
Renamed the product brand, navigation subtitle, login header, browser title and package labels to Solar CRM. Preserved storage/session keys and company legal details. Added an Admin-only, idempotent 44-customer synthetic pack with four records per stage; supplied varied receipts, finance tracking, technical specifications, installation schedules, serials and warranty data. No invented file URLs or signatures. Cloud inserts ignore ID conflicts and verify saved records before reporting success. Existing customer records are retained.

Verified the cloud insert readback for the 44-record pack and reloaded the app: Material Procurement now contains its four synthetic records, the main menu counts include the new customers, and the saved brand reads Solar CRM. All 19 test files pass and the production build passes. Existing customers were not reset or overwritten.

## Remove company branding throughout the demo — ADR 0008
Updated signing pages, WhatsApp share text, proposal pages and terms, feasibility/agreement vendor names, procurement PDF heading, company defaults and deployment author labels to Solar CRM. Removed the unused former logo. Legacy proposal terms normalize for display without changing stored customer/signature records. Existing storage keys and authentication identities remain compatible.

Validation: all 20 test files pass and production build passes. Source scan found no old visible brand copy; remaining old strings are compatibility keys and normalization fixtures. Browser verified the Solar CRM login. No customer financial or signed records changed.

## Admin workflow repair — 2026-10-26
User reports navigation loops, missing money on Today, overcomplicated document making, wrong loan/subsidy steps, excessive Operations parameters, read-only attendance and a broken serial scanner. Accepted direction is ADR 0009. Focus is Admin; preserve other role restrictions and all financial/signature history. Reference: solarflow.deeprootsystems.in (credentials remain outside this note). Testing live flows read-only, then verifying mutations with isolated local sample data. Reference labels and exact observed failures are recorded in the audit notes as they are checked.

Further user clarification: keep only five essential supporting-document checks (Aadhaar front, PAN, electricity bill, bank passbook/cheque, site survey photos). Other previously linked/received documents stay available under Other saved documents. Remove the Overview Verification block, preserving stored verification history. Reference inspected in its no-signup Admin workspace: subsidy tags Inprocess/Redeemed/Returned/Approved/Received (timeline also permits Rejected); loan tags Inprocess/Sanctioned/Returned/Reject/1st Payment/2nd Payment/Total Received. Reference loan supporting checks are Vendor Feasibility, Site Feasibility and Digital Certificate. Default Operations is panel/inverter brands; optional settings remain collapsed. Stage assignment closes on successful save, and stage actions close their drawer before switching the customer tab.

Confirmed: “close after email signing” means dismiss Login after successful email sign-in. Authenticated cloud sessions now show loading/retry while records load rather than leaving the sign-in form visible. Local Admin email sign-in was checked through the browser. Expected payments table also removed from Finance overview.

Follow-up: user also requires signing completion to dismiss the signing view. Customer document previews and saved files open inline; Finance subsidy/loan tag buttons remain in place. Public signing must never redirect an unauthenticated customer into the Admin record. Browser-owned tabs may refuse automatic close, so retain a short completion confirmation.

User requested removal of “View all payment records” from the customer Finance card. Removed that navigation link; customer receipt details remain in place.

User-approved Finance refinement: show Loan and Subsidy concurrently side by side in the customer record, with all status tags as small selectable chips and each history below. Clicking a tag opens its dated save/cancel form directly; remove the extra section toggle and Edit tag button. Stack columns on phones. Reuse existing tracking API/history.

Correction to previous Finance layout: user wants Payments / Loan / Subsidy as top tabs within Finance, matching the existing customer workspace tab style. Supersedes simultaneous side-by-side panels. Each tracking tab contains its status chips and history; switching stays inside the customer.

Accepted follow-up: Finance status chips open a confirm dialog and append a dated history entry immediately, without the edit/save form. Rejection retains a reason field. History is always visible before optional loan-document checks. Received documents must identify the exact returned document and open a read-only preview inline.

2026-10-27 follow-up: show total project value, collected receipts and outstanding in the main Overview and customer Overview, reusing the same financial scope/ledger. Customer BOM, name checking and completed warranty actions open within the record; only external services such as Maps/WhatsApp remain external.

Admin walkthrough found and fixed two concrete failures: Current stage referenced an undefined params variable; BOM quantity inputs used min=0.01 with step=1, causing valid integer quantities to fail browser validation. Confirmed drawer opening and successful synthetic BOM v1 save after repair. Browser preview reconnection succeeded; PDF-download automation timed out and is not certified by that attempt.

Signing completion: the Admin sharing dialog also closes when the same signing token is confirmed signed by the existing project subscription. A different/replaced link cannot close the current dialog.

2026-10-27: remove duplicate Loans/Subsidy status-summary cards from the Finance overview; keep the existing top navigation tabs.

2026-10-27 accepted payment simplification: customer Payments shows the full receipt history and one Add payment action, with amount, type, reference and payment date. Remove search, numbered milestones and payment-plan editing from this view. Preserve stored plans/allocations; use the same receipt API. Record actor and entry timestamp automatically and show them separately from the payment date; do not invent missing legacy audit metadata.

2026-10-27: stage lists use two parallel customer cards per row on desktop and stack on phones. Keep latest updates first, with relative last-updated time at each card’s top and exact stage-entry timestamp below. Confirmed stage events retain structured from/to/time in the existing timeline. Customer receipt history is a table; actor and automatic recording date/time appear in each receipt footer, timestamp aligned bottom right. Newly recorded receipts sort first even if backdated.

2026-10-27: simplify Project Management cards to customer name, CRN, current stage, relative last-updated time and next-stage action only. Remove city/capacity, task descriptions, lateness, stage-entry date and document shortcuts from these cards. Keep exact stage timestamps in customer history and preserve two-column/latest-first behavior. Today keeps its existing work context.

2026-10-27 card positioning: name left, CRN top right; current stage and bordered next-stage button share a row. Updated-by appears bottom left, relative update time bottom right. The existing confirmation dialog remains required before stage mutation. Latest updater comes from matching recorded change metadata; older records without an attributable actor say Not recorded. New changes save the actual authenticated actor in the existing customer/timeline record.

2026-11-07: user asked to hide the sidebar Project Management stage menu as a duplicate. Commented out, route kept (ADR 0010). Remaining audit proposal, not accepted: group the sidebar into Today, Customers, Documents, Money, Team.

2026-11-08: user asked to fix all six audit items and improve phone button positions. Implemented as ADR 0011. Open questions for the user: native-speaker review of Gujarati/Hindi wording; whether office screens and the shared frame (bottom tabs, search) should also be translated.
