---
type: architecture
status: proposed
updated: 2026-07-29
---

# Quality Attributes

## Security

- No default credentials or anonymous privileged mode.
- Deny-by-default filesystem and host operations.
- Session revocation and idle/absolute expiry.
- Mandatory TOTP for administrators and one-use recovery codes.
- CSRF token, origin and public-auth rate-limit enforcement.
- Bootstrap and encryption keys stored as mode-0600 files, not ordinary logs.
- New passwords are checked against an embedded exact-hash blocklist and,
  when enabled, a padded k-anonymous HIBP range query.
- Secret redaction verified by tests.
- Dependency, image, and artifact supply-chain checks.

## Reliability

- Mutations are modeled as operations with terminal states.
- App install/update can recover from daemon or browser interruption.
- Reconciliation detects drift between app records and Docker.
- Event consumers can reconnect with a cursor or request a fresh snapshot.
- SQLite backup and restore are tested before automatic upgrade.
- Wallpaper bytes and metadata survive browser and daemon restarts.

## Performance

- Dashboard interactive on typical Raspberry Pi 4/5-class hardware.
- Initial frontend bundle is route-split.
- Metrics collection has bounded CPU/memory cost.
- Argon2 work is concurrency-bounded for small self-hosted servers.
- The embedded password blocklist is bounded to approximately 2 MB; no
  full-corpus updater or resident synchronization job runs on the host.
- Event queues and terminal sessions have explicit limits.
- Large directories, logs, and audit history are paginated/streamed.

## Accessibility

- Keyboard-complete navigation and visible focus.
- WCAG AA text contrast in supported theme/surface combinations.
- Reduced motion support.
- Status never relies on color alone.
- Compact/mobile layouts retain readable targets and content.

## Compatibility

- MVP target: Debian 12 and current Ubuntu LTS on amd64 and arm64.
- Docker Engine compatibility matrix is tested and documented.
- Unsupported sensors or filesystems degrade explicitly.
- Browser target policy is documented and enforced in CI.

## Operability

- Structured logs with request and operation correlation.
- Health and readiness are distinct.
- Diagnostic bundle excludes secrets.
- Upgrade and rollback guidance is available without the UI.
