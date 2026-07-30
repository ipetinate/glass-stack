---
type: home
project: GlassStack
status: active
updated: 2026-07-29
---

# GlassStack

> Server management, made transparent.

GlassStack is an open-source control plane for homelabs and self-hosted
servers. It aims to offer the approachability of CasaOS while making every
important operation inspectable, predictable, and recoverable.

## Start here

- [[01-product/Product Vision|Product vision]]
- [[01-product/MVP Scope|MVP scope]]
- [[01-product/Competitive Positioning|Competitive positioning]]
- [[01-product/UX and Visual Direction|UX and visual direction]]
- [[02-discovery/Current State Assessment|Current state assessment]]
- [[03-architecture/Target Architecture|Target architecture]]
- [[03-architecture/Identity, Authentication and User State|Identity, authentication and user state]]
- [[04-roadmap/Roadmap|Roadmap]]
- [[05-backlog/Backlog Index|Backlog index]]
- [[06-kanban/MVP Delivery Board|MVP delivery board]]
- [[07-decisions/Decision Log|Decision log]]

## Current headline

The project now has a secure persistent control-plane foundation: first-run
onboarding, Argon2id credentials, administrator TOTP, browser sessions,
closed invitations, per-user preferences, wallpaper files/metadata, SQLite
migrations and real host metrics. The next milestone is to apply the same
authorization/audit contracts to Docker, files and terminal operations.

## Working conventions

- Epics describe outcomes and boundaries.
- Stories describe user value and acceptance criteria.
- Tasks are implementation units listed inside stories and mirrored on the
  Kanban board.
- IDs are stable: `E##`, `US-###`, and `T-###`.
- `P0` means required for the first usable release; `P1` means MVP quality or
  completeness; `P2` means after the MVP.
- A story is done only when its acceptance criteria and relevant automated
  tests pass.

## Vault usage

Open `docs/vault` as a vault in Obsidian. The board in
[[06-kanban/MVP Delivery Board]] uses the community Kanban format but remains
readable as plain Markdown. If the Kanban plugin is not already installed,
Obsidian will ask before installing or enabling it.
