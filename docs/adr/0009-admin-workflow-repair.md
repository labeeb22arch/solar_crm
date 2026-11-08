# ADR 0009: Keep Admin customer work in context

Accepted from user instructions, 2026-10-26. Extends ADRs 0001, 0004 and 0006.

## Decision
- Today includes money received and outstanding collections, reusing the receipt ledger.
- Customer Finance edits loan/subsidy tracking in place. Tracking lists open the full customer Finance workspace, preserving the originating filter for return. No duplicate financial store.
- Document editors open within customer Documents with an explicit close action; choosing quotation must not require a chain of unrelated pages. Link preparation, sharing, customer completion and saved files remain distinct states.
- Remove Expected payments from navigation; retain existing receipt/milestone data and redirect legacy URLs to Finance.
- Reduce default Operations choices to the reference's essential lists; retain existing values and optional technical settings rather than deleting customer data.
- Repair scanner cancellation/resource cleanup and photo decoding; report physical-camera verification separately.
- Attendance needs an actual Admin recording workflow, dated entries and cancellation, without claiming GPS capture for manually entered records.

Loan/subsidy labels will be grounded in the supplied SolarFlow demo. Proposed mappings must preserve stored history and cannot infer payments or application dates. No real customer financial/signature changes are permitted for testing. Other roles retain their existing access scope.

## Clarifications accepted during implementation
Five essential supporting-file checks replace the 33-item default list. Existing linked/received files outside these five remain available without creating new pending tasks. Remove Overview Verification controls while retaining stored data. Reference tag values are separate from receipt entries: selecting 1st/2nd Payment or Total Received never invents a customer receipt. Existing legacy tag/history values are retained and normalized only for current display. Operations defaults to the two brand directories; optional existing parameters remain reachable under Other settings.

Signing clarification: dismiss an embedded signing preview after successful submission; close a script-opened signing window where the browser permits. Standalone WhatsApp links show a compact completion confirmation when automatic closing is unavailable. Keep customer file previews inline with an explicit close action; never redirect public signers into Admin records.

User-approved Finance refinement: show Loan and Subsidy concurrently side by side in the customer record, with all status tags as small selectable chips and each history below. Clicking a tag opens its dated save/cancel form directly; remove the extra section toggle and Edit tag button. Stack columns on phones. Reuse existing tracking API/history.

Correction to previous Finance layout: user wants Payments / Loan / Subsidy as top tabs within Finance, matching the existing customer workspace tab style. Supersedes simultaneous side-by-side panels. Each tracking tab contains its status chips and history; switching stays inside the customer.

Accepted follow-up: Finance status chips open a confirm dialog and append a dated history entry immediately, without the edit/save form. Rejection retains a reason field. History is always visible before optional loan-document checks. Received documents must identify the exact returned document and open a read-only preview inline.

2026-10-27 follow-up: show total project value, collected receipts and outstanding in the main Overview and customer Overview, reusing the same financial scope/ledger. Customer BOM, name checking and completed warranty actions open within the record; only external services such as Maps/WhatsApp remain external.

2026-10-27 accepted payment simplification: customer Payments shows the full receipt history and one Add payment action, with amount, type, reference and payment date. Remove search, numbered milestones and payment-plan editing from this view. Preserve stored plans/allocations; use the same receipt API. Record actor and entry timestamp automatically and show them separately from the payment date; do not invent missing legacy audit metadata.

2026-10-27: stage lists use two parallel customer cards per row on desktop and stack on phones. Keep latest updates first, with relative last-updated time at each card’s top and exact stage-entry timestamp below. Confirmed stage events retain structured from/to/time in the existing timeline. Customer receipt history is a table; actor and automatic recording date/time appear in each receipt footer, timestamp aligned bottom right. Newly recorded receipts sort first even if backdated.

2026-10-27 card positioning: name left, CRN top right; current stage and bordered next-stage button share a row. Updated-by appears bottom left, relative update time bottom right. The existing confirmation dialog remains required before stage mutation. Latest updater comes from matching recorded change metadata; older records without an attributable actor say Not recorded. New changes save the actual authenticated actor in the existing customer/timeline record.
