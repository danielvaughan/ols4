export const truncateLabel = (label: string, maxLength: number = 25): string => {
    if (label.length <= maxLength) return label;
    return `${label.substring(0, maxLength - 3)}...`;
};

/**
 * Gets a display-friendly short form of an IRI
 * @param iri The IRI string
 * @returns Short form of the IRI
 */
export const getShortFormFromIri = (iri: string): string => {
    return iri.split('/').pop() || iri.split('#').pop() || iri;
};