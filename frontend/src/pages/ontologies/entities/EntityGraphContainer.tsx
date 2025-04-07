import { useState, useEffect, useCallback } from "react";
import EntityGraph from "./EntityGraph";
import EntityDetails from "./EntityDetails";

interface GraphContainerProps {
    ontologyId: string;
    selectedEntity: any;
    entityType: string;
}

export default function GraphContainer({
                                           ontologyId,
                                           selectedEntity,
                                           entityType
                                       }: GraphContainerProps) {
    // Track the currently displayed entity (either selected from props or clicked in graph)
    const [currentEntityIri, setCurrentEntityIri] = useState(null);
    // Track expanded nodes
    const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set<string>());
    // Store the fetchNodeConnections function reference
    type FetchNodeConnectionsFuncType = (nodeId: string) => Promise<boolean>;
    const [fetchNodeConnectionsFunc, setFetchNodeConnectionsFunc] = useState<FetchNodeConnectionsFuncType | null>(null);

    // When selectedEntity prop changes, update the current entity IRI
    useEffect(() => {
        if (selectedEntity && selectedEntity.getIri) {
            setCurrentEntityIri(selectedEntity.getIri());
        }
    }, [selectedEntity]);

    // Handle node selection in the graph
    const handleNodeSelect = useCallback((iri) => {
        setCurrentEntityIri(iri);
    }, []);

    // Store the fetchNodeConnections function passed from EntityGraph
    const storeFetchNodeConnectionsFunc = useCallback((func) => {
        setFetchNodeConnectionsFunc(prevFunc => {
            // Only update if function reference has changed
            if (prevFunc !== func && func) {
                return func;
            }
            return prevFunc;
        });
    }, []);

    // Handle node expansion
    const handleNodeExpand = useCallback(async (nodeIri) => {
        if (!fetchNodeConnectionsFunc || !nodeIri) return;

        // Prevent expanding already expanded nodes
        if (expandedNodes.has(nodeIri)) return;

        try {
            const success = await fetchNodeConnectionsFunc(nodeIri);
            if (success) {
                setExpandedNodes(prev => {
                    const newSet = new Set(prev);
                    newSet.add(nodeIri);
                    return newSet;
                });
            }
        } catch (error) {
            console.error("Error expanding node:", error);
        }
    }, [fetchNodeConnectionsFunc, expandedNodes]);

    // Function to check if a node is expanded
    const isNodeExpanded = useCallback((nodeIri) => {
        return nodeIri ? expandedNodes.has(nodeIri) : false;
    }, [expandedNodes]);

    return (
        <div className="space-y-4">
            {/* Graph visualization */}
            <div className="graph-container">
                <EntityGraph
                    ontologyId={ontologyId}
                    selectedEntity={selectedEntity}
                    entityType={entityType}
                    onNodeSelect={handleNodeSelect}
                    expandedNodes={expandedNodes}
                    setExpandedNodes={setExpandedNodes}
                    onStoreFetchFunc={storeFetchNodeConnectionsFunc}
                />
            </div>

            {/* Entity details panel */}
            <div className="entity-details-container mt-6">
                <h3 className="text-lg font-semibold mb-2">Entity Details</h3>
                <EntityDetails
                    ontologyId={ontologyId}
                    entityIri={currentEntityIri}
                    entityType={entityType}
                    onExpandNode={handleNodeExpand}
                    isNodeExpanded={isNodeExpanded(currentEntityIri)}
                />
            </div>
        </div>
    )
}