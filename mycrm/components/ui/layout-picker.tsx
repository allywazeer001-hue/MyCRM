"use client";
import { useState } from "react";
import { cn } from "@/lib/utils";
import {
  LAYOUT_TEMPLATES, LayoutTemplate, LayoutCategory, getTemplatesByCategory,
} from "@/lib/layout-templates";
import { Check } from "lucide-react";

// ── Preview thumbnail SVGs ────────────────────────────────────────────────

function PreviewThumbnail({ type }: { type: LayoutTemplate["preview"] }) {
  const base = "w-full h-full";
  switch (type) {
    case "single":
      return (
        <svg viewBox="0 0 80 56" className={base}>
          <rect x="6"  y="6"  width="68" height="6"  rx="1.5" fill="#e2e8f0" />
          <rect x="6"  y="16" width="68" height="6"  rx="1.5" fill="#e2e8f0" />
          <rect x="6"  y="26" width="68" height="6"  rx="1.5" fill="#e2e8f0" />
          <rect x="6"  y="36" width="68" height="6"  rx="1.5" fill="#e2e8f0" />
          <rect x="6"  y="46" width="40" height="6"  rx="1.5" fill="#bfdbfe" />
        </svg>
      );
    case "double":
      return (
        <svg viewBox="0 0 80 56" className={base}>
          <rect x="6"  y="6"  width="32" height="6"  rx="1.5" fill="#e2e8f0" />
          <rect x="42" y="6"  width="32" height="6"  rx="1.5" fill="#e2e8f0" />
          <rect x="6"  y="16" width="32" height="6"  rx="1.5" fill="#e2e8f0" />
          <rect x="42" y="16" width="32" height="6"  rx="1.5" fill="#e2e8f0" />
          <rect x="6"  y="26" width="68" height="6"  rx="1.5" fill="#e2e8f0" />
          <rect x="6"  y="36" width="32" height="6"  rx="1.5" fill="#e2e8f0" />
          <rect x="42" y="36" width="32" height="6"  rx="1.5" fill="#e2e8f0" />
          <rect x="6"  y="46" width="28" height="6"  rx="1.5" fill="#bfdbfe" />
        </svg>
      );
    case "triple":
      return (
        <svg viewBox="0 0 80 56" className={base}>
          <rect x="4"  y="6"  width="22" height="6"  rx="1.5" fill="#e2e8f0" />
          <rect x="29" y="6"  width="22" height="6"  rx="1.5" fill="#e2e8f0" />
          <rect x="54" y="6"  width="22" height="6"  rx="1.5" fill="#e2e8f0" />
          <rect x="4"  y="16" width="22" height="6"  rx="1.5" fill="#e2e8f0" />
          <rect x="29" y="16" width="22" height="6"  rx="1.5" fill="#e2e8f0" />
          <rect x="54" y="16" width="22" height="6"  rx="1.5" fill="#e2e8f0" />
          <rect x="4"  y="26" width="22" height="6"  rx="1.5" fill="#e2e8f0" />
          <rect x="29" y="26" width="22" height="6"  rx="1.5" fill="#e2e8f0" />
          <rect x="54" y="26" width="22" height="6"  rx="1.5" fill="#e2e8f0" />
          <rect x="4"  y="46" width="22" height="6"  rx="1.5" fill="#bfdbfe" />
        </svg>
      );
    case "sidebar-left":
      return (
        <svg viewBox="0 0 80 56" className={base}>
          <rect x="4"  y="4"  width="18" height="48" rx="2" fill="#f1f5f9" />
          <rect x="26" y="6"  width="50" height="6"  rx="1.5" fill="#e2e8f0" />
          <rect x="26" y="16" width="50" height="6"  rx="1.5" fill="#e2e8f0" />
          <rect x="26" y="26" width="50" height="6"  rx="1.5" fill="#e2e8f0" />
          <rect x="26" y="36" width="50" height="6"  rx="1.5" fill="#e2e8f0" />
          <rect x="4"  y="8"  width="18" height="3"  rx="1" fill="#bfdbfe" />
          <rect x="4"  y="14" width="14" height="2.5" rx="1" fill="#cbd5e1" />
          <rect x="4"  y="19" width="16" height="2.5" rx="1" fill="#cbd5e1" />
        </svg>
      );
    case "sidebar-right":
      return (
        <svg viewBox="0 0 80 56" className={base}>
          <rect x="58" y="4"  width="18" height="48" rx="2" fill="#f1f5f9" />
          <rect x="4"  y="6"  width="50" height="6"  rx="1.5" fill="#e2e8f0" />
          <rect x="4"  y="16" width="50" height="6"  rx="1.5" fill="#e2e8f0" />
          <rect x="4"  y="26" width="50" height="6"  rx="1.5" fill="#e2e8f0" />
          <rect x="4"  y="36" width="50" height="6"  rx="1.5" fill="#e2e8f0" />
          <rect x="60" y="8"  width="14" height="10" rx="1.5" fill="#e2e8f0" />
          <rect x="60" y="22" width="14" height="10" rx="1.5" fill="#e2e8f0" />
        </svg>
      );
    case "kanban":
      return (
        <svg viewBox="0 0 80 56" className={base}>
          {[4, 22, 40, 58].map((x, i) => (
            <g key={i}>
              <rect x={x} y="4"  width="17" height="4"  rx="1" fill="#bfdbfe" />
              <rect x={x} y="11" width="17" height="8"  rx="1.5" fill="#f1f5f9" />
              <rect x={x} y="22" width="17" height="8"  rx="1.5" fill="#f1f5f9" />
              {i < 3 && <rect x={x} y="33" width="17" height="8"  rx="1.5" fill="#f1f5f9" />}
            </g>
          ))}
        </svg>
      );
    case "fullwidth":
      return (
        <svg viewBox="0 0 80 56" className={base}>
          <rect x="4"  y="4"  width="72" height="10" rx="2" fill="#bfdbfe" />
          <rect x="4"  y="18" width="34" height="14" rx="1.5" fill="#f1f5f9" />
          <rect x="42" y="18" width="34" height="14" rx="1.5" fill="#f1f5f9" />
          <rect x="4"  y="36" width="72" height="6"  rx="1.5" fill="#e2e8f0" />
          <rect x="4"  y="46" width="50" height="6"  rx="1.5" fill="#e2e8f0" />
        </svg>
      );
  }
}

// ── Category labels ───────────────────────────────────────────────────────

const CATEGORY_LABELS: Record<LayoutCategory, string> = {
  crm:       "CRM",
  analytics: "Analytics",
  admin:     "Admin",
  portal:    "Portal",
  workspace: "Workspace",
  form:      "Forms",
};

// ── Layout Picker ─────────────────────────────────────────────────────────

interface LayoutPickerProps {
  value?: string;
  onChange: (templateId: string) => void;
  categories?: LayoutCategory[];
  className?: string;
}

export function LayoutPicker({
  value, onChange, categories, className,
}: LayoutPickerProps) {
  const [activeCategory, setActiveCategory] = useState<LayoutCategory | "all">("all");

  const cats: Array<LayoutCategory | "all"> = ["all", ...(categories ?? (Object.keys(CATEGORY_LABELS) as LayoutCategory[]))];
  const visible = activeCategory === "all"
    ? LAYOUT_TEMPLATES.filter((t) => !categories || (categories as string[]).includes(t.category))
    : getTemplatesByCategory(activeCategory as LayoutCategory);

  return (
    <div className={cn("space-y-4", className)}>
      {/* Category tabs */}
      <div className="flex gap-1 flex-wrap">
        {cats.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setActiveCategory(c)}
            className={cn(
              "px-3 py-1 rounded-full text-xs font-medium transition-colors",
              activeCategory === c
                ? "bg-brand text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            )}
          >
            {c === "all" ? "All" : CATEGORY_LABELS[c as LayoutCategory]}
          </button>
        ))}
      </div>

      {/* Template grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {visible.map((tpl) => {
          const selected = value === tpl.id;
          return (
            <button
              key={tpl.id}
              type="button"
              onClick={() => onChange(tpl.id)}
              className={cn(
                "relative rounded-xl border-2 p-3 text-left transition-all hover:shadow-md",
                selected
                  ? "border-brand bg-brand/5 shadow-sm"
                  : "border-gray-200 bg-white hover:border-gray-300"
              )}
            >
              {/* Selected check */}
              {selected && (
                <span className="absolute top-2 right-2 w-5 h-5 rounded-full bg-brand flex items-center justify-center">
                  <Check className="w-3 h-3 text-white" />
                </span>
              )}

              {/* Preview */}
              <div className={cn(
                "w-full h-14 rounded-lg mb-2.5 overflow-hidden",
                selected ? "bg-brand/10" : "bg-gray-50"
              )}>
                <PreviewThumbnail type={tpl.preview} />
              </div>

              {/* Info */}
              <p className={cn(
                "text-xs font-semibold leading-tight",
                selected ? "text-brand" : "text-gray-800"
              )}>
                {tpl.name}
              </p>
              <p className="text-[10px] text-gray-400 mt-0.5 leading-tight line-clamp-2">
                {tpl.description}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
