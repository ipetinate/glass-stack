# Community Reviews Architecture

## Overview

Community reviews are stored as **GitHub Discussions** on the [`ipetinate/glass-store`](https://github.com/ipetinate/glass-store) repository. Each application gets its own Discussion thread, and each review is a comment on that Discussion. Authentication is handled via OAuth 2.0 Device Flow for both GitHub and Google.

## How It Works

```
┌─────────────┐     Device Flow      ┌──────────────┐
│  Frontend   │◄────────────────────►│  GitHub /    │
│  (React)    │     userCode +       │  Google      │
│             │     verification     │  OAuth       │
└──────┬──────┘                      └──────────────┘
       │ POST /reviews (with token)
       ▼
┌──────────────┐   GraphQL API    ┌──────────────────┐
│  Backend     │─────────────────►│  GitHub GraphQL  │
│  (Go)        │                  │  api.github.com  │
│  reviews.go  │◄─────────────────│                  │
│  oauth.go    │   discussions +  └──────────────────┘
│  discussions │   comments
└──────────────┘
```

### Data Model

```
Discussion: "Reviews: home-assistant"     (one per app)
  ├── Comment 1: <!-- glass-review {...} -->\nMy review text
  ├── Comment 2: <!-- glass-review {...} -->\nAnother review
  └── Comment 3: ...
```

Each Discussion title follows the pattern `Reviews: {appID}`. Reviews are parsed from comment bodies using an HTML comment metadata block:

```markdown
<!-- glass-review {"rating":5,"author":"username","avatar":"url","provider":"github"} -->
Actual review text goes here.
```

## Backend Files

| File | Responsibility |
|------|---------------|
| `internal/store/discussions.go` | GraphQL client for GitHub Discussions API (create discussions, add comments, list by category) |
| `internal/store/reviews.go` | Review logic: `FetchReviews`, `CreateReview`, comment parsing, category resolution |
| `internal/store/oauth.go` | OAuth 2.0 Device Flow for GitHub and Google, session lifecycle management |
| `internal/store/service.go` | Orchestrator: calls `FetchReviews` during sync, `CreateReview` on user submit |
| `internal/http/handlers/store.go` | HTTP handlers: `CreateReview`, `ReviewSession`, `StartReviewLogin`, `CancelReviewLogin` |
| `internal/http/routes.go` | Route registration (all under `/api/v1/`, protected auth) |

## Authentication Flow

Both GitHub and Google use **OAuth 2.0 Device Flow** — no redirects, no browsers needed on the backend:

1. **Start**: `POST /store/reviews/session` with `{"provider": "github"|"google"}`
2. **Return**: `userCode` + `verificationURI` (user visits the URI and enters the code)
3. **Poll**: Backend polls the provider every N seconds until the user authorizes
4. **Complete**: Session status changes to `authenticated`, token + user info stored in memory
5. **Submit**: `POST /catalog/apps/{appID}/reviews` — backend uses the stored token to post the comment

Session states: `idle` → `pending` → `authenticated` | `expired` | `denied` | `failed`

## Token Resolution

When creating a review, the backend resolves which token to use:

1. **GitHub user token** (from Device Flow) → used directly to post the comment
2. **Google user token** → backend posts using the **server token** (`GLASS_GITHUB_TOKEN`) with Google user metadata embedded in the HTML comment
3. **Fallback** → server token only (no user identity)

The server token (`GLASS_GITHUB_TOKEN`) is a GitHub fine-grained PAT with `Discussions: Read and write` + `Metadata: Read-only` permissions, scoped to the `ipetinate/glass-store` repository.

## Required Environment Variables

```bash
# OAuth Client IDs (for Device Flow)
GLASS_GITHUB_CLIENT_ID=<github-app-client-id>
GLASS_GOOGLE_CLIENT_ID=<google-oauth-client-id>
GLASS_GOOGLE_CLIENT_SECRET=<google-oauth-client-secret>

# Server token (required for Google reviews and as fallback)
GLASS_GITHUB_TOKEN=github_pat_...
```

All loaded from `backend/.env` at startup.

## Category Resolution

`findOrCreateReviewCategory` resolves which Discussion category to use:

1. First tries `"announcements"` (slug or name)
2. Falls back to `"general"`
3. Falls back to first available category
4. Fails if no categories exist

## GraphQL Queries Used

| Operation | Purpose |
|-----------|---------|
| `getRepositoryID` | Get repository node ID (needed for `createDiscussion`) |
| `getDiscussionCategories` | List available categories |
| `findDiscussionByTitle` | Find existing discussion for an app |
| `createDiscussion` | Create new discussion thread for an app |
| `getDiscussionsByCategory` | Fetch all discussions + comments in a category |
| `addDiscussionComment` | Post a review comment |

All queries use the `graphqlRequest` helper which handles auth, marshaling, and error parsing.

## How to Make Common Changes

### Change the discussion category

Edit `discussionReviewCategory` in `reviews.go` and update the fallback chain in `findOrCreateReviewCategory`.

### Add a new auth provider

1. Add constants in `oauth.go` (`ProviderXxx = "xxx"`)
2. Implement `StartXxxDeviceFlow` and `pollXxxLogin` in `oauth.go`
3. Add the case in `StartReviewLogin` switch
4. Add token resolution case in `CreateReview`

### Change review storage (e.g. to a database)

1. Replace `FetchReviews` to read from DB instead of GraphQL
2. Replace `CreateReview` to write to DB instead of GraphQL
3. Keep `discussions.go` only if you still need GitHub as a source
4. Update `service.go` sync to write reviews to DB

### Restrict who can post reviews

Only the repo owner (or org admins) can control Discussion posting permissions via GitHub settings. The code itself does not filter — it relies on GitHub's Discussion permissions.

## Limitations

- **Pagination**: Currently fetches first 100 discussions and 100 comments per discussion. For repos with many reviews, cursor-based pagination would be needed.
- **No edit/delete**: Reviews are append-only from the backend's perspective.
- **In-memory sessions**: Review login sessions are stored in memory. Restarting the server loses active sessions.
- **Single category**: All reviews go to one Discussion category. No per-app or per-category isolation beyond the Discussion thread.
