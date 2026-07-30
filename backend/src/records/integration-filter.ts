// A small, deliberately-restricted Prisma-JSON-where translator for an
// Integration Field's "Filter Criteria" — scopes which of a source module's
// records are searchable at all (e.g. "camp = Camp A"), on top of whatever
// the visitor types into Search Fields.
//
// This intentionally supports a SUBSET of the condition-tree operator
// vocabulary used elsewhere (backend/src/workflows/condition-tree.ts) — only
// operators with an unambiguous, reliable MySQL JSON-path translation.
// Numeric/date range operators (gt/lt/between/before/after) are omitted:
// Record.data is freeform JSON where a "number" field's value may be stored
// as either a JSON number or a JSON string depending on how it was written,
// and Prisma's MySQL JSON comparison semantics differ between the two —
// silently wrong range filtering is worse than not offering it yet.

export interface FilterConditionLeaf {
  id?: string;
  type: 'condition';
  field: string;
  operator: string;
  value?: any;
}

export interface FilterConditionGroup {
  id?: string;
  type: 'group';
  operator: 'AND' | 'OR';
  children: FilterConditionNode[];
}

export type FilterConditionNode = FilterConditionLeaf | FilterConditionGroup;

const SUPPORTED_OPERATORS = new Set([
  'is', 'is_not', 'contains', 'not_contains', 'starts_with', 'ends_with', 'is_one_of', 'not_in',
]);

export function conditionTreeToPrismaWhere(node: FilterConditionNode | null | undefined): any | null {
  if (!node) return null;

  if (node.type === 'condition') {
    return leafToPrismaWhere(node);
  }

  const group = node as FilterConditionGroup;
  const children = (group.children || [])
    .map(child => conditionTreeToPrismaWhere(child))
    .filter((w): w is any => w != null);
  if (children.length === 0) return null;
  return group.operator === 'OR' ? { OR: children } : { AND: children };
}

function leafToPrismaWhere(leaf: FilterConditionLeaf): any | null {
  if (!leaf.field || !SUPPORTED_OPERATORS.has(leaf.operator)) return null;
  const path = `$.${leaf.field}`;
  const value = leaf.value != null ? String(leaf.value) : '';

  switch (leaf.operator) {
    case 'is':
      return { data: { path, equals: value } };
    case 'is_not':
      return { NOT: { data: { path, equals: value } } };
    case 'contains':
      return value ? { data: { path, string_contains: value } } : null;
    case 'not_contains':
      return value ? { NOT: { data: { path, string_contains: value } } } : null;
    case 'starts_with':
      return value ? { data: { path, string_starts_with: value } } : null;
    case 'ends_with':
      return value ? { data: { path, string_ends_with: value } } : null;
    case 'is_one_of': {
      const opts = value.split(',').map(s => s.trim()).filter(Boolean);
      return opts.length ? { OR: opts.map(v => ({ data: { path, equals: v } })) } : null;
    }
    case 'not_in': {
      const opts = value.split(',').map(s => s.trim()).filter(Boolean);
      return opts.length ? { AND: opts.map(v => ({ NOT: { data: { path, equals: v } } })) } : null;
    }
    default:
      return null;
  }
}
