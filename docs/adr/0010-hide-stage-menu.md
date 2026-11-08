# ADR 0010: Hide the Project Management stage menu from the sidebar

Accepted from the user's explicit direction, 2026-11-07. Supersedes the sidebar part of ADR 0005.

Context: the 2026-11-07 audit found about 19 sidebar links. The expandable Project Management entry repeated the 11 stages that Overview's pipeline and the Customers stage filters already list with counts.

Decision: comment out the Project Management entry in `app/src/lib/nav.js`. Keep the `/project-management?stage=…` route and page; Overview and Today still link to it. Nothing is deleted, so restoring the line brings the menu back.

Consequences: shorter sidebar. Stage pages are reached from Overview, Today or Customers. Access rules are unchanged (Admin and Office Staff have both Overview and Project Management).

Checks: the sidebar shows no Project Management entry; Overview stage rows still open the stage page; build passes.
