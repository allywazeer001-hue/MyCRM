"use client";
import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor, TouchSensor, useSensor, useSensors,
} from "@dnd-kit/core";
import type { DragEndEvent } from "@dnd-kit/core";
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, arrayMove } from "@dnd-kit/sortable";
import { api } from "@/lib/api";
import { BRAND } from "@/lib/core-brand";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Field } from "@/store/modules.store";
import { getOperators, needsValue, isSelectType } from "@/lib/report-filter-operators";
import {
  applyFilters, applySort, exportCSV, exportXLSX, getFieldValue, SortableCol,
  type SavedReport, type ReportFilter,
} from "../new/page";
import {
  FileBarChart2, ArrowLeft, ChevronLeft, ChevronRight, ChevronDown, Loader2, AlertCircle,
  RefreshCw, Search, Filter, ArrowUp, ArrowDown, ArrowUpDown,
  Download, FileSpreadsheet, MoreHorizontal, BarChart3, Settings2,
  Columns3, Plus, X,
} from "lucide-react";

function operatorLabel(op: string): string {
  const map: Record<string, string> = {
    contains: "contains", not_contains: "doesn't contain",
    equals: "=", not_equals: "≠",
    starts_with: "starts with", ends_with: "ends with",
    is_empty: "is empty", is_not_empty: "is not empty",
    gt: ">", lt: "<", gte: "≥", lte: "≤", between: "between",
    before: "before", after: "after",
    is_today: "is today", is_this_week: "is this week", is_this_month: "is this month",
    is_true: "is checked", is_false: "is unchecked",
  };
  return map[op] ?? op.replace(/_/g, " ");
}

export default function ReportViewerPage() {
  const router = useRouter();
  const params = useParams();
  const reportId = params?.reportId as string;

  const [report, setReport] = useState<SavedReport | null>(null);
  const [rawData, setRawData] = useState<Record<string, unknown>[]>([]);
  const [moduleFields, setModuleFields] = useState<Field[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [isPrinting, setIsPrinting] = useState(false);

  // Inline editing — name, columns, filters
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState("");
  const [showColumnsPanel, setShowColumnsPanel] = useState(false);
  const [showFiltersPanel, setShowFiltersPanel] = useState(false);
  const columnsPanelRef = useRef<HTMLDivElement>(null);
  const filtersPanelRef = useRef<HTMLDivElement>(null);
  const patchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(TouchSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  useEffect(() => {
    const before = () => setIsPrinting(true);
    const after = () => setIsPrinting(false);
    window.addEventListener("beforeprint", before);
    window.addEventListener("afterprint", after);
    return () => { window.removeEventListener("beforeprint", before); window.removeEventListener("afterprint", after); };
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (columnsPanelRef.current && !columnsPanelRef.current.contains(e.target as Node)) setShowColumnsPanel(false);
      if (filtersPanelRef.current && !filtersPanelRef.current.contains(e.target as Node)) setShowFiltersPanel(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const fetchData = useCallback(async (rpt: SavedReport) => {
    setLoading(true);
    setError("");
    try {
      const { data } = await api.get(`/modules/${rpt.moduleId}/records?page=1&limit=500`);
      const records: Record<string, unknown>[] = Array.isArray(data) ? data : (data.data ?? []);
      setRawData(records);
    } catch {
      setError("Failed to load report data. Check your API connection.");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    let cancelled = false;
    api.get(`/reports/${reportId}`)
      .then(({ data: rpt }) => {
        if (cancelled) return;
        setReport(rpt as SavedReport);
        fetchData(rpt as SavedReport);
        api.get(`/modules/${rpt.moduleId}`)
          .then(({ data }) => { if (!cancelled) setModuleFields(data.fields ?? []); })
          .catch(() => { if (!cancelled) setModuleFields([]); });
      })
      .catch(() => {
        if (!cancelled) {
          setError("Report not found or you do not have access.");
          setLoading(false);
        }
      });
    return () => { cancelled = true; };
  }, [reportId, fetchData]);

  // Every inline edit (name, columns, filters, sort) updates the on-screen report
  // immediately and persists a partial PATCH shortly after — PATCH /reports/:id
  // accepts any subset of fields, so no need to resend the whole report.
  const patchReport = useCallback((patch: Partial<SavedReport>) => {
    setReport(prev => prev ? { ...prev, ...patch } : prev);
    if (patchTimer.current) clearTimeout(patchTimer.current);
    patchTimer.current = setTimeout(() => {
      api.patch(`/reports/${reportId}`, patch).catch(() => {});
    }, 600);
  }, [reportId]);

  useEffect(() => () => { if (patchTimer.current) clearTimeout(patchTimer.current); }, []);

  const filteredData = useMemo(() => {
    if (!report) return [];
    let d = applyFilters(rawData, report.filters as Parameters<typeof applyFilters>[1]);
    d = applySort(d, report.sortBy, report.sortDir);
    if (report.groupBy) {
      d = [...d].sort((a, b) =>
        String(getFieldValue(a, report.groupBy) ?? "").localeCompare(
          String(getFieldValue(b, report.groupBy) ?? "")
        )
      );
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      d = d.filter(row =>
        report.columns.some(col =>
          String(getFieldValue(row, col.fieldName) ?? "").toLowerCase().includes(q)
        )
      );
    }
    return d;
  }, [rawData, report, search]);

  const totalPages = report ? Math.max(1, Math.ceil(filteredData.length / report.pageSize)) : 1;
  const pageData = useMemo(() => {
    if (!report) return [];
    const start = (page - 1) * report.pageSize;
    return filteredData.slice(start, start + report.pageSize);
  }, [filteredData, page, report]);

  useEffect(() => { setPage(1); }, [search, filteredData.length]);

  // ── Inline column management ──────────────────────────────────────────────
  const addColumn = (field: Field) => {
    if (!report || report.columns.some(c => c.fieldName === field.name)) return;
    patchReport({
      columns: [...report.columns, {
        id: field.id, fieldName: field.name, fieldLabel: field.label,
        fieldType: field.type, alias: "", order: report.columns.length,
      }],
    });
  };
  const removeColumn = (id: string) => {
    if (!report) return;
    patchReport({ columns: report.columns.filter(c => c.id !== id) });
  };
  const updateAlias = (id: string, alias: string) => {
    if (!report) return;
    patchReport({ columns: report.columns.map(c => c.id === id ? { ...c, alias } : c) });
  };
  const handleColumnDragEnd = (e: DragEndEvent) => {
    if (!report) return;
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const from = report.columns.findIndex(c => c.id === active.id);
    const to = report.columns.findIndex(c => c.id === over.id);
    if (from === -1 || to === -1) return;
    patchReport({ columns: arrayMove(report.columns, from, to) });
  };

  // ── Inline sort (click a column header) ───────────────────────────────────
  const handleSortClick = (fieldName: string) => {
    if (!report) return;
    const nextDir: "asc" | "desc" = report.sortBy === fieldName && report.sortDir === "asc" ? "desc" : "asc";
    patchReport({ sortBy: fieldName, sortDir: nextDir });
  };

  // ── Inline filter management ──────────────────────────────────────────────
  const addFilterRow = () => {
    if (!report) return;
    const firstField = moduleFields[0];
    if (!firstField) return;
    const ops = getOperators(firstField.type);
    patchReport({
      filters: [...report.filters, {
        id: `f_${Date.now()}`, fieldName: firstField.name, fieldLabel: firstField.label,
        fieldType: firstField.type, operator: ops[0].value, value: "", value2: "", conjunction: "AND",
      }],
    });
  };
  const updateFilterRow = (id: string, patch: Partial<ReportFilter>) => {
    if (!report) return;
    patchReport({ filters: report.filters.map(f => f.id === id ? { ...f, ...patch } : f) });
  };
  const changeFilterField = (id: string, fieldName: string) => {
    if (!report) return;
    const field = moduleFields.find(f => f.name === fieldName);
    if (!field) return;
    const ops = getOperators(field.type);
    patchReport({
      filters: report.filters.map(f => f.id === id ? {
        ...f, fieldName: field.name, fieldLabel: field.label, fieldType: field.type,
        operator: ops[0].value, value: "", value2: "",
      } : f),
    });
  };
  const removeFilterRow = (id: string) => {
    if (!report) return;
    patchReport({ filters: report.filters.filter(f => f.id !== id) });
  };

  // ── Inline name edit ───────────────────────────────────────────────────────
  const startEditName = () => {
    if (!report) return;
    setNameDraft(report.name);
    setEditingName(true);
  };
  const commitName = () => {
    setEditingName(false);
    const trimmed = nameDraft.trim();
    if (!report || !trimmed || trimmed === report.name) return;
    patchReport({ name: trimmed });
  };

  if (loading && !report) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error && !report) {
    return (
      <div className="flex flex-col items-center gap-4 min-h-64 justify-center text-center">
        <AlertCircle className="w-10 h-10 text-red-400" />
        <p className="text-gray-600">{error}</p>
        <button
          onClick={() => router.push("/apps/report-builder")}
          className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-semibold rounded-xl transition-colors"
        >
          Back to Reports
        </button>
      </div>
    );
  }

  if (!report) return null;

  const { columns, styling } = report;
  const sortLabel = columns.find(c => c.fieldName === report.sortBy);
  const groupLabel = columns.find(c => c.fieldName === report.groupBy);
  const availableFields = moduleFields.filter(f => !columns.some(c => c.fieldName === f.name));

  const generatedDate = new Date().toLocaleDateString("en-US", { day: "numeric", month: "long", year: "numeric" });

  return (
    <div className="space-y-5">

      {/* ── Print-only header ── */}
      <div className="hidden print:block mb-6">
        <div className="border-b-2 border-gray-800 pb-4 mb-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-1">{BRAND.name} — Report</p>
              <h1 className="text-2xl font-bold text-gray-900">{report.name}</h1>
              {report.description && (
                <p className="text-sm text-gray-600 mt-1">{report.description}</p>
              )}
            </div>
            <div className="text-right shrink-0 ml-8">
              <p className="text-xs text-gray-500">Generated</p>
              <p className="text-sm font-semibold text-gray-800">{generatedDate}</p>
            </div>
          </div>
          <div className="flex items-center gap-4 mt-3 text-xs text-gray-500 flex-wrap">
            <span>Module: <strong className="text-gray-800">{report.moduleName}</strong></span>
            <span>Columns: <strong className="text-gray-800">{columns.length}</strong></span>
            <span>Records: <strong className="text-gray-800">{filteredData.length.toLocaleString()}</strong></span>
            {sortLabel && (
              <span>Sorted by: <strong className="text-gray-800">{sortLabel.alias || sortLabel.fieldLabel} ({report.sortDir === "asc" ? "A→Z" : "Z→A"})</strong></span>
            )}
            {groupLabel && (
              <span>Grouped by: <strong className="text-gray-800">{groupLabel.alias || groupLabel.fieldLabel}</strong></span>
            )}
          </div>
        </div>

        {report.filters.length > 0 && (
          <div className="mb-4">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-2">Applied Filters</p>
            <div className="flex flex-wrap gap-1.5">
              {report.filters.map((f, i) => (
                <span key={f.id} className="flex items-center gap-1 text-xs">
                  {i > 0 && (
                    <span className="font-bold text-gray-600 px-1">{f.conjunction}</span>
                  )}
                  <span className="border border-gray-300 rounded px-2 py-0.5 text-gray-700">
                    {f.fieldLabel} {operatorLabel(f.operator)}{f.value ? ` "${f.value}"` : ""}{f.value2 ? ` — "${f.value2}"` : ""}
                  </span>
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Header — mirrors the module record-detail page's layout: back button + icon +
          editable title + inline meta on the left, a couple of buttons and one "More"
          menu on the right, instead of a big colored hero card and many loose buttons. */}
      <div className="flex items-start justify-between gap-4 flex-wrap print:hidden">
        <div className="flex items-start gap-3 min-w-0">
          <Link href="/apps/report-builder">
            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 mt-0.5">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <FileBarChart2 className="w-5 h-5 text-blue-600 shrink-0" />
              {editingName ? (
                <input
                  autoFocus
                  value={nameDraft}
                  onChange={e => setNameDraft(e.target.value)}
                  onBlur={commitName}
                  onKeyDown={e => { if (e.key === "Enter") commitName(); if (e.key === "Escape") setEditingName(false); }}
                  className="text-2xl font-bold text-gray-900 border border-blue-300 rounded-lg px-2 py-0.5 outline-none focus:ring-2 focus:ring-blue-500/20 min-w-0"
                />
              ) : (
                <button
                  onClick={startEditName}
                  title="Click to rename"
                  className="text-2xl font-bold text-gray-900 truncate hover:bg-gray-50 rounded-lg px-1 -mx-1 transition-colors text-left"
                >
                  {report.name}
                </button>
              )}
            </div>
            {report.description && (
              <p className="text-sm text-gray-600 mt-0.5">{report.description}</p>
            )}
            <p className="text-sm text-gray-500 mt-0.5">
              {report.moduleName} · {columns.length} column{columns.length !== 1 ? "s" : ""}
              {report.filters.length > 0 && ` · ${report.filters.length} filter${report.filters.length !== 1 ? "s" : ""}`}
              {sortLabel && ` · sorted by ${sortLabel.alias || sortLabel.fieldLabel} (${report.sortDir === "asc" ? "A→Z" : "Z→A"})`}
              {groupLabel && ` · grouped by ${groupLabel.alias || groupLabel.fieldLabel}`}
              {!loading && ` · ${filteredData.length.toLocaleString()} record${filteredData.length !== 1 ? "s" : ""}`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          {/* Columns panel */}
          <div className="relative" ref={columnsPanelRef}>
            <Button
              variant="outline" size="sm" className="gap-1.5"
              onClick={() => { setShowColumnsPanel(o => !o); setShowFiltersPanel(false); }}
            >
              <Columns3 className="w-4 h-4" />Columns
              <span className="text-xs text-gray-400">({columns.length})</span>
            </Button>
            {showColumnsPanel && (
              <div className="absolute right-0 top-full mt-1.5 w-96 bg-white border border-gray-200 rounded-xl shadow-xl z-20 p-3 max-h-[28rem] overflow-y-auto">
                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wide mb-2">Current Columns — drag to reorder</p>
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleColumnDragEnd}>
                  <SortableContext items={columns.map(c => c.id)} strategy={verticalListSortingStrategy}>
                    <div className="space-y-1.5 mb-3">
                      {columns.map(col => (
                        <SortableCol key={col.id} col={col} onRemove={removeColumn} onAlias={updateAlias} />
                      ))}
                      {columns.length === 0 && (
                        <p className="text-xs text-gray-400 italic text-center py-2">No columns yet — add one below</p>
                      )}
                    </div>
                  </SortableContext>
                </DndContext>

                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wide mb-2 pt-2 border-t border-gray-100">
                  Add a Column ({availableFields.length} available)
                </p>
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {availableFields.length === 0 ? (
                    <p className="text-xs text-gray-400 italic text-center py-2">All fields are already columns</p>
                  ) : (
                    availableFields.map(f => (
                      <button
                        key={f.id}
                        onClick={() => addColumn(f)}
                        className="w-full flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg hover:bg-blue-50 text-left transition-colors"
                      >
                        <span className="min-w-0">
                          <span className="text-xs font-medium text-gray-800 truncate block">{f.label}</span>
                          <span className="text-[10px] text-gray-400">{f.type}</span>
                        </span>
                        <Plus className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Filters panel */}
          <div className="relative" ref={filtersPanelRef}>
            <Button
              variant="outline" size="sm" className="gap-1.5"
              onClick={() => { setShowFiltersPanel(o => !o); setShowColumnsPanel(false); }}
            >
              <Filter className="w-4 h-4" />Filters
              {report.filters.length > 0 && <span className="text-xs text-gray-400">({report.filters.length})</span>}
            </Button>
            {showFiltersPanel && (
              <div className="absolute right-0 top-full mt-1.5 w-[28rem] bg-white border border-gray-200 rounded-xl shadow-xl z-20 p-3 max-h-[28rem] overflow-y-auto space-y-2">
                {report.filters.length === 0 && (
                  <p className="text-xs text-gray-400 italic text-center py-2">No filters — showing all records</p>
                )}
                {report.filters.map((f, i) => (
                  <div key={f.id} className="flex items-start gap-1.5">
                    {i === 0
                      ? <span className="text-[10px] font-bold text-gray-400 bg-gray-100 rounded px-2 py-1.5 mt-0.5 shrink-0 w-14 text-center">WHERE</span>
                      : (
                        <select
                          value={f.conjunction}
                          onChange={e => updateFilterRow(f.id, { conjunction: e.target.value as "AND" | "OR" })}
                          className="text-xs font-bold text-blue-700 bg-blue-50 border border-blue-200 rounded-lg px-2 py-1.5 outline-none shrink-0 w-14"
                        >
                          <option value="AND">AND</option>
                          <option value="OR">OR</option>
                        </select>
                      )
                    }

                    <select
                      value={f.fieldName}
                      onChange={e => changeFilterField(f.id, e.target.value)}
                      className="flex-1 min-w-24 text-xs border border-gray-200 rounded-lg px-2 py-1.5 outline-none focus:border-blue-400 bg-white"
                    >
                      {moduleFields.map(field => (
                        <option key={field.id} value={field.name}>{field.label}</option>
                      ))}
                    </select>

                    <select
                      value={f.operator}
                      onChange={e => updateFilterRow(f.id, { operator: e.target.value, value: "", value2: "" })}
                      className="min-w-24 text-xs border border-gray-200 rounded-lg px-2 py-1.5 outline-none focus:border-blue-400 bg-white"
                    >
                      {getOperators(f.fieldType).map(op => (
                        <option key={op.value} value={op.value}>{op.label}</option>
                      ))}
                    </select>

                    {needsValue(f.operator) && (
                      isSelectType(f.fieldType) ? (
                        <select
                          value={f.value}
                          onChange={e => updateFilterRow(f.id, { value: e.target.value })}
                          className="flex-1 min-w-20 text-xs border border-gray-200 rounded-lg px-2 py-1.5 outline-none focus:border-blue-400 bg-white"
                        >
                          <option value="">Select…</option>
                          {(moduleFields.find(fl => fl.name === f.fieldName)?.options ?? []).map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                          ))}
                        </select>
                      ) : (
                        <input
                          type={
                            ["DATE", "DATETIME"].includes(f.fieldType.toUpperCase()) ? "date" :
                            ["NUMBER", "DECIMAL", "CURRENCY", "RATING", "PROGRESS"].includes(f.fieldType.toUpperCase()) ? "number" :
                            "text"
                          }
                          placeholder="Value…"
                          value={f.value}
                          onChange={e => updateFilterRow(f.id, { value: e.target.value })}
                          className="flex-1 min-w-20 text-xs border border-gray-200 rounded-lg px-2 py-1.5 outline-none focus:border-blue-400 bg-white"
                        />
                      )
                    )}

                    <button onClick={() => removeFilterRow(f.id)} className="text-gray-300 hover:text-red-400 transition-colors mt-1.5 shrink-0">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}

                <button
                  onClick={addFilterRow}
                  disabled={moduleFields.length === 0}
                  className="flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-800 pt-1 disabled:opacity-40"
                >
                  <Plus className="w-3.5 h-3.5" />Add Filter
                </button>
              </div>
            )}
          </div>

          <Button size="sm" className="gap-1.5" onClick={() => router.push(`/analytics?openReportWizard=${reportId}`)}>
            <BarChart3 className="w-4 h-4" />Visualize
          </Button>

          {/* More — everything else, consolidated into one menu (Refresh, Export, advanced settings) */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1.5">
                <MoreHorizontal className="w-4 h-4" />More
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuItem onClick={() => report && fetchData(report)} disabled={loading} className="gap-2 cursor-pointer">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                Refresh
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => exportCSV(report.name, columns, filteredData)} disabled={filteredData.length === 0} className="gap-2 cursor-pointer">
                <Download className="w-4 h-4" />Download CSV
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => exportXLSX(report.name, columns, filteredData)} disabled={filteredData.length === 0} className="gap-2 cursor-pointer">
                <FileSpreadsheet className="w-4 h-4" />Download Excel
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => router.push(`/apps/report-builder/new?edit=${reportId}`)} className="gap-2 cursor-pointer">
                <Settings2 className="w-4 h-4" />More Settings
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Error (non-fatal) */}
      {error && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* Search bar — hidden when printing */}
      {!loading && rawData.length > 0 && (
        <div className="relative max-w-sm print:hidden">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Search records…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-xl text-sm placeholder-gray-400 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20"
          />
        </div>
      )}

      {/* Loading */}
      {loading && rawData.length === 0 && (
        <div className="flex items-center justify-center min-h-48">
          <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
        </div>
      )}

      {/* Empty */}
      {!loading && filteredData.length === 0 && !error && (
        <div className="border border-dashed border-gray-200 rounded-xl p-12 text-center text-gray-400">
          <Search className="w-8 h-8 mx-auto mb-2 text-gray-300" />
          <p className="text-sm">
            {search ? "No records match your search" : "No records found matching the report filters"}
          </p>
          {search && (
            <button onClick={() => setSearch("")} className="text-xs text-blue-500 hover:text-blue-700 mt-1">
              Clear search
            </button>
          )}
        </div>
      )}

      {/* Table */}
      {filteredData.length > 0 && (
        <>
          <div className="overflow-x-auto rounded-2xl border border-gray-200 shadow-sm print:rounded-none print:border-gray-400 print:shadow-none">
            <table className="min-w-full text-xs">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-4 py-3 text-left font-semibold text-gray-400 w-12 tabular-nums">#</th>
                  {columns.map(col => {
                    const isSorted = report.sortBy === col.fieldName;
                    return (
                      <th
                        key={col.id}
                        onClick={() => handleSortClick(col.fieldName)}
                        title="Click to sort"
                        className="px-4 py-3 text-left font-semibold text-gray-700 whitespace-nowrap cursor-pointer hover:bg-gray-100 transition-colors print:cursor-default select-none"
                      >
                        <span className="flex items-center gap-1">
                          {col.alias || col.fieldLabel}
                          {isSorted ? (
                            report.sortDir === "asc"
                              ? <ArrowUp className="w-3 h-3 text-blue-600 print:hidden" />
                              : <ArrowDown className="w-3 h-3 text-blue-600 print:hidden" />
                          ) : (
                            <ArrowUpDown className="w-3 h-3 text-gray-300 print:hidden" />
                          )}
                        </span>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {(isPrinting ? filteredData : pageData).map((row, i) => {
                  const displayData = isPrinting ? filteredData : pageData;
                  const rowNum = isPrinting ? i + 1 : (page - 1) * report.pageSize + i + 1;
                  const isGroupBreak = report.groupBy && i > 0 &&
                    String(getFieldValue(row, report.groupBy)) !==
                    String(getFieldValue(displayData[i - 1], report.groupBy));

                  return (
                    <Fragment key={i}>
                      {report.groupBy && (i === 0 || isGroupBreak) && (
                        <tr className="bg-blue-50 border-y border-blue-100">
                          <td />
                          <td colSpan={columns.length} className="px-4 py-2 text-xs font-bold text-blue-700">
                            {String(getFieldValue(row, report.groupBy) ?? "—")}
                          </td>
                        </tr>
                      )}
                      <tr className={`border-b border-gray-100 hover:bg-blue-50/20 transition-colors ${
                        styling.striped && i % 2 === 1 ? "bg-gray-50/40" : "bg-white"
                      }`}>
                        <td className={`px-4 ${styling.compact ? "py-1.5" : "py-3"} text-gray-400 font-mono tabular-nums`}>
                          {rowNum}
                        </td>
                        {columns.map(col => (
                          <td
                            key={col.id}
                            className={`px-4 ${styling.compact ? "py-1.5" : "py-3"} text-gray-700 max-w-64 truncate`}
                            title={String(getFieldValue(row, col.fieldName) ?? "")}
                          >
                            {String(getFieldValue(row, col.fieldName) ?? "—")}
                          </td>
                        ))}
                      </tr>
                    </Fragment>
                  );
                })}
              </tbody>
              {styling.showTotals && (
                <tfoot>
                  <tr className="bg-gray-100 border-t-2 border-gray-300">
                    <td className="px-4 py-3 font-bold text-gray-500 text-xs">Σ</td>
                    {columns.map(col => {
                      const isNum = ["number","currency","percent","integer"].includes(col.fieldType);
                      if (isNum) {
                        const sum = filteredData.reduce(
                          (acc, r) => acc + (Number(getFieldValue(r, col.fieldName)) || 0), 0
                        );
                        return (
                          <td key={col.id} className="px-4 py-3 text-xs font-bold text-gray-900">
                            {sum.toLocaleString()}
                          </td>
                        );
                      }
                      return <td key={col.id} className="px-4 py-3 text-xs text-gray-400">—</td>;
                    })}
                  </tr>
                </tfoot>
              )}
            </table>
          </div>

          {/* Pagination — hidden when printing */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between print:hidden">
              <p className="text-xs text-gray-400">
                Page {page} of {totalPages} · {filteredData.length.toLocaleString()} records
              </p>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="p-2 rounded-lg border border-gray-200 hover:border-gray-300 text-gray-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                {Array.from({ length: Math.min(7, totalPages) }, (_, i) => {
                  let n: number;
                  if (totalPages <= 7) n = i + 1;
                  else if (page <= 4) n = i + 1;
                  else if (page >= totalPages - 3) n = totalPages - 6 + i;
                  else n = page - 3 + i;
                  return (
                    <button
                      key={n}
                      onClick={() => setPage(n)}
                      className={`w-8 h-8 rounded-lg text-xs font-semibold transition-colors ${
                        page === n
                          ? "bg-blue-600 text-white"
                          : "border border-gray-200 text-gray-500 hover:border-blue-300 hover:text-blue-600"
                      }`}
                    >
                      {n}
                    </button>
                  );
                })}
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="p-2 rounded-lg border border-gray-200 hover:border-gray-300 text-gray-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
