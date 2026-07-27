/**
 * Shared filter-operator vocabulary for the Report Builder (wizard + inline
 * viewer editing). `getOperators` used to compare `type` against lowercase
 * strings while real Field.type values are uppercase (e.g. "DROPDOWN"), so it
 * silently fell through to the text operator list for every field — meaning
 * a filter on a dropdown/date/number column was edited (and, worse, its
 * *value* input rendered) as if it were plain text. Fixed here once so both
 * the wizard and the viewer's inline editor share the correct behavior.
 */

export interface FilterOperatorOption {
  value: string;
  label: string;
}

export const OPERATORS: Record<string, FilterOperatorOption[]> = {
  text: [
    { value: "contains",      label: "Contains" },
    { value: "not_contains",  label: "Does not contain" },
    { value: "equals",        label: "Equals" },
    { value: "not_equals",    label: "Not equals" },
    { value: "starts_with",   label: "Starts with" },
    { value: "ends_with",     label: "Ends with" },
    { value: "is_empty",      label: "Is empty" },
    { value: "is_not_empty",  label: "Is not empty" },
  ],
  number: [
    { value: "equals",     label: "= Equals" },
    { value: "not_equals", label: "≠ Not equals" },
    { value: "gt",         label: "> Greater than" },
    { value: "lt",         label: "< Less than" },
    { value: "gte",        label: "≥ Greater or equal" },
    { value: "lte",        label: "≤ Less or equal" },
    { value: "between",    label: "Between" },
  ],
  date: [
    { value: "equals",        label: "On" },
    { value: "before",        label: "Before" },
    { value: "after",         label: "After" },
    { value: "between",       label: "Between" },
    { value: "is_today",      label: "Is today" },
    { value: "is_this_week",  label: "Is this week" },
    { value: "is_this_month", label: "Is this month" },
  ],
  select: [
    { value: "equals",       label: "Is" },
    { value: "not_equals",   label: "Is not" },
    { value: "is_empty",     label: "Is empty" },
    { value: "is_not_empty", label: "Is not empty" },
  ],
  boolean: [
    { value: "is_true",  label: "Is checked" },
    { value: "is_false", label: "Is unchecked" },
  ],
};

const NUMBER_TYPES = ["NUMBER", "DECIMAL", "CURRENCY", "RATING", "PROGRESS"];
const DATE_TYPES = ["DATE", "DATETIME"];
const SELECT_TYPES = ["DROPDOWN", "STATUS", "RADIO", "MULTI_SELECT"];
const BOOLEAN_TYPES = ["BOOLEAN", "CHECKBOX"];

export function getOperators(fieldType: string): FilterOperatorOption[] {
  const t = (fieldType || "").toUpperCase();
  if (NUMBER_TYPES.includes(t)) return OPERATORS.number;
  if (DATE_TYPES.includes(t)) return OPERATORS.date;
  if (SELECT_TYPES.includes(t)) return OPERATORS.select;
  if (BOOLEAN_TYPES.includes(t)) return OPERATORS.boolean;
  return OPERATORS.text; // TEXT, TEXTAREA, RICH_TEXT, EMAIL, PHONE, URL, LOOKUP, etc.
}

export function needsValue(op: string): boolean {
  return !["is_empty", "is_not_empty", "is_today", "is_this_week", "is_this_month", "is_true", "is_false"].includes(op);
}

export function isSelectType(fieldType: string): boolean {
  return SELECT_TYPES.includes((fieldType || "").toUpperCase());
}

export function isDateType(fieldType: string): boolean {
  return DATE_TYPES.includes((fieldType || "").toUpperCase());
}

export function isNumberType(fieldType: string): boolean {
  return NUMBER_TYPES.includes((fieldType || "").toUpperCase());
}
