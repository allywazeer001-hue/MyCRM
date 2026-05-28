"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  FileBarChart2, Plus, Trash2, Play, Pencil, Clock, Search,
} from "lucide-react";

interface SavedReport {
  id: string;
  name: string;
  description?: string;
  moduleName: string;
  columns: { fieldLabel: string; alias?: string }[];
  filters: unknown[];
  createdAt: string;
  updatedAt: string;
}

function loadReports(): SavedReport[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem("crm_reports") ?? "[]"); } catch { return []; }
}

export default function ReportBuilderPage() {
  const router = useRouter();
  const [reports, setReports] = useState<SavedReport[]>([]);
  const [query, setQuery] = useState("");

  useEffect(() => { setReports(loadReports()); }, []);

  const handleDelete = (id: string, name: string) => {
    if (!confirm(`Delete report "${name}"? This cannot be undone.`)) return;
    const updated = loadReports().filter(r => r.id !== id);
    localStorage.setItem("crm_reports", JSON.stringify(updated));
    setReports(updated);
  };

  const filtered = reports.filter(r =>
    !query.trim() || r.name.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <FileBarChart2 className="w-5 h-5 text-blue-600" />
            Reports
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {reports.length > 0
              ? `${reports.length} saved report${reports.length !== 1 ? "s" : ""}`
              : "Build dynamic reports from your CRM data"}
          </p>
        </div>
        <button
          onClick={() => router.push("/apps/report-builder/new")}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold rounded-xl transition-colors"
        >
          <Plus className="w-4 h-4" />New Report
        </button>
      </div>

      {/* Search */}
      {reports.length > 0 && (
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Search reports…"
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="w-full pl-10 pr-3 py-2 border border-gray-200 rounded-xl text-sm placeholder-gray-400 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20"
          />
        </div>
      )}

      {/* Empty state */}
      {reports.length === 0 && (
        <div className="border border-dashed border-gray-200 rounded-2xl p-16 text-center bg-gray-50">
          <FileBarChart2 className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-lg font-semibold text-gray-500 mb-1">No reports yet</p>
          <p className="text-sm text-gray-400 mb-5">Build dynamic reports from your CRM modules</p>
          <button
            onClick={() => router.push("/apps/report-builder/new")}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold rounded-xl transition-colors"
          >
            <Plus className="w-4 h-4" />Build a Report
          </button>
        </div>
      )}

      {/* No search results */}
      {reports.length > 0 && filtered.length === 0 && (
        <div className="text-center py-12">
          <Search className="w-8 h-8 text-gray-300 mx-auto mb-2" />
          <p className="text-sm text-gray-400">No reports match your search</p>
          <button onClick={() => setQuery("")} className="text-xs text-blue-500 hover:text-blue-700 mt-1">
            Clear
          </button>
        </div>
      )}

      {/* Reports grid */}
      {filtered.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(r => (
            <div
              key={r.id}
              className="group bg-white border border-gray-200 rounded-2xl p-5 flex flex-col gap-3 hover:border-blue-300 hover:shadow-md transition-all"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0">
                  <FileBarChart2 className="w-4 h-4 text-blue-600" />
                </div>
                <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-blue-50 text-blue-600 border border-blue-100">
                  {r.moduleName}
                </span>
              </div>

              <div className="flex-1 space-y-1">
                <h3 className="font-semibold text-gray-900 text-sm group-hover:text-blue-700 transition-colors leading-snug">
                  {r.name}
                </h3>
                {r.description && (
                  <p className="text-xs text-gray-500 line-clamp-2">{r.description}</p>
                )}
                <p className="text-[10px] text-gray-400">
                  {r.columns.length} column{r.columns.length !== 1 ? "s" : ""}
                  {r.filters.length > 0 ? ` · ${r.filters.length} filter${r.filters.length !== 1 ? "s" : ""}` : ""}
                </p>
                <p className="text-[10px] text-gray-400 flex items-center gap-1">
                  <Clock className="w-2.5 h-2.5" />
                  {new Date(r.updatedAt).toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" })}
                </p>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => router.push(`/apps/report-builder/${r.id}`)}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg transition-colors"
                >
                  <Play className="w-3 h-3" />Run
                </button>
                <button
                  onClick={() => router.push(`/apps/report-builder/new?edit=${r.id}`)}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold rounded-lg transition-colors"
                >
                  <Pencil className="w-3 h-3" />Edit
                </button>
                <button
                  onClick={() => handleDelete(r.id, r.name)}
                  className="flex items-center justify-center px-3 py-2 bg-gray-100 hover:bg-red-50 hover:text-red-500 text-gray-400 rounded-lg transition-colors"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
