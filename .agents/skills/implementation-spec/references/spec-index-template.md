---
# When <repo root>/.agent-sdlc/config.yaml exists, store this file under
# <repo root>/<project.sdlc_root>/<artifact.location>.
# Allocate both this top-level overview filename and `id` from the artifact
# `name_pattern` using <artifact-dir>/.lock. In a grouped spec set, store child
# specs under the sibling directory named after this file stem.
# Supported placeholders in `name_pattern`: required {seq:05d}, optional {version} where version is N.N without leading v.
id: "<allocated-id>"                # filename stem, e.g. IML-00002-v1.0 for file IML-00002-v1.0.md
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

# Implementation Spec Index

Use this template for the top-level overview file in a grouped multi-file spec set. Do not name the file `index.md`; the allocated top-level `name_pattern` file is the overview.

## Summary

- Change name:
- Goal:
- Why this work is split:

## Module Breakdown

| Module | Spec File | Purpose | Depends On |
| --- | --- | --- | --- |
| `<module>` | `<top-level-id>/<child-file>.md` | `<what it covers>` | `<dependency or none>` |
| `<module>` | `<top-level-id>/<child-file>.md` | `<what it covers>` | `<dependency or none>` |

## Recommended Reading Order

1. `<top-level-id>/<child-file>.md`
2. `<top-level-id>/<child-file>.md`
3. `<top-level-id>/<child-file>.md`

## Cross-Module Contracts

- `<contract name>`:
  - Producer:
  - Consumer:
  - Source of truth:
  - Notes:

## Phase Overview

| Phase | Module | Goal | Blocking Dependency |
| --- | --- | --- | --- |
| `P1` | `<module>` | `<goal>` | `<dependency or none>` |
| `P2` | `<module>` | `<goal>` | `<dependency or none>` |

## Global Clarifications Required

- `GCR-1`: `<question or None>`
- `GCR-2`: `<question or None>`

## Completion Criteria

- Every impacted module has its own implementation spec.
- Cross-module dependencies are explicit.
- The module specs can be executed independently in the documented order.
