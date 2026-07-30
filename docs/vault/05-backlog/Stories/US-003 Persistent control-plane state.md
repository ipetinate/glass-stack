---
type: story
id: US-003
epic: E01
status: in-progress
priority: P0
estimate: M
---

# US-003 — Persistent control-plane state

> As an operator, I want GlassStack state to survive restarts and upgrades so
> that configuration and operation history remain dependable.

## Acceptance criteria

- SQLite opens with safe pragmas and ordered migrations.
- Repositories isolate domain services from SQL details.
- Backup and restore are validated before schema-changing upgrades.

## Tasks

- [x] **T-007** Add configuration loading, validation, data directories, and dependency composition.
- [x] **T-008** Add SQLite connection, migrations, schema version, and transactional repository pattern.
- [ ] **T-009** Implement control-plane backup/restore verification and migration failure recovery.

`VACUUM INTO` backup and integrity verification are implemented. An operator
restore command and pre-upgrade rollback workflow remain in T-009.
