# Local Dev Setup Without Docker — Design Spec

**Date:** 2026-04-07
**Branch context:** `fix-search-issue`

## Goal

Provide a single shell script that lets a developer load one ontology config into local (non-Docker) Solr and Neo4j instances, so they can run the backend and frontend separately against real data. Replaces the old `teststack-mac.sh` / `create_datafiles.sh` pair, which broke when the pipeline gained a Rust workspace and the Solr schema-generation step.

---

## Script

**Location:** `dev-testing/dev-local.sh`

**Usage:**
```bash
./dev-testing/dev-local.sh <ontology_config.json> [out_dir]
```

| Argument | Required | Default | Description |
|---|---|---|---|
| `ontology_config.json` | Yes | — | Path to a single ontology JSON config (e.g. `dataload/configs/efo.json`) |
| `out_dir` | No | `dev-local-out/` | Output directory — cleaned on every run |

---

## Prerequisites

The following must be in place before running the script:

| Requirement | How |
|---|---|
| `NEO4J_HOME` env var | Path to local Neo4j installation (e.g. `/opt/neo4j`) |
| `SOLR_HOME` env var | Path to local Solr installation (e.g. `/opt/solr`) |
| `java` on PATH | For rdf2json and solr_config_builder JARs |
| Maven JARs pre-built | `dataload/rdf2json/target/rdf2json-1.0-SNAPSHOT.jar` and `dataload/solr_config_builder/target/solr_config_builder-1.0-SNAPSHOT.jar` must exist |
| `cargo` on PATH | Rust toolchain (script builds binaries automatically) |
| `python3` with `requests` | For create_neo4j_indexes.py |

The script validates `NEO4J_HOME`, `SOLR_HOME`, and the config file at startup and exits with a clear error if any are missing.

---

## Pipeline Steps

The script runs `set -Eeuo pipefail` — it fails fast on any error.

```
Step  What                  Detail
────  ─────────────────────────────────────────────────────────────────────
 1.   Validate              Check NEO4J_HOME, SOLR_HOME, config file exists
 2.   Rust build            cd dataload && cargo build --release
                            Builds: ols_create_manifest, ols_link, ols_json2neo,
                                    ols_json2solr, extract_strings_from_terms
 3.   Clean output          rm -rf $OUT && mkdir -p $OUT/neo-csvs $OUT/solr-data
 4.   rdf2json              Java JAR → $OUT/ontologies.json
 5.   create_manifest       ols_create_manifest → $OUT/linker_manifest.json
 6.   link                  ols_link → $OUT/ontologies_linked.json
 7.   json2neo              ols_json2neo → $OUT/neo-csvs/*.csv
 8.   json2solr             ols_json2solr → $OUT/solr-data/*.jsonl
 9.   Solr config build     solr_config_builder → $OUT/solr-home/
                            Copies $SOLR_HOME/server/solr/solr.xml into $OUT/solr-home/
                            so Solr recognises it as a valid home directory
10.   Solr stop             $SOLR_HOME/bin/solr stop -all (errors ignored)
11.   Solr start            $SOLR_HOME/bin/solr start -s $OUT/solr-home -p 8983
                            Wait for Solr to be ready (poll /solr/admin/ping)
12.   Solr load             POST each *.jsonl to ols4_entities or ols4_autocomplete
                            (filename containing "autocomplete" → autocomplete core)
13.   Solr commit           GET /solr/ols4_entities/update?commit=true
                            GET /solr/ols4_autocomplete/update?commit=true
14.   Neo4j stop            $NEO4J_HOME/bin/neo4j stop (errors ignored)
15.   Neo4j import          neo4j-admin database import full
                            Uses same --nodes/--relationships logic as make_csv_import_cmd.sh
16.   Neo4j start           $NEO4J_HOME/bin/neo4j start
                            Wait for Neo4j to be ready (poll bolt port 7687)
17.   Neo4j indexes         python3 dataload/create_neo4j_indexes.py
                            Creates standard + vector indexes on the running instance
18.   Done                  Print instructions to start backend and frontend
```

---

## Solr Home Setup (step 9)

`solr_config_builder` copies the entire `dataload/solr_config_template/` directory to `$OUT/solr-home/` and replaces the `[[OLS_FIELDS]]` placeholder in `ols4_entities/conf/schema.xml` with field definitions derived from the manifest. The result is:

```
$OUT/solr-home/
  solr.xml                        ← copied from $SOLR_HOME/server/solr/solr.xml
  ols4_entities/conf/schema.xml   ← generated (fields from manifest + DefinedFields)
  ols4_entities/conf/solrconfig.xml
  ols4_autocomplete/conf/...
```

Starting Solr with `-s $OUT/solr-home` points it at this directory as its core root, leaving the local Solr installation unmodified.

---

## Neo4j CSV Import (step 15)

Uses the same argument-building logic as `dev-testing/make_csv_import_cmd.sh`:
- `--nodes` for `*_ontologies.csv`, `*_classes.csv`, `*_properties.csv`, `*_individuals.csv`
- `--relationships` for `*_edges.csv`

Flags:
```bash
neo4j-admin database import full \
  --ignore-empty-strings=true \
  --legacy-style-quoting=false \
  --multiline-fields=true \
  --array-delimiter="|" \
  --threads=4 \
  --read-buffer-size=134217728 \
  <nodes and relationships>
```

---

## End State

After the script completes, the developer:

1. Starts the backend: `./dev-testing/start-backend.sh` (or `mvn spring-boot:run` in `backend/`)
2. Starts the frontend: `./dev-testing/start-frontend.sh` (or `npm run dev` in `frontend/`)

Solr runs on `localhost:8983`, Neo4j on `localhost:7687`.

---

## What Is NOT in Scope

- Multi-ontology loading (one config file per run; use a merged config for multiple)
- Embeddings support (script does not pass `--embeddingParquets`; add manually if needed)
- SSSOM curations (not loaded; add manually if needed)
- macOS/Linux compatibility differences beyond the basics (script targets macOS)
