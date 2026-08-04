"use client";
import { useEffect, useState, useCallback, useMemo, useRef, Suspense } from "react"; // useRef used for grid width measurement
import { useSearchParams, useRouter } from "next/navigation";
// Chart rendering is done via the shared AnalyticsWidgetBody component
import {
  BarChart3, Plus, RefreshCw, Trash2, Settings2, Target, Save,
  BookOpen, ChevronDown, X, TrendingUp, TrendingDown, Minus,
  AlertCircle, Loader2, Eye, EyeOff, Filter, ChevronRight, Layers,
  Pin, PinOff, Check, Pencil, Star, StarOff, Bookmark,
  GripVertical, Copy, Maximize2, Minimize2, LayoutGrid, LayoutDashboard,
  BrainCircuit, MoreHorizontal, FileBarChart2, Sparkles, LayoutTemplate, Share2,
} from "lucide-react";
import { ReactGridLayout as _RGL } from "react-grid-layout/legacy";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ReactGridLayout = _RGL as any;
type RGLLayout = any[];
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AccessControlEditor } from "@/components/ui/access-control-editor";
import { useModulesStore, Field } from "@/store/modules.store";
import { api } from "@/lib/api";
import { DashboardPageSkeleton } from "@/components/ui/page-skeletons";
import { cn, generateId } from "@/lib/utils";
import {
  AnalyticsWidgetBody, loadWidgetData as sharedLoadWidgetData,
  CHART_COLORS as SHARED_CHART_COLORS,
  GRID_COLS, GRID_ROW_HEIGHT, getWidgetDims, getWidgetMinDims,
  widgetW as sharedWidgetW,
  type AnalyticsWidget, type AnalyticsTarget as SharedAnalyticsTarget, type ContextFilter,
} from "@/components/analytics/analytics-widget";
import { useAuthStore } from "@/store/auth.store";
import { usePermissionsStore } from "@/store/permissions.store";
import { useDashboardStore } from "@/store/dashboard.store";
import { AnalysisPanel, type AnalysisContext } from "@/components/analytics/analysis-panel";
import { generateVizSuggestions, reportFiltersToFilterGroup, type VizSuggestion } from "@/lib/report-viz-suggestions";
import { ReportVisualizationWizard } from "@/components/analytics/report-visualization-wizard";
import { ModuleIcon } from "@/components/ui/module-icon";

// ── Types ──────────────────────────────────────────────────────────────────

type FilterOperator =
  | "is" | "is_not" | "contains" | "not_contains" | "starts_with" | "ends_with"
  | "empty" | "not_empty" | "eq" | "neq" | "lt" | "lte" | "gt" | "gte"
  | "between" | "today" | "yesterday" | "this_week" | "this_month" | "date_between";

interface FilterCondition {
  id: string;
  field: string;
  operator: FilterOperator;
  value?: any;
  value2?: any;
}

interface FilterGroup {
  id: string;
  logic: "AND" | "OR";
  conditions: FilterCondition[];
  groups: FilterGroup[];
}

// Types and constants re-used from the shared widget renderer
type AggregationType = AnalyticsWidget["aggregation"];
type ChartType = AnalyticsWidget["type"];
type WidgetSize = NonNullable<AnalyticsWidget["size"]>;
type Widget = AnalyticsWidget;
type AnalyticsTarget = SharedAnalyticsTarget & { metricType?: string };

interface AnalyticsView {
  id: string;
  name: string;
  config: any;
  isPinned: boolean;
  createdById: string;
  createdAt: string;
  updatedAt: string;
  isPublic?: boolean;
  sharedRoles?: string[];
  sharedDepartments?: string[];
  sharedUsers?: string[];
}

interface VisualizationTemplate {
  id: string;
  name: string;
  layoutConfiguration?: { widgets?: any[] };
  contexts?: { fieldName: string; defaultValue?: string | null }[];
}

interface SavedFilter {
  id: string;
  name: string;
  conditions: FilterCondition[];
  logic: "AND" | "OR";
  context: string;
  moduleId?: string;
}

// ── Constants ──────────────────────────────────────────────────────────────

const CHART_COLORS = SHARED_CHART_COLORS;
const widgetW = sharedWidgetW;

const CHART_TYPE_OPTIONS: { value: ChartType; label: string; icon: string }[] = [
  { value: "bar", label: "Bar Chart", icon: "📊" },
  { value: "pie", label: "Pie Chart", icon: "🥧" },
  { value: "line", label: "Line Chart", icon: "📈" },
  { value: "area", label: "Area Chart", icon: "🏔️" },
  { value: "kpi", label: "KPI Card", icon: "🔢" },
  { value: "stat", label: "Stat Card", icon: "📌" },
  { value: "table", label: "Data Table", icon: "📋" },
  { value: "target", label: "Gauge", icon: "🎯" },
];

const OPERATOR_LABELS: Record<FilterOperator, string> = {
  is: "is", is_not: "is not", contains: "contains", not_contains: "doesn't contain",
  starts_with: "starts with", ends_with: "ends with", empty: "is empty", not_empty: "is not empty",
  eq: "=", neq: "≠", lt: "<", lte: "≤", gt: ">", gte: "≥",
  between: "between", today: "today", yesterday: "yesterday",
  this_week: "this week", this_month: "this month", date_between: "between dates",
};

function getOperatorsForField(field?: Field): FilterOperator[] {
  if (!field) return ["is", "is_not", "empty", "not_empty"];
  switch (field.type) {
    case "NUMBER": case "CURRENCY": case "RATING": case "PROGRESS":
      return ["eq", "neq", "lt", "lte", "gt", "gte", "between", "empty", "not_empty"];
    case "DATE": case "DATETIME":
      return ["today", "yesterday", "this_week", "this_month", "date_between", "empty", "not_empty"];
    case "DROPDOWN": case "STATUS": case "RADIO": case "MULTI_SELECT":
      return ["is", "is_not", "contains", "not_contains", "empty", "not_empty"];
    case "BOOLEAN":
      return ["is", "is_not"];
    default:
      return ["is", "is_not", "contains", "not_contains", "starts_with", "ends_with", "empty", "not_empty"];
  }
}

function needsValue(op: FilterOperator) {
  return !["empty", "not_empty", "today", "yesterday", "this_week", "this_month"].includes(op);
}
function needsSecondValue(op: FilterOperator) {
  return op === "between" || op === "date_between";
}

function newGroup(): FilterGroup {
  return { id: generateId(), logic: "AND", conditions: [], groups: [] };
}
function newCondition(fieldName = ""): FilterCondition {
  return { id: generateId(), field: fieldName, operator: "is", value: "" };
}

// ── Build a widget from an existing saved Report ────────────────────────────
// Reports use a flat filter list with per-item AND/OR conjunctions and a
// text-based operator vocabulary; widgets use one nested FilterGroup with a
// single logic and a different (smaller) operator set — reportFiltersToFilterGroup
// (shared with the report "visualize" suggestions page) does the conversion,
// best-effort: operators with no equivalent (before/after a specific date) are
// dropped rather than silently misapplied.
function buildWidgetFromReport(
  report: {
    id: string; name: string; moduleId: string;
    columns: { fieldName: string; fieldLabel: string; fieldType: string }[];
    filters: { fieldName: string; fieldType: string; operator: string; value: string; value2: string; conjunction: "AND" | "OR" }[];
  },
  suggestion?: VizSuggestion,
  chartType?: ChartType,
): { widget: Omit<Widget, "id">; skippedFilters: number } {
  const { filterGroup, skippedFilters } = reportFiltersToFilterGroup(report.filters ?? []);

  if (suggestion) {
    const widget = {
      title: suggestion.label,
      type: (chartType ?? suggestion.defaultType) as ChartType,
      moduleId: report.moduleId,
      aggregation: suggestion.aggregation as AggregationType,
      aggregateField: suggestion.aggregateField,
      groupByField: suggestion.groupByField,
      secondaryGroupByField: suggestion.secondaryGroupByField,
      barMode: suggestion.secondaryGroupByField ? "grouped" : undefined,
      filterGroup: filterGroup as unknown as FilterGroup,
      sourceReportId: report.id,
    } as Omit<Widget, "id">;
    return { widget, skippedFilters };
  }

  const groupByCandidate = (report.columns ?? []).find(c =>
    ["DROPDOWN", "STATUS", "RADIO", "BOOLEAN", "TEXT", "NUMBER", "DATE"].includes(c.fieldType)
  );
  const widget = {
    title: `${report.name} (Chart)`,
    type: "bar" as ChartType,
    moduleId: report.moduleId,
    aggregation: "COUNT" as AggregationType,
    groupByField: groupByCandidate?.fieldName,
    filterGroup: filterGroup as unknown as FilterGroup,
    sourceReportId: report.id,
  } as Omit<Widget, "id">;
  return { widget, skippedFilters };
}

// ── Toast ──────────────────────────────────────────────────────────────────

function useToast() {
  const [toasts, setToasts] = useState<{ id: string; msg: string; type: "success" | "error" }[]>([]);
  const show = useCallback((msg: string, type: "success" | "error" = "success") => {
    const id = generateId();
    setToasts(p => [...p, { id, msg, type }]);
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 3000);
  }, []);
  return { toasts, show };
}

function ToastList({ toasts }: { toasts: { id: string; msg: string; type: "success" | "error" }[] }) {
  if (toasts.length === 0) return null;
  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
      {toasts.map(t => (
        <div key={t.id} className={cn(
          "px-4 py-3 rounded-lg shadow-lg text-sm font-medium flex items-center gap-2 animate-in slide-in-from-bottom-2",
          t.type === "success" ? "bg-green-600 text-white" : "bg-red-600 text-white"
        )}>
          {t.type === "success" ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {t.msg}
        </div>
      ))}
    </div>
  );
}

// ── Filter Group Editor ────────────────────────────────────────────────────

function FilterGroupEditor({
  group, fields, onChange, onRemove, depth = 0,
}: {
  group: FilterGroup;
  fields: Field[];
  onChange: (g: FilterGroup) => void;
  onRemove?: () => void;
  depth?: number;
}) {
  const updateCondition = (idx: number, c: FilterCondition) => {
    const conditions = [...group.conditions];
    conditions[idx] = c;
    onChange({ ...group, conditions });
  };
  const removeCondition = (idx: number) => {
    onChange({ ...group, conditions: group.conditions.filter((_, i) => i !== idx) });
  };
  const addCondition = () => {
    onChange({ ...group, conditions: [...group.conditions, newCondition(fields[0]?.name || "")] });
  };
  const updateSubGroup = (idx: number, g: FilterGroup) => {
    const groups = [...group.groups];
    groups[idx] = g;
    onChange({ ...group, groups });
  };
  const removeSubGroup = (idx: number) => {
    onChange({ ...group, groups: group.groups.filter((_, i) => i !== idx) });
  };
  const addSubGroup = () => {
    onChange({ ...group, groups: [...group.groups, newGroup()] });
  };

  const indent = depth * 16;

  return (
    <div
      className={cn(
        "border rounded-lg p-3 space-y-2",
        depth === 0 ? "border-gray-200 bg-white" : "border-blue-200 bg-blue-50/30"
      )}
      style={{ marginLeft: indent }}
    >
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-500 font-medium">Match</span>
        <div className="flex rounded-md overflow-hidden border border-gray-200">
          {(["AND", "OR"] as const).map((l) => (
            <button
              key={l}
              onClick={() => onChange({ ...group, logic: l })}
              className={cn(
                "px-3 py-1 text-xs font-medium transition-colors",
                group.logic === l
                  ? "bg-brand text-white"
                  : "bg-white text-gray-600 hover:bg-gray-50"
              )}
            >
              {l}
            </button>
          ))}
        </div>
        <span className="text-xs text-gray-500">of the following</span>
        {onRemove && (
          <button onClick={onRemove} className="ml-auto text-gray-400 hover:text-red-500">
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {group.conditions.map((cond, idx) => (
        <FilterConditionRow
          key={cond.id}
          condition={cond}
          fields={fields}
          onChange={(c) => updateCondition(idx, c)}
          onRemove={() => removeCondition(idx)}
        />
      ))}

      {group.groups.map((sub, idx) => (
        <FilterGroupEditor
          key={sub.id}
          group={sub}
          fields={fields}
          onChange={(g) => updateSubGroup(idx, g)}
          onRemove={() => removeSubGroup(idx)}
          depth={depth + 1}
        />
      ))}

      <div className="flex gap-2 pt-1">
        <button
          onClick={addCondition}
          className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
        >
          <Plus className="w-3 h-3" /> Add condition
        </button>
        {depth < 2 && (
          <button
            onClick={addSubGroup}
            className="text-xs text-purple-600 hover:text-purple-800 flex items-center gap-1"
          >
            <Layers className="w-3 h-3" /> Add group
          </button>
        )}
      </div>
    </div>
  );
}

function FilterConditionRow({
  condition, fields, onChange, onRemove,
}: {
  condition: FilterCondition;
  fields: Field[];
  onChange: (c: FilterCondition) => void;
  onRemove: () => void;
}) {
  const field = fields.find((f) => f.name === condition.field);
  const operators = getOperatorsForField(field);
  const hasValue = needsValue(condition.operator);

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <Select
        value={condition.field}
        onValueChange={(v) => onChange({ ...condition, field: v, operator: "is", value: "" })}
      >
        <SelectTrigger className="h-8 text-xs w-36">
          <SelectValue placeholder="Field" />
        </SelectTrigger>
        <SelectContent>
          {fields.map((f) => (
            <SelectItem key={f.id ?? f.name} value={f.name} className="text-xs">
              {f.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={condition.operator}
        onValueChange={(v) => onChange({ ...condition, operator: v as FilterOperator, value: "", value2: "" })}
      >
        <SelectTrigger className="h-8 text-xs w-36">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {operators.map((op) => (
            <SelectItem key={op} value={op} className="text-xs">
              {OPERATOR_LABELS[op]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {hasValue && (field?.type === "BOOLEAN") && (
        <Select
          value={condition.value === true ? "true" : condition.value === false ? "false" : "__none__"}
          onValueChange={(v) => onChange({ ...condition, value: v === "__none__" ? "" : v === "true" })}
        >
          <SelectTrigger className="h-8 text-xs w-28"><SelectValue placeholder="Select…" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__" className="text-xs text-gray-400">Select…</SelectItem>
            <SelectItem value="true" className="text-xs">Yes / True</SelectItem>
            <SelectItem value="false" className="text-xs">No / False</SelectItem>
          </SelectContent>
        </Select>
      )}

      {hasValue && ["DROPDOWN", "STATUS", "RADIO", "MULTI_SELECT"].includes(field?.type || "") && (
        <Select
          value={condition.value || "__none__"}
          onValueChange={(v) => onChange({ ...condition, value: v === "__none__" ? "" : v })}
        >
          <SelectTrigger className="h-8 text-xs w-36"><SelectValue placeholder="Select value…" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__" className="text-xs text-gray-400">Select value…</SelectItem>
            {(field?.options || []).map((o) => (
              <SelectItem key={o.value} value={o.value} className="text-xs">{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {hasValue && !["BOOLEAN", "DROPDOWN", "STATUS", "RADIO", "MULTI_SELECT"].includes(field?.type || "") && !needsSecondValue(condition.operator) && (
        <Input
          value={condition.value ?? ""}
          onChange={(e) => onChange({ ...condition, value: e.target.value })}
          placeholder="Value"
          className="h-8 text-xs w-32"
          type={
            ["NUMBER", "CURRENCY", "RATING", "DECIMAL", "PROGRESS"].includes(field?.type || "")
              ? "number"
              : ["DATE"].includes(field?.type || "")
              ? "date"
              : ["DATETIME"].includes(field?.type || "")
              ? "datetime-local"
              : "text"
          }
        />
      )}

      {hasValue && condition.operator === "between" && (
        <div className="flex items-center gap-1">
          <Input value={condition.value ?? ""} onChange={(e) => onChange({ ...condition, value: e.target.value })}
            placeholder="From" className="h-8 text-xs w-24" type="number" />
          <span className="text-xs text-gray-400">–</span>
          <Input value={condition.value2 ?? ""} onChange={(e) => onChange({ ...condition, value2: e.target.value })}
            placeholder="To" className="h-8 text-xs w-24" type="number" />
        </div>
      )}

      {hasValue && condition.operator === "date_between" && (
        <div className="flex items-center gap-1">
          <Input value={condition.value ?? ""} onChange={(e) => onChange({ ...condition, value: e.target.value })}
            className="h-8 text-xs w-32" type="date" />
          <span className="text-xs text-gray-400">–</span>
          <Input value={condition.value2 ?? ""} onChange={(e) => onChange({ ...condition, value2: e.target.value })}
            className="h-8 text-xs w-32" type="date" />
        </div>
      )}

      <button onClick={onRemove} className="text-gray-400 hover:text-red-500 flex-shrink-0">
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

// ── Saved Filters Panel ────────────────────────────────────────────────────

function SavedFiltersDialog({
  open, onClose, savedFilters, onRefresh, onLoadFilter,
}: {
  open: boolean;
  onClose: () => void;
  savedFilters: SavedFilter[];
  onRefresh: () => void;
  onLoadFilter: (sf: SavedFilter) => void;
}) {
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);

  const handleRename = async (id: string, newName: string) => {
    if (!newName.trim()) return;
    await api.patch(`/analytics/saved-filters/${id}`, { name: newName });
    onRefresh();
    setEditingId(null);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this saved filter?")) return;
    await api.delete(`/analytics/saved-filters/${id}`);
    onRefresh();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bookmark className="w-5 h-5 text-blue-600" /> Saved Filters
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-2 max-h-[50vh] overflow-y-auto py-1">
          {savedFilters.length === 0 && !creating && (
            <p className="text-sm text-gray-500 text-center py-6">
              No saved filters yet. Save a filter from the widget builder to reuse it here.
            </p>
          )}

          {savedFilters.map((sf) => (
            <div key={sf.id} className="flex items-center gap-2 border rounded-lg px-3 py-2 hover:bg-gray-50 group">
              {editingId === sf.id ? (
                <Input
                  defaultValue={sf.name}
                  className="h-7 text-sm flex-1"
                  autoFocus
                  onBlur={(e) => handleRename(sf.id, e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleRename(sf.id, (e.target as HTMLInputElement).value);
                    if (e.key === "Escape") setEditingId(null);
                  }}
                />
              ) : (
                <>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{sf.name}</p>
                    <p className="text-xs text-gray-400">
                      {sf.logic} · {sf.conditions.length} condition{sf.conditions.length !== 1 ? "s" : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { onLoadFilter(sf); onClose(); }}>
                      <Eye className="w-3.5 h-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditingId(sf.id)}>
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-red-400 hover:text-red-600" onClick={() => handleDelete(sf.id)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Widget Builder Dialog ──────────────────────────────────────────────────

interface WidgetDraft {
  title: string;
  type: ChartType;
  moduleId: string;
  groupByField: string;
  secondaryGroupByField: string;
  barMode: "stacked" | "grouped";
  aggregation: AggregationType;
  aggregateField: string;
  filterGroup: FilterGroup;
  targetId: string;
  targetValue: string; // stored as string for the input, parsed to number on save
}

function WidgetBuilderDialog({
  open, onClose, onSave, modules, targets, initial, savedFilters, onSaveSavedFilter,
  lockedModuleId, contextField,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (w: Omit<Widget, "id">) => void;
  modules: any[];
  targets: AnalyticsTarget[];
  initial?: Widget;
  savedFilters: SavedFilter[];
  onSaveSavedFilter: (name: string, filterGroup: FilterGroup) => void;
  /** Building a template with a module chosen upfront — every widget is locked to it. */
  lockedModuleId?: string;
  /** The template's common filter field — shown as a badge; the actual dynamic
   *  condition is merged in server-side when someone creates from the template. */
  contextField?: string;
}) {
  const [draft, setDraft] = useState<WidgetDraft>({
    title: initial?.title || "",
    type: initial?.type || "bar",
    moduleId: initial?.moduleId || lockedModuleId || "",
    groupByField: initial?.groupByField || "",
    secondaryGroupByField: initial?.secondaryGroupByField || "",
    barMode: initial?.barMode || "grouped",
    aggregation: initial?.aggregation || "COUNT",
    aggregateField: initial?.aggregateField || "",
    filterGroup: initial?.filterGroup || newGroup(),
    targetId: initial?.targetId || "",
    targetValue: initial?.targetValue != null ? String(initial.targetValue) : "",
  });
  const [saveFilterName, setSaveFilterName] = useState("");
  const [showSaveFilter, setShowSaveFilter] = useState(false);
  const [showLoadFilter, setShowLoadFilter] = useState(false);

  const mod = modules.find((m) => m.id === draft.moduleId);
  const fields: Field[] = mod?.fields || [];
  const numericFields = fields.filter((f) =>
    ["NUMBER", "CURRENCY", "RATING", "PROGRESS"].includes(f.type)
  );
  const groupByFields = fields.filter((f) =>
    ["DROPDOWN", "STATUS", "RADIO", "BOOLEAN", "TEXT", "NUMBER", "DATE", "MULTI_SELECT"].includes(f.type)
  );

  const set = (k: keyof WidgetDraft, v: any) => setDraft((d) => ({ ...d, [k]: v }));

  const handleSave = () => {
    const parsedTarget = draft.type === "target" && draft.targetValue !== ""
      ? Number(draft.targetValue)
      : undefined;
    onSave({
      title: draft.title || CHART_TYPE_OPTIONS.find((c) => c.value === draft.type)?.label || "Widget",
      type: draft.type,
      moduleId: draft.moduleId,
      groupByField: draft.groupByField || undefined,
      secondaryGroupByField: draft.secondaryGroupByField || undefined,
      barMode: draft.secondaryGroupByField ? (draft.barMode || "grouped") : undefined,
      aggregation: draft.aggregation,
      aggregateField: draft.aggregateField || undefined,
      filterGroup: draft.filterGroup,
      targetId: draft.type === "target" ? undefined : (draft.targetId || undefined),
      targetValue: parsedTarget,
    });
    onClose();
  };

  const handleSaveFilterPreset = () => {
    if (!saveFilterName.trim()) return;
    onSaveSavedFilter(saveFilterName, draft.filterGroup);
    setSaveFilterName("");
    setShowSaveFilter(false);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{initial ? "Edit Widget" : "Add Widget"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {contextField && (
            <p className="text-xs text-purple-700 bg-purple-50 border border-purple-100 rounded-lg px-3 py-2">
              This widget will be dynamically filtered by <strong>{contextField}</strong> — no effect until a value is picked when someone creates from this template.
            </p>
          )}
          {/* Title */}
          <div className="space-y-1.5">
            <Label className="text-xs">Widget Title</Label>
            <Input
              value={draft.title}
              onChange={(e) => set("title", e.target.value)}
              placeholder="Auto-generated if empty"
              className="h-9"
            />
          </div>

          {/* Chart type */}
          <div className="space-y-1.5">
            <Label className="text-xs">Visualization Type</Label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {CHART_TYPE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => set("type", opt.value)}
                  className={cn(
                    "p-2.5 rounded-lg border text-xs font-medium text-center transition-all",
                    draft.type === opt.value
                      ? "border-blue-500 bg-blue-50 text-blue-700"
                      : "border-gray-200 hover:border-gray-300 text-gray-600"
                  )}
                >
                  <div className="text-xl mb-1">{opt.icon}</div>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Module — locked when building a template (module chosen upfront) */}
          <div className="space-y-1.5">
            <Label className="text-xs">Module</Label>
            {lockedModuleId ? (
              <p className="h-9 flex items-center gap-1.5 px-3 rounded-md border border-gray-200 bg-gray-50 text-sm text-gray-600">
                <ModuleIcon icon={modules.find((m) => m.id === lockedModuleId)?.icon} slug={modules.find((m) => m.id === lockedModuleId)?.slug} className="w-4 h-4 shrink-0" /> {modules.find((m) => m.id === lockedModuleId)?.name}
                <span className="ml-auto text-xs text-gray-400">Fixed for this template</span>
              </p>
            ) : (
              <Select value={draft.moduleId} onValueChange={(v) => { set("moduleId", v); set("groupByField", ""); set("aggregateField", ""); }}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Select module" />
                </SelectTrigger>
                <SelectContent>
                  {modules.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      <ModuleIcon icon={m.icon} slug={m.slug} className="w-4 h-4 inline-block mr-1 -mt-0.5" /> {m.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {draft.type === "target" ? (
            /* ── Gauge / Target widget: inline module + aggregation + target value ── */
            <div className="space-y-4">
              <p className="text-xs text-gray-500 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2">
                Pick a field to measure, then set your target value. The gauge compares the current result against your target.
              </p>
              {/* Aggregation */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs">Measure</Label>
                  <Select value={draft.aggregation} onValueChange={(v) => set("aggregation", v as AggregationType)}>
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="COUNT">Count records</SelectItem>
                      <SelectItem value="SUM">Sum of field</SelectItem>
                      <SelectItem value="AVG">Average of field</SelectItem>
                      <SelectItem value="MIN">Minimum of field</SelectItem>
                      <SelectItem value="MAX">Maximum of field</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {draft.aggregation !== "COUNT" && (
                  <div className="space-y-1.5">
                    <Label className="text-xs">Field</Label>
                    <Select value={draft.aggregateField} onValueChange={(v) => set("aggregateField", v)} disabled={!draft.moduleId}>
                      <SelectTrigger className="h-9"><SelectValue placeholder="Select field" /></SelectTrigger>
                      <SelectContent>
                        {numericFields.map((f) => <SelectItem key={f.id ?? f.name} value={f.name}>{f.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
              {/* Target value */}
              <div className="space-y-1.5">
                <Label className="text-xs">Target Value <span className="text-gray-400 font-normal">(what you want to reach)</span></Label>
                <Input
                  type="number"
                  min={0}
                  value={draft.targetValue}
                  onChange={(e) => set("targetValue", e.target.value)}
                  placeholder="e.g. 500"
                  className="h-9"
                />
              </div>
              {/* Optional filters */}
              {draft.moduleId && (
                <div className="space-y-1.5">
                  <Label className="text-xs">Filters <span className="text-gray-400 font-normal">(optional)</span></Label>
                  <FilterGroupEditor
                    group={draft.filterGroup}
                    fields={fields}
                    onChange={(g) => set("filterGroup", g)}
                  />
                </div>
              )}
            </div>
          ) : (
            <>
              {/* Group By + Secondary Group By */}
              {["bar", "pie", "line", "area", "table"].includes(draft.type) && (
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Group By Field</Label>
                    <Select value={draft.groupByField || "__none__"} onValueChange={(v) => { set("groupByField", v === "__none__" ? "" : v); if (v === "__none__") { set("secondaryGroupByField", ""); set("barMode", "grouped"); } }} disabled={!draft.moduleId}>
                      <SelectTrigger className="h-9"><SelectValue placeholder="Select field" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">— No grouping (total count) —</SelectItem>
                        {groupByFields.map((f) => <SelectItem key={f.id ?? f.name} value={f.name}>{f.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Secondary group by — only for bar charts when primary is set */}
                  {draft.groupByField && draft.type === "bar" && (
                    <div className="pl-3 border-l-2 border-blue-100 space-y-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs">
                          Secondary Group By
                          <span className="ml-1.5 text-gray-400 font-normal">— split bars by a second field</span>
                        </Label>
                        <Select value={draft.secondaryGroupByField || "__none__"} onValueChange={(v) => { set("secondaryGroupByField", v === "__none__" ? "" : v); if (v === "__none__") set("barMode", "grouped"); }} disabled={!draft.moduleId}>
                          <SelectTrigger className="h-9"><SelectValue placeholder="None (single-series)" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__none__">— None (single series) —</SelectItem>
                            {groupByFields.filter(f => f.name !== draft.groupByField).map((f) => (
                              <SelectItem key={f.id ?? f.name} value={f.name}>{f.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {draft.secondaryGroupByField && (
                          <p className="text-[11px] text-blue-600">
                            Example: group by <strong>{draft.groupByField}</strong>, split each bar by <strong>{draft.secondaryGroupByField}</strong> — bars will be color-coded per {draft.secondaryGroupByField} value
                          </p>
                        )}
                      </div>

                      {/* Bar display mode — only when secondary is set */}
                      {draft.secondaryGroupByField && (
                        <div className="space-y-1.5">
                          <Label className="text-xs">Bar Presentation</Label>
                          <div className="flex gap-2">
                            {([
                              { value: "grouped", label: "Clustered", desc: "Side by side", icon: "▐▐" },
                              { value: "stacked", label: "Stacked",   desc: "On top of each other", icon: "▬" },
                            ] as const).map(opt => (
                              <button key={opt.value} type="button" onClick={() => set("barMode", opt.value)}
                                className={cn(
                                  "flex-1 p-2.5 rounded-lg border text-xs font-medium transition text-left",
                                  draft.barMode === opt.value
                                    ? "border-blue-500 bg-blue-50 text-blue-700"
                                    : "border-gray-200 hover:border-gray-300 text-gray-600"
                                )}>
                                <div className="text-lg mb-0.5 tracking-widest">{opt.icon}</div>
                                <div className="font-semibold">{opt.label}</div>
                                <div className="text-[10px] text-gray-400 font-normal">{opt.desc}</div>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Aggregation */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs">Aggregation</Label>
                  <Select value={draft.aggregation} onValueChange={(v) => set("aggregation", v as AggregationType)}>
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="COUNT">Count</SelectItem>
                      <SelectItem value="SUM">Sum</SelectItem>
                      <SelectItem value="AVG">Average</SelectItem>
                      <SelectItem value="MIN">Minimum</SelectItem>
                      <SelectItem value="MAX">Maximum</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {draft.aggregation !== "COUNT" && (
                  <div className="space-y-1.5">
                    <Label className="text-xs">Aggregate Field</Label>
                    <Select value={draft.aggregateField} onValueChange={(v) => set("aggregateField", v)} disabled={!draft.moduleId}>
                      <SelectTrigger className="h-9"><SelectValue placeholder="Select field" /></SelectTrigger>
                      <SelectContent>
                        {numericFields.map((f) => (
                          <SelectItem key={f.id ?? f.name} value={f.name}>{f.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              {/* Filters */}
              {draft.moduleId && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs">Filters</Label>
                    <div className="flex items-center gap-1">
                      {savedFilters.length > 0 && (
                        <Button variant="ghost" size="sm" className="h-6 text-xs gap-1 text-blue-600 hover:text-blue-700"
                          onClick={() => setShowLoadFilter(true)}>
                          <Bookmark className="w-3 h-3" /> Load Preset
                        </Button>
                      )}
                      <Button variant="ghost" size="sm" className="h-6 text-xs gap-1 text-gray-500 hover:text-gray-700"
                        onClick={() => setShowSaveFilter(true)}>
                        <Save className="w-3 h-3" /> Save as Preset
                      </Button>
                    </div>
                  </div>

                  {showSaveFilter && (
                    <div className="flex gap-2">
                      <Input value={saveFilterName} onChange={(e) => setSaveFilterName(e.target.value)}
                        placeholder="Preset name (e.g. Active Students)" className="h-8 text-xs flex-1"
                        onKeyDown={(e) => { if (e.key === "Enter") handleSaveFilterPreset(); if (e.key === "Escape") setShowSaveFilter(false); }}
                        autoFocus />
                      <Button size="sm" className="h-8 text-xs" onClick={handleSaveFilterPreset} disabled={!saveFilterName.trim()}>Save</Button>
                      <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => setShowSaveFilter(false)}>Cancel</Button>
                    </div>
                  )}

                  {showLoadFilter && (
                    <div className="border rounded-lg p-2 bg-gray-50 space-y-1 max-h-40 overflow-y-auto">
                      <p className="text-xs font-semibold text-gray-500 px-1 pb-1">Load a saved filter preset:</p>
                      {savedFilters.map(sf => (
                        <button key={sf.id} onClick={() => {
                          const loaded: FilterGroup = { id: generateId(), logic: sf.logic, conditions: sf.conditions.map(c => ({ ...c, id: generateId() })), groups: [] };
                          set("filterGroup", loaded);
                          setShowLoadFilter(false);
                        }} className="w-full text-left px-2 py-1.5 rounded hover:bg-white text-sm flex items-center gap-2">
                          <Bookmark className="w-3 h-3 text-blue-500 flex-shrink-0" />
                          <span>{sf.name}</span>
                          <span className="text-xs text-gray-400 ml-auto">{sf.logic} · {sf.conditions.length}</span>
                        </button>
                      ))}
                    </div>
                  )}

                  <FilterGroupEditor
                    group={draft.filterGroup}
                    fields={fields}
                    onChange={(g) => set("filterGroup", g)}
                  />
                </div>
              )}
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            onClick={handleSave}
            disabled={
              !draft.moduleId ||
              (draft.type === "target" && (!draft.targetValue || isNaN(Number(draft.targetValue))))
            }
          >
            {initial ? "Update Widget" : "Add Widget"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Target Manager Dialog ──────────────────────────────────────────────────

function TargetManagerDialog({
  open, onClose, modules, targets, onRefresh,
}: {
  open: boolean;
  onClose: () => void;
  modules: any[];
  targets: AnalyticsTarget[];
  onRefresh: () => void;
}) {
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name: "", moduleId: "", aggregation: "COUNT" as AggregationType, aggregateField: "", targetValue: 100, period: "monthly" });
  const [saving, setSaving] = useState(false);

  const selectedMod = modules.find((m) => m.id === form.moduleId);
  const numericFields = (selectedMod?.fields || []).filter((f: Field) => ["NUMBER", "CURRENCY", "RATING"].includes(f.type));

  const handleCreate = async () => {
    setSaving(true);
    try {
      await api.post("/analytics/targets", { ...form, metricType: "MODULE_RECORD" });
      onRefresh();
      setCreating(false);
      setForm({ name: "", moduleId: "", aggregation: "COUNT", aggregateField: "", targetValue: 100, period: "monthly" });
    } catch {}
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this target?")) return;
    await api.delete(`/analytics/targets/${id}`);
    onRefresh();
  };

  const handleCompute = async (id: string) => {
    try {
      await api.post(`/analytics/targets/${id}/compute`);
      onRefresh();
    } catch {}
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Target className="w-5 h-5" /> Target Manager
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 max-h-[60vh] overflow-y-auto py-2">
          {targets.map((t) => {
            const pct = t.currentValue != null ? Math.round((t.currentValue / t.targetValue) * 100) : null;
            return (
              <div key={t.id} className="border rounded-lg p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm">{t.name}</span>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => handleCompute(t.id)}>
                      <RefreshCw className="w-3 h-3 mr-1" /> Compute
                    </Button>
                    <Button variant="ghost" size="sm" className="h-7 text-xs text-red-600" onClick={() => handleDelete(t.id)}>
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
                <div className="text-xs text-gray-500">
                  {t.aggregation} · {t.period} · Target: {t.targetValue.toLocaleString()}
                </div>
                {pct != null && (
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span>{t.currentValue?.toLocaleString()} / {t.targetValue.toLocaleString()}</span>
                      <span className={cn("font-semibold", pct >= 100 ? "text-green-600" : pct >= 70 ? "text-yellow-600" : "text-red-600")}>
                        {pct}%
                      </span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={cn("h-full rounded-full transition-all", pct >= 100 ? "bg-green-500" : pct >= 70 ? "bg-yellow-500" : "bg-blue-500")}
                        style={{ width: `${Math.min(100, pct)}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {targets.length === 0 && !creating && (
            <div className="text-center py-8 text-gray-500 text-sm">No targets yet.</div>
          )}

          {creating && (
            <div className="border-2 border-dashed border-blue-200 rounded-lg p-4 space-y-3">
              <h4 className="text-sm font-medium text-blue-700">New Target</h4>
              <Input placeholder="Target name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} className="h-8 text-sm" />
              <div className="grid grid-cols-2 gap-2">
                <Select value={form.moduleId} onValueChange={(v) => setForm((f) => ({ ...f, moduleId: v }))}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Module" /></SelectTrigger>
                  <SelectContent>{modules.map((m) => <SelectItem key={m.id} value={m.id} className="text-xs"><ModuleIcon icon={m.icon} slug={m.slug} className="w-3.5 h-3.5 inline-block mr-1 -mt-0.5" /> {m.name}</SelectItem>)}</SelectContent>
                </Select>
                <Select value={form.aggregation} onValueChange={(v) => setForm((f) => ({ ...f, aggregation: v as AggregationType }))}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="COUNT" className="text-xs">Count</SelectItem>
                    <SelectItem value="SUM" className="text-xs">Sum</SelectItem>
                    <SelectItem value="AVG" className="text-xs">Average</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {form.aggregation !== "COUNT" && (
                <Select value={form.aggregateField} onValueChange={(v) => setForm((f) => ({ ...f, aggregateField: v }))}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Aggregate field" /></SelectTrigger>
                  <SelectContent>{numericFields.map((f: Field) => <SelectItem key={f.id ?? f.name} value={f.name} className="text-xs">{f.label}</SelectItem>)}</SelectContent>
                </Select>
              )}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">Target Value</Label>
                  <Input type="number" value={form.targetValue} onChange={(e) => setForm((f) => ({ ...f, targetValue: Number(e.target.value) }))} className="h-8 text-xs mt-1" />
                </div>
                <div>
                  <Label className="text-xs">Period</Label>
                  <Select value={form.period} onValueChange={(v) => setForm((f) => ({ ...f, period: v }))}>
                    <SelectTrigger className="h-8 text-xs mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily" className="text-xs">Daily</SelectItem>
                      <SelectItem value="weekly" className="text-xs">Weekly</SelectItem>
                      <SelectItem value="monthly" className="text-xs">Monthly</SelectItem>
                      <SelectItem value="quarterly" className="text-xs">Quarterly</SelectItem>
                      <SelectItem value="yearly" className="text-xs">Yearly</SelectItem>
                      <SelectItem value="all_time" className="text-xs">All Time</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={handleCreate} disabled={saving || !form.name || !form.moduleId}>
                  {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : "Create"}
                </Button>
                <Button size="sm" variant="outline" onClick={() => setCreating(false)}>Cancel</Button>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          {!creating && (
            <Button size="sm" variant="outline" onClick={() => setCreating(true)} className="gap-2 mr-auto">
              <Plus className="w-3.5 h-3.5" /> New Target
            </Button>
          )}
          <Button variant="outline" onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Widget Renderers ───────────────────────────────────────────────────────

// KpiWidget, StatWidget, TargetWidget, TableWidget are now in @/components/analytics/analytics-widget

// widgetW and GRID_COLS imported from shared analytics-widget module
// ── Grid Cells Overlay (soft shadow cells shown when reorderMode is active) ──

function GridCellsOverlay({ cols, rowHeight, rows }: { cols: number; rowHeight: number; rows: number }) {
  return (
    <div
      style={{
        position: "absolute", inset: 0, zIndex: 0,
        display: "grid",
        gridTemplateColumns: `repeat(${cols}, 1fr)`,
        gridTemplateRows: `repeat(${rows}, ${rowHeight}px)`,
        gap: "10px",
        pointerEvents: "none",
        overflow: "hidden",
      }}
    >
      {Array.from({ length: cols * rows }, (_, i) => (
        <div key={i} className="rgl-cell" />
      ))}
    </div>
  );
}

// ── Widget Card ────────────────────────────────────────────────────────────

function WidgetCard({
  widget, targets, onEdit, onRemove, onRefresh, onClone, reorderMode, colorIndex, templateContextField,
}: {
  widget: Widget;
  targets: AnalyticsTarget[];
  onEdit: () => void;
  onRemove: () => void;
  onRefresh: () => void;
  onClone: () => void;
  reorderMode?: boolean;
  colorIndex?: number;
  /** Set while building a template — shows a badge confirming this widget is dynamic on the field. */
  templateContextField?: string;
}) {
  const modules = useModulesStore(state => state.modules);
  const [drillSegment, setDrillSegment] = useState<string | null>(null);
  const [drillRecords, setDrillRecords] = useState<any[]>([]);
  const [drillTotal, setDrillTotal] = useState(0);
  const [drillLoading, setDrillLoading] = useState(false);

  const handleSegmentClick = widget.groupByField ? (segName: string) => {
    setDrillSegment(segName);
    setDrillLoading(true);
    setDrillRecords([]);
    const fg = JSON.stringify({
      conditions: [{ field: widget.groupByField, operator: "is", value: segName }],
      logic: "AND",
    });
    api.get(`/modules/${widget.moduleId}/records?filterGroup=${encodeURIComponent(fg)}&limit=50`)
      .then(r => { setDrillRecords(r.data?.data ?? []); setDrillTotal(r.data?.total ?? 0); })
      .catch(() => setDrillRecords([]))
      .finally(() => setDrillLoading(false));
  } : undefined;

  const mod = modules.find(m => m.id === widget.moduleId);
  const drillFields = (mod?.fields ?? [])
    .filter((f: Field) => !["FILE","IMAGE","SIGNATURE","INLINE_SUBFORM","LOOKUP","RELATION"].includes(f.type))
    .slice(0, 6);

  return (
    <>
      <Card className="group relative overflow-hidden h-full flex flex-col">
        <CardHeader className="flex flex-row items-start justify-between pb-2 pt-3 px-5 shrink-0">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 min-w-0">
              <CardTitle className="text-sm font-semibold text-gray-800 truncate">{widget.title}</CardTitle>
              {widget.sourceReportId && (
                <span title="Live-linked to a report — filters stay in sync automatically" className="shrink-0 inline-flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-indigo-50 text-indigo-600 border border-indigo-100">
                  <FileBarChart2 className="w-2.5 h-2.5" />Linked
                </span>
              )}
              {templateContextField && (
                <span title={`Dynamically filtered by ${templateContextField} when created from this template`} className="shrink-0 inline-flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-purple-50 text-purple-600 border border-purple-100">
                  <LayoutTemplate className="w-2.5 h-2.5" />Filtered by {templateContextField}
                </span>
              )}
            </div>
            {widget.type !== "target" && (
              <p className="text-xs text-gray-400 mt-0.5">
                {widget.aggregation.toLowerCase()}{widget.groupByField ? ` · ${widget.groupByField}` : ""}
              </p>
            )}
          </div>
          {/* no-drag wrapper — clicks here never initiate a grid drag */}
          <div className="no-drag opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7">
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40">
                <DropdownMenuItem onClick={onEdit}>
                  <Settings2 className="w-3.5 h-3.5 mr-2" /> Edit
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onClone}>
                  <Copy className="w-3.5 h-3.5 mr-2" /> Clone
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onRefresh}>
                  <RefreshCw className="w-3.5 h-3.5 mr-2" /> Refresh
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={onRemove} className="text-red-600 focus:text-red-600">
                  <Trash2 className="w-3.5 h-3.5 mr-2" /> Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>
        <CardContent className="flex-1 min-h-0 min-w-0 overflow-hidden px-4 pb-3">
          <AnalyticsWidgetBody
            widget={widget}
            targets={targets}
            colSpan={widget.w ?? GRID_COLS / 2}
            rowSpan={widget.h ?? getWidgetDims(widget.type).h}
            colorIndex={colorIndex}
            onSegmentClick={handleSegmentClick}
          />
        </CardContent>
      </Card>

      {/* Drill-down popup */}
      {drillSegment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setDrillSegment(null)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 shrink-0">
              <div>
                <p className="text-xs text-gray-400">{widget.title}</p>
                <h3 className="font-semibold text-gray-900">
                  {drillSegment}
                  {!drillLoading && <span className="ml-2 text-sm font-normal text-gray-500">({drillTotal} record{drillTotal !== 1 ? "s" : ""})</span>}
                </h3>
              </div>
              <button onClick={() => setDrillSegment(null)} className="p-1.5 hover:bg-gray-100 rounded-lg transition text-gray-500 hover:text-gray-700">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 overflow-auto min-h-0">
              {drillLoading ? (
                <div className="flex items-center justify-center h-32"><Loader2 className="w-5 h-5 animate-spin text-blue-500" /></div>
              ) : drillRecords.length === 0 ? (
                <div className="flex items-center justify-center h-32 text-gray-400 text-sm">No records found</div>
              ) : (
                <table className="w-full text-sm border-collapse">
                  <thead className="sticky top-0 bg-gray-50 z-10">
                    <tr>
                      {drillFields.map((f: Field) => (
                        <th key={f.id} className="text-left px-4 py-2 text-xs text-gray-500 font-medium border-b border-gray-100 whitespace-nowrap">{f.label}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {drillRecords.map((rec: any, ri: number) => (
                      <tr key={rec.id ?? ri} className="border-b border-gray-50 hover:bg-blue-50/40 transition-colors">
                        {drillFields.map((f: Field) => {
                          const val = rec.data?.[f.name] ?? rec[f.name];
                          return (
                            <td key={f.id} className="px-4 py-2 text-gray-700 max-w-[200px] truncate">
                              {val === null || val === undefined ? <span className="text-gray-300">—</span> : String(val)}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            {!drillLoading && drillTotal > 50 && (
              <div className="px-4 py-2 text-xs text-gray-400 border-t border-gray-100 shrink-0">
                Showing 50 of {drillTotal} — open the module to see all
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────

export default function AnalyticsPage() {
  return (
    <Suspense fallback={<DashboardPageSkeleton statCount={4} tableRows={4} />}>
      <AnalyticsPageInner />
    </Suspense>
  );
}

function AnalyticsPageInner() {
  const { modules, fetchModules } = useModulesStore();
  const { toasts, show: showToast } = useToast();
  const { user } = useAuthStore();
  const { isAdmin } = usePermissionsStore();
  const { dashboards, loadDashboards, addAnalyticsWidget } = useDashboardStore();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [seedWidget, setSeedWidget] = useState<Widget | null>(null);

  // Grid width — measured via ResizeObserver so column widths are exact (no drag offset)
  const gridContainerRef = useRef<HTMLDivElement>(null);
  const [gridWidth, setGridWidth] = useState(1200);
  useEffect(() => {
    const el = gridContainerRef.current;
    if (!el) return;
    setGridWidth(el.clientWidth || 1200);
    const ro = new ResizeObserver(() => setGridWidth(el.clientWidth));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const [widgets, setWidgets] = useState<Widget[]>([]);
  const [views, setViews] = useState<AnalyticsView[]>([]);
  const [targets, setTargets] = useState<AnalyticsTarget[]>([]);
  const [savedFilters, setSavedFilters] = useState<SavedFilter[]>([]);
  const [reorderMode, setReorderMode] = useState(false);

  // Active view tracking
  const [activeView, setActiveView] = useState<AnalyticsView | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  // Live context filter — set when the active view carries a `contextField` (created
  // from a Visualization Template, or manually configured). Changing the value here
  // reloads every widget in place via loadWidgetData's context param; it's never baked
  // into any widget's own filter, so switching values repeatedly never conflicts with
  // whatever was picked before (see visualization-templates.service.ts's instantiate()).
  const viewContextField: string | undefined = (activeView?.config as any)?.contextField || undefined;
  const [viewContextValue, setViewContextValue] = useState<string | undefined>(undefined);
  const [contextValueOptions, setContextValueOptions] = useState<string[]>([]);
  const [savingContext, setSavingContext] = useState(false);

  // Stable key so this effect only re-runs when the SET of modules actually in use changes,
  // not on every widget data/loading update (widgets reload constantly while this stays put).
  const widgetModuleIdsKey = useMemo(
    () => Array.from(new Set(widgets.map((w) => w.moduleId).filter(Boolean))).sort().join(","),
    [widgets]
  );

  useEffect(() => {
    if (!viewContextField) { setContextValueOptions([]); return; }
    // Scope to the modules THIS view's widgets actually use — never guess by scanning every
    // module in the org for one that happens to share a field name. Two unrelated modules
    // can both have a "camp_name" field; picking the wrong one silently shows the wrong
    // module's values (looks exactly like "some values are missing"). A template can
    // legitimately span multiple modules (the ad-hoc "Save as Template" path doesn't lock to
    // one), so union the distinct values across every module that actually has this field.
    const candidateModuleIds = widgetModuleIdsKey ? widgetModuleIdsKey.split(",") : [];
    const candidateModules = candidateModuleIds
      .map((id) => modules.find((m: any) => m.id === id))
      .filter((m: any) => m?.fields?.some((f: Field) => f.name === viewContextField));
    if (candidateModules.length === 0) { setContextValueOptions([]); return; }
    let cancelled = false;
    Promise.all(
      candidateModules.map((m: any) =>
        api.get(`/modules/${m.id}/records/field-values/${viewContextField}`).then((r) => r.data ?? []).catch(() => [])
      )
    ).then((lists) => {
      if (cancelled) return;
      const merged = Array.from(new Set(lists.flat() as string[])).sort((a, b) => a.localeCompare(b));
      setContextValueOptions(merged);
    });
    return () => { cancelled = true; };
  }, [viewContextField, modules, widgetModuleIdsKey]);

  // UI state
  const [showBuilder, setShowBuilder] = useState(false);
  const [showReportWizard, setShowReportWizard] = useState(false);
  const [wizardInitialReportId, setWizardInitialReportId] = useState<string | undefined>(undefined);
  const [editingWidget, setEditingWidget] = useState<Widget | null>(null);
  const [showTargetManager, setShowTargetManager] = useState(false);
  const [showSavedFilters, setShowSavedFilters] = useState(false);
  const [viewSearch, setViewSearch] = useState("");
  const [analyzeOpen, setAnalyzeOpen] = useState(false);
  const [analyzeContext, setAnalyzeContext] = useState<AnalysisContext | null>(null);
  const [savingView, setSavingView] = useState(false);
  const [savingChanges, setSavingChanges] = useState(false);
  const [viewName, setViewName] = useState("");
  const [showSaveView, setShowSaveView] = useState(false);
  const [renamingView, setRenamingView] = useState<AnalyticsView | null>(null);
  const [renameName, setRenameName] = useState("");
  const [addToDashboardView, setAddToDashboardView] = useState<AnalyticsView | null>(null);

  // Standalone vs Template — asked when saving a brand-new visualization
  const [saveMode, setSaveMode] = useState<"standalone" | "template">("standalone");
  const [templateContextField, setTemplateContextField] = useState("");
  // Set only while actively building a template via the guided "New Template" flow
  // (module + context field chosen upfront) — every widget added gets locked to this
  // module and visibly shows it's bound to the context field. Cleared on any canvas
  // reset or when loading an existing view, since it's session-scoped, not persisted.
  const [templateModuleId, setTemplateModuleId] = useState<string | null>(null);
  const [showTemplateSetup, setShowTemplateSetup] = useState(false);
  const [setupModuleId, setSetupModuleId] = useState("");
  const [setupField, setSetupField] = useState("");

  // "Create From Template" — the Analytics-page equivalent of the Dashboard's Templates panel
  const [showTemplatesDialog, setShowTemplatesDialog] = useState(false);
  const [templates, setTemplates] = useState<VisualizationTemplate[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [templateCtxValue, setTemplateCtxValue] = useState("");
  const [templateCtxSuggestions, setTemplateCtxSuggestions] = useState<string[]>([]);
  const [instantiatingTemplate, setInstantiatingTemplate] = useState(false);

  // "Share" panel (who can see the active view) — mirrors the Dashboard's AccessPanel
  const [showSharePanel, setShowSharePanel] = useState(false);

  useEffect(() => {
    fetchModules();
    fetchTargets();
    fetchSavedFilters();
    // Fetch views then auto-restore the last active view from user preferences
    // (or, if arriving from the Visualization Library's "Open" action, that specific view)
    fetchViews().then(async (loadedViews) => {
      const requestedViewId = searchParams.get("loadView");
      if (requestedViewId) {
        const v = loadedViews.find((x: AnalyticsView) => x.id === requestedViewId);
        if (v) { loadView(v); router.replace("/analytics"); return; }
      }
      try {
        const { data } = await api.get("/user-preferences/analytics_active_view");
        if (data?.value?.viewId) {
          const v = loadedViews.find((x: AnalyticsView) => x.id === data.value.viewId);
          if (v) loadView(v, false); // false = skip saving preference (already persisted)
        }
      } catch {}
    });
  }, [fetchModules]); // eslint-disable-line react-hooks/exhaustive-deps

  // /analytics?openReportWizard=<reportId> — opens the guided wizard pre-selected
  // to this report (used by the Reports list/viewer's "Visualize" button).
  useEffect(() => {
    const reportId = searchParams.get("openReportWizard");
    if (!reportId) return;
    setWizardInitialReportId(reportId);
    setShowReportWizard(true);
    router.replace("/analytics");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // "Create Visualization from Report" entry point:
  //  - /analytics?fromReport=<id>                          → open the builder pre-filled with a best guess
  //  - /analytics?fromReport=<id>&suggestion=<sid>&type=<t> → the report's suggestions page already had the
  //    user pick a field-pairing + chart type; create the widget directly, no dialog.
  useEffect(() => {
    const reportId = searchParams.get("fromReport");
    if (!reportId) return;
    const suggestionId = searchParams.get("suggestion");
    const chartType = searchParams.get("type") as ChartType | null;

    api.get(`/reports/${reportId}`)
      .then(({ data: report }) => {
        const suggestion = suggestionId
          ? generateVizSuggestions(report.columns ?? []).find(s => s.id === suggestionId)
          : undefined;
        const { widget, skippedFilters } = buildWidgetFromReport(report, suggestion, chartType ?? undefined);

        if (suggestion) {
          createAsNewVisualization(widget);
        } else {
          setSeedWidget({ ...widget, id: "__seed__" });
          setShowBuilder(true);
        }
        if (skippedFilters > 0) {
          showToast(`${skippedFilters} filter${skippedFilters !== 1 ? "s" : ""} from the report couldn't be converted and ${skippedFilters !== 1 ? "were" : "was"} skipped`, "error");
        }
      })
      .catch(() => showToast("Could not load report for visualization", "error"));
    router.replace("/analytics");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const fetchViews = async (): Promise<AnalyticsView[]> => {
    try {
      const { data } = await api.get("/analytics/views/list");
      setViews(data);
      return data as AnalyticsView[];
    } catch {}
    return [];
  };

  const fetchTargets = async () => {
    try {
      const { data } = await api.get("/analytics/targets/list");
      setTargets(data);
    } catch {}
  };

  const fetchSavedFilters = async () => {
    try {
      const { data } = await api.get("/analytics/saved-filters?context=analytics");
      setSavedFilters(data);
    } catch {}
  };

  // Only apply the live context filter to a widget whose own module actually has that
  // field — widgets on unrelated modules stay untouched (mirrors the Dashboard's
  // moduleHasContextField gate in dashboard-builder.tsx). Takes field/value explicitly
  // (rather than always reading state) so a just-loaded view's config can be applied on
  // its very first load, before the corresponding setState has actually committed.
  const resolveContextForWith = useCallback((widget: Widget, field?: string, value?: string): ContextFilter | undefined => {
    if (!field || !value) return undefined;
    const mod = modules.find((m) => m.id === widget.moduleId);
    if (!mod?.fields?.some((f: Field) => f.name === field)) return undefined;
    return { field, value };
  }, [modules]);

  const loadWidgetData = useCallback(async (widget: Widget, contextOverride?: { field?: string; value?: string }): Promise<Widget> => {
    const context = contextOverride
      ? resolveContextForWith(widget, contextOverride.field, contextOverride.value)
      : resolveContextForWith(widget, viewContextField, viewContextValue);
    if (widget.type === "target") {
      // Inline target (new style): delegate to shared loader which fetches the aggregate
      if (widget.targetValue !== undefined && widget.moduleId) {
        return sharedLoadWidgetData(widget, targets, context);
      }
      // Legacy target by ID: call compute endpoint then update targets state
      const t = targets.find((x) => x.id === widget.targetId);
      if (!t) return { ...widget, loading: false };
      try {
        const { data } = await api.post(`/analytics/targets/${t.id}/compute`);
        setTargets((prev) => prev.map((x) => x.id === t.id ? { ...x, currentValue: data.currentValue } : x));
      } catch {}
      return { ...widget, loading: false };
    }
    return sharedLoadWidgetData(widget, targets, context);
  }, [targets, resolveContextForWith, viewContextField, viewContextValue]);

  const markDirty = () => {
    if (activeView) setHasChanges(true);
  };

  const addWidget = async (draft: Omit<Widget, "id">) => {
    const id = `w-${Date.now()}`;
    const dims = getWidgetDims(draft.type);
    // Place new widget at the bottom; vertical compaction will fill any available gap
    const maxY = widgets.reduce((m, w) => Math.max(m, (w.y ?? 0) + (w.h ?? dims.h)), 0);
    const widget: Widget = {
      ...draft, id, loading: true,
      x: 0, y: maxY,
      w: draft.w ?? dims.w,
      h: draft.h ?? dims.h,
    };
    setWidgets((prev) => [...prev, widget]);
    const loaded = await loadWidgetData(widget);
    setWidgets((prev) => prev.map((w) => w.id === id ? loaded : w));
    markDirty();
  };

  const updateWidget = async (id: string, draft: Omit<Widget, "id">) => {
    const widget: Widget = { ...draft, id, loading: true };
    setWidgets((prev) => prev.map((w) => w.id === id ? widget : w));
    const loaded = await loadWidgetData(widget);
    setWidgets((prev) => prev.map((w) => w.id === id ? loaded : w));
    setEditingWidget(null);
    markDirty();
  };

  const refreshWidget = async (id: string) => {
    const widget = widgets.find((w) => w.id === id);
    if (!widget) return;
    setWidgets((prev) => prev.map((w) => w.id === id ? { ...w, loading: true } : w));
    const loaded = await loadWidgetData(widget);
    setWidgets((prev) => prev.map((w) => w.id === id ? loaded : w));
  };

  const removeWidget = (id: string) => {
    setWidgets((prev) => prev.filter((w) => w.id !== id));
    markDirty();
  };

  const cloneWidget = (id: string) => {
    const widget = widgets.find((w) => w.id === id);
    if (!widget) return;
    const clone: Widget = { ...widget, id: `w-${Date.now()}`, title: `${widget.title} (Copy)` };
    setWidgets((prev) => [...prev, clone]);
    markDirty();
    showToast("Widget cloned");
  };

  const applyLayout = (layout: RGLLayout) => {
    setWidgets(prev => prev.map(w => {
      const l = layout.find((n: any) => n.i === w.id);
      return l ? { ...w, x: l.x, y: l.y, w: l.w, h: l.h } : w;
    }));
  };
  // During drag/resize: update local positions so the UI stays consistent
  const handleLayoutChange = (layout: RGLLayout) => {
    if (reorderMode) applyLayout(layout);
  };
  // On drag/resize stop: persist positions to widget state + mark view dirty
  const handleLayoutStop = (layout: RGLLayout) => {
    if (!reorderMode) return;
    applyLayout(layout);
    markDirty(); // "Save Changes" button will persist to the view
  };

  const cloneView = async (view: AnalyticsView) => {
    try {
      await api.post("/analytics/views", {
        name: `${view.name} (Copy)`,
        config: view.config,
      });
      await fetchViews();
      showToast(`"${view.name}" cloned`);
    } catch {
      showToast("Failed to clone view", "error");
    }
  };

  const widgetsToConfig = () =>
    widgets.map((w) => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { data, total, loading, error, secondaryKeys, isMultiLevel, height, size, ...rest } = w;
      return rest; // saves: id, title, type, moduleId, x, y, w, h, aggregation, groupByField, etc.
    });

  // Load a saved view onto the canvas
  const loadView = async (view: AnalyticsView, savePreference = true) => {
    setTemplateModuleId(null);
    setSaveMode("standalone");
    const freshContextField: string | undefined = (view.config as any)?.contextField || undefined;
    const freshContextValue: string | undefined = (view.config as any)?.contextValue || undefined;
    setViewContextValue(freshContextValue);
    // Auto-assign x,y,h for widgets saved before react-grid-layout was added
    let cx = 0, cy = 0, rowH = 0;
    const widgetsFromView: Widget[] = (view.config.widgets || []).map((w: any) => {
      const dims = getWidgetDims(w.type);
      const wCols = w.w ?? dims.w;
      const wRows = w.h ?? dims.h;
      if (w.x !== undefined && w.y !== undefined) return { ...w, loading: true };
      if (cx + wCols > GRID_COLS) { cx = 0; cy += rowH; rowH = 0; }
      const positioned = { ...w, loading: true, x: cx, y: cy, w: wCols, h: wRows };
      cx += wCols; rowH = Math.max(rowH, wRows);
      return positioned;
    });
    setWidgets(widgetsFromView);
    setActiveView(view);
    setHasChanges(false);
    // Pass the view's context explicitly — state set just above hasn't committed yet.
    const loaded = await Promise.all(widgetsFromView.map((w) => loadWidgetData(w, { field: freshContextField, value: freshContextValue })));
    setWidgets(loaded);
    if (savePreference) {
      try { await api.put("/user-preferences/analytics_active_view", { value: { viewId: view.id } }); } catch {}
    }
  };

  // Clears the canvas back to a blank slate — used by both "New Visualization →
  // Start from Scratch" (which then opens the builder) and the plain "Clear
  // canvas" menu item (which doesn't). Returns whether it actually proceeded (false if
  // the user cancelled the discard-changes confirm) so callers can chain follow-up state.
  const startBlankCanvas = (openBuilder: boolean): boolean => {
    if (hasChanges && !confirm("Discard unsaved changes and start a new visualization?")) return false;
    setActiveView(null);
    setHasChanges(false);
    setWidgets([]);
    setSaveMode("standalone");
    setTemplateModuleId(null);
    setViewContextValue(undefined);
    api.delete("/user-preferences/analytics_active_view").catch(() => {});
    if (openBuilder) setShowBuilder(true);
    return true;
  };

  // A visualization created "from an existing report" must become its OWN new
  // visualization — never silently appended into whatever view happened to be
  // open. Clears to a blank canvas first, adds the widget, then prompts to
  // save it as a named view so it persists as a distinct saved visualization.
  const createAsNewVisualization = (widget: Omit<Widget, "id">) => {
    if (hasChanges && !confirm("Discard unsaved changes and start a new visualization?")) return;
    setActiveView(null);
    setHasChanges(false);
    setWidgets([]);
    setSaveMode("standalone");
    api.delete("/user-preferences/analytics_active_view").catch(() => {});
    addWidget(widget);
    setViewName(widget.title || "");
    setShowSaveView(true);
  };

  // Save current state to the active view (update) — spreads the existing config first
  // so contextField/contextValue (if this view came from a template) survive a widget/
  // layout edit instead of being silently wiped by only sending { widgets }.
  const saveChanges = async () => {
    if (!activeView) return;
    setSavingChanges(true);
    try {
      const updated = await api.patch(`/analytics/views/${activeView.id}`, {
        config: { ...activeView.config, widgets: widgetsToConfig() },
      });
      setActiveView({ ...activeView, ...updated.data });
      setHasChanges(false);
      await fetchViews();
      showToast("Changes saved successfully");
    } catch {
      showToast("Failed to save changes", "error");
    }
    setSavingChanges(false);
  };

  // Changes the live context value on the active view — persists immediately (so it's
  // remembered next time this view is opened, matching the Dashboard page's Filter
  // panel) and reloads every widget in place. Never creates a new view; this is what
  // lets one template-derived view stand in for what used to be N duplicated
  // visualizations (one per camp/region/etc.), a plain dropdown switching between them.
  const changeContextValue = async (value: string) => {
    if (!activeView || !viewContextField) return;
    setSavingContext(true);
    const nextConfig = { ...activeView.config, contextField: viewContextField, contextValue: value || null };
    setViewContextValue(value || undefined);
    try {
      const { data } = await api.patch(`/analytics/views/${activeView.id}`, { config: nextConfig });
      setActiveView({ ...activeView, ...data });
      const loaded = await Promise.all(widgets.map((w) => loadWidgetData(w, { field: viewContextField, value })));
      setWidgets(loaded);
    } catch {
      showToast("Failed to change filter", "error");
    }
    setSavingContext(false);
  };

  // Changes WHICH field drives the live common filter on the active view — distinct from
  // changeContextValue above, which only changes the current slice of an already-chosen
  // field. Persists immediately (same as the value) and resets the value back to "all"
  // since the previous field's values don't apply to the new field.
  const changeContextField = async (field: string) => {
    if (!activeView) return;
    const nextField = field || undefined;
    if (nextField === viewContextField) return;
    setSavingContext(true);
    const nextConfig = { ...activeView.config, contextField: nextField ?? null, contextValue: null };
    setViewContextValue(undefined);
    try {
      const { data } = await api.patch(`/analytics/views/${activeView.id}`, { config: nextConfig });
      setActiveView({ ...activeView, ...data });
      const loaded = await Promise.all(widgets.map((w) => loadWidgetData(w, { field: nextField, value: undefined })));
      setWidgets(loaded);
    } catch {
      showToast("Failed to change common filter field", "error");
    }
    setSavingContext(false);
  };

  // Create a new view from current canvas — or, if saveMode is "template", save the
  // canvas as a reusable Visualization Template instead (with a forced context field).
  const saveAsNewView = async () => {
    if (!viewName.trim()) return;
    if (saveMode === "template" && !templateContextField) return;
    setSavingView(true);
    try {
      if (saveMode === "template") {
        await api.post("/visualization-templates", {
          name: viewName,
          layoutConfiguration: { widgets: widgetsToConfig() },
          contextField: templateContextField,
          // Only known/meaningful when built via the guided "New Template" flow, which
          // locks every widget to one module — an ad-hoc multi-module canvas has no single
          // anchor module, so this is correctly omitted (backend defaults it to null) then.
          moduleId: templateModuleId ?? undefined,
        });
        showToast(`Template "${viewName}" saved`);
      } else {
        const { data } = await api.post("/analytics/views", {
          name: viewName,
          config: { widgets: widgetsToConfig() },
        });
        await fetchViews();
        setActiveView(data);
        setHasChanges(false);
        showToast(`View "${viewName}" saved`);
      }
      setShowSaveView(false);
      setViewName("");
      setSaveMode("standalone");
      setTemplateContextField("");
    } catch {
      showToast(saveMode === "template" ? "Failed to save template" : "Failed to save view", "error");
    }
    setSavingView(false);
  };

  // Fields from the modules the CURRENT widgets actually use, deduped by name — the
  // dropdown of "common filter field" choices when saving a new visualization as a
  // template. Scoped to widgets' own modules (not every module in the org) so you can
  // never pick a field none of your widgets can actually be filtered by.
  const fieldOptions = useMemo(() => {
    const usedModuleIds = new Set(widgets.map((w) => w.moduleId).filter(Boolean));
    const seen = new Map<string, string>();
    for (const m of modules) {
      if (usedModuleIds.size > 0 && !usedModuleIds.has(m.id)) continue;
      for (const f of (m.fields ?? [])) if (!seen.has(f.name)) seen.set(f.name, f.label);
    }
    return Array.from(seen.entries()).map(([name, label]) => ({ name, label }));
  }, [modules, widgets]);

  // Confirms the guided "New Template" setup — module + common filter field chosen
  // upfront, before any widget exists. Every widget added from here on is locked to
  // that module and automatically dynamic on that field (see WidgetBuilderDialog's
  // `lockedModuleId`/`contextField` props and the "Filtered by" badge on WidgetCard).
  const confirmTemplateSetup = () => {
    if (!setupModuleId || !setupField) return;
    if (!startBlankCanvas(false)) return;
    setTemplateModuleId(setupModuleId);
    setTemplateContextField(setupField);
    setSaveMode("template");
    setShowTemplateSetup(false);
    setShowBuilder(true);
  };

  // Populates the "Templates" dropdown's list — fetched on open, not tied to the
  // instantiate dialog (that only opens once a specific template is picked below).
  const fetchTemplatesList = async () => {
    setLoadingTemplates(true);
    try {
      const { data } = await api.get("/visualization-templates");
      setTemplates(data ?? []);
    } catch {
      setTemplates([]);
    }
    setLoadingTemplates(false);
  };

  // Picking a template from the dropdown jumps straight to the value-picking step.
  const pickTemplate = (id: string) => {
    setSelectedTemplateId(id); setTemplateCtxValue(""); setTemplateCtxSuggestions([]);
    setShowTemplatesDialog(true);
  };

  const selectedTemplate = templates.find(t => t.id === selectedTemplateId);
  const selectedTemplateCtxField = selectedTemplate?.contexts?.[0]?.fieldName;

  useEffect(() => {
    if (!selectedTemplateCtxField) { setTemplateCtxSuggestions([]); return; }
    const moduleWithField = modules.find(m => m.fields?.some(f => f.name === selectedTemplateCtxField));
    if (!moduleWithField) { setTemplateCtxSuggestions([]); return; }
    let cancelled = false;
    api.get(`/modules/${moduleWithField.id}/records/field-values/${selectedTemplateCtxField}`)
      .then(({ data }) => { if (!cancelled) setTemplateCtxSuggestions(data ?? []); })
      .catch(() => { if (!cancelled) setTemplateCtxSuggestions([]); });
    return () => { cancelled = true; };
  }, [selectedTemplateCtxField, modules]);

  const createFromTemplate = async () => {
    if (!selectedTemplateId) return;
    if (selectedTemplateCtxField && !templateCtxValue) return;
    if (hasChanges && !confirm("Discard unsaved changes and create a new visualization from this template?")) return;
    setInstantiatingTemplate(true);
    try {
      const { data } = await api.post(`/visualization-templates/${selectedTemplateId}/instantiate`, {
        contextValue: templateCtxValue,
        createDashboard: false,
      });
      await fetchViews();
      await loadView(data.view);
      setShowTemplatesDialog(false);
      showToast(`Created "${data.view.name}"`);
    } catch {
      showToast("Failed to create visualization from template", "error");
    }
    setInstantiatingTemplate(false);
  };

  const deleteView = async (id: string) => {
    if (!confirm("Delete this saved view?")) return;
    try {
      await api.delete(`/analytics/views/${id}`);
    } catch {
      showToast("Failed to delete view", "error");
      return;
    }
    if (activeView?.id === id) {
      setActiveView(null);
      setHasChanges(false);
      try { await api.delete("/user-preferences/analytics_active_view"); } catch {}
    }
    fetchViews();
    showToast("View deleted");
  };

  const renameView = async () => {
    if (!renamingView || !renameName.trim()) return;
    try {
      await api.patch(`/analytics/views/${renamingView.id}`, { name: renameName });
      if (activeView?.id === renamingView.id) {
        setActiveView({ ...activeView, name: renameName });
      }
      await fetchViews();
      setRenamingView(null);
      setRenameName("");
      showToast("View renamed");
    } catch {
      showToast("Failed to rename", "error");
    }
  };

  const canManageView = (view: AnalyticsView) => {
    const isSuperAdmin = (user as any)?.role === "SUPER_ADMIN";
    return isSuperAdmin || isAdmin || view.createdById === (user as any)?.id;
  };

  // Gates Save Changes / Edit-reorder — actions that mutate the currently active, ALREADY
  // SAVED view. No active view yet (still building a brand-new one) is always editable;
  // "Save as New" is deliberately never gated by this since it only ever creates the
  // viewer's own new copy, never touching a view they don't own/manage.
  const canEditActiveView = !activeView || canManageView(activeView);

  const togglePin = async (view: AnalyticsView) => {
    try {
      await api.patch(`/analytics/views/${view.id}/toggle-pin`);
      await fetchViews();
      if (activeView?.id === view.id) {
        setActiveView({ ...activeView, isPinned: !activeView.isPinned });
      }
      showToast(view.isPinned ? "Unpinned" : "Pinned to top");
    } catch {
      showToast("Failed to update pin", "error");
    }
  };

  const handleSaveSavedFilter = async (name: string, filterGroup: FilterGroup) => {
    try {
      await api.post("/analytics/saved-filters", {
        name,
        conditions: filterGroup.conditions,
        logic: filterGroup.logic,
        context: "analytics",
      });
      await fetchSavedFilters();
      showToast(`Filter "${name}" saved`);
    } catch {
      showToast("Failed to save filter", "error");
    }
  };

  const viewsMatchingSearch = viewSearch.trim()
    ? views.filter(v => v.name.toLowerCase().includes(viewSearch.trim().toLowerCase()))
    : views;
  const pinnedViews = viewsMatchingSearch.filter(v => v.isPinned);
  const unpinnedViews = viewsMatchingSearch.filter(v => !v.isPinned);

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Analytics</h1>
            {activeView && (
              <Badge variant="secondary" className="text-xs font-medium gap-1">
                {activeView.isPinned && <Pin className="w-2.5 h-2.5" />}
                {activeView.name}
              </Badge>
            )}
            {hasChanges && (
              <Badge className="text-xs bg-amber-100 text-amber-700 border-amber-200 gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block" />
                Unsaved changes
              </Badge>
            )}
          </div>
          <p className="text-gray-500 mt-0.5 text-sm">
            {activeView ? `Viewing: ${activeView.name}` : "Build dashboards with filters, charts, and targets."}
          </p>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          {/* New — every way to START a brand-new blank visualization or template.
              Saving/sharing/deleting the CURRENT canvas lives in Actions instead;
              browsing existing visualizations/templates lives in their own dropdowns. */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" className="gap-2">
                <Sparkles className="w-4 h-4" /><span className="hidden sm:inline">New</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-72">
              <DropdownMenuItem className="gap-2.5 cursor-pointer py-2.5" onClick={() => startBlankCanvas(true)}>
                <LayoutGrid className="w-4 h-4 text-blue-500 shrink-0" />
                <div className="min-w-0">
                  <p className="font-medium text-gray-800">Start from Scratch</p>
                  <p className="text-xs text-gray-400">Blank canvas — add your own widgets</p>
                </div>
              </DropdownMenuItem>
              <DropdownMenuItem className="gap-2.5 cursor-pointer py-2.5" onClick={() => { setWizardInitialReportId(undefined); setShowReportWizard(true); }}>
                <FileBarChart2 className="w-4 h-4 text-indigo-500 shrink-0" />
                <div className="min-w-0">
                  <p className="font-medium text-gray-800">From an Existing Report</p>
                  <p className="text-xs text-gray-400">Pick a report and get chart suggestions</p>
                </div>
              </DropdownMenuItem>
              <DropdownMenuItem className="gap-2.5 cursor-pointer py-2.5" onClick={() => {
                if (hasChanges && !confirm("Discard unsaved changes and start a new template?")) return;
                setSetupModuleId(""); setSetupField(""); setShowTemplateSetup(true);
              }}>
                <LayoutTemplate className="w-4 h-4 text-purple-500 shrink-0" />
                <div className="min-w-0">
                  <p className="font-medium text-gray-800">New Template</p>
                  <p className="text-xs text-gray-400">Build a reusable template directly — no visualization needed first</p>
                </div>
              </DropdownMenuItem>
              {widgets.length > 0 && (
                <DropdownMenuItem className="gap-2.5 cursor-pointer py-2.5 text-gray-500" onClick={() => startBlankCanvas(false)}>
                  <X className="w-4 h-4 shrink-0" />
                  <div className="min-w-0">
                    <p className="font-medium">Clear Canvas</p>
                    <p className="text-xs text-gray-400">Empty the canvas without opening the widget picker</p>
                  </div>
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Visualizations — browse/switch/manage every saved visualization (replaces
              the old "My Visualizations" page; this dropdown IS the visualization list). */}
          <DropdownMenu onOpenChange={(open) => { if (!open) setViewSearch(""); }}>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <BookOpen className="w-4 h-4" />
                  <span className="hidden sm:inline">Visualizations</span>
                  {pinnedViews.length > 0 && <Pin className="w-3 h-3 text-blue-500" />}
                  <ChevronDown className="w-3 h-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-72 max-h-96 overflow-y-auto">
                {views.length === 0 ? (
                  <div className="px-3 py-4 text-center text-sm text-gray-400">No saved visualizations yet.</div>
                ) : (
                  <>
                    {views.length > 5 && (
                      <div className="px-2 py-1.5">
                        <input
                          autoFocus
                          value={viewSearch}
                          onChange={e => setViewSearch(e.target.value)}
                          onClick={e => e.stopPropagation()}
                          onKeyDown={e => e.stopPropagation()}
                          placeholder="Search visualizations…"
                          className="w-full h-8 px-2.5 text-xs border border-gray-200 rounded-lg outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20"
                        />
                      </div>
                    )}
                    {pinnedViews.length === 0 && unpinnedViews.length === 0 && (
                      <div className="px-3 py-4 text-center text-sm text-gray-400">No matches</div>
                    )}
                    {pinnedViews.length > 0 && (
                      <>
                        <div className="px-2 py-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wider">Pinned</div>
                        {pinnedViews.map((v) => (
                          <ViewMenuItem key={v.id} view={v} isActive={activeView?.id === v.id}
                            canManage={canManageView(v)}
                            onLoad={() => loadView(v)} onDelete={() => deleteView(v.id)}
                            onTogglePin={() => togglePin(v)} onRename={() => { setRenamingView(v); setRenameName(v.name); }}
                            onClone={() => cloneView(v)}                            onAddToDashboard={() => { setAddToDashboardView(v); loadDashboards(); }} />
                        ))}
                        {unpinnedViews.length > 0 && <DropdownMenuSeparator />}
                      </>
                    )}
                    {unpinnedViews.length > 0 && (
                      <>
                        {pinnedViews.length > 0 && (
                          <div className="px-2 py-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wider">All Views</div>
                        )}
                        {unpinnedViews.map((v) => (
                          <ViewMenuItem key={v.id} view={v} isActive={activeView?.id === v.id}
                            canManage={canManageView(v)}
                            onLoad={() => loadView(v)} onDelete={() => deleteView(v.id)}
                            onTogglePin={() => togglePin(v)} onRename={() => { setRenamingView(v); setRenameName(v.name); }}
                            onClone={() => cloneView(v)}                            onAddToDashboard={() => { setAddToDashboardView(v); loadDashboards(); }} />
                        ))}
                      </>
                    )}
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>

          {/* Templates — browse saved templates and instantiate one, pre-filtered to a
              single value (e.g. one camp). Sibling to Visualizations, not nested under New. */}
          <DropdownMenu onOpenChange={(open) => { if (open) fetchTemplatesList(); }}>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <LayoutTemplate className="w-4 h-4" />
                <span className="hidden sm:inline">Templates</span>
                <ChevronDown className="w-3 h-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-64 max-h-96 overflow-y-auto">
              {loadingTemplates ? (
                <div className="flex justify-center py-4"><Loader2 className="w-4 h-4 animate-spin text-blue-500" /></div>
              ) : templates.length === 0 ? (
                <div className="px-3 py-4 text-center text-sm text-gray-400">
                  No templates yet. Use Actions → Save as Template.
                </div>
              ) : (
                templates.map((t) => (
                  <DropdownMenuItem key={t.id} className="gap-2.5 cursor-pointer py-2" onClick={() => pickTemplate(t.id)}>
                    <LayoutTemplate className="w-3.5 h-3.5 text-purple-500 shrink-0" />
                    <span className="truncate">{t.name}</span>
                  </DropdownMenuItem>
                ))
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Actions — everything about the CURRENT canvas: save it as a template or a
              standalone visualization, edit its layout, share it, or delete it. */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <MoreHorizontal className="w-4 h-4" /><span className="hidden sm:inline">Actions</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
              {widgets.length > 0 && (
                <>
                  <DropdownMenuItem className="gap-2.5 cursor-pointer py-2" onClick={() => { setSaveMode("template"); setShowSaveView(true); }}>
                    <LayoutTemplate className="w-4 h-4 text-purple-500 shrink-0" /> Save as Template…
                  </DropdownMenuItem>
                  <DropdownMenuItem className="gap-2.5 cursor-pointer py-2" onClick={() => { setSaveMode("standalone"); setShowSaveView(true); }}>
                    <Save className="w-4 h-4 text-blue-500 shrink-0" /> Save as Standalone View…
                  </DropdownMenuItem>
                </>
              )}
              {canEditActiveView && !reorderMode && (
                <DropdownMenuItem className="gap-2.5 cursor-pointer py-2" onClick={() => setReorderMode(true)}>
                  <LayoutGrid className="w-4 h-4 text-gray-500 shrink-0" /> Edit Layout
                </DropdownMenuItem>
              )}
              {activeView && canManageView(activeView) && (
                <>
                  {(widgets.length > 0 || canEditActiveView) && <DropdownMenuSeparator />}
                  <DropdownMenuItem className="gap-2.5 cursor-pointer py-2" onClick={() => setShowSharePanel(true)}>
                    <Share2 className="w-4 h-4 text-teal-500 shrink-0" /> Share…
                  </DropdownMenuItem>
                  <DropdownMenuItem className="gap-2.5 cursor-pointer py-2 text-red-600" onClick={() => deleteView(activeView.id)}>
                    <Trash2 className="w-4 h-4 shrink-0" /> Delete this Visualization
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Filter bar (left) + view actions (right) — kept on their own row, visually
          separated from the create/navigate controls above, so the toolbar reads as
          distinct groups instead of one long undifferentiated row of buttons. */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-1.5 flex-wrap">
          <Button variant="outline" size="sm" className="gap-2" onClick={() => setShowSavedFilters(true)}>
            <Bookmark className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Saved Filters</span>
            {savedFilters.length > 0 && <span className="text-xs text-gray-400">({savedFilters.length})</span>}
          </Button>

          {/* Common filter — the field AND value driving every widget's live slice on this
              view (e.g. Camp Name → Singida). Arranged inline, right in the toolbar — no
              popup covering the widgets below it. Whoever can manage the view can change
              which FIELD drives it; everyone can still change the value, exactly like
              flipping a pivot table's filter. */}
          {activeView && widgets.length > 0 && fieldOptions.length > 0 && (
            <div className="flex items-center h-8 rounded-lg border border-gray-200 bg-white pl-2 pr-1">
              <Filter className="w-3.5 h-3.5 text-gray-400 shrink-0" />
              {canEditActiveView ? (
                <div className="relative flex items-center">
                  <select
                    value={viewContextField ?? ""}
                    onChange={(e) => changeContextField(e.target.value)}
                    disabled={savingContext}
                    title="Which field drives this view's common filter"
                    className="appearance-none bg-transparent text-xs font-medium text-gray-700 pl-1.5 pr-4 py-1 outline-none cursor-pointer max-w-[130px] truncate"
                  >
                    <option value="">No common filter</option>
                    {fieldOptions.map((f) => <option key={f.name} value={f.name}>{f.label}</option>)}
                  </select>
                  <ChevronDown className="w-3 h-3 text-gray-400 absolute right-0.5 pointer-events-none" />
                </div>
              ) : (
                viewContextField && (
                  <span className="text-xs font-medium text-gray-700 pl-1.5 pr-1.5 shrink-0">
                    {fieldOptions.find((f) => f.name === viewContextField)?.label ?? viewContextField}
                  </span>
                )
              )}
              {viewContextField && (
                <>
                  <div className="w-px h-4 bg-gray-200 shrink-0" />
                  <div className="relative flex items-center">
                    <select
                      value={viewContextValue ?? ""}
                      onChange={(e) => changeContextValue(e.target.value)}
                      disabled={savingContext}
                      className="appearance-none bg-transparent text-xs font-medium text-purple-700 pl-1.5 pr-4 py-1 outline-none cursor-pointer max-w-[150px] truncate"
                    >
                      <option value="">-- all (no filter) --</option>
                      {contextValueOptions.map((v) => <option key={v} value={v}>{v}</option>)}
                    </select>
                    <ChevronDown className="w-3 h-3 text-purple-400 absolute right-0.5 pointer-events-none" />
                  </div>
                </>
              )}
              {savingContext && <Loader2 className="w-3 h-3 animate-spin text-gray-400 shrink-0 ml-1 mr-0.5" />}
            </div>
          )}
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          {/* Save Changes overwrites the active view in place — only for whoever can
              manage it; kept as its own prominent button (not in Actions) since its
              amber highlight is meant to be noticed the moment there are unsaved edits. */}
          {activeView && hasChanges && canEditActiveView && (
            <Button size="sm" className="gap-2 bg-amber-600 hover:bg-amber-700" onClick={saveChanges} disabled={savingChanges}>
              {savingChanges ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save Changes
            </Button>
          )}

          <Button
            size="sm"
            variant="outline"
            className="gap-2 border-purple-200 text-purple-700 hover:bg-purple-50 hover:border-purple-300 hidden sm:inline-flex"
            onClick={() => {
              const ctx: AnalysisContext = {
                type: "visualization",
                title: activeView?.name ?? "Data Visualization",
                contextSummary: widgets.length === 0
                  ? "No widgets have been added to this view yet."
                  : `View: ${activeView?.name ?? "Untitled"}\n\nWidgets (${widgets.length}):\n${widgets.map(w =>
                      `- ${w.title || w.type} (${w.type}): module=${modules.find(m => m.id === w.moduleId)?.name ?? "n/a"}, field=${w.groupByField ?? w.aggregateField ?? "n/a"}`
                    ).join("\n")}`,
              };
              setAnalyzeContext(ctx);
              setAnalyzeOpen(true);
            }}
          >
            <BrainCircuit className="w-4 h-4" /> Analyze
          </Button>

          {/* Edit-session controls — Add Widget/Save Layout/Exit Edit only ever appear
              while Edit is on (entered via Actions → Edit Layout), for BOTH templates and
              standalone visualizations — no bypass for mobile or an empty canvas. */}
          {reorderMode && canEditActiveView && (
            <>
              <Button size="sm" variant="outline" className="gap-2" onClick={() => setShowBuilder(true)}>
                <Plus className="w-4 h-4" /><span className="hidden sm:inline">Add Widget</span>
              </Button>
              <Button size="sm" className="gap-2 bg-green-600 hover:bg-green-700" onClick={() => { saveChanges(); setReorderMode(false); }}>
                <Save className="w-4 h-4" /> Save Layout
              </Button>
              <Button variant="outline" size="sm" className="gap-2" onClick={() => setReorderMode(false)}>
                <X className="w-4 h-4" /> Exit Edit
              </Button>
            </>
          )}
        </div>
      </div>

      {showSharePanel && activeView && (
        <AnalyticsViewSharePanel
          view={activeView}
          onClose={() => setShowSharePanel(false)}
          onSaved={(updated) => setActiveView((prev) => prev ? { ...prev, ...updated } : prev)}
        />
      )}

      {/* Pinned views quick-access bar */}
      {pinnedViews.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-gray-400 font-medium">Quick access:</span>
          {pinnedViews.map(v => (
            <button key={v.id} onClick={() => loadView(v)}
              className={cn(
                "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-colors border",
                activeView?.id === v.id
                  ? "bg-brand text-white border-brand"
                  : "bg-white text-gray-700 border-gray-200 hover:border-brand/50 hover:text-brand"
              )}>
              <Pin className="w-2.5 h-2.5" />
              {v.name}
            </button>
          ))}
        </div>
      )}

      {/* Rename View Dialog */}
      <Dialog open={!!renamingView} onOpenChange={() => setRenamingView(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Rename View</DialogTitle></DialogHeader>
          <Input value={renameName} onChange={e => setRenameName(e.target.value)}
            onKeyDown={e => e.key === "Enter" && renameView()} placeholder="View name" autoFocus />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenamingView(null)}>Cancel</Button>
            <Button onClick={renameView} disabled={!renameName.trim()}>Rename</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add to Dashboard Dialog */}
      <Dialog open={!!addToDashboardView} onOpenChange={() => setAddToDashboardView(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <LayoutDashboard className="w-4 h-4 text-blue-500" />
              Add to Dashboard
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-500 -mt-1">
            Select a dashboard to add &quot;{addToDashboardView?.name}&quot; as a widget.
          </p>
          <div className="space-y-1.5 py-1 max-h-56 overflow-y-auto">
            {dashboards.length === 0 && (
              <p className="text-sm text-gray-400 text-center py-4">No dashboards yet</p>
            )}
            {dashboards.map(d => {
              const alreadyAdded = (d.config?.widgets ?? []).some(
                (w: any) => w.type === "analytics_view" && w.analyticsViewId === addToDashboardView?.id
              );
              return (
                <button
                  key={d.id}
                  disabled={alreadyAdded}
                  onClick={async () => {
                    if (!addToDashboardView) return;
                    await addAnalyticsWidget(d.id, addToDashboardView.id, addToDashboardView.name);
                    setAddToDashboardView(null);
                    showToast(`Added to "${d.name}"`);
                  }}
                  className={cn(
                    "flex items-center gap-3 w-full text-left px-3 py-2.5 rounded-xl border transition",
                    alreadyAdded
                      ? "opacity-50 cursor-not-allowed border-gray-100 bg-gray-50"
                      : "border-gray-200 hover:border-blue-300 hover:bg-blue-50"
                  )}
                >
                  <LayoutDashboard className="w-4 h-4 text-blue-400 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{d.name}</p>
                    {d.isDefault && <p className="text-[10px] text-blue-500">Default dashboard</p>}
                  </div>
                  {alreadyAdded
                    ? <span className="text-[10px] text-gray-400 shrink-0">Already added</span>
                    : <Plus className="w-4 h-4 text-blue-500 shrink-0" />}
                </button>
              );
            })}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddToDashboardView(null)}>Cancel</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Save View Dialog — new visualizations choose Standalone (a normal saved view) or
          Template (a reusable recipe with one context field that gets a value picked later) */}
      <Dialog open={showSaveView} onOpenChange={setShowSaveView}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{activeView ? "Save as New View" : "Save Analytics View"}</DialogTitle>
          </DialogHeader>
          <div className="py-2 space-y-3">
            <Input
              placeholder={saveMode === "template" ? "Template name (e.g. Camp Operations)" : "View name (e.g. Finance Dashboard)"}
              value={viewName}
              onChange={(e) => setViewName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && saveAsNewView()}
              autoFocus
            />
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={() => setSaveMode("standalone")}
                className={cn("text-left px-3 py-2 rounded-xl border transition",
                  saveMode === "standalone" ? "border-blue-400 bg-blue-50" : "border-gray-200 hover:border-gray-300")}>
                <p className="text-sm font-medium text-gray-800">Standalone</p>
                <p className="text-[11px] text-gray-400">A regular saved visualization</p>
              </button>
              <button type="button" onClick={() => setSaveMode("template")}
                className={cn("text-left px-3 py-2 rounded-xl border transition",
                  saveMode === "template" ? "border-blue-400 bg-blue-50" : "border-gray-200 hover:border-gray-300")}>
                <p className="text-sm font-medium text-gray-800">Template</p>
                <p className="text-[11px] text-gray-400">Reusable, with a filter field</p>
              </button>
            </div>
            {saveMode === "template" && (
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Common Filter Field</label>
                {templateModuleId ? (
                  <p className="w-full text-sm border border-gray-200 rounded-lg px-2.5 py-1.5 bg-gray-50 text-gray-600 flex items-center justify-between">
                    {fieldOptions.find(f => f.name === templateContextField)?.label ?? templateContextField}
                    <span className="text-xs text-gray-400">Chosen when you started this template</span>
                  </p>
                ) : (
                  <select value={templateContextField} onChange={e => setTemplateContextField(e.target.value)}
                    className="w-full text-sm border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-blue-400">
                    <option value="">-- select a field --</option>
                    {fieldOptions.map(f => <option key={f.name} value={f.name}>{f.label}</option>)}
                  </select>
                )}
                <p className="text-xs text-gray-400 mt-1">
                  Whoever creates a visualization from this template will pick a value for this field (e.g. a specific Region or Camp Name) — always via a dropdown.
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowSaveView(false); setSaveMode("standalone"); setTemplateContextField(""); }}>Cancel</Button>
            <Button onClick={saveAsNewView} disabled={!viewName.trim() || savingView || (saveMode === "template" && !templateContextField)}>
              {savingView ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New Template setup — module + common filter field, chosen before any widget exists */}
      <Dialog open={showTemplateSetup} onOpenChange={setShowTemplateSetup}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <LayoutTemplate className="w-4 h-4 text-purple-500" />
              New Template
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-1">
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Module</label>
              <select value={setupModuleId} onChange={e => { setSetupModuleId(e.target.value); setSetupField(""); }}
                className="w-full text-sm border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-blue-400">
                <option value="">-- select a module --</option>
                {modules.map((m: any) => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
              <p className="text-xs text-gray-400 mt-1">Every widget you add will be built from this module.</p>
            </div>
            {setupModuleId && (
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Common Filter Field</label>
                <select value={setupField} onChange={e => setSetupField(e.target.value)}
                  className="w-full text-sm border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-blue-400">
                  <option value="">-- select a field --</option>
                  {(modules.find((m: any) => m.id === setupModuleId)?.fields ?? []).map((f: Field) => (
                    <option key={f.id} value={f.name}>{f.label}</option>
                  ))}
                </select>
                <p className="text-xs text-gray-400 mt-1">
                  Every widget you add gets a dynamic condition on this field — no value by default (no filtering effect), until whoever uses the template picks one from a dropdown.
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTemplateSetup(false)}>Cancel</Button>
            <Button onClick={confirmTemplateSetup} disabled={!setupModuleId || !setupField}>Continue</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create From Template Dialog */}
      <Dialog open={showTemplatesDialog} onOpenChange={setShowTemplatesDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <LayoutTemplate className="w-4 h-4 text-blue-500" />
              Create From Template
            </DialogTitle>
          </DialogHeader>
          {loadingTemplates ? (
            <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-blue-500" /></div>
          ) : templates.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">
              No templates yet. Save a visualization as a Template first (Save View → Template).
            </p>
          ) : (
            <div className="space-y-3 py-1">
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Template</label>
                <select value={selectedTemplateId} onChange={e => { setSelectedTemplateId(e.target.value); setTemplateCtxValue(""); }}
                  className="w-full text-sm border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-blue-400">
                  <option value="">-- select a template --</option>
                  {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
              {selectedTemplate && selectedTemplateCtxField ? (
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">{selectedTemplateCtxField} value</label>
                  <select value={templateCtxValue} onChange={e => setTemplateCtxValue(e.target.value)}
                    className="w-full text-sm border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-blue-400">
                    <option value="">-- select a value --</option>
                    {templateCtxSuggestions.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              ) : selectedTemplate ? (
                <p className="text-xs text-gray-400">This template has no context field — it will be created as-is.</p>
              ) : null}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTemplatesDialog(false)}>Cancel</Button>
            <Button onClick={createFromTemplate} disabled={instantiatingTemplate || !selectedTemplateId || (!!selectedTemplateCtxField && !templateCtxValue)}>
              {instantiatingTemplate ? <Loader2 className="w-4 h-4 animate-spin" /> : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Widgets — gridContainerRef is always mounted so ResizeObserver measures correctly */}
      <div ref={gridContainerRef} className={`relative w-full transition-all duration-200${reorderMode && widgets.length > 0 ? " rgl-edit-mode" : ""}`}>
        {widgets.length === 0 ? (
          <div className="text-center py-24">
            <BarChart3 className="w-16 h-16 text-gray-200 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No widgets yet</h3>
            <p className="text-gray-500 mb-6 max-w-md mx-auto text-sm">
              {views.length > 0
                ? "Load a saved view from the Views menu, or add a new widget."
                : "Add analytics widgets to visualize your module data with charts, KPI cards, and target trackers."}
            </p>
            <div className="flex items-center justify-center gap-3">
              {views.length > 0 && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="gap-2">
                      <BookOpen className="w-4 h-4" /> Load a Visualization <ChevronDown className="w-3 h-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    {views.map(v => (
                      <DropdownMenuItem key={v.id} onClick={() => loadView(v)} className="gap-2 cursor-pointer">
                        {v.isPinned && <Pin className="w-3 h-3 text-blue-500" />}
                        {v.name}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
              <Button onClick={() => setShowBuilder(true)} className="gap-2">
                <Plus className="w-4 h-4" /> Add Your First Widget
              </Button>
            </div>
          </div>
        ) : gridWidth < 640 ? (
          /* ── Mobile: stacked single-column ── */
          <div className="space-y-4">
            {widgets.map((widget, idx) => {
              const mobileH = widget.type === "kpi" ? 120
                : widget.type === "target" ? 220
                : widget.type === "table" ? 300
                : 260;
              return (
                <div key={widget.id} style={{ height: mobileH }}>
                  <WidgetCard
                    widget={widget}
                    targets={targets}
                    reorderMode={false}
                    colorIndex={idx}
                    onEdit={() => { setEditingWidget(widget); setShowBuilder(true); }}
                    onRemove={() => removeWidget(widget.id)}
                    onRefresh={() => refreshWidget(widget.id)}
                    onClone={() => cloneWidget(widget.id)}
                    templateContextField={templateModuleId ? templateContextField : undefined}
                  />
                </div>
              );
            })}
          </div>
        ) : (
          <>
            {reorderMode && (
              <GridCellsOverlay
                cols={GRID_COLS}
                rowHeight={GRID_ROW_HEIGHT}
                rows={Math.max(8, widgets.reduce((m, w) => Math.max(m, (w.y ?? 0) + (w.h ?? 4)), 0) + 2)}
              />
            )}
            <ReactGridLayout
            className="layout"
            width={gridWidth}
            layout={widgets.map(w => {
              const dims = getWidgetDims(w.type);
              const min  = getWidgetMinDims(w.type);
              return {
                i: w.id,
                x: w.x ?? 0,
                y: w.y ?? 0,
                w: w.w ?? dims.w,
                h: w.h ?? dims.h,
                minW: min.minW,
                minH: min.minH,
                maxW: GRID_COLS,
              };
            }) as any}
            cols={GRID_COLS}
            rowHeight={GRID_ROW_HEIGHT}
            margin={[10, 10]}
            containerPadding={[0, 0]}
            compactType="vertical"
            preventCollision={false}
            isDraggable={reorderMode}
            isResizable={reorderMode}
            isBounded={false}
            draggableCancel=".no-drag"
            resizeHandles={["se", "s", "e", "n", "w", "ne", "nw", "sw"] as any}
            onLayoutChange={handleLayoutChange as any}
            onDragStop={handleLayoutStop as any}
            onResizeStop={handleLayoutStop as any}
          >
            {widgets.map((widget, idx) => (
              <div key={widget.id} style={{ cursor: reorderMode ? 'grab' : 'default' }}>
                <WidgetCard
                  widget={widget}
                  targets={targets}
                  reorderMode={reorderMode}
                  colorIndex={idx}
                  onEdit={() => { setEditingWidget(widget); setShowBuilder(true); }}
                  onRemove={() => removeWidget(widget.id)}
                  onRefresh={() => refreshWidget(widget.id)}
                  onClone={() => cloneWidget(widget.id)}
                  templateContextField={templateModuleId ? templateContextField : undefined}
                />
              </div>
            ))}
            </ReactGridLayout>
          </>
        )}
      </div>

      {/* Widget Builder */}
      <WidgetBuilderDialog
        key={editingWidget?.id ?? (seedWidget ? "from-report" : `new-${templateModuleId ?? "std"}`)}
        open={showBuilder}
        onClose={() => { setShowBuilder(false); setEditingWidget(null); setSeedWidget(null); }}
        onSave={editingWidget ? (draft) => updateWidget(editingWidget.id, draft) : addWidget}
        modules={modules}
        targets={targets}
        initial={editingWidget || seedWidget || undefined}
        savedFilters={savedFilters}
        onSaveSavedFilter={handleSaveSavedFilter}
        lockedModuleId={templateModuleId ?? undefined}
        contextField={templateModuleId ? templateContextField : undefined}
      />

      {/* Create Visualization from Report — guided wizard (select → recommend → customize → preview) */}
      {showReportWizard && (
        <ReportVisualizationWizard
          initialReportId={wizardInitialReportId}
          onCancel={() => setShowReportWizard(false)}
          onCreated={(widget) => { createAsNewVisualization(widget); setShowReportWizard(false); }}
        />
      )}

      {/* Target Manager */}
      {/* Saved Filters */}
      <SavedFiltersDialog
        open={showSavedFilters}
        onClose={() => setShowSavedFilters(false)}
        savedFilters={savedFilters}
        onRefresh={fetchSavedFilters}
        onLoadFilter={(sf) => {
          setShowBuilder(true);
        }}
      />

      <ToastList toasts={toasts} />

      <AnalysisPanel
        open={analyzeOpen}
        onClose={() => setAnalyzeOpen(false)}
        context={analyzeContext}
      />
    </div>
  );
}

// ── Share Panel ("who can see this visualization") ──────────────────────────
// Mirrors the Dashboard's AccessPanel (dashboard-builder.tsx) — same access model
// (isPublic / sharedRoles / sharedDepartments / sharedUsers), same floating-panel UI.

function AnalyticsViewSharePanel({
  view, onClose, onSaved,
}: {
  view: AnalyticsView;
  onClose: () => void;
  onSaved: (updated: Partial<AnalyticsView>) => void;
}) {
  const [isPublic, setIsPublic] = useState(view.isPublic ?? false);
  const [sharedRoles, setSharedRoles] = useState<string[]>(view.sharedRoles ?? []);
  const [sharedDepts, setSharedDepts] = useState<string[]>(view.sharedDepartments ?? []);
  const [sharedUsers, setSharedUsers] = useState<string[]>(view.sharedUsers ?? []);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const { data } = await api.patch(`/analytics/views/${view.id}`, {
        isPublic, sharedRoles, sharedDepartments: sharedDepts, sharedUsers,
      });
      onSaved(data);
    } catch {}
    setSaving(false);
    onClose();
  };

  return (
    <div className="fixed right-4 top-16 z-50 bg-white rounded-2xl shadow-2xl border border-gray-200 w-96 overflow-hidden flex flex-col max-h-[85vh]">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50 shrink-0">
        <div>
          <p className="text-sm font-semibold text-gray-800">Share Visualization</p>
          <p className="text-xs text-gray-400 mt-0.5">Who can see &quot;{view.name}&quot;</p>
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
      </div>
      <div className="flex-1 overflow-y-auto p-4">
        <AccessControlEditor
          isPublic={isPublic} sharedRoles={sharedRoles} sharedDepartments={sharedDepts} sharedUsers={sharedUsers}
          onChange={({ isPublic: ip, sharedRoles: sr, sharedDepartments: sd, sharedUsers: su }) => {
            setIsPublic(ip); setSharedRoles(sr); setSharedDepts(sd); setSharedUsers(su);
          }}
        />
      </div>
      <div className="border-t border-gray-100 px-4 py-3 flex justify-end gap-2 shrink-0">
        <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
        <Button size="sm" onClick={handleSave} disabled={saving}>
          {saving && <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />}Save
        </Button>
      </div>
    </div>
  );
}

// ── View Menu Item ─────────────────────────────────────────────────────────

function ViewMenuItem({
  view, isActive, canManage, onLoad, onDelete, onTogglePin, onRename, onClone, onAddToDashboard,
}: {
  view: AnalyticsView;
  isActive: boolean;
  canManage: boolean;
  onLoad: () => void;
  onDelete: () => void;
  onTogglePin: () => void;
  onRename: () => void;
  onClone: () => void;
  onAddToDashboard: () => void;
}) {
  return (
    <div className={cn(
      "flex items-center gap-1 px-2 py-1.5 hover:bg-gray-50 rounded-sm group cursor-pointer",
      isActive && "bg-brand/5"
    )}>
      <button className="flex-1 flex items-center gap-2 text-left min-w-0" onClick={onLoad}>
        {view.isPinned && <Pin className="w-3 h-3 text-blue-500 flex-shrink-0" />}
        <span className={cn("text-sm truncate", isActive && "font-medium text-brand")}>{view.name}</span>
        {isActive && <Check className="w-3 h-3 text-brand flex-shrink-0 ml-auto" />}
      </button>
      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
        {/* Pin to top of views list */}
        <button onClick={onTogglePin} className="p-1 rounded hover:bg-gray-200 text-gray-400 hover:text-blue-600" title={view.isPinned ? "Unpin from top" : "Pin to top"}>
          {view.isPinned ? <PinOff className="w-3 h-3" /> : <Pin className="w-3 h-3" />}
        </button>
        {/* Add to Dashboard */}
        <button onClick={e => { e.stopPropagation(); onAddToDashboard(); }}
          className="p-1 rounded hover:bg-gray-200 text-gray-400 hover:text-green-600" title="Add to Dashboard">
          <LayoutDashboard className="w-3 h-3" />
        </button>
        <button onClick={onClone} className="p-1 rounded hover:bg-gray-200 text-gray-400 hover:text-gray-600" title="Duplicate view">
          <Copy className="w-3 h-3" />
        </button>
        {canManage && (
          <button onClick={onRename} className="p-1 rounded hover:bg-gray-200 text-gray-400 hover:text-gray-600" title="Rename">
            <Pencil className="w-3 h-3" />
          </button>
        )}
        {canManage && (
          <button onClick={onDelete} className="p-1 rounded hover:bg-gray-200 text-gray-400 hover:text-red-600" title="Delete">
            <Trash2 className="w-3 h-3" />
          </button>
        )}
      </div>
    </div>
  );
}
