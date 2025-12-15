import spec from "./specs/reconciliation.speckit.json";

type SpeckitField = {
  name: string;
  description?: string;
  required?: boolean;
};

type SpeckitDataModel = {
  name: string;
  fields: SpeckitField[];
};

type SpeckitInterface = {
  name: string;
  input?: unknown;
};

type SpeckitSpec = {
  name: string;
  version: string;
  summary?: string;
  dataModels: SpeckitDataModel[];
  interfaces: SpeckitInterface[];
};

const reconciliationSpec = spec as unknown as SpeckitSpec;

export const specMetadata = {
  name: reconciliationSpec.name,
  version: reconciliationSpec.version,
  summary: reconciliationSpec.summary,
};

export type CanonicalField = {
  key: string;
  label: string;
  description?: string;
  required?: boolean;
};

const canonicalBalance = reconciliationSpec.dataModels.find(
  (model) => model.name === "canonical_balance",
);

const transactionModel = reconciliationSpec.dataModels.find(
  (model) => model.name === "transaction_line",
);

export const canonicalBalanceFields: CanonicalField[] =
  canonicalBalance?.fields.map((field) => ({
    key: field.name,
    label: field.name.replace(/_/g, " "),
    description: field.description,
    required: field.required,
  })) ?? [];

export const transactionFields: CanonicalField[] =
  transactionModel?.fields.map((field) => ({
    key: field.name,
    label: field.name.replace(/_/g, " "),
    description: field.description,
    required: field.required,
  })) ?? [];

export const reconciliationInterface =
  reconciliationSpec.interfaces.find(
    (iface) => iface.name === "reconciliation_tool",
  );

export type ReconciliationToolInput = NonNullable<
  SpeckitSpec["interfaces"][number]["input"]
>;
