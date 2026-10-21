# ADR 0001: Customer workspace is the operational home

Status: Accepted by user, 2026-10-22.

## Context
The customer header, stage strip and permanent stage sidebar crowd the working area. Separate operational screens make customer work hard to find. Screenshots reviewed in the current session show customer details below the first viewport.

## Decision
Use a full-width customer list opening a full-width record. Keep the familiar five tabs: Overview, Finance, Documents, History, Warranty. Keep five small collapsible Overview sections. Show the stage panel only on demand as a drawer. Put serial entry/scanning inside the customer record. Payments, warranty service and document preparation remain available inside their tabs. Other screens are tracking views, not separate copies of customer data.

## Alternatives
Split list/detail pane and denser cards were offered; user selected full-width list and workspace. Do not introduce unrelated visual redesigns or new shortcut dashboards.

## Consequences
Customers remain the navigation hub. Shared components and API functions must be reused; no parallel payment, serial or warranty storage. Dense layout must retain labels, visible focus and phone controls.

## Checks
Check viewport use, keyboard navigation, mobile stacking, serial save, payment access, document return navigation and warranty issue access. Never use destructive production data changes for UI verification.
