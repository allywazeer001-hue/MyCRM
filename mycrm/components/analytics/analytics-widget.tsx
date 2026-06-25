"use client";
/**
 * Shared analytics widget renderer.
 * Used by both the Analytics page and the Dashboard builder so a chart
 * edited in one place reflects in the other (same component, same API call).
 *
 * Color policy:
 *   - Single-series bar   → one solid primary blue (professional, no rainbow effect)
 *   - Multi-series bar    → color array (different series need visual distinction)
 *   - Pie chart           → color array (slices always need distinction)
 *   - Line / Area         → one primary blue
 *   - KPI / Stat / Target → theme blue
 */
import { useState, useEffect, useRef } from "react";
import {
  BarChart, Bar, PieChart, Pie, Cell, LineChart, Line, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { AlertCircle, Loader2 } from "lucide-react";
import { api } from "@/lib/api";

// ── Types ─────────────────────────────────────────────────────────────────────

export type AggregationType = "COUNT" | "SUM" | "AVG" | "MIN" | "MAX";
export type ChartType = "bar" | "pie" | "line" | "area" | "kpi" | "stat" | "table" | "target";
export type WidgetSize = "1" | "2" | "3" | "4";

export interface AnalyticsWidget {
  id: string;
  title: string;
  type: ChartType;
  moduleId: string;
  groupByField?: string;
  secondaryGroupByField?: string;
  barMode?: "stacked" | "grouped";
  aggregation: AggregationType;
  aggregateField?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  filterGroup?: any;
  targetId?: string;
  targetValue?: number;  // inline target — no separate target entity needed
  // Layout position (react-grid-layout format)
  x?: number;
  y?: number;
  w?: number;   // column span in the 12-column grid
  h?: number;   // row span (each unit = GRID_ROW_HEIGHT px)
  // Legacy
  size?: WidgetSize;
  height?: number;
  // Runtime state (populated by loadWidgetData, never saved)
  data?: any[];
  total?: number;
  secondaryKeys?: string[];
  isMultiLevel?: boolean;
  loading?: boolean;
  error?: string;
}

export interface AnalyticsTarget {
  id: string;
  name: string;
  moduleId: string;
  aggregation: string;
  aggregateField?: string;
  targetValue: number;
  currentValue?: number;
  period: string;
}

// ── Grid constants ─────────────────────────────────────────────────────────────

export const GRID_COLS       = 12;  // 12-column grid
export const GRID_ROW_HEIGHT = 72;  // px per row unit (slightly tighter for density)

/**
 * Default sizes when a widget is first added.
 * Designed so 4+ widgets naturally fit per row without the user needing to resize.
 * Users can freely drag-resize from minW=1 (tiny) up to maxW=12 (full-width).
 *
 * Per row guide at 12 cols:
 *   w=3  → 4 per row        w=4  → 3 per row
 *   w=2  → 6 per row        w=6  → 2 per row
 */
export const WIDGET_DEFAULT_DIMS: Record<string, { w: number; h: number }> = {
  bar:    { w: 4, h: 4 },  // 3 per row — was 6 (2 per row)
  pie:    { w: 3, h: 4 },  // 4 per row — was 4 (3 per row)
  line:   { w: 4, h: 4 },  // 3 per row — was 6 (2 per row)
  area:   { w: 4, h: 4 },  // 3 per row — was 6 (2 per row)
  kpi:    { w: 2, h: 2 },  // 6 per row — was 3 (4 per row)
  stat:   { w: 3, h: 4 },  // 4 per row — was 4 (3 per row)
  target: { w: 3, h: 3 },  // 4 per row — was 4 (3 per row)
  table:  { w: 8, h: 4 },  // not full-width; users can stretch to 12 — was 12
};

export function getWidgetDims(type: string): { w: number; h: number } {
  return WIDGET_DEFAULT_DIMS[type] ?? { w: 4, h: 4 };
}

export const WIDGET_MIN_DIMS: Record<string, { minW: number; minH: number }> = {
  bar:    { minW: 2, minH: 3 },
  pie:    { minW: 2, minH: 3 },
  line:   { minW: 2, minH: 3 },
  area:   { minW: 2, minH: 3 },
  kpi:    { minW: 1, minH: 1 },
  stat:   { minW: 2, minH: 3 },
  target: { minW: 2, minH: 2 },
  table:  { minW: 3, minH: 3 },
};

export function getWidgetMinDims(type: string): { minW: number; minH: number } {
  return WIDGET_MIN_DIMS[type] ?? { minW: 2, minH: 2 };
}

// ── Color constants ────────────────────────────────────────────────────────────

/**
 * Professional color palette.
 * Used both as per-widget single colors (colorIndex selects one) and as
 * multi-series distinction colors (pie slices, stacked bars).
 */
export const CHART_COLORS = [
  "#3b82f6", // Blue
  "#7c3aed", // Violet
  "#059669", // Emerald
  "#d97706", // Amber
  "#dc2626", // Red
  "#0891b2", // Cyan
  "#db2777", // Pink
  "#ea580c", // Orange
  "#65a30d", // Lime
  "#0f766e", // Teal
];

// ── Legacy grid helpers (kept for consumers that still use the 8-col system) ──

export const GRID_COLS_LEGACY = 8;

function sizeToW(size?: WidgetSize): number {
  const map: Record<WidgetSize, number> = { "1": 2, "2": 4, "3": 6, "4": 8 };
  return size ? (map[size] ?? 4) : 4;
}

export function widgetW(w: AnalyticsWidget): number {
  return w.w ?? sizeToW(w.size ?? (w.type === "kpi" ? "1" : "2"));
}

// ── Data loader ───────────────────────────────────────────────────────────────

export async function loadWidgetData(
  widget: AnalyticsWidget,
  targets: AnalyticsTarget[] = [],
): Promise<AnalyticsWidget> {
  if (widget.type === "target") {
    // Inline target: fetch current aggregate value from analytics endpoint
    if (widget.targetValue !== undefined && widget.moduleId) {
      try {
        const body: any = {
          aggregation: widget.aggregation || "COUNT",
          aggregateField: widget.aggregateField,
          filterGroup: widget.filterGroup,
        };
        const { data } = await api.post(`/analytics/data/${widget.moduleId}`, body);
        const currentValue = Array.isArray(data)
          ? data.reduce((s: number, d: any) => s + (d.value || 0), 0)
          : (data.total ?? data.value ?? 0);
        return { ...widget, total: currentValue, loading: false };
      } catch {
        return { ...widget, total: 0, loading: false, error: "Failed to load data" };
      }
    }
    // Legacy: target by ID
    const t = targets.find(x => x.id === widget.targetId);
    if (!t) return { ...widget, loading: false };
    try { await api.post(`/analytics/targets/${t.id}/compute`); } catch {}
    return { ...widget, loading: false };
  }

  try {
    const body: any = {
      aggregation: widget.aggregation,
      aggregateField: widget.aggregateField,
      filterGroup: widget.filterGroup,
    };
    if (widget.groupByField) body.groupByField = widget.groupByField;
    if (widget.secondaryGroupByField) body.secondaryGroupByField = widget.secondaryGroupByField;
    if (widget.barMode) body.barMode = widget.barMode;

    const { data } = await api.post(`/analytics/data/${widget.moduleId}`, body);
    return {
      ...widget,
      data: Array.isArray(data) ? data : (data.data || []),
      total: Array.isArray(data)
        ? data.reduce((s: number, d: any) => s + (d.value || 0), 0)
        : (data.total ?? data.value ?? 0),
      secondaryKeys: data.secondaryKeys,
      isMultiLevel: data.isMultiLevel,
      loading: false,
      error: undefined,
    };
  } catch {
    return { ...widget, loading: false, error: "Failed to load data" };
  }
}

// ── Sub-widgets ───────────────────────────────────────────────────────────────

function KpiWidget({ total, colSpan, rowSpan, color }: { total: number; colSpan: number; rowSpan: number; color: string }) {
  // Scale text size based on widget dimensions so it never overflows
  const score = Math.min(colSpan / 2, rowSpan / 1.5);
  const numCls =
    score < 0.9  ? "text-lg"  :
    score < 1.4  ? "text-2xl" :
    score < 2.2  ? "text-3xl" :
    score < 3.5  ? "text-4xl" : "text-5xl";
  const subCls = score < 1.4 ? "text-[10px]" : "text-xs";

  return (
    <div className="flex flex-col items-center justify-center h-full overflow-hidden p-1">
      <p className={`font-bold tabular-nums leading-none ${numCls}`} style={{ color }}>
        {total.toLocaleString()}
      </p>
      {score >= 0.9 && (
        <p className={`text-gray-400 mt-1 leading-none ${subCls}`}>Total</p>
      )}
    </div>
  );
}

function StatWidget({ data, total, color }: { data: any[]; total: number; color: string }) {
  const top = data[0];
  return (
    <div className="py-4 space-y-4 h-full overflow-y-auto">
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
        {data.slice(0, 7).map((d, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${total ? (d.value / total) * 100 : 0}%`,
                  backgroundColor: color,
                  opacity: 1 - (i * 0.1),
                }}
              />
            </div>
            <span className="text-xs text-gray-600 w-24 truncate">{d.name}</span>
            <span className="text-xs font-medium text-gray-700 w-8 text-right">{d.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function GaugeWidget({ widget }: { widget: AnalyticsWidget }) {
  const targetVal = widget.targetValue ?? 0;
  const [currentValue, setCurrentValue] = useState<number>(widget.total ?? 0);
  const [fetching, setFetching] = useState(widget.total === undefined && !!widget.moduleId);
  const fetchedRef = useRef(false);

  useEffect(() => {
    if (!widget.moduleId || targetVal === 0) { setFetching(false); return; }
    if (widget.total !== undefined) { setCurrentValue(widget.total); setFetching(false); return; }
    if (fetchedRef.current) return;
    fetchedRef.current = true;
    setFetching(true);
    api.post(`/analytics/data/${widget.moduleId}`, {
      aggregation: widget.aggregation || "COUNT",
      aggregateField: widget.aggregateField,
      filterGroup: widget.filterGroup,
    }).then(({ data }) => {
      const val = Array.isArray(data)
        ? data.reduce((s: number, d: any) => s + (d.value || 0), 0)
        : (data.total ?? data.value ?? 0);
      setCurrentValue(val);
    }).catch(() => setCurrentValue(0))
      .finally(() => setFetching(false));
  }, [widget.moduleId, widget.aggregation, widget.aggregateField, widget.total]);

  // Sync when parent updates total (e.g. after parent's loadWidgetData resolves)
  useEffect(() => {
    if (widget.total !== undefined) { setCurrentValue(widget.total); setFetching(false); }
  }, [widget.total]);

  if (!targetVal) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400 text-sm">
        No target set
      </div>
    );
  }

  if (fetching) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
      </div>
    );
  }

  const current = currentValue;
  const rawPct = targetVal > 0 ? (current / targetVal) * 100 : 0;
  const pct = Math.min(100, Math.max(0, rawPct));

  const fmt = (n: number) =>
    n >= 1e6 ? (n / 1e6).toFixed(1) + "M" :
    n >= 1e3 ? (n / 1e3).toFixed(1) + "K" :
    n.toLocaleString();

  // SVG semi-circle: cx, cy = pivot center; r = radius; sw = stroke width
  const cx = 100, cy = 90, r = 70, sw = 14;

  // Point on the arc at a given percentage (0 = far left, 100 = far right)
  const arc = (p: number) => {
    const a = Math.PI - (p / 100) * Math.PI;
    return { x: cx + r * Math.cos(a), y: cy - r * Math.sin(a) };
  };

  const p40 = arc(40);   // boundary between red and amber
  const p70 = arc(70);   // boundary between amber and green

  // Needle angle
  const needleA = Math.PI - (pct / 100) * Math.PI;
  const nLen = 54;
  const nx = cx + nLen * Math.cos(needleA);
  const ny = cy - nLen * Math.sin(needleA);

  const remaining = Math.max(0, targetVal - current);

  return (
    <div className="flex flex-col items-center justify-center h-full px-1">
      <svg viewBox="0 8 200 104" className="w-full max-w-[220px]">
        {/* ── Three colour zone arcs (sweep=1 = clockwise = through the top dome) ── */}
        {/* Red  0 → 40% */}
        <path
          d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${p40.x.toFixed(2)} ${p40.y.toFixed(2)}`}
          fill="none" stroke="#ef4444" strokeWidth={sw} strokeLinecap="butt"
        />
        {/* Amber  40 → 70% */}
        <path
          d={`M ${p40.x.toFixed(2)} ${p40.y.toFixed(2)} A ${r} ${r} 0 0 1 ${p70.x.toFixed(2)} ${p70.y.toFixed(2)}`}
          fill="none" stroke="#f59e0b" strokeWidth={sw} strokeLinecap="butt"
        />
        {/* Green  70 → 100% */}
        <path
          d={`M ${p70.x.toFixed(2)} ${p70.y.toFixed(2)} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
          fill="none" stroke="#22c55e" strokeWidth={sw} strokeLinecap="butt"
        />
        {/* Rounded caps at the two outer endpoints */}
        <circle cx={cx - r} cy={cy} r={sw / 2} fill="#ef4444" />
        <circle cx={cx + r} cy={cy} r={sw / 2} fill="#22c55e" />

        {/* ── Needle ── */}
        <line
          x1={cx} y1={cy} x2={nx.toFixed(2)} y2={ny.toFixed(2)}
          stroke="#1f2937" strokeWidth="2.5" strokeLinecap="round"
        />
        <circle cx={cx} cy={cy} r={5.5} fill="#1f2937" />
        <circle cx={cx} cy={cy} r={2.5} fill="white" />

        {/* White mask: hides the lower half of pivot + text row */}
        <rect x="0" y={cy + 1} width="200" height="30" fill="white" />

        {/* ── Labels ── */}
        <text x={cx - r + 2} y={cy + 21} textAnchor="start" fontSize="9" fill="#94a3b8">0</text>
        <text x={cx + r - 2} y={cy + 21} textAnchor="end"   fontSize="9" fill="#94a3b8">
          Target: {fmt(targetVal)}
        </text>
      </svg>

      {/* Remaining value below the arc */}
      <p className="text-xs text-gray-500 -mt-1">
        Remaining:{" "}
        <span className="font-semibold text-gray-800">{fmt(remaining)}</span>
      </p>
    </div>
  );
}

function TableWidget({ data, color }: { data: any[]; color: string }) {
  const rowTotal = data.reduce((s, r) => s + r.value, 0);
  return (
    <div className="overflow-x-auto h-full">
      <table className="w-full text-xs">
        <thead className="sticky top-0 bg-white">
          <tr className="border-b border-gray-100">
            <th className="py-2 px-3 text-left text-gray-500 font-medium">Value</th>
            <th className="py-2 px-3 text-right text-gray-500 font-medium">Count</th>
            <th className="py-2 px-3 text-right text-gray-500 font-medium">%</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => {
            const pct = rowTotal > 0 ? ((row.value / rowTotal) * 100).toFixed(1) : "0.0";
            return (
              <tr key={i} className="border-b border-gray-50 hover:bg-gray-50">
                <td className="py-2 px-3">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
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

// ── Main exported component ───────────────────────────────────────────────────

interface AnalyticsWidgetBodyProps {
  widget: AnalyticsWidget;
  targets?: AnalyticsTarget[];
  colSpan?: number;
  rowSpan?: number;
  colorIndex?: number;
  onSegmentClick?: (name: string) => void;
}

export function AnalyticsWidgetBody({ widget, targets = [], colSpan, rowSpan, colorIndex = 0, onSegmentClick }: AnalyticsWidgetBodyProps) {
  const data = widget.data || [];
  const total = widget.total ?? data.reduce((s: number, d: any) => s + (d.value || 0), 0);
  const legacyTarget = targets.find(t => t.id === widget.targetId);
  const effectiveCols = colSpan ?? widgetW(widget);
  const effectiveRows = rowSpan ?? (widget.h ?? 4);
  const chartColor = CHART_COLORS[colorIndex % CHART_COLORS.length];

  // Always use 100% height — the parent container (react-grid-layout or dashboard card)
  // provides the fixed pixel height. This eliminates the old 260px default.
  const chartH = "100%";
  const cacheKey = `${widget.id}-${effectiveCols}`;

  // Gauge manages its own loading state — skip parent spinner so it never stalls
  if (widget.loading && widget.type !== "target") {
    return (
      <div className="h-full flex flex-col gap-2 p-1 animate-pulse">
        {widget.type === "kpi" ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-3">
            <div className="h-10 w-20 bg-gray-100 rounded-xl" />
            <div className="h-3 w-10 bg-gray-100 rounded" />
          </div>
        ) : widget.type === "stat" ? (
          <div className="flex-1 space-y-3 py-4">
            <div className="h-8 w-16 bg-gray-100 rounded-lg" />
            {[1,2,3,4].map(i => (
              <div key={i} className="flex gap-2">
                <div className="flex-1 h-2 bg-gray-100 rounded-full" style={{ opacity: 1 - i * 0.15 }} />
                <div className="w-8 h-2 bg-gray-100 rounded" />
              </div>
            ))}
          </div>
        ) : widget.type === "table" ? (
          <div className="flex-1 space-y-2 pt-1">
            <div className="h-6 bg-gray-100 rounded" />
            {[1,2,3,4,5].map(i => <div key={i} className="h-5 bg-gray-50 rounded" />)}
          </div>
        ) : (
          <div className="flex-1 flex items-end gap-1 pb-2 px-2">
            {[0.6,0.9,0.4,0.75,0.55,0.85,0.5,0.7].map((h, i) => (
              <div key={i} className="flex-1 bg-gray-100 rounded-t-sm" style={{ height: `${h * 100}%` }} />
            ))}
          </div>
        )}
        <div className="h-2 w-1/3 bg-gray-100 rounded self-center" />
      </div>
    );
  }
  if (widget.error) {
    return (
      <div className="flex items-center justify-center h-full text-red-500 text-sm gap-2">
        <AlertCircle className="w-4 h-4" />{widget.error}
      </div>
    );
  }
  if (data.length === 0 && widget.type !== "kpi" && widget.type !== "target") {
    return <div className="flex items-center justify-center h-full text-gray-400 text-sm">No data</div>;
  }

  switch (widget.type) {
    case "kpi":    return <KpiWidget total={total} colSpan={effectiveCols} rowSpan={effectiveRows} color={chartColor} />;
    case "stat":   return <StatWidget data={data} total={total} color={chartColor} />;
    case "target":
      return <GaugeWidget widget={widget} />;
    case "table":  return <TableWidget data={data} color={chartColor} />;

    case "pie":
      // Pie always uses multi-color — slices NEED distinction
      return (
        <ResponsiveContainer key={cacheKey} width="100%" height={chartH}>
          <PieChart>
            <Pie data={data} cx="50%" cy="50%" outerRadius="70%" dataKey="value"
              label={({ name, percent }: any) => `${name} (${((percent ?? 0) * 100).toFixed(0)}%)`} labelLine={false}
              onClick={(slice: any) => { if (slice?.name) onSegmentClick?.(String(slice.name)); }}
              cursor={onSegmentClick ? "pointer" : undefined}>
              {data.map((_: any, i: number) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
            </Pie>
            <Tooltip /><Legend />
          </PieChart>
        </ResponsiveContainer>
      );

    case "line":
      // Single line — one primary color
      return (
        <ResponsiveContainer key={cacheKey} width="100%" height={chartH}>
          <LineChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="name" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip />
            <Line type="monotone" dataKey="value" stroke={chartColor} strokeWidth={2} dot={false}
              activeDot={onSegmentClick
                ? { onClick: (_e: any, p: any) => { if (p?.payload?.name) onSegmentClick(String(p.payload.name)); }, r: 5, cursor: "pointer" }
                : { r: 4 }} />
          </LineChart>
        </ResponsiveContainer>
      );

    case "area":
      // Single area — one primary color with gradient fill
      return (
        <ResponsiveContainer key={cacheKey} width="100%" height={chartH}>
          <AreaChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
            <defs>
              <linearGradient id={`areaGrad-${widget.id}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor={chartColor} stopOpacity={0.25} />
                <stop offset="95%" stopColor={chartColor} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="name" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip />
            <Area type="monotone" dataKey="value" stroke={chartColor}
              fill={`url(#areaGrad-${widget.id})`} strokeWidth={2}
              activeDot={onSegmentClick
                ? { onClick: (_e: any, p: any) => { if (p?.payload?.name) onSegmentClick(String(p.payload.name)); }, r: 5, cursor: "pointer" }
                : { r: 4 }} />
          </AreaChart>
        </ResponsiveContainer>
      );

    default: {
      // Multi-series (stacked or clustered) — different colors per series
      if (widget.isMultiLevel && widget.secondaryKeys?.length) {
        const barMode = widget.barMode ?? "stacked";
        return (
          <ResponsiveContainer key={cacheKey} width="100%" height={chartH}>
            <BarChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend />
              {widget.secondaryKeys.map((sk, i) => (
                <Bar key={sk} dataKey={sk} stackId={barMode === "stacked" ? "a" : undefined}
                  fill={CHART_COLORS[i % CHART_COLORS.length]} radius={[2, 2, 0, 0]}
                  onClick={(barData: any) => { if (barData?.name) onSegmentClick?.(String(barData.name)); }}
                  cursor={onSegmentClick ? "pointer" : undefined} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        );
      }

      // Single-series bar — ONE primary color, no rainbow per-bar
      return (
        <ResponsiveContainer key={cacheKey} width="100%" height={chartH}>
          <BarChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="name" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip />
            <Bar dataKey="value" fill={chartColor} radius={[4, 4, 0, 0]}
              onClick={(barData: any) => { if (barData?.name) onSegmentClick?.(String(barData.name)); }}
              cursor={onSegmentClick ? "pointer" : undefined} />
          </BarChart>
        </ResponsiveContainer>
      );
    }
  }
}
