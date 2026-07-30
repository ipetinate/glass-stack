---
type: story
id: US-007
epic: E03
status: ready
priority: P0
estimate: L
---

# US-007 — Real host metrics

> As an operator, I want real and fresh resource metrics so that I can judge
> host health without SSH.

## Acceptance criteria

- CPU, memory, disk throughput, and network metrics have documented units.
- Temperature is capability-aware and may be unavailable without failing the snapshot.
- Initial REST snapshot and subsequent SSE updates share stable schemas.

## Tasks

- [ ] **T-019** Implement Linux collectors with fixtures, units, sampling cadence, and capability detection.
- [ ] **T-020** Build metrics service and bounded typed event publication.
- [ ] **T-021** Expose snapshot/SSE APIs and test reconnect, stale, and unsupported cases.
