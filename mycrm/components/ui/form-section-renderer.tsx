"use client";
import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { LayoutConfig, LayoutSection } from "@/lib/layout-templates";

// ── Types ──────────────────────────────────────────────────────────────────

interface SectionRendererProps {
  layout: LayoutConfig;
  fields: any[];
  renderField: (field: any) => React.ReactNode;
  fullWidthTypes?: string[];
  /** Pass current form values to show per-section completion % on required fields */
  formData?: Record<string, any>;
  /** Show completion bar in section headers (default true when formData provided) */
  showCompletion?: boolean;
  /** Section IDs that should be hidden (from module-level layout rules) */
  hiddenSectionIds?: Set<string>;
}

// ── Helpers ────────────────────────────────────────────────────────────────

const ALWAYS_FULL_WIDTH = ["TEXTAREA", "RICH_TEXT", "INLINE_SUBFORM", "FILE", "IMAGE", "RELATIONSHIP"];

function isFullWidth(field: any, fullWidthTypes: string[]): boolean {
  return (
    field.settings?.fullWidth === true ||
    fullWidthTypes.includes(field.type) ||
    ALWAYS_FULL_WIDTH.includes(field.type)
  );
}

function gridCols(cols: 1 | 2 | 3 | 4): string {
  if (cols === 4) return "grid-cols-2 sm:grid-cols-4";
  if (cols === 3) return "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3";
  if (cols === 2) return "grid-cols-1 sm:grid-cols-2";
  return "grid-cols-1";
}

function getFieldColSpanClass(field: any, section: LayoutSection, fullWidthTypes: string[]): string {
  const explicitWidth = section.fieldWidths?.[field.id];
  const cols = section.columns;

  if (explicitWidth === "full") {
    if (cols === 4) return "col-span-4";
    if (cols === 3) return "col-span-3";
    return "col-span-2";
  }
  if (explicitWidth === "1/2") return "col-span-1";
  if (cols > 1 && isFullWidth(field, fullWidthTypes)) {
    if (cols === 4) return "col-span-4";
    if (cols === 3) return "col-span-3";
    return "sm:col-span-2";
  }
  return "";
}

/** Returns { filled, total, pct } for required fields in a section. */
function calcCompletion(
  sectionFields: any[],
  formData: Record<string, any>,
): { filled: number; total: number; pct: number } {
  const required = sectionFields.filter(f =>
    (f.isRequired || f._state?.required) &&
    !["AUTO_NUMBER", "FORMULA"].includes(f.type)
  );
  if (required.length === 0) return { filled: 0, total: 0, pct: 100 };

  const filled = required.filter(f => {
    const v = formData[f.name];
    if (v === null || v === undefined || v === "") return false;
    if (typeof v === "string" && v.trim() === "") return false;
    if (Array.isArray(v) && v.length === 0) return false;
    return true;
  }).length;

  return { filled, total: required.length, pct: Math.round((filled / required.length) * 100) };
}

// ── Completion Badge ───────────────────────────────────────────────────────

function CompletionBadge({ filled, total, pct }: { filled: number; total: number; pct: number }) {
  if (total === 0) return null;

  const color =
    pct === 100 ? { bar: "bg-emerald-500", text: "text-emerald-700", track: "bg-emerald-100" }
    : pct >= 50  ? { bar: "bg-amber-500",   text: "text-amber-700",   track: "bg-amber-100"   }
    : { bar: "bg-red-400",    text: "text-red-600",     track: "bg-red-100"     };

  return (
    <div className="flex items-center gap-2 ml-2 shrink-0">
      {/* Mini progress bar */}
      <div className={cn("w-16 h-1.5 rounded-full overflow-hidden", color.track)}>
        <div
          className={cn("h-full rounded-full transition-all duration-500", color.bar)}
          style={{ width: `${pct}%` }}
        />
      </div>
      {/* Percentage label */}
      <span className={cn("text-[10px] font-bold tabular-nums", color.text)}>
        {pct}%
      </span>
      {/* Check mark when complete */}
      {pct === 100 && (
        <svg className="w-3 h-3 text-emerald-500 shrink-0" fill="none" viewBox="0 0 12 12" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M2 6l3 3 5-5" />
        </svg>
      )}
    </div>
  );
}

// ── Section block ──────────────────────────────────────────────────────────

function SectionBlock({
  section, fields, renderField, fullWidthTypes, layoutColumns, formData, showCompletion,
}: {
  section: LayoutSection;
  fields: any[];
  renderField: (field: any) => React.ReactNode;
  fullWidthTypes: string[];
  layoutColumns: 1 | 2 | 3 | 4;
  formData?: Record<string, any>;
  showCompletion?: boolean;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const cols = (section.columns ?? layoutColumns) as 1 | 2 | 3 | 4;

  const completion = (showCompletion && formData)
    ? calcCompletion(fields, formData)
    : null;

  return (
    <div className="space-y-0">
      {/* Section header */}
      <div
        className={cn(
          "flex items-center gap-2 py-2 mb-3",
          section.collapsible && "cursor-pointer select-none"
        )}
        onClick={() => section.collapsible && setCollapsed(c => !c)}
      >
        {section.collapsible && (
          collapsed
            ? <ChevronRight className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
            : <ChevronDown  className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
        )}
        {section.title && (
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">
            {section.title}
          </span>
        )}
        <div className="flex-1 h-px bg-gray-100" />
        {/* Completion badge right of the divider line */}
        {completion && (
          <CompletionBadge {...completion} />
        )}
      </div>

      {/* Fields */}
      {!collapsed && (
        <div className={cn("grid gap-4", gridCols(cols))}>
          {fields.map((field) => (
            <div
              key={field.id}
              className={cn("space-y-1.5", getFieldColSpanClass(field, section, fullWidthTypes))}
            >
              {renderField(field)}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main Renderer ──────────────────────────────────────────────────────────

export function FormSectionRenderer({
  layout,
  fields,
  renderField,
  fullWidthTypes = [],
  formData,
  showCompletion,
  hiddenSectionIds,
}: SectionRendererProps) {
  const cols = (layout.columns ?? 1) as 1 | 2 | 3 | 4;
  const sections = layout.sections ?? [];
  const trackCompletion = showCompletion ?? !!formData;

  // ── No sections: flat grid ────────────────────────────────────────────
  if (sections.length === 0) {
    const flatSection: LayoutSection = { id: "__flat__", title: "", columns: cols, fieldIds: [] };
    const completion = (trackCompletion && formData)
      ? calcCompletion(fields, formData)
      : null;
    return (
      <div className="space-y-4">
        {completion && completion.total > 0 && (
          <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-gray-50 border border-gray-100">
            <span className="text-xs text-gray-500 font-medium">Completion</span>
            <div className="flex-1 h-1.5 rounded-full bg-gray-200 overflow-hidden">
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-500",
                  completion.pct === 100 ? "bg-emerald-500" : completion.pct >= 50 ? "bg-amber-500" : "bg-red-400"
                )}
                style={{ width: `${completion.pct}%` }}
              />
            </div>
            <span className={cn(
              "text-xs font-bold tabular-nums",
              completion.pct === 100 ? "text-emerald-700" : completion.pct >= 50 ? "text-amber-700" : "text-red-600"
            )}>
              {completion.pct}%
            </span>
          </div>
        )}
        <div className={cn("grid gap-4", gridCols(cols))}>
          {fields.map((field) => (
            <div
              key={field.id}
              className={cn("space-y-1.5", getFieldColSpanClass(field, flatSection, fullWidthTypes))}
            >
              {renderField(field)}
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ── With sections ─────────────────────────────────────────────────────
  const assignedIds = new Set(sections.flatMap(s => s.fieldIds));
  const unassigned  = fields.filter(f => !assignedIds.has(f.id));

  return (
    <div className="space-y-6">
      {sections.map((section) => {
        if (hiddenSectionIds?.has(section.id)) return null;
        const sectionFields = section.fieldIds
          .map(fid => fields.find(f => f.id === fid))
          .filter(Boolean);
        if (sectionFields.length === 0) return null;
        return (
          <SectionBlock
            key={section.id}
            section={section}
            fields={sectionFields}
            renderField={renderField}
            fullWidthTypes={fullWidthTypes}
            layoutColumns={cols}
            formData={formData}
            showCompletion={trackCompletion}
          />
        );
      })}

      {/* Unassigned fields — no section header */}
      {unassigned.length > 0 && (() => {
        const us: LayoutSection = { id: "__unassigned__", title: "", columns: cols, fieldIds: [] };
        return (
          <div className={cn("grid gap-4", gridCols(cols))}>
            {unassigned.map(field => (
              <div key={field.id} className={cn("space-y-1.5", getFieldColSpanClass(field, us, fullWidthTypes))}>
                {renderField(field)}
              </div>
            ))}
          </div>
        );
      })()}
    </div>
  );
}
