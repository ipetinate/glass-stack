# Docker, Containers and App Platform Architecture

## Overview

GlassStack connects to the host Docker Engine to inventory, operate, and install
containerized applications. The catalog (see `store-architecture.md`) supplies
versioned app manifests; this module turns a manifest into a validated Compose
plan and applies it through Docker. It also normalizes container state for the
UI, streams logs, stats and events, reconciles runtime state against app
instances, resolves an app reachable URL, and edits, updates, and removes apps
without losing configuration or data.

The module follows the module map from the Target Architecture: `containers`
(adapters + inventory + lifecycle) and `apps` (plan/apply/update/remove and
operation state), wired behind domain interfaces in `cmd/glassd`.

## Cross-platform note (macOS + Linux)

The backend talks to the **Docker Engine API**, which is transport-identical on
every distro and on macOS (Docker Desktop, Colima, OrbStack run the daemon in a
Linux VM). The same binary works on both.

- **Host resolution** is layered: `GLASS_DOCKER_HOST` → `DOCKER_HOST` env →
  first existing platform socket (`~/.docker/run/docker.sock`,
  `/var/run/docker.sock`, `~/.colima/default/docker.sock`,
  `~/.orbstack/run/docker.sock`). Each candidate is dialed until one answers
  `Ping`, so development on macOS works with zero configuration.
- **Bind mounts** are rewritten by the planner to `${GLASS_DATA_DIR}/app-data/<appId>`
  (see “Application data root” below). On macOS the path must be inside a
  folder shared with the Docker VM (default `~/…`, so a `DataDir` under the
  user home works).
- **Architecture**: manifests declare `architectures`; the planner validates
  against the engine (`amd64`/`arm64` covers Apple Silicon).
- `docker compose` ships with Docker Desktop and modern Docker Engine packages.

## High-Level Architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│  Catalog (internal/store) — SQLite store_apps                        │
│  manifests: docker-compose.yaml + x-glass metadata                   │
└──────────────────────────┬───────────────────────────────────────────┘
                           ▼
┌────────────────────────────────────────────────────────────────────────┐
│  Apps service (internal/apps)                                          │
│  Planner ─ validate (arch, ports, paths) → effective Compose           │
│           ─ rewrite bind mounts under app-data root                    │
│           ─ detect conflicts (published port, duplicate install)       │
│  Operator ─ apply / update / remove via ComposeRunner                  │
│           ─ operation state machine (SQLite app_operations)            │
│  Desired state (SQLite app_instances) ── reconciliation ─────────────┐ │
└──────────────────────────┬───────────────────────────────────────────┘ │
                           ▼                                             │
┌──────────────────────────────────────────────────────────────────────┐ │
│  Containers service (internal/containers)                            │ │
│  EngineStatus probe · inventory · lifecycle · logs · stats · events  │ │
└──────────────────────────┬───────────────────────────────────────────┘ │
                           ▼                                             │
┌──────────────────────────────────────────────────────────────────────┐ │
│  Adapters (internal/docker)                                          │ │
│  Docker Engine API client (github.com/docker/docker)                 │ │
│  ── read/control: inspect, start/stop/restart, logs, events          │ │
│  ComposeRunner (docker compose CLI, interface-swappable)             │ │
│  ── apply: up / down / config                                        │ │
└──────────────────────────┬───────────────────────────────────────────┘ │
                           │  Docker events stream                       │
                       ▼ ▲ │                                             │
                   Docker Engine (host truth) ◄──────────────────────────┘
                           ▼
             HTTP handlers + SSE (+ WebSocket for PTY/terminal, later)
                           ▼
                     Frontend SPA
```

## Approvals and dependencies

- `E04 Containers and App Platform` is P0, Phase 1–2 of the roadmap.
- `E07 Terminal` (PTY) is **independent**: the store, container status, logs,
  and the URL do not need a PTY. Progress, logs and events stream over REST +
  SSE; WebSocket is reserved for interactive terminal (D-002). An in-container
  console (`docker exec`) is a later feature that reuses the terminal’s
  WebSocket infrastructure and is **not** required for install/status/logs.

## Adapter decisions

1. **Engine API for read/control.** `github.com/docker/docker/client` is the
   official SDK: structured JSON, streaming support for logs/events, no
   subprocess, no output parsing. Status is read from the API, never parsed
   from CLI output.
2. **`docker compose` CLI as `ComposeRunner` for apply.** Compose is a real
   orchestrator (service ordering, healthcheck waits, networks/volumes,
   profiles). Reimplementing `up` on the raw API is a large correctness
   surface; `compose-go` exposes the *model*, not the engine. The plugin ships
   with Docker Engine/Desktop, so it is not an extra install. The CLI adapter
   captures raw output only into the operation log; it never drives state.
   `ComposeRunner` is an interface so a library-based implementation can
   replace the CLI later without touching the domain.
3. **Docker is host truth; SQLite stores control-plane state.** The engine is
   authoritative for runtime state; `app_instances` stores the *desired* state.
   A reconciler diffs desired vs observed and reports `running / stopped /
   degraded` in `runtime_status`.

## Backend files

| File | Responsibility |
|------|---------------|
| `internal/docker/types.go` | Normalized model: `EngineStatus`, `EngineInfo`, `ContainerRecord`, `PortBinding`, `ContainerStats`, `EventMessage` |
| `internal/docker/client.go` | `Engine` — official Docker client wrapper (`Ping`, `Info`, `ListContainers`, `Inspect`, `Start/Stop/Restart`, `Logs`/`LogStream`, `ContainerStats`, `EngineEvents`) |
| `internal/docker/host.go` | `Candidates(configured)` + `Dial(candidates)` — layered host resolution with socket probing |
| `internal/containers/service.go` | `Service` — lazy connection, capability probe, inventory, lifecycle, logs, event reconciliation |
| `internal/apps/planner.go` | Manifest → effective Compose: validation, bind-mount rewriting, conflict detection |
| `internal/apps/operations.go` | Operation kinds, sentinel errors, persisted operation state machine (`app_operations`) |
| `internal/apps/install.go` | `Installer` — Plan/Install/Update/Edit/Remove, desired state (`app_instances`), rollback |
| `internal/apps/reconciler.go` | `Reconciler` — diffs engine containers vs `app_instances`, writes `runtime_status` |
| `internal/apps/accessurl.go` | `Installer.AccessURL` — scheme://host:port+index resolution with host/port resolvers |
| `internal/apps/store.go` | `Store` interface (instances + operations), domain instances and projections |
| `internal/apps/compose_runner.go` | `ComposeRunner` CLI adapter (write compose file, `up -d`, `down`) |
| `internal/platform/database/migrations/003_apps.sql` | `app_instances`, `app_operations`, `store_apps.compose_yaml` |
| `internal/platform/database/migrations/004_apps_runtime.sql` | `options_json`/`installed_version`/`runtime_status` columns; widened operation kinds |
| `internal/http/handlers/docker.go` | Handlers: status, containers list/detail, lifecycle, logs, stats, events SSE |
| `internal/http/handlers/apps.go` | Handlers: install/update/edit/remove, operation polling, apps list/detail |
| `internal/http/routes.go` | Route registration under `/api/v1/` |
| `internal/app/composer.go` | Composition root — dial engine, inject `ComposeRunner`, services |
| `internal/app/reconcile.go` | Composition adapters — reconciler engine, access-URL host/port resolvers |

## Configuration

| Variable | Default | Meaning |
|----------|---------|---------|
| `GLASS_DOCKER_HOST` | empty | Explicit engine target (`unix:///path`, `tcp://host:port`). Overrides `DOCKER_HOST`. |
| `DOCKER_HOST` | — | Standard Docker env, honored when `GLASS_DOCKER_HOST` is unset. |
| `GLASS_DOCKER_TLS_VERIFY` / cert path | — | Optional TLS for remote engine (future; loopback is default). |
| `GLASS_DOCKER_TIMEOUT` | 3s | Per-attempt dial/probe timeout. |
| `GLASS_APP_DATA` | `${GLASS_DATA_DIR}/app-data` | Root where app bind mounts are rewritten and app data lives. |

## API endpoints

All endpoints require an authenticated session (CSRF for mutations).

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `GET` | `/api/v1/docker/status` | Engine reachability + version + arch + compose availability + container counts (drives the status bar) |
| `GET` | `/api/v1/containers` | Normalized inventory (`all=1`), with `query: state` filter |
| `GET` | `/api/v1/containers/{id}` | Container detail (inspect) |
| `POST` | `/api/v1/containers/{id}/start` | Start container (audited) |
| `POST` | `/api/v1/containers/{id}/stop` | Stop container (audited) |
| `POST` | `/api/v1/containers/{id}/restart` | Restart container (audited) |
| `GET` | `/api/v1/containers/{id}/logs` | Recent logs; `?follow=true` → SSE stream (`container.log` events) |
| `GET` | `/api/v1/containers/{id}/stats` | Point-in-time resource snapshot (CPU/memory %, network, block I/O, pids) |
| `GET` | `/api/v1/docker/events` | SSE stream of engine events (`docker.event` events; source for reconciliation) |
| `GET` | `/api/v1/apps` | Installed apps with status + `accessUrl` |
| `GET` | `/api/v1/apps/{appId}` | App detail (config, status, logs link, access URL) |
| `POST` | `/api/v1/apps/install` | Start install `{appId, mode, options:{port?,volume?}}` → operation |
| `GET` | `/api/v1/apps/install/{operationId}` | Poll operation `{id, appId, status, progress, message}` (existing frontend contract) |
| `POST` | `/api/v1/apps/{appId}/update` | Update to latest pinned manifest version (data-preserving) |
| `PATCH` | `/api/v1/apps/{appId}` | Edit configuration (validated preview, then apply) |
| `POST` | `/api/v1/apps/{appId}/remove` | Remove with explicit choices (containers / images / config / data) |

## Docker status response

```json
{
  "connected": true,
  "serverVersion": "27.4.1",
  "apiVersion": "1.47",
  "architecture": "x86_64",
  "os": "linux",
  "composeAvailable": true,
  "containersTotal": 5,
  "containersRunning": 2,
  "error": ""
}
```

When the engine is unreachable, `connected=false` and `error` carries a useful,
redacted message — never raw secrets.

## Data model (migrations `003_apps.sql` + `004_apps_runtime.sql`)

```sql
app_instances (
  id TEXT PRIMARY KEY,
  app_id TEXT NOT NULL UNIQUE REFERENCES store_apps(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('installing', 'installed', 'error')),
  options_json TEXT NOT NULL DEFAULT '{}',      -- install options (port, volume)
  installed_version TEXT NOT NULL DEFAULT '',
  runtime_status TEXT NOT NULL DEFAULT '',      -- '' | running | stopped | degraded
  compose_hash TEXT NOT NULL,                   -- effective compose fingerprint
  last_error TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL, updated_at TEXT NOT NULL
);

app_operations (
  id TEXT PRIMARY KEY,
  app_id TEXT NOT NULL REFERENCES store_apps(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('install', 'update', 'edit', 'remove', 'uninstall')),
  status TEXT NOT NULL CHECK (status IN ('queued', 'running', 'succeeded', 'failed')),
  progress INTEGER NOT NULL DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  message TEXT NOT NULL DEFAULT '',
  payload_json TEXT NOT NULL DEFAULT '{}',
  result_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL, completed_at TEXT
);
```

State machine: `queued → running → succeeded | failed`.
Progress is published over the existing event broker, so SSE
(`/api/v1/events`) pushes operation progress to every connected client while
the store’s 1s polling keeps working as a fallback.

## Reconciliation

- `internal/apps/reconciler.go` `Reconciler.Run` (started as a background
  goroutine by the composition root) subscribes to **Docker events**
  (create/start/die/destroy) and diffs observed containers against
  `app_instances`.
- Containers are attributed to an app by the compose container-name prefix
  `<appId>-`; if no container exists the app is `stopped`, all running →
  `running`, a mix → `degraded`. The outcome is written to `runtime_status`
  (never to desired state). The `apps` package stays decoupled from the docker
  adapter: it consumes the `Engine` interface
  (`StreamEvents`/`List`) and compose maps the concrete containers service onto
  it (`internal/app/reconcile.go`).
- A resync runs at start, after every `container` event, and on a 30s safety-net
  ticker; a failed stream/disconnect reconnects after 1s.
- Container changes made outside GlassStack are surfaced, not silently adopted.

## Access URL resolution

An installed app exposes `accessUrl` computed from the effective entrypoint:
`scheme://<host>[:<publishedPort>]<index>`. `scheme`/`index` come from
`x-glass.entrypoint`; the published port is picked in priority order from (1)
the live container’s published binding for the entrypoint container port
(`internal/app/reconcile.go` `accessPort`, matched against the manifest port
map), (2) the persisted custom-install `options.port`, (3) the manifest port
map. `host` is the `GLASS_PUBLIC_URL` hostname (fallback: `localhost`). Apps
that expose no host port yield an empty `accessUrl`. Example:

```
scheme=http, index=/ → http://glass.local:8096/
```

## Application data root and safe mounts

- Every manifest bind mount whose host path is absolute (e.g.
  `/DATA/AppData/x`) is rewritten to `${GLASS_APP_DATA}/<appId>/<basename>`.
  The `x-glass.entrypoint.main` service owns the data path.
- Rewritten volumes are **preserved across update** by keep-lines on
  `app_instances`: ports, mounts, variables, and secrets are only changed when
  the user explicitly edits them.
- Unsupported mounts (host root-adjacent paths, `/`, device mounts) are
  rejected by the planner with an explanatory warning before apply.
- Secrets stored in `app_instances` are encrypted at rest where non-trivial
  and redacted from API responses, events, logs, and audit records.

## Update and remove without data loss

- **Update**: re-pull the new pinned image digest, regenerate the Compose file
  keeping existing volumes/env/ports, then `up -d`. On failure the operator
  restores the previous effective compose and restarts the app (rollback to
  prior desired state). Guarded by `ErrUpdateInProgress` (409) when an update is
  already queued/running.
- **Edit**: validated preview, then apply of changed ports/volumes while keeping
  the rest of the desired state; guarded by `ErrEditInProgress` (409).
- **Remove**: separate choices — stop/remove containers, delete images, delete
  GlassStack configuration, delete application data under `app-data/`. Each
  destructive level is inside `RemoveRequest{Containers, Images, Config, Data}`
  and requires explicit confirmation (`ErrRemoveNeedsConfirmation`, 400);
  removal is serialized against other operations (`ErrRemoveInProgress`, 409).
  Operations on apps that are not installed fail with `ErrNotInstalled` (409,
  code `app_not_installed`). Mutations emit `glass.apps.*` audit events
  (`installed`/`updated`/`edited`/`removed`).
- Config removal deletes `projectRoot/<appId>`; data removal deletes the
  `app-data/<appId>` root; both are independent of `RemoveImage`.

## Security

- Every mutation goes through `RequireAuthentication` + `RequireCSRF` +
  authorization (admin/operator roles, deny-by-default).
- The Docker socket is **never** mounted into third-party app containers.
- Engine hosts are only ever local (unix) or explicit opt-in TCP with TLS.
- Errors are normalized: `code`, `message`, `requestId`; engine error messages
  are surfaced to the user helpfully but scrubbed of sensitive values.

## Testing strategy

- `internal/docker` — `Engine` is tested against an `httptest` fake daemon
  (implements `/_ping`, `/info`, `/containers/json`, `/containers/{id}/logs`,
  `/containers/{id}/stats`, `/events`); host `Candidates`/`Dial` tested with
  env overrides and a live TCP listener.
- `internal/containers` — unit tests on a fake `docker.Client` interface
  (connected, unreachable, empty inventory, error remapping, stats/events).
- `internal/http` — handler and route integration tests for
  `/api/v1/docker/status`, `/api/v1/containers`, `/api/v1/containers/{id}/stats`,
  `/api/v1/docker/events`, and the `/api/v1/apps` install/update/edit/remove/
  list/detail contract (auth + CSRF + payload shape), mirroring
  `routes_integration_test.go`.
- `internal/apps` — planner unit tests (arch mismatch, port conflict, mount
  rewriting, duplicate install), operation state-machine tests, update/edit/
  remove guards, reconciler (`Reconciler` against a fake engine + in-memory
  store), and access-URL resolution priority tests.
- Real-Docker smoke coverage gated by the `integration` build tag
  (`internal/docker/smoke_test.go`, `glass-stack/scripts/docker-smoke.sh`);
  read-only probes that skip when no daemon is reachable. Deeper
  install/update/rollback integration follows the risk-based test policy
  (US-025).