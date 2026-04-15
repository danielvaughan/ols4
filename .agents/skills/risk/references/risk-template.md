---
id: "RSK-00001-v1.0"               # must match the rendered filename stem
kind: risk                          # canonical artifact kind
schema_version: 1
title: ""                           # short risk title
description: ""                     # 1-2 sentence summary
risk_category: technical            # technical | schedule | resource | dependency | quality | cost
status: open                        # open | mitigating | accepted | resolved | closed
likelihood: medium                  # low | medium | high
impact: medium                      # low | medium | high
severity: null                      # critical | major | moderate | minor — derived from likelihood × impact or set manually
affected_domains: []                # domains from .agent-sdlc/context/domains/ that this risk touches
owner: agent:name                   # default to the active agent
identified_by: human:name           # who discovered or reported the risk
created_at: YYYY-MM-DDTHH:MM:SSZ
updated_at: YYYY-MM-DDTHH:MM:SSZ
source_refs: []                     # PRD sections, benchmark data, external references — factual sources only
tags: []
links:
  requirements: []                  # traced requirements
  backlog_items: []                 # BLG items created to address or investigate this risk
  principles: []                    # related architecture principles
  related_risks: []                 # other RSK items with shared cause or impact
---

# {title}

<!--
  PURPOSE: Capture a factual risk identified from source documents, implementation findings,
           or technical analysis. Risks state FACTS and TENSIONS — not opinions or recommendations.
  LOCATION: <project.sdlc_root>/risk/<rendered-name-pattern>
  OWNER: Agents may draft risk items; humans triage, accept, or escalate them.

  RULES:
  - State only what source documents say. Do not add commentary, interpretation, or recommendations.
  - Cite specific PRD sections, benchmark data, or implementation findings as source_refs.
  - If the PRD itself provides a mitigation, capture it in "Source-Stated Mitigation" — do not invent mitigations.
  - Keep the risk item focused on ONE risk. If multiple risks are entangled, create separate items and cross-link via links.related_risks.
  - When a decision is made to act on a risk, create a BLG item and link it in links.backlog_items.
-->

## Factual Basis

<!--
  State ONLY what source documents say. No interpretation.
  Each bullet should be attributable to a specific source.
-->

- Source:
  - `<PRD section, implementation spec, benchmark data, agent finding, external reference>`
- What the source states:
  - `<verbatim or close-summary of the factual claim>`
- Relevant metrics or targets from source:
  - `<numbers, SLAs, targets, measurements — as stated>`

## Tension

<!--
  Identify the specific conflict between requirements, constraints, or known technical realities.
  Still factual — cite both sides. Do not editorialize.
-->

- Stated requirement:
  - `<what the PRD or requirement says must be achieved>`
- Constraining factor:
  - `<what makes the requirement difficult, risky, or potentially unachievable — with source>`

## Affected Domains

<!--
  List which context domains (from .agent-sdlc/context/domains/) this risk touches
  and what aspect of each domain is affected.
-->

- `<domain-name>` — `<what aspect is affected>`

## Source-Stated Mitigation

<!--
  Capture ONLY mitigations that the source document itself mentions.
  If the PRD or source says nothing about mitigating this risk, write "None stated in source."
-->

- `<mitigation from the source document, or "None stated in source.">`

## Traceability

| Link Type | Id | Link | Why Linked |
| --- | --- | --- | --- |
| `source` | `PRD §X` | `n/a` | `<what this traces to>` |

## Resolution Criteria

<!--
  Under what conditions is this risk considered resolved, accepted, or no longer applicable?
  These should be observable and testable.
-->

- `<observable condition>`
