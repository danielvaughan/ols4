---
name: backlog-item
description: Create and update Agent SDLC backlog-item files for user-reported bugs, requests, and follow-up work. Use when the user asks to log a bug, request, or backlog item from chat context into a repo backlog.
---

# Backlog Item

Use this skill to create or update durable backlog-item artifacts. Prefer a backlog item when the user wants the work captured for prioritization or later implementation, not executed immediately.

## When To Use

- User asks to log a bug, request, follow-up, or backlog item
- User wants a markdown artifact created from a conversation, incident, or review finding
- User wants an existing backlog item updated, reprioritized, blocked, or closed

## When NOT To Use

- Internal agent scratch tracking
- Detailed design or execution planning; use `implementation-spec`
- One-off notes that are not durable backlog work

## Shared Rules

- Resolve the repo root from the current working tree.
- Detect the Agent SDLC folder in this order:
  - `<repo>/.agent-sdlc`
  - `<repo>/.agentsdlc`
- Prefer the repo-local template at `<agent-sdlc>/templates/backlog-item.md`.
- If `<agent-sdlc>/config.yaml` or `config.yml` exists, use it as the source of truth for backlog-item storage, `name_pattern`, and document ID allocation.
- When repo-root SDLC config exists, locate the artifact whose `name` is `Backlog Item` or whose `short_name` is `backlog item`.
- Derive the storage directory as `<repo root>/<project.sdlc_root>/<artifact.location>`.
- Use `name_pattern` as the source of truth for the filename and backlog-item `id`.
- `name_pattern` must use brace-style placeholders only, must end in `.md`, and may use only required `seq` plus optional `version`.
- `seq` is the `.lock`-managed integer sequence and should normally be formatted as `{seq:05d}`.
- When `version` is used, prefer `project.version` from repo config. It must resolve to normalized `N.N`, such as `1.0`, without the leading `v`.
- If `name_pattern` contains placeholders beyond `seq`, such as `version`, the repo config or user instructions must define how those values are derived. Do not guess extra token values.
- Do not use mixed or printf-style tokens such as `{%03d}` in `name_pattern`.
- Frontmatter `id` must equal the rendered filename stem, without the `.md` extension.
- If `project.sdlc_root`, artifact `location`, or `name_pattern` is missing or ambiguous, stop and ask the user instead of guessing.
- If no repo-root SDLC config exists, store backlog items under `<agent-sdlc>/backlog/` and use `BLG-XXXX.md` filenames with 4-digit zero padding.
- If the repo has no Agent SDLC folder at all, create `<repo>/.agent-sdlc/backlog/`, use the bundled template, and report that you assumed the default layout.

## File Naming And IDs

- When repo-root SDLC config exists and a new backlog item file must be created, allocate the next document ID through `<artifact-dir>/.lock` instead of inventing filenames manually
- Create the `.lock` file if it does not exist
- Open or create `.lock` and acquire an exclusive lock before reading it. Never pre-read `.lock` before the exclusive lock is held.
- Treat `.lock` contents as the last allocated backlog-item sequence
- If the `.lock` file cannot be locked, wait 30 seconds and retry
- Try at most 3 times; after the third failure, ask the user to try again
- While holding the exclusive lock, read the last allocated ID, increment it to the next ID allowed by `name_pattern`, verify the rendered target path is still unused, write the new last ID back to `.lock`, flush it, and release the lock
- If the `.lock` file is empty, allocate the first valid ID for that pattern
- If no repo config exists, determine the next `BLG-XXXX` value from the highest existing `BLG-*.md` file in the backlog directory
- When repo config exists, any collision check and recompute must happen while the exclusive `.lock` is still held; do not release the lock and then re-scan

## Before Creating

- Search existing backlog items by title and key terms to avoid obvious duplicates
- If an existing item already covers the request, update that item instead of creating a new one
- If the overlap is partial, create a new item and cross-link the related backlog item in `links.depends_on` or `## Traceability`

## Authoring Rules

- Create from the repo-local template when present; otherwise use [references/backlog-item-template.md](references/backlog-item-template.md)
- `item_type` defaults:
  - `bug` for defects, regressions, broken behavior, or failing tests
  - `feature` for new user requests unless the user clearly asked for `refactor`, `spike`, or `chore`
- New items default to:
  - `status: proposed`
  - `priority: p2`
  - `risk_level: medium`
  - `owner: agent:<current-agent-name>`
- Default `owner` to the active agent, not `unassigned`
- If repo config lists agents and one matches the current agent name or session, use that exact configured agent name in `owner`
- If no better agent identity is available, use `agent:codex` or `agent:claude` based on the current provider
- Set `identified_by` from the source, usually `human:user` for direct chat requests
- Keep `source_refs` concise and traceable, for example `user chat 2026-04-02: export failed job list`
- Write concise, outcome-oriented `title` and `description`
- Do not put implementation design in the backlog item

## Temporary Traceability Rule

- Requirement links are preferred, but for now it is acceptable to log a user-reported bug or request before the requirement is traced
- When no requirement is available:
  - keep `links.requirements: []`
  - add a `source` row in `## Traceability`
  - note `requirement traceability pending` in the `Why Linked` column
  - preserve the triggering conversation, report, or incident in `source_refs`
- Do not invent `REQ-XXXX` ids

## Body Guidance

- `## Goal`: one short outcome paragraph or 2-4 short bullets
- `## Why This Exists`: identify who raised it, what triggered it, why it matters, and the expected outcome
- `## Traceability`: replace placeholders with concrete rows; when no requirement exists yet, use a row like `| source | user-chat-2026-04-02 | n/a | initial user request; requirement traceability pending |`
- `## Dependencies`: use `None` when there are no known dependencies or linked principles
- `## Done When`: 2-5 observable completion conditions, not implementation steps

## Workflow

1. Resolve the repo root, Agent SDLC folder, template source, and backlog directory.
2. If `<agent-sdlc>/config.yaml` or `config.yml` exists, read it and locate the backlog-item artifact definition before creating or validating files.
3. When repo config exists, derive the storage directory from `project.sdlc_root` plus the artifact `location`, and derive the filename and `id` from artifact `name_pattern`.
4. Search for an existing matching backlog item.
5. If updating, edit the existing file.
6. If creating, allocate the next document ID through the artifact `.lock` file when repo config exists by exclusively locking it before reading or updating it; otherwise allocate the next `BLG-XXXX` filename from the directory scan.
7. Fill the frontmatter and body from the template.
8. Save the file.
9. In the user response, report the file path, item id, item type, priority, owner, and whether requirement traceability is pending.
