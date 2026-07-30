---
type: epic
id: E09
status: proposed
priority: P0
phase: 0
---

# E09 — Delivery and Reliability

## Outcome

GlassStack can be built, tested, diagnosed, upgraded, and distributed with
confidence on supported hosts.

## Stories

- [[../Stories/US-025 Risk-based automated tests]]
- [[../Stories/US-026 Operable and resilient daemon]]
- [[../Stories/US-027 Secure multi-architecture release]]

## Exit criteria

- Docker, API contract, browser, installer, upgrade, and restore tests exist.
- Logs, probes, diagnostic bundle, shutdown, and event limits are implemented.
- Artifacts are signed, checksummed, and accompanied by an SBOM.

## Dependencies

Cross-cutting; starts immediately.
