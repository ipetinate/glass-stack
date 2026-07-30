---
type: backlog
status: active
updated: 2026-07-29
---

# Backlog Index

## Delivery model

```text
Epic outcome
  └─ User story with acceptance criteria
       └─ Implementation tasks mirrored on the Kanban board
```

## Epics

| ID | Epic | Phase | Priority |
|---|---|---:|---|
| E01 | [[Epics/E01 Platform Foundations|Platform Foundations]] | 0 | P0 |
| E02 | [[Epics/E02 Identity and Security|Identity and Security]] | 0 | P0 |
| E03 | [[Epics/E03 Host and Observability|Host and Observability]] | 0–1 | P0 |
| E04 | [[Epics/E04 Containers and App Platform|Containers and App Platform]] | 1–2 | P0 |
| E05 | [[Epics/E05 Dashboard and Control Surface|Dashboard and Control Surface]] | 0–3 | P1 |
| E06 | [[Epics/E06 File Manager|File Manager]] | 3 | P1 |
| E07 | [[Epics/E07 Terminal|Terminal]] | 3 | P1 |
| E08 | [[Epics/E08 Settings and Experience|Settings and Experience]] | 3 | P1 |
| E09 | [[Epics/E09 Delivery and Reliability|Delivery and Reliability]] | 0–4 | P0 |
| E10 | [[Epics/E10 Resilience and Multi-node|Resilience and Multi-node]] | 5 | P2 |

## Prioritization

- **Now:** foundations, security, real host state.
- **Next:** Docker inventory and lifecycle.
- **Then:** catalog plan/apply and one end-to-end app.
- **MVP completion:** files, terminal, experience, packaging, and hardening.
- **Later:** app-data recovery and multi-node.

## Definition of ready

- User value and acceptance criteria are clear.
- Security and destructive effects are identified.
- API/domain dependency is known.
- Design states include loading, empty, error, and permission cases.
- Task can be independently verified.

## Definition of done

- Acceptance criteria pass.
- Relevant unit/integration/end-to-end tests pass.
- Logs and errors do not leak secrets.
- Documentation and API schema are updated.
- UI includes keyboard, focus, loading, empty, and failure behavior.
- Operational changes emit an audit record.
