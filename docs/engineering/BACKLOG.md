# Engineering follow-up

This is a prioritized follow-up list, not a claim of completed work.

1. Move coarse project JSON writes toward version-checked database operations. Client stale-stage checks protect the current UI but cannot guarantee cross-device atomicity.
2. Keep receipt allocation consistent between milestone receipts and global expected/due totals; add explicit-milestone regression coverage before extending Finance.
3. Split the large data/api.js by domain behind the same public interface. Do not change storage and UI at once.
4. Move page-specific styles out of the growing shared stylesheet, preserving the documented tokens. Avoid accumulating override layers.
5. Review server-side field-level authorization. Existing row scope does not by itself protect individual JSON fields from every permitted project editor.
6. Verify actual phone cameras (Android Chrome and iPhone Safari), customer signing and PDFs. Desktop-width simulations cannot certify device hardware.

For each structural change: state the task, record accepted design/architecture decisions, reuse the domain API, add meaningful regression checks, and visually check the affected customer flow.

7. Fix deployed global-search crash (observed 2026-10-26 during demo-video inspection). Entering `Aarav` in the header search from a synthetic customer Overview rendered a blank page; browser console reported `TypeError: Cannot read properties of undefined (reading 'toLowerCase')` in the search filter. Reload recovered the page. Check missing searchable fields and add a regression for incomplete records before showcasing search. No customer records were changed.

8. Admin workflow repair: physical Android/iPhone camera and photo-input end-to-end checks remain required. Browser file-chooser automation stalled, so decoder and cancellation tests do not certify actual hardware.
9. Verify cloud attendance persistence across devices and enforce attendance-specific Admin writes at the database boundary. The current client API denies other roles; existing shared app_state RLS is broader.
10. Legacy demo records may have subsidy history but no explicit project scheme; document applicability correctly requires a scheme choice. Review migration with confirmed business rules rather than inferring eligibility from old tags.

Item 7 is repaired locally (nullable search fields); deployment verification remains pending.

11. Recheck generated agreement/proposal PDF downloads in the ordinary browser: a preview download automation attempt timed out; inline document viewing and markup were verified, but the downloaded artifact was not obtained.

12. (Audit 2026-11-07) Customer header call button icon renders 4px wide, button looks empty (`pages/Record.jsx:38`, `.workspace-actions .btn` in styles.css).
13. (Audit 2026-11-07) Quotation maker snaps record kWp to whole package sizes (3.3 → 3) via `nearestPackage`; decide whether to support fractional sizes or warn.
14. (Audit 2026-11-07) "Next step"/status text differs between Today, search and the customer record for the same customer; derive it from one function. Full audit: `docs/design/AUDIT-2026-11-07.md`.

Items 12–14 repaired locally on 2026-11-07: call icon width fixed and a WhatsApp button added; quotations keep the record's kWp and project value (regression in `docs/proposal/calc.test.mjs`); the record's Current work card and the customer list now show the same next step as Today. "Prepare quotation" opens the quotation maker directly. Customer counts are hidden until the list loads. Not deployed; not checked on a physical phone.
