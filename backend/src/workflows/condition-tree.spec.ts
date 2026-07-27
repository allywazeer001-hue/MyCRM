import { normalizeConditionTree, evaluateNode, validateConditionTree } from './condition-tree';

describe('normalizeConditionTree', () => {
  it('treats null/undefined as an empty root group', () => {
    expect(normalizeConditionTree(null)).toEqual({ type: 'group', operator: 'AND', children: [] });
    expect(normalizeConditionTree(undefined)).toEqual({ type: 'group', operator: 'AND', children: [] });
  });

  it('treats an empty legacy array as an empty root group', () => {
    expect(normalizeConditionTree([])).toEqual({ type: 'group', operator: 'AND', children: [] });
  });

  it('wraps a legacy single flat condition as Root Group -> Existing Condition', () => {
    const legacy = [{ field: 'status', operator: 'is', value: 'Active' }];
    const tree = normalizeConditionTree(legacy);
    expect(tree).toEqual({
      type: 'group',
      operator: 'AND',
      children: [{ id: undefined, type: 'condition', field: 'status', operator: 'is', value: 'Active' }],
    });
  });

  it('wraps a legacy multi-condition array using the first item\'s logic', () => {
    const legacy = [
      { field: 'a', operator: 'is', value: '1', logic: 'OR' },
      { field: 'b', operator: 'is', value: '2', logic: 'OR' },
    ];
    const tree = normalizeConditionTree(legacy);
    expect(tree.operator).toBe('OR');
    expect(tree.children).toHaveLength(2);
  });

  it('passes through an already-tree-shaped group unchanged', () => {
    const already = { type: 'group' as const, operator: 'AND' as const, children: [] };
    expect(normalizeConditionTree(already)).toBe(already);
  });
});

describe('validateConditionTree', () => {
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

  it('rejects a condition missing a field', () => {
    const tree = {
      type: 'group' as const,
      operator: 'AND' as const,
      children: [{ type: 'condition' as const, field: '', operator: 'is', value: 'x' }],
    };
    expect(() => validateConditionTree(tree)).toThrow(/field/i);
  });

  it('rejects an invalid group operator', () => {
    const tree = { type: 'group' as const, operator: 'BOGUS' as any, children: [] };
    expect(() => validateConditionTree(tree)).toThrow(/operator/i);
  });

  it('accepts reserved formula/expression nodes structurally', () => {
    const tree = {
      type: 'group' as const,
      operator: 'AND' as const,
      children: [{ type: 'formula' as const, expression: '1 + 1' }],
    };
    expect(() => validateConditionTree(tree)).not.toThrow();
  });
});

describe('evaluateNode', () => {
  const leaf = (field: string, operator: string, value: any) => ({ type: 'condition' as const, field, operator, value });
  const group = (operator: 'AND' | 'OR', children: any[]) => ({ type: 'group' as const, operator, children });

  it('matches a single legacy condition (backward compatibility)', () => {
    const tree = normalizeConditionTree([{ field: 'status', operator: 'is', value: 'Active' }]);
    expect(evaluateNode(tree, { status: 'Active' })).toBe(true);
    expect(evaluateNode(tree, { status: 'Inactive' })).toBe(false);
  });

  it('"contains" with a single term behaves exactly as before (no comma)', () => {
    const tree = group('AND', [leaf('name', 'contains', 'ell')]);
    expect(evaluateNode(tree, { name: 'hello' })).toBe(true);
    expect(evaluateNode(tree, { name: 'world' })).toBe(false);
  });

  it('"contains" with a comma-separated value matches if ANY term is found (multi-select picker)', () => {
    const tree = group('AND', [leaf('status', 'contains', 'Red, Green, Blue')]);
    expect(evaluateNode(tree, { status: 'Green' })).toBe(true);
    expect(evaluateNode(tree, { status: 'Purple' })).toBe(false);
  });

  it('evaluates multiple conditions with AND', () => {
    const tree = group('AND', [leaf('gender', 'is', 'Male'), leaf('age', 'lt', 30)]);
    expect(evaluateNode(tree, { gender: 'Male', age: 25 })).toBe(true);
    expect(evaluateNode(tree, { gender: 'Male', age: 35 })).toBe(false);
  });

  it('evaluates multiple conditions with OR', () => {
    const tree = group('OR', [leaf('height', 'gt', 180), leaf('country', 'is', 'Tanzania')]);
    expect(evaluateNode(tree, { height: 190, country: 'Kenya' })).toBe(true);
    expect(evaluateNode(tree, { height: 150, country: 'Tanzania' })).toBe(true);
    expect(evaluateNode(tree, { height: 150, country: 'Kenya' })).toBe(false);
  });

  it('evaluates nested groups: Department=IT AND (Experience>5 OR Certification=AWS)', () => {
    const tree = group('AND', [
      leaf('department', 'is', 'IT'),
      group('OR', [leaf('experience', 'gt', 5), leaf('certification', 'is', 'AWS')]),
    ]);
    expect(evaluateNode(tree, { department: 'IT', experience: 2, certification: 'AWS' })).toBe(true);
    expect(evaluateNode(tree, { department: 'IT', experience: 10, certification: 'None' })).toBe(true);
    expect(evaluateNode(tree, { department: 'Sales', experience: 10, certification: 'AWS' })).toBe(false);
    expect(evaluateNode(tree, { department: 'IT', experience: 2, certification: 'None' })).toBe(false);
  });

  it('evaluates deeply nested groups (4 levels)', () => {
    const tree = group('AND', [
      leaf('a', 'is', '1'),
      group('OR', [
        leaf('b', 'is', '2'),
        group('AND', [
          leaf('c', 'is', '3'),
          group('OR', [leaf('d', 'is', '4'), leaf('e', 'is', '5')]),
        ]),
      ]),
    ]);
    expect(evaluateNode(tree, { a: '1', b: 'x', c: '3', d: 'x', e: '5' })).toBe(true);
    expect(evaluateNode(tree, { a: '1', b: 'x', c: '3', d: 'x', e: 'x' })).toBe(false);
    expect(evaluateNode(tree, { a: 'x', b: '2', c: '3', d: '4', e: '5' })).toBe(false);
  });

  it('evaluates the spec example: (Gender=Male AND Age<30) OR (Height>180 AND Country=Tanzania)', () => {
    const tree = group('OR', [
      group('AND', [leaf('gender', 'is', 'Male'), leaf('age', 'lt', 30)]),
      group('AND', [leaf('height', 'gt', 180), leaf('country', 'is', 'Tanzania')]),
    ]);
    expect(evaluateNode(tree, { gender: 'Male', age: 25, height: 150, country: 'Kenya' })).toBe(true);
    expect(evaluateNode(tree, { gender: 'Female', age: 40, height: 190, country: 'Tanzania' })).toBe(true);
    expect(evaluateNode(tree, { gender: 'Female', age: 40, height: 150, country: 'Kenya' })).toBe(false);
  });

  it('short-circuits AND — stops evaluating after the first false child', () => {
    const calls: string[] = [];
    // Track which fields are actually read during evaluation.
    const dataProxy = new Proxy(
      { a: 'x', b: 'x', c: 'x' },
      {
        get(target: any, prop: string) {
          calls.push(prop);
          return target[prop];
        },
      },
    );
    const tree = group('AND', [leaf('a', 'not_equals', 'x'), leaf('b', 'is', 'x'), leaf('c', 'is', 'x')]);
    evaluateNode(tree, dataProxy);
    expect(calls).toEqual(['a']); // false on first child — b and c never read
  });

  it('short-circuits OR — stops evaluating after the first true child', () => {
    const calls: string[] = [];
    const dataProxy = new Proxy(
      { a: 'x', b: 'x', c: 'x' },
      {
        get(target: any, prop: string) {
          calls.push(prop);
          return target[prop];
        },
      },
    );
    const tree = group('OR', [leaf('a', 'is', 'x'), leaf('b', 'is', 'x'), leaf('c', 'is', 'x')]);
    evaluateNode(tree, dataProxy);
    expect(calls).toEqual(['a']); // true on first child — b and c never read
  });

  it('throws for reserved NOT/XOR group operators', () => {
    expect(() => evaluateNode(group('NOT' as any, []), {})).toThrow(/not yet supported/i);
    expect(() => evaluateNode(group('XOR' as any, []), {})).toThrow(/not yet supported/i);
  });

  it('throws for reserved formula/expression node types', () => {
    expect(() => evaluateNode({ type: 'formula', expression: '1+1' } as any, {})).toThrow(/not yet supported/i);
  });

  it('an empty root group matches everything (no conditions = runs on every trigger)', () => {
    expect(evaluateNode(group('AND', []), { anything: 'goes' })).toBe(true);
  });
});

describe('decimal / numeric comparisons (gt/gte/lt/lte/between)', () => {
  const leaf = (field: string, operator: string, value: any) => ({ type: 'condition' as const, field, operator, value });

  it('gte correctly compares decimal values', () => {
    expect(evaluateNode(leaf('gpa', 'gte', '3.5'), { gpa: 3.5 })).toBe(true);
    expect(evaluateNode(leaf('gpa', 'gte', '3.5'), { gpa: 3.75 })).toBe(true);
    expect(evaluateNode(leaf('gpa', 'gte', '3.5'), { gpa: 3.49 })).toBe(false);
  });

  it('gt/lt/lte correctly compare decimal values', () => {
    expect(evaluateNode(leaf('score', 'gt', '2.75'), { score: 2.76 })).toBe(true);
    expect(evaluateNode(leaf('score', 'gt', '2.75'), { score: 2.75 })).toBe(false);
    expect(evaluateNode(leaf('score', 'lt', '10.25'), { score: 10.24 })).toBe(true);
    expect(evaluateNode(leaf('score', 'lte', '0.5'), { score: 0.5 })).toBe(true);
  });

  it('handles decimal values stored as strings (e.g. from a text-backed number input)', () => {
    expect(evaluateNode(leaf('gpa', 'gte', '3.5'), { gpa: '3.75' })).toBe(true);
  });

  it('strips currency symbols and thousands separators before comparing', () => {
    expect(evaluateNode(leaf('amount', 'gte', '1000'), { amount: '$1,250.50' })).toBe(true);
    expect(evaluateNode(leaf('amount', 'gt', '$500'), { amount: 750 })).toBe(true);
  });

  it('between works with decimal bounds', () => {
    expect(evaluateNode(leaf('gpa', 'between', '3.0,3.9'), { gpa: 3.5 })).toBe(true);
    expect(evaluateNode(leaf('gpa', 'between', '3.0,3.9'), { gpa: 4.0 })).toBe(false);
  });

  it('a missing/non-numeric field value never satisfies a numeric comparison', () => {
    expect(evaluateNode(leaf('gpa', 'gte', '3.5'), {})).toBe(false);
    expect(evaluateNode(leaf('gpa', 'gte', '3.5'), { gpa: 'not a number' })).toBe(false);
  });
});

describe('new field-type-aware operators', () => {
  const leaf = (field: string, operator: string, value: any) => ({ type: 'condition' as const, field, operator, value });

  it('starts_with / ends_with', () => {
    expect(evaluateNode(leaf('name', 'starts_with', 'Jo'), { name: 'John' })).toBe(true);
    expect(evaluateNode(leaf('name', 'starts_with', 'Jo'), { name: 'Alice' })).toBe(false);
    expect(evaluateNode(leaf('name', 'ends_with', 'son'), { name: 'Johnson' })).toBe(true);
  });

  it('not_in (is not one of)', () => {
    expect(evaluateNode(leaf('status', 'not_in', 'Active, Pending'), { status: 'Closed' })).toBe(true);
    expect(evaluateNode(leaf('status', 'not_in', 'Active, Pending'), { status: 'Active' })).toBe(false);
  });

  it('date comparisons: before / after / on / on_or_before / on_or_after', () => {
    expect(evaluateNode(leaf('dueDate', 'before', '2026-06-01'), { dueDate: '2026-05-15' })).toBe(true);
    expect(evaluateNode(leaf('dueDate', 'after', '2026-06-01'), { dueDate: '2026-06-15' })).toBe(true);
    expect(evaluateNode(leaf('dueDate', 'on', '2026-06-01'), { dueDate: '2026-06-01T14:30:00Z' })).toBe(true);
    expect(evaluateNode(leaf('dueDate', 'on_or_before', '2026-06-01'), { dueDate: '2026-06-01' })).toBe(true);
    expect(evaluateNode(leaf('dueDate', 'on_or_after', '2026-06-01'), { dueDate: '2026-05-31' })).toBe(false);
  });

  it('"between" works on a date range, not just numbers — a date bound like "2026-01-15" is not a valid Number(), so it must fall back to a timestamp comparison instead of always failing', () => {
    expect(evaluateNode(leaf('dueDate', 'between', '2026-01-01,2026-01-31'), { dueDate: '2026-01-15' })).toBe(true);
    expect(evaluateNode(leaf('dueDate', 'between', '2026-01-01,2026-01-31'), { dueDate: '2026-02-15' })).toBe(false);
    // Numeric "between" must keep working exactly as before this fix.
    expect(evaluateNode(leaf('score', 'between', '10,50'), { score: 42 })).toBe(true);
    expect(evaluateNode(leaf('score', 'between', '10,50'), { score: 99 })).toBe(false);
  });

  it('boolean operators: is_true / is_false', () => {
    expect(evaluateNode(leaf('isActive', 'is_true', ''), { isActive: true })).toBe(true);
    expect(evaluateNode(leaf('isActive', 'is_false', ''), { isActive: false })).toBe(true);
    expect(evaluateNode(leaf('isActive', 'is_true', ''), { isActive: false })).toBe(false);
  });

  it('checkbox operators: checked / unchecked', () => {
    expect(evaluateNode(leaf('agreed', 'checked', ''), { agreed: true })).toBe(true);
    expect(evaluateNode(leaf('agreed', 'unchecked', ''), { agreed: false })).toBe(true);
  });

  it('multi-select operators: contains_any / contains_all', () => {
    expect(evaluateNode(leaf('tags', 'contains_any', 'red,blue'), { tags: ['green', 'blue'] })).toBe(true);
    expect(evaluateNode(leaf('tags', 'contains_any', 'red,blue'), { tags: ['green'] })).toBe(false);
    expect(evaluateNode(leaf('tags', 'contains_all', 'red,blue'), { tags: ['red', 'blue', 'green'] })).toBe(true);
    expect(evaluateNode(leaf('tags', 'contains_all', 'red,blue'), { tags: ['red'] })).toBe(false);
  });
});
