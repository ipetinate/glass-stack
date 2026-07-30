---
type: epic
id: E05
status: proposed
priority: P1
phase: 0
---

# E05 — Dashboard and Control Surface

## Outcome

The existing desktop shell becomes a reliable control surface for real server
state, actions, alerts, and navigation.

## Stories

- [[../Stories/US-014 Real dashboard data]]
- [[../Stories/US-015 Customizable widgets and shortcuts]]
- [[../Stories/US-016 Search alerts and operation center]]

## Exit criteria

- No production dashboard value is hard-coded.
- Every widget handles loading, empty, stale, unavailable, and error states.
- Search and alerts lead to real resources or actions.

## Dependencies

- [[E03 Host and Observability]]
- [[E04 Containers and App Platform]]
