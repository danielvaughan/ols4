# Implementation Spec Review Checklist

Use this checklist after reading the spec and the relevant code.

## 1. Scope And Structure

- If `<repo root>/.agent-sdlc/config.yaml` exists, does the spec live under `<project.sdlc_root>/<artifact.location>`?
- If `<repo root>/.agent-sdlc/config.yaml` exists, do top-level overview filenames and top-level frontmatter `id` values match the configured `name_pattern`?
- If this is a grouped multi-file spec set, is there exactly one top-level overview file instead of a sibling `index.md`?
- If this is a grouped multi-file spec set, do child specs live under the folder named after the top-level filename stem?
- If this is a grouped multi-file spec set, do child specs use meaningful names such as `common.md`, `control-panel-api.md`, or `design.md`?
- If this is a grouped multi-file spec set, do child-spec frontmatter `id` values derive from the top-level `id` plus the child file stem?
- Does `name_pattern` use brace-style placeholders only?
- Does `name_pattern` use only supported placeholders: required `seq` and optional `version`?
- If `name_pattern` uses extra placeholders such as `{version}`, does the repo define how those values are assigned?
- If `version` is used, does the rendered filename use `vN.N` format?
- Does the rendered filename end in `.md`, and does frontmatter `id` equal the filename stem?
- If no repo-root SDLC config exists, is the spec file name prefixed with `impl-spec-`?
- Does the spec begin with the standard YAML frontmatter block?
- Are `id`, `backlog_id`, `owner`, `status`, `updated_at`, `module_scope`, `verification_mode`, and `links.backlog` populated and consistent with the document body?
- If multiple modules are involved, is there a separate spec per module plus an index?
- Does each module spec stay within that module's responsibility?
- Does the index describe the reading order and dependencies correctly?

## 2. Junior-Engineer Readability

- Could a junior developer implement each task without guessing?
- Are all domain terms, acronyms, and internal names clear from context?
- Are required decisions already made, or does the spec leave choices open?
- Are "update this logic" or "handle this case" style statements replaced with exact behavior?

## 3. Source-Code Alignment

- Do the referenced modules, folders, and files exist?
- Do the existing architecture boundaries in the code support the proposed changes?
- Does the spec place changes in the correct module or layer?
- Does the spec assume behavior that the current code does not have?
- Does it miss any current constraints already present in the code?

## 4. File Inventory

- Are all files to add listed?
- Are all existing files to update listed?
- Are there files mentioned in tasks but missing from the file list?
- Are any listed files unnecessary or incorrect?

## 5. API Detail

- For each changed API, are method and path explicit?
- Are auth requirements explicit?
- Are headers, path params, query params, and request body fields defined?
- Are validation rules explicit?
- Are success responses and error responses defined?
- Are edge cases, idempotency rules, or concurrency rules described when relevant?

## 6. Data Model And Schema

- Are table and column changes explicit?
- Are types, nullability, defaults, constraints, and indexes defined?
- Is migration order clear?
- Is backfill behavior clear?
- Is rollback behavior clear?
- Does the schema match the current DB access patterns in the code?

## 7. Phase Plan

- Does each phase have a clear goal?
- Are prerequisites explicit?
- Are tasks concrete and trackable?
- Are files touched listed for each phase?
- Does the sequence respect actual dependencies in the codebase?
- Is any phase too large or vague for a junior developer?

## 8. Acceptance Criteria

- Is each criterion observable?
- Does each criterion correspond to the tasks in the phase?
- Do the criteria prove the implementation is complete for that phase?
- Do any criteria depend on undefined behavior?

## 9. Missing Clarifications

- Does the spec rely on business rules not written down?
- Does the spec omit error handling details?
- Does the spec omit migration, rollout, or backward-compatibility behavior?
- Does the spec omit ownership of cross-module contracts?
- Does the spec leave naming decisions unresolved?

## 10. Final Review Decision

- Ready: no blocking ambiguity or correctness issue
- Needs clarification: missing detail or unverifiable assumptions block implementation
- Incorrect: the spec conflicts with the current source code or architecture

## 11. Comment History Integrity

- Are all prior reviewer comments and author responses still present inline?
- Has any comment thread been deleted, rewritten, collapsed, or moved away from the text it applies to?
- If an older comment was corrected or superseded, was that handled by adding a new follow-up line instead of rewriting history?
- Was the only allowed edit to an existing reviewer line a checkbox change from `[ ]` to `[x]`?

## 12. Escalation Check

- Does any issue require human review rather than just author-agent follow-up?
- Does any issue imply architecture, security, privacy, data-loss, rollout, or business-rule risk?
- Does any issue involve a cross-team contract or decision that the author agent should not make alone?
- If yes, mark the inline comment with `[ESCALATE]` and include it in the `Escalated Items` section.
