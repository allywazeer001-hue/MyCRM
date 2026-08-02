"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  DndContext, closestCenter,
  KeyboardSensor, PointerSensor, TouchSensor,
  useSensor, useSensors,
} from "@dnd-kit/core";
import type { DragEndEvent } from "@dnd-kit/core";
import {
  SortableContext, sortableKeyboardCoordinates, useSortable,
  verticalListSortingStrategy, arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend,
} from "recharts";
import { api } from "@/lib/api";
import { ModuleIcon } from "@/components/ui/module-icon";
import { useModulesStore } from "@/store/modules.store";
import type { DynamicModule, Field } from "@/store/modules.store";
import { OPERATORS, getOperators, needsValue, isSelectType } from "@/lib/report-filter-operators";
export { OPERATORS, getOperators, needsValue, isSelectType };
import {
  ChevronLeft, ChevronRight, Check, GripVertical, X, Plus, Loader2,
  FileBarChart2, Database, List, SlidersHorizontal, Settings,
  Eye, Save, Download, Play, AlertCircle, FileSpreadsheet,
  BarChart2, PieChart as PieChartIcon, TrendingUp, Printer, Calendar, Clock,
} from "lucide-react";

const CHART_COLORS = ["#3b82f6","#8b5cf6","#10b981","#f59e0b","#ef4444","#06b6d4","#f97316","#84cc16"];

// ——— Types ———

export interface ReportColumn {
  id: string;
  fieldName: string;
  fieldLabel: string;
  fieldType: string;
  alias: string;
  order: number;
}

export interface ReportFilter {
  id: string;
  fieldName: string;
  fieldLabel: string;
  fieldType: string;
  operator: string;
  value: string;
  value2: string;
  conjunction: "AND" | "OR";
}

export interface SavedReport {
  id: string;
  name: string;
  description: string;
  moduleId: string;
  moduleName: string;
  moduleSlug: string;
  columns: ReportColumn[];
  filters: ReportFilter[];
  sortBy: string;
  sortDir: "asc" | "desc";
  groupBy: string;
  pageSize: number;
  styling: { striped: boolean; compact: boolean; showTotals: boolean };
  createdAt: string;
  updatedAt: string;
}

// ——— Filter operator maps ———
// Moved to lib/report-filter-operators.ts, shared with the report viewer's inline filter editor.

// ——— Data helpers ———

export function getFieldValue(row: Record<string, unknown>, fieldName: string): unknown {
  if (row[fieldName] !== undefined) return row[fieldName];
  const nested = row.data as Record<string, unknown> | undefined;
  return nested?.[fieldName] ?? "";
}

export function applyFilters(
  data: Record<string, unknown>[],
  filters: ReportFilter[],
): Record<string, unknown>[] {
  if (!filters.length) return data;
  return data.filter(row => {
    let result = true;
    for (let i = 0; i < filters.length; i++) {
      const f = filters[i];
      const val = getFieldValue(row, f.fieldName);
      const match = checkFilter(val, f);
      result = i === 0 ? match : (f.conjunction === "AND" ? result && match : result || match);
    }
    return result;
  });
}

function checkFilter(val: unknown, f: ReportFilter): boolean {
  const s = String(val ?? "").toLowerCase();
  const v = f.value.toLowerCase();
  switch (f.operator) {
    case "contains":     return s.includes(v);
    case "not_contains": return !s.includes(v);
    case "equals":       return s === v;
    case "not_equals":   return s !== v;
    case "starts_with":  return s.startsWith(v);
    case "ends_with":    return s.endsWith(v);
    case "is_empty":     return !val || s === "";
    case "is_not_empty": return !!val && s !== "";
    case "gt":           return Number(val) > Number(f.value);
    case "lt":           return Number(val) < Number(f.value);
    case "gte":          return Number(val) >= Number(f.value);
    case "lte":          return Number(val) <= Number(f.value);
    case "between":      return Number(val) >= Number(f.value) && Number(val) <= Number(f.value2);
    case "is_true":      return val === true || val === "true" || val === 1;
    case "is_false":     return val === false || val === "false" || !val;
    case "is_today":     return new Date(String(val)).toDateString() === new Date().toDateString();
    case "before":       return new Date(String(val)) < new Date(f.value);
    case "after":        return new Date(String(val)) > new Date(f.value);
    default:             return true;
  }
}

export function applySort(
  data: Record<string, unknown>[],
  sortBy: string,
  sortDir: "asc" | "desc",
) {
  if (!sortBy) return data;
  return [...data].sort((a, b) => {
    const va = String(getFieldValue(a, sortBy) ?? "");
    const vb = String(getFieldValue(b, sortBy) ?? "");
    const cmp = va.localeCompare(vb, undefined, { numeric: true, sensitivity: "base" });
    return sortDir === "asc" ? cmp : -cmp;
  });
}

export function exportCSV(
  name: string,
  columns: ReportColumn[],
  data: Record<string, unknown>[],
) {
  const header = columns.map(c => `"${(c.alias || c.fieldLabel).replace(/"/g, '""')}"`).join(",");
  const rows = data.map(row =>
    columns.map(c => `"${String(getFieldValue(row, c.fieldName) ?? "").replace(/"/g, '""')}"`).join(",")
  );
  const csv = [header, ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${name.replace(/\s+/g, "_")}_${new Date().toISOString().split("T")[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportXLSX(
  name: string,
  columns: ReportColumn[],
  data: Record<string, unknown>[],
) {
  import("xlsx").then(XLSX => {
    const header = columns.map(c => c.alias || c.fieldLabel);
    const rows = data.map(row => columns.map(c => getFieldValue(row, c.fieldName) ?? ""));
    const ws = XLSX.utils.aoa_to_sheet([header, ...rows]);
    ws["!cols"] = columns.map((c, ci) => ({
      wch: Math.max(
        (c.alias || c.fieldLabel).length,
        ...rows.slice(0, 200).map(r => String(r[ci] ?? "").length),
      ) + 2,
    }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Report");
    XLSX.writeFile(wb, `${name.replace(/[^a-z0-9]/gi, "_")}_${new Date().toISOString().split("T")[0]}.xlsx`);
  });
}

// saveReportToStorage removed — reports are now persisted via the backend API.

// ——— SortableColumn item ———

export function SortableCol({ col, onRemove, onAlias }: {
  col: ReportColumn;
  onRemove: (id: string) => void;
  onAlias: (id: string, alias: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: col.id });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 }}
      className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3 py-2"
    >
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab text-gray-300 hover:text-gray-500 touch-none shrink-0"
      >
        <GripVertical className="w-4 h-4" />
      </button>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-gray-800 truncate">{col.fieldLabel}</p>
        <p className="text-[10px] text-gray-400">{col.fieldType}</p>
      </div>
      <input
        type="text"
        placeholder="Header label…"
        value={col.alias}
        onChange={e => onAlias(col.id, e.target.value)}
        className="w-28 text-xs border border-gray-100 rounded-lg px-2 py-1 outline-none focus:border-blue-400 bg-gray-50"
      />
      <button
        onClick={() => onRemove(col.id)}
        className="text-gray-200 hover:text-red-400 transition-colors shrink-0"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

// ——— Step definitions ———

const STEPS = [
  { label: "Module",  Icon: Database },
  { label: "Columns", Icon: List },
  { label: "Filters", Icon: SlidersHorizontal },
  { label: "Options", Icon: Settings },
  { label: "Preview", Icon: Eye },
];

// ——— Main wizard ———

export default function NewReportPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams?.get("edit") ?? null;
  const { modules, fetchModules } = useModulesStore();

  const [step, setStep] = useState(1);

  // Step 1
  const [selectedModule, setSelectedModule] = useState<DynamicModule | null>(null);
  const [fields, setFields] = useState<Field[]>([]);
  const [loadingFields, setLoadingFields] = useState(false);

  // Step 2
  const [columns, setColumns] = useState<ReportColumn[]>([]);

  // Step 3
  const [filters, setFilters] = useState<ReportFilter[]>([]);

  // Step 4
  const [reportName, setReportName] = useState("");
  const [description, setDescription] = useState("");
  const [sortBy, setSortBy] = useState("");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [groupBy, setGroupBy] = useState("");
  const [pageSize, setPageSize] = useState(25);
  const [striped, setStriped] = useState(true);
  const [compact, setCompact] = useState(false);
  const [showTotals, setShowTotals] = useState(false);

  // Step 5
  const [rawData, setRawData] = useState<Record<string, unknown>[]>([]);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [savedId, setSavedId] = useState(() => editId ?? "");

  // Chart & schedule
  const [showChart, setShowChart] = useState(false);
  const [chartType, setChartType] = useState<"bar" | "pie" | "line">("bar");
  const [showScheduleModal, setShowScheduleModal] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(TouchSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  useEffect(() => { fetchModules(); }, [fetchModules]);

  // Pre-populate when editing — load from backend (single source of truth)
  useEffect(() => {
    if (!editId) return;
    api.get(`/reports/${editId}`)
      .then(({ data: report }) => {
        setReportName(report.name ?? "");
        setDescription(report.description ?? "");
        setSortBy(report.sortBy ?? "");
        setSortDir(report.sortDir ?? "asc");
        setGroupBy(report.groupBy ?? "");
        setPageSize(report.pageSize ?? 25);
        setStriped(report.styling?.striped ?? true);
        setCompact(report.styling?.compact ?? false);
        setShowTotals(report.styling?.showTotals ?? false);
        setColumns(report.columns ?? []);
        setFilters(report.filters ?? []);
        setSavedId(report.id);
      })
      .catch(() => {});
  }, [editId]);

  const selectModule = useCallback(async (mod: DynamicModule) => {
    setSelectedModule(mod);
    setLoadingFields(true);
    setColumns([]);
    setFilters([]);
    try {
      const { data } = await api.get(`/modules/${mod.id}`);
      setFields(data.fields ?? []);
    } catch {
      setFields([]);
    }
    setLoadingFields(false);
  }, []);

  // Load module fields when editing — waits for modules list to be ready
  useEffect(() => {
    if (!editId || !modules.length || selectedModule) return;
    api.get(`/reports/${editId}`)
      .then(({ data: report }) => {
        const mod = modules.find(m => m.id === report.moduleId);
        if (!mod) return;
        setSelectedModule(mod);
        setLoadingFields(true);
        api.get(`/modules/${mod.id}`)
          .then(({ data }) => setFields(data.fields ?? []))
          .catch(() => setFields([]))
          .finally(() => setLoadingFields(false));
      })
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editId, modules.length]);

  const addColumn = useCallback((field: Field) => {
    setColumns(prev => {
      if (prev.find(c => c.fieldName === field.name)) return prev;
      return [...prev, {
        id: field.id,
        fieldName: field.name,
        fieldLabel: field.label,
        fieldType: field.type,
        alias: "",
        order: prev.length,
      }];
    });
  }, []);

  const removeColumn = useCallback((id: string) => setColumns(prev => prev.filter(c => c.id !== id)), []);
  const updateAlias = useCallback((id: string, alias: string) =>
    setColumns(prev => prev.map(c => c.id === id ? { ...c, alias } : c)), []);

  const handleDragEnd = useCallback((e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    setColumns(prev => {
      const from = prev.findIndex(c => c.id === active.id);
      const to = prev.findIndex(c => c.id === over.id);
      return arrayMove(prev, from, to);
    });
  }, []);

  const addFilter = useCallback(() => {
    const firstField = fields[0];
    if (!firstField) return;
    const ops = getOperators(firstField.type);
    setFilters(prev => [...prev, {
      id: `f_${Date.now()}`,
      fieldName: firstField.name,
      fieldLabel: firstField.label,
      fieldType: firstField.type,
      operator: ops[0].value,
      value: "",
      value2: "",
      conjunction: "AND",
    }]);
  }, [fields]);

  const updateFilter = useCallback((id: string, patch: Partial<ReportFilter>) =>
    setFilters(prev => prev.map(f => f.id === id ? { ...f, ...patch } : f)), []);

  const changeFilterField = useCallback((filterId: string, fieldName: string) => {
    const field = fields.find(f => f.name === fieldName);
    if (!field) return;
    const ops = getOperators(field.type);
    setFilters(prev => prev.map(f => f.id === filterId ? {
      ...f,
      fieldName: field.name,
      fieldLabel: field.label,
      fieldType: field.type,
      operator: ops[0].value,
      value: "",
      value2: "",
    } : f));
  }, [fields]);

  const removeFilter = useCallback((id: string) => setFilters(prev => prev.filter(f => f.id !== id)), []);

  const runPreview = useCallback(async () => {
    if (!selectedModule) return;
    setPreviewLoading(true);
    setPreviewError("");
    try {
      const { data } = await api.get(`/modules/${selectedModule.id}/records?page=1&limit=200`);
      const records: Record<string, unknown>[] = Array.isArray(data) ? data : (data.data ?? []);
      setRawData(records);
    } catch {
      setPreviewError("Failed to load data. Check your API connection.");
    }
    setPreviewLoading(false);
  }, [selectedModule]);

  const previewData = useMemo(() => {
    let d = applyFilters(rawData, filters);
    d = applySort(d, sortBy, sortDir);
    if (groupBy) {
      d = [...d].sort((a, b) =>
        String(getFieldValue(a, groupBy) ?? "").localeCompare(String(getFieldValue(b, groupBy) ?? ""))
      );
    }
    return d.slice(0, pageSize);
  }, [rawData, filters, sortBy, sortDir, groupBy, pageSize]);

  // Compute grouped data for display
  const groupedRows = useMemo(() => {
    if (!groupBy || previewData.length === 0) return null;
    const groups: { key: string; rows: Record<string, unknown>[] }[] = [];
    const seen: Record<string, number> = {};
    previewData.forEach(row => {
      const key = String(getFieldValue(row, groupBy) ?? "(empty)");
      if (seen[key] === undefined) { seen[key] = groups.length; groups.push({ key, rows: [] }); }
      groups[seen[key]].rows.push(row);
    });
    return groups;
  }, [previewData, groupBy]);

  // Chart data: group counts (or numeric sums for first numeric column)
  const chartData = useMemo(() => {
    if (!groupBy || previewData.length === 0) return [];
    const numericCol = columns.find(c => ["number","currency","percent","integer","decimal","rating","progress"].some(t => c.fieldType.toLowerCase().includes(t)));
    const grouped: Record<string, { count: number; sum: number }> = {};
    previewData.forEach(row => {
      const key = String(getFieldValue(row, groupBy) ?? "(other)");
      if (!grouped[key]) grouped[key] = { count: 0, sum: 0 };
      grouped[key].count += 1;
      if (numericCol) grouped[key].sum += Number(getFieldValue(row, numericCol.fieldName) ?? 0) || 0;
    });
    return Object.entries(grouped).map(([name, v]) => ({
      name: name.length > 15 ? name.slice(0, 14) + "…" : name,
      value: numericCol ? Math.round(v.sum * 100) / 100 : v.count,
      count: v.count,
    }));
  }, [previewData, groupBy, columns]);

  useEffect(() => {
    if (step === 5 && rawData.length === 0 && !previewLoading && !previewError) {
      runPreview();
    }
  }, [step]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSave = useCallback(async () => {
    if (!reportName.trim() || !selectedModule) return;
    setSaving(true);
    const payload = {
      name: reportName.trim(),
      description: description.trim(),
      moduleId: selectedModule.id,
      moduleName: selectedModule.name,
      moduleSlug: selectedModule.slug,
      columns,
      filters,
      sortBy,
      sortDir,
      groupBy,
      pageSize,
      styling: { striped, compact, showTotals },
    };
    try {
      if (savedId) {
        await api.patch(`/reports/${savedId}`, payload);
      } else {
        const { data } = await api.post("/reports", payload);
        setSavedId(data.id);
      }
      setSaved(true);
    } catch {
      // silent — user can retry
    } finally {
      setSaving(false);
    }
  }, [reportName, description, selectedModule, columns, filters, sortBy, sortDir, groupBy, pageSize, striped, compact, showTotals, savedId]);

  const canNext = () => {
    if (step === 1) return !!selectedModule;
    if (step === 2) return columns.length > 0;
    if (step === 4) return reportName.trim().length > 0;
    return true;
  };

  // ——— Render ———
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.push("/apps/report-builder")}
          className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <FileBarChart2 className="w-5 h-5 text-blue-600" />
            {editId ? "Edit Report" : "New Report"}
          </h1>
          <p className="text-sm text-gray-500">Build a dynamic report from your CRM data</p>
        </div>
      </div>

      {/* Step indicator — in Edit mode every step is already populated (the
          existing report's module/columns/filters/etc. all load up front),
          so jumping straight to any step makes sense; in Create mode each
          step still gates on the previous one being filled in. */}
      <div className="flex items-center gap-0 overflow-x-auto pb-1">
        {STEPS.map(({ label, Icon }, i) => {
          const n = i + 1;
          const done = step > n;
          const active = step === n;
          const clickable = !!editId && n !== step;
          const chip = (
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              active  ? "bg-brand text-white" :
              done    ? "text-blue-600" :
                        "text-gray-400"
            } ${clickable ? "hover:bg-gray-100 cursor-pointer" : ""}`}>
              {done ? <Check className="w-3.5 h-3.5" /> : <Icon className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">{label}</span>
            </div>
          );
          return (
            <div key={label} className="flex items-center shrink-0">
              {clickable ? (
                <button type="button" onClick={() => setStep(n)}>{chip}</button>
              ) : chip}
              {i < STEPS.length - 1 && (
                <ChevronRight className={`w-3.5 h-3.5 mx-0.5 ${done ? "text-blue-300" : "text-gray-200"}`} />
              )}
            </div>
          );
        })}
      </div>

      {/* Step content card */}
      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">

        {/* ——— Step 1: Module ——— */}
        {step === 1 && (
          <div className="p-6 space-y-4">
            <p className="text-sm text-gray-500">Select the primary data source for your report</p>
            {modules.length === 0 ? (
              <div className="flex items-center gap-2 text-sm text-gray-400 py-8 justify-center">
                <Loader2 className="w-5 h-5 animate-spin" />Loading modules…
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {modules.filter(m => m.isActive).map(mod => (
                  <button
                    key={mod.id}
                    onClick={() => selectModule(mod)}
                    className={`flex items-center gap-3 p-4 rounded-xl border-2 text-left transition-all ${
                      selectedModule?.id === mod.id
                        ? "border-brand bg-brand/5"
                        : "border-gray-200 hover:border-brand/50 hover:bg-gray-50"
                    }`}
                  >
                    <span className="shrink-0"><ModuleIcon icon={mod.icon} slug={mod.slug} className="w-6 h-6" /></span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">{mod.name}</p>
                      {mod.description && (
                        <p className="text-[10px] text-gray-400 truncate">{mod.description}</p>
                      )}
                    </div>
                    {selectedModule?.id === mod.id && (
                      <Check className="w-4 h-4 text-brand ml-auto shrink-0" />
                    )}
                  </button>
                ))}
              </div>
            )}
            {loadingFields && (
              <div className="flex items-center gap-2 text-sm text-blue-600">
                <Loader2 className="w-4 h-4 animate-spin" />Loading fields…
              </div>
            )}
          </div>
        )}

        {/* ——— Step 2: Columns ——— */}
        {step === 2 && (
          <div className="p-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Available fields */}
              <div>
                <p className="text-sm font-semibold text-gray-700 mb-3">
                  Available Fields <span className="font-normal text-gray-400">({fields.length})</span>
                </p>
                <div className="space-y-1.5 max-h-96 overflow-y-auto pr-1">
                  {fields.map(f => {
                    const selected = columns.some(c => c.fieldName === f.name);
                    return (
                      <button
                        key={f.id}
                        onClick={() => addColumn(f)}
                        disabled={selected}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border text-left transition-all ${
                          selected
                            ? "bg-brand/5 border-blue-200 text-brand cursor-default"
                            : "bg-white border-gray-200 hover:border-brand/50 hover:bg-brand/5 text-gray-800"
                        }`}
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold truncate">{f.label}</p>
                          <p className="text-[10px] text-gray-400">{f.type}</p>
                        </div>
                        {selected
                          ? <Check className="w-3.5 h-3.5 text-brand shrink-0" />
                          : <Plus className="w-3.5 h-3.5 text-gray-300 shrink-0" />}
                      </button>
                    );
                  })}
                </div>
                <button
                  onClick={() => fields.forEach(addColumn)}
                  className="mt-2 text-xs text-blue-500 hover:text-blue-700 transition-colors"
                >
                  Add all fields
                </button>
              </div>

              {/* Selected columns */}
              <div>
                <p className="text-sm font-semibold text-gray-700 mb-3">
                  Report Columns <span className="font-normal text-gray-400">({columns.length})</span>
                </p>
                {columns.length === 0 ? (
                  <div className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center text-gray-400">
                    <p className="text-sm">Click fields on the left to add them</p>
                  </div>
                ) : (
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                  >
                    <SortableContext items={columns.map(c => c.id)} strategy={verticalListSortingStrategy}>
                      <div className="space-y-1.5 max-h-96 overflow-y-auto pr-1">
                        {columns.map(col => (
                          <SortableCol
                            key={col.id}
                            col={col}
                            onRemove={removeColumn}
                            onAlias={updateAlias}
                          />
                        ))}
                      </div>
                    </SortableContext>
                  </DndContext>
                )}
                {columns.length > 0 && (
                  <button
                    onClick={() => setColumns([])}
                    className="mt-2 text-xs text-red-400 hover:text-red-600 transition-colors"
                  >
                    Clear all
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ——— Step 3: Filters ——— */}
        {step === 3 && (
          <div className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500">Add conditions to filter your report data</p>
              <button
                onClick={addFilter}
                disabled={fields.length === 0}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-brand hover:bg-brand-dark text-white text-xs font-semibold rounded-lg transition-colors disabled:opacity-40"
              >
                <Plus className="w-3 h-3" />Add Filter
              </button>
            </div>

            {filters.length === 0 ? (
              <div className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center text-gray-400">
                <SlidersHorizontal className="w-6 h-6 mx-auto mb-2 text-gray-300" />
                <p className="text-sm">No filters — all records will be included</p>
                <button
                  onClick={addFilter}
                  className="mt-2 text-xs text-blue-500 hover:text-blue-700"
                >
                  Add a filter
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {filters.map((f, i) => (
                  <div key={f.id} className="flex items-start gap-2 flex-wrap bg-gray-50 rounded-xl p-3">
                    {/* Conjunction badge */}
                    {i === 0
                      ? <span className="text-[10px] font-bold text-gray-400 bg-gray-200 rounded px-2 py-1 mt-0.5 shrink-0 w-14 text-center">WHERE</span>
                      : (
                        <select
                          value={f.conjunction}
                          onChange={e => updateFilter(f.id, { conjunction: e.target.value as "AND" | "OR" })}
                          className="text-xs font-bold text-blue-700 bg-blue-50 border border-blue-200 rounded-lg px-2 py-1 outline-none shrink-0 w-14"
                        >
                          <option value="AND">AND</option>
                          <option value="OR">OR</option>
                        </select>
                      )
                    }

                    {/* Field */}
                    <select
                      value={f.fieldName}
                      onChange={e => changeFilterField(f.id, e.target.value)}
                      className="flex-1 min-w-28 text-xs border border-gray-200 rounded-lg px-2 py-1.5 outline-none focus:border-blue-400 bg-white"
                    >
                      {fields.map(field => (
                        <option key={field.id} value={field.name}>{field.label}</option>
                      ))}
                    </select>

                    {/* Operator */}
                    <select
                      value={f.operator}
                      onChange={e => updateFilter(f.id, { operator: e.target.value, value: "", value2: "" })}
                      className="min-w-28 text-xs border border-gray-200 rounded-lg px-2 py-1.5 outline-none focus:border-blue-400 bg-white"
                    >
                      {getOperators(f.fieldType).map(op => (
                        <option key={op.value} value={op.value}>{op.label}</option>
                      ))}
                    </select>

                    {/* Value — a real options <select> for dropdown/status/radio fields, so the
                        stored filter value is always the field's actual option value (not
                        whatever text a user free-typed, which may not match stored records at all) */}
                    {needsValue(f.operator) && (
                      isSelectType(f.fieldType) ? (
                        <select
                          value={f.value}
                          onChange={e => updateFilter(f.id, { value: e.target.value })}
                          className="flex-1 min-w-24 text-xs border border-gray-200 rounded-lg px-2 py-1.5 outline-none focus:border-blue-400 bg-white"
                        >
                          <option value="">Select…</option>
                          {(fields.find(fl => fl.name === f.fieldName)?.options ?? []).map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                          ))}
                        </select>
                      ) : (
                        <input
                          type={
                            ["DATE","DATETIME"].includes(f.fieldType.toUpperCase()) ? "date" :
                            ["NUMBER","DECIMAL","CURRENCY","RATING","PROGRESS"].includes(f.fieldType.toUpperCase()) ? "number" :
                            "text"
                          }
                          placeholder="Value…"
                          value={f.value}
                          onChange={e => updateFilter(f.id, { value: e.target.value })}
                          className="flex-1 min-w-24 text-xs border border-gray-200 rounded-lg px-2 py-1.5 outline-none focus:border-blue-400 bg-white"
                        />
                      )
                    )}
                    {f.operator === "between" && (
                      <input
                        type={["DATE","DATETIME"].includes(f.fieldType.toUpperCase()) ? "date" : "number"}
                        placeholder="And…"
                        value={f.value2}
                        onChange={e => updateFilter(f.id, { value2: e.target.value })}
                        className="flex-1 min-w-24 text-xs border border-gray-200 rounded-lg px-2 py-1.5 outline-none focus:border-blue-400 bg-white"
                      />
                    )}

                    <button onClick={() => removeFilter(f.id)} className="text-gray-300 hover:text-red-400 transition-colors mt-1 shrink-0">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ——— Step 4: Options ——— */}
        {step === 4 && (
          <div className="p-6 space-y-6">
            {/* Name & Description */}
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Report Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Monthly Sales Summary"
                  value={reportName}
                  onChange={e => setReportName(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Description</label>
                <textarea
                  placeholder="What is this report for?"
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  rows={2}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-blue-400 resize-none"
                />
              </div>
            </div>

            {/* Sort & Group */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Sort By</label>
                <div className="flex gap-2">
                  <select
                    value={sortBy}
                    onChange={e => setSortBy(e.target.value)}
                    className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-blue-400 bg-white"
                  >
                    <option value="">None</option>
                    {columns.map(c => (
                      <option key={c.id} value={c.fieldName}>{c.alias || c.fieldLabel}</option>
                    ))}
                  </select>
                  <button
                    onClick={() => setSortDir(d => d === "asc" ? "desc" : "asc")}
                    className="px-3 border border-gray-200 rounded-xl text-xs font-semibold text-gray-600 hover:border-gray-300 transition-colors"
                  >
                    {sortDir === "asc" ? "A→Z" : "Z→A"}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Group By</label>
                <select
                  value={groupBy}
                  onChange={e => setGroupBy(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-blue-400 bg-white"
                >
                  <option value="">None</option>
                  {columns.map(c => (
                    <option key={c.id} value={c.fieldName}>{c.alias || c.fieldLabel}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Records per page */}
            <div>
              <p className="text-xs font-semibold text-gray-700 mb-2">Records per page</p>
              <div className="flex gap-2">
                {[10, 25, 50, 100].map(n => (
                  <button
                    key={n}
                    onClick={() => setPageSize(n)}
                    className={`px-4 py-1.5 text-sm rounded-xl border transition-colors ${
                      pageSize === n
                        ? "bg-brand text-white border-brand"
                        : "border-gray-200 text-gray-600 hover:border-brand/50"
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>

            {/* Display options */}
            <div>
              <p className="text-xs font-semibold text-gray-700 mb-3">Display Options</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {([
                  [striped, setStriped, "Striped rows"],
                  [compact, setCompact, "Compact mode"],
                  [showTotals, setShowTotals, "Show totals row"],
                ] as [boolean, (v: boolean) => void, string][]).map(([val, setter, label]) => (
                  <label key={label} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={val}
                      onChange={e => setter(e.target.checked)}
                      className="rounded text-blue-600 border-gray-300"
                    />
                    <span className="text-sm text-gray-700">{label}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ——— Step 5: Preview ——— */}
        {step === 5 && (
          <div className="p-6 space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <p className="text-sm font-semibold text-gray-800">{reportName || "Untitled Report"}</p>
                <p className="text-xs text-gray-400">
                  {selectedModule?.name} · {columns.length} column{columns.length !== 1 ? "s" : ""}
                  {filters.length > 0 ? ` · ${filters.length} filter${filters.length !== 1 ? "s" : ""}` : ""}
                </p>
              </div>
              <button
                onClick={runPreview}
                disabled={previewLoading}
                className="flex items-center gap-1.5 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white text-xs font-semibold rounded-xl transition-colors disabled:opacity-50"
              >
                {previewLoading
                  ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  : <Play className="w-3.5 h-3.5" />}
                {previewLoading ? "Loading…" : "Refresh Data"}
              </button>
            </div>

            {previewError && (
              <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                <p className="text-sm text-red-600">{previewError}</p>
              </div>
            )}

            {previewLoading && (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
              </div>
            )}

            {!previewLoading && rawData.length === 0 && !previewError && (
              <div className="border-2 border-dashed border-gray-200 rounded-xl p-12 text-center text-gray-400">
                <Eye className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                <p className="text-sm">Click &ldquo;Refresh Data&rdquo; to preview your report</p>
              </div>
            )}

            {!previewLoading && rawData.length > 0 && previewData.length === 0 && (
              <div className="text-center py-12 text-gray-400">
                <p className="text-sm">No records match the applied filters</p>
              </div>
            )}

            {!previewLoading && previewData.length > 0 && (
              <>
                {/* Chart toggle toolbar */}
                {groupBy && chartData.length > 0 && (
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      onClick={() => setShowChart(v => !v)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl border transition-colors ${showChart ? "bg-brand text-white border-brand" : "border-gray-200 text-gray-600 hover:border-brand/50"}`}
                    >
                      <BarChart2 className="w-3.5 h-3.5" /> {showChart ? "Hide Chart" : "Show Chart"}
                    </button>
                    {showChart && (
                      <>
                        {([
                          { t: "bar",  label: "Bar",  icon: <BarChart2 className="w-3 h-3" /> },
                          { t: "line", label: "Line", icon: <TrendingUp className="w-3 h-3" /> },
                          { t: "pie",  label: "Pie",  icon: <PieChartIcon className="w-3 h-3" /> },
                        ] as const).map(({ t, label, icon }) => (
                          <button key={t} onClick={() => setChartType(t)}
                            className={`flex items-center gap-1 px-2.5 py-1 text-xs rounded-lg border transition-colors ${chartType === t ? "bg-gray-800 text-white border-gray-800" : "border-gray-200 text-gray-500 hover:border-gray-300"}`}>
                            {icon}{label}
                          </button>
                        ))}
                      </>
                    )}
                  </div>
                )}

                {/* Chart */}
                {showChart && chartData.length > 0 && (
                  <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                    <p className="text-xs font-semibold text-gray-500 mb-3 uppercase tracking-wider">
                      {groupBy ? `Distribution by ${columns.find(c => c.fieldName === groupBy)?.alias || columns.find(c => c.fieldName === groupBy)?.fieldLabel || groupBy}` : "Chart"}
                    </p>
                    <div style={{ height: 260 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        {chartType === "pie" ? (
                          <PieChart>
                            <Pie data={chartData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100}
                              label={({ cx, cy, midAngle, outerRadius, name, percent }: any) => {
                                const RADIAN = Math.PI / 180;
                                const radius = outerRadius + 12;
                                const x = cx + radius * Math.cos(-midAngle * RADIAN);
                                const y = cy + radius * Math.sin(-midAngle * RADIAN);
                                return (
                                  <text x={x} y={y} fontSize={9} fill="#64748b" textAnchor={x > cx ? "start" : "end"} dominantBaseline="central">
                                    {`${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                                  </text>
                                );
                              }}>
                              {chartData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                            </Pie>
                            <Tooltip />
                          </PieChart>
                        ) : chartType === "line" ? (
                          <LineChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                            <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                            <YAxis tick={{ fontSize: 11 }} />
                            <Tooltip />
                            <Line type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={2} dot={{ r: 4 }} />
                          </LineChart>
                        ) : (
                          <BarChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                            <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                            <YAxis tick={{ fontSize: 11 }} />
                            <Tooltip />
                            <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                              {chartData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                            </Bar>
                          </BarChart>
                        )}
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}

                {/* Table — grouped or flat */}
                <div className="overflow-x-auto rounded-xl border border-gray-200 print:border-0">
                  <table className="min-w-full text-xs">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200">
                        <th className="px-3 py-2.5 text-left font-semibold text-gray-400 w-10">#</th>
                        {columns.map(col => (
                          <th key={col.id} className="px-3 py-2.5 text-left font-semibold text-gray-700 whitespace-nowrap">
                            {col.alias || col.fieldLabel}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {groupedRows ? (
                        groupedRows.map(group => (
                          <>
                            <tr key={`g-${group.key}`} className="bg-blue-50 border-b border-blue-100">
                              <td colSpan={columns.length + 1} className="px-3 py-2 font-semibold text-blue-700 text-xs">
                                {columns.find(c => c.fieldName === groupBy)?.alias || columns.find(c => c.fieldName === groupBy)?.fieldLabel || groupBy}: {group.key}
                                <span className="ml-2 text-blue-400 font-normal">({group.rows.length} record{group.rows.length !== 1 ? "s" : ""})</span>
                              </td>
                            </tr>
                            {group.rows.map((row, ri) => (
                              <tr key={`${group.key}-${ri}`} className={`border-b border-gray-100 hover:bg-blue-50/30 transition-colors ${striped && ri % 2 === 1 ? "bg-gray-50/50" : "bg-white"}`}>
                                <td className={`px-3 ${compact ? "py-1.5" : "py-2.5"} text-gray-400 font-mono tabular-nums pl-6`}>{ri + 1}</td>
                                {columns.map(col => (
                                  <td key={col.id} className={`px-3 ${compact ? "py-1.5" : "py-2.5"} text-gray-700 max-w-48 truncate`}>
                                    {String(getFieldValue(row, col.fieldName) ?? "—")}
                                  </td>
                                ))}
                              </tr>
                            ))}
                            {showTotals && (
                              <tr className="bg-gray-50 border-b-2 border-gray-200">
                                <td className="px-3 py-1.5 text-gray-400 pl-6 font-bold text-[10px] uppercase">Σ</td>
                                {columns.map(col => {
                                  const isNum = col.fieldType.match(/number|currency|percent|integer|decimal|rating|progress/i);
                                  if (isNum) {
                                    const sum = group.rows.reduce((acc, r) => acc + (Number(getFieldValue(r, col.fieldName)) || 0), 0);
                                    return <td key={col.id} className="px-3 py-1.5 font-semibold text-gray-700">{sum.toLocaleString()}</td>;
                                  }
                                  return <td key={col.id} className="px-3 py-1.5 text-gray-300">—</td>;
                                })}
                              </tr>
                            )}
                          </>
                        ))
                      ) : (
                        previewData.map((row, i) => (
                          <tr key={i} className={`border-b border-gray-100 hover:bg-blue-50/30 transition-colors ${striped && i % 2 === 1 ? "bg-gray-50/50" : "bg-white"}`}>
                            <td className={`px-3 ${compact ? "py-1.5" : "py-2.5"} text-gray-400 font-mono tabular-nums`}>{i + 1}</td>
                            {columns.map(col => (
                              <td key={col.id} className={`px-3 ${compact ? "py-1.5" : "py-2.5"} text-gray-700 max-w-48 truncate`}>
                                {String(getFieldValue(row, col.fieldName) ?? "—")}
                              </td>
                            ))}
                          </tr>
                        ))
                      )}
                    </tbody>
                    {showTotals && !groupedRows && (
                      <tfoot>
                        <tr className="bg-gray-100 border-t-2 border-gray-200">
                          <td className="px-3 py-2 font-bold text-gray-500">Σ</td>
                          {columns.map(col => {
                            const isNum = col.fieldType.match(/number|currency|percent|integer|decimal|rating|progress/i);
                            if (isNum) {
                              const sum = previewData.reduce((acc, row) => acc + (Number(getFieldValue(row, col.fieldName)) || 0), 0);
                              const avg = sum / previewData.length;
                              return (
                                <td key={col.id} className="px-3 py-2 font-bold text-gray-800" title={`avg: ${avg.toFixed(2)}`}>
                                  {sum.toLocaleString()}
                                </td>
                              );
                            }
                            return <td key={col.id} className="px-3 py-2 text-gray-400">{previewData.length} rows</td>;
                          })}
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>
                <p className="text-xs text-gray-400 text-right">
                  Showing {previewData.length} of {rawData.length} records
                  {groupBy && groupedRows && ` · ${groupedRows.length} group${groupedRows.length !== 1 ? "s" : ""}`}
                </p>
              </>
            )}

            {/* Schedule Modal stub */}
            {showScheduleModal && (
              <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center" onClick={() => setShowScheduleModal(false)}>
                <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-sm w-full mx-4" onClick={e => e.stopPropagation()}>
                  <div className="text-center">
                    <div className="w-16 h-16 bg-amber-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                      <Clock className="w-8 h-8 text-amber-500" />
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 mb-2">Scheduled Reports</h3>
                    <p className="text-sm text-gray-500 mb-4">
                      Schedule this report to be delivered automatically via email — daily, weekly, or monthly.
                    </p>
                    <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-700 font-medium">
                      🚧 Coming soon — configure SMTP settings first
                    </div>
                    <button onClick={() => setShowScheduleModal(false)}
                      className="mt-4 px-5 py-2 bg-gray-800 text-white text-sm font-semibold rounded-xl hover:bg-gray-700 transition-colors">
                      Got it
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Saved banner */}
            {saved && (
              <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-xl px-4 py-3">
                <Check className="w-5 h-5 text-green-600 shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-green-700">Report saved!</p>
                  <button
                    onClick={() => router.push(`/apps/report-builder/${savedId}`)}
                    className="text-xs text-green-600 hover:text-green-800 underline"
                  >
                    View full report →
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => step > 1 ? setStep(s => s - 1) : router.push("/apps/report-builder")}
          className="flex items-center gap-2 px-4 py-2 text-sm text-gray-600 hover:text-gray-900 rounded-xl border border-gray-200 hover:border-gray-300 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          {step > 1 ? "Back" : "Cancel"}
        </button>

        {step < 5 ? (
          <button
            onClick={() => canNext() && setStep(s => s + 1)}
            disabled={!canNext()}
            className="flex items-center gap-2 px-5 py-2 bg-brand hover:bg-brand-dark text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Next <ChevronRight className="w-4 h-4" />
          </button>
        ) : (
          <div className="flex items-center gap-2 flex-wrap">
            {previewData.length > 0 && (
              <>
                <button
                  onClick={() => exportCSV(reportName || "report", columns, previewData)}
                  className="flex items-center gap-1.5 px-4 py-2 border border-gray-200 hover:border-gray-300 text-gray-600 text-sm font-semibold rounded-xl transition-colors"
                >
                  <Download className="w-4 h-4" />CSV
                </button>
                <button
                  onClick={() => exportXLSX(reportName || "report", columns, previewData)}
                  className="flex items-center gap-1.5 px-4 py-2 border border-emerald-200 hover:border-emerald-300 text-emerald-700 text-sm font-semibold rounded-xl transition-colors"
                >
                  <FileSpreadsheet className="w-4 h-4" />Excel
                </button>
                <button
                  onClick={() => window.print()}
                  className="flex items-center gap-1.5 px-4 py-2 border border-gray-200 hover:border-gray-300 text-gray-600 text-sm font-semibold rounded-xl transition-colors print:hidden"
                >
                  <Printer className="w-4 h-4" />Print PDF
                </button>
                <button
                  onClick={() => setShowScheduleModal(true)}
                  className="flex items-center gap-1.5 px-4 py-2 border border-purple-200 hover:border-purple-300 text-purple-700 text-sm font-semibold rounded-xl transition-colors"
                >
                  <Clock className="w-4 h-4" />Schedule
                </button>
              </>
            )}
            <button
              onClick={handleSave}
              disabled={!reportName.trim() || saving}
              className="flex items-center gap-2 px-5 py-2 bg-brand hover:bg-brand-dark text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {editId ? "Update Report" : "Save Report"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
