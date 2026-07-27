"use client";
import React, { useState, useCallback, useEffect, useRef, useMemo } from "react";
import {
  DndContext, DragEndEvent, DragOverEvent, DragStartEvent,
  PointerSensor, TouchSensor, KeyboardSensor, useSensor, useSensors,
  DragOverlay, pointerWithin, closestCenter,
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import {
  SortableContext, arrayMove, useSortable, verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { portalApi } from "@/lib/portal-api";
import { ModuleIcon } from "@/components/ui/module-icon";
import {
  GripVertical, Plus, Trash2, Check, X, Loader2, ChevronLeft,
  Type, AlignLeft, Hash, Calendar, List, Upload, Minus,
  Heading1, Tag, Phone, Mail, DollarSign, Star,
  Table2, Link2, Database, Sparkles, ChevronDown, CheckSquare,
  Settings, LayoutGrid, ChevronRight, Copy, EyeOff,
  ArrowLeftRight, Search, Eye, Layout, Pencil, PanelLeft,
  PanelRight, Shield, Monitor, Tablet, Smartphone, Rocket,
  SlidersHorizontal,
} from "lucide-react";

// ── Encoding helpers ──────────────────────────────────────────────────────────

const encodeOrder = (colSlot: number, pos: number) => colSlot * 100 + pos;
const colSlotOf = (order: number) => Math.floor(order / 100);

// Reverse map: templateCols number → layoutTemplate string stored in DB
const COLS_TO_TEMPLATE: Record<number, string> = {
  1: "single",
  2: "two-column",
  3: "three-column",
};

export function parseSectionCols(icon?: string | null): { cols: number; ratio: string } {
  if (!icon?.startsWith("__cols=")) return { cols: 1, ratio: "equal" };
  const [colPart, ratioPart] = icon.replace("__cols=", "").split(",ratio=");
  return { cols: Math.max(1, Math.min(4, parseInt(colPart) || 1)), ratio: ratioPart || "equal" };
}
function encodeSectionCols(cols: number, ratio: string) {
  return `__cols=${cols},ratio=${ratio}`;
}
function gridStyle(cols: number, ratio: string): React.CSSProperties {
  if (cols === 1) return {};
  const PRESETS: Record<string, string> = {
    equal: `repeat(${cols}, 1fr)`,
    "50/50": "1fr 1fr",
    "30/70": "3fr 7fr",
    "70/30": "7fr 3fr",
    "25/75": "1fr 3fr",
    "40/60": "2fr 3fr",
    "60/40": "3fr 2fr",
    "33/33/33": "1fr 1fr 1fr",
    "25/50/25": "1fr 2fr 1fr",
    "50/25/25": "2fr 1fr 1fr",
    "25/25/25/25": "1fr 1fr 1fr 1fr",
  };
  return { display: "grid", gridTemplateColumns: PRESETS[ratio] ?? PRESETS.equal };
}

// ── Types ─────────────────────────────────────────────────────────────────────

export interface CanvasField {
  id: string;
  label: string;
  fieldKey: string;
  fieldType: string;
  placeholder?: string;
  helpText?: string;
  isRequired: boolean;
  isEditable: boolean;
  isReadOnly: boolean;
  isVisible: boolean;
  isAdminOnly: boolean;
  options: Array<{ label: string; value: string }>;
  order: number;
  sectionId?: string;
  mappedCrmFieldName?: string;
  mappedCrmModuleSlug?: string;
}

export interface CanvasSection {
  id: string;
  label: string;
  columnIndex: number;
  order: number;
  isCollapsible: boolean;
  isVisible: boolean;
  sectionColumns: number;
  columnRatio: string;
  fields: CanvasField[];
  crmModuleSlug?: string;
  crmRelationField?: string;
}

interface PortalCanvasBuilderProps {
  pageId: string;
  pageName: string;
  sections: CanvasSection[];
  templateColumns: number;
  initialStatus?: string;
  onBack?: () => void;
}

type BuilderMode = "layout" | "design" | "preview";

// ── Component catalogue ───────────────────────────────────────────────────────

const COMPONENT_GROUPS = [
  {
    id: "basic",
    label: "Basic Inputs",
    accent: "blue",
    items: [
      { type: "text",      label: "Text Input",  icon: Type,       desc: "Single-line text" },
      { type: "textarea",  label: "Long Text",   icon: AlignLeft,  desc: "Multi-line text area" },
      { type: "number",    label: "Number",      icon: Hash,       desc: "Numeric value" },
      { type: "currency",  label: "Currency",    icon: DollarSign, desc: "Money field" },
      { type: "email",     label: "Email",       icon: Mail,       desc: "Email address" },
      { type: "phone",     label: "Phone",       icon: Phone,      desc: "Phone number" },
      { type: "date",      label: "Date",        icon: Calendar,   desc: "Date picker" },
      { type: "datetime",  label: "Date & Time", icon: Calendar,   desc: "Date + time picker" },
    ],
  },
  {
    id: "selection",
    label: "Selection",
    accent: "violet",
    items: [
      { type: "boolean",     label: "Checkbox",    icon: CheckSquare, desc: "True/false toggle" },
      { type: "dropdown",    label: "Dropdown",    icon: ChevronDown, desc: "Single-select list" },
      { type: "multiselect", label: "Multi-select", icon: List,       desc: "Multiple choices" },
      { type: "rating",      label: "Rating",      icon: Star,        desc: "Star rating" },
    ],
  },
  {
    id: "advanced",
    label: "Advanced",
    accent: "emerald",
    items: [
      { type: "upload",  label: "File Upload", icon: Upload,   desc: "File attachment" },
      { type: "lookup",  label: "Lookup",      icon: Link2,    desc: "Related record" },
      { type: "formula", label: "Formula",     icon: Sparkles, desc: "Computed value" },
    ],
  },
  {
    id: "layout",
    label: "Layout & Display",
    accent: "gray",
    items: [
      { type: "header",    label: "Heading",     icon: Heading1,   desc: "Section title" },
      { type: "label",     label: "Label Badge", icon: Tag,        desc: "Tag / badge" },
      { type: "separator", label: "Divider",     icon: Minus,      desc: "Horizontal rule" },
      { type: "spacer",    label: "Spacer",      icon: Minus,      desc: "Blank space" },
    ],
  },
  {
    id: "data",
    label: "Data",
    accent: "amber",
    items: [
      { type: "table", label: "Data Table", icon: Table2, desc: "Tabular data" },
    ],
  },
];

const COMP_FLAT = COMPONENT_GROUPS.flatMap(g => g.items);

const RATIO_PRESETS: Record<number, Array<{ id: string; label: string }>> = {
  2: [
    { id: "equal",  label: "50 / 50" },
    { id: "30/70",  label: "30 / 70" },
    { id: "70/30",  label: "70 / 30" },
    { id: "40/60",  label: "40 / 60" },
    { id: "60/40",  label: "60 / 40" },
    { id: "25/75",  label: "25 / 75" },
  ],
  3: [
    { id: "equal",    label: "33 / 33 / 33" },
    { id: "25/50/25", label: "25 / 50 / 25" },
    { id: "50/25/25", label: "50 / 25 / 25" },
  ],
  4: [
    { id: "equal",          label: "25 / 25 / 25 / 25" },
    { id: "25/25/25/25",    label: "25 / 25 / 25 / 25" },
  ],
};

const ACCENT_CLASSES: Record<string, { bg: string; text: string; ring: string }> = {
  blue:    { bg: "bg-blue-50",    text: "text-blue-600",    ring: "ring-blue-200" },
  violet:  { bg: "bg-violet-50",  text: "text-violet-600",  ring: "ring-violet-200" },
  emerald: { bg: "bg-emerald-50", text: "text-emerald-600", ring: "ring-emerald-200" },
  amber:   { bg: "bg-amber-50",   text: "text-amber-600",   ring: "ring-amber-200" },
  gray:    { bg: "bg-gray-100",   text: "text-gray-600",    ring: "ring-gray-200" },
};

// ── ComponentPreview ──────────────────────────────────────────────────────────

function ComponentPreview({ field }: { field: CanvasField }) {
  const INPUT_CLS = "w-full px-2.5 py-1.5 border border-gray-300 rounded-md bg-gray-50 text-xs text-gray-400 pointer-events-none";

  switch (field.fieldType) {
    case "header":
      return <h3 className="text-base font-bold text-gray-800 pointer-events-none">{field.label}</h3>;
    case "label":
      return (
        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-indigo-50 text-indigo-600 border border-indigo-200 pointer-events-none">
          <Tag className="w-3 h-3 mr-1" />{field.label}
        </span>
      );
    case "separator":
    case "divider":
      return (
        <div className="flex items-center gap-2 pointer-events-none">
          <hr className="flex-1 border-gray-300" />
          {field.label && <span className="text-xs text-gray-400">{field.label}</span>}
          <hr className="flex-1 border-gray-300" />
        </div>
      );
    case "spacer":
      return <div className="h-4 border border-dashed border-gray-200 rounded pointer-events-none" />;
    case "boolean":
      return (
        <label className="flex items-center gap-2 pointer-events-none">
          <div className="w-4 h-4 border-2 border-gray-400 rounded bg-white shrink-0" />
          <span className="text-sm text-gray-700">{field.label}</span>
        </label>
      );
    case "textarea":
      return (
        <div className="pointer-events-none">
          <label className="block text-xs font-medium text-gray-600 mb-1">
            {field.label}{field.isRequired && <span className="text-red-400 ml-0.5">*</span>}
          </label>
          <div className="w-full h-14 px-2.5 py-1.5 border border-gray-300 rounded-md bg-gray-50 text-xs text-gray-400">
            {field.placeholder || "Enter text..."}
          </div>
        </div>
      );
    case "dropdown":
      return (
        <div className="pointer-events-none">
          <label className="block text-xs font-medium text-gray-600 mb-1">
            {field.label}{field.isRequired && <span className="text-red-400 ml-0.5">*</span>}
          </label>
          <div className="flex items-center justify-between px-2.5 py-1.5 border border-gray-300 rounded-md bg-gray-50 text-xs text-gray-400">
            <span>Select...</span><ChevronDown className="w-3 h-3" />
          </div>
        </div>
      );
    case "multiselect":
      return (
        <div className="pointer-events-none">
          <label className="block text-xs font-medium text-gray-600 mb-1">
            {field.label}{field.isRequired && <span className="text-red-400 ml-0.5">*</span>}
          </label>
          <div className="space-y-1">
            {(field.options ?? []).slice(0, 2).map(o => (
              <div key={o.value} className="flex items-center gap-2">
                <div className="w-3.5 h-3.5 border border-gray-400 rounded bg-white shrink-0" />
                <span className="text-xs text-gray-600">{o.label}</span>
              </div>
            ))}
            {(field.options ?? []).length === 0 && <span className="text-xs text-gray-400 italic">No options</span>}
          </div>
        </div>
      );
    case "date": case "datetime":
      return (
        <div className="pointer-events-none">
          <label className="block text-xs font-medium text-gray-600 mb-1">
            {field.label}{field.isRequired && <span className="text-red-400 ml-0.5">*</span>}
          </label>
          <div className="flex items-center justify-between px-2.5 py-1.5 border border-gray-300 rounded-md bg-gray-50 text-xs text-gray-400">
            <span>dd/mm/yyyy</span><Calendar className="w-3 h-3" />
          </div>
        </div>
      );
    case "rating":
      return (
        <div className="pointer-events-none">
          <label className="block text-xs font-medium text-gray-600 mb-1">{field.label}</label>
          <div className="flex gap-1">{[1,2,3,4,5].map(i => <Star key={i} className="w-4 h-4 text-gray-300" />)}</div>
        </div>
      );
    case "upload":
      return (
        <div className="pointer-events-none">
          <label className="block text-xs font-medium text-gray-600 mb-1">{field.label}</label>
          <div className="h-10 border-2 border-dashed border-gray-300 rounded-lg bg-gray-50 flex items-center justify-center">
            <span className="text-xs text-gray-400 flex items-center gap-1.5"><Upload className="w-3.5 h-3.5" />Click to upload</span>
          </div>
        </div>
      );
    case "table":
      return (
        <div className="pointer-events-none">
          <label className="block text-xs font-medium text-gray-600 mb-1">{field.label}</label>
          <div className="border border-gray-300 rounded-md overflow-hidden">
            <div className="bg-gray-100 grid grid-cols-3 divide-x divide-gray-300">
              {["Col A","Col B","Col C"].map(c => <div key={c} className="px-2 py-1 text-xs text-gray-500 font-medium">{c}</div>)}
            </div>
            <div className="bg-white grid grid-cols-3 divide-x divide-gray-200">
              {[0,1,2].map(i => <div key={i} className="px-2 py-1 text-xs text-gray-400">—</div>)}
            </div>
          </div>
        </div>
      );
    case "formula":
      return (
        <div className="pointer-events-none">
          <label className="block text-xs font-medium text-gray-600 mb-1">{field.label}</label>
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 border border-amber-200 rounded-md bg-amber-50">
            <Sparkles className="w-3 h-3 text-amber-500" /><span className="text-xs text-amber-600 font-mono">Computed</span>
          </div>
        </div>
      );
    case "lookup":
      return (
        <div className="pointer-events-none">
          <label className="block text-xs font-medium text-gray-600 mb-1">
            {field.label}{field.isRequired && <span className="text-red-400 ml-0.5">*</span>}
          </label>
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 border border-gray-300 rounded-md bg-gray-50 text-xs text-gray-400">
            <Link2 className="w-3 h-3" /><span>Search records...</span>
          </div>
        </div>
      );
    default:
      return (
        <div className="pointer-events-none">
          <label className="block text-xs font-medium text-gray-600 mb-1">
            {field.label}{field.isRequired && <span className="text-red-400 ml-0.5">*</span>}
          </label>
          <div className={INPUT_CLS}>{field.placeholder || "Enter value..."}</div>
        </div>
      );
  }
}

// ── ResizeHandle ──────────────────────────────────────────────────────────────

function ResizeHandle({ sectionId, onResize }: { sectionId: string; onResize: (id: string, h: number) => void }) {
  const ref = useRef<{ startY: number; startH: number; latest: number } | null>(null);

  const onMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const el = document.getElementById(`canvas-section-${sectionId}`);
    const startH = el?.getBoundingClientRect().height ?? 120;
    ref.current = { startY: e.clientY, startH, latest: startH };

    const onMove = (ev: MouseEvent) => {
      if (!ref.current) return;
      const newH = Math.max(80, ref.current.startH + ev.clientY - ref.current.startY);
      ref.current.latest = newH;
      onResize(sectionId, newH);
    };
    const onUp = () => {
      if (ref.current) {
        try { localStorage.setItem(`pb_sh_${sectionId}`, String(ref.current.latest)); } catch {}
      }
      ref.current = null;
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  };

  return (
    <div
      onMouseDown={onMouseDown}
      className="h-3 flex items-center justify-center cursor-ns-resize group hover:bg-indigo-50 transition-colors rounded-b-xl"
    >
      <div className="w-12 h-1 rounded-full bg-gray-200 group-hover:bg-indigo-400 transition-colors" />
    </div>
  );
}

// ── Empty drop zone ───────────────────────────────────────────────────────────

const EMPTY_PREFIX = "__empty__";

function EmptyColumnDrop({ id }: { id: string }) {
  const { setNodeRef, isOver } = useSortable({ id });
  return (
    <div
      ref={setNodeRef}
      className={`flex flex-col items-center justify-center py-6 border-2 border-dashed rounded-lg transition-colors ${
        isOver ? "border-indigo-400 bg-indigo-50/50" : "border-gray-200 bg-gray-50/30"
      }`}
    >
      <Plus className="w-4 h-4 text-gray-300 mb-1" />
      <p className="text-xs text-gray-400">Drop here</p>
    </div>
  );
}

// ── FieldCard (Design mode) ───────────────────────────────────────────────────

function FieldCard({
  field, isSelected, onSelect, onDelete, isDragOverlay,
}: {
  field: CanvasField;
  isSelected: boolean;
  onSelect: () => void;
  onDelete: () => void;
  isDragOverlay?: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: field.id, disabled: isDragOverlay });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.35 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={isDragOverlay ? {} : style}
      onClick={onSelect}
      className={`group relative bg-white rounded-lg border-2 transition-all cursor-pointer ${
        isSelected
          ? "border-indigo-500 shadow-sm shadow-indigo-100"
          : !field.isVisible
          ? "border-dashed border-gray-200 opacity-50"
          : "border-transparent hover:border-gray-300"
      }`}
    >
      {!isDragOverlay && (
        <button
          {...listeners}
          {...attributes}
          onClick={e => e.stopPropagation()}
          className="absolute left-1 top-1/2 -translate-y-1/2 p-1 text-gray-300 hover:text-gray-500 cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity touch-none z-10"
        >
          <GripVertical className="w-3 h-3" />
        </button>
      )}
      {!isDragOverlay && (
        <button
          onClick={e => { e.stopPropagation(); onDelete(); }}
          className="absolute right-1 top-1 p-1 text-gray-300 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity rounded z-10"
        >
          <X className="w-3 h-3" />
        </button>
      )}
      <div className="absolute right-1 bottom-1 z-10 flex flex-col gap-0.5 items-end">
        {field.mappedCrmFieldName && (
          <span className="inline-flex items-center gap-0.5 text-[10px] bg-emerald-100 text-emerald-600 px-1 py-0.5 rounded">
            <Database className="w-2.5 h-2.5" />CRM
          </span>
        )}
        {field.isAdminOnly && (
          <span className="inline-flex items-center gap-0.5 text-[10px] bg-amber-100 text-amber-600 px-1 py-0.5 rounded">
            <Shield className="w-2.5 h-2.5" />Admin
          </span>
        )}
        {!field.isVisible && (
          <span className="inline-flex items-center gap-0.5 text-[10px] bg-gray-100 text-gray-500 px-1 py-0.5 rounded">
            <EyeOff className="w-2.5 h-2.5" />Hidden
          </span>
        )}
      </div>
      <div className="px-5 py-3">
        <ComponentPreview field={field} />
      </div>
    </div>
  );
}

// ── CRM Field Mapper modal ────────────────────────────────────────────────────

function CrmFieldMapper({
  field, onMapped, onClose,
}: {
  field: CanvasField;
  onMapped: (updates: Partial<CanvasField>) => void;
  onClose: () => void;
}) {
  const [modules, setModules] = useState<any[]>([]);
  const [selectedMod, setSelectedMod] = useState<any>(null);
  const [crmFields, setCrmFields] = useState<any[]>([]);
  const [loadingFields, setLoadingFields] = useState(false);
  const [step, setStep] = useState<"module" | "field">("module");
  const [saving, setSaving] = useState(false);
  const [newFieldName, setNewFieldName] = useState("");
  const [createNew, setCreateNew] = useState(false);

  useEffect(() => {
    portalApi.get("/portal/padmin/crm-modules").then(r => setModules(r.data ?? [])).catch(() => {});
  }, []);

  const pickModule = async (mod: any) => {
    setSelectedMod(mod);
    setLoadingFields(true);
    try {
      const r = await portalApi.get(`/portal/padmin/crm-modules/${mod.id}/fields`);
      setCrmFields(r.data ?? []);
    } catch {}
    setLoadingFields(false);
    setStep("field");
  };

  const mapExisting = async (crmField: any) => {
    setSaving(true);
    try {
      await portalApi.patch(`/portal/padmin/fields/${field.id}/map-crm`, {
        crmFieldName: crmField.name,
        crmModuleSlug: selectedMod.slug,
      });
      onMapped({ mappedCrmFieldName: crmField.name, mappedCrmModuleSlug: selectedMod.slug });
      onClose();
    } catch {}
    setSaving(false);
  };

  const createAndMap = async () => {
    if (!newFieldName.trim()) return;
    setSaving(true);
    try {
      await portalApi.post(`/portal/padmin/fields/${field.id}/create-crm-field`, {
        fieldName: newFieldName.trim(),
        moduleSlug: selectedMod?.slug,
        fieldType: field.fieldType,
        label: field.label,
      });
      onMapped({
        mappedCrmFieldName: newFieldName.trim().toLowerCase().replace(/\s+/g, "_"),
        mappedCrmModuleSlug: selectedMod?.slug,
      });
      onClose();
    } catch {}
    setSaving(false);
  };

  const unmap = async () => {
    setSaving(true);
    try {
      await portalApi.patch(`/portal/padmin/fields/${field.id}/unmap-crm`);
      onMapped({ mappedCrmFieldName: undefined, mappedCrmModuleSlug: undefined });
      onClose();
    } catch {}
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b shrink-0">
          <div>
            <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
              <Database className="w-4 h-4 text-emerald-500" />
              {step === "module" ? "Map to CRM Field" : selectedMod?.name}
            </h3>
            <p className="text-xs text-gray-400 mt-0.5">Field: {field.label}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          {field.mappedCrmFieldName && step === "module" && (
            <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-emerald-700">Currently mapped</p>
                <p className="text-xs text-emerald-600 font-mono mt-0.5">{field.mappedCrmModuleSlug}.{field.mappedCrmFieldName}</p>
              </div>
              <button onClick={unmap} disabled={saving}
                className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700 px-2 py-1 rounded-lg hover:bg-red-50">
                {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <X className="w-3 h-3" />}Unmap
              </button>
            </div>
          )}
          {step === "module" && (
            <div className="space-y-1">
              <p className="text-xs font-medium text-gray-500 mb-2">Select a CRM module</p>
              {modules.length === 0
                ? <p className="text-sm text-gray-400 text-center py-6">No CRM modules found</p>
                : modules.map(mod => (
                  <button key={mod.id} onClick={() => pickModule(mod)}
                    className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-indigo-50 border border-transparent hover:border-indigo-200 transition-all text-left">
                    <span className="shrink-0"><ModuleIcon icon={mod.icon} slug={mod.slug} className="w-5 h-5" /></span>
                    <div>
                      <p className="text-sm font-medium text-gray-800">{mod.name}</p>
                      <p className="text-xs text-gray-400 font-mono">{mod.slug}</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-300 ml-auto" />
                  </button>
                ))
              }
            </div>
          )}
          {step === "field" && (
            <div className="space-y-3">
              {loadingFields
                ? <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-indigo-400" /></div>
                : (
                  <>
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs font-medium text-gray-500">Select existing field</p>
                      <button onClick={() => setCreateNew(v => !v)} className="text-xs text-indigo-500 hover:underline">
                        {createNew ? "← Back to list" : "Create new field"}
                      </button>
                    </div>
                    {createNew ? (
                      <div className="space-y-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1.5">New CRM field name</label>
                          <input value={newFieldName} onChange={e => setNewFieldName(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            placeholder="e.g. contact_name" />
                        </div>
                        <button onClick={createAndMap} disabled={saving || !newFieldName.trim()}
                          className="w-full flex items-center justify-center gap-2 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-medium rounded-lg">
                          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}Create &amp; Map
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-1 max-h-48 overflow-y-auto">
                        {crmFields.map(f => (
                          <button key={f.id} onClick={() => mapExisting(f)} disabled={saving}
                            className="w-full flex items-center justify-between p-2.5 rounded-lg hover:bg-indigo-50 border border-transparent hover:border-indigo-200 text-left transition-all">
                            <div>
                              <p className="text-sm font-medium text-gray-800">{f.label}</p>
                              <p className="text-xs text-gray-400 font-mono">{f.name}</p>
                            </div>
                            <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded shrink-0 ml-2">{f.type}</span>
                          </button>
                        ))}
                        {crmFields.length === 0 && <p className="text-xs text-gray-400 text-center py-4">No fields in this module</p>}
                      </div>
                    )}
                  </>
                )
              }
            </div>
          )}
        </div>
        {step === "field" && (
          <div className="px-5 pb-4 pt-3 border-t shrink-0">
            <button onClick={() => setStep("module")} className="text-sm text-gray-500 hover:text-gray-700">← Back to modules</button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── CRM Section Modal ─────────────────────────────────────────────────────────

function CrmSectionModal({ pageId, onCreated, onClose }: {
  pageId: string;
  onCreated: (s: CanvasSection) => void;
  onClose: () => void;
}) {
  const [modules, setModules] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const [fields, setFields] = useState<any[]>([]);
  const [selectedFields, setSelectedFields] = useState<string[]>([]);
  const [label, setLabel] = useState("");
  const [loadingFields, setLoadingFields] = useState(false);
  const [saving, setSaving] = useState(false);
  const [step, setStep] = useState<"module" | "fields">("module");

  useEffect(() => {
    portalApi.get("/portal/padmin/crm-modules").then(r => setModules(r.data ?? [])).catch(() => {});
  }, []);

  const pickModule = async (mod: any) => {
    setSelected(mod); setLabel(mod.name); setLoadingFields(true);
    try {
      const r = await portalApi.get(`/portal/padmin/crm-modules/${mod.id}/fields`);
      setFields(r.data ?? []);
      setSelectedFields((r.data ?? []).slice(0, 8).map((f: any) => f.id));
    } catch {}
    setLoadingFields(false); setStep("fields");
  };

  const handleCreate = async () => {
    if (!selected || !label.trim()) return;
    setSaving(true);
    try {
      const res = await portalApi.post(`/portal/padmin/pages/${pageId}/sections/from-module`, {
        label: label.trim(), moduleSlug: selected.slug, moduleId: selected.id,
        fieldIds: selectedFields, sectionType: "primary",
      });
      const raw = res.data;
      const section: CanvasSection = {
        ...raw,
        sectionColumns: 1,
        columnRatio: "equal",
        isVisible: raw.isVisible ?? true,
        fields: (raw.fields ?? []).map((f: any) => ({
          ...f, options: f.options ?? [],
          isAdminOnly: f.isAdminOnly ?? false,
          isVisible: f.isVisible ?? true,
        })),
      };
      onCreated(section);
      onClose();
    } catch {}
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b shrink-0">
          <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
            <Database className="w-4 h-4 text-indigo-500" />
            {step === "module" ? "Select CRM Module" : `${selected?.name} — Select Fields`}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {step === "module" && (
            <div className="p-4 space-y-1">
              {modules.length === 0
                ? <p className="text-sm text-gray-400 text-center py-6">No CRM modules found</p>
                : modules.map(mod => (
                  <button key={mod.id} onClick={() => pickModule(mod)}
                    className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-indigo-50 border border-transparent hover:border-indigo-200 transition-all text-left">
                    <span className="shrink-0"><ModuleIcon icon={mod.icon} slug={mod.slug} className="w-5 h-5" /></span>
                    <div>
                      <p className="text-sm font-medium text-gray-800">{mod.name}</p>
                      <p className="text-xs text-gray-400 font-mono">{mod.slug}</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-300 ml-auto" />
                  </button>
                ))
              }
            </div>
          )}
          {step === "fields" && (
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Section Label</label>
                <input value={label} onChange={e => setLabel(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              {loadingFields
                ? <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-indigo-400" /></div>
                : (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-xs font-medium text-gray-600">Fields to show</label>
                      <div className="flex gap-2">
                        <button onClick={() => setSelectedFields(fields.map(f => f.id))} className="text-xs text-indigo-500">All</button>
                        <button onClick={() => setSelectedFields([])} className="text-xs text-gray-400">None</button>
                      </div>
                    </div>
                    <div className="space-y-1 max-h-48 overflow-y-auto">
                      {fields.map(f => (
                        <label key={f.id} className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-gray-50 cursor-pointer">
                          <input type="checkbox" checked={selectedFields.includes(f.id)}
                            onChange={() => setSelectedFields(prev => prev.includes(f.id) ? prev.filter(x => x !== f.id) : [...prev, f.id])}
                            className="rounded accent-indigo-500" />
                          <span className="text-sm text-gray-700 flex-1">{f.label}</span>
                          <span className="text-xs text-gray-400 font-mono">{f.type?.toLowerCase()}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )
              }
            </div>
          )}
        </div>
        {step === "fields" && (
          <div className="px-6 pb-5 pt-3 border-t flex gap-2 shrink-0">
            <button onClick={handleCreate} disabled={saving || !label.trim() || selectedFields.length === 0}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-medium rounded-lg">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}Add Section
            </button>
            <button onClick={() => setStep("module")} className="px-3 py-2 text-gray-500 text-sm rounded-lg hover:text-gray-700">← Back</button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── SectionBlock ──────────────────────────────────────────────────────────────

interface SectionBlockProps {
  section: CanvasSection;
  mode: BuilderMode;
  selectedFieldId: string | null;
  selectedSectionId: string | null;
  sectionHeight?: number;
  onSelectSection: (id: string) => void;
  onSelectField: (sectionId: string, fieldId: string) => void;
  onDeleteSection: (id: string) => void;
  onDeleteField: (sectionId: string, fieldId: string) => void;
  onDuplicateSection: (id: string) => void;
  onChangeColumns: (id: string, cols: number, ratio: string) => void;
  onResize: (id: string, h: number) => void;
  dragListeners?: any;
  dragAttributes?: any;
  isDraggingSection?: boolean;
}

function SectionBlock({
  section, mode, selectedFieldId, selectedSectionId, sectionHeight,
  onSelectSection, onSelectField, onDeleteSection, onDeleteField,
  onDuplicateSection, onChangeColumns, onResize,
  dragListeners, dragAttributes, isDraggingSection,
}: SectionBlockProps) {
  const [editingLabel, setEditingLabel] = useState(false);
  const [labelVal, setLabelVal] = useState(section.label);
  const [showColPicker, setShowColPicker] = useState(false);
  const labelInputRef = useRef<HTMLInputElement>(null);
  const isCrm = !!section.crmModuleSlug;
  const isSelected = selectedSectionId === section.id;
  const sectionCols = section.sectionColumns;
  const ratio = section.columnRatio;

  useEffect(() => { setLabelVal(section.label); }, [section.label]);

  const commitLabel = () => {
    setEditingLabel(false);
    if (labelVal.trim() && labelVal !== section.label) {
      portalApi.patch(`/portal/padmin/sections/${section.id}`, { label: labelVal.trim() }).catch(() => {});
    }
  };

  const colFields = useMemo(() =>
    Array.from({ length: sectionCols }, (_, colIdx) =>
      section.fields
        .filter(f => Math.min(colSlotOf(f.order), sectionCols - 1) === colIdx)
        .sort((a, b) => (a.order % 100) - (b.order % 100))
    ),
    [section.fields, sectionCols]
  );

  const colItems = useMemo(() =>
    colFields.map((flds, colIdx) => {
      const emptyId = `${EMPTY_PREFIX}${section.id}_col_${colIdx}`;
      return flds.length > 0 ? flds.map(f => f.id) : [emptyId];
    }),
    [colFields, section.id]
  );

  const isPreview = mode === "preview";

  return (
    <div
      id={`canvas-section-${section.id}`}
      style={sectionHeight ? { minHeight: sectionHeight } : undefined}
      className={`group relative rounded-xl border-2 overflow-visible transition-all duration-150 ${
        isDraggingSection
          ? "opacity-40 border-indigo-400 shadow-2xl scale-[0.98] rotate-[0.5deg]"
          : isCrm
          ? "border-emerald-200 bg-emerald-50/20 hover:border-emerald-300 hover:shadow-sm"
          : isSelected
          ? "border-indigo-400 shadow-md shadow-indigo-100/80 bg-white"
          : "border-gray-200 bg-white hover:border-indigo-200 hover:shadow-sm"
      }`}
    >
      {/* ── Header strip ── */}
      {!isPreview && (
        <div
          onClick={() => onSelectSection(section.id)}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 border-b cursor-pointer select-none transition-colors relative rounded-t-[10px] ${
            isCrm
              ? "bg-emerald-50/60 border-emerald-100 hover:bg-emerald-50"
              : isSelected
              ? "bg-indigo-50/80 border-indigo-100"
              : "bg-gray-50/60 border-gray-100 hover:bg-gray-50"
          }`}
        >
          {/* Drag handle */}
          <button
            {...dragListeners}
            {...dragAttributes}
            onClick={e => e.stopPropagation()}
            title="Drag to reorder"
            className="p-0.5 cursor-grab active:cursor-grabbing touch-none text-gray-300 hover:text-gray-500 shrink-0 transition-colors"
          >
            <GripVertical className="w-3.5 h-3.5" />
          </button>

          {isCrm && <Database className="w-3 h-3 text-emerald-500 shrink-0" />}

          {/* Editable label */}
          {editingLabel ? (
            <input
              ref={labelInputRef}
              value={labelVal}
              onChange={e => setLabelVal(e.target.value)}
              onBlur={commitLabel}
              onKeyDown={e => { if (e.key === "Enter") commitLabel(); if (e.key === "Escape") { setLabelVal(section.label); setEditingLabel(false); } }}
              onClick={e => e.stopPropagation()}
              className="flex-1 text-xs font-semibold bg-white border border-indigo-300 rounded px-1.5 py-0.5 focus:outline-none min-w-0"
              autoFocus
            />
          ) : (
            <span
              className={`flex-1 text-xs font-semibold truncate min-w-0 ${
                isCrm ? "text-emerald-700" : isSelected ? "text-indigo-700" : "text-gray-500"
              }`}
              onDoubleClick={e => { e.stopPropagation(); setEditingLabel(true); setTimeout(() => labelInputRef.current?.select(), 50); }}
              title="Double-click to rename"
            >
              {section.label}
            </span>
          )}

          {/* Badges */}
          {sectionCols > 1 && (
            <span className="text-[9px] font-bold bg-indigo-100 text-indigo-600 px-1.5 py-0.5 rounded-full shrink-0">
              {sectionCols}col
            </span>
          )}
          {isCrm && (
            <span className="text-[9px] font-mono text-emerald-600 bg-emerald-100 px-1.5 py-0.5 rounded-full shrink-0 hidden xl:inline">
              {section.crmModuleSlug}
            </span>
          )}

          {/* Hover-reveal actions */}
          <div
            className="flex items-center gap-0.5 ml-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
            onClick={e => e.stopPropagation()}
          >
            <button title="Column layout" onClick={() => setShowColPicker(v => !v)}
              className={`p-1 rounded transition-colors ${showColPicker ? "text-indigo-500 bg-indigo-50" : "text-gray-400 hover:text-indigo-500 hover:bg-indigo-50"}`}>
              <ArrowLeftRight className="w-3 h-3" />
            </button>
            <button title="Settings" onClick={() => onSelectSection(section.id)}
              className="p-1 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors">
              <Settings className="w-3 h-3" />
            </button>
            <button title="Duplicate section" onClick={() => onDuplicateSection(section.id)}
              className="p-1 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors">
              <Copy className="w-3 h-3" />
            </button>
            <button title="Delete section" onClick={() => onDeleteSection(section.id)}
              className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors">
              <Trash2 className="w-3 h-3" />
            </button>
          </div>

          {/* Column picker dropdown */}
          {showColPicker && (
            <div className="absolute top-full left-0 mt-1.5 bg-white border border-gray-200 rounded-xl shadow-2xl z-30 p-3 w-64">
              <p className="text-xs font-bold text-gray-700 mb-2.5">Section Columns</p>
              <div className="grid grid-cols-4 gap-1.5 mb-3">
                {[1, 2, 3, 4].map(n => (
                  <button key={n}
                    onClick={() => { onChangeColumns(section.id, n, "equal"); if (n === 1) setShowColPicker(false); }}
                    className={`py-2.5 rounded-lg text-xs font-bold transition-all ${
                      sectionCols === n
                        ? "bg-indigo-600 text-white shadow-sm shadow-indigo-200"
                        : "bg-gray-100 hover:bg-indigo-50 hover:text-indigo-600 text-gray-600"
                    }`}>{n}</button>
                ))}
              </div>
              {sectionCols > 1 && RATIO_PRESETS[sectionCols] && (
                <>
                  <p className="text-xs font-bold text-gray-700 mb-1.5">Column Ratio</p>
                  <div className="space-y-0.5">
                    {RATIO_PRESETS[sectionCols].map(r => (
                      <button key={r.id} onClick={() => { onChangeColumns(section.id, sectionCols, r.id); setShowColPicker(false); }}
                        className={`w-full text-left px-2.5 py-2 rounded-lg text-xs font-medium transition-colors ${
                          ratio === r.id
                            ? "bg-indigo-100 text-indigo-700"
                            : "hover:bg-gray-100 text-gray-600"
                        }`}>{r.label}</button>
                    ))}
                  </div>
                </>
              )}
              <button onClick={() => setShowColPicker(false)}
                className="w-full mt-2 py-1.5 text-xs text-gray-400 hover:text-gray-600 border-t border-gray-100 transition-colors">
                Close
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Body ── */}
      <div className={isPreview ? "p-4" : "p-3"}>
        {/* Layout mode: wireframe */}
        {mode === "layout" && (
          <div style={sectionCols > 1 ? gridStyle(sectionCols, ratio) : undefined} className="gap-2">
            {Array.from({ length: sectionCols }, (_, ci) => (
              <div key={ci} className="border-2 border-dashed border-gray-200 rounded-lg p-3 min-h-[64px] flex flex-col gap-1 bg-gray-50/50 transition-colors group-hover:border-gray-300">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Col {ci + 1}</p>
                <p className="text-xs text-gray-400">
                  {colFields[ci]?.length ?? 0} field{colFields[ci]?.length !== 1 ? "s" : ""}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* Design mode: actual field cards */}
        {mode === "design" && (
          <div style={sectionCols > 1 ? gridStyle(sectionCols, ratio) : undefined}
            className={sectionCols > 1 ? "gap-3" : undefined}>
            {Array.from({ length: sectionCols }, (_, colIdx) => {
              const containerId = `${section.id}_col_${colIdx}`;
              const flds = colFields[colIdx] ?? [];
              const emptyId = `${EMPTY_PREFIX}${containerId}`;
              return (
                <div key={colIdx} className={sectionCols > 1 ? "min-w-0" : undefined}>
                  {sectionCols > 1 && (
                    <div className="flex items-center gap-1.5 mb-2">
                      <div className="flex-1 h-px bg-gray-100" />
                      <span className="text-[10px] font-semibold text-gray-400">Col {colIdx + 1}</span>
                      <div className="flex-1 h-px bg-gray-100" />
                    </div>
                  )}
                  <SortableContext
                    id={containerId}
                    items={colItems[colIdx]}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="space-y-2 min-h-[52px]">
                      {flds.length > 0
                        ? flds.map(field => (
                          <FieldCard
                            key={field.id}
                            field={field}
                            isSelected={selectedFieldId === field.id}
                            onSelect={() => onSelectField(section.id, field.id)}
                            onDelete={() => onDeleteField(section.id, field.id)}
                          />
                        ))
                        : <EmptyColumnDrop id={emptyId} />
                      }
                    </div>
                  </SortableContext>
                </div>
              );
            })}
          </div>
        )}

        {/* Preview mode */}
        {mode === "preview" && (
          <div style={sectionCols > 1 ? gridStyle(sectionCols, ratio) : undefined}
            className={sectionCols > 1 ? "gap-4" : "space-y-4"}>
            {Array.from({ length: sectionCols }, (_, colIdx) => (
              <div key={colIdx} className="space-y-4">
                {(colFields[colIdx] ?? []).map(field => (
                  <div key={field.id}>
                    <ComponentPreview field={field} />
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Resize handle ── */}
      {mode !== "preview" && (
        <ResizeHandle sectionId={section.id} onResize={onResize} />
      )}

      {/* Click-away for col picker */}
      {showColPicker && (
        <div className="fixed inset-0 z-20" onClick={() => setShowColPicker(false)} />
      )}
    </div>
  );
}

// ── FieldPaletteItem ──────────────────────────────────────────────────────────

function FieldPaletteItem({
  type: _type, label, icon: Icon, desc, accent, active, disabled, onClick,
}: {
  type: string; label: string; icon: any; desc?: string; accent: string;
  active?: boolean; disabled?: boolean; onClick: () => void;
}) {
  const ac = ACCENT_CLASSES[accent] ?? ACCENT_CLASSES.gray;
  return (
    <button onClick={onClick} disabled={disabled} title={desc}
      className={`group w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left transition-all
        ${disabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer hover:bg-indigo-50"}
        ${active ? "bg-indigo-50 ring-1 ring-indigo-300" : ""}`}>
      <div className={`w-6 h-6 rounded-md flex items-center justify-center shrink-0 ring-1 ${ac.bg} ${ac.text} ${ac.ring}`}>
        <Icon className="w-3 h-3" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-gray-700 truncate leading-tight">{label}</p>
        {desc && <p className="text-[10px] text-gray-400 truncate leading-tight hidden group-hover:block">{desc}</p>}
      </div>
      <Plus className="w-3 h-3 text-gray-300 group-hover:text-indigo-500 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
    </button>
  );
}

// ── Left Panel ────────────────────────────────────────────────────────────────

function LeftPanel({
  mode, selectedSectionId, recentTypes,
  templateColumns, sectionGap, onAddSection, onAddCrmSection, onAddField,
  onChangeTemplateColumns, onChangeSectionGap,
}: {
  mode: BuilderMode;
  selectedSectionId: string | null;
  recentTypes: string[];
  templateColumns: number;
  sectionGap: number;
  onAddSection: (preset?: string, targetColumn?: number) => void;
  onAddCrmSection: () => void;
  onAddField: (type: string) => void;
  onChangeTemplateColumns: (n: number) => void;
  onChangeSectionGap: (v: number) => void;
}) {
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(new Set(["basic"]));
  const toggle = (id: string) =>
    setExpanded(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });

  const query = search.trim().toLowerCase();
  const searchResults = query
    ? COMP_FLAT.filter(c => c.label.toLowerCase().includes(query) || c.desc?.toLowerCase().includes(query))
    : null;

  const recentItems = recentTypes.map(t => COMP_FLAT.find(c => c.type === t)).filter(Boolean) as typeof COMP_FLAT;

  const getAccent = (type: string) =>
    COMPONENT_GROUPS.find(g => g.items.some(i => i.type === type))?.accent ?? "gray";

  if (mode === "layout") {
    return (
      <div className="flex flex-col h-full">
        <div className="px-3 pt-3 pb-2 border-b border-gray-200 shrink-0">
          <p className="text-xs font-semibold text-gray-700">Structure</p>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {/* Add section buttons */}
          <button onClick={() => onAddSection()}
            className="w-full flex items-center gap-2 px-3 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg transition-colors">
            <Plus className="w-3.5 h-3.5" />Add Section
          </button>
          <button onClick={onAddCrmSection}
            className="w-full flex items-center gap-2 px-3 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg transition-colors">
            <Database className="w-3.5 h-3.5" />From CRM
          </button>

          {/* Quickpicks */}
          <div className="pt-2 pb-1">
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider px-1 mb-1.5">Quick Add</p>
            <div className="space-y-1">
              {[
                { label: "Blank Section", preset: "blank", icon: LayoutGrid },
                { label: "Two-Column", preset: "2col", icon: ArrowLeftRight },
                { label: "Three-Column", preset: "3col", icon: ArrowLeftRight },
                { label: "Header Block", preset: "header", icon: Heading1 },
              ].map(({ label, preset, icon: Icon }) => (
                <button key={preset} onClick={() => onAddSection(preset)}
                  className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs text-gray-600 hover:bg-gray-100 hover:text-gray-800 transition-colors text-left">
                  <Icon className="w-3.5 h-3.5 text-gray-400 shrink-0" />{label}
                </button>
              ))}
            </div>
          </div>

          <div className="border-t border-gray-200 pt-3 mt-1">
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider px-1 mb-2">Page Columns</p>
            <div className="grid grid-cols-3 gap-1.5">
              {[1, 2, 3].map(n => (
                <button key={n} onClick={() => onChangeTemplateColumns(n)}
                  className={`py-2 rounded-lg text-xs font-semibold transition-colors ${
                    templateColumns === n ? "bg-indigo-600 text-white" : "bg-gray-100 hover:bg-indigo-50 text-gray-600"
                  }`}>{n} col</button>
              ))}
            </div>
          </div>

          <div className="border-t border-gray-200 pt-3 mt-1">
            <div className="flex items-center gap-1.5 px-1 mb-2">
              <SlidersHorizontal className="w-3 h-3 text-gray-400" />
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Spacing</p>
            </div>
            <div className="space-y-2 px-1">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[10px] text-gray-500 font-medium">Section Gap</label>
                  <span className="text-[10px] font-mono text-indigo-500">{sectionGap * 4}px</span>
                </div>
                <input
                  type="range" min={1} max={12} step={1} value={sectionGap}
                  onChange={e => onChangeSectionGap(Number(e.target.value))}
                  className="w-full h-1.5 rounded-full accent-indigo-600 cursor-pointer"
                />
                <div className="flex justify-between mt-0.5">
                  <span className="text-[9px] text-gray-400">Compact</span>
                  <span className="text-[9px] text-gray-400">Spacious</span>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-1">
                {[{ v: 2, l: "Tight" }, { v: 4, l: "Normal" }, { v: 8, l: "Wide" }].map(({ v, l }) => (
                  <button key={v} onClick={() => onChangeSectionGap(v)}
                    className={`py-1.5 rounded text-[10px] font-semibold transition-colors ${
                      sectionGap === v ? "bg-indigo-600 text-white" : "bg-gray-100 hover:bg-indigo-50 text-gray-500"
                    }`}>{l}</button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (mode === "design") {
    return (
      <div className="flex flex-col h-full">
        <div className="px-3 pt-3 pb-2 border-b border-gray-200 shrink-0">
          <p className="text-xs font-semibold text-gray-700 mb-1.5">Components</p>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 pointer-events-none" />
            <input type="text" placeholder="Search fields..." value={search} onChange={e => setSearch(e.target.value)}
              className="w-full pl-7 pr-2.5 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-400 placeholder:text-gray-400" />
          </div>
          {selectedSectionId
            ? <p className="text-[10px] text-indigo-500 mt-1.5">Click to add to selected section</p>
            : <p className="text-[10px] text-gray-400 mt-1.5">Select a section first</p>
          }
        </div>
        <div className="flex-1 overflow-y-auto">
          {searchResults ? (
            <div className="px-2 py-2">
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider px-1 mb-1">
                {searchResults.length} result{searchResults.length !== 1 ? "s" : ""}
              </p>
              {searchResults.length === 0
                ? <p className="text-xs text-gray-400 px-2 py-3 text-center">No fields match</p>
                : <div className="space-y-0.5">{searchResults.map(item => (
                  <FieldPaletteItem key={item.type} {...item} accent={getAccent(item.type)}
                    disabled={!selectedSectionId} onClick={() => onAddField(item.type)} />
                ))}</div>
              }
            </div>
          ) : (
            <>
              {recentItems.length > 0 && (
                <div className="px-2 py-2 border-b border-gray-100">
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider px-1 mb-1">Recently Used</p>
                  <div className="space-y-0.5">{recentItems.map(item => (
                    <FieldPaletteItem key={item.type} {...item} accent={getAccent(item.type)}
                      disabled={!selectedSectionId} onClick={() => onAddField(item.type)} />
                  ))}</div>
                </div>
              )}
              {COMPONENT_GROUPS.map(group => (
                <div key={group.id} className="border-b border-gray-100 last:border-0">
                  <button onClick={() => toggle(group.id)}
                    className="w-full flex items-center justify-between px-3 py-2 hover:bg-gray-50 transition-colors">
                    <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">{group.label}</p>
                    <ChevronRight className={`w-3 h-3 text-gray-400 transition-transform duration-150 ${expanded.has(group.id) ? "rotate-90" : ""}`} />
                  </button>
                  {expanded.has(group.id) && (
                    <div className="px-2 pb-2 space-y-0.5">
                      {group.items.map(item => (
                        <FieldPaletteItem key={item.type} {...item} accent={group.accent}
                          disabled={!selectedSectionId} onClick={() => onAddField(item.type)} />
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </>
          )}
        </div>
      </div>
    );
  }

  return null;
}

// ── Properties Panel ──────────────────────────────────────────────────────────

function PropertiesPanel({
  section, field, onUpdateSection, onUpdateField, onClose,
}: {
  section: CanvasSection | null;
  field: CanvasField | null;
  onUpdateSection: (id: string, updates: Partial<CanvasSection>) => void;
  onUpdateField: (id: string, updates: Partial<CanvasField>) => void;
  onClose: () => void;
}) {
  const [fieldForm, setFieldForm] = useState<any>(null);
  const [sectionForm, setSectionForm] = useState<any>(null);
  const [optionsText, setOptionsText] = useState("");
  const [showCrmMapper, setShowCrmMapper] = useState(false);

  useEffect(() => {
    if (field) {
      setFieldForm({
        label: field.label,
        placeholder: field.placeholder ?? "",
        helpText: field.helpText ?? "",
        isRequired: field.isRequired,
        isEditable: field.isEditable,
        isReadOnly: field.isReadOnly,
        isVisible: field.isVisible,
        isAdminOnly: field.isAdminOnly,
        colSlot: Math.min(colSlotOf(field.order), (section?.sectionColumns ?? 1) - 1),
      });
      setOptionsText((field.options ?? []).map(o => `${o.label}:${o.value}`).join("\n"));
    } else {
      setFieldForm(null);
    }
  }, [field?.id]);

  useEffect(() => {
    if (section && !field) {
      setSectionForm({
        label: section.label,
        isCollapsible: section.isCollapsible,
        isVisible: section.isVisible,
        columnIndex: section.columnIndex,
      });
    } else {
      setSectionForm(null);
    }
  }, [section?.id, field?.id]);

  const saveField = () => {
    if (!field || !fieldForm) return;
    const updates: any = {
      label: fieldForm.label,
      placeholder: fieldForm.placeholder,
      helpText: fieldForm.helpText,
    };
    if (["dropdown", "multiselect"].includes(field.fieldType)) {
      updates.options = optionsText.split("\n").map(l => l.trim()).filter(Boolean).map(l => {
        const [lbl, val] = l.includes(":") ? l.split(":") : [l, l];
        return { label: lbl.trim(), value: (val ?? lbl).trim() };
      });
    }
    const newColSlot = fieldForm.colSlot ?? 0;
    const posInCol = field.order % 100;
    if (Math.min(colSlotOf(field.order), (section?.sectionColumns ?? 1) - 1) !== newColSlot) {
      updates.order = encodeOrder(newColSlot, posInCol);
    }
    onUpdateField(field.id, updates);
  };

  const saveSection = () => {
    if (!section || !sectionForm) return;
    onUpdateSection(section.id, sectionForm);
  };

  const LBL = "block text-xs text-gray-500 mb-1 font-medium";
  const INPUT = "w-full px-2.5 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-400";

  if (!section && !field) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-4 text-center gap-2">
        <Settings className="w-8 h-8 text-gray-200" />
        <p className="text-xs text-gray-400">Select a section or field to configure</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-3 py-3 border-b border-gray-200 shrink-0">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
          {field ? "Field" : "Section"}
        </p>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg leading-none">×</button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {/* ── Field properties ── */}
        {field && fieldForm && (
          <>
            {/* Type badge */}
            <div className="flex items-center gap-2 px-2.5 py-2 bg-gray-50 rounded-lg">
              {(() => {
                const comp = COMP_FLAT.find(c => c.type === field.fieldType);
                const Icon = comp?.icon ?? Type;
                return <Icon className="w-4 h-4 text-indigo-500 shrink-0" />;
              })()}
              <span className="text-xs font-medium text-gray-700">
                {COMP_FLAT.find(c => c.type === field.fieldType)?.label ?? field.fieldType}
              </span>
              <span className="ml-auto text-[10px] text-gray-400 font-mono truncate">{field.fieldKey}</span>
            </div>

            {/* CRM mapping */}
            <div className="rounded-lg border border-gray-200 overflow-hidden">
              <div className="flex items-center justify-between px-2.5 py-2 bg-gray-50">
                <div className="flex items-center gap-1.5">
                  <Database className="w-3.5 h-3.5 text-gray-400" />
                  <span className="text-xs font-semibold text-gray-500">CRM Binding</span>
                </div>
                <button onClick={() => setShowCrmMapper(true)}
                  className="text-xs text-indigo-500 hover:text-indigo-700 font-medium">
                  {field.mappedCrmFieldName ? "Change" : "Map"}
                </button>
              </div>
              {field.mappedCrmFieldName ? (
                <div className="px-2.5 py-2 bg-emerald-50">
                  <p className="text-xs text-emerald-700 font-mono">{field.mappedCrmModuleSlug}.{field.mappedCrmFieldName}</p>
                  <p className="text-[10px] text-emerald-600 mt-0.5">Two-way sync enabled</p>
                </div>
              ) : (
                <div className="px-2.5 py-2">
                  <p className="text-xs text-gray-400 italic">Not mapped</p>
                </div>
              )}
            </div>

            <div>
              <label className={LBL}>Label</label>
              <input value={fieldForm.label} onChange={e => setFieldForm((f: any) => ({ ...f, label: e.target.value }))} className={INPUT} />
            </div>

            {!["header","label","separator","spacer","formula","table","boolean"].includes(field.fieldType) && (
              <div>
                <label className={LBL}>Placeholder</label>
                <input value={fieldForm.placeholder} onChange={e => setFieldForm((f: any) => ({ ...f, placeholder: e.target.value }))} className={INPUT} placeholder="Optional" />
              </div>
            )}

            <div>
              <label className={LBL}>Help Text</label>
              <input value={fieldForm.helpText} onChange={e => setFieldForm((f: any) => ({ ...f, helpText: e.target.value }))} className={INPUT} placeholder="Optional hint" />
            </div>

            {["dropdown", "multiselect"].includes(field.fieldType) && (
              <div>
                <label className={LBL}>Options (Label:value per line)</label>
                <textarea value={optionsText} onChange={e => setOptionsText(e.target.value)}
                  rows={4} placeholder={"Option A:a\nOption B:b"}
                  className={INPUT + " font-mono text-xs resize-none"} />
              </div>
            )}

            {(section?.sectionColumns ?? 1) > 1 && (
              <div>
                <label className={LBL}>Column placement</label>
                <select value={fieldForm.colSlot} onChange={e => setFieldForm((f: any) => ({ ...f, colSlot: parseInt(e.target.value) }))} className={INPUT}>
                  {Array.from({ length: section?.sectionColumns ?? 1 }, (_, i) => (
                    <option key={i} value={i}>Column {i + 1}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Toggles with auto-save */}
            <div>
              <p className={LBL + " mb-2"}>Permissions</p>
              <div className="space-y-2 bg-gray-50 rounded-lg p-2.5">
                {[
                  { key: "isRequired",  label: "Required",         color: "bg-amber-500" },
                  { key: "isEditable",  label: "Editable by user", color: "bg-indigo-500" },
                  { key: "isReadOnly",  label: "Read-only",        color: "bg-blue-500" },
                  { key: "isVisible",   label: "Visible",          color: "bg-emerald-500" },
                  { key: "isAdminOnly", label: "Admin only",       color: "bg-rose-500" },
                ].map(({ key, label, color }) => (
                  <label key={key} className="flex items-center gap-2.5 cursor-pointer select-none">
                    <div
                      onClick={() => {
                        const newVal = !fieldForm[key];
                        setFieldForm((f: any) => ({ ...f, [key]: newVal }));
                        onUpdateField(field.id, { [key]: newVal } as any);
                      }}
                      className={`rounded-full flex items-center px-0.5 transition-colors cursor-pointer ${fieldForm[key] ? color : "bg-gray-300"}`}
                      style={{ height: "18px", width: "32px", minWidth: "32px" }}
                    >
                      <div className={`w-3.5 h-3.5 bg-white rounded-full shadow-sm transition-transform ${fieldForm[key] ? "translate-x-3.5" : "translate-x-0"}`} />
                    </div>
                    <span className="text-xs text-gray-700">{label}</span>
                  </label>
                ))}
              </div>
            </div>

            <button onClick={saveField}
              className="w-full flex items-center justify-center gap-1.5 py-2 bg-gray-700 hover:bg-gray-600 text-white text-xs font-medium rounded-lg">
              <Check className="w-3.5 h-3.5" />Save Label &amp; Settings
            </button>
          </>
        )}

        {/* ── Section properties ── */}
        {section && !field && sectionForm && (
          <>
            <div>
              <label className={LBL}>Section Label</label>
              <input value={sectionForm.label} onChange={e => setSectionForm((f: any) => ({ ...f, label: e.target.value }))} className={INPUT} />
            </div>

            {section.crmModuleSlug && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 space-y-1">
                <p className="text-xs font-semibold text-emerald-700 flex items-center gap-1.5"><Database className="w-3 h-3" />CRM Module</p>
                <p className="text-xs text-emerald-600 font-mono">{section.crmModuleSlug}</p>
                {section.crmRelationField && <p className="text-xs text-emerald-600 font-mono">Relation: {section.crmRelationField}</p>}
              </div>
            )}

            <div className="space-y-2 bg-gray-50 rounded-lg p-2.5">
              {[
                { key: "isCollapsible", label: "Collapsible section" },
                { key: "isVisible",     label: "Visible to users" },
              ].map(({ key, label }) => (
                <label key={key} className="flex items-center gap-2.5 cursor-pointer">
                  <div onClick={() => setSectionForm((f: any) => ({ ...f, [key]: !f[key] }))}
                    className={`rounded-full flex items-center px-0.5 transition-colors ${sectionForm[key] ? "bg-indigo-500" : "bg-gray-300"}`}
                    style={{ height: "18px", width: "32px" }}>
                    <div className={`w-3.5 h-3.5 bg-white rounded-full shadow-sm transition-transform ${sectionForm[key] ? "translate-x-3.5" : "translate-x-0"}`} />
                  </div>
                  <span className="text-xs text-gray-700">{label}</span>
                </label>
              ))}
            </div>

            <div>
              <label className={LBL}>Layout column (page)</label>
              <select value={sectionForm.columnIndex}
                onChange={e => setSectionForm((f: any) => ({ ...f, columnIndex: parseInt(e.target.value) }))}
                className={INPUT}>
                {[0,1,2].map(i => <option key={i} value={i}>Column {i + 1}</option>)}
              </select>
            </div>

            <button onClick={saveSection}
              className="w-full flex items-center justify-center gap-1.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium rounded-lg">
              <Check className="w-3.5 h-3.5" />Apply
            </button>
          </>
        )}
      </div>

      {showCrmMapper && field && (
        <CrmFieldMapper
          field={field}
          onMapped={updates => onUpdateField(field.id, updates)}
          onClose={() => setShowCrmMapper(false)}
        />
      )}
    </div>
  );
}

// ── SortableSectionWrapper ────────────────────────────────────────────────────

function SortableSectionWrapper(props: Omit<SectionBlockProps, "dragListeners" | "dragAttributes" | "isDraggingSection">) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: props.section.id });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    position: "relative",
    zIndex: isDragging ? 50 : undefined,
  };
  return (
    <div ref={setNodeRef} style={style}>
      <SectionBlock
        {...props}
        dragListeners={listeners}
        dragAttributes={attributes}
        isDraggingSection={isDragging}
      />
    </div>
  );
}

// ── Main PortalCanvasBuilder ──────────────────────────────────────────────────

export function PortalCanvasBuilder({
  pageId,
  pageName,
  sections: sections_prop,
  templateColumns: templateColumns_prop,
  initialStatus,
  onBack,
}: PortalCanvasBuilderProps): React.ReactElement {
  const [sections, setSections] = useState<CanvasSection[]>(sections_prop);
  const [templateCols, setTemplateCols] = useState(templateColumns_prop);
  const [mode, setMode] = useState<BuilderMode>("layout");
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [autoSaving, setAutoSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState("");
  const [showCrm, setShowCrm] = useState(false);
  const [recentTypes, setRecentTypes] = useState<string[]>([]);
  const [leftOpen, setLeftOpen] = useState(true);
  const [rightOpen, setRightOpen] = useState(true);
  const [sectionHeights, setSectionHeights] = useState<Record<string, number>>({});
  const [isDirty, setIsDirty] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [portalStatus, setPortalStatus] = useState(initialStatus ?? "DRAFT");
  const [previewDevice, setPreviewDevice] = useState<"desktop" | "tablet" | "mobile">("desktop");
  const [sectionGap, setSectionGap] = useState(() => {
    if (typeof window === "undefined") return 4;
    try { return parseInt(localStorage.getItem(`pb_gap_${pageId}`) ?? "4") || 4; } catch { return 4; }
  });

  const hasInit = useRef(false);
  const activeDragType = useRef<"section" | "field" | null>(null);
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Ref so scheduleAutoSave always sees the latest templateCols without needing it in deps
  const templateColsRef = useRef(templateColumns_prop);

  // Keep templateColsRef current for use inside auto-save callback
  useEffect(() => { templateColsRef.current = templateCols; }, [templateCols]);

  // Init sections once
  useEffect(() => {
    if (!hasInit.current) {
      setSections(sections_prop);
      if (sections_prop.length > 0) hasInit.current = true;
    }
  }, [sections_prop]);

  // Load section heights from localStorage
  useEffect(() => {
    const stored: Record<string, number> = {};
    sections_prop.forEach(s => {
      try {
        const v = localStorage.getItem(`pb_sh_${s.id}`);
        if (v) stored[s.id] = parseInt(v);
      } catch {}
    });
    setSectionHeights(stored);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-collapse panels on narrow viewports
  useEffect(() => {
    const check = () => {
      if (window.innerWidth < 1024) { setLeftOpen(false); setRightOpen(false); }
    };
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const handleResize = useCallback((sectionId: string, h: number) => {
    setSectionHeights(prev => ({ ...prev, [sectionId]: h }));
  }, []);

  // ── Auto-save ───────────────────────────────────────────────────────────────

  const scheduleAutoSave = useCallback((latestSections: CanvasSection[]) => {
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(async () => {
      setAutoSaving(true);
      try {
        // Always persist the current page-level layout template (read via ref — no stale closure)
        await portalApi.patch(`/portal/padmin/pages/${pageId}`, {
          layoutTemplate: COLS_TO_TEMPLATE[templateColsRef.current] ?? "single",
        });
        for (const sec of latestSections) {
          await portalApi.patch(`/portal/padmin/sections/${sec.id}`, {
            label: sec.label,
            columnIndex: sec.columnIndex,
            isCollapsible: sec.isCollapsible,
            isVisible: sec.isVisible,
            order: sec.order,
            icon: encodeSectionCols(sec.sectionColumns, sec.columnRatio),
          });
          for (const field of sec.fields) {
            await portalApi.patch(`/portal/padmin/fields/${field.id}`, { order: field.order });
          }
        }
        setSavedMsg("Draft autosaved");
        setTimeout(() => setSavedMsg(""), 2500);
      } catch {
        // Autosave failures are silent — manual Save button is the reliable path
      }
      setAutoSaving(false);
    }, 3000);
  }, [pageId]);

  const update = useCallback((updated: CanvasSection[]) => {
    setSections(updated);
    setIsDirty(true);
    scheduleAutoSave(updated);
  }, [scheduleAutoSave]);

  // ── DnD sensors ─────────────────────────────────────────────────────────────

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  // ── Container helpers ────────────────────────────────────────────────────────

  const parseContainer = (id: string) => {
    const match = id.match(/^(.+)_col_(\d+)$/);
    if (!match) return null;
    return { sectionId: match[1], colIdx: parseInt(match[2]) };
  };

  const findContainerOfField = useCallback((fieldId: string, sects: CanvasSection[]) => {
    for (const s of sects) {
      for (const f of s.fields) {
        if (f.id === fieldId) {
          const colIdx = Math.min(colSlotOf(f.order), s.sectionColumns - 1);
          return `${s.id}_col_${colIdx}`;
        }
      }
    }
    return null;
  }, []);

  // ── DnD handlers ─────────────────────────────────────────────────────────────

  const handleDragStart = ({ active }: DragStartEvent) => {
    const aId = String(active.id);
    setActiveDragId(aId);
    activeDragType.current = sections.some(s => s.id === aId) ? "section" : "field";
  };

  const handleDragOver = ({ active, over }: DragOverEvent) => {
    if (!over || activeDragType.current === "section") return;
    const activeId = String(active.id);
    const overId = String(over.id);
    if (activeId === overId) return;
    if (activeId.startsWith(EMPTY_PREFIX)) return;

    const activeContainerId = findContainerOfField(activeId, sections);
    let overContainerId: string | null = null;

    if (overId.startsWith(EMPTY_PREFIX)) {
      overContainerId = overId.replace(EMPTY_PREFIX, "");
    } else {
      overContainerId = findContainerOfField(overId, sections);
      if (!overContainerId) {
        // over.id is a section element — default to its first column
        const overSec = sections.find(s => s.id === overId);
        if (overSec) overContainerId = `${overSec.id}_col_0`;
      }
    }

    if (!activeContainerId || !overContainerId || activeContainerId === overContainerId) return;

    setSections(prev => {
      const copy = prev.map(s => ({ ...s, fields: s.fields.map(f => ({ ...f })) }));
      const activeParsed = parseContainer(activeContainerId);
      const overParsed = parseContainer(overContainerId);
      if (!activeParsed || !overParsed) return prev;
      const sourceSec = copy.find(s => s.id === activeParsed.sectionId);
      const destSec = copy.find(s => s.id === overParsed.sectionId);
      if (!sourceSec || !destSec) return prev;
      const fieldIdx = sourceSec.fields.findIndex(f => f.id === activeId);
      if (fieldIdx < 0) return prev;
      const [movedField] = sourceSec.fields.splice(fieldIdx, 1);
      const destColFields = destSec.fields.filter(f =>
        Math.min(colSlotOf(f.order), destSec.sectionColumns - 1) === overParsed.colIdx
      );
      const overFieldIdx = destColFields.findIndex(f => f.id === overId);
      const insertPos = overFieldIdx >= 0 ? overFieldIdx : destColFields.length;
      movedField.order = encodeOrder(overParsed.colIdx, insertPos);
      movedField.sectionId = destSec.id;
      destColFields.forEach((f, i) => { if (i >= insertPos) f.order = encodeOrder(overParsed.colIdx, i + 1); });
      destSec.fields.push(movedField);
      return copy;
    });
  };

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    setActiveDragId(null);
    const dragType = activeDragType.current;
    activeDragType.current = null;
    if (!over) return;
    const activeId = String(active.id);
    const overId = String(over.id);
    if (activeId === overId) return;

    if (dragType === "section") {
      const activeSec = sections.find(s => s.id === activeId);
      const overSec = sections.find(s => s.id === overId);
      if (!activeSec || !overSec) return;
      const targetCol = overSec.columnIndex;
      let updated: CanvasSection[];
      if (activeSec.columnIndex === targetCol) {
        const ai = sections.findIndex(s => s.id === activeId);
        const oi = sections.findIndex(s => s.id === overId);
        updated = arrayMove(sections, ai, oi).map((s, i) => ({ ...s, order: i }));
      } else {
        const movedSection = { ...activeSec, columnIndex: targetCol };
        const remaining = sections.filter(s => s.id !== activeId);
        const oi = remaining.findIndex(s => s.id === overId);
        updated = [...remaining.slice(0, oi), movedSection, ...remaining.slice(oi)]
          .map((s, i) => ({ ...s, order: i }));
        portalApi.patch(`/portal/padmin/sections/${activeId}`, { columnIndex: targetCol }).catch(() => {});
      }
      update(updated);
      portalApi.post("/portal/padmin/sections/reorder", { ids: updated.map(s => s.id) }).catch(() => {});
      return;
    }

    if (activeId.startsWith(EMPTY_PREFIX)) return;

    const activeContainerId = findContainerOfField(activeId, sections);
    let overContainerId = findContainerOfField(overId, sections);
    if (!overContainerId && overId.startsWith(EMPTY_PREFIX)) {
      overContainerId = overId.replace(EMPTY_PREFIX, "");
    }
    if (!overContainerId) {
      const overSec = sections.find(s => s.id === overId);
      if (overSec) overContainerId = `${overSec.id}_col_0`;
    }
    if (!activeContainerId || !overContainerId) return;

    if (activeContainerId === overContainerId) {
      const parsed = parseContainer(activeContainerId);
      if (!parsed) return;
      const copy = sections.map(s => ({ ...s, fields: s.fields.map(f => ({ ...f })) }));
      const sec = copy.find(s => s.id === parsed.sectionId);
      if (!sec) return;
      const colFlds = sec.fields
        .filter(f => Math.min(colSlotOf(f.order), sec.sectionColumns - 1) === parsed.colIdx)
        .sort((a, b) => (a.order % 100) - (b.order % 100));
      const ids = colFlds.map(f => f.id);
      const oldIdx = ids.indexOf(activeId);
      const newIdx = ids.indexOf(overId);
      if (oldIdx < 0 || newIdx < 0) return;
      const reordered = arrayMove(colFlds, oldIdx, newIdx);
      reordered.forEach((f, i) => { f.order = encodeOrder(parsed.colIdx, i); });
      const otherFields = sec.fields.filter(f =>
        Math.min(colSlotOf(f.order), sec.sectionColumns - 1) !== parsed.colIdx
      );
      sec.fields = [...otherFields, ...reordered];
      setSections(copy);
      scheduleAutoSave(copy);
    } else {
      const activeParsed = parseContainer(activeContainerId);
      const overParsed = parseContainer(overContainerId);
      if (!activeParsed || !overParsed) return;
      if (activeParsed.sectionId !== overParsed.sectionId) {
        const movedField = sections.flatMap(s => s.fields).find(f => f.id === activeId);
        if (movedField) {
          portalApi.patch(`/portal/padmin/fields/${activeId}`, {
            sectionId: overParsed.sectionId, order: movedField.order,
          }).catch(() => {});
        }
      } else {
        const movedField = sections.flatMap(s => s.fields).find(f => f.id === activeId);
        if (movedField) {
          portalApi.patch(`/portal/padmin/fields/${activeId}`, { order: movedField.order }).catch(() => {});
        }
      }
      scheduleAutoSave(sections);
    }
  };

  // ── Section actions ──────────────────────────────────────────────────────────

  const addSection = useCallback(async (preset?: string, targetColumn?: number) => {
    let sectionColumns = 1;
    let columnRatio = "equal";
    let label = "New Section";
    let fieldType: string | null = null;

    if (preset === "2col") { sectionColumns = 2; label = "Two-Column Section"; }
    else if (preset === "3col") { sectionColumns = 3; label = "Three-Column Section"; }
    else if (preset === "header") { label = "Header Block"; fieldType = "header"; }

    // Auto-balance: pick column with fewest sections when no target specified
    const colIdx = targetColumn !== undefined ? targetColumn : (() => {
      const counts = Array.from({ length: templateCols }, (_, i) =>
        sections.filter(s => s.columnIndex === i).length
      );
      return counts.indexOf(Math.min(...counts));
    })();

    try {
      const res = await portalApi.post("/portal/padmin/sections", {
        label, portalPageId: pageId, columnIndex: colIdx, order: sections.length,
        icon: encodeSectionCols(sectionColumns, columnRatio),
      });
      const s: CanvasSection = {
        ...res.data, fields: [],
        sectionColumns, columnRatio,
        isVisible: res.data.isVisible ?? true,
        isCollapsible: res.data.isCollapsible ?? false,
      };

      // Add header field if preset
      if (fieldType) {
        try {
          const fRes = await portalApi.post("/portal/padmin/fields", {
            label: "Section Title", fieldKey: `header_${Date.now()}`,
            fieldType: "header", portalPageId: pageId, sectionId: s.id, order: 0, isEditable: true,
          });
          s.fields = [{ ...fRes.data, options: [], sectionId: s.id, isAdminOnly: false, isVisible: true }];
        } catch {}
      }

      const updated = [...sections, s];
      update(updated);
      setSelectedSectionId(s.id);
      setSelectedFieldId(null);
    } catch {}
  }, [sections, pageId, update]);

  const deleteSection = useCallback(async (id: string) => {
    if (!window.confirm("Delete this section and all its fields?")) return;
    try {
      await portalApi.delete(`/portal/padmin/sections/${id}`);
      update(sections.filter(s => s.id !== id));
      if (selectedSectionId === id) { setSelectedSectionId(null); setSelectedFieldId(null); }
    } catch {}
  }, [sections, selectedSectionId, update]);

  const duplicateSection = useCallback(async (id: string) => {
    const src = sections.find(s => s.id === id);
    if (!src) return;
    try {
      const newSec = await portalApi.post("/portal/padmin/sections", {
        label: `${src.label} (copy)`,
        portalPageId: pageId,
        columnIndex: src.columnIndex,
        order: src.order + 1,
        icon: encodeSectionCols(src.sectionColumns, src.columnRatio),
      });
      const copiedFields: CanvasField[] = [];
      for (const field of src.fields) {
        try {
          const res = await portalApi.post("/portal/padmin/fields", {
            label: field.label, fieldKey: `${field.fieldKey}_copy_${Date.now()}`,
            fieldType: field.fieldType, placeholder: field.placeholder,
            helpText: field.helpText, options: field.options,
            isRequired: field.isRequired, isEditable: field.isEditable,
            isReadOnly: field.isReadOnly, isVisible: field.isVisible,
            isAdminOnly: field.isAdminOnly, order: field.order,
            sectionId: newSec.data.id, portalPageId: pageId,
            mappedCrmFieldName: field.mappedCrmFieldName,
            mappedCrmModuleSlug: field.mappedCrmModuleSlug,
          });
          copiedFields.push({ ...res.data, options: res.data.options ?? [], sectionId: newSec.data.id });
        } catch {}
      }
      const dup: CanvasSection = {
        ...newSec.data,
        sectionColumns: src.sectionColumns, columnRatio: src.columnRatio,
        isVisible: newSec.data.isVisible ?? true,
        isCollapsible: newSec.data.isCollapsible ?? false,
        fields: copiedFields,
      };
      update([...sections, dup]);
      setSelectedSectionId(dup.id);
      setSelectedFieldId(null);
    } catch {}
  }, [sections, pageId, update]);

  const updateSection = useCallback(async (id: string, changes: Partial<CanvasSection>) => {
    try {
      const sec = sections.find(s => s.id === id);
      const patchBody: any = { ...changes };
      if (changes.sectionColumns !== undefined || changes.columnRatio !== undefined) {
        const newCols = changes.sectionColumns ?? sec?.sectionColumns ?? 1;
        const newRatio = changes.columnRatio ?? sec?.columnRatio ?? "equal";
        patchBody.icon = encodeSectionCols(newCols, newRatio);
        delete patchBody.sectionColumns;
        delete patchBody.columnRatio;
      }
      await portalApi.patch(`/portal/padmin/sections/${id}`, patchBody);
      update(sections.map(s => s.id === id ? { ...s, ...changes } : s));
    } catch {}
  }, [sections, update]);

  const changeColumns = useCallback(async (id: string, cols: number, ratio: string) => {
    await updateSection(id, { sectionColumns: cols, columnRatio: ratio });
  }, [updateSection]);

  // ── Field actions ────────────────────────────────────────────────────────────

  const addField = useCallback(async (sectionId: string, fieldType: string) => {
    const sec = sections.find(s => s.id === sectionId);
    if (!sec) return;
    const label = COMP_FLAT.find(c => c.type === fieldType)?.label ?? fieldType;
    try {
      const res = await portalApi.post("/portal/padmin/fields", {
        label, fieldKey: `${fieldType}_${Date.now()}`, fieldType,
        portalPageId: pageId, sectionId, order: sec.fields.length, isEditable: true,
      });
      const f: CanvasField = {
        ...res.data, options: res.data.options ?? [], sectionId,
        isAdminOnly: res.data.isAdminOnly ?? false,
        isVisible: res.data.isVisible ?? true,
      };
      update(sections.map(s => s.id === sectionId ? { ...s, fields: [...s.fields, f] } : s));
      setSelectedFieldId(f.id);
      setSelectedSectionId(sectionId);
    } catch {}
  }, [sections, pageId, update]);

  const deleteField = useCallback(async (sectionId: string, fieldId: string) => {
    try {
      await portalApi.delete(`/portal/padmin/fields/${fieldId}`);
      update(sections.map(s =>
        s.id === sectionId ? { ...s, fields: s.fields.filter(f => f.id !== fieldId) } : s
      ));
      if (selectedFieldId === fieldId) setSelectedFieldId(null);
    } catch {}
  }, [sections, selectedFieldId, update]);

  const updateField = useCallback(async (fieldId: string, changes: Partial<CanvasField>) => {
    try {
      await portalApi.patch(`/portal/padmin/fields/${fieldId}`, changes);
      update(sections.map(s => ({
        ...s, fields: s.fields.map(f => f.id === fieldId ? { ...f, ...changes } : f),
      })));
    } catch {}
  }, [sections, update]);

  // ── Manual save ──────────────────────────────────────────────────────────────

  const save = async () => {
    setSaving(true);
    try {
      // Persist page-level layout (templateCols → layoutTemplate string)
      await portalApi.patch(`/portal/padmin/pages/${pageId}`, {
        layoutTemplate: COLS_TO_TEMPLATE[templateCols] ?? "single",
      });
      // Persist every section's structure, order, and field order
      for (const sec of sections) {
        await portalApi.patch(`/portal/padmin/sections/${sec.id}`, {
          label: sec.label,
          columnIndex: sec.columnIndex,
          isCollapsible: sec.isCollapsible,
          isVisible: sec.isVisible,
          order: sec.order,
          icon: encodeSectionCols(sec.sectionColumns, sec.columnRatio),
        });
        for (const field of sec.fields) {
          await portalApi.patch(`/portal/padmin/fields/${field.id}`, { order: field.order });
        }
      }
      setIsDirty(false);
      setSavedMsg("Portal layout saved successfully");
      setTimeout(() => setSavedMsg(""), 3000);
    } catch {
      setSavedMsg("Save failed — please try again");
      setTimeout(() => setSavedMsg(""), 3000);
    }
    setSaving(false);
  };

  const publish = async () => {
    // Always force-save the full layout before publishing so live portal gets latest state
    await save();
    setIsPublishing(true);
    try {
      await portalApi.patch(`/portal/padmin/pages/${pageId}`, { status: "PUBLISHED" });
      setPortalStatus("PUBLISHED");
      setIsDirty(false);
      setSavedMsg("Portal republished successfully");
      setTimeout(() => setSavedMsg(""), 4000);
    } catch {
      setSavedMsg("Publish failed — try again");
      setTimeout(() => setSavedMsg(""), 3000);
    }
    setIsPublishing(false);
  };

  // ── Layout control handlers ──────────────────────────────────────────────────

  // Immediately persist the page column count and mark dirty so Save button activates
  const handleChangeTemplateCols = useCallback((n: number) => {
    setTemplateCols(n);
    setIsDirty(true);
    portalApi.patch(`/portal/padmin/pages/${pageId}`, {
      layoutTemplate: COLS_TO_TEMPLATE[n] ?? "single",
    }).catch(() => {});
  }, [pageId]);

  // Persist section gap per-page in localStorage (cosmetic preference, no backend field needed)
  const handleChangeSectionGap = useCallback((v: number) => {
    setSectionGap(v);
    try { localStorage.setItem(`pb_gap_${pageId}`, String(v)); } catch {}
  }, [pageId]);

  // ── Helpers ──────────────────────────────────────────────────────────────────

  const handleAddFromPalette = (type: string) => {
    const sectionId = selectedSectionId ?? sections[0]?.id;
    if (!sectionId) { addSection(); return; }
    addField(sectionId, type);
    setRecentTypes(prev => [type, ...prev.filter(t => t !== type)].slice(0, 4));
  };

  const handleCrmCreated = (s: CanvasSection) => {
    update([...sections, s]);
    setSelectedSectionId(s.id);
    setSelectedFieldId(null);
  };

  const selectedSection = sections.find(s => s.id === selectedSectionId) ?? null;
  const selectedField = selectedSection?.fields.find(f => f.id === selectedFieldId) ?? null;

  const gridCls =
    templateCols === 3 ? "grid-cols-3" :
    templateCols === 2 ? "grid-cols-2" :
    "grid-cols-1";

  const pageColumns = useMemo(() =>
    Array.from({ length: Math.max(templateCols, 1) }, (_, i) =>
      sections.filter(s => s.columnIndex === i).sort((a, b) => a.order - b.order)
    ),
    [sections, templateCols]
  );

  const pageColumnIds = useMemo(() =>
    pageColumns.map(colSections => colSections.map(s => s.id)),
    [pageColumns]
  );

  const activeFieldForOverlay = activeDragId
    ? sections.flatMap(s => s.fields).find(f => f.id === activeDragId)
    : null;

  // In layout mode field DnD is disabled — only section dragging
  const isDragDisabled = mode === "layout";

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-gray-900">
      {/* ── Toolbar ── */}
      <header className="flex items-center gap-2 px-4 py-2.5 bg-gray-900 border-b border-gray-800 shrink-0 z-40">
        {/* Back */}
        {onBack && (
          <button onClick={onBack}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg text-xs font-medium transition-colors shrink-0">
            <ChevronLeft className="w-3.5 h-3.5" />Back
          </button>
        )}

        {/* Page name */}
        <span className="text-sm font-semibold text-white truncate max-w-[160px]" title={pageName}>
          {pageName}
        </span>

        {/* Panel toggles (left) */}
        <div className="flex items-center gap-1 ml-1">
          <button onClick={() => setLeftOpen(v => !v)} title="Toggle left panel"
            className={`p-1.5 rounded-lg transition-colors ${leftOpen ? "bg-gray-700 text-white" : "text-gray-500 hover:text-white hover:bg-gray-800"}`}>
            <PanelLeft className="w-4 h-4" />
          </button>
          {mode !== "preview" && (
            <button onClick={() => setRightOpen(v => !v)} title="Toggle right panel"
              className={`p-1.5 rounded-lg transition-colors ${rightOpen ? "bg-gray-700 text-white" : "text-gray-500 hover:text-white hover:bg-gray-800"}`}>
              <PanelRight className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Mode tabs */}
        <div className="flex items-center bg-gray-800 rounded-lg p-0.5 mx-auto">
          {([
            { id: "layout",  label: "Layout",  Icon: Layout },
            { id: "design",  label: "Design",  Icon: Pencil },
            { id: "preview", label: "Preview", Icon: Eye },
          ] as const).map(({ id, label, Icon }) => (
            <button key={id} onClick={() => setMode(id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                mode === id ? "bg-indigo-600 text-white" : "text-gray-400 hover:text-white"
              }`}>
              <Icon className="w-3.5 h-3.5" />{label}
            </button>
          ))}
        </div>

        {/* Preview viewport switcher */}
        {mode === "preview" && (
          <div className="flex items-center bg-gray-800 rounded-lg p-0.5">
            {([
              { id: "desktop", Icon: Monitor, title: "Desktop" },
              { id: "tablet",  Icon: Tablet,  title: "Tablet (768px)" },
              { id: "mobile",  Icon: Smartphone, title: "Mobile (390px)" },
            ] as const).map(({ id, Icon, title }) => (
              <button key={id} onClick={() => setPreviewDevice(id)} title={title}
                className={`p-1.5 rounded-md transition-colors ${previewDevice === id ? "bg-gray-700 text-white" : "text-gray-500 hover:text-white"}`}>
                <Icon className="w-3.5 h-3.5" />
              </button>
            ))}
          </div>
        )}

        {/* Right side: status + indicators + save + publish */}
        <div className="flex items-center gap-2 shrink-0">
          {isDirty && !saving && !autoSaving && (
            <span className="flex items-center gap-1 text-xs text-amber-400 font-medium">
              <span className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-pulse" />
              Unsaved
            </span>
          )}
          {autoSaving && !saving && (
            <span className="text-xs text-gray-400 flex items-center gap-1">
              <Loader2 className="w-3 h-3 animate-spin" />Saving…
            </span>
          )}
          {savedMsg && !autoSaving && !saving && (
            <span className="text-xs text-emerald-400 flex items-center gap-1">
              <Check className="w-3 h-3" />{savedMsg}
            </span>
          )}

          {/* Status badge */}
          <span className={`text-[10px] font-bold px-2 py-1 rounded-full border shrink-0 ${
            portalStatus === "PUBLISHED"
              ? "bg-green-900/40 text-green-400 border-green-800/50"
              : "bg-gray-800 text-gray-400 border-gray-700"
          }`}>{portalStatus}</span>

          {mode !== "preview" && (
            <>
              <button onClick={save} disabled={saving || !isDirty}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-700 hover:bg-gray-600 disabled:opacity-40 text-white text-xs font-semibold rounded-lg transition-colors">
                {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                Save
              </button>
              <button onClick={publish} disabled={isPublishing || saving}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold rounded-lg transition-colors">
                {isPublishing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Rocket className="w-3 h-3" />}
                Publish
              </button>
            </>
          )}
        </div>
      </header>

      {/* ── Three-panel body ── */}
      <div className="flex flex-1 overflow-hidden">

        {/* Left panel */}
        {mode !== "preview" && (
          <aside className={`${leftOpen ? "w-56" : "w-0"} shrink-0 bg-white border-r border-gray-200 overflow-hidden flex flex-col transition-all duration-200`}>
            <LeftPanel
              mode={mode}
              selectedSectionId={selectedSectionId}
              recentTypes={recentTypes}
              templateColumns={templateCols}
              sectionGap={sectionGap}
              onAddSection={addSection}
              onAddCrmSection={() => setShowCrm(true)}
              onAddField={handleAddFromPalette}
              onChangeTemplateColumns={handleChangeTemplateCols}
              onChangeSectionGap={handleChangeSectionGap}
            />
          </aside>
        )}

        {/* Canvas */}
        <main className="flex-1 overflow-y-auto min-w-0 bg-gray-100">
          <div className={`min-h-full transition-all duration-300 ${
            mode === "preview" ? "p-6 flex flex-col items-center" : "p-5"
          }`}>
            {/* Preview device frame */}
            {mode === "preview" && (
              <div className="mb-4 flex items-center gap-3 text-xs text-gray-400">
                <span className="font-medium">
                  {previewDevice === "desktop" ? "Desktop — full width" :
                   previewDevice === "tablet" ? "Tablet — 768px" : "Mobile — 390px"}
                </span>
                <div className="h-px flex-1 bg-gray-200 max-w-[200px]" />
              </div>
            )}
            <div className={`transition-all duration-300 w-full ${
              mode === "preview" && previewDevice === "mobile" ? "max-w-[390px]" :
              mode === "preview" && previewDevice === "tablet" ? "max-w-[768px]" :
              "max-w-none"
            }`}>
            <DndContext
              sensors={sensors}
              collisionDetection={args =>
                activeDragType.current === "section" ? closestCenter(args) : pointerWithin(args)
              }
              onDragStart={handleDragStart}
              onDragOver={isDragDisabled ? undefined : handleDragOver}
              onDragEnd={handleDragEnd}
            >
              {/* Canvas content */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 min-h-[400px] p-4">
                {sections.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 gap-4">
                    <LayoutGrid className="w-10 h-10 text-gray-200" />
                    <div className="text-center">
                      <p className="text-sm font-semibold text-gray-500">No content yet</p>
                      <p className="text-xs text-gray-400 mt-1">Add a section from the left panel</p>
                    </div>
                    {mode !== "preview" && (
                      <div className="flex gap-2">
                        <button onClick={() => addSection()}
                          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg">
                          <Plus className="w-4 h-4" />Add Section
                        </button>
                        <button onClick={() => setShowCrm(true)}
                          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium rounded-lg">
                          <Database className="w-4 h-4" />From CRM
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className={`grid ${gridCls}`} style={{ gap: `${sectionGap * 4}px` }}>
                    {pageColumns.map((colSections, colIdx) => (
                      <div key={colIdx} className="space-y-4 min-w-0">
                        {templateCols > 1 && mode !== "preview" && (
                          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                            Column {colIdx + 1}
                          </p>
                        )}
                        <SortableContext
                          items={pageColumnIds[colIdx]}
                          strategy={verticalListSortingStrategy}
                        >
                          {colSections.map(sec => (
                            <SortableSectionWrapper
                              key={sec.id}
                              section={sec}
                              mode={mode}
                              selectedFieldId={selectedFieldId}
                              selectedSectionId={selectedSectionId}
                              sectionHeight={sectionHeights[sec.id]}
                              onSelectSection={id => { setSelectedSectionId(id); setSelectedFieldId(null); if (!rightOpen) setRightOpen(true); }}
                              onSelectField={(secId, fId) => { setSelectedSectionId(secId); setSelectedFieldId(fId); if (!rightOpen) setRightOpen(true); }}
                              onDeleteSection={deleteSection}
                              onDeleteField={deleteField}
                              onDuplicateSection={duplicateSection}
                              onChangeColumns={changeColumns}
                              onResize={handleResize}
                            />
                          ))}
                        </SortableContext>
                        {/* Per-column add section button (replaces the empty-column placeholder) */}
                        {mode !== "preview" && (
                          <button
                            onClick={() => addSection(undefined, colIdx)}
                            className="w-full flex items-center justify-center gap-1.5 py-2.5 border-2 border-dashed border-gray-200 hover:border-indigo-400 hover:text-indigo-500 text-gray-400 text-xs font-medium rounded-xl transition-colors bg-transparent"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            {templateCols > 1 ? `Add Section — Col ${colIdx + 1}` : "Add Section"}
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* From CRM — shared footer */}
                {mode !== "preview" && (
                  <div className="mt-3 flex justify-center">
                    <button onClick={() => setShowCrm(true)}
                      className="flex items-center gap-2 px-4 py-2 bg-white border border-emerald-200 hover:border-emerald-400 hover:text-emerald-700 text-emerald-600 text-sm rounded-xl transition-colors">
                      <Database className="w-4 h-4" />From CRM Module
                    </button>
                  </div>
                )}
              </div>

              {/* DragOverlay */}
              <DragOverlay dropAnimation={null}>
                {activeDragId && sections.some(s => s.id === activeDragId) ? (
                  <div className="bg-white border-2 border-indigo-400 shadow-2xl rounded-xl px-4 py-3 opacity-90 pointer-events-none">
                    <div className="flex items-center gap-2">
                      <GripVertical className="w-4 h-4 text-indigo-400" />
                      <span className="text-sm font-semibold text-gray-700">
                        {sections.find(s => s.id === activeDragId)?.label ?? "Section"}
                      </span>
                    </div>
                  </div>
                ) : activeFieldForOverlay && !isDragDisabled ? (
                  <div className="bg-white border-2 border-indigo-400 shadow-xl rounded-lg px-4 py-3 opacity-95 pointer-events-none rotate-1">
                    <ComponentPreview field={activeFieldForOverlay} />
                  </div>
                ) : null}
              </DragOverlay>
            </DndContext>
            </div>{/* end viewport-width wrapper */}
          </div>
        </main>

        {/* Right panel */}
        {mode !== "preview" && (
          <aside className={`${rightOpen ? "w-64" : "w-0"} shrink-0 bg-white border-l border-gray-200 overflow-hidden flex flex-col transition-all duration-200`}>
            <PropertiesPanel
              section={selectedSection}
              field={selectedField}
              onUpdateSection={updateSection}
              onUpdateField={updateField}
              onClose={() => { setSelectedSectionId(null); setSelectedFieldId(null); }}
            />
          </aside>
        )}
      </div>

      {/* CRM section modal */}
      {showCrm && (
        <CrmSectionModal
          pageId={pageId}
          onCreated={handleCrmCreated}
          onClose={() => setShowCrm(false)}
        />
      )}
    </div>
  );
}
