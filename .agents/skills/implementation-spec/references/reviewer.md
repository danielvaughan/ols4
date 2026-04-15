# Reviewer Reference

Use this reference when reviewing an implementation spec against the current codebase.

## Review Goal

Review from the perspective of a junior engineer who must implement exactly what is written. The spec should be unambiguous, complete, and correct against the current codebase so no guessing is required.

## Review Workflow

1. Read the target implementation spec file or files completely.
2. If there is an index spec, read it first, then read every referenced module spec.
3. If `<repo root>/.agent-sdlc/config.yaml` exists, verify that the reviewed files live under the configured implementation-spec artifact directory, that top-level overview files match the configured `name_pattern`, that grouped child specs live under the correct same-stem folder, that the `name_pattern` uses only supported placeholders, and that any rendered version value uses `N.N` format.
4. Identify the modules, APIs, database objects, files, and phases mentioned in the spec.
5. Read the relevant source files to verify the spec against the current implementation and repository structure.
6. Use [review-checklist.md](review-checklist.md) to inspect the spec category by category.
7. Quote or reproduce the specific spec sentence or paragraph that has an issue, then place the review comment immediately below it.
8. In each review comment, explain what is wrong, missing, or unverifiable and why it blocks or risks implementation.
9. Use file references to the spec and to the source code where possible inside or directly after the inline comment.
10. Preserve existing comment history. Do not delete, rewrite, collapse, summarize away, or move prior review comments or author responses.
11. If an earlier comment needs correction, add a new inline follow-up comment that supersedes or clarifies it. Do not rewrite the earlier line.
12. If an issue requires human attention beyond the author agent, mark it with `[ESCALATE]`.
13. After the inline comments, add an `Escalated Items` section only when escalations exist.
14. If there are no findings, say so explicitly and then report any residual risks, unknowns, or validation gaps.
15. Use [review-output-template.md](review-output-template.md) when the user wants a structured review format.

## Required Review Areas

- Ambiguity: could a junior developer misread or interpret this in more than one way?
- Assumptions: does the spec leave any behavior, naming, workflow, or data rule unstated?
- Source-code correctness: do referenced modules, files, architecture boundaries, and existing behavior match the repo?
- File inventory: are all files to add and update listed, and are any listed files wrong or missing?
- API detail: are methods, paths, auth rules, parameters, request bodies, responses, validation, and error cases explicit?
- Database detail: are tables, columns, constraints, indexes, migrations, backfills, and rollback expectations precise?
- Phase quality: are phases sequenced, trackable, and executable without hidden dependencies?
- Acceptance criteria: are they observable and implementation-complete?
- Multi-module split: if the change spans multiple modules, is each module spec scoped correctly and is the index coherent?

## Output Rules

- Findings first, but present them inline beside the affected spec text unless the user explicitly asks for a separate summary.
- Be explicit about what is missing, wrong, or unverifiable.
- For each finding, explain why it blocks or risks implementation.
- Prefer concrete fixes or clarification requests over vague criticism.
- If a claim in the spec cannot be verified from the repo, say that clearly.
- If the spec references files or modules that do not exist, call that out explicitly.
- Place each comment immediately below the statement it targets, with no unrelated text in between.
- Do not restate every comment in the closing section.
- Never clean up prior comment history by deleting, collapsing, or rewriting existing comment threads.
