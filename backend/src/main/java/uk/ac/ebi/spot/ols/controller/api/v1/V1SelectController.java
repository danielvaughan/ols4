package uk.ac.ebi.spot.ols.controller.api.v1;

import com.google.gson.Gson;
import com.google.gson.JsonObject;
import com.google.gson.JsonParser;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.apache.solr.client.solrj.SolrQuery;
import org.apache.solr.client.solrj.SolrServerException;
import org.apache.solr.client.solrj.response.QueryResponse;
import org.apache.solr.common.SolrDocument;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import uk.ac.ebi.spot.ols.JsonHelper;
import uk.ac.ebi.spot.ols.repository.Validation;
import uk.ac.ebi.spot.ols.repository.solr.OlsSolrClient;
import uk.ac.ebi.spot.ols.repository.transforms.LocalizationTransform;
import uk.ac.ebi.spot.ols.repository.transforms.RemoveLiteralDatatypesTransform;
import uk.ac.ebi.spot.ols.repository.v1.V1OntologyRepository;

import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.*;
import java.util.stream.Collectors;
import static uk.ac.ebi.ols.shared.DefinedFields.*;

@Tag(name = "Select Controller")
@RestController
public class V1SelectController {

    private static final String OBO_ID_FIELD = "obo_id";
    private static final String ONTOLOGY_NAME_FIELD = "ontology_name";
    private static final String ONTOLOGY_PREFIX_FIELD = "ontology_prefix";
    private static final String SHORT_FORM_FIELD = "short_form";

    Gson gson = new Gson();

    @Autowired
    private V1OntologyRepository ontologyRepository;

    @Autowired
    private OlsSolrClient solrClient;

    private static final Logger logger = LoggerFactory.getLogger(V1SelectController.class);

    @RequestMapping(path = "/api/select", produces = {MediaType.APPLICATION_JSON_VALUE}, method = RequestMethod.GET)
    public void select(
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
                    description = "Specifcy the fields to return, the defaults are {iri,label,short_form,obo_id,ontology_name,ontology_prefix,description,type}",
                    example = "[\"iri\",\"label\",\"short_form\",\"obo_id\",\"ontology_name\"]") Collection<String> fieldList,
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
            @RequestParam(value = "rows", defaultValue = "10") Integer rows,
            @RequestParam(value = "start", defaultValue = "0") Integer start,
            @RequestParam(value = "lang", defaultValue = "en") String lang,
            HttpServletResponse response
    ) throws IOException, SolrServerException {
        String normalizedQuery = normalizeQuery(query);
        SolrQuery solrQuery = buildSelectQuery(
                query,
                normalizedQuery,
                ontologies,
                types,
                slims,
                isLocal,
                childrenOf,
                allChildrenOf,
                queryObsoletes,
                rows,
                start
        );

        logger.debug("select: ()", solrQuery.toQueryString());

        QueryResponse qr = solrClient.dispatchSearch(solrQuery, "ols4_entities");
        Set<String> requestedFields = resolveFieldList(fieldList);
        List<Object> docs = buildDocs(qr, requestedFields, lang);
        Map<String, Object> responseObj = buildResponseObject(qr, normalizedQuery, docs);

        writeResponse(response, responseObj);
    }

    private String normalizeQuery(String query) {
        if (!query.contains(" ")) {
            return query;
        }
        return "(" + createIntersectionString(query) + ")";
    }

    private SolrQuery buildSelectQuery(
            String rawQuery,
            String normalizedQuery,
            Collection<String> ontologies,
            Collection<String> types,
            Collection<String> slims,
            boolean isLocal,
            Collection<String> childrenOf,
            Collection<String> allChildrenOf,
            boolean queryObsoletes,
            Integer rows,
            Integer start
    ) {
        SolrQuery solrQuery = new SolrQuery();
        configureBaseQuery(solrQuery, rawQuery, normalizedQuery);
        addOntologyFilter(solrQuery, ontologies);
        addJoinedFilter(solrQuery, "type", types);
        addJoinedFilter(solrQuery, "subset", slims);
        addLocalFilter(solrQuery, isLocal);
        addHierarchyFilter(solrQuery, DIRECT_ANCESTOR.getText(), childrenOf);
        addHierarchyFilter(solrQuery, HIERARCHICAL_ANCESTOR.getText(), allChildrenOf);
        configurePagingAndHighlighting(solrQuery, queryObsoletes, rows, start);
        return solrQuery;
    }

    private void configureBaseQuery(SolrQuery solrQuery, String rawQuery, String normalizedQuery) {
        String queryLc = rawQuery.toLowerCase();
        solrQuery.setQuery(normalizedQuery);
        solrQuery.set("defType", "edismax");
        solrQuery.set("qf", LABEL.getText() + " whitespace_edge_label synonym whitespace_edge_synonym shortForm whitespace_edge_shortForm curie iri");
        solrQuery.set("bq", "type:ontology^10.0 " +
                IS_DEFINING_ONTOLOGY.getText() + ":true^100.0 str_label:\"" + queryLc + "\"^1000  edge_label:\"" +
                queryLc + "\"^500 str_synonym:\"" + queryLc + "\" edge_synonym:\"" + queryLc + "\"^100");
        solrQuery.set("wt", "json");
        solrQuery.setFields("_json", "id");
    }

    private void addOntologyFilter(SolrQuery solrQuery, Collection<String> ontologies) {
        if (ontologies == null || ontologies.isEmpty()) {
            return;
        }

        for (String ontologyId : ontologies) {
            Validation.validateOntologyId(ontologyId);
        }
        solrQuery.addFilterQuery("ontologyId: (" + String.join(" OR ", ontologies) + ")");
    }

    private void addJoinedFilter(SolrQuery solrQuery, String fieldName, Collection<String> values) {
        if (values != null) {
            solrQuery.addFilterQuery(fieldName + ": (" + String.join(" OR ", values) + ")");
        }
    }

    private void addLocalFilter(SolrQuery solrQuery, boolean isLocal) {
        if (isLocal) {
            solrQuery.addFilterQuery(IS_DEFINING_ONTOLOGY.getText() + ":true");
        }
    }

    private void addHierarchyFilter(SolrQuery solrQuery, String fieldName, Collection<String> values) {
        if (values == null) {
            return;
        }

        String result = values.stream()
                .map(this::addQuotes)
                .collect(Collectors.joining(" OR "));
        solrQuery.addFilterQuery(fieldName + ": (" + result + ")");
    }

    private void configurePagingAndHighlighting(SolrQuery solrQuery, boolean queryObsoletes, Integer rows, Integer start) {
        solrQuery.addFilterQuery(IS_OBSOLETE.getText() + ":" + queryObsoletes);
        solrQuery.setStart(start);
        solrQuery.setRows(rows);
        // Sort by relevance score with secondary sort by id for deterministic ordering
        solrQuery.setSort("score", SolrQuery.ORDER.desc);
        solrQuery.addSort("id", SolrQuery.ORDER.asc);
        solrQuery.setHighlight(true);
        solrQuery.add("hl.simple.pre", "<b>");
        solrQuery.add("hl.simple.post", "</b>");
        solrQuery.addHighlightField("whitespace_edge_label");
        solrQuery.addHighlightField(LABEL.getText());
        solrQuery.addHighlightField("whitespace_edge_synonym");
        solrQuery.addHighlightField(SYNONYM.getText());
    }

    private Set<String> resolveFieldList(Collection<String> fieldList) {
        Set<String> requestedFields = fieldList == null ? new HashSet<>() : new HashSet<>(fieldList);
        if (!requestedFields.isEmpty()) {
            return requestedFields;
        }

        requestedFields.add("id");
        requestedFields.add("iri");
        requestedFields.add(SHORT_FORM_FIELD);
        requestedFields.add(OBO_ID_FIELD);
        requestedFields.add(LABEL.getText());
        requestedFields.add(ONTOLOGY_NAME_FIELD);
        requestedFields.add(ONTOLOGY_PREFIX_FIELD);
        requestedFields.add(DEFINITION.getOls3Text());
        requestedFields.add("type");
        return requestedFields;
    }

    private List<Object> buildDocs(QueryResponse qr, Set<String> requestedFields, String lang) {
        List<Object> docs = new ArrayList<>();
        for (SolrDocument res : qr.getResults()) {
            JsonObject json = parseDocument(res, lang);
            docs.add(buildOutDoc(res, json, requestedFields));
        }
        return docs;
    }

    private JsonObject parseDocument(SolrDocument res, String lang) {
        String jsonPayload = (String) res.get("_json");
        if (jsonPayload == null) {
            throw new RuntimeException("_json was null");
        }

        return RemoveLiteralDatatypesTransform.transform(
                LocalizationTransform.transform(JsonParser.parseString(jsonPayload), lang)
        ).getAsJsonObject();
    }

    private Map<String, Object> buildOutDoc(SolrDocument res, JsonObject json, Set<String> requestedFields) {
        Map<String, Object> outDoc = new HashMap<>();

        if (requestedFields.contains("id")) outDoc.put("id", res.get("id").toString().replace('+', ':'));
        if (requestedFields.contains("iri")) outDoc.put("iri", JsonHelper.getString(json, "iri"));
        if (requestedFields.contains(ONTOLOGY_NAME_FIELD)) outDoc.put(ONTOLOGY_NAME_FIELD, JsonHelper.getString(json, "ontologyId"));
        if (requestedFields.contains(LABEL.getText())) outDoc.put(LABEL.getText(), JsonHelper.getString(json, LABEL.getText()));
        if (requestedFields.contains(DEFINITION.getOls3Text())) {
            outDoc.put(DEFINITION.getOls3Text(), JsonHelper.getStrings(json, DEFINITION.getText()));
        }
        if (requestedFields.contains(SHORT_FORM_FIELD)) outDoc.put(SHORT_FORM_FIELD, JsonHelper.getString(json, "shortForm"));
        if (requestedFields.contains(OBO_ID_FIELD)) outDoc.put(OBO_ID_FIELD, JsonHelper.getString(json, "curie"));
        if (requestedFields.contains(IS_DEFINING_ONTOLOGY.getOls3Text())) {
            outDoc.put(
                    IS_DEFINING_ONTOLOGY.getOls3Text(),
                    JsonHelper.getString(json, IS_DEFINING_ONTOLOGY.getText()) != null &&
                            JsonHelper.getString(json, IS_DEFINING_ONTOLOGY.getText()).equals("true")
            );
        }
        if (requestedFields.contains("type")) {
            outDoc.put("type", JsonHelper.getType(json, "type"));
        }
        if (requestedFields.contains(SYNONYM.getText())) {
            outDoc.put(SYNONYM.getText(), JsonHelper.getStrings(json, SYNONYM.getText()));
        }
        if (requestedFields.contains(ONTOLOGY_PREFIX_FIELD)) {
            outDoc.put(ONTOLOGY_PREFIX_FIELD, JsonHelper.getString(json, "ontologyPreferredPrefix"));
        }

        return outDoc;
    }

    private Map<String, Object> buildResponseObject(QueryResponse qr, String query, List<Object> docs) {
        Map<String, Object> responseObj = new LinkedHashMap<>();
        responseObj.put("responseHeader", buildResponseHeader(qr, query));
        responseObj.put("response", buildResponseBody(qr, docs));
        responseObj.put("highlighting", buildHighlighting(qr));
        return responseObj;
    }

    private Map<String, Object> buildResponseHeader(QueryResponse qr, String query) {
        Map<String, Object> responseParams = new LinkedHashMap<>();
        responseParams.put("q", query);

        Map<String, Object> responseHeader = new LinkedHashMap<>();
        responseHeader.put("params", responseParams);
        responseHeader.put("status", 0);
        responseHeader.put("QTime", qr.getQTime());
        return responseHeader;
    }

    private Map<String, Object> buildResponseBody(QueryResponse qr, List<Object> docs) {
        Map<String, Object> responseBody = new LinkedHashMap<>();
        responseBody.put("numFound", qr.getResults().getNumFound());
        responseBody.put("start", 0);
        responseBody.put("docs", docs);
        return responseBody;
    }

    private Map<String, Object> buildHighlighting(QueryResponse qr) {
        Map<String, Object> highlighting = new LinkedHashMap<>();
        for (var highlightEntry : qr.getHighlighting().entrySet()) {
            highlighting.put(highlightEntry.getKey().replace('+', ':'), remapHighlightFields(highlightEntry.getValue()));
        }
        return highlighting;
    }

    private Map<String, Object> remapHighlightFields(Map<String, List<String>> highlight) {
        Map<String, Object> remappedHighlight = new LinkedHashMap<>();
        for (var fieldEntry : highlight.entrySet()) {
            remappedHighlight.put(mapHighlightFieldName(fieldEntry.getKey()), fieldEntry.getValue());
        }
        return remappedHighlight;
    }

    private String mapHighlightFieldName(String fieldName) {
        if (fieldName.equals("whitespace_edge_label")) {
            return LABEL.getText() + "_autosuggest";
        }
        if (fieldName.equals("whitespace_edge_synonym")) {
            return SYNONYM.getText() + "_autosuggest";
        }
        return fieldName;
    }

    private void writeResponse(HttpServletResponse response, Map<String, Object> responseObj) throws IOException {
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.setCharacterEncoding(StandardCharsets.UTF_8.name());
        response.getOutputStream().write(gson.toJson(responseObj).getBytes(StandardCharsets.UTF_8));
        response.flushBuffer();
    }

    private String createIntersectionString(String query) {
        StringBuilder builder = new StringBuilder();
        String[] tokens = query.split(" ");
        for (int x = 0; x < tokens.length; x++) {
            builder.append(tokens[x]);
            if (x + 1 < tokens.length) {
                builder.append(" AND ");
            }
        }
        return builder.toString();
    }

    private String addQuotes(String value) {
        return new StringBuilder(value.length() + 2).append('"').append(value).append('"').toString();
    }

}
