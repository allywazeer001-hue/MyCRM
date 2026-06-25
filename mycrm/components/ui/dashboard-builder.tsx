"use client";
/**
 * DashboardBuilder — free-form 12-column grid workspace powered by react-grid-layout.
 *
 * Features:
 *   • Drag-and-drop reorder (grip handle)
 *   • Drag-to-resize (right / bottom / corner handles)
 *   • Auto-pack / vertical compaction — no empty gaps
 *   • Sections (type="section") as full-width collapsible dividers
 *   • Per-dashboard access control (Share panel)
 */
import { useState, useEffect, useCallback, useRef } from "react";
// react-grid-layout — direct import, width measured via ResizeObserver (reliable in Next.js/Turbopack)
import { ReactGridLayout as _RGL } from "react-grid-layout/legacy";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ReactGridLayout = _RGL as any;
type RGLLayout = any[];
import {
  LayoutDashboard, ChevronDown, ChevronRight, Pencil, Trash2, Check,
  GripVertical, X, Plus, BarChart3, Settings2,
  Star, Loader2, Activity, Grid3X3, Users, FolderOpen, Folder, Search,
  BrainCircuit,
} from "lucide-react";
import { AnalysisPanel, type AnalysisContext } from "@/components/analytics/analysis-panel";
import { Button } from "./button";
import { Input } from "./input";
import { cn } from "@/lib/utils";
import {
  useDashboardStore,
  BUILTIN_WIDGETS,
  type Dashboard,
  type WidgetDef,
  type WidgetType,
} from "@/store/dashboard.store";
import {
  GRID_COLS, GRID_ROW_HEIGHT, getWidgetDims, getWidgetMinDims,
  AnalyticsWidgetBody, loadWidgetData,
  type AnalyticsWidget, type AnalyticsTarget,
} from "@/components/analytics/analytics-widget";
import { useModulesStore } from "@/store/modules.store";
import { useAuthStore } from "@/store/auth.store";
import { usePermissionsStore } from "@/store/permissions.store";
import { api } from "@/lib/api";
import { AccessControlEditor } from "./access-control-editor";

// ── Types ──────────────────────────────────────────────────────────────────────

interface AnalyticsView {
  id: string;
  name: string;
  config: { widgets?: any[] };
  isPinned?: boolean;
  updatedAt: string;
}

const CHART_TYPE_ICONS: Record<string, string> = {
  bar: "📊", pie: "🥧", line: "📈", area: "🏔️",
  kpi: "🔢", stat: "📌", table: "📋", target: "🎯",
};

// ── Grid cells overlay (shown in edit mode) ────────────────────────────────────

function GridCellsOverlay({ cols, rowHeight, rows }: { cols: number; rowHeight: number; rows: number }) {
  return (
    <div
      className="pointer-events-none absolute inset-0 z-0"
      style={{ display: "grid", gridTemplateColumns: `repeat(${cols}, 1fr)`, gridTemplateRows: `repeat(${rows}, ${rowHeight}px)`, gap: "10px", padding: "0" }}
    >
      {Array.from({ length: cols * rows }).map((_, i) => (
        <div key={i} className="rgl-cell" />
      ))}
    </div>
  );
}

// ── Grid helpers ───────────────────────────────────────────────────────────────

function autoPositionWidgets(widgets: WidgetDef[]): WidgetDef[] {
  let cx = 0, cy = 0, rowH = 0;
  return widgets.map(w => {
    if (w.x !== undefined && w.y !== undefined) return w;
    const cols = w.w ?? getWidgetDims(w.type).w;
    const rows = w.h ?? getWidgetDims(w.type).h;
    if (cx + cols > GRID_COLS) { cx = 0; cy += rowH; rowH = 0; }
    const positioned = { ...w, x: cx, y: cy, w: cols, h: rows };
    cx += cols; rowH = Math.max(rowH, rows);
    return positioned;
  });
}

// ── Single live analytics chart ────────────────────────────────────────────────

function AnalyticsChartWidget({ widget }: { widget: WidgetDef }) {
  const viewId   = widget.config.analyticsViewId as string;
  const widgetId = widget.config.analyticsWidgetId as string;
  const [liveWidget, setLiveWidget] = useState<AnalyticsWidget | null>(null);
  const [targets,    setTargets]    = useState<AnalyticsTarget[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [drillDown,  setDrillDown]  = useState<DrillDownState | null>(null);

  useEffect(() => {
    if (!viewId || !widgetId) return;
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const [viewRes, tRes] = await Promise.all([
          api.get(`/analytics/views/${viewId}`),
          api.get("/analytics/targets/list").catch(() => ({ data: [] })),
        ]);
        if (cancelled) return;
        const viewWidgets: any[] = viewRes.data?.config?.widgets ?? [];
        const cfg = viewWidgets.find((w: any) => w.id === widgetId);
        const tgts: AnalyticsTarget[] = tRes.data ?? [];
        setTargets(tgts);
        if (!cfg) {
          setLiveWidget({ id: widget.id, title: widget.title, type: "bar", moduleId: "", aggregation: "COUNT", loading: false, error: "Widget removed from analytics view" });
          return;
        }
        const base: AnalyticsWidget = {
          id: widget.id, title: widget.title,
          type: cfg.type, moduleId: cfg.moduleId, aggregation: cfg.aggregation ?? "COUNT",
          groupByField: cfg.groupByField, secondaryGroupByField: cfg.secondaryGroupByField,
          barMode: cfg.barMode, aggregateField: cfg.aggregateField,
          filterGroup: cfg.filterGroup, targetId: cfg.targetId,
          targetValue: cfg.targetValue,
          w: (widget.w ?? 6) * 2, loading: true,
        };
        const loaded = await loadWidgetData(base, tgts);
        if (!cancelled) setLiveWidget(loaded);
      } catch {
        if (!cancelled) setLiveWidget({ id: widget.id, title: widget.title, type: "bar", moduleId: "", aggregation: "COUNT", loading: false, error: "Failed to load" });
      } finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [viewId, widgetId, widget.w]); // eslint-disable-line

  if (loading || !liveWidget) return <div className="flex items-center justify-center h-full"><Loader2 className="w-5 h-5 animate-spin text-blue-500" /></div>;
  return (
    <>
      <div className="p-3 h-full overflow-hidden">
        <AnalyticsWidgetBody
          widget={liveWidget}
          targets={targets}
          colSpan={(widget.w ?? 6) * 2}
          onSegmentClick={liveWidget.groupByField
            ? (name) => setDrillDown({ moduleId: liveWidget.moduleId, groupByField: liveWidget.groupByField!, segmentName: name, widgetTitle: liveWidget.title })
            : undefined}
        />
      </div>
      {drillDown && (
        <DrillDownModal
          moduleId={drillDown.moduleId}
          groupByField={drillDown.groupByField}
          segmentName={drillDown.segmentName}
          widgetTitle={drillDown.widgetTitle}
          onClose={() => setDrillDown(null)}
        />
      )}
    </>
  );
}

// ── Drill-down modal — filtered records for a clicked chart segment ────────────

interface DrillDownState {
  moduleId: string;
  groupByField: string;
  segmentName: string;
  widgetTitle: string;
}

function DrillDownModal({ moduleId, groupByField, segmentName, widgetTitle, onClose }: DrillDownState & { onClose: () => void }) {
  const modules = useModulesStore(state => state.modules);
  const mod = modules.find(m => m.id === moduleId);
  const [records, setRecords] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loadingRecs, setLoadingRecs] = useState(true);

  useEffect(() => {
    if (!moduleId || !groupByField) return;
    setLoadingRecs(true);
    const fg = JSON.stringify({
      conditions: [{ field: groupByField, operator: "is", value: segmentName }],
      logic: "AND",
    });
    api.get(`/modules/${moduleId}/records?filterGroup=${encodeURIComponent(fg)}&limit=50`)
      .then(r => { setRecords(r.data?.data ?? []); setTotal(r.data?.total ?? 0); })
      .catch(() => setRecords([]))
      .finally(() => setLoadingRecs(false));
  }, [moduleId, groupByField, segmentName]);

  const displayFields = (mod?.fields ?? [])
    .filter(f => !["FILE", "IMAGE", "SIGNATURE", "INLINE_SUBFORM", "LOOKUP", "RELATION"].includes(f.type))
    .slice(0, 6);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 shrink-0">
          <div>
            <p className="text-xs text-gray-400">{widgetTitle}</p>
            <h3 className="font-semibold text-gray-900">
              {segmentName}
              {!loadingRecs && <span className="ml-2 text-sm font-normal text-gray-500">({total} record{total !== 1 ? "s" : ""})</span>}
            </h3>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg transition text-gray-500 hover:text-gray-700">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-auto min-h-0">
          {loadingRecs ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
            </div>
          ) : records.length === 0 ? (
            <div className="flex items-center justify-center h-32 text-gray-400 text-sm">No records found</div>
          ) : (
            <table className="w-full text-sm border-collapse">
              <thead className="sticky top-0 bg-gray-50 z-10">
                <tr>
                  {displayFields.map(f => (
                    <th key={f.id} className="text-left px-4 py-2 text-xs text-gray-500 font-medium border-b border-gray-100 whitespace-nowrap">{f.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {records.map((rec: any, ri: number) => (
                  <tr key={rec.id ?? ri} className="border-b border-gray-50 hover:bg-blue-50/40 transition-colors">
                    {displayFields.map(f => {
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

        {/* Footer */}
        {!loadingRecs && total > 50 && (
          <div className="px-4 py-2 text-xs text-gray-400 border-t border-gray-100 shrink-0">
            Showing 50 of {total} — open the module to see all
          </div>
        )}
      </div>
    </div>
  );
}

// ── Legacy whole-view renderer ─────────────────────────────────────────────────

function AnalyticsViewWidget({ viewId }: { viewId: string }) {
  const [vw, setVw] = useState<AnalyticsWidget[]>([]);
  const [tg, setTg] = useState<AnalyticsTarget[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(false);

  useEffect(() => {
    let c = false; setLoading(true); setError(false);
    (async () => {
      try {
        const [vr, tr] = await Promise.all([api.get(`/analytics/views/${viewId}`), api.get("/analytics/targets/list").catch(() => ({ data: [] }))]);
        if (c) return;
        const raw: any[] = vr.data?.config?.widgets ?? [];
        const tgts = tr.data ?? [];
        setTg(tgts);
        const loaded = await Promise.all(raw.map(w => loadWidgetData({ ...w, loading: true }, tgts)));
        if (!c) setVw(loaded);
      } catch { if (!c) setError(true); }
      finally  { if (!c) setLoading(false); }
    })();
    return () => { c = true; };
  }, [viewId]);

  if (loading) return <div className="flex items-center justify-center h-full"><Loader2 className="w-5 h-5 animate-spin text-blue-500" /></div>;
  if (error || vw.length === 0) return <div className="flex flex-col items-center justify-center h-full gap-1.5 text-gray-400"><BarChart3 className="w-7 h-7 opacity-40" /><p className="text-xs">No charts</p></div>;

  return (
    <div className="p-2 h-full overflow-hidden">
      <div className="grid grid-cols-2 gap-2 h-full">
        {vw.slice(0, 4).map(w => (
          <div key={w.id} className="rounded-lg border border-gray-100 bg-white p-2 flex flex-col min-h-0 overflow-hidden">
            <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide truncate mb-1">{w.title}</p>
            <div className="flex-1 min-h-0 overflow-hidden"><AnalyticsWidgetBody widget={{ ...w, height: undefined }} targets={tg} colSpan={2} /></div>
          </div>
        ))}
        {vw.length > 4 && <div className="rounded-lg border border-dashed border-gray-200 flex items-center justify-center"><p className="text-xs text-gray-400">+{vw.length - 4} more</p></div>}
      </div>
    </div>
  );
}

// ── Built-in widgets ───────────────────────────────────────────────────────────

function BuiltinWidgetContent({ widget }: { widget: WidgetDef }) {
  const { modules } = useModulesStore();
  const [logs, setLogs] = useState<any[]>([]);

  useEffect(() => {
    if (widget.type === "activity_feed") {
      api.get(`/audit?limit=${widget.config.limit ?? 8}`).then(r => setLogs(r.data ?? [])).catch(() => {});
    }
  }, [widget]);

  if (widget.type === "module_grid") return (
    <div className="p-3 grid grid-cols-4 gap-2">
      {modules.slice(0, 8).map((m, i) => {
        const colors = ["bg-blue-500","bg-purple-500","bg-green-500","bg-orange-500","bg-pink-500","bg-teal-500","bg-red-500","bg-indigo-500"];
        return (
          <div key={m.id} className="flex flex-col items-center gap-1 p-2 rounded-xl hover:bg-gray-50 transition cursor-pointer">
            <div className={`w-8 h-8 rounded-lg ${colors[i%colors.length]} bg-opacity-15 flex items-center justify-center text-sm`}>{m.icon||"📦"}</div>
            <span className="text-[10px] text-gray-600 text-center truncate w-full">{m.name}</span>
          </div>
        );
      })}
    </div>
  );

  if (widget.type === "activity_feed") return (
    <div className="p-3 overflow-y-auto h-full space-y-2">
      {logs.length === 0 ? <p className="text-xs text-gray-400 text-center py-4">No activity yet</p>
        : logs.map((log: any) => (
          <div key={log.id} className="flex items-start gap-2.5">
            <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center shrink-0 mt-0.5">
              <span className="text-[9px] font-semibold text-gray-500">{log.user?.firstName?.[0]}{log.user?.lastName?.[0]}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-gray-700 truncate"><span className="font-medium">{log.user?.firstName}</span>{" "}{log.action.replace(/_/g," ").toLowerCase()}</p>
              <p className="text-[10px] text-gray-400">{new Date(log.createdAt).toLocaleString()}</p>
            </div>
          </div>
        ))}
    </div>
  );

  return null;
}

// ── Widget card ────────────────────────────────────────────────────────────────

function WidgetCard({ widget, editing, dashboardId }: {
  widget: WidgetDef; editing: boolean; dashboardId: string;
}) {
  const { removeWidget, updateWidget } = useDashboardStore();
  const [titleEdit, setTitleEdit] = useState(false);
  const [titleVal,  setTitleVal]  = useState(widget.title);
  const isAnalyticsChart = widget.type === "analytics_widget";
  const isAnalyticsView  = widget.type === "analytics_view";
  const chartIcon = isAnalyticsChart ? (CHART_TYPE_ICONS[widget.config.chartType as string] ?? "📊") : null;

  return (
    <div className="relative bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col overflow-hidden group h-full">
      {/* Header */}
      <div className="flex items-center gap-1.5 px-3 py-2 border-b border-gray-100 bg-gray-50/80 shrink-0">
        {editing && (
          <button className="drag-handle cursor-grab active:cursor-grabbing text-gray-300 hover:text-gray-500 transition shrink-0 touch-none">
            <GripVertical className="w-3.5 h-3.5" />
          </button>
        )}
        {chartIcon && <span className="text-xs shrink-0">{chartIcon}</span>}
        {isAnalyticsView && <BarChart3 className="w-3 h-3 text-blue-400 shrink-0" />}
        {widget.type === "activity_feed" && <Activity  className="w-3 h-3 text-indigo-400 shrink-0" />}
        {widget.type === "module_grid"   && <Grid3X3   className="w-3 h-3 text-green-400  shrink-0" />}

        {titleEdit && editing ? (
          <input autoFocus value={titleVal} onChange={e => setTitleVal(e.target.value)}
            onBlur={() => { updateWidget(dashboardId, widget.id, { title: titleVal }); setTitleEdit(false); }}
            onKeyDown={e => {
              if (e.key === "Enter")  { updateWidget(dashboardId, widget.id, { title: titleVal }); setTitleEdit(false); }
              if (e.key === "Escape") { setTitleVal(widget.title); setTitleEdit(false); }
            }}
            className="flex-1 text-xs font-semibold bg-white border border-blue-300 rounded px-1 py-0.5 focus:outline-none"
          />
        ) : (
          <span className="flex-1 text-xs font-semibold text-gray-700 truncate"
            onDoubleClick={() => editing && setTitleEdit(true)}
            title={editing ? "Double-click to rename" : undefined}>
            {widget.title}
          </span>
        )}

        {editing && (
          <button onClick={() => removeWidget(dashboardId, widget.id)}
            className="no-drag p-0.5 shrink-0 rounded text-gray-300 hover:text-red-500 hover:bg-red-50 transition opacity-0 group-hover:opacity-100">
            <X className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* Content fills the remaining height */}
      <div className="flex-1 min-h-0 overflow-hidden">
        {isAnalyticsChart  && <AnalyticsChartWidget widget={widget} />}
        {isAnalyticsView && widget.analyticsViewId && <AnalyticsViewWidget viewId={widget.analyticsViewId} />}
        {(widget.type === "activity_feed" || widget.type === "module_grid") && <BuiltinWidgetContent widget={widget} />}
      </div>
    </div>
  );
}

// ── Section header card ────────────────────────────────────────────────────────

function SectionCard({ widget, editing, dashboardId }: {
  widget: WidgetDef; editing: boolean; dashboardId: string;
}) {
  const { updateWidget, removeWidget } = useDashboardStore();
  const [titleEdit, setTitleEdit] = useState(false);
  const [titleVal,  setTitleVal]  = useState(widget.title);
  const isCollapsed = widget.config?.collapsed === true;

  const commitTitle = () => { updateWidget(dashboardId, widget.id, { title: titleVal }); setTitleEdit(false); };

  return (
    <div className="flex items-center gap-2 h-full px-1 group">
      <button onClick={() => updateWidget(dashboardId, widget.id, { config: { ...widget.config, collapsed: !isCollapsed } })}
        className="text-gray-400 hover:text-gray-700 transition shrink-0">
        {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>
      {isCollapsed ? <Folder className="w-4 h-4 text-blue-400 shrink-0" /> : <FolderOpen className="w-4 h-4 text-blue-500 shrink-0" />}

      {titleEdit && editing ? (
        <input autoFocus value={titleVal} onChange={e => setTitleVal(e.target.value)}
          onBlur={commitTitle} onKeyDown={e => { if (e.key === "Enter") commitTitle(); if (e.key === "Escape") { setTitleVal(widget.title); setTitleEdit(false); }}}
          className="flex-1 text-sm font-semibold bg-white border border-blue-300 rounded px-2 py-0.5 focus:outline-none max-w-xs"
        />
      ) : (
        <span className={cn("text-sm font-semibold text-gray-700", editing && "cursor-text hover:text-blue-600")}
          onDoubleClick={() => editing && setTitleEdit(true)}>{widget.title}</span>
      )}

      <div className="h-px flex-1 bg-gray-200" />

      {editing && (
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          {editing && (
            <button className="drag-handle cursor-grab text-gray-300 hover:text-gray-500 p-1">
              <GripVertical className="w-3.5 h-3.5" />
            </button>
          )}
          <button onClick={() => setTitleEdit(true)} className="p-1 rounded text-gray-400 hover:text-blue-600"><Pencil className="w-3 h-3" /></button>
          <button onClick={() => removeWidget(dashboardId, widget.id)} className="p-1 rounded text-gray-400 hover:text-red-500" title="Remove section"><X className="w-3 h-3" /></button>
        </div>
      )}
    </div>
  );
}

// ── Two-step analytics picker ──────────────────────────────────────────────────

function AnalyticsPicker({ dashboardId, onClose, currentWidgetKeys }: {
  dashboardId: string;
  onClose: () => void;
  currentWidgetKeys: Set<string>;
}) {
  const { addAnalyticsChartWidget, addSection, addWidget } = useDashboardStore();
  const [views, setViews]   = useState<AnalyticsView[]>([]);
  const [viewsLoading, setViewsLoading] = useState(true);
  const [viewSearch,   setViewSearch]   = useState("");
  const [selectedView, setSelectedView] = useState<AnalyticsView | null>(null);
  const [viewWidgets,  setViewWidgets]  = useState<any[]>([]);
  const [widgetsLoading, setWidgetsLoading] = useState(false);
  const [widgetSearch,   setWidgetSearch]   = useState("");
  const [added, setAdded] = useState<Set<string>>(new Set());

  useEffect(() => {
    api.get("/analytics/views/list").then(r => setViews(r.data ?? [])).catch(() => {}).finally(() => setViewsLoading(false));
  }, []);

  const selectView = async (view: AnalyticsView) => {
    setSelectedView(view); setWidgetsLoading(true); setWidgetSearch("");
    try { const { data } = await api.get(`/analytics/views/${view.id}`); setViewWidgets(data?.config?.widgets ?? []); }
    catch { setViewWidgets([]); }
    finally { setWidgetsLoading(false); }
  };

  const handleAddChart = async (w: any) => {
    await addAnalyticsChartWidget(dashboardId, { title: w.title || w.type, viewId: selectedView!.id, widgetId: w.id, chartType: w.type });
    setAdded(prev => new Set(prev).add(`${selectedView!.id}::${w.id}`));
  };

  const filteredViews   = views.filter(v => v.name.toLowerCase().includes(viewSearch.toLowerCase()));
  const filteredWidgets = viewWidgets.filter((w: any) => (w.title || w.type).toLowerCase().includes(widgetSearch.toLowerCase()));

  return (
    <div className="fixed right-4 top-16 z-50 bg-white rounded-2xl shadow-2xl border border-gray-200 w-96 overflow-hidden flex flex-col" style={{ maxHeight: "80vh" }}>
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          {selectedView && (
            <button onClick={() => { setSelectedView(null); setViewWidgets([]); }} className="text-gray-400 hover:text-gray-700 transition shrink-0">
              <ChevronRight className="w-4 h-4 rotate-180" />
            </button>
          )}
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-800 truncate">{selectedView ? selectedView.name : "Add Widget"}</p>
            <p className="text-xs text-gray-400">{selectedView ? `${viewWidgets.length} charts — pick which to add` : "Choose an analytics view"}</p>
          </div>
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 shrink-0 ml-2"><X className="w-4 h-4" /></button>
      </div>
      <div className="px-3 py-2 border-b border-gray-100 shrink-0">
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <Input value={selectedView ? widgetSearch : viewSearch}
            onChange={e => selectedView ? setWidgetSearch(e.target.value) : setViewSearch(e.target.value)}
            placeholder={selectedView ? "Search charts…" : "Search analytics views…"}
            className="h-8 text-sm pl-8" autoFocus />
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">
        {!selectedView ? (
          <div className="p-2 space-y-1">
            {viewsLoading ? <div className="flex items-center justify-center py-10"><Loader2 className="w-5 h-5 animate-spin text-blue-500" /></div>
              : filteredViews.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-8 text-gray-400">
                  <BarChart3 className="w-8 h-8 opacity-40" />
                  <p className="text-sm text-center">{views.length === 0 ? "No analytics views yet" : "No views match"}</p>
                  {views.length === 0 && <a href="/analytics" className="text-xs text-blue-600 hover:underline">Go to Analytics →</a>}
                </div>
              ) : filteredViews.map(view => {
                const cnt = view.config?.widgets?.length ?? 0;
                return (
                  <button key={view.id} onClick={() => selectView(view)}
                    className="flex items-center gap-3 w-full text-left p-3 rounded-xl border border-transparent hover:border-blue-200 hover:bg-blue-50 transition group">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0">
                      <BarChart3 className="w-5 h-5 text-blue-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{view.name}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{cnt} chart{cnt !== 1 ? "s" : ""} · {new Date(view.updatedAt).toLocaleDateString()}</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-blue-400 shrink-0" />
                  </button>
                );
              })}
          </div>
        ) : (
          <div className="p-2 space-y-1">
            {widgetsLoading ? <div className="flex items-center justify-center py-10"><Loader2 className="w-5 h-5 animate-spin text-blue-500" /></div>
              : filteredWidgets.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-8 text-gray-400">
                  <BarChart3 className="w-8 h-8 opacity-40" />
                  <p className="text-sm text-center">{viewWidgets.length === 0 ? "This view has no charts yet" : "No charts match"}</p>
                </div>
              ) : filteredWidgets.map((w: any) => {
                const key  = `${selectedView.id}::${w.id}`;
                const done = currentWidgetKeys.has(key) || added.has(key);
                return (
                  <div key={w.id} className={cn("flex items-center gap-3 p-3 rounded-xl border transition",
                    done ? "bg-green-50 border-green-200" : "border-transparent hover:border-blue-200 hover:bg-blue-50")}>
                    <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0", done ? "bg-green-100" : "bg-gray-100")}>
                      {CHART_TYPE_ICONS[w.type] ?? "📊"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{w.title || w.type}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        <span className="capitalize">{w.type}</span>
                        {w.groupByField && <span> · {w.groupByField}</span>}
                        {w.aggregation  && <span> · {w.aggregation.toLowerCase()}</span>}
                      </p>
                    </div>
                    {done
                      ? <span className="flex items-center gap-1 text-xs text-green-600 font-medium shrink-0"><Check className="w-3.5 h-3.5" /> Added</span>
                      : <button onClick={() => handleAddChart(w)}
                          className="flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg px-2.5 py-1.5 transition shrink-0">
                          <Plus className="w-3.5 h-3.5" /> Add
                        </button>}
                  </div>
                );
              })}
          </div>
        )}
      </div>
      {!selectedView && (
        <div className="border-t border-gray-100 px-3 py-3 shrink-0 space-y-2">
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Built-in widgets</p>
          <div className="flex gap-1.5 flex-wrap">
            {BUILTIN_WIDGETS.filter(bw => bw.type !== "section").map(bw => (
              <button key={bw.type} onClick={() => { addWidget(dashboardId, bw.type as WidgetType); onClose(); }}
                className="flex flex-col items-center gap-1 p-2 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition text-center min-w-[60px]">
                <span className="text-lg">{bw.icon}</span>
                <span className="text-[10px] text-gray-600">{bw.label}</span>
              </button>
            ))}
            <button onClick={() => { addSection(dashboardId); onClose(); }}
              className="flex flex-col items-center gap-1 p-2 rounded-lg border border-dashed border-indigo-200 hover:border-indigo-400 hover:bg-indigo-50 transition text-center min-w-[60px]">
              <span className="text-lg">📂</span>
              <span className="text-[10px] text-indigo-600">Section</span>
            </button>
          </div>
        </div>
      )}
      {selectedView && added.size > 0 && (
        <div className="border-t border-gray-100 px-4 py-2.5 shrink-0 flex items-center justify-between bg-green-50">
          <span className="text-xs text-green-700 font-medium">{added.size} widget{added.size > 1 ? "s" : ""} added</span>
          <Button size="sm" className="h-7 text-xs" onClick={onClose}>Done</Button>
        </div>
      )}
    </div>
  );
}

// ── Access control panel ───────────────────────────────────────────────────────

function AccessPanel({ dashboard, onClose }: { dashboard: Dashboard; onClose: () => void }) {
  const { updateDashboard } = useDashboardStore();
  const [isPublic,    setIsPublic]    = useState(dashboard.isPublic);
  const [sharedRoles, setSharedRoles] = useState<string[]>(dashboard.sharedRoles ?? []);
  const [sharedDepts, setSharedDepts] = useState<string[]>(dashboard.sharedDepartments ?? []);
  const [sharedUsers, setSharedUsers] = useState<string[]>(dashboard.sharedUsers ?? []);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    await updateDashboard(dashboard.id, { isPublic, sharedRoles, sharedDepartments: sharedDepts, sharedUsers });
    setSaving(false); onClose();
  };

  return (
    <div className="fixed right-4 top-16 z-50 bg-white rounded-2xl shadow-2xl border border-gray-200 w-96 overflow-hidden flex flex-col max-h-[85vh]">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50 shrink-0">
        <div><p className="text-sm font-semibold text-gray-800">Access Control</p><p className="text-xs text-gray-400 mt-0.5">Who can see &quot;{dashboard.name}&quot;</p></div>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
      </div>
      <div className="flex-1 overflow-y-auto p-4">
        <AccessControlEditor isPublic={isPublic} sharedRoles={sharedRoles} sharedDepartments={sharedDepts} sharedUsers={sharedUsers}
          onChange={({ isPublic: ip, sharedRoles: sr, sharedDepartments: sd, sharedUsers: su }) => { setIsPublic(ip); setSharedRoles(sr); setSharedDepts(sd); setSharedUsers(su); }} />
      </div>
      <div className="border-t border-gray-100 px-4 py-3 flex justify-end gap-2 shrink-0">
        <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
        <Button size="sm" onClick={handleSave} disabled={saving}>{saving && <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />}Save</Button>
      </div>
    </div>
  );
}

// ── Main Dashboard Builder ─────────────────────────────────────────────────────

export function DashboardBuilder() {
  const {
    dashboards, activeDashboardId, activeDashboard,
    loadDashboards, createDashboard, deleteDashboard,
    setActiveDashboard, setDefaultDashboard, updateWidget, bulkUpdateLayout, loading,
  } = useDashboardStore();

  const { user }    = useAuthStore();
  const { isAdmin } = usePermissionsStore();
  const isSuperAdmin = (user as any)?.role === "SUPER_ADMIN";

  const [editing,     setEditing]     = useState(false);
  const [picker,      setPicker]      = useState(false);
  const [accessPanel, setAccessPanel] = useState(false);
  const [analyzeOpen, setAnalyzeOpen] = useState(false);
  const [analyzeContext, setAnalyzeContext] = useState<AnalysisContext | null>(null);
  const [ddOpen,      setDdOpen]      = useState(false);
  const [creating,    setCreating]    = useState(false);
  const [newName,     setNewName]     = useState("");

  // Measure grid container width via a callback ref so the ResizeObserver is set
  // up the moment the element is actually in the DOM (after the loading state clears).
  // A plain useRef+useEffect(fn,[]) misses the real mount because the first render
  // returns the loading spinner — the grid div doesn't exist yet.
  const [gridWidth, setGridWidth] = useState(1200);
  const roRef = useRef<ResizeObserver | null>(null);
  const gridContainerRef = useCallback((el: HTMLDivElement | null) => {
    if (roRef.current) { roRef.current.disconnect(); roRef.current = null; }
    if (!el) return;
    setGridWidth(el.clientWidth || window.innerWidth);
    const ro = new ResizeObserver(() => setGridWidth(el.clientWidth));
    ro.observe(el);
    roRef.current = ro;
  }, []);

  useEffect(() => { loadDashboards(); }, []); // eslint-disable-line

  const dashboard  = activeDashboard();
  const rawWidgets = dashboard?.config?.widgets ?? [];

  // Auto-position any widgets that were saved without x,y (backward compat)
  const allWidgets = autoPositionWidgets(rawWidgets);

  const canManage  = isSuperAdmin || isAdmin || (dashboard?.createdById === (user as any)?.id);

  const currentWidgetKeys = new Set(
    allWidgets.filter(w => w.type === "analytics_widget")
      .map(w => `${w.config.analyticsViewId}::${w.config.analyticsWidgetId}`)
  );

  // Build react-grid-layout layout — sections are full-width, others use their w
  const layout: RGLLayout = allWidgets.map(w => {
    const min = w.type === "section" ? { minW: GRID_COLS, minH: 1 } : getWidgetMinDims(w.type);
    return {
      i:         w.id,
      x:         w.x ?? 0,
      y:         w.y ?? 0,
      w:         w.type === "section" ? GRID_COLS : (w.w ?? getWidgetDims(w.type).w),
      h:         w.type === "section" ? 1          : (w.h ?? getWidgetDims(w.type).h),
      minW:      min.minW,
      maxW:      GRID_COLS,
      minH:      min.minH,
      static:    w.type === "section" && !editing,
      isResizable: editing && w.type !== "section",
    };
  });

  const handleLayoutChange = (_newLayout: RGLLayout) => {
    // Visual feedback handled by react-grid-layout internally — no API call here
  };

  // Called on drag/resize stop — only saves when in Customize mode
  const handleLayoutStop = useCallback(async (newLayout: RGLLayout) => {
    if (!dashboard || !editing) return;
    // Collect only widgets whose position/size actually changed
    const changes = newLayout
      .map((l: any) => {
        const orig = allWidgets.find(w => w.id === l.i);
        if (!orig) return null;
        if (orig.x === l.x && orig.y === l.y && orig.w === l.w && orig.h === l.h) return null;
        return { id: l.i, x: l.x, y: l.y, w: l.w, h: l.h };
      })
      .filter(Boolean) as { id: string; x: number; y: number; w: number; h: number }[];

    if (changes.length > 0) {
      await bulkUpdateLayout(dashboard.id, changes); // single PATCH — no 500 cascade
    }
  }, [dashboard, editing, allWidgets, bulkUpdateLayout]);

  if (loading && dashboards.length === 0) {
    return (
      <div className="flex items-center justify-center py-24 text-gray-400 gap-3">
        <Loader2 className="w-5 h-5 animate-spin" /><span className="text-sm">Loading dashboards…</span>
      </div>
    );
  }
  if (!dashboard) return null;

  const hasContent = allWidgets.some(w => w.type !== "section");

  return (
    <div className="space-y-4 relative">
      {/* ── Toolbar ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative">
          <button
            className="flex items-center gap-2 h-9 px-3 rounded-xl border border-gray-200 bg-white hover:border-gray-300 shadow-sm text-sm font-medium text-gray-800 transition"
            onClick={() => setDdOpen(d => !d)}>
            <LayoutDashboard className="w-4 h-4 text-blue-500" />
            {dashboard.name}
            {dashboard.isDefault && <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 rounded-full font-semibold">Default</span>}
            <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
          </button>
          {ddOpen && (
            <div className="absolute left-0 top-full mt-1.5 z-50 bg-white rounded-xl border border-gray-200 shadow-xl min-w-[220px] overflow-hidden">
              <div className="p-2 space-y-0.5">
                {dashboards.map(d => (
                  <div key={d.id} className="flex items-center gap-1">
                    <button className={cn("flex-1 text-left px-3 py-2 rounded-lg text-sm transition",
                        d.id === activeDashboardId ? "bg-blue-50 text-blue-700 font-medium" : "hover:bg-gray-50 text-gray-700")}
                      onClick={() => { setActiveDashboard(d.id); setDdOpen(false); }}>
                      {d.name}{d.isDefault && <span className="ml-2 text-[10px] text-amber-500">★</span>}
                    </button>
                    {!d.isDefault && canManage && (
                      <button className="p-1.5 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition"
                        onClick={() => deleteDashboard(d.id)}><Trash2 className="w-3.5 h-3.5" /></button>
                    )}
                  </div>
                ))}
              </div>
              <div className="border-t border-gray-100 p-2">
                {creating ? (
                  <div className="flex gap-1.5">
                    <Input value={newName} onChange={e => setNewName(e.target.value)}
                      placeholder="Dashboard name" className="h-8 text-sm flex-1" autoFocus
                      onKeyDown={e => {
                        if (e.key === "Enter" && newName.trim()) {
                          createDashboard(newName.trim()).then(d => { setActiveDashboard(d.id); setNewName(""); setCreating(false); setDdOpen(false); });
                        }
                        if (e.key === "Escape") setCreating(false);
                      }} />
                    <Button size="sm" className="h-8 px-2"
                      onClick={() => { if (!newName.trim()) return; createDashboard(newName.trim()).then(d => { setActiveDashboard(d.id); setNewName(""); setCreating(false); setDdOpen(false); }); }}>
                      <Check className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                ) : (
                  <button className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm text-blue-600 hover:bg-blue-50 transition font-medium" onClick={() => setCreating(true)}>
                    <Plus className="w-3.5 h-3.5" /> New Dashboard
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="flex-1" />
        {!dashboard.isDefault && canManage && (
          <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5" onClick={() => setDefaultDashboard(dashboard.id)}>
            <Star className="w-3 h-3" /> Set as Default
          </Button>
        )}
        <Button
          variant="outline"
          size="sm"
          className="h-8 text-xs gap-1.5 border-purple-200 text-purple-700 hover:bg-purple-50 hover:border-purple-300"
          onClick={() => {
            const widgets = dashboard.config?.widgets ?? [];
            const ctx: AnalysisContext = {
              type: "dashboard",
              title: dashboard.name,
              contextSummary: widgets.length === 0
                ? `Dashboard "${dashboard.name}" has no widgets yet.`
                : `Dashboard: ${dashboard.name}\n\nWidgets (${widgets.length}):\n${widgets.map((w: any) =>
                    `- ${w.title || w.type} (${w.type})`
                  ).join("\n")}`,
            };
            setAnalyzeContext(ctx);
            setAnalyzeOpen(true);
          }}
        >
          <BrainCircuit className="w-3.5 h-3.5" /> Analyze
        </Button>

        {canManage && (
          <Button variant={accessPanel ? "default" : "outline"} size="sm" className="h-8 text-xs gap-1.5"
            onClick={() => { setAccessPanel(p => !p); setPicker(false); setEditing(false); }}>
            <Users className="w-3.5 h-3.5" /> Share
          </Button>
        )}
        <Button variant={editing ? "default" : "outline"} size="sm" className="h-8 text-xs gap-1.5"
          onClick={() => { setEditing(e => !e); setPicker(false); setAccessPanel(false); }}>
          <Pencil className="w-3.5 h-3.5" />{editing ? "Done" : "Customize"}
        </Button>
        {editing && (
          <Button size="sm" className="h-8 text-xs gap-1.5" onClick={() => setPicker(p => !p)}>
            <Plus className="w-3.5 h-3.5" /> Add Widget
          </Button>
        )}
        {canManage && editing && (
          <Button variant="ghost" size="sm" className="h-8 text-xs"><Settings2 className="w-3.5 h-3.5" /></Button>
        )}
      </div>

      {/* ── Panels ──────────────────────────────────────────────────────────── */}
      {picker && <AnalyticsPicker dashboardId={dashboard.id} onClose={() => setPicker(false)} currentWidgetKeys={currentWidgetKeys} />}
      {accessPanel && <AccessPanel dashboard={dashboard} onClose={() => setAccessPanel(false)} />}

      <AnalysisPanel
        open={analyzeOpen}
        onClose={() => setAnalyzeOpen(false)}
        context={analyzeContext}
      />

      {/* ── Content ─────────────────────────────────────────────────────────── */}
      {/* callback ref — ResizeObserver attaches here when the grid div actually mounts */}
      <div ref={gridContainerRef} className={`relative w-full transition-all duration-200${editing && allWidgets.length > 0 ? " rgl-edit-mode" : ""}`}>
        {!hasContent && allWidgets.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-gray-400 gap-4 border-2 border-dashed border-gray-200 rounded-2xl">
            <BarChart3 className="w-12 h-12 text-gray-300" />
            <div className="text-center">
              <p className="font-medium text-gray-600">Empty Dashboard</p>
              <p className="text-sm mt-1">Click <strong>Customize</strong> then <strong>Add Widget</strong> to build your dashboard</p>
            </div>
            <Button onClick={() => { setEditing(true); setPicker(true); }} className="gap-1.5">
              <Plus className="w-4 h-4" /> Add Widget
            </Button>
          </div>
        ) : gridWidth < 640 ? (
          /* ── Mobile: stacked single-column ── */
          <div className="space-y-4">
            {allWidgets.map(widget => {
              if (widget.type === "section") return null;
              const mobileH = widget.type === "kpi" ? 120
                : widget.type === "target" ? 220
                : widget.type === "table" ? 300
                : 260;
              return (
                <div key={widget.id} style={{ height: mobileH }}>
                  <WidgetCard widget={widget} editing={false} dashboardId={dashboard.id} />
                </div>
              );
            })}
          </div>
        ) : (
          <>
            {editing && allWidgets.length > 0 && (
              <GridCellsOverlay
                cols={GRID_COLS}
                rowHeight={GRID_ROW_HEIGHT}
                rows={Math.max(8, allWidgets.reduce((m, w) => Math.max(m, (w.y ?? 0) + (w.h ?? getWidgetDims(w.type).h)), 0) + 2)}
              />
            )}
          <ReactGridLayout
            className="layout"
            width={gridWidth}
            layout={layout as any}
            cols={GRID_COLS}
            rowHeight={GRID_ROW_HEIGHT}
            margin={[10, 10]}
            containerPadding={[0, 0]}
            compactType="vertical"
            preventCollision={false}
            isDraggable={editing}
            isResizable={editing}
            isBounded={false}
            draggableCancel=".no-drag"
            resizeHandles={["se", "s", "e", "n", "w", "ne", "nw", "sw"] as any}
            onLayoutChange={handleLayoutChange as any}
            onDragStop={handleLayoutStop as any}
            onResizeStop={handleLayoutStop as any}
          >
            {allWidgets.map(widget => (
              <div key={widget.id} style={{ cursor: editing && widget.type !== 'section' ? 'grab' : 'default' }}>
                {widget.type === "section"
                  ? <SectionCard widget={widget} editing={editing} dashboardId={dashboard.id} />
                  : <WidgetCard  widget={widget} editing={editing} dashboardId={dashboard.id} />}
              </div>
            ))}
          </ReactGridLayout>
          </>
        )}
      </div>

      {editing && hasContent && (
        <p className="text-xs text-gray-400 text-center pt-1">
          Drag grip ⠿ to reorder · Drag right/bottom edges to resize · Double-click title to rename · Widgets auto-pack with no gaps
        </p>
      )}
    </div>
  );
}
