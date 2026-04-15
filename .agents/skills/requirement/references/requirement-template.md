---
id: "REQ-00001-v1.0"                # must match the rendered filename stem
kind: requirement                    # canonical artifact kind
schema_version: 1
title: ""                            # short requirement title
description: ""                      # 1-2 sentence summary for previews and views
type: functional                     # functional | non-functional
nf_subtype: null                     # non-functional subtype (null when type is functional): performance | quality | cost | compliance | operational | security | reliability
status: draft                        # draft | accepted | waived | superseded
priority: p2                         # p0 | p1 | p2 | p3
owner: human:name                    # accountable human or drafting agent
identified_by: agent:name            # who extracted or discovered this requirement
created_at: YYYY-MM-DDTHH:MM:SSZ
updated_at: YYYY-MM-DDTHH:MM:SSZ
source_refs: []                      # e.g. ["PRD §4.2", "PRD §6 Table: Aggregate Metrics"]
tags: []
affected_domains: []                 # domains from .agent-sdlc/context/domains/
links:
  requirements: []                   # related or superseded requirements
  principles: []                     # relevant architecture principles
  backlog_items: []                  # linked backlog items that implement this requirement
  risks: []                          # linked risk items
---

# {title}

<!--
  PURPOSE: Atomic statement of intended behavior, quality, or constraint.
  LOCATION: <project.sdlc_root>/requirement/<rendered-name-pattern>
  OWNER: Agents may draft from source material; humans accept, refine, waive, or supersede.

  RULES:
  - Keep the requirement atomic — one testable statement per file.
  - Capture expected behavior or quality, not implementation design.
  - Functional and non-functional requirements both use this template.
  - Non-functional requirements MUST set nf_subtype.
  - State what the source says. Do not infer requirements the source does not state.
  - If a requirement is ambiguous in the source, capture the ambiguity in Open Questions.
  - Link backlog items here, but do not decompose work inside this file.
-->

## Statement

<!--
  Write the requirement as a direct, testable statement.
  Use "shall" for mandatory requirements, "should" for desirable.
  Examples:
  - The adjudication agent shall produce a decision within 150ms at P99 latency.
  - The open-source model decision quality (F1) shall be within 5% of the commercial model.
-->

## Source

- Origin:
  - `<PRD section, table, or specific paragraph>`
- Verbatim or close summary:
  - `<what the source actually states, quoted or closely paraphrased>`
- Why this requirement exists:
  - `<business, user, operational, or compliance reason as stated in source>`
- Confidence:
  - `<confirmed | inferred | needs validation>`

## Acceptance Notes

- Observable success condition:
  - `<what would count as satisfied — measurable where possible>`
- Boundary or threshold:
  - `<specific numeric target, limit, or range>`
- Edge cases:
  - `<special constraints, exceptions, or limits>`

## Open Questions

- `RQ-1`: `<question or None>`
