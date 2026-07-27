/**
 * Suggests chart visualizations from a saved Report's columns, and converts a
 * Report's flat filter list into the FilterGroup shape the Data Visualization
 * (analytics) widget builder uses. Shared between the "visualize this report"
 * suggestions page and the analytics page's fromReport handler so suggestion
 * ids line up consistently across both.
 */

export type SuggestionChartType = "bar" | "pie" | "line" | "area" | "kpi";

export interface ReportColumnLike {
  fieldName: string;
  fieldLabel: string;
  fieldType: string;
}

export interface ReportFilterLike {
  fieldName: string;
  fieldType: string;
  operator: string;
  value: string;
  value2: string;
  conjunction: "AND" | "OR";
}

export interface VizSuggestion {
  id: string;
  label: string;
  description: string;
  defaultType: SuggestionChartType;
  allowedTypes: SuggestionChartType[];
  groupByField?: string;
  secondaryGroupByField?: string;
  aggregation: "COUNT" | "SUM" | "AVG" | "MIN" | "MAX";
  aggregateField?: string;
}

// Matches the existing widget builder's own "groupByFields" list (analytics
// page) — TEXT is included because most simple "category-ish" columns (e.g.
// Region, Department) are plain TEXT fields in this schema, not DROPDOWN.
// Missing it here meant reports with no true DROPDOWN/STATUS column produced
// almost no suggestions at all.
const CATEGORICAL_TYPES = ["DROPDOWN", "STATUS", "RADIO", "BOOLEAN", "MULTI_SELECT", "TEXT"];
// Exported so callers (e.g. the visualization wizard's own field pickers) share
// one definition instead of risking a second, drifted copy — DECIMAL was
// missing here before, which silently excluded decimal/money columns from both
// "sum by category" suggestions and correct numeric filter-operator mapping.
export const NUMERIC_TYPES = ["NUMBER", "DECIMAL", "CURRENCY", "RATING", "PROGRESS"];
const DATE_TYPES = ["DATE", "DATETIME"];

export function generateVizSuggestions(columns: ReportColumnLike[]): VizSuggestion[] {
  const categorical = columns.filter(c => CATEGORICAL_TYPES.includes(c.fieldType));
  const numeric = columns.filter(c => NUMERIC_TYPES.includes(c.fieldType));
  const dates = columns.filter(c => DATE_TYPES.includes(c.fieldType));

  const suggestions: VizSuggestion[] = [];
  const push = (s: Omit<VizSuggestion, "id">) => suggestions.push({ id: `s${suggestions.length}`, ...s });

  // Prioritized first: two-field pairings tend to be the most useful ("Gender vs Quality").
  for (const c of categorical) {
    for (const n of numeric) {
      push({
        label: `${n.fieldLabel} by ${c.fieldLabel}`,
        description: `Total ${n.fieldLabel} grouped by ${c.fieldLabel}`,
        defaultType: "bar",
        allowedTypes: ["bar", "line", "area"],
        groupByField: c.fieldName,
        aggregation: "SUM",
        aggregateField: n.fieldName,
      });
    }
  }
  for (let i = 0; i < categorical.length; i++) {
    for (let j = i + 1; j < categorical.length; j++) {
      push({
        label: `${categorical[i].fieldLabel} vs ${categorical[j].fieldLabel}`,
        description: `Count of records by ${categorical[i].fieldLabel} and ${categorical[j].fieldLabel}`,
        defaultType: "bar",
        allowedTypes: ["bar"],
        groupByField: categorical[i].fieldName,
        secondaryGroupByField: categorical[j].fieldName,
        aggregation: "COUNT",
      });
    }
  }
  for (const d of dates) {
    for (const n of numeric) {
      push({
        label: `${n.fieldLabel} over ${d.fieldLabel}`,
        description: `Total ${n.fieldLabel} over ${d.fieldLabel}`,
        defaultType: "line",
        allowedTypes: ["line", "area", "bar"],
        groupByField: d.fieldName,
        aggregation: "SUM",
        aggregateField: n.fieldName,
      });
    }
  }

  // Single-field fallbacks.
  for (const c of categorical) {
    push({
      label: `Count by ${c.fieldLabel}`,
      description: `Count of records by ${c.fieldLabel}`,
      defaultType: "pie",
      allowedTypes: ["pie", "bar"],
      groupByField: c.fieldName,
      aggregation: "COUNT",
    });
  }
  for (const d of dates) {
    push({
      label: `Trend over ${d.fieldLabel}`,
      description: `Count of records over ${d.fieldLabel}`,
      defaultType: "line",
      allowedTypes: ["line", "area", "bar"],
      groupByField: d.fieldName,
      aggregation: "COUNT",
    });
  }
  for (const n of numeric) {
    push({
      label: `Total ${n.fieldLabel}`,
      description: `Sum of ${n.fieldLabel} across all records`,
      defaultType: "kpi",
      allowedTypes: ["kpi"],
      aggregation: "SUM",
      aggregateField: n.fieldName,
    });
  }

  return suggestions.slice(0, 12);
}

// ── Filter conversion ────────────────────────────────────────────────────────
// Reports use a flat filter list with per-item AND/OR conjunctions and a
// text-based operator vocabulary; the widget builder uses one nested
// FilterGroup with a single logic and a smaller operator set. Best-effort:
// operators with no equivalent (before/after a specific date) are dropped
// rather than silently misapplied.

export interface AnalyticsFilterCondition {
  id: string;
  field: string;
  operator: string;
  value?: any;
  value2?: any;
}

export interface AnalyticsFilterGroup {
  id: string;
  logic: "AND" | "OR";
  conditions: AnalyticsFilterCondition[];
  groups: AnalyticsFilterGroup[];
}

let idCounter = 0;
function nextId(): string {
  idCounter += 1;
  return `viz-${idCounter}-${Math.random().toString(36).slice(2, 8)}`;
}

export function reportFilterToAnalyticsCondition(f: ReportFilterLike): AnalyticsFilterCondition | null {
  const numeric = NUMERIC_TYPES.includes(f.fieldType);
  let operator: string;
  let value: any = f.value;
  switch (f.operator) {
    case "contains":       operator = "contains"; break;
    case "not_contains":   operator = "not_contains"; break;
    case "starts_with":    operator = "starts_with"; break;
    case "ends_with":      operator = "ends_with"; break;
    case "is_empty":       operator = "empty"; break;
    case "is_not_empty":   operator = "not_empty"; break;
    case "equals":         operator = numeric ? "eq" : "is"; break;
    case "not_equals":     operator = numeric ? "neq" : "is_not"; break;
    case "gt":              operator = "gt"; break;
    case "lt":              operator = "lt"; break;
    case "gte":             operator = "gte"; break;
    case "lte":             operator = "lte"; break;
    case "between":         operator = "between"; break;
    case "is_today":        operator = "today"; break;
    case "is_this_week":    operator = "this_week"; break;
    case "is_this_month":   operator = "this_month"; break;
    case "is_true":         operator = "is"; value = true; break;
    case "is_false":        operator = "is"; value = false; break;
    default: return null; // e.g. before/after — no faithful widget-filter equivalent
  }
  return { id: nextId(), field: f.fieldName, operator, value, value2: f.value2 };
}

export function reportFiltersToFilterGroup(filters: ReportFilterLike[]): { filterGroup: AnalyticsFilterGroup; skippedFilters: number } {
  const conditions: AnalyticsFilterCondition[] = [];
  let skippedFilters = 0;
  for (const f of filters ?? []) {
    const c = reportFilterToAnalyticsCondition(f);
    if (c) conditions.push(c); else skippedFilters++;
  }
  const logic: "AND" | "OR" = filters?.[1]?.conjunction === "OR" ? "OR" : "AND";
  return { filterGroup: { id: nextId(), logic, conditions, groups: [] }, skippedFilters };
}
