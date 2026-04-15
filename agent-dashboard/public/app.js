/* Agent SDLC — Dashboard Client */

const $ = (sel) => document.querySelector(sel);
const esc = (s) => String(s ?? "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");

let appData = null;
let activeView = null; // "home" | "context" | artifact key
let activeTypeFilter = null; // null = all types, else Set of selected types
const DEFAULT_TYPE_SELECTION = ["feature", "refactor", "task", "spike"];
let bodyCache = {};
let pollTimer = null;
let detailHistory = [];
const POLL_INTERVAL = 10_000;

const ICON_MAP = {
  "impl-spec": "assignment", "impl spec": "assignment",
  "backlog-item": "checklist", "backlog item": "checklist", "backlog": "checklist",
  "context": "menu_book", "requirement": "rule", "test": "biotech",
};
function iconFor(key) {
  for (const [p, icon] of Object.entries(ICON_MAP)) { if (key.includes(p)) return icon; }
  return "description";
}
function cleanOwner(o) {
  if (!o) return "—";
  return o.replace(/^agent:/, "").replace(/\s*\(.*\)\s*$/, "").trim() || "—";
}

// --- Init ---
const repoInput = $("#repo-path");
const savedPath = localStorage.getItem("agentsdlc:repoPath");
if (savedPath) repoInput.value = savedPath;

$("#load-form").addEventListener("submit", (e) => { e.preventDefault(); loadRepo(repoInput.value.trim()); });
$("#detail-close").addEventListener("click", closeDetail);
$("#detail-back").addEventListener("click", goBack);
$("#detail-backdrop").addEventListener("click", closeDetail);
document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeDetail(); });

// --- Sidebar Toggle ---
let sidebarExpanded = false;
$("#sidebar-toggle").addEventListener("click", () => {
  sidebarExpanded = !sidebarExpanded;
  $("#sidebar").dataset.expanded = sidebarExpanded;
  $("#sidebar-toggle-icon").textContent = sidebarExpanded ? "left_panel_close" : "menu";
  $("#header").style.left = sidebarExpanded ? "16rem" : "4rem";
  $("#main").classList.toggle("ml-64", sidebarExpanded);
  $("#main").classList.toggle("ml-16", !sidebarExpanded);
});

// --- Search ---
let searchQuery = "";
let searchResults = null;
let searchDebounce = null;
let searchEngine = "";
let searchLoading = false;

$("#search-input").addEventListener("input", (e) => {
  const q = e.target.value.trim();
  if (searchDebounce) clearTimeout(searchDebounce);
  if (!q) {
    searchQuery = ""; searchResults = null; searchEngine = ""; searchLoading = false;
    if (appData) renderCurrentView();
    return;
  }
  searchLoading = true;
  if (appData) renderCurrentView();
  searchDebounce = setTimeout(async () => {
    searchQuery = q;
    const scope = $("#search-scope").value;
    try {
      const res = await fetch("/api/search", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: q, repoPath: repoInput.value, scope }),
      });
      const data = await res.json();
      searchResults = data.results || [];
      searchEngine = data.engine || "text";
    } catch {
      searchResults = null; searchEngine = "client";
    }
    searchLoading = false;
    if (appData) renderCurrentView();
  }, 400);
});

// --- Load Repo ---
async function loadRepo(repoPath, silent) {
  if (!repoPath) return;
  localStorage.setItem("agentsdlc:repoPath", repoPath);
  const indicator = $("#load-indicator");
  const errorBanner = $("#error-banner");
  if (!silent) { indicator.hidden = false; errorBanner.hidden = true; bodyCache = {}; }
  try {
    const res = await fetch("/api/repositories/load", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ repoPath }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to load");
    appData = data;
    if (!silent) {
      $("#sidebar-project-name").textContent = appData.configRaw?.project?.name || "Agent SDLC";
      buildSidebar();
      switchView("home");
      $("#empty-state").hidden = true;
    } else {
      updateSidebarCounts();
      renderCurrentView();
    }
    startPolling();
  } catch (err) {
    if (!silent) { errorBanner.textContent = err.message; errorBanner.hidden = false; }
  } finally {
    if (!silent) indicator.hidden = true;
  }
}

function startPolling() {
  if (pollTimer) clearInterval(pollTimer);
  pollTimer = setInterval(() => {
    const p = repoInput.value.trim();
    if (p && appData) loadRepo(p, true);
  }, POLL_INTERVAL);
}

// --- Sidebar ---
function buildSidebar() {
  const nav = $("#sidebar-nav");
  nav.innerHTML = "";

  // Home
  nav.appendChild(makeNav("home", "Dashboard", "dashboard", null));

  // Separator
  const sep1 = document.createElement("div");
  sep1.className = "my-2 mx-5 border-t border-slate-800/50";
  nav.appendChild(sep1);

  // Fixed sidebar order
  const SIDEBAR_ORDER = ["context", "requirement", "risk", "backlog-item", "impl-spec"];
  const SIDEBAR_ICONS = {
    "context": "menu_book", "requirement": "rule", "risk": "warning",
    "backlog-item": "checklist", "impl-spec": "assignment",
  };

  const allKeys = Object.keys(appData.artifacts ?? {});
  const ordered = SIDEBAR_ORDER.filter((k) => allKeys.includes(k));
  // Append any remaining keys not in the fixed order
  const remaining = allKeys.filter((k) => !ordered.includes(k));
  const finalOrder = [...ordered, ...remaining];

  for (const key of finalOrder) {
    const at = appData.artifacts[key];
    const icon = SIDEBAR_ICONS[key] || iconFor(key);
    nav.appendChild(makeNav(key, at.name || at.shortName, icon, (at.items || []).length));
  }
  if (finalOrder.length === 0 && appData.implementationSpecs?.length > 0) {
    nav.appendChild(makeNav("impl-spec", "Specs", "assignment", appData.implementationSpecs.length));
  }
}

function makeNav(key, label, icon, count) {
  const div = document.createElement("div");
  div.dataset.view = key;
  div.className = "nav-item flex items-center gap-3 cursor-pointer active:scale-95 duration-150 py-2.5 pl-[18px] pr-4 text-slate-500 hover:text-slate-300 hover:bg-slate-800/40 transition-all border-l-2 border-transparent";
  div.innerHTML =
    `<span class="material-symbols-outlined text-xl shrink-0">${esc(icon)}</span>` +
    `<span class="nav-label text-xs font-medium whitespace-nowrap opacity-0 transition-opacity">${esc(label)}</span>` +
    (count != null ? `<span class="nav-badge ml-auto text-[10px] font-bold opacity-0 transition-opacity text-slate-500">${count}</span>` : "");
  div.addEventListener("click", () => { searchQuery = ""; $("#search-input").value = ""; searchResults = null; switchView(key); });
  return div;
}

function updateSidebarCounts() {
  document.querySelectorAll("#sidebar-nav > div[data-view]").forEach((el) => {
    const key = el.dataset.view;
    if (key === "home") return;
    const at = appData.artifacts?.[key];
    const count = at ? (at.items || []).length : (appData.implementationSpecs || []).length;
    const badge = el.querySelector(".nav-badge");
    if (badge) badge.textContent = count;
  });
}

function switchView(key) {
  activeView = key;
  activeTypeFilter = null;
  document.querySelectorAll("#sidebar-nav > div[data-view]").forEach((el) => {
    const on = el.dataset.view === key;
    el.classList.toggle("text-indigo-400", on);
    el.classList.toggle("bg-indigo-500/10", on);
    el.classList.toggle("border-indigo-500", on);
    el.classList.toggle("text-slate-500", !on);
    el.classList.toggle("border-transparent", !on);
    el.querySelector(".nav-label")?.classList.toggle("font-semibold", on);
    el.querySelector(".nav-label")?.classList.toggle("font-medium", !on);
  });
  renderCurrentView();
}

// --- View Router ---
function renderCurrentView() {
  const views = ["view-home", "view-context", "view-table"];
  views.forEach((v) => { $(` #${v}`).hidden = true; });

  if (activeView === "home" && !searchQuery) {
    $("#header-title").textContent = appData.configRaw?.project?.name || "Dashboard";
    $("#view-home").hidden = false;
    renderHome();
  } else if (activeView === "context") {
    $("#header-title").textContent = "Project Context";
    $("#view-context").hidden = false;
    renderContext();
  } else if (searchQuery) {
    // Search results — always table
    const items = getActiveItems();
    $("#header-title").textContent = `Search: ${searchQuery}`;
    $("#view-table").hidden = false;
    renderTableView(items);
  } else {
    // Artifact table view
    const items = getActiveItems();
    const at = appData.artifacts?.[activeView];
    $("#header-title").textContent = at?.name || at?.shortName || "Specs";
    $("#view-table").hidden = false;
    renderTableView(items);
  }
}

// --- Home Dashboard ---
function renderHome() {
  const container = $("#home-cards");
  const cards = [];

  // Card per artifact type (excluding context)
  for (const [key, at] of Object.entries(appData.artifacts ?? {})) {
    if (key === "context") continue;
    const items = at.items || [];
    const statusCounts = {};
    items.forEach((i) => { const s = normStatus(i.status); statusCounts[s] = (statusCounts[s] || 0) + 1; });

    const statusPills = Object.entries(statusCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
      .map(([s, c]) => {
        const m = STATUS_META[s] || STATUS_META.draft;
        const label = s === "unknown" ? "no status" : s.replace(/_/g, " ");
        return `<span class="inline-flex items-center gap-1 text-[10px] ${m.color}"><span class="w-1 h-1 rounded-full ${m.dot}"></span>${c} ${esc(label)}</span>`;
      }).join("");

    const recent = items.slice(0, 3);
    const recentHtml = recent.map((i) =>
      `<div class="flex items-center justify-between py-1.5 cursor-pointer hover:text-indigo-400 transition-colors" data-item-id="${esc(i.id)}" data-view="${esc(key)}">
        <span class="text-xs truncate max-w-[250px]">${esc(i.title)}</span>
        <span class="text-[10px] text-on-surface-variant/50 shrink-0 ml-2">${formatDate(i.fileMtime || i.updatedAt)}</span>
      </div>`
    ).join("");

    cards.push(`
      <div class="bg-surface-container-low rounded-xl border border-outline-variant/5 hover:border-outline-variant/20 transition-all overflow-hidden">
        <div class="p-5 cursor-pointer" data-goto-view="${esc(key)}">
          <div class="flex items-center justify-between mb-4">
            <div class="flex items-center gap-2">
              <span class="material-symbols-outlined text-indigo-400 text-lg">${esc(iconFor(key))}</span>
              <span class="text-sm font-semibold text-on-surface">${esc(at.name || key)}</span>
            </div>
            <span class="text-2xl font-extrabold text-on-surface">${items.length}</span>
          </div>
          <div class="flex flex-wrap gap-3 mb-4">${statusPills}</div>
        </div>
        <div class="border-t border-outline-variant/5 px-5 py-3 space-y-0.5 text-on-surface-variant">
          <div class="text-[10px] uppercase tracking-widest font-bold text-on-surface-variant/50 mb-1">Recent</div>
          ${recentHtml || '<div class="text-xs text-on-surface-variant/30">No items</div>'}
        </div>
      </div>
    `);
  }

  container.innerHTML = cards.join("");

  // Wire clicks
  container.querySelectorAll("[data-goto-view]").forEach((el) => {
    el.addEventListener("click", () => switchView(el.dataset.gotoView));
  });
  container.querySelectorAll("[data-item-id]").forEach((el) => {
    el.addEventListener("click", (e) => { e.stopPropagation(); activeView = el.dataset.view; openDetail(el.dataset.itemId); });
  });
}

// --- Context Browser ---
function renderContext() {
  const ctx = appData.artifacts?.context;
  if (!ctx) { $("#context-grid").innerHTML = '<p class="text-on-surface-variant">No context folder found.</p>'; return; }

  const items = ctx.items || [];
  // Group by category (status field holds category)
  const groups = {};
  items.forEach((i) => {
    const cat = i.status || "general";
    (groups[cat] = groups[cat] || []).push(i);
  });

  // Render general docs first, then domain docs
  const order = ["general", ...Object.keys(groups).filter((k) => k !== "general").sort()];
  let html = "";

  for (const cat of order) {
    const docs = groups[cat];
    if (!docs) continue;
    const catLabel = cat === "general" ? "Project Documents" : cat.charAt(0).toUpperCase() + cat.slice(1);
    const catIcon = cat === "general" ? "description" : "topic";

    html += `<div class="mb-2">
      <div class="flex items-center gap-2 mb-3">
        <span class="material-symbols-outlined text-indigo-400 text-lg">${catIcon}</span>
        <h3 class="text-sm font-semibold text-on-surface uppercase tracking-wider">${esc(catLabel)}</h3>
        <span class="text-[10px] text-on-surface-variant/50">${docs.length}</span>
      </div>
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">`;

    for (const doc of docs) {
      html += `
        <div class="bg-surface-container-low rounded-xl p-4 border border-outline-variant/5 hover:border-indigo-500/30 hover:bg-surface-container transition-all cursor-pointer group" data-ctx-id="${esc(doc.id)}">
          <div class="flex items-start gap-3">
            <span class="material-symbols-outlined text-on-surface-variant/40 group-hover:text-indigo-400 transition-colors mt-0.5 text-lg">article</span>
            <div class="min-w-0">
              <div class="text-sm font-medium text-on-surface truncate group-hover:text-indigo-300 transition-colors">${esc(doc.title)}</div>
              <div class="text-[11px] text-on-surface-variant/60 mt-1 line-clamp-2">${esc(doc.description || "")}</div>
            </div>
          </div>
        </div>`;
    }
    html += `</div></div>`;
  }

  $("#context-grid").innerHTML = html;

  // Wire clicks
  $("#context-grid").querySelectorAll("[data-ctx-id]").forEach((el) => {
    el.addEventListener("click", () => { activeView = "context"; openDetail(el.dataset.ctxId); });
  });
}

// --- Table View ---
function renderTableView(items) {
  renderStatCards(items);
  $("#charts-section").hidden = true;
  renderTable(items);
}

function getItemType(item) {
  const fm = item.frontmatter || {};
  return fm.item_type || fm.spec_type || fm.type || null;
}

function groupBy(items, fn) {
  const groups = {};
  items.forEach((i) => { const k = fn(i); groups[k] = (groups[k] || 0) + 1; });
  return groups;
}

function getActiveItems() {
  if (searchQuery) {
    let allItems = [];
    for (const [key, at] of Object.entries(appData.artifacts ?? {})) {
      const scope = $("#search-scope").value;
      if (scope === "context" && key !== "context") continue;
      if (scope === "all" && key === "context") continue; // exclude context from "all" artifact search
      allItems.push(...(at.items || []));
    }
    if (allItems.length === 0) allItems = appData.implementationSpecs || [];

    if (searchResults && searchResults.length > 0) {
      const matchedFiles = searchResults.map((r) => {
        let f = r.file || "";
        f = f.replace(/^qmd:\/\/[^/]+\//, "");
        return f;
      }).filter(Boolean);
      return allItems.filter((i) =>
        matchedFiles.some((f) => i.relativePath === f || f.endsWith(i.relativePath) || i.relativePath?.endsWith(f))
      );
    }
    const lq = searchQuery.toLowerCase();
    return allItems.filter((i) => {
      const hay = [i.id, i.title, i.description, ...(i.tags || [])].join(" ").toLowerCase();
      return hay.includes(lq);
    });
  }

  const at = appData.artifacts?.[activeView];
  return at ? (at.items || []) : (appData.implementationSpecs || []);
}

// --- Stat Cards ---
const STATUS_META = {
  approved:    { icon: "verified",     color: "text-tertiary",          dot: "bg-tertiary" },
  open:        { icon: "circle",       color: "text-indigo-400",        dot: "bg-indigo-400" },
  proposed:    { icon: "lightbulb",    color: "text-indigo-400",        dot: "bg-indigo-400" },
  draft:       { icon: "edit_note",    color: "text-on-surface-variant",dot: "bg-slate-400" },
  in_review:   { icon: "visibility",   color: "text-amber-400",         dot: "bg-amber-400" },
  in_progress: { icon: "pending",      color: "text-amber-400",         dot: "bg-amber-400" },
  cancelled:   { icon: "cancel",       color: "text-red-400",           dot: "bg-red-400" },
};

const STATUS_COLORS = {
  draft: "#464554", approved: "#4edea3", done: "#4edea3", open: "#8083ff",
  proposed: "#8083ff", in_progress: "#e8b648", in_review: "#e8b648",
  cancelled: "#ef6b6b", superseded: "#908fa0", unknown: "#33343b", stale: "#908fa0",
};
const PRI_COLORS = { p0: "#ef6b6b", p1: "#e8b648", p2: "#8083ff", p3: "#464554", none: "#33343b" };
const TYPE_COLORS = {
  // backlog item types
  bug:      "#ef6b6b",
  feature:  "#8083ff",
  chore:    "#908fa0",
  task:     "#4edea3",
  refactor: "#e8b648",
  spike:    "#64c7ff",
  // requirement types
  functional:       "#8083ff",
  "non-functional": "#4edea3",
  other: "#464554",
};

function renderStatCards(items) {
  const container = $("#stat-cards");
  const cards = [];

  // Total card
  cards.push(`<div class="bg-surface-container-low p-5 rounded-xl border border-outline-variant/5">
    <div class="flex justify-between items-start mb-3">
      <span class="text-on-surface-variant text-[10px] uppercase tracking-widest font-bold">Total</span>
      <span class="material-symbols-outlined text-indigo-400 text-lg opacity-40">inventory_2</span>
    </div>
    <div class="text-3xl font-extrabold text-on-surface tracking-tight">${items.length}</div>
  </div>`);

  // Status card
  cards.push(buildGroupCard("Status", groupBy(items, (i) => normStatus(i.status)), STATUS_COLORS));

  // Priority card (skip if all "none")
  const pris = groupBy(items, (i) => i.priority || "none");
  if (Object.keys(pris).length > 1 || !pris["none"]) {
    cards.push(buildGroupCard("Priority", pris, PRI_COLORS));
  }

  // Type card — reads item_type/spec_type/type, skip if no items have a type
  const types = groupBy(items.filter((i) => getItemType(i)), (i) => getItemType(i));
  if (Object.keys(types).length >= 1) {
    cards.push(buildGroupCard("Type", types, TYPE_COLORS));
  }

  container.className = `grid grid-cols-2 md:grid-cols-${Math.min(cards.length, 4)} gap-4`;
  container.innerHTML = cards.join("");
}

function buildGroupCard(title, data, colorMap) {
  const sorted = Object.entries(data).sort((a, b) => b[1] - a[1]);
  const total = sorted.reduce((s, [, v]) => s + v, 0);

  // Single value — show it prominently
  if (sorted.length === 1) {
    const [label, count] = sorted[0];
    const color = colorMap[label] || "#464554";
    const display = label === "unknown" ? "no status" : label.replace(/_/g, " ");
    return `<div class="bg-surface-container-low p-5 rounded-xl border border-outline-variant/5">
      <div class="text-on-surface-variant text-[10px] uppercase tracking-widest font-bold mb-3">${esc(title)}</div>
      <div class="flex items-center gap-2">
        <span class="w-2.5 h-2.5 rounded-sm shrink-0" style="background:${color}"></span>
        <span class="text-xl font-bold text-on-surface">${esc(display)}</span>
        <span class="text-on-surface-variant/40 text-sm ml-auto">${count}</span>
      </div>
    </div>`;
  }

  const segments = sorted.map(([label, count]) => {
    const pct = Math.max(count / total * 100, 2);
    const color = colorMap[label] || "#464554";
    return `<div style="width:${pct.toFixed(1)}%;background:${color}" class="h-full rounded-sm" title="${esc(label)}: ${count}"></div>`;
  }).join("");

  const pills = sorted.map(([label, count]) => {
    const color = colorMap[label] || "#464554";
    const display = label === "unknown" ? "no status" : label.replace(/_/g, " ");
    return `<span class="inline-flex items-center gap-1"><span class="w-1.5 h-1.5 rounded-sm shrink-0" style="background:${color}"></span>${esc(display)} <span class="text-on-surface-variant/40">${count}</span></span>`;
  }).join("");

  return `<div class="bg-surface-container-low p-5 rounded-xl border border-outline-variant/5">
    <div class="text-on-surface-variant text-[10px] uppercase tracking-widest font-bold mb-3">${esc(title)}</div>
    <div class="flex h-2 rounded-full overflow-hidden gap-0.5 mb-3">${segments}</div>
    <div class="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-on-surface">${pills}</div>
  </div>`;
}

function normStatus(s) {
  if (!s) return "unknown";
  s = s.toLowerCase().replace(/[\s-]+/g, "_");
  if (s === "in_review" || s === "review") return "in_review";
  if (s === "in_progress" || s === "wip") return "in_progress";
  return s;
}

// --- Table ---
function renderTable(allItems) {
  // Title
  const at = appData.artifacts?.[activeView];
  const label = searchQuery ? "Search Results" : (at?.name || at?.shortName || "Specs");
  $("#table-title").textContent = label;

  // Compute distinct types across the full item set so pills stay stable under filtering.
  // Items without an item_type are bucketed under "untyped".
  const UNTYPED = "untyped";
  const typeCounts = {};
  for (const i of allItems) {
    const t = getItemType(i) || UNTYPED;
    typeCounts[t] = (typeCounts[t] || 0) + 1;
  }
  const typeKeys = Object.keys(typeCounts).sort((a, b) => typeCounts[b] - typeCounts[a]);

  // First time we see this view's types, pre-select the preferred defaults (feature/refactor/task/spike)
  // but only for types that actually exist. If none of the defaults exist, select everything.
  if (activeTypeFilter === null && typeKeys.length >= 2) {
    const preferred = DEFAULT_TYPE_SELECTION.filter((t) => typeKeys.includes(t));
    activeTypeFilter = new Set(preferred.length > 0 ? preferred : typeKeys);
  }

  // Drop stale entries if the type set has changed
  if (activeTypeFilter instanceof Set) {
    for (const t of [...activeTypeFilter]) if (!typeKeys.includes(t)) activeTypeFilter.delete(t);
  }

  // Apply filter. "untyped" covers items with no item_type field.
  const filterActive = activeTypeFilter instanceof Set;
  const items = filterActive
    ? allItems.filter((i) => activeTypeFilter.has(getItemType(i) || UNTYPED))
    : allItems;

  // Count / filter indicator
  if (searchLoading) {
    $("#table-count").innerHTML = '<span class="flex items-center gap-1.5"><span class="material-symbols-outlined animate-spin text-sm text-indigo-400">progress_activity</span> Searching...</span>';
  } else {
    const countText = searchQuery ? `${items.length} results` : `${items.length}${filterActive ? ` / ${allItems.length}` : ""} items`;
    const badge = searchQuery && searchEngine === "qmd" ? ' <span class="text-tertiary text-[10px]">via QMD</span>' : "";
    $("#table-count").innerHTML = countText + badge;
  }

  // Type filter pills (multi-select, only when 2+ types exist)
  const pillsEl = $("#type-filter");
  if (typeKeys.length >= 2) {
    const pill = (key, count, active) => {
      const color = TYPE_COLORS[key] || "#464554";
      return `<button data-type-pill="${esc(key)}" class="flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider transition-colors ${active ? "bg-indigo-500/20 text-indigo-300 border border-indigo-400/40" : "bg-surface-container-high text-on-surface-variant hover:bg-surface-container-highest border border-transparent"}"><span class="w-1.5 h-1.5 rounded-sm" style="background:${color}"></span>${esc(key)} <span class="opacity-50 font-normal">${count}</span></button>`;
    };
    const allSelected = filterActive && typeKeys.every((k) => activeTypeFilter.has(k));
    const allPill = `<button data-type-pill="__all__" class="px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider transition-colors ${allSelected ? "bg-indigo-500/20 text-indigo-300 border border-indigo-400/40" : "bg-surface-container-high text-on-surface-variant hover:bg-surface-container-highest border border-transparent"}">All <span class="opacity-50 font-normal">${allItems.length}</span></button>`;
    pillsEl.innerHTML = allPill + typeKeys.map((k) => pill(k, typeCounts[k], filterActive && activeTypeFilter.has(k))).join("");
    pillsEl.hidden = false;
    pillsEl.querySelectorAll("[data-type-pill]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const v = btn.dataset.typePill;
        if (v === "__all__") {
          const allOn = filterActive && typeKeys.every((k) => activeTypeFilter.has(k));
          activeTypeFilter = allOn ? new Set() : new Set(typeKeys);
        } else {
          if (!(activeTypeFilter instanceof Set)) activeTypeFilter = new Set(typeKeys);
          if (activeTypeFilter.has(v)) activeTypeFilter.delete(v); else activeTypeFilter.add(v);
        }
        renderTable(allItems);
      });
    });
  } else {
    pillsEl.hidden = true;
    pillsEl.innerHTML = "";
  }

  const columns = buildTableColumns(items);
  $("#table-head").innerHTML = columns.map((c) =>
    `<th class="px-5 py-3 text-[10px] uppercase tracking-widest font-bold text-on-surface-variant ${c.cls}">${esc(c.label)}</th>`
  ).join("");

  const tbody = $("#table-body");
  tbody.innerHTML = items.map((item) => renderItemRow(item, columns)).join("");

  tbody.querySelectorAll("tr[data-item-id]").forEach((tr) => {
    tr.addEventListener("click", () => openDetail(tr.dataset.itemId));
  });
}

function buildTableColumns(items) {
  const columns = [
    { key: "id", label: "ID", cls: "w-[180px]" },
    { key: "title", label: "Title", cls: "" },
    { key: "status", label: "Status", cls: "w-[120px]" },
  ];
  const hasPri = items.some((i) => i.priority);
  const hasOwn = items.some((i) => i.owner);
  const hasBl = items.some((i) => i.backlogId);
  if (hasPri) columns.push({ key: "priority", label: "Pri", cls: "w-[50px] text-center" });
  if (hasOwn) columns.push({ key: "owner", label: "Owner", cls: "w-[100px]" });
  else if (hasBl) columns.push({ key: "backlogId", label: "Backlog", cls: "w-[140px]" });
  columns.push({ key: "updatedAt", label: "Updated", cls: "w-[90px] text-right" });
  return columns;
}

function renderItemRow(item, columns) {
  return `<tr class="hover:bg-indigo-500/5 transition-colors cursor-pointer" data-item-id="${esc(item.id)}">${columns.map((c) => cell(c, item)).join("")}</tr>`;
}

function groupItemsByType(items) {
  const buckets = new Map();
  for (const item of items) {
    const t = getItemType(item) || "untyped";
    if (!buckets.has(t)) buckets.set(t, []);
    buckets.get(t).push(item);
  }
  return [...buckets.entries()].sort((a, b) => b[1].length - a[1].length);
}

function cell(col, item) {
  const b = "px-5 py-3.5";
  switch (col.key) {
    case "id": return `<td class="${b} text-xs font-mono text-indigo-400 truncate max-w-[180px]" title="${esc(item.id)}">${esc(item.id)}</td>`;
    case "title": return `<td class="${b}"><div class="text-sm font-medium text-on-surface truncate max-w-[480px]" title="${esc(item.title)}">${esc(item.title)}</div></td>`;
    case "status": return `<td class="${b}">${statusBadge(item.status)}</td>`;
    case "priority": return `<td class="${b} text-center">${priDot(item.priority)}</td>`;
    case "owner": return `<td class="${b} text-xs text-on-surface-variant truncate">${esc(cleanOwner(item.owner))}</td>`;
    case "backlogId": return `<td class="${b} text-xs font-mono text-on-surface-variant">${esc(item.backlogId || "—")}</td>`;
    case "updatedAt": return `<td class="${b} text-xs text-on-surface-variant text-right">${formatDate(item.fileMtime || item.updatedAt)}</td>`;
    default: return `<td class="${b} text-xs text-on-surface-variant">—</td>`;
  }
}

// --- Helpers ---
const STATUS_BG = {
  approved: "bg-emerald-500/10", open: "bg-indigo-400/10", proposed: "bg-indigo-400/10",
  draft: "bg-slate-500/10", in_review: "bg-amber-400/10", in_progress: "bg-amber-400/10",
  cancelled: "bg-red-400/10", unknown: "bg-slate-500/10",
};
function statusBadge(status) {
  const s = normStatus(status);
  const m = STATUS_META[s] || { dot: "bg-slate-500", color: "text-on-surface-variant" };
  const bg = STATUS_BG[s] || "bg-slate-500/10";
  const label = s === "unknown" ? "no status" : s.replace(/_/g, " ");
  return `<span class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold ${bg} ${m.color} uppercase tracking-wider"><span class="w-1 h-1 rounded-full ${m.dot}"></span>${esc(label)}</span>`;
}
function priDot(p) {
  if (!p) return '<span class="text-[10px] text-on-surface-variant/40">—</span>';
  const c = { p1: "bg-red-400", p2: "bg-orange-400", p3: "bg-slate-400" }[p] || "bg-slate-400";
  return `<span class="w-2 h-2 rounded-full ${c} inline-block" title="${esc(p)}"></span>`;
}
function formatDate(d) {
  if (!d) return "—";
  try { return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" }); }
  catch { return esc(String(d).slice(0, 10)); }
}

// --- Detail Panel ---
async function openDetail(itemId, skipHistory) {
  let item = null;
  let viewKey = activeView;

  // Search across all artifact types
  for (const [key, at] of Object.entries(appData.artifacts ?? {})) {
    const found = (at.items || []).find((i) => i.id === itemId);
    if (found) { item = found; viewKey = key; break; }
  }
  if (!item) {
    const legacyItem = (appData.implementationSpecs || []).find((i) => i.id === itemId);
    if (legacyItem) { item = legacyItem; viewKey = "impl-spec"; }
  }
  if (!item) return;

  if (!skipHistory && !$("#detail-panel").hidden) {
    const prevId = $("#detail-title").dataset.itemId;
    if (prevId && prevId !== itemId) detailHistory.push(prevId);
  }
  $("#detail-title").dataset.itemId = itemId;
  $("#detail-title").textContent = item.title || item.id;

  // Back button
  $("#detail-back").hidden = detailHistory.length === 0;

  // Meta chips
  const chips = [];
  chips.push(`<span class="font-mono text-indigo-400 text-[11px] bg-indigo-400/10 px-2 py-0.5 rounded">${esc(item.id)}</span>`);
  if (item.status && normStatus(item.status) !== "unknown") chips.push(statusBadge(item.status));
  if (item.priority) chips.push(`<span class="text-[11px] bg-surface-container-highest px-2 py-0.5 rounded">${esc(item.priority.toUpperCase())}</span>`);
  if (item.owner) chips.push(`<span class="text-[11px] text-on-surface-variant">${esc(cleanOwner(item.owner))}</span>`);
  if (item.updatedAt) chips.push(`<span class="text-[11px] text-on-surface-variant/50">${formatDate(item.updatedAt)}</span>`);
  $("#detail-meta").innerHTML = chips.join('<span class="text-outline-variant/30">·</span>');

  const tags = item.tags || [];
  const moduleScope = item.moduleScope || [];
  if (tags.length || moduleScope.length) {
    const tagHtml = [...tags, ...moduleScope].map((t) =>
      `<span class="text-[10px] bg-surface-container-high px-2 py-0.5 rounded text-on-surface-variant">${esc(t)}</span>`
    ).join("");
    $("#detail-meta").innerHTML += `<div class="flex gap-1.5 flex-wrap mt-1">${tagHtml}</div>`;
  }

  // Body
  const bodyEl = $("#detail-body");
  const cacheKey = `${viewKey}:${itemId}`;
  const fmHtml = renderFrontmatter(item);

  if (bodyCache[cacheKey]) {
    bodyEl.innerHTML = fmHtml + renderMd(bodyCache[cacheKey]);
  } else {
    bodyEl.innerHTML = fmHtml + '<div class="flex items-center gap-2 text-on-surface-variant mt-6"><span class="material-symbols-outlined animate-spin text-sm">progress_activity</span> Loading...</div>';
    try {
      const at = appData.artifacts?.[viewKey];
      const res = at
        ? await fetch("/api/artifact/body", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ repoPath: repoInput.value, artifactType: viewKey, itemId }) })
        : await fetch("/api/spec/body", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ repoPath: repoInput.value, specId: itemId }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      bodyCache[cacheKey] = data.body;
      bodyEl.innerHTML = fmHtml + renderMd(data.body);
    } catch (err) {
      bodyEl.innerHTML = fmHtml + `<p class="text-red-400 mt-6">Failed to load: ${esc(err.message)}</p>`;
    }
  }

  // Wire cross-links
  bodyEl.querySelectorAll("[data-link-id]").forEach((el) => {
    el.addEventListener("click", (e) => { e.preventDefault(); openDetail(el.dataset.linkId); });
  });

  $("#detail-panel").hidden = false;
}

function closeDetail() { $("#detail-panel").hidden = true; detailHistory = []; }
function goBack() { const prev = detailHistory.pop(); if (prev) openDetail(prev, true); }

function renderMd(md) {
  if (typeof marked !== "undefined" && marked.parse) {
    return '<div class="border-t border-outline-variant/10 pt-6 mt-2">' + marked.parse(md) + '</div>';
  }
  return `<pre class="whitespace-pre-wrap text-sm mt-6">${esc(md)}</pre>`;
}

function renderFrontmatter(item) {
  const fm = item.frontmatter || {};
  const links = item.links || {};
  const rows = [];
  const props = [
    ["Kind", fm.kind], ["Status", normStatus(item.status) !== "unknown" ? item.status : null],
    ["Priority", item.priority], ["Owner", cleanOwner(item.owner)],
    ["Verification", fm.verification_mode], ["Item Type", fm.item_type],
    ["Created", formatDate(fm.created_at)], ["Updated", formatDate(fm.updated_at)],
  ];
  for (const [label, value] of props) {
    if (value && value !== "—") rows.push(`<div class="flex gap-3"><span class="text-on-surface-variant/50 w-24 shrink-0 text-right">${esc(label)}</span><span class="text-on-surface">${esc(value)}</span></div>`);
  }
  const tags = item.tags || [];
  if (tags.length) rows.push(`<div class="flex gap-3"><span class="text-on-surface-variant/50 w-24 shrink-0 text-right">Tags</span><div class="flex gap-1.5 flex-wrap">${tags.map((t) => `<span class="bg-surface-container-high px-2 py-0.5 rounded">${esc(t)}</span>`).join("")}</div></div>`);
  const mods = item.moduleScope || [];
  if (mods.length) rows.push(`<div class="flex gap-3"><span class="text-on-surface-variant/50 w-24 shrink-0 text-right">Modules</span><div class="flex gap-1.5 flex-wrap">${mods.map((m) => `<span class="font-mono bg-surface-container-high px-2 py-0.5 rounded">${esc(m)}</span>`).join("")}</div></div>`);

  const linkSections = [
    ["Backlog", item.backlogId ? [item.backlogId] : []],
    ["Impl Specs", [...(item.implSpecs || []), ...(links.impl_spec || []), ...(links.impl_specs || [])]],
    ["Depends On", links.depends_on || []], ["Requirements", links.requirements || []],
  ];
  for (const [label, ids] of linkSections) {
    const unique = [...new Set(Array.isArray(ids) ? ids : [ids])].filter(Boolean);
    if (unique.length) {
      rows.push(`<div class="flex gap-3"><span class="text-on-surface-variant/50 w-24 shrink-0 text-right">${esc(label)}</span><div class="flex gap-1.5 flex-wrap">${unique.map((id) =>
        `<a href="#" data-link-id="${esc(id)}" class="font-mono text-indigo-400 hover:text-indigo-300 bg-indigo-400/10 px-2 py-0.5 rounded hover:bg-indigo-400/20 transition-colors">${esc(id)}</a>`
      ).join("")}</div></div>`);
    }
  }
  if (rows.length === 0) return "";
  return `<div class="bg-surface-container-low rounded-xl p-5 mb-6 border border-outline-variant/10 text-xs space-y-2">${rows.join("")}</div>`;
}
