# Dashboard Prototype

## Purpose

- Provide a thin visual layer that makes the SpringGuard loop visible during a short live demo.

## Scope

- In scope:
  - Static HTML, CSS, and browser-side JavaScript
  - Polling local JSON files
  - Rendering issue count, hook state, changed files, and timeline
- Out of scope:
  - Backend services
  - SonarQube API integration logic
  - Hook scripts
  - Persistence or multi-user behavior

## Key Files

| Path | Role |
| --- | --- |
| `springguard-dashboard/README.md` | States the dashboard purpose, data files, and live wiring expectations |
| `springguard-dashboard/index.html` | Defines the visible panels and placeholders |
| `springguard-dashboard/app.js` | Polls feeds and renders dashboard state |
| `springguard-dashboard/styles.css` | Defines the visual treatment for the control-room UI |
| `springguard-dashboard/demo-state/issues.json` | Seed issue-count and category data |
| `springguard-dashboard/demo-state/hook-status.json` | Seed hook status data |
| `springguard-dashboard/demo-state/files.json` | Seed changed-file data |
| `springguard-dashboard/demo-state/timeline.json` | Seed timeline event data |

## Responsibilities

- Render the current targeted issue count and goal progress.
- Show the latest hook status and pass/fail counts.
- Surface recent file activity and timeline events.
- Poll the feed files every 2.5 seconds and reflect feed errors visibly.

## Inputs And Outputs

- Inputs:
  - `demo-state/issues.json`
  - `demo-state/hook-status.json`
  - `demo-state/files.json`
  - `demo-state/timeline.json`
- Outputs:
  - Browser-visible dashboard state for a second screen or split-screen demo view

## Dependencies And Interfaces

- Depends on a local HTTP server to serve the static files.
- Depends on external helper scripts or hooks to keep the JSON feeds current during a live run.
- Interfaces with `demo-operations` by making progress legible to judges.

## Invariants Or Assumptions

- The dashboard is intentionally thin and is not a second product.
- SonarQube remains the credibility source; the dashboard supplies motion.
- `app.js` appends a timestamp query parameter and uses `cache: "no-store"` to reduce stale reads.
- The seeded demo state currently points at `OLS4` and an example target package.

## Open Questions

- The repo does not include the live writer scripts that are expected to update the JSON feeds.
- `springguard-dashboard/README.md` still references a historical `hackathon/springguard/springguard-dashboard` path instead of the current repo path.

## Sources

- `springguard-dashboard/README.md`
- `springguard-dashboard/index.html`
- `springguard-dashboard/app.js`
- `springguard-dashboard/styles.css`
- `springguard-dashboard/demo-state/issues.json`
- `springguard-dashboard/demo-state/hook-status.json`
- `springguard-dashboard/demo-state/files.json`
- `springguard-dashboard/demo-state/timeline.json`
