---
type: story
id: US-017
epic: E06
status: backlog
priority: P1
estimate: L
---

# US-017 — Browse safe filesystem roots

> As an administrator, I want to browse approved server locations so that I can
> inspect files without exposing the whole host by accident.

## Acceptance criteria

- Only configured roots are visible and addressable.
- Normalization, traversal, symlink escape, special files, and permission errors are tested.
- Large directories are paginated and sortable without blocking the daemon.

## Tasks

- [ ] **T-049** Define root capability model, path IDs, symlink policy, limits, and threat tests.
- [ ] **T-050** Implement directory listing, metadata, pagination, sorting, and permission mapping.
- [ ] **T-051** Build breadcrumb/list views with loading, empty, denied, missing, and stale states.
