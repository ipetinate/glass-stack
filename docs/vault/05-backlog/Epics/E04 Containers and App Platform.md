---
type: epic
id: E04
status: proposed
priority: P0
phase: 1
---

# E04 — Containers and App Platform

## Outcome

Users can inspect existing Docker workloads and safely install, configure,
update, and remove manifest-backed applications.

## Stories

- [[../Stories/US-010 Container inventory and lifecycle]]
- [[../Stories/US-011 Catalog app plan and install]]
- [[../Stories/US-012 Configure update and remove apps]]
- [[../Stories/US-013 Import and inspect Compose]]

## Exit criteria

- Docker inventory and lifecycle are reconciled and audited.
- A trusted manifest produces a validated preview before mutation.
- One app completes install/update/remove tests on amd64 and arm64.

## Dependencies

- [[E01 Platform Foundations]]
- [[E02 Identity and Security]]
- [[E09 Delivery and Reliability]]
