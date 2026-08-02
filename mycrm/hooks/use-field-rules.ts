"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { api } from "@/lib/api";
import { ConditionGroup, ConditionNode, normalizeConditionTreeFromParts } from "@/lib/condition-tree";

// ── Types ──────────────────────────────────────────────────────────────────────

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
  // Nested AND/OR condition tree — see lib/condition-tree.ts. Rules saved before
  // this existed are a flat array (with a sibling `logic` field); normalized to
  // this shape via normalizeConditionTree() wherever they're loaded.
  conditions: ConditionGroup;
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

function testCondition(cond: { field: string; operator: string; value?: string }, data: Record<string, any>): boolean {
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

// Recursively evaluates a nested AND/OR condition tree (NOT/XOR are reserved —
// not produced by this editor's UI — and fall back to AND semantics rather
// than throwing, since this runs live as someone types in a form).
function evaluateNode(node: ConditionNode, data: Record<string, any>): boolean {
  if (node.type === "condition") return testCondition(node, data);
  if (node.type !== "group") return false;

  const children = node.children ?? [];
  if (children.length === 0) return true;

  if (node.operator === "OR") return children.some(c => evaluateNode(c, data));
  return children.every(c => evaluateNode(c, data));
}

function ruleMatches(rule: FieldRule, data: Record<string, any>): boolean {
  const tree = rule.conditions;
  if (!tree || !tree.children || tree.children.length === 0) return false;
  return evaluateNode(tree, data);
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
      .then(res => {
        const raw = Array.isArray(res.data) ? res.data : [];
        // Rules saved before nested groups existed store a flat conditions[]
        // array plus a separate sibling `logic` field — bridge those into the
        // same tree shape new rules use, so both evaluate identically here.
        setRules(raw.map((r: any) => ({ ...r, conditions: normalizeConditionTreeFromParts(r.conditions, r.logic) })));
      })
      .catch(() => setRules([]));
  }, [moduleId]);

  const evaluate = useCallback(
    (data: Record<string, any>) => evaluateRules(rules, data),
    [rules],
  );

  return { rules, evaluate };
}
