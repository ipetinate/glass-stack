---
type: story
id: US-009
epic: E03
status: backlog
priority: P1
estimate: M
---

# US-009 — Safe host operations

> As an administrator, I want guarded host actions so that I can reboot or shut
> down without ambiguous feedback.

## Acceptance criteria

- Capabilities determine which host actions are available.
- Reboot/shutdown require explicit confirmation and return operation state.
- The UI explains expected disconnection and recovery.

## Tasks

- [ ] **T-025** Define least-privilege host-operation adapter and authorization boundary.
- [ ] **T-026** Implement reboot/shutdown operations with audit and graceful daemon behavior.
- [ ] **T-027** Build confirmation/progress/disconnect UX and integration tests.
