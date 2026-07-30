---
type: story
id: US-026
epic: E09
status: backlog
priority: P0
estimate: M
---

# US-026 — Operable and resilient daemon

> As an operator, I want useful diagnostics and graceful failure behavior so
> that I can recover when GlassStack or a dependency is unhealthy.

## Acceptance criteria

- Structured logs correlate requests, operations, and adapter errors without secrets.
- Health and readiness distinguish process life from dependency readiness.
- Shutdown drains HTTP/events and closes Docker, database, PTY, and background workers.

## Tasks

- [ ] **T-076** Implement structured logging, redaction, request/operation correlation, and log config.
- [ ] **T-077** Implement health/readiness, graceful shutdown, timeouts, event backpressure, and worker supervision.
- [ ] **T-078** Implement redacted diagnostic bundle and failure/recovery runbooks.
