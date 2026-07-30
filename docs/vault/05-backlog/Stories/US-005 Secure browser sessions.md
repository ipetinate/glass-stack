---
type: story
id: US-005
epic: E02
status: done
priority: P0
estimate: M
---

# US-005 — Secure browser sessions

> As an administrator, I want secure login and logout behavior so that other
> users on the network cannot reuse or forge my session.

## Acceptance criteria

- Session cookies are Secure when applicable, HttpOnly, and appropriately SameSite.
- Mutations enforce CSRF protection and authentication.
- Login is rate-limited; logout and password changes revoke sessions.

## Tasks

- [x] **T-013** Implement login, session rotation, idle/absolute expiry, logout, and revocation.
- [x] **T-014** Implement CSRF, origin checks, rate limits, and secure cookie policy.
- [x] **T-015** Add frontend auth bootstrap, protected routes, expiry handling, and auth tests.
