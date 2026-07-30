---
type: story
id: US-011
epic: E04
status: backlog
priority: P0
estimate: XL
---

# US-011 — Catalog app plan and install

> As a home server owner, I want to preview and install a trusted app so that I
> can add services without manually writing Compose.

## Acceptance criteria

- Manifest version, architecture, image, ports, mounts, variables, secrets, and UI metadata are validated.
- The plan identifies conflicts and every host change before apply.
- Install progress survives browser reconnect and ends in success or actionable failure.

## Tasks

- [ ] **T-031** Specify versioned app manifest, catalog source, compatibility, and trust policy.
- [ ] **T-032** Implement manifest validation and plan engine for ports, paths, architecture, and resources.
- [ ] **T-033** Implement operation-backed apply plus app detail, configuration, plan, and progress UI.
