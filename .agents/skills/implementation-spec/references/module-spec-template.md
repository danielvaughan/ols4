---
# When <repo root>/.agent-sdlc/config.yaml exists, store this file under
# <repo root>/<project.sdlc_root>/<artifact.location> for a standalone spec,
# or under <top-level-id>/<child-name>.md for a grouped child spec.
# Allocate the top-level filename and top-level `id` from the artifact
# `name_pattern` using <artifact-dir>/.lock. Child specs do not consume
# additional IDs.
# Supported placeholders in `name_pattern`: required {seq:05d}, optional {version} where version is N.N without leading v.
id: "<allocated-id-or-derived-child-id>" # e.g. IML-00001-v1.0 or IML-00040-v1.0/agent-harness
kind: implementation-spec           # canonical artifact kind
schema_version: 1
title: ""                           # display title
description: ""                     # 1-2 sentence summary for previews and queues
status: draft                       # draft | in_review | approved | in_progress | done | stale | cancelled
backlog_id: "BLG-0001"              # parent backlog item
priority: p2                        # p0 | p1 | p2 | p3
owner: agent:name                   # drafting or current owning agent
created_at: YYYY-MM-DDTHH:MM:SSZ
updated_at: YYYY-MM-DDTHH:MM:SSZ
module_scope: []                    # logical modules/components touched; keep tight for parallel-work overlap detection
verification_mode: local_integration # local_integration | local_e2e | contract | benchmark | manual
tags: []
links:
  requirements: []                  # e.g. [REQ-0003]
  principles: []                    # e.g. [ARC-0002]
  backlog: ["BLG-0001"]
---

# <Module Name> Implementation Spec

## Summary

- Problem:
- Goal:
- In scope:
- Out of scope:

## Related Specs

- `<path or none>`

## Clarifications Required

- `CR-1`: `<question or None>`
- `CR-2`: `<question or None>`

If this section is not empty, every affected task or phase must clearly state whether it is blocked.

## Existing Code Touchpoints

- `<existing file or module>`: `<why it matters>`
- `<existing file or module>`: `<why it matters>`

## Files To Add

- `<path>`: `<purpose>`
- `<path>`: `<purpose>`

## Files To Update

- `<path>`: `<change summary>`
- `<path>`: `<change summary>`

## Library And Framework Decisions

- Reuse:
  - `<library or framework>`: `<why it is the preferred mature option>`
- New dependency:
  - `<package name or None>`: `<reason, maintenance status, and why alternatives were rejected>`
- Rejected options:
  - `<option>`: `<why not chosen>`

## Functional Requirements

- `FR-1`: `<explicit behavior>`
- `FR-2`: `<explicit behavior>`
- `FR-3`: `<explicit behavior>`

## API Contract

Use this section when the module exposes or changes HTTP APIs.

### Endpoint: `<short name>`

- Purpose:
- Method:
- Path:
- Authentication:
- Required headers:
  - `<header>`: `<value or rule>`
- Path parameters:
  - `<name>`:
    - Type:
    - Required:
    - Rules:
- Query parameters:
  - `<name>`:
    - Type:
    - Required:
    - Default:
    - Rules:
- Request body:
  - Content type:
  - Required:
  - Fields:
    - `<field>`:
      - Type:
      - Required:
      - Rules:
      - Example:
- Success response:
  - Status code:
  - Content type:
  - Fields:
    - `<field>`:
      - Type:
      - Rules:
      - Example:
- Error responses:
  - `<status code>`:
    - Trigger:
    - Response body:
      - `<field>`: `<type and meaning>`
- Idempotency or concurrency rules:
- Notes:

Repeat the endpoint subsection for every API that is added or changed.

If the module does not expose HTTP APIs, replace this section with an equally precise contract for queues, events, cron jobs, CLI commands, or internal service boundaries.

## Data Model And DB Schema

### Schema Changes

| Object | Change Type | Details |
| --- | --- | --- |
| `<table or view>` | `create | alter | drop | none` | `<columns, constraints, indexes>` |
| `<table or view>` | `create | alter | drop | none` | `<columns, constraints, indexes>` |

### SQL Or Migration Detail

```sql
-- Add precise DDL or migration pseudocode here.
```

### Data Backfill And Rollback

- Backfill steps:
  - `<step>`
- Rollback expectations:
  - `<step>`
- Deployment ordering constraints:
  - `<step>`

## Phase Plan

### Phase 1: <name>

- Goal:
- Prerequisites:
- Tasks:
  - `P1-T1`: `<trackable task>`
  - `P1-T2`: `<trackable task>`
- Files touched:
  - `<path>`
  - `<path>`
- Acceptance criteria:
  - `<observable outcome>`
  - `<observable outcome>`

### Phase 2: <name>

- Goal:
- Prerequisites:
- Tasks:
  - `P2-T1`: `<trackable task>`
  - `P2-T2`: `<trackable task>`
- Files touched:
  - `<path>`
  - `<path>`
- Acceptance criteria:
  - `<observable outcome>`
  - `<observable outcome>`

Add more phases only when needed. Keep them ordered and executable.

## Risks And Operational Notes

- Risk:
  - `<risk>`
- Mitigation:
  - `<mitigation>`
- Monitoring or rollout note:
  - `<note>`

## Completion Criteria

- The listed files are fully implemented.
- The contract and schema changes match the spec.
- Each phase acceptance criterion is satisfied.
- No unresolved ambiguity remains for in-scope work.
