"use client";
import { useState, useEffect, useMemo } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import type { Field } from "@/store/modules.store";

// ── Shared types ───────────────────────────────────────────────────────────────

export interface SummaryCondition {
  id: string;
  field: string;
  op: "is" | "is_not" | "contains" | "gt" | "lt" | "gte" | "lte" | "empty" | "not_empty";
  value?: string;
}

export interface SummaryStatConfig {
  id: string;
  label: string;
  aggregation: "COUNT" | "SUM" | "AVG" | "PERCENTAGE" | "MIN" | "MAX";
  field?: string;
  conditions?: SummaryCondition[];
}

// ── Computation ────────────────────────────────────────────────────────────────

interface CrmRecord {
  id: string;
  data: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

function matches(record: CrmRecord, conditions: SummaryCondition[]): boolean {
  return conditions.every(c => {
    const val = record.data[c.field];
    const str = val == null ? "" : String(val).toLowerCase();
    const cval = (c.value ?? "").toLowerCase();
    switch (c.op) {
      case "is":        return str === cval;
      case "is_not":    return str !== cval;
      case "contains":  return str.includes(cval);
      case "gt":        return Number(val) > Number(c.value);
      case "lt":        return Number(val) < Number(c.value);
      case "gte":       return Number(val) >= Number(c.value);
      case "lte":       return Number(val) <= Number(c.value);
      case "empty":     return val == null || val === "";
      case "not_empty": return val != null && val !== "";
      default:          return true;
    }
  });
}

function computeStat(stat: SummaryStatConfig, records: CrmRecord[], total: number): string {
  const filtered = stat.conditions?.length
    ? records.filter(r => matches(r, stat.conditions!))
    : records;

  switch (stat.aggregation) {
    case "COUNT":
      return filtered.length.toLocaleString();

    case "PERCENTAGE": {
      const base = total > 0 ? total : records.length;
      const pct = base > 0 ? (filtered.length / base) * 100 : 0;
      return pct.toFixed(1) + "%";
    }

    case "SUM": {
      if (!stat.field) return "—";
      const sum = filtered.reduce((acc, r) => acc + (Number(r.data[stat.field!]) || 0), 0);
      return sum.toLocaleString(undefined, { maximumFractionDigits: 1 });
    }

    case "AVG": {
      if (!stat.field || !filtered.length) return "—";
      const nums = filtered.map(r => Number(r.data[stat.field!])).filter(v => !isNaN(v));
      if (!nums.length) return "—";
      const avg = nums.reduce((a, b) => a + b, 0) / nums.length;
      return avg.toLocaleString(undefined, { maximumFractionDigits: 2 });
    }

    case "MIN": {
      if (!stat.field) return "—";
      const nums = filtered.map(r => Number(r.data[stat.field!])).filter(v => !isNaN(v));
      return nums.length ? Math.min(...nums).toLocaleString() : "—";
    }

    case "MAX": {
      if (!stat.field) return "—";
      const nums = filtered.map(r => Number(r.data[stat.field!])).filter(v => !isNaN(v));
      return nums.length ? Math.max(...nums).toLocaleString() : "—";
    }

    default: return "—";
  }
}

// ── Component ──────────────────────────────────────────────────────────────────

export interface ModuleSummaryBarProps {
  modId: string;
  fields: Field[];
  records: CrmRecord[];
  total: number;
  summaryStats?: SummaryStatConfig[];
  summaryEnabled?: boolean;
}

const AGG_ACCENT: Record<string, string> = {
  COUNT:      "text-blue-600",
  SUM:        "text-emerald-600",
  AVG:        "text-violet-600",
  PERCENTAGE: "text-amber-600",
  MIN:        "text-sky-600",
  MAX:        "text-rose-600",
};

export function ModuleSummaryBar({ modId, records, total, summaryStats, summaryEnabled = true }: ModuleSummaryBarProps) {
  const [open, setOpen] = useState(true);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(`msummary-open:${modId}`);
      if (stored !== null) setOpen(JSON.parse(stored));
    } catch {}
  }, [modId]);

  useEffect(() => {
    try { localStorage.setItem(`msummary-open:${modId}`, JSON.stringify(open)); } catch {}
  }, [open, modId]);

  const items = useMemo(() => {
    if (!summaryStats?.length) return [];
    return summaryStats.map(stat => ({
      label: stat.label || stat.aggregation,
      value: computeStat(stat, records, total),
      agg: stat.aggregation,
    }));
  }, [summaryStats, records, total]);

  if (!items.length || !summaryEnabled) return null;

  return (
    <div className="rounded-xl border border-gray-200 bg-white overflow-hidden shadow-sm">
      {/* Header toggle */}
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-2 px-4 py-2.5 hover:bg-gray-50/70 transition-colors"
      >
        <span className="text-xs font-semibold text-gray-500 tracking-wide uppercase">Summary</span>
        <div className="flex-1" />
        {open
          ? <ChevronUp className="w-3.5 h-3.5 text-gray-400" />
          : <ChevronDown className="w-3.5 h-3.5 text-gray-400" />}
      </button>

      {/* Stats row */}
      {open && (
        <div className="border-t border-gray-100 flex flex-wrap">
          {items.map((item, i) => (
            <div
              key={item.label + i}
              className="flex items-center px-5 py-3 gap-0"
            >
              {/* Divider before each item except first */}
              {i > 0 && <div className="w-px h-8 bg-gray-100 mr-5 shrink-0" />}
              <div>
                <p className="text-[11px] text-gray-400 mb-0.5 leading-none">{item.label}</p>
                <p className={`text-base font-bold leading-none ${AGG_ACCENT[item.agg] ?? "text-gray-800"}`}>
                  {item.value}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
