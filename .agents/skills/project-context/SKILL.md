---
name: project-context
description: Create and update Agent SDLC project context files under `.agent-sdlc/context/` by reverse-engineering the repository, docs, configs, and entry points. Use when the user asks to document repo context, generate system context, initialize context domains, or refresh project understanding from the codebase.
---

# Project Context

Use this skill to create or update durable repository context under `.agent-sdlc/context/`. Context files are the shared reference library for the repo: they explain what the project is, how the parts fit together, and which files are the source of truth for future requirement, risk, and implementation work.

## When To Use

- User asks to document project context, repo context, system context, architecture context, or domain context
- User wants `.agent-sdlc/context/` initialized or refreshed from the current repository
- Requirement or risk work needs context domains before those artifacts are written
- The repo is unfamiliar and needs a durable reverse-engineered map instead of a chat-only summary

## When NOT To Use

- Atomic requirement capture; use `requirement`
- Actionable work logging; use `backlog-item`
- Technical execution planning; use `implementation-spec`
- Feasibility or requirement tension capture; use `risk`
- Temporary scratch notes

## Shared Rules

- Resolve the repo root from the current working tree.
- Detect the Agent SDLC folder in this order:
  - `<repo>/.agent-sdlc`
  - `<repo>/.agentsdlc`
- If `<agent-sdlc>/config.yaml` or `config.yml` exists and defines `project.sdlc_root`, derive the context root as `<repo root>/<project.sdlc_root>/context/`.
- Otherwise use `<agent-sdlc>/context/`.
- Create `<context-root>/domains/` if it does not exist.
- Prefer a repo-local template at `<agent-sdlc>/templates/context-template.md`.
- If no repo-local template exists, use [references/context-template.md](references/context-template.md).
- Keep context factual and traceable to repository sources.
- If a statement is supported directly by a file, cite that file in a `Sources` section.
- If a conclusion is an inference stitched from multiple files, label it `Inference:` and cite the supporting files.
- When docs mention systems, repos, or services that are not present in the current repository, document them as external dependencies or target systems, not as local modules.
- Do not invent runtime behavior, ownership boundaries, or deployment details that are not evidenced by the repo.
- If something is unclear, record it in `Open Questions` instead of guessing.
- Use stable, human-readable filenames. Context files are not sequence-ID artifacts.
- When updating existing context files, preserve filenames unless the current layout is clearly broken.

## Minimum Output Set

When generating context from scratch, create or update this file set:

- `<context-root>/README.md`
- `<context-root>/repo-map.md`
- `<context-root>/system-context.md`
- `<context-root>/runtime-flow.md`
- `<context-root>/source-map.md`
- `<context-root>/domains/<domain-name>.md` for the 3-7 most important domains

If the repository is extremely small, collapse `system-context.md` or `runtime-flow.md` into `README.md` only when that reduces duplication. Still keep `domains/` present if other SDLC artifacts will reference it.

## Domain Rules

- Choose domains by responsibility and stable conceptual boundary, not by mirroring the folder tree blindly.
- Prefer 3-7 domains for small and medium repos.
- Use lowercase hyphen-case filenames such as `dashboard-prototype.md` or `plugin-packaging.md`.
- The domain filename stem is the canonical domain id that `requirement` and `risk` artifacts should use in `affected_domains`.
- Each domain file should explain:
  - purpose
  - scope and boundaries
  - key files
  - responsibilities
  - dependencies and interfaces
  - invariants or assumptions
  - open questions
  - sources
- If a repo is mostly documentation or demo assets, domains may be conceptual rather than runtime modules.

## Reverse-Engineering Guidance

Read enough of the repository to establish:

- what the project is trying to do
- what is actually inside the current repo
- what lives outside the repo but is required by the workflow
- what the primary user or operator flow looks like
- which files are source-of-truth for concept, behavior, and setup

Start with:

- top-level README
- build or packaging files
- entry points
- top-level docs
- manifest files
- static assets or data files that drive behavior

Then read the most relevant files inside each likely domain.

## Writing Rules

- Prefer short, factual sections over long narrative prose.
- Separate local facts from external context.
- Call out missing pieces explicitly, especially when the repo is only part of a larger system.
- Keep repo maps concrete: name the path, its role, and why it matters.
- Keep runtime flows legible: show the primary loop and the feedback path.
- Keep source maps useful: each row should help a future agent know where to read first.
- Avoid restating the same material across every file; cross-link instead.

## Workflow

1. Resolve the repo root, Agent SDLC folder, context root, and template source.
2. Inventory the repository with `rg --files`, README files, config or build files, entry points, and top-level docs.
3. Determine the repo boundary: what is local, what is external, and what is merely referenced.
4. Identify the 3-7 most stable domains.
5. Create or update the shared context files using the template in [references/context-template.md](references/context-template.md).
6. Create or update one file per domain under `<context-root>/domains/`.
7. Make sure domain names are stable and suitable for `affected_domains` in requirements and risks.
8. Cross-check for unsupported claims, duplicated content, and missing source attribution.
9. In the user response, report the files created or updated, the chosen domain ids, and any important open questions that still need human confirmation.
