---
type: story
id: US-018
epic: E06
status: backlog
priority: P1
estimate: L
---

# US-018 — Perform file operations

> As an administrator, I want common file operations with conflict handling so
> that I can maintain app data from the browser.

## Acceptance criteria

- Upload, download, create folder, rename, move, copy, and delete respect roots and limits.
- Conflicts require an explicit skip, replace, or rename choice.
- Transfers expose progress, cancellation, and bounded resource use.

## Tasks

- [ ] **T-052** Implement streamed transfer APIs, quotas/limits, cancellation, and safe temporary files.
- [ ] **T-053** Implement create/rename/move/copy/delete with conflict and audit semantics.
- [ ] **T-054** Build selection, transfer progress, conflict dialogs, and end-to-end tests.
