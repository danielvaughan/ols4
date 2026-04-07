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
