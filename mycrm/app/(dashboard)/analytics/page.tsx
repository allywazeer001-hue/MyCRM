"use client";
import { useEffect, useState, useCallback, useRef } from "react";
import {
  BarChart, Bar, PieChart, Pie, Cell, LineChart, Line, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from "recharts";
import {
  BarChart3, Plus, RefreshCw, Trash2, Settings2, Target, Save,
  BookOpen, ChevronDown, X, TrendingUp, TrendingDown, Minus,
  AlertCircle, Loader2, Eye, EyeOff, Filter, ChevronRight, Layers,
  Pin, PinOff, Check, Pencil, Star, StarOff, Bookmark,
  GripVertical, Copy, Maximize2, Minimize2,
} from "lucide-react";
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext, rectSortingStrategy, useSortable, arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
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
import { useModulesStore, Field } from "@/store/modules.store";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

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

type AggregationType = "COUNT" | "SUM" | "AVG" | "MIN" | "MAX";
type ChartType = "bar" | "pie" | "line" | "area" | "kpi" | "stat" | "table" | "target";

type WidgetSize = "1" | "2" | "3" | "4"; // columns in a 4-col grid: 25% / 50% / 75% / 100%

interface Widget {
  id: string;
  title: string;
  type: ChartType;
  moduleId: string;
  groupByField?: string;
  aggregation: AggregationType;
  aggregateField?: string;
  filterGroup?: FilterGroup;
  targetId?: string;
  size?: WidgetSize;
  height?: number;
  // runtime
  data?: any[];
  total?: number;
  loading?: boolean;
  error?: string;
}

interface AnalyticsView {
  id: string;
  name: string;
  config: any;
  isPinned: boolean;
  createdAt: string;
  updatedAt: string;
}

interface AnalyticsTarget {
  id: string;
  name: string;
  moduleId: string;
  metricType: string;
  aggregation: string;
  aggregateField?: string;
  targetValue: number;
  currentValue?: number;
  period: string;
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

const CHART_COLORS = ["#3b82f6", "#8b5cf6", "#10b981", "#f59e0b", "#ef4444", "#06b6d4", "#ec4899", "#f97316"];

const CHART_TYPE_OPTIONS: { value: ChartType; label: string; icon: string }[] = [
  { value: "bar", label: "Bar Chart", icon: "📊" },
  { value: "pie", label: "Pie Chart", icon: "🥧" },
  { value: "line", label: "Line Chart", icon: "📈" },
  { value: "area", label: "Area Chart", icon: "🏔️" },
  { value: "kpi", label: "KPI Card", icon: "🔢" },
  { value: "stat", label: "Stat Card", icon: "📌" },
  { value: "table", label: "Data Table", icon: "📋" },
  { value: "target", label: "Target Tracker", icon: "🎯" },
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
      return ["is", "is_not", "empty", "not_empty"];
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
  return { id: crypto.randomUUID(), logic: "AND", conditions: [], groups: [] };
}
function newCondition(fieldName = ""): FilterCondition {
  return { id: crypto.randomUUID(), field: fieldName, operator: "is", value: "" };
}

// ── Toast ──────────────────────────────────────────────────────────────────

function useToast() {
  const [toasts, setToasts] = useState<{ id: string; msg: string; type: "success" | "error" }[]>([]);
  const show = useCallback((msg: string, type: "success" | "error" = "success") => {
    const id = crypto.randomUUID();
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
                  ? "bg-blue-600 text-white"
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
            <SelectItem key={f.name} value={f.name} className="text-xs">
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
  aggregation: AggregationType;
  aggregateField: string;
  filterGroup: FilterGroup;
  targetId: string;
}

function WidgetBuilderDialog({
  open, onClose, onSave, modules, targets, initial, savedFilters, onSaveSavedFilter,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (w: Omit<Widget, "id">) => void;
  modules: any[];
  targets: AnalyticsTarget[];
  initial?: Widget;
  savedFilters: SavedFilter[];
  onSaveSavedFilter: (name: string, filterGroup: FilterGroup) => void;
}) {
  const [draft, setDraft] = useState<WidgetDraft>({
    title: initial?.title || "",
    type: initial?.type || "bar",
    moduleId: initial?.moduleId || "",
    groupByField: initial?.groupByField || "",
    aggregation: initial?.aggregation || "COUNT",
    aggregateField: initial?.aggregateField || "",
    filterGroup: initial?.filterGroup || newGroup(),
    targetId: initial?.targetId || "",
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
    ["DROPDOWN", "STATUS", "RADIO", "BOOLEAN", "TEXT", "NUMBER", "DATE"].includes(f.type)
  );

  const set = (k: keyof WidgetDraft, v: any) => setDraft((d) => ({ ...d, [k]: v }));

  const handleSave = () => {
    onSave({
      title: draft.title || CHART_TYPE_OPTIONS.find((c) => c.value === draft.type)?.label || "Widget",
      type: draft.type,
      moduleId: draft.moduleId,
      groupByField: draft.groupByField || undefined,
      aggregation: draft.aggregation,
      aggregateField: draft.aggregateField || undefined,
      filterGroup: draft.filterGroup,
      targetId: draft.targetId || undefined,
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
            <div className="grid grid-cols-4 gap-2">
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

          {/* Module */}
          <div className="space-y-1.5">
            <Label className="text-xs">Module</Label>
            <Select value={draft.moduleId} onValueChange={(v) => { set("moduleId", v); set("groupByField", ""); set("aggregateField", ""); }}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Select module" />
              </SelectTrigger>
              <SelectContent>
                {modules.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.icon} {m.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {draft.type === "target" ? (
            <div className="space-y-1.5">
              <Label className="text-xs">Target</Label>
              <Select value={draft.targetId} onValueChange={(v) => set("targetId", v)}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Select target" />
                </SelectTrigger>
                <SelectContent>
                  {targets.filter((t) => t.moduleId === draft.moduleId || !draft.moduleId).map((t) => (
                    <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <>
              {/* Group By */}
              {["bar", "pie", "line", "area", "table"].includes(draft.type) && (
                <div className="space-y-1.5">
                  <Label className="text-xs">Group By Field</Label>
                  <Select value={draft.groupByField || "__none__"} onValueChange={(v) => set("groupByField", v === "__none__" ? "" : v)} disabled={!draft.moduleId}>
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Select field" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">— No grouping (total count) —</SelectItem>
                      {groupByFields.map((f) => (
                        <SelectItem key={f.name} value={f.name}>{f.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
                          <SelectItem key={f.name} value={f.name}>{f.label}</SelectItem>
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
                          const loaded: FilterGroup = { id: crypto.randomUUID(), logic: sf.logic, conditions: sf.conditions.map(c => ({ ...c, id: crypto.randomUUID() })), groups: [] };
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
          <Button onClick={handleSave} disabled={!draft.moduleId && draft.type !== "target"}>
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
                  <SelectContent>{modules.map((m) => <SelectItem key={m.id} value={m.id} className="text-xs">{m.icon} {m.name}</SelectItem>)}</SelectContent>
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
                  <SelectContent>{numericFields.map((f: Field) => <SelectItem key={f.name} value={f.name} className="text-xs">{f.label}</SelectItem>)}</SelectContent>
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

function KpiWidget({ total, compact }: { total: number; compact?: boolean }) {
  if (compact) {
    return (
      <div className="flex flex-col items-center justify-center py-5">
        <p className="text-3xl font-bold text-blue-600">{total.toLocaleString()}</p>
        <p className="text-gray-400 mt-1 text-xs">Total</p>
      </div>
    );
  }
  return (
    <div className="flex flex-col items-center justify-center py-8">
      <p className="text-5xl font-bold text-blue-600">{total.toLocaleString()}</p>
      <p className="text-gray-500 mt-2 text-sm">Total records</p>
    </div>
  );
}

function StatWidget({ data, total }: { data: any[]; total: number }) {
  const top = data[0];
  return (
    <div className="py-4 space-y-4">
      <div className="flex items-end gap-3">
        <span className="text-4xl font-bold text-gray-900">{total.toLocaleString()}</span>
        <span className="text-sm text-gray-500 mb-1">total</span>
      </div>
      {top && (
        <div className="text-xs text-gray-500">
          Top: <span className="font-medium text-gray-700">{top.name}</span> ({top.value})
        </div>
      )}
      <div className="space-y-1.5">
        {data.slice(0, 5).map((d, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
              <div className="h-full rounded-full" style={{ width: `${total ? (d.value / total) * 100 : 0}%`, backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} />
            </div>
            <span className="text-xs text-gray-600 w-24 truncate">{d.name}</span>
            <span className="text-xs font-medium text-gray-700 w-8 text-right">{d.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function TargetWidget({ target }: { target?: AnalyticsTarget }) {
  if (!target) return <div className="text-center py-8 text-gray-400 text-sm">Target not found</div>;
  const current = target.currentValue ?? 0;
  const pct = Math.round((current / target.targetValue) * 100);
  const color = pct >= 100 ? "#10b981" : pct >= 70 ? "#f59e0b" : "#3b82f6";

  return (
    <div className="py-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-3xl font-bold text-gray-900">{current.toLocaleString()}</p>
          <p className="text-xs text-gray-500 mt-0.5">of {target.targetValue.toLocaleString()} target</p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold" style={{ color }}>{pct}%</p>
          <p className="text-xs text-gray-500">{target.period}</p>
        </div>
      </div>
      <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(100, pct)}%`, backgroundColor: color }} />
      </div>
      <div className="flex justify-between text-xs text-gray-500">
        <span>0</span>
        <span className="font-medium" style={{ color }}>
          {pct >= 100 ? "✓ Target achieved!" : `${target.targetValue - current} remaining`}
        </span>
        <span>{target.targetValue.toLocaleString()}</span>
      </div>
    </div>
  );
}

function TableWidget({ data }: { data: any[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-gray-100">
            <th className="py-2 px-3 text-left text-gray-500 font-medium">Value</th>
            <th className="py-2 px-3 text-right text-gray-500 font-medium">Count</th>
            <th className="py-2 px-3 text-right text-gray-500 font-medium">%</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => {
            const total = data.reduce((s, r) => s + r.value, 0);
            const pct = total > 0 ? ((row.value / total) * 100).toFixed(1) : "0.0";
            return (
              <tr key={i} className="border-b border-gray-50 hover:bg-gray-50">
                <td className="py-2 px-3">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} />
                    <span className="text-gray-700">{row.name || "—"}</span>
                  </div>
                </td>
                <td className="py-2 px-3 text-right font-medium text-gray-700">{row.value.toLocaleString()}</td>
                <td className="py-2 px-3 text-right text-gray-500">{pct}%</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ── Resize Handle ─────────────────────────────────────────────────────────

const CHART_MIN_H = 150;
const CHART_MAX_H = 700;
const CHART_SNAP  = 25;

function ResizeHandle({
  currentHeight,
  onHeightChange,
}: {
  currentHeight: number;
  onHeightChange: (h: number) => void;
}) {
  const startRef = useRef<{ y: number; h: number } | null>(null);
  const [isResizing, setIsResizing] = useState(false);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    startRef.current = { y: e.clientY, h: currentHeight };
    setIsResizing(true);

    const onMove = (e: MouseEvent) => {
      if (!startRef.current) return;
      const raw = startRef.current.h + (e.clientY - startRef.current.y);
      const snapped = Math.round(Math.max(CHART_MIN_H, Math.min(CHART_MAX_H, raw)) / CHART_SNAP) * CHART_SNAP;
      onHeightChange(snapped);
    };

    const onUp = () => {
      startRef.current = null;
      setIsResizing(false);
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };

    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  };

  return (
    <div
      onMouseDown={handleMouseDown}
      title="Drag to resize height"
      className={cn(
        "absolute inset-x-0 bottom-0 h-4 flex items-center justify-center cursor-ns-resize select-none transition-opacity rounded-b-lg",
        isResizing ? "opacity-100 bg-blue-50/60" : "opacity-0 group-hover:opacity-100"
      )}
    >
      <div className={cn(
        "w-10 h-1 rounded-full transition-colors",
        isResizing ? "bg-blue-400" : "bg-gray-300"
      )} />
    </div>
  );
}

// ── Sortable Wrapper ───────────────────────────────────────────────────────

function SortableWidgetWrapper({
  id, children,
}: {
  id: string;
  children: (dragHandleProps: React.HTMLAttributes<HTMLElement>) => React.ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    position: "relative",
    zIndex: isDragging ? 999 : undefined,
  };
  return (
    <div ref={setNodeRef} style={style}>
      {children({ ...attributes, ...listeners })}
    </div>
  );
}

// ── Widget Card ────────────────────────────────────────────────────────────

function WidgetCard({
  widget, targets, onEdit, onRemove, onRefresh, onClone, onResize, onHeightChange, dragHandleProps,
}: {
  widget: Widget;
  targets: AnalyticsTarget[];
  onEdit: () => void;
  onRemove: () => void;
  onRefresh: () => void;
  onClone: () => void;
  onResize: () => void;
  onHeightChange: (h: number) => void;
  dragHandleProps?: React.HTMLAttributes<HTMLElement>;
}) {
  const data = widget.data || [];
  const total = widget.total ?? data.reduce((s: number, d: any) => s + (d.value || 0), 0);
  const target = targets.find((t) => t.id === widget.targetId);
  const chartHeight = widget.height || 260;

  const renderContent = () => {
    if (widget.loading) {
      return <div className="flex items-center justify-center h-40"><Loader2 className="w-6 h-6 animate-spin text-blue-500" /></div>;
    }
    if (widget.error) {
      return <div className="flex items-center justify-center h-40 text-red-500 text-sm gap-2"><AlertCircle className="w-4 h-4" />{widget.error}</div>;
    }
    if (data.length === 0 && widget.type !== "kpi" && widget.type !== "target") {
      return <div className="flex items-center justify-center h-40 text-gray-400 text-sm">No data</div>;
    }

    switch (widget.type) {
      case "kpi":   return <KpiWidget total={total} compact={widget.size === "1"} />;
      case "stat":  return <StatWidget data={data} total={total} />;
      case "target": return <TargetWidget target={target} />;
      case "table": return <TableWidget data={data} />;
      case "pie":
        return (
          <ResponsiveContainer key={`${widget.id}-${widget.size}`} width="100%" height={chartHeight}>
            <PieChart>
              <Pie data={data} cx="50%" cy="50%" outerRadius={90} dataKey="value"
                label={({ name, percent }: any) => `${name} (${((percent ?? 0) * 100).toFixed(0)}%)`} labelLine={false}>
                {data.map((_: any, i: number) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
              </Pie>
              <Tooltip /><Legend />
            </PieChart>
          </ResponsiveContainer>
        );
      case "line":
        return (
          <ResponsiveContainer key={`${widget.id}-${widget.size}`} width="100%" height={chartHeight}>
            <LineChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Line type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        );
      case "area":
        return (
          <ResponsiveContainer key={`${widget.id}-${widget.size}`} width="100%" height={chartHeight}>
            <AreaChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
              <defs>
                <linearGradient id={`areaGrad-${widget.id}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Area type="monotone" dataKey="value" stroke="#3b82f6" fill={`url(#areaGrad-${widget.id})`} strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        );
      default:
        return (
          <ResponsiveContainer key={`${widget.id}-${widget.size}`} width="100%" height={chartHeight}>
            <BarChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                {data.map((_: any, i: number) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        );
    }
  };

  return (
    <Card className="group relative overflow-hidden">
      <CardHeader className="flex flex-row items-start justify-between pb-2 pt-4 px-5">
        <div>
          <CardTitle className="text-sm font-semibold text-gray-800">{widget.title}</CardTitle>
          {widget.type !== "target" && (
            <p className="text-xs text-gray-400 mt-0.5">
              {widget.aggregation.toLowerCase()} · {widget.groupByField || "all records"}
            </p>
          )}
        </div>
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            {...dragHandleProps}
            className="cursor-grab active:cursor-grabbing p-1.5 rounded text-gray-300 hover:text-gray-500 hover:bg-gray-100 transition-colors"
            title="Drag to reorder"
          >
            <GripVertical className="w-3.5 h-3.5" />
          </button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClone} title="Clone widget">
            <Copy className="w-3.5 h-3.5" />
          </Button>
          <Button
            variant="ghost" size="icon" className="h-7 w-7 relative"
            onClick={onResize}
            title={`Width: ${["25%","50%","75%","100%"][Number(widget.size||"2")-1]} — click to cycle`}
          >
            <span className="text-[10px] font-bold text-gray-500 leading-none">
              {widget.size === "1" ? "¼" : widget.size === "3" ? "¾" : widget.size === "4" ? "■" : "½"}
            </span>
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onRefresh}>
            <RefreshCw className="w-3.5 h-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onEdit}>
            <Settings2 className="w-3.5 h-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7 text-red-400 hover:text-red-600" onClick={onRemove}>
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="px-5 pb-4">
        {renderContent()}
      </CardContent>
      <ResizeHandle currentHeight={chartHeight} onHeightChange={onHeightChange} />
    </Card>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────

export default function AnalyticsPage() {
  const { modules, fetchModules } = useModulesStore();
  const { toasts, show: showToast } = useToast();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const [widgets, setWidgets] = useState<Widget[]>([]);
  const [views, setViews] = useState<AnalyticsView[]>([]);
  const [targets, setTargets] = useState<AnalyticsTarget[]>([]);
  const [savedFilters, setSavedFilters] = useState<SavedFilter[]>([]);

  // Active view tracking
  const [activeView, setActiveView] = useState<AnalyticsView | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  // UI state
  const [showBuilder, setShowBuilder] = useState(false);
  const [editingWidget, setEditingWidget] = useState<Widget | null>(null);
  const [showTargetManager, setShowTargetManager] = useState(false);
  const [showSavedFilters, setShowSavedFilters] = useState(false);
  const [savingView, setSavingView] = useState(false);
  const [savingChanges, setSavingChanges] = useState(false);
  const [viewName, setViewName] = useState("");
  const [showSaveView, setShowSaveView] = useState(false);
  const [renamingView, setRenamingView] = useState<AnalyticsView | null>(null);
  const [renameName, setRenameName] = useState("");

  useEffect(() => {
    fetchModules();
    fetchTargets();
    fetchSavedFilters();
    // Fetch views then auto-restore the last active view from user preferences
    fetchViews().then(async (loadedViews) => {
      try {
        const { data } = await api.get("/user-preferences/analytics_active_view");
        if (data?.value?.viewId) {
          const v = loadedViews.find((x: AnalyticsView) => x.id === data.value.viewId);
          if (v) loadView(v, false); // false = skip saving preference (already persisted)
        }
      } catch {}
    });
  }, [fetchModules]); // eslint-disable-line react-hooks/exhaustive-deps

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

  const loadWidgetData = useCallback(async (widget: Widget): Promise<Widget> => {
    if (widget.type === "target") {
      const t = targets.find((x) => x.id === widget.targetId);
      if (!t) return widget;
      try {
        const { data } = await api.post(`/analytics/targets/${t.id}/compute`);
        setTargets((prev) => prev.map((x) => x.id === t.id ? { ...x, currentValue: data.currentValue } : x));
      } catch {}
      return { ...widget, loading: false };
    }

    try {
      const body: any = {
        aggregation: widget.aggregation,
        aggregateField: widget.aggregateField,
        filterGroup: widget.filterGroup,
      };
      if (widget.groupByField) body.groupByField = widget.groupByField;

      const { data } = await api.post(`/analytics/data/${widget.moduleId}`, body);
      return {
        ...widget,
        data: Array.isArray(data) ? data : (data.data || []),
        total: Array.isArray(data) ? data.reduce((s: number, d: any) => s + d.value, 0) : (data.total ?? data.value ?? 0),
        loading: false,
        error: undefined,
      };
    } catch {
      return { ...widget, loading: false, error: "Failed to load data" };
    }
  }, [targets]);

  const markDirty = () => {
    if (activeView) setHasChanges(true);
  };

  const addWidget = async (draft: Omit<Widget, "id">) => {
    const id = `w-${Date.now()}`;
    const defaultSize: WidgetSize = draft.type === "kpi" ? "1" : draft.type === "table" ? "4" : "2";
    const widget: Widget = { ...draft, id, size: draft.size || defaultSize, loading: true };
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

  const resizeWidget = (id: string) => {
    const cycle: WidgetSize[] = ["1", "2", "4"];
    setWidgets((prev) =>
      prev.map((w) => {
        if (w.id !== id) return w;
        const idx = cycle.indexOf((w.size as WidgetSize) || "2");
        return { ...w, size: cycle[(idx + 1) % cycle.length] };
      })
    );
    markDirty();
  };

  const resizeWidgetHeight = (id: string, height: number) => {
    setWidgets((prev) => prev.map((w) => w.id === id ? { ...w, height } : w));
    if (activeView) setHasChanges(true);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setWidgets((prev) => {
        const oldIdx = prev.findIndex((w) => w.id === active.id);
        const newIdx = prev.findIndex((w) => w.id === over.id);
        return arrayMove(prev, oldIdx, newIdx);
      });
      markDirty();
    }
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
      const { data, total, loading, error, ...rest } = w;
      return rest;
    });

  // Load a saved view onto the canvas
  const loadView = async (view: AnalyticsView, savePreference = true) => {
    const widgetsFromView: Widget[] = (view.config.widgets || []).map((w: any) => ({ ...w, loading: true }));
    setWidgets(widgetsFromView);
    setActiveView(view);
    setHasChanges(false);
    const loaded = await Promise.all(widgetsFromView.map((w) => loadWidgetData(w)));
    setWidgets(loaded);
    if (savePreference) {
      try { await api.put("/user-preferences/analytics_active_view", { value: { viewId: view.id } }); } catch {}
    }
  };

  // Save current state to the active view (update)
  const saveChanges = async () => {
    if (!activeView) return;
    setSavingChanges(true);
    try {
      const updated = await api.patch(`/analytics/views/${activeView.id}`, {
        config: { widgets: widgetsToConfig() },
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

  // Create a new view from current canvas
  const saveAsNewView = async () => {
    if (!viewName.trim()) return;
    setSavingView(true);
    try {
      const { data } = await api.post("/analytics/views", {
        name: viewName,
        config: { widgets: widgetsToConfig() },
      });
      await fetchViews();
      setActiveView(data);
      setHasChanges(false);
      setShowSaveView(false);
      setViewName("");
      showToast(`View "${viewName}" saved`);
    } catch {
      showToast("Failed to save view", "error");
    }
    setSavingView(false);
  };

  const deleteView = async (id: string) => {
    if (!confirm("Delete this saved view?")) return;
    await api.delete(`/analytics/views/${id}`);
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

  const pinnedViews = views.filter(v => v.isPinned);
  const unpinnedViews = views.filter(v => !v.isPinned);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
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

        <div className="flex items-center gap-2 flex-wrap">
          {/* Unsaved Changes: Save button */}
          {activeView && hasChanges && (
            <Button size="sm" className="gap-2 bg-amber-600 hover:bg-amber-700" onClick={saveChanges} disabled={savingChanges}>
              {savingChanges ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save Changes
            </Button>
          )}

          {/* Saved Filters */}
          <Button variant="outline" size="sm" className="gap-2" onClick={() => setShowSavedFilters(true)}>
            <Bookmark className="w-4 h-4" />
            Saved Filters
            {savedFilters.length > 0 && <span className="text-xs text-gray-400">({savedFilters.length})</span>}
          </Button>

          {/* Views Dropdown */}
          {views.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <BookOpen className="w-4 h-4" />
                  Views
                  {pinnedViews.length > 0 && <Pin className="w-3 h-3 text-blue-500" />}
                  <ChevronDown className="w-3 h-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64">
                {pinnedViews.length > 0 && (
                  <>
                    <div className="px-2 py-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wider">Pinned</div>
                    {pinnedViews.map((v) => (
                      <ViewMenuItem key={v.id} view={v} isActive={activeView?.id === v.id}
                        onLoad={() => loadView(v)} onDelete={() => deleteView(v.id)}
                        onTogglePin={() => togglePin(v)} onRename={() => { setRenamingView(v); setRenameName(v.name); }}
                        onClone={() => cloneView(v)} />
                    ))}
                    {unpinnedViews.length > 0 && <DropdownMenuSeparator />}
                  </>
                )}
                {unpinnedViews.length > 0 && (
                  <>
                    {pinnedViews.length > 0 && <div className="px-2 py-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wider">All Views</div>}
                    {unpinnedViews.map((v) => (
                      <ViewMenuItem key={v.id} view={v} isActive={activeView?.id === v.id}
                        onLoad={() => loadView(v)} onDelete={() => deleteView(v.id)}
                        onTogglePin={() => togglePin(v)} onRename={() => { setRenamingView(v); setRenameName(v.name); }}
                        onClone={() => cloneView(v)} />
                    ))}
                  </>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem className="gap-2 text-gray-500 cursor-pointer" onClick={() => { setActiveView(null); setHasChanges(false); setWidgets([]); api.delete("/user-preferences/analytics_active_view").catch(() => {}); }}>
                  <X className="w-3.5 h-3.5" /> Clear canvas
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {/* Save View (as new or update) */}
          {widgets.length > 0 && (
            <Button variant="outline" size="sm" className="gap-2" onClick={() => setShowSaveView(true)}>
              <Save className="w-4 h-4" />
              {activeView ? "Save as New" : "Save View"}
            </Button>
          )}

          <Button variant="outline" size="sm" className="gap-2" onClick={() => setShowTargetManager(true)}>
            <Target className="w-4 h-4" /> Targets
          </Button>

          <Button size="sm" className="gap-2" onClick={() => setShowBuilder(true)}>
            <Plus className="w-4 h-4" /> Add Widget
          </Button>
        </div>
      </div>

      {/* Pinned views quick-access bar */}
      {pinnedViews.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-gray-400 font-medium">Quick access:</span>
          {pinnedViews.map(v => (
            <button key={v.id} onClick={() => loadView(v)}
              className={cn(
                "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-colors border",
                activeView?.id === v.id
                  ? "bg-blue-600 text-white border-blue-600"
                  : "bg-white text-gray-700 border-gray-200 hover:border-blue-300 hover:text-blue-600"
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

      {/* Save View Dialog */}
      <Dialog open={showSaveView} onOpenChange={setShowSaveView}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{activeView ? "Save as New View" : "Save Analytics View"}</DialogTitle>
          </DialogHeader>
          <div className="py-2">
            <Input
              placeholder="View name (e.g. Finance Dashboard)"
              value={viewName}
              onChange={(e) => setViewName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && saveAsNewView()}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSaveView(false)}>Cancel</Button>
            <Button onClick={saveAsNewView} disabled={!viewName.trim() || savingView}>
              {savingView ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Widgets */}
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
                    <BookOpen className="w-4 h-4" /> Load a View <ChevronDown className="w-3 h-3" />
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
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={widgets.map((w) => w.id)} strategy={rectSortingStrategy}>
            <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(4,1fr)", gridAutoFlow: "dense" }}>
              {widgets.map((widget) => (
                <div
                  key={widget.id}
                  className="min-w-0"
                  style={{ gridColumn: `span ${widget.size || (widget.type === "kpi" ? "1" : "2")} / span ${widget.size || (widget.type === "kpi" ? "1" : "2")}` }}
                >
                  <SortableWidgetWrapper id={widget.id}>
                    {(dragHandleProps) => (
                      <WidgetCard
                        widget={widget}
                        targets={targets}
                        onEdit={() => { setEditingWidget(widget); setShowBuilder(true); }}
                        onRemove={() => removeWidget(widget.id)}
                        onRefresh={() => refreshWidget(widget.id)}
                        onClone={() => cloneWidget(widget.id)}
                        onResize={() => resizeWidget(widget.id)}
                        onHeightChange={(h) => resizeWidgetHeight(widget.id, h)}
                        dragHandleProps={dragHandleProps}
                      />
                    )}
                  </SortableWidgetWrapper>
                </div>
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {/* Widget Builder */}
      <WidgetBuilderDialog
        open={showBuilder}
        onClose={() => { setShowBuilder(false); setEditingWidget(null); }}
        onSave={editingWidget ? (draft) => updateWidget(editingWidget.id, draft) : addWidget}
        modules={modules}
        targets={targets}
        initial={editingWidget || undefined}
        savedFilters={savedFilters}
        onSaveSavedFilter={handleSaveSavedFilter}
      />

      {/* Target Manager */}
      <TargetManagerDialog
        open={showTargetManager}
        onClose={() => setShowTargetManager(false)}
        modules={modules}
        targets={targets}
        onRefresh={fetchTargets}
      />

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
    </div>
  );
}

// ── View Menu Item ─────────────────────────────────────────────────────────

function ViewMenuItem({
  view, isActive, onLoad, onDelete, onTogglePin, onRename, onClone,
}: {
  view: AnalyticsView;
  isActive: boolean;
  onLoad: () => void;
  onDelete: () => void;
  onTogglePin: () => void;
  onRename: () => void;
  onClone: () => void;
}) {
  return (
    <div className={cn(
      "flex items-center gap-1 px-2 py-1.5 hover:bg-gray-50 rounded-sm group cursor-pointer",
      isActive && "bg-blue-50"
    )}>
      <button className="flex-1 flex items-center gap-2 text-left min-w-0" onClick={onLoad}>
        {view.isPinned && <Pin className="w-3 h-3 text-blue-500 flex-shrink-0" />}
        <span className={cn("text-sm truncate", isActive && "font-medium text-blue-700")}>{view.name}</span>
        {isActive && <Check className="w-3 h-3 text-blue-600 flex-shrink-0 ml-auto" />}
      </button>
      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
        <button onClick={onTogglePin} className="p-1 rounded hover:bg-gray-200 text-gray-400 hover:text-blue-600" title={view.isPinned ? "Unpin" : "Pin"}>
          {view.isPinned ? <PinOff className="w-3 h-3" /> : <Pin className="w-3 h-3" />}
        </button>
        <button onClick={onClone} className="p-1 rounded hover:bg-gray-200 text-gray-400 hover:text-gray-600" title="Duplicate view">
          <Copy className="w-3 h-3" />
        </button>
        <button onClick={onRename} className="p-1 rounded hover:bg-gray-200 text-gray-400 hover:text-gray-600" title="Rename">
          <Pencil className="w-3 h-3" />
        </button>
        <button onClick={onDelete} className="p-1 rounded hover:bg-gray-200 text-gray-400 hover:text-red-600" title="Delete">
          <Trash2 className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}
