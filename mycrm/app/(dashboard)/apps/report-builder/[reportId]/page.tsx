"use client";
import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { api } from "@/lib/api";
import {
  FileBarChart2, ChevronLeft, ChevronRight, Loader2, AlertCircle,
  RefreshCw, Pencil, Search, Database, Filter, ArrowUpDown,
  Layers, Download, FileSpreadsheet, ChevronDown,
} from "lucide-react";
import {
  applyFilters, applySort, exportCSV, exportXLSX, getFieldValue,
  type SavedReport,
} from "../new/page";

// loadReport removed — reports are loaded from the backend API.

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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [exportOpen, setExportOpen] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const exportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const before = () => setIsPrinting(true);
    const after = () => setIsPrinting(false);
    window.addEventListener("beforeprint", before);
    window.addEventListener("afterprint", after);
    return () => { window.removeEventListener("beforeprint", before); window.removeEventListener("afterprint", after); };
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (exportRef.current && !exportRef.current.contains(e.target as Node)) setExportOpen(false);
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
      })
      .catch(() => {
        if (!cancelled) {
          setError("Report not found or you do not have access.");
          setLoading(false);
        }
      });
    return () => { cancelled = true; };
  }, [reportId, fetchData]);

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

  const generatedDate = new Date().toLocaleDateString("en-US", { day: "numeric", month: "long", year: "numeric" });

  return (
    <div className="space-y-5">

      {/* ── Print-only header ── */}
      <div className="hidden print:block mb-6">
        <div className="border-b-2 border-gray-800 pb-4 mb-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-1">CORE — Report</p>
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

      {/* Top nav bar — hidden when printing */}
      <div className="flex items-center justify-between gap-3 flex-wrap print:hidden">
        <button
          onClick={() => router.push("/apps/report-builder")}
          className="flex items-center gap-1.5 p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors shrink-0"
        >
          <ChevronLeft className="w-4 h-4" />
          <span className="text-sm font-medium">Reports</span>
        </button>
        <div className="flex items-center gap-2">
          <button
            onClick={() => report && fetchData(report)}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 hover:border-gray-300 text-gray-600 text-xs font-semibold rounded-xl transition-colors disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
            Refresh
          </button>

          {/* Export dropdown */}
          <div className="relative" ref={exportRef}>
            <button
              onClick={() => setExportOpen(o => !o)}
              disabled={filteredData.length === 0}
              className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 hover:border-gray-300 text-gray-600 text-xs font-semibold rounded-xl transition-colors disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" />
              Export
              <ChevronDown className="w-3 h-3 ml-0.5" />
            </button>
            {exportOpen && (
              <div className="absolute right-0 top-full mt-1.5 w-44 bg-white border border-gray-200 rounded-xl shadow-lg z-20 overflow-hidden">
                <button
                  onClick={() => { exportCSV(report.name, columns, filteredData); setExportOpen(false); }}
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <Download className="w-3.5 h-3.5 text-gray-400" />
                  Download CSV
                </button>
                <button
                  onClick={() => { exportXLSX(report.name, columns, filteredData); setExportOpen(false); }}
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 transition-colors border-t border-gray-100"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-500" />
                  Download Excel
                </button>
              </div>
            )}
          </div>

          <button
            onClick={() => router.push(`/apps/report-builder/new?edit=${reportId}`)}
            className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl transition-colors"
          >
            <Pencil className="w-3.5 h-3.5" />Edit
          </button>
        </div>
      </div>

      {/* ── Report Header Section (screen only) ── */}
      <div className="bg-gradient-to-br from-blue-50 via-white to-indigo-50 border border-blue-100 rounded-2xl p-6 print:hidden">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="space-y-2 flex-1 min-w-0">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center shrink-0">
                <FileBarChart2 className="w-4.5 h-4.5 text-white" />
              </div>
              <h1 className="text-xl font-bold text-gray-900 truncate">{report.name}</h1>
            </div>
            {report.description && (
              <p className="text-sm text-gray-600 ml-11">{report.description}</p>
            )}
            <div className="flex items-center gap-3 flex-wrap ml-11 mt-1">
              <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                <Database className="w-3 h-3" />{report.moduleName}
              </span>
              <span className="text-gray-300">·</span>
              <span className="text-xs text-gray-500">{columns.length} column{columns.length !== 1 ? "s" : ""}</span>
              {report.filters.length > 0 && (
                <>
                  <span className="text-gray-300">·</span>
                  <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                    <Filter className="w-3 h-3" />{report.filters.length} filter{report.filters.length !== 1 ? "s" : ""}
                  </span>
                </>
              )}
              {sortLabel && (
                <>
                  <span className="text-gray-300">·</span>
                  <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                    <ArrowUpDown className="w-3 h-3" />
                    {sortLabel.alias || sortLabel.fieldLabel} ({report.sortDir === "asc" ? "A→Z" : "Z→A"})
                  </span>
                </>
              )}
              {groupLabel && (
                <>
                  <span className="text-gray-300">·</span>
                  <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                    <Layers className="w-3 h-3" />Grouped by {groupLabel.alias || groupLabel.fieldLabel}
                  </span>
                </>
              )}
            </div>
          </div>
          <div className="shrink-0 text-right">
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Generated</p>
            <p className="text-sm font-semibold text-gray-700 mt-0.5">
              {new Date().toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" })}
            </p>
            {!loading && (
              <p className="text-xs text-gray-500 mt-1">
                <span className="font-bold text-gray-800 text-sm">{filteredData.length.toLocaleString()}</span>
                <span className="ml-1">record{filteredData.length !== 1 ? "s" : ""}</span>
              </p>
            )}
          </div>
        </div>

        {/* Filter chips */}
        {report.filters.length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap mt-4 pt-4 border-t border-blue-100">
            <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mr-1">Filters:</span>
            {report.filters.map((f, i) => (
              <span key={f.id} className="flex items-center gap-1">
                {i > 0 && (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-100 text-blue-600">
                    {f.conjunction}
                  </span>
                )}
                <span className="text-[10px] px-2.5 py-1 rounded-lg bg-white border border-blue-200 text-gray-600 font-medium shadow-sm">
                  {f.fieldLabel} <span className="text-gray-400">{operatorLabel(f.operator)}</span>
                  {f.value ? ` "${f.value}"` : ""}
                  {f.value2 ? ` — "${f.value2}"` : ""}
                </span>
              </span>
            ))}
          </div>
        )}
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
                  {columns.map(col => (
                    <th key={col.id} className="px-4 py-3 text-left font-semibold text-gray-700 whitespace-nowrap">
                      {col.alias || col.fieldLabel}
                    </th>
                  ))}
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
