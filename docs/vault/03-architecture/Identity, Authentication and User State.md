---
type: architecture
status: accepted
updated: 2026-07-29
---

# Identity, Authentication and User State

## Scope

GlassStack has a persistent control plane for identities, browser sessions,
per-user preferences, dashboard wallpaper assets, invitations, MFA recovery
and security audit records. Runtime host metrics and Docker state do not belong
in this database.

## Runtime ownership

```text
React auth/settings modules
        │ credentials: include + X-CSRF-Token
        ▼
HTTP handlers in internal/http/handlers
        │ protocol mapping only
        ▼
auth / settings domain services
        │ consumer-owned Store interfaces
        ▼
platform/database SQLite repositories
        │
        ├─ glass-stack.db
        ├─ secrets/master.key
        ├─ secrets/bootstrap-token
        ├─ media/<sha256>.<extension>
        └─ backups/
```

## First-run setup

1. When no user exists, `glassd` creates a random 256-bit bootstrap token.
2. Only its mode-0600 file path is logged. The token itself is not written to
   ordinary logs.
3. The owner supplies the token in `/onboarding`, creates the first admin,
   chooses locale/theme and enrolls TOTP.
4. Setup atomically creates the user, encrypted TOTP secret, one-use recovery
   codes and initial preferences, then consumes the bootstrap token.
5. A second setup attempt is rejected. The stale token file is removed on the
   next daemon start.

## Authentication contract

- Usernames are normalized to lowercase ASCII and constrained to 3–32
  characters.
- Passwords are NFC-normalized, 15–128 characters, checked against an embedded
  100,000-entry exact-hash blocklist and hashed with Argon2id
  (`19 MiB`, `t=2`, `p=1`).
- Hybrid mode also queries HIBP Pwned Passwords through a padded k-anonymous
  SHA-1 prefix request. The password and complete digest never leave the
  daemon.
- A local or remote match is rejected. If HIBP is unavailable, the local
  blocklist remains mandatory and the successful mutation is audited as
  `local_only`.
- Expensive password work is process-bounded to protect small servers.
- Unknown and known accounts both perform password verification work.
- Administrators require RFC 6238 TOTP or a one-use recovery code.
- Session tokens and CSRF tokens are random and stored only as hashes.
- Sessions have a 12-hour idle timeout and 7-day absolute timeout.
- Password and role changes revoke affected sessions.
- Browser mutation requests require authentication, a matching CSRF token and
  an allowed/same origin.
- Public authentication endpoints are rate-limited.
- Session cookies are HttpOnly, SameSite=Lax and Secure under TLS or a trusted
  loopback reverse proxy.

## Roles and invitations

Accounts are created through one-use, 24-hour invitations. Roles are:

| Role | Current identity behavior |
|---|---|
| `admin` | Manages invitations/users and must enroll TOTP |
| `operator` | Authenticated product access; no identity administration |
| `viewer` | Authenticated product access; no identity administration |

Authorization remains deny-by-default as privileged product modules are
implemented. A role cannot be changed only in the frontend; the service checks
the actor. The final active administrator cannot be demoted.

## Persistent preferences

Each user owns one versioned preference document with optimistic revision
checks. It currently contains:

- locale, theme and avatar preset;
- selected wallpaper ID;
- window surface behavior and visible actions;
- dashboard event sampling interval;
- versioned dashboard layout/preset payload.

TanStack Query owns the server copy. Zustand applies local UI state, and
`PreferencesSync` updates the server after a short debounce. Revision conflicts
cause a refetch instead of a silent overwrite.

## Wallpaper files and metadata

A wallpaper record and its media asset are separate:

- `wallpapers` stores source/provider identity, title, description, author and
  attribution URLs, source/download locations, license references and provider
  metadata such as dimensions, color and blur hash;
- `media_assets` stores the mode-0600 file path, detected MIME type, byte size,
  decoded width/height and SHA-256;
- identical bytes are deduplicated by SHA-256 while each selection keeps its
  own wallpaper metadata record;
- uploads are limited to 20 MiB, raster images only and at most 16384×16384;
- media access is authenticated and scoped through a wallpaper owned by the
  current user.

Local uploads persist both bytes and metadata. Unsplash selections persist the
canonical optimized photo URL and attribution metadata and trigger the
provider download endpoint. Byte self-hosting is disabled by default because
Unsplash API integrations require hotlinking; it is available only through
`GLASS_UNSPLASH_SELF_HOST=true` after the deployer confirms compatible rights.

## SQLite profile and recovery

- WAL journal, foreign keys, full synchronous writes, five-second busy timeout
  and bounded connection/cache settings.
- Ordered embedded migrations and serialized write transactions.
- `/api/ready` runs `PRAGMA quick_check`.
- Backups use SQLite `VACUUM INTO`, mode 0600 and are opened/quick-checked in
  integration tests.
- The master key is outside SQLite so copying only the database is not a
  complete credential backup.

## API surface

Public:

- `GET /api/v1/setup/status`
- `POST /api/v1/setup/totp`
- `POST /api/v1/setup/complete`
- `POST /api/v1/auth/login`
- `POST /api/v1/auth/totp`
- `POST /api/v1/auth/password/check`
- `GET /api/v1/auth/session`
- `GET /api/v1/invitations/status`
- `POST /api/v1/invitations/totp`
- `POST /api/v1/invitations/accept`

Authenticated:

- `POST /api/v1/auth/logout`
- `PUT /api/v1/auth/password`
- `GET|PATCH /api/v1/users/me/preferences`
- wallpaper search, selection, upload, detail and private media routes.

Administrator:

- `POST /api/v1/invitations`
- `GET /api/v1/users`
- `PATCH /api/v1/users/{userID}/role`

## Operational configuration

| Variable | Purpose |
|---|---|
| `GLASS_DATA_DIR` | Database, secrets, media and backups root |
| `GLASS_ADDRESS` | Loopback address by default |
| `GLASS_PUBLIC_URL` | Browser-facing base URL used in setup guidance |
| `GLASS_ALLOWED_ORIGINS` | Comma-separated browser origins |
| `GLASS_PASSWORD_COMPROMISE_MODE` | `hybrid` (default) or offline-only `local` password checks |
| `GLASS_UNSPLASH_ACCESS_KEY` | Server-side provider credential |
| `GLASS_UNSPLASH_SELF_HOST` | Explicit opt-in to persist provider bytes |

The frontend never receives the Unsplash access key or master encryption key.
