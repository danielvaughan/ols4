# Agent SDLC Tooling

## Purpose

- Define the repo-local scaffolding used to store durable SDLC artifacts and the local skills that create or update them.

## Scope

- In scope:
  - `.agent-sdlc/config.yaml`
  - Artifact folders under `.agent-sdlc/`
  - Repo-local skills under `.agents/skills/`
  - Context-domain ids that later requirements and risks can reference
- Out of scope:
  - The hackathon plugin package under `plugin/`
  - External Codex marketplace wiring
  - Target repo guardrails in the external Spring repo

## Key Files

| Path | Role |
| --- | --- |
| `.agent-sdlc/config.yaml` | Source of truth for local artifact locations, naming patterns, and ID prefix |
| `.agents/skills/backlog-item/SKILL.md` | Repo-local backlog item authoring rules |
| `.agents/skills/requirement/SKILL.md` | Repo-local requirement authoring rules |
| `.agents/skills/implementation-spec/SKILL.md` | Repo-local implementation spec authoring rules |
| `.agents/skills/risk/SKILL.md` | Repo-local risk authoring rules |
| `.agents/skills/project-context/SKILL.md` | Repo-local context-generation rules |

## Responsibilities

- Keep durable planning and traceability artifacts in predictable locations.
- Provide repo-local skills so future agents can create backlog, requirement, implementation-spec, risk, and context docs consistently.
- Supply stable domain ids under `.agent-sdlc/context/domains/` for `affected_domains`.

## Inputs And Outputs

- Inputs:
  - Repo structure
  - User instructions
  - Source documents and chat context
- Outputs:
  - Managed SDLC artifacts under `.agent-sdlc/`
  - Stable project context files under `.agent-sdlc/context/`

## Dependencies And Interfaces

- Depends on `.agent-sdlc/config.yaml` for artifact metadata.
- Uses `.lock` files in artifact directories to allocate IDs for managed artifact types.
- Interfaces with every other domain because context, requirements, risks, backlog items, and specs all depend on this local convention.

## Invariants Or Assumptions

- `project.sdlc_root` is `.agent-sdlc/`.
- The current managed artifact types are implementation specs, backlog items, requirements, and risks.
- Context is stored under `.agent-sdlc/context/`, but it is not currently defined as a sequence-ID artifact in `config.yaml`.
- Some artifact directories currently contain only `.lock` files because the repo is just beginning to accumulate durable artifacts.

## Open Questions

- There is no repo-local `.agent-sdlc/templates/` directory yet, so skills currently fall back to bundled reference templates when needed.
- Agent registration in `.agent-sdlc/config.yaml` is scaffolded but not actively populated.

## Sources

- `.agent-sdlc/config.yaml`
- `.agents/skills/backlog-item/SKILL.md`
- `.agents/skills/requirement/SKILL.md`
- `.agents/skills/implementation-spec/SKILL.md`
- `.agents/skills/risk/SKILL.md`
- `.agents/skills/project-context/SKILL.md`
