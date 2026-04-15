package uk.ac.ebi.spot.ols.controller.api.v1;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Collection;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;
import java.util.stream.Stream;

import jakarta.servlet.http.HttpServletResponse;

import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.apache.solr.client.solrj.SolrQuery;
import org.apache.solr.client.solrj.SolrServerException;
import org.apache.solr.client.solrj.response.FacetField;
import org.apache.solr.client.solrj.response.FacetField.Count;
import org.apache.solr.client.solrj.response.QueryResponse;
import org.apache.solr.common.SolrDocument;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.bind.annotation.RequestParam;

import com.google.gson.Gson;
import com.google.gson.JsonObject;
import com.google.gson.JsonParser;

import org.springframework.web.bind.annotation.RestController;

import uk.ac.ebi.spot.ols.JsonHelper;
import uk.ac.ebi.spot.ols.repository.Validation;
import uk.ac.ebi.spot.ols.repository.solr.OlsSolrClient;
import uk.ac.ebi.spot.ols.repository.transforms.LocalizationTransform;
import uk.ac.ebi.spot.ols.repository.transforms.RemoveLiteralDatatypesTransform;
import uk.ac.ebi.spot.ols.repository.v1.V1OntologyRepository;
import uk.ac.ebi.spot.ols.repository.v1.mappers.AnnotationExtractor;

import static uk.ac.ebi.ols.shared.DefinedFields.*;


@Tag(name = "Search Controller")
@RestController
public class V1SearchController {

    private static final String SHORT_FORM_FIELD = "short_form";

    Gson gson = new Gson();

    @Autowired
    private V1OntologyRepository ontologyRepository;

    @Autowired
    private OlsSolrClient solrClient;

    private static final Logger logger = LoggerFactory.getLogger(V1SearchController.class);

    @RequestMapping(path = "/api/search", produces = {MediaType.APPLICATION_JSON_VALUE}, method = RequestMethod.GET)
    public void search(
            @RequestParam("q")
            @Parameter(name = "q",
                    description = "The terms to search. By default the search is performed over term labels, synonyms, descriptions, identifiers and annotation properties.",
                    example = "disease or liver+disease") String query,
            @RequestParam(value = "ontology", required = false)
            @Parameter(name = "ontology",
                    description = "Restrict a search to a set of ontologies e.g. ontology=efo,bfo",
                    example = "[\"efo\",\"bfo\"]") Collection<String> ontologies,
            @RequestParam(value = "type", required = false)
            @Parameter(name = "type",
                    description = "Restrict a search to an entity type, one of {class,property,individual,ontology}",
                    example = "[\"class\",\"property\"]") Collection<String> types,
            @RequestParam(value = "slim", required = false)
            @Parameter(name = "slim",
                    description = "Restrict a search to an particular set of slims by name") Collection<String> slims,
            @RequestParam(value = "fieldList", required = false)
            @Parameter(name = "fieldList",
                    description = "Specify the fields to return, the defaults are {iri,label,short_form,obo_id,ontology_name,ontology_prefix,description,type,exact_synonyms,related_synonyms,narrow_synonyms,broad_synonyms}. Additional synonym field available: {synonym} which returns all synonyms in one array",
                    example = "[\"iri\",\"label\",\"short_form\",\"obo_id\",\"ontology_name\"]") Collection<String> fieldList,
            @RequestParam(value = "queryFields", required = false)
            @Parameter(name = "queryFields",
                    description = "Specify the fields to query, the defaults are {label, synonym, description, short_form, obo_id, annotations, logical_description, iri}",
                    example = "[\"iri\",\"label\",\"short_form\",\"ontology_name\"]") Collection<String> queryFields,
            @RequestParam(value = "exact", required = false)
            @Parameter(name = "exact",
                    description = "Set to true for exact matches",
                    example = "false") boolean exact,
            @RequestParam(value = "groupField", required = false)
            @Parameter(name = "groupField",
                    description = "Group results by unique id (IRI)",
                    example = "http://www.ebi.ac.uk/efo/EFO_0001421") String groupField,
            @RequestParam(value = "obsoletes", defaultValue = "false")
            @Parameter(name = "obsoletes",
                    description = "Set to true to include obsoleted terms in the results",
                    example = "false") boolean queryObsoletes,
            @RequestParam(value = "local", defaultValue = "false")
            @Parameter(name = "local",
                    description = "Set to true to only return terms that are in a defining ontology e.g. Only return matches to gene ontology terms in the gene ontology, and exclude ontologies where those terms are also referenced",
                    example = "false") boolean isLocal,
            @RequestParam(value = "childrenOf", required = false)
            @Parameter(name = "childrenOf",
                    description = "You can restrict a search to children of a given term. Supply a list of IRI for the terms that you want to search under",
                    example = "[\"http://www.ebi.ac.uk/efo/EFO_0001421\",\"http://www.ebi.ac.uk/efo/EFO_0004228\"]") Collection<String> childrenOf,
            @RequestParam(value = "allChildrenOf", required = false)
            @Parameter(name = "allChildrenOf",
                    description = "You can restrict a search to all children of a given term. Supply a list of IRI for the terms that you want to search under (subclassOf/is-a plus any hierarchical/transitive properties like 'part of' or 'develops from')",
                    example = "[\"http://www.ebi.ac.uk/efo/EFO_0001421\",\"http://www.ebi.ac.uk/efo/EFO_0004228\"]") Collection<String> allChildrenOf,
            @RequestParam(value = "inclusive", required = false) boolean inclusive,
            @RequestParam(value = "isLeaf", required = false) boolean isLeaf,
            @RequestParam(value = "rows", defaultValue = "10") Integer rows,
            @RequestParam(value = "start", defaultValue = "0") Integer start,
            @RequestParam(value = "format", defaultValue = "json")
            @Parameter(name = "format",
                    description = "You can select the format you want the response in. Default is `json` but you can select xml, csv etc. Full list of acceptable value can be found here: https://solr.apache.org/guide/solr/latest/query-guide/response-writers.html")
            String format,
            @RequestParam(value = "lang", defaultValue = "en") String lang,
            HttpServletResponse response
    ) throws IOException, SolrServerException {

        final SolrQuery solrQuery = new SolrQuery(); // 1

        configureQuery(solrQuery, query, queryFields, exact);
        configureReturnedFields(solrQuery, fieldList);
        applyFilters(solrQuery, ontologies, slims, isLocal, isLeaf, types, groupField, childrenOf, allChildrenOf,
                inclusive, queryObsoletes);
        configureQueryExecution(solrQuery, start, rows, format);

        logger.debug("V1 SEARCH QUERY: {}", solrQuery.toQueryString());

        QueryResponse qr = solrClient.dispatchSearch(solrQuery, "ols4_entities");

        Collection<String> effectiveFieldList = getEffectiveFieldList(fieldList);
        List<Object> docs = buildDocs(qr, effectiveFieldList, lang);
        Map<String, Object> responseObj = buildResponseObject(qr, start, docs);

        writeResponse(response, responseObj);
    }

    private void configureQuery(SolrQuery solrQuery, String query, Collection<String> queryFields, boolean exact) {
        if (queryFields == null) {
            configureDefaultQuery(solrQuery, query, exact);
            return;
        }

        configureExplicitQueryFields(solrQuery, query, queryFields, exact);
    }

    private void configureDefaultQuery(SolrQuery solrQuery, String query, boolean exact) {
        if (exact) {
            configureExactDefaultQuery(solrQuery, query);
            return;
        }

        configureNonExactDefaultQuery(solrQuery, query);
    }

    private void configureExactDefaultQuery(SolrQuery solrQuery, String query) {
        solrQuery.set("defType", "edismax");
        solrQuery.setQuery(query.toLowerCase());

        String[] fields = {LABEL.getText() + "_s^5", SYNONYM.getText() + "_s^3", "short_form_s^2", "obo_id_s^2",
                "iri_s", "annotations_trimmed"};
        solrQuery.set("qf", String.join(" ", SolrFieldMapper.mapFieldsList(List.of(fields))));
        solrQuery.set("pf", "lowercase_label^10 lowercase_synonym^5");
        solrQuery.set("mm", "100%");
        solrQuery.set("bq", IS_DEFINING_ONTOLOGY.getText() + ":\"true\"^100");
    }

    private void configureNonExactDefaultQuery(SolrQuery solrQuery, String query) {
        solrQuery.set("defType", "edismax");
        solrQuery.setQuery(query);

        String[] fields = {LABEL.getText() + "_w^5", SYNONYM.getText() + "_w^3", DEFINITION.getText() + "_w",
                "short_form_w^2", "obo_id_w^2", "iri_s", "annotations_trimmed_w", "curatedFrom_w^0.5"};
        solrQuery.set("qf", String.join(" ", SolrFieldMapper.mapFieldsList(List.of(fields))));
        solrQuery.set("bq",
                IS_DEFINING_ONTOLOGY.getText() + ":\"true\"^100 " +
                        "lowercase_label:\"" + query.toLowerCase() + "\"^5 " +
                        "lowercase_synonym:\"" + query.toLowerCase() + "\"^3");
    }

    private void configureExplicitQueryFields(SolrQuery solrQuery, String query, Collection<String> queryFields,
                                              boolean exact) {
        if (exact) {
            String[] fields = SolrFieldMapper.mapFieldsList(queryFields.stream().map(queryField -> queryField + "_s")
                    .collect(Collectors.toList())).toArray(new String[0]);
            solrQuery.setQuery(createUnionQuery(query.toLowerCase(), fields, true));
            return;
        }

        solrQuery.set("defType", "edismax");
        solrQuery.setQuery(query.toLowerCase());
        solrQuery.set("qf", String.join(" ", SolrFieldMapper.mapFieldsList(queryFields)));
    }

    private void configureReturnedFields(SolrQuery solrQuery, Collection<String> fieldList) {
        if (fieldList != null && fieldList.contains("score")) {
            solrQuery.setFields("_json", "score");
            return;
        }

        solrQuery.setFields("_json");
    }

    private void applyFilters(SolrQuery solrQuery, Collection<String> ontologies, Collection<String> slims,
                              boolean isLocal, boolean isLeaf, Collection<String> types, String groupField,
                              Collection<String> childrenOf, Collection<String> allChildrenOf, boolean inclusive,
                              boolean queryObsoletes) {
        addOntologyFilter(solrQuery, ontologies);
        addSlimFilter(solrQuery, slims);
        addLocalFilter(solrQuery, isLocal);
        addLeafFilter(solrQuery, isLeaf);
        addTypeFilter(solrQuery, types);
        addGrouping(solrQuery, groupField);
        addChildrenFilter(solrQuery, childrenOf, inclusive);
        addAllChildrenFilter(solrQuery, allChildrenOf, inclusive);
        solrQuery.addFilterQuery(IS_OBSOLETE.getText() + ":" + queryObsoletes);
    }

    private void addOntologyFilter(SolrQuery solrQuery, Collection<String> ontologies) {
        if (ontologies == null || ontologies.isEmpty()) {
            return;
        }

        for (String ontologyId : ontologies) {
            Validation.validateOntologyId(ontologyId);
        }

        List<String> lowercasedOntologies = ontologies.stream().map(String::toLowerCase).collect(Collectors.toList());
        solrQuery.addFilterQuery("ontologyId: (" + String.join(" OR ", lowercasedOntologies) + ")");
    }

    private void addSlimFilter(SolrQuery solrQuery, Collection<String> slims) {
        if (slims != null) {
            solrQuery.addFilterQuery("subset: (" + String.join(" OR ", slims) + ")");
        }
    }

    private void addLocalFilter(SolrQuery solrQuery, boolean isLocal) {
        if (isLocal) {
            solrQuery.addFilterQuery(IS_DEFINING_ONTOLOGY.getText() + ":true");
        }
    }

    private void addLeafFilter(SolrQuery solrQuery, boolean isLeaf) {
        if (isLeaf) {
            solrQuery.addFilterQuery("hasChildren:false");
        }
    }

    private void addTypeFilter(SolrQuery solrQuery, Collection<String> types) {
        if (types != null) {
            solrQuery.addFilterQuery("type: (" + String.join(" OR ", types) + ")");
        }
    }

    private void addGrouping(SolrQuery solrQuery, String groupField) {
        if (groupField == null) {
            return;
        }

        solrQuery.addFilterQuery("{!collapse field=iri}");
        solrQuery.add("expand=true", "true");
        solrQuery.add("expand.rows", "100");
    }

    private void addChildrenFilter(SolrQuery solrQuery, Collection<String> childrenOf, boolean inclusive) {
        if (childrenOf == null) {
            return;
        }

        String result = joinQuotedValues(childrenOf);
        if (inclusive) {
            solrQuery.addFilterQuery("filter( iri: (" + result + ")) filter(" + HIERARCHICAL_ANCESTOR.getText() +
                    ": (" + result + "))");
            return;
        }

        solrQuery.addFilterQuery(HIERARCHICAL_ANCESTOR.getText() + ": (" + result + ")");
    }

    private void addAllChildrenFilter(SolrQuery solrQuery, Collection<String> allChildrenOf, boolean inclusive) {
        if (allChildrenOf == null) {
            return;
        }

        String result = joinQuotedValues(allChildrenOf);
        if (inclusive) {
            solrQuery.addFilterQuery("filter( iri: (" + result + ")) filter(" + HIERARCHICAL_ANCESTOR.getText() +
                    ": (" + result + "))");
            return;
        }

        solrQuery.addFilterQuery(HIERARCHICAL_ANCESTOR.getText() + ": (" + result + ")");
    }

    private String joinQuotedValues(Collection<String> values) {
        return values.stream().map(addQuotes).collect(Collectors.joining(" OR "));
    }

    private void configureQueryExecution(SolrQuery solrQuery, Integer start, Integer rows, String format) {
        solrQuery.setStart(start);
        solrQuery.setRows(rows);
        solrQuery.setSort("score", SolrQuery.ORDER.desc);
        solrQuery.addSort("id", SolrQuery.ORDER.asc);
//        solrQuery.setHighlight(true);
//        solrQuery.add("hl.simple.pre", "<b>");
//        solrQuery.add("hl.simple.post", "</b>");
//        solrQuery.addHighlightField("http://www.w3.org/2000/01/rdf-schema#label");
//        solrQuery.addHighlightField("https://github.com/EBISPOT/owl2neo#synonym");
//        solrQuery.addHighlightField("https://github.com/EBISPOT/owl2neo#definition");

//        solrQuery.addFacetField("ontology_name", "ontology_prefix", "type", "subset", "is_defining_ontology", "is_obsolete");

        /*
		 * Fix: Start issue -
		 * https://github.com/EBISPOT/ols4/issues/613
		 * Added new OLS4 faceFields
		 *
		 */
		// TODO: Need to check and add additional faceted fields if required
		solrQuery.addFacetField("ontologyId",
                "ontologyIri",
                "ontologyPreferredPrefix",
                "type",
                IS_DEFINING_ONTOLOGY.getText(),
                IS_OBSOLETE.getText());
		/*
		 * Fix: End
		 */
        solrQuery.add("wt", format);
    }

    private Collection<String> getEffectiveFieldList(Collection<String> fieldList) {
        if (fieldList != null && !fieldList.isEmpty()) {
            return fieldList;
        }

        Collection<String> effectiveFieldList = new HashSet<>();
        populateDefaultFieldList(effectiveFieldList);
        return effectiveFieldList;
    }

    private void populateDefaultFieldList(Collection<String> fieldList) {
        fieldList.add("id");
        fieldList.add("iri");
        fieldList.add("ontology_name");
        fieldList.add(LABEL.getText());
        fieldList.add(DEFINITION.getOls3Text());
        fieldList.add(SHORT_FORM_FIELD);
        fieldList.add("obo_id");
        fieldList.add("type");
        fieldList.add("ontology_prefix");
        fieldList.add("exact_synonyms");
        fieldList.add("related_synonyms");
        fieldList.add("narrow_synonyms");
        fieldList.add("broad_synonyms");
    }

    private List<Object> buildDocs(QueryResponse qr, Collection<String> fieldList, String lang) {
        List<Object> docs = new ArrayList<>();
        for (SolrDocument res : qr.getResults()) {
            docs.add(buildDocument(res, fieldList, lang));
        }
        return docs;
    }

    private Map<String, Object> buildDocument(SolrDocument res, Collection<String> fieldList, String lang) {
        JsonObject json = parseDocumentJson(res, lang);
        Map<String, Object> outDoc = new HashMap<>();

        addCoreFields(outDoc, fieldList, json, res);
        addSynonymFields(outDoc, fieldList, json);
        addAnnotationFields(outDoc, fieldList, json);

        return outDoc;
    }

    private JsonObject parseDocumentJson(SolrDocument res, String lang) {
        String _json = (String) res.get("_json");
        if (_json == null) {
            throw new RuntimeException("_json was null");
        }

        return RemoveLiteralDatatypesTransform.transform(
                LocalizationTransform.transform(JsonParser.parseString(_json), lang)
        ).getAsJsonObject();
    }

    private void addCoreFields(Map<String, Object> outDoc, Collection<String> fieldList, JsonObject json,
                               SolrDocument res) {
        if (fieldList.contains("id")) {
            outDoc.put("id", JsonHelper.getString(json, "id"));
        }
        if (fieldList.contains("iri")) {
            outDoc.put("iri", JsonHelper.getString(json, "iri"));
        }
        if (fieldList.contains("ontology_name")) {
            outDoc.put("ontology_name", JsonHelper.getString(json, "ontologyId"));
        }
        if (fieldList.contains(LABEL.getText())) {
            var label = outDoc.put(LABEL.getText(), JsonHelper.getString(json, LABEL.getText()));
            if (label != null) {
                outDoc.put(LABEL.getText(), label);
            }
        }
        if (fieldList.contains(DEFINITION.getOls3Text())) {
            outDoc.put(DEFINITION.getOls3Text(), JsonHelper.getStrings(json, DEFINITION.getText()));
        }
        if (fieldList.contains(SHORT_FORM_FIELD)) {
            outDoc.put(SHORT_FORM_FIELD, JsonHelper.getString(json, "shortForm"));
        }
        if (fieldList.contains("obo_id")) {
            outDoc.put("obo_id", JsonHelper.getString(json, "curie"));
        }
        if (fieldList.contains(IS_DEFINING_ONTOLOGY.getOls3Text())) {
            outDoc.put(IS_DEFINING_ONTOLOGY.getOls3Text(),
                    JsonHelper.getString(json, IS_DEFINING_ONTOLOGY.getText()) != null &&
                            JsonHelper.getString(json, IS_DEFINING_ONTOLOGY.getText()).equals("true"));
        }
        if (fieldList.contains("type")) {
            outDoc.put("type", JsonHelper.getType(json, "type"));
        }
        if (fieldList.contains(SYNONYM.getText())) {
            outDoc.put(SYNONYM.getText(), JsonHelper.getStrings(json, SYNONYM.getText()));
        }
        if (fieldList.contains("ontology_prefix")) {
            outDoc.put("ontology_prefix", JsonHelper.getString(json, "ontologyPreferredPrefix"));
        }
        if (fieldList.contains("subset")) {
            outDoc.put("subset", JsonHelper.getStrings(json, "http://www.geneontology.org/formats/oboInOwl#inSubset"));
        }
        if (fieldList.contains("ontology_iri")) {
            outDoc.put("ontology_iri", JsonHelper.getStrings(json, "ontologyIri").get(0));
        }
        if (fieldList.contains("score")) {
            outDoc.put("score", res.get("score"));
        }
    }

    private void addSynonymFields(Map<String, Object> outDoc, Collection<String> fieldList, JsonObject json) {
        if (fieldList.contains("exact_synonyms")) {
            List<String> exactSynonyms = JsonHelper.getStrings(json,
                    "http://www.geneontology.org/formats/oboInOwl#hasExactSynonym");
            if (!exactSynonyms.isEmpty()) {
                outDoc.put("exact_synonyms", exactSynonyms);
            }
        }
        if (fieldList.contains("related_synonyms")) {
            List<String> relatedSynonyms = JsonHelper.getStrings(json,
                    "http://www.geneontology.org/formats/oboInOwl#hasRelatedSynonym");
            if (!relatedSynonyms.isEmpty()) {
                outDoc.put("related_synonyms", relatedSynonyms);
            }
        }
        if (fieldList.contains("narrow_synonyms")) {
            List<String> narrowSynonyms = JsonHelper.getStrings(json,
                    "http://www.geneontology.org/formats/oboInOwl#hasNarrowSynonym");
            if (!narrowSynonyms.isEmpty()) {
                outDoc.put("narrow_synonyms", narrowSynonyms);
            }
        }
        if (fieldList.contains("broad_synonyms")) {
            List<String> broadSynonyms = JsonHelper.getStrings(json,
                    "http://www.geneontology.org/formats/oboInOwl#hasBroadSynonym");
            if (!broadSynonyms.isEmpty()) {
                outDoc.put("broad_synonyms", broadSynonyms);
            }
        }
    }

    private void addAnnotationFields(Map<String, Object> outDoc, Collection<String> fieldList, JsonObject json) {
        boolean anyAnnotations = fieldList.stream().anyMatch(s -> s.endsWith("_annotation"));
        if (!anyAnnotations) {
            return;
        }

        Stream<String> annotationFields = fieldList.stream().filter(s -> s.endsWith("_annotation"));
        Map<String, Object> termAnnotations = AnnotationExtractor.extractAnnotations(json);

        annotationFields.forEach(annotationName -> {
            String fieldName = annotationName.replaceFirst("_annotation$", "");
            outDoc.put(annotationName, termAnnotations.get(fieldName));
        });
    }

    private Map<String, Object> buildResponseObject(QueryResponse qr, Integer start, List<Object> docs) {
        Map<String, Object> responseHeader = new HashMap<>();
        responseHeader.put("status", 0);
        responseHeader.put("QTime", qr.getQTime());

        Map<String, Object> responseBody = new HashMap<>();
        responseBody.put("numFound", qr.getResults().getNumFound());
        responseBody.put("start", start);
        responseBody.put("docs", docs);

        Map<String, Object> responseObj = new HashMap<>();
        responseObj.put("responseHeader", responseHeader);
        responseObj.put("response", responseBody);
        responseObj.put("facet_counts", buildFacetCounts(qr));

        return responseObj;
    }

    private Map<String, Object> buildFacetCounts(QueryResponse qr) {
        /*
		 * Fix: Start issue -
		 * https://github.com/EBISPOT/ols4/issues/613
		 * Created facetFieldsMap: Start Gson not able to parse FacetField format -
		 * [ontologyId:[efo (17140)] Converting FacetFied to Map format
		 */
        Map<String, List<String>> facetFieldsMap = parseFacetFields(qr.getFacetFields());
        Map<String, Object> facetCounts = new HashMap<>();
        facetCounts.put("facet_fields", facetFieldsMap);
		/*
		 * Fix: End
		 */
        return facetCounts;
    }

    private void writeResponse(HttpServletResponse response, Map<String, Object> responseObj) throws IOException {
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.setCharacterEncoding(StandardCharsets.UTF_8.name());
        response.getOutputStream().write(gson.toJson(responseObj).getBytes(StandardCharsets.UTF_8));
        response.flushBuffer();
    }

    private Map<String, List<String>> parseFacetFields(List<FacetField> facetFields) {
		Map<String, List<String>> facetFieldsMap = new HashMap<>();
		List<String> newFacetFields;
		if (facetFields != null && facetFields.size() > 0) {
			for (FacetField ff : facetFields) {
				List<Count> facetFieldCount = ff.getValues();
				if (facetFieldsMap.containsKey(ff.getName()))
					newFacetFields = facetFieldsMap.get(ff.getName());
				else
					newFacetFields = new ArrayList<>();

				for (Count ffCount : facetFieldCount) {
					newFacetFields.add(ffCount.getName());
					newFacetFields.add("" + ffCount.getCount());
				}
				facetFieldsMap.put(ff.getName(), newFacetFields);
			}
		}
		return facetFieldsMap;
	}

    Function<String, String> addQuotes = new Function<String, String>() {
        @Override
        public String apply(String s) {
            return new StringBuilder(s.length() + 2).append('"').append(s).append('"').toString();
        }
    };

    private String createUnionQuery(String query, String[] fields, boolean exact) {
        StringBuilder builder = new StringBuilder();
        for (int x = 0; x < fields.length; x++) {
            builder.append(fields[x]);
            builder.append(":\"");

            if(!exact)
                builder.append("*");

            builder.append(query);

            if(!exact)
                builder.append("*");

            builder.append("\" ");

            if (x + 1 < fields.length) {
                builder.append("OR ");
            }
        }
        return builder.toString();
    }
}
