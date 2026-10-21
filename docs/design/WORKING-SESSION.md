# Customer workspace design session — 2026-10-22

## Accepted
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
- Warranty: customer Warranty tab with issue form/history.
- Stage: on-demand drawer and Project Management, same confirmed next-stage action.
- Trash: recoverable archive/restore with reason; all customer data retained. No permanent delete control.

## Maintenance
Keep this working note current while discussing. Record accepted structural decisions as new ADRs; keep unresolved questions here. Check the feature/access list before adding another screen or storage field.

## Delivery verification
- 16 automated checks pass; production build passes.
- Browser verified full-width workspace, inline serial editor, confirmation/cancel, active list, Completed and Trash navigation. No live customer moved, archived or financially edited for testing.
- Physical camera, real phone layout and native drag/drop remain unverified. The accessible move button and cancellation were verified.
- Review: REVIEW-2026-10-22.md.
