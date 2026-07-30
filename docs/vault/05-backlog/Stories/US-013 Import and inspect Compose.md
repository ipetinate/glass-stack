---
type: story
id: US-013
epic: E04
status: backlog
priority: P1
estimate: L
---

# US-013 — Import and inspect Compose

> As an advanced user, I want to import and inspect Compose so that GlassStack
> does not limit workloads to its catalog.

## Acceptance criteria

- Compose is parsed and validated without executing arbitrary content.
- Unsupported fields and conflicts are explained before apply.
- Users can export the effective model and distinguish imported from catalog apps.

## Tasks

- [ ] **T-037** Define supported Compose subset, normalization, security constraints, and ownership rules.
- [ ] **T-038** Implement import/validation/plan and effective Compose export.
- [ ] **T-039** Build advanced import, warnings, raw inspection, and test fixtures.
