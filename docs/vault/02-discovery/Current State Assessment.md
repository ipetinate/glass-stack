---
type: assessment
status: current
updated: 2026-07-28
---

# Current State Assessment

## Executive assessment

GlassStack is an early frontend-led prototype with a credible product shell.
The React codebase has meaningful reusable components and strong unit coverage.
The Go backend is a scaffold with a health endpoint and simulated SSE
temperature events; Docker, persistence, host metrics, files, terminal, auth,
and configuration are not implemented.

The highest-value next step is a vertical slice: secure first-run setup, real
host identity/metrics, Docker inventory, and frontend integration. Continuing
to fill visual pages with mocks would increase rework because the API contracts
and trust boundaries are not yet established.

## Repository map

| Area | State | Evidence |
|---|---|---|
| Frontend shell | Strong prototype | Sidebar, status bar, search, route transitions, windows |
| Dashboard | Visual prototype | Real chart components; all dashboard values hard-coded |
| Settings | Partial product flow | Appearance works locally; General/Services are placeholders |
| Store | Empty window | Route/page exist; sidebar route currently mismatches |
| File manager | Empty window | Shell only |
| Terminal | Empty window | Shell only |
| Backend HTTP | Proof of concept | `/api/health`, `/api/events` |
| Events | Prototype | Handler emits random temperature values every second |
| Docker/app domain | Scaffold | Package files contain only package declarations |
| Host metrics | Scaffold | CPU/disk/memory/network/temperature files are empty |
| Database/config/logging | Scaffold | No persistence or configuration behavior |
| Delivery | Early CI | Frontend lint/test/build; backend build/test |

## Validation snapshot

- Frontend: 64 test files and 154 tests passed.
- Frontend: TypeScript build and OxLint passed.
- Frontend: Vite emitted one JavaScript chunk around 1.27 MB
  (about 361 kB gzip), above the default warning threshold.
- Backend: current local tests do not compile because the uncommitted
  `events_test.go` declares an unused `context` variable.
- Working tree contained pre-existing backend SSE test/route edits; this
  assessment did not modify them.

## Architecture strengths

- Clear feature-module split in the frontend.
- Shared components are separated into visual primitives (`ui`), composed
  surfaces (`foundation`), form controls, and render structure.
- Folder barrels and path aliases are consistently used.
- Tests cover components, stores, hooks, queries, routes, and charts.
- `Window` already handles complex interaction details and reduced motion.
- TanStack Query and Zustand responsibilities are reasonably separated.

## Gaps and inconsistencies

- No authentication or authorization despite the intended privileged features.
- No explicit API versioning, error model, request IDs, or schema contract.
- Backend creates dependencies internally rather than composing interfaces and
  adapters at startup.
- No graceful shutdown, timeouts, middleware, CORS policy, or structured
  configuration.
- SSE error path writes an error but does not return before using a missing
  flusher.
- Simulated events are implemented in the HTTP handler instead of an event
  broker/domain source.
- README claims Docker, SQLite, file management, terminal, and real metrics
  that do not yet exist.
- README lists `net/http`, but the current router depends on Chi.
- README says WebSocket or SSE for terminal without a protocol decision.
- App store sidebar route (`/store`) does not match router
  (`/applications-store`).
- The frontend has no API client boundary for the GlassStack backend.
- The responsive experience is not implemented.
- The build is not route-split and ships a large initial chunk.

## Recommended immediate sequence

1. Freeze the MVP and security model.
2. Establish config, dependency composition, API conventions, and migrations.
3. Implement first-run admin/session protection.
4. Replace simulated metrics with a real host snapshot plus SSE updates.
5. Add Docker read-only inventory.
6. Connect the dashboard and applications widget to real APIs.
7. Add plan/apply for the first catalog app.

## Do not do yet

- Multi-node orchestration.
- A broad plugin system.
- Dozens of catalog apps before the manifest and migration policy stabilize.
- Full mobile parity before the compact shell/navigation model is designed.
- Microservices; a modular monolith is easier to secure, install, and evolve at
  this stage.
