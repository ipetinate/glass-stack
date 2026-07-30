---
type: product
status: proposed
updated: 2026-07-28
---

# Product Vision

## Problem

Homelab owners are forced to choose between friendly interfaces that hide too
much and powerful tools that require deep operational knowledge. Installing an
app, changing a port, or updating a container can have side effects that are
hard to preview, explain, or reverse.

## Vision

GlassStack gives people a calm, desktop-like control surface for their server
while keeping the underlying system legible. Simple flows should be genuinely
simple; advanced users should be able to inspect the Compose model, events,
logs, mounts, ports, and audit history behind those flows.

## Product promise

Every consequential operation should answer four questions:

1. What will change?
2. Why is it safe or unsafe?
3. What happened?
4. How can I recover?

## Principles

- **Progressive disclosure:** lead with safe defaults, retain an advanced path.
- **Plan before apply:** detect port, path, architecture, and permission
  conflicts before changing the host.
- **Visible state:** real data, timestamps, source, freshness, and degraded
  states replace decorative mocks.
- **Recoverability:** preserve configuration, support export, and make
  destructive choices explicit.
- **Local-first:** core server management must not depend on a cloud service.
- **Secure by default:** authentication, least privilege, safe filesystem
  roots, secret redaction, and auditable actions are product features.
- **One excellent node first:** prove the full loop before introducing fleet
  coordination.

## Primary users

### Home server beginner

Wants a dependable media, backup, or home-automation server without learning
Docker first. Needs safe defaults, clear language, and recovery guidance.

### Homelab enthusiast

Already understands Compose and networking. Wants speed, raw configuration,
logs, metrics, and freedom from artificial limitations.

### Household operator

Uses the services but does not maintain the host. Needs clear status and
low-risk actions without privileged details.

## North-star outcome

A new user can install GlassStack on a supported Linux host, sign in, inspect
real host health, install one catalog app, open it, update it, and understand
the complete operation history without using SSH.
