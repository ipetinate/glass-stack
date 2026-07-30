---
type: story
id: US-004
epic: E02
status: done
priority: P0
estimate: M
---

# US-004 — First-run administrator

> As a new owner, I want to establish the first administrator securely so that
> the server is never exposed with default credentials.

## Acceptance criteria

- Setup is available only while no administrator exists.
- Bootstrap is bound to a local or one-time proof and cannot be replayed.
- Password policy and hashing errors are clear without leaking sensitive data.

## Tasks

- [x] **T-010** Threat-model first-run bootstrap and choose local/one-time proof semantics.
- [x] **T-011** Implement administrator persistence and memory-hard password hashing.
- [x] **T-012** Build onboarding screens, validation, success transition, and setup-lock tests.
