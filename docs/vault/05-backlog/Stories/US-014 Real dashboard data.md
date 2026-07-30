---
type: story
id: US-014
epic: E05
status: backlog
priority: P0
estimate: L
---

# US-014 — Real dashboard data

> As an operator, I want the current dashboard to reflect real server state so
> that its visual polish is trustworthy.

## Acceptance criteria

- Storage, applications, temperature, and throughput use API data.
- Each widget communicates freshness, loading, empty, unavailable, stale, and error states.
- Hard-coded drive letters, app state, and metric series are removed from production.

## Tasks

- [ ] **T-040** Add `lib/glass-api`, query keys, event cache updates, and shared server-state types.
- [ ] **T-041** Connect all dashboard widgets to host/container snapshots and events.
- [ ] **T-042** Add widget state stories/tests and correct contrast/label credibility defects.
