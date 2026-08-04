"use client";
import { useCallback } from "react";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

// Same filter shape RecordsService.applyFilterGroup uses everywhere else in
// the app ({ logic, conditions, groups }) — NOT the Workflow condition-tree
// shape. Kept flat (no nested groups in the UI) to match the existing
// module-table FilterPanel's interaction model.

export type FilterOperator =
  | "is" | "is_not" | "contains" | "not_contains" | "starts_with" | "ends_with"
  | "empty" | "not_empty" | "eq" | "neq" | "lt" | "lte" | "gt" | "gte" | "between";

export interface FilterCondition {
  id: string;
  field: string;
  operator: FilterOperator;
  value: any;
  value2?: any;
}

export interface FilterGroupValue {
  logic: "AND" | "OR";
  conditions: FilterCondition[];
  groups: [];
}

export interface AudienceField {
  name: string;
  label: string;
  type: string;
}

const TEXT_OPS: { value: FilterOperator; label: string }[] = [
  { value: "contains", label: "Contains" },
  { value: "not_contains", label: "Does Not Contain" },
  { value: "is", label: "Is" },
  { value: "is_not", label: "Is Not" },
  { value: "starts_with", label: "Starts With" },
  { value: "ends_with", label: "Ends With" },
  { value: "empty", label: "Is Empty" },
  { value: "not_empty", label: "Is Not Empty" },
];
const NUM_OPS: { value: FilterOperator; label: string }[] = [
  { value: "eq", label: "Equal" },
  { value: "neq", label: "Not Equal" },
  { value: "lt", label: "Less Than" },
  { value: "lte", label: "Less or Equal" },
  { value: "gt", label: "Greater Than" },
  { value: "gte", label: "Greater or Equal" },
  { value: "between", label: "Between" },
  { value: "empty", label: "Is Empty" },
  { value: "not_empty", label: "Is Not Empty" },
];
const CHOICE_OPS: { value: FilterOperator; label: string }[] = [
  { value: "is", label: "Is" },
  { value: "is_not", label: "Is Not" },
  { value: "contains", label: "Contains" },
  { value: "not_contains", label: "Does Not Contain" },
  { value: "empty", label: "Is Empty" },
  { value: "not_empty", label: "Is Not Empty" },
];

function getOps(field?: AudienceField) {
  if (!field) return TEXT_OPS;
  if (["NUMBER", "DECIMAL", "CURRENCY", "RATING", "PROGRESS"].includes(field.type)) return NUM_OPS;
  if (["DROPDOWN", "STATUS", "RADIO", "MULTI_SELECT", "TAGS", "BOOLEAN", "LOOKUP", "GLOBAL_RELATION"].includes(field.type)) return CHOICE_OPS;
  return TEXT_OPS;
}

function noValue(op: FilterOperator) {
  return op === "empty" || op === "not_empty";
}

export function newFilterCondition(): FilterCondition {
  return { id: Math.random().toString(36).slice(2), field: "", operator: "contains", value: "" };
}

export function emptyFilterGroup(): FilterGroupValue {
  return { logic: "AND", conditions: [], groups: [] };
}

export function AudienceFilterBuilder({ fields, value, onChange }: {
  fields: AudienceField[];
  value: FilterGroupValue;
  onChange: (next: FilterGroupValue) => void;
}) {
  const addCondition = useCallback(() => {
    onChange({ ...value, conditions: [...value.conditions, newFilterCondition()] });
  }, [value, onChange]);

  const updateCondition = (id: string, patch: Partial<FilterCondition>) => {
    onChange({ ...value, conditions: value.conditions.map(c => c.id === id ? { ...c, ...patch } : c) });
  };

  const removeCondition = (id: string) => {
    onChange({ ...value, conditions: value.conditions.filter(c => c.id !== id) });
  };

  return (
    <div className="space-y-2.5">
      {value.conditions.length > 1 && (
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-gray-500">Match</span>
          <div className="flex items-center bg-gray-100 rounded-lg p-0.5 gap-0.5">
            {(["AND", "OR"] as const).map(l => (
              <button key={l} onClick={() => onChange({ ...value, logic: l })}
                className={cn("px-2.5 py-1 rounded-md text-xs font-semibold transition-all",
                  value.logic === l ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700")}>
                {l}
              </button>
            ))}
          </div>
          <span className="text-xs text-gray-500">of the following</span>
        </div>
      )}

      {value.conditions.map((condition) => {
        const field = fields.find(f => f.name === condition.field);
        const ops = getOps(field);
        return (
          <div key={condition.id} className="flex items-center gap-2 flex-wrap">
            <Select value={condition.field || "__none__"} onValueChange={(v) => {
              const f = fields.find(x => x.name === v);
              updateCondition(condition.id, { field: v, operator: getOps(f)[0].value, value: "", value2: "" });
            }}>
              <SelectTrigger className="h-8 text-xs w-40"><SelectValue placeholder="Field" /></SelectTrigger>
              <SelectContent>
                {fields.map(f => <SelectItem key={f.name} value={f.name} className="text-xs">{f.label}</SelectItem>)}
              </SelectContent>
            </Select>

            <Select value={condition.operator} onValueChange={(v) => updateCondition(condition.id, { operator: v as FilterOperator })} disabled={!condition.field}>
              <SelectTrigger className="h-8 text-xs w-36"><SelectValue /></SelectTrigger>
              <SelectContent>
                {ops.map(o => <SelectItem key={o.value} value={o.value} className="text-xs">{o.label}</SelectItem>)}
              </SelectContent>
            </Select>

            {condition.field && !noValue(condition.operator) && (
              condition.operator === "between" ? (
                <div className="flex items-center gap-1">
                  <Input value={condition.value ?? ""} onChange={e => updateCondition(condition.id, { value: e.target.value })} placeholder="Min" className="h-8 text-xs w-20" />
                  <span className="text-xs text-gray-400">–</span>
                  <Input value={condition.value2 ?? ""} onChange={e => updateCondition(condition.id, { value2: e.target.value })} placeholder="Max" className="h-8 text-xs w-20" />
                </div>
              ) : (
                <Input value={condition.value ?? ""} onChange={e => updateCondition(condition.id, { value: e.target.value })} placeholder="Value" className="h-8 text-xs w-40" />
              )
            )}

            <button onClick={() => removeCondition(condition.id)} className="text-gray-400 hover:text-red-500 transition-colors shrink-0">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}

      <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5" onClick={addCondition}>
        <Plus className="w-3.5 h-3.5" /> Add condition
      </Button>
    </div>
  );
}
