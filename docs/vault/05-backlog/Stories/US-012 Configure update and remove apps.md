---
type: story
id: US-012
epic: E04
status: backlog
priority: P0
estimate: L
---

# US-012 — Configure, update, and remove apps

> As an app owner, I want to change, update, and remove an app without silently
> losing configuration or data.

## Acceptance criteria

- Configuration edits are validated and previewed before recreation.
- Updates preserve ports, mounts, variables, and secrets unless explicitly changed.
- Removal separates containers/images/configuration/application-data choices.

## Tasks

- [ ] **T-034** Implement persisted desired app state and safe secret references.
- [ ] **T-035** Implement plan/apply for edit and update with recovery to the previous desired state.
- [ ] **T-036** Implement removal choices, UI warnings, audit, and lifecycle integration tests.
