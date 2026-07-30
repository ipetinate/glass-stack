---
type: architecture
status: accepted
updated: 2026-07-29
---

# Target Architecture

## Recommendation

Build GlassStack as a modular Go monolith with explicit domain interfaces and
host adapters. Ship one daemon and one frontend bundle for the single-node MVP.
This minimizes installation and upgrade complexity while preserving boundaries
that can later support a remote node agent.

## Runtime shape

```text
Browser SPA
  ├─ REST /api/v1       commands, queries, configuration
  ├─ SSE /api/v1/events snapshots and low-frequency events
  └─ WebSocket /api/v1/terminal interactive PTY
             │
GlassStack daemon
  ├─ auth + sessions
  ├─ host inventory + metrics
  ├─ containers + app plans
  ├─ files
  ├─ terminal
  ├─ audit + operations
  └─ settings
             │
Adapters: Docker Engine, Linux proc/sys, filesystem, PTY, SQLite
```

## Backend modules

| Module | Responsibility |
|---|---|
| `auth` | First-run bootstrap, credentials, sessions, CSRF |
| `host` | Identity, capabilities, storage, metrics, power operations |
| `containers` | Docker inventory, lifecycle, events, logs |
| `catalog` | Sources, manifest schema, compatibility |
| `apps` | Plan/apply/update/remove and operation state |
| `files` | Root-scoped paths and file operations |
| `terminal` | Authenticated PTY sessions |
| `events` | Typed event broker, replay cursor, backpressure |
| `audit` | Actor, action, target, result, correlation ID |
| `settings` | Validated persistent system/user preferences |
| `platform` | Config, database, logging, migrations, HTTP server |

## Dependency rule

Domain and application services depend on interfaces. Linux, Docker, SQLite,
HTTP, and WebSocket implementations are adapters wired in `cmd/glassd`. HTTP
handlers translate protocol data; they do not collect metrics, mutate Docker,
or create random events.

## API conventions

- Version new product APIs under `/api/v1`.
- Keep `/api/healthz` and `/api/readyz` outside versioning.
- Use JSON with stable resource IDs and RFC 3339 UTC timestamps.
- Return a consistent error body with `code`, `message`, `requestId`, and
  optional field details.
- Commands that may take time return an operation ID.
- SSE events include `id`, `type`, `occurredAt`, `source`, `resourceId`, and a
  versioned payload.
- Do not send secrets, terminal content, or raw environment values in events.

## State model

SQLite stores users, sessions, settings, catalog metadata, app records,
operation history, and audit events. Docker and the host remain sources of
truth for runtime state. Reconciliation compares desired app manifests with
observed container state.

The implemented identity and preference details are specified in
[[Identity, Authentication and User State]].

## Security boundary

The daemon is privileged enough to control Docker, files, and PTYs. Treat every
HTTP request, manifest, path, archive, environment value, image reference, and
WebSocket frame as untrusted.

- Bind to loopback by default; remote exposure is opt-in and documented.
- Use password hashing suitable for interactive logins and secure,
  HttpOnly/SameSite session cookies.
- Enforce CSRF defenses for browser mutations.
- Normalize and resolve file paths beneath configured roots.
- Never mount the Docker socket into third-party app containers by default.
- Redact secrets from logs, audit details, API responses, and UI.
- Validate catalog signatures/checksums when distribution is introduced.

## Frontend boundaries

- Keep reusable primitives in `core/components/ui`.
- Keep composed shell surfaces in `core/components/foundation`.
- Keep render-only helpers in `core/components/structure`.
- Put server API clients and generated types behind `lib/glass-api`.
- Each product module owns its queries, mutations, pages, and domain-specific
  components.
- TanStack Query owns server state; Zustand owns local UI preferences and
  transient client state.
- Route-split modules before the MVP release.

## Protocol decision

- REST for CRUD, commands, initial snapshots, and paginated history.
- SSE for metrics, Docker events, operation progress, and alerts.
- WebSocket for terminal only because it requires bidirectional input, resize,
  and output.

## Evolution to multi-node

When the single-node behavior is stable, extract host/container/file/terminal
interfaces into an agent protocol. The local daemon can call an in-process
adapter while remote nodes use mutually authenticated connections. Do not
prematurely split the MVP binary.
