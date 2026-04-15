# Implementation Spec Review Output Template

Use this format when the user wants a structured review, but keep each comment attached to the specific spec statement it critiques.

## Inline Review Format

> `<spec sentence or short paragraph>`
> [ ] [`<agent-name>` (Codex: `<session-id>`)] [`<YYYY-MM-DDTHH:MM:SSZ>`]: `<detailed review comment explaining what is missing, wrong, or unverifiable, why it matters, and what must be clarified or corrected. Include spec/source file references when useful.>`

For critical issues that require human attention:

> `<spec sentence or short paragraph>`
> [ ] [ESCALATE] [`<agent-name>` (Codex: `<session-id>`)] [`<YYYY-MM-DDTHH:MM:SSZ>`]: `<critical issue that requires human attention, including why the author agent should not resolve it alone.>`

Repeat for each finding. Keep the comment immediately below the quoted statement it addresses.
The author agent may change `[ ]` to `[x]` once a comment has been addressed.

## Author Response Format

When the author addresses a review comment, respond immediately below the reviewer line using the same wrapper.

> [x] [`<agent-name>` (Codex: `<session-id>`)] [`<YYYY-MM-DDTHH:MM:SSZ>`]: `Addressed. <brief description of the spec change>`

If the issue is not fully resolved yet:

> [ ] [`<agent-name>` (Codex: `<session-id>`)] [`<YYYY-MM-DDTHH:MM:SSZ>`]: `<what was updated and what remains unresolved>`

If the author needs human input:

> [ ] [ESCALATE] [`<agent-name>` (Codex: `<session-id>`)] [`<YYYY-MM-DDTHH:MM:SSZ>`]: `<why the issue cannot be resolved safely without human attention>`

## Escalated Items

- `<spec location or topic>`: `<brief human-facing summary of the escalated issue and why it needs attention>`

Only include escalated items here. Do not repeat every comment.

## Optional Closing Summary

- Decision: `Ready | Needs clarification | Incorrect`
- Main risks:
- Unverified areas:
