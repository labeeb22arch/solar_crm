# ADR 0007: Solar CRM identity and additive demo records

Accepted from user instruction, 2026-10-22. Product navigation, browser title and login use Solar CRM. Company legal identity and previously generated agreements are separate from the product name and are not rewritten.

Add a reusable Admin-only demo pack: 44 explicitly labelled synthetic customers, four in each of the existing 11 stages, with technical specifications, stage tasks, varied payments, loan/subsidy status, installation dates, serials and completed warranty examples. Use a fixed pack namespace and skip existing IDs. Never reset or overwrite existing customers. Do not fabricate signatures, live sharing tokens or Drive file links. Cloud insertion ignores conflicts and reads back inserted records before reporting success. Other roles cannot add the pack.

2026-10-26 user-requested expansion: add a separate v2 pack with six synthetic customers in every stage and fuller notes, tracking and document lifecycle examples. Supersedes the original prohibition on demonstrating returned documents only for visibly marked demo fixtures: returned images say DEMO SAMPLE, never imitate a human signature; non-live tokens are blocked from public signing/sharing. No forged Drive links, no overwrite of old records. Explicit Admin add action remains idempotent.
