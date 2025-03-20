import { TypedUseSelectorHook, useSelector, useDispatch } from "react-redux";
import type { RootState, AppDispatch } from "./store";
import { useEffect, useState } from 'react';

export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;

// Graph data interfaces
export interface GraphNode {
    iri: string;
    label: string;
    description?: string;
    type: string;
    ontology_name: string;
    is_obsolete: boolean;
    has_children: boolean;
}

export interface GraphEdge {
    source: string;
    target: string;
    label: string;
}

export interface GraphData {
    nodes: GraphNode[];
    edges: GraphEdge[];
}

// Custom hook for fetching ontology graph data
export function useOntologyGraph(ontologyId: string, iri: string | undefined) {
    const [graphData, setGraphData] = useState<GraphData | null>(null);
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchGraphData = async () => {
            if (!iri) return;

            setLoading(true);
            setError(null);

            try {
                const apiUrl = `/api/ontologies/${ontologyId}/terms/${encodeURIComponent(encodeURIComponent(iri))}/graph`;
                const response = await fetch(apiUrl, {
                    method: 'GET',
                    credentials: 'include',
                    headers: {
                        'Content-Type': 'application/json'
                    }
                });

                if (!response.ok) {
                    throw new Error(`HTTP error ${response.status}`);
                }

                const data = await response.json();
                setGraphData(data);
            } catch (err) {
                console.error("Error fetching graph data:", err);
                setError(err instanceof Error ? err.message : "Failed to load graph data");
            } finally {
                setLoading(false);
            }
        };

        if (iri) {
            fetchGraphData();
        }
    }, [ontologyId, iri]);

    return { graphData, loading, error };
}
