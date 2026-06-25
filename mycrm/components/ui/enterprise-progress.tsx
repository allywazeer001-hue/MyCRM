"use client";
/**
 * EnterpriseProgress — dual-mode Odoo/Zoho-style progress bar.
 *
 * MODE A — "process":  tracks a real-time value (upload, import, background job).
 * MODE B — "formula":  computes value from form fields with a simple expression.
 *                       Supports: fieldA / fieldB * 100, weighted sums, clamped output.
 *
 * Color states: green ≥ 70 | orange 30–69 | red < 30   (customisable via thresholds)
 *
 * Usage examples:
 *
 *   // Process mode
 *   <EnterpriseProgress mode="process" value={uploadPct} label="Uploading…" />
 *
 *   // Formula mode — reads values from a record object
 *   <EnterpriseProgress
 *     mode="formula"
 *     fields={{ obtained: record.marksObtained, total: record.totalMarks }}
 *     formula="(obtained / total) * 100"
 *     label="Completion"
 *   />
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";

// ── Formula evaluator ─────────────────────────────────────────────────────────
// Evaluates simple arithmetic expressions with named variables.
// Supports: + - * / ( ) and named field references.
// Returns NaN on syntax/division errors.

function evaluateFormula(
  expression: string,
  fields: Record<string, number | string | null | undefined>,
): number {
  try {
    // Replace field names with their numeric values
    let expr = expression;
    for (const [key, val] of Object.entries(fields)) {
      const num = Number(val);
      // Replace whole-word occurrences only
      expr = expr.replace(new RegExp(`\\b${key}\\b`, "g"), isNaN(num) ? "0" : String(num));
    }
    // Strip anything that's not a safe math character
    if (/[^0-9 +\-*/().%]/.test(expr)) return NaN;
    // eslint-disable-next-line no-new-func
    const result = Function(`"use strict"; return (${expr})`)() as number;
    return isFinite(result) ? result : NaN;
  } catch {
    return NaN;
  }
}

// ── Color thresholds ──────────────────────────────────────────────────────────

type ColorThresholds = { low: number; mid: number }; // defaults: low=30 mid=70

function getColor(pct: number, thresholds: ColorThresholds) {
  if (pct >= thresholds.mid) return { bar: "bg-emerald-500", text: "text-emerald-700", bg: "bg-emerald-50", border: "border-emerald-200" };
  if (pct >= thresholds.low) return { bar: "bg-amber-500",   text: "text-amber-700",   bg: "bg-amber-50",   border: "border-amber-200" };
  return                            { bar: "bg-red-500",     text: "text-red-700",     bg: "bg-red-50",     border: "border-red-200" };
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface BaseProps {
  label?: string;
  /** Pixel height of the bar (default 8) */
  height?: number;
  /** Show numeric percentage label (default true) */
  showValue?: boolean;
  /** Show colored badge with state name (default false) */
  showBadge?: boolean;
  /** Override color thresholds */
  thresholds?: ColorThresholds;
  className?: string;
  /** Size variant for label/badge text */
  size?: "sm" | "md" | "lg";
  /** Animate bar fill on mount / value change */
  animated?: boolean;
}

interface ProcessModeProps extends BaseProps {
  mode: "process";
  /** Current progress value 0–100 */
  value: number;
  /** Optional description shown below bar (e.g. "45 of 100 records imported") */
  description?: string;
  /** Show indeterminate spinner when value is undefined / null */
  indeterminate?: boolean;
}

interface FormulaModeProps extends BaseProps {
  mode: "formula";
  /**
   * Named field values — these map to variables in the formula string.
   * e.g. { obtained: 75, total: 100 }
   */
  fields: Record<string, number | string | null | undefined>;
  /**
   * Arithmetic expression using field names.
   * e.g. "(obtained / total) * 100"
   * Result is automatically clamped to [0, 100].
   */
  formula: string;
  /** Shown when formula resolves to NaN */
  fallbackLabel?: string;
}

export type EnterpriseProgressProps = ProcessModeProps | FormulaModeProps;

// ── Component ─────────────────────────────────────────────────────────────────

export function EnterpriseProgress(props: EnterpriseProgressProps) {
  const {
    label, height = 8, showValue = true, showBadge = false,
    thresholds = { low: 30, mid: 70 }, className, size = "md", animated = true,
  } = props;

  // Compute raw percentage
  const rawPct = useMemo(() => {
    if (props.mode === "process") {
      return props.indeterminate ? -1 : Math.min(100, Math.max(0, props.value ?? 0));
    }
    const result = evaluateFormula(props.formula, props.fields);
    return isNaN(result) ? -1 : Math.min(100, Math.max(0, result));
  }, [props]);

  const isIndeterminate = rawPct === -1;
  const pct             = isIndeterminate ? 0 : rawPct;
  const colors          = getColor(pct, thresholds);

  // Animated display value
  const [displayPct, setDisplayPct] = useState(animated ? 0 : pct);
  const animRef = useRef<number | null>(null);

  useEffect(() => {
    if (!animated || isIndeterminate) { setDisplayPct(pct); return; }
    const start     = displayPct;
    const end       = pct;
    const duration  = 600; // ms
    const startTime = performance.now();
    const step = (now: number) => {
      const elapsed = now - startTime;
      const t = Math.min(1, elapsed / duration);
      // Ease-out cubic
      const eased = 1 - (1 - t) ** 3;
      setDisplayPct(start + (end - start) * eased);
      if (t < 1) animRef.current = requestAnimationFrame(step);
    };
    animRef.current = requestAnimationFrame(step);
    return () => { if (animRef.current) cancelAnimationFrame(animRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pct, isIndeterminate, animated]);

  const textSz = { sm: "text-xs", md: "text-sm", lg: "text-base" }[size];
  const labelSz = { sm: "text-xs", md: "text-xs", lg: "text-sm" }[size];

  const badgeLabel = isIndeterminate
    ? "—"
    : pct >= thresholds.mid ? "High"
    : pct >= thresholds.low ? "Mid"
    : "Low";

  const description = props.mode === "process" ? props.description : undefined;
  const fallback    = props.mode === "formula"  ? (props.fallbackLabel ?? "N/A") : "—";

  return (
    <div className={cn("w-full space-y-1.5", className)}>
      {/* Top row: label + value */}
      {(label || showValue) && (
        <div className="flex items-center justify-between gap-2">
          {label && (
            <span className={cn("font-medium text-gray-700 truncate", textSz)}>{label}</span>
          )}
          <div className="flex items-center gap-2 shrink-0 ml-auto">
            {showBadge && !isIndeterminate && (
              <span className={cn(
                "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border",
                colors.bg, colors.text, colors.border,
              )}>
                {badgeLabel}
              </span>
            )}
            {showValue && (
              <span className={cn("font-bold tabular-nums", textSz, isIndeterminate ? "text-gray-400" : colors.text)}>
                {isIndeterminate ? fallback : `${Math.round(displayPct)}%`}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Bar */}
      <div
        className="relative w-full overflow-hidden rounded-full bg-gray-100"
        style={{ height }}
        role="progressbar"
        aria-valuenow={isIndeterminate ? undefined : Math.round(pct)}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        {isIndeterminate ? (
          // Indeterminate striped animation
          <div
            className="absolute inset-0 bg-gradient-to-r from-blue-400 via-blue-500 to-blue-400 bg-[length:200%_100%]"
            style={{ animation: "progressSweep 1.4s linear infinite" }}
          />
        ) : (
          <div
            className={cn("h-full rounded-full transition-none", colors.bar)}
            style={{
              width: `${displayPct}%`,
              transition: animated ? "none" : undefined,
            }}
          />
        )}
      </div>

      {/* Description row */}
      {description && (
        <p className={cn("text-gray-500", labelSz)}>{description}</p>
      )}

      <style>{`
        @keyframes progressSweep {
          0%   { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
    </div>
  );
}

// ── Convenience: multi-segment stacked bar ────────────────────────────────────

export interface ProgressSegment {
  label: string;
  value: number;   // 0–100 relative weight (will be normalised)
  color?: string;  // Tailwind bg-* class
}

interface StackedProgressProps {
  segments: ProgressSegment[];
  height?: number;
  showLegend?: boolean;
  className?: string;
}

const SEGMENT_COLORS = [
  "bg-blue-500", "bg-emerald-500", "bg-amber-500",
  "bg-violet-500", "bg-rose-500", "bg-cyan-500",
];

export function StackedProgress({ segments, height = 10, showLegend = true, className }: StackedProgressProps) {
  const total = segments.reduce((s, seg) => s + Math.max(0, seg.value), 0) || 1;

  return (
    <div className={cn("w-full space-y-2", className)}>
      <div
        className="flex w-full overflow-hidden rounded-full bg-gray-100"
        style={{ height }}
      >
        {segments.map((seg, i) => {
          const pct = (Math.max(0, seg.value) / total) * 100;
          const color = seg.color ?? SEGMENT_COLORS[i % SEGMENT_COLORS.length];
          return (
            <div
              key={i}
              className={cn("h-full transition-all duration-500", color)}
              style={{ width: `${pct}%` }}
              title={`${seg.label}: ${Math.round(pct)}%`}
            />
          );
        })}
      </div>
      {showLegend && (
        <div className="flex flex-wrap gap-x-4 gap-y-1">
          {segments.map((seg, i) => {
            const pct = Math.round((Math.max(0, seg.value) / total) * 100);
            const color = seg.color ?? SEGMENT_COLORS[i % SEGMENT_COLORS.length];
            return (
              <div key={i} className="flex items-center gap-1.5 text-xs text-gray-600">
                <span className={cn("w-2.5 h-2.5 rounded-sm flex-shrink-0", color)} />
                {seg.label} <span className="font-semibold text-gray-800">{pct}%</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
