---
name: glass-stack-architecture
description: Mandatory architecture guardrail for every GlassStack coding task, code review, refactor, API change, new feature, shared component, backend module, event flow, or folder decision. Use before writing code to keep the project aligned with its modular-monolith model, domain boundaries, HTTP/SSE adapters, Go and React conventions, security rules, testing standards, and approved folder structure.
---

# GlassStack Architecture

Use this skill before changing code. Treat it as the project's architectural
contract. Inspect the repository and this skill first, then explain any
intentional exception before implementing it.

## Non-negotiable workflow

1. Map the current package/module and its direct dependencies.
2. Identify the owning domain and the adapter boundary involved.
3. Check the folder map and dependency rules below.
4. Prefer an existing pattern over introducing a parallel one.
5. State the smallest design decision needed before coding.
6. Implement with tests at the same boundary as the behavior.
7. Run formatting, focused tests, the full relevant test suite, and static
   checks when available.
8. Report changed boundaries, new interfaces, risks, and any deviation.

Do not code first and rationalize the architecture afterward. If the task
cannot fit the model, pause and propose an architectural decision.

## Architectural model

Build GlassStack as a modular Go monolith for a single-node daemon:

```text
Browser SPA
  ├─ REST: queries, commands, configuration
  ├─ SSE: metrics, Docker events, progress, alerts
  └─ WebSocket: interactive terminal only
                │
          HTTP adapters
                │
        domain/application modules
                │
       platform/host adapters
```

Keep one daemon and one frontend bundle. Do not introduce microservices,
remote-node orchestration, a plugin system, or a general event bus unless the
user explicitly asks for it and an ADR approves the expansion.

## Approved backend shape

Use domain-oriented packages. Create a package only when it owns real
behavior; do not create empty layers or speculative folders.

```text
backend/
  cmd/glassd/                 # thin composition root and process entrypoint
  internal/
    auth/                     # bootstrap, credentials, sessions, CSRF
    host/                     # host identity, capabilities, storage, metrics
    containers/               # Docker inventory, lifecycle, logs, events
    catalog/                  # app manifests, sources, compatibility
    apps/                     # plan/apply/update/remove operations
    files/                    # root-scoped file operations
    terminal/                 # bounded authenticated PTY sessions
    events/                   # typed broker, subscriptions, replay/backpressure
    audit/                    # actor, action, target, result, correlation
    settings/                 # validated persistent preferences
    platform/
      config/                 # configuration loading and defaults
      database/               # SQLite connection, repositories, migrations
      secrets/                # mode-protected key material persistence
      wallpaper/              # image files and external provider adapters
      logging/                # logger setup and redaction
      system/                 # gopsutil, proc/sys, ioreg and OS adapters
    http/
      routes.go               # route composition only
      server.go               # HTTP lifecycle and timeouts
      middleware.go           # protocol/security middleware
      handlers/               # REST/SSE/WebSocket translation only
```

Current compatibility guidance:

- `internal/system` is an adapter area, not a product domain.
- `internal/http/handlers` is the canonical HTTP handler location.
- Do not use `internal/api/handlers` as a second handler tree.
- `internal/app` may own application lifecycle temporarily, but domain logic
  belongs in its domain package and dependency wiring belongs in `cmd/glassd`.
- Keep `api/` for public protocol schemas/OpenAPI only if and when those files
  exist; it is not a substitute for `internal/http`.
- Avoid `pkg/` unless code is intentionally a supported external library.

## Dependency rules

Dependencies point inward toward domain contracts and outward toward adapters:

```text
cmd/glassd → domain services → interfaces
cmd/glassd → platform adapters
http handlers → domain/application interfaces
platform adapters → OS, Docker, SQLite, external libraries
events → no dependency on HTTP, SSE, React, or transport details
```

Rules:

- Handlers translate protocol input/output; they do not collect metrics,
  execute Docker mutations, query SQLite directly, or invent domain events.
- Domain services do not import `net/http`, Chi, React, SQL drivers, or OS
  commands.
- Define interfaces at the consumer boundary and keep them small. Do not make
  interfaces for every struct or expose interfaces only to mock internals.
- Wire concrete dependencies once at the composition root. Avoid package-level
  mutable state, hidden singletons, and constructors that secretly open global
  resources.
- Pass `context.Context` through I/O and long-running operations. Never store
  contexts in structs or use a background context to hide cancellation.
- Keep DTOs, domain models, and persistence records distinct when their
  lifecycles or security exposure differ.
- Do not create a `utils`, `helpers`, `common`, or catch-all package. Name a
  package after the behavior it owns.

## Events and real-time behavior

`internal/events` is the internal event infrastructure, not an HTTP folder.

- Define typed events with stable type, timestamp, source, resource identity,
  and versioned payload semantics.
- The broker owns publish/subscribe, bounded buffering, cancellation,
  backpressure, and replay policy when required.
- A host metrics service samples adapters and publishes events. It must not be
  recreated independently by each SSE client.
- The SSE handler subscribes, maps approved event data to the wire format, and
  flushes frames. It must not contain metric collection or business rules.
- REST is for snapshots, CRUD, commands, and history; SSE is for updates and
  progress; WebSocket is reserved for bidirectional PTY terminal behavior.
- Never publish secrets, raw environment values, terminal content, credentials,
  or unredacted sensitive data.

## API and security contract

- New product endpoints use `/api/v1`; health/readiness endpoints remain
  outside versioning.
- Use JSON with RFC 3339 UTC timestamps and stable resource identifiers.
- Errors use a consistent shape containing `code`, `message`, `requestId`, and
  optional field details.
- Long-running mutations return an operation identifier and expose progress
  through the events channel.
- Bind to loopback by default; remote exposure is opt-in.
- Treat every request, path, manifest, image, archive, environment value, and
  WebSocket frame as untrusted.
- Enforce authorization in services, not only in handlers or the frontend.
- Resolve file paths beneath configured roots. Apply resource limits and
  expiry to PTY sessions, event queues, uploads, and Docker operations.
- Redact secrets from logs, errors, audit records, events, and API responses.

## Frontend boundaries

```text
frontend/src/
  core/
    components/ui/             # visual primitives
    components/foundation/     # composed shell surfaces
    components/form/           # form-state-aware controls
    components/structure/      # render/control-flow helpers
    layouts/ providers/ stores/
  modules/<domain>/
    api/ repositories/ pages/ components/
  lib/glass-api/                # shared API client and generated/shared types
```

- Put reusable visual primitives in `core/components/ui`.
- Put composed application surfaces in `foundation`.
- Use `form` only when coupled to registration, validation, or submission
  state. Use `structure` for render logic without product styling.
- Keep product-specific behavior inside the owning `modules/<domain>` module.
- TanStack Query owns server state. Zustand owns local UI preferences and
  transient client state.
- Use folder barrels where the existing frontend convention expects them.
- Do not move domain logic into shared components merely to make imports
  shorter.

## Go implementation standards

- Write small cohesive packages and keep the public surface minimal.
- Prefer the standard library; justify every new dependency.
- Run `gofmt` and keep exported identifiers documented when they form a
  package-facing contract.
- Wrap errors with operation context using `%w`; use sentinel or typed errors
  only when callers need stable classification.
- Handle errors at the layer that can act on them. Do not log and return the
  same error repeatedly without adding useful context.
- Make partial results and degraded capability explicit, especially for host
  sensors and cross-platform adapters.
- Protect shared mutable state with clear ownership and synchronization. Run
  `go test -race ./...` for concurrent code.
- Use table-driven tests for parsing, validation, mapping, and boundary cases.
- Test domain behavior with fakes; test adapters with targeted platform-aware
  tests; test handlers through `httptest` at the wire boundary.
- Avoid reflection, code generation, generic repositories, and deep Clean
  Architecture ceremony unless concrete complexity justifies them.

## Architecture red flags

Stop and reassess when a change would:

- add business logic to an HTTP handler;
- make `events` depend on SSE or Chi;
- make a domain package import a database driver or OS command;
- add a second folder for the same responsibility;
- introduce an interface with no consumer or a generic service/repository;
- use a global mutable broker, database, configuration, or logger;
- expose internal persistence records directly as API responses;
- add an external dependency for functionality available in the standard
  library or an existing project dependency;
- add a speculative module without a current use case;
- weaken auth, path confinement, redaction, cancellation, limits, or tests.

## Definition of done for architectural changes

Before handoff, verify:

- the owning domain and adapter are unambiguous;
- imports obey the dependency direction;
- the folder map still has one canonical home per responsibility;
- public API, event, persistence, and security contracts are intentional;
- success, failure, cancellation, partial capability, and cleanup paths are
  tested;
- `go test ./...`, focused tests, formatting, and relevant static checks pass;
- the final report names any exception and the reason for it.

For detailed ecosystem guidance and source links, read
`references/community-guidance.md` when making a Go layout, API, concurrency,
testing, or dependency decision.
