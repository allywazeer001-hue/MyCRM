"use client";
import { useEffect, useState, useCallback, useRef, createContext, useContext } from "react";
import { useParams, usePathname } from "next/navigation";
import {
  ArrowLeft, Plus, Minus, GripVertical, X, Save, Loader2,
  Settings, Layers, Trash2, Share2 as Share2Icon,
  Calendar, MessageSquare, Image as ImageIcon, CheckCircle2,
  Zap, ArrowRight, ChevronRight, ExternalLink,
  ChevronDown, Link2, FileText, Type, Hash, AtSign,
  Phone, CalendarDays, ToggleLeft, List, CheckSquare, AlignLeft, Upload, PenLine,
  Maximize2, Columns2, Palette, AlignCenter, AlignLeft as AlignLeftIcon, AlignRight,
  Copy, Eye, Layers as LayersIcon, LayoutTemplate,
  FileSpreadsheet, RefreshCw, ScanSearch, Ticket,
} from "lucide-react";
import {
  DndContext, DragEndEvent, DragStartEvent, DragOverEvent, DragOverlay,
  PointerSensor, useSensor, useSensors, closestCenter,
  useDroppable, useDraggable,
} from "@dnd-kit/core";
import {
  SortableContext, useSortable, rectSortingStrategy, arrayMove,
} from "@dnd-kit/sortable";

// Custom collision detection: try closestCenter on FIELD items only first (excludes large section
// zone droppables that would otherwise always win due to their size). Fall back to full
// closestCenter (which includes zones) only when no fields are nearby — handles empty-section
// drops and sidebar-to-section drags.
function builderCollision(args: Parameters<typeof closestCenter>[0]) {
  const ZONE_PREFIXES = ["sec:", "page-empty:"];
  const isZone = (id: string) => ZONE_PREFIXES.some(p => id.startsWith(p)) || id === "unsec";
  const activeId = String(args.active.id);

  const fieldContainers: any[] = [];
  for (const container of args.droppableContainers) {
    const cid = String(container.id);
    if (!isZone(cid) && cid !== activeId) fieldContainers.push(container);
  }

  if (fieldContainers.length > 0) {
    const hits = closestCenter({ ...args, droppableContainers: fieldContainers as any });
    if (hits.length > 0) return hits;
  }

  return closestCenter(args);
}
import { CSS } from "@dnd-kit/utilities";

// Shared drag context — lets SortableFormFieldItem read activeId/overFieldId
// without prop-drilling through PageBlock → Section → grid
const BuilderDragCtx = createContext<{ activeId: string | null; overFieldId: string | null; overTarget: string | null }>({
  activeId: null, overFieldId: null, overTarget: null,
});
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { MultiCombobox } from "@/components/ui/combobox";
import { resolvePostSubmitAction } from "@/lib/form-post-submit";
import { ModuleIcon } from "@/components/ui/module-icon";
import { ConditionTreeBuilder } from "@/components/workflows/ConditionTreeBuilder";
import { normalizeConditionTree, type ConditionGroup } from "@/lib/condition-tree";
import { INTEGRATION_FILTER_OPERATORS, INTEGRATION_FILTER_NO_VALUE_OPS } from "@/components/records/integration-filter-operators";
import { api } from "@/lib/api";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { FormSharePanel } from "@/components/forms/share-panel";
import { DesktopOnlyGate } from "@/components/ui/desktop-only-notice";

// ── Types ─────────────────────────────────────────────────────────────────────

type RuleOperator = "equals" | "not_equals" | "contains" | "is_empty" | "not_empty" | "gt" | "lt";
type RuleAction   = "show" | "hide" | "require" | "unrequire" | "disable";

interface FieldRule {
  id: string; fieldKey: string; operator: RuleOperator; value: string; action: RuleAction;
}
interface ConditionalLogic {
  rules: FieldRule[];
  lookupAutoFill?: { sourceField: string; targetFieldKey: string }[];
  integrationMappings?: { sourceFieldId: string; destinationFormFieldId: string; behavior: "UPDATE_EXISTING" | "FILL_IF_EMPTY" }[];
}
type FormRuleActionType =
  | "show_field" | "hide_field" | "require_field" | "unrequire_field"
  | "set_value" | "show_message" | "block_submit"
  | "show_section" | "hide_section" | "enable_field" | "disable_field";
interface FormRuleCondition { id: string; fieldKey: string; operator: string; value: string; }
interface FormRuleAction    { id: string; type: FormRuleActionType; target: string; value?: string; }
interface FormRule {
  id: string; name: string; enabled: boolean; conditionsLogic: "AND" | "OR";
  conditions: FormRuleCondition[]; actions: FormRuleAction[];
  isSubmitBlocker?: boolean; blockMessage?: string;
}
interface PageDef { id: string; title: string; description?: string; order: number; }

// Custom field definition (standalone forms — no module linked)
interface CustomFieldDef {
  id: string;           // unique stable ID (acts as fieldId)
  label: string;        // display label
  name: string;         // snake_case key used in submissions
  type: string;         // TEXT | NUMBER | EMAIL | PHONE | DATE | etc.
  required?: boolean;
  placeholder?: string;
  description?: string;
  options?: { value: string; label: string }[];
  sectionId?: string | null;
  order: number;
  // INTEGRATION only — self-contained since standalone forms have no backing
  // module Field to store this on. Same shape as a module Field's `settings`.
  settings?: { sourceModuleId?: string; searchFieldIds?: string[]; displayFieldId?: string; resultColumnFieldIds?: string[]; filterCriteria?: any; allowManualUpdate?: boolean };
  integrationMappings?: { sourceFieldId: string; destinationFormFieldId: string; behavior: "UPDATE_EXISTING" | "FILL_IF_EMPTY" }[];
}

const FIELD_TYPE_ICONS: Record<string, string> = {
  TEXT: "T", TEXTAREA: "¶", RICH_TEXT: "R", NUMBER: "#", DECIMAL: "0.0",
  CURRENCY: "$", EMAIL: "@", PHONE: "☎", URL: "🔗", DATE: "📅",
  DATETIME: "🕐", BOOLEAN: "✓", DROPDOWN: "▼", MULTI_SELECT: "☑",
  STATUS: "●", RADIO: "◉", FILE: "📎", IMAGE: "🖼", USER_SELECT: "👤",
  TAGS: "🏷", RATING: "⭐", PROGRESS: "%", FORMULA: "fx", AUTO_NUMBER: "🔢",
  COLOR_PICKER: "🎨", LOOKUP: "🔍", GLOBAL_RELATION: "🌐", SIGNATURE: "✍", INTEGRATION: "🔗",
};

const CUSTOM_FIELD_TYPES: { type: string; label: string; icon: any; color: string }[] = [
  { type: "TEXT",         label: "Text",        icon: Type,       color: "text-blue-600 bg-blue-50" },
  { type: "TEXTAREA",     label: "Long Text",   icon: AlignLeft,  color: "text-blue-600 bg-blue-50" },
  { type: "NUMBER",       label: "Number",      icon: Hash,       color: "text-violet-600 bg-violet-50" },
  { type: "EMAIL",        label: "Email",       icon: AtSign,     color: "text-indigo-600 bg-indigo-50" },
  { type: "PHONE",        label: "Phone",       icon: Phone,      color: "text-green-600 bg-green-50" },
  { type: "DATE",         label: "Date",        icon: CalendarDays, color: "text-amber-600 bg-amber-50" },
  { type: "DROPDOWN",     label: "Dropdown",    icon: List,       color: "text-orange-600 bg-orange-50" },
  { type: "RADIO",        label: "Single Choice", icon: ToggleLeft, color: "text-orange-600 bg-orange-50" },
  { type: "MULTI_SELECT", label: "Multi Choice",  icon: CheckSquare, color: "text-orange-600 bg-orange-50" },
  { type: "BOOLEAN",      label: "Checkbox",    icon: CheckSquare, color: "text-teal-600 bg-teal-50" },
  { type: "FILE",         label: "File Upload", icon: Upload,     color: "text-slate-600 bg-slate-50" },
  { type: "SIGNATURE",    label: "Signature",   icon: PenLine,    color: "text-rose-600 bg-rose-50" },
  { type: "INTEGRATION",  label: "Integration Field", icon: Link2, color: "text-cyan-600 bg-cyan-50" },
];

function parseLogic(ff: any): ConditionalLogic {
  const raw = ff?.conditionalLogic;
  if (!raw) return { rules: [], lookupAutoFill: [] };
  if (typeof raw === "string") { try { return JSON.parse(raw); } catch { return { rules: [], lookupAutoFill: [] }; } }
  return { rules: [], lookupAutoFill: [], ...raw };
}
function newUid() { return `r-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`; }
const OPTION_BEARING_TYPES = ["DROPDOWN", "STATUS", "RADIO", "MULTI_SELECT"];

// ── Sortable field card ────────────────────────────────────────────────────────

// ── Field type preview (lightweight input mockup) ────────────────────────────

function FieldTypePreview({ type, options }: { type?: string; options?: any[] }) {
  const t = type || "TEXT";
  if (["DROPDOWN", "STATUS"].includes(t))
    return (
      <div className="h-8 border border-slate-200 rounded-lg bg-slate-50 flex items-center px-3 text-xs text-slate-400 gap-1 pointer-events-none select-none">
        <span className="flex-1">Select an option…</span>
        <ChevronDown className="w-3 h-3 shrink-0" />
      </div>
    );
  if (["RADIO", "BOOLEAN"].includes(t)) {
    const opts = options?.slice(0, 3) || [];
    return (
      <div className="space-y-1 pointer-events-none select-none">
        {(opts.length ? opts : [{ label: "Option 1" }]).map((o: any, i: number) => (
          <div key={i} className="flex items-center gap-2 text-xs text-slate-400">
            <div className="w-3.5 h-3.5 border-2 border-slate-300 rounded-full shrink-0" />
            <span>{o.label || o.value}</span>
          </div>
        ))}
      </div>
    );
  }
  if (t === "MULTI_SELECT") {
    const opts = options?.slice(0, 3) || [];
    return (
      <div className="space-y-1 pointer-events-none select-none">
        {(opts.length ? opts : [{ label: "Option 1" }]).map((o: any, i: number) => (
          <div key={i} className="flex items-center gap-2 text-xs text-slate-400">
            <div className="w-3.5 h-3.5 border-2 border-slate-300 rounded shrink-0" />
            <span>{o.label || o.value}</span>
          </div>
        ))}
      </div>
    );
  }
  if (t === "TEXTAREA" || t === "RICH_TEXT")
    return <div className="h-14 border border-slate-200 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-300 pointer-events-none select-none">Long answer…</div>;
  if (t === "DATE" || t === "DATETIME")
    return (
      <div className="h-8 border border-slate-200 rounded-lg bg-slate-50 flex items-center px-3 text-xs text-slate-400 gap-2 pointer-events-none select-none">
        <CalendarDays className="w-3.5 h-3.5 shrink-0" /><span>mm / dd / yyyy</span>
      </div>
    );
  if (t === "RATING")
    return <div className="flex gap-1 pointer-events-none select-none">{[1,2,3,4,5].map(n => <span key={n} className="text-lg text-slate-300">☆</span>)}</div>;
  if (["FILE", "IMAGE", "SIGNATURE"].includes(t))
    return (
      <div className="h-8 border border-dashed border-slate-300 rounded-lg bg-slate-50 flex items-center justify-center gap-1.5 text-xs text-slate-400 pointer-events-none select-none">
        <Upload className="w-3 h-3" /><span>Click to upload</span>
      </div>
    );
  return (
    <div className="h-8 border-b-2 border-slate-200 bg-transparent text-xs text-slate-300 px-1 flex items-end pb-1 pointer-events-none select-none">
      Short answer…
    </div>
  );
}

// ── Field card (Google-Forms style question card) ─────────────────────────────

function SortableFormFieldItem({ ff, moduleField, isSelected, onSelect, onRemove, onLabelChange, isCustom, colSpan, onToggleWidth }: {
  ff: any; moduleField: any; isSelected: boolean; onSelect: () => void; onRemove: () => void;
  onLabelChange?: (label: string) => void; isCustom?: boolean;
  colSpan?: "full" | "half"; onToggleWidth?: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: ff.id });
  const { activeId: dragActiveId, overFieldId: dragOverFieldId } = useContext(BuilderDragCtx);
  const style = { transform: CSS.Transform.toString(transform), transition, touchAction: 'none' as const };
  const logic = parseLogic(ff);
  const ruleCount = logic.rules?.length || 0;
  const displayLabel = ff.customLabel || moduleField?.label || ff.fieldId;
  const fieldType = moduleField?.type || "";
  const isHalf = colSpan === "half";
  const typeLabel = CUSTOM_FIELD_TYPES.find(t => t.type === fieldType)?.label || fieldType || "Field";

  // Show drop-indicator line above this card when something is being dragged over it
  const isDropTarget = !!(dragActiveId && dragActiveId !== ff.id && dragOverFieldId === ff.id);

  return (
    <div
      ref={setNodeRef} style={style}
      {...attributes} {...listeners}
      className={cn(
        "rounded-xl border-2 bg-white transition-all relative overflow-hidden group select-none",
        isDragging ? "opacity-0" : "shadow-sm hover:shadow-md",
        isSelected
          ? "border-indigo-400 shadow-[0_0_0_3px_rgba(99,102,241,0.1)]"
          : "border-slate-200 hover:border-indigo-200",
        isDragging ? "cursor-grabbing" : "cursor-grab",
      )}
      onClick={onSelect}
    >
      {/* Drop indicator — glowing line above card when something drags over it */}
      {isDropTarget && (
        <div className="absolute top-0 left-2 right-2 h-0.5 bg-indigo-500 z-20 rounded-full shadow-[0_0_8px_rgba(99,102,241,0.7)]" />
      )}

      {/* Left accent bar */}
      <div className={cn(
        "absolute left-0 top-0 bottom-0 w-[3px] rounded-l-xl transition-colors",
        isSelected ? "bg-indigo-500" : "group-hover:bg-indigo-200 bg-transparent"
      )} />

      {/* Grip dots — visual affordance only (no separate drag handler needed) */}
      <div className={cn(
        "absolute top-3 right-3 transition-opacity pointer-events-none",
        isSelected ? "opacity-40" : "opacity-0 group-hover:opacity-30"
      )}>
        <GripVertical className="w-3.5 h-3.5 text-slate-500" />
      </div>

      {/* Question row */}
      <div className="pl-5 pr-10 pt-4 pb-2 flex items-start gap-2">
        <div className="flex-1 min-w-0">
          {onLabelChange ? (
            <input
              value={displayLabel}
              onChange={e => { e.stopPropagation(); onLabelChange(e.target.value); }}
              onPointerDown={e => e.stopPropagation()}
              onClick={e => { e.stopPropagation(); onSelect(); }}
              className="text-sm font-semibold text-slate-900 bg-transparent border-0 outline-none w-full placeholder:text-slate-400 leading-snug cursor-text"
              placeholder="Question…"
            />
          ) : (
            <p className="text-sm font-semibold text-slate-900 leading-snug truncate" title={displayLabel}>{displayLabel}</p>
          )}
          {ff.isRequired && <span className="text-red-500 text-xs"> *</span>}
        </div>
        <span className="shrink-0 text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full font-medium whitespace-nowrap mr-6">{typeLabel}</span>
      </div>

      {/* Field preview */}
      <div className="pl-5 pr-4 pb-3">
        <FieldTypePreview type={fieldType} options={moduleField?.options} />
      </div>

      {/* Bottom action bar */}
      <div className={cn(
        "flex items-center justify-between px-3 py-1.5 border-t border-slate-100",
        isSelected ? "bg-indigo-50/50" : "bg-slate-50/50"
      )}>
        <div className="flex items-center gap-1.5 flex-wrap">
          {isHalf && <span className="text-[10px] bg-slate-200 text-slate-600 px-1.5 rounded font-mono">½ width</span>}
          {ff.isHidden && <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 rounded">Hidden</span>}
          {ff.isReadonly && <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 rounded">Read only</span>}
          {ff.isRequired && <span className="text-[10px] bg-indigo-100 text-indigo-700 px-1.5 rounded">Required</span>}
          {ruleCount > 0 && (
            <span className="text-[10px] bg-purple-100 text-purple-700 px-1.5 rounded flex items-center gap-0.5">
              <Zap className="w-2.5 h-2.5" />{ruleCount}
            </span>
          )}
        </div>
        <div className="flex items-center gap-0.5">
          {onToggleWidth && (
            <button
              title={isHalf ? "Expand to full width" : "Make half width"}
              onPointerDown={e => e.stopPropagation()}
              onClick={e => { e.stopPropagation(); onToggleWidth(); }}
              className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-500 hover:bg-indigo-50 transition-colors cursor-pointer"
            >
              {isHalf ? <Maximize2 className="w-3.5 h-3.5" /> : <Columns2 className="w-3.5 h-3.5" />}
            </button>
          )}
          <button
            onPointerDown={e => e.stopPropagation()}
            onClick={e => { e.stopPropagation(); onRemove(); }}
            className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Right-edge resize handle — visible on hover and when selected */}
      {onToggleWidth && (
        <div
          className={cn(
            "absolute right-0 top-4 bottom-4 w-3 flex items-center justify-center transition-opacity",
            isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-60",
            isDragging && "opacity-0"
          )}
          title={isHalf ? "Expand to full width" : "Resize to half width"}
          onPointerDown={e => e.stopPropagation()}
          onClick={e => { e.stopPropagation(); onToggleWidth(); }}
          style={{ cursor: "col-resize" }}
        >
          <div className="flex flex-col gap-[3px]">
            <div className="w-[3px] h-4 bg-slate-300 rounded-full hover:bg-indigo-400 transition-colors" />
          </div>
        </div>
      )}
    </div>
  );
}

// ── Field Rules Editor ─────────────────────────────────────────────────────────

const OP_LABELS: Record<RuleOperator, string> = {
  equals: "equals", not_equals: "does not equal", contains: "contains",
  is_empty: "is empty", not_empty: "is not empty", gt: "greater than", lt: "less than",
};
const ACTION_LABELS: Record<RuleAction, string> = {
  show: "Show this field", hide: "Hide this field",
  require: "Make required", unrequire: "Make optional", disable: "Make read-only",
};

function FieldRulesEditor({ ff, formFields, allModuleFields, onUpdate }: {
  ff: any; formFields: any[]; allModuleFields: any[]; onUpdate: (c: any) => void;
}) {
  const logic = parseLogic(ff);
  const rules = logic.rules || [];
  const otherFields = formFields.filter(f => f.id !== ff.id)
    .map(f => ({ ff: f, mf: allModuleFields.find((m: any) => m.id === f.fieldId) })).filter(x => x.mf);
  const save = (newRules: FieldRule[]) => onUpdate({ conditionalLogic: { ...logic, rules: newRules } });
  const addRule = () => save([...rules, { id: `rule-${Date.now()}`, fieldKey: otherFields[0]?.mf?.name || "", operator: "equals", value: "", action: "show" }]);
  const upd = (idx: number, changes: Partial<FieldRule>) => save(rules.map((r, i) => i === idx ? { ...r, ...changes } : r));
  const del = (idx: number) => save(rules.filter((_, i) => i !== idx));
  const needsValue = (op: RuleOperator) => !["is_empty", "not_empty"].includes(op);
  if (otherFields.length === 0) return <div className="text-center py-6 text-xs text-gray-400 border-2 border-dashed rounded-lg">Add more fields to create rules between them.</div>;
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-gray-500">Rules evaluated live as user fills the form.</p>
        <Button size="sm" variant="outline" onClick={addRule} className="h-7 text-xs gap-1"><Plus className="w-3 h-3" /> Add</Button>
      </div>
      {rules.length === 0 ? (
        <div className="text-center py-4 text-xs text-gray-400 border-2 border-dashed border-gray-200 rounded-lg">No rules yet. Click "Add" to create conditional behavior.</div>
      ) : rules.map((rule, idx) => (
        <div key={rule.id} className="p-3 bg-gray-50 rounded-lg border border-gray-200 space-y-2">
          <div className="flex items-center justify-between mb-1">
            <p className="text-[10px] font-semibold text-gray-400 uppercase">Rule {idx + 1}</p>
            <button onClick={() => del(idx)} className="text-gray-300 hover:text-red-500"><Trash2 className="w-3 h-3" /></button>
          </div>
          <div className="space-y-1.5">
            <p className="text-[10px] text-blue-600 font-semibold uppercase">IF</p>
            <Select value={rule.fieldKey} onValueChange={v => upd(idx, { fieldKey: v })}><SelectTrigger className="h-7 text-xs"><SelectValue placeholder="Select field…" /></SelectTrigger><SelectContent>{otherFields.map(({ ff: f, mf }) => <SelectItem key={mf.id ?? mf.name} value={mf.name} className="text-xs">{f.customLabel || mf.label}</SelectItem>)}</SelectContent></Select>
            <Select value={rule.operator} onValueChange={v => upd(idx, { operator: v as RuleOperator })}><SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger><SelectContent>{(Object.keys(OP_LABELS) as RuleOperator[]).map(op => <SelectItem key={op} value={op} className="text-xs">{OP_LABELS[op]}</SelectItem>)}</SelectContent></Select>
            {needsValue(rule.operator) && <Input value={rule.value} onChange={e => upd(idx, { value: e.target.value })} placeholder="Value…" className="h-7 text-xs" />}
          </div>
          <div className="space-y-1.5 pt-1 border-t border-gray-200">
            <p className="text-[10px] text-green-600 font-semibold uppercase">THEN</p>
            <Select value={rule.action} onValueChange={v => upd(idx, { action: v as RuleAction })}><SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger><SelectContent>{(Object.keys(ACTION_LABELS) as RuleAction[]).map(a => <SelectItem key={a} value={a} className="text-xs">{ACTION_LABELS[a]}</SelectItem>)}</SelectContent></Select>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Lookup Auto-Fill Editor ────────────────────────────────────────────────────

function LookupAutoFillEditor({ ff, formFields, allModuleFields, onUpdate }: {
  ff: any; formFields: any[]; allModuleFields: any[]; onUpdate: (c: any) => void;
}) {
  const logic = parseLogic(ff);
  const autoFill = logic.lookupAutoFill || [];
  const otherFields = formFields.filter(f => f.id !== ff.id)
    .map(f => ({ ff: f, mf: allModuleFields.find((m: any) => m.id === f.fieldId) })).filter(x => x.mf);
  const save = (entries: typeof autoFill) => onUpdate({ conditionalLogic: { ...logic, lookupAutoFill: entries } });
  return (
    <div className="space-y-3">
      <p className="text-xs font-medium text-gray-700">CRM Auto-Fill</p>
      <p className="text-xs text-gray-400">When a CRM record is selected, auto-copy its field values into other form fields.</p>
      <div className="space-y-2">
        {autoFill.map((entry, idx) => (
          <div key={idx} className="flex items-center gap-1.5">
            <div className="flex-1 space-y-0.5"><p className="text-[10px] text-gray-400">CRM field name</p><Input value={entry.sourceField} onChange={e => save(autoFill.map((x, i) => i === idx ? { ...x, sourceField: e.target.value } : x))} placeholder="e.g. email" className="h-7 text-xs" /></div>
            <ArrowRight className="w-3.5 h-3.5 text-gray-400 shrink-0 mt-4" />
            <div className="flex-1 space-y-0.5"><p className="text-[10px] text-gray-400">Fill into</p>
              <Select value={entry.targetFieldKey || "_none"} onValueChange={v => save(autoFill.map((x, i) => i === idx ? { ...x, targetFieldKey: v === "_none" ? "" : v } : x))}><SelectTrigger className="h-7 text-xs"><SelectValue placeholder="Target…" /></SelectTrigger><SelectContent><SelectItem value="_none" className="text-xs italic text-gray-400">Select field…</SelectItem>{otherFields.map(({ ff: f, mf }) => <SelectItem key={mf.id ?? mf.name} value={mf.name} className="text-xs">{f.customLabel || mf.label}</SelectItem>)}</SelectContent></Select>
            </div>
            <button onClick={() => save(autoFill.filter((_, i) => i !== idx))} className="text-gray-300 hover:text-red-500 mt-4 shrink-0"><X className="w-3.5 h-3.5" /></button>
          </div>
        ))}
      </div>
      <Button size="sm" variant="outline" onClick={() => save([...autoFill, { sourceField: "", targetFieldKey: "" }])} className="w-full gap-1.5 text-xs"><Plus className="w-3 h-3" /> Add Mapping</Button>
    </div>
  );
}

// ── Standalone Integration Field config ───────────────────────────────────────
// Standalone forms have no Studio/module Field to configure this on, so the
// whole thing (source module, search fields, display field, result columns)
// lives inline, right here, on the CustomFieldDef itself.
function StandaloneIntegrationConfig({ cf, onUpdate }: {
  cf: CustomFieldDef; onUpdate: (c: any) => void;
}) {
  const settings = cf.settings || {};
  const [modules, setModules] = useState<any[]>([]);
  const [targetFields, setTargetFields] = useState<any[]>([]);
  const sourceModuleId = settings.sourceModuleId || "";

  // Fetched on mount — this component only exists while an Integration Field
  // is actually selected, so there's no need for the parent to manage loading it.
  useEffect(() => {
    api.get("/modules").then(r => setModules(r.data || [])).catch(() => setModules([]));
  }, []);

  useEffect(() => {
    if (!sourceModuleId) { setTargetFields([]); return; }
    api.get(`/modules/${sourceModuleId}/fields`).then(r => setTargetFields(r.data || [])).catch(() => setTargetFields([]));
  }, [sourceModuleId]);

  const set = (key: string, value: any) => onUpdate({ settings: { ...settings, [key]: value } });
  const setModule = (modId: string) => onUpdate({ settings: { sourceModuleId: modId, searchFieldIds: [], displayFieldId: "", resultColumnFieldIds: [] } });
  // Auto-default Display Field to the first search field — leaving it unset
  // used to silently show the raw record id as the search result label.
  const setSearchFields = (ids: string[]) => onUpdate({
    settings: { ...settings, searchFieldIds: ids, displayFieldId: settings.displayFieldId || ids[0] || "" },
  });

  const fieldOptions = targetFields.map(f => ({ value: f.id, label: f.label }));

  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Integration Configuration</p>
      <div className="space-y-1.5">
        <Label className="text-xs">Source Module *</Label>
        <Select value={sourceModuleId} onValueChange={setModule}>
          <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select module..." /></SelectTrigger>
          <SelectContent>
            {modules.map(m => (
              <SelectItem key={m.id} value={m.id}>
                <ModuleIcon icon={m.icon} slug={m.slug} className="w-4 h-4 inline-block mr-1 -mt-0.5" /> {m.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {targetFields.length > 0 && (
        <>
          <div className="space-y-1.5">
            <Label className="text-xs">Search Fields</Label>
            <MultiCombobox options={fieldOptions} values={settings.searchFieldIds || []} onChange={setSearchFields} placeholder="Fields users can search by..." />
            <p className="text-xs text-gray-400">e.g. Email, Phone, ID — matched against whatever the user types</p>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Display Field</Label>
            <Select value={settings.displayFieldId || ""} onValueChange={v => set("displayFieldId", v)}>
              <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Field to show as the result label..." /></SelectTrigger>
              <SelectContent>
                {targetFields.map(f => <SelectItem key={f.id} value={f.id}>{f.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Result Columns</Label>
            <MultiCombobox options={fieldOptions} values={settings.resultColumnFieldIds || []} onChange={v => set("resultColumnFieldIds", v)} placeholder="Extra columns shown while searching..." />
          </div>
          <div className="space-y-1.5 pt-2 border-t border-gray-100">
            <Label className="text-xs">Filter Criteria</Label>
            <p className="text-xs text-gray-400">
              Only records matching these conditions are searchable — narrows results before Search Fields are even applied (e.g. Camp = Camp A, when the module has millions of records).
            </p>
            <ConditionTreeBuilder
              root={normalizeConditionTree(settings.filterCriteria) as ConditionGroup}
              group={normalizeConditionTree(settings.filterCriteria) as ConditionGroup}
              fields={targetFields}
              isRoot
              operators={INTEGRATION_FILTER_OPERATORS}
              noValueOperators={INTEGRATION_FILTER_NO_VALUE_OPS}
              loadDynamicOptions={() => {}}
              dynamicOptions={{}}
              onChange={tree => set("filterCriteria", tree)}
            />
          </div>
          <div className="flex items-center justify-between gap-3 pt-2 border-t border-gray-100">
            <div>
              <Label className="text-xs">Allow manual selection to update the CRM record</Label>
              <p className="text-xs text-gray-400 mt-0.5">
                Off by default. When on, submitting this form also pushes the mapped values back into whatever record the visitor searched for and picked — not just other fields on this form. Only enable this if you're comfortable with any submitter being able to search for and update a record this way.
              </p>
            </div>
            <Switch checked={!!settings.allowManualUpdate} onCheckedChange={v => set("allowManualUpdate", v)} />
          </div>
        </>
      )}
      <p className="text-xs text-gray-400 pt-1 border-t border-gray-100">
        Set up which fields on this form get prefilled in the "Mappings" tab above.
      </p>
    </div>
  );
}

function IntegrationMappingEditor({ ff, formFields, allModuleFields, customFieldDefs, isStandalone, onUpdate }: {
  ff: any; formFields: any[]; allModuleFields: any[]; customFieldDefs: any[]; isStandalone: boolean; onUpdate: (c: any) => void;
}) {
  // Standalone: this field IS its own config holder (Form.settings.customFields
  // entry) — no module Field, no FormField row, no conditionalLogic wrapper.
  const cf = isStandalone ? customFieldDefs.find(c => c.id === ff.id) : null;
  const logic = isStandalone ? null : parseLogic(ff);
  const mappings: { sourceFieldId: string; destinationFormFieldId: string; behavior: "UPDATE_EXISTING" | "FILL_IF_EMPTY" }[] =
    isStandalone ? (cf?.integrationMappings || []) : (logic?.integrationMappings || []);

  const integrationField = isStandalone ? null : allModuleFields.find((m: any) => m.id === ff.fieldId);
  const sourceModuleId = isStandalone
    ? (cf?.settings?.sourceModuleId || "")
    : ((integrationField?.settings || {}).sourceModuleId || "");
  const [sourceFields, setSourceFields] = useState<any[]>([]);

  useEffect(() => {
    if (!sourceModuleId) { setSourceFields([]); return; }
    api.get(`/modules/${sourceModuleId}/fields`).then(r => setSourceFields(r.data || [])).catch(() => setSourceFields([]));
  }, [sourceModuleId]);

  const otherFields = isStandalone
    ? customFieldDefs.filter(c => c.id !== ff.id).map(c => ({ id: c.id, label: c.label }))
    : formFields.filter(f => f.id !== ff.id)
        .map(f => ({ ff: f, mf: allModuleFields.find((m: any) => m.id === f.fieldId) })).filter(x => x.mf)
        .map(({ ff: f, mf }) => ({ id: f.id, label: f.customLabel || mf.label }));

  const save = (entries: typeof mappings) =>
    isStandalone ? onUpdate({ integrationMappings: entries }) : onUpdate({ conditionalLogic: { ...logic, integrationMappings: entries } });

  if (!sourceModuleId) {
    return (
      <p className="text-xs text-gray-400">
        {isStandalone
          ? "Set this field's Source Module in the Configuration section above, then come back to configure mappings."
          : "Set this field's Source Module in Studio first, then come back to configure mappings."}
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-xs font-medium text-gray-700">Field Mappings</p>
      <p className="text-xs text-gray-400">When a record is selected, copy its field values into other fields on this form.</p>
      <div className="space-y-2">
        {mappings.map((entry, idx) => (
          <div key={idx} className="p-2 rounded-lg border border-gray-100 bg-gray-50/50 space-y-1.5">
            <div className="flex items-center gap-1.5">
              <Select value={entry.sourceFieldId || "_none"} onValueChange={v => save(mappings.map((x, i) => i === idx ? { ...x, sourceFieldId: v === "_none" ? "" : v } : x))}>
                <SelectTrigger className="h-7 text-xs flex-1"><SelectValue placeholder="Source field…" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none" className="text-xs italic text-gray-400">Select field…</SelectItem>
                  {sourceFields.map(f => <SelectItem key={f.id} value={f.id} className="text-xs">{f.label}</SelectItem>)}
                </SelectContent>
              </Select>
              <ArrowRight className="w-3.5 h-3.5 text-gray-400 shrink-0" />
              <Select value={entry.destinationFormFieldId || "_none"} onValueChange={v => save(mappings.map((x, i) => i === idx ? { ...x, destinationFormFieldId: v === "_none" ? "" : v } : x))}>
                <SelectTrigger className="h-7 text-xs flex-1"><SelectValue placeholder="Fill into…" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none" className="text-xs italic text-gray-400">Select field…</SelectItem>
                  {otherFields.map(f => <SelectItem key={f.id} value={f.id} className="text-xs">{f.label}</SelectItem>)}
                </SelectContent>
              </Select>
              <button onClick={() => save(mappings.filter((_, i) => i !== idx))} className="text-gray-300 hover:text-red-500 shrink-0"><X className="w-3.5 h-3.5" /></button>
            </div>
            <div className="flex items-center gap-3 pl-0.5">
              <label className="flex items-center gap-1 text-[10px] text-gray-500 cursor-pointer">
                <input type="radio" checked={(entry.behavior || "FILL_IF_EMPTY") === "FILL_IF_EMPTY"}
                  onChange={() => save(mappings.map((x, i) => i === idx ? { ...x, behavior: "FILL_IF_EMPTY" } : x))} />
                Fill only if empty
              </label>
              <label className="flex items-center gap-1 text-[10px] text-gray-500 cursor-pointer">
                <input type="radio" checked={entry.behavior === "UPDATE_EXISTING"}
                  onChange={() => save(mappings.map((x, i) => i === idx ? { ...x, behavior: "UPDATE_EXISTING" } : x))} />
                Always overwrite
              </label>
            </div>
          </div>
        ))}
      </div>
      <Button size="sm" variant="outline" onClick={() => save([...mappings, { sourceFieldId: "", destinationFormFieldId: "", behavior: "FILL_IF_EMPTY" as const }])} className="w-full gap-1.5 text-xs"><Plus className="w-3 h-3" /> Add Mapping</Button>
    </div>
  );
}

// ── Form Rule Engine ──────────────────────────────────────────────────────────

const FORM_RULE_OPS = [
  { value: "equals", label: "equals" }, { value: "not_equals", label: "does not equal" },
  { value: "contains", label: "contains" }, { value: "is_empty", label: "is empty" },
  { value: "not_empty", label: "is not empty" }, { value: "gt", label: "greater than" }, { value: "lt", label: "less than" },
];
const FORM_RULE_ACTIONS: { value: FormRuleActionType; label: string; hasTarget: boolean; hasValue: boolean; targetType: "field" | "section" | "none" }[] = [
  { value: "show_field",      label: "Show field",          hasTarget: true,  hasValue: false, targetType: "field"   },
  { value: "hide_field",      label: "Hide field",          hasTarget: true,  hasValue: false, targetType: "field"   },
  { value: "require_field",   label: "Make required",       hasTarget: true,  hasValue: false, targetType: "field"   },
  { value: "unrequire_field", label: "Make optional",       hasTarget: true,  hasValue: false, targetType: "field"   },
  { value: "enable_field",    label: "Enable field",        hasTarget: true,  hasValue: false, targetType: "field"   },
  { value: "disable_field",   label: "Disable field",       hasTarget: true,  hasValue: false, targetType: "field"   },
  { value: "show_section",    label: "Show section",        hasTarget: true,  hasValue: false, targetType: "section" },
  { value: "hide_section",    label: "Hide section",        hasTarget: true,  hasValue: false, targetType: "section" },
  { value: "set_value",       label: "Auto-fill value",     hasTarget: true,  hasValue: true,  targetType: "field"   },
  { value: "show_message",    label: "Show message",        hasTarget: false, hasValue: true,  targetType: "none"    },
  { value: "block_submit",    label: "Block submission",    hasTarget: false, hasValue: true,  targetType: "none"    },
];

function FormRuleEngine({ formFields, allModuleFields, sections, settings, onSettingsChange, onSave, saving }: {
  formFields: any[]; allModuleFields: any[]; sections: any[]; settings: any;
  onSettingsChange: (u: any) => void; onSave: () => Promise<void>; saving: boolean;
}) {
  const rules: FormRule[] = settings.formRules || [];
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const setRules = (next: FormRule[]) => onSettingsChange({ formRules: next });
  const handleAddRule = () => {
    const r: FormRule = { id: newUid(), name: `Rule ${rules.length + 1}`, enabled: true, conditionsLogic: "AND", conditions: [], actions: [] };
    setRules([...rules, r]); setEditingRuleId(r.id);
  };
  const delRule = (rid: string) => { setRules(rules.filter(r => r.id !== rid)); if (editingRuleId === rid) setEditingRuleId(null); };
  const updRule = (rid: string, c: Partial<FormRule>) => setRules(rules.map(r => r.id === rid ? { ...r, ...c } : r));
  const handleSave = async () => {
    try { await onSave(); setToastMsg({ text: "Saved", ok: true }); setEditingRuleId(null); }
    catch { setToastMsg({ text: "Save failed", ok: false }); }
    setTimeout(() => setToastMsg(null), 3000);
  };
  const fieldOptions = formFields.map(ff => {
    const mf = allModuleFields.find((m: any) => m.id === ff.fieldId);
    return { key: (mf?.name || ff.fieldId) as string, label: (ff.customLabel || mf?.label || ff.fieldId) as string, type: (mf?.type || "TEXT") as string, options: (mf?.options || []) as { value: string; label: string }[] };
  });
  const needsVal = (op: string) => !["is_empty", "not_empty"].includes(op);
  const er = editingRuleId ? rules.find(r => r.id === editingRuleId) ?? null : null;
  if (!er) return (
    <ScrollArea className="h-full">
      <div className="p-6 max-w-3xl mx-auto space-y-4">
        {toastMsg && <div className={cn("flex items-center gap-2 px-4 py-3 rounded-lg text-sm font-medium border", toastMsg.ok ? "bg-green-50 text-green-700 border-green-200" : "bg-red-50 text-red-700 border-red-200")}><CheckCircle2 className="w-4 h-4 shrink-0" /> {toastMsg.text}</div>}
        <div className="flex items-center justify-between"><div><h2 className="text-base font-semibold">Form Rules</h2><p className="text-xs text-gray-400 mt-0.5">Fire instantly as users fill the form.</p></div><Button size="sm" onClick={handleAddRule} className="gap-1.5"><Plus className="w-3.5 h-3.5" /> Add Rule</Button></div>
        {rules.length === 0 ? <div className="border-2 border-dashed border-gray-200 rounded-xl p-12 text-center"><Zap className="w-10 h-10 text-gray-300 mx-auto mb-3" /><p className="text-sm font-medium text-gray-500">No rules yet</p><Button size="sm" variant="outline" onClick={handleAddRule} className="mt-4 gap-1.5"><Plus className="w-3.5 h-3.5" /> Create First Rule</Button></div>
        : <div className="space-y-2">{rules.map(rule => (
          <div key={rule.id} className="flex items-center justify-between gap-3 p-3.5 bg-white border rounded-xl shadow-sm">
            <div className="flex items-center gap-3 min-w-0 flex-1"><Switch checked={rule.enabled} onCheckedChange={v => updRule(rule.id, { enabled: v })} className="shrink-0" /><div className="min-w-0"><p className="text-sm font-medium truncate" title={rule.name}>{rule.name}</p><p className="text-xs text-gray-400">{rule.conditions.length} cond · {rule.actions.length} action</p></div></div>
            <div className="flex items-center gap-1.5 shrink-0"><Button size="sm" variant="ghost" onClick={() => setEditingRuleId(rule.id)} className="h-8 text-xs">Edit</Button><button onClick={() => delRule(rule.id)} className="text-gray-300 hover:text-red-500 p-1"><Trash2 className="w-3.5 h-3.5" /></button></div>
          </div>
        ))}</div>}
      </div>
    </ScrollArea>
  );
  const conds = er.conditions; const acts = er.actions;
  return (
    <ScrollArea className="h-full">
      <div className="p-6 max-w-2xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <button onClick={() => setEditingRuleId(null)} className="text-gray-400 hover:text-gray-600"><ChevronRight className="w-4 h-4 rotate-180" /></button>
          <input value={er.name} onChange={e => updRule(er.id, { name: e.target.value })} className="text-base font-semibold bg-transparent border-0 outline-none flex-1" />
          <Switch checked={er.enabled} onCheckedChange={v => updRule(er.id, { enabled: v })} />
          <Button size="sm" onClick={handleSave} disabled={saving} className="gap-1.5">{saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />} Save</Button>
        </div>
        <div className="space-y-3">
          <div className="flex items-center gap-2 mb-2"><p className="text-xs font-semibold text-blue-600 uppercase">When</p><Select value={er.conditionsLogic} onValueChange={v => updRule(er.id, { conditionsLogic: v as "AND" | "OR" })}><SelectTrigger className="h-6 text-xs w-16 px-1.5"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="AND" className="text-xs">ALL</SelectItem><SelectItem value="OR" className="text-xs">ANY</SelectItem></SelectContent></Select><p className="text-xs text-gray-400">conditions match:</p></div>
          {conds.map((cond, ci) => {
            const selField = fieldOptions.find(f => f.key === cond.fieldKey);
            const isOpt = OPTION_BEARING_TYPES.includes(selField?.type || "");
            return (
              <div key={cond.id} className="flex items-start gap-2 p-3 bg-blue-50/60 border border-blue-100 rounded-xl">
                <div className="flex-1 grid grid-cols-3 gap-2">
                  <Select value={cond.fieldKey || "_none"} onValueChange={v => updRule(er.id, { conditions: conds.map((c, i) => i === ci ? { ...c, fieldKey: v === "_none" ? "" : v } : c) })}><SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Field…" /></SelectTrigger><SelectContent><SelectItem value="_none" className="text-xs italic text-gray-400">Select field…</SelectItem>{fieldOptions.map(f => <SelectItem key={f.key} value={f.key} className="text-xs">{f.label}</SelectItem>)}</SelectContent></Select>
                  <Select value={cond.operator || "equals"} onValueChange={v => updRule(er.id, { conditions: conds.map((c, i) => i === ci ? { ...c, operator: v, value: "" } : c) })}><SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger><SelectContent>{FORM_RULE_OPS.map(op => <SelectItem key={op.value} value={op.value} className="text-xs">{op.label}</SelectItem>)}</SelectContent></Select>
                  {needsVal(cond.operator) && (isOpt && selField?.options?.length ? <Select value={cond.value || "_none"} onValueChange={v => updRule(er.id, { conditions: conds.map((c, i) => i === ci ? { ...c, value: v === "_none" ? "" : v } : c) })}><SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Value…" /></SelectTrigger><SelectContent><SelectItem value="_none" className="text-xs italic text-gray-400">Select…</SelectItem>{selField.options.map(o => <SelectItem key={o.value} value={o.value} className="text-xs">{o.label}</SelectItem>)}</SelectContent></Select> : <Input value={cond.value || ""} onChange={e => updRule(er.id, { conditions: conds.map((c, i) => i === ci ? { ...c, value: e.target.value } : c) })} placeholder="Value…" className="h-8 text-xs" />)}
                </div>
                <button onClick={() => updRule(er.id, { conditions: conds.filter((_, i) => i !== ci) })} className="text-blue-300 hover:text-red-500 mt-1.5 shrink-0"><X className="w-3.5 h-3.5" /></button>
              </div>
            );
          })}
          <button onClick={() => updRule(er.id, { conditions: [...conds, { id: newUid(), fieldKey: "", operator: "equals", value: "" }] })} className="text-xs text-blue-600 flex items-center gap-1"><Plus className="w-3 h-3" /> Add Condition</button>
        </div>
        <div className="space-y-3">
          <p className="text-xs font-semibold text-green-600 uppercase mb-2">Then Do</p>
          {acts.map((act, ai) => {
            const def = FORM_RULE_ACTIONS.find(a => a.value === act.type);
            return (
              <div key={act.id} className="flex items-start gap-2 p-3 bg-green-50/60 border border-green-100 rounded-xl">
                <div className="flex-1 grid grid-cols-2 gap-2">
                  <Select value={act.type} onValueChange={v => updRule(er.id, { actions: acts.map((a, i) => i === ai ? { ...a, type: v as FormRuleActionType, target: "", value: "" } : a) })}><SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger><SelectContent>{FORM_RULE_ACTIONS.map(a => <SelectItem key={a.value} value={a.value} className="text-xs">{a.label}</SelectItem>)}</SelectContent></Select>
                  {def?.hasTarget && def.targetType === "field" && <Select value={act.target || "_none"} onValueChange={v => updRule(er.id, { actions: acts.map((a, i) => i === ai ? { ...a, target: v === "_none" ? "" : v } : a) })}><SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Target field…" /></SelectTrigger><SelectContent><SelectItem value="_none" className="text-xs italic text-gray-400">Select field…</SelectItem>{fieldOptions.map(f => <SelectItem key={f.key} value={f.key} className="text-xs">{f.label}</SelectItem>)}</SelectContent></Select>}
                  {def?.hasTarget && def.targetType === "section" && <Select value={act.target || "_none"} onValueChange={v => updRule(er.id, { actions: acts.map((a, i) => i === ai ? { ...a, target: v === "_none" ? "" : v } : a) })}><SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Target section…" /></SelectTrigger><SelectContent><SelectItem value="_none" className="text-xs italic text-gray-400">Select section…</SelectItem>{sections.map(s => <SelectItem key={s.id} value={s.id} className="text-xs">{s.label}</SelectItem>)}</SelectContent></Select>}
                  {def?.hasValue && <Input value={act.value || ""} onChange={e => updRule(er.id, { actions: acts.map((a, i) => i === ai ? { ...a, value: e.target.value } : a) })} placeholder="Value…" className="h-8 text-xs" />}
                </div>
                <button onClick={() => updRule(er.id, { actions: acts.filter((_, i) => i !== ai) })} className="text-green-300 hover:text-red-500 mt-1.5 shrink-0"><X className="w-3.5 h-3.5" /></button>
              </div>
            );
          })}
          <button onClick={() => updRule(er.id, { actions: [...acts, { id: newUid(), type: "show_field", target: "" }] })} className="text-xs text-green-600 flex items-center gap-1"><Plus className="w-3 h-3" /> Add Action</button>
        </div>
      </div>
    </ScrollArea>
  );
}

// ── Form Settings Panel ────────────────────────────────────────────────────────

type SettingsSection = "design" | "schedule" | "style" | "submit" | "integrations" | "documents" | "ticketing";

const FORM_THEMES = [
  { id: "indigo",   name: "Indigo",   headerBg: "#4338ca", gradTo: "#6366f1", bgType: "gradient", textColor: "#ffffff", bodyColor: "#1f2937", pageBg: "#f8fafc", accent: "#4f46e5" },
  { id: "ocean",    name: "Ocean",    headerBg: "#0369a1", gradTo: "#0ea5e9", bgType: "gradient", textColor: "#ffffff", bodyColor: "#0f172a", pageBg: "#f0f9ff", accent: "#0284c7" },
  { id: "forest",   name: "Forest",   headerBg: "#166534", gradTo: "#22c55e", bgType: "gradient", textColor: "#ffffff", bodyColor: "#1c1917", pageBg: "#f0fdf4", accent: "#16a34a" },
  { id: "sunset",   name: "Sunset",   headerBg: "#be185d", gradTo: "#f43f5e", bgType: "gradient", textColor: "#ffffff", bodyColor: "#1c1917", pageBg: "#fff1f2", accent: "#e11d48" },
  { id: "midnight", name: "Midnight", headerBg: "#0f172a", gradTo: "#312e81", bgType: "gradient", textColor: "#e2e8f0", bodyColor: "#0f172a", pageBg: "#f8fafc", accent: "#7c3aed" },
  { id: "minimal",  name: "Minimal",  headerBg: "#f1f5f9", gradTo: "#e2e8f0", bgType: "solid",    textColor: "#1e293b", bodyColor: "#374151", pageBg: "#ffffff",  accent: "#2563eb" },
] as const;

function FormSettingsPanel({ form, settings, onSettingsChange, onSave, saving, allModuleFields }: {
  form: any; settings: any; onSettingsChange: (u: any) => void; onSave: () => void; saving: boolean;
  allModuleFields: any[];
}) {
  const [section, setSection] = useState<SettingsSection>("design");
  const set = (k: string, v: any) => onSettingsChange({ [k]: v });
  const setN = (root: string, k: string, v: any) => onSettingsChange({ [root]: { ...(settings[root] || {}), [k]: v } });
  const applyTheme = (t: typeof FORM_THEMES[number]) => {
    onSettingsChange({
      style:  { ...(settings.style  || {}), bodyColor: t.bodyColor, pageBg: t.pageBg, accentColor: t.accent },
      header: { ...(settings.header || {}), bgColor: t.headerBg, bgGradientTo: t.gradTo, bgType: t.bgType, textColor: t.textColor },
    });
  };
  const hdr = settings.header || {};
  const ps  = settings.postSubmit || {};
  const sty = settings.style || {};
  const gs  = settings.googleSheet || {};
  const postSubmitAction = resolvePostSubmitAction(settings);

  // ── Google connection state ───────────────────────────────────────────────────
  const [googleConnected, setGoogleConnected]     = useState<boolean | null>(null);
  const [googleConnecting, setGoogleConnecting]   = useState(false);

  // Check connection status when entering integrations tab
  useEffect(() => {
    if (section !== 'integrations' || googleConnected !== null) return;
    api.get('/calendar-sync/status').then(r => setGoogleConnected(!!r.data?.isConnected)).catch(() => setGoogleConnected(false));
  }, [section]);

  // Handle ?google_connected=true redirect back from OAuth
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    if (params.get('google_connected') === 'true') {
      setGoogleConnected(true);
      setSheetList([]);
      // Clean the query param without page reload
      const url = new URL(window.location.href);
      url.searchParams.delete('google_connected');
      window.history.replaceState({}, '', url.toString());
    }
  }, []);

  const connectGoogle = async () => {
    setGoogleConnecting(true);
    try {
      const returnTo = window.location.pathname + window.location.search;
      const { data } = await api.get(`/calendar-sync/auth/url?returnTo=${encodeURIComponent(returnTo)}`);
      window.location.href = data.url;
    } catch {
      setGoogleConnecting(false);
    }
  };

  // ── Google Sheets picker state ────────────────────────────────────────────────
  const [sheetPickerOpen, setSheetPickerOpen]   = useState(false);
  const [sheetList, setSheetList]               = useState<{ id: string; name: string; modifiedTime: string }[]>([]);
  const [sheetListLoading, setSheetListLoading] = useState(false);
  const [sheetListError, setSheetListError]     = useState<string | null>(null);
  const [sheetSearch, setSheetSearch]           = useState('');
  const [sheetTabs, setSheetTabs]               = useState<string[]>([]);
  const [sheetTabsLoading, setSheetTabsLoading] = useState(false);
  const [newSheetName, setNewSheetName]         = useState('');
  const [creatingSheet, setCreatingSheet]       = useState(false);

  const openSheetPicker = async () => {
    setSheetPickerOpen(true);
    setSheetListError(null);
    if (sheetList.length > 0) return;
    setSheetListLoading(true);
    try {
      const { data } = await api.get('/calendar-sync/sheets');
      setSheetList(data);
    } catch (err: any) {
      setSheetListError(err?.response?.data?.message ?? 'Could not load your Google Sheets.');
      setSheetPickerOpen(false);
    } finally {
      setSheetListLoading(false);
    }
  };

  const selectSheet = async (sheet: { id: string; name: string }) => {
    setSheetPickerOpen(false);
    onSettingsChange({ googleSheet: { ...(settings.googleSheet || {}), spreadsheetId: sheet.id, spreadsheetName: sheet.name, tabName: '' } });
    setSheetTabsLoading(true);
    try {
      const { data } = await api.get(`/calendar-sync/sheets/${sheet.id}/tabs`);
      setSheetTabs(data);
    } catch { setSheetTabs([]); }
    finally { setSheetTabsLoading(false); }
  };

  const createNewSheet = async () => {
    if (!newSheetName.trim()) return;
    setCreatingSheet(true);
    try {
      const { data } = await api.post('/calendar-sync/sheets', { title: newSheetName.trim() });
      await selectSheet(data);
      setSheetList(prev => [{ id: data.id, name: data.name, modifiedTime: new Date().toISOString() }, ...prev]);
      setNewSheetName('');
    } catch (err: any) {
      setSheetListError(err?.response?.data?.message ?? 'Failed to create sheet.');
    } finally {
      setCreatingSheet(false);
    }
  };

  // Load tabs when settings already have a spreadsheetId (e.g. re-opening settings)
  const prevSpreadsheetId = useRef<string>('');
  useEffect(() => {
    const id = gs.spreadsheetId;
    if (id && id !== prevSpreadsheetId.current && sheetTabs.length === 0) {
      prevSpreadsheetId.current = id;
      api.get(`/calendar-sync/sheets/${id}/tabs`).then(r => setSheetTabs(r.data)).catch(() => {});
    }
  }, [gs.spreadsheetId]);

  const tabs: { key: SettingsSection; label: string; desc: string; icon: React.ElementType; accent: string; bg: string; border: string }[] = [
    { key: "design",   label: "Branding",    desc: "Logo, banner & header",    icon: Palette,      accent: "text-violet-700", bg: "bg-violet-50",  border: "border-violet-200" },
    { key: "style",    label: "Style",        desc: "Fonts, colors & layout",   icon: Type,         accent: "text-orange-700", bg: "bg-orange-50",  border: "border-orange-200" },
    { key: "schedule", label: "Availability", desc: "Schedule & limits",        icon: Calendar,     accent: "text-blue-700",   bg: "bg-blue-50",    border: "border-blue-200"   },
    { key: "submit",       label: "Submission",    desc: "After submit behavior",    icon: CheckCircle2,    accent: "text-green-700",  bg: "bg-green-50",    border: "border-green-200"  },
    { key: "integrations", label: "Integrations",  desc: "Google Sheets & more",     icon: FileSpreadsheet, accent: "text-teal-700",   bg: "bg-teal-50",     border: "border-teal-200"   },
    { key: "documents",    label: "OCR Upload",         desc: "Auto-fill from document",      icon: ScanSearch,  accent: "text-sky-700",    bg: "bg-sky-50",      border: "border-sky-200"    },
    { key: "ticketing",    label: "Submission Receipt", desc: "Printable receipt on submit",  icon: Ticket,      accent: "text-amber-700",  bg: "bg-amber-50",    border: "border-amber-200"  },
  ];

  const activeTab = tabs.find(t => t.key === section)!;

  /* live header preview helper */
  const previewBg = hdr.bgType === "gradient"
    ? `linear-gradient(${hdr.gradientAngle ?? 135}deg, ${hdr.bgColor || "#4338ca"}, ${hdr.bgGradientTo || "#6366f1"})`
    : (hdr.bgColor || "#4338ca");
  const logoSizeClass: Record<string, string> = { sm: "h-8", md: "h-12", lg: "h-16" };
  const logoClass = logoSizeClass[hdr.logoSize || "md"] || "h-12";
  const isLogoLeft = (hdr.logoPosition || "center") === "left" && !!hdr.logoUrl;

  return (
    <div style={{ display: "flex", width: "100%", height: "100%", background: "#f8fafc", overflow: "hidden" }}>

      {/* ── Left sidebar nav ── */}
      <div style={{ width: 220, flexShrink: 0, background: "#ffffff", borderRight: "1px solid #e5e7eb", display: "flex", flexDirection: "column", padding: "16px 8px", gap: 4, overflow: "hidden" }}>
        <p className="px-3 pb-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">Form Settings</p>
        {tabs.map(tab => {
          const isActive = section === tab.key;
          return (
            <button key={tab.key} onClick={() => setSection(tab.key)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-3 rounded-xl text-left transition-all duration-150",
                isActive ? `${tab.bg} ${tab.border} border` : "hover:bg-slate-50 border border-transparent"
              )}>
              <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0", isActive ? tab.bg : "bg-slate-100")}>
                <tab.icon className={cn("w-4 h-4", isActive ? tab.accent : "text-slate-400")} />
              </div>
              <div className="min-w-0">
                <p className={cn("text-sm font-semibold leading-tight", isActive ? tab.accent : "text-slate-700")}>{tab.label}</p>
                <p className="text-[10px] text-slate-400 leading-tight mt-0.5 truncate">{tab.desc}</p>
              </div>
            </button>
          );
        })}

        <div className="flex-1" />
        <div className="px-2 pt-2 border-t border-slate-100">
          <Button onClick={onSave} disabled={saving} className="w-full gap-2 text-sm">
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            Save Settings
          </Button>
        </div>
      </div>

      {/* ── Main content ── */}
      <div style={{ flex: 1, display: "flex", minHeight: 0, overflow: "hidden" }}>
        <ScrollArea className="flex-1 h-full">
          <div style={{ padding: "32px 40px" }}>

            {/* ── DESIGN (Branding) ── */}
            {section === "design" && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-base font-bold text-slate-800">Branding</h2>
                  <p className="text-xs text-slate-500 mt-0.5">Customise the header that appears at the top of your form</p>
                </div>

                {/* Live preview — full width */}
                <div className="rounded-2xl overflow-hidden border border-slate-200 shadow-sm">
                  {hdr.bannerUrl && (
                    <div className="w-full bg-slate-100 flex items-center justify-center" style={{ minHeight: 120 }}>
                      <img src={hdr.bannerUrl} alt="Banner"
                        className="w-full"
                        style={{ display: "block", maxHeight: 200, objectFit: "contain" }}
                        onError={e => { (e.target as any).parentElement.style.display = "none"; }} />
                    </div>
                  )}
                  <div className="px-8 py-6" style={{ background: previewBg, color: hdr.textColor || "#FFFFFF" }}>
                    {isLogoLeft ? (
                      <div className="flex items-center gap-4">
                        <img src={hdr.logoUrl} alt="Logo"
                          style={{ objectFit: "contain", maxHeight: 64 }}
                          className={logoClass}
                          onError={e => { (e.target as any).style.display = "none"; }} />
                        <div style={{ textAlign: (hdr.alignment || "left") as any }}>
                          <p className="font-bold text-lg leading-tight">{hdr.title || form?.name || "Form Title"}</p>
                          {hdr.subtitle && <p className="text-sm opacity-75 mt-1">{hdr.subtitle}</p>}
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col"
                        style={{ textAlign: (hdr.alignment || "center") as any, alignItems: hdr.alignment === "left" ? "flex-start" : hdr.alignment === "right" ? "flex-end" : "center" }}>
                        {hdr.logoUrl && (
                          <img src={hdr.logoUrl} alt="Logo"
                            style={{ objectFit: "contain", maxHeight: 64 }}
                            className={cn(logoClass, "mb-3")}
                            onError={e => { (e.target as any).style.display = "none"; }} />
                        )}
                        <p className="font-bold text-lg leading-tight">{hdr.title || form?.name || "Form Title"}</p>
                        {hdr.subtitle && <p className="text-sm opacity-75 mt-1">{hdr.subtitle}</p>}
                      </div>
                    )}
                  </div>
                </div>

                {/* Controls in a 2-col grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Left column */}
                  <div className="space-y-4">
                    <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-4">
                      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Header Text</p>
                      <div className="space-y-3">
                        <div className="space-y-1.5">
                          <Label className="text-xs font-medium">Title</Label>
                          <Input value={hdr.title || ""} onChange={e => setN("header", "title", e.target.value)} placeholder={form?.name || "Form Title"} className="h-9 text-sm" />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs font-medium">Subtitle</Label>
                          <Input value={hdr.subtitle || ""} onChange={e => setN("header", "subtitle", e.target.value)} placeholder="Optional tagline…" className="h-9 text-sm" />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs font-medium">Text Alignment</Label>
                          <div className="flex gap-1.5">
                            {(["left", "center", "right"] as const).map(pos => (
                              <button key={pos} onClick={() => setN("header", "alignment", pos)}
                                className={cn("flex-1 flex items-center justify-center gap-1 h-9 rounded-lg border text-xs font-medium transition-all",
                                  (hdr.alignment || "center") === pos ? "border-violet-400 bg-violet-50 text-violet-700" : "border-slate-200 text-slate-500 hover:border-slate-300")}>
                                {pos === "left" && <AlignLeftIcon className="w-3.5 h-3.5" />}
                                {pos === "center" && <AlignCenter className="w-3.5 h-3.5" />}
                                {pos === "right" && <AlignRight className="w-3.5 h-3.5" />}
                                {pos.charAt(0).toUpperCase() + pos.slice(1)}
                              </button>
                            ))}
                          </div>
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs font-medium">Text Color</Label>
                          <div className="flex gap-2">
                            <input type="color" value={hdr.textColor || "#FFFFFF"} onChange={e => setN("header", "textColor", e.target.value)} className="w-10 h-9 rounded-lg border cursor-pointer p-0.5 shrink-0" />
                            <Input value={hdr.textColor || "#FFFFFF"} onChange={e => setN("header", "textColor", e.target.value)} className="h-9 text-xs font-mono" />
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-4">
                      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Banner Image</p>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium">Image URL (.png, .jpg, .svg)</Label>
                        <Input value={hdr.bannerUrl || ""} onChange={e => setN("header", "bannerUrl", e.target.value)} placeholder="https://…/banner.png" className="h-9 text-sm" />
                        <p className="text-[10px] text-slate-400">Image will display at full width above the header. PNG files keep their transparency.</p>
                      </div>
                    </div>
                  </div>

                  {/* Right column */}
                  <div className="space-y-4">
                    <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-4">
                      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Logo</p>
                      <div className="space-y-3">
                        <div className="space-y-1.5">
                          <Label className="text-xs font-medium">Logo URL (.png, .svg)</Label>
                          <Input value={hdr.logoUrl || ""} onChange={e => setN("header", "logoUrl", e.target.value)} placeholder="https://…/logo.png" className="h-9 text-sm" />
                          <p className="text-[10px] text-slate-400">PNG with transparent background recommended</p>
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs font-medium">Logo Position</Label>
                          <div className="flex gap-1.5">
                            {(["left", "center", "right"] as const).map(pos => (
                              <button key={pos} onClick={() => setN("header", "logoPosition", pos)}
                                className={cn("flex-1 flex items-center justify-center gap-1 h-9 rounded-lg border text-xs font-medium transition-all",
                                  (hdr.logoPosition || "center") === pos ? "border-violet-400 bg-violet-50 text-violet-700" : "border-slate-200 text-slate-500 hover:border-slate-300")}>
                                {pos === "left" && <AlignLeftIcon className="w-3.5 h-3.5" />}
                                {pos === "center" && <AlignCenter className="w-3.5 h-3.5" />}
                                {pos === "right" && <AlignRight className="w-3.5 h-3.5" />}
                                {pos.charAt(0).toUpperCase() + pos.slice(1)}
                              </button>
                            ))}
                          </div>
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs font-medium">Logo Size</Label>
                          <div className="flex gap-1.5">
                            {(["sm", "md", "lg"] as const).map(sz => (
                              <button key={sz} onClick={() => setN("header", "logoSize", sz)}
                                className={cn("flex-1 h-9 rounded-lg border text-xs font-semibold transition-all",
                                  (hdr.logoSize || "md") === sz ? "border-violet-400 bg-violet-50 text-violet-700" : "border-slate-200 text-slate-500 hover:border-slate-300")}>
                                {sz === "sm" ? "Small" : sz === "md" ? "Medium" : "Large"}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-4">
                      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Background</p>
                      <div className="space-y-3">
                        <div className="flex gap-1.5">
                          {(["solid", "gradient"] as const).map(t => (
                            <button key={t} onClick={() => setN("header", "bgType", t)}
                              className={cn("flex-1 py-2 rounded-lg text-xs font-semibold border transition-all",
                                (hdr.bgType || "solid") === t ? "border-violet-400 bg-violet-50 text-violet-700" : "border-slate-200 text-slate-500 hover:border-slate-300")}>
                              {t === "solid" ? "Solid Color" : "Gradient"}
                            </button>
                          ))}
                        </div>
                        <div className={cn("grid gap-3", hdr.bgType === "gradient" ? "grid-cols-2" : "grid-cols-1")}>
                          <div className="space-y-1.5">
                            <Label className="text-xs font-medium">{hdr.bgType === "gradient" ? "From" : "Color"}</Label>
                            <div className="flex gap-2">
                              <input type="color" value={hdr.bgColor || "#4338ca"} onChange={e => setN("header", "bgColor", e.target.value)} className="w-10 h-9 rounded-lg border cursor-pointer p-0.5 shrink-0" />
                              <Input value={hdr.bgColor || "#4338ca"} onChange={e => setN("header", "bgColor", e.target.value)} className="h-9 text-xs font-mono" />
                            </div>
                          </div>
                          {hdr.bgType === "gradient" && (
                            <div className="space-y-1.5">
                              <Label className="text-xs font-medium">To</Label>
                              <div className="flex gap-2">
                                <input type="color" value={hdr.bgGradientTo || "#6366f1"} onChange={e => setN("header", "bgGradientTo", e.target.value)} className="w-10 h-9 rounded-lg border cursor-pointer p-0.5 shrink-0" />
                                <Input value={hdr.bgGradientTo || "#6366f1"} onChange={e => setN("header", "bgGradientTo", e.target.value)} className="h-9 text-xs font-mono" />
                              </div>
                            </div>
                          )}
                        </div>
                        {hdr.bgType === "gradient" && (
                          <div className="space-y-1.5">
                            <Label className="text-xs font-medium">Angle: {hdr.gradientAngle ?? 135}°</Label>
                            <input type="range" min="0" max="360" value={hdr.gradientAngle ?? 135}
                              onChange={e => setN("header", "gradientAngle", Number(e.target.value))}
                              className="w-full accent-violet-600" />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ── STYLE ── */}
            {section === "style" && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-base font-bold text-slate-800">Style</h2>
                  <p className="text-xs text-slate-500 mt-0.5">Typography, field styles, colors and layout</p>
                </div>

                {/* Theme Presets */}
                <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Theme Presets</p>
                    <p className="text-xs text-slate-400 mt-0.5">Pick a preset to apply a complete visual style. Fine-tune below.</p>
                  </div>
                  <div className="grid grid-cols-3 gap-2.5">
                    {FORM_THEMES.map(theme => (
                      <button
                        key={theme.id}
                        onClick={() => applyTheme(theme)}
                        title={`Apply ${theme.name} theme`}
                        className="rounded-xl border border-slate-200 overflow-hidden text-left transition-all hover:shadow-md hover:border-slate-300 active:scale-[0.97] focus:outline-none focus:ring-2 focus:ring-orange-400/50"
                      >
                        <div className="h-9" style={{
                          background: theme.bgType === "gradient"
                            ? `linear-gradient(135deg, ${theme.headerBg}, ${theme.gradTo})`
                            : theme.headerBg,
                        }} />
                        <div className="px-2.5 py-2" style={{ background: theme.pageBg }}>
                          <p className="text-[11px] font-semibold truncate" style={{ color: theme.bodyColor }}>{theme.name}</p>
                          <div className="mt-1.5 flex gap-1 items-center">
                            <div className="h-1.5 w-7 rounded-full" style={{ background: theme.accent }} />
                            <div className="h-1.5 w-3 rounded-full opacity-15" style={{ background: theme.bodyColor }} />
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-4">
                      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Typography</p>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium">Font Family</Label>
                        <Select value={sty.fontFamily || "inter"} onValueChange={v => setN("style", "fontFamily", v)}>
                          <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {[
                              { v: "inter", l: "Inter" }, { v: "poppins", l: "Poppins" },
                              { v: "roboto", l: "Roboto" }, { v: "lato", l: "Lato" },
                              { v: "open-sans", l: "Open Sans" }, { v: "nunito", l: "Nunito" },
                              { v: "playfair", l: "Playfair Display" }, { v: "merriweather", l: "Merriweather" },
                              { v: "system", l: "System Default" },
                            ].map(o => <SelectItem key={o.v} value={o.v} className="text-sm">{o.l}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-4">
                      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Colors</p>
                      <div className="space-y-3">
                        <div className="space-y-1.5">
                          <Label className="text-xs font-medium">Body Text Color</Label>
                          <div className="flex gap-2">
                            <input type="color" value={sty.bodyColor || "#1f2937"} onChange={e => setN("style", "bodyColor", e.target.value)} className="w-10 h-9 rounded-lg border cursor-pointer p-0.5 shrink-0" />
                            <Input value={sty.bodyColor || "#1f2937"} onChange={e => setN("style", "bodyColor", e.target.value)} className="h-9 text-xs font-mono" />
                          </div>
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs font-medium">Page Background</Label>
                          <div className="flex gap-2">
                            <input type="color" value={sty.pageBg || "#f8fafc"} onChange={e => setN("style", "pageBg", e.target.value)} className="w-10 h-9 rounded-lg border cursor-pointer p-0.5 shrink-0" />
                            <Input value={sty.pageBg || "#f8fafc"} onChange={e => setN("style", "pageBg", e.target.value)} className="h-9 text-xs font-mono" />
                          </div>
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs font-medium">Accent Color</Label>
                          <div className="flex gap-2">
                            <input type="color" value={sty.accentColor || "#4f46e5"} onChange={e => setN("style", "accentColor", e.target.value)} className="w-10 h-9 rounded-lg border cursor-pointer p-0.5 shrink-0" />
                            <Input value={sty.accentColor || "#4f46e5"} onChange={e => setN("style", "accentColor", e.target.value)} className="h-9 text-xs font-mono" />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-4">
                      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Layout</p>
                      <div className="space-y-3">
                        <div className="space-y-1.5">
                          <Label className="text-xs font-medium">Form Width</Label>
                          <div className="grid grid-cols-2 gap-1.5">
                            {([
                              { v: "sm", l: "Narrow", s: "480px" }, { v: "md", l: "Normal", s: "640px" },
                              { v: "lg", l: "Wide", s: "800px" }, { v: "full", l: "Full Width", s: "100%" },
                            ] as const).map(o => (
                              <button key={o.v} onClick={() => setN("style", "formWidth", o.v)}
                                className={cn("py-2.5 rounded-lg border text-xs font-medium flex flex-col items-center gap-0.5 transition-all",
                                  (sty.formWidth || "md") === o.v ? "border-orange-400 bg-orange-50 text-orange-700" : "border-slate-200 text-slate-500 hover:border-slate-300")}>
                                <span>{o.l}</span><span className="text-[10px] opacity-60">{o.s}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs font-medium">Input Style</Label>
                          <div className="grid grid-cols-3 gap-1.5">
                            {([{ v: "outline", l: "Outline" }, { v: "filled", l: "Filled" }, { v: "underline", l: "Underline" }] as const).map(o => (
                              <button key={o.v} onClick={() => setN("style", "inputStyle", o.v)}
                                className={cn("py-2.5 rounded-lg border text-xs font-medium transition-all",
                                  (sty.inputStyle || "outline") === o.v ? "border-orange-400 bg-orange-50 text-orange-700" : "border-slate-200 text-slate-500 hover:border-slate-300")}>
                                {o.l}
                              </button>
                            ))}
                          </div>
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs font-medium">Corner Radius</Label>
                          <div className="grid grid-cols-4 gap-1.5">
                            {([{ v: "none", l: "Square" }, { v: "sm", l: "Small" }, { v: "md", l: "Medium" }, { v: "lg", l: "Large" }] as const).map(o => (
                              <button key={o.v} onClick={() => setN("style", "cornerRadius", o.v)}
                                className={cn("py-2.5 rounded-lg border text-xs font-medium transition-all",
                                  (sty.cornerRadius || "md") === o.v ? "border-orange-400 bg-orange-50 text-orange-700" : "border-slate-200 text-slate-500 hover:border-slate-300")}>
                                {o.l}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ── SCHEDULE ── */}
            {section === "schedule" && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-base font-bold text-slate-800">Availability</h2>
                  <p className="text-xs text-slate-500 mt-0.5">Control when your form accepts responses</p>
                </div>
                <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-slate-800">Accept Submissions</p>
                      <p className="text-xs text-slate-400 mt-0.5">Disable to temporarily close the form</p>
                    </div>
                    <Switch checked={settings.isEnabled !== false} onCheckedChange={v => set("isEnabled", v)} />
                  </div>
                  {settings.isEnabled === false && (
                    <div className="space-y-1.5 pt-1 border-t border-slate-100">
                      <Label className="text-xs font-medium">Message shown when form is closed</Label>
                      <Textarea
                        value={settings.unavailableMessage || ""}
                        onChange={e => set("unavailableMessage", e.target.value)}
                        placeholder="This form is currently closed and not accepting responses."
                        className="text-sm resize-none"
                        rows={3}
                      />
                      <p className="text-[11px] text-slate-400">Visitors will see this message instead of the form</p>
                    </div>
                  )}
                </div>
                <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-4">
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Schedule</p>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium">Opens At</Label>
                      <input type="datetime-local" value={settings.startDate || ""}
                        onChange={e => set("startDate", e.target.value || null)}
                        className="w-full h-9 text-xs border border-slate-200 rounded-lg px-3 bg-white focus:outline-none focus:ring-2 focus:ring-blue-400 transition-shadow" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium">Closes At</Label>
                      <input type="datetime-local" value={settings.endDate || ""}
                        onChange={e => set("endDate", e.target.value || null)}
                        className="w-full h-9 text-xs border border-slate-200 rounded-lg px-3 bg-white focus:outline-none focus:ring-2 focus:ring-blue-400 transition-shadow" />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Max Submissions</Label>
                    <Input type="number" min="0" value={settings.submissionLimit || ""}
                      onChange={e => set("submissionLimit", e.target.value ? parseInt(e.target.value) : null)}
                      placeholder="Unlimited" className="w-48 h-9 text-sm" />
                    <p className="text-[11px] text-slate-400">Leave blank to allow unlimited responses</p>
                  </div>
                  <div className="space-y-1.5 pt-1 border-t border-slate-100">
                    <Label className="text-xs font-medium">Message when outside schedule / limit reached</Label>
                    <Textarea
                      value={settings.unavailableMessage || ""}
                      onChange={e => set("unavailableMessage", e.target.value)}
                      placeholder="This form is currently closed and not accepting responses."
                      className="text-sm resize-none"
                      rows={3}
                    />
                    <p className="text-[11px] text-slate-400">Shown when the form is past its open window or submission limit</p>
                  </div>
                </div>
              </div>
            )}

            {/* ── SUBMIT ── */}
            {section === "submit" && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-base font-bold text-slate-800">After Submission</h2>
                  <p className="text-xs text-slate-500 mt-0.5">What happens after a visitor submits the form</p>
                </div>
                <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-4">
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-500">After Submission</p>
                  <div className="grid grid-cols-2 gap-2">
                    {([
                      { value: "message",  label: "Show a message",             desc: "Simple thank-you confirmation" },
                      { value: "refresh",  label: "Refresh & return to form",   desc: "Resets for another entry — good for kiosks" },
                      { value: "receipt",  label: "Show receipt page",          desc: "Printable confirmation with details" },
                      { value: "redirect", label: "Redirect elsewhere",         desc: "Send visitor to another URL" },
                    ] as const).map(opt => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => onSettingsChange({
                          postSubmit: { ...ps, action: opt.value },
                          ticketing: { ...(settings.ticketing || {}), enabled: opt.value === "receipt" },
                        })}
                        className={cn(
                          "text-left p-3 rounded-lg border transition-colors",
                          postSubmitAction === opt.value ? "border-indigo-400 bg-indigo-50" : "border-slate-200 hover:bg-slate-50",
                        )}
                      >
                        <p className={cn("text-sm font-medium", postSubmitAction === opt.value ? "text-indigo-700" : "text-slate-700")}>{opt.label}</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">{opt.desc}</p>
                      </button>
                    ))}
                  </div>

                  <div className="space-y-1.5 pt-2 border-t border-slate-100">
                    <Label className="text-xs font-medium">Thank You Message</Label>
                    <Textarea value={ps.message || ""} onChange={e => setN("postSubmit", "message", e.target.value)}
                      placeholder="Thank you! Your response has been recorded." className="text-sm resize-none" rows={3} />
                  </div>

                  {postSubmitAction === "refresh" && (
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium">Delay before returning to form (seconds)</Label>
                      <Input type="number" min={0} max={30} value={ps.refreshDelay ?? 2}
                        onChange={e => setN("postSubmit", "refreshDelay", Number(e.target.value))} className="h-9 text-sm w-32" />
                      <p className="text-[11px] text-slate-400">Shows the message above, then automatically resets the form to blank.</p>
                    </div>
                  )}

                  {postSubmitAction === "receipt" && (
                    <div className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-3 flex items-center justify-between gap-3">
                      <p className="text-xs text-amber-700">Configure the Application ID and layout in the Submission Receipt tab.</p>
                      <Button size="sm" variant="outline" className="h-7 text-xs shrink-0" onClick={() => setSection("ticketing")}>Configure</Button>
                    </div>
                  )}

                  {postSubmitAction === "redirect" && (
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium">Redirect URL</Label>
                      <Input value={ps.redirectUrl || ""} onChange={e => setN("postSubmit", "redirectUrl", e.target.value)}
                        placeholder="https://yoursite.com/thank-you" className="h-9 text-sm" />
                      <Label className="text-xs font-medium">Delay before redirect (seconds)</Label>
                      <Input type="number" min={0} max={30} value={ps.redirectDelay ?? 3}
                        onChange={e => setN("postSubmit", "redirectDelay", Number(e.target.value))} className="h-9 text-sm w-32" />
                    </div>
                  )}
                </div>
                {form?.moduleId ? (
                  <>
                    <div className="bg-white rounded-xl border border-slate-200 p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-semibold text-slate-800">Auto-create CRM Record</p>
                          <p className="text-xs text-slate-400 mt-0.5">
                            {ps.mode === "update"
                              ? "Create a new record when no existing match is found (below)"
                              : "Create a record in the linked module on each submission"}
                          </p>
                        </div>
                        <Switch checked={ps.createRecord !== false} onCheckedChange={v => setN("postSubmit", "createRecord", v)} />
                      </div>
                    </div>
                    <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-semibold text-slate-800">Update existing record if found</p>
                          <p className="text-xs text-slate-400 mt-0.5">Avoid duplicates — update a matching record instead of creating a new one</p>
                        </div>
                        <Switch checked={ps.mode === "update"} onCheckedChange={v => setN("postSubmit", "mode", v ? "update" : "create")} />
                      </div>
                      {ps.mode === "update" && (
                        <div className="space-y-1.5">
                          <Label className="text-xs font-medium">Match by field</Label>
                          <Select value={ps.matchField || ""} onValueChange={v => setN("postSubmit", "matchField", v)}>
                            <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Select a field…" /></SelectTrigger>
                            <SelectContent>
                              {allModuleFields.map((f: any) => (
                                <SelectItem key={f.id} value={f.name}>{f.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <p className="text-[11px] text-slate-400">
                            {ps.createRecord === false
                              ? "If a submission's value for this field matches an existing record, that record is updated. If no match is found, nothing is created (Auto-create is off) — the submission is still recorded, just no CRM record changes."
                              : "If a submission's value for this field matches an existing record, that record is updated instead of a new one being created. If no match is found, a new record is created."}
                          </p>
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="rounded-xl bg-slate-50 border border-slate-200 px-4 py-4 text-xs text-slate-500">
                    <p className="font-medium text-slate-700 mb-1">This is a standalone form — it isn't linked to a CRM module.</p>
                    <p>
                      Submissions here are only ever saved as form responses, never as a CRM record — "Auto-create CRM Record" and
                      "Update existing record if found" don't apply. If you want a submission to update a specific CRM record,
                      use an Integration Field with its "Allow manual selection to update the CRM record" setting turned on instead.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* ── INTEGRATIONS ── */}
            {section === "integrations" && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-base font-bold text-slate-800">Integrations</h2>
                  <p className="text-xs text-slate-500 mt-0.5">Send form responses to external services in addition to the CRM</p>
                </div>

                {/* Google account connection gate */}
                {googleConnected === false && (
                  <div className="bg-white rounded-xl border border-slate-200 p-6 flex flex-col items-center text-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center">
                      <FileSpreadsheet className="w-6 h-6 text-slate-400" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-800">Connect your Google account</p>
                      <p className="text-xs text-slate-500 mt-1 max-w-xs">
                        To send form responses to Google Sheets you need to connect your Google account once.
                      </p>
                    </div>
                    <Button onClick={connectGoogle} disabled={googleConnecting} className="gap-2 bg-teal-600 hover:bg-teal-700 text-white">
                      {googleConnecting
                        ? <><RefreshCw className="w-4 h-4 animate-spin" /> Connecting…</>
                        : <><FileSpreadsheet className="w-4 h-4" /> Connect Google</>}
                    </Button>
                  </div>
                )}

                {/* Google Sheets card — only shown when connected */}
                {googleConnected === null && (
                  <div className="flex items-center gap-2 py-6 text-slate-400 justify-center">
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span className="text-sm">Checking connection…</span>
                  </div>
                )}

                {googleConnected === true && (
                <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">

                  {/* Header toggle row */}
                  <div className="flex items-center justify-between px-4 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center shrink-0">
                        <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-800">Google Sheets</p>
                        <p className="text-xs text-slate-400 mt-0.5">Append each submission as a new row</p>
                      </div>
                    </div>
                    <Switch checked={!!gs.syncEnabled} onCheckedChange={v => setN("googleSheet", "syncEnabled", v)} />
                  </div>

                  {/* Config body */}
                  <div className="px-4 py-5 space-y-5">

                    {/* Sheet selector */}
                    <div className="space-y-2">
                      <Label className="text-xs font-medium">Spreadsheet</Label>

                      {/* Currently selected sheet */}
                      {gs.spreadsheetId ? (
                        <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg border border-emerald-200 bg-emerald-50">
                          <FileSpreadsheet className="w-4 h-4 text-emerald-600 shrink-0" />
                          <span className="text-sm font-medium text-emerald-800 flex-1 truncate">{gs.spreadsheetName || gs.spreadsheetId}</span>
                          <button
                            onClick={openSheetPicker}
                            className="text-[11px] text-emerald-700 underline underline-offset-2 shrink-0"
                          >Change</button>
                        </div>
                      ) : (
                        <button
                          onClick={openSheetPicker}
                          className="w-full flex items-center gap-2.5 px-3 py-3 rounded-lg border-2 border-dashed border-slate-200 hover:border-teal-300 hover:bg-teal-50/40 transition-colors text-left group"
                        >
                          <div className="w-8 h-8 rounded-lg bg-slate-100 group-hover:bg-teal-100 flex items-center justify-center shrink-0 transition-colors">
                            <FileSpreadsheet className="w-4 h-4 text-slate-400 group-hover:text-teal-600" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-slate-600 group-hover:text-teal-700">Choose a spreadsheet</p>
                            <p className="text-[11px] text-slate-400">Pick existing or create new</p>
                          </div>
                        </button>
                      )}

                      {/* Sheet picker dropdown */}
                      {sheetPickerOpen && (
                        <div className="relative z-50">
                          <div
                            className="fixed inset-0"
                            onClick={() => setSheetPickerOpen(false)}
                          />
                          <div className="absolute top-1 left-0 right-0 bg-white rounded-xl border border-slate-200 shadow-xl overflow-hidden z-50">
                            {/* Search */}
                            <div className="px-3 py-2.5 border-b border-slate-100">
                              <input
                                autoFocus
                                value={sheetSearch}
                                onChange={e => setSheetSearch(e.target.value)}
                                placeholder="Search sheets…"
                                className="w-full text-sm outline-none bg-transparent text-slate-700 placeholder:text-slate-400"
                              />
                            </div>

                            {/* List */}
                            <div className="max-h-56 overflow-y-auto">
                              {sheetListLoading && (
                                <div className="flex items-center justify-center py-8 gap-2 text-slate-400">
                                  <RefreshCw className="w-4 h-4 animate-spin" />
                                  <span className="text-sm">Loading your sheets…</span>
                                </div>
                              )}
                              {sheetListError && (
                                <div className="px-4 py-3">
                                  <p className="text-xs text-red-600">{sheetListError}</p>
                                  <a href="/settings/calendar-sync" target="_blank" className="text-xs text-teal-600 underline mt-1 block">Connect Google account →</a>
                                </div>
                              )}
                              {!sheetListLoading && !sheetListError && sheetList.filter(s => s.name.toLowerCase().includes(sheetSearch.toLowerCase())).length === 0 && (
                                <p className="text-sm text-slate-400 px-4 py-4">No sheets found</p>
                              )}
                              {sheetList
                                .filter(s => s.name.toLowerCase().includes(sheetSearch.toLowerCase()))
                                .map(sheet => (
                                  <button
                                    key={sheet.id}
                                    onClick={() => selectSheet(sheet)}
                                    className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 text-left transition-colors"
                                  >
                                    <FileSpreadsheet className="w-4 h-4 text-emerald-500 shrink-0" />
                                    <span className="text-sm text-slate-700 truncate flex-1">{sheet.name}</span>
                                    <span className="text-[10px] text-slate-400 shrink-0">
                                      {sheet.modifiedTime ? new Date(sheet.modifiedTime).toLocaleDateString() : ''}
                                    </span>
                                  </button>
                                ))
                              }
                            </div>

                            {/* Create new */}
                            <div className="border-t border-slate-100 px-3 py-3 space-y-2">
                              <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Create new spreadsheet</p>
                              <div className="flex gap-2">
                                <input
                                  value={newSheetName}
                                  onChange={e => setNewSheetName(e.target.value)}
                                  onKeyDown={e => e.key === 'Enter' && createNewSheet()}
                                  placeholder="Spreadsheet name…"
                                  className="flex-1 text-sm px-2.5 py-1.5 rounded-lg border border-slate-200 outline-none focus:border-teal-400 bg-white"
                                />
                                <Button
                                  size="sm"
                                  disabled={!newSheetName.trim() || creatingSheet}
                                  onClick={createNewSheet}
                                  className="h-8 px-3 gap-1.5 bg-teal-600 hover:bg-teal-700 text-white"
                                >
                                  {creatingSheet ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
                                  Create
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Tab selector — only shown once a sheet is picked */}
                    {gs.spreadsheetId && (
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium">Sheet Tab</Label>
                        {sheetTabsLoading ? (
                          <div className="flex items-center gap-1.5 text-slate-400 py-1">
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            <span className="text-xs">Loading tabs…</span>
                          </div>
                        ) : sheetTabs.length > 0 ? (
                          <Select
                            value={gs.tabName || sheetTabs[0]}
                            onValueChange={v => setN("googleSheet", "tabName", v)}
                          >
                            <SelectTrigger className="h-9 text-sm">
                              <SelectValue placeholder="Select tab…" />
                            </SelectTrigger>
                            <SelectContent>
                              {sheetTabs.map(t => (
                                <SelectItem key={t} value={t}>{t}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <Input
                            value={gs.tabName || ""}
                            onChange={e => setN("googleSheet", "tabName", e.target.value)}
                            placeholder="Form Responses"
                            className="h-9 text-sm"
                          />
                        )}
                        <p className="text-[11px] text-slate-400">Responses will be appended here. Defaults to "Form Responses".</p>
                      </div>
                    )}

                    {/* Column mapping info */}
                    {gs.spreadsheetId && (
                      <div className="rounded-lg bg-slate-50 border border-slate-200 px-3 py-3 space-y-1">
                        <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Column mapping</p>
                        <p className="text-[11px] text-slate-500">
                          First row is auto-created as a header:{" "}
                          <span className="font-mono bg-slate-100 px-1 rounded">Submitted At</span>{" "}
                          then one column per form field in order. Existing headers are never overwritten.
                        </p>
                      </div>
                    )}

                    {/* Error from API */}
                    {sheetListError && (
                      <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2.5 text-xs text-red-700">{sheetListError}</div>
                    )}
                  </div>
                </div>
                )}
              </div>
            )}

            {/* ── DOCUMENTS (Document Intelligence) ── */}
            {section === "documents" && (() => {
              const di = settings.documentIntelligence || {};
              const setDI = (k: string, v: any) => onSettingsChange({ documentIntelligence: { ...di, [k]: v } });
              return (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-base font-bold text-slate-800">Document Intelligence</h2>
                    <p className="text-xs text-slate-500 mt-0.5">Let respondents upload a document instead of filling the form manually. AI will extract field values automatically.</p>
                  </div>

                  {/* Enable toggle */}
                  <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
                    <div className="flex items-center justify-between px-4 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-sky-50 flex items-center justify-center shrink-0">
                          <ScanSearch className="w-5 h-5 text-sky-600" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-slate-800">Enable Document Upload</p>
                          <p className="text-xs text-slate-400 mt-0.5">Show "Fill Manually / Upload Document" choice on the form</p>
                        </div>
                      </div>
                      <Switch checked={!!di.enabled} onCheckedChange={v => setDI("enabled", v)} />
                    </div>

                    {di.enabled && (
                      <div className="px-4 py-5 space-y-5">
                        {/* Accepted file types */}
                        <div className="space-y-2">
                          <Label className="text-xs font-medium">Accepted File Types</Label>
                          <div className="flex flex-wrap gap-2">
                            {["pdf", "jpg", "png", "jpeg", "webp"].map(ext => (
                              <button
                                key={ext}
                                onClick={() => {
                                  const current: string[] = di.acceptedTypes || ["pdf", "jpg", "png"];
                                  const next = current.includes(ext) ? current.filter(e => e !== ext) : [...current, ext];
                                  setDI("acceptedTypes", next);
                                }}
                                className={cn(
                                  "px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors",
                                  (di.acceptedTypes || ["pdf", "jpg", "png"]).includes(ext)
                                    ? "bg-sky-50 border-sky-300 text-sky-700"
                                    : "bg-slate-50 border-slate-200 text-slate-500"
                                )}
                              >
                                .{ext}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Max file size */}
                        <div className="space-y-2">
                          <Label className="text-xs font-medium">Max File Size (MB)</Label>
                          <Input
                            type="number"
                            min={1} max={20}
                            value={di.maxSizeMb || 10}
                            onChange={e => setDI("maxSizeMb", Number(e.target.value))}
                            className="h-9 text-sm w-28"
                          />
                        </div>

                        {/* Auto-populate */}
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-slate-700">Auto-populate Fields</p>
                            <p className="text-xs text-slate-400">Automatically fill form fields from the extracted data</p>
                          </div>
                          <Switch checked={di.autoPopulate !== false} onCheckedChange={v => setDI("autoPopulate", v)} />
                        </div>

                        {/* User review */}
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-slate-700">Require Review Before Submit</p>
                            <p className="text-xs text-slate-400">Let users review and correct extracted values</p>
                          </div>
                          <Switch checked={di.userReview !== false} onCheckedChange={v => setDI("userReview", v)} />
                        </div>
                      </div>
                    )}
                  </div>

                  {!di.enabled && (
                    <div className="rounded-xl bg-sky-50 border border-sky-100 px-4 py-4 text-xs text-sky-700">
                      Enable this feature to let respondents upload a PDF or image. Claude AI will scan the document and automatically fill the form fields.
                    </div>
                  )}
                </div>
              );
            })()}

            {/* ── TICKETING ── */}
            {section === "ticketing" && (() => {
              const tk = settings.ticketing || {};
              const setTK = (k: string, v: any) => onSettingsChange({ ticketing: { ...tk, [k]: v } });
              return (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-base font-bold text-slate-800">Submission Receipt</h2>
                    <p className="text-xs text-slate-500 mt-0.5">After submission, replace the simple success message with a printable receipt showing submitted details.</p>
                  </div>

                  <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
                    <div className="flex items-center justify-between px-4 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-amber-50 flex items-center justify-center shrink-0">
                          <Ticket className="w-5 h-5 text-amber-600" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-slate-800">Enable Submission Receipt</p>
                          <p className="text-xs text-slate-400 mt-0.5">Show a printable receipt page after each submission</p>
                        </div>
                      </div>
                      <Switch checked={!!tk.enabled} onCheckedChange={v => onSettingsChange({
                        ticketing: { ...tk, enabled: v },
                        postSubmit: { ...ps, action: v ? "receipt" : "message" },
                      })} />
                    </div>

                    {tk.enabled && (
                      <div className="px-4 py-5 space-y-5">
                        <div className="grid grid-cols-2 gap-4">
                          {/* Prefix */}
                          <div className="space-y-2">
                            <Label className="text-xs font-medium">Application ID Prefix</Label>
                            <Input
                              value={tk.prefix || "APP"}
                              onChange={e => setTK("prefix", e.target.value.toUpperCase())}
                              maxLength={6}
                              className="h-9 text-sm font-mono"
                              placeholder="APP"
                            />
                            <p className="text-[11px] text-slate-400">e.g. APP, REF, SUB</p>
                          </div>
                          {/* Start number */}
                          <div className="space-y-2">
                            <Label className="text-xs font-medium">Start Number</Label>
                            <Input
                              type="number"
                              min={1}
                              value={tk.startNumber || 1}
                              onChange={e => setTK("startNumber", Number(e.target.value))}
                              className="h-9 text-sm"
                            />
                            <p className="text-[11px] text-slate-400">First application number</p>
                          </div>
                        </div>

                        {/* Preview */}
                        <div className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-3">
                          <p className="text-[11px] font-bold uppercase tracking-wide text-amber-600 mb-1">Application ID Preview</p>
                          <p className="font-mono text-sm text-amber-800">
                            {(tk.prefix || "APP").toUpperCase()}-{String(tk.startNumber || 1).padStart(4, "0")}
                          </p>
                          <p className="text-[11px] text-amber-600 mt-1">First submission will have this ID</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {!tk.enabled && (
                    <div className="rounded-xl bg-amber-50 border border-amber-100 px-4 py-4 text-xs text-amber-700">
                      Enable Submission Receipt to show a printable confirmation page after submission. Includes Application ID, submission date/time, status, and all submitted field values.
                    </div>
                  )}
                </div>
              );
            })()}

          </div>
        </ScrollArea>
      </div>
    </div>
  );
}

// ── Custom Field Palette (standalone forms) ───────────────────────────────────

function PaletteItem({ type, label, icon: Icon, color, onAdd, dark }: { type: string; label: string; icon: any; color: string; onAdd: (type: string) => void; dark: boolean }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `palette:${type}`,
    data: { type: "palette", fieldType: type },
  });
  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      onClick={() => onAdd(type)}
      style={{ opacity: isDragging ? 0.4 : 1, touchAction: 'none' }}
      className={cn(
        "flex flex-col items-center gap-1.5 py-3 px-1 rounded-xl transition-all duration-150 group text-center cursor-grab active:cursor-grabbing select-none",
        dark ? "hover:bg-white/10" : "hover:bg-indigo-50/80"
      )}
    >
      <span className={cn("w-10 h-10 rounded-xl flex items-center justify-center transition-transform duration-150 group-hover:scale-110 shadow-sm", color)}>
        <Icon className="w-[18px] h-[18px]" />
      </span>
      <span className={cn("text-[10px] font-semibold leading-tight", dark ? "text-white/60 group-hover:text-white/90" : "text-gray-600 group-hover:text-indigo-700")}>
        {label}
      </span>
    </div>
  );
}

function CustomFieldPalette({ onAdd, dark = false }: { onAdd: (type: string) => void; dark?: boolean }) {
  return (
    <div className="grid grid-cols-2 gap-1 p-2">
      {CUSTOM_FIELD_TYPES.map(ft => (
        <PaletteItem key={ft.type} {...ft} onAdd={onAdd} dark={dark} />
      ))}
    </div>
  );
}

// ── Insertion Indicator ───────────────────────────────────────────────────────
// Sits in the paddingTop space of the target field wrapper (position:absolute).
// The wrapper's paddingTop animates 0→72px, creating room for this element.

function InsertionIndicator({ activeId }: { activeId: string | null }) {
  let label = "Drop here";
  if (activeId?.startsWith("palette:")) {
    const ft = CUSTOM_FIELD_TYPES.find(f => f.type === activeId.slice(8));
    if (ft) label = `Add ${ft.label} here`;
  } else if (activeId?.startsWith("sidebar:")) {
    label = "Add field here";
  }
  return (
    <div
      className="absolute inset-x-0 top-2 h-14 rounded-xl border-2 border-dashed border-indigo-500 bg-indigo-50/80 flex items-center justify-center gap-2 text-indigo-600 text-sm font-medium select-none pointer-events-none"
      style={{ zIndex: 10 }}
    >
      <div className="w-5 h-5 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
        <Plus className="w-3 h-3" />
      </div>
      <span>{label}</span>
    </div>
  );
}

// End-of-list drop indicator — sits below the grid, animates height 0↔72px.
function EndOfListIndicator({ activeId, open }: { activeId: string | null; open: boolean }) {
  let label = "Drop here";
  if (activeId?.startsWith("palette:")) {
    const ft = CUSTOM_FIELD_TYPES.find(f => f.type === activeId.slice(8));
    if (ft) label = `Add ${ft.label} here`;
  } else if (activeId?.startsWith("sidebar:")) {
    label = "Add field here";
  }
  return (
    <div
      className="overflow-hidden"
      style={{
        height: open ? 72 : 0,
        transition: "height 0.18s cubic-bezier(0.4,0,0.2,1)",
        pointerEvents: "none",
      }}
    >
      <div className="mt-2 h-14 rounded-xl border-2 border-dashed border-indigo-500 bg-indigo-50/80 flex items-center justify-center gap-2 text-indigo-600 text-sm font-medium select-none">
        <div className="w-5 h-5 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
          <Plus className="w-3 h-3" />
        </div>
        <span>{label}</span>
      </div>
    </div>
  );
}

// ── Unsectioned Fields Area (always on Page 1) ────────────────────────────────

function UnsectionedArea({ fields, allCanvasModuleField, selectedFF, onFieldSelect, onFieldRemove, onLabelChange, isOver, isCustom, getColSpan, onToggleWidth }: {
  fields: any[]; allCanvasModuleField: (fieldId: string) => any; selectedFF: any;
  onFieldSelect: (ff: any) => void; onFieldRemove: (ff: any) => void;
  onLabelChange?: (fieldId: string, label: string) => void;
  isOver: boolean; isCustom: boolean;
  getColSpan: (fieldId: string) => "full" | "half";
  onToggleWidth: (fieldId: string) => void;
}) {
  const { setNodeRef: dropRef } = useDroppable({ id: "unsec", data: { type: "unsec-zone" } });
  const { activeId: dragActiveId, overFieldId: dragOverFieldId, overTarget: dragOverTarget } = useContext(BuilderDragCtx);
  const isPaletteSidebarDrag = !!(dragActiveId?.startsWith("palette:") || dragActiveId?.startsWith("sidebar:"));
  const ownFieldIds = new Set(fields.map(f => f.id));
  const placeholderBeforeId = (isPaletteSidebarDrag && dragOverFieldId && ownFieldIds.has(dragOverFieldId)) ? dragOverFieldId : null;

  if (fields.length === 0 && !isOver) {
    return (
      <div ref={dropRef} className={cn(
        "rounded-2xl border-2 border-dashed transition-all py-12",
        isOver ? "border-indigo-400 bg-indigo-50/40" : "border-slate-200"
      )}>
        <div className="flex flex-col items-center gap-3 text-slate-400">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center">
            <Plus className="w-6 h-6" />
          </div>
          <div className="text-center">
            <p className="text-sm font-semibold text-slate-600">Add your first question</p>
            <p className="text-xs mt-1">← Pick a field type from the left panel or drag one here</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn(
      "rounded-xl border-2 transition-all",
      isOver ? "border-indigo-400 bg-indigo-50/20 shadow-[0_0_0_3px_rgba(99,102,241,0.08)]" : "border-transparent"
    )}>
      <div ref={dropRef} className="space-y-2" data-zone-id="unsec">
        <SortableContext items={fields.map(f => f.id)} strategy={rectSortingStrategy}>
          {fields.length === 0 ? (
            <div className={cn("min-h-[64px] flex items-center justify-center rounded-xl border-2 border-dashed text-xs transition-colors",
              isOver ? "border-indigo-300 bg-indigo-50/60 text-indigo-500 font-medium" : "border-slate-200 text-slate-400")}>
              {isOver ? "↓ Drop here" : "Drop fields here"}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-2">
                {fields.map(ff => {
                  const span = getColSpan(ff.fieldId);
                  const isTarget = isPaletteSidebarDrag && placeholderBeforeId === ff.id;
                  return (
                    <div
                      key={ff.id}
                      className={cn(span === "half" ? "col-span-1" : "col-span-2", "relative")}
                      data-field-id={ff.id}
                      style={{
                        paddingTop: isTarget ? 72 : 0,
                        transition: "padding-top 0.18s cubic-bezier(0.4,0,0.2,1)",
                      }}
                    >
                      {isTarget && <InsertionIndicator activeId={dragActiveId} />}
                      <SortableFormFieldItem
                        ff={ff}
                        moduleField={allCanvasModuleField(ff.fieldId)}
                        isSelected={selectedFF?.id === ff.id}
                        onSelect={() => onFieldSelect(ff)}
                        onRemove={() => onFieldRemove(ff)}
                        onLabelChange={onLabelChange ? (l) => onLabelChange(ff.id, l) : undefined}
                        isCustom={isCustom}
                        colSpan={span}
                        onToggleWidth={() => onToggleWidth(ff.fieldId)}
                      />
                    </div>
                  );
                })}
              </div>
              <EndOfListIndicator
                activeId={dragActiveId}
                open={isPaletteSidebarDrag && !placeholderBeforeId}
              />
            </>
          )}
        </SortableContext>
      </div>
    </div>
  );
}

// ── Section Card ──────────────────────────────────────────────────────────────

function SectionCard({
  section, fields, allCanvasModuleField, selectedFF, onFieldSelect, onFieldRemove,
  onSectionUpdate, onSectionDelete, onSectionSave, availableFields, onAddField, isOver, isCustom, onLabelChange,
  getColSpan, onToggleWidth,
}: {
  section: any; fields: any[]; allCanvasModuleField: (fieldId: string) => any; selectedFF: any;
  onFieldSelect: (ff: any) => void; onFieldRemove: (ff: any) => void;
  onSectionUpdate: (id: string, c: any) => void;
  onSectionDelete: (id: string) => void;
  onSectionSave: (id: string, c: any) => void;
  availableFields: any[]; onAddField: (fieldId: string, sectionId: string | null) => void;
  isOver: boolean; isCustom: boolean;
  onLabelChange?: (fieldId: string, label: string) => void;
  getColSpan: (fieldId: string) => "full" | "half";
  onToggleWidth: (fieldId: string) => void;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const { setNodeRef: dropRef } = useDroppable({
    id: `sec:${section.id}`,
    data: { type: "section", sectionId: section.id },
  });
  const { activeId: dragActiveId, overFieldId: dragOverFieldId, overTarget: dragOverTarget } = useContext(BuilderDragCtx);
  const isPaletteSidebarDrag = !!(dragActiveId?.startsWith("palette:") || dragActiveId?.startsWith("sidebar:"));
  const ownFieldIds = new Set(fields.map(f => f.id));
  const placeholderBeforeId = (isPaletteSidebarDrag && dragOverFieldId && ownFieldIds.has(dragOverFieldId)) ? dragOverFieldId : null;

  return (
    <div className={cn("transition-all duration-150", isOver ? "ring-2 ring-indigo-300 ring-offset-2 rounded-2xl" : "")}>
      {/* Section as a visual divider */}
      <div className="flex items-center gap-3 py-3 group/sechdr">
        <div className={cn("h-px flex-1 transition-colors", isOver ? "bg-indigo-300" : "bg-slate-200 group-hover/sechdr:bg-slate-300")} />
        <div className={cn(
          "flex items-center gap-1.5 px-3 py-1.5 rounded-full border transition-all shrink-0",
          isOver ? "bg-indigo-50 border-indigo-300 text-indigo-700" : "bg-white border-slate-200 text-slate-600 hover:border-indigo-200 hover:bg-indigo-50/40",
        )}>
          <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 shrink-0" />
          <input
            value={section.label}
            onChange={e => onSectionUpdate(section.id, { label: e.target.value })}
            onBlur={e => onSectionSave(section.id, { label: e.target.value })}
            style={{ width: `${Math.max(70, (section.label || "Section").length * 7 + 20)}px` }}
            className="text-xs font-semibold bg-transparent border-0 outline-none text-center min-w-[70px] max-w-[220px]"
            placeholder="Section name…"
          />
          <button onClick={() => setCollapsed(!collapsed)} className="text-slate-400 hover:text-slate-700 transition-colors">
            {collapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
          <button
            onClick={() => onSectionDelete(section.id)}
            className="text-slate-300 hover:text-red-500 opacity-0 group-hover/sechdr:opacity-100 transition-all"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
        <div className={cn("h-px flex-1 transition-colors", isOver ? "bg-indigo-300" : "bg-slate-200 group-hover/sechdr:bg-slate-300")} />
      </div>

      {section.description && !collapsed && (
        <input
          value={section.description || ""}
          onChange={e => onSectionUpdate(section.id, { description: e.target.value })}
          onBlur={e => onSectionSave(section.id, { description: e.target.value })}
          className="block w-full text-xs text-slate-400 bg-transparent border-0 outline-none text-center italic pb-2"
          placeholder="Section description…"
        />
      )}

      {!collapsed && (
        <div ref={dropRef} className="space-y-2" data-zone-id={`sec:${section.id}`}>
          <SortableContext items={fields.map(f => f.id)} strategy={rectSortingStrategy}>
            {fields.length === 0 ? (
              <div className={cn("flex items-center justify-center h-16 rounded-xl border-2 border-dashed text-xs transition-colors",
                isOver ? "border-indigo-300 bg-indigo-50/60 text-indigo-500 font-medium" : "border-slate-200 text-slate-400")}>
                {isOver ? "↓ Drop here" : "Drag fields here"}
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-2">
                  {fields.map(ff => {
                    const span = getColSpan(ff.fieldId);
                    const isTarget = isPaletteSidebarDrag && placeholderBeforeId === ff.id;
                    return (
                      <div
                        key={ff.id}
                        className={cn(span === "half" ? "col-span-1" : "col-span-2", "relative")}
                        data-field-id={ff.id}
                        style={{
                          paddingTop: isTarget ? 72 : 0,
                          transition: "padding-top 0.18s cubic-bezier(0.4,0,0.2,1)",
                        }}
                      >
                        {isTarget && <InsertionIndicator activeId={dragActiveId} />}
                        <SortableFormFieldItem
                          ff={ff} moduleField={allCanvasModuleField(ff.fieldId)}
                          isSelected={selectedFF?.id === ff.id}
                          onSelect={() => onFieldSelect(ff)}
                          onRemove={() => onFieldRemove(ff)}
                          onLabelChange={onLabelChange ? (l) => onLabelChange(ff.id, l) : undefined}
                          isCustom={isCustom}
                          colSpan={span}
                          onToggleWidth={() => onToggleWidth(ff.fieldId)}
                        />
                      </div>
                    );
                  })}
                </div>
                <EndOfListIndicator
                  activeId={dragActiveId}
                  open={isPaletteSidebarDrag && !placeholderBeforeId}
                />
              </>
            )}
          </SortableContext>
          {!isCustom && availableFields.length > 0 && (
            <div className="pt-1">
              <Select onValueChange={v => v && onAddField(v, section.id)} value="">
                <SelectTrigger className="h-8 text-xs border-dashed text-slate-400 hover:text-indigo-500 hover:border-indigo-300 transition-colors">
                  <div className="flex items-center gap-1.5"><Plus className="w-3 h-3" /><span>Add field to section</span></div>
                </SelectTrigger>
                <SelectContent>
                  {availableFields.map((f: any) => (
                    <SelectItem key={f.id} value={f.id} className="text-xs">
                      <span className="font-mono text-slate-400 mr-1">{FIELD_TYPE_ICONS[f.type] || "T"}</span> {f.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Page Block ─────────────────────────────────────────────────────────────────

function PageBlock({
  page, pageNumber, totalPages, sectionsOnPage, canvasFields, allCanvasModuleField, pageSections,
  selectedFF, onFieldSelect, onFieldRemove, onSectionUpdate, onSectionDelete, onSectionSave,
  onAddSection, onUpdatePage, onDeletePage, availableFields, onAddField, overTarget, isCustom, onLabelChange,
  getColSpan, onToggleWidth,
}: {
  page: PageDef; pageNumber: number; totalPages: number;
  sectionsOnPage: any[]; canvasFields: any[]; allCanvasModuleField: (fieldId: string) => any;
  pageSections: Record<string, string>;
  selectedFF: any; onFieldSelect: (ff: any) => void; onFieldRemove: (ff: any) => void;
  onSectionUpdate: (id: string, c: any) => void; onSectionDelete: (id: string) => void;
  onSectionSave: (id: string, c: any) => void; onAddSection: (pageId: string) => void;
  onUpdatePage: (pageId: string, c: Partial<PageDef>) => void;
  onDeletePage: (pageId: string) => void;
  availableFields: any[]; onAddField: (fieldId: string, sectionId: string | null) => void;
  overTarget: string | null; isCustom: boolean;
  onLabelChange?: (fieldId: string, label: string) => void;
  getColSpan: (fieldId: string) => "full" | "half";
  onToggleWidth: (fieldId: string) => void;
}) {
  const isLastPage = pageNumber === totalPages;
  const isFirstPage = pageNumber === 1;

  // Unsectioned fields (only shown on Page 1)
  const unsectionedFields = isFirstPage
    ? canvasFields.filter(ff => !ff.sectionId).sort((a, b) => a.order - b.order)
    : [];

  return (
    <div className="rounded-2xl border border-slate-200 shadow-sm overflow-hidden bg-white">
      {/* Page header */}
      <div className="flex items-center gap-4 px-5 py-4 bg-gradient-to-r from-indigo-50/70 to-transparent border-b border-slate-100">
        <div className="w-8 h-8 rounded-full bg-indigo-600 text-white text-sm font-bold flex items-center justify-center shrink-0 shadow-sm">
          {pageNumber}
        </div>
        <div className="flex-1 min-w-0">
          <input
            value={page.title}
            onChange={e => onUpdatePage(page.id, { title: e.target.value })}
            className="text-sm font-bold text-gray-900 bg-transparent border-0 outline-none w-full placeholder:text-gray-400"
            placeholder="Page title…"
          />
          <input
            value={page.description || ""}
            onChange={e => onUpdatePage(page.id, { description: e.target.value })}
            className="text-xs text-gray-400 bg-transparent border-0 outline-none block w-full mt-0.5"
            placeholder="Page description…"
          />
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className={cn("text-xs font-semibold rounded-full px-2.5 py-1",
            isLastPage ? "bg-emerald-100 text-emerald-700" : "bg-indigo-100 text-indigo-700")}>
            {isLastPage ? "✓ Submit" : "→ Next"}
          </span>
          {totalPages > 1 && (
            <button onClick={() => onDeletePage(page.id)} className="text-gray-300 hover:text-red-500 p-1.5 rounded-lg hover:bg-red-50 transition-colors">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Page body */}
      <div className="p-4 space-y-3">
        {/* Unsectioned fields — Page 1 only */}
        {isFirstPage && (
          <UnsectionedArea
            fields={unsectionedFields}
            allCanvasModuleField={allCanvasModuleField}
            selectedFF={selectedFF}
            onFieldSelect={onFieldSelect}
            onFieldRemove={onFieldRemove}
            onLabelChange={onLabelChange}
            isOver={overTarget === "unsec"}
            isCustom={isCustom}
            getColSpan={getColSpan}
            onToggleWidth={onToggleWidth}
          />
        )}

        {/* Sections */}
        {sectionsOnPage.length === 0 && !isFirstPage ? (
          <PageEmptyDropZone pageId={page.id} isOver={overTarget === `page-empty:${page.id}`} />
        ) : sectionsOnPage.map(sec => {
          const sFields = canvasFields.filter(ff => ff.sectionId === sec.id).sort((a, b) => a.order - b.order);
          return (
            <SectionCard
              key={sec.id}
              section={sec}
              fields={sFields}
              allCanvasModuleField={allCanvasModuleField}
              selectedFF={selectedFF}
              onFieldSelect={onFieldSelect}
              onFieldRemove={onFieldRemove}
              onSectionUpdate={onSectionUpdate}
              onSectionDelete={onSectionDelete}
              onSectionSave={onSectionSave}
              availableFields={availableFields}
              onAddField={onAddField}
              isOver={overTarget === `sec:${sec.id}`}
              isCustom={isCustom}
              onLabelChange={onLabelChange}
              getColSpan={getColSpan}
              onToggleWidth={onToggleWidth}
            />
          );
        })}

        <button
          onClick={() => onAddSection(page.id)}
          className="w-full py-2.5 border-2 border-dashed border-slate-200 rounded-xl text-sm text-slate-400 hover:border-indigo-300 hover:text-indigo-500 hover:bg-indigo-50/30 transition-all flex items-center justify-center gap-2"
        >
          <Plus className="w-4 h-4" /> Add Section
        </button>
      </div>
    </div>
  );
}

// ── Page Empty Drop Zone ──────────────────────────────────────────────────────

function PageEmptyDropZone({ pageId, isOver }: { pageId: string; isOver: boolean }) {
  const { setNodeRef } = useDroppable({ id: `page-empty:${pageId}`, data: { type: "page-empty", pageId } });
  return (
    <div ref={setNodeRef} className={cn(
      "border-2 border-dashed rounded-xl p-10 text-center transition-all duration-150",
      isOver ? "border-indigo-400 bg-indigo-50/60" : "border-slate-200 bg-slate-50/50"
    )}>
      <div className={cn("w-10 h-10 rounded-full flex items-center justify-center mx-auto mb-3 transition-colors",
        isOver ? "bg-indigo-100" : "bg-slate-100")}>
        <Plus className={cn("w-5 h-5 transition-colors", isOver ? "text-indigo-500" : "text-slate-300")} />
      </div>
      <p className={cn("text-sm font-medium transition-colors", isOver ? "text-indigo-600" : "text-slate-400")}>
        {isOver ? "Release to add field" : "Drag a field here"}
      </p>
      <p className="text-xs text-slate-300 mt-1">A section will be created automatically</p>
    </div>
  );
}

// ── Draggable Sidebar Field (module-linked mode) ──────────────────────────────

function SidebarFieldItem({ field, onAdd }: { field: any; onAdd: () => void }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `sidebar:${field.id}`,
    data: { type: "sidebar-field", fieldId: field.id },
  });
  return (
    <div ref={setNodeRef} className={cn("flex items-center gap-2 px-2.5 py-2 rounded-md border border-transparent transition-all group", isDragging ? "opacity-40 cursor-grabbing" : "hover:bg-indigo-50 hover:border-indigo-100 cursor-grab")}>
      <div {...attributes} {...listeners} className="flex items-center gap-2 flex-1 min-w-0 touch-none">
        <span className="w-6 h-6 bg-gray-100 group-hover:bg-indigo-100 rounded text-xs flex items-center justify-center font-mono text-gray-600 shrink-0 transition-colors">{FIELD_TYPE_ICONS[field.type] || "T"}</span>
        <p className="text-xs font-medium truncate text-gray-700 group-hover:text-indigo-700" title={field.label}>{field.label}</p>
      </div>
      <button onClick={onAdd} className="opacity-0 group-hover:opacity-100 p-0.5 rounded text-indigo-400 hover:text-indigo-600 transition-all shrink-0"><Plus className="w-3.5 h-3.5" /></button>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────

export default function FormBuilderPage() {
  return (
    <DesktopOnlyGate
      title="The Form Builder needs more room"
      message="Drag-and-drop form building is designed for tablet and desktop screens. Switch to a bigger screen to keep editing — your form is safe either way."
    >
      <FormBuilderPageInner />
    </DesktopOnlyGate>
  );
}

function FormBuilderPageInner() {
  const { id } = useParams<{ id: string }>();
  const pathname = usePathname();
  const isCF = !!pathname?.startsWith("/cloudforms");
  const [form, setForm]                   = useState<any>(null);
  const [formFields, setFormFields]       = useState<any[]>([]);
  const [availableFields, setAvailableFields] = useState<any[]>([]);
  const [allModuleFields, setAllModuleFields] = useState<any[]>([]);
  const [sections, setSections]           = useState<any[]>([]);
  const [selectedFF, setSelectedFF]       = useState<any>(null);
  const [loading, setLoading]             = useState(true);
  const [saving, setSaving]               = useState(false);
  const [accessingForm, setAccessingForm] = useState(false);
  const [shareForm, setShareForm] = useState<{ id: string; name: string } | null>(null);
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [mode, setMode]                   = useState<"builder" | "rules" | "settings">("builder");
  const [rightTab, setRightTab]           = useState<"properties" | "rules" | "autofill">("properties");
  const [localSettings, setLocalSettings] = useState<any>({});
  // Chains saveSettingsPatch's PATCH requests so they always reach the server
  // in the order they were fired — see the comment inside saveSettingsPatch.
  const settingsSaveQueue = useRef<Promise<any>>(Promise.resolve());
  const [openRightSections, setOpenRightSections] = useState<Set<string>>(new Set(["actions"]));
  const toggleRightSection = (key: string) => setOpenRightSections(prev => {
    const n = new Set(prev); n.has(key) ? n.delete(key) : n.add(key); return n;
  });

  // DnD state
  const [activeId, setActiveId]           = useState<string | null>(null);
  const [overTarget, setOverTarget]       = useState<string | null>(null);
  const [sectionOverride, setSectionOverride] = useState<Record<string, string | null | "unsec">>({});
  // overFieldId tracked as ref (always current) + state (for renders that need it)
  const [overFieldId, setOverFieldId]     = useState<string | null>(null);
  const overFieldIdRef                    = useRef<string | null>(null);
  // Always-current cursor position — updated by a global pointermove watcher
  const lastPointerPosRef                 = useRef<{ x: number; y: number } | null>(null);
  // Track which custom-field IDs have had their key manually edited this session.
  // Per-field so switching between fields never accidentally re-enables auto-sync on a dirtied field.
  const manualKeyEditedIds                = useRef<Set<string>>(new Set());

  // Builder-level toast
  const [builderToast, setBuilderToast]   = useState<{ text: string; ok: boolean } | null>(null);
  useEffect(() => {
    if (!builderToast) return;
    const t = setTimeout(() => setBuilderToast(null), 3000);
    return () => clearTimeout(t);
  }, [builderToast]);


  // Booklet / normal page view
  const [pageView, setPageView]           = useState<"normal" | "booklet">("normal");

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  // Always track cursor position so we have coordinates at drag-start and when
  // the cursor is stationary (pointermove does not fire when not moving).
  useEffect(() => {
    const track = (e: PointerEvent) => { lastPointerPosRef.current = { x: e.clientX, y: e.clientY }; };
    window.addEventListener("pointermove", track, { passive: true });
    return () => window.removeEventListener("pointermove", track);
  }, []);

  // Detection logic extracted so it can be called from both the move handler
  // and the polling interval.
  const detectFieldAt = useCallback((x: number, y: number) => {
    // elementFromPoint skips pointer-events:none elements (e.g. DragOverlay),
    // so it returns the canvas field underneath the dragged preview.
    let el = document.elementFromPoint(x, y) as HTMLElement | null;
    let fid: string | null = null;
    let zid: string | null = null;
    while (el && el !== document.body) {
      if (!fid && (el as HTMLElement).dataset?.fieldId) fid = (el as HTMLElement).dataset.fieldId!;
      if (!zid && (el as HTMLElement).dataset?.zoneId) zid = (el as HTMLElement).dataset.zoneId!;
      if (fid && zid) break;
      el = el.parentElement;
    }
    // Sticky: never clear overFieldId mid-drag — clearing collapses the gap which
    // moves the pointer back onto the field, causing a flicker loop.
    if (fid && fid !== overFieldIdRef.current) {
      overFieldIdRef.current = fid;
      setOverFieldId(fid);
    }
    if (zid) setOverTarget(zid);
  }, []);

  // For palette/sidebar drags: detect via pointermove AND a 50ms interval.
  // The interval handles the case where the cursor is stationary over a field —
  // pointermove only fires on movement, so without polling the indicator would
  // never appear until the user moves the cursor again.
  useEffect(() => {
    const isPanelDrag = activeId?.startsWith("palette:") || activeId?.startsWith("sidebar:");
    if (!isPanelDrag) return;

    // Immediate check at the position the drag started from
    if (lastPointerPosRef.current) detectFieldAt(lastPointerPosRef.current.x, lastPointerPosRef.current.y);

    const moveHandler = (e: PointerEvent) => detectFieldAt(e.clientX, e.clientY);
    const intervalId  = setInterval(() => {
      if (lastPointerPosRef.current) detectFieldAt(lastPointerPosRef.current.x, lastPointerPosRef.current.y);
    }, 50);

    window.addEventListener("pointermove", moveHandler, { passive: true });
    return () => {
      window.removeEventListener("pointermove", moveHandler);
      clearInterval(intervalId);
    };
  }, [activeId, detectFieldAt]);

  // ── Load form ─────────────────────────────────────────────────────────────────

  const loadForm = useCallback(async () => {
    const [formRes, availRes] = await Promise.all([
      api.get(`/forms/${id}`),
      api.get(`/forms/${id}/available-fields`),
    ]);
    const f = formRes.data;
    setForm(f);
    setFormFields(f.fields || []);
    setSections(f.sections || []);
    setAvailableFields(availRes.data || []);

    // Ensure Page 1 always exists
    let settings = f.settings || {};
    if (!settings.pages || settings.pages.length === 0) {
      const page1: PageDef = { id: newUid(), title: "Page 1", description: "", order: 0 };
      settings = { ...settings, pages: [page1] };
      try { await api.patch(`/forms/${id}`, { settings }); } catch {}
    }
    setLocalSettings(settings);

    if (f.moduleId) {
      try {
        const allRes = await api.get(`/modules/${f.moduleId}/fields`);
        setAllModuleFields(allRes.data || []);
      } catch {}
    }
  }, [id]);

  useEffect(() => { loadForm().finally(() => setLoading(false)); }, [loadForm]);

  // ── Derived state ─────────────────────────────────────────────────────────────

  const isStandalone = !form?.moduleId;
  const pages: PageDef[] = [...(localSettings.pages || [])].sort((a, b) => a.order - b.order);
  const pageSections: Record<string, string> = localSettings.pageSections || {};
  const customFieldDefs: CustomFieldDef[] = localSettings.customFields || [];

  // Unified canvas items: module FormFields OR standalone CustomFields
  const canvasFields: any[] = isStandalone
    ? customFieldDefs.map(cf => ({
        id: cf.id,
        fieldId: cf.id,
        sectionId: cf.sectionId || null,
        order: cf.order,
        isRequired: cf.required || false,
        isHidden: false, isReadonly: false,
        customLabel: cf.label,
        conditionalLogic: null,
        isCustom: true,
      }))
    : formFields.map(ff => ({ ...ff, isCustom: false }));

  // Live canvas: apply sectionOverride during drag
  const liveCanvasFields = canvasFields.map(ff => {
    if (sectionOverride[ff.id] !== undefined) {
      return { ...ff, sectionId: sectionOverride[ff.id] === "unsec" ? null : sectionOverride[ff.id] };
    }
    return ff;
  });

  // Get "module field" metadata (for type icon, label fallback)
  const allCanvasModuleField = (fieldId: string): any => {
    const mf = allModuleFields.find(f => f.id === fieldId) || availableFields.find(f => f.id === fieldId);
    if (mf) return mf;
    const cf = customFieldDefs.find(c => c.id === fieldId);
    if (cf) return { id: cf.id, name: cf.name, label: cf.label, type: cf.type, options: cf.options || [] };
    return null;
  };

  // ── Settings helpers ──────────────────────────────────────────────────────────

  const handleSettingsChange = (updates: any) =>
    setLocalSettings((prev: any) => ({ ...prev, ...updates }));

  const saveSettings = async () => {
    setSettingsSaving(true);
    try {
      await api.patch(`/forms/${id}`, { settings: localSettings });
      setBuilderToast({ text: "Settings saved", ok: true });
      setTimeout(() => setBuilderToast(null), 3000);
    } catch {
      setBuilderToast({ text: "Failed to save settings", ok: false });
      setTimeout(() => setBuilderToast(null), 3000);
    } finally {
      setSettingsSaving(false);
    }
  };

  const saveSettingsPatch = async (patch: any) => {
    // Merge via the functional setState form so this always builds on the freshest
    // state — plain `{...localSettings, ...patch}` can clobber a just-applied change
    // (e.g. a column-width toggle) if two saves fire in quick succession.
    let next: any;
    setLocalSettings((prev: any) => {
      next = { ...prev, ...patch };
      return next;
    });
    // The server does a blind full-column replace of `settings` (no merge, no
    // version check) — so if two PATCH requests are in flight at once, whichever
    // one's *response* the server processes last wins, regardless of which was
    // fired first. Rapid edits (e.g. toggling several Search Fields in a row)
    // could silently revert to an earlier, incomplete selection. Chaining every
    // call onto the same promise forces them to hit the server in the order
    // they were made, so the last edit always wins.
    settingsSaveQueue.current = settingsSaveQueue.current
      .catch(() => {})
      .then(() => api.patch(`/forms/${id}`, { settings: next }))
      .catch(() => {});
    await settingsSaveQueue.current;
  };

  // ── Page helpers ──────────────────────────────────────────────────────────────

  const addPage = () => {
    const newPage: PageDef = { id: newUid(), title: `Page ${pages.length + 1}`, description: "", order: pages.length };
    saveSettingsPatch({ pages: [...pages, newPage] });
  };

  const deletePage = (pageId: string) => {
    if (pages.length <= 1) return;
    const newPages = pages.filter(p => p.id !== pageId);
    const newPS = { ...pageSections };
    Object.keys(newPS).forEach(sid => { if (newPS[sid] === pageId) delete newPS[sid]; });
    const newRules = (localSettings.pageRules || []).filter((r: any) => r.sourcePageId !== pageId && r.targetPageId !== pageId);
    saveSettingsPatch({ pages: newPages, pageSections: newPS, pageRules: newRules });
  };

  const updatePage = (pageId: string, changes: Partial<PageDef>) => {
    saveSettingsPatch({ pages: pages.map(p => p.id === pageId ? { ...p, ...changes } : p) });
  };

  // ── Section helpers ───────────────────────────────────────────────────────────

  const addSection = async (pageId?: string) => {
    const label = `Section ${sections.length + 1}`;
    const { data } = await api.post(`/forms/${id}/sections`, { label });
    setSections(prev => [...prev, data]);
    if (pageId) {
      const newPS = { ...pageSections, [data.id]: pageId };
      saveSettingsPatch({ pageSections: newPS });
    }
  };

  const deleteSection = async (sectionId: string) => {
    await api.delete(`/forms/${id}/sections/${sectionId}`);
    setSections(prev => prev.filter(s => s.id !== sectionId));
    const newPS = { ...pageSections };
    delete newPS[sectionId];
    saveSettingsPatch({ pageSections: newPS });
  };

  const updateSectionLocal = (sectionId: string, changes: any) =>
    setSections(prev => prev.map(s => s.id === sectionId ? { ...s, ...changes } : s));

  const saveSectionToBackend = async (sectionId: string, changes: any) => {
    try { await api.patch(`/forms/${id}/sections/${sectionId}`, changes); } catch {}
  };

  // ── Module field helpers ──────────────────────────────────────────────────────

  const addFieldToForm = async (fieldId: string, sectionId: string | null = null) => {
    const payload: any = { fieldId };
    if (sectionId) payload.sectionId = sectionId;
    const { data } = await api.post(`/forms/${id}/fields`, payload);
    setFormFields(prev => [...prev, data]);
    setAvailableFields(prev => prev.filter(f => f.id !== fieldId));
    setSelectedFF({ ...data, isCustom: false });
    setRightTab("properties");
    return data;
  };

  const removeModuleField = async (ffId: string, fieldId: string) => {
    await api.delete(`/forms/${id}/fields/${ffId}`);
    setFormFields(prev => prev.filter(f => f.id !== ffId));
    const mf = allModuleFields.find(f => f.id === fieldId);
    if (mf) setAvailableFields(prev => [...prev, mf].sort((a, b) => a.order - b.order));
    if (selectedFF?.id === ffId) setSelectedFF(null);
  };

  const updateModuleField = async (ffId: string, changes: any) => {
    const updated = { ...selectedFF, ...changes };
    setSelectedFF(updated);
    setFormFields(prev => prev.map(f => f.id === ffId ? updated : f));
    try { await api.patch(`/forms/${id}/fields/${ffId}`, changes); } catch {}
  };

  // ── Custom field helpers ──────────────────────────────────────────────────────

  const addCustomField = async (type: string, insertBeforeId?: string | null, sectionId: string | null = null) => {
    const cfId = newUid();
    const count = customFieldDefs.length + 1;
    const typeLabel = CUSTOM_FIELD_TYPES.find(t => t.type === type)?.label || type;
    const cf: CustomFieldDef = {
      id: cfId,
      label: `${typeLabel} ${count}`,
      name: `field_${count}`,
      type,
      required: false,
      order: count - 1,
      sectionId,
      options: OPTION_BEARING_TYPES.includes(type)
        ? [{ value: "option_1", label: "Option 1" }, { value: "option_2", label: "Option 2" }]
        : [],
    };

    let newCFs: CustomFieldDef[];
    const insertIdx = insertBeforeId ? customFieldDefs.findIndex(f => f.id === insertBeforeId) : -1;
    if (insertIdx !== -1) {
      newCFs = [
        ...customFieldDefs.slice(0, insertIdx),
        { ...cf, order: insertIdx },
        ...customFieldDefs.slice(insertIdx),
      ].map((f, i) => ({ ...f, order: i }));
    } else {
      newCFs = [...customFieldDefs, cf];
    }

    await saveSettingsPatch({ customFields: newCFs });
    const finalOrder = newCFs.findIndex(f => f.id === cfId);
    const displayCF = { id: cf.id, fieldId: cf.id, sectionId, order: finalOrder, isRequired: false, isHidden: false, isReadonly: false, customLabel: cf.label, isCustom: true };
    setSelectedFF(displayCF);
    setRightTab("properties");
  };

  const removeCanvasField = async (ff: any) => {
    if (ff.isCustom) {
      const newCFs = customFieldDefs.filter(c => c.id !== ff.id);
      await saveSettingsPatch({ customFields: newCFs });
    } else {
      await removeModuleField(ff.id, ff.fieldId);
    }
    if (selectedFF?.id === ff.id) setSelectedFF(null);
  };

  const updateCanvasField = async (ff: any, changes: any) => {
    if (ff.isCustom) {
      const newCFs = customFieldDefs.map(c => c.id === ff.id ? { ...c, ...changes } : c);
      await saveSettingsPatch({ customFields: newCFs });
      setSelectedFF((prev: any) => prev?.id === ff.id ? { ...prev, ...changes } : prev);
    } else {
      await updateModuleField(ff.id, changes);
    }
  };

  const generateFieldKey = (label: string): string =>
    label
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .trim()
      .replace(/\s+/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '') || 'field';

  const updateCustomFieldLabel = (cfId: string, label: string) => {
    const autoKey = !manualKeyEditedIds.current.has(cfId) ? generateFieldKey(label) : undefined;
    const newCFs = customFieldDefs.map(c =>
      c.id === cfId ? { ...c, label, ...(autoKey !== undefined ? { name: autoKey } : {}) } : c
    );
    setLocalSettings((prev: any) => ({ ...prev, customFields: newCFs }));
    setSelectedFF((prev: any) => prev?.id === cfId ? { ...prev, customLabel: label } : prev);
    // Debounced save
    clearTimeout((window as any).__cfLabelTimer);
    (window as any).__cfLabelTimer = setTimeout(() => {
      saveSettingsPatch({ customFields: newCFs });
    }, 800);
  };

  // ── Column layout helpers ─────────────────────────────────────────────────────

  const fieldLayouts: Record<string, "full" | "half"> = localSettings.fieldLayouts || {};
  const getColSpan = (fieldId: string): "full" | "half" => fieldLayouts[fieldId] || "full";
  const toggleColSpan = (fieldId: string) => {
    const next = getColSpan(fieldId) === "full" ? "half" : "full";
    saveSettingsPatch({ fieldLayouts: { ...fieldLayouts, [fieldId]: next } });
  };

  // ── DnD handlers ─────────────────────────────────────────────────────────────

  const resolveTarget = (over: any): string | null => {
    if (!over) return null;
    const overId = String(over.id);
    if (over.data?.current?.type === "section") return `sec:${over.data.current.sectionId}`;
    if (over.data?.current?.type === "unsec-zone") return "unsec";
    if (over.data?.current?.type === "page-empty") return `page-empty:${over.data.current.pageId}`;
    if (overId === "unsec") return "unsec";
    if (overId.startsWith("page-empty:")) return overId;
    // Hovering over a field: use that field's current effective sectionId
    const overFF = liveCanvasFields.find(f => f.id === overId);
    if (overFF) return overFF.sectionId ? `sec:${overFF.sectionId}` : "unsec";
    return null;
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(String(event.active.id));
    setSectionOverride({});
    setOverTarget(null);
    setOverFieldId(null);
    overFieldIdRef.current = null;
  };

  const handleDragCancel = () => {
    setActiveId(null);
    setSectionOverride({});
    setOverTarget(null);
    setOverFieldId(null);
    overFieldIdRef.current = null;
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    const draggedId = String(active.id);

    // Track last hovered canvas field for ALL drag types
    const overId = over ? String(over.id) : null;
    const overHasSortable = !!(over as any)?.data?.current?.sortable;
    if (overId && overId !== draggedId && (overHasSortable || liveCanvasFields.find(f => f.id === overId))) {
      overFieldIdRef.current = overId;
      setOverFieldId(overId);
    }

    const target = resolveTarget(over);

    // Panel drags: update zone target for placeholder feedback, then stop.
    // Only clear the field indicator when hovering over a bare zone (not a field).
    if (draggedId.startsWith("sidebar:") || draggedId.startsWith("palette:")) {
      setOverTarget(target);
      const isOverField = overId && (overHasSortable || !!liveCanvasFields.find(f => f.id === overId));
      if (target && !isOverField) setOverFieldId(null);
      return;
    }

    setOverTarget(target);

    // Update sectionOverride for live visual feedback (skip for page-empty targets)
    if (target && !target.startsWith("page-empty:")) {
      const currentEff = sectionOverride[draggedId] !== undefined
        ? sectionOverride[draggedId]
        : (canvasFields.find(f => f.id === draggedId)?.sectionId || null);
      const newSectionVal = target === "unsec" ? "unsec" : target.slice(4);
      if (currentEff !== newSectionVal) {
        setSectionOverride(prev => ({ ...prev, [draggedId]: newSectionVal }));
      }
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    const draggedId = String(active.id);

    setActiveId(null);
    setOverTarget(null);
    const cachedOverFieldId = overFieldIdRef.current;
    overFieldIdRef.current = null;
    setOverFieldId(null);

    // ── Palette type drop (standalone custom form mode) ──
    if (draggedId.startsWith("palette:")) {
      setSectionOverride({});
      // cachedOverFieldId is set by the pointermove listener and is the most reliable
      // insertion point (the last field the pointer was over during the drag).
      // over.id at drop time is a secondary fallback for when the pointer happens to be
      // exactly on a registered droppable.
      const dropOverId = over ? String(over.id) : null;
      const insertBeforeId = cachedOverFieldId
        ?? (dropOverId && liveCanvasFields.find(f => f.id === dropOverId) ? dropOverId : null);

      // Resolve which section/zone was actually dropped on — falling back to the
      // section of the hovered field when the pointer landed exactly on a field.
      let target = resolveTarget(over);
      if (!target && insertBeforeId) {
        const overFF = liveCanvasFields.find(f => f.id === insertBeforeId);
        if (overFF) target = overFF.sectionId ? `sec:${overFF.sectionId}` : "unsec";
      }

      if (target?.startsWith("page-empty:")) {
        // Auto-create a section in this empty page, then add the field to it
        const targetPageId = target.slice(11);
        const { data: newSec } = await api.post(`/forms/${id}/sections`, { label: "" });
        setSections(prev => [...prev, newSec]);
        const newPS = { ...pageSections, [newSec.id]: targetPageId };
        await saveSettingsPatch({ pageSections: newPS });
        await addCustomField(draggedId.slice(8), null, newSec.id);
        return;
      }

      const targetSectionId = target === "unsec" ? null : target ? target.slice(4) : null;
      await addCustomField(draggedId.slice(8), insertBeforeId, targetSectionId);
      return;
    }

    // ── Sidebar field drop (module mode) ──
    if (draggedId.startsWith("sidebar:")) {
      setSectionOverride({});
      if (!over) return;
      const target = resolveTarget(over);
      if (target?.startsWith("page-empty:")) {
        // Auto-create a section in this page, then add field to it
        const targetPageId = target.slice(11);
        const { data: newSec } = await api.post(`/forms/${id}/sections`, { label: "" });
        setSections(prev => [...prev, newSec]);
        const newPS = { ...pageSections, [newSec.id]: targetPageId };
        await saveSettingsPatch({ pageSections: newPS });
        await addFieldToForm(draggedId.slice(8), newSec.id);
      } else {
        const targetSectionId = target === "unsec" ? null : target ? target.slice(4) : null;
        const newField = await addFieldToForm(draggedId.slice(8), targetSectionId);
        // If dropped over a specific field, reorder so the new field lands there instead of at the end.
        // Primary: over.id at drop time; fallback: last field tracked in handleDragOver.
        const dropOverId = String(over.id);
        const insertAtFieldId = (liveCanvasFields.find(f => f.id === dropOverId) ? dropOverId : null)
          ?? cachedOverFieldId;
        if (insertAtFieldId && newField) {
          const containerFields = liveCanvasFields
            .filter(f => (f.sectionId || null) === targetSectionId)
            .sort((a, b) => a.order - b.order);
          const insertIdx = containerFields.findIndex(f => f.id === insertAtFieldId);
          if (insertIdx !== -1) {
            const withNew = [
              ...containerFields.slice(0, insertIdx),
              { ...newField, order: insertIdx },
              ...containerFields.slice(insertIdx),
            ].map((f, i) => ({ ...f, order: i }));
            setFormFields(prev => {
              const others = prev.filter(f => (f.sectionId || null) !== targetSectionId);
              return [...others, ...withNew];
            });
            try { await api.post(`/forms/${id}/fields/reorder`, { formFieldIds: withNew.map(f => f.id) }); } catch {}
          }
        }
      }
      return;
    }

    // ── Existing field drop ──
    const origFF = canvasFields.find(f => f.id === draggedId);
    if (!origFF) { setSectionOverride({}); return; }

    const origSectionId = origFF.sectionId;
    const overrideVal = sectionOverride[draggedId];
    const newSectionVal = overrideVal !== undefined ? overrideVal : (origSectionId || null);
    setSectionOverride({});

    if (!over) return;

    const overId = String(over.id);
    const target = resolveTarget(over);

    // If dropped onto a page-empty zone, auto-create a section there
    if (target?.startsWith("page-empty:")) {
      const targetPageId = target.slice(11);
      const { data: newSec } = await api.post(`/forms/${id}/sections`, { label: "" });
      setSections(prev => [...prev, newSec]);
      const newPS = { ...pageSections, [newSec.id]: targetPageId };
      await saveSettingsPatch({ pageSections: newPS });
      setFormFields(prev => prev.map(f => f.id === draggedId ? { ...f, sectionId: newSec.id } : f));
      try { await api.patch(`/forms/${id}/fields/${draggedId}`, { sectionId: newSec.id }); } catch {}
      return;
    }

    const finalSectionId = target === "unsec" ? null : target ? target.slice(4) : null;

    if ((origSectionId || null) !== (finalSectionId)) {
      // Cross-container move
      if (origFF.isCustom) {
        const newCFs = customFieldDefs.map(c => c.id === draggedId ? { ...c, sectionId: finalSectionId } : c);
        await saveSettingsPatch({ customFields: newCFs });
      } else {
        setFormFields(prev => prev.map(f => f.id === draggedId ? { ...f, sectionId: finalSectionId } : f));
        try { await api.patch(`/forms/${id}/fields/${draggedId}`, { sectionId: finalSectionId }); } catch {}
      }
    } else {
      // Same container: reorder
      const containerFields = liveCanvasFields
        .filter(f => (f.sectionId || null) === finalSectionId)
        .sort((a, b) => a.order - b.order);

      const oldIdx = containerFields.findIndex(f => f.id === draggedId);
      const newIdx = (() => {
        // Primary: direct field ID match (builderCollision returns field IDs now)
        const direct = containerFields.findIndex(f => f.id === overId);
        if (direct !== -1) return direct;
        // Secondary: sortable index from dnd-kit's own tracking
        const overSortableIdx = (over as any)?.data?.current?.sortable?.index;
        if (typeof overSortableIdx === "number" && overSortableIdx >= 0 && overSortableIdx < containerFields.length) {
          return overSortableIdx;
        }
        // Tertiary: last hovered field ref (set in handleDragOver)
        if (cachedOverFieldId) {
          const refIdx = containerFields.findIndex(f => f.id === cachedOverFieldId);
          if (refIdx !== -1) return refIdx;
        }
        return -1;
      })();

      if (oldIdx !== -1 && newIdx !== -1 && oldIdx !== newIdx) {
        const reordered = arrayMove(containerFields, oldIdx, newIdx);
        // Assign new order values so the sort-by-order render doesn't revert the result
        const withOrders = reordered.map((f, i) => ({ ...f, order: i }));
        if (origFF.isCustom) {
          const newCFs = customFieldDefs.map(cf => {
            const updated = withOrders.find(r => r.id === cf.id);
            return updated ? { ...cf, order: updated.order } : cf;
          });
          await saveSettingsPatch({ customFields: newCFs });
        } else {
          setFormFields(prev => {
            const others = prev.filter(f => (f.sectionId || null) !== finalSectionId);
            return [...others, ...withOrders];
          });
          try { await api.post(`/forms/${id}/fields/reorder`, { formFieldIds: withOrders.map(f => f.id) }); } catch {}
        }
      }
    }
  };

  // ── Save form ─────────────────────────────────────────────────────────────────

  const saveForm = async () => {
    if (!form) return;
    setSaving(true);
    try {
      await api.patch(`/forms/${id}`, { name: form.name, description: form.description, type: form.type });
      setBuilderToast({ text: "Changes saved successfully", ok: true });
    } catch {
      setBuilderToast({ text: "Failed to save changes", ok: false });
    } finally {
      setSaving(false);
    }
  };

  const openForm = async () => {
    if (form?.token) { window.open(`/f/${form.token}`, "_blank"); return; }
    setAccessingForm(true);
    try {
      const { data } = await api.post(`/forms/${id}/generate-token`);
      setForm((prev: any) => ({ ...prev, token: data.token }));
      window.open(`/f/${data.token}`, "_blank");
    } catch {}
    setAccessingForm(false);
  };

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 text-indigo-600 animate-spin" /></div>;

  const selectedCF = isStandalone && selectedFF ? customFieldDefs.find(c => c.id === selectedFF.id) : null;
  const selectedMF = !isStandalone && selectedFF ? allCanvasModuleField(selectedFF.fieldId) : null;
  const isLookup = selectedMF?.type === "LOOKUP";
  const isIntegration = selectedMF?.type === "INTEGRATION" || selectedCF?.type === "INTEGRATION";

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 50,
      display: "flex", flexDirection: "column",
      background: isCF ? "#eef0f5" : "#f8fafc",
    }}>
      {/* ── Builder toast notification ──────────────────────────────────────── */}
      {builderToast && (
        <div style={{
          position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)",
          zIndex: 9999, display: "flex", alignItems: "center", gap: 8,
          padding: "10px 18px", borderRadius: 10, fontSize: 13, fontWeight: 500,
          boxShadow: "0 4px 20px rgba(0,0,0,0.12)",
          background: builderToast.ok ? "#f0fdf4" : "#fef2f2",
          color: builderToast.ok ? "#166534" : "#991b1b",
          border: `1px solid ${builderToast.ok ? "#bbf7d0" : "#fecaca"}`,
          animation: "toastSlideUp 0.25s ease",
          whiteSpace: "nowrap",
        }}>
          <CheckCircle2 style={{ width: 16, height: 16, flexShrink: 0 }} />
          {builderToast.text}
          <style>{`@keyframes toastSlideUp { from { opacity:0; transform:translate(-50%,10px); } to { opacity:1; transform:translate(-50%,0); } }`}</style>
        </div>
      )}

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 20px", height: 52, flexShrink: 0,
        ...(isCF
          ? { background: "linear-gradient(90deg, #1e1b4b 0%, #3730a3 60%, #4c1d95 100%)", boxShadow: "0 2px 8px rgba(30,27,75,0.35)" }
          : { background: "#ffffff", borderBottom: "1px solid #e2e8f0" })
      }}>
        {/* LEFT: back + name + save */}
        <div className="flex items-center gap-2 min-w-0">
          <Link href={isCF ? "/cloudforms" : "/forms"}>
            <Button variant="ghost" size="icon" className={cn("h-8 w-8 shrink-0", isCF && "text-white/70 hover:text-white hover:bg-white/10")}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div className="min-w-0 flex-1">
            <input value={form?.name || ""} onChange={e => setForm((p: any) => ({ ...p, name: e.target.value }))} className={cn("font-semibold bg-transparent border-0 outline-none text-sm w-full", isCF ? "text-white placeholder:text-white/40" : "text-gray-900")} placeholder="Form name…" />
            <p className={cn("text-xs", isCF ? "text-white/50" : "text-gray-400")}>
              {liveCanvasFields.length} fields · {sections.length} sections · {pages.length} page{pages.length !== 1 ? "s" : ""}
              {isStandalone && <span className="ml-2 text-amber-600 font-medium">· standalone form</span>}
            </p>
          </div>
          <Button size="sm" onClick={saveForm} disabled={saving}
            className={cn("gap-2 shrink-0", isCF && "bg-violet-600 hover:bg-violet-500 border-violet-600 text-white")}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save
          </Button>
        </div>
        {/* CENTER: mode tabs */}
        <div className={cn("flex items-center gap-1 rounded-lg p-1 shrink-0", isCF ? "bg-white/10" : "bg-gray-100")}>
          {[
            { key: "builder", label: "Fields" },
            { key: "rules", label: "Rules", icon: <Zap className="w-3.5 h-3.5" /> },
            { key: "settings", label: "Settings", icon: <Settings className="w-3.5 h-3.5" /> },
          ].map(({ key, label, icon }) => (
            <button key={key} onClick={() => setMode(key as any)}
              className={cn("px-3 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5",
                mode === key
                  ? (isCF ? "bg-white/15 text-white shadow-sm" : "bg-white shadow-sm text-gray-900")
                  : (isCF ? "text-white/50 hover:text-white/80" : "text-gray-500 hover:text-gray-700"))}>
              {icon}{label}
            </button>
          ))}
        </div>
        {/* RIGHT: preview + share */}
        <div className="flex items-center gap-2 shrink-0">
          <Button variant="outline" size="sm" onClick={openForm} disabled={accessingForm}
            className={cn("gap-2", isCF && "border-white/20 bg-transparent text-white hover:bg-white/10 hover:text-white")}>
            {accessingForm ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ExternalLink className="w-3.5 h-3.5" />} Open Form
          </Button>
          <Button variant="outline" size="sm" onClick={() => form && setShareForm({ id: form.id, name: form.name ?? "Form" })}
            className={cn("gap-2", isCF && "border-white/20 bg-transparent text-white hover:bg-white/10 hover:text-white")}>
            <Share2Icon className="w-3.5 h-3.5" /> Share
          </Button>
        </div>
      </div>

      {/* ── Rules Mode ──────────────────────────────────────────────────────── */}
      {mode === "rules" && (
        <div style={{ flex: 1, overflow: "hidden", background: "#f8fafc" }}>
          <FormRuleEngine formFields={liveCanvasFields} allModuleFields={allModuleFields} sections={sections} settings={localSettings} onSettingsChange={handleSettingsChange} onSave={saveSettings} saving={settingsSaving} />
        </div>
      )}

      {/* ── Settings Mode ───────────────────────────────────────────────────── */}
      {mode === "settings" && (
        <div style={{ flex: 1, overflow: "hidden", background: "#f8fafc" }}>
          <FormSettingsPanel form={form} settings={localSettings} onSettingsChange={handleSettingsChange} onSave={saveSettings} saving={settingsSaving} allModuleFields={allModuleFields} />
        </div>
      )}

      {/* ── Builder Mode ────────────────────────────────────────────────────── */}
      {mode === "builder" && (
        <BuilderDragCtx.Provider value={{ activeId, overFieldId, overTarget }}>
        <DndContext sensors={sensors} collisionDetection={builderCollision} autoScroll={{ acceleration: 15, threshold: { x: 0, y: 0.15 } }} onDragStart={handleDragStart} onDragOver={handleDragOver} onDragEnd={handleDragEnd} onDragCancel={handleDragCancel}>
          {/* Three-column layout */}
          <div style={{ display: "flex", flex: 1, minHeight: 0, overflow: "hidden" }}>

            {/* ── Left sidebar ──────────────────────────────────────────────── */}
            <div style={{
              width: isCF ? 168 : 220, flexShrink: 0,
              display: "flex", flexDirection: "column",
              background: "#ffffff", borderRight: "1px solid #e5e7eb",
              overflow: "hidden",
            }}>
              {isStandalone ? (
                <>
                  <div className="px-3 py-3 border-b border-gray-100">
                    <p className="text-xs font-semibold text-gray-600">Fill Section</p>
                    <p className="text-[10px] mt-0.5 text-gray-400 leading-tight">Click a field type to add it to the form</p>
                  </div>
                  <ScrollArea className="flex-1">
                    <div><CustomFieldPalette onAdd={addCustomField} dark={false} /></div>
                  </ScrollArea>
                  {isCF ? (
                    <div className="p-3 border-t border-gray-200">
                      <button
                        onClick={() => addSection(pages[0]?.id)}
                        className="w-full py-2.5 rounded-xl text-xs font-semibold text-white flex items-center justify-center gap-1.5 transition-all hover:opacity-90 active:scale-[0.98]"
                        style={{ background: "linear-gradient(135deg, #4c1d95, #3730a3)" }}
                      >
                        <Plus className="w-3.5 h-3.5" /> Add Section
                      </button>
                    </div>
                  ) : (
                    <div className="border-t p-3 space-y-2">
                      <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Integration</p>
                      <div className="text-xs text-gray-400 leading-relaxed">
                        Standalone form — ready for integration with external services.
                      </div>
                      <div className="flex items-center gap-1.5 px-2 py-2 bg-amber-50 border border-amber-100 rounded-lg">
                        <Link2 className="w-3 h-3 text-amber-500 shrink-0" />
                        <span className="text-[10px] text-amber-700 font-medium">Google Sheets, CRM, webhooks — coming soon</span>
                      </div>
                      <Button size="sm" variant="outline" className="w-full gap-1.5 text-xs h-8" asChild>
                        <Link href={`/forms/${id}`}><Link2 className="w-3 h-3" /> Link to Module</Link>
                      </Button>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div className="px-3 py-3 border-b border-gray-100">
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Available Fields</p>
                    <p className="text-xs mt-0.5 text-gray-400">Click + or drag to a section</p>
                  </div>
                  <ScrollArea className="flex-1">
                    <div className="p-2 space-y-0.5">
                      {availableFields.length === 0
                        ? <p className="text-xs text-center py-6 text-gray-400">All fields added</p>
                        : availableFields.map(f => <SidebarFieldItem key={f.id} field={f} onAdd={() => addFieldToForm(f.id, null)} />)
                      }
                    </div>
                  </ScrollArea>
                  <div className="p-3 border-t border-gray-100">
                    <p className="text-[10px] font-semibold uppercase tracking-wide mb-1 text-gray-400">Module</p>
                    <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-indigo-50">
                      <FileText className="w-3 h-3 shrink-0 text-indigo-500" />
                      <p className="text-xs font-medium truncate text-indigo-700">{form?.module?.name || form?.moduleId}</p>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* ── Canvas ────────────────────────────────────────────────────── */}
            <div style={{ flex: 1, background: "#f0f2f7", display: "flex", flexDirection: "column", minWidth: 0, overflow: "hidden" }}>
              {/* Canvas toolbar */}
              <div style={{ zIndex: 10, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 16px", background: "#ffffff", borderBottom: "1px solid #e5e7eb", boxShadow: "0 1px 3px rgba(0,0,0,0.06)", flexShrink: 0 }}>
                <p className="text-xs text-gray-500">
                  {liveCanvasFields.length === 0 ? (isStandalone ? "← Click a field type to add it" : "← Drag or click + to add fields") : `${liveCanvasFields.length} field${liveCanvasFields.length !== 1 ? "s" : ""} · drag to reorder`}
                </p>
                <div className="flex items-center gap-2">
                  {pages.length > 1 && (
                    <span className="text-xs px-2 py-1 rounded-full font-medium text-indigo-600 bg-indigo-50">
                      {pages.length} pages
                    </span>
                  )}
                  {pages.length > 1 && (
                    <button
                      onClick={() => setPageView(v => v === "normal" ? "booklet" : "normal")}
                      title={pageView === "normal" ? "Switch to booklet view (side-by-side pages)" : "Switch to normal view (stacked pages)"}
                      className={cn("h-7 px-2 rounded-md border text-xs flex items-center gap-1.5 transition-colors",
                        pageView === "booklet"
                          ? "bg-indigo-600 border-indigo-600 text-white"
                          : "border-gray-200 text-gray-500 hover:border-indigo-300 hover:text-indigo-600")}
                    >
                      <Columns2 className="w-3.5 h-3.5" />
                      {pageView === "booklet" ? "Booklet" : "Booklet"}
                    </button>
                  )}
                  <Button size="sm" variant="outline" onClick={addPage} className="h-7 text-xs gap-1.5">
                    <Plus className="w-3 h-3" /> Add Page
                  </Button>
                </div>
              </div>

              {/* ── Normal view ── */}
              {pageView === "normal" && (
              <div style={{ flex: 1, overflowY: "auto" }}>
              <div style={{ padding: "20px", width: "100%", maxWidth: 900, margin: "0 auto", display: "flex", flexDirection: "column", gap: 16, paddingBottom: 48 }}>

                {/* ── Canvas header preview ────────────────────────────────── */}
                {(localSettings.header?.title || localSettings.header?.bannerUrl || localSettings.header?.logoUrl) && (() => {
                  const hdr = localSettings.header || {};
                  const bg = hdr.bgType === "gradient"
                    ? `linear-gradient(${hdr.gradientAngle ?? 135}deg, ${hdr.bgColor || "#4338ca"}, ${hdr.bgGradientTo || "#6366f1"})`
                    : (hdr.bgColor || "#4338ca");
                  return (
                    <div className="rounded-2xl overflow-hidden border border-slate-200 shadow-sm">
                      {hdr.bannerUrl && (
                        <div className="h-28 overflow-hidden bg-slate-100">
                          <img src={hdr.bannerUrl} alt="" className="w-full h-full object-cover"
                            onError={e => { (e.target as any).parentElement.style.display = "none"; }} />
                        </div>
                      )}
                      {(() => {
                        const logoH: Record<string, string> = { sm: "h-10", md: "h-14", lg: "h-20" };
                        const canvasLogoClass = logoH[hdr.logoSize || "md"] || "h-14";
                        const canvasIsLeft = (hdr.logoPosition || "center") === "left" && !!hdr.logoUrl;
                        return (
                          <div
                            className="px-8 py-6"
                            style={{
                              background: bg, color: hdr.textColor || "#FFFFFF",
                              textAlign: (hdr.alignment || "center") as any,
                              display: "flex",
                              flexDirection: canvasIsLeft ? "row" : "column",
                              alignItems: canvasIsLeft ? "center" : (hdr.alignment === "left" ? "flex-start" : hdr.alignment === "right" ? "flex-end" : "center"),
                              gap: canvasIsLeft ? "1.25rem" : undefined,
                            }}
                          >
                            {hdr.logoUrl && (
                              <img src={hdr.logoUrl} alt="Logo"
                                className={cn(canvasLogoClass, "shrink-0 object-contain rounded")}
                                onError={e => { (e.target as any).style.display = "none"; }} />
                            )}
                            <div>
                              <h2 className="text-xl font-bold leading-tight">{hdr.title || form?.name}</h2>
                              {hdr.subtitle && <p className="text-sm opacity-80 mt-1">{hdr.subtitle}</p>}
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  );
                })()}

                {/* Page blocks — always at least Page 1 */}
                {pages.map((page, pi) => {
                  // Sections on this page = explicitly assigned OR (page 1 only) unassigned sections
                  const sectionsOnPage = sections
                    .filter(s => {
                      const assigned = pageSections[s.id];
                      return assigned === page.id || (!assigned && pi === 0);
                    })
                    .sort((a, b) => a.order - b.order);

                  return (
                    <PageBlock
                      key={page.id}
                      page={page}
                      pageNumber={pi + 1}
                      totalPages={pages.length}
                      sectionsOnPage={sectionsOnPage}
                      canvasFields={liveCanvasFields}
                      allCanvasModuleField={allCanvasModuleField}
                      pageSections={pageSections}
                      selectedFF={selectedFF}
                      onFieldSelect={ff => { setSelectedFF(ff); setRightTab("properties"); }}
                      onFieldRemove={removeCanvasField}
                      onSectionUpdate={updateSectionLocal}
                      onSectionDelete={deleteSection}
                      onSectionSave={saveSectionToBackend}
                      onAddSection={addSection}
                      onUpdatePage={updatePage}
                      onDeletePage={deletePage}
                      availableFields={availableFields}
                      onAddField={addFieldToForm}
                      overTarget={overTarget}
                      isCustom={isStandalone}
                      onLabelChange={isStandalone
                        ? updateCustomFieldLabel
                        : (ffId, label) => updateModuleField(ffId, { customLabel: label })}
                      getColSpan={getColSpan}
                      onToggleWidth={toggleColSpan}
                    />
                  );
                })}

                {/* Add another page */}
                <button
                  onClick={addPage}
                  className="w-full py-4 border-2 border-dashed border-slate-200 rounded-2xl text-sm text-slate-400 hover:border-indigo-300 hover:text-indigo-500 hover:bg-indigo-50/40 transition-all flex items-center justify-center gap-2 font-medium"
                >
                  <Plus className="w-5 h-5" /> Add Page
                </button>

                {pages.length > 1 && (
                  <div className="flex items-start gap-3 p-4 rounded-xl bg-indigo-50 border border-indigo-100 text-xs text-indigo-700">
                    <Zap className="w-4 h-4 shrink-0 mt-0.5 text-indigo-500" />
                    <div>
                      <p className="font-semibold">Page Routing Rules</p>
                      <p className="mt-0.5 text-indigo-600/80">Use the <button onClick={() => setMode("rules")} className="underline font-medium">Rules tab</button> to conditionally skip or jump pages based on field values.</p>
                    </div>
                  </div>
                )}

                {/* ── CF preview / save bar ── */}
                {isCF && (
                  <div className="flex items-center justify-between pt-2 pb-4">
                    <button
                      onClick={openForm}
                      disabled={accessingForm}
                      className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-gray-600 border border-gray-300 bg-white hover:bg-gray-50 transition-all shadow-sm"
                    >
                      {accessingForm ? <Loader2 className="w-4 h-4 animate-spin" /> : <Eye className="w-4 h-4" />}
                      Preview
                    </button>
                    <button
                      onClick={saveForm}
                      disabled={saving}
                      className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 active:scale-[0.98] shadow-md"
                      style={{ background: "linear-gradient(135deg, #4c1d95, #3730a3)" }}
                    >
                      {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                      Save Form
                    </button>
                  </div>
                )}
              </div>
              </div>
              )}

              {/* ── Booklet view (pages side-by-side) ────────────────────────── */}
              {pageView === "booklet" && (
                <div style={{ flex: 1, display: "flex", overflowX: "auto", overflowY: "hidden" }}>
                  {pages.map((page, pi) => {
                    const bookletSections = sections
                      .filter(s => {
                        const assigned = pageSections[s.id];
                        return assigned === page.id || (!assigned && pi === 0);
                      })
                      .sort((a, b) => a.order - b.order);
                    return (
                      <div key={page.id} style={{
                        width: 660, flexShrink: 0, overflowY: "auto",
                        borderRight: "1px solid #e0e4ef", padding: "16px 20px",
                        background: "#f0f2f7",
                      }}>
                        <div className="text-xs font-semibold text-indigo-600 bg-indigo-50 rounded-lg px-3 py-1.5 mb-3 inline-flex items-center gap-1.5">
                          <span>Page {pi + 1}</span>
                          {page.title && page.title !== `Page ${pi + 1}` && <span className="text-indigo-400">— {page.title}</span>}
                        </div>
                        <PageBlock
                          page={page}
                          pageNumber={pi + 1}
                          totalPages={pages.length}
                          sectionsOnPage={bookletSections}
                          canvasFields={liveCanvasFields}
                          allCanvasModuleField={allCanvasModuleField}
                          pageSections={pageSections}
                          selectedFF={selectedFF}
                          onFieldSelect={ff => { setSelectedFF(ff); setRightTab("properties"); }}
                          onFieldRemove={removeCanvasField}
                          onSectionUpdate={updateSectionLocal}
                          onSectionDelete={deleteSection}
                          onSectionSave={saveSectionToBackend}
                          onAddSection={addSection}
                          onUpdatePage={updatePage}
                          onDeletePage={deletePage}
                          availableFields={availableFields}
                          onAddField={addFieldToForm}
                          overTarget={overTarget}
                          isCustom={isStandalone}
                          onLabelChange={isStandalone
                            ? updateCustomFieldLabel
                            : (ffId, label) => updateModuleField(ffId, { customLabel: label })}
                          getColSpan={getColSpan}
                          onToggleWidth={toggleColSpan}
                        />
                      </div>
                    );
                  })}
                  {/* Add page column */}
                  <div style={{ width: 160, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
                    <button
                      onClick={addPage}
                      className="flex flex-col items-center gap-2 py-8 px-6 border-2 border-dashed border-slate-200 rounded-2xl text-sm text-slate-400 hover:border-indigo-300 hover:text-indigo-500 hover:bg-indigo-50/40 transition-all"
                    >
                      <Plus className="w-5 h-5" />
                      Add Page
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* ── Right Properties Panel ────────────────────────────────────── */}
            <div style={{
              width: 256, flexShrink: 0,
              display: "flex", flexDirection: "column",
              background: "#ffffff", borderLeft: "1px solid #e5e7eb",
              overflow: "hidden",
            }}>
              {selectedFF ? (
                <>
                  <div className="px-4 py-2.5 flex items-center justify-between shrink-0 border-b border-gray-100">
                    <div className="flex items-center gap-1 rounded-lg p-0.5 bg-gray-100">
                      {[
                        { key: "properties", label: "Properties" },
                        ...(!isStandalone ? [{ key: "rules", label: "Rules" }] : []),
                        ...((!isStandalone && isLookup) || isIntegration ? [{ key: "autofill", label: isIntegration ? "Mappings" : "Auto-Fill" }] : []),
                      ].map(tab => (
                        <button key={tab.key} onClick={() => setRightTab(tab.key as any)}
                          className={cn("px-2.5 py-1 rounded-md text-xs font-medium transition-colors",
                            rightTab === tab.key ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700")}>
                          {tab.label}
                        </button>
                      ))}
                    </div>
                    <button onClick={() => setSelectedFF(null)} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
                  </div>

                  <ScrollArea className="flex-1">
                    <div className="p-4 space-y-4">
                      {rightTab === "properties" && (
                        <>
                          {/* ── Standalone custom field properties ── */}
                          {isStandalone && selectedCF ? (
                            <>
                              <div className="space-y-1.5">
                                <Label className="text-xs">Field Label</Label>
                                <Input value={selectedCF.label} onChange={e => updateCustomFieldLabel(selectedCF.id, e.target.value)} placeholder="Field name…" />
                              </div>
                              <div className="space-y-1.5">
                                <Label className="text-xs">Field Type</Label>
                                <Select value={selectedCF.type} onValueChange={v => updateCanvasField(selectedFF, { type: v })}>
                                  <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                                  <SelectContent>
                                    {CUSTOM_FIELD_TYPES.map(t => (
                                      <SelectItem key={t.type} value={t.type} className="text-xs">{t.label}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="space-y-1.5">
                                <Label className="text-xs">Placeholder</Label>
                                <Input value={selectedCF.placeholder || ""} onChange={e => updateCanvasField(selectedFF, { placeholder: e.target.value })} placeholder="Enter placeholder…" />
                              </div>
                              <div className="space-y-1.5">
                                <Label className="text-xs">Description / Hint</Label>
                                <Input value={selectedCF.description || ""} onChange={e => updateCanvasField(selectedFF, { description: e.target.value })} placeholder="Shown below the field…" />
                              </div>
                              {/* Options for dropdown/radio/multi-select */}
                              {OPTION_BEARING_TYPES.includes(selectedCF.type) && (() => {
                                const opts = selectedCF.options || [];
                                const addOpt = () => {
                                  const n = opts.length + 1;
                                  updateCanvasField(selectedFF, { options: [...opts, { value: `option_${n}`, label: `Option ${n}` }] });
                                };
                                return (
                                  <div className="space-y-2">
                                    <Label className="text-xs">Options</Label>
                                    {opts.length === 0 ? (
                                      <button onClick={addOpt} className="text-xs text-indigo-600 flex items-center gap-1 hover:text-indigo-700">
                                        <Plus className="w-3 h-3" /> Add Option
                                      </button>
                                    ) : opts.map((opt, oi) => (
                                      <div key={oi} className="flex items-center gap-1.5">
                                        <Input value={opt.label} onChange={e => {
                                          const newOpts = opts.map((o, i) => i === oi ? { ...o, label: e.target.value, value: e.target.value.toLowerCase().replace(/\s+/g, "_") } : o);
                                          updateCanvasField(selectedFF, { options: newOpts });
                                        }} onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addOpt(); } }}
                                          placeholder={`Option ${oi + 1}`} className="h-7 text-xs flex-1" />
                                        <div className="flex items-center gap-1 shrink-0">
                                          <button type="button" onClick={addOpt} title="Add option"
                                            className="w-6 h-6 rounded-full bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center transition-colors">
                                            <Plus className="w-3.5 h-3.5" />
                                          </button>
                                          {opts.length > 1 && (
                                            <button type="button" onClick={() => {
                                              const newOpts = opts.filter((_, i) => i !== oi);
                                              updateCanvasField(selectedFF, { options: newOpts });
                                            }} title="Remove option"
                                              className="w-6 h-6 rounded-full bg-red-50 hover:bg-red-100 text-red-500 flex items-center justify-center transition-colors">
                                              <Minus className="w-3.5 h-3.5" />
                                            </button>
                                          )}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                );
                              })()}
                              {/* Integration Field — self-contained config, no Studio needed */}
                              {selectedCF.type === "INTEGRATION" && (
                                <>
                                  <Separator />
                                  <StandaloneIntegrationConfig
                                    cf={selectedCF}
                                    onUpdate={c => updateCanvasField(selectedFF, c)}
                                  />
                                </>
                              )}
                              <Separator />
                              <div className="space-y-1.5">
                                <Label className="text-xs">Width</Label>
                                <div className="flex gap-1.5">
                                  {([["full", "Full Width", <Maximize2 className="w-3.5 h-3.5" />], ["half", "Half Width", <Columns2 className="w-3.5 h-3.5" />]] as const).map(([val, label, icon]) => (
                                    <button key={val}
                                      onClick={() => saveSettingsPatch({ fieldLayouts: { ...fieldLayouts, [selectedCF.id]: val } })}
                                      className={cn("flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg border text-xs font-medium transition-all",
                                        getColSpan(selectedCF.id) === val ? "border-indigo-400 bg-indigo-50 text-indigo-700" : "border-slate-200 text-slate-500 hover:border-slate-300")}>
                                      {icon}{label}
                                    </button>
                                  ))}
                                </div>
                              </div>
                              <Separator />
                              <div className="flex items-center justify-between">
                                <div><p className="text-sm font-medium">Required</p><p className="text-xs text-gray-400">User must fill this</p></div>
                                <Switch checked={selectedCF.required || false} onCheckedChange={v => updateCanvasField(selectedFF, { required: v })} />
                              </div>
                              <Separator />
                              <div className="space-y-1.5">
                                <Label className="text-xs">Field Key</Label>
                                <Input
                                  value={selectedCF.name}
                                  onChange={e => {
                                    manualKeyEditedIds.current.add(selectedCF.id);
                                    const newName = e.target.value
                                      .toLowerCase()
                                      .replace(/[^a-z0-9_]/g, '')
                                      .replace(/_+/g, '_');
                                    setLocalSettings((prev: any) => ({
                                      ...prev,
                                      customFields: (prev.customFields || []).map((c: any) =>
                                        c.id === selectedCF.id ? { ...c, name: newName } : c
                                      ),
                                    }));
                                    clearTimeout((window as any).__cfNameTimer);
                                    (window as any).__cfNameTimer = setTimeout(() => {
                                      updateCanvasField(selectedFF, { name: newName });
                                    }, 600);
                                  }}
                                  placeholder="field_key"
                                  className="h-8 text-xs font-mono"
                                />
                                <p className="text-[10px] text-gray-400">Auto-generated from label · edit to customize</p>
                              </div>
                              <div className="px-2.5 py-1.5 bg-gray-50 rounded-lg text-xs text-gray-400">
                                <span className="font-medium">Type:</span> <span className="font-mono text-gray-600">{selectedCF.type}</span>
                              </div>
                            </>
                          ) : (
                            /* ── Module field properties ── */
                            <>
                              <div className="space-y-1.5">
                                <Label className="text-xs">Custom Label</Label>
                                <Input value={selectedFF.customLabel || ""} onChange={e => updateModuleField(selectedFF.id, { customLabel: e.target.value })} placeholder={selectedMF?.label || "Override label"} />
                                <p className="text-xs text-gray-400">Leave empty to use original label</p>
                              </div>
                              <div className="space-y-1.5">
                                <Label className="text-xs">Placeholder</Label>
                                <Input value={selectedFF.customPlaceholder || ""} onChange={e => updateModuleField(selectedFF.id, { customPlaceholder: e.target.value })} placeholder="Override placeholder" />
                              </div>
                              <div className="space-y-1.5">
                                <Label className="text-xs">Section</Label>
                                <Select value={selectedFF.sectionId || "none"} onValueChange={v => updateModuleField(selectedFF.id, { sectionId: v === "none" ? null : v })}>
                                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="none" className="text-xs">No section (Page 1 direct)</SelectItem>
                                    {sections.map(s => <SelectItem key={s.id} value={s.id} className="text-xs">{s.label}</SelectItem>)}
                                  </SelectContent>
                                </Select>
                              </div>
                              {selectedFF.sectionId && pages.length > 1 && (
                                <div className="space-y-1.5">
                                  <Label className="text-xs">Page</Label>
                                  <Select
                                    value={pageSections[selectedFF.sectionId] || "_p1"}
                                    onValueChange={v => {
                                      const newPS = { ...pageSections };
                                      if (v === "_p1") { delete newPS[selectedFF.sectionId]; }
                                      else { newPS[selectedFF.sectionId] = v; }
                                      saveSettingsPatch({ pageSections: newPS });
                                    }}
                                  >
                                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="_p1" className="text-xs">Page 1 (default)</SelectItem>
                                      {pages.slice(1).map((p, pi) => <SelectItem key={p.id} value={p.id} className="text-xs">Page {pi + 2}: {p.title}</SelectItem>)}
                                    </SelectContent>
                                  </Select>
                                  <p className="text-xs text-gray-400">Moves this field's section to the selected page</p>
                                </div>
                              )}
                              <Separator />
                              <div className="space-y-1.5">
                                <Label className="text-xs">Width</Label>
                                <div className="flex gap-1.5">
                                  {([["full", "Full Width", <Maximize2 className="w-3.5 h-3.5" />], ["half", "Half Width", <Columns2 className="w-3.5 h-3.5" />]] as const).map(([val, label, icon]) => (
                                    <button key={val}
                                      onClick={() => saveSettingsPatch({ fieldLayouts: { ...fieldLayouts, [selectedFF.fieldId]: val } })}
                                      className={cn("flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg border text-xs font-medium transition-all",
                                        getColSpan(selectedFF.fieldId) === val ? "border-indigo-400 bg-indigo-50 text-indigo-700" : "border-slate-200 text-slate-500 hover:border-slate-300")}>
                                      {icon}{label}
                                    </button>
                                  ))}
                                </div>
                              </div>
                              <Separator />
                              <div className="space-y-3">
                                {[
                                  { key: "isRequired", label: "Required",  desc: "User must fill this field" },
                                  { key: "isHidden",   label: "Hidden",    desc: "Hidden unless revealed by a rule" },
                                  { key: "isReadonly", label: "Read-Only", desc: "Visible but not editable" },
                                ].map(({ key, label, desc }) => (
                                  <div key={key} className="flex items-center justify-between">
                                    <div><p className="text-sm font-medium">{label}</p><p className="text-xs text-gray-400">{desc}</p></div>
                                    <Switch checked={!!selectedFF[key]} onCheckedChange={v => updateModuleField(selectedFF.id, { [key]: v })} />
                                  </div>
                                ))}
                              </div>
                              <Separator />
                              <div className="p-2.5 bg-gray-50 rounded-lg text-xs text-gray-400">
                                <p>Type: <span className="font-mono text-gray-600">{selectedMF?.type}</span></p>
                                <p>Key: <span className="font-mono text-gray-600">{selectedMF?.name}</span></p>
                              </div>
                            </>
                          )}
                        </>
                      )}
                      {rightTab === "rules" && !isStandalone && (
                        <FieldRulesEditor ff={selectedFF} formFields={liveCanvasFields} allModuleFields={allModuleFields} onUpdate={c => updateModuleField(selectedFF.id, c)} />
                      )}
                      {rightTab === "autofill" && isLookup && (
                        <LookupAutoFillEditor ff={selectedFF} formFields={liveCanvasFields} allModuleFields={allModuleFields} onUpdate={c => updateModuleField(selectedFF.id, c)} />
                      )}
                      {rightTab === "autofill" && isIntegration && (
                        <IntegrationMappingEditor
                          ff={selectedFF}
                          formFields={liveCanvasFields}
                          allModuleFields={allModuleFields}
                          customFieldDefs={customFieldDefs}
                          isStandalone={isStandalone}
                          onUpdate={c => updateCanvasField(selectedFF, c)}
                        />
                      )}
                    </div>
                  </ScrollArea>
                </>
              ) : isCF ? (
                /* ── CF Form Settings (right panel, no field selected) ── */
                <div className="flex-1 overflow-y-auto">
                  {/* Header */}
                  <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between bg-gray-50">
                    <p className="text-sm font-semibold text-gray-700">Form Settings</p>
                    <Settings className="w-4 h-4 text-gray-400" />
                  </div>

                  {/* ── Section: Template preview ── */}
                  <div className="border-b border-gray-100">
                    <button className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-gray-50 transition-colors"
                      onClick={() => toggleRightSection("themes")}>
                      <span className="text-xs font-semibold text-gray-600">Template Options</span>
                      <ChevronDown className={cn("w-3.5 h-3.5 text-gray-400 transition-transform", openRightSections.has("themes") && "rotate-180")} />
                    </button>
                    {openRightSections.has("themes") && (
                      <div className="px-3 pb-4 space-y-2.5">
                        {/* Template thumbnail */}
                        <div className="rounded-xl overflow-hidden border border-gray-200 shadow-sm">
                          <div className="h-20 flex flex-col items-center justify-center gap-1"
                            style={{ background: "linear-gradient(135deg, #4c1d95, #3730a3)" }}>
                            <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
                              <FileText className="w-4 h-4 text-white" />
                            </div>
                            <span className="text-white/80 text-[10px] font-medium">Classic</span>
                          </div>
                        </div>
                        <button onClick={() => setMode("settings")}
                          className="w-full py-2 rounded-lg text-xs font-bold text-white transition-all hover:opacity-90 shadow-sm"
                          style={{ background: "linear-gradient(135deg, #4c1d95, #3730a3)" }}>
                          Change Template
                        </button>
                      </div>
                    )}
                  </div>

                  {/* ── Section: Form Actions (2×3 icon grid) ── */}
                  <div className="border-b border-gray-100">
                    <button className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-gray-50 transition-colors"
                      onClick={() => toggleRightSection("actions")}>
                      <span className="text-xs font-semibold text-gray-600">Form Actions</span>
                      <ChevronDown className={cn("w-3.5 h-3.5 text-gray-400 transition-transform", openRightSections.has("actions") && "rotate-180")} />
                    </button>
                    {openRightSections.has("actions") && (
                      <div className="grid grid-cols-2 gap-2 px-3 pb-3">
                        {([
                          { icon: Eye,            label: "Preview Form",  action: () => openForm() },
                          { icon: LayoutTemplate, label: "Change Theme",  action: () => setMode("settings") },
                          { icon: ExternalLink,   label: "Open Form",     action: () => openForm() },
                          { icon: Copy,           label: "Copy Link",     action: () => { if (form?.token) navigator.clipboard.writeText(`${window.location.origin}/f/${form.token}`); } },
                          { icon: Share2Icon,     label: "Share",         action: () => form && setShareForm({ id: form.id, name: form.name ?? "Form" }) },
                          { icon: Settings,       label: "Settings",      action: () => setMode("settings") },
                        ] as const).map(({ icon: Ic, label, action, href }: any) => (
                          href ? (
                            <Link key={label} href={href}>
                              <div className="flex flex-col items-center gap-1.5 py-3 px-1 rounded-xl border border-gray-200 cursor-pointer hover:border-violet-300 hover:bg-violet-50 transition-all group text-center">
                                <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center transition-colors group-hover:bg-violet-200">
                                  <Ic className="w-5 h-5 text-violet-600" />
                                </div>
                                <span className="text-[10px] font-semibold text-gray-500 group-hover:text-violet-700 leading-tight">{label}</span>
                              </div>
                            </Link>
                          ) : (
                            <button key={label} onClick={action}
                              className="flex flex-col items-center gap-1.5 py-3 px-1 rounded-xl border border-gray-200 hover:border-violet-300 hover:bg-violet-50 transition-all group text-center">
                              <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center transition-colors group-hover:bg-violet-200">
                                <Ic className="w-5 h-5 text-violet-600" />
                              </div>
                              <span className="text-[10px] font-semibold text-gray-500 group-hover:text-violet-700 leading-tight">{label}</span>
                            </button>
                          )
                        ))}
                      </div>
                    )}
                  </div>

                  {/* ── Section: Color Settings ── */}
                  <div className="border-b border-gray-100">
                    <button className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-gray-50 transition-colors"
                      onClick={() => toggleRightSection("colors")}>
                      <span className="text-xs font-semibold text-gray-600">Color Settings</span>
                      <ChevronDown className={cn("w-3.5 h-3.5 text-gray-400 transition-transform", openRightSections.has("colors") && "rotate-180")} />
                    </button>
                    {openRightSections.has("colors") && (
                      <div className="px-3 pb-4">
                        <div className="flex flex-wrap gap-2 mb-2">
                          {[
                            { c: "#4c1d95", active: true }, { c: "#dc2626" }, { c: "#16a34a" },
                            { c: "#ca8a04" }, { c: "#0891b2" }, { c: "#db2777" },
                            { c: "#7c3aed" }, { c: "#1d4ed8" },
                          ].map(({ c, active }) => (
                            <button key={c} className={cn("w-8 h-8 rounded-full transition-transform hover:scale-110 border-2", active ? "border-violet-600 scale-110" : "border-transparent")}
                              style={{ background: c }} />
                          ))}
                        </div>
                        <p className="text-[10px] text-gray-400 mt-1">Select accent color for your form</p>
                      </div>
                    )}
                  </div>

                  {/* ── Section: Background ── */}
                  <div>
                    <button className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-gray-50 transition-colors"
                      onClick={() => toggleRightSection("bg")}>
                      <span className="text-xs font-semibold text-gray-600">Background</span>
                      <ChevronDown className={cn("w-3.5 h-3.5 text-gray-400 transition-transform", openRightSections.has("bg") && "rotate-180")} />
                    </button>
                    {openRightSections.has("bg") && (
                      <div className="px-3 pb-4">
                        <div className="flex flex-wrap gap-2">
                          {[
                            { style: "bg-white border-2 border-gray-200", title: "White" },
                            { style: "bg-gray-50 border-2 border-gray-200", title: "Light" },
                            { style: "bg-violet-50 border-2 border-violet-200", title: "Violet" },
                            { style: "bg-blue-50 border-2 border-blue-200", title: "Blue" },
                            { style: "bg-gradient-to-br from-violet-100 to-blue-100 border-2 border-violet-200", title: "Gradient" },
                          ].map(({ style, title }) => (
                            <button key={title} className={cn("w-10 h-8 rounded-lg transition-all hover:scale-105", style)} title={title} />
                          ))}
                        </div>
                        <p className="text-[10px] text-gray-400 mt-2">Form background style</p>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                /* ── CRM empty state ── */
                <div className="flex-1 flex flex-col items-center justify-center text-center p-6">
                  <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
                    <Settings className="w-6 h-6 text-gray-400" />
                  </div>
                  <p className="text-sm font-semibold text-gray-600">Field Settings</p>
                  <p className="text-xs mt-2 leading-relaxed max-w-[160px] text-gray-400">
                    Click any field on the canvas to edit its label, type, and validation.
                  </p>
                </div>
              )}
            </div>
          </div>{/* three-column */}

          {/* DragOverlay */}
          <DragOverlay dropAnimation={{ duration: 150, easing: "ease" }}>
            {activeId?.startsWith("palette:") ? (() => {
              const ft = CUSTOM_FIELD_TYPES.find(f => `palette:${f.type}` === activeId);
              if (!ft) return null;
              const Icon = ft.icon;
              return (
                <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl border-2 border-indigo-400 bg-white shadow-2xl scale-105 opacity-95 cursor-grabbing">
                  <span className={cn("w-8 h-8 rounded-lg flex items-center justify-center shadow-sm shrink-0", ft.color)}>
                    <Icon className="w-4 h-4" />
                  </span>
                  <p className="text-sm font-semibold text-gray-800">{ft.label}</p>
                </div>
              );
            })() : activeId && !activeId.startsWith("sidebar:") ? (() => {
              const ff = liveCanvasFields.find(f => f.id === activeId);
              if (!ff) return null;
              const mf = allCanvasModuleField(ff.fieldId);
              const span = getColSpan(ff.fieldId);
              const typeLabel = CUSTOM_FIELD_TYPES.find(t => t.type === mf?.type)?.label || mf?.type || "Field";
              return (
                <div className={cn(
                  "rounded-xl border-2 border-indigo-400 bg-white shadow-[0_20px_60px_rgba(0,0,0,0.22)] cursor-grabbing rotate-[0.6deg] ring-2 ring-indigo-200/60 overflow-hidden",
                  span === "half" ? "w-64" : "w-[480px]"
                )}>
                  <div className="px-4 pt-3 pb-2 flex items-start gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-900 truncate" title={ff.customLabel || mf?.label || ff.fieldId}>{ff.customLabel || mf?.label || ff.fieldId}</p>
                    </div>
                    <span className="shrink-0 text-[10px] bg-indigo-100 text-indigo-600 px-2 py-0.5 rounded-full font-medium whitespace-nowrap">{typeLabel}</span>
                  </div>
                  <div className="px-4 pb-3 opacity-50 pointer-events-none">
                    <FieldTypePreview type={mf?.type || ""} options={mf?.options} />
                  </div>
                  <div className="h-0.5 bg-gradient-to-r from-indigo-500 via-violet-500 to-indigo-500" />
                </div>
              );
            })() : activeId?.startsWith("sidebar:") ? (() => {
              const field = availableFields.find(f => `sidebar:${f.id}` === activeId);
              if (!field) return null;
              return (
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg border-2 border-indigo-300 bg-white shadow-xl scale-105 opacity-90">
                  <span className="w-6 h-6 bg-indigo-100 rounded text-xs flex items-center justify-center font-mono text-indigo-600">{FIELD_TYPE_ICONS[field.type] || "T"}</span>
                  <p className="text-sm font-medium text-gray-800">{field.label}</p>
                </div>
              );
            })() : null}
          </DragOverlay>

        </DndContext>
        </BuilderDragCtx.Provider>
      )}

      {shareForm && <FormSharePanel form={shareForm} onClose={() => setShareForm(null)} />}
    </div>
  );
}
