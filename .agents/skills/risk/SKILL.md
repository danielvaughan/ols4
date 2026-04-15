---
name: risk
description: Create and update Agent SDLC risk artifacts for identified risks, tensions between requirements, and technical feasibility concerns. Use when the user asks to log a risk, flag a tension, or capture a feasibility concern from PRD, implementation, or analysis sources.
---

# Risk

Use this skill to create or update durable risk artifacts. Risks capture **factual tensions** between stated requirements, constraints, or known technical realities. Risks are not opinions or recommendations — they are traceable records of identified concerns sourced from documents, benchmarks, or implementation findings.

## When To Use

- User asks to log a risk, flag a concern, or capture a tension between requirements
- A PRD requirement conflicts with known technical constraints or feasibility
- An implementation finding reveals a gap between stated targets and achievable reality
- A dependency, schedule, cost, or quality concern needs formal tracking
- User wants an existing risk updated, re-assessed, accepted, or resolved

## When NOT To Use

- Actionable work that should be a backlog item; use `backlog-item`
- Detailed design or execution planning; use `implementation-spec`
- Internal agent scratch tracking or notes
- Opinions, recommendations, or proposed mitigations not sourced from documents

## Shared Rules

- Resolve the repo root from the current working tree.
- Detect the Agent SDLC folder in this order:
  - `<repo>/.agent-sdlc`
  - `<repo>/.agentsdlc`
- Prefer the repo-local template at `<agent-sdlc>/templates/risk.md`.
- If `<agent-sdlc>/config.yaml` or `config.yml` exists, use it as the source of truth for risk storage, `name_pattern`, and document ID allocation.
- When repo-root SDLC config exists, locate the artifact whose `name` is `Risk` or whose `short_name` is `risk`.
- Derive the storage directory as `<repo root>/<project.sdlc_root>/<artifact.location>`.
- Use `name_pattern` as the source of truth for the filename and risk `id`.
- `name_pattern` must use brace-style placeholders only, must end in `.md`, and may use only required `seq` plus optional `version`.
- `seq` is the `.lock`-managed integer sequence and should normally be formatted as `{seq:05d}`.
- When `version` is used, prefer `project.version` from repo config. It must resolve to normalized `N.N`, such as `1.0`, without the leading `v`.
- If `name_pattern` contains placeholders beyond `seq`, such as `version`, the repo config or user instructions must define how those values are derived. Do not guess extra token values.
- Do not use mixed or printf-style tokens such as `{%03d}` in `name_pattern`.
- Frontmatter `id` must equal the rendered filename stem, without the `.md` extension.
- If `project.sdlc_root`, artifact `location`, or `name_pattern` is missing or ambiguous, stop and ask the user instead of guessing.
- If no repo-root SDLC config exists, store risk items under `<agent-sdlc>/risk/` and use `RSK-XXXX.md` filenames with 4-digit zero padding.
- If the repo has no Agent SDLC folder at all, create `<repo>/.agent-sdlc/risk/`, use the bundled template, and report that you assumed the default layout.

## File Naming And IDs

- When repo-root SDLC config exists and a new risk file must be created, allocate the next document ID through `<artifact-dir>/.lock` instead of inventing filenames manually
- Create the `.lock` file if it does not exist
- Treat `.lock` contents as the last allocated risk sequence
- If the `.lock` file cannot be locked, wait 30 seconds and retry
- Try at most 3 times; after the third failure, ask the user to try again
- While holding the lock, read the last allocated ID, increment it to the next ID allowed by `name_pattern`, write the new last ID back to `.lock`, and release the lock
- If the `.lock` file is empty, allocate the first valid ID for that pattern
- If no repo config exists, determine the next `RSK-XXXX` value from the highest existing `RSK-*.md` file in the risk directory
- Re-scan immediately before writing; if the chosen filename now exists, recompute once and use the next ID instead of overwriting

## Before Creating

- Search existing risk items by title and key terms to avoid obvious duplicates
- If an existing item already covers the concern, update that item instead of creating a new one
- If the overlap is partial, create a new item and cross-link the related risk in `links.related_risks`

## Authoring Rules

- Create from the repo-local template when present; otherwise use [references/risk-template.md](references/risk-template.md)
- `risk_category` defaults:
  - `technical` for feasibility, performance, or architecture concerns
  - `schedule` for timeline or dependency-driven delays
  - `resource` for staffing, budget, or infrastructure capacity
  - `dependency` for external blockers or third-party risks
  - `quality` for decision quality, model accuracy, or data fidelity concerns
  - `cost` for budget overrun, pricing, or cost model risks
- New items default to:
  - `status: open`
  - `likelihood: medium`
  - `impact: medium`
  - `severity: null` (let humans or triage set this)
  - `owner: agent:<current-agent-name>`
- Default `owner` to the active agent, not `unassigned`
- If repo config lists agents and one matches the current agent name or session, use that exact configured agent name in `owner`
- If no better agent identity is available, use `agent:codex` or `agent:claude` based on the current provider
- Set `identified_by` from the source, usually `human:user` for direct chat requests
- Keep `source_refs` concise and traceable, for example `PRD §4.2: Agentic Workflow — Transaction Adjudication`

## Factual-Only Rule

This is the most important authoring constraint:

- **State only what source documents say.** Do not add commentary, interpretation, opinions, or recommendations.
- Cite specific PRD sections, benchmark data, implementation specs, or agent findings.
- If the source document provides a mitigation, capture it in `## Source-Stated Mitigation` — do not invent mitigations.
- The `## Tension` section identifies a conflict between two factual claims — it does not judge which side is correct.
- If the risk requires action, create a separate `backlog-item` and link it in `links.backlog_items`. Do not embed action items in the risk.

## Body Guidance

- `## Factual Basis`: cite the source, state what it says, list relevant metrics — all attributable to a specific document or finding
- `## Tension`: identify the specific conflict between two requirements or between a requirement and a known constraint — cite both sides
- `## Affected Domains`: list which context domains (from `.agent-sdlc/context/domains/`) are touched and how
- `## Source-Stated Mitigation`: capture ONLY what the source document says about mitigating this risk; write "None stated in source." if the source is silent
- `## Traceability`: replace placeholders with concrete rows linking to PRD sections, BLG items, other RSK items
- `## Resolution Criteria`: 1-3 observable conditions under which the risk is resolved, accepted, or no longer applicable

## Workflow

1. Resolve the repo root, Agent SDLC folder, template source, and risk directory.
2. If `<agent-sdlc>/config.yaml` or `config.yml` exists, read it and locate the risk artifact definition before creating or validating files.
3. When repo config exists, derive the storage directory from `project.sdlc_root` plus the artifact `location`, and derive the filename and `id` from artifact `name_pattern`.
4. Search for an existing matching risk item.
5. If updating, edit the existing file.
6. If creating, allocate the next document ID through the artifact `.lock` file when repo config exists; otherwise allocate the next `RSK-XXXX` filename from the directory scan.
7. Fill the frontmatter and body from the template.
8. Save the file.
9. In the user response, report the file path, item id, risk category, likelihood, impact, affected domains, and source references.
