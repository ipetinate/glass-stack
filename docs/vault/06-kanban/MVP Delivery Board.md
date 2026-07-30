---
kanban-plugin: board
type: kanban
status: active
updated: 2026-07-29
---

# MVP Delivery Board

## Ready

- [ ] **T-004** Define OpenAPI schemas and API conventions [[../05-backlog/Stories/US-002 Dependable API contract|US-002]] #P0 #E01
- [ ] **T-019** Implement capability-aware Linux metric collectors [[../05-backlog/Stories/US-007 Real host metrics|US-007]] #P0 #E03
- [ ] **T-073** Define the risk-based test strategy and fixtures [[../05-backlog/Stories/US-025 Risk-based automated tests|US-025]] #P0 #E09
- [ ] **T-076** Implement structured logging, redaction, and correlation [[../05-backlog/Stories/US-026 Operable and resilient daemon|US-026]] #P0 #E09

## In Progress

- [ ] **T-021** Replace prototype SSE with snapshot/reconnect/stale/unsupported behavior [[../05-backlog/Stories/US-007 Real host metrics|US-007]] #P0 #E03

## Review

_No task is currently ready for review._

## Backlog

- [ ] **T-001** Define supported-host prerequisites, paths, ownership, and ports [[../05-backlog/Stories/US-001 Install and operate GlassStack|US-001]] #P0 #E01
- [ ] **T-002** Implement installer and systemd service [[../05-backlog/Stories/US-001 Install and operate GlassStack|US-001]] #P0 #E01
- [ ] **T-003** Implement upgrade and uninstall with data choices [[../05-backlog/Stories/US-001 Install and operate GlassStack|US-001]] #P0 #E01
- [ ] **T-005** Add HTTP request ID, recovery, JSON, auth hook, and timeouts [[../05-backlog/Stories/US-002 Dependable API contract|US-002]] #P0 #E01
- [ ] **T-006** Add typed frontend API client and contract tests [[../05-backlog/Stories/US-002 Dependable API contract|US-002]] #P0 #E01
- [ ] **T-009** Implement control-plane backup/restore and migration recovery [[../05-backlog/Stories/US-003 Persistent control-plane state|US-003]] #P0 #E01
- [ ] **T-017** Add typed confirmations and destructive-action levels [[../05-backlog/Stories/US-006 Audited and safe operations|US-006]] #P0 #E02
- [ ] **T-018** Build audit and operation history UI [[../05-backlog/Stories/US-006 Audited and safe operations|US-006]] #P0 #E02
- [ ] **T-020** Build metrics service and bounded event publication [[../05-backlog/Stories/US-007 Real host metrics|US-007]] #P0 #E03
- [ ] **T-022** Implement host identity and capability inventory [[../05-backlog/Stories/US-008 System and storage inventory|US-008]] #P0 #E03
- [ ] **T-023** Implement Linux block and mount inventory [[../05-backlog/Stories/US-008 System and storage inventory|US-008]] #P0 #E03
- [ ] **T-024** Connect system/storage UI with Linux-native terminology [[../05-backlog/Stories/US-008 System and storage inventory|US-008]] #P0 #E03
- [ ] **T-025** Define least-privilege host-operation adapter [[../05-backlog/Stories/US-009 Safe host operations|US-009]] #P1 #E03
- [ ] **T-026** Implement audited reboot and shutdown operations [[../05-backlog/Stories/US-009 Safe host operations|US-009]] #P1 #E03
- [ ] **T-027** Build host-operation confirmation and disconnect UX [[../05-backlog/Stories/US-009 Safe host operations|US-009]] #P1 #E03
- [ ] **T-028** Define Docker adapter, compatibility policy, and normalized model [[../05-backlog/Stories/US-010 Container inventory and lifecycle|US-010]] #P0 #E04
- [ ] **T-029** Implement Docker inventory, logs, lifecycle, events, and reconciliation [[../05-backlog/Stories/US-010 Container inventory and lifecycle|US-010]] #P0 #E04
- [ ] **T-030** Build container list, detail, actions, and states [[../05-backlog/Stories/US-010 Container inventory and lifecycle|US-010]] #P0 #E04
- [ ] **T-031** Specify app manifest, catalog, compatibility, and trust policy [[../05-backlog/Stories/US-011 Catalog app plan and install|US-011]] #P0 #E04
- [ ] **T-032** Implement manifest validation and conflict-aware plan engine [[../05-backlog/Stories/US-011 Catalog app plan and install|US-011]] #P0 #E04
- [ ] **T-033** Implement install apply, detail, plan, and progress UI [[../05-backlog/Stories/US-011 Catalog app plan and install|US-011]] #P0 #E04
- [ ] **T-034** Persist desired app state and safe secret references [[../05-backlog/Stories/US-012 Configure update and remove apps|US-012]] #P0 #E04
- [ ] **T-035** Implement edit/update plan and recovery [[../05-backlog/Stories/US-012 Configure update and remove apps|US-012]] #P0 #E04
- [ ] **T-036** Implement app removal choices and integration tests [[../05-backlog/Stories/US-012 Configure update and remove apps|US-012]] #P0 #E04
- [ ] **T-037** Define supported Compose subset and security constraints [[../05-backlog/Stories/US-013 Import and inspect Compose|US-013]] #P1 #E04
- [ ] **T-038** Implement Compose import, plan, and effective export [[../05-backlog/Stories/US-013 Import and inspect Compose|US-013]] #P1 #E04
- [ ] **T-039** Build Compose import, warnings, inspection, and fixtures [[../05-backlog/Stories/US-013 Import and inspect Compose|US-013]] #P1 #E04
- [ ] **T-040** Add Glass API queries, event cache updates, and types [[../05-backlog/Stories/US-014 Real dashboard data|US-014]] #P0 #E05
- [ ] **T-041** Connect dashboard widgets to real host/container data [[../05-backlog/Stories/US-014 Real dashboard data|US-014]] #P0 #E05
- [ ] **T-042** Add widget states, tests, contrast, and credible labels [[../05-backlog/Stories/US-014 Real dashboard data|US-014]] #P0 #E05
- [ ] **T-043** Define widget registry, sizes, preferences, and migration [[../05-backlog/Stories/US-015 Customizable widgets and shortcuts|US-015]] #P1 #E05
- [ ] **T-044** Implement editable persisted dashboard layout [[../05-backlog/Stories/US-015 Customizable widgets and shortcuts|US-015]] #P1 #E05
- [ ] **T-045** Replace shortcut placeholder with real flows [[../05-backlog/Stories/US-015 Customizable widgets and shortcuts|US-015]] #P1 #E05
- [ ] **T-046** Define search providers, permissions, and keyboard model [[../05-backlog/Stories/US-016 Search alerts and operation center|US-016]] #P1 #E05
- [ ] **T-047** Define alerts and operation-center lifecycle [[../05-backlog/Stories/US-016 Search alerts and operation center|US-016]] #P1 #E05
- [ ] **T-048** Build search, alerts, operation progress, and a11y tests [[../05-backlog/Stories/US-016 Search alerts and operation center|US-016]] #P1 #E05
- [ ] **T-049** Define safe file roots, path IDs, symlink policy, and limits [[../05-backlog/Stories/US-017 Browse safe filesystem roots|US-017]] #P1 #E06
- [ ] **T-050** Implement bounded directory listing and metadata [[../05-backlog/Stories/US-017 Browse safe filesystem roots|US-017]] #P1 #E06
- [ ] **T-051** Build file breadcrumbs/list and failure states [[../05-backlog/Stories/US-017 Browse safe filesystem roots|US-017]] #P1 #E06
- [ ] **T-052** Implement streamed transfers, limits, and cancellation [[../05-backlog/Stories/US-018 Perform file operations|US-018]] #P1 #E06
- [ ] **T-053** Implement audited file mutations and conflicts [[../05-backlog/Stories/US-018 Perform file operations|US-018]] #P1 #E06
- [ ] **T-054** Build selection, transfer progress, conflict UX, and E2E tests [[../05-backlog/Stories/US-018 Perform file operations|US-018]] #P1 #E06
- [ ] **T-058** Define authenticated PTY/WebSocket protocol and shell policy [[../05-backlog/Stories/US-020 Interactive PTY session|US-020]] #P1 #E07
- [ ] **T-059** Implement PTY adapter, resize, exit, and cleanup [[../05-backlog/Stories/US-020 Interactive PTY session|US-020]] #P1 #E07
- [ ] **T-060** Integrate terminal emulator with connection states [[../05-backlog/Stories/US-020 Interactive PTY session|US-020]] #P1 #E07
- [ ] **T-061** Define terminal limits, reconnect, and disconnect policy [[../05-backlog/Stories/US-021 Safe terminal lifecycle|US-021]] #P1 #E07
- [ ] **T-062** Implement terminal session registry, backpressure, and expiry [[../05-backlog/Stories/US-021 Safe terminal lifecycle|US-021]] #P1 #E07
- [ ] **T-063** Add terminal lifecycle metrics, audit, and stress tests [[../05-backlog/Stories/US-021 Safe terminal lifecycle|US-021]] #P1 #E07
- [ ] **T-064** Design compact navigation and responsive widget rules [[../05-backlog/Stories/US-022 Responsive accessible and localized shell|US-022]] #P1 #E08
- [ ] **T-065** Implement responsive shell and accessibility fixes [[../05-backlog/Stories/US-022 Responsive accessible and localized shell|US-022]] #P1 #E08
- [ ] **T-066** Add localization boundary and automated viewport/a11y checks [[../05-backlog/Stories/US-022 Responsive accessible and localized shell|US-022]] #P1 #E08
- [ ] **T-069** Complete General and Services settings screens [[../05-backlog/Stories/US-023 Persistent product settings|US-023]] #P1 #E08
- [ ] **T-087** Complete authorization matrix tests as privileged modules land [[../05-backlog/Stories/US-029 Multi-user roles|US-029]] #P0 #E02
- [ ] **T-070** Add canonical Figma design links and complete file audit [[../05-backlog/Stories/US-024 Design system alignment|US-024]] #P1 #E08
- [ ] **T-071** Define semantic tokens and contrast matrix [[../05-backlog/Stories/US-024 Design system alignment|US-024]] #P1 #E08
- [ ] **T-072** Reconcile Figma/code components and workflow [[../05-backlog/Stories/US-024 Design system alignment|US-024]] #P1 #E08
- [ ] **T-074** Add backend race, integration, migration, Docker, and security tests [[../05-backlog/Stories/US-025 Risk-based automated tests|US-025]] #P0 #E09
- [ ] **T-075** Add API contract and browser E2E suites to CI [[../05-backlog/Stories/US-025 Risk-based automated tests|US-025]] #P0 #E09
- [ ] **T-077** Add probes, graceful shutdown, limits, and worker supervision [[../05-backlog/Stories/US-026 Operable and resilient daemon|US-026]] #P0 #E09
- [ ] **T-078** Add redacted diagnostics and failure runbooks [[../05-backlog/Stories/US-026 Operable and resilient daemon|US-026]] #P0 #E09
- [ ] **T-079** Define version, compatibility, artifact, and release policy [[../05-backlog/Stories/US-027 Secure multi-architecture release|US-027]] #P0 #E09
- [ ] **T-080** Build signed multi-arch artifacts, provenance, and SBOM [[../05-backlog/Stories/US-027 Secure multi-architecture release|US-027]] #P0 #E09
- [ ] **T-081** Add installer, upgrade, rollback smoke tests and checklist [[../05-backlog/Stories/US-027 Secure multi-architecture release|US-027]] #P0 #E09

## Icebox

- [ ] **T-055** Implement bounded text file read/write and concurrency checks [[../05-backlog/Stories/US-019 Edit and inspect files|US-019]] #P2 #E06
- [ ] **T-056** Add safe syntax detection and JSON/YAML validators [[../05-backlog/Stories/US-019 Edit and inspect files|US-019]] #P2 #E06
- [ ] **T-057** Build text editor, diff/conflict, dirty, and save states [[../05-backlog/Stories/US-019 Edit and inspect files|US-019]] #P2 #E06
- [ ] **T-082** Define app-data backup consistency and retention [[../05-backlog/Stories/US-028 Application data backup and restore|US-028]] #P2 #E10
- [ ] **T-083** Implement backup/restore operations and integrity checks [[../05-backlog/Stories/US-028 Application data backup and restore|US-028]] #P2 #E10
- [ ] **T-084** Build backup history, restore preview, and recovery tests [[../05-backlog/Stories/US-028 Application data backup and restore|US-028]] #P2 #E10
- [ ] **T-088** Threat-model node trust and agent protocol [[../05-backlog/Stories/US-030 Trusted node enrollment and fleet view|US-030]] #P2 #E10
- [ ] **T-089** Implement secure enrollment, heartbeat, revocation, and offline behavior [[../05-backlog/Stories/US-030 Trusted node enrollment and fleet view|US-030]] #P2 #E10
- [ ] **T-090** Build fleet view and multi-node operation tests [[../05-backlog/Stories/US-030 Trusted node enrollment and fleet view|US-030]] #P2 #E10

## Done

- [x] Baseline — React feature-module and shared-component structure
- [x] Baseline — Desktop shell with sidebar, status bar, search surface, and route transitions
- [x] Baseline — Reusable Window, Tabs, chart, appearance, theme, and wallpaper foundations
- [x] Baseline — Frontend unit suite (167 tests), build, lint, and CI
- [x] Baseline — Go server boot and health endpoint
- [x] Baseline — Prototype SSE temperature stream (simulated; replacement tracked by T-019–T-021)
- [x] **T-007** Validated configuration and dependency composition [[../05-backlog/Stories/US-003 Persistent control-plane state|US-003]] #P0 #E01
- [x] **T-008** SQLite migrations and transactional repositories [[../05-backlog/Stories/US-003 Persistent control-plane state|US-003]] #P0 #E01
- [x] **T-010** Threat-modeled local one-time first-run bootstrap [[../05-backlog/Stories/US-004 First-run administrator|US-004]] #P0 #E02
- [x] **T-011** Persistent first admin and memory-hard password hashing [[../05-backlog/Stories/US-004 First-run administrator|US-004]] #P0 #E02
- [x] **T-012** First-run onboarding and setup-lock integration test [[../05-backlog/Stories/US-004 First-run administrator|US-004]] #P0 #E02
- [x] **T-013** Session expiry, logout and revocation [[../05-backlog/Stories/US-005 Secure browser sessions|US-005]] #P0 #E02
- [x] **T-014** CSRF, origin, rate-limit and cookie policy [[../05-backlog/Stories/US-005 Secure browser sessions|US-005]] #P0 #E02
- [x] **T-015** Frontend auth bootstrap, login and protected routes [[../05-backlog/Stories/US-005 Secure browser sessions|US-005]] #P0 #E02
- [x] **T-016** Redacted identity audit schema and records [[../05-backlog/Stories/US-006 Audited and safe operations|US-006]] #P0 #E02
- [x] **T-067** Versioned per-user settings schema and ownership [[../05-backlog/Stories/US-023 Persistent product settings|US-023]] #P0 #E08
- [x] **T-068** Settings persistence, wallpaper image/metadata and appearance sync [[../05-backlog/Stories/US-023 Persistent product settings|US-023]] #P0 #E08
- [x] **T-085** Role/resource threat model and deny-by-default identity policy [[../05-backlog/Stories/US-029 Multi-user roles|US-029]] #P0 #E02
- [x] **T-086** Closed invitations, users, roles and session integration [[../05-backlog/Stories/US-029 Multi-user roles|US-029]] #P0 #E02

%% kanban:settings
```
{"kanban-plugin":"board","list-collapse":[false,false,false,false,true,true]}
```
%%
