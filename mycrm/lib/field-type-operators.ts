// Maps this app's field type strings (backend/prisma/schema.prisma `FieldType`
// enum) to a small set of operator categories, so the condition builder can show
// only operators that make sense for the selected field — e.g. no "greater than"
// on a text field, no "contains" on a boolean.
export type OperatorCategory =
  | "TEXT" | "NUMBER" | "DATE" | "DATETIME" | "BOOLEAN" | "CHECKBOX"
  | "PICKLIST" | "MULTI_SELECT" | "LOOKUP";

const FIELD_TYPE_TO_CATEGORY: Record<string, OperatorCategory> = {
  TEXT: "TEXT", TEXTAREA: "TEXT", RICH_TEXT: "TEXT", EMAIL: "TEXT", PHONE: "TEXT", URL: "TEXT",
  NUMBER: "NUMBER", DECIMAL: "NUMBER", CURRENCY: "NUMBER", RATING: "NUMBER", PROGRESS: "NUMBER",
  DATE: "DATE",
  DATETIME: "DATETIME",
  BOOLEAN: "BOOLEAN",
  CHECKBOX: "CHECKBOX",
  DROPDOWN: "PICKLIST", STATUS: "PICKLIST", RADIO: "PICKLIST",
  MULTI_SELECT: "MULTI_SELECT", TAGS: "MULTI_SELECT",
  LOOKUP: "LOOKUP", GLOBAL_RELATION: "LOOKUP", USER_SELECT: "LOOKUP",
};

/** Returns the operator category for a field type, or undefined if unmapped
 *  (FORMULA, AUTO_NUMBER, FILE, etc.) — unmapped types show every operator,
 *  since guessing wrong would block legitimate use more than showing extras. */
export function operatorCategoryForFieldType(fieldType?: string): OperatorCategory | undefined {
  if (!fieldType) return undefined;
  return FIELD_TYPE_TO_CATEGORY[fieldType.toUpperCase()];
}

export interface CategorizedOperator {
  value: string;
  label: string;
  /** Operator categories this applies to. Omitted = always shown (e.g. "has changed"). */
  types?: OperatorCategory[];
}

/** Filters an operator list down to the ones valid for a field's type. Operators
 *  with no `types` (e.g. changed/changed_from/changed_to) are always included.
 *  An unmapped/unknown field type returns the full list unfiltered. */
export function filterOperatorsForFieldType<T extends CategorizedOperator>(
  operators: T[],
  fieldType: string | undefined,
): T[] {
  const category = operatorCategoryForFieldType(fieldType);
  if (!category) return operators;
  return operators.filter(o => !o.types || o.types.includes(category));
}
