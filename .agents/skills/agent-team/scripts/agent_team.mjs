#!/usr/bin/env node

import fs from "node:fs";
import fsp from "node:fs/promises";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { spawn } from "node:child_process";

const APP_SERVER_HOST = "127.0.0.1";
const START_TIMEOUT_MS = 15_000;
const DEFAULT_TIMEOUT_MS = 120_000;

function usage() {
  console.error(`Usage:
  node scripts/agent_team.mjs --agent <name> --message <text> [options]
  node scripts/agent_team.mjs --list-agents [options]

Options:
  --agent <name>           Configured agent name from .agent-sdlc/config.yaml
  --message <text>         Delegated prompt for the selected agent
  --list-agents            Print configured agents instead of sending a prompt
  --cwd <path>             Optional working directory override
  --app-server-url <url>   Optional ws:// URL for an already-running app server
  --timeout-ms <ms>        Optional overall timeout, default ${DEFAULT_TIMEOUT_MS}
  --json                   Print structured JSON output
  --help                   Show this help
`);
}

function parseArgs(argv) {
  const args = {
    agent: null,
    json: false,
    cwd: null,
    appServerUrl: null,
    listAgents: false,
    message: null,
    timeoutMs: DEFAULT_TIMEOUT_MS,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    switch (arg) {
      case "--agent":
        args.agent = argv[++i] ?? null;
        break;
      case "--message":
        args.message = argv[++i] ?? null;
        break;
      case "--cwd":
        args.cwd = argv[++i] ?? null;
        break;
      case "--app-server-url":
        args.appServerUrl = argv[++i] ?? null;
        break;
      case "--timeout-ms":
        args.timeoutMs = Number(argv[++i] ?? DEFAULT_TIMEOUT_MS);
        break;
      case "--json":
        args.json = true;
        break;
      case "--list-agents":
        args.listAgents = true;
        break;
      case "--help":
        usage();
        process.exit(0);
        break;
      default:
        throw new Error(`Unknown argument: ${arg}`);
    }
  }

  if (!Number.isFinite(args.timeoutMs) || args.timeoutMs <= 0) {
    throw new Error("--timeout-ms must be a positive number");
  }

  if (!args.listAgents) {
    if (!args.agent) {
      throw new Error("--agent is required");
    }
    if (!args.message) {
      throw new Error("--message is required");
    }
  }

  return args;
}

function stripQuotes(value) {
  const trimmed = value.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

function parseWsUrl(url) {
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error(`Invalid app server URL: ${url}`);
  }

  if (parsed.protocol !== "ws:") {
    throw new Error(`Unsupported app server protocol: ${parsed.protocol}`);
  }
  if (!parsed.hostname || !parsed.port) {
    throw new Error(`App server URL must include host and port: ${url}`);
  }

  return {
    host: parsed.hostname,
    port: Number(parsed.port),
    url: parsed.toString(),
  };
}

function readJsonFile(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return null;
  }
}

function isTcpReachable(host, port, timeoutMs = 400) {
  return new Promise((resolve) => {
    const socket = net.createConnection({ host, port });
    const finish = (result) => {
      socket.removeAllListeners();
      socket.destroy();
      resolve(result);
    };

    socket.setTimeout(timeoutMs);
    socket.once("connect", () => finish(true));
    socket.once("error", () => finish(false));
    socket.once("timeout", () => finish(false));
  });
}

async function chooseFreePort(host) {
  const server = net.createServer();
  return await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, host, () => {
      const address = server.address();
      server.close((closeErr) => {
        if (closeErr) {
          reject(closeErr);
          return;
        }
        if (!address || typeof address === "string") {
          reject(new Error("Failed to allocate a TCP port"));
          return;
        }
        resolve(address.port);
      });
    });
  });
}

function findAgentSdlcRoot(startDir) {
  let current = path.resolve(startDir);
  while (true) {
    const candidate = path.join(current, ".agent-sdlc");
    if (fs.existsSync(candidate) && fs.statSync(candidate).isDirectory()) {
      return candidate;
    }
    const parent = path.dirname(current);
    if (parent === current) {
      return null;
    }
    current = parent;
  }
}

function resolveProjectState(startDir) {
  const agentSdlcRoot = findAgentSdlcRoot(startDir);
  if (!agentSdlcRoot) {
    throw new Error("Could not find .agent-sdlc in the current directory or its parents");
  }

  const configCandidates = [
    path.join(agentSdlcRoot, "config.yaml"),
    path.join(agentSdlcRoot, "config.yml"),
  ];
  const configPath = configCandidates.find((candidate) => fs.existsSync(candidate));
  if (!configPath) {
    throw new Error(`Could not find config.yaml under ${agentSdlcRoot}`);
  }

  return {
    agentSdlcRoot,
    configPath,
    projectRoot: path.dirname(agentSdlcRoot),
  };
}

function parseConfiguredAgents(configPath) {
  const lines = fs.readFileSync(configPath, "utf8").split(/\r?\n/);
  const agents = [];
  let inAgents = false;
  let current = null;
  let readingBoundaries = false;

  const pushCurrent = () => {
    if (current?.name) {
      current.workBoundaries = current.workBoundaries || [];
      agents.push(current);
    }
    current = null;
    readingBoundaries = false;
  };

  for (const rawLine of lines) {
    const line = rawLine.replace(/\s+#.*$/, "");
    if (!inAgents) {
      if (/^\s{2}agents:\s*$/.test(line)) {
        inAgents = true;
      }
      continue;
    }

    if (/^\s{2}[A-Za-z0-9_-]+\s*:/.test(line) && !/^\s{2}agents:\s*$/.test(line)) {
      break;
    }

    const nameMatch = line.match(/^\s{4}-\s+name:\s*(.+?)\s*$/);
    if (nameMatch) {
      pushCurrent();
      current = {
        name: stripQuotes(nameMatch[1]),
        sessionId: null,
        type: null,
        workBoundaries: [],
      };
      continue;
    }

    if (!current) {
      continue;
    }

    const sessionMatch = line.match(/^\s{6}session_id:\s*(.+?)\s*$/);
    if (sessionMatch) {
      current.sessionId = stripQuotes(sessionMatch[1]);
      readingBoundaries = false;
      continue;
    }

    const typeMatch = line.match(/^\s{6}type:\s*(.+?)\s*$/);
    if (typeMatch) {
      current.type = stripQuotes(typeMatch[1]);
      readingBoundaries = false;
      continue;
    }

    if (/^\s{6}work_boundaries:\s*$/.test(line)) {
      readingBoundaries = true;
      continue;
    }

    if (readingBoundaries) {
      const boundaryMatch = line.match(/^\s{8}-\s*(.+?)\s*$/);
      if (boundaryMatch) {
        current.workBoundaries.push(stripQuotes(boundaryMatch[1]));
        continue;
      }
    }

    if (/^\s{6}[A-Za-z0-9_-]+\s*:/.test(line)) {
      readingBoundaries = false;
    }
  }

  pushCurrent();
  return agents.filter((agent) => agent.name && agent.sessionId);
}

function resolveTargetAgent(agents, name) {
  const matches = agents.filter((agent) => agent.name === name);
  if (matches.length === 0) {
    const configured = agents.map((agent) => agent.name).join(", ");
    throw new Error(
      configured
        ? `Agent "${name}" is not configured in .agent-sdlc/config.yaml. Configured agents: ${configured}`
        : "No configured agents were found in .agent-sdlc/config.yaml"
    );
  }
  if (matches.length > 1) {
    throw new Error(`Agent "${name}" is defined multiple times in .agent-sdlc/config.yaml`);
  }
  return matches[0];
}

function buildBoundaryLines(agent, projectRoot) {
  if (!agent.workBoundaries.length) {
    return ["- No explicit work boundaries were configured."];
  }

  return agent.workBoundaries.map((boundary) => {
    if (boundary.startsWith("/")) {
      return `- ${boundary}`;
    }
    return `- ${boundary} (relative to project root ${projectRoot})`;
  });
}

function buildMessage(userMessage, cwdOverride, agent, projectState) {
  const cwdInstruction = cwdOverride
    ? `Use this working folder for this session: ${cwdOverride}. Do not switch to a different working folder unless explicitly instructed.`
    : "Use the same working folder already associated with this thread. Do not switch to a different working folder unless explicitly instructed.";

  return [
    `You are the configured agent "${agent.name}" from ${projectState.configPath}.`,
    "Honor only these approved work boundaries for this task:",
    ...buildBoundaryLines(agent, projectState.projectRoot),
    "Do not add, update, or delete files outside those boundaries unless the user explicitly approves it.",
    cwdInstruction,
    "",
    userMessage,
  ].join("\n");
}

function resolveRuntimePaths(baseDir) {
  const projectRoot = findAgentSdlcRoot(baseDir);
  if (projectRoot) {
    return {
      statePath: path.join(projectRoot, "runtime", "codex-app-server.json"),
      logPath: path.join(projectRoot, "logs", "codex-app-server.log"),
    };
  }

  const codexHome = process.env.CODEX_HOME || path.join(os.homedir(), ".codex");
  return {
    statePath: path.join(codexHome, "runtime", "codex-app-server.json"),
    logPath: path.join(codexHome, "log", "codex-app-server.log"),
  };
}

async function ensureDir(dirPath) {
  await fsp.mkdir(dirPath, { recursive: true });
}

async function waitForServer(url, timeoutMs) {
  const { host, port } = parseWsUrl(url);
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await isTcpReachable(host, port, 400)) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 125));
  }
  throw new Error(`Timed out waiting for Codex app server at ${url}`);
}

async function loadReachableStateUrl(statePath) {
  const state = readJsonFile(statePath);
  if (!state?.url) {
    return null;
  }
  try {
    const { host, port, url } = parseWsUrl(state.url);
    if (await isTcpReachable(host, port, 400)) {
      return url;
    }
  } catch {
    return null;
  }
  return null;
}

async function startLocalAppServer(runtimePaths, spawnCwd) {
  await ensureDir(path.dirname(runtimePaths.statePath));
  await ensureDir(path.dirname(runtimePaths.logPath));

  const port = await chooseFreePort(APP_SERVER_HOST);
  const url = `ws://${APP_SERVER_HOST}:${port}`;
  const logFd = fs.openSync(runtimePaths.logPath, "a");

  const child = spawn("codex", ["app-server", "--listen", url], {
    cwd: spawnCwd,
    detached: true,
    stdio: ["ignore", logFd, logFd],
  });
  child.unref();
  fs.closeSync(logFd);

  try {
    await waitForServer(url, START_TIMEOUT_MS);
  } catch (error) {
    try {
      process.kill(child.pid);
    } catch {
      // ignore
    }
    throw error;
  }

  const state = {
    pid: child.pid,
    url,
    log_path: runtimePaths.logPath,
  };
  await fsp.writeFile(runtimePaths.statePath, `${JSON.stringify(state, null, 2)}\n`, "utf8");
  return url;
}

async function ensureAppServerUrl(options) {
  if (options.appServerUrl) {
    return parseWsUrl(options.appServerUrl).url;
  }

  if (process.env.CODEX_APP_SERVER_URL) {
    return parseWsUrl(process.env.CODEX_APP_SERVER_URL).url;
  }

  const runtimePaths = resolveRuntimePaths(options.cwd || process.cwd());
  const persistedUrl = await loadReachableStateUrl(runtimePaths.statePath);
  if (persistedUrl) {
    return persistedUrl;
  }

  return await startLocalAppServer(runtimePaths, options.cwd || process.cwd());
}

function extractAgentMessageText(item) {
  if (!item) return "";
  if (typeof item.text === "string" && item.text.trim()) {
    return item.text;
  }
  if (Array.isArray(item.content)) {
    return item.content
      .map((part) => {
        if (typeof part === "string") return part;
        if (part && typeof part.text === "string") return part.text;
        if (part && typeof part.value === "string") return part.value;
        return "";
      })
      .join("");
  }
  return "";
}

async function sendPrompt(options, agent, projectState) {
  const appServerUrl = await ensureAppServerUrl(options);
  const output = {
    agent: agent.name,
    appServerUrl,
    sessionId: agent.sessionId,
    workBoundaries: agent.workBoundaries,
  };
  const effectiveMessage = buildMessage(options.message, options.cwd, agent, projectState);

  return await new Promise((resolve, reject) => {
    const ws = new WebSocket(appServerUrl);
    const pending = new Map();
    let completed = false;
    let finalText = "";
    let turnId = null;
    let timeoutHandle = null;

    const finish = (result) => {
      if (completed) return;
      completed = true;
      clearTimeout(timeoutHandle);
      try {
        ws.close();
      } catch {
        // ignore
      }
      resolve(result);
    };

    const fail = (error) => {
      if (completed) return;
      completed = true;
      clearTimeout(timeoutHandle);
      try {
        ws.close();
      } catch {
        // ignore
      }
      reject(error);
    };

    const resetTimeout = () => {
      clearTimeout(timeoutHandle);
      timeoutHandle = setTimeout(() => {
        fail(new Error("Timed out waiting for Codex app-server response"));
      }, options.timeoutMs);
    };

    const send = (payload) => {
      ws.send(JSON.stringify(payload));
    };

    const request = (id, method, params = {}) =>
      new Promise((resolveRequest, rejectRequest) => {
        pending.set(id, { resolve: resolveRequest, reject: rejectRequest, method });
        send({ id, method, params });
      });

    ws.addEventListener("open", async () => {
      resetTimeout();
      try {
        await request(1, "initialize", {
          clientInfo: {
            name: "agent_team",
            title: "Agent Team",
            version: "0.1.0",
          },
        });
        send({ method: "initialized", params: {} });

        const resumeParams = {
          threadId: agent.sessionId,
          approvalPolicy: "never",
          sandbox: "danger-full-access",
        };
        if (options.cwd) {
          resumeParams.cwd = options.cwd;
        }
        await request(2, "thread/resume", resumeParams);

        const turnParams = {
          threadId: agent.sessionId,
          input: [{ type: "text", text: effectiveMessage }],
          approvalPolicy: "never",
          sandboxPolicy: { type: "dangerFullAccess" },
        };
        if (options.cwd) {
          turnParams.cwd = options.cwd;
        }
        const turnStart = await request(3, "turn/start", turnParams);
        turnId = turnStart?.turn?.id ?? turnId;
      } catch (error) {
        fail(error);
      }
    });

    ws.addEventListener("message", (event) => {
      resetTimeout();
      let message;
      try {
        message = JSON.parse(event.data.toString());
      } catch (error) {
        fail(new Error(`Invalid JSON from app server: ${error.message}`));
        return;
      }

      if (Object.prototype.hasOwnProperty.call(message, "id")) {
        const entry = pending.get(message.id);
        if (!entry) {
          return;
        }
        pending.delete(message.id);
        if (message.error) {
          entry.reject(new Error(JSON.stringify(message.error)));
        } else {
          entry.resolve(message.result || {});
        }
        return;
      }

      if (message.method === "turn/started" && message.params?.turn?.id) {
        turnId = message.params.turn.id;
        return;
      }

      if (message.method === "item/agentMessage/delta") {
        const delta = message.params?.delta ?? message.params?.text ?? "";
        if (typeof delta === "string") {
          finalText += delta;
        }
        return;
      }

      if (message.method === "item/completed") {
        const item = message.params?.item;
        if (item?.type === "agentMessage") {
          if (!finalText.trim()) {
            finalText = extractAgentMessageText(item);
          }
          finish({
            ...output,
            turnId,
            text: finalText.trim(),
          });
        }
        return;
      }

      if (message.method === "turn/completed") {
        finish({
          ...output,
          turnId,
          text: finalText.trim(),
        });
        return;
      }

      if (message.method === "turn/failed" || message.method === "error") {
        fail(new Error(JSON.stringify(message)));
      }
    });

    ws.addEventListener("error", () => {
      fail(new Error(`WebSocket connection failed for ${appServerUrl}`));
    });

    ws.addEventListener("close", () => {
      if (!completed) {
        finish({
          ...output,
          turnId,
          text: finalText.trim(),
        });
      }
    });
  });
}

function formatAgents(agents) {
  return agents.map((agent) => ({
    name: agent.name,
    sessionId: agent.sessionId,
    type: agent.type,
    workBoundaries: agent.workBoundaries,
  }));
}

async function main() {
  try {
    const options = parseArgs(process.argv.slice(2));
    const projectState = resolveProjectState(options.cwd || process.cwd());
    const agents = parseConfiguredAgents(projectState.configPath);

    if (options.listAgents) {
      const result = formatAgents(agents);
      if (options.json) {
        console.log(JSON.stringify(result, null, 2));
        return;
      }
      for (const agent of result) {
        console.log(`${agent.name} (${agent.sessionId})`);
        for (const boundary of agent.workBoundaries) {
          console.log(`  - ${boundary}`);
        }
      }
      return;
    }

    const agent = resolveTargetAgent(agents, options.agent);
    const result = await sendPrompt(options, agent, projectState);
    if (options.json) {
      console.log(JSON.stringify(result, null, 2));
      return;
    }
    console.log(result.text);
  } catch (error) {
    console.error(error.message || String(error));
    process.exit(1);
  }
}

await main();
