# Pipeline redesign review — 22 October 2026

1. **Navigation — simplified.** Loan and subsidy are direct links; the previous child arrows and nested status menu are removed. Status filters remain on their destination pages. Verified in browser accessibility tree.
2. **Project Management — improved.** A vertical stage selector and one customer work list replace horizontally scrolling columns. Stage selection changed the customer list and action destination; confirmation/cancel preserved the current stage. Current-stage task selection replaces the unrelated cross-department next task.

![Pipeline](/private/tmp/sunpay-pipeline-review/02-pipeline.jpg)

3. **Today and Overview — improved separation.** Today shows active-project action queues with installation/update filters; Overview shows stage counts, task attention and time in stage. Both lead to the same customer workspaces. Screenshots show the tested desktop viewport; real phone layout is not verified.

![Today](/private/tmp/sunpay-pipeline-review/04-today.jpg)
![Overview](/private/tmp/sunpay-pipeline-review/05-overview.jpg)

4. **Customer workspace — aligned.** Uneven two-column disclosures were replaced with full-width sections. Four tabs remain, with no Warranty tab. The long journey expands on demand. A compact stage action remains on Overview. This avoids squeezing the detail columns and reduces the work above Documents.

![Original uneven details](/private/tmp/sunpay-pipeline-review/01-before.jpg)
![Customer workspace](/private/tmp/sunpay-pipeline-review/07-customer.jpg)

5. **Documents — discoverable.** Three document choices remain visible. The stage-appropriate document opens by default. The browser verified switching to quotation and opening/cancelling its preparation form without writing a live quotation. Feasibility stays loan-only and DISCOM stays scheme-only, with explanations and access to historical files. Link generation and signing were not submitted on a live customer for this UI test.

![Documents](/private/tmp/sunpay-pipeline-review/03-documents.jpg)

6. **Completed — read-only record.** Selecting View warranty record opens the full coverage, installation, equipment and serial record. Coverage edit controls are removed. Issue reporting and resolution history remain actionable. No warranty record or issue was modified for the test.

![Warranty record](/private/tmp/sunpay-pipeline-review/06-completed.jpg)

## Validation and limits
17 automated test files pass, including current-stage task selection, route destinations, recent ordering and document availability. Production build passes with the existing chunk-size warning. No actual stage, payment, signature or warranty values were modified. Phone hardware, narrow-viewport rendering and screen-reader operation remain unverified. Visible status labels and explicit buttons avoid relying on drag/drop or colour alone. Meter Flag has no persisted checklist task in the existing data model; its manual review instruction remains explicit. Database transaction/concurrency follow-ups remain in the engineering backlog.
