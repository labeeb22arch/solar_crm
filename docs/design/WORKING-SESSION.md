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
