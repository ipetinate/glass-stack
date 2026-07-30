---
type: epic
id: E02
status: proposed
priority: P0
phase: 0
---

# E02 — Identity and Security

## Outcome

Only an authenticated administrator can perform privileged server operations,
and every consequential action is attributable.

## Stories

- [[../Stories/US-004 First-run administrator]]
- [[../Stories/US-005 Secure browser sessions]]
- [[../Stories/US-006 Audited and safe operations]]
- [[../Stories/US-029 Multi-user roles]]

## Exit criteria

- No default credentials or anonymous privileged endpoint.
- Session, CSRF, rate-limit, and logout behavior are verified.
- Destructive operations require intent and create redacted audit records.

## Dependencies

- [[E01 Platform Foundations]]
