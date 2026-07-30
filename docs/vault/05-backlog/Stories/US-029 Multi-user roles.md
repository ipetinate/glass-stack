---
type: story
id: US-029
epic: E02
status: in-progress
priority: P0
estimate: L
---

# US-029 — Multi-user roles

> As a household administrator, I want limited accounts so that others can use
> services without receiving terminal or destructive access.

## Acceptance criteria

- Permissions are deny-by-default and enforced in services, not only UI.
- Roles cover viewing, app use, app management, files, terminal, host, and admin.
- Audit events preserve actor identity and permission decisions.

## Tasks

- [x] **T-085** Threat-model roles/resources/actions and define authorization policy.
- [x] **T-086** Implement users, invitations or provisioning, policy checks, and session integration.
- [ ] **T-087** Build user/role administration and authorization matrix tests.

The invitation and role administration UI is implemented. T-087 remains open
until every privileged product module has a resource/action authorization
matrix; those modules do not all exist yet.
