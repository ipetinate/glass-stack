# Application Store Architecture

## Overview

GlassStack has a built-in application store that syncs a catalog of Docker-based apps from a GitHub repository (`ipetinate/glass-store`). The backend fetches the catalog, parses app manifests, downloads assets, and serves a paginated API. The frontend renders a virtualized grid with search, filtering, and a slide-in detail view. Community reviews are stored as GitHub Discussions (see `reviews-architecture.md`).

## High-Level Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│  GitHub: ipetinate/glass-store                                   │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │  apps/                                                     │  │
│  │  ├── home-assistant/                                       │  │
│  │  │   ├── docker-compose.yaml   ← manifest (x-glass block) │  │
│  │  │   └── assets/               ← icon, screenshots        │  │
│  │  ├── jellyfin/                                              │  │
│  │  └── ...                                                    │  │
│  └────────────────────────────────────────────────────────────┘  │
└───────────────────────────┬──────────────────────────────────────┘
                            │ tar.gz + GraphQL
                            ▼
┌──────────────────────────────────────────────────────────────────┐
│  Backend (Go)                                                    │
│                                                                  │
│  SourceClient ──► LatestCommit (ETag cache)                      │
│               ──► DownloadTarball → ExtractApps → ParseManifest  │
│               ──► FetchReviews (GraphQL Discussions)             │
│                                                                  │
│  Service ──► Sync → CatalogRecord[] → SQLite (store_apps)       │
│          ──► CatalogFiltered (search, category, sort, paginate)  │
│          ──► Application (single app detail + reviews)           │
│          ──► CreateReview (post to Discussion)                   │
│          ──► ReviewSession / StartReviewLogin / CancelReview     │
│          ──► Asset (serve downloaded images)                     │
│                                                                  │
│  store_apps (SQLite)                                             │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │ id │ summary_json │ detail_json │ version │ content_hash   │  │
│  │    │              │             │         │ synced_at      │  │
│  └────────────────────────────────────────────────────────────┘  │
└───────────────────────────┬──────────────────────────────────────┘
                            │ REST API (/api/v1/*)
                            ▼
┌──────────────────────────────────────────────────────────────────┐
│  Frontend (React + TanStack Query + React Virtual)               │
│                                                                  │
│  ApplicationsStore (page orchestrator)                           │
│  ├── FeaturedApplications (top-2 hero carousel)                  │
│  ├── VirtualizedApplicationGrid (2-col, infinite scroll)         │
│  │   └── ApplicationCard                                        │
│  ├── ApplicationDetail (slide-in panel)                          │
│  │   ├── ScreenshotCarousel                                     │
│  │   └── ApplicationInfoColumns (reviews, specs, requirements)  │
│  └── CustomInstallForm (port/volume modal)                       │
└──────────────────────────────────────────────────────────────────┘
```

## Sync Flow

The catalog sync runs on a configurable interval (default 6h) and can be triggered manually via `POST /store/sync`.

```
1. Read last known commit SHA from DB
2. GET /repos/{repo}/commits/{branch} with ETag header
   → If 304 Not Modified, skip sync
3. Download tar.gz of the repo
4. Extract apps/ directory to a temp folder
5. For each docker-compose.yaml found:
   a. Parse the manifest (x-glass or x-casaos block)
   b. Compute content hash (SHA-256)
   c. Resolve assets (local from tarball or remote URLs)
   d. Fetch community reviews from GitHub Discussions
   e. Upsert into store_apps table
6. Delete apps from DB that no longer exist in the repo
7. Save new commit SHA + timestamp
```

## Install Flow

Installs run through an asynchronous pipeline powered by the `internal/apps` package. `POST /api/v1/apps/install` validates the request, creates a `queued` operation row in `app_operations`, and returns `202` immediately; the pipeline continues in a goroutine backed by the same operation row, so the frontend polls `GET /api/v1/apps/install/{operationId}` (~1s) for progress.

```
1. Plan: Service.Manifest (compose_yaml from store_apps) → planner renders
   the final docker-compose.yaml (applies --port override and named volume)
2. Write project: render + compose_hash (SHA-256) to <dataDir>/apps/<appId>/
3. Apply:  docker compose --project-directory ... up -d --remove-orphans --pull missing
4. Health: docker compose ps --format json polled until all services
   State=running and Health in (""|healthy) or the grace period elapses
5. Settle: operation → succeeded, instance → installed, event published
```

Progress steps: `20` validating → `60` applying compose → `90` waiting for health → `100` done. Any failure leaves the operation `failed` and the instance `error` with the last message. Operation `status` is projected to UI vocabulary: `queued|running → installing`, `succeeded → installed`, `failed → error`.

`mode: "standard"` (default) installs the manifest as-is; `mode: "custom"` applies the submitted port/volume options, rejecting combos the manifest can't support (`portMap` missing or no top-level `volumes`).

## Manifest Format

Apps are defined as Docker Compose files with an `x-glass` (or legacy `x-casaos`) metadata block:

```yaml
name: my-app
services:
  main:
    image: org/app:1.2.3@sha256:abc...   # must be pinned

x-glass:
  title: "My App"
  tagline: "Short description"
  description: "Longer description"
  developer: "Author Name"
  version: "1.2.3"
  category: "home"              # multimedia|productivity|networking|home|security|devops|other
  icon: assets/icon.png
  screenshots:
    - assets/screenshot-1.png
  architectures:
    - amd64
    - arm64
  entrypoint:
    main: main                  # must match a service key
    index: /
    portMap: "8080"
    scheme: http
  requirements:
    memory:
      minimum: "2GB"
      recommended: "4GB+"
    storage:
      minimum: "50GB"
      recommended: "100GB+"
    processor:
      minimum: "Dual Core 64 bits"
      recommended: "Quad Core ARM"
```

Required fields: `title`, `description`, `developer`, `version`, `category`, `icon`, `entrypoint.main`, and a pinned Docker image tag.

## Backend Files

| File | Responsibility |
|------|---------------|
| `internal/store/sync.go` | `SourceClient` — HTTP client for GitHub API (commits, tarball download, tar extraction) |
| `internal/store/manifest.go` | `ParseManifest` — YAML parser for docker-compose with `x-glass`/`x-casaos` metadata |
| `internal/store/service.go` | `Service` — orchestrator: sync, catalog queries, asset resolution, review integration |
| `internal/store/dto.go` | Data transfer objects: `ApplicationSummaryDTO`, `ApplicationDetailDTO`, `ReviewDTO`, `PaginatedCatalog` |
| `internal/store/oauth.go` | OAuth Device Flow for GitHub and Google, session lifecycle |
| `internal/store/reviews.go` | Review logic: fetch/create via GitHub Discussions GraphQL |
| `internal/store/discussions.go` | GraphQL client for GitHub Discussions API |
| `internal/http/handlers/store.go` | HTTP handlers for all store endpoints |
| `internal/http/handlers/apps.go` | HTTP handlers for app install + operation status |
| `internal/http/routes.go` | Route registration under `/api/v1/` |
| `internal/apps/install.go` | `Installer` — async install pipeline (plan → write project → `docker compose apply` → health wait) |
| `internal/apps/planner.go` | Manifest → rendered `docker-compose.yaml` (port/volume options) |
| `internal/apps/compose_runner.go` | `docker compose` CLI adapter (`up -d`, `ps --format json`) |
| `internal/apps/operations.go` | Install operation state machine (`queued → running → succeeded/failed`) |
| `internal/apps/store.go` | `Store` interface for instances/operations |
| `internal/platform/database/apps_store.go` | SQLite persistence for `app_operations` / `app_instances` |
| `internal/platform/database/catalog_store.go` | SQLite persistence for `store_apps` table |
| `internal/platform/database/migrations/002_store.sql` | DB schema for `store_apps` |
| `internal/platform/database/migrations/003_apps.sql` | DB schema for `compose_yaml`, `app_operations`, `app_instances` |

## API Endpoints

All endpoints require authentication (session cookie).

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `GET` | `/api/v1/catalog/apps` | Paginated catalog (query: `q`, `category`, `sort`, `offset`, `limit`) |
| `GET` | `/api/v1/catalog/apps/{appID}` | Full app detail with reviews |
| `POST` | `/api/v1/catalog/apps/{appID}/reviews` | Submit a review (rating 1-5 + comment) |
| `GET` | `/api/v1/store/reviews/session` | Poll review auth session status |
| `POST` | `/api/v1/store/reviews/session` | Start GitHub/Google device-flow login |
| `DELETE` | `/api/v1/store/reviews/session` | Cancel active review login |
| `POST` | `/api/v1/store/sync` | Force catalog sync |
| `GET` | `/api/v1/store/apps/{appID}/assets/{file}` | Serve app assets (icon, screenshots) |
| `POST` | `/api/v1/apps/install` | Queue an install (body: `{ appId, mode: "standard"\|"custom", options: { port?, volume? } }`) → `202` with `InstallOperation` |
| `GET` | `/api/v1/apps/install/{operationId}` | Poll install progress → `InstallOperation` (`installing`/`installed`/`error`, `progress` 0–100) |

### Catalog Response

```json
{
  "data": [
    {
      "id": "home-assistant",
      "name": "Home Assistant",
      "developer": "Home Assistant",
      "description": "...",
      "category": "Home",
      "tags": ["automation", "iot"],
      "iconSrc": "/api/v1/store/apps/home-assistant/assets/icon.png",
      "screenshots": [...],
      "rating": 4.8,
      "status": "available"
    }
  ],
  "total": 12
}
```

## Frontend Module

Located at `frontend/src/modules/applications-store/`.

### File Structure

```
applications-store/
├── types.ts                    — Domain types (ApplicationSummary, ApplicationDetail, ReviewSession, etc.)
├── constants.ts                — Category labels, sort options, tag colors
├── api/applications.ts         — HTTP layer (9 functions via glassRequest)
├── repositories/useApplications.ts — TanStack Query hooks (queries + mutations)
├── components/
│   ├── ApplicationCard.tsx             — Grid card (icon, name, rating, install button)
│   ├── ApplicationGrid.tsx             — Non-virtualized fallback grid
│   ├── VirtualizedApplicationGrid.tsx   — 2-column virtualized grid with infinite scroll
│   ├── FeaturedApplications.tsx         — Hero carousel (top 2 apps, drag/swipe)
│   ├── ApplicationFilters.tsx           — Category + sort dropdowns
│   ├── ApplicationDetail.tsx            — Slide-in detail panel
│   ├── ScreenshotCarousel.tsx           — Horizontal screenshot scroll + lightbox
│   ├── ApplicationInfoColumns.tsx       — 3-column layout (reviews, specs, requirements)
│   ├── CustomInstallForm.tsx            — Port/volume configuration modal
│   └── StoreSkeleton.tsx                — Loading skeleton
├── pages/ApplicationsStore/
│   ├── ApplicationsStore.tsx            — Page orchestrator (all state lives here)
│   └── ApplicationsStore.test.tsx       — 4 integration tests
└── routes.tsx                           — Route definition
```

### Data Flow

```
ApplicationsStore (page)
  │
  ├── useInfiniteApplications({ q, category, sort })
  │     └── GET /api/v1/catalog/apps?q=...&category=...&sort=...&offset=0&limit=20
  │
  ├── useApplication(selectedId)
  │     └── GET /api/v1/catalog/apps/{appId}
  │
  ├── useReviewSession()
  │     └── GET /api/v1/store/reviews/session  (polls every 4s when pending)
  │
  ├── useStartReviewLogin()
  │     └── POST /api/v1/store/reviews/session
  │
  ├── useCreateReview(appId)
  │     └── POST /api/v1/catalog/apps/{appId}/reviews
  │
  └── useInstallApplication()
        └── POST /api/v1/apps/install
```

### Key Patterns

- **State lives in the page**: `ApplicationsStore.tsx` owns all state (search, filters, selected app, install tracking, slide animations). Components are controlled/presentational.
- **React Query for server state**: All remote data flows through TanStack Query. Shared query keys enable blanket invalidation on mutations.
- **Virtualized rendering**: `@tanstack/react-virtual` with 2-column lanes, `measureElement` for dynamic heights, and `IntersectionObserver` sentinel for infinite scroll. Falls back to plain CSS grid when virtualization can't initialize.
- **Slide-in detail**: List and detail views coexist in a sliding panel layout controlled by CSS `translateX` transforms. The detail view slides in from the right when an app is selected.
- **Polling**: Installation progress polls every 1s, review auth session polls every 4s. Both stop when the operation completes.
- **Debounced search**: Input is debounced (300ms) before triggering a query.

### Infinite Scroll

```
Page 1 (offset=0, limit=20)  →  Page 2 (offset=20, limit=20)  →  ...
       ↓                              ↓
  useInfiniteQuery              getNextPageParam checks
  flattenPages()                loaded >= total → returns undefined
       ↓
  VirtualizedApplicationGrid
  └── IntersectionObserver sentinel at bottom
      → triggers fetchNextPage() when visible
```

## Required Environment Variables

```bash
# GitHub source repository
GLASS_REPOSITORY=ipetinate/glass-store       # (default if not set)
GLASS_BRANCH=main                            # (default if not set)

# OAuth (for reviews)
GLASS_GITHUB_CLIENT_ID=<github-app-client-id>
GLASS_GOOGLE_CLIENT_ID=<google-oauth-client-id>
GLASS_GOOGLE_CLIENT_SECRET=<google-oauth-client-secret>

# Server token (for Google reviews + Discussions API)
GLASS_GITHUB_TOKEN=github_pat_...

# Unsplash (for wallpapers, unrelated to store)
GLASS_UNSPLASH_ACCESS_KEY=<key>
```

## How to Make Common Changes

### Add a new app to the store

1. Create a directory under `apps/` in the `glass-store` repo
2. Add a `docker-compose.yaml` with the `x-glass` metadata block
3. Add `icon.png` and screenshots in an `assets/` subdirectory
4. Commit to `main` — the next sync will pick it up

### Add a new category

1. Add the category to `validCategory()` in `manifest.go`
2. Add the display label in `displayCategories` map in `dto.go`
3. Add the frontend label in `categoryLabels` in `constants.ts`
4. Add the color in `categoryTagColors` in `constants.ts`
5. Add the filter option in `applicationCategories` in `constants.ts`

### Change the sync interval

Edit `PollIntervalHours` in the `Config` struct or pass it via initialization. Default is 6 hours.

### Add a new sort option

1. Add the case in `CatalogFiltered` in `service.go`
2. Add the option in `applicationSortOptions` in `constants.ts`

### Modify the catalog response shape

1. Update the DTO in `dto.go`
2. Update the `Summary()` or `Detail()` method on `App`
3. Update the frontend type in `types.ts`
4. Update `ApplicationCard.tsx` and/or `ApplicationInfoColumns.tsx` as needed

### Change the virtualization behavior

Edit `VirtualizedApplicationGrid.tsx`. Key constants: `LANES=2`, `ROW_HEIGHT=200`, `GAP=16`, `PAGE_SIZE=20`. The grid uses `measureElement` for dynamic height measurement.

## Limitations

- **In-memory review sessions**: Server restarts lose active OAuth sessions.
- **Single catalog source**: Only one GitHub repository can be the source. No multi-source support.
- **No incremental sync**: The full tarball is downloaded on every change. Only the ETag on the commit endpoint avoids re-downloading when nothing changed.
- **No auth on asset serving**: Asset endpoints (`/store/apps/{appID}/assets/{file}`) are behind auth but use `filepath.Base` for safety. No CDN or caching headers.
- **Flat pagination**: Catalog filtering and sorting happen in memory after loading all records from SQLite. Fine for small catalogs, would need SQL-level filtering at scale.
- **No real-time updates**: The frontend relies on polling or manual sync triggers. No WebSocket or SSE for live catalog changes.
