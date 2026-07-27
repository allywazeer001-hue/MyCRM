import type { ModuleLayoutRule, ModuleRuleAction, ModuleRuleConditionNode } from "./layout-templates";

// Actions saved before multi-target support only have a single `targetId`;
// newer ones carry `targetIds`. Always resolve through this so both shapes work.
function actionTargetIds(a: ModuleRuleAction): string[] {
  return a.targetIds?.length ? a.targetIds : (a.targetId ? [a.targetId] : []);
}

function matchCond(
  cond: { whenField: string; operator: string; whenValue: string; whenValues?: string[] },
  data: Record<string, any>,
): boolean {
  const v = data[cond.whenField];
  switch (cond.operator) {
    case "equals":     return String(v ?? "") === String(cond.whenValue ?? "");
    case "not_equals": return String(v ?? "") !== String(cond.whenValue ?? "");
    case "is_empty":   return v === null || v === undefined || v === "";
    case "not_empty":  return v !== null && v !== undefined && v !== "";
    case "in":         return (cond.whenValues ?? []).map(String).includes(String(v ?? ""));
    case "not_in":     return !(cond.whenValues ?? []).map(String).includes(String(v ?? ""));
    default:           return false;
  }
}

// A rule's `conditions[]` items are either plain leaf conditions (old shape, no `type`
// field — evaluated exactly as before) or nested `{type:"group", operator, children}`
// groups added alongside them. Recursing here is what makes nested AND/OR possible while
// leaving every pre-existing rule's flat conditions array evaluating identically.
function evalConditionNode(node: ModuleRuleConditionNode, data: Record<string, any>): boolean {
  if ((node as any).type === "group") {
    const g = node as any;
    const results: boolean[] = (g.children ?? []).map((c: ModuleRuleConditionNode) => evalConditionNode(c, data));
    return g.operator === "OR" ? results.some(Boolean) : results.every(Boolean);
  }
  return matchCond(node as any, data);
}

export interface RuleEffects {
  hiddenFields:    Set<string>;
  hiddenSections:  Set<string>;
  requiredFields:  Set<string>;
  unrequiredFields: Set<string>;
  readonlyFields:  Set<string>;
}

/**
 * Evaluates module-level layout rules against the current form values.
 *
 * Visibility logic:
 *  - "show-only" target (appears in show rules but never in hide rules):
 *    hidden by default, visible only while a show-rule fires.
 *  - "hide" target: hidden while a hide-rule fires, unless a show-rule also fires.
 */
export function evaluateModuleRules(
  rules: ModuleLayoutRule[] | undefined | null,
  formData: Record<string, any>,
): RuleEffects {
  const empty: RuleEffects = {
    hiddenFields:    new Set(),
    hiddenSections:  new Set(),
    requiredFields:  new Set(),
    unrequiredFields: new Set(),
    readonlyFields:  new Set(),
  };
  if (!rules || rules.length === 0) {
    if (typeof window !== "undefined" && (window as any).__layoutRulesDebug) {
      console.log("[LayoutRules] no rules to evaluate");
    }
    return empty;
  }

  // Collect every target that appears in any show / hide rule (all rules, regardless of firing)
  const allShowF = new Set<string>();
  const allShowS = new Set<string>();
  const allHideF = new Set<string>();
  const allHideS = new Set<string>();

  for (const rule of rules) {
    for (const a of rule.actions ?? []) {
      const ids = actionTargetIds(a);
      if (a.type === "show" && a.target === "field")   ids.forEach(id => allShowF.add(id));
      if (a.type === "show" && a.target === "section") ids.forEach(id => allShowS.add(id));
      if (a.type === "hide" && a.target === "field")   ids.forEach(id => allHideF.add(id));
      if (a.type === "hide" && a.target === "section") ids.forEach(id => allHideS.add(id));
    }
  }

  // Evaluate which rules fire
  const firedShowF = new Set<string>();
  const firedShowS = new Set<string>();
  const firedHideF = new Set<string>();
  const firedHideS = new Set<string>();
  const firedReq   = new Set<string>();
  const firedUnreq = new Set<string>();
  const firedRO    = new Set<string>();

  for (const rule of rules) {
    const conds = rule.conditions ?? [];
    if (conds.length === 0) continue;

    const results = conds.map(c => evalConditionNode(c, formData));
    const fired   = rule.conditionLogic === "OR"
      ? results.some(Boolean)
      : results.every(Boolean);

    if (!fired) continue;

    for (const a of rule.actions ?? []) {
      const ids = actionTargetIds(a);
      if (a.type === "show"      && a.target === "field")   ids.forEach(id => firedShowF.add(id));
      if (a.type === "show"      && a.target === "section") ids.forEach(id => firedShowS.add(id));
      if (a.type === "hide"      && a.target === "field")   ids.forEach(id => firedHideF.add(id));
      if (a.type === "hide"      && a.target === "section") ids.forEach(id => firedHideS.add(id));
      if (a.type === "require")                             ids.forEach(id => firedReq.add(id));
      if (a.type === "unrequire")                           ids.forEach(id => firedUnreq.add(id));
      if (a.type === "readonly")                            ids.forEach(id => firedRO.add(id));
    }
  }

  // Compute hidden fields
  const hiddenFields = new Set<string>();
  for (const id of firedHideF) {
    if (!firedShowF.has(id)) hiddenFields.add(id);        // hide fired, no show override
  }
  for (const id of allShowF) {
    if (!allHideF.has(id) && !firedShowF.has(id)) hiddenFields.add(id); // show-only: hide unless fired
  }

  const hiddenSections = new Set<string>();
  for (const id of firedHideS) {
    if (!firedShowS.has(id)) hiddenSections.add(id);
  }
  for (const id of allShowS) {
    if (!allHideS.has(id) && !firedShowS.has(id)) hiddenSections.add(id);
  }

  const result = {
    hiddenFields,
    hiddenSections,
    requiredFields:  firedReq,
    unrequiredFields: firedUnreq,
    readonlyFields:  firedRO,
  };

  // dev-only trace — open browser console to see rule evaluation details
  if (typeof window !== "undefined") {
    console.debug("[LayoutRules] evaluated", rules.length, "rules", {
      formData,
      hiddenFields:   [...hiddenFields],
      hiddenSections: [...hiddenSections],
    });
  }

  return result;
}
