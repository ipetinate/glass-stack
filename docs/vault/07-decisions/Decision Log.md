---
type: index
status: active
updated: 2026-07-29
---

# Decision Log

These are proposed decisions. Promote a decision into a dated ADR when accepted.

| ID | Decision | Status |
|---|---|---|
| D-001 | Modular Go monolith for the single-node MVP | Proposed |
| D-002 | REST + SSE, with WebSocket reserved for PTY terminal | Proposed |
| D-003 | SQLite for control-plane state; host/Docker remain runtime truth | Accepted |
| D-004 | Single administrator in MVP; RBAC after MVP | Superseded by D-009 |
| D-005 | Debian 12 and current Ubuntu LTS, amd64/arm64 first | Proposed |
| D-006 | Versioned GlassStack app manifest with plan/apply | Proposed |
| D-007 | Loopback bind by default; remote exposure opt-in | Proposed |
| D-008 | One daemon binary plus embedded/static frontend distribution | Proposed |
| D-009 | Closed invitations with admin/operator/viewer roles in MVP | Accepted |
| D-010 | Persist local wallpaper bytes and metadata; hotlink provider media unless compatible rights permit self-hosting | Accepted |
| D-011 | Hybrid local and k-anonymous compromised-password checks | Accepted |

## Decisions that need explicit owner confirmation

- Whether GlassStack manages an existing Docker Engine or installs Docker.
- Exact application data root and ownership model.
- Whether the first release supports TLS directly or documents a reverse proxy.
- Catalog governance, signature model, and third-party source policy.
- Product language policy for MVP.
