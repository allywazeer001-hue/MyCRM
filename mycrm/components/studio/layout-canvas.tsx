"use client";

import React, { useState, useCallback, useRef, useEffect } from "react";
import {
  DndContext,
  DragCancelEvent,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  useDroppable,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
  rectSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  ChevronDown,
  ChevronRight,
  Copy,
  GripVertical,
  Maximize2,
  Plus,
  Trash2,
  X,
} from "lucide-react";

import { cn, generateId } from "@/lib/utils";
import type { LayoutConfig, LayoutSection } from "@/lib/layout-templates";
import type { Field } from "@/store/modules.store";

// ── Props ─────────────────────────────────────────────────────────────────────

export interface ModuleLayoutCanvasProps {
  fields: Field[];
  layoutConfig: LayoutConfig;
  onLayoutChange: (cfg: LayoutConfig) => void;
  selectedFieldId?: string | null;
  onFieldSelect: (field: Field | null) => void;
  onDeleteField: (fieldId: string) => void;
  previewMode?: boolean;
  // Palette drag support
  draggingFromPalette?: boolean;
  onPaletteHoverSection?: (sectionId: string | null) => void;
  skipAutoAssignRef?: React.MutableRefObject<boolean>;
}

// ── ID helpers ────────────────────────────────────────────────────────────────

function makeFieldId(sectionId: string, fieldId: string) {
  return `field-${sectionId}-${fieldId}`;
}

function makeUnassignedId(fieldId: string) {
  return `unassigned-${fieldId}`;
}

function makeSectionId(sectionId: string) {
  return `section-${sectionId}`;
}

type ParsedId = { fieldId: string; sectionId: string } | null;

function parseDragId(id: string, sections: LayoutSection[]): ParsedId {
  if (id.startsWith("unassigned-")) {
    return { fieldId: id.slice("unassigned-".length), sectionId: "__unassigned__" };
  }
  if (id.startsWith("field-")) {
    const rest = id.slice("field-".length);
    for (const s of sections) {
      const prefix = s.id + "-";
      if (rest.startsWith(prefix)) {
        return { fieldId: rest.slice(prefix.length), sectionId: s.id };
      }
    }
  }
  return null;
}

function getTargetSectionId(overId: string, sections: LayoutSection[]): string | null {
  if (overId.startsWith("drop-section-")) return overId.slice("drop-section-".length);
  const parsed = parseDragId(overId, sections);
  return parsed?.sectionId ?? null;
}

// ── Width constants ───────────────────────────────────────────────────────────

const WIDTH_OPTIONS = [
  { value: "full", label: "Full" },
  { value: "1/2",  label: "½"    },
  { value: "1/3",  label: "⅓"    },
  { value: "1/4",  label: "¼"    },
] as const;

function colSpanClass(width: string | undefined, columns: number): string {
  const full = columns === 4 ? "col-span-4" : columns === 3 ? "col-span-3" : columns === 2 ? "col-span-2" : "col-span-1";
  if (!width || width === "full") return full;
  // All fractional widths = one column span in the section grid
  return "col-span-1";
}

function gridClass(cols: number): string {
  if (cols === 4) return "grid-cols-4";
  if (cols === 3) return "grid-cols-3";
  if (cols === 2) return "grid-cols-2";
  return "grid-cols-1";
}

// ── DroppableSection ──────────────────────────────────────────────────────────

function DroppableSection({
  sectionId,
  children,
  isOver,
}: {
  sectionId: string;
  children: React.ReactNode;
  isOver: boolean;
}) {
  const { setNodeRef } = useDroppable({ id: `drop-section-${sectionId}` });
  return (
    <div
      ref={setNodeRef}
      className={cn(
        "min-h-[48px] rounded-lg transition-colors duration-150",
        isOver && "bg-blue-50 ring-1 ring-blue-300 ring-inset"
      )}
    >
      {children}
    </div>
  );
}

// ── FieldTypeMock — realistic input preview per field type ────────────────────

function FieldTypeMock({ type, isSelected }: { type: string; isSelected: boolean }) {
  const base = cn(
    "w-full rounded-md border text-xs text-gray-300 transition-colors",
    isSelected ? "border-blue-300 bg-white" : "border-gray-200 bg-gray-50/80"
  );

  switch (type) {
    case "TEXTAREA":
    case "RICH_TEXT":
      return <div className={cn(base, "h-16 px-2 py-1.5 flex items-start")}>Long text…</div>;

    case "BOOLEAN":
      return (
        <div className="flex items-center gap-2 h-8">
          <div className="w-9 h-5 rounded-full bg-gray-200 border border-gray-300 flex items-center px-0.5">
            <div className="w-4 h-4 rounded-full bg-white border border-gray-300 shadow-sm" />
          </div>
          <span className="text-xs text-gray-300">Yes / No</span>
        </div>
      );

    case "CHECKBOX":
      return (
        <div className="flex items-center gap-2 h-8">
          <div className="w-4 h-4 rounded border-2 border-gray-300 flex-shrink-0" />
          <span className="text-xs text-gray-300">Checkbox</span>
        </div>
      );

    case "DROPDOWN":
    case "STATUS":
      return (
        <div className={cn(base, "h-8 px-2.5 flex items-center justify-between")}>
          <span>Select…</span>
          <ChevronDown className="w-3 h-3 text-gray-300 flex-shrink-0" />
        </div>
      );

    case "RADIO":
      return (
        <div className="flex items-center gap-4 h-8">
          {["A", "B", "C"].map(l => (
            <div key={l} className="flex items-center gap-1.5">
              <div className="w-3.5 h-3.5 rounded-full border-2 border-gray-300 flex-shrink-0" />
              <span className="text-xs text-gray-300">{l}</span>
            </div>
          ))}
        </div>
      );

    case "MULTI_SELECT":
    case "TAGS":
      return (
        <div className="flex items-center gap-1.5 h-8 flex-wrap overflow-hidden">
          {["Tag 1", "Tag 2"].map(t => (
            <span key={t} className="px-2 py-0.5 rounded-full bg-gray-100 border border-gray-200 text-xs text-gray-400">{t}</span>
          ))}
        </div>
      );

    case "DATE":
      return (
        <div className={cn(base, "h-8 px-2.5 flex items-center justify-between")}>
          <span>YYYY-MM-DD</span>
          <span className="text-gray-300 text-sm">📅</span>
        </div>
      );

    case "DATETIME":
      return (
        <div className={cn(base, "h-8 px-2.5 flex items-center justify-between")}>
          <span>YYYY-MM-DD HH:MM</span>
          <span className="text-gray-300 text-sm">🕐</span>
        </div>
      );

    case "NUMBER":
    case "DECIMAL":
      return (
        <div className={cn(base, "h-8 px-2.5 flex items-center justify-between")}>
          <span>0</span>
          <span className="text-gray-300 text-[10px] font-mono">#</span>
        </div>
      );

    case "CURRENCY":
      return (
        <div className={cn(base, "h-8 px-2.5 flex items-center gap-1.5")}>
          <span className="text-gray-400 font-medium">$</span>
          <span>0.00</span>
        </div>
      );

    case "EMAIL":
      return (
        <div className={cn(base, "h-8 px-2.5 flex items-center gap-1.5")}>
          <span className="text-gray-400 text-xs">@</span>
          <span>email@example.com</span>
        </div>
      );

    case "PHONE":
      return (
        <div className={cn(base, "h-8 px-2.5 flex items-center gap-1.5")}>
          <span className="text-gray-400 text-xs">☎</span>
          <span>+1 000 000 0000</span>
        </div>
      );

    case "URL":
      return (
        <div className={cn(base, "h-8 px-2.5 flex items-center gap-1.5")}>
          <span className="text-gray-400 text-xs">🔗</span>
          <span>https://</span>
        </div>
      );

    case "RATING":
      return (
        <div className="flex items-center gap-0.5 h-8">
          {[1,2,3,4,5].map(n => (
            <span key={n} className={n <= 3 ? "text-yellow-300 text-base" : "text-gray-200 text-base"}>★</span>
          ))}
        </div>
      );

    case "PROGRESS":
      return (
        <div className="space-y-1 py-1">
          <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
            <div className="h-full w-3/5 rounded-full bg-blue-200" />
          </div>
          <p className="text-[10px] text-gray-300 text-right">60%</p>
        </div>
      );

    case "FILE":
      return (
        <div className={cn(base, "h-9 px-2.5 flex items-center gap-2 border-dashed")}>
          <span className="text-gray-300 text-sm">📎</span>
          <span>Click to attach file</span>
        </div>
      );

    case "IMAGE":
      return (
        <div className={cn(base, "h-14 flex items-center justify-center gap-2 border-dashed")}>
          <span className="text-gray-300 text-lg">🖼</span>
          <span className="text-xs">Upload image</span>
        </div>
      );

    case "SIGNATURE":
      return (
        <div className={cn(base, "h-14 flex items-center justify-center border-dashed")}>
          <span className="text-gray-300 text-xs italic">✍️  Signature area</span>
        </div>
      );

    case "USER_SELECT":
      return (
        <div className={cn(base, "h-8 px-2.5 flex items-center gap-2")}>
          <div className="w-5 h-5 rounded-full bg-gray-200 flex items-center justify-center text-[9px] text-gray-400 flex-shrink-0">👤</div>
          <span>Select user…</span>
        </div>
      );

    case "LOOKUP":
      return (
        <div className={cn(base, "h-8 px-2.5 flex items-center justify-between")}>
          <span>Search records…</span>
          <span className="text-gray-300 text-xs">🔍</span>
        </div>
      );

    case "GLOBAL_RELATION":
    case "GLOBAL_LIST":
    case "DEPENDENT_GLOBAL_LIST":
      return (
        <div className="space-y-1">
          {["Level 1", "Level 2"].map((l, i) => (
            <div key={i} className={cn(base, "h-7 px-2 flex items-center justify-between")}>
              <span className="text-[11px]">{l}</span>
              <ChevronDown className="w-3 h-3 text-gray-300" />
            </div>
          ))}
        </div>
      );

    case "FORMULA":
      return (
        <div className={cn("h-8 rounded-md border border-blue-100 bg-blue-50/50 px-2.5 flex items-center gap-1.5")}>
          <span className="font-mono text-[10px] text-blue-400">fx</span>
          <span className="text-xs text-blue-300">Calculated</span>
        </div>
      );

    case "AUTO_NUMBER":
      return (
        <div className={cn("h-8 rounded-md border border-gray-200 bg-gray-50 px-2.5 flex items-center gap-1.5")}>
          <span className="text-xs text-gray-400 font-mono">AUTO-00001</span>
        </div>
      );

    case "INLINE_SUBFORM":
      return (
        <div className={cn("rounded-md border border-gray-200 bg-gray-50/50 overflow-hidden")}>
          <div className="px-2 py-1 bg-gray-100/80 flex gap-4 border-b border-gray-200">
            <span className="text-[10px] text-gray-400 font-semibold">COL A</span>
            <span className="text-[10px] text-gray-400 font-semibold">COL B</span>
          </div>
          <div className="px-2 py-1.5 text-[10px] text-gray-300 italic">+ Add row</div>
        </div>
      );

    default:
      return (
        <div className={cn(base, "h-8 px-2.5 flex items-center")}>
          <span>Enter value…</span>
        </div>
      );
  }
}

// ── FieldCard ─────────────────────────────────────────────────────────────────
// Entire card is the drag surface — no grip-only handle.

function FieldCard({
  field,
  sectionId,
  columns,
  fieldWidth,
  isSelected,
  previewMode,
  onSelect,
  onRemove,
  onSetWidth,
}: {
  field: Field;
  sectionId: string;
  columns: number;
  fieldWidth: string | undefined;
  isSelected: boolean;
  previewMode: boolean;
  onSelect: () => void;
  onRemove: () => void;
  onSetWidth: (w: string) => void;
}) {
  const [hovered, setHovered] = useState(false);
  const dragId = makeFieldId(sectionId, field.id);
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: dragId });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    userSelect: "none",
    WebkitUserSelect: "none",
  };

  const spanCls = colSpanClass(fieldWidth, columns);

  // Drop placeholder — renders the slot the field will land in
  if (isDragging) {
    return (
      <div
        ref={setNodeRef}
        style={style}
        {...attributes}
        {...listeners}
        className={cn(
          "rounded-lg border-2 border-dashed border-blue-300 bg-blue-50 touch-none",
          spanCls
        )}
      >
        <div className="flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium text-blue-400 select-none pointer-events-none">
          <GripVertical className="w-3 h-3 shrink-0" />
          <span className="truncate">{field.label}</span>
          <span className="font-normal text-blue-300 ml-auto">
            {field.type.toLowerCase().replace(/_/g, " ")}
          </span>
        </div>
      </div>
    );
  }

  // Preview mode: render exactly as FormSectionRenderer would
  if (previewMode) {
    return (
      <div className={cn("space-y-1.5", spanCls)}>
        <dt className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
          {field.label}
          {field.isRequired && <span className="text-red-500 ml-0.5">*</span>}
        </dt>
        <dd>
          <div className="h-8 bg-white border border-gray-200 rounded-md" />
          {field.helpText && (
            <p className="text-xs text-gray-400 mt-0.5">{field.helpText}</p>
          )}
        </dd>
      </div>
    );
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      // Spread dnd attributes + listeners on the ENTIRE card — whole surface is draggable
      {...attributes}
      {...listeners}
      className={cn(
        "group relative space-y-1.5 rounded-md transition-all",
        "touch-none",                      // required for dnd-kit pointer events
        isDragging
          ? "cursor-grabbing z-50"
          : "cursor-grab hover:cursor-grab active:cursor-grabbing",
        isSelected
          ? "ring-2 ring-blue-400 ring-offset-1 bg-blue-50/30 px-2 -mx-2 py-1 -my-1"
          : "hover:ring-1 hover:ring-blue-200 hover:ring-offset-1 px-2 -mx-2 py-1 -my-1",
        spanCls
      )}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      // onClick must fire only on non-drag pointer-up — dnd-kit does NOT prevent
      // click after a zero-distance tap, so we use onClick normally here.
      onClick={onSelect}
    >
      {/* Label — matches Record View dt style */}
      <dt className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1 pointer-events-none">
        {field.label}
        {field.isRequired && <span className="text-red-500">*</span>}
        <span className="font-normal text-gray-300 normal-case tracking-normal ml-1">
          {field.type.toLowerCase().replace(/_/g, " ")}
        </span>
      </dt>

      {/* Field-type-specific placeholder */}
      <dd className="pointer-events-none">
        <FieldTypeMock type={field.type} isSelected={isSelected} />
      </dd>

      {/* Toolbar — stop pointer propagation so clicking these buttons
          does NOT activate the drag sensor */}
      {(hovered || isSelected) && !isDragging && (
        <div
          className="absolute -right-1 -top-1 flex items-center gap-0.5 bg-white border border-gray-200 rounded-lg px-1 py-0.5 shadow-sm z-10"
          onPointerDown={e => e.stopPropagation()}
          onClick={e => e.stopPropagation()}
        >
          {/* Visual drag hint — purely decorative, no listeners needed */}
          <span className="text-gray-300 px-0.5" title="Drag to move">
            <GripVertical className="h-3 w-3" />
          </span>

          {/* Width controls (only when section has >1 col) */}
          {columns > 1 && (
            <div className="flex items-center gap-0.5 border-l border-gray-200 ml-0.5 pl-1">
              {WIDTH_OPTIONS.filter(w => {
                if (w.value === "1/3" && columns < 3) return false;
                if (w.value === "1/4" && columns < 4) return false;
                return true;
              }).map(w => (
                <button
                  key={w.value}
                  onPointerDown={e => e.stopPropagation()}
                  onClick={() => onSetWidth(w.value)}
                  className={cn(
                    "text-[9px] font-semibold px-1 rounded leading-4 transition-colors",
                    (fieldWidth ?? "full") === w.value
                      ? "bg-blue-500 text-white"
                      : "text-gray-400 hover:bg-gray-100"
                  )}
                >
                  {w.label}
                </button>
              ))}
            </div>
          )}

          {/* Remove from section */}
          <button
            onPointerDown={e => e.stopPropagation()}
            onClick={onRemove}
            className="ml-0.5 text-gray-300 hover:text-red-500 transition-colors"
            title="Remove from section"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      )}
    </div>
  );
}

// ── SectionCard ───────────────────────────────────────────────────────────────

interface SectionCardProps {
  section: LayoutSection;
  fields: Field[];
  selectedFieldId?: string | null;
  previewMode: boolean;
  onFieldSelect: (f: Field | null) => void;
  onUpdateSection: (patch: Partial<LayoutSection>) => void;
  onDeleteSection: () => void;
  onDuplicateSection: () => void;
  onRemoveFromSection: (fieldId: string) => void;
  onSetFieldWidth: (fieldId: string, width: string) => void;
  isOver: boolean;
  isPaletteOver?: boolean;
  /** Passed from SortableSectionCard — spread onto the drag handle button */
  sectionDragHandleProps?: React.HTMLAttributes<HTMLButtonElement>;
}

function SectionCard({
  section,
  fields,
  selectedFieldId,
  previewMode,
  onFieldSelect,
  onUpdateSection,
  onDeleteSection,
  onDuplicateSection,
  onRemoveFromSection,
  onSetFieldWidth,
  isOver,
  isPaletteOver = false,
  sectionDragHandleProps,
}: SectionCardProps) {
  const [collapsed, setCollapsed] = useState(section.collapsed ?? false);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState(section.title);
  const inputRef = useRef<HTMLInputElement>(null);

  const sectionFields = section.fieldIds
    .map(id => fields.find(f => f.id === id))
    .filter((f): f is Field => Boolean(f));

  const sortableIds = section.fieldIds.map(fid => makeFieldId(section.id, fid));
  const cols = section.columns ?? 2;

  function commitTitle() {
    setEditingTitle(false);
    if (titleValue.trim() && titleValue.trim() !== section.title) {
      onUpdateSection({ title: titleValue.trim() });
    } else {
      setTitleValue(section.title);
    }
  }

  return (
    <div className="space-y-0">
      {/* Section header */}
      <div className="flex items-center gap-2 py-2 mb-3 group/header">

        {/* Section drag handle — only in builder mode */}
        {!previewMode && sectionDragHandleProps && (
          <button
            {...(sectionDragHandleProps as any)}
            className="cursor-grab active:cursor-grabbing text-gray-300 hover:text-gray-500 touch-none shrink-0 transition-colors"
            tabIndex={-1}
            title="Drag to reorder section"
            style={{ userSelect: "none", WebkitUserSelect: "none" } as React.CSSProperties}
          >
            <GripVertical className="w-3.5 h-3.5" />
          </button>
        )}

        <button
          className="text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0"
          onClick={() => { setCollapsed(c => !c); onUpdateSection({ collapsed: !collapsed }); }}
        >
          {collapsed
            ? <ChevronRight className="w-3.5 h-3.5" />
            : <ChevronDown  className="w-3.5 h-3.5" />}
        </button>

        {/* Title — inline-edit on double-click */}
        {editingTitle && !previewMode ? (
          <input
            ref={inputRef}
            autoFocus
            className="text-xs font-semibold text-gray-500 uppercase tracking-wider bg-transparent border-b border-blue-400 focus:outline-none py-0 leading-none flex-1"
            value={titleValue}
            onChange={e => setTitleValue(e.target.value)}
            onBlur={commitTitle}
            onKeyDown={e => {
              if (e.key === "Enter") commitTitle();
              if (e.key === "Escape") { setTitleValue(section.title); setEditingTitle(false); }
            }}
          />
        ) : (
          <span
            className={cn(
              "text-xs font-semibold text-gray-500 uppercase tracking-wider",
              !previewMode && "cursor-text hover:text-blue-600 transition-colors"
            )}
            onDoubleClick={() => !previewMode && setEditingTitle(true)}
            title={previewMode ? undefined : "Double-click to rename"}
          >
            {section.title || "Untitled Section"}
          </span>
        )}

        {/* Horizontal rule */}
        <div className="flex-1 h-px bg-gray-100" />

        {/* Builder controls — only in edit mode, fade in on hover */}
        {!previewMode && (
          <div className="flex items-center gap-1 opacity-0 group-hover/header:opacity-100 transition-opacity">
            {/* Column count */}
            <div className="flex items-center gap-0.5 bg-white border border-gray-200 rounded overflow-hidden">
              {([1, 2, 3, 4] as const).map(n => (
                <button
                  key={n}
                  onClick={() => onUpdateSection({ columns: n })}
                  className={cn(
                    "w-5 h-5 text-[10px] font-bold transition-colors",
                    cols === n
                      ? "bg-blue-500 text-white"
                      : "text-gray-400 hover:bg-gray-50"
                  )}
                  title={`${n} column${n > 1 ? "s" : ""}`}
                >
                  {n}
                </button>
              ))}
            </div>

            {/* Collapsible toggle */}
            <button
              onClick={() => onUpdateSection({ collapsible: !section.collapsible })}
              className={cn(
                "w-5 h-5 flex items-center justify-center rounded border transition-colors",
                section.collapsible
                  ? "border-blue-300 bg-blue-50 text-blue-600"
                  : "border-gray-200 text-gray-400 hover:border-gray-300"
              )}
              title={section.collapsible ? "Remove collapsible" : "Make collapsible"}
            >
              <Maximize2 className="w-2.5 h-2.5" />
            </button>

            {/* Duplicate section */}
            <button
              onClick={onDuplicateSection}
              className="w-5 h-5 flex items-center justify-center rounded text-gray-400 hover:text-blue-500 hover:bg-blue-50 border border-gray-200 transition-colors"
              title="Duplicate section"
            >
              <Copy className="w-2.5 h-2.5" />
            </button>

            {/* Delete section */}
            <button
              onClick={onDeleteSection}
              className="w-5 h-5 flex items-center justify-center rounded text-gray-400 hover:text-red-500 hover:bg-red-50 border border-gray-200 transition-colors"
              title="Delete section"
            >
              <Trash2 className="w-2.5 h-2.5" />
            </button>
          </div>
        )}
      </div>

      {/* Fields grid */}
      {!collapsed && (
        <DroppableSection sectionId={section.id} isOver={isOver}>
          {/* rectSortingStrategy gives correct positional feedback in multi-column grids */}
          <SortableContext items={sortableIds} strategy={rectSortingStrategy}>
            {sectionFields.length === 0 && !previewMode ? (
              <div className={cn("grid gap-x-8 gap-y-5 min-h-12 mb-6", gridClass(cols))}>
                <div className={cn(
                  "col-span-full flex flex-col items-center justify-center py-8 rounded-xl border-2 border-dashed transition-all duration-150",
                  isPaletteOver
                    ? "border-blue-400 bg-blue-50 text-blue-600 scale-[1.01]"
                    : isOver
                    ? "border-blue-300 bg-blue-50/60 text-blue-500"
                    : "border-gray-200 text-gray-400"
                )}>
                  {isPaletteOver ? (
                    <>
                      <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center mb-1.5">
                        <Plus className="w-4 h-4 text-blue-500" />
                      </div>
                      <p className="text-xs font-semibold">Drop to add here</p>
                    </>
                  ) : (
                    <p className="text-xs">{isOver ? "↓ Drop field here" : "Drag fields here or click a type on the left"}</p>
                  )}
                </div>
              </div>
            ) : (
              <dl className={cn("grid gap-x-8 gap-y-5 mb-6", gridClass(cols))}>
                {sectionFields.map(field => (
                  <FieldCard
                    key={field.id}
                    field={field}
                    sectionId={section.id}
                    columns={cols}
                    fieldWidth={section.fieldWidths?.[field.id]}
                    isSelected={selectedFieldId === field.id}
                    previewMode={previewMode}
                    onSelect={() => onFieldSelect(selectedFieldId === field.id ? null : field)}
                    onRemove={() => onRemoveFromSection(field.id)}
                    onSetWidth={w => onSetFieldWidth(field.id, w)}
                  />
                ))}
              </dl>
            )}
          </SortableContext>
        </DroppableSection>
      )}
    </div>
  );
}

// ── SortableSectionCard — makes the whole SectionCard reorderable ─────────────

function SortableSectionCard(props: SectionCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: makeSectionId(props.section.id) });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    position: isDragging ? "relative" : undefined,
    zIndex: isDragging ? 999 : undefined,
  };

  // Merge dnd attributes/listeners into the drag-handle slot inside SectionCard
  const dragHandleProps = { ...attributes, ...listeners };

  return (
    <div ref={setNodeRef} style={style}>
      <SectionCard
        {...props}
        sectionDragHandleProps={dragHandleProps as any}
      />
    </div>
  );
}

// ── UnassignedPill — whole pill is the drag surface ───────────────────────────

function UnassignedPill({
  field,
  isSelected,
  onSelect,
  onDelete,
}: {
  field: Field;
  isSelected: boolean;
  onSelect: () => void;
  onDelete: () => void;
}) {
  const dragId = makeUnassignedId(field.id);
  const {
    attributes, listeners, setNodeRef, transform, transition, isDragging,
  } = useSortable({ id: dragId });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    userSelect: "none",
    WebkitUserSelect: "none",
  };

  if (isDragging) {
    return (
      <div
        ref={setNodeRef}
        style={style}
        {...attributes}
        {...listeners}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full border-2 border-dashed border-blue-300 bg-blue-50 text-xs touch-none select-none text-blue-400"
      >
        <GripVertical className="h-3 w-3 pointer-events-none shrink-0" />
        <span className="font-medium truncate max-w-32 pointer-events-none">{field.label}</span>
      </div>
    );
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      // Whole pill is draggable
      {...attributes}
      {...listeners}
      className={cn(
        "group flex items-center gap-1.5 px-2.5 py-1.5 rounded-full border text-xs",
        "touch-none select-none cursor-grab hover:cursor-grab active:cursor-grabbing",
        isSelected
          ? "border-blue-400 bg-blue-50 text-blue-700"
          : "border-gray-200 bg-white hover:border-gray-300 text-gray-600"
      )}
      onClick={onSelect}
    >
      <GripVertical className="h-3 w-3 text-gray-300 pointer-events-none shrink-0" />
      <span className="font-medium truncate max-w-32 pointer-events-none">{field.label}</span>
      <span className="text-gray-400 text-[9px] uppercase pointer-events-none">
        {field.type.toLowerCase().replace(/_/g, " ")}
      </span>
      <button
        className="ml-0.5 text-gray-300 opacity-0 group-hover:opacity-100 hover:text-red-500 transition-all"
        // Stop propagation so clicking delete doesn't activate drag
        onPointerDown={e => e.stopPropagation()}
        onClick={e => { e.stopPropagation(); onDelete(); }}
        title="Delete field"
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  );
}

function UnassignedZone({
  fields, selectedFieldId, onFieldSelect, onDeleteField,
}: {
  fields: Field[];
  selectedFieldId?: string | null;
  onFieldSelect: (f: Field | null) => void;
  onDeleteField: (id: string) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: "drop-section-__unassigned__" });
  const sortableIds = fields.map(f => makeUnassignedId(f.id));

  return (
    <div>
      <div className="flex items-center gap-2 py-2 mb-2">
        <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Unassigned Fields</span>
        <div className="flex-1 h-px bg-gray-100" />
        <span className="text-[10px] text-gray-400">{fields.length}</span>
      </div>
      <div
        ref={setNodeRef}
        className={cn(
          "flex flex-wrap gap-2 min-h-8 p-2 rounded-xl border-2 border-dashed transition-colors",
          isOver ? "border-blue-300 bg-blue-50" : "border-gray-200 bg-gray-50/50"
        )}
      >
        <SortableContext items={sortableIds} strategy={rectSortingStrategy}>
          {fields.length === 0
            ? <span className="text-xs text-gray-400 italic py-0.5">All fields are in sections</span>
            : fields.map(f => (
              <UnassignedPill
                key={f.id}
                field={f}
                isSelected={selectedFieldId === f.id}
                onSelect={() => onFieldSelect(selectedFieldId === f.id ? null : f)}
                onDelete={() => onDeleteField(f.id)}
              />
            ))
          }
        </SortableContext>
      </div>
    </div>
  );
}

// ── DragOverlay pills ─────────────────────────────────────────────────────────

function FieldDragPill({ field }: { field: Field }) {
  return (
    <div className="flex items-center gap-2 rounded-lg border-2 border-blue-400 bg-white px-3 py-2 shadow-2xl text-xs font-medium text-gray-700 cursor-grabbing ring-4 ring-blue-100">
      <GripVertical className="h-3.5 w-3.5 text-blue-400 shrink-0" />
      <span className="truncate max-w-40">{field.label}</span>
      <span className="text-[9px] uppercase text-gray-400 shrink-0">
        {field.type.toLowerCase().replace(/_/g, " ")}
      </span>
    </div>
  );
}

function SectionDragPill({ section }: { section: LayoutSection }) {
  return (
    <div className="flex items-center gap-2 rounded-lg border-2 border-indigo-400 bg-white px-3 py-2 shadow-2xl text-xs font-semibold text-gray-700 cursor-grabbing ring-4 ring-indigo-100">
      <GripVertical className="h-3.5 w-3.5 text-indigo-400 shrink-0" />
      <span className="uppercase tracking-wide text-gray-500">{section.title || "Section"}</span>
      <span className="text-[9px] text-gray-400">
        {section.fieldIds.length} field{section.fieldIds.length !== 1 ? "s" : ""}
      </span>
    </div>
  );
}

// ── Active-drag state ─────────────────────────────────────────────────────────

type ActiveDrag =
  | { type: "field"; field: Field }
  | { type: "section"; section: LayoutSection }
  | null;

// ── ModuleLayoutCanvas ────────────────────────────────────────────────────────

// Smart width helper — same logic as in page.tsx so canvas can use it independently
function smartWidth(widths: Record<string, string>, fieldIds: string[], columns: number): string {
  if (columns <= 1) return "full";
  let spansUsed = 0;
  for (const fid of fieldIds) {
    const w = widths[fid] ?? "full";
    const span = w === "full" ? columns : 1;
    spansUsed = (spansUsed + span) % columns;
  }
  const remaining = (columns - spansUsed) % columns;
  return remaining === 0 ? "full" : (columns === 4 ? "1/4" : columns === 3 ? "1/3" : "1/2");
}

export function ModuleLayoutCanvas({
  fields,
  layoutConfig,
  onLayoutChange,
  selectedFieldId,
  onFieldSelect,
  onDeleteField,
  previewMode = false,
  draggingFromPalette = false,
  onPaletteHoverSection,
  skipAutoAssignRef,
}: ModuleLayoutCanvasProps) {
  const [activeDrag, setActiveDrag] = useState<ActiveDrag>(null);
  const [overDropId, setOverDropId] = useState<string | null>(null);
  const [paletteHoverSectionId, setPaletteHoverSectionId] = useState<string | null>(null);
  const paletteHoverRef = useRef<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      // 5px threshold distinguishes intentional drag from accidental movement
      activationConstraint: { distance: 5 },
    }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // Palette hover section detection via pointermove + elementsFromPoint.
  // onMouseEnter/Leave doesn't work during dnd-kit drag (pointer is captured by
  // the dragged palette item), but elementsFromPoint is unaffected by capture.
  useEffect(() => {
    if (!draggingFromPalette) {
      if (paletteHoverRef.current !== null) {
        paletteHoverRef.current = null;
        setPaletteHoverSectionId(null);
        onPaletteHoverSection?.(null);
      }
      return;
    }
    const onMove = (e: PointerEvent) => {
      const els = document.elementsFromPoint(e.clientX, e.clientY);
      const hit = els.find(el => !!(el as HTMLElement).dataset?.sectionId) as HTMLElement | undefined;
      const newId = hit?.dataset.sectionId ?? null;
      if (newId !== paletteHoverRef.current) {
        paletteHoverRef.current = newId;
        setPaletteHoverSectionId(newId);
        onPaletteHoverSection?.(newId);
      }
    };
    document.addEventListener("pointermove", onMove);
    return () => document.removeEventListener("pointermove", onMove);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draggingFromPalette]);

  const sections = layoutConfig.sections ?? [];
  const assignedIds = new Set(sections.flatMap(s => s.fieldIds));
  const unassignedFields = fields.filter(f => !assignedIds.has(f.id));

  const emit = useCallback(
    (newSections: LayoutSection[]) => onLayoutChange({ ...layoutConfig, sections: newSections }),
    [layoutConfig, onLayoutChange]
  );

  // Auto-assign any unassigned fields to the first section (or create one).
  // This runs whenever a new field is added via the palette click/drag.
  useEffect(() => {
    // Skip if the parent manually placed the field (palette → specific section)
    if (skipAutoAssignRef?.current) return;
    if (unassignedFields.length === 0) return;

    let currentSections = layoutConfig.sections ?? [];

    // Create a default section if none exist
    if (currentSections.length === 0) {
      const defaultSection: LayoutSection = {
        id: `s-default`,
        title: "Details",
        columns: 2,
        fieldIds: [],
        collapsible: false,
        collapsed: false,
        fieldWidths: {},
      };
      currentSections = [defaultSection];
    }

    // Append unassigned fields to the first section using smart width sizing
    const firstSection = currentSections[0];
    const cols = firstSection.columns ?? 2;
    const newFieldIds = [...firstSection.fieldIds];
    const newWidths = { ...(firstSection.fieldWidths ?? {}) };

    for (const f of unassignedFields) {
      if (!newFieldIds.includes(f.id)) {
        // Use smart width: first field in empty row → full, completing a row → half
        newWidths[f.id] = smartWidth(newWidths, newFieldIds, cols);
        newFieldIds.push(f.id);
      }
    }

    const updated = currentSections.map((s, i) =>
      i === 0 ? { ...s, fieldIds: newFieldIds, fieldWidths: newWidths } : s
    );

    onLayoutChange({ ...layoutConfig, sections: updated });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fields.length]); // only run when field count changes (new field added)

  // ── Section operations ──────────────────────────────────────────────────────

  function addSection() {
    const s: LayoutSection = {
      id: `s-${generateId().slice(0, 8)}`,
      title: "New Section",
      columns: 2,
      fieldIds: [],
      collapsible: false,
      collapsed: false,
      fieldWidths: {},
    };
    emit([...sections, s]);
  }

  function updateSection(sectionId: string, patch: Partial<LayoutSection>) {
    emit(sections.map(s => s.id === sectionId ? { ...s, ...patch } : s));
  }

  function deleteSection(sectionId: string) {
    emit(sections.filter(s => s.id !== sectionId));
  }

  function duplicateSection(sectionId: string) {
    const src = sections.find(s => s.id === sectionId);
    if (!src) return;
    const copy: LayoutSection = {
      ...src,
      id: `s-${generateId().slice(0, 8)}`,
      title: `${src.title} (copy)`,
      fieldIds: [],           // don't copy field assignments — fields stay in original
      fieldWidths: {},
    };
    const idx = sections.findIndex(s => s.id === sectionId);
    const next = [...sections];
    next.splice(idx + 1, 0, copy);
    emit(next);
  }

  function removeFromSection(fieldId: string, sectionId: string) {
    emit(sections.map(s =>
      s.id !== sectionId ? s : { ...s, fieldIds: s.fieldIds.filter(id => id !== fieldId) }
    ));
  }

  function setFieldWidth(sectionId: string, fieldId: string, width: string) {
    emit(sections.map(s =>
      s.id !== sectionId ? s : { ...s, fieldWidths: { ...(s.fieldWidths ?? {}), [fieldId]: width } }
    ));
  }

  // ── Body userSelect control — prevents text highlight during drag ────────────

  function lockSelection() {
    if (typeof document !== "undefined") {
      document.body.style.userSelect = "none";
      (document.body.style as any).webkitUserSelect = "none";
    }
  }

  function unlockSelection() {
    if (typeof document !== "undefined") {
      document.body.style.userSelect = "";
      (document.body.style as any).webkitUserSelect = "";
    }
  }

  // ── DnD handlers ────────────────────────────────────────────────────────────

  function onDragStart(e: DragStartEvent) {
    lockSelection();
    const activeId = String(e.active.id);

    // Section drag
    if (activeId.startsWith("section-")) {
      const sectionId = activeId.slice("section-".length);
      const sec = sections.find(s => s.id === sectionId);
      if (sec) setActiveDrag({ type: "section", section: sec });
      return;
    }

    // Field drag
    const parsed = parseDragId(activeId, sections);
    if (parsed) {
      const field = fields.find(f => f.id === parsed.fieldId);
      if (field) setActiveDrag({ type: "field", field });
    }
  }

  function onDragOver(e: { over: { id: string | number } | null }) {
    setOverDropId(e.over ? String(e.over.id) : null);
  }

  function onDragEnd(e: DragEndEvent) {
    unlockSelection();
    setActiveDrag(null);
    setOverDropId(null);

    const { active, over } = e;
    if (!over) return;

    const activeId = String(active.id);
    const overId   = String(over.id);

    // ── Section reorder ──────────────────────────────────────────────────────
    if (activeId.startsWith("section-")) {
      if (!overId.startsWith("section-")) return;
      const fromIdx = sections.findIndex(s => makeSectionId(s.id) === activeId);
      const toIdx   = sections.findIndex(s => makeSectionId(s.id) === overId);
      if (fromIdx !== -1 && toIdx !== -1 && fromIdx !== toIdx) {
        emit(arrayMove(sections, fromIdx, toIdx));
      }
      return;
    }

    // ── Field drag ───────────────────────────────────────────────────────────
    const src = parseDragId(activeId, sections);
    if (!src) return;

    const { fieldId, sectionId: fromSid } = src;
    const toSid = getTargetSectionId(overId, sections);
    if (!toSid) return;

    // Unassigned → unassigned (no-op)
    if (fromSid === "__unassigned__" && toSid === "__unassigned__") return;

    // Unassigned → section: smart width based on row occupancy
    if (fromSid === "__unassigned__" && toSid !== "__unassigned__") {
      const target = sections.find(s => s.id === toSid);
      if (!target) return;
      const overParsed = parseDragId(overId, sections);
      let idx = target.fieldIds.length;
      if (overParsed?.sectionId === toSid) {
        const i = target.fieldIds.indexOf(overParsed.fieldId);
        if (i !== -1) idx = i;
      }
      const newIds = [...target.fieldIds];
      newIds.splice(idx, 0, fieldId);
      const cols = target.columns ?? 2;
      // Smart: compute width based on fields BEFORE the insertion point
      const idsBeforeInsert = target.fieldIds.slice(0, idx);
      const autoWidth = smartWidth(target.fieldWidths ?? {}, idsBeforeInsert, cols);
      emit(sections.map(s =>
        s.id === toSid
          ? { ...s, fieldIds: newIds, fieldWidths: { ...(s.fieldWidths ?? {}), [fieldId]: autoWidth } }
          : s
      ));
      return;
    }

    // Section → unassigned: remove from section (keep unassigned zone for edge cases)
    if (fromSid !== "__unassigned__" && toSid === "__unassigned__") {
      emit(sections.map(s =>
        s.id !== fromSid ? s : { ...s, fieldIds: s.fieldIds.filter(id => id !== fieldId) }
      ));
      return;
    }

    // Same-section reorder
    if (fromSid === toSid) {
      const sec = sections.find(s => s.id === fromSid);
      if (!sec) return;
      const overParsed = parseDragId(overId, sections);
      if (!overParsed || overParsed.sectionId !== fromSid) return;
      const oi = sec.fieldIds.indexOf(fieldId);
      const ni = sec.fieldIds.indexOf(overParsed.fieldId);
      if (oi === -1 || ni === -1 || oi === ni) return;
      emit(sections.map(s =>
        s.id === fromSid ? { ...s, fieldIds: arrayMove(sec.fieldIds, oi, ni) } : s
      ));
      return;
    }

    // Cross-section move
    const srcSec = sections.find(s => s.id === fromSid);
    const dstSec = sections.find(s => s.id === toSid);
    if (!srcSec || !dstSec) return;
    const overParsed = parseDragId(overId, sections);
    let insertIdx = dstSec.fieldIds.length;
    if (overParsed?.sectionId === toSid) {
      const i = dstSec.fieldIds.indexOf(overParsed.fieldId);
      if (i !== -1) insertIdx = i;
    }
    const newSrcIds = srcSec.fieldIds.filter(id => id !== fieldId);
    const newDstIds = [...dstSec.fieldIds];
    newDstIds.splice(insertIdx, 0, fieldId);
    emit(sections.map(s => {
      if (s.id === fromSid) return { ...s, fieldIds: newSrcIds };
      if (s.id === toSid)   return { ...s, fieldIds: newDstIds };
      return s;
    }));
  }

  function onDragCancel(_e: DragCancelEvent) {
    unlockSelection();
    setActiveDrag(null);
    setOverDropId(null);
    setPaletteHoverSectionId(null);
    onPaletteHoverSection?.(null);
  }

  const overSectionId = overDropId ? getTargetSectionId(overDropId, sections) : null;
  const sectionSortableIds = sections.map(s => makeSectionId(s.id));

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragEnd={onDragEnd}
      onDragCancel={onDragCancel}
    >
      <div className="space-y-6">
        {/* Sections — wrapped in a SortableContext so they can be reordered */}
        <SortableContext items={sectionSortableIds} strategy={verticalListSortingStrategy}>
          {sections.map(section => (
            <div
              key={section.id}
              data-section-id={section.id}
            >
              <SortableSectionCard
                section={section}
                fields={fields}
                selectedFieldId={selectedFieldId}
                previewMode={previewMode}
                onFieldSelect={onFieldSelect}
                onUpdateSection={patch => updateSection(section.id, patch)}
                onDeleteSection={() => deleteSection(section.id)}
                onDuplicateSection={() => duplicateSection(section.id)}
                onRemoveFromSection={fid => removeFromSection(fid, section.id)}
                onSetFieldWidth={(fid, w) => setFieldWidth(section.id, fid, w)}
                isOver={overSectionId === section.id}
                isPaletteOver={draggingFromPalette && paletteHoverSectionId === section.id}
              />
            </div>
          ))}
        </SortableContext>

        {/* Add Section */}
        {!previewMode && (
          <button
            onClick={addSection}
            className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-200 py-3 text-sm font-medium text-gray-400 transition-colors hover:border-blue-300 hover:text-blue-500"
          >
            <Plus className="h-4 w-4" />
            Add Section
          </button>
        )}

        {/* Unassigned fields auto-assign hint — no pool shown */}
        {!previewMode && unassignedFields.length > 0 && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-700">
            <span className="font-semibold">{unassignedFields.length}</span> field{unassignedFields.length !== 1 ? "s" : ""} not yet in a section — drag into a section above to place them.
          </div>
        )}
      </div>

      {/* Drag overlay — shows a floating preview while dragging */}
      <DragOverlay dropAnimation={{ duration: 150, easing: "cubic-bezier(0.18, 0.67, 0.6, 1.22)" }}>
        {activeDrag?.type === "section" && <SectionDragPill section={activeDrag.section} />}
        {activeDrag?.type === "field"   && <FieldDragPill   field={activeDrag.field}     />}
      </DragOverlay>
    </DndContext>
  );
}
