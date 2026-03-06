import {useEffect, useMemo, useState} from "react";
import {useNavigate} from "react-router-dom";
import urlJoin from "url-join";
import {useAppDispatch, useAppSelector} from "../../app/hooks";
import Header from "../../components/Header";
import LoadingOverlay from "../../components/LoadingOverlay";
import Ontology from "../../model/Ontology";
import {getAllOntologies} from "./ontologiesSlice";
import {MaterialReactTable, MRT_ColumnDef, useMaterialReactTable} from "material-react-table";

export default function OntologiesPage() {
    const dispatch = useAppDispatch();
    const ontologies = useAppSelector((state) => state.ontologies.ontologies);

    useEffect(() => {
        dispatch(getAllOntologies());
    }, [dispatch]);
    const loading = useAppSelector((state) => state.ontologies.loadingOntologies);

    const navigate = useNavigate();

    // Collect unique tags and domains for filter dropdowns
    const allTags = useMemo(() => {
        const tagSet = new Set<string>();
        ontologies.forEach((o) => o.getTags().forEach((t) => tagSet.add(t)));
        return Array.from(tagSet).sort();
    }, [ontologies]);

    const allDomains = useMemo(() => {
        const domainSet = new Set<string>();
        ontologies.forEach((o) => {
            const d = o.getDomain();
            if (d) domainSet.add(d);
        });
        return Array.from(domainSet).sort();
    }, [ontologies]);

    const [selectedTags, setSelectedTags] = useState<string[]>([]);
    const [selectedDomains, setSelectedDomains] = useState<string[]>([]);

    const VIRTUAL_DOMAIN_OBO_FOUNDRY = "obo foundry";

    const filteredOntologies = useMemo(() => {
        return ontologies.filter((o) => {
            if (selectedTags.length > 0) {
                const oTags = o.getTags();
                if (!selectedTags.some((t) => oTags.includes(t))) return false;
            }
            if (selectedDomains.length > 0) {
                if (selectedDomains.includes(VIRTUAL_DOMAIN_OBO_FOUNDRY)) {
                    // OBO Foundry virtual domain: must be foundry OR match other selected domains
                    const otherDomains = selectedDomains.filter((d) => d !== VIRTUAL_DOMAIN_OBO_FOUNDRY);
                    const matchesFoundry = o.isFoundry();
                    const matchesOther = otherDomains.length > 0 && otherDomains.includes(o.getDomain());
                    if (!matchesFoundry && !matchesOther) return false;
                } else {
                    if (!selectedDomains.includes(o.getDomain())) return false;
                }
            }
            return true;
        });
    }, [ontologies, selectedTags, selectedDomains]);

    const columns = useMemo<MRT_ColumnDef<Ontology>[]>(
        () => [
            {
                accessorFn: (ontology) => ontology.getName(), //access nested data with dot notation
                id: 'name',
                header: 'Ontology',
                size: 50,
                filterFn: 'includesString',
                Cell: ({row, renderedCellValue}) => {
                    const name = row.original.getName();
                    const logo = row.original.getLogoURL();
                    const ontoId = row.original.getOntologyId();
                    if (name || logo) {
                        return (
                            <div>
                                {logo ? (
                                    <img
                                        alt={`${ontoId.toUpperCase()} logo`}
                                        title={`${ontoId.toUpperCase()} logo`}
                                        className="h-16 object-contain bg-white rounded-lg p-1 mb-3"
                                        src={
                                            logo.startsWith("/images")
                                                ? process.env.REACT_APP_OBO_FOUNDRY_REPO_RAW + logo
                                                : logo
                                        }
                                    />
                                ) : null}
                                <div>{renderedCellValue}</div>
                            </div>
                        );
                    } else return ontoId;
                },
            },
            {
                accessorFn: (ontology) => ontology.getOntologyId().toUpperCase(),
                id: 'id',
                header: 'ID',
                size: 20,
                filterFn: 'startsWith',
                Cell: ({row, renderedCellValue}) => {
                    const ontology = row.original;
                    return (
                        <div style={{width: '50px'}}>
                            <div className="bg-link-default text-white rounded-md px-2 py-1 w-fit font-bold break-keep mb-1">
                                {renderedCellValue}
                            </div>
                            {ontology.isDeprecated() && (
                                <div className="bg-red-500 text-white text-xs px-2 py-1 rounded-md uppercase w-fit">
                                    Deprecated
                                </div>
                            )}
                        </div>
                    );
                },
            },
            {
                accessorFn: (ontology) => ontology.getDescription(), //normal accessorKey
                id: 'description',
                header: 'Description',
                size: 300,
                filterFn: 'includesString',
            },
            {
                accessorKey: 'actions',
                header: 'Actions',
                size: 20,
                enableGlobalFilter: false,
                enableColumnFilter: false,
                enableSorting: false,
                enableColumnActions: false,
                Cell: ({row}) => {
                    return (
                        <div>
                            <div
                                onClick={() => {
                                    navigate(`/ontologies/${row.original.getOntologyId()}`);
                                }}
                                className="link-default"
                            >
                                Search
                            </div>
                            <a
                                href={urlJoin(
                                    process.env.PUBLIC_URL!,
                                    `/ontologies/${row.original.getOntologyId()}?tab=classes`
                                )}
                                className="link-default"
                            >
                                Classes
                            </a>
                            <br/>
                            <a
                                href={urlJoin(
                                    process.env.PUBLIC_URL!,
                                    `/ontologies/${row.original.getOntologyId()}?tab=properties`
                                )}
                                className="link-default"
                            >
                                Properties
                            </a>
                            <br/>
                            <a
                                href={urlJoin(
                                    process.env.PUBLIC_URL!,
                                    `/ontologies/${row.original.getOntologyId()}?tab=individuals`
                                )}
                                className="link-default"
                            >
                                Individuals
                            </a>
                        </div>
                    );
                },
            },
        ],
        [],
    );

    const table = useMaterialReactTable({
        columns,
        data: filteredOntologies,
        initialState: {
            showColumnFilters: true,
            sorting: [
                {
                    id: 'id', //sort by id by default on page load
                    desc: false,
                },
            ],
        },
        enableFilterMatchHighlighting: true,
        enableGlobalFilter: false,
        enableFullScreenToggle: false,
        enableDensityToggle: false,
        enableHiding: false,
        enableTopToolbar: false,
        muiTableHeadCellProps: {
            sx: {
                fontWeight: 'bold',
                fontSize: '16px',
                fontFamily: '"IBM Plex Sans",Helvetica,Arial,sans-serif',
            },
        },
        muiTableBodyCellProps: {
            sx: {
                fontWeight: 'normal',
                fontFamily: '"IBM Plex Sans",Helvetica,Arial,sans-serif',
            },
        },
        muiTablePaperProps: {
            elevation: 0,
            sx: {
                borderRadius: '0',
            },
        },
        muiTableBodyProps: {
            sx: {
                //stripe the rows, make odd rows a darker color
                '& tr:nth-of-type(even) > td': {
                    backgroundColor: '#EDECE5',
                },
            },
        },
        muiTableBodyRowProps: ({row}) => ({
            onClick: (event) => {
                navigate(`/ontologies/${row.original.getOntologyId()}`);
            },
            sx: {
                cursor: 'pointer',
                textAlign: 'left',
                verticalAlign: 'top',
            },
        }),
        paginationDisplayMode: 'pages',
        muiPaginationProps: {
            color: 'primary',
            rowsPerPageOptions: [10, 20, 30, 50],
            shape: 'rounded',
            variant: 'outlined',
        },
    });

    document.title = "Ontology Lookup Service (OLS)";
    return (
        <div>
            <Header section="ontologies"/>
            <main className="container mx-auto my-8">
                {ontologies.length > 0 && <div className="flex flex-wrap gap-1.5 mb-4 items-center">
                    {[VIRTUAL_DOMAIN_OBO_FOUNDRY, ...allDomains].map((domain) => (
                        <button
                            key={domain}
                            onClick={() => {
                                setSelectedDomains((prev) =>
                                    prev.includes(domain)
                                        ? prev.filter((d) => d !== domain)
                                        : [...prev, domain]
                                );
                            }}
                            className={`text-xs px-2.5 py-1 rounded-full border-2 font-semibold ${
                                selectedDomains.includes(domain)
                                    ? "bg-link-default text-white border-link-default"
                                    : "bg-white text-gray-800 border-gray-400 hover:bg-gray-100"
                            }`}
                        >
                            {domain.toLowerCase()}
                        </button>
                    ))}
                    {allTags.map((tag) => (
                        <button
                            key={tag}
                            onClick={() => {
                                setSelectedTags((prev) =>
                                    prev.includes(tag)
                                        ? prev.filter((t) => t !== tag)
                                        : [...prev, tag]
                                );
                            }}
                            className={`text-xs px-2.5 py-1 rounded-full border ${
                                selectedTags.includes(tag)
                                    ? "bg-link-default text-white border-link-default"
                                    : "bg-white text-gray-600 border-gray-300 hover:bg-gray-100"
                            }`}
                        >
                            {tag.toLowerCase()}
                        </button>
                    ))}
                    {(selectedTags.length > 0 || selectedDomains.length > 0) && (
                        <button
                            onClick={() => { setSelectedTags([]); setSelectedDomains([]); }}
                            className="text-xs text-link-default hover:underline ml-1"
                        >
                            Clear ({filteredOntologies.length}/{ontologies.length})
                        </button>
                    )}
                </div>}
                {
                    <MaterialReactTable table={table}/>
                }
                {loading ? <LoadingOverlay message="Loading ontologies..."/> : null}
            </main>
        </div>
    );
}