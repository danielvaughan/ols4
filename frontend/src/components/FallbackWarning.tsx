import { WarningAmber } from "@mui/icons-material";
import Ontology from "../model/Ontology";

interface FallbackWarningProps {
  ontology: Ontology | undefined;
}

export default function FallbackWarning({ ontology }: FallbackWarningProps) {
  const isFallbackVersion = ontology ? ontology.isFallback() : false;

  if (!ontology || !isFallbackVersion) {
    return null;
  }

  return (
    <div
      className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 my-4"
      role="alert"
    >
      <div className="flex">
        <div className="py-1">
          <WarningAmber className="mr-3" />
        </div>
        <div>
          <p className="font-bold">Outdated Version Warning</p>
          <p className="text-sm">
            You are currently viewing an older version of this ontology because the latest version is experiencing issues.
          </p>
        </div>
      </div>
    </div>
  );
}