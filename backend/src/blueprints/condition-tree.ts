export interface ConditionLeaf {
  id?: string;
  type: 'condition';
  fieldName: string;
  operator: string;
  value?: any;
}

export interface ConditionGroup {
  id?: string;
  type: 'group';
  operator: 'AND' | 'OR' | 'NOT' | 'XOR';
  children: ConditionNode[];
  collapsed?: boolean;
}

export type ConditionNode = ConditionLeaf | ConditionGroup;

const MAX_DEPTH = 20;

/**
 * Bridges the Blueprint engine's legacy shape — a flat `conditions[]` array plus a
 * SEPARATE `conditionsLogic` sibling field (rather than per-item `logic`, as the
 * Workflow engine uses) — into a nested tree. A transition that has never been
 * touched by the new builder keeps evaluating identically.
 */
export function normalizeConditionTree(conditions: any, conditionsLogic?: 'AND' | 'OR'): ConditionGroup {
  if (conditions == null) {
    return { type: 'group', operator: 'AND', children: [] };
  }

  if (typeof conditions === 'object' && !Array.isArray(conditions) && conditions.type === 'group') {
    return conditions as ConditionGroup;
  }

  if (!Array.isArray(conditions) || conditions.length === 0) {
    return { type: 'group', operator: 'AND', children: [] };
  }

  return {
    type: 'group',
    operator: conditionsLogic === 'OR' ? 'OR' : 'AND',
    children: conditions.map((c: any) => ({
      id: c.id,
      type: 'condition' as const,
      fieldName: c.fieldName ?? c.field,
      operator: c.operator ?? c.op,
      value: c.value,
    })),
  };
}

export function validateConditionTree(node: ConditionNode, depth = 0): void {
  if (depth > MAX_DEPTH) {
    throw new Error(`Condition tree exceeds maximum nesting depth of ${MAX_DEPTH}`);
  }
  if (!node || typeof node !== 'object') {
    throw new Error('Condition node must be an object');
  }

  if (node.type === 'group') {
    if (!['AND', 'OR', 'NOT', 'XOR'].includes(node.operator)) {
      throw new Error(`Invalid group operator: ${node.operator}`);
    }
    if (!Array.isArray(node.children)) {
      throw new Error('Group node must have a children array');
    }
    if (node.children.length === 0 && depth > 0) {
      throw new Error('Nested condition groups cannot be empty');
    }
    node.children.forEach(child => validateConditionTree(child, depth + 1));
    return;
  }

  if (node.type === 'condition') {
    if (!node.fieldName) throw new Error('Condition is missing a field');
    if (!node.operator) throw new Error('Condition is missing an operator');
    return;
  }

  throw new Error(`Unknown condition node type: ${(node as any).type}`);
}

/**
 * Recursively evaluates a condition tree, short-circuiting AND/OR groups via
 * early-return loops. `changedFields` mirrors the Blueprint engine's existing
 * "changed" semantics (field names present in the submitted payload) — not a
 * before/after value diff. `previousData`, when the caller has it, additionally
 * powers `changed_to`/`changed_from` — "this field just became exactly X" — as
 * opposed to plain `equals` (matches whenever the field already holds X, whether
 * or not it just changed) or `changed` (fires on ANY new value, not a specific one).
 */
export function evaluateNode(
  node: ConditionNode,
  data: Record<string, any>,
  changedFields: string[] = [],
  previousData?: Record<string, any>,
): boolean {
  if (node.type === 'condition') {
    return evaluateLeaf(node, data, changedFields, previousData);
  }

  const children = node.children ?? [];

  switch (node.operator) {
    case 'OR': {
      if (children.length === 0) return true;
      for (const child of children) {
        if (evaluateNode(child, data, changedFields, previousData)) return true;
      }
      return false;
    }
    case 'NOT':
    case 'XOR':
      throw new Error(`Group operator "${node.operator}" is reserved and not yet supported`);
    case 'AND':
    default: {
      if (children.length === 0) return true;
      for (const child of children) {
        if (!evaluateNode(child, data, changedFields, previousData)) return false;
      }
      return true;
    }
  }
}

// Robust numeric coercion — strips currency symbols, thousands separators, and
// surrounding whitespace (e.g. "$3,500.75", " 3.5 ") so Decimal/Currency fields
// compare correctly instead of silently becoming NaN on stray formatting.
function toNum(v: any): number {
  if (typeof v === 'number') return v;
  if (v == null) return NaN;
  const cleaned = String(v).trim().replace(/[^0-9.\-]/g, '');
  return cleaned === '' || cleaned === '-' ? NaN : Number(cleaned);
}

function toTimestamp(v: any): number {
  if (v == null || v === '') return NaN;
  return new Date(v).getTime();
}

function sameCalendarDay(a: any, b: any): boolean {
  const da = new Date(a);
  const db = new Date(b);
  if (isNaN(da.getTime()) || isNaN(db.getTime())) return false;
  return da.getFullYear() === db.getFullYear() && da.getMonth() === db.getMonth() && da.getDate() === db.getDate();
}

export function evaluateLeaf(
  cond: ConditionLeaf,
  data: Record<string, any>,
  changedFields: string[] = [],
  previousData?: Record<string, any>,
): boolean {
  const v = data[cond.fieldName];
  const rv = String(cond.value ?? '');

  switch (cond.operator) {
    case 'equals':        return String(v ?? '') === rv;
    case 'not_equals':    return String(v ?? '') !== rv;
    case 'contains': {
      // A comma-separated value (from the multi-select picker) matches if ANY
      // term is found — a single term (no comma) behaves exactly as before.
      const terms = rv.split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
      if (terms.length === 0) return false;
      return terms.some(term => String(v ?? '').toLowerCase().includes(term));
    }
    case 'not_contains':  return !String(v ?? '').toLowerCase().includes(rv.toLowerCase());
    case 'starts_with':   return String(v ?? '').toLowerCase().startsWith(rv.toLowerCase());
    case 'ends_with':     return String(v ?? '').toLowerCase().endsWith(rv.toLowerCase());
    case 'gt':             return toNum(v) > toNum(rv);
    case 'lt':             return toNum(v) < toNum(rv);
    case 'gte':            return toNum(v) >= toNum(rv);
    case 'lte':            return toNum(v) <= toNum(rv);
    case 'is_empty':      return v === null || v === undefined || v === '';
    case 'not_empty':     return v !== null && v !== undefined && v !== '';
    case 'changed':       return !!cond.fieldName && changedFields.includes(cond.fieldName);
    // Unlike `equals` (matches whenever the field already holds this value,
    // re-fires on every unrelated save) or `changed` (fires on any new value),
    // these require BOTH a real transition AND the specific target value —
    // "the field just became exactly X", not "the field currently is X".
    case 'changed_to':    return previousData != null && String(v ?? '') === rv && String(previousData[cond.fieldName] ?? '') !== rv;
    case 'changed_from':  return previousData != null && String(previousData[cond.fieldName] ?? '') === rv && String(v ?? '') !== rv;
    case 'between': {
      const parts = rv.split(',');
      const minVal = toNum(parts[0]);
      const maxVal = toNum(parts[1]);
      if (!isNaN(minVal) && !isNaN(maxVal)) {
        return toNum(v) >= minVal && toNum(v) <= maxVal;
      }
      // Bounds aren't plain numbers — this is a date range; toNum("2026-01-15") is NaN,
      // so a numeric-only comparison would silently never match a date field.
      const minTs = toTimestamp(parts[0]);
      const maxTs = toTimestamp(parts[1]);
      const vTs = toTimestamp(v);
      return !isNaN(minTs) && !isNaN(maxTs) && !isNaN(vTs) && vTs >= minTs && vTs <= maxTs;
    }
    case 'is_one_of': {
      const opts = rv.split(',').map((s: string) => s.trim().toLowerCase()).filter(Boolean);
      return opts.includes(String(v ?? '').toLowerCase());
    }
    case 'not_in': {
      const opts = rv.split(',').map((s: string) => s.trim().toLowerCase()).filter(Boolean);
      return !opts.includes(String(v ?? '').toLowerCase());
    }
    case 'before':         return toTimestamp(v) < toTimestamp(rv);
    case 'after':          return toTimestamp(v) > toTimestamp(rv);
    case 'on':             return sameCalendarDay(v, rv);
    case 'on_or_before':   return toTimestamp(v) <= toTimestamp(rv);
    case 'on_or_after':    return toTimestamp(v) >= toTimestamp(rv);
    case 'is_true':
    case 'checked':        return v === true || v === 'true' || v === 1 || v === '1';
    case 'is_false':
    case 'unchecked':      return !(v === true || v === 'true' || v === 1 || v === '1');
    case 'contains_any': {
      const arr = Array.isArray(v) ? v.map(String) : [];
      const terms = rv.split(',').map(s => s.trim()).filter(Boolean);
      return terms.some(t => arr.includes(t));
    }
    case 'contains_all': {
      const arr = Array.isArray(v) ? v.map(String) : [];
      const terms = rv.split(',').map(s => s.trim()).filter(Boolean);
      return terms.length > 0 && terms.every(t => arr.includes(t));
    }
    default:
      // Fail-closed (unlike the Workflow engine's fail-open default) — preserves
      // this engine's existing behavior for any legacy/unrecognized operator.
      return false;
  }
}
