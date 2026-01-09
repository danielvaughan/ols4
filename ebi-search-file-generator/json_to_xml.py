#!/usr/bin/env python3
"""
Convert ontology JSON files to custom XML format for EBI Search.
This version processes JSON output from ontology processing pipelines.
"""

import argparse
import json
import sys
from datetime import datetime
from xml.etree.ElementTree import Element, SubElement, ElementTree, indent
from typing import Optional, List, Dict


def extract_value(obj, default=""):
    """
    Extract value from a nested object structure.
    Handles both simple values and objects with 'value' key.
    Also handles reified structures where value contains another object.
    """
    if obj is None:
        return default
    if isinstance(obj, dict):
        value = obj.get("value")
        if value is None:
            return default
        # Handle reified structures: {"value": {"value": "actual text"}}
        if isinstance(value, dict):
            return extract_value(value, default)
        # Handle simple case: {"value": "text"}
        if isinstance(value, str):
            return value
        # If value is something else, convert to string
        return str(value)
    if isinstance(obj, list) and len(obj) > 0:
        return extract_value(obj[0], default)
    if isinstance(obj, str):
        return obj
    return default


def extract_synonyms(class_obj: dict) -> List[str]:
    """
    Extract all synonyms from a class object.
    Handles multiple synonym formats:
    1. Simple: {"type": ["literal"], "value": "text"}
    2. Reified: {"type": ["reification"], "value": {"value": "text"}}
    3. With rdfs:label: {"http://www.w3.org/2000/01/rdf-schema#label": {"value": "text"}}
    """
    synonyms = []
    synonym_list = class_obj.get("synonym", [])

    if not synonym_list:
        return synonyms

    for syn_obj in synonym_list:
        if isinstance(syn_obj, dict):
            synonym_text = None

            # Try to get value directly (handles both simple and reified)
            if "value" in syn_obj:
                synonym_text = extract_value(syn_obj)

            # Try rdfs:label (for older format)
            if not synonym_text:
                label = syn_obj.get("http://www.w3.org/2000/01/rdf-schema#label")
                if label:
                    synonym_text = extract_value(label)

            if synonym_text and synonym_text not in synonyms:
                synonyms.append(str(synonym_text))

    return synonyms


def extract_definition(class_obj: dict) -> str:
    """
    Extract definition from a class object.
    Handles both simple and reified definition structures.
    """
    definition_list = class_obj.get("definition", [])
    if definition_list:
        result = extract_value(definition_list[0])
        return str(result) if result else ""
    return ""


def extract_label(class_obj: dict) -> str:
    """
    Extract label from a class object.
    """
    label_list = class_obj.get("label", [])
    if label_list:
        result = extract_value(label_list[0])
        return str(result) if result else ""
    return ""


def get_term_id_from_shortform(shortform: str) -> Optional[str]:
    """
    Extract ID from shortForm (e.g., "RO_0002310" from shortform value).
    """
    value = extract_value(shortform)
    if value and "_" in str(value):
        # Handle cases like "OIO_Definition" -> "OIO_Definition"
        # or "RO_0002310" -> "RO_0002310"
        return str(value)
    return None


def get_obo_id_from_curie(curie: str, shortform: str) -> str:
    """
    Extract OBO ID from curie or shortform (e.g., "RO:0002310").
    """
    # First try curie
    curie_value = extract_value(curie)
    if curie_value and ":" in str(curie_value):
        return str(curie_value)

    # Fallback to shortform conversion
    shortform_value = extract_value(shortform)
    if shortform_value and "_" in str(shortform_value):
        return str(shortform_value).replace("_", ":", 1)

    return ""


def get_ontology_prefix(shortform: str) -> str:
    """
    Extract ontology prefix from shortForm (e.g., "ro" from "RO_0002310").
    """
    value = extract_value(shortform)
    if value and "_" in str(value):
        return str(value).split("_")[0].lower()
    return "unknown"


def parse_json_ontology(file_path: str, target_ontology_id: Optional[str] = None) -> tuple:
    """
    Parse JSON ontology file and extract metadata and terms.

    Args:
        file_path: Path to JSON file
        target_ontology_id: Optional specific ontology ID to process.
                           If None, processes the first ontology with classes.

    Returns:
        Tuple of (ontology_metadata, terms_list, output_filename)
    """
    print(f"Loading ontology from: {file_path}")

    with open(file_path, 'r', encoding='utf-8') as f:
        data = json.load(f)

    if "ontologies" not in data:
        raise ValueError("Invalid JSON format: 'ontologies' key not found")

    # Find the target ontology
    target_onto = None
    for onto in data["ontologies"]:
        ontology_id = onto.get("ontologyId", "unknown")
        classes = onto.get("classes", [])

        # If specific ontology requested, find it
        if target_ontology_id:
            if ontology_id.lower() == target_ontology_id.lower():
                target_onto = onto
                break
        # Otherwise, use first ontology with classes
        elif len(classes) > 0:
            target_onto = onto
            break

    if target_onto is None:
        # Fallback to first ontology even if it has no classes
        if len(data["ontologies"]) > 0:
            target_onto = data["ontologies"][0]
        else:
            raise ValueError("No ontologies found in JSON file")

    # Extract ontology metadata
    ontology_id = target_onto.get("ontologyId", "unknown")

    # Get preferredPrefix, fallback to ontologyId
    preferred_prefix = target_onto.get("preferredPrefix", ontology_id)
    if not preferred_prefix:
        preferred_prefix = ontology_id

    # Use uppercase for filtering
    prefix_filter = preferred_prefix.upper()

    metadata = {
        "name": target_onto.get("title", preferred_prefix),
        "description": target_onto.get("description", ""),
        "release": "None",
        "release_date": datetime.now().strftime("%Y-%m-%dT%H:%M:%S.000+0000"),
        "ontology_id": ontology_id,
        "preferred_prefix": preferred_prefix
    }

    # Try to extract version info
    version_iri = target_onto.get("http://www.w3.org/2002/07/owl#versionIRI")
    if version_iri:
        version = extract_value(version_iri)
        if version:
            metadata["release"] = version

    # Generate output filename
    output_filename = f"EBISearch_{ontology_id}.xml"

    # Process classes
    classes = target_onto.get("classes", [])
    print(f"Processing ontology '{ontology_id}' (prefix: {preferred_prefix}) with {len(classes)} classes")

    all_terms = []
    for class_obj in classes:
        shortform = class_obj.get("shortForm", {})
        term_id = get_term_id_from_shortform(shortform)

        if not term_id:
            continue

        # Filter by prefix
        if not term_id.upper().startswith(f"{prefix_filter}_"):
            continue

        # Extract term information
        iri = class_obj.get("iri", "")
        label = extract_label(class_obj)
        definition = extract_definition(class_obj)
        synonyms = extract_synonyms(class_obj)
        curie = class_obj.get("curie", {})

        term = {
            "id": term_id,
            "name": label,
            "description": definition,
            "ontology_name": get_ontology_prefix(shortform),
            "obo_id": get_obo_id_from_curie(curie, shortform),
            "iri": iri,
            "synonyms": synonyms
        }

        all_terms.append(term)

    print(f"Found {len(all_terms)} terms with prefix {prefix_filter}")
    return metadata, all_terms, output_filename


def create_xml(metadata: dict, terms: list, output_file: str):
    """
    Create XML file in the specified format.
    """
    # Create root element
    database = Element("database")

    # Add metadata
    name_elem = SubElement(database, "name")
    name_elem.text = metadata["name"]

    desc_elem = SubElement(database, "description")
    desc_elem.text = metadata["description"]

    release_elem = SubElement(database, "release")
    release_elem.text = metadata["release"]

    release_date_elem = SubElement(database, "release_date")
    release_date_elem.text = metadata["release_date"]

    entry_count_elem = SubElement(database, "entry_count")
    entry_count_elem.text = str(len(terms))

    # Add entries
    entries = SubElement(database, "entries")

    for term in sorted(terms, key=lambda x: x["id"]):
        entry = SubElement(entries, "entry", id=term["id"])

        name_elem = SubElement(entry, "name")
        name_elem.text = term["name"]

        desc_elem = SubElement(entry, "description")
        desc_elem.text = term["description"]

        # Additional fields
        add_fields = SubElement(entry, "additional_fields")

        ontology_field = SubElement(add_fields, "field", name="ontology_name")
        ontology_field.text = term["ontology_name"]

        obo_id_field = SubElement(add_fields, "field", name="obo_id")
        obo_id_field.text = term["obo_id"]

        iri_field = SubElement(add_fields, "field", name="iri")
        iri_field.text = term["iri"]

        # Add synonyms (if any)
        for synonym in term.get("synonyms", []):
            synonym_field = SubElement(add_fields, "field", name="synonym")
            synonym_field.text = synonym

    # Create tree and write to file
    tree = ElementTree(database)
    indent(tree, space="    ")
    tree.write(output_file, encoding="utf-8", xml_declaration=False)
    print(f"XML file created: {output_file}")


def main():
    parser = argparse.ArgumentParser(
        description="Convert ontology JSON files to custom XML format for EBI Search",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Convert JSON file (auto-detects ontology and generates output filename)
  %(prog)s --input rdf-output-hp.json
  # Creates: EBISearch_hp.xml

  # Convert specific ontology from multi-ontology JSON
  %(prog)s --input rdf-output.json --ontology-id hp
  # Creates: EBISearch_hp.xml

Output filename is automatically generated as: EBISearch_{ontology_id}.xml
The script uses preferredPrefix from JSON (or ontologyId as fallback) to filter terms.
        """
    )

    parser.add_argument(
        "-i", "--input",
        required=True,
        help="Path to JSON ontology file"
    )

    parser.add_argument(
        "--ontology-id",
        default=None,
        help="Specific ontology ID to process (optional). If not specified, processes the first ontology with classes."
    )

    args = parser.parse_args()

    try:
        # Parse JSON ontology
        metadata, terms, output_filename = parse_json_ontology(args.input, args.ontology_id)

        if not terms:
            print(f"Warning: No terms found for ontology")
            sys.exit(1)

        # Create XML
        create_xml(metadata, terms, output_filename)

        print(f"\nSuccess! Converted {len(terms)} terms from {args.input}")
        print(f"Output file: {output_filename}")

    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    main()
