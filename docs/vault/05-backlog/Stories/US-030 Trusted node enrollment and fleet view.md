---
type: story
id: US-030
epic: E10
status: icebox
priority: P2
estimate: XL
---

# US-030 — Trusted node enrollment and fleet view

> As a multi-server operator, I want to enroll trusted nodes and see fleet state
> so that GlassStack can grow beyond one host.

## Acceptance criteria

- Enrollment proves node identity and establishes revocable mutual trust.
- Fleet state distinguishes online, stale, unreachable, incompatible, and revoked nodes.
- Cross-node actions preserve per-node plan, authorization, result, and audit.

## Tasks

- [ ] **T-088** Threat-model node trust and define versioned agent capability/protocol boundaries.
- [ ] **T-089** Implement enrollment, identity, secure transport, heartbeat, revocation, and offline queues.
- [ ] **T-090** Build node selector/fleet dashboard and multi-node operation tests.
