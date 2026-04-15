# Project Framing

## Purpose

- Define what SpringGuard is claiming, what problem it is solving, and why the demo is intentionally narrow.

## Scope

- In scope:
  - Problem statement and pitch
  - Demo proof points
  - Judging alignment
  - Scope cuts and non-goals
- Out of scope:
  - Concrete target repo code changes
  - SonarQube server operations
  - Dashboard feed wiring details
  - Plugin manifest mechanics

## Key Files

| Path | Role |
| --- | --- |
| `README.md` | Root summary and reading order |
| `docs/springguard-plan.md` | Core concept, strong claim, scope rules, and demo goals |
| `docs/springguard-demo-script.md` | Demo narrative and visible control-loop story |
| `docs/springguard-presentation-outline.md` | Slide-level framing tied to judging criteria |
| `docs/springguard-judge-answers.md` | Short form answers for likely questions |

## Responsibilities

- Keep the core claim narrow and believable.
- Preserve the distinction between "agent edits code" and "repo guardrails shape the loop."
- Define what counts as a successful demo.
- Keep non-essential integrations out of the live path.

## Inputs And Outputs

- Inputs:
  - Hackathon constraints
  - Real Spring Boot maintenance problem
  - SonarQube-style backlog signals
- Outputs:
  - Demo story
  - Narrow scope rules
  - Judging-aligned framing

## Dependencies And Interfaces

- Depends on the existence of a real target repo and backlog.
- Hands requirements to `demo-operations`, `dashboard-prototype`, `plugin-packaging`, and `target-repo-integration`.

## Invariants Or Assumptions

- The strongest claim is the closed loop, not broad autonomous cleanup.
- The intended live scope is 5-8 issues in one package or a few nearby classes.
- Reliability is preferred over breadth.
- Enterprise controls are moved inside the agent loop, not replaced.

## Open Questions

- None currently inside this repo. The framing is documented, but its success still depends on the external demo repo and harness.

## Sources

- `README.md`
- `docs/springguard-plan.md`
- `docs/springguard-demo-script.md`
- `docs/springguard-presentation-outline.md`
- `docs/springguard-judge-answers.md`
