"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { api } from "@/lib/api";

// ── Types ──────────────────────────────────────────────────────────────────────

export type FieldCondition = {
  id: string;
  field: string;
  operator:
    | "equals" | "not_equals"
    | "contains" | "not_contains"
    | "starts_with" | "ends_with"
    | "empty" | "not_empty"
    | "gt" | "lt" | "gte" | "lte";
  value: string;
};

export type FieldAction = {
  id: string;
  type:
    | "set_value" | "clear"
    | "show" | "hide"
    | "enable" | "disable"
    | "make_required" | "remove_required";
  targetField: string;
  value?: string;
};

export type FieldRule = {
  id: string;
  name: string;
  description?: string;
  priority: number;
  isEnabled: boolean;
  logic: "AND" | "OR";
  conditions: FieldCondition[];
  actions: FieldAction[];
  stopOnMatch: boolean;
  runOnLoad: boolean;
};

export type RuleEffects = {
  values: Record<string, any>;
  hidden: Set<string>;
  disabled: Set<string>;
  required: Set<string>;
  unrequired: Set<string>;
};

// ── Condition evaluator ────────────────────────────────────────────────────────

function testCondition(cond: FieldCondition, data: Record<string, any>): boolean {
  const raw = data?.[cond.field];
  const val = raw == null ? "" : String(raw).trim();
  const cmp = (cond.value ?? "").toLowerCase();

  switch (cond.operator) {
    case "equals":       return val.toLowerCase() === cmp;
    case "not_equals":   return val.toLowerCase() !== cmp;
    case "contains":     return val.toLowerCase().includes(cmp);
    case "not_contains": return !val.toLowerCase().includes(cmp);
    case "starts_with":  return val.toLowerCase().startsWith(cmp);
    case "ends_with":    return val.toLowerCase().endsWith(cmp);
    case "empty":        return val === "" || raw == null;
    case "not_empty":    return val !== "" && raw != null;
    case "gt":           return parseFloat(val) >  parseFloat(cond.value ?? "0");
    case "lt":           return parseFloat(val) <  parseFloat(cond.value ?? "0");
    case "gte":          return parseFloat(val) >= parseFloat(cond.value ?? "0");
    case "lte":          return parseFloat(val) <= parseFloat(cond.value ?? "0");
    default:             return false;
  }
}

function ruleMatches(rule: FieldRule, data: Record<string, any>): boolean {
  if (!rule.conditions.length) return false;
  return rule.logic === "OR"
    ? rule.conditions.some(c => testCondition(c, data))
    : rule.conditions.every(c => testCondition(c, data));
}

export function evaluateRules(rules: FieldRule[], data: Record<string, any>): RuleEffects {
  const effects: RuleEffects = {
    values: {},
    hidden: new Set(),
    disabled: new Set(),
    required: new Set(),
    unrequired: new Set(),
  };

  const sorted = [...rules]
    .filter(r => r.isEnabled)
    .sort((a, b) => a.priority - b.priority);

  for (const rule of sorted) {
    if (!ruleMatches(rule, data)) continue;

    for (const action of rule.actions) {
      switch (action.type) {
        case "set_value":
          effects.values[action.targetField] = action.value ?? "";
          break;
        case "clear":
          effects.values[action.targetField] = "";
          break;
        case "hide":
          effects.hidden.add(action.targetField);
          effects.disabled.delete(action.targetField); // hide takes priority
          break;
        case "show":
          effects.hidden.delete(action.targetField);
          break;
        case "disable":
          if (!effects.hidden.has(action.targetField)) {
            effects.disabled.add(action.targetField);
          }
          break;
        case "enable":
          effects.disabled.delete(action.targetField);
          break;
        case "make_required":
          effects.required.add(action.targetField);
          effects.unrequired.delete(action.targetField);
          break;
        case "remove_required":
          effects.unrequired.add(action.targetField);
          effects.required.delete(action.targetField);
          break;
      }
    }

    if (rule.stopOnMatch) break;
  }

  return effects;
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useFieldRules(moduleId: string | undefined) {
  const [rules, setRules] = useState<FieldRule[]>([]);
  const loadedFor = useRef<string | null>(null);

  useEffect(() => {
    if (!moduleId || loadedFor.current === moduleId) return;
    loadedFor.current = moduleId;

    api.get(`/modules/${moduleId}/field-rules`)
      .then(res => setRules(Array.isArray(res.data) ? res.data : []))
      .catch(() => setRules([]));
  }, [moduleId]);

  const evaluate = useCallback(
    (data: Record<string, any>) => evaluateRules(rules, data),
    [rules],
  );

  return { rules, evaluate };
}
