---
type: story
id: US-027
epic: E09
status: backlog
priority: P0
estimate: L
---

# US-027 — Secure multi-architecture release

> As a server owner, I want verifiable amd64/arm64 releases and safe upgrades so
> that installation does not depend on an unreviewed development environment.

## Acceptance criteria

- Reproducible versioned artifacts exist for supported architectures.
- Checksums, signatures, provenance, licenses, and SBOM accompany releases.
- Fresh install, upgrade, failed upgrade, rollback, and uninstall are smoke-tested.

## Tasks

- [ ] **T-079** Define versioning, compatibility, artifact, frontend-embedding, and release policy.
- [ ] **T-080** Build multi-arch artifacts/packages with checksums, signatures, provenance, and SBOM.
- [ ] **T-081** Add disposable-host installer/upgrade/rollback smoke tests and release checklist.
