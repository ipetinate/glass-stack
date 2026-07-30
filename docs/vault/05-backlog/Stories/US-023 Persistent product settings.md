---
type: story
id: US-023
epic: E08
status: in-progress
priority: P0
estimate: M
---

# US-023 — Persistent product settings

> As an administrator, I want settings to persist and explain their scope so
> that appearance and service behavior remain consistent across devices.

## Acceptance criteria

- Settings distinguish user preferences from host-wide configuration.
- Invalid or unavailable values are rejected with field feedback.
- Secrets are write-only or safely represented and never returned in clear text.

## Tasks

- [x] **T-067** Define settings schema, defaults, ownership, migration, and secret representation.
- [x] **T-068** Implement settings API/repository and connect appearance preferences.
- [ ] **T-069** Complete General/Services screens with validation, permissions, and tests.

Theme, locale, avatar preset, event interval, dashboard payload and wallpaper ID
are user-scoped. Wallpaper uploads persist the image and metadata; external
provider selections persist attribution metadata and a licensed delivery
reference.
