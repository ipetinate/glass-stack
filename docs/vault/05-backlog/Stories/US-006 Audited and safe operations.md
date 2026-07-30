---
type: story
id: US-006
epic: E02
status: in-progress
priority: P0
estimate: M
---

# US-006 — Audited and safe operations

> As an administrator, I want consequential actions recorded and clearly
> confirmed so that I can explain and recover from changes.

## Acceptance criteria

- Audit events identify actor, action, target, result, time, and correlation.
- Secrets and terminal content never enter ordinary audit detail.
- Destructive flows distinguish reversible, data-preserving, and data-removing choices.

## Tasks

- [x] **T-016** Define audit event schema, retention, redaction, and correlation rules.
- [ ] **T-017** Add operation confirmation model and typed destructive-action levels.
- [ ] **T-018** Build audit/operation history UI with filters and safe detail rendering.
