---
type: epic
id: E06
status: proposed
priority: P1
phase: 3
---

# E06 — File Manager

## Outcome

Users can safely browse and perform common file operations inside explicitly
configured roots.

## Stories

- [[../Stories/US-017 Browse safe filesystem roots]]
- [[../Stories/US-018 Perform file operations]]
- [[../Stories/US-019 Edit and inspect files]]

## Exit criteria

- Traversal and symlink escape tests pass.
- Large directories and transfers are bounded and cancellable.
- Destructive operations clearly identify targets and conflicts.

## Dependencies

- [[E01 Platform Foundations]]
- [[E02 Identity and Security]]
