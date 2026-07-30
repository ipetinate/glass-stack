---
type: story
id: US-008
epic: E03
status: backlog
priority: P0
estimate: M
---

# US-008 — System and storage inventory

> As an operator, I want accurate host and storage identity so that dashboard
> labels correspond to the Linux machine I am managing.

## Acceptance criteria

- Hostname, OS, kernel, architecture, uptime, and GlassStack version are visible.
- Storage reports device, filesystem, mount point, used, available, and read-only state.
- Pseudo filesystems and duplicate mounts are handled intentionally.

## Tasks

- [ ] **T-022** Implement host identity and capability inventory.
- [ ] **T-023** Implement block/mount inventory with filesystem filtering and stable IDs.
- [ ] **T-024** Design and connect system/storage detail UI using Linux-native terminology.
