# Target Repo Integration

## Purpose

- Record the boundary between this workflow repo and the external Spring Boot repo where SpringGuard is meant to run.

## Scope

- In scope:
  - External target repo identity
  - Target package and issue-set assumptions
  - Repo-local guardrail expectations
  - Validation and SonarQube touchpoints
- Out of scope:
  - The target repo's actual source code
  - Local implementation of `.codex/AGENTS.md`, hooks, or agent config

## Key Files

| Path | Role |
| --- | --- |
| `docs/springguard-plan.md` | Names `ols4` as the demo repo and describes the intended control loop |
| `docs/springguard-demo-script.md` | Shows the expected `.codex` files and live command shape in the target repo |
| `docs/sonarqube-setup-mac.md` | Records the concrete `ols4` path, Sonar analysis commands, and setup caveats |
| `docs/hackathon-demo-baseline.md` | Records the frozen branch, commit, target file, and issue shortlist |
| `plugin/README.md` | States which pieces must stay repo-local in the target repo |

## Responsibilities

- Identify the real codebase that proves the concept.
- Keep the scope pinned to a narrow package or a few classes.
- Define what must exist in the target repo for the SpringGuard loop to be credible.
- Separate documented assumptions from locally implemented artifacts.

## Inputs And Outputs

- Inputs:
  - External SonarQube issue set
  - Target package or file boundary
  - Repo-local `AGENTS.md`, hooks, and build commands in the target repo
- Outputs:
  - Narrow prompt and target scope
  - Validated code changes in the external repo
  - Before/after evidence for the demo

## Dependencies And Interfaces

- Depends on `demo-operations` for frozen branch, baseline screenshots, and validation timing.
- Depends on SonarQube for issue selection and credibility.
- Interfaces with `dashboard-prototype` through the feed data that visualizes target repo progress.
- Interfaces with `plugin-packaging` because the plugin assumes these repo-local controls are already present.

## Invariants Or Assumptions

- The target repo is external to this repository.
- The intended remediation scope stays narrow: 5-8 issues in one package or a few nearby classes.
- Hook feedback is part of the task, not noise.
- The final proof is fewer targeted issues while validation still passes.

## Open Questions

- The target repo `.codex/AGENTS.md`, `.codex/hooks/post-tool-check.sh`, and `.codex/agents/springguard.toml` are referenced in docs but are not versioned in this repo.
- `docs/hackathon-demo-baseline.md` records that repo-local Codex harness setup in `ols4` was still a remaining gap as of `2026-04-14`.

## Sources

- `docs/springguard-plan.md`
- `docs/springguard-demo-script.md`
- `docs/sonarqube-setup-mac.md`
- `docs/hackathon-demo-baseline.md`
- `plugin/README.md`
- `plugin/skills/springguard/SKILL.md`
