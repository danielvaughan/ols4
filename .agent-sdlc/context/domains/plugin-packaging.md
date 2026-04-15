# Plugin Packaging

## Purpose

- Package the reusable SpringGuard workflow so the demo can claim reusability beyond a single prompt or single repository.

## Scope

- In scope:
  - Plugin manifest metadata
  - Packaged SpringGuard skill
  - Default prompt shape and behavioral constraints
  - Boundary between reusable workflow and repo-local controls
- Out of scope:
  - Target repo `AGENTS.md`
  - Hook scripts
  - Repo-specific build commands
  - SonarQube credentials or issue lists
  - Marketplace rollout as a hackathon dependency

## Key Files

| Path | Role |
| --- | --- |
| `plugin/README.md` | Defines the reusable boundary and minimal install story |
| `plugin/.codex-plugin/plugin.json` | Declares the plugin package metadata and interface |
| `plugin/skills/springguard/SKILL.md` | Encodes the reusable workflow and narrow remediation rules |

## Responsibilities

- Make the workflow installable or portable across Spring repositories.
- Preserve the split between reusable method and repo-local guardrails.
- Supply a concrete artifact for the closing "this is more than a prompt" claim.

## Inputs And Outputs

- Inputs:
  - A curated static-analysis issue set
  - A target Spring repo with repo-local guardrails
- Outputs:
  - Packaged plugin manifest
  - Packaged SpringGuard skill and default prompts

## Dependencies And Interfaces

- Depends on `target-repo-integration` because the packaged skill assumes the target repo already has local instructions, hooks, build commands, and issue selection.
- Interfaces with `project-framing` by carrying the reusability claim.
- Interfaces with `demo-operations` as an optional polish item and closing reveal.

## Invariants Or Assumptions

- The plugin packages the workflow, not the local controls.
- The hackathon demo only needs the manifest, the skill, and the repo-local boundary story.
- Marketplace wiring is optional and not part of the critical demo path.

## Open Questions

- The repo contains a prototype package but not an automated installation or publication path.

## Sources

- `plugin/README.md`
- `plugin/.codex-plugin/plugin.json`
- `plugin/skills/springguard/SKILL.md`
- `docs/springguard-demo-script.md`
