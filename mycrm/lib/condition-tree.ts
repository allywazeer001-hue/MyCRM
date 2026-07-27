import { arrayMove } from "@dnd-kit/sortable";
import { CONDITION_OPERATORS, needsValue } from "@/components/workflows/condition-operators";

// ── Types ─────────────────────────────────────────────────────────────────────
// Mirrors backend/src/workflows/condition-tree.ts exactly — keep both in sync.

export interface ConditionLeaf {
  id?: string;
  type: "condition";
  field: string;
  operator: string;
  value?: any;
}

export interface ConditionGroup {
  id?: string;
  type: "group";
  operator: "AND" | "OR" | "NOT" | "XOR";
  children: ConditionNode[];
  collapsed?: boolean;
}

export interface FormulaNode {
  id?: string;
  type: "formula" | "expression";
  expression: string;
}

export type ConditionNode = ConditionLeaf | ConditionGroup | FormulaNode;

export function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export function countConditionLeaves(node: ConditionNode | null | undefined): number {
  if (!node) return 0;
  if (node.type === "condition" || node.type === "formula" || node.type === "expression") return 1;
  return ((node as ConditionGroup).children ?? []).reduce((sum: number, c: ConditionNode) => sum + countConditionLeaves(c), 0);
}

// ── Legacy bridging ───────────────────────────────────────────────────────────

export function normalizeConditionTree(raw: any): ConditionGroup {
  if (raw == null) {
    return { type: "group", operator: "AND", children: [] };
  }

  if (Array.isArray(raw)) {
    if (raw.length === 0) {
      return { type: "group", operator: "AND", children: [] };
    }
    const logic = raw[0]?.logic === "OR" ? "OR" : "AND";
    return {
      type: "group",
      operator: logic,
      children: raw.map((c: any) => ({
        id: c.id,
        type: "condition" as const,
        field: c.field,
        operator: c.operator ?? c.op,
        value: c.value,
      })),
    };
  }

  if (typeof raw === "object" && raw.type === "group") {
    return raw as ConditionGroup;
  }

  return { type: "group", operator: "AND", children: [] };
}

// Bridges the Blueprint engine's legacy shape — a flat conditions[] array plus a
// SEPARATE conditionsLogic sibling field (rather than per-item `logic`) — into the
// same tree shape used everywhere else. Leaves use `fieldName` (blueprint's stored
// key) rather than `field`; normalized on read to the canonical `field` key.
export function normalizeConditionTreeFromParts(conditions: any, conditionsLogic?: "AND" | "OR"): ConditionGroup {
  if (conditions == null) {
    return { type: "group", operator: "AND", children: [] };
  }

  if (typeof conditions === "object" && !Array.isArray(conditions) && conditions.type === "group") {
    return conditions as ConditionGroup;
  }

  if (!Array.isArray(conditions) || conditions.length === 0) {
    return { type: "group", operator: "AND", children: [] };
  }

  return {
    type: "group",
    operator: conditionsLogic === "OR" ? "OR" : "AND",
    children: conditions.map((c: any) => ({
      id: c.id,
      type: "condition" as const,
      field: c.fieldName ?? c.field,
      operator: c.operator ?? c.op,
      value: c.value,
    })),
  };
}

// Recursively backfills missing `id`s (server-loaded trees, or hand-built legacy
// arrays that only had ids on some conditions). Safe to call on any node shape.
export function ensureIds(node: ConditionNode): ConditionNode {
  const withId = { ...node, id: node.id || uid() } as ConditionNode;
  if (withId.type === "group") {
    return { ...withId, children: (withId.children || []).map(ensureIds) };
  }
  return withId;
}

// ── Tree traversal helpers ────────────────────────────────────────────────────

function mapChildren(node: ConditionNode, fn: (n: ConditionNode) => ConditionNode): ConditionNode {
  const next = fn(node);
  if (next.type !== "group") return next;
  return { ...next, children: next.children.map(child => mapChildren(child, fn)) };
}

export function updateNode(root: ConditionGroup, id: string, patch: Partial<ConditionNode>): ConditionGroup {
  return mapChildren(root, n => (n.id === id ? ({ ...n, ...patch } as ConditionNode) : n)) as ConditionGroup;
}

export function removeNode(root: ConditionGroup, id: string): ConditionGroup {
  function recurse(node: ConditionNode): ConditionNode {
    if (node.type !== "group") return node;
    return {
      ...node,
      children: node.children.filter(c => c.id !== id).map(recurse),
    };
  }
  return recurse(root) as ConditionGroup;
}

export function addCondition(root: ConditionGroup, parentGroupId: string, field: string, defaultOperator = "is"): ConditionGroup {
  const leaf: ConditionLeaf = { id: uid(), type: "condition", field, operator: defaultOperator, value: "" };
  function recurse(node: ConditionNode): ConditionNode {
    if (node.type !== "group") return node;
    if (node.id === parentGroupId) {
      return { ...node, children: [...node.children, leaf] };
    }
    return { ...node, children: node.children.map(recurse) };
  }
  return recurse(root) as ConditionGroup;
}

export function addGroup(root: ConditionGroup, parentGroupId: string, field: string, defaultOperator = "is"): ConditionGroup {
  // A nested group must never be created empty — pre-populate one starter condition.
  const starter: ConditionLeaf = { id: uid(), type: "condition", field, operator: defaultOperator, value: "" };
  const group: ConditionGroup = { id: uid(), type: "group", operator: "AND", children: [starter] };
  function recurse(node: ConditionNode): ConditionNode {
    if (node.type !== "group") return node;
    if (node.id === parentGroupId) {
      return { ...node, children: [...node.children, group] };
    }
    return { ...node, children: node.children.map(recurse) };
  }
  return recurse(root) as ConditionGroup;
}

function cloneWithFreshIds(node: ConditionNode): ConditionNode {
  if (node.type === "group") {
    return { ...node, id: uid(), children: node.children.map(cloneWithFreshIds) };
  }
  return { ...node, id: uid() };
}

export function duplicateNode(root: ConditionGroup, id: string): ConditionGroup {
  function recurse(node: ConditionNode): ConditionNode {
    if (node.type !== "group") return node;
    const children: ConditionNode[] = [];
    for (const child of node.children) {
      children.push(recurse(child));
      if (child.id === id) children.push(cloneWithFreshIds(child));
    }
    return { ...node, children };
  }
  return recurse(root) as ConditionGroup;
}

export function moveWithinParent(root: ConditionGroup, parentGroupId: string, oldIndex: number, newIndex: number): ConditionGroup {
  function recurse(node: ConditionNode): ConditionNode {
    if (node.type !== "group") return node;
    if (node.id === parentGroupId) {
      return { ...node, children: arrayMove(node.children, oldIndex, newIndex) };
    }
    return { ...node, children: node.children.map(recurse) };
  }
  return recurse(root) as ConditionGroup;
}

// ── Lock Group (multi-select -> wrap in a nested group, i.e. parentheses) ─────
// The internal representation needs nothing new — a "locked group" IS simply a
// nested ConditionGroup, exactly like one created via "Add Group". Locking is
// just a UX shortcut for building that same nested-group tree from conditions
// that already exist, instead of only being able to start from an empty group.

function findGroupById(root: ConditionGroup, groupId: string): ConditionGroup | null {
  if (root.id === groupId) return root;
  for (const child of root.children) {
    if (child.type === "group") {
      const found = findGroupById(child, groupId);
      if (found) return found;
    }
  }
  return null;
}

/** True only if every selected id is a direct child of `parentGroupId` AND the
 *  selected items occupy a contiguous run in that group's children — matching
 *  "select one or more consecutive conditions" from the spec. Non-consecutive
 *  or cross-group selections can't be locked (the UI should disable Lock Group
 *  in that case; this is the defensive check backing that). */
export function isConsecutiveSelection(root: ConditionGroup, parentGroupId: string, selectedIds: string[]): boolean {
  if (selectedIds.length === 0) return false;
  const parent = findGroupById(root, parentGroupId);
  if (!parent) return false;
  const indices = parent.children
    .map((c, i) => (selectedIds.includes(c.id!) ? i : -1))
    .filter(i => i !== -1)
    .sort((a, b) => a - b);
  if (indices.length !== selectedIds.length) return false; // some id wasn't a direct child here
  for (let i = 1; i < indices.length; i++) {
    if (indices[i] !== indices[i - 1] + 1) return false;
  }
  return true;
}

/** Wraps the selected (consecutive, same-parent) children into a new nested
 *  group — the "Lock Group" action. No-ops (returns root unchanged) if the
 *  selection isn't consecutive, matching the validation rule above. */
export function lockGroup(root: ConditionGroup, parentGroupId: string, selectedIds: string[]): ConditionGroup {
  if (!isConsecutiveSelection(root, parentGroupId, selectedIds)) return root;

  function recurse(node: ConditionNode): ConditionNode {
    if (node.type !== "group") return node;
    if (node.id === parentGroupId) {
      const selectedSet = new Set(selectedIds);
      const firstIndex = node.children.findIndex(c => selectedSet.has(c.id!));
      const locked: ConditionNode[] = node.children.filter(c => selectedSet.has(c.id!));
      const rest = node.children.filter(c => !selectedSet.has(c.id!));
      const newGroup: ConditionGroup = { id: uid(), type: "group", operator: "AND", children: locked };
      const nextChildren = [...rest];
      nextChildren.splice(firstIndex, 0, newGroup);
      return { ...node, children: nextChildren };
    }
    return { ...node, children: node.children.map(recurse) };
  }
  return recurse(root) as ConditionGroup;
}

/** Inverse of lockGroup — flattens a nested group's children back into its
 *  parent at the position the group occupied, preserving every condition and
 *  operator inside it. No-ops on the root group (nothing to unlock into). */
export function unlockGroup(root: ConditionGroup, groupId: string): ConditionGroup {
  if (root.id === groupId) return root;

  function recurse(node: ConditionNode): ConditionNode {
    if (node.type !== "group") return node;
    const idx = node.children.findIndex(c => c.id === groupId);
    if (idx !== -1 && node.children[idx].type === "group") {
      const target = node.children[idx] as ConditionGroup;
      const nextChildren = [...node.children];
      nextChildren.splice(idx, 1, ...target.children);
      return { ...node, children: nextChildren };
    }
    return { ...node, children: node.children.map(recurse) };
  }
  return recurse(root) as ConditionGroup;
}

export function canRemove(root: ConditionGroup, id: string): boolean {
  function findParent(node: ConditionGroup, isRootNode: boolean): { parent: ConditionGroup; isRoot: boolean } | null {
    for (const child of node.children) {
      if (child.id === id) return { parent: node, isRoot: isRootNode };
      if (child.type === "group") {
        const found = findParent(child, false);
        if (found) return found;
      }
    }
    return null;
  }
  const found = findParent(root, true);
  if (!found) return true;
  if (found.isRoot) return true;
  return found.parent.children.length > 1;
}

// ── Human-readable summary ────────────────────────────────────────────────────

export interface SummarizeOptions {
  operators?: { value: string; label: string }[];
  noValueOperators?: string[];
}

export function summarizeTree(root: ConditionGroup, fields: any[], opts: SummarizeOptions = {}): string {
  if (!root.children || root.children.length === 0) {
    return "No conditions — runs on every trigger";
  }
  return summarizeNode(root, fields, opts, true);
}

function summarizeNode(node: ConditionNode, fields: any[], opts: SummarizeOptions, isRoot = false): string {
  const operators = opts.operators ?? CONDITION_OPERATORS;
  const noValueOps = opts.noValueOperators ?? ["empty", "not_empty"];

  if (node.type === "condition") {
    const fLabel = fields.find((f: any) => f.name === node.field)?.label ?? node.field ?? "field";
    const oLabel = operators.find(o => o.value === node.operator)?.label ?? node.operator;
    const valuePart = !noValueOps.includes(node.operator) && node.value ? ` "${node.value}"` : "";
    return `${fLabel} ${oLabel}${valuePart}`;
  }

  if (node.type === "formula" || node.type === "expression") {
    return "[unsupported formula]";
  }

  const group = node as ConditionGroup;
  if (!group.children || group.children.length === 0) return "always";
  const parts = group.children.map(c => summarizeNode(c, fields, opts));
  const joined = parts.join(` ${group.operator === "OR" ? "OR" : "AND"} `);
  return isRoot ? joined : `(${joined})`;
}

// ── Structure preview (letter-notation simulation) ────────────────────────────
// Shows the abstract shape of the boolean expression — A, B, C… for each
// condition in order, joined/parenthesized exactly like the real tree — so users
// can see "(A AND B) OR C" without wading through long field names/values. This
// is what Lock Group is building toward: seeing the parenthesization at a glance.

function letterFor(index: number): string {
  // A, B, ..., Z, AA, AB, ... (spreadsheet-column style) for trees with 26+ leaves.
  let n = index;
  let out = "";
  do {
    out = String.fromCharCode(65 + (n % 26)) + out;
    n = Math.floor(n / 26) - 1;
  } while (n >= 0);
  return out;
}

export function previewStructure(root: ConditionGroup): string {
  if (!root.children || root.children.length === 0) return "Matches everything";
  let counter = 0;
  function walk(node: ConditionNode, isRoot = false): string {
    if (node.type === "condition") return letterFor(counter++);
    if (node.type === "formula" || node.type === "expression") return letterFor(counter++);
    const group = node as ConditionGroup;
    if (!group.children || group.children.length === 0) return "";
    const parts = group.children.map(c => walk(c));
    const joined = parts.join(` ${group.operator === "OR" ? "OR" : "AND"} `);
    return isRoot ? joined : `(${joined})`;
  }
  return walk(root, true);
}
