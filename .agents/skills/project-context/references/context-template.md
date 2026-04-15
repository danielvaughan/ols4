# Project Context Template

Use this template when generating or refreshing `.agent-sdlc/context/` from a repository. Adapt the file set to the repo size, but keep the structure stable enough that later agents can find the same concepts quickly.

## Recommended File Set

- `README.md`: entry point, project summary, reading order, and index of context docs
- `repo-map.md`: top-level tree and the role of each important path
- `system-context.md`: boundary of the current repo and its relationship to external systems
- `runtime-flow.md`: the primary workflow, feedback loops, and major hand-offs
- `source-map.md`: where future agents should read first for each topic
- `domains/<domain-name>.md`: one file per stable responsibility area

## Template: `README.md`

```md
# Project Context

## Summary

- Project:
  - `<name>`
- Primary purpose:
  - `<what the project is trying to do>`
- What this repo contains:
  - `<main local deliverables>`
- What this repo does not contain:
  - `<important boundary, if the real system lives elsewhere>`

## Reading Order

1. `<first file to read>`
2. `<second file to read>`
3. `<third file to read>`

## Context Files

| File | Purpose |
| --- | --- |
| `repo-map.md` | `<why it matters>` |
| `system-context.md` | `<why it matters>` |
| `runtime-flow.md` | `<why it matters>` |
| `source-map.md` | `<why it matters>` |
| `domains/<domain>.md` | `<why it matters>` |

## Current Snapshot

- Key domains:
  - `<domain-a>`
  - `<domain-b>`
- Primary external systems:
  - `<system or None>`
- Primary operator or user flow:
  - `<one sentence summary>`

## Sources

- `<repo path>`
- `<repo path>`
```

## Template: `repo-map.md`

```md
# Repo Map

## Top-Level Paths

| Path | Kind | Purpose | Notes |
| --- | --- | --- | --- |
| `<path>` | `<dir/file>` | `<what it contains>` | `<why it matters>` |

## Key Files

| File | Why It Matters |
| --- | --- |
| `<path>` | `<source-of-truth role>` |

## What Is Not Here

- `<important omitted runtime, service, repo, or config>`

## Sources

- `<repo path>`
- `<repo path>`
```

## Template: `system-context.md`

```md
# System Context

## Boundary

- Local repo scope:
  - `<what is implemented or packaged here>`
- External systems or repos:
  - `<what is referenced but not local>`

## Local Components

| Component | Purpose | Key Files |
| --- | --- | --- |
| `<component>` | `<responsibility>` | `<paths>` |

## External Dependencies

| External System | Relationship | Evidence |
| --- | --- | --- |
| `<system>` | `<how the repo depends on it>` | `<path or doc>` |

## Interfaces And Hand-Offs

- `<input -> component -> output>`

## Constraints

- `<constraint>`

## Open Questions

- `<question or None>`

## Sources

- `<repo path>`
- `<repo path>`
```

## Template: `runtime-flow.md`

```md
# Runtime Flow

## Primary Flow

1. `<step 1>`
2. `<step 2>`
3. `<step 3>`

## Feedback Or Validation Loops

1. `<loop description>`

## Supporting Flows

- `<secondary flow>`

## Failure Or Break Conditions

- `<failure or ambiguity>`

## Sources

- `<repo path>`
- `<repo path>`
```

## Template: `source-map.md`

```md
# Source Map

| Topic | Source Files | Why These Are Source Of Truth |
| --- | --- | --- |
| `<topic>` | `<path>, <path>` | `<why these files matter>` |

## Notes

- `<reading advice or None>`
```

## Template: `domains/<domain-name>.md`

The filename stem is the domain id that later `requirement` and `risk` artifacts should use in `affected_domains`.

```md
# <Domain Name>

## Purpose

- `<why this domain exists>`

## Scope

- In scope:
  - `<what belongs here>`
- Out of scope:
  - `<what does not belong here>`

## Key Files

| Path | Role |
| --- | --- |
| `<path>` | `<what this file contributes>` |

## Responsibilities

- `<responsibility>`
- `<responsibility>`

## Inputs And Outputs

- Inputs:
  - `<input>`
- Outputs:
  - `<output>`

## Dependencies And Interfaces

- `<dependency or interface>`

## Invariants Or Assumptions

- `<important fact that should stay true>`

## Open Questions

- `<question or None>`

## Sources

- `<repo path>`
- `<repo path>`
```
