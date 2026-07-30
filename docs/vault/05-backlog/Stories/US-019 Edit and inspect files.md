---
type: story
id: US-019
epic: E06
status: backlog
priority: P2
estimate: M
---

# US-019 — Edit and inspect files

> As an advanced user, I want to inspect and edit supported text files so that I
> can make small configuration changes without a terminal.

## Acceptance criteria

- Binary, oversized, encoded, and permission-denied files are detected safely.
- Save detects concurrent modification and never silently overwrites it.
- Syntax assistance does not imply semantic validity unless a validator exists.

## Tasks

- [ ] **T-055** Implement bounded text read/write with encoding and optimistic concurrency metadata.
- [ ] **T-056** Add supported syntax detection and validators for JSON/YAML where appropriate.
- [ ] **T-057** Build editor, dirty-state, diff/conflict, save, and error UX.
