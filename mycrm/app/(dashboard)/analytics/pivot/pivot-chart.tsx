"use client";

import { useState, useRef, useMemo, useCallback } from "react";
import {
  BarChart, Bar, PieChart, Pie, Cell, LineChart, Line, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { X, Plus, BarChart2, Download, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// ── Structural re-definitions (must match page.tsx shapes) ────────────────────

type AggFunc = "sum" | "count" | "avg" | "min" | "max";

interface VSlot {
  slotId: string;
  name: string;
  label: string;
  type: string;
  aggFunc: AggFunc;
}

interface PivotResult {
  rowKeys: string[];
  colKeys: string[];
  matrix: Record<string, Record<string, number[]>>;
  rowTotals: Record<string, number[]>;
  colTotals: Record<string, number[]>;
  grandTotal: number[];
  filteredCount: number;
}

// ── Pivot chart config ────────────────────────────────────────────────────────

export type PivotChartType =
  | "column" | "bar" | "line" | "area"
  | "pie" | "doughnut"
  | "stackedColumn" | "stackedBar";

export interface PivotChartConfig {
  id: string;
  name: string;
  type: PivotChartType;
  title: string;
  subtitle: string;
  showLegend: boolean;
  showGridlines: boolean;
  showDataLabels: boolean;
  colorScheme: number;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const COLOR_PALETTES: string[][] = [
  ["#3b82f6","#10b981","#f59e0b","#ef4444","#8b5cf6","#06b6d4","#f97316","#84cc16"],
  ["#1d4ed8","#065f46","#92400e","#7f1d1d","#4c1d95","#164e63","#7c2d12","#365314"],
  ["#93c5fd","#86efac","#fcd34d","#fca5a5","#c4b5fd","#a5f3fc","#fdba74","#d9f99d"],
  ["#1e293b","#334155","#475569","#64748b","#94a3b8","#cbd5e1","#e2e8f0","#f8fafc"],
  ["#dc2626","#ea580c","#ca8a04","#16a34a","#2563eb","#7c3aed","#db2777","#0891b2"],
];
const PALETTE_NAMES = ["Default","Dark","Pastel","Grayscale","Vivid"];

// ── Micro SVG icons for chart type grid ───────────────────────────────────────

const IconColumn = () => (
  <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
    <rect x="2" y="9" width="3" height="9" rx="0.5"/><rect x="7" y="5" width="3" height="13" rx="0.5"/>
    <rect x="12" y="7" width="3" height="11" rx="0.5"/><rect x="17" y="3" width="3" height="15" rx="0.5"/>
  </svg>
);
const IconBar = () => (
  <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
    <rect x="2" y="2" width="10" height="3" rx="0.5"/><rect x="2" y="7" width="14" height="3" rx="0.5"/>
    <rect x="2" y="12" width="8" height="3" rx="0.5"/><rect x="2" y="17" width="12" height="3" rx="0.5"/>
  </svg>
);
const IconLine = () => (
  <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-4 h-4">
    <polyline points="2,16 7,8 12,12 17,4"/>
    <circle cx="2" cy="16" r="1.5" fill="currentColor" stroke="none"/>
    <circle cx="7" cy="8" r="1.5" fill="currentColor" stroke="none"/>
    <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none"/>
    <circle cx="17" cy="4" r="1.5" fill="currentColor" stroke="none"/>
  </svg>
);
const IconArea = () => (
  <svg viewBox="0 0 20 20" className="w-4 h-4">
    <path d="M2 16 L7 8 L12 12 L17 4 L17 18 L2 18 Z" fill="currentColor" opacity="0.25"/>
    <polyline points="2,16 7,8 12,12 17,4" fill="none" stroke="currentColor" strokeWidth="1.8"/>
  </svg>
);
const IconPie = () => (
  <svg viewBox="0 0 20 20" className="w-4 h-4">
    <path d="M10 10 L10 2 A8 8 0 0 1 18 10 Z" fill="currentColor"/>
    <path d="M10 10 L18 10 A8 8 0 0 1 5 16.9 Z" fill="currentColor" opacity="0.55"/>
    <path d="M10 10 L5 16.9 A8 8 0 0 1 10 2 Z" fill="currentColor" opacity="0.3"/>
  </svg>
);
const IconDoughnut = () => (
  <svg viewBox="0 0 20 20" className="w-4 h-4">
    <path d="M10 10 L10 2 A8 8 0 0 1 18 10 Z" fill="currentColor"/>
    <path d="M10 10 L18 10 A8 8 0 0 1 5 16.9 Z" fill="currentColor" opacity="0.55"/>
    <path d="M10 10 L5 16.9 A8 8 0 0 1 10 2 Z" fill="currentColor" opacity="0.3"/>
    <circle cx="10" cy="10" r="4" fill="white"/>
  </svg>
);
const IconStackedCol = () => (
  <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
    <rect x="2" y="12" width="4" height="6" rx="0.5"/><rect x="2" y="7" width="4" height="5" rx="0.5" opacity="0.5"/>
    <rect x="8" y="8" width="4" height="10" rx="0.5"/><rect x="8" y="4" width="4" height="4" rx="0.5" opacity="0.5"/>
    <rect x="14" y="10" width="4" height="8" rx="0.5"/><rect x="14" y="5" width="4" height="5" rx="0.5" opacity="0.5"/>
  </svg>
);
const IconStackedBar = () => (
  <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
    <rect x="2" y="2" width="9" height="4" rx="0.5"/><rect x="11" y="2" width="5" height="4" rx="0.5" opacity="0.5"/>
    <rect x="2" y="8" width="11" height="4" rx="0.5"/><rect x="13" y="8" width="5" height="4" rx="0.5" opacity="0.5"/>
    <rect x="2" y="14" width="7" height="4" rx="0.5"/><rect x="9" y="14" width="9" height="4" rx="0.5" opacity="0.5"/>
  </svg>
);
const CHART_TYPE_DEFS = [
  { type: "column" as PivotChartType,        label: "Column",  icon: <IconColumn /> },
  { type: "bar" as PivotChartType,           label: "Bar",     icon: <IconBar /> },
  { type: "line" as PivotChartType,          label: "Line",    icon: <IconLine /> },
  { type: "area" as PivotChartType,          label: "Area",    icon: <IconArea /> },
  { type: "pie" as PivotChartType,           label: "Pie",     icon: <IconPie /> },
  { type: "doughnut" as PivotChartType,      label: "Donut",   icon: <IconDoughnut /> },
  { type: "stackedColumn" as PivotChartType, label: "Stacked", icon: <IconStackedCol /> },
  { type: "stackedBar" as PivotChartType,    label: "H.Stack", icon: <IconStackedBar /> },
];

// ── Data transformers ─────────────────────────────────────────────────────────

function buildChartData(result: PivotResult, vSlots: VSlot[]) {
  const { rowKeys, colKeys, matrix, rowTotals } = result;
  const hasCols = !(colKeys.length === 0 || (colKeys.length === 1 && colKeys[0] === "__"));

  const seriesKeys: string[] = [];
  if (hasCols) {
    for (const ck of colKeys) {
      for (let vi = 0; vi < vSlots.length; vi++) {
        seriesKeys.push(vSlots.length > 1 ? `${ck} · ${vSlots[vi].label}` : ck);
      }
    }
  } else {
    for (let vi = 0; vi < vSlots.length; vi++) {
      seriesKeys.push(
        vSlots.length > 1 ? `${vSlots[vi].label} (${vSlots[vi].aggFunc})` : vSlots[vi].label
      );
    }
  }

  const data = rowKeys.map(rk => {
    const pt: Record<string, unknown> = { name: rk === "__all__" ? "All" : rk };
    if (hasCols) {
      let i = 0;
      for (const ck of colKeys) {
        for (let vi = 0; vi < vSlots.length; vi++) {
          pt[seriesKeys[i++]] = matrix[rk]?.[ck]?.[vi] ?? 0;
        }
      }
    } else {
      for (let vi = 0; vi < vSlots.length; vi++) {
        pt[seriesKeys[vi]] = matrix[rk]?.["__"]?.[vi] ?? rowTotals[rk]?.[vi] ?? 0;
      }
    }
    return pt;
  });

  return { data, seriesKeys };
}

function buildPieData(result: PivotResult) {
  const { rowKeys, matrix, rowTotals } = result;
  return rowKeys.map(rk => ({
    name: rk === "__all__" ? "All" : rk,
    value: matrix[rk]?.["__"]?.[0] ?? rowTotals[rk]?.[0] ?? 0,
  }));
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function newId() { return Math.random().toString(36).slice(2, 9); }

export function defaultChart(n = 1): PivotChartConfig {
  return {
    id: newId(), name: `Chart ${n}`, type: "column",
    title: "", subtitle: "",
    showLegend: true, showGridlines: true, showDataLabels: false,
    colorScheme: 0,
  };
}


// ── Shared style props ────────────────────────────────────────────────────────

const TICK  = { fontSize: 11, fill: "#64748b" };
const LABEL = { fontSize: 10, fill: "#64748b" };
const TIP_STYLE = {
  fontSize: 12, border: "1px solid #e2e8f0",
  borderRadius: 8, boxShadow: "0 4px 12px rgba(0,0,0,.08)",
};

// Pie/doughnut slice label — placed just outside the slice, sized to match
// the rest of the chart's text (recharts' own default label is much larger).
function sliceLabel({ cx, cy, midAngle, outerRadius, name, percent }: any) {
  const RADIAN = Math.PI / 180;
  const radius = outerRadius + 12;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  return (
    <text x={x} y={y} fontSize={LABEL.fontSize} fill={LABEL.fill} textAnchor={x > cx ? "start" : "end"} dominantBaseline="central">
      {`${name ?? ""} ${((percent ?? 0) * 100).toFixed(1)}%`}
    </text>
  );
}

// ── Chart renderer ────────────────────────────────────────────────────────────

interface RendererProps {
  config: PivotChartConfig;
  result: PivotResult;
  vSlots: VSlot[];
}

function ChartRenderer({ config, result, vSlots }: RendererProps) {
  const palette = COLOR_PALETTES[config.colorScheme] ?? COLOR_PALETTES[0];

  const { data, seriesKeys } = useMemo(
    () => buildChartData(result, vSlots),
    [result, vSlots]
  );
  const pieData = useMemo(() => buildPieData(result), [result]);

  const grid   = config.showGridlines
    ? <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
    : null;
  const legend = config.showLegend
    ? <Legend wrapperStyle={{ fontSize: 11, paddingTop: 4 }} />
    : null;
  const topLabel = config.showDataLabels ? { position: "top" as const, ...LABEL } : undefined;
  const ctrLabel = config.showDataLabels ? { position: "center" as const, ...LABEL } : undefined;

  const mx   = { top: 12, right: 16, bottom: 36, left: 4 };
  const mxH  = { top: 8, right: 24, bottom: 8, left: 8 };
  const xAx  = <XAxis dataKey="name" tick={TICK} tickLine={false} axisLine={{ stroke: "#e2e8f0" }} />;
  const yAx  = <YAxis tick={TICK} tickLine={false} axisLine={false} width={48} />;
  const xNum = <XAxis type="number" tick={TICK} tickLine={false} axisLine={{ stroke: "#e2e8f0" }} />;
  const yCat = <YAxis type="category" dataKey="name" tick={TICK} tickLine={false} axisLine={false} width={80} />;

  // ── column ──────────────────────────────────────────────────────────────────
  if (config.type === "column") return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={mx}>
        {grid}{xAx}{yAx}
        <Tooltip contentStyle={TIP_STYLE} />
        {legend}
        {seriesKeys.map((sk, i) => (
          <Bar key={sk} dataKey={sk} fill={palette[i % palette.length]}
            radius={[3,3,0,0]} maxBarSize={60} label={topLabel} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );

  // ── bar (horizontal) ────────────────────────────────────────────────────────
  if (config.type === "bar") return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} layout="vertical" margin={mxH}>
        {config.showGridlines && <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />}
        {xNum}{yCat}
        <Tooltip contentStyle={TIP_STYLE} />
        {legend}
        {seriesKeys.map((sk, i) => (
          <Bar key={sk} dataKey={sk} fill={palette[i % palette.length]}
            radius={[0,3,3,0]} maxBarSize={40}
            label={config.showDataLabels ? { position: "right" as const, ...LABEL } : undefined} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );

  // ── line ────────────────────────────────────────────────────────────────────
  if (config.type === "line") return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data} margin={mx}>
        {grid}{xAx}{yAx}
        <Tooltip contentStyle={TIP_STYLE} />
        {legend}
        {seriesKeys.map((sk, i) => (
          <Line key={sk} dataKey={sk}
            stroke={palette[i % palette.length]} strokeWidth={2}
            dot={{ r: 3, fill: palette[i % palette.length] }} activeDot={{ r: 5 }}
            label={topLabel} />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );

  // ── area ────────────────────────────────────────────────────────────────────
  if (config.type === "area") return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={mx}>
        {grid}{xAx}{yAx}
        <Tooltip contentStyle={TIP_STYLE} />
        {legend}
        {seriesKeys.map((sk, i) => (
          <Area key={sk} dataKey={sk}
            stroke={palette[i % palette.length]} fill={palette[i % palette.length]}
            fillOpacity={0.12} strokeWidth={2} dot={{ r: 3 }}
            label={topLabel} />
        ))}
      </AreaChart>
    </ResponsiveContainer>
  );

  // ── pie ─────────────────────────────────────────────────────────────────────
  if (config.type === "pie") {
    const pieLabel = config.showDataLabels ? sliceLabel : undefined;
    return (
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={pieData} dataKey="value" nameKey="name"
            cx="50%" cy="50%" outerRadius="68%"
            label={pieLabel} labelLine={config.showDataLabels}
          >
            {pieData.map((_, i) => <Cell key={i} fill={palette[i % palette.length]} />)}
          </Pie>
          <Tooltip contentStyle={TIP_STYLE} />
          {legend}
        </PieChart>
      </ResponsiveContainer>
    );
  }

  // ── doughnut ────────────────────────────────────────────────────────────────
  if (config.type === "doughnut") {
    const donutLabel = config.showDataLabels ? sliceLabel : undefined;
    return (
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={pieData} dataKey="value" nameKey="name"
            cx="50%" cy="50%" innerRadius="42%" outerRadius="68%"
            label={donutLabel} labelLine={config.showDataLabels}
          >
            {pieData.map((_, i) => <Cell key={i} fill={palette[i % palette.length]} />)}
          </Pie>
          <Tooltip contentStyle={TIP_STYLE} />
          {legend}
        </PieChart>
      </ResponsiveContainer>
    );
  }

  // ── stacked column ──────────────────────────────────────────────────────────
  if (config.type === "stackedColumn") return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={mx}>
        {grid}{xAx}{yAx}
        <Tooltip contentStyle={TIP_STYLE} />
        {legend}
        {seriesKeys.map((sk, i) => (
          <Bar key={sk} dataKey={sk} stackId="a" fill={palette[i % palette.length]}
            radius={i === seriesKeys.length - 1 ? [3,3,0,0] : undefined}
            maxBarSize={60} label={ctrLabel} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );

  // ── stacked bar ─────────────────────────────────────────────────────────────
  if (config.type === "stackedBar") return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} layout="vertical" margin={mxH}>
        {config.showGridlines && <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />}
        {xNum}{yCat}
        <Tooltip contentStyle={TIP_STYLE} />
        {legend}
        {seriesKeys.map((sk, i) => (
          <Bar key={sk} dataKey={sk} stackId="a" fill={palette[i % palette.length]}
            radius={i === seriesKeys.length - 1 ? [0,3,3,0] : undefined}
            maxBarSize={40} label={ctrLabel} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );

  return (
    <div className="flex items-center justify-center h-full text-sm text-gray-400">
      Unknown chart type
    </div>
  );
}

// ── PivotChartPanel ───────────────────────────────────────────────────────────

interface PanelProps {
  result: PivotResult;
  vSlots: VSlot[];
  onClose: () => void;
  charts: PivotChartConfig[];
  setCharts: (c: PivotChartConfig[]) => void;
  activeChartId: string;
  setActiveChartId: (id: string) => void;
}

export function PivotChartPanel({ result, vSlots, onClose, charts, setCharts, activeChartId, setActiveChartId }: PanelProps) {
  const [exportMsg, setExportMsg] = useState<string | null>(null);
  const chartRef = useRef<HTMLDivElement>(null);

  const active = charts.find(c => c.id === activeChartId) ?? charts[0];

  const updateActive = (patch: Partial<PivotChartConfig>) => {
    setCharts(charts.map(c => c.id === active?.id ? { ...c, ...patch } : c));
  };

  const addChart = () => {
    const c = defaultChart(charts.length + 1);
    setCharts([...charts, c]);
    setActiveChartId(c.id);
  };

  const deleteChart = (id: string) => {
    const next = charts.filter(c => c.id !== id);
    if (next.length === 0) { onClose(); return; }
    setCharts(next);
    if (activeChartId === id) setActiveChartId(next[0].id);
  };

  const flash = (msg: string) => {
    setExportMsg(msg);
    setTimeout(() => setExportMsg(null), 2500);
  };

  const exportSVG = () => {
    const svgEl = chartRef.current?.querySelector("svg");
    if (!svgEl) return;
    const blob = new Blob([svgEl.outerHTML], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url;
    a.download = `${active?.name ?? "chart"}.svg`; a.click();
    URL.revokeObjectURL(url);
    flash("SVG exported");
  };

  const exportPNG = () => {
    const svgEl = chartRef.current?.querySelector("svg");
    if (!svgEl) return;
    const w = svgEl.clientWidth || 800;
    const h = svgEl.clientHeight || 400;
    const canvas = document.createElement("canvas");
    canvas.width = w * 2; canvas.height = h * 2;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.scale(2, 2);
    const blob = new Blob([new XMLSerializer().serializeToString(svgEl)],
      { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, w, h);
      ctx.drawImage(img, 0, 0);
      URL.revokeObjectURL(url);
      const a = document.createElement("a");
      a.href = canvas.toDataURL("image/png");
      a.download = `${active?.name ?? "chart"}.png`; a.click();
      flash("PNG exported");
    };
    img.src = url;
  };

  if (!active) return null;

  const hasData = result.rowKeys.length > 0 && vSlots.length > 0;

  return (
    <div className="border-t border-gray-200 bg-white flex flex-col shrink-0" style={{ height: 472 }}>

      {/* ── Panel header ────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 px-4 h-9 border-b border-gray-100 bg-gray-50/60 shrink-0">
        <BarChart2 className="w-3.5 h-3.5 text-blue-500 shrink-0" />
        <span className="text-[11px] font-semibold text-gray-600 shrink-0 uppercase tracking-wide">
          Pivot Charts
        </span>

        {/* Chart tabs */}
        <div className="flex items-center gap-0.5 ml-1 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
          {charts.map(c => (
            <div key={c.id} className="flex items-center group">
              <button
                onClick={() => setActiveChartId(c.id)}
                className={cn(
                  "flex items-center gap-1 px-2.5 h-6 rounded-md text-[11px] font-medium whitespace-nowrap transition-colors",
                  c.id === activeChartId
                    ? "bg-blue-50 text-blue-700"
                    : "text-gray-500 hover:bg-gray-100 hover:text-gray-700"
                )}
              >
                {c.name}
              </button>
              {charts.length > 1 && (
                <button
                  onClick={() => deleteChart(c.id)}
                  className="w-4 h-4 flex items-center justify-center rounded text-gray-300 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all -ml-0.5"
                  title="Delete chart"
                >
                  <X className="w-2.5 h-2.5" />
                </button>
              )}
            </div>
          ))}
        </div>

        <button
          onClick={addChart}
          className="flex items-center gap-0.5 h-6 px-2 rounded-md text-[11px] text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors shrink-0 ml-1"
          title="New chart"
        >
          <Plus className="w-3 h-3" /> New
        </button>

        <div className="flex-1" />

        {exportMsg && (
          <span className="flex items-center gap-1 text-[11px] text-green-600 shrink-0">
            <Check className="w-3 h-3" /> {exportMsg}
          </span>
        )}
        <div className="flex items-center gap-0.5 shrink-0">
          <Button size="sm" variant="ghost" onClick={exportPNG}
            className="h-6 px-2 text-[11px] gap-1 text-gray-500 hover:text-gray-800">
            <Download className="w-3 h-3" /> PNG
          </Button>
          <Button size="sm" variant="ghost" onClick={exportSVG}
            className="h-6 px-2 text-[11px] gap-1 text-gray-500 hover:text-gray-800">
            <Download className="w-3 h-3" /> SVG
          </Button>
        </div>
        <button onClick={onClose}
          className="ml-1 w-6 h-6 flex items-center justify-center rounded text-gray-300 hover:text-gray-600 hover:bg-gray-100 transition-colors shrink-0">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* ── Panel body ──────────────────────────────────────────────────────── */}
      <div className="flex flex-1 min-h-0 overflow-hidden">

        {/* Settings sidebar */}
        <div className="w-52 shrink-0 border-r border-gray-100 overflow-y-auto bg-gray-50/40">

          {/* Chart name */}
          <div className="px-3 pt-3 pb-2 border-b border-gray-100">
            <p className="text-[9px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5">
              Chart Name
            </p>
            <input
              type="text"
              value={active.name}
              onChange={e => updateActive({ name: e.target.value })}
              className="w-full h-7 px-2 text-xs rounded-md border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
            />
          </div>

          {/* Chart type grid */}
          <div className="px-3 pt-2.5 pb-2.5 border-b border-gray-100">
            <p className="text-[9px] font-semibold text-gray-400 uppercase tracking-wide mb-2">
              Chart Type
            </p>
            <div className="grid grid-cols-3 gap-1">
              {CHART_TYPE_DEFS.map(def => (
                <button
                  key={def.type}
                  onClick={() => updateActive({ type: def.type })}
                  title={def.label.replace("\n", " ")}
                  className={cn(
                    "flex flex-col items-center gap-0.5 py-1.5 rounded-md border text-[8.5px] leading-tight transition-colors",
                    active.type === def.type
                      ? "border-blue-400 bg-blue-50 text-blue-600"
                      : "border-gray-200 bg-white text-gray-500 hover:border-gray-300 hover:bg-gray-50"
                  )}
                >
                  {def.icon}
                  <span className="text-center whitespace-pre-line">{def.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Appearance toggles */}
          <div className="px-3 pt-2.5 pb-2.5 border-b border-gray-100">
            <p className="text-[9px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5">
              Appearance
            </p>
            {(["showLegend","showGridlines","showDataLabels"] as const).map(key => {
              const labels: Record<typeof key, string> = {
                showLegend: "Legend",
                showGridlines: "Gridlines",
                showDataLabels: "Data Labels",
              };
              return (
                <label key={key}
                  className="flex items-center justify-between py-1 cursor-pointer">
                  <span className="text-xs text-gray-600">{labels[key]}</span>
                  <button
                    onClick={() => updateActive({ [key]: !active[key] })}
                    className={cn(
                      "w-8 h-4 rounded-full transition-colors relative shrink-0",
                      active[key] ? "bg-blue-500" : "bg-gray-200"
                    )}
                  >
                    <span className={cn(
                      "absolute top-0.5 w-3 h-3 rounded-full bg-white shadow-sm transition-transform",
                      active[key] ? "translate-x-4" : "translate-x-0.5"
                    )} />
                  </button>
                </label>
              );
            })}
          </div>

          {/* Color scheme */}
          <div className="px-3 pt-2.5 pb-3">
            <p className="text-[9px] font-semibold text-gray-400 uppercase tracking-wide mb-2">
              Color Scheme
            </p>
            <div className="space-y-1.5">
              {COLOR_PALETTES.map((pal, i) => (
                <button
                  key={i}
                  onClick={() => updateActive({ colorScheme: i })}
                  className={cn(
                    "w-full flex items-center gap-2 px-2 py-1 rounded-md border text-left transition-colors",
                    active.colorScheme === i
                      ? "border-blue-400 bg-blue-50"
                      : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50"
                  )}
                >
                  <div className="flex gap-0.5 shrink-0">
                    {pal.slice(0, 5).map(c => (
                      <span key={c} className="w-3 h-3 rounded-sm" style={{ background: c }} />
                    ))}
                  </div>
                  <span className="text-[10px] text-gray-600">{PALETTE_NAMES[i]}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Chart canvas */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

          {/* Title / subtitle inputs */}
          <div className="flex gap-2 px-4 pt-2.5 pb-1.5 shrink-0">
            <input
              type="text"
              value={active.title}
              onChange={e => updateActive({ title: e.target.value })}
              placeholder="Chart title…"
              className="flex-1 h-7 px-2.5 text-xs rounded-md border border-gray-200 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 placeholder:text-gray-300"
            />
            <input
              type="text"
              value={active.subtitle}
              onChange={e => updateActive({ subtitle: e.target.value })}
              placeholder="Subtitle…"
              className="flex-1 h-7 px-2.5 text-xs rounded-md border border-gray-200 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 placeholder:text-gray-300"
            />
          </div>

          {/* Rendered chart */}
          <div ref={chartRef} className="flex-1 min-h-0 px-3 pb-3">
            {!hasData ? (
              <div className="flex flex-col items-center justify-center h-full gap-2 text-center">
                <BarChart2 className="w-8 h-8 text-gray-200" />
                <p className="text-xs text-gray-400">
                  Configure the pivot table to generate a chart.
                </p>
              </div>
            ) : (
              <ChartRenderer config={active} result={result} vSlots={vSlots} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
