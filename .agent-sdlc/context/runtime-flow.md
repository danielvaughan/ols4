# Runtime Flow

## Primary Flow

1. Freeze the external target repo, warm the environment, and capture a SonarQube baseline.
2. Curate a narrow issue set, usually 5-8 issues in one package or a few nearby classes.
3. Run Codex CLI against the external target repo with a narrow SpringGuard prompt and package boundary.
4. Let the agent edit target files while the repo-local hook validates each change immediately.
5. If the hook fails, the agent repairs the violation before continuing; if it passes, the run advances to the next issue.
6. In parallel, the dashboard polls local JSON feeds and visualizes issue count, hook state, changed files, and timeline events.
7. Finish with final validation, a visible issue-count reduction, a local diff, and the plugin reveal as the reusable workflow story.

## Feedback Or Validation Loops

1. Hook-driven self-correction loop:
   - Codex edits code in the target repo.
   - A repo-local hook runs validation.
   - A failing result forces the agent to correct the change before moving on.
2. Dashboard polling loop:
   - `springguard-dashboard/app.js` polls four JSON feeds every 2.5 seconds.
   - Feed state flips to `Feed Error` if any fetch fails.
3. Rehearsal loop:
   - Day-before prep freezes the repo, times validation commands, captures screenshots, and verifies fallback assets so the live path stays predictable.

## Supporting Flows

- SonarQube setup and scanning:
  - Bring up a local SonarQube container, create a token, run Maven analysis from the target repo root, and capture baseline screenshots.
- Presentation flow:
  - Introduce the real repo and backlog, show the control loop, run one visible remediation loop, then close on reusability through the plugin.
- Fallback flow:
  - Keep screenshots and a backup recording ready in case the live path drifts.

## Failure Or Break Conditions

- The target repo is not frozen or has drifted from the rehearsed baseline.
- SonarQube is not running or the baseline has not been captured.
- The repo-local hook or agent config is missing in the target repo.
- The dashboard JSON writer scripts are not running, leaving the static dashboard with stale or missing data.
- The live scope expands beyond the curated issue set or package boundary.

## Sources

- `docs/springguard-plan.md`
- `docs/springguard-demo-script.md`
- `docs/springguard-day-before-plan.md`
- `docs/springguard-hackathon-day-plan.md`
- `docs/hackathon-demo-baseline.md`
- `springguard-dashboard/README.md`
- `springguard-dashboard/app.js`
