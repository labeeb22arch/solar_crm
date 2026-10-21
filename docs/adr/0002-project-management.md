# ADR 0002: Project Management is a Kanban view of existing stages

Status: Accepted by user, 2026-10-22.

## Context
Customers need a cross-project view of all workflow stages. The user requests confirmation before moving to the next stage.

## Decision
Add Project Management in the sidebar. Use the existing ordered stage definitions and existing scoped customer API. Cards open the customer record. A card may advance only to the next stage. Both drag/drop and a keyboard/phone-friendly button open a confirmation dialog; no write happens before confirmation. Read-only roles may view but cannot move. Reject stale moves if the current stage changed while the confirmation was open. Record every confirmed move in the existing timeline.

## Alternatives
Immediate drag updates, arbitrary stage jumps and a separate board database were rejected. Kanban is a view, not a new workflow engine.

## Consequences
Eleven stages require horizontal scrolling; provide stage-jump controls. Mobile uses the explicit move button. Stage moves change only project stage and history; they must not invent completed tasks, payments or installation dates. Requirements/checklist gating needs a separate agreed decision.

## Checks
Test next-stage validation, completed-stage behavior, stale-stage rejection, readonly controls, cancellation and opening a customer.
