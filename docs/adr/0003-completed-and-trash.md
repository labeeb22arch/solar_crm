# ADR 0003: Active, Completed and Trash

Status: Accepted by user, 2026-10-22.

Customers shows active projects. Completed is a separate sidebar destination for completed projects, warranty cover and service history. Project Management can show all stages, including Completed. Trash is the final sidebar item.

Trash is soft deletion: retain the full customer record, receipts, documents, serials and history. Admin/Office Staff can archive scoped records with a reason and restore them. Accountant can view but not modify. Expire pending signing links when archived; restoring does not reactivate those links. Use the existing JSON record and RLS; no duplicate archive database or permanent delete control.

Normal operational lists exclude archived customers. Finance receipt history retains their actual payments; active receivables and new-payment selectors exclude archived records. No historical receipts are removed.

Validate archive/restore data preservation, permission and branch scope, and empty states. Cloud persistence uses the existing project update mechanism; the frontend's conflict protection is not a replacement for a future database transaction/version check.
