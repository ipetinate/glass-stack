---
type: story
id: US-010
epic: E04
status: backlog
priority: P0
estimate: L
---

# US-010 — Container inventory and lifecycle

> As an operator, I want to see and control existing Docker containers so that
> GlassStack reflects workloads already on my host.

## Acceptance criteria

- Managed and external containers are listed without forcing conversion.
- Start, stop, restart, and logs expose progress and useful Docker errors.
- Docker events reconcile observed state after external changes.

## Tasks

- [ ] **T-028** Define Docker adapter, compatibility policy, normalized container model, and test doubles.
- [ ] **T-029** Implement inventory, inspect, logs, lifecycle commands, events, and reconciliation.
- [ ] **T-030** Build container list/detail/actions with loading, empty, conflict, and error states.
