# Engineering follow-up

This is a prioritized follow-up list, not a claim of completed work.

1. Move coarse project JSON writes toward version-checked database operations. Client stale-stage checks protect the current UI but cannot guarantee cross-device atomicity.
2. Keep receipt allocation consistent between milestone receipts and global expected/due totals; add explicit-milestone regression coverage before extending Finance.
3. Split the large data/api.js by domain behind the same public interface. Do not change storage and UI at once.
4. Move page-specific styles out of the growing shared stylesheet, preserving the documented tokens. Avoid accumulating override layers.
5. Review server-side field-level authorization. Existing row scope does not by itself protect individual JSON fields from every permitted project editor.
6. Verify actual phone cameras (Android Chrome and iPhone Safari), customer signing and PDFs. Desktop-width simulations cannot certify device hardware.

For each structural change: state the task, record accepted design/architecture decisions, reuse the domain API, add meaningful regression checks, and visually check the affected customer flow.
