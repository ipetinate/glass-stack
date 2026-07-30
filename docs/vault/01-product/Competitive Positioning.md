---
type: product
status: proposed
updated: 2026-07-28
---

# Competitive Positioning

## Baseline set by CasaOS

CasaOS establishes the expected baseline for a personal-server UI: friendly
home-oriented design, broad hardware support, one-click apps, Docker import,
file management, system/app widgets, and a simple installer. GlassStack must
meet the core operational loop before visual differentiation can matter.

## GlassStack wedge

**Friendly control without hidden consequences.**

GlassStack should differentiate through:

- Install and update previews before host mutation.
- First-class Compose inspection, export, and eventually version history.
- A timeline that connects user action, Docker event, result, and recovery hint.
- Explicit state freshness and degraded/partial states in the dashboard.
- Safe beginner defaults with an advanced view built from the same domain
  model, not a separate expert product.
- A coherent desktop metaphor where windows, search, notifications, and app
  shortcuts serve real workflows rather than decoration.

## Parity before differentiation

| Capability | CasaOS baseline | GlassStack MVP target |
|---|---|---|
| Host dashboard | System and app widgets | Real metrics with freshness and errors |
| App store | Curated and custom Docker apps | Trusted catalog plus validated plan/apply |
| App lifecycle | Install, update, start, stop, remove | Same, with audit and recovery context |
| File manager | Visual file operations | Root-scoped file operations with clear safety |
| Terminal | Browser shell access | Authenticated, bounded PTY with audit metadata |
| Installation | One-line Linux install | Reproducible packages/script with upgrade tests |
| Hardware | Common x86/ARM boards | amd64 and arm64 first; armv7 after evidence |
| Transparency | Mostly simplified UX | Core product differentiator |

## Product risks

- A beautiful shell can mask the absence of real control-plane behavior.
- A privileged host daemon makes security failures high impact.
- Supporting many distros too early multiplies installation and filesystem edge
  cases.
- A catalog without a stable manifest and compatibility policy creates
  long-term migration debt.
- “Transparent” can become overwhelming unless advanced details are layered.

## Sources

- CasaOS official repository and README:
  https://github.com/IceWhaleTech/CasaOS
- CasaOS app model:
  https://wiki.casaos.io/en/apps
- CasaOS official development test matrix:
  https://wiki.casaos.io/en/contribute/development
