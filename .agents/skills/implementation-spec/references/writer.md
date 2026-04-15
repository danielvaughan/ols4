# Writer Reference

Use this reference when drafting a new implementation spec, revising an existing one, or addressing inline review comments.

## Drafting Workflow

1. Read local repo instructions plus any existing specs, architecture docs, or relevant code.
2. Resolve repo root.
3. If `<repo root>/.agent-sdlc/config.yaml` exists, read it and locate the artifact whose `name` is `Implementation Specification` or whose `short_name` is `impl spec`.
4. When that repo-root SDLC config exists, derive the storage directory as `<repo root>/<project.sdlc_root>/<artifact.location>`. Create the directory if needed. Use `name_pattern` as the source of truth for the filename and document ID format. `name_pattern` must use brace-style placeholders only, must end in `.md`, and may use only required `seq` plus optional `version`. Prefer forms such as `IML-{seq:05d}.md` or `IML-{seq:05d}-v{version}.md`. When `version` is used, it must resolve to an `N.N` string such as `1.0`, without the leading `v`. If `project.sdlc_root`, artifact `location`, or `name_pattern` is missing or ambiguous, stop and ask the user instead of guessing.
5. Decide whether the change is a single-file spec or a grouped multi-file spec set.
6. For any new top-level spec file, allocate one new document ID by opening `<artifact-dir>/.lock`, creating it if it does not exist, and acquiring an exclusive lock before reading its contents. Treat the file contents as the last allocated implementation-spec ID.
7. If the `.lock` file cannot be locked, wait 30 seconds and retry. Try at most 3 times. After the third failure, ask the user to try again.
8. While holding the exclusive lock, read the last allocated ID from `.lock`, increment it to the next ID allowed by `name_pattern`, and render the target filename. If the file is empty, allocate the first valid ID for that pattern. If the rendered target path already exists, continue incrementing while still holding the lock until an unused filename is found. Write the new last allocated ID back to `.lock`, flush it, and then release the lock. Never read `.lock` before the exclusive lock is acquired. Set frontmatter `id` on that top-level file to the rendered filename stem without the `.md` extension.
9. If `name_pattern` contains placeholders beyond the sequence token, such as `{version}`, the repo config or user instructions must define how those values are derived. Do not guess extra token values. When `version` is used, require it to be normalized as `N.N`, for example `1.0`.
10. If the spec set has multiple docs, use the allocated top-level file as the overview document. Do not create `index.md`. Instead, create a sibling directory named after the top-level filename stem and store child specs there with meaningful names such as `common.md`, `control-panel-api.md`, `agent-harness.md`, or `design.md`.
11. Child specs in a grouped spec set do not consume additional `.lock` IDs. Set each child-spec frontmatter `id` to `<top-level-id>/<child-stem>`.
12. If no repo-root SDLC config exists, follow local document-location rules. If none exist, place specs where the user asks and use `impl-spec-*.md` filenames.
13. Identify impacted modules.
14. If more than one module changes, create one top-level overview doc plus one child markdown spec per module. Keep the top-level overview at the allocated `name_pattern` path, and store the child specs inside the same-stem folder.
15. Start every module spec and index file with the standard YAML frontmatter block from the template. Populate every field, keep timestamps in UTC ISO 8601 format, set `id` from the allocated document ID or derived child ID when applicable, and keep `module_scope` tight enough for overlap detection.
16. For each module, list files to add and files to update before describing implementation steps.
17. Define interfaces precisely:
   - HTTP APIs: include endpoint purpose, method, path, auth, headers, query parameters, path parameters, request body, response body, status codes, validation rules, and error cases.
   - Event or queue contracts: include producers, consumers, delivery expectations, and exact payload schemas.
   - Database changes: include tables, columns, types, defaults, indexes, constraints, migrations, backfill behavior, and rollback expectations.
18. Plan work in phases. Each phase must include a goal, prerequisites, trackable tasks, files touched, and acceptance criteria.
19. Keep each module spec self-contained so a developer can work from that file alone.
20. If detail is missing, add a `Clarifications Required` section and mark the affected tasks or phases as blocked.

## Addressing Review Comments

1. Read all inline comments and any `Escalated Items` section before editing the spec.
2. Preserve reviewer comments and earlier author responses. Do not rewrite history.
3. Do not delete, move, collapse, summarize away, or rewrite any existing comment thread.
4. The only allowed edit to an existing reviewer comment is changing its checkbox from `[ ]` to `[x]` when that exact finding is fully addressed.
5. Do not change the body text, agent label, provider/session identifier, or timestamp of any existing reviewer comment or author response.
6. Update the spec text as close as possible to the commented statement.
7. When a finding is fully addressed:
   - Change the original reviewer comment from `[ ]` to `[x]`.
   - Add an author response immediately below it using the shared inline format, normally with `[x]`, for example: `> [x] [spec-author (Codex: <session-id>)] [<YYYY-MM-DDTHH:MM:SSZ>]: Addressed. Added auth requirements and 401/403 behavior.`
   - State exactly what changed in the spec.
8. When a finding is only partially addressed:
   - Leave the original reviewer comment as `[ ]`.
   - Add an author response with `[ ]` and explain what remains unresolved.
9. If a prior comment needs correction, clarification, or withdrawal, add a new inline follow-up response that explains the change in understanding. Do not erase or rewrite the earlier line.
10. When the issue requires a human decision:
   - Add an author response with `[ESCALATE]`, for example: `> [ ] [ESCALATE] [spec-author (Codex: <session-id>)] [<YYYY-MM-DDTHH:MM:SSZ>]: Token scope semantics require a security decision before this spec can be finalized.`
   - Include the same issue in the `Escalated Items` section.
11. Do not add a separate digest of every comment after responding. Only summarize escalations.

## Output Requirements

- Use markdown.
- Start every spec with the standard YAML frontmatter block and keep it YAML-valid.
- If `<repo root>/.agent-sdlc/config.yaml` exists, store specs under `<repo root>/<project.sdlc_root>/<artifact.location>`.
- In a single-file spec, name the file from the allocated top-level document ID and `name_pattern`.
- In a grouped multi-file spec set, use the allocated top-level document ID and `name_pattern` for the overview file, create a sibling folder named after that file stem, and store child specs there with meaningful names. Do not create `index.md`.
- When `name_pattern` is used, support only brace-style placeholders: required `seq` and optional `version`.
- When `version` is used, it must be rendered as `N.N`; the pattern should contribute the leading `v`.
- Top-level frontmatter `id` must equal the rendered filename stem without the `.md` extension.
- Child-spec frontmatter `id` must be derived from the top-level `id` plus the child file stem, for example `IML-00040-v1.0/agent-harness`.
- If no repo-root SDLC config exists, follow local document-location rules. If none exist, place specs where the user asks.
- When no repo-root SDLC config exists, every spec filename must start with `impl-spec-`.
- When no repo-root SDLC config exists, use names such as `impl-spec-control-panel-api.md` or `impl-spec-job-manager.md`.
- For multi-module work under repo-root SDLC config, the top-level overview doc replaces the old `index.md` convention. Child specs should live under the same-stem folder.
- Use [module-spec-template.md](module-spec-template.md) as the default module spec structure.
- Use [spec-index-template.md](spec-index-template.md) for the top-level overview document in a grouped multi-file spec set.

## Name Pattern Examples

- Recommended without versions: `IML-{seq:05d}.md` -> file `IML-00001.md`, frontmatter `id: "IML-00001"`
- Recommended with versions: `IML-{seq:05d}-v{version}.md` -> file `IML-00001-v1.0.md`, frontmatter `id: "IML-00001-v1.0"`
- Recommended grouped spec set:
  - top-level overview file: `IML-00040-v1.0.md`, frontmatter `id: "IML-00040-v1.0"`
  - child spec directory: `IML-00040-v1.0/`
  - child spec file: `IML-00040-v1.0/agent-harness.md`, frontmatter `id: "IML-00040-v1.0/agent-harness"`
- Invalid rendered version: `IML-00001-v01.00.md` because version must be `N.N`
- Invalid: `IML-{%03d}-v{version}.yaml` because it mixes formatting styles and does not produce a markdown filename
