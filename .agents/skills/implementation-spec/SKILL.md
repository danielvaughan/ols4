---
name: implementation-spec
description: Draft, review, and revise implementation specs for junior developers, including repo-managed ID-based spec files, split per-module specs, inline review feedback, author responses, and escalations. Use when a user asks for a technical implementation plan, phased rollout spec, spec review, or to update a spec based on review comments.
---

# Implementation Spec

Use this skill to draft, review, and revise implementation specs that a junior developer can execute without guessing. Keep the spec and all feedback explicit. If information is missing, surface it instead of inventing it.

## When To Use

- Draft or update implementation specs in markdown
- Review existing implementation spec markdown files, whether they use `impl-spec-*.md` names or repo-managed document IDs
- Address inline review comments on a spec after review
- Break a cross-module change into a top-level overview spec plus separate child module specs when needed

## Shared Rules

- Write for a junior developer.
- Do not assume missing behavior, naming, edge cases, migration steps, or integration details.
- If any detail is unknown, add a `Clarifications Required` section and mark the affected tasks or phases as blocked.
- Prefer mature, actively maintained, non-deprecated libraries and frameworks already used in the repo when they fit the problem.
- If a new dependency is needed, name it explicitly and explain why it is preferred over alternatives.
- If `<repo root>/.agent-sdlc/config.yaml` exists, use it as the source of truth for implementation-spec storage location, `name_pattern`, and document ID allocation.
- When repo config uses `name_pattern`, support only brace-style placeholders. Supported placeholders are required `seq` and optional `version`.
- `seq` is the `.lock`-managed integer sequence and should normally be formatted as `{seq:05d}`. When `version` is used, it must resolve to a normalized `N.N` string such as `1.0` or `2.3`, without the leading `v`.
- Do not use mixed or printf-style tokens such as `{%03d}` in `name_pattern`.
- `name_pattern` should render a markdown filename ending in `.md`.
- In a multi-file spec set, allocate one top-level filename from `name_pattern` for the overview document. Do not create a sibling `index.md` file in that mode.
- For additional docs in the same spec set, create a directory named after the top-level filename stem and store child specs there with meaningful names such as `common.md`, `control-panel-api.md`, or `design.md`.
- Child specs in a grouped spec set do not consume additional `.lock` sequence IDs.
- If no repo-root SDLC config exists, every spec filename must start with `impl-spec-`.
- Every implementation spec file, including index specs, must start with the standard YAML frontmatter block and keep its metadata current.
- Frontmatter `id` must match the rendered filename stem, without the `.md` extension.
- In a grouped spec set, child-spec frontmatter `id` should be derived from the top-level `id` plus the child file stem, for example `IML-00040-v1.0/agent-harness`.
- When repo-root SDLC config exists and a new spec file must be created, allocate the next document ID through the artifact `.lock` file instead of inventing IDs or filenames manually.
- When allocating from `.lock`, open or create the file, acquire an exclusive lock, and only then read its contents. Never pre-read `.lock` before the exclusive lock is held.
- While holding the exclusive lock, compute the next sequence, verify the rendered target path is still free, write the updated last-allocated value back to `.lock`, flush it, and then release the lock.
- List every file that must be added or updated.
- Define APIs and schemas precisely enough to implement without interpretation.
- Do not mention unit tests, test strategy, or coverage unless the user explicitly asks.
- Keep reviewer comments and author responses inline, directly below the relevant spec statement or directly below the reviewer comment being addressed.
- Preserve comment history. Do not delete, rewrite, collapse, summarize away, or move prior review comments or author responses unless the user explicitly asks.
- The only allowed edit to an existing reviewer comment is changing its checkbox from `[ ]` to `[x]` when the author has fully addressed that finding.
- Do not change the body text, agent identity, or timestamp of an existing reviewer comment or author response.
- Only add an `Escalated Items` section when escalations exist, and summarize only escalated items there.

## Shared Comment And Escalation Format

- Every inline review comment or author response must include a checkbox, the visible agent name, the underlying provider/session id, and a UTC timestamp.
- Use one of these exact formats:
  `> [ ] [agent-name (Codex: <session-id>)] [<YYYY-MM-DDTHH:MM:SSZ>]: ...`
  `> [ ] [agent-name (Claude: <session-id>)] [<YYYY-MM-DDTHH:MM:SSZ>]: ...`
  `> [x] [agent-name (Codex: <session-id>)] [<YYYY-MM-DDTHH:MM:SSZ>]: ...`
  `> [x] [agent-name (Claude: <session-id>)] [<YYYY-MM-DDTHH:MM:SSZ>]: ...`
  `> [ ] [ESCALATE] [agent-name (Codex: <session-id>)] [<YYYY-MM-DDTHH:MM:SSZ>]: ...`
  `> [ ] [ESCALATE] [agent-name (Claude: <session-id>)] [<YYYY-MM-DDTHH:MM:SSZ>]: ...`
- `agent-name` should be the visible worker label, such as `spec-reviewer`, `spec-author`, or `worker-2`.
- Reviewers open new findings with `[ ]`.
- When an author fully addresses a finding, change the original reviewer line from `[ ]` to `[x]` and add an author response immediately below it using the same format, normally with `[x]`.
- When an author replies but the issue is not fully resolved, leave the original reviewer line as `[ ]` and add an author response with `[ ]`.
- If a prior comment needs correction, clarification, or withdrawal, add a new inline follow-up comment or author response. Do not erase or rewrite the earlier line.
- Use `[ESCALATE]` only when the issue requires human attention beyond author-agent follow-up.
- Escalate issues such as architecture conflicts, unresolved business-rule decisions, security or privacy risks, data-loss risk, cross-team contract changes, or contradictions the author agent cannot safely resolve alone.

## Workflow

1. Determine the task mode: `write`, `review`, or `address`.
2. Read local repo instructions, existing specs, architecture docs, and relevant code.
3. Resolve repo root. If `./.agent-sdlc/config.yaml` exists there, read it and locate the implementation-spec artifact definition before creating or validating spec files.
4. For new spec files, derive the storage directory from `project.sdlc_root` plus the artifact `location`, then allocate the next document ID by exclusively locking the artifact `.lock` file before reading or updating it.
5. Determine the current agent name, provider/session identifier, and UTC timestamp format before writing any inline comments or responses.
6. For draft, update, or comment-resolution work, read [references/writer.md](references/writer.md).
7. For review work, read [references/reviewer.md](references/reviewer.md).
8. Load only the templates or checklists needed for the current task.
9. Keep each comment or response adjacent to the text it applies to.
10. If escalations exist, add an `Escalated Items` section after the inline comments or responses and summarize only those escalations.
11. If a review finds no issues, say so explicitly and then note any residual risks, unknowns, or validation gaps.

## References

- [references/writer.md](references/writer.md): drafting specs, updating specs, and addressing inline comments
- [references/reviewer.md](references/reviewer.md): reviewing specs, verifying against code, and deciding when to escalate
- [references/module-spec-template.md](references/module-spec-template.md): default per-module spec template
- [references/spec-index-template.md](references/spec-index-template.md): default top-level overview template for grouped multi-file specs
- [references/review-output-template.md](references/review-output-template.md): structured inline-review output template
- [references/review-checklist.md](references/review-checklist.md): detailed review checklist
