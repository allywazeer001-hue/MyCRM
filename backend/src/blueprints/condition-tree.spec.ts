import { normalizeConditionTree, evaluateNode, validateConditionTree, evaluateLeaf } from './condition-tree';

describe('normalizeConditionTree (Blueprint)', () => {
  it('treats null/undefined/empty array as an empty root group', () => {
    expect(normalizeConditionTree(null)).toEqual({ type: 'group', operator: 'AND', children: [] });
    expect(normalizeConditionTree(undefined)).toEqual({ type: 'group', operator: 'AND', children: [] });
    expect(normalizeConditionTree([])).toEqual({ type: 'group', operator: 'AND', children: [] });
  });

  it('wraps a legacy flat conditions[] array using the separate conditionsLogic field', () => {
    const tree = normalizeConditionTree(
      [{ fieldName: 'status', operator: 'equals', value: 'Active' }, { fieldName: 'priority', operator: 'equals', value: 'High' }],
      'OR',
    );
    expect(tree.operator).toBe('OR');
    expect(tree.children).toHaveLength(2);
    expect(tree.children[0]).toMatchObject({ type: 'condition', fieldName: 'status', operator: 'equals', value: 'Active' });
  });

  it('defaults to AND when conditionsLogic is omitted', () => {
    const tree = normalizeConditionTree([{ fieldName: 'a', operator: 'equals', value: '1' }]);
    expect(tree.operator).toBe('AND');
  });

  it('accepts a legacy leaf keyed by `field` (alias for `fieldName`)', () => {
    const tree = normalizeConditionTree([{ field: 'status', operator: 'equals', value: 'Active' }]);
    expect(tree.children[0]).toMatchObject({ fieldName: 'status' });
  });

  it('passes through an already-tree-shaped group unchanged', () => {
    const already = { type: 'group' as const, operator: 'AND' as const, children: [] };
    expect(normalizeConditionTree(already)).toBe(already);
  });
});

describe('validateConditionTree (Blueprint)', () => {
  it('allows an empty root group', () => {
    expect(() => validateConditionTree({ type: 'group', operator: 'AND', children: [] })).not.toThrow();
  });

  it('rejects a nested empty group', () => {
    const tree = {
      type: 'group' as const,
      operator: 'AND' as const,
      children: [{ type: 'group' as const, operator: 'OR' as const, children: [] }],
    };
    expect(() => validateConditionTree(tree)).toThrow(/empty/i);
  });

  it('rejects a condition missing a fieldName', () => {
    const tree = {
      type: 'group' as const,
      operator: 'AND' as const,
      children: [{ type: 'condition' as const, fieldName: '', operator: 'equals', value: 'x' }],
    };
    expect(() => validateConditionTree(tree)).toThrow(/field/i);
  });
});

describe('evaluateLeaf operators (Blueprint)', () => {
  const leaf = (operator: string, value: any) => ({ type: 'condition' as const, fieldName: 'f', operator, value });

  it('equals / not_equals', () => {
    expect(evaluateLeaf(leaf('equals', 'x'), { f: 'x' })).toBe(true);
    expect(evaluateLeaf(leaf('not_equals', 'x'), { f: 'y' })).toBe(true);
  });

  it('contains / not_contains', () => {
    expect(evaluateLeaf(leaf('contains', 'ell'), { f: 'hello' })).toBe(true);
    expect(evaluateLeaf(leaf('not_contains', 'zzz'), { f: 'hello' })).toBe(true);
  });

  it('contains with a comma-separated value matches if ANY term is found (multi-select picker)', () => {
    expect(evaluateLeaf(leaf('contains', 'Red, Green, Blue'), { f: 'Green' })).toBe(true);
    expect(evaluateLeaf(leaf('contains', 'Red, Green, Blue'), { f: 'Purple' })).toBe(false);
  });

  it('numeric comparisons', () => {
    expect(evaluateLeaf(leaf('gt', '5'), { f: 10 })).toBe(true);
    expect(evaluateLeaf(leaf('lt', '5'), { f: 1 })).toBe(true);
    expect(evaluateLeaf(leaf('gte', '5'), { f: 5 })).toBe(true);
    expect(evaluateLeaf(leaf('lte', '5'), { f: 5 })).toBe(true);
  });

  it('is_empty / not_empty', () => {
    expect(evaluateLeaf(leaf('is_empty', ''), { f: null })).toBe(true);
    expect(evaluateLeaf(leaf('not_empty', ''), { f: 'x' })).toBe(true);
  });

  it('between (new operator)', () => {
    expect(evaluateLeaf(leaf('between', '10,20'), { f: 15 })).toBe(true);
    expect(evaluateLeaf(leaf('between', '10,20'), { f: 25 })).toBe(false);
  });

  it('is_one_of (new operator)', () => {
    expect(evaluateLeaf(leaf('is_one_of', 'red, green, blue'), { f: 'Green' })).toBe(true);
    expect(evaluateLeaf(leaf('is_one_of', 'red,green,blue'), { f: 'purple' })).toBe(false);
  });

  it('changed — reflects whether the field was present in the submitted payload, not a value diff', () => {
    expect(evaluateLeaf(leaf('changed', ''), { f: 'x' }, ['f'])).toBe(true);
    expect(evaluateLeaf(leaf('changed', ''), { f: 'x' }, [])).toBe(false);
  });

  it('fails closed on an unrecognized operator (preserves existing Blueprint behavior)', () => {
    expect(evaluateLeaf(leaf('bogus_op', 'x'), { f: 'x' })).toBe(false);
  });
});

describe('evaluateNode (Blueprint) — nested groups + short-circuit', () => {
  const leaf = (fieldName: string, operator: string, value: any) => ({ type: 'condition' as const, fieldName, operator, value });
  const group = (operator: 'AND' | 'OR', children: any[]) => ({ type: 'group' as const, operator, children });

  it('matches a single legacy condition (backward compatibility)', () => {
    const tree = normalizeConditionTree([{ fieldName: 'status', operator: 'equals', value: 'Active' }]);
    expect(evaluateNode(tree, { status: 'Active' })).toBe(true);
    expect(evaluateNode(tree, { status: 'Inactive' })).toBe(false);
  });

  it('evaluates nested groups: department=IT AND (experience>5 OR certification=AWS)', () => {
    const tree = group('AND', [
      leaf('department', 'equals', 'IT'),
      group('OR', [leaf('experience', 'gt', '5'), leaf('certification', 'equals', 'AWS')]),
    ]);
    expect(evaluateNode(tree, { department: 'IT', experience: 2, certification: 'AWS' })).toBe(true);
    expect(evaluateNode(tree, { department: 'Sales', experience: 10, certification: 'AWS' })).toBe(false);
  });

  it('short-circuits AND — later siblings are never read once one fails', () => {
    const reads: string[] = [];
    const proxy = new Proxy({ a: 'x', b: 'x' }, { get(t: any, p: string) { reads.push(p); return t[p]; } });
    const tree = group('AND', [leaf('a', 'not_equals', 'x'), leaf('b', 'equals', 'x')]);
    evaluateNode(tree, proxy);
    expect(reads).toEqual(['a']);
  });

  it('short-circuits OR — later siblings are never read once one passes', () => {
    const reads: string[] = [];
    const proxy = new Proxy({ a: 'x', b: 'x' }, { get(t: any, p: string) { reads.push(p); return t[p]; } });
    const tree = group('OR', [leaf('a', 'equals', 'x'), leaf('b', 'equals', 'x')]);
    evaluateNode(tree, proxy);
    expect(reads).toEqual(['a']);
  });

  it('an empty root group matches everything (no conditions = transition always available)', () => {
    expect(evaluateNode(group('AND', []), { anything: 'goes' })).toBe(true);
  });

  it('throws for reserved NOT/XOR group operators', () => {
    expect(() => evaluateNode(group('NOT' as any, []), {})).toThrow(/not yet supported/i);
  });
});

describe('decimal / numeric comparisons (Blueprint)', () => {
  const leaf = (fieldName: string, operator: string, value: any) => ({ type: 'condition' as const, fieldName, operator, value });

  it('gte correctly compares decimal values', () => {
    expect(evaluateLeaf(leaf('gpa', 'gte', '3.5'), { gpa: 3.5 })).toBe(true);
    expect(evaluateLeaf(leaf('gpa', 'gte', '3.5'), { gpa: 3.75 })).toBe(true);
    expect(evaluateLeaf(leaf('gpa', 'gte', '3.5'), { gpa: 3.49 })).toBe(false);
  });

  it('handles decimal values stored as strings', () => {
    expect(evaluateLeaf(leaf('gpa', 'gte', '3.5'), { gpa: '3.75' })).toBe(true);
  });

  it('strips currency symbols and thousands separators before comparing', () => {
    expect(evaluateLeaf(leaf('amount', 'gte', '1000'), { amount: '$1,250.50' })).toBe(true);
  });

  it('between works with decimal bounds', () => {
    expect(evaluateLeaf(leaf('gpa', 'between', '3.0,3.9'), { gpa: 3.5 })).toBe(true);
    expect(evaluateLeaf(leaf('gpa', 'between', '3.0,3.9'), { gpa: 4.0 })).toBe(false);
  });
});

describe('new field-type-aware operators (Blueprint)', () => {
  const leaf = (fieldName: string, operator: string, value: any) => ({ type: 'condition' as const, fieldName, operator, value });

  it('starts_with / ends_with', () => {
    expect(evaluateLeaf(leaf('name', 'starts_with', 'Jo'), { name: 'John' })).toBe(true);
    expect(evaluateLeaf(leaf('name', 'ends_with', 'son'), { name: 'Johnson' })).toBe(true);
  });

  it('not_in', () => {
    expect(evaluateLeaf(leaf('status', 'not_in', 'Active, Pending'), { status: 'Closed' })).toBe(true);
    expect(evaluateLeaf(leaf('status', 'not_in', 'Active, Pending'), { status: 'Active' })).toBe(false);
  });

  it('date comparisons: before / after / on / on_or_before / on_or_after', () => {
    expect(evaluateLeaf(leaf('dueDate', 'before', '2026-06-01'), { dueDate: '2026-05-15' })).toBe(true);
    expect(evaluateLeaf(leaf('dueDate', 'after', '2026-06-01'), { dueDate: '2026-06-15' })).toBe(true);
    expect(evaluateLeaf(leaf('dueDate', 'on', '2026-06-01'), { dueDate: '2026-06-01T14:30:00Z' })).toBe(true);
  });

  it('boolean-style operators: is_true / is_false / checked / unchecked', () => {
    expect(evaluateLeaf(leaf('isActive', 'is_true', ''), { isActive: true })).toBe(true);
    expect(evaluateLeaf(leaf('agreed', 'checked', ''), { agreed: true })).toBe(true);
    expect(evaluateLeaf(leaf('agreed', 'unchecked', ''), { agreed: false })).toBe(true);
  });

  it('multi-select operators: contains_any / contains_all', () => {
    expect(evaluateLeaf(leaf('tags', 'contains_any', 'red,blue'), { tags: ['green', 'blue'] })).toBe(true);
    expect(evaluateLeaf(leaf('tags', 'contains_all', 'red,blue'), { tags: ['red'] })).toBe(false);
  });
});
