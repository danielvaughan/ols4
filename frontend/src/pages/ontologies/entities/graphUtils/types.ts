export interface GraphNode {
    id: string;
    label: string;
    isSelected: boolean;
    isObsolete: boolean;
    originalNode: any;
    x?: number;
    y?: number;
    __bckgDimensions?: [number, number]; // For canvas rendering
}

export interface GraphLink {
    source: string | GraphNode;
    target: string | GraphNode;
    label: string;
    color: string;
    visible: boolean;
    curvature?: number;
}

export interface GraphData {
    nodes: GraphNode[];
    links: GraphLink[];
}

export interface RawGraphNode {
    iri: string;
    label: string;
    description?: string;
    ontology_name: string;
    is_obsolete: boolean;
    has_children: boolean;
    type?: string;
}

export interface RawGraphEdge {
    source: string;
    target: string;
    label: string;
    uri?: string;
}

export interface RawGraphData {
    nodes: RawGraphNode[];
    edges: RawGraphEdge[];
}

export interface RelationshipType {
    color: string;
    count: number;
    visible: boolean;
}

export interface EntityGraphProps {
    ontologyId: string;
    selectedEntity: any;  // Assuming Entity class has getIri() method
    entityType: string;
    onNodeSelect?: (id: string) => void;
    expandedNodes?: Set<string>;
    onStoreFetchFunc?: (func: (nodeId: string) => Promise<boolean>) => void;
    setExpandedNodes?: (updater: (prev: Set<string>) => Set<string>) => void;
}