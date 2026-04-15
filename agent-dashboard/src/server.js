import fs from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import { execFile } from "node:child_process";
import { fileURLToPath } from "node:url";

import { inspectRepository } from "./agentsdlc.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = path.join(__dirname, "..", "public");
const port = Number(process.env.PORT ?? 4310);

const server = http.createServer(async (request, response) => {
  try {
    const url = new URL(request.url ?? "/", `http://${request.headers.host}`);

    if (request.method === "GET" && url.pathname === "/api/health") {
      return sendJson(response, 200, { ok: true });
    }

    if (request.method === "GET" && url.pathname === "/favicon.ico") {
      response.writeHead(204);
      response.end();
      return;
    }

    if (request.method === "POST" && url.pathname === "/api/repositories/load") {
      const body = await readJsonBody(request);
      const payload = await inspectRepository(body.repoPath);

      // Strip bodies from the list response to keep it small.
      const stripBody = ({ body: _body, ...rest }) => rest;
      const lightArtifacts = {};
      for (const [key, val] of Object.entries(payload.artifacts ?? {})) {
        lightArtifacts[key] = { ...val, items: val.items.map(stripBody) };
      }

      const light = {
        ...payload,
        implementationSpecs: payload.implementationSpecs.map(stripBody),
        artifacts: lightArtifacts
      };
      return sendJson(response, 200, light);
    }

    if (request.method === "POST" && url.pathname === "/api/spec/body") {
      const body = await readJsonBody(request);
      const payload = await inspectRepository(body.repoPath);
      const spec = payload.implementationSpecs.find((s) => s.id === body.specId);

      if (!spec) {
        return sendJson(response, 404, { error: "Spec not found." });
      }

      return sendJson(response, 200, { id: spec.id, body: spec.body });
    }

    if (request.method === "POST" && url.pathname === "/api/artifact/body") {
      const body = await readJsonBody(request);
      const payload = await inspectRepository(body.repoPath);
      const artifactType = payload.artifacts?.[body.artifactType];

      if (!artifactType) {
        return sendJson(response, 404, { error: "Artifact type not found." });
      }

      const item = artifactType.items.find((i) => i.id === body.itemId);

      if (!item) {
        return sendJson(response, 404, { error: "Item not found." });
      }

      return sendJson(response, 200, { id: item.id, body: item.body });
    }

    if (request.method === "POST" && url.pathname === "/api/search") {
      const body = await readJsonBody(request);
      const q = (body.query || "").trim();
      if (!q) return sendJson(response, 200, { results: [], engine: "none" });

      // Try QMD first, fall back to basic text search
      // Map scope to QMD collection filter path
      const scopeFilter = body.scope === "context" ? "context/" : null;
      try {
        const qmdResults = await qmdSearch(q, body.collection, scopeFilter);
        return sendJson(response, 200, { results: qmdResults, engine: "qmd" });
      } catch (qmdErr) {
        console.error("QMD error:", qmdErr.message);
        // Fallback: basic text search across loaded artifacts
        const payload = await inspectRepository(body.repoPath);
        const lq = q.toLowerCase();
        const results = [];
        for (const [key, at] of Object.entries(payload.artifacts ?? {})) {
          for (const item of at.items) {
            const haystack = [item.id, item.title, item.description, ...(item.tags || [])].join(" ").toLowerCase();
            if (haystack.includes(lq)) {
              results.push({ file: item.relativePath, id: item.id, title: item.title, status: item.status, artifactType: key, score: 1 });
            }
          }
        }
        return sendJson(response, 200, { results, engine: "text" });
      }
    }

    if (request.method === "GET") {
      return serveStaticAsset(response, url.pathname);
    }

    sendJson(response, 405, { error: "Method not allowed." });
  } catch (error) {
    const statusCode = error.statusCode ?? 500;
    sendJson(response, statusCode, {
      error: error.message ?? "Unexpected server error."
    });
  }
});

server.listen(port, () => {
  console.log(`Agent SDLC app running at http://localhost:${port}`);
});

function qmdSearch(query, collection, pathFilter) {
  return new Promise((resolve, reject) => {
    const args = ["search", query, "--files", "-n", "20"];
    if (collection) { args.push("-c", collection); }
    // pathFilter not directly supported by qmd CLI, we filter results after

    const qmdPath = process.env.QMD_PATH || "qmd";
    const env = { ...process.env, PATH: `${process.env.HOME}/.bun/bin:${process.env.PATH}`, NO_COLOR: "1" };

    execFile(qmdPath, args, { timeout: 30000, env, encoding: "utf8" }, (err, stdout) => {
      if (err) return reject(err);
      // --files outputs CSV lines: docid,score,file
      let results = stdout.split("\n")
        .map((line) => line.trim())
        .filter((line) => line.includes(","))
        .map((line) => {
          const [docid, score, ...rest] = line.split(",");
          return { docid, score: parseFloat(score) || 0, file: rest.join(",") };
        })
        .filter((r) => r.file);
      // Apply path filter if specified
      if (pathFilter) {
        const pf = pathFilter.replace(/^qmd:\/\/[^/]+\//, "");
        results = results.filter((r) => {
          const f = r.file.replace(/^qmd:\/\/[^/]+\//, "");
          return f.startsWith(pf);
        });
      }
      resolve(results);
    });
  });
}

async function readJsonBody(request) {
  const chunks = [];

  for await (const chunk of request) {
    chunks.push(chunk);
  }

  const raw = Buffer.concat(chunks).toString("utf8").trim();

  if (!raw) {
    return {};
  }

  try {
    return JSON.parse(raw);
  } catch {
    const error = new Error("Request body must be valid JSON.");
    error.statusCode = 400;
    throw error;
  }
}

async function serveStaticAsset(response, requestPath) {
  const normalizedPath = requestPath === "/" ? "/index.html" : requestPath;
  const filePath = path.normalize(path.join(publicDir, normalizedPath));

  if (!filePath.startsWith(publicDir)) {
    return sendJson(response, 403, { error: "Forbidden path." });
  }

  try {
    const contents = await fs.readFile(filePath);
    response.writeHead(200, {
      "Content-Type": contentTypeForPath(filePath)
    });
    response.end(contents);
  } catch {
    sendJson(response, 404, { error: "Not found." });
  }
}

function contentTypeForPath(filePath) {
  if (filePath.endsWith(".html")) {
    return "text/html; charset=utf-8";
  }

  if (filePath.endsWith(".js")) {
    return "text/javascript; charset=utf-8";
  }

  if (filePath.endsWith(".css")) {
    return "text/css; charset=utf-8";
  }

  if (filePath.endsWith(".json")) {
    return "application/json; charset=utf-8";
  }

  return "text/plain; charset=utf-8";
}

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8"
  });
  response.end(JSON.stringify(payload));
}
