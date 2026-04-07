# Local Dev Setup Without Docker — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create `dev-testing/dev-local.sh` — a single script that builds Rust binaries, runs the full data pipeline for one ontology, loads Solr and Neo4j locally, and leaves both running so the developer can start the backend and frontend separately.

**Architecture:** Single bash script built up in 5 tasks. Each task adds a self-contained section to the script. Solr is started with `-s <generated-config-dir>` so the local install is not polluted. Neo4j is imported via `neo4j-admin database import full` then started. Both are left running at the end.

**Tech Stack:** Bash, Rust (`cargo build --release`), Java (rdf2json + solr_config_builder JARs), Python 3 (create_neo4j_indexes.py), Solr 9.8.1, Neo4j 2025.x.

**Spec:** `docs/superpowers/specs/2026-04-07-local-dev-setup-design.md`

---

## File Map

| Action | Path | Responsibility |
|--------|------|----------------|
| Create | `dev-testing/dev-local.sh` | End-to-end local dev setup script |

---

## Task 1: Script skeleton — argument parsing and validation

**Files:**
- Create: `dev-testing/dev-local.sh`

- [ ] **Step 1.1: Create the script with arg parsing, validation, and path setup**

```bash
cat > dev-testing/dev-local.sh << 'SCRIPT'
#!/usr/bin/env bash
set -Eeuo pipefail

# ─── Colours ──────────────────────────────────────────────────────────────────
GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; NC='\033[0m'
log()  { echo -e "${GREEN}[dev-local]${NC} $*"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $*"; }
err()  { echo -e "${RED}[ERROR]${NC} $*" >&2; exit 1; }

# ─── Arguments ────────────────────────────────────────────────────────────────
CONFIG=${1:-}
OUT=${2:-dev-local-out}

[ -z "$CONFIG" ] && err "Usage: $0 <ontology_config.json> [out_dir]
  <ontology_config.json>  path to a single ontology config (e.g. dataload/configs/efo.json)
  [out_dir]               output directory, default: dev-local-out/ (cleaned each run)"
[ ! -f "$CONFIG" ] && err "Config file not found: $CONFIG"

# ─── Env var checks ───────────────────────────────────────────────────────────
[ -z "${NEO4J_HOME:-}" ] && err "NEO4J_HOME is not set (point it at your Neo4j install dir)"
[ -z "${SOLR_HOME:-}" ]  && err "SOLR_HOME is not set (point it at your Solr install dir)"
command -v java  &>/dev/null || err "java not found on PATH"
command -v cargo &>/dev/null || err "cargo not found on PATH (install Rust via rustup)"

# ─── Derived paths ────────────────────────────────────────────────────────────
SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
OLS4_HOME=$(cd "$SCRIPT_DIR/.." && pwd)
CONFIG=$(realpath "$CONFIG")
OUT=$(realpath -m "$OUT")

DATALOAD="$OLS4_HOME/dataload"
RDF2JSON_JAR="$DATALOAD/rdf2json/target/rdf2json-1.0-SNAPSHOT.jar"
SOLR_CFG_BUILDER_JAR="$DATALOAD/solr_config_builder/target/solr_config_builder-1.0-SNAPSHOT.jar"
SOLR_CFG_TEMPLATE="$DATALOAD/solr_config_template"
NEO4J_INDEXES_PY="$DATALOAD/create_neo4j_indexes.py"

RUST_BINS="$DATALOAD/target/release"
OLS_CREATE_MANIFEST="$RUST_BINS/ols_create_manifest"
OLS_LINK="$RUST_BINS/ols_link"
OLS_JSON2NEO="$RUST_BINS/ols_json2neo"
OLS_JSON2SOLR="$RUST_BINS/ols_json2solr"

# Output subdirectories (created in Task 3)
NEO_CSVS="$OUT/neo-csvs"
SOLR_DATA="$OUT/solr-data"
SOLR_HOME_DIR="$OUT/solr-home"

# ─── JAR checks (skip Rust — built below) ─────────────────────────────────────
[ ! -f "$RDF2JSON_JAR" ] && err "rdf2json JAR not found. Build it first:
  cd $DATALOAD/rdf2json && mvn -B -ntp package -DskipTests"
[ ! -f "$SOLR_CFG_BUILDER_JAR" ] && err "solr_config_builder JAR not found. Build it first:
  cd $DATALOAD/solr_config_builder && mvn -B -ntp package -DskipTests"

log "Config : $CONFIG"
log "Output : $OUT"
log "Neo4j  : $NEO4J_HOME"
log "Solr   : $SOLR_HOME"
SCRIPT
chmod +x dev-testing/dev-local.sh
```

- [ ] **Step 1.2: Verify validation works**

```bash
# Should fail with clear message about NEO4J_HOME
bash dev-testing/dev-local.sh 2>&1 | grep -q "Usage:" && echo "PASS: usage message shown"

# Should fail if config doesn't exist
NEO4J_HOME=/tmp SOLR_HOME=/tmp bash dev-testing/dev-local.sh /nonexistent.json 2>&1 \
  | grep -q "Config file not found" && echo "PASS: missing config caught"

# Should fail if NEO4J_HOME not set
bash dev-testing/dev-local.sh dataload/configs/efo.json 2>&1 \
  | grep -q "NEO4J_HOME" && echo "PASS: missing env var caught"
```

Expected: all three lines print `PASS:`.

- [ ] **Step 1.3: Commit**

```bash
git add dev-testing/dev-local.sh
git commit -m "feat: add dev-local.sh skeleton with validation"
```

---

## Task 2: Rust build step

**Files:**
- Modify: `dev-testing/dev-local.sh` (append Rust build section)

- [ ] **Step 2.1: Append the Rust build section to the script**

```bash
cat >> dev-testing/dev-local.sh << 'SCRIPT'

# ─── Step 1: Build Rust workspace ─────────────────────────────────────────────
log "Building Rust workspace (cargo build --release)..."
(cd "$DATALOAD" && cargo build --release)

# Verify binaries exist after build
for bin in ols_create_manifest ols_link ols_json2neo ols_json2solr; do
    [ -f "$RUST_BINS/$bin" ] || err "Expected Rust binary not found after build: $RUST_BINS/$bin"
done
log "Rust build complete."
SCRIPT
```

- [ ] **Step 2.2: Run up to this point and verify binaries exist**

```bash
# Use a real config to pass validation; env vars must be set
export NEO4J_HOME=/path/to/your/neo4j   # ← set to your actual path
export SOLR_HOME=/path/to/your/solr     # ← set to your actual path
bash dev-testing/dev-local.sh dataload/configs/efo.json /tmp/ols4-test-out 2>&1 | tail -5
```

Expected last line: `[dev-local] Rust build complete.`
The script will then fail (no data pipeline yet) — that's fine.

- [ ] **Step 2.3: Commit**

```bash
git add dev-testing/dev-local.sh
git commit -m "feat: add Rust build step to dev-local.sh"
```

---

## Task 3: Data generation pipeline

Runs rdf2json → create_manifest → link → json2neo → json2solr. Produces all intermediate files in `$OUT/`.

**Files:**
- Modify: `dev-testing/dev-local.sh` (append data pipeline section)

- [ ] **Step 3.1: Append the data pipeline section**

```bash
cat >> dev-testing/dev-local.sh << 'SCRIPT'

# ─── Step 2: Clean and create output directories ───────────────────────────────
log "Cleaning output directory: $OUT"
rm -rf "$OUT"
mkdir -p "$NEO_CSVS" "$SOLR_DATA" "$SOLR_HOME_DIR"

# ─── Step 3: rdf2json ─────────────────────────────────────────────────────────
log "Running rdf2json..."
java ${JAVA_OPTS:-} \
    -DentityExpansionLimit=0 -DtotalEntitySizeLimit=0 \
    -Djdk.xml.totalEntitySizeLimit=0 -Djdk.xml.entityExpansionLimit=0 \
    -jar "$RDF2JSON_JAR" \
    --config "$CONFIG" \
    --output "$OUT/ontologies.json"
[ -f "$OUT/ontologies.json" ] || err "rdf2json produced no output"
log "rdf2json done."

# ─── Step 4: create_manifest ──────────────────────────────────────────────────
log "Running ols_create_manifest..."
"$OLS_CREATE_MANIFEST" \
    --input "$OUT/ontologies.json" \
    --output "$OUT/linker_manifest.json"
[ -f "$OUT/linker_manifest.json" ] || err "create_manifest produced no output"
log "create_manifest done."

# ─── Step 5: link ─────────────────────────────────────────────────────────────
log "Running ols_link..."
"$OLS_LINK" \
    --manifest "$OUT/linker_manifest.json" \
    --input    "$OUT/ontologies.json" \
    --output   "$OUT/ontologies_linked.json"
[ -f "$OUT/ontologies_linked.json" ] || err "ols_link produced no output"
log "link done."

# ─── Step 6: json2neo ─────────────────────────────────────────────────────────
log "Running ols_json2neo (produces CSVs for Neo4j)..."
"$OLS_JSON2NEO" \
    --manifest   "$OUT/linker_manifest.json" \
    --input      "$OUT/ontologies_linked.json" \
    --outDir     "$NEO_CSVS"
log "json2neo done. CSV count: $(find "$NEO_CSVS" -name '*.csv' | wc -l | tr -d ' ')"

# ─── Step 7: json2solr ────────────────────────────────────────────────────────
log "Running ols_json2solr (produces JSONL for Solr)..."
"$OLS_JSON2SOLR" \
    --input    "$OUT/ontologies_linked.json" \
    --outDir   "$SOLR_DATA"
log "json2solr done. JSONL count: $(find "$SOLR_DATA" -name '*.jsonl' | wc -l | tr -d ' ')"
SCRIPT
```

- [ ] **Step 3.2: Run and verify data files are produced**

```bash
bash dev-testing/dev-local.sh dataload/configs/efo.json /tmp/ols4-test-out 2>&1 | grep "\[dev-local\]"
```

Expected output includes lines like:
```
[dev-local] rdf2json done.
[dev-local] create_manifest done.
[dev-local] link done.
[dev-local] json2neo done. CSV count: <N>
[dev-local] json2solr done. JSONL count: <N>
```

Then verify files exist:
```bash
ls /tmp/ols4-test-out/
# Should show: ontologies.json  linker_manifest.json  ontologies_linked.json  neo-csvs/  solr-data/  solr-home/

ls /tmp/ols4-test-out/solr-data/
# Should show *.jsonl files (classes.jsonl, properties.jsonl, etc.)

ls /tmp/ols4-test-out/neo-csvs/
# Should show *.csv files
```

- [ ] **Step 3.3: Commit**

```bash
git add dev-testing/dev-local.sh
git commit -m "feat: add data pipeline steps to dev-local.sh"
```

---

## Task 4: Solr schema setup and data loading

Runs `solr_config_builder` to generate a schema-correct Solr home directory, starts Solr against it, then loads all JSONL data.

**Files:**
- Modify: `dev-testing/dev-local.sh` (append Solr section)

- [ ] **Step 4.1: Append the Solr setup and loading section**

```bash
cat >> dev-testing/dev-local.sh << 'SCRIPT'

# ─── Step 8: Generate Solr config ─────────────────────────────────────────────
log "Building Solr config (solr_config_builder)..."
java -jar "$SOLR_CFG_BUILDER_JAR" \
    --manifestPath         "$OUT/linker_manifest.json" \
    --solrConfigTemplatePath "$SOLR_CFG_TEMPLATE" \
    --outDir               "$SOLR_HOME_DIR"

# solr_config_builder produces the core conf dirs but not solr.xml.
# Copy solr.xml from the local Solr install so Solr recognises the directory.
SOLR_XML_SRC="$SOLR_HOME/server/solr/solr.xml"
[ ! -f "$SOLR_XML_SRC" ] && err "solr.xml not found at $SOLR_XML_SRC — check your SOLR_HOME"
cp "$SOLR_XML_SRC" "$SOLR_HOME_DIR/solr.xml"

# Create core.properties for each core so Solr auto-discovers them.
for core in ols4_entities ols4_autocomplete; do
    mkdir -p "$SOLR_HOME_DIR/$core"
    echo "name=$core" > "$SOLR_HOME_DIR/$core/core.properties"
done
log "Solr config built."

# ─── Step 9: Stop any running Solr ────────────────────────────────────────────
log "Stopping any running Solr..."
"$SOLR_HOME/bin/solr" stop -all 2>/dev/null || true
sleep 3

# ─── Step 10: Start Solr pointing at generated config ─────────────────────────
log "Starting Solr (port 8983, home: $SOLR_HOME_DIR)..."
"$SOLR_HOME/bin/solr" start -s "$SOLR_HOME_DIR" -p 8983 -noprompt -force

# Poll until Solr is ready (up to 60 seconds)
log "Waiting for Solr to be ready..."
for i in $(seq 1 30); do
    if curl -sf "http://localhost:8983/solr/ols4_entities/admin/ping" &>/dev/null; then
        log "Solr is ready."
        break
    fi
    [ "$i" -eq 30 ] && err "Solr did not become ready within 60 seconds"
    sleep 2
done

# ─── Step 11: Load JSONL data into Solr ───────────────────────────────────────
log "Loading JSONL data into Solr..."
while IFS= read -r -d '' jsonl_file; do
    if [[ "$jsonl_file" == *autocomplete* ]]; then
        core="ols4_autocomplete"
    else
        core="ols4_entities"
    fi
    log "  → $core : $(basename "$jsonl_file")"
    curl -sf \
        -X POST \
        -H "Content-Type: application/json" \
        --data-binary "@$jsonl_file" \
        "http://localhost:8983/solr/$core/update/json/docs" \
        > /dev/null
done < <(find "$SOLR_DATA" -name '*.jsonl' -print0)

# ─── Step 12: Commit Solr ─────────────────────────────────────────────────────
log "Committing Solr..."
curl -sf "http://localhost:8983/solr/ols4_entities/update?commit=true" > /dev/null
curl -sf "http://localhost:8983/solr/ols4_autocomplete/update?commit=true" > /dev/null
log "Solr loaded and committed."
SCRIPT
```

- [ ] **Step 4.2: Run and verify Solr is loaded**

```bash
bash dev-testing/dev-local.sh dataload/configs/efo.json /tmp/ols4-test-out 2>&1 | grep "\[dev-local\]"
```

Expected last lines:
```
[dev-local] Solr loaded and committed.
```

Then verify data is in Solr:
```bash
curl -s "http://localhost:8983/solr/ols4_entities/select?q=*:*&rows=0" \
  | python3 -c "import sys,json; d=json.load(sys.stdin); print('Docs in Solr:', d['response']['numFound'])"
```
Expected: `Docs in Solr: <N>` where N > 0.

- [ ] **Step 4.3: Commit**

```bash
git add dev-testing/dev-local.sh
git commit -m "feat: add Solr setup and loading steps to dev-local.sh"
```

---

## Task 5: Neo4j import, startup, and index creation

**Files:**
- Modify: `dev-testing/dev-local.sh` (append Neo4j section + done message)

- [ ] **Step 5.1: Append the Neo4j import, startup, and index section**

```bash
cat >> dev-testing/dev-local.sh << 'SCRIPT'

# ─── Step 13: Stop any running Neo4j ──────────────────────────────────────────
log "Stopping any running Neo4j..."
"$NEO4J_HOME/bin/neo4j" stop 2>/dev/null || true
sleep 5

# ─── Step 14: Import CSVs into Neo4j ──────────────────────────────────────────
log "Importing CSVs into Neo4j..."

# Build --nodes and --relationships args from CSV files in $NEO_CSVS
NODE_ARGS=()
REL_ARGS=()

for pattern in "*_ontologies.csv" "*_classes.csv" "*_properties.csv" "*_individuals.csv" "*_embedding_nodes.csv"; do
    while IFS= read -r -d '' f; do
        NODE_ARGS+=("--nodes=$f")
    done < <(find "$NEO_CSVS" -name "$pattern" -print0 2>/dev/null)
done

while IFS= read -r -d '' f; do
    REL_ARGS+=("--relationships=$f")
done < <(find "$NEO_CSVS" -name "*_edges.csv" -print0 2>/dev/null)

"$NEO4J_HOME/bin/neo4j-admin" database import full neo4j \
    --overwrite-destination \
    --ignore-empty-strings=true \
    --legacy-style-quoting=false \
    --multiline-fields=true \
    --array-delimiter="|" \
    --threads=4 \
    --read-buffer-size=134217728 \
    "${NODE_ARGS[@]}" \
    "${REL_ARGS[@]}"
log "Neo4j import complete."

# ─── Step 15: Start Neo4j ─────────────────────────────────────────────────────
log "Starting Neo4j..."
"$NEO4J_HOME/bin/neo4j" start

# Poll bolt port until Neo4j is ready (up to 90 seconds)
log "Waiting for Neo4j to be ready on bolt://localhost:7687..."
for i in $(seq 1 45); do
    if nc -z localhost 7687 2>/dev/null; then
        log "Neo4j is ready."
        break
    fi
    [ "$i" -eq 45 ] && err "Neo4j did not become ready within 90 seconds"
    sleep 2
done
# Give the Bolt protocol a few extra seconds to fully initialise
sleep 5

# ─── Step 16: Create Neo4j indexes ────────────────────────────────────────────
log "Creating Neo4j indexes..."
# create_neo4j_indexes.py outputs Cypher; pipe to cypher-shell.
# Pass no parquet files — skips vector indexes for basic local dev.
python3 "$NEO4J_INDEXES_PY" | \
    "$NEO4J_HOME/bin/cypher-shell" --non-interactive 2>&1 | grep -v "^$" || true
log "Neo4j indexes created."

# ─── Done ─────────────────────────────────────────────────────────────────────
echo ""
echo -e "${GREEN}╔══════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║  Local OLS4 stack is ready!                      ║${NC}"
echo -e "${GREEN}╠══════════════════════════════════════════════════╣${NC}"
echo -e "${GREEN}║  Solr  → http://localhost:8983                   ║${NC}"
echo -e "${GREEN}║  Neo4j → bolt://localhost:7687                   ║${NC}"
echo -e "${GREEN}╠══════════════════════════════════════════════════╣${NC}"
echo -e "${GREEN}║  Start backend:                                  ║${NC}"
echo -e "${GREEN}║    ./dev-testing/start-backend.sh                ║${NC}"
echo -e "${GREEN}║  Start frontend:                                 ║${NC}"
echo -e "${GREEN}║    cd frontend && npm run dev                    ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════╝${NC}"
SCRIPT
```

- [ ] **Step 5.2: Run and verify Neo4j is loaded**

```bash
bash dev-testing/dev-local.sh dataload/configs/efo.json /tmp/ols4-test-out 2>&1 | grep "\[dev-local\]"
```

Expected last lines:
```
[dev-local] Neo4j import complete.
[dev-local] Neo4j is ready.
[dev-local] Neo4j indexes created.
```

Then verify Neo4j has data:
```bash
echo "MATCH (n:OntologyClass) RETURN count(n) LIMIT 1;" \
  | "$NEO4J_HOME/bin/cypher-shell" --non-interactive
```
Expected: `count(n)` row with a number > 0.

- [ ] **Step 5.3: Smoke test — start backend and hit an API endpoint**

```bash
# In a separate terminal, start the backend
./dev-testing/start-backend.sh

# Wait ~15s for Spring Boot to start, then hit the API
curl -s "http://localhost:8080/api/v2/ontologies?page=0&size=5" \
  | python3 -c "import sys,json; d=json.load(sys.stdin); print('Ontologies:', len(d['_embedded']['ontologies']))"
```
Expected: `Ontologies: <N>` where N > 0.

- [ ] **Step 5.4: Commit**

```bash
git add dev-testing/dev-local.sh
git commit -m "feat: add Neo4j import, startup and index creation to dev-local.sh"
```

---

## Self-Review

**Spec coverage:**
- ✓ Script at `dev-testing/dev-local.sh` — Task 1
- ✓ Validates NEO4J_HOME, SOLR_HOME, config file — Task 1
- ✓ Cargo build --release always — Task 2
- ✓ rdf2json → create_manifest → link → json2neo → json2solr — Task 3
- ✓ solr_config_builder → copies solr.xml → creates core.properties — Task 4
- ✓ Stop/start Solr with `-s $OUT/solr-home` — Task 4
- ✓ Load all JSONL, commit both cores — Task 4
- ✓ Stop Neo4j → import CSVs → start Neo4j → create indexes — Task 5
- ✓ Done message with next steps — Task 5
- ✓ Maven JARs checked at startup (not built by script) — Task 1
- ✓ Embeddings not loaded (no parquets passed to json2neo or create_neo4j_indexes.py) — in scope per spec

**Placeholder scan:** No TBDs, no "add appropriate handling". All code is complete. ✓

**Type consistency:** Variable names (`OLS_CREATE_MANIFEST`, `OLS_LINK`, `OLS_JSON2NEO`, `OLS_JSON2SOLR`, `NEO_CSVS`, `SOLR_DATA`, `SOLR_HOME_DIR`) defined in Task 1 skeleton and used consistently across Tasks 2-5. ✓
