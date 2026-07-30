---
type: story
id: US-025
epic: E09
status: backlog
priority: P0
estimate: L
---

# US-025 — Risk-based automated tests

> As a maintainer, I want tests at trust boundaries so that host mutations and
> releases fail safely.

## Acceptance criteria

- Backend unit and integration tests cover auth, paths, Docker plans, migrations, and events.
- API contract tests keep frontend/backend schemas aligned.
- Browser tests cover the north-star flow and critical failure paths.

## Tasks

- [ ] **T-073** Define test pyramid, fixtures, fake adapters, and coverage expectations by risk.
- [ ] **T-074** Add backend race, integration, migration, Docker, and security-boundary tests.
- [ ] **T-075** Add API contract and browser end-to-end suites to CI with actionable artifacts.
