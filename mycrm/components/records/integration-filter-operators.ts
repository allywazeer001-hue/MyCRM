import type { CategorizedOperator } from "@/lib/field-type-operators";

// Restricted operator vocabulary for an Integration Field's "Filter Criteria" —
// must match backend/src/records/integration-filter.ts's SUPPORTED_OPERATORS
// exactly. Numeric/date range operators are deliberately excluded — see that
// file's header comment for why.
export const INTEGRATION_FILTER_OPERATORS: CategorizedOperator[] = [
  { value: "is",           label: "equals",                          types: ["TEXT", "NUMBER", "PICKLIST", "LOOKUP"] },
  { value: "is_not",       label: "not equals",                      types: ["TEXT", "NUMBER", "PICKLIST", "LOOKUP"] },
  { value: "contains",     label: "contains",                        types: ["TEXT"] },
  { value: "not_contains", label: "does not contain",                types: ["TEXT"] },
  { value: "starts_with",  label: "starts with",                     types: ["TEXT"] },
  { value: "ends_with",    label: "ends with",                       types: ["TEXT"] },
  { value: "is_one_of",    label: "is one of (comma-separated)",     types: ["TEXT", "PICKLIST"] },
  { value: "not_in",       label: "is not one of (comma-separated)", types: ["TEXT", "PICKLIST"] },
];

export const INTEGRATION_FILTER_NO_VALUE_OPS: string[] = [];
