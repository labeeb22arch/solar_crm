# Admin workflow repair — 26 October 2026

Changes are local in app/, not yet published to the live GitHub Pages site. Live/reference inspection was read-only; saves used the isolated localhost demo with cloud credentials disabled.

## Verified
- Today shows received today, due for collection and outstanding using the receipt ledger.
- Quotation, loan feasibility and DISCOM editors open inside customer Documents; close returns to actions and preserves the record URL.
- Five essential file checks; additional already received/linked files remain collapsed. No saved files deleted.
- Subsidy list opens the full customer with a return-to-tracking link. Customer subsidy tag saves in place and records history. Loan/subsidy labels follow the supplied SolarFlow demo; selecting a payment tag creates no receipt.
- Attendance: Admin dated save, correction history and reload persistence in the local demo; API rejects Technician access.
- Stage drawer closes on tab change/save; cancellation remains available.
- Operations defaults to panel/inverter brands, optional old settings retained. Phone-width Operations and feasibility layouts visually checked at 390 × 844.
- Local Admin email sign-in dismisses Login and opens Today. Cloud authenticated session now leaves Login before data load and exposes loading/retry errors.
- Expected payments removed from menu, Finance tabs and overview; legacy URL redirects. Overview Verification removed.
- Search handles missing text fields without a blank-screen crash.
- Scanner generation/cancellation cleanup rejects late camera streams and decoder results; target changes clear pending decoded values. Partial serials no longer mark the whole serial task done.

## Validation
24 automated test files pass; isolated Admin API integration passes attendance history, payment isolation and role restrictions. Production build passes (existing large bundle warning). git diff --check passes. QR encode/decode test uses the actual scanner library.

## Remaining limits
Physical camera and photo upload end-to-end were not verified: the browser file chooser stalled. Actual cloud persistence, email-auth cloud latency, WhatsApp delivery and customer signatures were not exercised through mutations. No real receipts, signatures or customer financial data were edited. Existing server-side shared app_state authorization needs a separate scoped review. Legacy records without explicit scheme selection still require that choice before scheme-specific document creation.

Screenshots: [quotation](admin-review-2026-10-26/quotation-inline.png), [feasibility](admin-review-2026-10-26/feasibility-inline.png), [DISCOM](admin-review-2026-10-26/discom-inline.png), [phone Operations](admin-review-2026-10-26/operations-mobile.png), [phone report](admin-review-2026-10-26/feasibility-mobile.png).


## Follow-up verified 27 October 2026
- Main Overview and customer Overview now show total project value, money collected and outstanding, using the existing scoped financial API.
- Finance has Payments / Loan / Subsidy tabs. Tap a status, confirm, and see the new entry immediately in visible history with date/time/actor. Cancellation leaves it unchanged; rejection requires a reason; stale confirmations are rejected. Selecting a bank-release tag does not create a receipt.
- Added a separate Admin-only, idempotent v2 showcase pack: 66 synthetic customers, six in each stage. It was populated in the isolated local browser. The local inbox showed 20 waiting and 79 received documents before type filters. Public signing rejects seeded demo tokens; return images are explicitly marked DEMO SAMPLE.
- Received documents identify the exact document type and open an inline read-only quotation snapshot or generated signed agreement. Customer-document links select the corresponding document type. No new quotation version is created by viewing it.
- Customer BOM, name check and warranty now open inline. Pipeline BOM/warranty actions also open the customer workspace. Saved supporting files and warranty papers preview inline, with an external-provider fallback.
- Fixed Current stage drawer crash from an undefined params reference. Fixed BOM number input min/step mismatch, which prevented whole-number quantities from saving. Verified a synthetic BOM v1 save and its material list.
- Phone (390 × 844) and desktop (1280 × 800) Overview layouts checked. Main money totals matched the existing customer ledger. API integration also checks financial access, balances, stale tag confirmations, demo idempotency and unchanged existing IDs.
- The requested walkthrough ran across multiple passes, with a browser interruption during PDF-download automation. Inline previews work; the download attempt timed out and the actual downloaded PDF was not obtained. Physical camera/cloud cross-device checks remain outstanding. No real financial or signature records were changed.

After deploying code, existing cloud data does not automatically gain the local demo records. An Admin can choose **Operations → Demo data → Add populated demo examples** to insert the new pack without overwriting current records.

Evidence: [Overview](admin-review-2026-10-26/overview-money.png), [phone Overview](admin-review-2026-10-26/overview-money-phone.png), [confirmation](admin-review-2026-10-26/status-confirmation.png), [visible history](admin-review-2026-10-26/status-history-visible.png), [received list](admin-review-2026-10-26/received-documents-identified.png), [received quotation](admin-review-2026-10-26/received-quotation-preview.png).

Payment history simplification (27 October): removed customer payment search, numbered milestones and plan editor. Added one four-field receipt form. Verified cancellation does not create a receipt, and a synthetic local save shows amount/type/reference/payment date plus the automatic actor and recording timestamp. API integration checks idempotency, ignores forged audit fields and preserves the stored plan. No cloud payment records changed.

Stage-card/table refinement (27 October): verified two parallel cards at 1280px, newest update at the top, and relative times. A synthetic move from Material Procurement to Pending Installation became the first destination card (Last updated just now), survived reload and appeared in customer History with exact recorded time. Added structured from/to/time fields to stage events without a second history store. Payment history now has Amount / Reference no. / Payment type / Payment date columns and actor + recording timestamp in each row footer, timestamp bottom right. Relative-time boundary tests and stage-event integration checks pass.
