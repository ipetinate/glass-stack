---
type: story
id: US-002
epic: E01
status: ready
priority: P0
estimate: M
---

# US-002 — Dependable API contract

> As a frontend developer, I want a versioned, typed API contract so that UI
> behavior does not depend on handler-specific guesses.

## Acceptance criteria

- Product endpoints use `/api/v1`; health/readiness have stable probe paths.
- Errors contain a code, safe message, request ID, and optional field details.
- Long-running mutations return an operation resource.

## Tasks

- [ ] **T-004** Define OpenAPI schemas, naming, pagination, timestamps, and error envelope.
- [ ] **T-005** Add request ID, recovery, JSON, authentication hook, and timeout middleware.
- [ ] **T-006** Generate or hand-maintain one typed frontend client boundary with contract tests.
