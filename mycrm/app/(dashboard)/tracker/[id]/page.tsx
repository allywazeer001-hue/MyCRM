"use client";
import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft, Plus, Trash2, Loader2, Settings, Search,
  ArrowUpDown, CheckCircle2, X, Download, Calendar,
  Clock, History, Tag, Pencil, Share2, Users, Building2,
  TrendingUp, Bell, BarChart2,
} from "lucide-react";
import {
  LineChart,
  Line, XAxis, YAxis, Tooltip, ReferenceLine, ReferenceArea,
  CartesianGrid, ResponsiveContainer, Legend,
} from "recharts";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

// ── Types ──────────────────────────────────────────────────────────────────

interface Band { id: string; name: string; color: string; minVal: number; maxVal: number; order: number; }
interface BandRef { id: string; name: string; color: string; }
interface Criteria { id: string; name: string; description?: string; scoreType: string; minValue: number; maxPoints: number; weight: number; order: number; }
interface Session { id: string; label: string; date: string; notes?: string; _count?: { scores: number }; }
interface Row { id: string; name: string; criteriaScores: Record<string, number | null>; total: number | null; totalMax: number; pctEquivalent: number | null; band: BandRef | null; }
interface TrackerMeta { id: string; name: string; description: string | null; scoreLabel: string; formula: string; benchmarkScore: number | null; bands: Band[]; isPublic: boolean; sharedUsers: string[]; sharedDepts: string[]; module: { id: string; name: string }; criteria: Criteria[]; totalMax: number; }
interface GridData { tracker: TrackerMeta; session: Session; rows: Row[]; }

interface HistoryEntry { sessionId: string; label: string; date: string; notes?: string; criteriaScores: Record<string, number | null>; total: number | null; totalMax: number; pctEquivalent: number | null; band: BandRef | null; }
interface RecordHistory { recordId: string; name: string; tracker: { name: string; scoreLabel: string; formula: string; bands: Band[]; criteria: Criteria[]; totalMax: number; benchmarkScore: number | null }; history: HistoryEntry[]; avgPct: number | null; bestSession: { label: string; pctEquivalent: number } | null; sessionCount: number; }
interface PerfLeaderboardEntry { rank: number; recordId: string; name: string; latestPct: number | null; avgPct: number | null; tier: 'top' | 'mid' | 'low' | 'none'; band: BandRef | null; aboveBenchmark: boolean | null; }
interface PerfData {
  tracker: { id: string; name: string; scoreLabel: string; formula: string; benchmarkScore: number | null; performanceMessages: any; bands: BandRef[] };
  sessions: { id: string; label: string; date: string }[];
  leaderboard: PerfLeaderboardEntry[];
  chartSeries: Record<string, any>[];
  totalRecords: number;
}

// ── Constants ──────────────────────────────────────────────────────────────

const CHART_COLORS = [
  "#3b82f6","#22c55e","#f97316","#8b5cf6","#ef4444",
  "#14b8a6","#eab308","#ec4899","#6366f1","#84cc16",
];

const PRESET_COLORS = [
  { label: "Red",     value: "#ef4444" },
  { label: "Orange",  value: "#f97316" },
  { label: "Amber",   value: "#f59e0b" },
  { label: "Yellow",  value: "#eab308" },
  { label: "Lime",    value: "#84cc16" },
  { label: "Green",   value: "#22c55e" },
  { label: "Teal",    value: "#14b8a6" },
  { label: "Blue",    value: "#3b82f6" },
  { label: "Violet",  value: "#8b5cf6" },
  { label: "Gray",    value: "#6b7280" },
];

// ── Helpers ────────────────────────────────────────────────────────────────

function pctColor(pct: number) {
  if (pct >= 80) return "text-green-700";
  if (pct >= 60) return "text-amber-600";
  return "text-red-600";
}
function pctBg(pct: number) {
  if (pct >= 80) return "bg-green-500";
  if (pct >= 60) return "bg-amber-400";
  return "bg-red-500";
}
function fmtDate(d: string) {
  return new Date(d).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}
function scoreHint(c: Criteria) {
  if (c.scoreType === "percentage") return "0–100%";
  if (c.scoreType === "rating") return `${c.minValue}–${c.maxPoints}`;
  return `/ ${c.maxPoints}`;
}
function criteriaHeader(c: Criteria) {
  if (c.scoreType === "percentage") return `${c.weight}% weight`;
  if (c.scoreType === "rating") return `${c.minValue}–${c.maxPoints}`;
  return `max ${c.maxPoints} pts`;
}

/** Client-side mirror of the server calcTotals for optimistic score updates. */
function calcTotalsClient(criteriaList: Criteria[], scoreMap: Record<string, number | null>, formula: string) {
  const rated = criteriaList.filter(c => scoreMap[c.id] != null);
  if (rated.length === 0) {
    const totalMax = formula === "average"
      ? (criteriaList.length > 0 ? Math.round(criteriaList.reduce((s, c) => s + c.maxPoints, 0) / criteriaList.length * 100) / 100 : 0)
      : formula === "sum" ? criteriaList.reduce((s, c) => s + c.maxPoints, 0) : 100;
    return { total: null as number | null, totalMax, pctEquivalent: null as number | null };
  }
  if (formula === "sum") {
    const rawSum = rated.reduce((s, c) => s + (scoreMap[c.id] ?? 0), 0);
    const totalMax = criteriaList.reduce((s, c) => s + c.maxPoints, 0);
    const pctEquivalent = totalMax > 0 ? Math.round((rawSum / totalMax) * 10000) / 100 : null;
    return { total: Math.round(rawSum * 100) / 100, totalMax, pctEquivalent };
  }
  if (formula === "average") {
    const rawSum = rated.reduce((s, c) => s + (scoreMap[c.id] ?? 0), 0);
    const avg = rawSum / rated.length;
    const avgMax = Math.round(criteriaList.reduce((s, c) => s + c.maxPoints, 0) / criteriaList.length * 100) / 100;
    const pctEquivalent = avgMax > 0 ? Math.round((avg / avgMax) * 10000) / 100 : null;
    return { total: Math.round(avg * 100) / 100, totalMax: avgMax, pctEquivalent };
  }
  // percentage formula
  const allPct = rated.every(c => c.scoreType === "percentage");
  const hasWeights = rated.some(c => c.weight > 0);
  if (allPct && hasWeights) {
    let weightedScoreSum = 0; let weightSum = 0;
    for (const c of rated) { const w = c.weight; weightedScoreSum += (scoreMap[c.id] ?? 0) * w; weightSum += w; }
    const pctEquivalent = weightSum > 0 ? Math.round((weightedScoreSum / weightSum) * 100) / 100 : null;
    return { total: pctEquivalent, totalMax: 100, pctEquivalent };
  }
  let weightedSum = 0; let weightTotal = 0;
  for (const c of rated) {
    const sc = scoreMap[c.id]!;
    const range = c.maxPoints - c.minValue;
    const normalized = range > 0 ? Math.max(0, Math.min(100, ((sc - c.minValue) / range) * 100)) : 0;
    weightedSum += normalized * c.maxPoints; weightTotal += c.maxPoints;
  }
  const pctEquivalent = weightTotal > 0 ? Math.round((weightedSum / weightTotal) * 100) / 100 : null;
  return { total: pctEquivalent, totalMax: 100, pctEquivalent };
}

function assignBandClient(formula: string, total: number | null, pctEquivalent: number | null, bands: Band[]): BandRef | null {
  const compareValue = formula === "percentage" ? pctEquivalent : total;
  if (compareValue == null || bands.length === 0) return null;
  const sorted = [...bands].sort((a, b) => a.order - b.order || a.minVal - b.minVal);
  for (const b of sorted) {
    if (compareValue >= b.minVal && compareValue <= b.maxVal) return { id: b.id, name: b.name, color: b.color };
  }
  return null;
}

// ── Band Badge ─────────────────────────────────────────────────────────────

function BandBadge({ band, size = "sm" }: { band: BandRef; size?: "sm" | "xs" }) {
  return (
    <span
      className={cn("inline-flex items-center gap-1 rounded-full font-medium whitespace-nowrap", size === "sm" ? "px-2 py-0.5 text-xs" : "px-1.5 py-px text-[10px]")}
      style={{ backgroundColor: band.color + "22", color: band.color, border: `1px solid ${band.color}44` }}
    >
      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: band.color }} />
      {band.name}
    </span>
  );
}

// ── Score Cell ─────────────────────────────────────────────────────────────

function ScoreCell({ recordId, criteriaId, trackerId, sessionId, criteria, initial, onSaved, autosave = true }: {
  recordId: string; criteriaId: string; trackerId: string; sessionId: string;
  criteria: Criteria; initial: number | null;
  onSaved: (criteriaId: string, recordId: string, v: number | null) => void;
  autosave?: boolean;
}) {
  const minVal = criteria.scoreType === "percentage" ? 0 : criteria.minValue;
  const maxVal = criteria.scoreType === "percentage" ? 100 : criteria.maxPoints;
  const [val, setVal]       = useState(initial != null ? String(initial) : "");
  const [saving, setSaving] = useState(false);
  const debounce = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Track latest typed value and last-known server value for flush-on-unmount
  const latestValRef   = useRef<string>(initial != null ? String(initial) : "");
  const initialRef     = useRef<number | null>(initial);
  useEffect(() => { latestValRef.current = val; });
  useEffect(() => { initialRef.current = initial; }, [initial]);

  useEffect(() => { setVal(initial != null ? String(initial) : ""); }, [initial]);

  // Flush any pending debounced save when navigating away
  useEffect(() => {
    return () => {
      clearTimeout(debounce.current);
      const raw = latestValRef.current;
      const num = raw.trim() === "" ? null : parseFloat(raw);
      if (num === initialRef.current) return; // no change
      if (num !== null && (isNaN(num) || num < minVal || num > maxVal)) return;
      api.post(`/tracker/${trackerId}/scores`, { sessionId, criteriaId, recordId, score: num }).catch(() => {});
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const doSave = useCallback(async (num: number | null) => {
    setSaving(true);
    try {
      await api.post(`/tracker/${trackerId}/scores`, { sessionId, criteriaId, recordId, score: num });
      onSaved(criteriaId, recordId, num);
    } catch (err: any) {
      console.error("[Tracker] score save failed:", err?.response?.data ?? err?.message ?? err);
    } finally { setSaving(false); }
  }, [trackerId, sessionId, criteriaId, recordId, onSaved]);

  const saveDebounced = useCallback((raw: string) => {
    clearTimeout(debounce.current);
    debounce.current = setTimeout(() => {
      const num = raw.trim() === "" ? null : parseFloat(raw);
      if (num !== null && (isNaN(num) || num < minVal || num > maxVal)) return;
      doSave(num);
    }, 400);
  }, [minVal, maxVal, doSave]);

  // Rating type → dropdown of integer values
  if (criteria.scoreType === "rating") {
    const options: number[] = [];
    for (let i = minVal; i <= maxVal; i++) options.push(i);
    // SelectItem forbids empty-string values; use a sentinel for "no score"
    const selectVal = val === "" ? "__none__" : val;
    return (
      <div className="flex flex-col items-center gap-0.5 relative">
        <Select
          value={selectVal}
          onValueChange={v => {
            const raw = v === "__none__" ? "" : v;
            setVal(raw);
            doSave(raw === "" ? null : parseInt(raw));
          }}
        >
          <SelectTrigger className="h-8 w-20 text-sm text-center">
            <SelectValue placeholder="—" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__">—</SelectItem>
            {options.map(n => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}
          </SelectContent>
        </Select>
        {saving && <Loader2 className="w-3 h-3 animate-spin text-blue-400 absolute -top-1 -right-1" />}
        <span className="text-[10px] text-gray-400">{minVal}–{maxVal}</span>
      </div>
    );
  }

  return (
    <div className="relative flex flex-col items-center gap-0.5">
      <div className="relative w-16">
        <Input
          type="number" min={minVal} max={maxVal} value={val}
          onChange={e => {
            setVal(e.target.value);
            if (autosave) saveDebounced(e.target.value);
          }}
          onBlur={e => {
            if (!autosave) {
              const num = e.target.value.trim() === "" ? null : parseFloat(e.target.value);
              if (num === null || (!isNaN(num) && num >= minVal && num <= maxVal)) doSave(num);
            }
          }}
          className="w-full text-center h-8 text-sm px-1 pr-5 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          placeholder="—"
        />
        {saving && <Loader2 className="absolute right-1 top-1/2 -translate-y-1/2 w-3 h-3 animate-spin text-blue-400" />}
      </div>
      <span className="text-[10px] text-gray-400">{scoreHint(criteria)}</span>
    </div>
  );
}

// ── Total Cell ─────────────────────────────────────────────────────────────

function TotalCell({ row, formula }: { row: Row; formula: string }) {
  const pct = row.pctEquivalent;
  if (pct == null) return <span className="text-gray-300 text-sm">—</span>;

  let main = "";
  let sub: string | null = null;
  if (formula === "percentage") { main = `${pct.toFixed(1)}%`; }
  else if (formula === "sum") { main = `${row.total}`; sub = `/ ${row.totalMax}`; }
  else { main = `${(row.total ?? 0).toFixed(1)}`; sub = "avg"; }

  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="flex items-baseline gap-1">
        <span className={cn("text-base font-bold tabular-nums", pctColor(pct))}>{main}</span>
        {sub && <span className="text-xs text-gray-400">{sub}</span>}
      </div>
      <div className="w-20 h-2 bg-gray-100 rounded-full overflow-hidden">
        <div className={cn("h-full rounded-full", pctBg(pct))} style={{ width: `${Math.min(100, pct)}%` }} />
      </div>
      {formula !== "percentage" && <span className="text-xs text-gray-400">{pct.toFixed(1)}%</span>}
    </div>
  );
}

// ── Band Manager (inside Settings) ─────────────────────────────────────────

function BandManager({ trackerId, bands, formula, criteria, onChange }: {
  trackerId: string;
  bands: Band[];
  formula: string;
  criteria: Criteria[];
  onChange: (bands: Band[]) => void;
}) {
  const [form, setForm] = useState({ name: "", color: "#22c55e", minVal: 0, maxVal: 100 });
  const [adding, setAdding] = useState(false);
  const [editingBandId, setEditingBandId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ name: "", color: "#22c55e", minVal: 0, maxVal: 100 });

  // Derive unit label, range, and helper hint from formula + actual criteria types
  const hasCriteria = criteria.length > 0;
  const allRating    = hasCriteria && criteria.every(c => c.scoreType === "rating");
  const allPct       = hasCriteria && criteria.every(c => c.scoreType === "percentage");
  const mixedTypes   = hasCriteria && !allRating && !allPct;

  let unitLabel  = "%";
  let rangeMin   = 0;
  let rangeMax   = 100;
  let helperNote = "";
  let scaleNote  = "";   // shown as an orange warning when formula↔criteria types mismatch

  if (formula === "average") {
    const avgMax = hasCriteria
      ? Math.round(criteria.reduce((s, c) => s + c.maxPoints, 0) / criteria.length * 100) / 100
      : 100;
    const avgMin = hasCriteria
      ? Math.round(criteria.reduce((s, c) => s + c.minValue, 0) / criteria.length * 100) / 100
      : 0;
    unitLabel = allRating ? "rating" : "avg";
    rangeMin  = avgMin;
    rangeMax  = avgMax;
    helperNote = `Enter values in the ${unitLabel} scale (${rangeMin} – ${rangeMax}). Bands that fall outside this range can never be triggered.`;
    if (mixedTypes) scaleNote = "Your criteria have mixed score types. The average formula uses the mean raw value — make sure band ranges match.";
  } else if (formula === "sum") {
    const totalMax = hasCriteria ? criteria.reduce((s, c) => s + c.maxPoints, 0) : 100;
    const totalMin = hasCriteria ? criteria.reduce((s, c) => s + c.minValue, 0)  : 0;
    unitLabel  = "pts";
    rangeMin   = totalMin;
    rangeMax   = totalMax;
    helperNote = `Enter total point values (${rangeMin} – ${rangeMax} pts). Sum of all criteria scores at min/max.`;
    if (allRating) scaleNote = `Criteria use Rating ${criteria[0]?.minValue}–${criteria[0]?.maxPoints}. With ${criteria.length} criteria the total ranges ${totalMin}–${totalMax} pts.`;
  } else {
    // percentage formula — bands always in 0-100%
    unitLabel  = "%";
    rangeMin   = 0;
    rangeMax   = 100;
    if (allRating && hasCriteria) {
      const rMin = criteria[0].minValue;
      const rMax = criteria[0].maxPoints;
      const exampleMid = Math.round(((rMin + rMax) / 2 - rMin) / (rMax - rMin) * 100);
      helperNote = `Bands use 0–100%. Each rating is normalized: ${rMin}=${0}%, ${rMax}=${100}%, mid ${Math.round((rMin+rMax)/2)}≈${exampleMid}%.`;
      scaleNote = `Criteria use Rating ${rMin}–${rMax}. Consider switching Aggregation Method to "Average" so bands can be entered directly in the ${rMin}–${rMax} rating scale.`;
    } else {
      helperNote = "Bands are evaluated against the 0–100% equivalent score.";
    }
  }
  const rangeHint = `${rangeMin} – ${rangeMax}`;

  const handleAdd = async () => {
    if (!form.name.trim()) return;
    setAdding(true);
    try {
      const { data } = await api.post(`/tracker/${trackerId}/bands`, {
        name: form.name.trim(),
        color: form.color,
        minVal: form.minVal,
        maxVal: form.maxVal,
      });
      onChange([...bands, data].sort((a, b) => a.minVal - b.minVal));
      setForm({ name: "", color: "#22c55e", minVal: 0, maxVal: rangeMax });
    } catch { alert("Failed to add band"); }
    finally { setAdding(false); }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/tracker/${trackerId}/bands/${id}`);
      onChange(bands.filter(b => b.id !== id));
    } catch { alert("Failed to delete band"); }
  };

  const openEditBand = (b: Band) => {
    setEditingBandId(b.id);
    setEditForm({ name: b.name, color: b.color, minVal: b.minVal, maxVal: b.maxVal });
  };

  const handleSaveBand = async (id: string) => {
    try {
      const { data: updated } = await api.patch(`/tracker/${trackerId}/bands/${id}`, {
        name: editForm.name.trim(),
        color: editForm.color,
        minVal: editForm.minVal,
        maxVal: editForm.maxVal,
      });
      onChange(bands.map(b => b.id === id ? { ...b, ...updated } : b));
      setEditingBandId(null);
    } catch { alert("Failed to update band"); }
  };

  // Validate existing bands against detected range — flag out-of-range bands
  const outOfRange = bands.filter(b => b.maxVal > rangeMax || b.minVal < rangeMin);

  // Merge covered ranges and find uncovered gaps
  const sortedExisting = [...bands].sort((a, b) => a.minVal - b.minVal);
  const merged: {min: number; max: number}[] = [];
  for (const b of sortedExisting) {
    if (merged.length === 0 || b.minVal > merged[merged.length - 1].max) {
      merged.push({ min: b.minVal, max: b.maxVal });
    } else {
      merged[merged.length - 1].max = Math.max(merged[merged.length - 1].max, b.maxVal);
    }
  }
  const availableRanges: {min: number; max: number}[] = [];
  { let cur = rangeMin;
    for (const cov of merged) {
      if (cov.min > cur) availableRanges.push({ min: cur, max: cov.min });
      cur = Math.max(cur, cov.max);
    }
    if (cur < rangeMax) availableRanges.push({ min: cur, max: rangeMax }); }

  // Live overlap check for add and edit forms
  const addOverlaps  = form.maxVal > form.minVal ? bands.filter(b => form.minVal < b.maxVal && form.maxVal > b.minVal) : [];
  const editOverlaps = (id: string) => editForm.maxVal > editForm.minVal
    ? bands.filter(b => b.id !== id && editForm.minVal < b.maxVal && editForm.maxVal > b.minVal)
    : [];

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-semibold text-gray-900">Performance Bands</h3>
        <span className="text-xs font-semibold text-gray-600 bg-slate-100 px-2 py-0.5 rounded-full">
          Scale: {rangeMin} – {rangeMax} {unitLabel}
        </span>
      </div>

      {/* Scale mismatch warning */}
      {scaleNote && (
        <div className="mb-3 text-xs px-3 py-2 rounded-lg border bg-amber-50 border-amber-200 text-amber-700">
          {scaleNote}
        </div>
      )}

      {/* Out-of-range warning */}
      {outOfRange.length > 0 && (
        <div className="mb-3 text-xs px-3 py-2 rounded-lg border bg-red-50 border-red-200 text-red-700">
          {outOfRange.length} band{outOfRange.length > 1 ? "s" : ""} ({outOfRange.map(b => b.name).join(", ")}) have ranges outside the detected {rangeMin}–{rangeMax} {unitLabel} scale and may never trigger.
        </div>
      )}

      {bands.length === 0 ? (
        <p className="text-sm text-gray-400 mb-3">No bands defined. Records will not be grouped.</p>
      ) : (
        <div className="space-y-2 mb-4">
          {[...bands].sort((a, b) => a.minVal - b.minVal).map(b => {
            const isOut = b.maxVal > rangeMax || b.minVal < rangeMin;
            return (
              <div key={b.id}>
                {editingBandId === b.id ? (
                  <div className="rounded-lg border border-blue-200 px-3 py-2 bg-blue-50 space-y-2">
                    <Input
                      value={editForm.name}
                      onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
                      className="h-8 text-sm"
                      placeholder="Band name"
                    />
                    <div className="flex gap-2 flex-wrap items-end">
                      <div className="flex-1 min-w-28">
                        <p className="text-[10px] text-gray-500 mb-1">Color</p>
                        <Select value={editForm.color} onValueChange={v => setEditForm(f => ({ ...f, color: v }))}>
                          <SelectTrigger className="h-8 text-sm">
                            <SelectValue>
                              <div className="flex items-center gap-2">
                                <span className="w-3 h-3 rounded-full" style={{ backgroundColor: editForm.color }} />
                                {PRESET_COLORS.find(c => c.value === editForm.color)?.label ?? "Custom"}
                              </div>
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            {PRESET_COLORS.map(c => (
                              <SelectItem key={c.value} value={c.value}>
                                <div className="flex items-center gap-2">
                                  <span className="w-3 h-3 rounded-full" style={{ backgroundColor: c.value }} />
                                  {c.label}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <p className="text-[10px] text-gray-500 mb-1">Min {unitLabel} <span className="text-gray-400">(≥{rangeMin})</span></p>
                        <Input type="number" value={editForm.minVal} onChange={e => setEditForm(f => ({ ...f, minVal: parseFloat(e.target.value) || 0 }))} className="w-20 h-8 text-sm text-center" />
                      </div>
                      <div>
                        <p className="text-[10px] text-gray-500 mb-1">Max {unitLabel} <span className="text-gray-400">(≤{rangeMax})</span></p>
                        <Input type="number" value={editForm.maxVal} onChange={e => setEditForm(f => ({ ...f, maxVal: parseFloat(e.target.value) || 0 }))} className="w-20 h-8 text-sm text-center" />
                      </div>
                      {editOverlaps(b.id).length > 0 && (
                        <p className="text-[10px] text-red-600">
                          Overlaps: {editOverlaps(b.id).map(x => x.name).join(", ")}
                        </p>
                      )}
                      <div className="flex gap-1 pb-0.5">
                        <Button size="sm" className="h-8 bg-blue-600 hover:bg-blue-700 text-white" onClick={() => handleSaveBand(b.id)} disabled={!editForm.name.trim() || editOverlaps(b.id).length > 0}>Save</Button>
                        <Button size="sm" variant="outline" className="h-8" onClick={() => setEditingBandId(null)}>Cancel</Button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className={cn("flex items-center gap-3 rounded-lg border px-3 py-2", isOut ? "border-red-200 bg-red-50" : "border-slate-200 bg-slate-50")}>
                    <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: b.color }} />
                    <span className="font-medium text-sm text-gray-900 flex-1">{b.name}</span>
                    <span className={cn("text-xs whitespace-nowrap font-semibold", isOut ? "text-red-600" : "text-gray-600")}>
                      {b.minVal} – {b.maxVal} {unitLabel}
                    </span>
                    {isOut && <span className="text-[10px] text-red-500 shrink-0">out of range</span>}
                    <button onClick={() => openEditBand(b)} className="text-gray-400 hover:text-blue-600 transition-colors shrink-0">
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDelete(b.id)} className="text-gray-400 hover:text-red-600 transition-colors shrink-0">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Add form */}
      <div className="rounded-lg border border-dashed border-slate-300 p-3 space-y-2">
        <p className="text-xs font-medium text-gray-600">
          Add band <span className="font-normal text-gray-400">— valid range: {rangeMin} – {rangeMax} {unitLabel}</span>
        </p>

        <Input
          value={form.name}
          onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
          placeholder="e.g. At Risk, Moderate, High Performance…"
          className="h-8 text-sm"
        />

        <div className="flex gap-2 flex-wrap">
          {/* Color */}
          <div className="flex-1 min-w-28">
            <p className="text-[10px] text-gray-500 mb-1">Color</p>
            <Select value={form.color} onValueChange={v => setForm(f => ({ ...f, color: v }))}>
              <SelectTrigger className="h-8 text-sm">
                <SelectValue>
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full" style={{ backgroundColor: form.color }} />
                    {PRESET_COLORS.find(c => c.value === form.color)?.label ?? "Custom"}
                  </div>
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {PRESET_COLORS.map(c => (
                  <SelectItem key={c.value} value={c.value}>
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full" style={{ backgroundColor: c.value }} />
                      {c.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Min */}
          <div>
            <p className="text-[10px] text-gray-500 mb-1">Min {unitLabel} <span className="text-gray-400">(≥{rangeMin})</span></p>
            <Input
              type="number" value={form.minVal}
              onChange={e => setForm(f => ({ ...f, minVal: parseFloat(e.target.value) || 0 }))}
              className="w-20 h-8 text-sm text-center"
            />
          </div>

          {/* Max */}
          <div>
            <p className="text-[10px] text-gray-500 mb-1">Max {unitLabel} <span className="text-gray-400">(≤{rangeMax})</span></p>
            <Input
              type="number" value={form.maxVal}
              onChange={e => setForm(f => ({ ...f, maxVal: parseFloat(e.target.value) || rangeMax }))}
              className="w-20 h-8 text-sm text-center"
            />
          </div>

          <div className="flex items-end pb-0.5">
            <Button size="sm" className="h-8 bg-blue-600 hover:bg-blue-700 text-white" onClick={handleAdd} disabled={adding || !form.name.trim() || addOverlaps.length > 0}>
              {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            </Button>
          </div>
        </div>

        {addOverlaps.length > 0 && (
          <p className="text-[10px] text-red-600 font-medium">
            Overlaps existing band{addOverlaps.length > 1 ? "s" : ""}: {addOverlaps.map(b => b.name).join(", ")} — adjust range to avoid conflict.
          </p>
        )}
        {helperNote && <p className="text-[10px] text-gray-500">{helperNote}</p>}
        {availableRanges.length > 0 && (
          <p className="text-[10px] text-gray-400">
            Available (uncovered): {availableRanges.map(r => `${r.min}–${r.max}`).join(", ")} {unitLabel}
          </p>
        )}
      </div>
    </div>
  );
}

// ── Performance View ───────────────────────────────────────────────────────

function PerformanceView({ perfData, loading, onRefresh, criteria: trackerCriteria }: {
  perfData: PerfData | null;
  loading: boolean;
  onRefresh: () => void;
  criteria: Criteria[];
}) {
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (!perfData || perfData.totalRecords === 0) {
    return (
      <div className="rounded-xl border-2 border-dashed border-slate-300 bg-white p-12 text-center">
        <TrendingUp className="w-10 h-10 text-gray-300 mx-auto mb-3" />
        <p className="text-gray-600 font-medium">No performance data yet</p>
        <p className="text-gray-400 text-sm mt-1">Add sessions and score records to see performance trends</p>
      </div>
    );
  }

  const { tracker, leaderboard, chartSeries, sessions } = perfData;
  const benchmark = tracker.benchmarkScore;

  // Derive native scoring scale (Y-axis = scoring range, X-axis = sessions)
  const pvFormula = tracker.formula ?? 'percentage';
  const pvIsPercent = pvFormula === 'percentage'
    || trackerCriteria.length === 0
    || trackerCriteria.every(c => c.scoreType === 'percentage');
  const pvYMin = pvIsPercent ? 0
    : pvFormula === 'sum'
      ? trackerCriteria.reduce((s, c) => s + c.minValue, 0)
      : Math.round(trackerCriteria.reduce((s, c) => s + c.minValue, 0) / trackerCriteria.length * 100) / 100;
  const pvYMax = pvIsPercent ? 100
    : pvFormula === 'sum'
      ? trackerCriteria.reduce((s, c) => s + c.maxPoints, 0)
      : Math.round(trackerCriteria.reduce((s, c) => s + c.maxPoints, 0) / trackerCriteria.length * 100) / 100;
  // Use native scale only when yMax is valid
  const pvUseNative = !pvIsPercent && pvYMax > 0 && pvYMax > pvYMin;
  const pvDomainMin = pvUseNative ? pvYMin : 0;
  const pvDomainMax = pvUseNative ? pvYMax : 100;
  // Convert pct (0-100) → native scale value
  const pvRaw = (pct: number | null): number | null =>
    pct == null ? null
    : pvUseNative ? Math.round((pct / 100) * pvYMax * 100) / 100
    : pct;
  // Benchmark as native scale value (same horizontal line across all sessions)
  const pvNativeBm = benchmark != null ? pvRaw(benchmark) : null;
  // Format a native value for display
  const pvFmt = (v: number): string => {
    if (!pvUseNative) return `${v.toFixed(1)}%`;
    if (pvFormula === 'sum') return `${v.toFixed(1)} / ${pvYMax}`;
    return Number.isInteger(v) ? String(v) : v.toFixed(1);
  };
  // Transform chartSeries pct → native for plotting
  const pvChartData = chartSeries.map(pt => {
    const out: Record<string, any> = { label: pt.label, sessionId: pt.sessionId, date: pt.date };
    for (const [k, v] of Object.entries(pt)) {
      if (k !== 'label' && k !== 'sessionId' && k !== 'date') out[k] = pvRaw(v as number | null);
    }
    return out;
  });

  // Build unique record IDs for chart lines (ordered by rank)
  const recordIds = leaderboard.map(e => e.recordId);
  const nameMap = new Map(leaderboard.map(e => [e.recordId, e.name]));

  const tierStyle = (tier: PerfLeaderboardEntry['tier']) => {
    if (tier === 'top') return "bg-green-50 text-green-900";
    if (tier === 'mid') return "bg-amber-50 text-amber-900";
    if (tier === 'low') return "bg-red-50 text-red-900";
    return "";
  };

  const tierBadge = (tier: PerfLeaderboardEntry['tier']) => {
    if (tier === 'top') return <span className="text-[10px] font-bold text-green-600 bg-green-100 px-1.5 py-0.5 rounded-full">Top</span>;
    if (tier === 'mid') return <span className="text-[10px] font-bold text-amber-600 bg-amber-100 px-1.5 py-0.5 rounded-full">Mid</span>;
    if (tier === 'low') return <span className="text-[10px] font-bold text-red-600 bg-red-100 px-1.5 py-0.5 rounded-full">Low</span>;
    return null;
  };

  return (
    <div className="space-y-5">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-semibold text-gray-900 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-blue-600" /> Performance Overview
          </h2>
          <p className="text-xs text-gray-400 mt-0.5">
            {perfData.totalRecords} scholar{perfData.totalRecords !== 1 ? "s" : ""} across {sessions.length} session{sessions.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Button variant="outline" size="sm" className="h-8 gap-1.5" onClick={onRefresh}>
          <Loader2 className="w-3.5 h-3.5" /> Refresh
        </Button>
      </div>

      {/* Performance line chart — score trend over sessions */}
      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold text-gray-700">Score Trend</h3>
            <p className="text-xs text-gray-400 mt-0.5">
              {sessions.length} session{sessions.length !== 1 ? "s" : ""} · {recordIds.length} record{recordIds.length !== 1 ? "s" : ""}
              {pvNativeBm != null && <> · dotted line = benchmark ({pvFmt(pvNativeBm)})</>}
            </p>
          </div>
          {pvNativeBm != null && (
            <div className="flex items-center gap-1.5 text-xs text-gray-400">
              <svg width="24" height="10" viewBox="0 0 24 10">
                <line x1="0" y1="5" x2="24" y2="5" stroke="#ef4444" strokeWidth="2" strokeDasharray="4 3" />
              </svg>
              Benchmark
            </div>
          )}
        </div>

        {pvChartData.length === 0 ? (
          <div className="flex items-center justify-center h-48 text-sm text-gray-400">
            No sessions recorded yet
          </div>
        ) : (
          <div>
            <ResponsiveContainer width="100%" height={340}>
              <LineChart
                data={pvChartData}
                margin={{ top: 10, right: 30, left: 4, bottom: pvChartData.length > 5 ? 30 : 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11, fill: "#6b7280" }}
                  angle={pvChartData.length > 5 ? -30 : 0}
                  textAnchor={pvChartData.length > 5 ? "end" : "middle"}
                  padding={{ left: 30, right: 30 }}
                />
                <YAxis
                  domain={[pvDomainMin, pvDomainMax]}
                  tick={{ fontSize: 11, fill: "#6b7280" }}
                  tickFormatter={v => pvFmt(v)}
                />
                <Tooltip
                  formatter={(value: any, name: any) => [
                    value != null ? pvFmt(Number(value)) : "—",
                    nameMap.get(String(name)) ?? String(name),
                  ] as [string, string]}
                  labelStyle={{ fontWeight: 600, marginBottom: 4 }}
                  contentStyle={{ borderRadius: 8, fontSize: 12, border: "1px solid #e2e8f0" }}
                />
                <Legend
                  formatter={(value: string) => nameMap.get(value) ?? value}
                  wrapperStyle={{ fontSize: 11 }}
                />
                {/* Benchmark: single horizontal line — same for all sessions */}
                {pvNativeBm != null && (
                  <ReferenceLine
                    y={pvNativeBm}
                    stroke="#ef4444"
                    strokeDasharray="4 4"
                    strokeWidth={2}
                    label={{ value: pvFmt(pvNativeBm), position: "insideTopRight", fill: "#ef4444", fontSize: 11, fontWeight: 600 }}
                  />
                )}
                {recordIds.slice(0, 10).map((rid, i) => (
                  <Line
                    key={rid}
                    type="monotone"
                    dataKey={rid}
                    stroke={CHART_COLORS[i % CHART_COLORS.length]}
                    strokeWidth={2.5}
                    dot={{ r: 4, strokeWidth: 2, stroke: "white" }}
                    activeDot={{ r: 6, strokeWidth: 2, stroke: "white" }}
                    connectNulls
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
            {recordIds.length > 10 && (
              <p className="text-xs text-gray-400 mt-2 text-center">Showing top 10 records. View leaderboard below for all results.</p>
            )}
          </div>
        )}
      </div>

      {/* Leaderboard */}
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-700">Leaderboard</h3>
          {pvNativeBm != null && (
            <span className="text-xs text-gray-400">Benchmark: <span className="font-semibold text-red-500">{pvFmt(pvNativeBm)}</span></span>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-xs text-gray-500 uppercase tracking-wide">
                <th className="text-center px-3 py-2.5 w-10">#</th>
                <th className="text-left px-3 py-2.5">Scholar</th>
                <th className="text-center px-3 py-2.5">Latest %</th>
                <th className="text-center px-3 py-2.5">Avg %</th>
                <th className="text-center px-3 py-2.5">Band</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {leaderboard.map(entry => {
                const passState = benchmark != null && entry.latestPct != null
                  ? entry.latestPct >= benchmark : null;
                return (
                <tr
                  key={entry.recordId}
                  className={cn(
                    "transition-colors",
                    passState === true  ? "bg-green-50/40"
                    : passState === false ? "bg-red-50/40"
                    : tierStyle(entry.tier),
                  )}
                >
                  <td className="text-center px-3 py-2.5">
                    <span className="text-xs font-bold text-gray-400">{entry.rank}</span>
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      {benchmark != null && entry.latestPct != null && (
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: entry.latestPct >= benchmark ? "#22c55e" : "#f87171" }}
                        />
                      )}
                      <span className="font-medium text-gray-900">{entry.name}</span>
                      {tierBadge(entry.tier)}
                    </div>
                  </td>
                  <td className="text-center px-3 py-2.5">
                    {entry.latestPct != null ? (
                      <span className={cn("font-bold tabular-nums text-sm", pctColor(entry.latestPct))}>
                        {entry.latestPct.toFixed(1)}%
                      </span>
                    ) : <span className="text-gray-300">—</span>}
                  </td>
                  <td className="text-center px-3 py-2.5">
                    {entry.avgPct != null ? (
                      <span className={cn("tabular-nums text-sm", pctColor(entry.avgPct))}>
                        {entry.avgPct.toFixed(1)}%
                      </span>
                    ) : <span className="text-gray-300">—</span>}
                  </td>
                  <td className="text-center px-3 py-2.5">
                    {entry.band ? <BandBadge band={entry.band} size="xs" /> : <span className="text-gray-300">—</span>}
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ── Record History Drawer ──────────────────────────────────────────────────

function HistoryDrawer({ trackerId, recordId, onClose, benchmark }: {
  trackerId: string; recordId: string; onClose: () => void; benchmark: number | null;
}) {
  const [data, setData]       = useState<RecordHistory | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/tracker/${trackerId}/records/${recordId}/history`)
      .then(r => setData(r.data)).catch(() => {}).finally(() => setLoading(false));
  }, [trackerId, recordId]);

  const bm = benchmark ?? data?.tracker.benchmarkScore ?? null;

  // Derive native scoring scale so Y-axis matches what users entered
  const _criteria = data?.tracker.criteria ?? [];
  const _formula  = data?.tracker.formula  ?? 'percentage';
  const yIsPercent = !data || _formula === 'percentage' || _criteria.every(c => c.scoreType === 'percentage');
  const yMin = yIsPercent ? 0
    : _formula === 'sum'
      ? _criteria.reduce((s, c) => s + c.minValue, 0)
      : Math.round(_criteria.reduce((s, c) => s + c.minValue, 0) / (_criteria.length || 1) * 100) / 100;
  const yMax = yIsPercent ? 100
    : _formula === 'sum'
      ? _criteria.reduce((s, c) => s + c.maxPoints, 0)
      : Math.round(_criteria.reduce((s, c) => s + c.maxPoints, 0) / (_criteria.length || 1) * 100) / 100;
  // Convert percentage benchmark to raw scale (bm is always stored as 0-100)
  const rawBm = bm != null ? (yIsPercent ? bm : Math.round((bm / 100) * yMax * 100) / 100) : null;

  // Build chart series — use raw total when on a native scale
  const chartData = (data?.history ?? []).map(h => ({
    label: h.label,
    pct: yIsPercent ? h.pctEquivalent : h.total,
    date: h.date,
  }));

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white w-full max-w-2xl h-full flex flex-col shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 shrink-0">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-blue-600" />
            <div>
              <h2 className="font-bold text-gray-900 text-lg">{loading ? "Loading…" : data?.name ?? "Progress"}</h2>
              {!loading && data && <p className="text-xs text-gray-400 mt-0.5">{data.sessionCount} session{data.sessionCount !== 1 ? "s" : ""} · {data.tracker.name}</p>}
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-md hover:bg-slate-100 text-gray-500"><X className="w-5 h-5" /></button>
        </div>

        {loading ? (
          <div className="flex-1 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-blue-500" /></div>
        ) : !data ? (
          <div className="flex-1 flex items-center justify-center text-gray-400">Failed to load history</div>
        ) : (
          <div className="flex-1 overflow-y-auto">

            {/* ── Session Progress Chart ───────────────────────────────────── */}
            <div className="px-6 pt-5 pb-4 border-b border-slate-100">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-700">Session Progress</h3>
                {bm != null && (
                  <span className="text-xs text-gray-400 flex items-center gap-1.5">
                    <span className="inline-block w-5 border-t-2 border-dashed border-red-400" />
                    Benchmark {yIsPercent ? `${bm}%` : rawBm?.toFixed(1)}
                    {!yIsPercent && <span className="opacity-60">({bm}%)</span>}
                  </span>
                )}
              </div>

              {chartData.length === 0 ? (
                <div className="flex items-center justify-center h-40 text-sm text-gray-400">
                  No sessions scored yet
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={240}>
                  <LineChart data={chartData} margin={{ top: 8, right: 20, left: -10, bottom: chartData.length > 4 ? 30 : 10 }}>
                    <defs>
                      <linearGradient id="lineGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.15} />
                        <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis
                      dataKey="label"
                      tick={{ fontSize: 10, fill: "#6b7280" }}
                      angle={chartData.length > 4 ? -35 : 0}
                      textAnchor={chartData.length > 4 ? "end" : "middle"}
                      padding={{ left: 30, right: 30 }}
                    />
                    <YAxis
                      domain={[yMin, yMax]}
                      tick={{ fontSize: 10, fill: "#6b7280" }}
                      tickFormatter={yIsPercent ? (v => `${v}%`) : (v => String(v))}
                    />
                    <Tooltip
                      formatter={(v: any) => [
                        v != null
                          ? (yIsPercent
                              ? `${Number(v).toFixed(1)}%`
                              : _formula === 'sum'
                                ? `${Number(v).toFixed(1)} / ${yMax}`
                                : Number(v).toFixed(1))
                          : "Not rated",
                        data.tracker.scoreLabel,
                      ]}
                      labelFormatter={(label) => `Session: ${label}`}
                      contentStyle={{ borderRadius: 8, fontSize: 12, border: "1px solid #e2e8f0" }}
                    />
                    {/* Benchmark shaded zones */}
                    {rawBm != null && <ReferenceArea y1={yMin} y2={rawBm} fill="#fef2f2" fillOpacity={0.6} />}
                    {rawBm != null && <ReferenceArea y1={rawBm} y2={yMax} fill="#f0fdf4" fillOpacity={0.6} />}
                    {/* Benchmark reference line */}
                    {rawBm != null && (
                      <ReferenceLine
                        y={rawBm} stroke="#ef4444" strokeDasharray="5 3" strokeWidth={2}
                        label={{ value: yIsPercent ? `${bm}%` : String(rawBm), position: "insideTopRight", fill: "#ef4444", fontSize: 11, fontWeight: 600 }}
                      />
                    )}
                    <Line
                      type="monotone"
                      dataKey="pct"
                      stroke="#3b82f6"
                      strokeWidth={2.5}
                      connectNulls
                      activeDot={{ r: 6, strokeWidth: 2, stroke: "white" }}
                      dot={(props: any) => {
                        const { cx, cy, payload, index } = props;
                        if (payload.pct == null) return <g key={index} />;
                        const color = rawBm != null
                          ? (payload.pct >= rawBm ? "#22c55e" : "#ef4444")
                          : "#3b82f6";
                        return (
                          <circle key={index} cx={cx} cy={cy} r={5}
                            fill={color} stroke="white" strokeWidth={2} />
                        );
                      }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}

              {/* Legend for benchmark zones */}
              {bm != null && chartData.length > 0 && (
                <div className="mt-3 flex items-center gap-5 text-xs text-gray-500">
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-full bg-green-500 inline-block" /> Above benchmark
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-full bg-red-400 inline-block" /> Below benchmark
                  </span>
                </div>
              )}
            </div>

            {/* ── Summary Stats ─────────────────────────────────────────────── */}
            <div className="p-6 grid grid-cols-3 gap-3 border-b border-slate-100">
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-center">
                <div className="text-xl font-bold text-gray-900">{data.sessionCount}</div>
                <div className="text-xs text-gray-500 mt-0.5">Sessions</div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-center">
                <div className={cn("text-xl font-bold", data.avgPct != null ? pctColor(data.avgPct) : "text-gray-400")}>
                  {data.avgPct != null ? `${data.avgPct.toFixed(1)}%` : "—"}
                </div>
                <div className="text-xs text-gray-500 mt-0.5">Overall Avg</div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-center">
                <div className={cn("text-xl font-bold", data.bestSession ? pctColor(data.bestSession.pctEquivalent) : "text-gray-400")}>
                  {data.bestSession ? `${data.bestSession.pctEquivalent.toFixed(1)}%` : "—"}
                </div>
                <div className="text-xs text-gray-500 mt-0.5">Best: {data.bestSession?.label ?? "—"}</div>
              </div>
            </div>

            {data.history.length === 0 ? (
              <div className="p-8 text-center text-gray-400">No sessions recorded yet.</div>
            ) : (
              <div className="p-6 space-y-4">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500">Session History</h3>
                {data.history.map((entry, idx) => (
                  <div key={entry.sessionId} className="rounded-xl border border-slate-200 bg-white overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-b border-slate-200">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold text-gray-400">#{data.history.length - idx}</span>
                        <span className="font-semibold text-gray-900">{entry.label}</span>
                        <span className="text-xs text-gray-400">{fmtDate(entry.date)}</span>
                        {entry.band && <BandBadge band={entry.band} size="xs" />}
                      </div>
                      {entry.pctEquivalent != null ? (
                        <span className={cn("text-sm font-bold tabular-nums", pctColor(entry.pctEquivalent))}>
                          {entry.pctEquivalent.toFixed(1)}%
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">Not rated</span>
                      )}
                    </div>
                    <div className="px-4 py-3">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2">
                        {data.tracker.criteria.map(c => {
                          const sc = entry.criteriaScores[c.id];
                          const maxV = c.scoreType === "percentage" ? 100 : c.maxPoints;
                          const minV = c.scoreType === "percentage" ? 0 : c.minValue;
                          const barPct = sc != null ? Math.max(0, Math.min(100, ((sc - minV) / Math.max(1, maxV - minV)) * 100)) : 0;
                          return (
                            <div key={c.id} className="flex items-center justify-between gap-3">
                              <span className="text-xs text-gray-600 truncate flex-1">{c.name}</span>
                              <div className="flex items-center gap-2 shrink-0">
                                <div className="w-12 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                  <div className={cn("h-full rounded-full", sc != null ? pctBg(barPct) : "bg-transparent")} style={{ width: `${barPct}%` }} />
                                </div>
                                <span className="text-xs font-medium tabular-nums text-gray-700 w-14 text-right">
                                  {sc != null ? `${sc} ${scoreHint(c)}` : "—"}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      {entry.total != null && (
                        <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between">
                          <span className="text-xs font-semibold text-gray-600">{data.tracker.scoreLabel}</span>
                          <div className="flex items-center gap-2">
                            <div className="w-20 h-2 bg-gray-100 rounded-full overflow-hidden">
                              <div className={cn("h-full rounded-full", pctBg(entry.pctEquivalent!))} style={{ width: `${Math.min(100, entry.pctEquivalent!)}%` }} />
                            </div>
                            <span className={cn("text-sm font-bold tabular-nums", pctColor(entry.pctEquivalent!))}>
                              {data.tracker.formula === "percentage" ? `${entry.pctEquivalent!.toFixed(1)}%`
                                : data.tracker.formula === "sum" ? `${entry.total} / ${entry.totalMax}`
                                : `${entry.total.toFixed(1)} avg`}
                            </span>
                          </div>
                        </div>
                      )}
                      {entry.notes && <p className="mt-2 text-xs text-gray-500 italic">{entry.notes}</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────

export default function TrackerGridPage() {
  const { id } = useParams<{ id: string }>();
  const router  = useRouter();

  const [sessions, setSessions]       = useState<Session[]>([]);
  const [activeSession, setActive]    = useState<Session | null>(null);
  const [data, setData]               = useState<GridData | null>(null);
  const [loading, setLoading]         = useState(true);
  const [gridLoading, setGridLoading] = useState(false);
  const [error, setError]             = useState<string | null>(null);
  const [search, setSearch]           = useState("");
  const [sortBy, setSortBy]           = useState<"name" | "score">("name");
  const [selectedBand, setSelectedBand] = useState<string | null>(null); // band id or null=all

  // View tab
  const [activeTab, setActiveTab] = useState<"grid" | "performance">("grid");

  // Performance data
  const [perfData, setPerfData]       = useState<PerfData | null>(null);
  const [perfLoading, setPerfLoading] = useState(false);

  // Autosave toggle + last-saved indicator
  const [autosave, setAutosave]     = useState(true);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);

  // Benchmark / performance messages settings state
  const [benchmarkScore, setBenchmarkScore] = useState<string>("");
  const [aboveMessage, setAboveMessage]     = useState("");
  const [belowMessage, setBelowMessage]     = useState("");

  const [historyRecord, setHistoryRecord] = useState<{ id: string; name: string } | null>(null);

  const [showNewSession, setShowNewSession] = useState(false);
  const [sessionForm, setSessionForm]       = useState({ label: "", date: new Date().toISOString().slice(0, 10), notes: "" });
  const [creatingSession, setCreatingSession] = useState(false);

  // Session edit
  const [editingSession, setEditingSession] = useState<Session | null>(null);
  const [editSessionForm, setEditSessionForm] = useState({ label: "", date: "", notes: "" });
  const [savingSession, setSavingSession]     = useState(false);

  // Settings
  const [showSettings, setShowSettings]   = useState(false);
  const [trackerName, setTrackerName]     = useState("");
  const [trackerDesc, setTrackerDesc]     = useState("");
  const [scoreLabel, setScoreLabel]       = useState("Total Score");
  const [formula, setFormula]             = useState("percentage");
  const [localBands, setLocalBands]       = useState<Band[]>([]);
  // Global scoring scale — shared by all criteria
  const [globalScoreType, setGlobalScoreType] = useState("points");
  const [globalMinValue, setGlobalMinValue]   = useState(0);
  const [globalMaxPoints, setGlobalMaxPoints] = useState(10);
  const [newCrit, setNewCrit]             = useState({ name: "", weight: 0 });
  const [editingCritId, setEditingCritId] = useState<string | null>(null);
  const [editCritForm, setEditCritForm]   = useState({ name: "", description: "", weight: 0 });
  const [savingSettings, setSavingSettings] = useState(false);

  // Share / access control
  const [shareMode, setShareMode]   = useState<"all" | "selected">("all");
  const [accessTab, setAccessTab]   = useState<"users" | "depts">("users");
  const [sharedUsers, setSharedUsers] = useState<string[]>([]);
  const [sharedDepts, setSharedDepts] = useState<string[]>([]);
  const [allUsers, setAllUsers]     = useState<{ id: string; firstName?: string; lastName?: string; email: string }[]>([]);
  const [allDepts, setAllDepts]     = useState<{ id: string; name: string }[]>([]);

  // Load sessions
  useEffect(() => {
    api.get(`/tracker/${id}/sessions`)
      .then(r => {
        const list: Session[] = r.data;
        setSessions(list);
        if (list.length > 0) setActive(list[0]);
        else setLoading(false);
      })
      .catch(() => { setError("Failed to load tracker"); setLoading(false); });
  }, [id]);

  // Load grid when session changes
  useEffect(() => {
    if (!activeSession) return;
    setGridLoading(true);
    api.get(`/tracker/${id}/grid`, { params: { sessionId: activeSession.id } })
      .then(r => {
        setData(r.data);
        setTrackerName(r.data.tracker.name);
        setTrackerDesc(r.data.tracker.description ?? "");
        setScoreLabel(r.data.tracker.scoreLabel ?? "Total Score");
        setFormula(r.data.tracker.formula ?? "percentage");
        setLocalBands(r.data.tracker.bands ?? []);
        const pub = r.data.tracker.isPublic !== false;
        setShareMode(pub ? "all" : "selected");
        setSharedUsers(r.data.tracker.sharedUsers ?? []);
        setSharedDepts(r.data.tracker.sharedDepts ?? []);
        {
          // Convert stored pct → native scale for the input
          const _bmpct  = r.data.tracker.benchmarkScore;
          const _bmcrit: Criteria[] = r.data.tracker.criteria ?? [];
          const _bmfmla = r.data.tracker.formula ?? 'percentage';
          const _bmIsPct = _bmfmla === 'percentage' || _bmcrit.length === 0 || _bmcrit.every(c => c.scoreType === 'percentage');
          const _bmMax   = _bmIsPct ? 100
            : _bmfmla === 'sum' ? _bmcrit.reduce((s, c) => s + c.maxPoints, 0) : (_bmcrit[0]?.maxPoints ?? 100);
          const _bmNat   = !_bmIsPct && _bmpct != null && _bmMax > 0
            ? Math.round((_bmpct / 100) * _bmMax * 100) / 100 : _bmpct;
          setBenchmarkScore(_bmNat != null ? String(_bmNat) : "");
        }
        const msgs = r.data.tracker.performanceMessages ?? {};
        setAboveMessage(msgs.above ?? "");
        setBelowMessage(msgs.below ?? "");
        // Initialise global score scale from first criterion (all criteria share the same type/range)
        const firstCrit = r.data.tracker.criteria?.[0];
        if (firstCrit) {
          setGlobalScoreType(firstCrit.scoreType ?? "points");
          setGlobalMinValue(firstCrit.minValue ?? 0);
          setGlobalMaxPoints(firstCrit.maxPoints ?? 10);
        }
      })
      .catch(() => setError("Failed to load grid"))
      .finally(() => { setLoading(false); setGridLoading(false); });
  }, [id, activeSession]);

  // Fetch performance data when switching to Performance tab
  useEffect(() => {
    if (activeTab !== "performance") return;
    if (perfData) return;
    setPerfLoading(true);
    api.get(`/tracker/${id}/performance`)
      .then(r => setPerfData(r.data))
      .catch(() => {})
      .finally(() => setPerfLoading(false));
  }, [id, activeTab]); // eslint-disable-line

  const handleScoreSaved = useCallback((criteriaId: string, recordId: string, score: number | null) => {
    setData(prev => {
      if (!prev) return prev;
      const { criteria, formula: f, bands } = prev.tracker;
      const rows = prev.rows.map(row => {
        if (row.id !== recordId) return row;
        const updated = { ...row.criteriaScores, [criteriaId]: score };
        const { total, totalMax, pctEquivalent } = calcTotalsClient(criteria, updated, f);
        const band = assignBandClient(f, total, pctEquivalent, bands);
        return { ...row, criteriaScores: updated, total, totalMax, pctEquivalent, band };
      });
      return { ...prev, rows };
    });
    setLastSavedAt(new Date());
  }, []);

  const handleCreateSession = async () => {
    if (!sessionForm.label.trim()) return;
    setCreatingSession(true);
    try {
      const { data: sess } = await api.post(`/tracker/${id}/sessions`, {
        label: sessionForm.label.trim(), date: sessionForm.date, notes: sessionForm.notes.trim() || undefined,
      });
      const updated = [sess, ...sessions];
      setSessions(updated); setActive(sess); setShowNewSession(false);
      setSessionForm({ label: "", date: new Date().toISOString().slice(0, 10), notes: "" });
    } catch { alert("Failed to create session"); }
    finally { setCreatingSession(false); }
  };

  const handleDeleteSession = async (sid: string) => {
    if (!confirm("Delete this session and all its scores?")) return;
    try {
      await api.delete(`/tracker/${id}/sessions/${sid}`);
      const updated = sessions.filter(s => s.id !== sid);
      setSessions(updated);
      if (activeSession?.id === sid) setActive(updated[0] ?? null);
    } catch { alert("Failed to delete session"); }
  };

  const openEditSession = (s: Session) => {
    setEditingSession(s);
    setEditSessionForm({ label: s.label, date: s.date.slice(0, 10), notes: s.notes ?? "" });
  };

  const handleEditSession = async () => {
    if (!editingSession || !editSessionForm.label.trim()) return;
    setSavingSession(true);
    try {
      const { data: updated } = await api.patch(`/tracker/${id}/sessions/${editingSession.id}`, {
        label: editSessionForm.label.trim(),
        date: editSessionForm.date,
        notes: editSessionForm.notes.trim() || undefined,
      });
      setSessions(prev => prev.map(s => s.id === updated.id ? { ...s, ...updated } : s));
      if (activeSession?.id === updated.id) setActive(prev => prev ? { ...prev, ...updated } : prev);
      setEditingSession(null);
    } catch { alert("Failed to update session"); }
    finally { setSavingSession(false); }
  };

  const handleOpenSettings = () => {
    if (allUsers.length === 0) {
      api.get("/users").then(r => setAllUsers(Array.isArray(r.data) ? r.data : (r.data?.users ?? []))).catch(() => {});
    }
    if (allDepts.length === 0) {
      api.get("/departments").then(r => setAllDepts(Array.isArray(r.data) ? r.data : (r.data?.departments ?? []))).catch(() => {});
    }
    setShowSettings(true);
  };

  const handleSaveSettings = async () => {
    if (!data) return;
    setSavingSettings(true);
    try {
      const isPublic = shareMode === "all";
      const prevFormula = data.tracker.formula;

      // Convert native benchmark value → pct (0-100) for storage
      const _bmNative = benchmarkScore !== "" ? parseFloat(benchmarkScore) : null;
      const _bmCrit   = data.tracker.criteria ?? [];
      const _bmIsPct  = formula === 'percentage' || _bmCrit.length === 0 || _bmCrit.every(c => c.scoreType === 'percentage');
      const _bmMax    = _bmIsPct ? 100
        : formula === 'sum' ? _bmCrit.reduce((s, c) => s + c.maxPoints, 0) : (_bmCrit[0]?.maxPoints ?? 100);
      const _bmPct    = _bmNative != null && !_bmIsPct && _bmMax > 0
        ? Math.round((_bmNative / _bmMax) * 100 * 100) / 100 : _bmNative;

      await api.patch(`/tracker/${id}`, {
        name: trackerName, description: trackerDesc || null, scoreLabel, formula,
        isPublic, sharedUsers: isPublic ? [] : sharedUsers, sharedDepts: isPublic ? [] : sharedDepts,
        benchmarkScore: _bmPct,
        performanceMessages: { above: aboveMessage.trim() || null, below: belowMessage.trim() || null },
      });

      // Sync global scoring scale to every criterion that differs
      const newMinValue  = globalScoreType === "rating"     ? globalMinValue  : 0;
      const newMaxPoints = globalScoreType === "percentage" ? 100             : globalMaxPoints;
      const criteriaToSync = data.tracker.criteria.filter(c =>
        c.scoreType !== globalScoreType || c.minValue !== newMinValue || c.maxPoints !== newMaxPoints
      );
      if (criteriaToSync.length > 0) {
        await Promise.all(criteriaToSync.map(c =>
          api.patch(`/tracker/${id}/criteria/${c.id}`, {
            scoreType: globalScoreType, minValue: newMinValue, maxPoints: newMaxPoints, weight: c.weight,
          })
        ));
      }

      setData(prev => prev ? {
        ...prev,
        tracker: {
          ...prev.tracker,
          name: trackerName, description: trackerDesc || null, scoreLabel, formula, bands: localBands,
          isPublic, sharedUsers: isPublic ? [] : sharedUsers, sharedDepts: isPublic ? [] : sharedDepts,
          criteria: prev.tracker.criteria.map(c => ({
            ...c, scoreType: globalScoreType, minValue: newMinValue, maxPoints: newMaxPoints,
          })),
        },
      } : prev);
      setShowSettings(false);

      // Reload grid when formula changed — row totals are formula-dependent
      if (formula !== prevFormula && activeSession) {
        setGridLoading(true);
        const resp = await api.get(`/tracker/${id}/grid`, { params: { sessionId: activeSession.id } });
        setData(resp.data);
        setGridLoading(false);
      }
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? err?.message ?? "Unknown error";
      alert(`Failed to save: ${msg}`);
      console.error("[Tracker] settings save failed:", err?.response?.data ?? err);
    }
    finally { setSavingSettings(false); }
  };

  const handleAddCriteria = async () => {
    if (!newCrit.name.trim()) return;
    try {
      const { data: c } = await api.post(`/tracker/${id}/criteria`, {
        name: newCrit.name.trim(),
        scoreType: globalScoreType,
        minValue: globalScoreType === "rating" ? globalMinValue : 0,
        maxPoints: globalScoreType === "percentage" ? 100 : globalMaxPoints,
        weight: globalScoreType === "percentage" ? newCrit.weight : 0,
      });
      setData(prev => {
        if (!prev) return prev;
        const criteria = [...prev.tracker.criteria, c];
        const totalMax = criteria.reduce((s, cr) => s + cr.maxPoints, 0);
        return { ...prev, tracker: { ...prev.tracker, criteria, totalMax } };
      });
      setNewCrit({ name: "", weight: 0 });
    } catch { alert("Failed to add criteria"); }
  };

  const handleEditCriteria = async (criteriaId: string) => {
    try {
      const { data: updated } = await api.patch(`/tracker/${id}/criteria/${criteriaId}`, {
        name: editCritForm.name.trim(),
        description: editCritForm.description.trim() || undefined,
        weight: globalScoreType === "percentage" ? editCritForm.weight : 0,
      });
      setData(prev => prev ? {
        ...prev,
        tracker: { ...prev.tracker, criteria: prev.tracker.criteria.map(c => c.id === criteriaId ? { ...c, ...updated } : c) },
      } : prev);
      setEditingCritId(null);
    } catch { alert("Failed to update criteria"); }
  };

  const handleDeleteCriteria = async (cid: string) => {
    try {
      await api.delete(`/tracker/${id}/criteria/${cid}`);
      setData(prev => {
        if (!prev) return prev;
        const criteria = prev.tracker.criteria.filter(c => c.id !== cid);
        const totalMax = criteria.reduce((s, c) => s + c.maxPoints, 0);
        return { ...prev, tracker: { ...prev.tracker, criteria, totalMax } };
      });
    } catch { alert("Failed to delete criteria"); }
  };

  const exportCSV = () => {
    if (!data) return;
    const { criteria, scoreLabel: sl, formula: f } = data.tracker;
    const headers = ["Name", "Session", "Band", ...criteria.map(c => `${c.name} (${criteriaHeader(c)})`), sl, "%"].join(",");
    const csvRows = sortedRows.map(row => {
      const scores = criteria.map(c => row.criteriaScores[c.id] ?? "").join(",");
      const total = f === "percentage" ? (row.pctEquivalent != null ? `${row.pctEquivalent.toFixed(1)}%` : "")
        : f === "sum" ? (row.total != null ? `${row.total} / ${row.totalMax}` : "")
        : (row.total != null ? `${row.total.toFixed(1)} avg` : "");
      return `"${row.name}","${data.session.label}","${row.band?.name ?? "—"}",${scores},"${total}",${row.pctEquivalent != null ? row.pctEquivalent.toFixed(1) + "%" : ""}`;
    });
    const blob = new Blob([[headers, ...csvRows].join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `${data.tracker.name}-${data.session.label}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-blue-500" /></div>;
  if (error) return <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-red-600">{error}</div>;

  const tracker = data?.tracker;
  const rows    = data?.rows ?? [];

  // Derive band counts for summary
  const bandCounts: Record<string, number> = {};
  for (const row of rows) { if (row.band) bandCounts[row.band.id] = (bandCounts[row.band.id] ?? 0) + 1; }
  const unassigned = rows.filter(r => r.pctEquivalent != null && r.band == null).length;

  // Filter
  let filtered = rows;
  if (search) filtered = filtered.filter(r => r.name.toLowerCase().includes(search.toLowerCase()));
  if (selectedBand) filtered = filtered.filter(r => r.band?.id === selectedBand);
  const sortedRows = [...filtered].sort((a, b) =>
    sortBy === "score" ? (b.pctEquivalent ?? -1) - (a.pctEquivalent ?? -1) : a.name.localeCompare(b.name)
  );

  const ratedCount = rows.filter(r => r.total != null).length;
  const ratedWithPct = rows.filter(r => r.pctEquivalent != null);
  const avgScore = ratedWithPct.length > 0 ? ratedWithPct.reduce((s, r) => s + r.pctEquivalent!, 0) / ratedWithPct.length : null;
  const formulaLabel = { percentage: "Percentage", sum: "Sum", average: "Average" }[tracker?.formula ?? "percentage"] ?? "Percentage";

  const orderedBands = tracker ? [...tracker.bands].sort((a, b) => a.minVal - b.minVal) : [];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push("/tracker")} className="p-1.5 rounded-md hover:bg-slate-100 text-gray-500">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{tracker?.name ?? "Tracker"}</h1>
            <p className="text-sm text-gray-500">{tracker?.module.name} · {tracker?.criteria.length ?? 0} criteria · {formulaLabel}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Autosave toggle */}
          <button
            onClick={() => setAutosave(a => !a)}
            className={cn(
              "h-9 px-3 rounded-md border text-xs font-medium flex items-center gap-1.5 transition-colors",
              autosave
                ? "bg-green-50 border-green-200 text-green-700 hover:bg-green-100"
                : "bg-slate-50 border-slate-200 text-gray-500 hover:bg-slate-100"
            )}
            title={autosave ? "Autosave is ON — click to save only on blur" : "Autosave is OFF — scores save when you leave a cell"}
          >
            <span className={cn("w-2 h-2 rounded-full", autosave ? "bg-green-500" : "bg-gray-400")} />
            Autosave {autosave ? "ON" : "OFF"}
          </button>
          {lastSavedAt && (
            <span className="text-xs text-gray-400 whitespace-nowrap">
              Saved {lastSavedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </span>
          )}
          <Button variant="outline" className="gap-2 h-9" onClick={exportCSV} disabled={!data || rows.length === 0}>
            <Download className="w-4 h-4" /> Export
          </Button>
          <Button variant="outline" className="gap-2 h-9" onClick={handleOpenSettings}>
            <Settings className="w-4 h-4" /> Settings
          </Button>
        </div>
      </div>

      {/* Tab strip */}
      <div className="flex gap-1 border-b border-slate-200">
        <button
          onClick={() => setActiveTab("grid")}
          className={cn(
            "flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors",
            activeTab === "grid"
              ? "border-blue-600 text-blue-700"
              : "border-transparent text-gray-500 hover:text-gray-700"
          )}
        >
          <BarChart2 className="w-4 h-4" /> Score Grid
        </button>
        <button
          onClick={() => setActiveTab("performance")}
          className={cn(
            "flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors",
            activeTab === "performance"
              ? "border-blue-600 text-blue-700"
              : "border-transparent text-gray-500 hover:text-gray-700"
          )}
        >
          <TrendingUp className="w-4 h-4" /> Performance
        </button>
      </div>

      {/* ── PERFORMANCE TAB ──────────────────────────────────────────────── */}
      {activeTab === "performance" && (
        <PerformanceView
          perfData={perfData}
          loading={perfLoading}
          criteria={data?.tracker.criteria ?? []}
          onRefresh={() => {
            setPerfLoading(true);
            api.get(`/tracker/${id}/performance`)
              .then(r => setPerfData(r.data))
              .catch(() => {})
              .finally(() => setPerfLoading(false));
          }}
        />
      )}

      {/* ── GRID TAB ─────────────────────────────────────────────────────── */}
      {activeTab === "grid" && <>

      {/* Session row */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <Calendar className="w-4 h-4 text-gray-400 shrink-0" />
          <span className="text-sm font-medium text-gray-600 shrink-0">Session:</span>
          {sessions.length === 0 ? (
            <span className="text-sm text-gray-400 italic">No sessions yet</span>
          ) : (
            <Select value={activeSession?.id ?? ""} onValueChange={v => setActive(sessions.find(s => s.id === v) ?? null)}>
              <SelectTrigger className="h-9 w-full max-w-[260px] min-w-0 truncate">
                <SelectValue placeholder="Select session…" />
              </SelectTrigger>
              <SelectContent>
                {sessions.map(s => (
                  <SelectItem key={s.id} value={s.id}>
                    <div className="flex items-center gap-2">
                      <span>{s.label}</span>
                      <span className="text-gray-400 text-xs">{fmtDate(s.date)}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {activeSession && (
            <>
              <button onClick={() => openEditSession(activeSession)} className="p-1 rounded text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors" title="Edit session">
                <Pencil className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => handleDeleteSession(activeSession.id)} className="p-1 rounded text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors" title="Delete session">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </>
          )}
        </div>
        <Button onClick={() => setShowNewSession(true)} className="bg-blue-600 hover:bg-blue-700 text-white h-9 gap-1.5 shrink-0">
          <Plus className="w-4 h-4" /> New Session
        </Button>
      </div>

      {/* No session state */}
      {sessions.length === 0 && (
        <div className="rounded-xl border-2 border-dashed border-slate-300 bg-white p-12 text-center">
          <Clock className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-600 font-medium">No sessions yet</p>
          <p className="text-gray-400 text-sm mt-1">Create a session to start rating records</p>
          <Button className="mt-4 bg-blue-600 hover:bg-blue-700 text-white" onClick={() => setShowNewSession(true)}>
            <Plus className="w-4 h-4 mr-2" /> Create First Session
          </Button>
        </div>
      )}

      {activeSession && tracker && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 min-w-0">
              <div className="text-xl font-bold text-gray-900">{rows.length}</div>
              <div className="text-xs text-gray-500 mt-0.5">Records</div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 min-w-0">
              <div className="text-xl font-bold text-gray-900">{ratedCount} / {rows.length}</div>
              <div className="text-xs text-gray-500 mt-0.5">Rated</div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 min-w-0">
              <div className={cn("text-xl font-bold", avgScore != null ? pctColor(avgScore) : "text-gray-400")}>
                {avgScore != null ? `${avgScore.toFixed(1)}%` : "—"}
              </div>
              <div className="text-xs text-gray-500 mt-0.5">Avg Score</div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 min-w-0">
              <div className="text-xl font-bold text-gray-900">{tracker.bands.length}</div>
              <div className="text-xs text-gray-500 mt-0.5">Bands defined</div>
            </div>
          </div>

          {/* Band distribution bar */}
          {tracker.bands.length > 0 && ratedWithPct.length > 0 && (
            <div className="rounded-xl border border-slate-200 bg-white px-5 py-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-semibold text-gray-700 flex items-center gap-2"><Tag className="w-4 h-4 text-blue-500" /> Band Distribution</p>
                {selectedBand && (
                  <button onClick={() => setSelectedBand(null)} className="text-xs text-blue-600 hover:underline">Clear filter</button>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setSelectedBand(null)}
                  className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors",
                    !selectedBand ? "bg-gray-900 text-white border-gray-900" : "border-slate-200 text-gray-600 hover:bg-slate-50")}
                >
                  All <span className="font-bold">{ratedWithPct.length}</span>
                </button>
                {orderedBands.map(b => {
                  const count = bandCounts[b.id] ?? 0;
                  const isActive = selectedBand === b.id;
                  return (
                    <button
                      key={b.id}
                      onClick={() => setSelectedBand(isActive ? null : b.id)}
                      className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors")}
                      style={isActive
                        ? { backgroundColor: b.color, color: "#fff", borderColor: b.color }
                        : { backgroundColor: b.color + "15", color: b.color, borderColor: b.color + "44" }}
                    >
                      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: isActive ? "#fff" : b.color }} />
                      {b.name} <span className="font-bold">{count}</span>
                    </button>
                  );
                })}
                {unassigned > 0 && (
                  <span className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium border border-slate-200 text-gray-400">
                    Unassigned {unassigned}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* No criteria prompt */}
          {tracker.criteria.length === 0 && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 flex items-center gap-3">
              <p className="text-amber-600 text-sm flex-1">No scoring criteria yet. Open Settings to add criteria.</p>
              <Button size="sm" variant="outline" onClick={() => setShowSettings(true)}>
                <Settings className="w-4 h-4 mr-1.5" /> Add Criteria
              </Button>
            </div>
          )}

          {/* Search + sort */}
          {tracker.criteria.length > 0 && (
            <div className="flex gap-3 flex-wrap items-center">
              <div className="relative flex-1 min-w-48">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name…" className="pl-9 h-9" />
                {search && <button onClick={() => setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>}
              </div>
              <Button variant="outline" size="sm" className="gap-1.5 h-9" onClick={() => setSortBy(s => s === "name" ? "score" : "name")}>
                <ArrowUpDown className="w-4 h-4" /> Sort: {sortBy === "name" ? "Name" : tracker.scoreLabel}
              </Button>
            </div>
          )}

          {/* Grid */}
          {tracker.criteria.length > 0 && (
            gridLoading ? (
              <div className="flex items-center justify-center h-32"><Loader2 className="w-6 h-6 animate-spin text-blue-400" /></div>
            ) : rows.length === 0 ? (
              <div className="rounded-xl border border-slate-200 bg-white p-12 text-center text-gray-400">
                No records in <strong>{tracker.module.name}</strong> yet.
              </div>
            ) : (
              <div className="rounded-xl border border-slate-200 shadow-sm bg-white overflow-hidden min-w-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50">
                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide sticky left-0 bg-slate-50 z-10 min-w-[220px]">Name</th>
                        {tracker.criteria.map(c => (
                          <th key={c.id} className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide min-w-[120px]">
                            <div className="whitespace-nowrap">{c.name}</div>
                            <div className="text-gray-400 font-normal normal-case tracking-normal mt-0.5">{criteriaHeader(c)}</div>
                          </th>
                        ))}
                        <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide min-w-[150px]">
                          {tracker.scoreLabel}
                          <div className="text-gray-400 font-normal normal-case tracking-normal mt-0.5">{formulaLabel}</div>
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {sortedRows.map(row => (
                        <tr key={row.id} className="hover:bg-slate-50 transition-colors group">
                          <td className="px-4 py-3 sticky left-0 bg-white group-hover:bg-slate-50 transition-colors z-10">
                            <div className="flex items-center gap-2 flex-wrap">
                              {row.total != null && !row.band && <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />}
                              <button
                                onClick={() => setHistoryRecord({ id: row.id, name: row.name })}
                                className="font-semibold text-gray-900 hover:text-blue-600 hover:underline text-left whitespace-nowrap flex items-center gap-1"
                              >
                                {row.name}
                                <History className="w-3.5 h-3.5 opacity-0 group-hover:opacity-60 transition-opacity" />
                              </button>
                              {row.band && <BandBadge band={row.band} />}
                            </div>
                          </td>
                          {tracker.criteria.map(c => (
                            <td key={c.id} className="px-4 py-2 text-center">
                              <ScoreCell
                                recordId={row.id} criteriaId={c.id}
                                trackerId={id} sessionId={activeSession.id}
                                criteria={c} initial={row.criteriaScores[c.id] ?? null}
                                onSaved={handleScoreSaved}
                                autosave={autosave}
                              />
                            </td>
                          ))}
                          <td className="px-4 py-3 text-center">
                            <TotalCell row={row} formula={tracker.formula} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="px-4 py-2.5 border-t border-slate-100 bg-slate-50 text-xs text-gray-500 flex items-center gap-3">
                  <span>{sortedRows.length} record{sortedRows.length !== 1 ? "s" : ""}{search && ` matching "${search}"`}{selectedBand && ` in "${tracker.bands.find(b => b.id === selectedBand)?.name}"`}</span>
                  {avgScore != null && <span>· Avg: <strong className={pctColor(avgScore)}>{avgScore.toFixed(1)}%</strong></span>}
                </div>
              </div>
            )
          )}
        </>
      )}

      </> /* end grid tab */}

      {/* New Session Dialog */}
      <Dialog open={showNewSession} onOpenChange={setShowNewSession}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>New Session</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Session Name <span className="text-red-500">*</span></Label>
              <Input value={sessionForm.label} onChange={e => setSessionForm(f => ({ ...f, label: e.target.value }))} placeholder="e.g. Term 1 2026, Q2 Assessment…" className="mt-1" autoFocus />
            </div>
            <div>
              <Label>Date</Label>
              <Input type="date" value={sessionForm.date} onChange={e => setSessionForm(f => ({ ...f, date: e.target.value }))} className="mt-1" />
            </div>
            <div>
              <Label>Notes <span className="text-gray-400 text-xs">(optional)</span></Label>
              <Input value={sessionForm.notes} onChange={e => setSessionForm(f => ({ ...f, notes: e.target.value }))} placeholder="Any notes…" className="mt-1" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewSession(false)}>Cancel</Button>
            <Button onClick={handleCreateSession} disabled={creatingSession || !sessionForm.label.trim()} className="bg-blue-600 hover:bg-blue-700 text-white">
              {creatingSession && <Loader2 className="w-4 h-4 animate-spin mr-2" />} Create Session
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Session Dialog */}
      <Dialog open={!!editingSession} onOpenChange={v => { if (!v) setEditingSession(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Edit Session</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Session Name <span className="text-red-500">*</span></Label>
              <Input value={editSessionForm.label} onChange={e => setEditSessionForm(f => ({ ...f, label: e.target.value }))} placeholder="e.g. Term 1 2026, Q2 Assessment…" className="mt-1" autoFocus />
            </div>
            <div>
              <Label>Date</Label>
              <Input type="date" value={editSessionForm.date} onChange={e => setEditSessionForm(f => ({ ...f, date: e.target.value }))} className="mt-1" />
            </div>
            <div>
              <Label>Notes <span className="text-gray-400 text-xs">(optional)</span></Label>
              <Input value={editSessionForm.notes} onChange={e => setEditSessionForm(f => ({ ...f, notes: e.target.value }))} placeholder="Any notes…" className="mt-1" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingSession(null)}>Cancel</Button>
            <Button onClick={handleEditSession} disabled={savingSession || !editSessionForm.label.trim()} className="bg-blue-600 hover:bg-blue-700 text-white">
              {savingSession && <Loader2 className="w-4 h-4 animate-spin mr-2" />} Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Settings Dialog */}
      <Dialog open={showSettings} onOpenChange={setShowSettings}>
        <DialogContent className="max-w-xl max-h-[90vh] flex flex-col">
          <DialogHeader><DialogTitle>Tracker Settings</DialogTitle></DialogHeader>
          <div className="flex-1 overflow-y-auto space-y-6 py-2">

            {/* General */}
            <div className="space-y-3">
              <div>
                <Label>Name</Label>
                <Input value={trackerName} onChange={e => setTrackerName(e.target.value)} className="mt-1" />
              </div>
              <div>
                <Label>Description <span className="text-gray-400 text-xs">(optional)</span></Label>
                <Input value={trackerDesc} onChange={e => setTrackerDesc(e.target.value)} className="mt-1" placeholder="Brief description" />
              </div>
              <div>
                <Label>Score Column Label</Label>
                <Input value={scoreLabel} onChange={e => setScoreLabel(e.target.value)} className="mt-1" placeholder="e.g. GPA, Final Grade, Performance…" />
              </div>
            </div>

            <hr className="border-slate-200" />

            {/* Formula */}
            <div className="space-y-2">
              <h3 className="font-semibold text-gray-900">Aggregation Method</h3>
              <Select value={formula} onValueChange={setFormula}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="percentage">Weighted Percentage — combine criteria using their weights</SelectItem>
                  <SelectItem value="sum">Sum — add all raw scores together (bands use total points)</SelectItem>
                  <SelectItem value="average">Average — mean across all criteria scores</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-400">Controls how individual criteria scores are <strong>combined</strong> into one total. This is separate from each criterion&apos;s own score type — you can freely mix rating, points, and percentage criteria regardless of this setting.</p>
            </div>

            <hr className="border-slate-200" />

            {/* Global Scoring Scale */}
            <div className="space-y-3">
              <div>
                <h3 className="font-semibold text-gray-900">Scoring Scale</h3>
                <p className="text-xs text-gray-400 mt-0.5">One scale applies to all criteria — type, min and max are shared</p>
              </div>
              <div className="flex gap-2 flex-wrap items-start">
                <div className="flex-1 min-w-36">
                  <p className="text-[10px] text-gray-500 mb-1">Score Type</p>
                  <Select value={globalScoreType} onValueChange={v => setGlobalScoreType(v)}>
                    <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="points">Points (0 – max)</SelectItem>
                      <SelectItem value="rating">Rating (min – max)</SelectItem>
                      <SelectItem value="percentage">Percentage (0 – 100%)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {globalScoreType === "rating" && (
                  <>
                    <div>
                      <p className="text-[10px] text-gray-500 mb-1">Min</p>
                      <Input type="number" min={0} value={globalMinValue} onChange={e => setGlobalMinValue(parseInt(e.target.value) || 0)} className="w-16 h-8 text-sm text-center" />
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-500 mb-1">Max</p>
                      <Input type="number" min={1} value={globalMaxPoints} onChange={e => setGlobalMaxPoints(parseInt(e.target.value) || 5)} className="w-16 h-8 text-sm text-center" />
                    </div>
                  </>
                )}
                {globalScoreType === "points" && (
                  <div>
                    <p className="text-[10px] text-gray-500 mb-1">Max Points</p>
                    <Input type="number" min={1} max={1000} value={globalMaxPoints} onChange={e => setGlobalMaxPoints(parseInt(e.target.value) || 10)} className="w-24 h-8 text-sm text-center" />
                  </div>
                )}
              </div>
              {globalScoreType === "percentage" && (
                <p className="text-[11px] text-gray-500 bg-slate-50 border border-slate-200 rounded-md px-2.5 py-1.5">
                  Scale fixed at 0–100%. Set individual <strong>weight %</strong> per criterion below.
                </p>
              )}
              {/* Warn if the global scale differs from what criteria currently have */}
              {(data?.tracker.criteria.length ?? 0) > 0 && (() => {
                const first = data!.tracker.criteria[0];
                const changed = first.scoreType !== globalScoreType ||
                  (globalScoreType === "rating" && (first.minValue !== globalMinValue || first.maxPoints !== globalMaxPoints)) ||
                  (globalScoreType === "points" && first.maxPoints !== globalMaxPoints);
                return changed ? (
                  <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-2.5 py-1.5">
                    Changed scale will be applied to all {data!.tracker.criteria.length} criteria when you Save.
                  </p>
                ) : null;
              })()}
            </div>

            <hr className="border-slate-200" />

            {/* Criteria list */}
            <div>
              <h3 className="font-semibold text-gray-900 mb-3">Scoring Criteria</h3>
              {data?.tracker.criteria.length === 0 ? (
                <p className="text-sm text-gray-400 mb-3">No criteria yet.</p>
              ) : (
                <div className="space-y-2 mb-3">
                  {data?.tracker.criteria.map(c => (
                    <div key={c.id}>
                      {editingCritId === c.id ? (
                        <div className="rounded-lg border border-blue-200 px-3 py-2 bg-blue-50 space-y-2">
                          <Input value={editCritForm.name} onChange={e => setEditCritForm(f => ({ ...f, name: e.target.value }))} placeholder="Criterion name" className="h-8 text-sm" autoFocus />
                          <Input value={editCritForm.description} onChange={e => setEditCritForm(f => ({ ...f, description: e.target.value }))} placeholder="Description (optional)" className="h-8 text-sm" />
                          {globalScoreType === "percentage" && (
                            <div className="flex items-center gap-2">
                              <p className="text-[10px] text-gray-600 whitespace-nowrap shrink-0">Weight %</p>
                              <Input type="number" min={0} max={100} value={editCritForm.weight} onChange={e => setEditCritForm(f => ({ ...f, weight: parseInt(e.target.value) || 0 }))} className="w-20 h-8 text-sm text-center" />
                            </div>
                          )}
                          <div className="flex gap-1">
                            <Button size="sm" className="h-8 bg-blue-600 hover:bg-blue-700 text-white" onClick={() => handleEditCriteria(c.id)} disabled={!editCritForm.name.trim()}>Save</Button>
                            <Button size="sm" variant="outline" className="h-8" onClick={() => setEditingCritId(null)}>Cancel</Button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-3 rounded-lg border border-slate-200 px-3 py-2 bg-slate-50">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm text-gray-900 truncate">{c.name}</p>
                            {c.description && <p className="text-xs text-gray-500 truncate">{c.description}</p>}
                          </div>
                          {globalScoreType === "percentage" && (
                            <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full whitespace-nowrap shrink-0">
                              {c.weight}%
                            </span>
                          )}
                          <button onClick={() => { setEditingCritId(c.id); setEditCritForm({ name: c.name, description: c.description ?? "", weight: c.weight }); }} className="text-gray-400 hover:text-blue-600 transition-colors shrink-0">
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleDeleteCriteria(c.id)} className="text-gray-400 hover:text-red-600 transition-colors shrink-0">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Weight sum indicator */}
              {globalScoreType === "percentage" && (data?.tracker.criteria.length ?? 0) > 0 && (() => {
                const weightSum = (data?.tracker.criteria ?? []).reduce((s, c) => s + c.weight, 0);
                const ok = weightSum === 100;
                return (
                  <div className={cn("mb-3 text-xs px-3 py-2 rounded-lg border", ok ? "bg-green-50 border-green-200 text-green-700" : "bg-amber-50 border-amber-200 text-amber-700")}>
                    Weights total: {weightSum}% {ok ? "✓ OK" : "⚠ Should sum to 100%"}
                  </div>
                );
              })()}

              {/* Add criterion */}
              <div className="rounded-lg border border-dashed border-slate-300 p-3 space-y-2">
                <p className="text-xs font-medium text-gray-600">Add criterion</p>
                <div className="flex gap-2 items-center">
                  <Input
                    value={newCrit.name}
                    onChange={e => setNewCrit(n => ({ ...n, name: e.target.value }))}
                    onKeyDown={e => e.key === "Enter" && handleAddCriteria()}
                    placeholder="e.g. Communication, Attendance, Grade…"
                    className="h-8 text-sm flex-1"
                  />
                  {globalScoreType === "percentage" && (
                    <>
                      <Input type="number" min={0} max={100} value={newCrit.weight} onChange={e => setNewCrit(n => ({ ...n, weight: parseInt(e.target.value) || 0 }))} className="w-16 h-8 text-sm text-center" placeholder="wt%" />
                      <span className="text-xs text-gray-400 shrink-0">%</span>
                    </>
                  )}
                  <Button size="sm" className="h-8 bg-blue-600 hover:bg-blue-700 text-white shrink-0" onClick={handleAddCriteria} disabled={!newCrit.name.trim()}>
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                <p className="text-[10px] text-gray-400">
                  Score type: <strong>{globalScoreType === "rating" ? `Rating ${globalMinValue}–${globalMaxPoints}` : globalScoreType === "percentage" ? "Percentage 0–100%" : `Points 0–${globalMaxPoints}`}</strong> (set in Scoring Scale above)
                </p>
              </div>
            </div>

            <hr className="border-slate-200" />

            {/* Access / Share */}
            <div className="space-y-3">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2"><Share2 className="w-4 h-4 text-blue-500" /> Access Control</h3>

              {/* Who can access toggle */}
              <div className="flex gap-2">
                {(["all", "selected"] as const).map(m => (
                  <button
                    key={m}
                    onClick={() => setShareMode(m)}
                    className={cn("flex-1 py-2 px-3 rounded-lg border text-sm font-medium transition-colors",
                      shareMode === m ? "bg-blue-50 border-blue-200 text-blue-700" : "border-slate-200 text-gray-500 hover:bg-slate-50")}
                  >
                    {m === "all" ? "Everyone in organization" : "Specific people / units"}
                  </button>
                ))}
              </div>

              {shareMode === "selected" && (
                <div className="rounded-xl border border-slate-200 overflow-hidden">
                  {/* Tab strip */}
                  <div className="flex border-b border-slate-200 bg-slate-50">
                    <button
                      onClick={() => setAccessTab("users")}
                      className={cn(
                        "flex-1 flex items-center justify-center gap-1.5 py-2.5 text-sm font-medium transition-colors border-b-2",
                        accessTab === "users"
                          ? "border-blue-600 text-blue-700 bg-white"
                          : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-slate-100"
                      )}
                    >
                      <Users className="w-3.5 h-3.5" />
                      Individuals
                      {sharedUsers.length > 0 && (
                        <span className="ml-1 text-[10px] bg-blue-600 text-white rounded-full px-1.5 py-0.5 leading-none">{sharedUsers.length}</span>
                      )}
                    </button>
                    <button
                      onClick={() => setAccessTab("depts")}
                      className={cn(
                        "flex-1 flex items-center justify-center gap-1.5 py-2.5 text-sm font-medium transition-colors border-b-2",
                        accessTab === "depts"
                          ? "border-blue-600 text-blue-700 bg-white"
                          : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-slate-100"
                      )}
                    >
                      <Building2 className="w-3.5 h-3.5" />
                      Units / Depts
                      {sharedDepts.length > 0 && (
                        <span className="ml-1 text-[10px] bg-blue-600 text-white rounded-full px-1.5 py-0.5 leading-none">{sharedDepts.length}</span>
                      )}
                    </button>
                  </div>

                  {/* Tab content */}
                  <div className="p-3">
                    {accessTab === "users" && (
                      allUsers.length === 0 ? (
                        <p className="text-xs text-gray-400 py-2">Loading users…</p>
                      ) : (
                        <div className="max-h-44 overflow-y-auto space-y-0.5">
                          {allUsers.map(u => {
                            const name = [u.firstName, u.lastName].filter(Boolean).join(" ") || u.email;
                            const checked = sharedUsers.includes(u.id);
                            return (
                              <label key={u.id} className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 rounded-md px-2 py-1.5 transition-colors">
                                <input
                                  type="checkbox" checked={checked}
                                  onChange={() => setSharedUsers(prev => checked ? prev.filter(x => x !== u.id) : [...prev, u.id])}
                                  className="w-3.5 h-3.5 accent-blue-600 shrink-0"
                                />
                                <span className="text-sm text-gray-800 flex-1 truncate">{name}</span>
                                <span className="text-xs text-gray-400 shrink-0">{u.email}</span>
                              </label>
                            );
                          })}
                        </div>
                      )
                    )}

                    {accessTab === "depts" && (
                      allDepts.length === 0 ? (
                        <p className="text-xs text-gray-400 py-2">Loading departments…</p>
                      ) : (
                        <div className="max-h-44 overflow-y-auto space-y-0.5">
                          {allDepts.map(d => {
                            const checked = sharedDepts.includes(d.id);
                            return (
                              <label key={d.id} className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 rounded-md px-2 py-1.5 transition-colors">
                                <input
                                  type="checkbox" checked={checked}
                                  onChange={() => setSharedDepts(prev => checked ? prev.filter(x => x !== d.id) : [...prev, d.id])}
                                  className="w-3.5 h-3.5 accent-blue-600 shrink-0"
                                />
                                <span className="text-sm text-gray-800">{d.name}</span>
                              </label>
                            );
                          })}
                        </div>
                      )
                    )}
                  </div>
                </div>
              )}
              {shareMode === "all" && <p className="text-xs text-gray-400">All members of your organization can view this tracker.</p>}
            </div>

            <hr className="border-slate-200" />

            {/* Benchmark Target */}
            <div className="space-y-3">
              <div>
                <h3 className="font-semibold text-gray-900 flex items-center gap-2"><TrendingUp className="w-4 h-4 text-blue-500" /> Performance Target</h3>
                <p className="text-xs text-gray-400 mt-0.5">Set a benchmark score and custom push-notification messages for scholars who cross it</p>
              </div>
              {(() => {
                const _c  = data?.tracker.criteria ?? [];
                const _f  = formula;
                const _ip = _f === 'percentage' || _c.length === 0 || _c.every(c => c.scoreType === 'percentage');
                const _mn = _ip ? 0  : _f === 'sum' ? _c.reduce((s, c) => s + c.minValue,  0) : (_c[0]?.minValue  ?? 0);
                const _mx = _ip ? 100 : _f === 'sum' ? _c.reduce((s, c) => s + c.maxPoints, 0) : (_c[0]?.maxPoints ?? 100);
                const _label = _ip ? "Benchmark Score (%)" : `Benchmark Score (${_mn} – ${_mx})`;
                const _ph    = _ip ? "e.g. 75" : `e.g. ${Math.round((_mn + _mx) / 2)}`;
                const _hint  = benchmarkScore !== ""
                  ? _ip
                    ? <>Scholars scoring <span className="font-semibold text-green-600">≥ {benchmarkScore}%</span> are above target</>
                    : <>Scholars scoring <span className="font-semibold text-green-600">≥ {benchmarkScore} / {_mx}</span> are above target</>
                  : null;
                return (
                  <div className="flex items-end gap-3">
                    <div className="w-40">
                      <Label className="text-xs">{_label}</Label>
                      <Input
                        type="number" min={_mn} max={_mx} step="any" value={benchmarkScore}
                        onChange={e => setBenchmarkScore(e.target.value)}
                        placeholder={_ph}
                        className="mt-1 h-9"
                      />
                    </div>
                    {_hint && <span className="text-xs text-gray-500 pb-2">{_hint}</span>}
                  </div>
                );
              })()}
              <div>
                <Label className="text-xs flex items-center gap-1"><Bell className="w-3 h-3" /> Message when scholar goes ABOVE benchmark</Label>
                <Input value={aboveMessage} onChange={e => setAboveMessage(e.target.value)} placeholder="e.g. Great work! You have reached the benchmark." className="mt-1 h-9" />
              </div>
              <div>
                <Label className="text-xs flex items-center gap-1"><Bell className="w-3 h-3" /> Message when scholar goes BELOW benchmark</Label>
                <Input value={belowMessage} onChange={e => setBelowMessage(e.target.value)} placeholder="e.g. Keep pushing, you are below the benchmark." className="mt-1 h-9" />
              </div>
            </div>

            <hr className="border-slate-200" />

            {/* Performance Bands */}
            {tracker && (
              <BandManager
                trackerId={id}
                bands={localBands}
                formula={formula}
                criteria={data?.tracker.criteria ?? []}
                onChange={bands => {
                  setLocalBands(bands);
                  setData(prev => prev ? { ...prev, tracker: { ...prev.tracker, bands } } : prev);
                }}
              />
            )}
          </div>
          <DialogFooter className="border-t border-slate-100 pt-3 mt-0">
            <Button variant="outline" onClick={() => setShowSettings(false)}>Cancel</Button>
            <Button onClick={handleSaveSettings} disabled={savingSettings || !trackerName.trim()} className="bg-blue-600 hover:bg-blue-700 text-white">
              {savingSettings && <Loader2 className="w-4 h-4 animate-spin mr-2" />} Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* History Drawer */}
      {historyRecord && (
        <HistoryDrawer
          trackerId={id}
          recordId={historyRecord.id}
          onClose={() => setHistoryRecord(null)}
          benchmark={(() => {
            if (benchmarkScore === "") return null;
            const _n  = parseFloat(benchmarkScore);
            const _c  = data?.tracker.criteria ?? [];
            const _f  = formula;
            const _ip = _f === 'percentage' || _c.length === 0 || _c.every(c => c.scoreType === 'percentage');
            const _mx = _ip ? 100 : _f === 'sum' ? _c.reduce((s, c) => s + c.maxPoints, 0) : (_c[0]?.maxPoints ?? 100);
            return !_ip && _mx > 0 ? Math.round((_n / _mx) * 100 * 100) / 100 : _n;
          })()}
        />
      )}
    </div>
  );
}
