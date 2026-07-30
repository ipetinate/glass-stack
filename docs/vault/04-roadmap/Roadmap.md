---
type: roadmap
status: proposed
updated: 2026-07-28
---

# Roadmap

## Phase 0 — Foundations and truth

Outcome: the project has an honest, secure contract between product, UI, and
host.

- Close API/config/database/security decisions.
- Fix route and documentation drift.
- Establish first-run admin, sessions, migrations, request IDs, and errors.
- Replace random temperature data with a real capability-aware host snapshot.

Exit: an authenticated user sees real host identity and metrics in the current
dashboard.

## Phase 1 — Docker control loop

Outcome: GlassStack manages observed containers safely.

- Docker adapter and inventory.
- Container detail, logs, events, and lifecycle commands.
- Operations and audit timeline.
- Applications widget uses real containers.

Exit: a user can inspect, start, stop, and restart an existing container and
understand the result.

## Phase 2 — First installable app

Outcome: the product fulfills its central promise.

- Versioned manifest and trusted catalog.
- Compatibility and conflict validation.
- Plan/apply with progress, failure detail, and preserved configuration.
- Update/remove and Compose export.

Exit: one catalog app passes install, open, update, restart, and remove tests on
amd64 and arm64.

## Phase 3 — Host workspace

Outcome: everyday server administration is possible without SSH.

- Root-scoped file manager and uploads/downloads.
- Authenticated terminal.
- Persistent settings, service integration, notifications, and global search.
- Responsive and accessible shell.

Exit: all MVP capabilities meet release gates in [[01-product/MVP Scope]].

## Phase 4 — Release hardening

Outcome: strangers can install and operate GlassStack safely.

- Packages/installer, upgrade/uninstall, signed multi-arch artifacts, SBOM.
- End-to-end, Docker integration, installer, and restore testing.
- Diagnostic bundle, documentation, compatibility matrix, and security policy.

Exit: `0.1.0` release candidate.

## Phase 5 — Beyond MVP

- App configuration history and richer rollback.
- Application data backup/restore.
- Additional catalog sources and publisher trust.
- Multi-user roles.
- Multi-node enrollment and fleet views.

## Prioritization rule

When choosing between a polished isolated screen and a complete vertical slice,
prefer the slice. A feature is useful only when UI, API, host adapter, security,
failure state, and verification meet at the same user outcome.
