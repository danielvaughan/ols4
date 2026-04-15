# Project Rules and Conventions

## Agent Identity and Session Registration
- **CRITICAL**: At the start of every agent session, or any time the agent does not remember its own name with certainty, the agent MUST inspect `.agent-sdlc/config.yaml` when it exists, collect the existing `project.agents[*].name` values, suggest a name that does not duplicate an existing entry, and ask the user to confirm whether that suggested name is acceptable. The agent must not finalize or reuse a name without explicit user confirmation.
- **CRITICAL**: If `.agent-sdlc/config.yaml` does not exist yet, or if it does not contain any agent names, the agent should still suggest a reasonable name and ask the user to confirm it rather than asking the user to invent one from scratch.
- **CRITICAL**: The agent must know its own session id with certainty before writing documents, implementation specs, comments, or commit messages. If the session id cannot be determined from the current runtime, the agent MUST ask the user. Never invent or reuse an old session id.
- **CRITICAL**: Once the agent knows its name and session id, it must remember them for the rest of the current session.
- **CRITICAL**: After the agent knows its user-confirmed name and session id, it MUST ask the user to define the current session `work_boundaries` before making code or documentation changes outside `.agent-sdlc/`.
- **CRITICAL**: The agent may only add, update, or modify files inside the user-approved `work_boundaries`, except for files under `.agent-sdlc/`, which remain allowed for SDLC artifacts and session metadata.
- **CRITICAL**: If the agent needs to add, update, or modify any file outside the approved `work_boundaries`, it MUST stop and ask the user for explicit approval before proceeding.
- **CRITICAL**: After the agent knows its user-confirmed name and session id, it MUST check `.agent-sdlc/config.yaml` for session registration.
- If `.agent-sdlc/config.yaml` does not exist, lock the file and create it.
- If the file exists but `project.agents` is missing, add it.
- If the current `name + session_id + type` entry is not already present, append it under `project.agents`.
- If the current agent entry exists but `work_boundaries` is missing or different from the user-approved scope for the session, update `work_boundaries` under that same agent entry.
- The stored entry must use this format:
  ```yaml
  agents:
    - name: "<<user-confirmed name>>"
      session_id: "<<session id in uuid format>>"
      type: "Codex|Claude"
      work_boundaries:
        - "<<approved path 1>>"
        - "<<approved path 2>>"
  ```
- This is required because writing documents and commit metadata depends on the exact agent name and session id.
- **CRITICAL**: The session registration update itself does **not** require a `Bug/Backlog` ID.
- This exemption is intentionally narrow and applies only to:
  - writing or updating `.agent-sdlc/config.yaml` for the current session registration, and
  - the matching `AGENTS.md` rule change required to document this exemption.
- This exemption does **not** apply to any other code, config, or documentation changes.

## Git Workflow

### Commit Rules
- **CRITICAL**: ALWAYS commit changes immediately after making any code modifications. 
- **Important**: Whenever code changes are made, use `git status` to check which files changed
- Always commit changes with proper, descriptive commit messages
- **CRITICAL**: Every commit message must include:
  - `Bug/Backlog: <ID>`
  - `Author: <Name> (Codex-<session_id>|Claude-<session_id>)`
  - `Change Description: <summary>`
- **CRITICAL**: If the `Bug/Backlog` ID is not available, stop and ask the user before committing.
- **CRITICAL**: The agent may commit without a `Bug/Backlog` ID only when the user explicitly approves that exception for the current change.
- **CRITICAL**: Use a commit title plus the required metadata lines in the commit body.
- Example:
  ```bash
  git commit -m "<short summary>" \
    -m "Bug/Backlog: <ID>" \
    -m "Author: <Name> (Codex-<session_id>|Claude-<session_id>)" \
    -m "Change Description: <summary>"
  ```
- **Mandatory Workflow** (execute automatically after every code change):
  1. Make code changes
  2. Run `git status` to review changes
  3. Stage files with `git add`
  4. Commit with a descriptive title and a body that includes `Bug/Backlog`, `Author`, and `Change Description`
- **Never skip commits** - commit after every file modification, creation, or deletion



### No Hardcoding
- **CRITICAL**: This user HATES hardcoding. This applies to **both design and implementation** — specs, architecture diagrams, sink configs, Helm values, deployment scripts, and code must all avoid hardcoded values.
- **CRITICAL**: Do NOT hardcode values that could be derived from configuration, environment, or runtime context. This includes topic names, schema subject names, table names, URLs, ports, namespaces, replica counts, and any other value that may vary across environments or use cases.
- **CRITICAL**: When designing or writing code, always ask: "Is this value available from a config, env var, profile, or parameter already?" If yes, use that source. If not, make it configurable.
- **CRITICAL**: If the agent is unsure whether a value should be hardcoded or configurable, or if a hardcoded value seems unavoidable, **STOP and ask the user** before proceeding. Do not guess.
- This rule applies at every stage: implementation specs, architecture decisions, sink connector configs, Helm chart values, deploy scripts, and application code. A hardcoded value in a spec becomes a hardcoded value in code — catch it early.
- Example: a Kafka schema subject name should derive from the topic name (which comes from the profile), not be a hardcoded string like `"load_gen_transaction"`.

### Fail-Fast Coding Practice
- **CRITICAL**: Code must fail fast with a clear error message when something is wrong — never silently degrade or continue with wrong defaults.
- Validate configuration, required inputs, and preconditions at startup or at the earliest possible point. A service that crashes immediately with `"HELM_CHART_REGISTRY is not configured"` saves hours compared to one that starts "successfully" but silently uses a wrong default that only manifests as a cryptic failure downstream.
- Prefer direct attribute access (`settings.field`) over `getattr(settings, "field", fallback)` — the former fails immediately if the field is missing; the latter hides the problem behind a silent default.
- When writing error messages, include the actual value and what was expected (e.g., `"Expected HELM_CHART_REGISTRY to start with oci://, got: ''"`) so the agent or developer can fix it without additional investigation.

### Dependency Management
- **CRITICAL**: ALWAYS use `uv` for dependency management (e.g., `uv add`, `uv remove`, `uv sync`, `uv run`)
- Never use `pip install`, `pip uninstall`, or raw `pip` commands directly
- Use `uv run` to execute Python scripts and tools within the project environment

### Unit Tests
- **CRITICAL**: Do not run unit tests unless the user explicitly asks.
- **CRITICAL**: Do not create, update, or delete unit tests unless the user explicitly asks.

### Import Statements
- **CRITICAL**: All import statements must be grouped at the top of the file
- Only use inline imports if there is a specific reason (e.g., circular dependency, conditional import)
- Import order: standard library, third-party, local imports
- Group imports with blank lines between sections

### Logging Best Practices
- **Exception Logging**: Inside `except` blocks, always use `logger.exception()` instead of `logger.error()`
  - `logger.exception()` automatically includes the traceback in the log output
  - This provides full context for debugging without additional code
  - Example: `logger.exception("Failed to process file %s", filename)`
- **Never use f-strings in logger statements**
  - ❌ Wrong: `logger.info(f"Processing {filename}")`
  - ✅ Correct: `logger.info("Processing %s", filename)`
  - Reason: String formatting is deferred until the log is actually written, improving performance when logging is disabled or filtered


## Environment Variable Management
- All environment variables must be centralized in `apps/<app-name>/labs/utils/configurations.py`
- Never use `os.environ`, `os.getenv`, or `python-dotenv` directly — always use `python-decouple` and import from `configurations.py`
- Whenever a variable is added or updated in `.env`, sync to `.env.example` (secrets blanked out)
- **CRITICAL**: `.env` files are gitignored and must NEVER be added to git (they contain secrets and local-only values). Only `.env.example` should be committed.
- **When adding a new env var**, verify the full wiring path end-to-end:
  1. Env var defined in `.env` / `.env.example` / K8S manifest / Helm values
  2. Read in `configurations.py` via `config()` into the `Settings` dataclass
  3. Consumed by the target code (e.g., provisioner, worker, API) through the `Settings` instance
  - If any link is missing (e.g., env var set in K8S but field missing from `Settings`), code that uses `getattr(settings, "field", default)` will silently return the hardcoded default instead of failing. This wastes debugging time — the env var appears correctly set but has no effect. Prefer accessing `settings.field` directly (which fails fast with `AttributeError`) over `getattr` with a fallback default.

## Document Folder
- Use `.docs-temp/` as the default location for documents **only when**:
  - The user does not specify where to store the document, AND
  - The agent skill being used does not specify a location
- If the user or skill specifies a location, use that location instead.
- **IMPORTANT**: Python files (.py) for generating documents should also follow the same rule.
- This keeps temporary documentation and documentation generation scripts organized and separate from project code.
- **Mandatory Workflow** for creating documents (when `.docs-temp/` is the target):
  1. Create the `.docs-temp/` folder at the **repo root** if it doesn't exist
  2. Create the document inside `.docs-temp/`
  3. If creating a Python script to generate documents, also place it in `.docs-temp/`
  4. Use descriptive filenames (e.g., `.docs-temp/analysis-report.md`, `.docs-temp/impl-spec-BL-026.md`, `.docs-temp/generate_report.py`)
- **CRITICAL**: All `.docs-temp/` folders are consolidated at the repo root (`/.docs-temp/`). Do NOT create `.docs-temp/` inside submodules or app directories.


## Deployment and Infrastructure Portability
- When fixing deployment issues, setup scripts, or infrastructure configuration, the solution **must be portable across environments** (local/dev, staging, production).
- **Do not hardcode** hostnames, ports, credentials, registry URLs, namespace names, or any environment-specific values in code or scripts.
- **Externalize** all environment-specific values to configuration files (Helm `values.yaml`, env vars, K8S ConfigMaps/Secrets).
- Each environment provides its own overrides (e.g., `values-staging.yaml`, `values-prod.yaml`, or `--set` at deploy time).
- Before committing a deployment fix, ask: "Would this break if deployed to a different cluster or registry?" If yes, make it configurable.

## Whenever ONLY "1" is entered
- **1**: if ONLY "1" is entered, that means
"Commit all changed files with proper message and push to remote"
Steps:
1. Check git status to see all changed files
2. Review the diff to understand what changed
3. Commit all changed files with an appropriate, descriptive commit title and a body that includes `Bug/Backlog`, `Author`, and `Change Description`
4. Push the changes to the remote repository
5. Verify the push was successful
