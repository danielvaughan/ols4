import { Fragment } from "react";
import { randomString } from "../../../../app/util";
import ClassExpression from "../../../../components/ClassExpression";
import EntityLink from "../../../../components/EntityLink";
import PropertyValuesList from "../../../../components/PropertyValuesList";
import Entity from "../../../../model/Entity";
import Class from "../../../../model/Class";
import LinkedEntities from "../../../../model/LinkedEntities";
import Property from "../../../../model/Property";

export default function RangeSection({
  entity,
  linkedEntities,
}: {
  entity: Entity;
  linkedEntities: LinkedEntities;
}) {
  if (!(entity instanceof Property)) {
    return <Fragment />;
  }

  let ranges = entity.getRange();

  if (!ranges || ranges.length === 0) {
    return <Fragment />;
  }

  return (
    <PropertyValuesList
      values={ranges}
      title="Range"
      renderValue={(range) => (
        typeof range === "object" && !Array.isArray(range) ? (
          <ClassExpression
            ontologyId={entity.getOntologyId()}
            currentEntity={entity}
            expr={range}
            linkedEntities={linkedEntities}
          />
        ) : (
          <EntityLink
            ontologyId={entity.getOntologyId()}
            currentEntity={entity}
            entityType={
              entity.getType() === "property" ? "properties" : "classes"
            }
            iri={range}
            linkedEntities={linkedEntities}
          />
        )
      )}
      searchFilter={(range, searchQuery) => {
        if (typeof range === "string") {
          const iri = range.toLowerCase();
          const label = linkedEntities.getLabelForIri(range)?.toLowerCase() || '';
          return iri.includes(searchQuery) || label.includes(searchQuery);
        }
        // For complex expressions, convert to string
        const exprStr = JSON.stringify(range).toLowerCase();
        return exprStr.includes(searchQuery);
      }}
    />
  );
}