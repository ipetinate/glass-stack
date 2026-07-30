---
type: story
id: US-001
epic: E01
status: backlog
priority: P0
estimate: L
---

# US-001 — Install and operate GlassStack

> As a server owner, I want a repeatable install and service lifecycle so that I
> can trust GlassStack on a fresh host.

## Acceptance criteria

- Supported hosts get validated prerequisites and actionable failures.
- The daemon starts through the host service manager and shuts down gracefully.
- Upgrade and uninstall preserve or remove data only with explicit choices.

## Tasks

- [ ] **T-001** Define supported-host prerequisites, paths, user/group, ports, and ownership.
- [ ] **T-002** Implement installer plus systemd service with preflight and rollback behavior.
- [ ] **T-003** Implement versioned upgrade and uninstall flows with data-retention choices.
