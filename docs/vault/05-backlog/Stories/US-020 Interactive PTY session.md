---
type: story
id: US-020
epic: E07
status: backlog
priority: P1
estimate: L
---

# US-020 — Interactive PTY session

> As an administrator, I want a real browser terminal so that interactive tools
> behave as they do over SSH.

## Acceptance criteria

- Authenticated WebSocket sessions carry PTY input, output, resize, exit, and close.
- Shell, environment, working directory, and identity are explicitly configured.
- UTF-8, colors, resize, signals, and common interactive commands are tested.

## Tasks

- [ ] **T-058** Define PTY/WebSocket protocol, origin/auth checks, shell policy, and message limits.
- [ ] **T-059** Implement PTY adapter, WebSocket handler, resize, exit, and process cleanup.
- [ ] **T-060** Integrate terminal emulator UI with connection and exit states.
