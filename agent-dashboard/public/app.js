const $ = (sel) => document.querySelector(sel);
const esc = (s) => String(s ?? "")
  .replace(/&/g, "&amp;")
  .replace(/</g, "&lt;")
  .replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;");

let appData = null;
let activeView = null;
let activeTypeFilter = null;
const DEFAULT_TYPE_SELECTION = ["feature", "refactor", "task", "spike"];
let bodyCache = {};
let pollTimer = null;
let detailHistory = [];
let searchQuery = "";
let searchResults = null;
let searchEngine = "";
let searchLoading = false;
let searchDebounce = null;
let sidebarExpanded = true;
const POLL_INTERVAL = 10_000;

const repoInput = $("#repo-path");
const savedPath = localStorage.getItem("agentsdlc:repoPath");
if (savedPath) repoInput.value = savedPath;
document.body.dataset.sidebarExpanded = "true";

$("#load-form").addEventListener("submit", (e) => {
  e.preventDefault();
  loadRepo(repoInput.value.trim());
});
$("#detail-close").addEventListener("click", closeDetail);
$("#detail-back").addEventListener("click", goBack);
$("#detail-backdrop").addEventListener("click", closeDetail);
document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeDetail(); });

$("#sidebar-toggle").addEventListener("click", () => {
  sidebarExpanded = !sidebarExpanded;
  $("#sidebar").dataset.expanded = sidebarExpanded;
  document.body.dataset.sidebarExpanded = String(sidebarExpanded);
  $("#sidebar-toggle").textContent = sidebarExpanded ? "Hide" : "Show";
  $("#sidebar-project-name").hidden = !sidebarExpanded;
  document.querySelectorAll(".nav-item-main span").forEach((el) => { el.hidden = !sidebarExpanded; });
});

$("#search-input").addEventListener("input", (e) => {
  const q = e.target.value.trim();
  if (!q) {
    if (searchDebounce) clearTimeout(searchDebounce);
    searchQuery = "";
    searchResults = null;
    searchEngine = "";
    searchLoading = false;
    if (appData) renderCurrentView();
    return;
  }
  runSearch(q);
});

$("#search-scope").addEventListener("change", () => {
  const q = $("#search-input").value.trim();
  if (!q) return;
  runSearch(q);
});

async function loadRepo(repoPath, silent = false) {
  if (!repoPath) return;
  localStorage.setItem("agentsdlc:repoPath", repoPath);
  const loadIndicator = $("#load-indicator");
  const errorBanner = $("#error-banner");
  if (!silent) {
    loadIndicator.hidden = false;
    errorBanner.hidden = true;
    bodyCache = {};
  }
  try {
    const res = await fetch("/api/repositories/load", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ repoPath }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to load repository.");
    appData = data;
    if (!silent) {
      $("#empty-state").hidden = true;
      $("#sidebar-project-name").textContent = appData.configRaw?.project?.name || "Agent SDLC";
      $("#header-title").textContent = appData.configRaw?.project?.name || "Repository Index";
      setIndicator("Loaded");
      buildSidebar();
      switchView("home");
    } else {
      updateSidebarCounts();
      renderCurrentView();
    }
    startPolling();
  } catch (err) {
    if (!silent) {
      errorBanner.textContent = err.message;
      errorBanner.hidden = false;
      setIndicator("Error");
    }
  } finally {
    if (!silent) loadIndicator.hidden = true;
  }
}

function startPolling() {
  if (pollTimer) clearInterval(pollTimer);
  pollTimer = setInterval(() => {
    const path = repoInput.value.trim();
    if (path && appData) loadRepo(path, true);
  }, POLL_INTERVAL);
}

function setIndicator(text) {
  $("#indicator-text").textContent = text;
}

function setHeroState(title, subtitle = "") {
  const titleEl = $("#header-title");
  const subtitleEl = $("#hero-subtitle");
  titleEl.textContent = title;
  subtitleEl.hidden = !subtitle;
  subtitleEl.textContent = subtitle;
}

async function runSearch(q) {
  if (searchDebounce) clearTimeout(searchDebounce);
  searchLoading = true;
  searchQuery = q;
  if (appData) renderCurrentView();
  searchDebounce = setTimeout(async () => {
    const scope = $("#search-scope").value;
    try {
      const res = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: q, repoPath: repoInput.value, scope }),
      });
      const data = await res.json();
      searchResults = data.results || [];
      searchEngine = data.engine || "text";
    } catch {
      searchResults = null;
      searchEngine = "client";
    }
    searchLoading = false;
    if (appData) renderCurrentView();
  }, 350);
}

function buildSidebar() {
  const nav = $("#sidebar-nav");
  nav.innerHTML = "";
  nav.appendChild(makeNav("home", "Dashboard", "Overview", null));

  const fixedOrder = ["context", "requirement", "risk", "backlog-item", "impl-spec"];
  const allKeys = Object.keys(appData.artifacts ?? {});
  const ordered = fixedOrder.filter((k) => allKeys.includes(k));
  const remaining = allKeys.filter((k) => !ordered.includes(k));
  const finalOrder = [...ordered, ...remaining];

  for (const key of finalOrder) {
    const artifact = appData.artifacts[key];
    nav.appendChild(makeNav(key, artifact?.name || key, artifact?.shortName || "Artifact", (artifact?.items || []).length));
  }
  if (finalOrder.length === 0 && (appData.implementationSpecs || []).length > 0) {
    nav.appendChild(makeNav("impl-spec", "Specs", "Implementation", appData.implementationSpecs.length));
  }
}

function makeNav(key, label, subtitle, count) {
  const item = document.createElement("button");
  item.type = "button";
  item.dataset.view = key;
  item.className = "nav-item";
  item.innerHTML = `
    <div class="nav-item-main">
      <strong>${esc(label)}</strong>
      <span ${sidebarExpanded ? "" : "hidden"}>${esc(subtitle || "")}</span>
    </div>
    ${count != null ? `<span class="nav-item-count">${count}</span>` : ""}
  `;
  item.addEventListener("click", () => {
    searchQuery = "";
    $("#search-input").value = "";
    searchResults = null;
    switchView(key);
  });
  return item;
}

function updateSidebarCounts() {
  document.querySelectorAll("#sidebar-nav > [data-view]").forEach((el) => {
    const key = el.dataset.view;
    if (key === "home") return;
    const artifact = appData.artifacts?.[key];
    const count = artifact ? (artifact.items || []).length : (appData.implementationSpecs || []).length;
    const badge = el.querySelector(".nav-item-count");
    if (badge) badge.textContent = count;
  });
}

function switchView(key) {
  activeView = key;
  activeTypeFilter = null;
  document.querySelectorAll("#sidebar-nav > [data-view]").forEach((el) => {
    el.classList.toggle("is-active", el.dataset.view === key);
  });
  renderCurrentView();
}

function renderCurrentView() {
  ["view-home", "view-context", "view-table"].forEach((id) => { $("#" + id).hidden = true; });

  if (activeView === "home" && !searchQuery) {
    setHeroState(appData.configRaw?.project?.name || "Repository Index");
    $("#view-home").hidden = false;
    renderHome();
    return;
  }

  if (searchQuery) {
    const items = getActiveItems();
    const scope = $("#search-scope").value === "context" ? "context" : "all artifacts";
    const state = searchLoading
      ? "Searching..."
      : `${items.length} result${items.length !== 1 ? "s" : ""} in ${scope}`;
    setHeroState("Search", state);
    $("#view-table").hidden = false;
    renderTableView(items);
    return;
  }

  if (activeView === "context") {
    setHeroState("Project Context", "Reference material and operating notes");
    $("#view-context").hidden = false;
    renderContext();
    return;
  }

  const artifact = appData.artifacts?.[activeView];
  setHeroState(artifact?.name || artifact?.shortName || "Artifacts");
  $("#view-table").hidden = false;
  renderTableView(getActiveItems());
}

function renderHome() {
  const container = $("#home-cards");
  const cards = [];
  for (const [key, artifact] of Object.entries(appData.artifacts ?? {})) {
    if (key === "context") continue;
    const items = artifact.items || [];
    const statusCounts = {};
    items.forEach((item) => {
      const status = normStatus(item.status);
      statusCounts[status] = (statusCounts[status] || 0) + 1;
    });
    const dominant = Object.entries(statusCounts).sort((a, b) => b[1] - a[1])[0];

    const recent = items.slice(0, 3).map((item) => `
      <button type="button" data-item-id="${esc(item.id)}" data-view="${esc(key)}">
        <span>${esc(truncate(item.title, 60))}</span>
        <span>${formatDate(item.fileMtime || item.updatedAt)}</span>
      </button>
    `).join("");

    const statusSummary = dominant
      ? `${dominant[1]} ${dominant[0].replace(/_/g, " ")}`
      : "No status data";

    cards.push(`
      <article class="home-card">
        <div class="home-card-meta">
          <span class="card-kicker">${esc(artifact.shortName || key)}</span>
        </div>
        <h3>${esc(artifact.name || key)}</h3>
        <p>${items.length} items. ${esc(statusSummary)}.</p>
        <div class="home-card-footer">
          <div>
            <span class="meta-label">Total</span>
            <strong>${items.length}</strong>
          </div>
          <div>
            <span class="meta-label">Statuses</span>
            <strong>${Object.keys(statusCounts).length}</strong>
          </div>
        </div>
        ${recent ? `
        <div class="home-card-recent">
          <div class="meta-label">Recent</div>
          <div class="recent-list">${recent}</div>
        </div>` : ""}
      </article>
    `);
  }
  container.innerHTML = cards.join("");
  container.querySelectorAll("[data-item-id]").forEach((el) => {
    el.addEventListener("click", () => {
      activeView = el.dataset.view;
      openDetail(el.dataset.itemId);
    });
  });
}

function renderContext() {
  const ctx = appData.artifacts?.context;
  if (!ctx) {
    $("#context-grid").innerHTML = '<div class="search-empty"><h3>No context folder</h3><p>This repository does not have a context artifact set.</p></div>';
    return;
  }
  const items = ctx.items || [];
  const groups = {};
  items.forEach((item) => {
    const cat = item.status || "general";
    (groups[cat] = groups[cat] || []).push(item);
  });
  const order = ["general", ...Object.keys(groups).filter((k) => k !== "general").sort()];
  let html = "";
  for (const cat of order) {
    const docs = groups[cat];
    if (!docs) continue;
    for (const doc of docs) {
      html += `
        <article class="context-card" data-ctx-id="${esc(doc.id)}">
          <div class="context-card-meta">
            <span class="card-kicker">${esc(cat)}</span>
            <span>${formatDate(doc.fileMtime || doc.updatedAt)}</span>
          </div>
          <h3>${esc(doc.title)}</h3>
          <p>${esc(summarizePreview(doc.description || "Context document available for review."))}</p>
        </article>
      `;
    }
  }
  $("#context-grid").innerHTML = html;
  $("#context-grid").querySelectorAll("[data-ctx-id]").forEach((el) => {
    el.addEventListener("click", () => {
      activeView = "context";
      openDetail(el.dataset.ctxId);
    });
  });
}

function renderTableView(items) {
  $("#stat-cards").hidden = Boolean(searchQuery);
  if (!searchQuery) renderStatCards(items);
  $("#charts-section").hidden = true;
  renderTable(items);
}

function getItemType(item) {
  const fm = item.frontmatter || {};
  return fm.item_type || fm.spec_type || fm.type || null;
}

function groupBy(items, fn) {
  const groups = {};
  items.forEach((item) => {
    const key = fn(item);
    groups[key] = (groups[key] || 0) + 1;
  });
  return groups;
}

function getActiveItems() {
  if (searchQuery) {
    let allItems = [];
    for (const [key, artifact] of Object.entries(appData.artifacts ?? {})) {
      const scope = $("#search-scope").value;
      if (scope === "context" && key !== "context") continue;
      allItems.push(...(artifact.items || []));
    }
    if (allItems.length === 0) allItems = appData.implementationSpecs || [];
    if (searchResults && searchResults.length > 0) {
      const matchedFiles = searchResults.map((r) => (r.file || "").replace(/^qmd:\/\/[^/]+\//, "")).filter(Boolean);
      return allItems.filter((item) => matchedFiles.some((f) => item.relativePath === f || f.endsWith(item.relativePath) || item.relativePath?.endsWith(f)));
    }
    const lq = searchQuery.toLowerCase();
    return allItems.filter((item) => [item.id, item.title, item.description, ...(item.tags || [])].join(" ").toLowerCase().includes(lq));
  }
  const artifact = appData.artifacts?.[activeView];
  return artifact ? (artifact.items || []) : (appData.implementationSpecs || []);
}

function renderStatCards(items) {
  const stats = $("#stat-cards");
  const statuses = groupBy(items, (i) => normStatus(i.status));
  const priorities = groupBy(items.filter((i) => i.priority), (i) => i.priority || "none");
  const types = groupBy(items.filter((i) => getItemType(i)), (i) => getItemType(i));

  const statusParts = Object.entries(statuses)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([s, c]) => `${c} ${s.replace(/_/g, " ")}`)
    .join(", ");

  const cards = [
    statCard("Total", items.length, statusParts || "No status data"),
  ];
  if (Object.keys(priorities).length > 1) {
    const priParts = Object.entries(priorities).sort((a, b) => b[1] - a[1]).map(([p, c]) => `${c} ${p}`).join(", ");
    cards.push(statCard("By priority", Object.keys(priorities).length, priParts));
  }
  if (Object.keys(types).length > 1) {
    const typeParts = Object.entries(types).sort((a, b) => b[1] - a[1]).map(([t, c]) => `${c} ${t}`).join(", ");
    cards.push(statCard("By type", Object.keys(types).length, typeParts));
  }
  stats.innerHTML = cards.join("");
}

function statCard(label, value, note) {
  return `
    <article class="stat-card">
      <span class="meta-label">${esc(label)}</span>
      <strong>${esc(value)}</strong>
      <p>${esc(note)}</p>
    </article>
  `;
}

function renderTable(allItems) {
  const artifact = appData.artifacts?.[activeView];
  $("#table-title").textContent = searchQuery ? "Search Results" : (artifact?.name || artifact?.shortName || "Artifacts");

  const UNTYPED = "untyped";
  const typeCounts = {};
  for (const item of allItems) {
    const type = getItemType(item) || UNTYPED;
    typeCounts[type] = (typeCounts[type] || 0) + 1;
  }
  const typeKeys = Object.keys(typeCounts).sort((a, b) => typeCounts[b] - typeCounts[a]);
  if (activeTypeFilter === null && typeKeys.length >= 2) {
    const preferred = DEFAULT_TYPE_SELECTION.filter((t) => typeKeys.includes(t));
    activeTypeFilter = new Set(preferred.length > 0 ? preferred : typeKeys);
  }
  if (activeTypeFilter instanceof Set) {
    for (const type of [...activeTypeFilter]) if (!typeKeys.includes(type)) activeTypeFilter.delete(type);
  }
  const filterActive = activeTypeFilter instanceof Set;
  const items = filterActive ? allItems.filter((item) => activeTypeFilter.has(getItemType(item) || UNTYPED)) : allItems;

  $("#table-count").innerHTML = searchLoading
    ? '<span class="loading-dot"></span> Searching...'
    : `${items.length}${filterActive ? ` of ${allItems.length}` : ""} items`;

  const pillsEl = $("#type-filter");
  if (typeKeys.length >= 2) {
    const allSelected = filterActive && typeKeys.every((k) => activeTypeFilter.has(k));
    const pillHtml = [`<button type="button" data-type-pill="__all__" class="${allSelected ? "is-active" : ""}">All ${allItems.length}</button>`]
      .concat(typeKeys.map((key) => `<button type="button" data-type-pill="${esc(key)}" class="${filterActive && activeTypeFilter.has(key) ? "is-active" : ""}">${esc(key)} ${typeCounts[key]}</button>`))
      .join("");
    pillsEl.innerHTML = pillHtml;
    pillsEl.hidden = false;
    pillsEl.querySelectorAll("[data-type-pill]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const value = btn.dataset.typePill;
        if (value === "__all__") {
          const allOn = filterActive && typeKeys.every((k) => activeTypeFilter.has(k));
          activeTypeFilter = allOn ? new Set() : new Set(typeKeys);
        } else {
          if (!(activeTypeFilter instanceof Set)) activeTypeFilter = new Set(typeKeys);
          if (activeTypeFilter.has(value)) activeTypeFilter.delete(value);
          else activeTypeFilter.add(value);
        }
        renderTable(allItems);
      });
    });
  } else {
    pillsEl.hidden = true;
    pillsEl.innerHTML = "";
  }

  // Empty state for search or filtered results
  if (items.length === 0) {
    const columns = buildTableColumns([]);
    $("#table-head").innerHTML = columns.map((col) => `<th>${esc(col.label)}</th>`).join("");
    if (searchQuery) {
      $("#table-body").innerHTML = `<tr><td colspan="${columns.length}"><div class="search-empty"><h3>No results found</h3><p>Try a different search term or change the scope filter.</p></div></td></tr>`;
    } else {
      $("#table-body").innerHTML = `<tr><td colspan="${columns.length}"><div class="search-empty"><h3>No items match</h3><p>Adjust the type filters above to see more items.</p></div></td></tr>`;
    }
    return;
  }

  const columns = buildTableColumns(items);
  $("#table-head").innerHTML = columns.map((col) => `<th>${esc(col.label)}</th>`).join("");
  const tbody = $("#table-body");
  tbody.innerHTML = items.map((item) => renderItemRow(item, columns)).join("");
  tbody.querySelectorAll("tr[data-item-id]").forEach((row) => {
    row.addEventListener("click", () => openDetail(row.dataset.itemId));
  });
}

function buildTableColumns(items) {
  const columns = [
    { key: "id", label: "ID" },
    { key: "title", label: "Title" },
    { key: "status", label: "Status" },
  ];
  if (items.some((i) => i.priority)) columns.push({ key: "priority", label: "Priority" });
  if (items.some((i) => i.owner)) columns.push({ key: "owner", label: "Owner" });
  else if (items.some((i) => i.backlogId)) columns.push({ key: "backlogId", label: "Backlog" });
  columns.push({ key: "updatedAt", label: "Updated" });
  return columns;
}

function renderItemRow(item, columns) {
  return `<tr data-item-id="${esc(item.id)}">${columns.map((col) => renderCell(col, item)).join("")}</tr>`;
}

function renderCell(col, item) {
  switch (col.key) {
    case "id":
      return `<td class="cell-id" data-label="${esc(col.label)}">${esc(item.id)}</td>`;
    case "title":
      return `<td class="cell-title" data-label="${esc(col.label)}">${esc(item.title)}</td>`;
    case "status":
      return `<td data-label="${esc(col.label)}">${statusBadge(item.status)}</td>`;
    case "priority":
      return `<td data-label="${esc(col.label)}">${esc(item.priority || "--")}</td>`;
    case "owner":
      return `<td data-label="${esc(col.label)}">${esc(cleanOwner(item.owner))}</td>`;
    case "backlogId":
      return `<td data-label="${esc(col.label)}">${esc(item.backlogId || "--")}</td>`;
    case "updatedAt":
      return `<td data-label="${esc(col.label)}">${formatDate(item.fileMtime || item.updatedAt)}</td>`;
    default:
      return `<td data-label="${esc(col.label)}">--</td>`;
  }
}

function normStatus(status) {
  if (!status) return "unknown";
  const normalized = status.toLowerCase().replace(/[\s-]+/g, "_");
  if (normalized === "review") return "in_review";
  if (normalized === "wip") return "in_progress";
  return normalized;
}

function statusBadge(status) {
  const normalized = normStatus(status);
  const isGreen = ["approved", "done", "complete", "completed"].includes(normalized);
  const isAmber = ["in_review", "in_progress", "proposed", "draft"].includes(normalized);
  const isRed = ["cancelled", "rejected", "blocked"].includes(normalized);
  const color = isGreen ? "var(--green)" : isAmber ? "var(--amber)" : isRed ? "var(--red)" : "var(--muted)";
  const badgeClass = isGreen ? "badge badge-green" : isAmber ? "badge badge-amber" : isRed ? "badge badge-red" : "badge";
  const label = normalized === "unknown" ? "no status" : normalized.replace(/_/g, " ");
  return `<span class="${badgeClass}"><span class="badge-dot" style="background:${color}"></span>${esc(label)}</span>`;
}

function cleanOwner(owner) {
  if (!owner) return "--";
  return owner.replace(/^agent:/, "").replace(/\s*\(.*\)\s*$/, "").trim() || "--";
}

function formatDate(value) {
  if (!value) return "--";
  try {
    return new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  } catch {
    return esc(String(value).slice(0, 10));
  }
}

function truncate(text, max) {
  if (!text || text.length <= max) return text || "";
  return text.slice(0, max - 1).trimEnd() + "...";
}

function summarizePreview(text) {
  const source = String(text ?? "").trim();
  const cleaned = source
    .replace(/^\s*[-*]\s+/gm, "")
    .replace(/\|/g, " ")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
  if (!cleaned) return "Context document available for review.";
  if (source.includes("|")) {
    const nouns = cleaned
      .split(" ")
      .filter(Boolean)
      .slice(0, 6)
      .join(", ")
      .replace(/,\s([^,]+)$/, ", and $1");
    return `Structured reference covering ${nouns}.`;
  }
  if (/^[A-Za-z][A-Za-z\s]+:$/.test(cleaned)) {
    return `Overview of ${cleaned.slice(0, -1).toLowerCase()}.`;
  }
  if (/^[A-Za-z][A-Za-z\s]{8,}$/.test(cleaned) && !/[.?!]/.test(cleaned) && cleaned.split(" ").length <= 8) {
    return `Structured reference covering ${cleaned.toLowerCase()}.`;
  }
  return cleaned.length > 140 ? `${cleaned.slice(0, 137).trimEnd()}...` : cleaned;
}

async function openDetail(itemId, skipHistory = false) {
  let item = null;
  let viewKey = activeView;
  for (const [key, artifact] of Object.entries(appData.artifacts ?? {})) {
    const found = (artifact.items || []).find((candidate) => candidate.id === itemId);
    if (found) { item = found; viewKey = key; break; }
  }
  if (!item) {
    const legacy = (appData.implementationSpecs || []).find((candidate) => candidate.id === itemId);
    if (legacy) { item = legacy; viewKey = "impl-spec"; }
  }
  if (!item) return;

  if (!skipHistory && !$("#detail-panel").hidden) {
    const prevId = $("#detail-title").dataset.itemId;
    if (prevId && prevId !== itemId) detailHistory.push(prevId);
  }

  $("#detail-title").dataset.itemId = itemId;
  $("#detail-title").textContent = item.title || item.id;
  $("#detail-back").hidden = detailHistory.length === 0;

  // Set the kind label
  const artifactName = appData.artifacts?.[viewKey]?.shortName || appData.artifacts?.[viewKey]?.name || viewKey;
  $("#detail-kind-label").textContent = artifactName;

  const meta = [];
  meta.push(`<span class="badge">${esc(item.id)}</span>`);
  if (item.status && normStatus(item.status) !== "unknown") meta.push(statusBadge(item.status));
  if (item.priority) meta.push(`<span class="badge">${esc(item.priority.toUpperCase())}</span>`);
  if (item.owner) meta.push(`<span>${esc(cleanOwner(item.owner))}</span>`);
  if (item.updatedAt) meta.push(`<span>${formatDate(item.updatedAt)}</span>`);
  $("#detail-meta").innerHTML = meta.join("");

  const bodyEl = $("#detail-body");
  const cacheKey = `${viewKey}:${itemId}`;
  const fmHtml = renderFrontmatter(item);
  if (bodyCache[cacheKey]) {
    bodyEl.innerHTML = fmHtml + renderMd(bodyCache[cacheKey]);
  } else {
    bodyEl.innerHTML = fmHtml + '<p style="color:var(--muted)">Loading content...</p>';
    try {
      const artifact = appData.artifacts?.[viewKey];
      const res = artifact
        ? await fetch("/api/artifact/body", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ repoPath: repoInput.value, artifactType: viewKey, itemId }) })
        : await fetch("/api/spec/body", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ repoPath: repoInput.value, specId: itemId }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load body.");
      bodyCache[cacheKey] = data.body;
      bodyEl.innerHTML = fmHtml + renderMd(data.body);
    } catch (err) {
      bodyEl.innerHTML = fmHtml + `<p style="color:var(--red)">${esc(err.message)}</p>`;
    }
  }
  $("#detail-panel").hidden = false;
}

function renderFrontmatter(item) {
  const fm = item.frontmatter || {};
  const rows = [];
  const props = [
    ["Kind", fm.kind],
    ["Status", normStatus(item.status) !== "unknown" ? item.status : null],
    ["Priority", item.priority],
    ["Owner", cleanOwner(item.owner)],
    ["Verification", fm.verification_mode],
    ["Item Type", fm.item_type],
    ["Created", formatDate(fm.created_at)],
    ["Updated", formatDate(fm.updated_at)],
  ];
  for (const [label, value] of props) {
    if (value && value !== "--") rows.push(`<div><strong>${esc(label)}</strong><span>${esc(value)}</span></div>`);
  }
  const tags = item.tags || [];
  if (tags.length) rows.push(`<div><strong>Tags</strong><span>${tags.map((tag) => `<span class="badge">${esc(tag)}</span>`).join(" ")}</span></div>`);
  return rows.length ? `<div class="detail-frontmatter">${rows.join("")}</div>` : "";
}

function renderMd(md) {
  if (typeof marked !== "undefined" && marked.parse) {
    return marked.parse(md);
  }
  return `<pre>${esc(md)}</pre>`;
}

function closeDetail() {
  $("#detail-panel").hidden = true;
  detailHistory = [];
}

function goBack() {
  const prev = detailHistory.pop();
  if (prev) openDetail(prev, true);
}
