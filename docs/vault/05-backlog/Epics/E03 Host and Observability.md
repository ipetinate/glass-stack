---
type: epic
id: E03
status: proposed
priority: P0
phase: 0
---

# E03 — Host and Observability

## Outcome

The dashboard presents real, capability-aware host state with freshness and
degradation instead of simulated values.

## Stories

- [[../Stories/US-007 Real host metrics]]
- [[../Stories/US-008 System and storage inventory]]
- [[../Stories/US-009 Safe host operations]]

## Exit criteria

- Metrics are real, bounded, and streamed through the event model.
- Missing sensors and unsupported platforms degrade explicitly.
- Storage is modeled with Linux devices, filesystems, and mount points.

## Dependencies

- [[E01 Platform Foundations]]
- [[E02 Identity and Security]]
