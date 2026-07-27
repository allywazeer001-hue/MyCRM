// Shared condition/action constants — previously duplicated (and drifted) across
// app/(dashboard)/workflows/page.tsx and app/(dashboard)/settings/workflows/[id]/page.tsx.
import type { CategorizedOperator } from "@/lib/field-type-operators";

// `types` tags which field-type categories (see @/lib/field-type-operators) an
// operator is valid for — omitted means "always shown" (e.g. changed/changed_from).
export const CONDITION_OPERATORS: CategorizedOperator[] = [
  { value: "is",           label: "equals",                     types: ["TEXT", "NUMBER", "PICKLIST", "LOOKUP"] },
  { value: "is_not",       label: "not equals",                 types: ["TEXT", "NUMBER", "PICKLIST", "LOOKUP"] },
  { value: "contains",     label: "contains",                   types: ["TEXT", "MULTI_SELECT"] },
  { value: "not_contains", label: "does not contain",           types: ["TEXT", "MULTI_SELECT"] },
  { value: "starts_with",  label: "starts with",                types: ["TEXT"] },
  { value: "ends_with",    label: "ends with",                  types: ["TEXT"] },
  { value: "empty",        label: "is empty",                   types: ["TEXT", "NUMBER", "DATE", "DATETIME", "PICKLIST", "MULTI_SELECT", "LOOKUP"] },
  { value: "not_empty",    label: "is not empty",                types: ["TEXT", "NUMBER", "DATE", "DATETIME", "PICKLIST", "MULTI_SELECT", "LOOKUP"] },
  { value: "gt",           label: "greater than",                types: ["NUMBER"] },
  { value: "lt",           label: "less than",                   types: ["NUMBER"] },
  { value: "gte",          label: ">= (greater or equal)",       types: ["NUMBER"] },
  { value: "lte",          label: "<= (less or equal)",          types: ["NUMBER"] },
  { value: "between",      label: "between (a,b)",               types: ["NUMBER", "DATE", "DATETIME"] },
  { value: "is_one_of",    label: "is one of (comma-separated)", types: ["TEXT", "PICKLIST"] },
  { value: "not_in",       label: "is not one of (comma-separated)", types: ["TEXT", "PICKLIST"] },
  { value: "before",       label: "before",                      types: ["DATE", "DATETIME"] },
  { value: "after",        label: "after",                       types: ["DATE", "DATETIME"] },
  { value: "on",           label: "on",                          types: ["DATE", "DATETIME"] },
  { value: "on_or_before", label: "on or before",                types: ["DATE", "DATETIME"] },
  { value: "on_or_after",  label: "on or after",                 types: ["DATE", "DATETIME"] },
  { value: "is_true",      label: "is true",                     types: ["BOOLEAN"] },
  { value: "is_false",     label: "is false",                    types: ["BOOLEAN"] },
  { value: "checked",      label: "checked",                     types: ["CHECKBOX"] },
  { value: "unchecked",    label: "unchecked",                   types: ["CHECKBOX"] },
  { value: "contains_any", label: "contains any of",             types: ["MULTI_SELECT"] },
  { value: "contains_all", label: "contains all of",             types: ["MULTI_SELECT"] },
  { value: "changed_from", label: "changed from" },
  { value: "changed_to",   label: "changed to" },
];

export const NO_VALUE_OPERATORS = ["empty", "not_empty", "is_true", "is_false", "checked", "unchecked"];

export const needsValue = (op: string) => !NO_VALUE_OPERATORS.includes(op);

export const OPTION_FIELD_TYPES = ["DROPDOWN", "STATUS", "RADIO", "SELECT", "MULTI_SELECT", "CHECKBOX"];

export function isOptionField(fields: any[], fieldName: string) {
  const f = fields.find(f => f.name === fieldName);
  return f && OPTION_FIELD_TYPES.includes(f.type?.toUpperCase());
}

export function fieldOptions(fields: any[], fieldName: string): { label: string; value: string }[] {
  const f = fields.find(f => f.name === fieldName);
  return (f?.options ?? []).map((o: any) => ({ label: o.label, value: o.value ?? o.label }));
}

// Union of the two previously-drifted action type lists (workflows/page.tsx's
// ACTION_TYPES and settings/workflows/[id]/page.tsx's WF_ACTION_TYPES) — nothing
// either page supported has been dropped.
export const ACTION_TYPES = [
  { value: "SET_FIELD",         label: "Set Field Value",           icon: "✏️" },
  { value: "UPDATE_RECORD",     label: "Update Multiple Fields",    icon: "📝" },
  { value: "SEND_NOTIFICATION", label: "Send Notification",         icon: "🔔" },
  { value: "ASSIGN_USER",       label: "Assign User",               icon: "👤" },
  { value: "CREATE_RECORD",     label: "Create Record",             icon: "➕" },
  { value: "SEND_EMAIL",        label: "Send Email",                icon: "📧" },
  { value: "WEBHOOK",           label: "Webhook / HTTP Request",    icon: "🌐" },
  { value: "UPDATE_RELATED",    label: "Update Related Record",     icon: "🔗" },
  { value: "CREATE_TASK",       label: "Create Task in Module",     icon: "✅" },
  { value: "DELAY",             label: "Delay / Wait",              icon: "⏱️" },
  { value: "TRIGGER_WORKFLOW",  label: "Trigger Another Workflow",  icon: "⚡" },
  { value: "TAG",               label: "Add Tags to Record",        icon: "🏷️" },
  { value: "ADD_TAG",           label: "Add Tag(s) (colored)",      icon: "🏷️" },
  { value: "REMOVE_TAG",        label: "Remove Tag(s)",             icon: "✂️" },
  { value: "REPLACE_TAGS",      label: "Replace Tags",              icon: "🔄" },
  { value: "CLEAR_TAGS",        label: "Clear All Tags",            icon: "🗑️" },
];
