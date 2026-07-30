---
type: design
status: partial
updated: 2026-07-28
---

# UX and Visual Direction

## Evidence reviewed

- The running dashboard at 1440 × 960.
- The running settings screen at 1440 × 960.
- The dashboard at 390 × 844.
- Current React components, routes, styling, and tests.
- README link to the Glass Stack Figma team.

The README currently links to a team files page, not a specific Figma design
file. The connected Figma account can see the team but exposes no file-listing
operation, and no signed-in browser session was available. A `/design/<key>/...`
link is still required for a true page/frame/component audit.

## Direction already visible

- Desktop-like shell with a persistent sidebar, status surface, search, widgets,
  and application windows.
- Glass and blur surfaces over a user-selected wallpaper.
- Lightweight line icons and generous radii.
- Settings as a window with tabs and live appearance controls.
- Dashboard organized around storage, applications, temperatures, shortcuts,
  and throughput.

This is a distinctive foundation and fits the “transparent” brand when paired
with real state and inspectable details.

## What works

- Strong product personality; it does not resemble a generic admin template.
- Clear spatial hierarchy at desktop sizes.
- Reusable `ui`, `foundation`, and `structure` layers already support
  consistent shell evolution.
- Settings previews explain appearance choices better than plain selects.
- Window maximize, vertical expand, close, reduced-motion handling, and unsaved
  change hooks show good interaction discipline.

## Visible problems

- The mobile layout is functionally broken: the fixed 162 px sidebar and
  desktop grid compress content into narrow columns.
- Several dashboard labels use light text over light translucent surfaces,
  creating severe contrast problems.
- Weather copy truncates in the status bar at 1440 px.
- Dashboard storage data uses Windows drive letters while the target host is
  Linux, weakening product credibility.
- “Shortcuts” still contains placeholder copy.
- Visual charts and app state are hard-coded and do not communicate freshness,
  loading, unavailable sensors, or data source.
- Sidebar navigates Store to `/store`, while the router defines
  `/applications-store`.
- Search is currently a visual placeholder without a product-wide result model.

## Design rules for the next iteration

- Design compact navigation as an intentional mode, not as a squeezed desktop.
- Establish semantic color tokens for surface, text, muted text, status, focus,
  warning, and destructive actions in light/dark and solid/blur combinations.
- Validate WCAG AA contrast against the actual wallpaper/surface combinations.
- Every metric widget gets loading, empty, stale, unavailable, and error states.
- Use Linux-native storage terminology: mount point, filesystem, device, total,
  used, available, and health.
- Treat search as command-and-entity search across apps, files, settings, and
  actions.
- Define component/token ownership in Figma and map it to the existing
  `ui`/`foundation` component categories.

## Figma follow-up checklist

- Obtain a node-specific `/design/...?...node-id=...` link.
- Inventory pages, top-level frames, components, variables, and text styles.
- Compare dashboard and settings frames with the running implementation.
- Identify missing screens and flows, not only isolated visual frames.
- Record tokens and map them to CSS variables/Tailwind theme values.
- Add frames for onboarding, app detail/install plan, operation progress,
  container detail, file manager, terminal, alerts, empty/error states, and
  compact navigation.
