# Project Context

## Summary

- Project:
  - `SpringGuard`
- Primary purpose:
  - A hackathon concept and workflow repo for demonstrating closed-loop static-analysis remediation in a Spring Boot codebase using Codex CLI, SonarQube-style signals, repo-local guardrails, and a thin progress dashboard.
- What this repo contains:
  - Planning and presentation docs
  - Demo operations notes
  - A static dashboard prototype
  - A reusable plugin prototype
  - Local Agent SDLC scaffolding under `.agent-sdlc/` and `.agents/`
- What this repo does not contain:
  - The actual Spring Boot target repository
  - The target repo's `.codex/AGENTS.md`, hook scripts, or final agent config
  - Live dashboard feed writer scripts
  - A production SonarQube deployment

## Reading Order

1. `README.md` at repo root
2. `docs/springguard-plan.md`
3. `system-context.md`
4. `runtime-flow.md`
5. `domains/*.md`

## Context Files

| File | Purpose |
| --- | --- |
| `repo-map.md` | Maps the local repository contents and the repo boundary |
| `system-context.md` | Explains how this repo relates to the external demo repo, SonarQube, Codex, and repo-local guardrails |
| `runtime-flow.md` | Captures the primary remediation and demo loops |
| `source-map.md` | Points future agents to the right source files by topic |
| `domains/project-framing.md` | Concept, pitch, scope, and judging alignment |
| `domains/demo-operations.md` | Day-before and hackathon-day operating model |
| `domains/dashboard-prototype.md` | Static dashboard behavior and feed contract |
| `domains/plugin-packaging.md` | Reusable plugin boundary and packaged workflow |
| `domains/target-repo-integration.md` | External target repo and repo-local guardrail hand-off |
| `domains/agent-sdlc-tooling.md` | Local SDLC configuration and repo-specific skills |

## Current Snapshot

- Key domain ids:
  - `project-framing`
  - `demo-operations`
  - `dashboard-prototype`
  - `plugin-packaging`
  - `target-repo-integration`
  - `agent-sdlc-tooling`
- Primary external systems:
  - External Spring Boot demo repo: `ols4`
  - Local SonarQube instance
  - Codex CLI session operating in the target repo
  - Repo-local `AGENTS.md` and hook scripts inside the target repo
- Primary operator flow:
  - Curate a narrow Sonar issue set in the external Spring repo, run Codex under repo-local guardrails, show hook-driven self-correction, and make progress visible through the dashboard and before/after proof.

## Sources

- `README.md`
- `docs/springguard-plan.md`
- `docs/springguard-demo-script.md`
- `docs/springguard-hackathon-day-plan.md`
- `plugin/README.md`
- `springguard-dashboard/README.md`
