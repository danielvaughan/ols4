# Demo Operations

## Purpose

- Capture the practical setup, rehearsal, and fallback work needed to run the SpringGuard demo reliably.

## Scope

- In scope:
  - Day-before preparation
  - Hackathon-day timeboxing
  - SonarQube setup and baseline capture
  - Validation command timing
  - Rehearsal and fallback assets
- Out of scope:
  - Dashboard frontend implementation details
  - Plugin packaging internals
  - Actual target repo code changes

## Key Files

| Path | Role |
| --- | --- |
| `docs/springguard-day-before-plan.md` | Prep checklist and readiness criteria |
| `docs/springguard-hackathon-day-plan.md` | Event-day priorities and scope control |
| `docs/hackathon-demo-baseline.md` | Concrete recorded baseline state and remaining gaps |
| `docs/sonarqube-setup-mac.md` | Local SonarQube setup and target repo analysis commands |
| `docs/artifacts/sonarqube-dashboard.png` | Stored evidence of the baseline dashboard |
| `docs/artifacts/sonarqube-v1select-issues.png` | Stored evidence of the shortlisted issue set |

## Responsibilities

- Freeze the target repo and demo environment.
- Capture and retain baseline evidence.
- Keep the live validation path fast and trusted.
- Ensure a fallback path exists before the presentation.
- Stop optional work from displacing the core demo path.

## Inputs And Outputs

- Inputs:
  - External `ols4` repo
  - Docker, Java, Maven, and SonarQube on the demo machine
  - Curated issue shortlist
- Outputs:
  - Frozen branch and commit reference
  - Baseline screenshots
  - Timed validation commands
  - Rehearsed demo flow and fallback material

## Dependencies And Interfaces

- Depends on `target-repo-integration` for the actual demo codebase.
- Feeds `dashboard-prototype` with the expectation that live JSON updates will be available.
- Feeds `project-framing` by turning the concept into a reliable presentation path.

## Invariants Or Assumptions

- The live demo should not include infrastructure setup.
- The day plan forbids adding new scope if core functionality is not stable.
- The recorded baseline uses a local SonarQube instance and a frozen `ols4` branch.

## Open Questions

- `docs/hackathon-demo-baseline.md` records remaining gaps as of `2026-04-14`, including missing repo-local harness setup in `ols4`, unverified dashboard wiring, and no completed full rehearsal yet.

## Sources

- `docs/springguard-day-before-plan.md`
- `docs/springguard-hackathon-day-plan.md`
- `docs/hackathon-demo-baseline.md`
- `docs/sonarqube-setup-mac.md`
