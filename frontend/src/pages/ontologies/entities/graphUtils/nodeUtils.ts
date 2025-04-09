/**
 * Gets a display-friendly short form of an IRI
 * @param iri The IRI string
 * @returns Short form of the IRI
 */
export const getShortFormFromIri = (iri: string): string => {
    return iri.split('/').pop() || iri.split('#').pop() || iri;
};