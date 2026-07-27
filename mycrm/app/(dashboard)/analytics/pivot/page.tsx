"use client";
import { useState, useMemo, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import {
  DndContext, DragOverlay, PointerSensor,
  useSensor, useSensors, useDraggable, useDroppable,
} from "@dnd-kit/core";
import {
  SortableContext, useSortable, arrayMove, rectSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { DragEndEvent, DragStartEvent, DragOverEvent } from "@dnd-kit/core";
import {
  TableProperties, Loader2, X,
  RefreshCw, Filter, Columns3, AlignLeft, Hash,
  Copy, Check, Download, Bookmark, BookOpen, Trash2,
  BarChart2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { useModulesStore } from "@/store/modules.store";
import { cn } from "@/lib/utils";
import { PivotChartPanel, PivotChartConfig, defaultChart } from "./pivot-chart";
import { DesktopOnlyGate } from "@/components/ui/desktop-only-notice";

// ── Types ──────────────────────────────────────────────────────────────────────

type AggFunc = "sum" | "count" | "avg" | "min" | "max";
type Zone    = "available" | "rows" | "cols" | "values" | "filters";

interface PField { id?: string; name: string; label: string; type: string; }

// A FieldSlot is one placed instance of a field in Rows / Cols / Filters
interface FieldSlot { slotId: string; fieldName: string; }

// A VSlot is one placed instance of a field in Values
interface VSlot { slotId: string; name: string; label: string; type: string; aggFunc: AggFunc; }

interface SavedPivot {
  id: string; name: string; moduleId: string;
  rowSlots: FieldSlot[]; colSlots: FieldSlot[]; vSlots: VSlot[]; filterSlots: FieldSlot[];
  charts?: PivotChartConfig[]; showChart?: boolean;
}

const LS_KEY = "pivot_saved_configs";
function loadSaved(): SavedPivot[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(LS_KEY) ?? "[]"); } catch { return []; }
}

interface PivotResult {
  rowKeys:    string[];
  colKeys:    string[];
  matrix:     Record<string, Record<string, number[]>>;
  rowTotals:  Record<string, number[]>;
  colTotals:  Record<string, number[]>;
  grandTotal: number[];
  filteredCount: number;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function newId(): string { return Math.random().toString(36).slice(2, 10); }

const NUMERIC_TYPES = new Set(["NUMBER", "CURRENCY", "PERCENTAGE", "FORMULA", "RATING"]);
function smartAgg(type: string): AggFunc {
  return NUMERIC_TYPES.has(type.toUpperCase()) ? "sum" : "count";
}

// ── Pivot computation (unchanged) ─────────────────────────────────────────────

function agg(nums: number[], fn: AggFunc, cnt: number): number {
  if (cnt === 0) return 0;
  if (fn === "count")  return cnt;
  if (!nums.length)    return 0;
  if (fn === "sum")    return nums.reduce((a, b) => a + b, 0);
  if (fn === "avg")    return nums.reduce((a, b) => a + b, 0) / nums.length;
  if (fn === "min")    return Math.min(...nums);
  if (fn === "max")    return Math.max(...nums);
  return 0;
}

function safeData(r: any): Record<string, any> {
  if (!r.data) return {};
  if (typeof r.data === "string") { try { return JSON.parse(r.data); } catch { return {}; } }
  return r.data;
}

function groupKey(r: any, fields: string[]): string {
  if (!fields.length) return "__all__";
  const d = safeData(r);
  return fields.map(f => {
    const label = d[`${f}__label`];
    if (label != null && label !== "") return String(label);
    const raw = d[f];
    if (raw == null || raw === "") return "—";
    return String(raw);
  }).join(" › ");
}

function cellVals(recs: any[], vfs: VSlot[]): number[] {
  return vfs.map(vf => {
    const nums = recs
      .map(r => {
        const val = safeData(r)[vf.name];
        if (val == null || val === "") return NaN;
        return typeof val === "number" ? val : parseFloat(String(val));
      })
      .filter(n => !isNaN(n));
    return agg(nums, vf.aggFunc, recs.length);
  });
}

function computePivot(
  records: any[],
  rows: string[], cols: string[], vfs: VSlot[],
  filterValues: Record<string, string>,
): PivotResult {
  let data = records;
  for (const [fn, fv] of Object.entries(filterValues)) {
    if (fv && fv !== "__all__") data = data.filter(r => String(safeData(r)[fn] ?? "") === fv);
  }

  const rKey = (r: any) => groupKey(r, rows);
  const cKey = (r: any) => cols.length ? groupKey(r, cols) : "__";

  const rkSet = new Set(data.map(rKey));
  const ckSet = new Set(data.map(cKey));
  const rowKeys = [...rkSet].sort();
  const colKeys = [...ckSet].sort();

  const matrix: PivotResult["matrix"] = {};
  for (const rk of rowKeys) {
    matrix[rk] = {};
    for (const ck of colKeys) {
      const recs = data.filter(r => rKey(r) === rk && cKey(r) === ck);
      matrix[rk][ck] = cellVals(recs, vfs);
    }
  }

  const rowTotals: PivotResult["rowTotals"] = {};
  for (const rk of rowKeys) rowTotals[rk] = cellVals(data.filter(r => rKey(r) === rk), vfs);

  const colTotals: PivotResult["colTotals"] = {};
  for (const ck of colKeys) colTotals[ck] = cellVals(data.filter(r => cKey(r) === ck), vfs);

  return {
    rowKeys, colKeys, matrix, rowTotals, colTotals,
    grandTotal: cellVals(data, vfs),
    filteredCount: data.length,
  };
}

function fmt(val: number, fn: AggFunc): string {
  if (fn === "count") return val.toLocaleString();
  return val.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function getUniqueVals(records: any[], fieldName: string): string[] {
  return [...new Set(records.map(r => String(safeData(r)[fieldName] ?? "")))].sort();
}

// ── Available Field Chip ───────────────────────────────────────────────────────
// Full item draggable. ALWAYS stays in Available list (creates a copy/reference).

function AvailChip({ field }: { field: PField }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `available__${field.name}`,
    data: { fieldName: field.name, label: field.label },
  });
  const style = transform
    ? { transform: `translate3d(${transform.x}px,${transform.y}px,0)` }
    : undefined;
  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={cn(
        "flex items-center justify-between px-2.5 py-1.5 rounded-md border border-gray-200 bg-white",
        "text-xs cursor-grab active:cursor-grabbing select-none touch-none",
        isDragging ? "opacity-30" : "hover:border-blue-300 hover:bg-blue-50/40",
      )}
    >
      <span className="font-medium text-gray-700 truncate">{field.label}</span>
      <span className="text-[9px] text-gray-300 uppercase ml-2 shrink-0">
        {field.type.slice(0, 4).toLowerCase()}
      </span>
    </div>
  );
}

// ── Sortable Zone Chip ─────────────────────────────────────────────────────────
// Full item draggable. Can be reordered within zone. Click × to remove only this instance.

function SortableChip({
  slotId, label, zone, aggFunc, fieldType, onRemove, onAggChange,
}: {
  slotId: string; label: string; zone: Zone; fieldType?: string;
  aggFunc?: AggFunc; onRemove: () => void; onAggChange?: (f: AggFunc) => void;
}) {
  const isNumericField = NUMERIC_TYPES.has((fieldType ?? "").toUpperCase());
  const {
    attributes, listeners, setNodeRef,
    transform, transition, isDragging,
  } = useSortable({ id: slotId });

  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={cn(
        "flex items-center gap-1 bg-white border border-gray-200 rounded-md px-2 py-1",
        "text-xs shadow-sm cursor-grab active:cursor-grabbing select-none touch-none",
        isDragging ? "opacity-30 shadow-md ring-1 ring-blue-300" : "hover:border-gray-300",
      )}
    >
      <span className="font-medium text-gray-700 truncate flex-1 min-w-0">{label}</span>

      {zone === "values" && aggFunc != null && (
        <select
          value={aggFunc}
          onChange={e => onAggChange?.(e.target.value as AggFunc)}
          onClick={e => e.stopPropagation()}
          onPointerDown={e => e.stopPropagation()}
          className="text-[10px] text-blue-600 bg-transparent border-0 p-0 cursor-pointer"
        >
          <option value="count">Count</option>
          {isNumericField && <option value="sum">Sum</option>}
          {isNumericField && <option value="avg">Avg</option>}
          {isNumericField && <option value="min">Min</option>}
          {isNumericField && <option value="max">Max</option>}
        </select>
      )}

      <button
        onClick={e => { e.stopPropagation(); onRemove(); }}
        onPointerDown={e => e.stopPropagation()}
        className="text-gray-200 hover:text-red-400 transition-colors shrink-0 ml-0.5"
        title="Remove"
      >
        <X className="w-3 h-3" />
      </button>
    </div>
  );
}

// Ghost shown under cursor while dragging
function DragGhost({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-1.5 bg-white border border-blue-300 rounded-md px-2.5 py-1.5 text-xs shadow-xl cursor-grabbing select-none">
      <span className="font-medium text-gray-800">{label}</span>
    </div>
  );
}

// ── Zone Drop Panel ────────────────────────────────────────────────────────────

const ZONE_META = {
  filters: { icon: Filter,    label: "Filters", color: "bg-purple-50 border-purple-200", hint: "Drag fields here to filter" },
  cols:    { icon: Columns3,  label: "Columns", color: "bg-blue-50 border-blue-200",     hint: "Drag fields for column headers" },
  rows:    { icon: AlignLeft, label: "Rows",    color: "bg-green-50 border-green-200",   hint: "Drag fields to group rows" },
  values:  { icon: Hash,      label: "Values",  color: "bg-amber-50 border-amber-200",   hint: "Drag any field to summarise" },
} as const;

function DropZone({
  zone, slots, pFields, onRemove, onAggChange,
}: {
  zone: Exclude<Zone, "available">;
  slots: (FieldSlot | VSlot)[];
  pFields: PField[];
  onRemove: (slotId: string) => void;
  onAggChange?: (slotId: string, fn: AggFunc) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: zone });
  const meta = ZONE_META[zone];
  const slotIds = slots.map(s => s.slotId);

  const getLabel = (s: FieldSlot | VSlot) =>
    "label" in s ? s.label : (pFields.find(f => f.name === s.fieldName)?.label ?? s.fieldName);
  const getAgg  = (s: FieldSlot | VSlot): AggFunc | undefined =>
    "aggFunc" in s ? s.aggFunc : undefined;
  const getType = (s: FieldSlot | VSlot): string => {
    if ("type" in s) return s.type;
    return pFields.find(f => f.name === s.fieldName)?.type ?? "";
  };

  return (
    <div className="px-3 py-2">
      <div className="flex items-center gap-1.5 mb-1.5">
        <meta.icon className="w-3 h-3 text-gray-400" />
        <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">
          {meta.label}
        </span>
      </div>
      <div
        ref={setNodeRef}
        className={cn(
          "min-h-[44px] rounded-lg border border-dashed p-2 transition-colors",
          meta.color,
          isOver && "border-blue-400 bg-blue-50/50",
          slots.length === 0 && "flex items-center justify-center",
        )}
      >
        {slots.length === 0 && (
          <span className="text-[10px] text-gray-300 select-none">{meta.hint}</span>
        )}
        <SortableContext items={slotIds} strategy={rectSortingStrategy}>
          <div className="flex flex-wrap gap-1.5">
            {slots.map(s => (
              <SortableChip
                key={s.slotId}
                slotId={s.slotId}
                label={getLabel(s)}
                zone={zone}
                aggFunc={getAgg(s)}
                fieldType={getType(s)}
                onRemove={() => onRemove(s.slotId)}
                onAggChange={fn => onAggChange?.(s.slotId, fn)}
              />
            ))}
          </div>
        </SortableContext>
      </div>
    </div>
  );
}

// ── Pivot Table Renderer ───────────────────────────────────────────────────────

function PivotTable({
  result, vfs, hasCols, rowLabel, records, filterFields, filterValues, onFilterChange,
}: {
  result: PivotResult; vfs: VSlot[]; hasCols: boolean; rowLabel: string;
  records: any[]; filterFields: PField[];
  filterValues: Record<string, string>;
  onFilterChange: (field: string, val: string) => void;
}) {
  const { rowKeys, colKeys, matrix, rowTotals, colTotals, grandTotal, filteredCount } = result;

  // Show "—" for non-numeric fields used with numeric-only aggFuncs
  const showVal = (val: number, vf: VSlot): string => {
    if (vf.aggFunc !== "count" && !NUMERIC_TYPES.has(vf.type.toUpperCase())) return "—";
    return fmt(val, vf.aggFunc);
  };

  return (
    <div className="flex flex-col gap-3">
      {/* Filters + record count */}
      <div className="flex flex-wrap items-center gap-2 min-h-[28px]">
        {filterFields.map(f => {
          const opts = ["__all__", ...getUniqueVals(records, f.name)];
          return (
            <div key={f.id ?? f.name} className="flex items-center gap-1.5 bg-purple-50 border border-purple-200 rounded-full px-3 py-1">
              <Filter className="w-3 h-3 text-purple-400" />
              <span className="text-xs text-purple-700 font-medium">{f.label}:</span>
              <select
                value={filterValues[f.name] ?? "__all__"}
                onChange={e => onFilterChange(f.name, e.target.value)}
                className="text-xs text-purple-800 bg-transparent border-0 p-0 cursor-pointer focus:outline-none"
              >
                {opts.map(o => <option key={o} value={o}>{o === "__all__" ? "All" : o}</option>)}
              </select>
            </div>
          );
        })}
        <span className="text-xs text-gray-400 ml-auto">
          {filteredCount.toLocaleString()} of {records.length.toLocaleString()} records
        </span>
      </div>

      {/* Table */}
      <div className="overflow-auto rounded-xl border border-gray-200 shadow-sm">
        <table className="w-full text-xs border-collapse">
          <thead>
            {/* ── No-column case: single header row ── */}
            {!hasCols && (
              <tr className="bg-gray-50">
                <th className="sticky left-0 z-10 bg-gray-50 px-3 py-2 text-left text-[11px] font-semibold text-gray-600 border-b border-r border-gray-200 min-w-[140px]">
                  {rowLabel}
                </th>
                {vfs.map(vf => (
                  <th
                    key={vf.slotId}
                    className="px-3 py-2 text-right text-[11px] font-semibold text-gray-600 border-b border-r border-gray-200 whitespace-nowrap bg-gray-50"
                  >
                    {vf.label}
                    <span className="text-gray-400 font-normal ml-1">({vf.aggFunc})</span>
                  </th>
                ))}
              </tr>
            )}

            {/* ── With-columns, single value field: one header row ── */}
            {hasCols && vfs.length === 1 && (
              <tr className="bg-gray-50">
                <th className="sticky left-0 z-10 bg-gray-50 px-3 py-2 text-left text-[11px] font-semibold text-gray-600 border-b border-r border-gray-200 min-w-[140px]">
                  {rowLabel}
                </th>
                {colKeys.map(ck => (
                  <th
                    key={ck}
                    className="px-3 py-2 text-center text-[11px] font-semibold text-blue-700 border-b border-r border-gray-200 bg-blue-50 whitespace-nowrap"
                  >
                    {ck}
                  </th>
                ))}
                <th className="px-3 py-2 text-center text-[11px] font-semibold text-gray-700 border-b border-gray-200 bg-gray-100 whitespace-nowrap">
                  Total
                </th>
              </tr>
            )}

            {/* ── With-columns, multiple value fields: two header rows ── */}
            {hasCols && vfs.length > 1 && (
              <>
                <tr className="bg-blue-50">
                  <th className="sticky left-0 z-10 bg-blue-50 px-3 py-2 text-left text-[11px] font-semibold text-gray-600 border-b border-r border-gray-200 min-w-[140px]">
                    {rowLabel}
                  </th>
                  {colKeys.map(ck => (
                    <th
                      key={ck}
                      colSpan={vfs.length}
                      className="px-3 py-2 text-center text-[11px] font-semibold text-blue-700 border-b border-r border-gray-200 whitespace-nowrap"
                    >
                      {ck}
                    </th>
                  ))}
                  <th
                    colSpan={vfs.length}
                    className="px-3 py-2 text-center text-[11px] font-semibold text-gray-700 border-b border-gray-200 bg-gray-100 whitespace-nowrap"
                  >
                    Total
                  </th>
                </tr>
                <tr className="bg-gray-50">
                  <th className="sticky left-0 z-10 bg-gray-50 px-3 py-2 border-b border-r border-gray-200 min-w-[140px]" />
                  {colKeys.map(ck =>
                    vfs.map(vf => (
                      <th
                        key={`${ck}__${vf.slotId}`}
                        className="px-3 py-2 text-right text-[11px] font-medium text-gray-500 border-b border-r border-gray-200 whitespace-nowrap bg-gray-50"
                      >
                        {vf.label}
                        <span className="text-gray-400 font-normal ml-1">({vf.aggFunc})</span>
                      </th>
                    ))
                  )}
                  {vfs.map(vf => (
                    <th
                      key={`total__${vf.slotId}`}
                      className="px-3 py-2 text-right text-[11px] font-medium text-gray-600 border-b border-gray-200 bg-gray-100 whitespace-nowrap"
                    >
                      {vf.label}
                    </th>
                  ))}
                </tr>
              </>
            )}
          </thead>

          <tbody className="divide-y divide-gray-100">
            {rowKeys.map((rk, ri) => (
              <tr
                key={rk}
                className={cn("hover:bg-gray-50/70 transition-colors", ri % 2 === 0 ? "bg-white" : "bg-gray-50/30")}
              >
                <td
                  className="sticky left-0 z-10 px-3 py-2 font-medium text-gray-800 border-r border-gray-200 whitespace-nowrap min-w-[140px]"
                  style={{ background: ri % 2 === 0 ? "white" : "rgb(249 250 251 / 0.3)" }}
                >
                  {rk === "__all__" ? "All" : rk}
                </td>

                {hasCols
                  ? colKeys.flatMap(ck =>
                      vfs.map((vf, vi) => (
                        <td
                          key={`${ck}__${vf.slotId}`}
                          className="px-3 py-2 text-right tabular-nums text-gray-700 border-r border-gray-100 whitespace-nowrap"
                        >
                          {showVal(matrix[rk]?.[ck]?.[vi] ?? 0, vf)}
                        </td>
                      ))
                    )
                  : vfs.map((vf, vi) => (
                      <td
                        key={vf.slotId}
                        className="px-3 py-2 text-right tabular-nums text-gray-700 border-r border-gray-100 whitespace-nowrap"
                      >
                        {showVal(matrix[rk]?.["__"]?.[vi] ?? 0, vf)}
                      </td>
                    ))
                }

                {hasCols && vfs.map((vf, vi) => (
                  <td
                    key={`rowtotal__${vf.slotId}`}
                    className="px-3 py-2 text-right tabular-nums font-semibold text-gray-800 bg-gray-50/70 whitespace-nowrap"
                  >
                    {showVal(rowTotals[rk]?.[vi] ?? 0, vf)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>

          <tfoot>
            <tr className="bg-gray-100 border-t-2 border-gray-200">
              <td className="sticky left-0 z-10 bg-gray-100 px-3 py-2 font-bold text-gray-700 border-r border-gray-200 whitespace-nowrap">
                Grand Total
              </td>
              {hasCols
                ? colKeys.flatMap(ck =>
                    vfs.map((vf, vi) => (
                      <td
                        key={`ctotal__${ck}__${vf.slotId}`}
                        className="px-3 py-2 text-right tabular-nums font-semibold text-gray-700 border-r border-gray-100 bg-gray-100 whitespace-nowrap"
                      >
                        {showVal(colTotals[ck]?.[vi] ?? 0, vf)}
                      </td>
                    ))
                  )
                : vfs.map((vf, vi) => (
                    <td
                      key={`grandtotal__${vf.slotId}`}
                      className="px-3 py-2 text-right tabular-nums font-bold text-gray-900 bg-gray-100 whitespace-nowrap"
                    >
                      {showVal(grandTotal[vi] ?? 0, vf)}
                    </td>
                  ))
              }
              {hasCols && vfs.map((vf, vi) => (
                <td
                  key={`grandtotalrow__${vf.slotId}`}
                  className="px-3 py-2 text-right tabular-nums font-bold text-gray-900 bg-gray-100 whitespace-nowrap"
                >
                  {showVal(grandTotal[vi] ?? 0, vf)}
                </td>
              ))}
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────

const PIVOT_ZONES = new Set<string>(["rows", "cols", "values", "filters", "available"]);

export default function PivotPage() {
  return (
    <DesktopOnlyGate
      title="The Pivot Builder needs more room"
      message="Building a pivot table is designed for tablet and desktop screens. Switch to a bigger screen to keep building."
    >
      <PivotPageInner />
    </DesktopOnlyGate>
  );
}

function PivotPageInner() {
  const { modules, fetchModules } = useModulesStore();
  const searchParams = useSearchParams();

  const [moduleId,  setModuleId]  = useState("");
  const [records,   setRecords]   = useState<any[]>([]);
  const [pFields,   setPFields]   = useState<PField[]>([]);
  const [loading,   setLoading]   = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Pivot configuration — slot arrays with unique IDs (Excel-style references)
  const [rowSlots,    setRowSlots]    = useState<FieldSlot[]>([]);
  const [colSlots,    setColSlots]    = useState<FieldSlot[]>([]);
  const [vSlots,      setVSlots]      = useState<VSlot[]>([]);
  const [filterSlots, setFilterSlots] = useState<FieldSlot[]>([]);
  const [filterValues, setFilterValues] = useState<Record<string, string>>({});

  // Active drag state for overlay
  const [activeId,    setActiveId]    = useState<string | null>(null);
  const [activeLabel, setActiveLabel] = useState("");

  // Copy / Export / Saved configs
  const [copied,         setCopied]         = useState(false);
  const [showSaved,      setShowSaved]      = useState(false);
  const [savedConfigs,   setSavedConfigs]   = useState<SavedPivot[]>(() => loadSaved());
  const [showChartPanel, setShowChartPanel] = useState(false);
  const [charts,         setCharts]         = useState<PivotChartConfig[]>(() => [defaultChart(1)]);
  const [activeChartId,  setActiveChartId]  = useState<string>(() => "");

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  useEffect(() => { fetchModules(); }, [fetchModules]);

  // Auto-load when arriving from a module page (?moduleId=xxx)
  useEffect(() => {
    const mid = searchParams.get("moduleId");
    if (mid && modules.length > 0 && !moduleId) {
      setModuleId(mid);
      loadData(mid);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modules, searchParams]);

  // ── Data loading ─────────────────────────────────────────────────────────────

  const loadData = async (mid: string) => {
    if (!mid) return;
    setLoading(true);
    setLoadError(null);
    try {
      const { data } = await api.get(`/pivot/${mid}/data`);
      const normalised = (data.records ?? []).map((r: any) => ({
        id: r.id,
        data: !r.data ? {}
          : typeof r.data === "string"
            ? (() => { try { return JSON.parse(r.data); } catch { return {}; } })()
            : r.data,
      }));
      setRecords(normalised);
      setPFields((data.fields ?? []).filter(
        (f: any) => !["INLINE_SUBFORM", "FILE", "IMAGE", "SIGNATURE"].includes(f.type)
      ));
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? err?.message ?? "Failed to load data";
      setLoadError(msg);
      setRecords([]);
      setPFields([]);
    } finally {
      setLoading(false);
    }
  };

  const handleModuleChange = (mid: string) => {
    setModuleId(mid);
    setRowSlots([]); setColSlots([]); setVSlots([]);
    setFilterSlots([]); setFilterValues({});
    loadData(mid);
  };

  // ── Slot registry: slotId → zone ─────────────────────────────────────────────

  const slotZoneMap = useMemo<Record<string, Zone>>(() => {
    const m: Record<string, Zone> = {};
    rowSlots.forEach(s    => { m[s.slotId] = "rows";    });
    colSlots.forEach(s    => { m[s.slotId] = "cols";    });
    vSlots.forEach(s      => { m[s.slotId] = "values";  });
    filterSlots.forEach(s => { m[s.slotId] = "filters"; });
    return m;
  }, [rowSlots, colSlots, vSlots, filterSlots]);

  // ── Slot mutation helpers ─────────────────────────────────────────────────────

  const addSlot = (field: PField, zone: Zone, insertBeforeSlotId?: string | null) => {
    const slotId = newId();

    const insertInto = <T extends { slotId: string }>(prev: T[], item: T): T[] => {
      if (!insertBeforeSlotId) return [...prev, item];
      const idx = prev.findIndex(s => s.slotId === insertBeforeSlotId);
      if (idx === -1) return [...prev, item];
      return [...prev.slice(0, idx), item, ...prev.slice(idx)];
    };

    if (zone === "rows")    setRowSlots(p    => insertInto(p, { slotId, fieldName: field.name }));
    if (zone === "cols")    setColSlots(p    => insertInto(p, { slotId, fieldName: field.name }));
    if (zone === "filters") setFilterSlots(p => insertInto(p, { slotId, fieldName: field.name }));
    if (zone === "values")  setVSlots(p      => insertInto(p, {
      slotId, name: field.name, label: field.label,
      type: field.type, aggFunc: smartAgg(field.type),
    }));
  };

  const removeSlot = (slotId: string) => {
    const filterSlot = filterSlots.find(s => s.slotId === slotId);
    if (filterSlot) {
      setFilterValues(fv => { const n = { ...fv }; delete n[filterSlot.fieldName]; return n; });
    }
    setRowSlots(p    => p.filter(s => s.slotId !== slotId));
    setColSlots(p    => p.filter(s => s.slotId !== slotId));
    setVSlots(p      => p.filter(s => s.slotId !== slotId));
    setFilterSlots(p => p.filter(s => s.slotId !== slotId));
  };

  const reorderInZone = (zone: Zone, activeSlotId: string, overSlotId: string) => {
    const move = <T extends { slotId: string }>(arr: T[]) => {
      const from = arr.findIndex(s => s.slotId === activeSlotId);
      const to   = arr.findIndex(s => s.slotId === overSlotId);
      if (from === -1 || to === -1 || from === to) return arr;
      return arrayMove(arr, from, to);
    };
    if (zone === "rows")    setRowSlots(move);
    if (zone === "cols")    setColSlots(move);
    if (zone === "values")  setVSlots(move as any);
    if (zone === "filters") setFilterSlots(move);
  };

  // ── Export / Copy / Save helpers ─────────────────────────────────────────────

  const buildTSV = (): string => {
    if (!pivotResult) return "";
    const { rowKeys, colKeys, matrix, rowTotals, colTotals, grandTotal } = pivotResult;
    const hasCols = colSlots.length > 0;
    const esc = (v: any) => String(v ?? "").replace(/\t/g, " ");
    const lines: string[] = [];

    // Header
    if (hasCols && vSlots.length > 1) {
      lines.push([esc(rowLabel), ...colKeys.flatMap(ck => vSlots.map(() => esc(ck))), ...vSlots.map(() => "Total")].join("\t"));
      lines.push(["", ...colKeys.flatMap(ck => vSlots.map(vf => `${esc(vf.label)} (${vf.aggFunc})`)), ...vSlots.map(vf => esc(vf.label))].join("\t"));
    } else if (hasCols) {
      lines.push([esc(rowLabel), ...colKeys.map(esc), "Total"].join("\t"));
    } else {
      lines.push([esc(rowLabel), ...vSlots.map(vf => `${esc(vf.label)} (${vf.aggFunc})`)].join("\t"));
    }

    // Data rows
    for (const rk of rowKeys) {
      const rowCells = hasCols
        ? colKeys.flatMap(ck => vSlots.map((_, vi) => matrix[rk]?.[ck]?.[vi] ?? 0))
        : vSlots.map((_, vi) => matrix[rk]?.["__"]?.[vi] ?? 0);
      const rowTotalCells = hasCols ? vSlots.map((_, vi) => rowTotals[rk]?.[vi] ?? 0) : [];
      lines.push([esc(rk === "__all__" ? "All" : rk), ...rowCells, ...rowTotalCells].join("\t"));
    }

    // Grand total
    const gtCells = hasCols
      ? [...colKeys.flatMap(ck => vSlots.map((_, vi) => colTotals[ck]?.[vi] ?? 0)), ...vSlots.map((_, vi) => grandTotal[vi] ?? 0)]
      : vSlots.map((_, vi) => grandTotal[vi] ?? 0);
    lines.push(["Grand Total", ...gtCells].join("\t"));

    return lines.join("\n");
  };

  const handleCopy = async () => {
    const tsv = buildTSV();
    if (!tsv) return;
    await navigator.clipboard.writeText(tsv);
    setCopied(true);
    setTimeout(() => setCopied(false), 2200);
  };

  const handleExportCSV = () => {
    const tsv = buildTSV();
    if (!tsv) return;
    const csv = tsv.replace(/\t/g, ",");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const modName = modules.find((m: any) => m.id === moduleId)?.name ?? "pivot";
    a.download = `${modName.toLowerCase().replace(/\s+/g, "-")}-pivot.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleSaveConfig = () => {
    const name = window.prompt("Name this pivot configuration:");
    if (!name?.trim()) return;
    const config: SavedPivot = {
      id: newId(), name: name.trim(), moduleId,
      rowSlots, colSlots, vSlots, filterSlots,
      charts, showChart: showChartPanel,
    };
    const updated = [...savedConfigs, config];
    setSavedConfigs(updated);
    localStorage.setItem(LS_KEY, JSON.stringify(updated));
  };

  const handleLoadConfig = (cfg: SavedPivot) => {
    setModuleId(cfg.moduleId);
    setRowSlots(cfg.rowSlots);
    setColSlots(cfg.colSlots);
    setVSlots(cfg.vSlots);
    setFilterSlots(cfg.filterSlots);
    setFilterValues({});
    if (cfg.charts && cfg.charts.length > 0) {
      setCharts(cfg.charts);
      setActiveChartId(cfg.charts[0].id);
      setShowChartPanel(cfg.showChart ?? false);
    }
    setShowSaved(false);
    loadData(cfg.moduleId);
  };

  const handleDeleteConfig = (id: string) => {
    const updated = savedConfigs.filter(c => c.id !== id);
    setSavedConfigs(updated);
    localStorage.setItem(LS_KEY, JSON.stringify(updated));
  };

  // ── DnD handlers ─────────────────────────────────────────────────────────────

  const handleDragStart = (e: DragStartEvent) => {
    setActiveId(e.active.id as string);
    setActiveLabel(e.active.data.current?.label ?? "");
  };

  // Live within-zone reordering while dragging
  const handleDragOver = (e: DragOverEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;

    const activeId = active.id as string;
    const overId   = over.id as string;

    if (PIVOT_ZONES.has(overId)) return;              // over zone container
    const [fromZone] = activeId.split("__");
    if (fromZone === "available") return;             // available items don't sort in-place

    const overZone = slotZoneMap[overId];
    if (!overZone || overZone !== fromZone) return;   // only same-zone reorder

    const [, activeSlotId] = activeId.split("__");
    reorderInZone(fromZone as Zone, activeSlotId, overId);
  };

  const handleDragEnd = (e: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = e;
    if (!over) return;

    const activeId = active.id as string;
    const overId   = over.id as string;

    const [fromZone, ...rest] = activeId.split("__");
    const activeKey = rest.join("__"); // fieldName (available) or slotId (zone)

    // Resolve target zone
    let toZone: string;
    let overSlotId: string | null = null;

    if (PIVOT_ZONES.has(overId)) {
      toZone = overId;
    } else {
      toZone = slotZoneMap[overId] ?? "";
      overSlotId = overId;
    }

    // Drop outside or back to available panel → delete slot
    if (!toZone || toZone === "available") {
      if (fromZone !== "available") removeSlot(activeKey);
      return;
    }

    // From Available → create new instance (copy/reference)
    if (fromZone === "available") {
      const field = pFields.find(f => f.name === activeKey);
      if (field) addSlot(field, toZone as Zone, overSlotId);
      return;
    }

    // Within same zone → reorder already handled by onDragOver
    if (fromZone === toZone) return;

    // Cross-zone move: find source slot, remove it, add to target
    const srcSlot =
      rowSlots.find(s => s.slotId === activeKey) ??
      colSlots.find(s => s.slotId === activeKey) ??
      vSlots.find(s => s.slotId === activeKey) ??
      filterSlots.find(s => s.slotId === activeKey);

    if (!srcSlot) return;
    const fieldName = "fieldName" in srcSlot ? srcSlot.fieldName : srcSlot.name;
    const field = pFields.find(f => f.name === fieldName);
    if (!field) return;

    removeSlot(activeKey);
    addSlot(field, toZone as Zone, overSlotId);
  };

  // ── Derived values ────────────────────────────────────────────────────────────

  const rowFields    = rowSlots.map(s => s.fieldName);
  const colFields    = colSlots.map(s => s.fieldName);

  // First-column header: actual row-field labels, or the single value-field label when no rows
  const rowLabel = rowSlots.length > 0
    ? rowSlots.map(s => pFields.find(f => f.name === s.fieldName)?.label ?? s.fieldName).join(" · ")
    : vSlots.length === 1 ? vSlots[0].label : "Group";

  const pivotResult = useMemo(() => {
    if (!records.length || !vSlots.length) return null;
    return computePivot(records, rowFields, colFields, vSlots, filterValues);
  }, [records, rowSlots, colSlots, vSlots, filterValues]);

  const filterFieldObjects = filterSlots
    .map(s => pFields.find(f => f.name === s.fieldName))
    .filter(Boolean) as PField[];

  const currentMod = modules.find((m: any) => m.id === moduleId);

  // Available panel droppable (dropping on it = delete slot from zone)
  const { setNodeRef: availRef, isOver: availIsOver } = useDroppable({ id: "available" });

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="flex flex-col h-full min-h-0 overflow-hidden">
      <div className="flex flex-1 min-h-0 overflow-hidden">

        {/* ── LEFT: Canvas ───────────────────────────────────────────────────── */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

          {/* Header */}
          <div className="flex items-center gap-2 px-5 py-3 border-b border-gray-100 bg-white shrink-0 flex-wrap">
            <div className="w-7 h-7 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
              <TableProperties className="w-4 h-4 text-amber-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900">Pivot Table Builder</p>
              {currentMod && (
                <p className="text-[11px] text-gray-400">
                  {pFields.length} fields · {records.length.toLocaleString()} records
                </p>
              )}
            </div>

            {/* Refresh — available whenever a module is loaded */}
            {moduleId && (
              <Button
                size="sm" variant="outline"
                onClick={() => loadData(moduleId)}
                disabled={loading}
                className="h-7 px-2.5 text-xs gap-1.5 shrink-0"
                title="Reload data from database"
              >
                <RefreshCw className={cn("w-3 h-3", loading && "animate-spin")} />
                Refresh
              </Button>
            )}

            {/* Action buttons (only when pivot is ready) */}
            {pivotResult && (
              <div className="flex items-center gap-1.5 shrink-0">
                <Button
                  size="sm" variant="outline"
                  onClick={handleCopy}
                  className="h-7 px-2.5 text-xs gap-1.5"
                  title="Copy table to clipboard (paste into Excel, Word, etc.)"
                >
                  {copied
                    ? <><Check className="w-3 h-3 text-green-500" /> Copied</>
                    : <><Copy className="w-3 h-3" /> Copy</>
                  }
                </Button>
                <Button
                  size="sm" variant="outline"
                  onClick={handleExportCSV}
                  className="h-7 px-2.5 text-xs gap-1.5"
                  title="Download as CSV"
                >
                  <Download className="w-3 h-3" /> Export
                </Button>
                <Button
                  size="sm" variant="outline"
                  onClick={handleSaveConfig}
                  className="h-7 px-2.5 text-xs gap-1.5"
                  title="Save this pivot configuration"
                >
                  <Bookmark className="w-3 h-3" /> Save
                </Button>
                <Button
                  size="sm"
                  variant={showChartPanel ? "default" : "outline"}
                  onClick={() => setShowChartPanel(v => !v)}
                  className={cn(
                    "h-7 px-2.5 text-xs gap-1.5",
                    showChartPanel && "bg-blue-600 text-white hover:bg-blue-700 border-blue-600"
                  )}
                  title="Open Pivot Chart panel"
                >
                  <BarChart2 className="w-3 h-3" /> Pivot Chart
                </Button>
              </div>
            )}

            {/* Saved configs */}
            <div className="relative shrink-0">
              <Button
                size="sm" variant="outline"
                onClick={() => setShowSaved(v => !v)}
                className={cn("h-7 px-2.5 text-xs gap-1.5", savedConfigs.length === 0 && "opacity-50")}
                title="Load a saved pivot configuration"
              >
                <BookOpen className="w-3 h-3" />
                Saved {savedConfigs.length > 0 && <span className="text-blue-600">({savedConfigs.length})</span>}
              </Button>

              {showSaved && (
                <div className="absolute right-0 top-full mt-1 z-50 w-64 bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden">
                  <div className="px-3 py-2 border-b border-gray-100 flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Saved Configurations</span>
                    <button onClick={() => setShowSaved(false)} className="text-gray-300 hover:text-gray-500">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  {savedConfigs.length === 0 ? (
                    <p className="text-xs text-gray-400 text-center py-6">No saved configurations yet.<br />Configure a pivot and click Save.</p>
                  ) : (
                    <ul className="max-h-72 overflow-y-auto divide-y divide-gray-50">
                      {savedConfigs.map(cfg => {
                        const mod = modules.find((m: any) => m.id === cfg.moduleId);
                        return (
                          <li key={cfg.id} className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 group">
                            <div className="flex-1 min-w-0 cursor-pointer" onClick={() => handleLoadConfig(cfg)}>
                              <p className="text-xs font-medium text-gray-800 truncate">{cfg.name}</p>
                              <p className="text-[10px] text-gray-400 truncate">{mod?.name ?? cfg.moduleId}</p>
                            </div>
                            <button
                              onClick={() => handleDeleteConfig(cfg.id)}
                              className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-400 transition-all"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              )}
            </div>

            <select
              value={moduleId}
              onChange={e => handleModuleChange(e.target.value)}
              className="h-8 px-3 text-sm rounded-lg border border-gray-200 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 min-w-[150px] shrink-0"
            >
              <option value="">Select module…</option>
              {(modules ?? []).map((m: any) => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          </div>

          {/* Canvas body */}
          <div className="flex-1 overflow-auto p-5">
            {loading ? (
              <div className="flex flex-col items-center justify-center h-full gap-3">
                <Loader2 className="w-6 h-6 text-blue-400 animate-spin" />
                <p className="text-sm text-gray-400">Loading records…</p>
              </div>

            ) : loadError ? (
              <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
                <div className="w-12 h-12 rounded-xl bg-red-50 flex items-center justify-center">
                  <TableProperties className="w-6 h-6 text-red-300" />
                </div>
                <p className="text-sm font-medium text-red-600">Failed to load data</p>
                <p className="text-xs text-gray-400 max-w-xs">{loadError}</p>
                <Button size="sm" variant="outline" onClick={() => loadData(moduleId)} className="gap-2 mt-1">
                  <RefreshCw className="w-3 h-3" /> Retry
                </Button>
              </div>

            ) : !moduleId ? (
              <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
                <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center">
                  <TableProperties className="w-6 h-6 text-gray-300" />
                </div>
                <p className="text-sm font-medium text-gray-500">Select a module to get started</p>
                <p className="text-xs text-gray-400 max-w-xs">
                  Choose a module above, then drag fields into Rows, Columns, and Values.
                </p>
              </div>

            ) : moduleId && records.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
                <div className="w-12 h-12 rounded-xl bg-yellow-50 flex items-center justify-center">
                  <TableProperties className="w-6 h-6 text-yellow-400" />
                </div>
                <p className="text-sm font-medium text-gray-600">No records found</p>
                <p className="text-xs text-gray-400 max-w-xs">
                  This module has no records yet. Add some data first.
                </p>
              </div>

            ) : !pivotResult ? (
              <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
                <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center">
                  <TableProperties className="w-6 h-6 text-blue-300" />
                </div>
                <p className="text-sm font-medium text-gray-600">Configure your pivot table</p>
                <p className="text-xs text-gray-400 max-w-xs">
                  Drag at least one field to <strong>Values</strong>. Use Rows / Columns to group data.
                </p>
              </div>

            ) : (
              <PivotTable
                result={pivotResult}
                vfs={vSlots}
                hasCols={colSlots.length > 0}
                rowLabel={rowLabel}
                records={records}
                filterFields={filterFieldObjects}
                filterValues={filterValues}
                onFilterChange={(field, val) => setFilterValues(fv => ({ ...fv, [field]: val }))}
              />
            )}
          </div>
        </div>

        {/* ── RIGHT: Fields Panel ────────────────────────────────────────────── */}
        {/* Wider than before, and split into two EQUAL halves (flex-basis 50% each)
            instead of "Available Fields sized to content, Pivot Areas gets whatever's
            left" — Filters/Columns/Rows/Values now get a guaranteed generous share of
            the height so they don't need to scroll under normal use. */}
        <div className="w-[26rem] shrink-0 border-l border-gray-200 bg-gray-50 flex flex-col overflow-hidden">

          {/* Available Fields — always shows ALL fields, never changes */}
          <div className="flex-[1_1_50%] min-h-0 overflow-y-auto px-3 pt-3 pb-2 border-b border-gray-200">
            <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1">
              Available Fields
            </p>
            <p className="text-[10px] text-gray-400 mb-2">
              Drag any field to the areas below. The same field can be used multiple times.
            </p>
            <div
              ref={availRef}
              className={cn(
                "flex flex-wrap gap-1.5 min-h-[40px] rounded-lg p-1 transition-colors",
                availIsOver && "bg-red-50/60 ring-1 ring-red-200",
              )}
            >
              {!moduleId && (
                <p className="text-[11px] text-gray-300 text-center py-2 w-full">Select a module first</p>
              )}
              {moduleId && !loading && pFields.length === 0 && (
                <p className="text-[11px] text-gray-300 text-center py-2 w-full">No fields available</p>
              )}
              {pFields.map(f => (
                <AvailChip key={f.id ?? f.name} field={f} />
              ))}
            </div>
          </div>

          {/* Pivot Areas */}
          <div className="flex-[1_1_50%] min-h-0 overflow-y-auto divide-y divide-gray-200">
            <div className="px-3 py-2 bg-gray-100/70">
              <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-widest">
                Pivot Areas
              </p>
            </div>

            <DropZone
              zone="filters"
              slots={filterSlots}
              pFields={pFields}
              onRemove={removeSlot}
            />
            <DropZone
              zone="cols"
              slots={colSlots}
              pFields={pFields}
              onRemove={removeSlot}
            />
            <DropZone
              zone="rows"
              slots={rowSlots}
              pFields={pFields}
              onRemove={removeSlot}
            />
            <DropZone
              zone="values"
              slots={vSlots}
              pFields={pFields}
              onRemove={removeSlot}
              onAggChange={(slotId, fn) =>
                setVSlots(prev => prev.map(s => s.slotId === slotId ? { ...s, aggFunc: fn } : s))
              }
            />
          </div>
        </div>
      </div>

      {/* ── Chart panel (spans full width below pivot layout) ──────────────── */}
      {showChartPanel && pivotResult && (
        <PivotChartPanel
          result={pivotResult}
          vSlots={vSlots}
          onClose={() => setShowChartPanel(false)}
          charts={charts}
          setCharts={setCharts}
          activeChartId={activeChartId || charts[0]?.id || ""}
          setActiveChartId={setActiveChartId}
        />
      )}
      </div>

      {/* Drag overlay ghost */}
      <DragOverlay dropAnimation={null}>
        {activeId ? <DragGhost label={activeLabel} /> : null}
      </DragOverlay>
    </DndContext>
  );
}
