---
type: epic
id: E10
status: proposed
priority: P2
phase: 5
---

# E10 — Resilience and Multi-node

## Outcome

After the single-node control loop is stable, users can recover application
state, delegate limited access, and operate multiple trusted nodes.

## Stories

- [[../Stories/US-028 Application data backup and restore]]
- [[../Stories/US-029 Multi-user roles]]
- [[../Stories/US-030 Trusted node enrollment and fleet view]]

## Exit criteria

- Backups have explicit consistency and restore verification.
- Roles deny privileged actions by default.
- Node identity, trust, offline state, and cross-node operations are designed
  and threat-modeled.

## Dependencies

- All MVP epics.
