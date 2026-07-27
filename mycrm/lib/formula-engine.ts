// Shared FORMULA-field evaluation engine.
//
// A formula references other fields as `$fieldName` or `{fieldName}` and can combine them
// with +-*/() and the functions in FUNCTION_REFERENCE below. Date-typed fields resolve to
// real Date values (not coerced to 0 the way non-date engines do), and the *actual computed
// value's own type* decides whether the result is a date or a number — nothing is manually
// declared. ADDDAYS(...)/ADDYEARS(...)/ADDMONTHS(...)/DATE(...)/TODAY()/NOW() naturally
// produce a Date; everything else (arithmetic, DATEDIFF_*, YEAR(), etc.) naturally produces
// a number. Whatever comes out of the outermost expression is what gets stored and shown.
//
// Safety: field tokens and SUM(subform.col) aggregates are substituted OUT before we ever
// look at identifiers, then every remaining bare identifier must be one of the fixed helper
// names below or the caller rejects the formula — this is a strict allowlist, not a
// blacklist, so arbitrary globals (window, fetch, constructor, …) can never be referenced
// even though evaluation still goes through Function() under the hood.

export type FormulaResultKind = "number" | "date";

export interface FormulaFieldMeta {
  name: string;
  type: string;
}

export interface FormulaEvalResult {
  value: number | string | null; // number, or an ISO date string, or null on error/no-op
  kind: FormulaResultKind;
}

const DATE_FIELD_TYPES = new Set(["DATE", "DATETIME"]);

function safeDate(v: any): Date | null {
  if (v == null) return null;
  if (v instanceof Date) return isNaN(v.getTime()) ? null : v;
  if (typeof v === "number") return null; // a bare number is never a date, even if it happens to be a valid timestamp
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d;
}

function diffYears(a: Date, b: Date): number {
  let years = a.getFullYear() - b.getFullYear();
  if (a.getMonth() < b.getMonth() || (a.getMonth() === b.getMonth() && a.getDate() < b.getDate())) years--;
  return years;
}
function diffMonths(a: Date, b: Date): number {
  let months = (a.getFullYear() - b.getFullYear()) * 12 + (a.getMonth() - b.getMonth());
  if (a.getDate() < b.getDate()) months--;
  return months;
}

// All functions tolerate null/invalid dates by returning 0 (numeric) or null (date-producing)
// rather than throwing, so a formula referencing an unset field just computes to a fallback
// instead of breaking the whole expression.
const HELPERS: Record<string, (...args: any[]) => any> = {
  YEAR:  (d: any) => safeDate(d)?.getFullYear() ?? 0,
  MONTH: (d: any) => (safeDate(d)?.getMonth() ?? -1) + 1,
  DAY:   (d: any) => safeDate(d)?.getDate() ?? 0,
  HOUR:  (d: any) => safeDate(d)?.getHours() ?? 0,
  MINUTE:(d: any) => safeDate(d)?.getMinutes() ?? 0,
  TODAY: () => new Date(new Date().toDateString()),
  NOW:   () => new Date(),
  ADDYEARS:  (d: any, n: any) => { const dt = safeDate(d); if (!dt) return null; const r = new Date(dt); r.setFullYear(r.getFullYear() + (Number(n) || 0)); return r; },
  ADDMONTHS: (d: any, n: any) => { const dt = safeDate(d); if (!dt) return null; const r = new Date(dt); r.setMonth(r.getMonth() + (Number(n) || 0)); return r; },
  ADDDAYS:   (d: any, n: any) => { const dt = safeDate(d); if (!dt) return null; const r = new Date(dt); r.setDate(r.getDate() + (Number(n) || 0)); return r; },
  DATEDIFF_YEARS:  (a: any, b: any) => { const da = safeDate(a), db = safeDate(b); return da && db ? diffYears(da, db) : 0; },
  DATEDIFF_MONTHS: (a: any, b: any) => { const da = safeDate(a), db = safeDate(b); return da && db ? diffMonths(da, db) : 0; },
  DATEDIFF_DAYS:   (a: any, b: any) => { const da = safeDate(a), db = safeDate(b); return da && db ? Math.round((da.getTime() - db.getTime()) / 86400000) : 0; },
  DATEDIFF_HOURS:  (a: any, b: any) => { const da = safeDate(a), db = safeDate(b); return da && db ? Math.round((da.getTime() - db.getTime()) / 3600000) : 0; },
  DATE: (y: any, m: any, d: any) => new Date(Number(y), (Number(m) || 1) - 1, Number(d) || 1),
  // General two-or-more-value clamp — distinct from the subform aggregate MIN/MAX
  // (that one only matches the exact `MIN(subformField.column)` shape via a regex
  // pre-pass, so a plain multi-arg call like MIN($a, $b) always lands here instead).
  MIN: (...nums: any[]) => Math.min(...nums.map((n) => Number(n))),
  MAX: (...nums: any[]) => Math.max(...nums.map((n) => Number(n))),
};

export const FORMULA_HELPER_NAMES = Object.keys(HELPERS);

// Rich metadata for the formula editor: shown as signature help while typing a function,
// and as autocomplete suggestions. SUM/AVG/MIN/MAX/COUNT aren't in HELPERS because they're
// handled by a separate pre-pass (applySubformAggregates) with different syntax
// (`FN(subformField.column)` rather than `FN(field1, field2)`), but they're documented
// here so the editor can offer signature help/autocomplete for them too.
export interface FormulaFunctionDoc {
  name: string;
  syntax: string;
  description: string;
  example: string;
  category: "date" | "aggregate" | "math";
}

export const FORMULA_FUNCTION_DOCS: FormulaFunctionDoc[] = [
  { name: "YEAR", syntax: "YEAR(date)", description: "The year of a date, as a number.", example: "YEAR($start_date)", category: "date" },
  { name: "MONTH", syntax: "MONTH(date)", description: "The month of a date (1-12), as a number.", example: "MONTH($start_date)", category: "date" },
  { name: "DAY", syntax: "DAY(date)", description: "The day of the month (1-31), as a number.", example: "DAY($start_date)", category: "date" },
  { name: "HOUR", syntax: "HOUR(date)", description: "The hour (0-23) of a date/time value.", example: "HOUR($created_at)", category: "date" },
  { name: "MINUTE", syntax: "MINUTE(date)", description: "The minute (0-59) of a date/time value.", example: "MINUTE($created_at)", category: "date" },
  { name: "TODAY", syntax: "TODAY()", description: "Today's date, with no time component. Takes no arguments.", example: "ADDDAYS(TODAY(), 4)", category: "date" },
  { name: "NOW", syntax: "NOW()", description: "The current date and time. Takes no arguments.", example: "DATEDIFF_HOURS(NOW(), $created_at)", category: "date" },
  { name: "ADDYEARS", syntax: "ADDYEARS(date, n)", description: "date shifted forward by n years. n can be a field or a plain number; use a negative number to go backward.", example: "ADDYEARS($start_date, $course_duration)", category: "date" },
  { name: "ADDMONTHS", syntax: "ADDMONTHS(date, n)", description: "date shifted forward by n months.", example: "ADDMONTHS($start_date, 6)", category: "date" },
  { name: "ADDDAYS", syntax: "ADDDAYS(date, n)", description: "date shifted forward by n days.", example: "ADDDAYS(TODAY(), 4)", category: "date" },
  { name: "DATEDIFF_YEARS", syntax: "DATEDIFF_YEARS(a, b)", description: "Whole years between a and b (a minus b).", example: "DATEDIFF_YEARS($end_date, $start_date)", category: "date" },
  { name: "DATEDIFF_MONTHS", syntax: "DATEDIFF_MONTHS(a, b)", description: "Whole months between a and b (a minus b).", example: "DATEDIFF_MONTHS($end_date, $start_date)", category: "date" },
  { name: "DATEDIFF_DAYS", syntax: "DATEDIFF_DAYS(a, b)", description: "Days between a and b (a minus b).", example: "DATEDIFF_DAYS($end_date, $start_date)", category: "date" },
  { name: "DATEDIFF_HOURS", syntax: "DATEDIFF_HOURS(a, b)", description: "Hours between a and b (a minus b).", example: "DATEDIFF_HOURS($end_date, $start_date)", category: "date" },
  { name: "DATE", syntax: "DATE(year, month, day)", description: "Builds a date from year/month/day numbers.", example: "DATE(2027, 1, 1)", category: "date" },
  { name: "SUM", syntax: "SUM(subformField.column)", description: "Total of a numeric column across all rows of an Inline Subform field.", example: "SUM(line_items.amount)", category: "aggregate" },
  { name: "AVG", syntax: "AVG(subformField.column)", description: "Average of a numeric column across all rows of an Inline Subform field.", example: "AVG(line_items.amount)", category: "aggregate" },
  { name: "MIN", syntax: "MIN(subformField.column) or MIN(a, b, ...)", description: "Smallest value of a numeric column across all rows of an Inline Subform field — OR, given two or more plain values/expressions instead of a single subform.column, the smallest of those. Useful for capping a computed number at a maximum (e.g. year of study capped at course duration).", example: "MIN(YEAR(TODAY()) - YEAR($start_date) + 1, $course_duration)", category: "aggregate" },
  { name: "MAX", syntax: "MAX(subformField.column) or MAX(a, b, ...)", description: "Largest value of a numeric column across all rows of an Inline Subform field — OR, given two or more plain values/expressions instead of a single subform.column, the largest of those. Useful for flooring a computed number at a minimum.", example: "MAX($discount, 0)", category: "aggregate" },
  { name: "COUNT", syntax: "COUNT(subformField.column)", description: "Number of rows in an Inline Subform field that have a value in that column.", example: "COUNT(line_items.amount)", category: "aggregate" },
];

const SAFE_CHARS_RE = /^[\w\s+\-*/().,]*$/;
const IDENTIFIER_RE = /[A-Za-z_][A-Za-z0-9_]*/g;

const SUBFORM_AGGREGATE_FN = /\b(SUM|AVG|MIN|MAX|COUNT)\(([A-Za-z_][A-Za-z0-9_]*)\.([A-Za-z_][A-Za-z0-9_]*)\)/g;

function computeSubformAggregate(fn: string, rows: any[], column: string): number {
  const values = rows
    .map(r => r?.[column])
    .filter(v => v !== undefined && v !== null && v !== "")
    .map(Number)
    .filter(v => isFinite(v));
  switch (fn) {
    case "SUM": return values.reduce((a, b) => a + b, 0);
    case "AVG": return values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;
    case "MIN": return values.length ? Math.min(...values) : 0;
    case "MAX": return values.length ? Math.max(...values) : 0;
    case "COUNT": return values.length;
    default: return 0;
  }
}

function applySubformAggregates(expr: string, data: Record<string, any>): string {
  return expr.replace(SUBFORM_AGGREGATE_FN, (_, fn, fieldName, column) => {
    const rows = Array.isArray(data[fieldName]) ? data[fieldName] : [];
    return String(computeSubformAggregate(fn, rows, column));
  });
}

// Field-token substitution shared by evaluateFormula and validateFormula — replaces every
// $name / {name} with a placeholder identifier and records what real value (number or Date)
// that placeholder should resolve to.
function substituteFieldTokens(expr: string, data: Record<string, any>, fieldsMeta: FormulaFieldMeta[]) {
  const typeByName = new Map(fieldsMeta.map(f => [f.name, f.type]));
  const argNames: string[] = [];
  const argValues: any[] = [];
  const placeholderByField = new Map<string, string>();
  const unknownFields: string[] = [];

  const substituteToken = (name: string): string => {
    let placeholder = placeholderByField.get(name);
    if (!placeholder) {
      placeholder = `__f${argNames.length}`;
      if (!typeByName.has(name)) unknownFields.push(name);
      const isDateField = DATE_FIELD_TYPES.has(typeByName.get(name) || "");
      const value = isDateField ? safeDate(data[name]) : (isFinite(Number(data[name])) ? Number(data[name]) : 0);
      argNames.push(placeholder);
      argValues.push(value);
      placeholderByField.set(name, placeholder);
    }
    return placeholder;
  };

  let sanitized = expr.replace(/\{([A-Za-z_][A-Za-z0-9_]*)\}/g, (_, n) => substituteToken(n));
  sanitized = sanitized.replace(/\$([A-Za-z_][A-Za-z0-9_]*)/g, (_, n) => substituteToken(n));

  return { sanitized, argNames, argValues, unknownFields };
}

/**
 * Evaluates a formula expression against a record's data. `fieldsMeta` supplies each
 * referenced field's type so date fields resolve to real Date values instead of being
 * coerced to 0. The result's kind (number vs date) is read off the *actual computed value* —
 * nothing needs to be declared up front.
 */
export function evaluateFormula(
  expr: string,
  data: Record<string, any>,
  fieldsMeta: FormulaFieldMeta[]
): FormulaEvalResult {
  const fallback: FormulaEvalResult = { value: null, kind: "number" };
  if (!expr) return fallback;

  try {
    const withAggregates = applySubformAggregates(expr, data);
    const { sanitized, argNames, argValues, unknownFields } = substituteFieldTokens(withAggregates, data, fieldsMeta);
    if (unknownFields.length) return fallback;
    if (!SAFE_CHARS_RE.test(sanitized)) return fallback;

    const helperNames = Object.keys(HELPERS);
    const allowed = new Set([...helperNames, ...argNames]);
    const identifiers = sanitized.match(IDENTIFIER_RE) || [];
    if (identifiers.some(id => !allowed.has(id))) return fallback;

    // eslint-disable-next-line no-new-func
    const fn = new Function(...helperNames, ...argNames, `"use strict"; return (${sanitized});`);
    const result = fn(...helperNames.map(n => HELPERS[n]), ...argValues);

    if (result instanceof Date) {
      return isNaN(result.getTime()) ? fallback : { value: result.toISOString(), kind: "date" };
    }
    const n = Number(result);
    return isFinite(n) ? { value: n, kind: "number" } : fallback;
  } catch {
    return fallback;
  }
}

/**
 * Static syntax check — no data required. Catches unbalanced parens/brackets, characters
 * outside the allowed set (quotes, semicolons, etc.), and identifiers that aren't a known
 * function or a real field on this module (so a typo'd function name or field name is
 * caught immediately instead of silently evaluating to 0/null later).
 */
export function validateFormula(expr: string, fieldsMeta: FormulaFieldMeta[]): { valid: boolean; error?: string } {
  if (!expr || !expr.trim()) return { valid: true };

  const withAggregates = applySubformAggregates(expr, {});
  // Re-check aggregate calls independently of the fake empty data above, so a genuine
  // reference to an unknown field inside SUM(...) is still caught below.
  const aggregateFieldNames = Array.from(expr.matchAll(SUBFORM_AGGREGATE_FN)).map(m => m[2]);
  const fieldByName = new Set(fieldsMeta.map(f => f.name));
  const badAggregateField = aggregateFieldNames.find(n => !fieldByName.has(n));
  if (badAggregateField) return { valid: false, error: `Unknown field "${badAggregateField}"` };

  const { sanitized, argNames, unknownFields } = substituteFieldTokens(withAggregates, {}, fieldsMeta);
  if (unknownFields.length) return { valid: false, error: `Unknown field "$${unknownFields[0]}"` };

  if (!SAFE_CHARS_RE.test(sanitized)) {
    const badChar = sanitized.split("").find(c => !SAFE_CHARS_RE.test(c) && c.trim() !== "");
    return { valid: false, error: badChar ? `Character "${badChar}" isn't allowed in formulas` : "Contains characters that aren't allowed" };
  }

  let depth = 0;
  for (const ch of sanitized) {
    if (ch === "(") depth++;
    if (ch === ")") depth--;
    if (depth < 0) return { valid: false, error: "Unbalanced parentheses — an extra \")\"" };
  }
  if (depth !== 0) return { valid: false, error: "Unbalanced parentheses — missing \")\"" };

  const helperNames = Object.keys(HELPERS);
  const allowed = new Set([...helperNames, ...argNames]);
  const identifiers = sanitized.match(IDENTIFIER_RE) || [];
  const unknownFn = identifiers.find(id => !allowed.has(id));
  if (unknownFn) return { valid: false, error: `Unknown function "${unknownFn}"` };

  try {
    // eslint-disable-next-line no-new-func
    new Function(...helperNames, ...argNames, `"use strict"; return (${sanitized});`);
  } catch (e: any) {
    return { valid: false, error: "Invalid syntax" };
  }

  return { valid: true };
}

/** Read-only display formatting for a FORMULA field's stored value — the value's own
 *  shape (a number vs. a date-parseable ISO string) decides how it's displayed.
 *  `useGrouping` defaults to true (existing fields keep showing "2,026" exactly as
 *  before) — pass false for a field whose settings opt out (years, IDs, codes). */
export function formatFormulaDisplayValue(value: unknown, useGrouping = true): string {
  if (value == null || value === "") return "";
  if (typeof value === "number") return isFinite(value) ? value.toLocaleString(undefined, { useGrouping }) : "";
  const d = safeDate(value);
  if (d) return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  const n = Number(value);
  return isFinite(n) ? n.toLocaleString(undefined, { useGrouping }) : String(value);
}

export interface FormulaCapableField extends FormulaFieldMeta {
  settings?: any;
}

function parseSettings(raw: any): any {
  if (!raw) return {};
  if (typeof raw === "string") {
    try { return JSON.parse(raw); } catch { return {}; }
  }
  return raw;
}

/** Recomputes every FORMULA field on a record's data, returning a new data object. */
export function recomputeFormulaFields(data: Record<string, any>, fields: FormulaCapableField[]): Record<string, any> {
  const result = { ...data };
  const meta: FormulaFieldMeta[] = fields.map(f => ({ name: f.name, type: f.type }));
  fields.forEach(f => {
    if (f.type !== "FORMULA") return;
    const settings = parseSettings(f.settings);
    const expr = settings.formula as string | undefined;
    if (!expr) return;
    result[f.name] = evaluateFormula(expr, result, meta).value;
  });
  return result;
}
