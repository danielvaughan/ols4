import { useState, useEffect } from "react";
import EntityGraph from "./EntityGraph";
import EntityDetails from "./EntityDetails";

export default function GraphContainer({
                                           ontologyId,
                                           selectedEntity,
                                           entityType
                                       }) {
    // Track the currently displayed entity (either selected from props or clicked in graph)
    const [currentEntityIri, setCurrentEntityIri] = useState(null);

    // When selectedEntity prop changes, update the current entity IRI
    useEffect(() => {
        if (selectedEntity && selectedEntity.getIri) {
            setCurrentEntityIri(selectedEntity.getIri());
        }
    }, [selectedEntity]);

    // Handle node selection in the graph
    const handleNodeSelect = (iri) => {
        setCurrentEntityIri(iri);
    };

    return (
        <div className="space-y-4">

            {/* Graph visualization */}
            <div className="graph-container">
                <EntityGraph
                    ontologyId={ontologyId}
                    selectedEntity={selectedEntity}
                    entityType={entityType}
                    onNodeSelect={handleNodeSelect}
                />
            </div>

            {/* Entity details panel */}
            <div className="entity-details-container mt-6">
                <h3 className="text-lg font-semibold mb-2">Entity Details</h3>
                <EntityDetails
                    ontologyId={ontologyId}
                    entityIri={currentEntityIri}
                    entityType={entityType}
                />
            </div>
        </div>
    );
}