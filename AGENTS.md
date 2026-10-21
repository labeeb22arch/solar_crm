# Sunpay working instructions

- The active CRM is in `app/`. The root npm scripts delegate to it. Do not work on the older root prototype or external Solarflow/Watersun references unless explicitly requested.
- Before structural UI, workflow or data changes, read `docs/adr/README.md` and relevant accepted ADRs. Read `docs/design/DESIGN-SYSTEM.md` before changing shared UI.
- Maintain `docs/design/WORKING-SESSION.md` during design discussions. Record significant accepted choices as ADRs; keep proposals and unanswered questions separate. User instructions take precedence.
- Customer operations belong in the customer record; tracking/board pages reuse the same domain API and records. Do not create duplicate ledgers, serial stores or warranty histories.
- Ask focused workflow questions when decisions materially affect the result, while continuing independent work. Do not turn every small change into an approval process.
- Update the engineering follow-up list when discovering substantial deferred issues. Avoid unrelated refactors while delivering a feature.
- Private env files and local login files must remain excluded from Git. Never commit demo passwords or service-role keys.
- Verify meaningful behavior, cancellation, role scope and the affected layout. Do not modify real customer financial/signature records just to test UI. Report hardware/cloud checks that were not performed.
