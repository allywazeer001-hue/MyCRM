import type { ModuleLayoutRule } from "./layout-templates";

function matchCond(
  cond: { whenField: string; operator: string; whenValue: string },
  data: Record<string, any>,
): boolean {
  const v = data[cond.whenField];
  switch (cond.operator) {
    case "equals":     return String(v ?? "") === String(cond.whenValue ?? "");
    case "not_equals": return String(v ?? "") !== String(cond.whenValue ?? "");
    case "is_empty":   return v === null || v === undefined || v === "";
    case "not_empty":  return v !== null && v !== undefined && v !== "";
    default:           return false;
  }
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
      if (a.type === "show" && a.target === "field")   allShowF.add(a.targetId);
      if (a.type === "show" && a.target === "section") allShowS.add(a.targetId);
      if (a.type === "hide" && a.target === "field")   allHideF.add(a.targetId);
      if (a.type === "hide" && a.target === "section") allHideS.add(a.targetId);
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

    const results = conds.map(c => matchCond(c, formData));
    const fired   = rule.conditionLogic === "OR"
      ? results.some(Boolean)
      : results.every(Boolean);

    if (!fired) continue;

    for (const a of rule.actions ?? []) {
      if (a.type === "show"      && a.target === "field")   firedShowF.add(a.targetId);
      if (a.type === "show"      && a.target === "section") firedShowS.add(a.targetId);
      if (a.type === "hide"      && a.target === "field")   firedHideF.add(a.targetId);
      if (a.type === "hide"      && a.target === "section") firedHideS.add(a.targetId);
      if (a.type === "require")                             firedReq.add(a.targetId);
      if (a.type === "unrequire")                           firedUnreq.add(a.targetId);
      if (a.type === "readonly")                            firedRO.add(a.targetId);
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
