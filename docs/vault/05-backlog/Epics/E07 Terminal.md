---
type: epic
id: E07
status: proposed
priority: P1
phase: 3
---

# E07 — Terminal

## Outcome

An authenticated administrator can open a reliable browser PTY without creating
an unbounded or anonymous shell.

## Stories

- [[../Stories/US-020 Interactive PTY session]]
- [[../Stories/US-021 Safe terminal lifecycle]]

## Exit criteria

- Input, output, resize, exit, reconnect, and cleanup are tested.
- Sessions have explicit resource and time limits.
- Terminal content is not written to ordinary logs or audit events.

## Dependencies

- [[E02 Identity and Security]]
- [[E09 Delivery and Reliability]]
