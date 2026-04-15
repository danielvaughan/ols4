---
name: agent-team
description: Use when you need to assign work to another configured repo agent, especially to ask an agent to investigate, implement a code fix, or continue a bounded task. Only target agents declared under `.agent-sdlc/config.yaml`; do not send work to arbitrary session ids.
---

# Agent Team

Use this skill to dispatch work to another configured agent in the current repository.

## When To Use

- Assign a task to another configured agent
- Ask another configured agent to implement a code fix
- Ask another configured agent to investigate or continue work within its assigned boundaries

## Rules

- Only target agents declared in `.agent-sdlc/config.yaml`.
- Do not send prompts to arbitrary session ids or ad hoc agent names.
- Prefer another agent, not yourself, when the goal is delegation.
- Treat the target agent's `work_boundaries` in `.agent-sdlc/config.yaml` as the hard limit for the delegated task.
- Keep the delegated prompt concrete and bounded.

## Workflow

1. Resolve `scripts/agent_team.mjs` relative to this skill directory.
2. If you need to inspect available workers first, run `--list-agents`.
3. Pass the target configured agent with `--agent`.
4. Pass the delegated task with `--message`.
5. By default, do not pass `--cwd`; this keeps the resumed thread on its existing working folder.
6. Only pass `--cwd` when the user explicitly wants a working-directory override.
7. Prefer `--json` when you need structured output for follow-up processing.

## Commands

List configured agents:

```bash
node scripts/agent_team.mjs --list-agents
```

Assign a task to a configured agent:

```bash
node scripts/agent_team.mjs \
  --agent Rook \
  --message "Fix the controller issue assigned to you and report the result."
```

Request structured output:

```bash
node scripts/agent_team.mjs \
  --agent Kestrel \
  --message "Investigate the failing controller path and summarize the root cause." \
  --json
```

## Behavior

- Reads `.agent-sdlc/config.yaml` or `.agent-sdlc/config.yml` from the current directory or its parents.
- Resolves the target agent by configured `name`.
- Uses only the configured `session_id` for the selected agent.
- Injects the selected agent's configured `work_boundaries` into the delegated prompt.
- Reuses `--app-server-url` when provided.
- Otherwise reuses `CODEX_APP_SERVER_URL` when set.
- Otherwise looks for `.agent-sdlc/runtime/codex-app-server.json` in the current directory or its parents.
- If no reachable app server is found, starts a local loopback Codex app server in the background and persists its state.
- Calls `thread/resume` with:
  - `approvalPolicy: "never"`
  - `sandbox: "danger-full-access"`
- Calls `turn/start` with:
  - `approvalPolicy: "never"`
  - `sandboxPolicy: { "type": "dangerFullAccess" }`
