# ADR 0004: Pipeline is the working structure

Accepted from user feedback, 2026-10-22. Supersedes the Kanban layout in ADR 0002 and the Warranty tab in ADR 0001; preserves confirmed next-stage transitions and shared records.

Project Management uses a vertical stage selector and one stage's customer list, with page scrolling only. Each stage explains its work and provides the relevant customer action. Today is a prioritized active-project queue. Overview shows stage distribution and bottlenecks, without repeating department task boards. Customer details use aligned full-width disclosures and four tabs. All three document types remain visible; applicability and stage guidance explain when needed rather than hiding their creation controls. Feasibility is loan-only and DISCOM is scheme-only; historical files remain accessible.

Completed owns the full read-only warranty record. Service issues may still be reported and resolved there. No active-customer Warranty tab. Loan and subsidy are direct sidebar links; status filters belong on their pages. No schema, duplicate ledger or automatic task completion is introduced.

Checks: stage selection/filtering, confirmation cancellation, three document entries, conditional applicability, four customer tabs, completed record read-only, role scope and layout overflow. Real financial and signed records must not be altered for UI verification.

Current-stage tasks are selected from the existing task records using shared stage mappings and role visibility. Do not use the old cross-department next task as the stage's task. Meter Flag currently has no persisted checklist task, so show its stage instructions and manual progression rather than inventing a completion flag. Follow-ups not in the current stage remain in the existing finance and operational views.
