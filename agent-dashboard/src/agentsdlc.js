import fs from "node:fs/promises";
import path from "node:path";

import { parse as parseYaml } from "yaml";

const AGENT_SDLC_DIR_NAMES = [".agent-sdlc", ".agentsdlc"];
const CONFIG_FILE_NAMES = ["config.yaml", "config.yml"];
const DEFAULT_FOLDER_STRUCTURE = {
  requirements: ["requirements"],
  architecturePrinciples: ["architecture-principles"],
  backlogItems: ["backlog"],
  implementationSpecs: ["impl-specs", "specs"]
};

export async function inspectRepository(inputPath) {
  const repositoryPath = resolveRepositoryPath(inputPath);
  const repositoryStat = await statOrNull(repositoryPath);

  if (!repositoryStat) {
    throw createInputError(`Repository path does not exist: ${repositoryPath}`);
  }

  if (!repositoryStat.isDirectory()) {
    throw createInputError(`Repository path is not a directory: ${repositoryPath}`);
  }

  const { agentSdlcPath, detectedAsFolder, warnings } =
    await resolveAgentSdlcPath(repositoryPath);

  const loadedConfig = await loadAgentSdlcConfig(agentSdlcPath);
  const discoveredSpecs = await discoverImplementationSpecs(
    agentSdlcPath,
    loadedConfig.folderStructure
  );

  // Discover all artifact types from config
  const artifactTypes = buildArtifactTypes(loadedConfig);
  const artifacts = {};
  for (const at of artifactTypes) {
    const discovered = await discoverArtifacts(agentSdlcPath, at);
    artifacts[at.key] = { ...at, items: discovered.items, warnings: discovered.warnings };
  }

  // Auto-detect context/ folder
  const contextDir = path.join(agentSdlcPath, "context");
  const contextStat = await statOrNull(contextDir);
  if (contextStat?.isDirectory()) {
    const contextFiles = await collectMarkdownFiles(contextDir);
    if (contextFiles.length > 0) {
      const contextItems = await Promise.all(
        contextFiles.map(async (filePath) => {
          const raw = await fs.readFile(filePath, "utf8");
          const stat = await fs.stat(filePath);
          const { frontmatter, body } = splitFrontmatter(raw);
          const data = parseFrontmatter(frontmatter);
          const relPath = path.relative(agentSdlcPath, filePath);
          // Derive a category from parent folder (e.g. "domains/agentic-engine" → "Domain")
          const parts = path.relative(contextDir, filePath).split(path.sep);
          const category = parts.length > 1 ? parts[0] : "general";
          return {
            id: path.basename(filePath, ".md"),
            title: data.title ?? extractHeading(body) ?? path.basename(filePath, ".md"),
            description: data.description ?? extractSummary(body),
            status: category,
            kind: "context",
            priority: null,
            owner: null,
            backlogId: null,
            implSpecs: [],
            tags: normalizeStringArray(data.tags),
            moduleScope: [],
            updatedAt: null,
            fileMtime: stat.mtime.toISOString(),
            links: data.links ?? {},
            frontmatter: data,
            filePath,
            relativePath: relPath,
            body
          };
        })
      );
      contextItems.sort((a, b) => b.fileMtime.localeCompare(a.fileMtime));
      artifacts["context"] = {
        key: "context",
        name: "Project Context",
        shortName: "context",
        location: "context",
        items: contextItems,
        warnings: []
      };
    }
  }

  return {
    repositoryPath,
    agentSdlcPath,
    detectedAsFolder,
    configPath: loadedConfig.configPath,
    configLoaded: loadedConfig.configLoaded,
    configRaw: loadedConfig.configRaw,
    folderStructure: loadedConfig.folderStructure,
    folderStructureSource: loadedConfig.folderStructureSource,
    warnings: [...warnings, ...loadedConfig.warnings, ...discoveredSpecs.warnings],
    implementationSpecs: discoveredSpecs.specs,
    specSource: discoveredSpecs.source,
    artifacts
  };
}

function buildArtifactTypes(loadedConfig) {
  const configArtifacts = loadedConfig.configRaw?.project?.artifacts ?? loadedConfig.configRaw?.artifacts ?? [];
  if (!Array.isArray(configArtifacts) || configArtifacts.length === 0) {
    return [];
  }
  return configArtifacts.map((a) => ({
    key: slugify(a.short_name || a.name || "unknown"),
    name: a.name || "Unknown",
    shortName: a.short_name || a.name || "unknown",
    location: (a.location || "").replace(/^\.?[\\/]/, "").replace(/[\\/]+$/, ""),
    namePattern: a.name_pattern || null
  })).filter((a) => a.location);
}

function slugify(str) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

async function discoverArtifacts(agentSdlcPath, artifactType) {
  const dirPath = path.join(agentSdlcPath, artifactType.location);
  const dirStat = await statOrNull(dirPath);
  if (!dirStat?.isDirectory()) {
    return { items: [], warnings: [`Directory not found: ${artifactType.location}`] };
  }

  // Only collect root-level .md files — subdirectories are child/module specs
  const files = await collectRootMarkdownFiles(dirPath);
  if (files.length === 0) {
    return { items: [], warnings: [] };
  }

  const items = await Promise.all(
    files.map(async (filePath) => {
      const raw = await fs.readFile(filePath, "utf8");
      const stat = await fs.stat(filePath);
      const { frontmatter, body } = splitFrontmatter(raw);
      const data = parseFrontmatter(frontmatter);
      return {
        id: data.id ?? path.basename(filePath, ".md"),
        title: data.title ?? extractHeading(body) ?? path.basename(filePath, ".md"),
        description: data.description ?? extractSummary(body),
        status: data.status ?? "unknown",
        kind: data.kind ?? artifactType.shortName,
        priority: data.priority ?? null,
        owner: data.owner ?? null,
        backlogId: data.backlog_id ?? firstArrayValue(data.links?.backlog),
        implSpecs: normalizeStringArray(data.links?.impl_specs ?? data.links?.impl_spec),
        tags: normalizeStringArray(data.tags),
        moduleScope: normalizeStringArray(data.module_scope),
        updatedAt: data.updated_at ?? data.updated ?? data.created_at ?? data.created ?? null,
        fileMtime: stat.mtime.toISOString(),
        links: data.links ?? {},
        frontmatter: data,
        filePath,
        relativePath: path.relative(agentSdlcPath, filePath),
        body
      };
    })
  );

  items.sort((a, b) => b.fileMtime.localeCompare(a.fileMtime));
  return { items, warnings: [] };
}

function resolveRepositoryPath(inputPath) {
  if (typeof inputPath !== "string" || inputPath.trim() === "") {
    throw createInputError("Repository path is required.");
  }

  return path.resolve(inputPath.trim());
}

async function resolveAgentSdlcPath(repositoryPath) {
  const warnings = [];
  const folderName = path.basename(repositoryPath);

  if (AGENT_SDLC_DIR_NAMES.includes(folderName)) {
    return {
      agentSdlcPath: repositoryPath,
      detectedAsFolder: folderName,
      warnings
    };
  }

  for (const candidateName of AGENT_SDLC_DIR_NAMES) {
    const candidatePath = path.join(repositoryPath, candidateName);
    const candidateStat = await statOrNull(candidatePath);

    if (candidateStat?.isDirectory()) {
      if (candidateName === ".agentsdlc") {
        warnings.push(
          "Detected legacy folder name '.agentsdlc'. The app also supports '.agent-sdlc'."
        );
      }

      return {
        agentSdlcPath: candidatePath,
        detectedAsFolder: candidateName,
        warnings
      };
    }
  }

  throw createInputError(
    `No Agent SDLC folder found under ${repositoryPath}. Expected one of: ${AGENT_SDLC_DIR_NAMES.join(", ")}.`
  );
}

async function loadAgentSdlcConfig(agentSdlcPath) {
  for (const configFileName of CONFIG_FILE_NAMES) {
    const configPath = path.join(agentSdlcPath, configFileName);
    const configStat = await statOrNull(configPath);

    if (!configStat?.isFile()) {
      continue;
    }

    const raw = await fs.readFile(configPath, "utf8");
    const parsedConfig = parseYamlSafely(raw);
    const folderStructure = resolveFolderStructure(parsedConfig);
    const folderStructureSource =
      folderStructure.__source === "config" ? "config" : "defaults";

    const warnings = [];
    if (folderStructureSource === "defaults") {
      warnings.push(
        `Loaded ${configFileName}, but no folder structure was defined. Using default folder mapping.`
      );
    }

    return {
      configPath,
      configLoaded: true,
      configRaw: parsedConfig,
      folderStructure: stripInternalFields(folderStructure),
      folderStructureSource,
      warnings
    };
  }

  return {
    configPath: null,
    configLoaded: false,
    configRaw: null,
    folderStructure: DEFAULT_FOLDER_STRUCTURE,
    folderStructureSource: "defaults",
    warnings: [
      "No config.yaml found in the Agent SDLC folder. Using default folder mapping."
    ]
  };
}

function resolveFolderStructure(config) {
  const artifactConfiguredStructure = resolveFolderStructureFromArtifacts(config);
  const configuredStructure = {
    requirements: readConfiguredDirectories(config, [
      ["structure", "requirements"],
      ["structure", "requirement"],
      ["paths", "requirements"],
      ["folders", "requirements"],
      ["artifacts", "requirement", "directory"],
      ["artifacts", "requirement", "directories"]
    ]),
    architecturePrinciples: readConfiguredDirectories(config, [
      ["structure", "architecture_principles"],
      ["structure", "architecturePrinciples"],
      ["structure", "architecture"],
      ["paths", "architecture_principles"],
      ["paths", "architecturePrinciples"],
      ["folders", "architecture_principles"],
      ["folders", "architecturePrinciples"],
      ["artifacts", "architecture_principle", "directory"],
      ["artifacts", "architecture_principle", "directories"]
    ]),
    backlogItems: readConfiguredDirectories(config, [
      ["structure", "backlog_items"],
      ["structure", "backlogItems"],
      ["structure", "backlog"],
      ["paths", "backlog_items"],
      ["paths", "backlogItems"],
      ["paths", "backlog"],
      ["folders", "backlog_items"],
      ["folders", "backlogItems"],
      ["folders", "backlog"],
      ["artifacts", "backlog_item", "directory"],
      ["artifacts", "backlog_item", "directories"]
    ]),
    implementationSpecs: readConfiguredDirectories(config, [
      ["structure", "implementation_specs"],
      ["structure", "implementationSpecs"],
      ["structure", "impl_specs"],
      ["structure", "implSpecs"],
      ["paths", "implementation_specs"],
      ["paths", "implementationSpecs"],
      ["paths", "impl_specs"],
      ["paths", "implSpecs"],
      ["folders", "implementation_specs"],
      ["folders", "implementationSpecs"],
      ["folders", "impl_specs"],
      ["folders", "implSpecs"],
      ["artifacts", "implementation_spec", "directory"],
      ["artifacts", "implementation_spec", "directories"]
    ]).concat(artifactConfiguredStructure.implementationSpecs)
  };

  configuredStructure.requirements.push(...artifactConfiguredStructure.requirements);
  configuredStructure.architecturePrinciples.push(
    ...artifactConfiguredStructure.architecturePrinciples
  );
  configuredStructure.backlogItems.push(...artifactConfiguredStructure.backlogItems);

  dedupeConfiguredStructure(configuredStructure);

  const hasConfiguredStructure = Object.values(configuredStructure).some(
    (value) => value.length > 0
  );

  if (!hasConfiguredStructure) {
    return { ...DEFAULT_FOLDER_STRUCTURE, __source: "defaults" };
  }

  return {
    requirements:
      configuredStructure.requirements.length > 0
        ? configuredStructure.requirements
        : DEFAULT_FOLDER_STRUCTURE.requirements,
    architecturePrinciples:
      configuredStructure.architecturePrinciples.length > 0
        ? configuredStructure.architecturePrinciples
        : DEFAULT_FOLDER_STRUCTURE.architecturePrinciples,
    backlogItems:
      configuredStructure.backlogItems.length > 0
        ? configuredStructure.backlogItems
        : DEFAULT_FOLDER_STRUCTURE.backlogItems,
    implementationSpecs:
      configuredStructure.implementationSpecs.length > 0
        ? configuredStructure.implementationSpecs
        : DEFAULT_FOLDER_STRUCTURE.implementationSpecs,
    __source: "config"
  };
}

function resolveFolderStructureFromArtifacts(config) {
  const artifacts =
    normalizeArtifactEntries(config?.project?.artifacts).concat(
      normalizeArtifactEntries(config?.artifacts)
    );

  const structure = {
    requirements: [],
    architecturePrinciples: [],
    backlogItems: [],
    implementationSpecs: []
  };

  for (const artifact of artifacts) {
    const candidateKind = classifyArtifactKind(artifact);
    const locations = normalizeDirectoryEntries(
      artifact.location ?? artifact.locations ?? artifact.directory ?? artifact.directories
    );

    if (!candidateKind || locations.length === 0) {
      continue;
    }

    structure[candidateKind].push(...locations);
  }

  dedupeConfiguredStructure(structure);
  return structure;
}

function normalizeArtifactEntries(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item) => item && typeof item === "object");
}

function classifyArtifactKind(artifact) {
  const label = [artifact.name, artifact.short_name, artifact.kind, artifact.type]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (!label) {
    return null;
  }

  if (
    label.includes("implementation spec") ||
    label.includes("implementation specification") ||
    label.includes("impl spec") ||
    label.includes("impl-spec")
  ) {
    return "implementationSpecs";
  }

  if (label.includes("backlog")) {
    return "backlogItems";
  }

  if (label.includes("requirement")) {
    return "requirements";
  }

  if (
    label.includes("architecture principle") ||
    label.includes("architecture-principle") ||
    label.includes("principle")
  ) {
    return "architecturePrinciples";
  }

  return null;
}

function dedupeConfiguredStructure(structure) {
  for (const key of Object.keys(structure)) {
    structure[key] = Array.from(new Set(structure[key]));
  }
}

function readConfiguredDirectories(config, candidatePaths) {
  for (const candidatePath of candidatePaths) {
    const value = getNestedValue(config, candidatePath);
    const directories = normalizeDirectoryEntries(value);

    if (directories.length > 0) {
      return directories;
    }
  }

  return [];
}

function normalizeDirectoryEntries(value) {
  if (!value) {
    return [];
  }

  const asArray = Array.isArray(value) ? value : [value];

  return asArray
    .map((item) => String(item).trim())
    .map((item) => item.replace(/^\.?[\\/]/, "").replace(/[\\/]+$/, ""))
    .filter(Boolean);
}

function getNestedValue(value, segments) {
  return segments.reduce((current, segment) => {
    if (!current || typeof current !== "object") {
      return undefined;
    }

    return current[segment];
  }, value);
}

function stripInternalFields(folderStructure) {
  const { __source: _ignored, ...publicFolderStructure } = folderStructure;
  return publicFolderStructure;
}

async function discoverImplementationSpecs(agentSdlcPath, folderStructure) {
  const warnings = [];
  let chosenSource = null;

  const directories = folderStructure.implementationSpecs.map((directory) => ({
    directory,
    mode: directory === "specs" ? "legacy" : "canonical"
  }));

  for (const source of directories) {
    const sourcePath = path.join(agentSdlcPath, source.directory);
    const sourceStat = await statOrNull(sourcePath);

    if (!sourceStat?.isDirectory()) {
      continue;
    }

    const files = await collectRootMarkdownFiles(sourcePath);

    if (files.length === 0) {
      continue;
    }

    chosenSource = { ...source, sourcePath, files };

    if (source.mode === "legacy") {
      warnings.push(
        "Using legacy 'specs/' directory because no canonical 'impl-specs/' directory with markdown files was found."
      );
    }

    if (source.mode === "canonical") {
      break;
    }
  }

  if (!chosenSource) {
    return {
      source: null,
      specs: [],
      warnings: [
        "No implementation specs found. Create markdown files under '.agent-sdlc/impl-specs' or '.agentsdlc/impl-specs'."
      ]
    };
  }

  const specs = await Promise.all(
    chosenSource.files.map((filePath) =>
      readImplementationSpec({
        filePath,
        agentSdlcPath,
        sourceMode: chosenSource.mode
      })
    )
  );

  specs.sort((a, b) => (b.fileMtime || "").localeCompare(a.fileMtime || ""));

  return {
    source: {
      mode: chosenSource.mode,
      directory: chosenSource.sourcePath,
      count: specs.length
    },
    specs,
    warnings
  };
}

async function collectRootMarkdownFiles(rootPath) {
  const files = [];
  const entries = await fs.readdir(rootPath, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isFile() && entry.name.endsWith(".md")) {
      files.push(path.join(rootPath, entry.name));
    }
  }
  return files;
}

async function collectMarkdownFiles(rootPath) {
  const files = [];
  const entries = await fs.readdir(rootPath, { withFileTypes: true });

  for (const entry of entries) {
    const entryPath = path.join(rootPath, entry.name);

    if (entry.isDirectory()) {
      files.push(...(await collectMarkdownFiles(entryPath)));
      continue;
    }

    if (!entry.isFile()) {
      continue;
    }

    if (entry.name.endsWith(".md")) {
      files.push(entryPath);
    }
  }

  return files;
}

async function readImplementationSpec({ filePath, agentSdlcPath, sourceMode }) {
  const raw = await fs.readFile(filePath, "utf8");
  const stat = await fs.stat(filePath);
  const { frontmatter, body } = splitFrontmatter(raw);
  const data = parseFrontmatter(frontmatter);

  return {
    id: data.id ?? path.basename(filePath, ".md"),
    title: data.title ?? extractHeading(body) ?? path.basename(filePath, ".md"),
    description: data.description ?? extractSummary(body),
    status: data.status ?? "unknown",
    kind: data.kind ?? data.type ?? inferKindFromPath(filePath),
    sourceMode,
    filePath,
    relativePath: path.relative(agentSdlcPath, filePath),
    backlogId: data.backlog_id ?? firstArrayValue(data.links?.backlog),
    requirements: normalizeStringArray(data.links?.requirements),
    principles: normalizeStringArray(data.links?.principles),
    moduleScope: normalizeStringArray(data.module_scope),
    updatedAt: data.updated_at ?? data.updated ?? data.created_at ?? data.created ?? null,
    fileMtime: stat.mtime.toISOString(),
    body
  };
}

function splitFrontmatter(markdown) {
  if (!markdown.startsWith("---")) {
    return { frontmatter: "", body: markdown };
  }

  const match = markdown.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);

  if (!match) {
    return { frontmatter: "", body: markdown };
  }

  return {
    frontmatter: match[1],
    body: markdown.slice(match[0].length)
  };
}

function parseFrontmatter(frontmatter) {
  if (!frontmatter.trim()) {
    return {};
  }

  // Strip inline review comments (lines starting with >) that break YAML parsing
  const cleaned = frontmatter
    .split("\n")
    .filter((line) => !line.startsWith(">"))
    .join("\n");

  return parseYamlSafely(cleaned);
}

function parseYamlSafely(source) {
  try {
    return parseYaml(source) ?? {};
  } catch {
    return {};
  }
}

function extractHeading(body) {
  const match = body.match(/^#\s+(.+)$/m);
  return match?.[1]?.trim() ?? null;
}

function extractSummary(body) {
  const withoutComments = body.replace(/<!--[\s\S]*?-->/g, "");
  const lines = withoutComments
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !line.startsWith("#") && !line.startsWith("##"));

  return lines[0] ?? "";
}

function inferKindFromPath(filePath) {
  if (filePath.includes(`${path.sep}impl-specs${path.sep}`)) {
    return "implementation-spec";
  }

  if (filePath.includes(`${path.sep}specs${path.sep}`)) {
    return "legacy-spec";
  }

  return "unknown";
}

function firstArrayValue(value) {
  const normalized = normalizeStringArray(value);
  return normalized[0] ?? null;
}

function normalizeStringArray(value) {
  if (!value) {
    return [];
  }

  if (Array.isArray(value)) {
    return value
      .map((item) => String(item).trim())
      .filter(Boolean);
  }

  return [String(value).trim()].filter(Boolean);
}

function compareSpecs(left, right) {
  const leftStatus = String(left.status ?? "");
  const rightStatus = String(right.status ?? "");

  if (leftStatus !== rightStatus) {
    return leftStatus.localeCompare(rightStatus);
  }

  return left.title.localeCompare(right.title);
}

async function statOrNull(targetPath) {
  try {
    return await fs.stat(targetPath);
  } catch {
    return null;
  }
}

function createInputError(message) {
  const error = new Error(message);
  error.statusCode = 400;
  return error;
}
