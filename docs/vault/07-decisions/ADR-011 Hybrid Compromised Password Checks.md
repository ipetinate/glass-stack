---
type: decision
status: accepted
updated: 2026-07-29
---

# ADR-011 — Hybrid Compromised Password Checks

## Context

GlassStack must reject commonly used or compromised passwords while remaining
usable on small self-hosted servers and during upstream outages. A complete
offline Pwned Passwords corpus requires tens of gigabytes and an expensive
update pipeline, while a remote-only check would make account creation depend
on internet availability.

## Decision

Use a hybrid policy owned by the `auth` domain:

- embed 100,000 exact SHA-1 digests generated from a pinned SecLists release;
- query the free HIBP Pwned Passwords range API using only the first five
  SHA-1 characters and padded responses;
- reject any local or remote match;
- when HIBP is unavailable, enforce the local list and permit the operation
  with an explicit `local_only` audit marker;
- never log passwords, complete hashes, queried prefixes or range responses;
- update the embedded list with GlassStack releases instead of running a
  resident downloader.

`GLASS_PASSWORD_COMPROMISE_MODE=local` disables remote queries for deployments
that prohibit outbound traffic. Local checking cannot be disabled.

## Consequences

The always-available check adds approximately 2 MB to the daemon and performs
exact, low-cost binary searches without false positives. Hybrid mode provides
current coverage without sending a password or complete hash to HIBP.
Upstream failure is visible but does not lock administrators out of onboarding
or password recovery workflows. The embedded source and generated artifact
must retain pinned checksums and third-party license notices.

