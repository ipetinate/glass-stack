---
type: story
id: US-021
epic: E07
status: backlog
priority: P1
estimate: M
---

# US-021 — Safe terminal lifecycle

> As a server owner, I want terminal sessions bounded and attributable so that a
> disconnected browser does not leave uncontrolled processes.

## Acceptance criteria

- Concurrent sessions, idle timeout, output buffering, and reconnect windows are bounded.
- Logout/revocation closes or detaches sessions according to documented policy.
- Audit records session lifecycle metadata but never command/output content.

## Tasks

- [ ] **T-061** Define resource limits, reconnect token, lifecycle, and disconnect policy.
- [ ] **T-062** Implement session registry, backpressure, expiry, cleanup, and revocation hooks.
- [ ] **T-063** Add lifecycle metrics, safe audit events, and stress/integration tests.
