---
id: "BLG-00001"                    # must match the rendered filename stem
kind: backlog-item                 # canonical artifact kind
schema_version: 1
title: ""                          # short work item title
description: ""                    # 1-2 sentence summary for previews and backlog views
item_type: feature                 # feature | bug | refactor | spike | chore
status: proposed                   # proposed | ready | in_progress | blocked | done | cancelled
priority: p2                       # p0 | p1 | p2 | p3
risk_level: medium                 # low | medium | high
owner: agent:name                  # default to the active agent
identified_by: human:name          # who discovered, reported, or proposed the item
blocked_reason: null               # set when status: blocked
created_at: YYYY-MM-DDTHH:MM:SSZ
updated_at: YYYY-MM-DDTHH:MM:SSZ
source_refs: []                    # PRD sections, conversation notes, incidents, prior backlog items, reverse-engineering notes
tags: []
links:
  requirements: []                 # preferred; may stay empty temporarily when the requirement is not yet traced
  principles: []                   # relevant architecture principles
  impl_spec: []                    # usually one linked implementation spec id
  depends_on: []                   # backlog item dependencies
---

# {title}

<!--
  PURPOSE: Canonical unit of planned work.
  LOCATION: <project.sdlc_root>/<artifact.location>/<rendered-name-pattern> when repo config defines a backlog-item artifact; otherwise backlog/BLG-XXXX.md.
  OWNER: Agents may draft or split backlog items; humans prioritize, merge, split, or defer them.

  RULES:
  - Requirement traceability is preferred.
  - If a user-reported bug or request has no linked requirement yet, leave `links.requirements: []`, keep `source_refs` populated, and mark traceability as pending.
  - Keep the backlog item small enough for one implementation spec in v1.
  - If the item becomes too broad, split the backlog item before writing or expanding the implementation spec.
  - Do not put detailed implementation design here; that belongs in the implementation spec.
  - Capture who identified the item and summarize the source context that led to it.
-->

## Goal

<!--
  Describe what this item will accomplish.
  Keep it outcome-oriented, not code-oriented.
-->

## Why This Exists

- Identified by:
  - `<human, agent, monitoring, review, or other source>`
- Trigger or source:
  - `<PRD, conversation, bug report, previous backlog item, reverse engineering, incident>`
- Key points summarized from source:
  - `<short distilled notes from the discussion or original material>`
- Problem or opportunity:
  - `<why this work matters>`
- Expected outcome:
  - `<what changes when this item is complete>`

## Traceability

| Link Type | Id | Link | Why Linked |
| --- | --- | --- | --- |
| `source` | `user-chat-YYYY-MM-DD` | `n/a` | `initial request; requirement traceability pending` |
| `requirement` | `REQ-XXXX` | `[REQ-XXXX](../requirements/REQ-XXXX.md)` | `<coverage reason>` |
| `backlog-item` | `BLG-XXXX` | `[BLG-XXXX](./BLG-XXXX.md)` | `<upstream or source relationship>` |

## Dependencies

- Depends on backlog items:
  - `<BLG-XXXX or None>`
- Related architecture principles:
  - `<ARC-XXXX or None>`
- Related bug, incident, or source note:
  - `<reference or None>`

## Done When

- `<observable completion condition>`
- `<observable completion condition>`
- `<observable completion condition>`
