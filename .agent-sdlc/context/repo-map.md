# Repo Map

## Top-Level Paths

| Path | Kind | Purpose | Notes |
| --- | --- | --- | --- |
| `README.md` | file | High-level repo overview and reading order | Best starting point for understanding intent |
| `docs/` | dir | Main planning, demo, ops, and setup material | Source of truth for the concept and demo choreography |
| `docs/artifacts/` | dir | Captured SonarQube screenshots for the demo baseline | Evidence, not active runtime logic |
| `springguard-dashboard/` | dir | Static dashboard prototype used during the demo | Contains HTML, CSS, JS, and seeded JSON state |
| `plugin/` | dir | Minimal reusable SpringGuard plugin prototype | Packages the reusable workflow, not repo-local guardrails |
| `.agent-sdlc/` | dir | Durable SDLC artifact root for this repo | Contains config, artifact folders, and now project context |
| `.agents/` | dir | Repo-local skills for writing and updating SDLC artifacts | Includes `project-context` and other artifact skills |

## Key Files

| File | Why It Matters |
| --- | --- |
| `docs/springguard-plan.md` | Defines the core claim, scope rules, and demo success criteria |
| `docs/springguard-demo-script.md` | Defines the live sequence and the dashboard's role in the demo |
| `docs/springguard-day-before-plan.md` | Defines the prep checklist and expected outputs before hackathon day |
| `docs/springguard-hackathon-day-plan.md` | Defines execution priorities and core-vs-optional scope on the event day |
| `docs/sonarqube-setup-mac.md` | Records the concrete local SonarQube and `ols4` setup path |
| `springguard-dashboard/app.js` | Implements the dashboard polling and rendering behavior |
| `plugin/.codex-plugin/plugin.json` | Declares the reusable plugin metadata and default prompts |
| `.agent-sdlc/config.yaml` | Declares local SDLC artifact naming and storage rules |

## What Is Not Here

- The Spring Boot target application code
- The target repo's `.codex/AGENTS.md`, hook scripts, and agent config
- Scripts that write live dashboard JSON from SonarQube or hook events
- Automated install or marketplace wiring for the local plugin prototype

## Sources

- `README.md`
- `docs/springguard-plan.md`
- `docs/springguard-demo-script.md`
- `docs/sonarqube-setup-mac.md`
- `springguard-dashboard/README.md`
- `plugin/README.md`
- `.agent-sdlc/config.yaml`
