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
[[ "$OUT" = /* ]] || OUT="$PWD/$OUT"

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

# ─── Step 1: Build Rust workspace ─────────────────────────────────────────────
log "Building Rust workspace (cargo build --release)..."
(cd "$DATALOAD" && cargo build --release)

# Verify binaries exist after build
for bin in ols_create_manifest ols_link ols_json2neo ols_json2solr; do
    [ -f "$RUST_BINS/$bin" ] || err "Expected Rust binary not found after build: $RUST_BINS/$bin"
done
log "Rust build complete."

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

# ─── Step 8: Generate Solr config ─────────────────────────────────────────────
log "Building Solr config (solr_config_builder)..."
java -jar "$SOLR_CFG_BUILDER_JAR" \
    --manifestPath           "$OUT/linker_manifest.json" \
    --solrConfigTemplatePath "$SOLR_CFG_TEMPLATE" \
    --outDir                 "$SOLR_HOME_DIR"

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
"$SOLR_HOME/bin/solr" start -s "$SOLR_HOME_DIR" -p 8983 -force

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
