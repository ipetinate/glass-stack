---
type: product
status: proposed
updated: 2026-07-28
---

# MVP Scope

## MVP definition

The MVP is a secure, single-node control plane for a supported Debian or Ubuntu
host. It is complete when a user can install GlassStack, create the first admin,
observe real host and Docker state, install and manage an app, browse files
inside configured roots, and open an authenticated terminal session.

## In scope

- Reproducible installer, upgrade, and uninstall flow.
- First-run administrator and secure browser session.
- CPU, memory, disk, network, temperature-when-available, and system identity.
- Docker container discovery, status, logs, start, stop, restart, and removal.
- Versioned app-manifest schema and one trusted catalog source.
- Install plan with port, mount, architecture, and configuration validation.
- Install/update progress and useful failure states.
- Filesystem browsing and basic file operations inside explicit roots.
- Authenticated PTY terminal with resize, reconnect, and bounded sessions.
- Persistent settings, audit history, health/readiness, logs, and backups of
  GlassStack state.
- Responsive desktop/tablet experience and a deliberately supported compact
  mode; no broken mobile layout.

## Explicitly after MVP

- Multi-node fleet control and remote agent enrollment.
- Multi-user RBAC beyond a single administrator.
- High availability.
- Kubernetes management.
- Cloud account requirement or hosted relay.
- Arbitrary plugin execution inside the privileged backend.
- Full backup of application data volumes.
- Marketplace monetization or publisher accounts.

## Release gates

- No default credentials.
- No unauthenticated privileged endpoint.
- All file operations enforce configured roots and reject traversal.
- All terminal sessions are authenticated, bounded, and closed on logout.
- App changes expose a plan and record an audit event.
- Installer and upgrade smoke tests run on supported architectures.
- Critical flows have backend integration and browser end-to-end coverage.
- Accessibility checks cover keyboard use, contrast, focus, and reduced motion.
