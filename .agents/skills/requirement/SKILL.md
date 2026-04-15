---
name: requirement
description: Extract, create, and update Agent SDLC requirement artifacts from PRDs, specifications, or user input. Use when the user asks to extract requirements from a document, log a requirement, or update an existing requirement.
---

# Requirement

Use this skill to create or update durable requirement artifacts. Requirements capture **atomic, testable statements** of intended behavior, quality, or constraint — extracted from source documents (PRDs, specifications, standards) or stated by humans.

## When To Use

- User asks to extract requirements from a PRD, specification, or other source document
- User asks to log, create, or draft a requirement
- User wants an existing requirement updated, accepted, waived, or superseded
- A bug or implementation finding reveals missing expected behavior that should be captured as a requirement first

## When NOT To Use

- Actionable work items; use `backlog-item`
- Detailed design or execution planning; use `implementation-spec`
- Risk or feasibility concerns; use `risk`
- Internal agent scratch tracking

## Shared Rules

- Resolve the repo root from the current working tree.
- Detect the Agent SDLC folder in this order:
  - `<repo>/.agent-sdlc`
  - `<repo>/.agentsdlc`
- Prefer the repo-local template at `<agent-sdlc>/templates/requirement.md`.
- If `<agent-sdlc>/config.yaml` or `config.yml` exists, use it as the source of truth for requirement storage, `name_pattern`, and document ID allocation.
- When repo-root SDLC config exists, locate the artifact whose `name` is `Requirement` or whose `short_name` is `requirement`.
- Derive the storage directory as `<repo root>/<project.sdlc_root>/<artifact.location>`.
- Use `name_pattern` as the source of truth for the filename and requirement `id`.
- `name_pattern` must use brace-style placeholders only, must end in `.md`, and may use only required `seq` plus optional `version`.
- `seq` is the `.lock`-managed integer sequence and should normally be formatted as `{seq:05d}`.
- When `version` is used, prefer `project.version` from repo config. It must resolve to normalized `N.N`, such as `1.0`, without the leading `v`.
- Frontmatter `id` must equal the rendered filename stem, without the `.md` extension.
- If `project.sdlc_root`, artifact `location`, or `name_pattern` is missing or ambiguous, stop and ask the user instead of guessing.
- If no repo-root SDLC config exists, store requirements under `<agent-sdlc>/requirement/` and use `REQ-XXXX.md` filenames with 4-digit zero padding.

## File Naming And IDs

- When repo-root SDLC config exists and a new requirement file must be created, allocate the next document ID through `<artifact-dir>/.lock` instead of inventing filenames manually
- Create the `.lock` file if it does not exist
- Treat `.lock` contents as the last allocated requirement sequence
- If the `.lock` file cannot be locked, wait 30 seconds and retry
- Try at most 3 times; after the third failure, ask the user to try again
- While holding the lock, read the last allocated ID, increment it to the next ID allowed by `name_pattern`, write the new last ID back to `.lock`, and release the lock
- If the `.lock` file is empty or zero, allocate the first valid ID for that pattern
- If no repo config exists, determine the next `REQ-XXXX` value from the highest existing `REQ-*.md` file in the requirement directory
- Re-scan immediately before writing; if the chosen filename now exists, recompute once and use the next ID instead of overwriting

## Before Creating

- Search existing requirement files by title and key terms to avoid obvious duplicates
- If an existing requirement already covers the same statement, update that item instead of creating a new one
- If the overlap is partial, create a new requirement and cross-link via `links.requirements`

## Extraction Rules

When extracting requirements from a source document (PRD, specification, etc.):

- **One requirement per file.** If a source paragraph contains multiple testable statements, split them into separate REQ files.
- **State what the source says.** Do not infer requirements the source does not state. If the source is ambiguous, capture the ambiguity in `## Open Questions`.
- **Preserve source traceability.** Every requirement must cite a specific section, table, or paragraph in `source_refs` and `## Source`.
- **Use "shall" for mandatory, "should" for desirable.** Map the source's language: "must" and "must-have" → "shall"; "should-have" → "should"; "nice-to-have" → "should" with `priority: p3`.
- **Capture numeric targets exactly.** Do not round, approximate, or interpret. "P99 < 150ms" stays "P99 < 150ms".
- **Tag functional vs. non-functional.** Set `type` accordingly. Non-functional requirements MUST also set `nf_subtype`.

### Type Classification

**Functional (`type: functional`):**
- What the system does — behaviors, workflows, inputs, outputs, decisions
- Examples: "The agent shall produce APPROVE / DECLINE / STEP_UP_AUTH", "Each tool shall return structured data"

**Non-functional (`type: non-functional`)** with `nf_subtype`:

| nf_subtype | When to use |
|---|---|
| `performance` | Latency, throughput, TPS, response time targets |
| `quality` | Decision accuracy, F1, precision, recall, error rates |
| `cost` | Cost-per-transaction, cost reduction targets, budget constraints |
| `compliance` | Audit trail, SOC 2, HIPAA, regulatory, explainability |
| `operational` | Uptime, monitoring, failover, burst handling, run duration |
| `security` | Authentication, authorization, data protection, isolation |
| `reliability` | Error budgets, fault tolerance, infrastructure failure handling |

## Authoring Rules

- Create from the repo-local template when present; otherwise use [references/requirement-template.md](references/requirement-template.md)
- New requirements default to:
  - `status: draft`
  - `priority: p2`
  - `owner: agent:<current-agent-name>`
  - `identified_by: agent:<current-agent-name>` (or `human:user` if stated by user directly)
- Default `owner` to the active agent, not `unassigned`
- If repo config lists agents and one matches the current agent name or session, use that exact configured agent name in `owner`
- Keep `source_refs` concise and traceable, for example `PRD §4.2: Agentic Workflow — Transaction Adjudication`
- Set `affected_domains` to the context domains (from `.agent-sdlc/context/domains/`) this requirement touches
- Write the `## Statement` as a single, direct, testable sentence using "shall" or "should"
- Do not put implementation design in the requirement

## Priority Mapping from Source

When extracting from a PRD with explicit priority language:

| Source language | Priority | Status |
|---|---|---|
| "Must-Have", "must", "required" | `p0` or `p1` | `draft` |
| "Should-Have", "should", "expected" | `p2` | `draft` |
| "Nice-to-Have", "optional", "if available" | `p3` | `draft` |

## Body Guidance

- `## Statement`: one testable sentence using "shall" or "should" — this is the requirement
- `## Source`: cite the exact origin (PRD section, table, paragraph), include verbatim or close-summary quote, state why it exists, and set confidence level
- `## Acceptance Notes`: observable success condition with specific threshold, boundary conditions, edge cases
- `## Open Questions`: capture ambiguities, unknowns, or things that need validation — use `RQ-N` numbering

## Batch Extraction Workflow

When extracting multiple requirements from a document:

1. Resolve the repo root, Agent SDLC folder, template source, and requirement directory.
2. Read the config to determine naming pattern and storage location.
3. Read the source document thoroughly.
4. Identify all testable statements — both explicit requirements and implicit constraints.
5. Group by PRD section to maintain extraction order.
6. For each requirement:
   a. Check for duplicates against existing REQ files.
   b. Allocate the next ID via `.lock`.
   c. Fill the template.
   d. Save the file.
7. After all requirements are created, report a summary: total count, breakdown by type/subtype/priority, and any open questions flagged.

## Workflow (Single Requirement)

1. Resolve the repo root, Agent SDLC folder, template source, and requirement directory.
2. If `<agent-sdlc>/config.yaml` or `config.yml` exists, read it and locate the requirement artifact definition before creating or validating files.
3. When repo config exists, derive the storage directory from `project.sdlc_root` plus the artifact `location`, and derive the filename and `id` from artifact `name_pattern`.
4. Search for an existing matching requirement.
5. If updating, edit the existing file.
6. If creating, allocate the next document ID through the artifact `.lock` file when repo config exists; otherwise allocate the next `REQ-XXXX` filename from the directory scan.
7. Fill the frontmatter and body from the template.
8. Save the file.
9. In the user response, report the file path, item id, type, nf_subtype (if applicable), priority, affected domains, and source reference.
