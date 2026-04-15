# System Context

## Boundary

- Local repo scope:
  - Hackathon framing and operations docs
  - A static dashboard prototype that reads local JSON files
  - A reusable SpringGuard plugin prototype
  - Repo-local Agent SDLC scaffolding for durable docs
- External systems or repos:
  - The actual Spring Boot demo repository, identified in the docs as `ols4`
  - A local SonarQube instance used to scan the target repo
  - Codex CLI running against the target repo
  - Repo-local `AGENTS.md` and hook scripts that live in the target repo, not this repo

## Local Components

| Component | Purpose | Key Files |
| --- | --- | --- |
| Planning and presentation docs | Define the claim, pitch, scope, and demo sequence | `README.md`, `docs/springguard-plan.md`, `docs/springguard-demo-script.md`, `docs/springguard-presentation-outline.md` |
| Demo operations docs | Record setup, rehearsal, validation, and fallback expectations | `docs/springguard-day-before-plan.md`, `docs/springguard-hackathon-day-plan.md`, `docs/hackathon-demo-baseline.md`, `docs/sonarqube-setup-mac.md` |
| Dashboard prototype | Visualizes issue count, hook state, changed files, and timeline | `springguard-dashboard/index.html`, `springguard-dashboard/app.js`, `springguard-dashboard/demo-state/*.json` |
| Plugin prototype | Packages the reusable workflow and prompt shape | `plugin/.codex-plugin/plugin.json`, `plugin/skills/springguard/SKILL.md`, `plugin/README.md` |
| Agent SDLC tooling | Stores durable artifacts and repo-local skills | `.agent-sdlc/config.yaml`, `.agents/skills/*` |

## External Dependencies

| External System | Relationship | Evidence |
| --- | --- | --- |
| `ols4` Spring Boot repo | The real codebase SpringGuard is meant to operate on during the demo | `docs/springguard-plan.md`, `docs/sonarqube-setup-mac.md`, `docs/hackathon-demo-baseline.md` |
| SonarQube | Source of credibility and issue backlog for the demo loop | `docs/springguard-plan.md`, `docs/springguard-demo-script.md`, `docs/sonarqube-setup-mac.md` |
| Codex CLI | Agent runtime used to edit the target repo under guardrails | `docs/springguard-plan.md`, `docs/springguard-demo-script.md` |
| Target repo `AGENTS.md` and hooks | Repo-local control layer that constrains the agent and validates edits | `docs/springguard-plan.md`, `docs/springguard-demo-script.md`, `plugin/README.md`, `plugin/skills/springguard/SKILL.md` |
| Dashboard feed writers | Expected to write JSON for issue counts, hook status, changed files, and timeline | `springguard-dashboard/README.md` |

## Interfaces And Hand-Offs

- SonarQube or a curated issue list identifies a narrow issue set in the target repo.
- Codex CLI runs against the target repo with a narrow prompt and package boundary.
- Repo-local hooks validate each change and force repair when a change violates local rules.
- Helper scripts update dashboard JSON so the browser can show live progress.
- The final story is shown through SonarQube, the terminal, the dashboard, and the packaged plugin.

## Constraints

- The hackathon build window is short and the docs repeatedly prefer reliability over breadth.
- The intended demo scope is 5-8 issues in one package or a few classes.
- This repo intentionally avoids turning the dashboard into a second product.
- This repo documents and packages the workflow, but it does not implement the target repo harness locally.

## Open Questions

- The referenced target repo `.codex/AGENTS.md`, hook script, and agent config are not stored here.
- The live dashboard JSON writer scripts are described, but they are not present in this repo.

## Sources

- `docs/springguard-plan.md`
- `docs/springguard-demo-script.md`
- `docs/sonarqube-setup-mac.md`
- `docs/hackathon-demo-baseline.md`
- `springguard-dashboard/README.md`
- `plugin/README.md`
- `plugin/skills/springguard/SKILL.md`
