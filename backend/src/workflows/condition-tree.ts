export interface ConditionLeaf {
  id?: string;
  type: 'condition';
  field: string;
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

export interface FormulaNode {
  id?: string;
  type: 'formula' | 'expression';
  expression: string;
}

export type ConditionNode = ConditionLeaf | ConditionGroup | FormulaNode;

const MAX_DEPTH = 20;

/**
 * Bridges legacy flat `[{field, operator, value, logic}]` arrays (and empty/missing
 * conditions) into the new tree shape. A workflow that has never been touched by the
 * new builder keeps evaluating identically — this just describes its existing
 * conditions as "Root Group └── Existing Condition(s)".
 */
export function normalizeConditionTree(raw: any): ConditionGroup {
  if (raw == null) {
    return { type: 'group', operator: 'AND', children: [] };
  }

  if (Array.isArray(raw)) {
    if (raw.length === 0) {
      return { type: 'group', operator: 'AND', children: [] };
    }
    const logic = raw[0]?.logic === 'OR' ? 'OR' : 'AND';
    return {
      type: 'group',
      operator: logic,
      children: raw.map((c: any) => toLeaf(c)),
    };
  }

  if (typeof raw === 'object' && raw.type === 'group') {
    return raw as ConditionGroup;
  }

  // Unrecognized shape — treat as no conditions rather than failing closed.
  return { type: 'group', operator: 'AND', children: [] };
}

function toLeaf(c: any): ConditionLeaf {
  return {
    id: c.id,
    type: 'condition',
    field: c.field,
    operator: c.operator ?? c.op,
    value: c.value,
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
    if (!node.field) throw new Error('Condition is missing a field');
    if (!node.operator && !(node as any).op) throw new Error('Condition is missing an operator');
    return;
  }

  if (node.type === 'formula' || node.type === 'expression') {
    // Reserved for future use — structurally valid, not yet evaluable.
    return;
  }

  throw new Error(`Unknown condition node type: ${(node as any).type}`);
}

/**
 * Recursively evaluates a condition tree against `data`/`previousData`.
 * Uses early-return loops (not map().every()/.some()) so AND/OR groups genuinely
 * short-circuit — later siblings are never evaluated once the result is decided.
 */
export function evaluateNode(node: ConditionNode, data: any, previousData?: any): boolean {
  if (node.type === 'condition') {
    return evaluateLeaf(node, data, previousData);
  }

  if (node.type === 'formula' || node.type === 'expression') {
    throw new Error(`Condition node type "${node.type}" is reserved and not yet supported`);
  }

  const group = node as ConditionGroup;
  const children = group.children ?? [];

  switch (group.operator) {
    case 'OR': {
      if (children.length === 0) return true;
      for (const child of children) {
        if (evaluateNode(child, data, previousData)) return true;
      }
      return false;
    }
    case 'NOT':
    case 'XOR':
      throw new Error(`Group operator "${group.operator}" is reserved and not yet supported`);
    case 'AND':
    default: {
      if (children.length === 0) return true;
      for (const child of children) {
        if (!evaluateNode(child, data, previousData)) return false;
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
  const t = new Date(v).getTime();
  return t;
}

function sameCalendarDay(a: any, b: any): boolean {
  const da = new Date(a);
  const db = new Date(b);
  if (isNaN(da.getTime()) || isNaN(db.getTime())) return false;
  return da.getFullYear() === db.getFullYear() && da.getMonth() === db.getMonth() && da.getDate() === db.getDate();
}

function evaluateLeaf(cond: ConditionLeaf, data: any, previousData?: any): boolean {
  const field = cond.field;
  const operator = cond.operator ?? (cond as any).op;
  const raw = data?.[field];
  const val = raw === null || raw === undefined ? '' : String(raw);
  const cv = cond.value != null ? String(cond.value) : '';

  switch (operator) {
    case 'is':
    case 'equals':        return val === cv;
    case 'is_not':
    case 'not_equals':    return val !== cv;
    case 'contains': {
      // A comma-separated value (from the multi-select picker) matches if ANY
      // term is found — a single term (no comma) behaves exactly as before.
      const terms = cv.split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
      if (terms.length === 0) return false;
      return terms.some(term => val.toLowerCase().includes(term));
    }
    case 'not_contains':  return !val.toLowerCase().includes(cv.toLowerCase());
    case 'starts_with':   return val.toLowerCase().startsWith(cv.toLowerCase());
    case 'ends_with':     return val.toLowerCase().endsWith(cv.toLowerCase());
    case 'empty':         return val === '' || raw == null;
    case 'not_empty':     return val !== '' && raw != null;
    case 'gt':            return toNum(raw) > toNum(cv);
    case 'gte':           return toNum(raw) >= toNum(cv);
    case 'lt':             return toNum(raw) < toNum(cv);
    case 'lte':            return toNum(raw) <= toNum(cv);
    case 'changed':        return previousData != null && String(previousData[field]) !== val;
    case 'between': {
      const parts = cv.split(',');
      const minVal = toNum(parts[0]);
      const maxVal = toNum(parts[1]);
      if (!isNaN(minVal) && !isNaN(maxVal)) {
        return toNum(raw) >= minVal && toNum(raw) <= maxVal;
      }
      // Bounds aren't plain numbers — this is a date range (e.g. "2026-01-01,2026-01-31").
      // toNum("2026-01-15") is NaN, so a numeric-only comparison would silently never match.
      const minTs = toTimestamp(parts[0]);
      const maxTs = toTimestamp(parts[1]);
      const rawTs = toTimestamp(raw);
      return !isNaN(minTs) && !isNaN(maxTs) && !isNaN(rawTs) && rawTs >= minTs && rawTs <= maxTs;
    }
    case 'is_one_of': {
      const opts = cv.split(',').map((s: string) => s.trim().toLowerCase()).filter(Boolean);
      return opts.includes(val.toLowerCase());
    }
    case 'not_in': {
      const opts = cv.split(',').map((s: string) => s.trim().toLowerCase()).filter(Boolean);
      return !opts.includes(val.toLowerCase());
    }
    case 'before':         return toTimestamp(raw) < toTimestamp(cv);
    case 'after':          return toTimestamp(raw) > toTimestamp(cv);
    case 'on':             return sameCalendarDay(raw, cv);
    case 'on_or_before':   return toTimestamp(raw) <= toTimestamp(cv);
    case 'on_or_after':    return toTimestamp(raw) >= toTimestamp(cv);
    case 'is_true':
    case 'checked':        return raw === true || raw === 'true' || raw === 1 || raw === '1';
    case 'is_false':
    case 'unchecked':      return !(raw === true || raw === 'true' || raw === 1 || raw === '1');
    case 'contains_any': {
      const arr = Array.isArray(raw) ? raw.map(String) : [];
      const terms = cv.split(',').map(s => s.trim()).filter(Boolean);
      return terms.some(t => arr.includes(t));
    }
    case 'contains_all': {
      const arr = Array.isArray(raw) ? raw.map(String) : [];
      const terms = cv.split(',').map(s => s.trim()).filter(Boolean);
      return terms.length > 0 && terms.every(t => arr.includes(t));
    }
    case 'changed_from': {
      if (!previousData) return false;
      const prevVal = String(previousData[field] ?? '');
      return prevVal === cv && val !== cv;
    }
    case 'changed_to': {
      if (!previousData) return false;
      const prevVal = String(previousData[field] ?? '');
      return val === cv && prevVal !== cv;
    }
    default: return true;
  }
}
