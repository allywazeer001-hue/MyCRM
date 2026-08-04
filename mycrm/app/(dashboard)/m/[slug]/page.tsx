"use client";
import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Plus, Search, Trash2, MoreHorizontal, RefreshCw, Eye, Edit,
  List, Loader2, AlertCircle, Columns3, X,
  ChevronDown, Check, LayoutGrid, Download, Save, BookOpen,
  SlidersHorizontal, Upload, FileText, CheckCircle2, Pin, PinOff,
  Pencil, Mail, Zap, GripVertical, BrainCircuit, Archive, Lock,
  ChevronLeft, ChevronRight, CalendarDays, AlignLeft, Images, TableProperties, Database,
  AlignJustify, AlignCenter, Maximize2,
} from "lucide-react";
import { SendEmailModal } from "@/components/email/send-email-modal";
import { BulkSendEmailModal, type BulkRecipient } from "@/components/email/bulk-send-email-modal";
import { AnalysisPanel, type AnalysisContext } from "@/components/analytics/analysis-panel";
import { ModuleSummaryBar } from "@/components/modules/module-summary-bar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { DndContext, DragOverlay, PointerSensor, useSensor, useSensors, useDraggable, useDroppable } from "@dnd-kit/core";
import type { DragEndEvent, DragStartEvent } from "@dnd-kit/core";
import { useModulesStore, Field } from "@/store/modules.store";
import { useViewStore } from "@/store/view.store";
import { api } from "@/lib/api";
import { formatDate, cn, generateId } from "@/lib/utils";
import { TableSkeleton } from "@/components/ui/page-skeletons";
import { PermissionGate, useModulePermission } from "@/components/ui/permission-gate";
import { ModuleIcon } from "@/components/ui/module-icon";
import { useBlueprintRuntimeStore } from "@/store/blueprint-runtime.store";
import { getSocket } from "@/store/notifications.store";

// ── Types ──────────────────────────────────────────────────────────────────

interface CrmRecord {
  id: string;
  data: Record<string, any>;
  createdAt: string;
  updatedAt: string;
  createdBy?: { firstName: string; lastName: string };
  isArchived?: boolean;
  isLocked?: boolean;
}

interface PaginatedResult {
  data: CrmRecord[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

type FilterOperator =
  | "is" | "is_not" | "contains" | "not_contains" | "starts_with" | "ends_with"
  | "empty" | "not_empty" | "eq" | "neq" | "lt" | "lte" | "gt" | "gte"
  | "between" | "today" | "yesterday" | "this_week" | "this_month" | "last_month" | "date_between";

interface FilterCondition {
  id: string;
  field: string;
  operator: FilterOperator;
  value: any;
  value2?: any;
}

interface SavedView {
  id: string;
  name: string;
  filterLogic: "AND" | "OR";
  conditions: FilterCondition[];
  visibleFieldIds: string[];
  isPinned: boolean;
}

// ── Operator config per field type ────────────────────────────────────────

const TEXT_OPS: { value: FilterOperator; label: string }[] = [
  { value: "contains", label: "Contains" },
  { value: "not_contains", label: "Does Not Contain" },
  { value: "is", label: "Is" },
  { value: "is_not", label: "Is Not" },
  { value: "starts_with", label: "Starts With" },
  { value: "ends_with", label: "Ends With" },
  { value: "empty", label: "Is Empty" },
  { value: "not_empty", label: "Is Not Empty" },
];
const NUM_OPS: { value: FilterOperator; label: string }[] = [
  { value: "eq", label: "Equal" },
  { value: "neq", label: "Not Equal" },
  { value: "lt", label: "Less Than" },
  { value: "lte", label: "Less or Equal" },
  { value: "gt", label: "Greater Than" },
  { value: "gte", label: "Greater or Equal" },
  { value: "between", label: "Between" },
  { value: "empty", label: "Is Empty" },
  { value: "not_empty", label: "Is Not Empty" },
];
const DATE_OPS: { value: FilterOperator; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "this_week", label: "This Week" },
  { value: "this_month", label: "This Month" },
  { value: "last_month", label: "Last Month" },
  { value: "date_between", label: "Custom Range" },
  { value: "empty", label: "Is Empty" },
  { value: "not_empty", label: "Is Not Empty" },
];
const CHOICE_OPS: { value: FilterOperator; label: string }[] = [
  { value: "is", label: "Is" },
  { value: "is_not", label: "Is Not" },
  { value: "contains", label: "Contains" },
  { value: "not_contains", label: "Does Not Contain" },
  { value: "empty", label: "Is Empty" },
  { value: "not_empty", label: "Is Not Empty" },
];

function getOps(field?: Field) {
  if (!field) return TEXT_OPS;
  if (["NUMBER", "DECIMAL", "CURRENCY", "RATING", "PROGRESS"].includes(field.type)) return NUM_OPS;
  if (["DATE", "DATETIME"].includes(field.type)) return DATE_OPS;
  if (["DROPDOWN", "STATUS", "RADIO", "MULTI_SELECT", "TAGS", "BOOLEAN"].includes(field.type)) return CHOICE_OPS;
  return TEXT_OPS;
}

function noValue(op: FilterOperator) {
  return ["empty", "not_empty", "today", "yesterday", "this_week", "this_month", "last_month"].includes(op);
}

function newCond(): FilterCondition {
  return { id: generateId(), field: "", operator: "contains", value: "" };
}

// ── Filter condition row ──────────────────────────────────────────────────

function FilterRow({
  condition, fields, onChange, onRemove,
}: {
  condition: FilterCondition;
  fields: Field[];
  onChange: (c: FilterCondition) => void;
  onRemove: () => void;
}) {
  const field = fields.find(f => f.name === condition.field);
  const ops = getOps(field);

  const handleFieldChange = (fieldName: string) => {
    const f = fields.find(x => x.name === fieldName);
    const defaultOp = getOps(f)[0].value;
    onChange({ ...condition, field: fieldName, operator: defaultOp, value: "", value2: "" });
  };

  const renderValue = () => {
    if (!condition.field || noValue(condition.operator)) return null;

    if (field?.type === "BOOLEAN") {
      return (
        <Select value={String(condition.value)} onValueChange={v => onChange({ ...condition, value: v === "true" })}>
          <SelectTrigger className="h-8 text-xs w-24"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="true" className="text-xs">Yes</SelectItem>
            <SelectItem value="false" className="text-xs">No</SelectItem>
          </SelectContent>
        </Select>
      );
    }

    if (["DROPDOWN", "STATUS", "RADIO", "MULTI_SELECT", "TAGS"].includes(field?.type || "")) {
      const hasStaticOptions = (field?.options?.length ?? 0) > 0;
      const isTextOp = condition.operator === "contains" || condition.operator === "not_contains";
      if (hasStaticOptions && !isTextOp) {
        return (
          <Select value={condition.value || "__none__"} onValueChange={v => onChange({ ...condition, value: v === "__none__" ? "" : v })}>
            <SelectTrigger className="h-8 text-xs w-36"><SelectValue placeholder="Select..." /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__" className="text-xs">Select...</SelectItem>
              {field!.options!.map((o, i) => <SelectItem key={o.id ?? `${o.value}-${i}`} value={o.value} className="text-xs">{o.label}</SelectItem>)}
            </SelectContent>
          </Select>
        );
      }
      return (
        <Input
          value={condition.value || ""}
          onChange={e => onChange({ ...condition, value: e.target.value })}
          placeholder="Value"
          className="h-8 text-xs w-40"
        />
      );
    }

    if (condition.operator === "between") {
      return (
        <div className="flex items-center gap-1">
          <Input value={condition.value || ""} onChange={e => onChange({ ...condition, value: e.target.value })}
            placeholder="From" className="h-8 text-xs w-24" type="number" />
          <span className="text-xs text-gray-400">–</span>
          <Input value={condition.value2 || ""} onChange={e => onChange({ ...condition, value2: e.target.value })}
            placeholder="To" className="h-8 text-xs w-24" type="number" />
        </div>
      );
    }

    if (condition.operator === "date_between") {
      return (
        <div className="flex items-center gap-1">
          <Input value={condition.value || ""} onChange={e => onChange({ ...condition, value: e.target.value })}
            className="h-8 text-xs w-32" type="date" />
          <span className="text-xs text-gray-400">–</span>
          <Input value={condition.value2 || ""} onChange={e => onChange({ ...condition, value2: e.target.value })}
            className="h-8 text-xs w-32" type="date" />
        </div>
      );
    }

    return (
      <Input
        value={condition.value || ""}
        onChange={e => onChange({ ...condition, value: e.target.value })}
        placeholder="Value"
        className="h-8 text-xs w-40"
        type={["NUMBER", "DECIMAL", "CURRENCY"].includes(field?.type || "") ? "number" : field?.type === "DATE" ? "date" : "text"}
      />
    );
  };

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <Select value={condition.field || "__none__"} onValueChange={v => handleFieldChange(v === "__none__" ? "" : v)}>
        <SelectTrigger className="h-8 text-xs w-40"><SelectValue placeholder="Select field" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="__none__" className="text-xs">Select field...</SelectItem>
          {fields.filter(f => !f.isHidden && f.type !== "AUTO_NUMBER").map(f => (
            <SelectItem key={f.id ?? f.name} value={f.name} className="text-xs">{f.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={condition.operator} onValueChange={v => onChange({ ...condition, operator: v as FilterOperator, value: "", value2: "" })}>
        <SelectTrigger className="h-8 text-xs w-40"><SelectValue /></SelectTrigger>
        <SelectContent>
          {ops.map(op => <SelectItem key={op.value} value={op.value} className="text-xs">{op.label}</SelectItem>)}
        </SelectContent>
      </Select>

      {renderValue()}

      <button onClick={onRemove} className="text-gray-400 hover:text-red-500 p-0.5">
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

// ── Filter Panel ──────────────────────────────────────────────────────────

function FilterPanel({
  fields, conditions, logic, open,
  onConditionsChange, onLogicChange, onClose, onApply, onClear,
  tagFilter, onTagFilterChange, availableTags,
}: {
  fields: Field[];
  conditions: FilterCondition[];
  logic: "AND" | "OR";
  open: boolean;
  onConditionsChange: (c: FilterCondition[]) => void;
  onLogicChange: (l: "AND" | "OR") => void;
  onClose: () => void;
  onApply: () => void;
  onClear: () => void;
  tagFilter: string;
  onTagFilterChange: (v: string) => void;
  availableTags: string[];
}) {
  const [tagSearch, setTagSearch] = useState("");
  if (!open) return null;

  const update = (id: string, c: FilterCondition) =>
    onConditionsChange(conditions.map(x => x.id === id ? c : x));
  const remove = (id: string) =>
    onConditionsChange(conditions.filter(x => x.id !== id));
  const add = () => onConditionsChange([...conditions, newCond()]);

  const visibleTags = tagSearch
    ? availableTags.filter(t => t.toLowerCase().includes(tagSearch.toLowerCase()))
    : availableTags;

  return (
    <div className="border border-blue-200 rounded-xl bg-blue-50/30 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="w-4 h-4 text-blue-600" />
          <span className="text-sm font-semibold text-gray-700">Filters</span>
          <span className="text-xs text-gray-500">Match</span>
          <div className="flex rounded-md overflow-hidden border border-gray-200">
            {(["AND", "OR"] as const).map(l => (
              <button key={l} onClick={() => onLogicChange(l)}
                className={cn("px-3 py-1 text-xs font-medium transition-colors",
                  logic === l ? "bg-brand text-white" : "bg-white text-gray-600 hover:bg-gray-50")}>
                {l}
              </button>
            ))}
          </div>
          <span className="text-xs text-gray-500">conditions</span>
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="space-y-2">
        {conditions.map(cond => (
          <FilterRow key={cond.id} condition={cond} fields={fields}
            onChange={c => update(cond.id, c)} onRemove={() => remove(cond.id)} />
        ))}
        {conditions.length === 0 && (
          <p className="text-xs text-gray-400 italic py-1">No conditions. Add one to filter records.</p>
        )}
      </div>

      <div className="flex items-center gap-2 pt-1">
        <button onClick={add} className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1 font-medium">
          <Plus className="w-3 h-3" /> Add Condition
        </button>
        <div className="ml-auto flex gap-2">
          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={onClear}>Clear</Button>
          <Button size="sm" className="h-7 text-xs" onClick={onApply}>Apply Filters</Button>
        </div>
      </div>

      {/* ── Tag filter section ── */}
      <div className="border-t border-blue-200 pt-3 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-gray-600">Filter by Tag</span>
            {tagFilter && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-violet-100 text-violet-700 text-[10px] font-semibold border border-violet-200">
                🏷️ {tagFilter}
                <button onClick={() => onTagFilterChange("")} className="hover:text-red-500 transition-colors">
                  <X className="w-2.5 h-2.5" />
                </button>
              </span>
            )}
          </div>
          {tagFilter && (
            <button onClick={() => onTagFilterChange("")} className="text-[10px] text-red-400 hover:text-red-600">
              Clear tag
            </button>
          )}
        </div>

        {/* Searchable tag input */}
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 pointer-events-none" />
          <input
            type="text"
            value={tagSearch}
            onChange={e => setTagSearch(e.target.value)}
            placeholder={availableTags.length > 0 ? "Search tags…" : "Type a tag name…"}
            className="w-full h-7 pl-7 pr-3 text-xs border border-gray-200 rounded-md bg-white focus:outline-none focus:border-violet-400 focus:ring-1 focus:ring-violet-300/30 transition-colors"
          />
          {tagSearch && (
            <button onClick={() => setTagSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500">
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* Clickable tag chips */}
        {visibleTags.length > 0 ? (
          <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto py-0.5">
            {visibleTags.map(tag => (
              <button
                key={tag}
                onClick={() => onTagFilterChange(tagFilter === tag ? "" : tag)}
                className={cn(
                  "inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border transition-all",
                  tagFilter === tag
                    ? "bg-violet-600 text-white border-violet-600 shadow-sm"
                    : "bg-white text-gray-600 border-gray-200 hover:border-violet-300 hover:text-violet-700 hover:bg-violet-50"
                )}
              >
                🏷️ {tag}
              </button>
            ))}
          </div>
        ) : (
          <p className="text-xs text-gray-400 italic">
            {tagSearch ? `No tags matching "${tagSearch}"` : "No tags in current records."}
          </p>
        )}
      </div>
    </div>
  );
}

// ── Field Value Renderer ───────────────────────────────────────────────────

function FieldValue({ value, field, recordData, fieldName, density = "normal" }: { value: any; field?: Field; recordData?: Record<string, any>; fieldName?: string; density?: "compact" | "normal" | "comfortable" }) {
  const textCls = density === "compact" ? "text-xs text-gray-700 truncate max-w-[140px] block" : density === "comfortable" ? "text-sm text-gray-700 whitespace-normal break-words max-w-xs" : "text-sm text-gray-700 truncate max-w-[200px] block";
  // Resolve __label for list/relation fields stored as raw IDs
  const storedLabel: string | undefined =
    recordData && fieldName ? (recordData[fieldName + "__label"] as string | undefined) : undefined;

  if (value === null || value === undefined || value === "") {
    return <span className="text-gray-300">—</span>;
  }
  if (field?.type === "BOOLEAN") {
    return <Badge variant={value ? "success" : "secondary"} className="text-xs">{value ? "Yes" : "No"}</Badge>;
  }
  if (field?.type === "GLOBAL_LIST" || field?.type === "DEPENDENT_GLOBAL_LIST" || field?.type === "GLOBAL_RELATION") {
    const displayLabel = (storedLabel && storedLabel !== "") ? storedLabel : String(value);
    return <span className={textCls} title={displayLabel}>{displayLabel}</span>;
  }
  if (field?.type === "STATUS" || field?.type === "DROPDOWN") {
    const opt = field.options?.find(o => o.value === value);
    const label = (storedLabel && storedLabel !== "") ? storedLabel : (opt?.label || value);
    const colors: Record<string, string> = {
      active: "success", inactive: "secondary", pending: "warning",
      completed: "success", cancelled: "destructive",
    };
    return <Badge variant={(colors[String(value).toLowerCase()] as any) || "secondary"} className="text-xs">{label}</Badge>;
  }
  if (field?.type === "USER_SELECT") {
    const display = (storedLabel && storedLabel !== "") ? storedLabel : String(value);
    const initial = display[0]?.toUpperCase() ?? "?";
    return (
      <div className="flex items-center gap-1.5">
        <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-[10px] font-bold shrink-0">
          {initial}
        </span>
        <span className={density === "compact" ? "text-xs text-gray-700 truncate max-w-[120px]" : density === "comfortable" ? "text-sm text-gray-700 whitespace-normal break-words max-w-[200px]" : "text-sm text-gray-700 truncate max-w-[160px]"} title={display}>{display}</span>
      </div>
    );
  }
  if (field?.type === "RADIO") {
    const opt = field.options?.find(o => o.value === value);
    const label = opt?.label ?? String(value);
    return (
      <span className="inline-flex items-center gap-1 text-sm text-gray-700">
        <span className="w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0" />
        {label}
      </span>
    );
  }
  if (field?.type === "EMAIL") return <a href={`mailto:${value}`} className="text-blue-600 hover:underline text-sm">{value}</a>;
  if (field?.type === "URL") return <a href={value} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-sm truncate max-w-[200px] block">{value}</a>;
  if (field?.type === "RATING") return <span className="text-yellow-500">{"⭐".repeat(Number(value) || 0)}</span>;
  if (field?.type === "PROGRESS") {
    return (
      <div className="flex items-center gap-2">
        <div className="flex-1 bg-gray-100 rounded-full h-1.5 max-w-[100px]">
          <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: `${Math.min(100, Number(value))}%` }} />
        </div>
        <span className="text-xs text-gray-500">{value}%</span>
      </div>
    );
  }
  if (field?.type === "DATE" || field?.type === "DATETIME") return <span className="text-sm text-gray-700">{formatDate(value)}</span>;
  if (field?.type === "CURRENCY") return <span className="text-sm font-medium">${Number(value).toLocaleString()}</span>;
  if (field?.type === "AUTO_NUMBER") return <span className="text-sm font-mono text-blue-600">{value}</span>;
  if (field?.type === "FORMULA") return <span className="text-sm font-mono text-blue-600">{value}</span>;
  if (field?.type === "INLINE_SUBFORM") {
    const rows = Array.isArray(value) ? value : [];
    return <Badge variant="secondary" className="text-xs">{rows.length} row{rows.length !== 1 ? "s" : ""}</Badge>;
  }
  if (field?.type === "MULTI_SELECT" || field?.type === "TAGS") {
    const vals = Array.isArray(value) ? value : [value];
    return (
      <div className="flex flex-wrap gap-1">
        {vals.slice(0, 3).map((v: any, i: number) => {
          const opt = field.options?.find(o => o.value === String(v));
          return <Badge key={i} variant="secondary" className="text-xs">{opt?.label || String(v)}</Badge>;
        })}
        {vals.length > 3 && <Badge variant="secondary" className="text-xs">+{vals.length - 3}</Badge>}
      </div>
    );
  }
  if (Array.isArray(value)) {
    if (value.length === 0) return <span className="text-gray-300">—</span>;
    if (typeof value[0] === "object") {
      return <Badge variant="secondary" className="text-xs">{value.length} item{value.length !== 1 ? "s" : ""}</Badge>;
    }
    return (
      <div className="flex flex-wrap gap-1">
        {value.slice(0, 3).map((v: any, i: number) => <Badge key={i} variant="secondary" className="text-xs">{String(v)}</Badge>)}
        {value.length > 3 && <Badge variant="secondary" className="text-xs">+{value.length - 3}</Badge>}
      </div>
    );
  }
  if (typeof value === "object") {
    const readable = (value as any).name ?? (value as any).label ?? (value as any).title;
    return readable
      ? <span className={textCls} title={String(readable)}>{String(readable)}</span>
      : <span className="text-gray-300">—</span>;
  }
  return <span className={textCls} title={String(value)}>{String(value)}</span>;
}

// ── Column Picker (show/hide + drag-to-reorder) ────────────────────────────

function ColumnPicker({ fields, visibleIds, onChange, label = "Columns", icon: Icon = Columns3, description = "Drag to reorder · Click to show/hide" }: {
  fields: Field[];
  visibleIds: string[];
  onChange: (ids: string[]) => void;
  label?: string;
  icon?: typeof Columns3;
  description?: string;
}) {
  // Work from the ordered visibleIds list, append hidden fields at end for display
  const eligible = fields.filter(f => !["FILE", "IMAGE", "SIGNATURE"].includes(f.type));
  // Display order: visible first (in their saved order), then hidden
  const ordered = [
    ...visibleIds.map(id => eligible.find(f => f.id === id)).filter(Boolean) as Field[],
    ...eligible.filter(f => !visibleIds.includes(f.id)),
  ];

  const dragRef = useRef<string | null>(null);

  const toggle = (id: string) => {
    if (visibleIds.includes(id)) {
      if (visibleIds.length <= 1) return;
      onChange(visibleIds.filter(x => x !== id));
    } else {
      // Append at end of visible list
      onChange([...visibleIds, id]);
    }
  };

  const onDragStart = (id: string) => { dragRef.current = id; };

  const onDrop = (targetId: string) => {
    if (!dragRef.current || dragRef.current === targetId) return;
    // Reorder within visibleIds; if the dragged item is hidden, add it before target
    const allIds = ordered.map(f => f.id);
    const from = allIds.indexOf(dragRef.current);
    const to   = allIds.indexOf(targetId);
    const next = [...allIds];
    next.splice(from, 1);
    next.splice(to, 0, dragRef.current);
    // Only keep the ones that were visible, in new order
    onChange(next.filter(id => visibleIds.includes(id)));
    dragRef.current = null;
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <Icon className="w-4 h-4" />
          <span className="hidden sm:inline">{label}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-60 p-0" align="end">
        <div className="px-3 py-2 border-b border-gray-100">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{label}</p>
          <p className="text-[10px] text-gray-400 mt-0.5">{description}</p>
        </div>
        <div className="p-1.5 max-h-80 overflow-y-auto">
          {ordered.map(f => {
            const isVisible = visibleIds.includes(f.id);
            return (
              <div
                key={f.id}
                draggable
                onDragStart={() => onDragStart(f.id)}
                onDragOver={e => e.preventDefault()}
                onDrop={() => onDrop(f.id)}
                className={cn(
                  "flex items-center gap-2 px-2 py-1.5 rounded-md text-sm cursor-grab active:cursor-grabbing transition-colors",
                  isVisible ? "hover:bg-gray-50" : "opacity-50 hover:bg-gray-50 hover:opacity-70"
                )}
              >
                <GripVertical className="w-3.5 h-3.5 text-gray-300 flex-shrink-0" />
                <button
                  type="button"
                  onClick={() => toggle(f.id)}
                  className="flex items-center gap-2 flex-1 text-left"
                >
                  <div className={cn(
                    "w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-colors",
                    isVisible ? "bg-brand border-brand" : "border-gray-300"
                  )}>
                    {isVisible && <Check className="w-3 h-3 text-white" />}
                  </div>
                  <span className={cn("truncate", isVisible ? "text-gray-700" : "text-gray-400")}>{f.label}</span>
                </button>
              </div>
            );
          })}
        </div>
        <div className="px-3 py-2 border-t border-gray-100 flex items-center justify-between">
          <button
            className="text-xs text-blue-600 hover:underline"
            onClick={() => onChange(eligible.map(f => f.id))}
          >
            Show all
          </button>
          <button
            className="text-xs text-gray-400 hover:text-gray-600 hover:underline"
            onClick={() => onChange(eligible.slice(0, 1).map(f => f.id))}
          >
            Reset
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

// ── Kanban View (DnD) ─────────────────────────────────────────────────────

function KanbanCard({ record, cardFields, slug }: { record: CrmRecord; cardFields: Field[]; slug: string }) {
  const titleField = cardFields[0];
  const secondaryFields = cardFields.slice(1);
  const router = useRouter();
  // dragHappenedRef: prevents click-navigation firing immediately after a drag ends
  const dragHappenedRef = useRef(false);
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, isDragging } = useDraggable({
    id: record.id,
    data: { record },
  });

  useEffect(() => {
    if (isDragging) dragHappenedRef.current = true;
  }, [isDragging]);

  const style = transform
    ? { transform: `translate3d(${transform.x}px,${transform.y}px,0)`, opacity: isDragging ? 0.3 : 1 }
    : undefined;
  return (
    <div
      ref={setNodeRef}
      style={style}
      className="p-3 rounded-lg border border-gray-200 bg-white hover:shadow-md hover:border-blue-200 cursor-pointer transition-all space-y-1.5"
      onClick={() => {
        if (dragHappenedRef.current) { dragHappenedRef.current = false; return; }
        router.push(`/m/${slug}/${record.id}`);
      }}
    >
      <div className="flex items-start gap-1.5">
        <div
          ref={setActivatorNodeRef}
          {...listeners}
          {...attributes}
          className="mt-0.5 shrink-0 text-gray-300 hover:text-gray-500 cursor-grab active:cursor-grabbing transition-colors touch-none"
          onClick={e => e.stopPropagation()}
          title="Drag to move"
        >
          <GripVertical className="w-3.5 h-3.5" />
        </div>
        <p className="text-sm font-medium text-gray-800 truncate flex-1">
          {titleField ? record.data[titleField.name] || "Untitled" : record.id.slice(0, 8)}
        </p>
      </div>
      {secondaryFields.map(f => {
        const v = record.data[f.name];
        if (v == null || v === "") return null;
        return (
          <div key={f.id} className="flex items-center gap-1 pl-5 min-w-0">
            <span className="text-xs text-gray-400 shrink-0">{f.label}:</span>
            <span className="text-xs text-gray-600 truncate">{String(v)}</span>
          </div>
        );
      })}
      <p className="text-xs text-gray-400 pl-5">{formatDate(record.createdAt)}</p>
    </div>
  );
}

function KanbanColumn({ col, records, cardFields, slug }: {
  col: { value: string; label: string; color?: string };
  records: CrmRecord[];
  cardFields: Field[];
  slug: string;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: col.value });
  return (
    <div className="flex-shrink-0 w-64">
      <div className="flex items-center gap-2 mb-3">
        <span className="font-medium text-sm text-gray-700">{col.label}</span>
        <Badge variant="secondary" className="text-xs">{records.length}</Badge>
      </div>
      <div
        ref={setNodeRef}
        className={cn(
          "space-y-2 min-h-24 rounded-lg p-1 transition-colors",
          isOver && "bg-blue-50 border-2 border-dashed border-blue-300"
        )}
      >
        {records.map(record => (
          <KanbanCard key={record.id} record={record} cardFields={cardFields} slug={slug} />
        ))}
        {records.length === 0 && (
          <div className={cn(
            "p-3 rounded-lg border-2 border-dashed text-center",
            isOver ? "border-blue-300 bg-blue-50" : "border-gray-100"
          )}>
            <p className="text-xs text-gray-400">Drop here</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Inline Cell Editor ────────────────────────────────────────────────────

const INLINE_EDITABLE_TYPES = new Set([
  "TEXT", "EMAIL", "URL", "PHONE", "TEXTAREA",
  "NUMBER", "DECIMAL", "CURRENCY",
  "DATE", "DATETIME",
  "BOOLEAN", "STATUS", "DROPDOWN", "RADIO",
]);

function InlineEditor({ field, value, onChange, onCommit, onCancel }: {
  field: Field;
  value: any;
  onChange: (v: any) => void;
  onCommit: () => void;
  onCancel: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select?.();
    }
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") { e.preventDefault(); onCommit(); }
    if (e.key === "Escape") { e.preventDefault(); onCancel(); }
  };

  const cellClass = "border border-blue-400 rounded px-2 py-0.5 text-sm w-full outline-none focus:ring-1 focus:ring-blue-500 bg-white min-w-[80px]";

  if (field.type === "BOOLEAN") {
    return (
      <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
        <Switch checked={!!value} onCheckedChange={v => { onChange(v); setTimeout(onCommit, 0); }} />
        <span className="text-xs text-gray-500">{value ? "Yes" : "No"}</span>
      </div>
    );
  }

  if (field.type === "STATUS" || field.type === "DROPDOWN" || field.type === "RADIO") {
    return (
      <div onClick={e => e.stopPropagation()}>
        <Select value={value || ""} onValueChange={v => { onChange(v); setTimeout(onCommit, 0); }}>
          <SelectTrigger className="h-7 text-xs min-w-[120px] border-blue-400 focus:ring-blue-500" autoFocus>
            <SelectValue placeholder="Select…" />
          </SelectTrigger>
          <SelectContent>
            {(field.options || []).map((o, i) => (
              <SelectItem key={o.id ?? `${o.value}-${i}`} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    );
  }

  if (field.type === "DATE") {
    return (
      <input ref={inputRef} type="date" value={value || ""} className={cellClass}
        onChange={e => onChange(e.target.value)}
        onBlur={onCommit} onKeyDown={handleKeyDown}
        onClick={e => e.stopPropagation()} />
    );
  }

  if (field.type === "DATETIME") {
    return (
      <input ref={inputRef} type="datetime-local" value={value || ""} className={cellClass}
        onChange={e => onChange(e.target.value)}
        onBlur={onCommit} onKeyDown={handleKeyDown}
        onClick={e => e.stopPropagation()} />
    );
  }

  if (field.type === "NUMBER" || field.type === "DECIMAL" || field.type === "CURRENCY") {
    return (
      <input ref={inputRef} type="number" value={value ?? ""} className={cellClass}
        onChange={e => onChange(e.target.value === "" ? null : Number(e.target.value))}
        onBlur={onCommit} onKeyDown={handleKeyDown}
        onClick={e => e.stopPropagation()} />
    );
  }

  return (
    <input
      ref={inputRef}
      type={field.type === "EMAIL" ? "email" : field.type === "URL" ? "url" : "text"}
      value={value ?? ""}
      className={cellClass}
      onChange={e => onChange(e.target.value)}
      onBlur={onCommit} onKeyDown={handleKeyDown}
      onClick={e => e.stopPropagation()} />
  );
}

// ── Gallery View ────────────────────────────────────────────────────────────

function GalleryView({
  records, mod, slug, cardConfig, onCustomize,
}: {
  records: CrmRecord[];
  mod: any;
  slug: string;
  cardConfig: { imageField: string; titleField: string; secondaryFields: string[] };
  onCustomize: () => void;
}) {
  const router = useRouter();
  const fields: Field[] = mod?.fields || [];
  const imgField = fields.find(f => cardConfig.imageField ? f.name === cardConfig.imageField : ["IMAGE", "FILE"].includes(f.type));
  const titleFld = fields.find(f => cardConfig.titleField ? f.name === cardConfig.titleField : ["TEXT", "EMAIL", "URL"].includes(f.type));
  const secFields = cardConfig.secondaryFields.length
    ? fields.filter(f => cardConfig.secondaryFields.includes(f.name))
    : fields.filter(f => !["IMAGE", "FILE", "SIGNATURE", "INLINE_SUBFORM", "AUTO_NUMBER"].includes(f.type)).slice(0, 3);

  const STATUS_COLORS: Record<string, string> = {
    active: "bg-green-100 text-green-700", inactive: "bg-gray-100 text-gray-500",
    pending: "bg-amber-100 text-amber-700", closed: "bg-red-100 text-red-600",
    approved: "bg-blue-100 text-blue-700", rejected: "bg-red-100 text-red-600",
  };

  if (records.length === 0) {
    return (
      <div className="text-center py-20 text-gray-400">
        <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <ModuleIcon icon={mod?.icon} slug={slug} size={32} />
        </div>
        <p className="text-sm">No records to display.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-end mb-3">
        <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5" onClick={onCustomize}>
          <SlidersHorizontal className="w-3 h-3" /> Customize Card
        </Button>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {records.map(record => {
          const imgVal = imgField ? record.data[imgField.name] : null;
          const titleVal = titleFld ? String(record.data[titleFld.name] ?? "—") : record.id.slice(0, 8);
          return (
            <div
              key={record.id}
              onClick={() => router.push(`/m/${slug}/${record.id}`)}
              className="rounded-xl border border-gray-200 bg-white overflow-hidden cursor-pointer hover:shadow-lg transition-all group"
            >
              {imgVal ? (
                <div className="h-40 overflow-hidden bg-gray-100">
                  <img src={imgVal} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                </div>
              ) : (
                <div className="h-40 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center">
                  <ModuleIcon icon={mod?.icon} slug={slug} size={48} className="opacity-60" />
                </div>
              )}
              <div className="p-3">
                <p className="text-sm font-semibold text-gray-900 truncate mb-1.5">{titleVal}</p>
                {secFields.map(f => {
                  const v = record.data[f.name];
                  if (v == null || v === "") return null;
                  const strV = String(v);
                  const colorClass = STATUS_COLORS[strV.toLowerCase()];
                  return (
                    <div key={f.id} className="flex items-center gap-1 mt-0.5 min-w-0">
                      <span className="text-xs text-gray-400 shrink-0">{f.label}:</span>
                      {colorClass ? (
                        <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${colorClass}`}>{strV}</span>
                      ) : (
                        <span className="text-xs text-gray-600 truncate">{strV}</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Gallery Customize Panel ───────────────────────────────────────────────────

function GalleryCustomizePanel({
  open, fields, cardConfig, onClose, onChange,
}: {
  open: boolean;
  fields: Field[];
  cardConfig: { imageField: string; titleField: string; secondaryFields: string[] };
  onClose: () => void;
  onChange: (cfg: { imageField: string; titleField: string; secondaryFields: string[] }) => void;
}) {
  if (!open) return null;
  const imgFields = fields.filter(f => ["IMAGE", "FILE"].includes(f.type));
  const textFields = fields.filter(f => !["INLINE_SUBFORM", "SIGNATURE"].includes(f.type));
  const secFields = fields.filter(f => !["IMAGE", "FILE", "INLINE_SUBFORM", "SIGNATURE"].includes(f.type));

  return (
    <div className="fixed inset-0 z-40 flex justify-end" onClick={onClose}>
      <div className="w-80 h-full bg-white border-l border-gray-200 shadow-xl overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-800">Customize Card</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-4 space-y-5">
          <div>
            <Label className="text-xs font-medium text-gray-700">Cover Image Field</Label>
            <Select value={cardConfig.imageField || "__none__"} onValueChange={v => onChange({ ...cardConfig, imageField: v === "__none__" ? "" : v })}>
              <SelectTrigger className="h-8 text-xs mt-1"><SelectValue placeholder="Auto-detect" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__" className="text-xs">Auto-detect</SelectItem>
                {imgFields.map(f => <SelectItem key={f.id ?? f.name} value={f.name} className="text-xs">{f.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs font-medium text-gray-700">Title Field</Label>
            <Select value={cardConfig.titleField || "__none__"} onValueChange={v => onChange({ ...cardConfig, titleField: v === "__none__" ? "" : v })}>
              <SelectTrigger className="h-8 text-xs mt-1"><SelectValue placeholder="Auto-detect" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__" className="text-xs">Auto-detect</SelectItem>
                {textFields.map(f => <SelectItem key={f.id ?? f.name} value={f.name} className="text-xs">{f.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="text-xs font-medium text-gray-700">Secondary Fields (up to 3)</Label>
              {cardConfig.secondaryFields.length > 0 && (
                <button onClick={() => onChange({ ...cardConfig, secondaryFields: [] })} className="text-xs text-gray-400 hover:text-red-500">Clear</button>
              )}
            </div>
            <div className="space-y-1.5">
              {secFields.map(f => {
                const isSelected = cardConfig.secondaryFields.includes(f.name);
                return (
                  <label key={f.id ?? f.name} className="flex items-center gap-2 cursor-pointer group">
                    <input type="checkbox" checked={isSelected} className="w-3.5 h-3.5 accent-blue-600"
                      onChange={e => {
                        const cur = cardConfig.secondaryFields;
                        if (e.target.checked) {
                          if (cur.length >= 3) return;
                          onChange({ ...cardConfig, secondaryFields: [...cur, f.name] });
                        } else {
                          onChange({ ...cardConfig, secondaryFields: cur.filter(n => n !== f.name) });
                        }
                      }} />
                    <span className="text-xs text-gray-700 group-hover:text-gray-900">{f.label}</span>
                    <span className="text-xs text-gray-400 ml-auto">{f.type.toLowerCase()}</span>
                  </label>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── List View ─────────────────────────────────────────────────────────────────

function ListView({ records, mod, slug }: {
  records: CrmRecord[];
  mod: any;
  slug: string;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const fields: Field[] = mod?.fields || [];
  const statusField = fields.find(f => ["STATUS", "DROPDOWN"].includes(f.type));
  const titleField = fields.find(f => ["TEXT", "EMAIL"].includes(f.type));
  const selectedRecord = records.find(r => r.id === selectedId);
  const router = useRouter();

  const STATUS_COLORS: Record<string, string> = {
    active: "bg-green-100 text-green-700 border-green-200",
    inactive: "bg-gray-100 text-gray-500 border-gray-200",
    pending: "bg-amber-100 text-amber-700 border-amber-200",
    closed: "bg-red-100 text-red-600 border-red-200",
    approved: "bg-blue-100 text-blue-700 border-blue-200",
  };

  const detailFields = fields.filter(f =>
    !["FILE", "IMAGE", "SIGNATURE", "INLINE_SUBFORM"].includes(f.type)
  );

  return (
    <div className={cn("relative transition-all duration-200", selectedRecord ? "mr-[400px]" : "")}>
      {records.length === 0 ? (
        <div className="text-center py-16 text-gray-400 text-sm">No records found.</div>
      ) : (
        <div className="divide-y divide-gray-100 border border-gray-200 rounded-xl overflow-hidden bg-white">
          {records.map((record, idx) => {
            const titleVal = titleField ? String(record.data[titleField.name] ?? "—") : `Record ${idx + 1}`;
            const statusVal = statusField ? String(record.data[statusField.name] ?? "") : "";
            const statusColor = STATUS_COLORS[statusVal.toLowerCase()] || "bg-gray-100 text-gray-600 border-gray-200";
            const isSelected = selectedId === record.id;
            return (
              <button
                key={record.id}
                onClick={() => setSelectedId(isSelected ? null : record.id)}
                className={cn(
                  "w-full flex items-center justify-between px-4 py-2.5 text-left hover:bg-gray-50 transition-colors",
                  isSelected && "bg-brand/5 hover:bg-brand/5"
                )}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className={cn(
                    "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-sm",
                    isSelected ? "bg-brand text-white" : "bg-gray-100 text-gray-500"
                  )}>
                    {mod?.icon ? <ModuleIcon icon={mod.icon} slug={slug} className="w-4 h-4" /> : <span className="font-bold text-xs">{idx + 1}</span>}
                  </div>
                  <span className="text-sm font-medium text-gray-800 truncate">{titleVal}</span>
                </div>
                <div className="flex items-center gap-3 shrink-0 ml-3">
                  {statusVal && (
                    <span className={cn("text-xs px-2 py-0.5 rounded-full border font-medium", statusColor)}>
                      {statusVal}
                    </span>
                  )}
                  <span className="text-xs text-gray-300">{new Date(record.createdAt).toLocaleDateString()}</span>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Detail Slide-over */}
      {selectedRecord && (
        <>
          <div className="fixed inset-y-0 right-0 w-full max-w-[400px] bg-white border-l border-gray-200 shadow-2xl z-40 flex flex-col">
            <div className="sticky top-0 bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between shrink-0">
              <h3 className="text-sm font-semibold text-gray-800 truncate max-w-[260px]">
                {titleField ? String(selectedRecord.data[titleField.name] ?? "Record") : "Record Details"}
              </h3>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => router.push(`/m/${slug}/${selectedRecord.id}`)}>
                  <Eye className="w-3 h-3" /> Open
                </Button>
                <button onClick={() => setSelectedId(null)} className="text-gray-400 hover:text-gray-600">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {detailFields.map(field => {
                const val = selectedRecord.data[field.name];
                if (val == null || val === "") return null;
                return (
                  <div key={field.id}>
                    <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-0.5">{field.label}</p>
                    <FieldValue value={val} field={field} recordData={selectedRecord.data} fieldName={field.name} />
                  </div>
                );
              })}
            </div>
            <div className="border-t border-gray-100 p-3 shrink-0">
              <p className="text-xs text-gray-400 text-center">
                Created {new Date(selectedRecord.createdAt).toLocaleDateString()}
                {selectedRecord.createdBy && ` · ${selectedRecord.createdBy.firstName} ${selectedRecord.createdBy.lastName}`}
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ── Calendar View ─────────────────────────────────────────────────────────────

function CalendarView({ records, mod, onRecordMove }: {
  records: CrmRecord[];
  mod: any;
  onRecordMove: (recordId: string, newDate: string, fieldName: string) => void;
}) {
  const router = useRouter();
  const fields: Field[] = mod?.fields || [];
  const dateField = fields.find(f => ["DATE", "DATETIME"].includes(f.type));
  const titleField = fields.find(f => ["TEXT", "EMAIL"].includes(f.type));
  const [calView, setCalView] = useState<"month" | "week">("month");

  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth()); // 0-indexed
  const [dragOver, setDragOver] = useState<string | null>(null);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  if (!dateField) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-gray-400">
        <span className="text-5xl mb-4">📅</span>
        <p className="text-sm font-medium text-gray-600">No date field in this module</p>
        <p className="text-xs mt-1">Add a Date or DateTime field to use Calendar view.</p>
      </div>
    );
  }

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfWeek = new Date(year, month, 1).getDay();
  const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
  const DAYS = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

  const recordsByDate: Record<string, CrmRecord[]> = {};
  records.forEach(rec => {
    const raw = rec.data[dateField.name];
    if (!raw) return;
    const dateStr = String(raw).slice(0, 10);
    if (!recordsByDate[dateStr]) recordsByDate[dateStr] = [];
    recordsByDate[dateStr].push(rec);
  });

  const prevMonth = () => { if (month === 0) { setMonth(11); setYear(y => y - 1); } else setMonth(m => m - 1); };
  const nextMonth = () => { if (month === 11) { setMonth(0); setYear(y => y + 1); } else setMonth(m => m + 1); };

  const cells: Array<{ day: number | null; dateStr: string | null }> = [];
  for (let i = 0; i < firstDayOfWeek; i++) cells.push({ day: null, dateStr: null });
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    cells.push({ day: d, dateStr });
  }

  const selectedRecords = selectedDay ? (recordsByDate[selectedDay] || []) : [];
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  return (
    <div className="select-none">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <button onClick={prevMonth} className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-gray-50 transition-colors">
            <ChevronLeft className="w-4 h-4 text-gray-600" />
          </button>
          <h2 className="text-base font-semibold text-gray-900">{MONTHS[month]} {year}</h2>
          <button onClick={nextMonth} className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-gray-50 transition-colors">
            <ChevronRight className="w-4 h-4 text-gray-600" />
          </button>
          <button onClick={() => { setYear(today.getFullYear()); setMonth(today.getMonth()); }}
            className="text-xs text-blue-600 hover:text-blue-800 px-2 py-1 rounded border border-blue-200 hover:bg-blue-50 transition-colors">
            Today
          </button>
        </div>
        <div className="flex items-center gap-1 text-xs text-gray-500">
          <span className="w-2 h-2 rounded-full bg-blue-400 inline-block" />
          {dateField.label} field
        </div>
      </div>

      {/* Grid */}
      <div className="border border-gray-200 rounded-xl overflow-hidden bg-white">
        {/* Day headers */}
        <div className="grid grid-cols-7 border-b border-gray-100 bg-gray-50">
          {DAYS.map(d => (
            <div key={d} className="py-2 text-center text-xs font-semibold text-gray-500">{d}</div>
          ))}
        </div>

        {/* Calendar cells */}
        <div className="grid grid-cols-7">
          {cells.map((cell, i) => {
            if (!cell.day || !cell.dateStr) {
              return <div key={i} className="min-h-[100px] border-b border-r border-gray-100 bg-gray-50/50" />;
            }
            const dayRecords = recordsByDate[cell.dateStr] || [];
            const isToday = cell.dateStr === todayStr;
            const isSelected = cell.dateStr === selectedDay;
            const isDropTarget = dragOver === cell.dateStr;

            return (
              <div
                key={i}
                className={cn(
                  "min-h-[100px] border-b border-r border-gray-100 p-1.5 transition-colors",
                  isDropTarget && "bg-blue-50",
                  isSelected && !isDropTarget && "bg-amber-50",
                  !isDropTarget && !isSelected && "hover:bg-gray-50"
                )}
                onClick={() => setSelectedDay(isSelected ? null : cell.dateStr!)}
                onDragOver={e => { e.preventDefault(); setDragOver(cell.dateStr!); }}
                onDragLeave={() => setDragOver(null)}
                onDrop={e => {
                  e.preventDefault();
                  const recordId = e.dataTransfer.getData("text/plain");
                  if (recordId && cell.dateStr) {
                    onRecordMove(recordId, cell.dateStr, dateField.name);
                  }
                  setDragOver(null);
                }}
              >
                <div className={cn(
                  "w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium mb-1 ml-auto",
                  isToday ? "bg-blue-600 text-white" : "text-gray-700"
                )}>
                  {cell.day}
                </div>
                <div className="space-y-0.5">
                  {dayRecords.slice(0, 3).map(rec => {
                    const title = titleField ? String(rec.data[titleField.name] ?? "—").slice(0, 20) : "Record";
                    return (
                      <div
                        key={rec.id}
                        draggable
                        onDragStart={e => { e.dataTransfer.setData("text/plain", rec.id); e.stopPropagation(); }}
                        onClick={e => { e.stopPropagation(); router.push(`/m/${mod?.slug}/${rec.id}`); }}
                        className="px-1.5 py-0.5 rounded text-xs bg-blue-100 text-blue-800 cursor-grab active:cursor-grabbing hover:bg-blue-200 truncate transition-colors"
                        title={title}
                      >
                        {title}
                      </div>
                    );
                  })}
                  {dayRecords.length > 3 && (
                    <div className="text-xs text-gray-400 px-1">+{dayRecords.length - 3} more</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Selected day panel */}
      {selectedDay && (
        <div className="mt-4 border border-gray-200 rounded-xl bg-white p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-800">
              {new Date(selectedDay + "T12:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
            </h3>
            <span className="text-xs text-gray-400">{selectedRecords.length} record{selectedRecords.length !== 1 ? "s" : ""}</span>
          </div>
          {selectedRecords.length === 0 ? (
            <p className="text-xs text-gray-400 py-2">No records on this day.</p>
          ) : (
            <div className="space-y-1.5">
              {selectedRecords.map(rec => {
                const title = titleField ? String(rec.data[titleField.name] ?? "—") : "Record";
                return (
                  <button key={rec.id}
                    onClick={() => router.push(`/m/${mod?.slug}/${rec.id}`)}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-lg border border-gray-100 hover:border-blue-200 hover:bg-blue-50 text-left transition-colors">
                    <ModuleIcon icon={mod?.icon} slug={mod?.slug} className="w-4 h-4" />
                    <span className="text-sm text-gray-800 font-medium truncate">{title}</span>
                    <Eye className="w-3.5 h-3.5 text-gray-400 ml-auto shrink-0" />
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function KanbanView({ records, mod, slug, onRecordMove, cardFieldIds }: {
  records: CrmRecord[];
  mod: any;
  slug: string;
  onRecordMove: (recordId: string, newValue: string, fieldName: string) => void;
  cardFieldIds: string[];
}) {
  const [activeRecord, setActiveRecord] = useState<CrmRecord | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  // Prefer the field explicitly configured in Studio (settings.kanbanGroupByFieldId);
  // fall back to the first Status/Dropdown field if unset, or if that field was
  // since deleted/retyped, so existing modules keep behaving exactly as before.
  const configuredKanbanFieldId = mod?.settings?.kanbanGroupByFieldId;
  const statusField: Field | undefined =
    (configuredKanbanFieldId && mod?.fields?.find((f: Field) => f.id === configuredKanbanFieldId && ["STATUS", "DROPDOWN"].includes(f.type)))
    || mod?.fields?.find((f: Field) => ["STATUS", "DROPDOWN"].includes(f.type));
  if (!statusField) {
    return (
      <div className="text-center py-16 text-gray-500">
        <LayoutGrid className="w-10 h-10 text-gray-300 mx-auto mb-3" />
        <p className="text-sm">Add a Status or Dropdown field to enable Kanban view.</p>
      </div>
    );
  }

  const options = statusField.options || [];
  const columns = options.length > 0 ? options : [{ value: "__none__", label: "No Status", color: undefined }];
  // Which fields render on each card — user-configurable via "Card Fields"; falls back to
  // the same single TEXT/EMAIL field that used to be the only thing a card could show.
  const fallbackTitle: Field | undefined = mod?.fields?.find((f: Field) => ["TEXT", "EMAIL"].includes(f.type));
  const cardFields: Field[] = cardFieldIds.length > 0
    ? cardFieldIds.map(id => mod?.fields?.find((f: Field) => f.id === id)).filter(Boolean)
    : (fallbackTitle ? [fallbackTitle] : []);
  const titleField = cardFields[0];

  const handleDragStart = (event: DragStartEvent) => {
    const rec = records.find(r => r.id === String(event.active.id));
    setActiveRecord(rec ?? null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveRecord(null);
    const { active, over } = event;
    if (!over) return;
    const recordId = String(active.id);
    const newColValue = String(over.id);
    const rec = records.find(r => r.id === recordId);
    if (!rec) return;
    const current = rec.data[statusField.name];
    const effectiveNew = newColValue === "__none__" ? "" : newColValue;
    if (current === effectiveNew || (!current && !effectiveNew)) return;
    onRecordMove(recordId, effectiveNew, statusField.name);
  };

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="flex gap-4 overflow-x-auto pb-4 pt-1 -mx-1 px-1" style={{ minHeight: "60vh" }}>
        {columns.map(col => {
          const colRecords = records.filter(r => {
            const v = r.data[statusField.name];
            return col.value === "__none__" ? !v : v === col.value;
          });
          return (
            <KanbanColumn key={col.value} col={col} records={colRecords} cardFields={cardFields} slug={slug} />
          );
        })}
      </div>
      <DragOverlay>
        {activeRecord && (
          <div className="p-3 rounded-lg border border-gray-300 bg-white shadow-xl space-y-1.5 w-56 rotate-1 opacity-95">
            <p className="text-sm font-medium text-gray-800 truncate">
              {titleField ? activeRecord.data[titleField.name] || "Untitled" : activeRecord.id.slice(0, 8)}
            </p>
            <p className="text-xs text-gray-400">{formatDate(activeRecord.createdAt)}</p>
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}

// ── API-backed Saved Views ─────────────────────────────────────────────────

function mapApiView(v: any): SavedView {
  const filters = v.filters || {};
  const conditions: FilterCondition[] = Array.isArray(filters)
    ? filters
    : (filters.conditions || []);
  return {
    id: v.id,
    name: v.name,
    filterLogic: (filters.logic || v.config?.logic || "AND") as "AND" | "OR",
    conditions,
    visibleFieldIds: Array.isArray(v.columns) ? v.columns : [],
    isPinned: v.isPinned || false,
  };
}

function useSavedViews(moduleId: string) {
  const [views, setViews] = useState<SavedView[]>([]);

  const fetch = useCallback(async () => {
    if (!moduleId) return;
    try {
      const { data } = await api.get(`/modules/${moduleId}/views`);
      setViews((data || []).map(mapApiView));
    } catch { setViews([]); }
  }, [moduleId]);

  useEffect(() => { fetch(); }, [fetch]);

  const save = async (name: string, data: Omit<SavedView, "id" | "name" | "isPinned">) => {
    const { data: created } = await api.post(`/modules/${moduleId}/views`, {
      name,
      type: "TABLE",
      filters: { logic: data.filterLogic, conditions: data.conditions },
      columns: data.visibleFieldIds,
      config: { logic: data.filterLogic },
    });
    const view = mapApiView(created);
    setViews(prev => [...prev, view]);
    return view;
  };

  const update = async (id: string, data: Partial<Omit<SavedView, "id" | "name" | "isPinned">>) => {
    const patch: any = {};
    if (data.conditions !== undefined || data.filterLogic !== undefined) {
      patch.filters = { logic: data.filterLogic, conditions: data.conditions };
      patch.config = { logic: data.filterLogic };
    }
    if (data.visibleFieldIds !== undefined) patch.columns = data.visibleFieldIds;
    await api.patch(`/modules/${moduleId}/views/${id}`, patch);
    setViews(prev => prev.map(v => v.id === id ? { ...v, ...data } : v));
  };

  const remove = async (id: string) => {
    await api.delete(`/modules/${moduleId}/views/${id}`);
    setViews(prev => prev.filter(v => v.id !== id));
  };

  const togglePin = async (id: string) => {
    await api.patch(`/modules/${moduleId}/views/${id}/toggle-pin`);
    setViews(prev => prev.map(v => v.id === id ? { ...v, isPinned: !v.isPinned } : v));
  };

  const pinnedViews = views.filter(v => v.isPinned);
  const unpinnedViews = views.filter(v => !v.isPinned);
  const sortedViews = [...pinnedViews, ...unpinnedViews];

  return { views: sortedViews, save, update, remove, togglePin };
}

// ── Import Dialog ──────────────────────────────────────────────────────────

type ImportStep = "upload" | "map" | "preview" | "result";

function ImportDialog({ mod, open, onClose, onSuccess }: {
  mod: any;
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [step, setStep] = useState<ImportStep>("upload");
  const [file, setFile] = useState<File | null>(null);
  const [csvText, setCsvText] = useState("");
  const [headers, setHeaders] = useState<string[]>([]);
  const [previewRows, setPreviewRows] = useState<Record<string, string>[]>([]);
  const [total, setTotal] = useState(0);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ imported: number; errors: string[]; total: number } | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const importableFields: Field[] = (mod?.fields || []).filter(
    (f: Field) => !["AUTO_NUMBER", "FILE", "IMAGE", "SIGNATURE"].includes(f.type)
  );

  const reset = () => {
    setStep("upload");
    setFile(null);
    setCsvText("");
    setHeaders([]);
    setPreviewRows([]);
    setTotal(0);
    setMapping({});
    setResult(null);
  };

  const handleClose = () => { reset(); onClose(); };

  const handleFile = async (f: File) => {
    if (!f.name.endsWith(".csv")) { alert("Please upload a .csv file"); return; }
    setFile(f);
    const text = await f.text();
    setCsvText(text);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  };

  const handleParseStep = async () => {
    if (!csvText) return;
    setLoading(true);
    try {
      const { data } = await api.post(`/modules/${mod.id}/records/import/preview`, { csvText });
      setHeaders(data.headers || []);
      setPreviewRows(data.preview || []);
      setTotal(data.total || 0);
      const auto: Record<string, string> = {};
      (data.headers || []).forEach((h: string) => {
        const match = importableFields.find(f =>
          f.label.toLowerCase() === h.toLowerCase() || f.name.toLowerCase() === h.toLowerCase()
        );
        auto[h] = match ? match.name : "";
      });
      setMapping(auto);
      setStep("map");
    } catch { alert("Failed to parse CSV. Please check the file format."); }
    finally { setLoading(false); }
  };

  const handleImport = async () => {
    const mapped = Object.values(mapping).filter(Boolean);
    if (mapped.length === 0) { alert("Please map at least one column to a field."); return; }
    setLoading(true);
    try {
      const { data } = await api.post(`/modules/${mod.id}/records/import/run`, { csvText, mapping });
      setResult(data);
      setStep("result");
      if (data.imported > 0) onSuccess();
    } catch { alert("Import failed. Please try again."); }
    finally { setLoading(false); }
  };

  const downloadTemplate = () => {
    const token = localStorage.getItem("access_token");
    const base = process.env.NEXT_PUBLIC_API_URL || "/api/v1";
    fetch(`${base}/modules/${mod.id}/records/import/template`, {
      headers: { Authorization: `Bearer ${token}` },
    }).then(r => r.blob()).then(blob => {
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `${mod?.slug || "module"}-template.csv`;
      a.click();
      URL.revokeObjectURL(a.href);
    });
  };

  const mappedCount = Object.values(mapping).filter(Boolean).length;

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) handleClose(); }}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5 text-blue-600" />
            Import Records — {mod?.name}
          </DialogTitle>
          <DialogDescription>
            {step === "upload" && "Upload a CSV file to import records into this module."}
            {step === "map" && `Map CSV columns to ${mod?.name} fields. ${total} row${total !== 1 ? "s" : ""} detected.`}
            {step === "preview" && "Preview the first rows before importing."}
            {step === "result" && "Import complete."}
          </DialogDescription>
        </DialogHeader>

        {/* Step indicators */}
        <div className="flex items-center gap-0 text-xs">
          {(["upload", "map", "result"] as ImportStep[]).map((s, i) => {
            const labels = ["Upload", "Map Columns", "Done"];
            const stepOrder = ["upload", "map", "result"];
            const done = stepOrder.indexOf(step) > i;
            const active = step === s;
            return (
              <div key={s} className="flex items-center">
                <div className={cn(
                  "flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium",
                  active ? "bg-blue-100 text-blue-700" :
                  done ? "bg-green-100 text-green-700" : "text-gray-400"
                )}>
                  {done ? <CheckCircle2 className="w-3 h-3" /> : <span>{i + 1}</span>}
                  {labels[i]}
                </div>
                {i < 2 && <div className="w-6 h-px bg-gray-200 mx-1" />}
              </div>
            );
          })}
        </div>

        {/* Step: Upload */}
        {step === "upload" && (
          <div className="space-y-4">
            <div
              onDragOver={e => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={cn(
                "border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors",
                dragOver ? "border-brand bg-brand/5" : file ? "border-green-400 bg-green-50" : "border-gray-200 hover:border-brand/50 hover:bg-brand/5"
              )}
            >
              <input ref={fileInputRef} type="file" accept=".csv" className="hidden"
                onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />
              {file ? (
                <div className="flex flex-col items-center gap-2">
                  <FileText className="w-10 h-10 text-green-500" />
                  <p className="font-medium text-gray-800">{file.name}</p>
                  <p className="text-sm text-gray-500">{(file.size / 1024).toFixed(1)} KB · Click to change</p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <Upload className="w-10 h-10 text-gray-300" />
                  <p className="font-medium text-gray-700">Drop CSV file here or click to browse</p>
                  <p className="text-sm text-gray-400">Only .csv files are supported</p>
                </div>
              )}
            </div>
            <div className="flex items-center justify-between text-sm">
              <button onClick={downloadTemplate} className="text-blue-600 hover:text-blue-800 flex items-center gap-1.5 font-medium">
                <Download className="w-4 h-4" /> Download CSV Template
              </button>
              <p className="text-xs text-gray-400">{importableFields.length} importable field{importableFields.length !== 1 ? "s" : ""}</p>
            </div>
          </div>
        )}

        {/* Step: Map Columns */}
        {step === "map" && (
          <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
            <div className="grid grid-cols-2 gap-2 text-xs font-semibold text-gray-500 uppercase tracking-wider px-1">
              <span>CSV Column</span>
              <span>{mod?.name} Field</span>
            </div>
            {headers.map(h => (
              <div key={h} className="grid grid-cols-2 gap-2 items-center">
                <div className="px-3 py-2 rounded-lg border border-gray-200 bg-gray-50 text-sm text-gray-700 truncate font-mono">{h}</div>
                <Select value={mapping[h] || "__skip__"} onValueChange={v => setMapping(prev => ({ ...prev, [h]: v === "__skip__" ? "" : v }))}>
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue placeholder="— Skip —" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__skip__" className="text-gray-400">— Skip column —</SelectItem>
                    {importableFields.map((f: Field) => (
                      <SelectItem key={f.id ?? f.name} value={f.name}>{f.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ))}
            <p className="text-xs text-gray-400 pt-1">{mappedCount} of {headers.length} column{headers.length !== 1 ? "s" : ""} mapped</p>
          </div>
        )}

        {/* Step: Result */}
        {step === "result" && result && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-center">
                <CheckCircle2 className="w-8 h-8 text-green-500 mx-auto mb-2" />
                <p className="text-2xl font-bold text-green-700">{result.imported}</p>
                <p className="text-sm text-green-600">Records Imported</p>
              </div>
              <div className="rounded-xl border border-red-100 bg-red-50 p-4 text-center">
                <AlertCircle className="w-8 h-8 text-red-400 mx-auto mb-2" />
                <p className="text-2xl font-bold text-red-600">{result.errors.length}</p>
                <p className="text-sm text-red-500">Rows Failed</p>
              </div>
            </div>
            {result.errors.length > 0 && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-3 max-h-32 overflow-y-auto">
                <p className="text-xs font-semibold text-red-600 mb-2">Errors:</p>
                {result.errors.map((e, i) => <p key={i} className="text-xs text-red-600">{e}</p>)}
              </div>
            )}
          </div>
        )}

        <DialogFooter className="gap-2">
          {step === "upload" && (
            <>
              <Button variant="outline" onClick={handleClose}>Cancel</Button>
              <Button onClick={handleParseStep} disabled={!file || loading} className="gap-2">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Next: Map Columns
              </Button>
            </>
          )}
          {step === "map" && (
            <>
              <Button variant="outline" onClick={() => setStep("upload")}>Back</Button>
              <Button onClick={handleImport} disabled={mappedCount === 0 || loading} className="gap-2">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                Import {total} Row{total !== 1 ? "s" : ""}
              </Button>
            </>
          )}
          {step === "result" && (
            <>
              <Button variant="outline" onClick={reset}>Import More</Button>
              <Button onClick={handleClose}>Done</Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Module View Item (dropdown row with pin/delete) ────────────────────────

function ModuleViewItem({
  view, isActive, onLoad, onDelete, onTogglePin,
}: {
  view: SavedView;
  isActive: boolean;
  onLoad: () => void;
  onDelete: () => void;
  onTogglePin: () => void;
}) {
  return (
    <div className={cn(
      "flex items-center gap-1 px-2 py-1.5 hover:bg-gray-50 rounded-sm group cursor-pointer",
      isActive && "bg-blue-50"
    )}>
      <button className="flex-1 flex items-center gap-2 text-left min-w-0" onClick={onLoad}>
        {view.isPinned && <Pin className="w-3 h-3 text-blue-500 flex-shrink-0" />}
        <span className={cn("text-sm truncate", isActive && "font-medium text-blue-700")}>{view.name}</span>
        {isActive && <Check className="w-3 h-3 text-blue-600 flex-shrink-0 ml-auto" />}
      </button>
      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
        <button onClick={(e) => { e.stopPropagation(); onTogglePin(); }}
          className="p-1 rounded hover:bg-gray-200 text-gray-400 hover:text-blue-600"
          title={view.isPinned ? "Unpin" : "Pin"}>
          {view.isPinned ? <PinOff className="w-3 h-3" /> : <Pin className="w-3 h-3" />}
        </button>
        <button onClick={(e) => { e.stopPropagation(); onDelete(); }}
          className="p-1 rounded hover:bg-gray-200 text-gray-400 hover:text-red-600" title="Delete">
          <Trash2 className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}

// ── Mass Update Components ─────────────────────────────────────────────────

function MassUpdateLookupInput({ field, value, onChange }: { field: Field; value: any; onChange: (v: any) => void }) {
  const settings = (field.settings || {}) as Record<string, any>;
  const targetModuleId = settings.lookupModuleId as string;
  const displayField = (settings.displayField as string) || "name";
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [label, setLabel] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  useEffect(() => {
    if (!targetModuleId) return;
    api.get(`/records/lookup?moduleId=${targetModuleId}&displayField=${displayField}&search=${search}`)
      .then(r => setResults(r.data || [])).catch(() => setResults([]));
  }, [search, targetModuleId, displayField]);

  if (!targetModuleId) return <Input value={value || ""} onChange={e => onChange(e.target.value)} placeholder="Not configured" className="h-9" />;

  return (
    <div ref={ref} className="relative">
      <Input
        value={label || (value ? String(value) : "")}
        onChange={e => { setSearch(e.target.value); setLabel(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        placeholder={`Search ${field.label}...`}
        className="h-9"
      />
      {value && (
        <button type="button" onClick={() => { onChange(""); setLabel(""); setSearch(""); }}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-red-500">
          <X className="w-3.5 h-3.5" />
        </button>
      )}
      {open && results.length > 0 && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white rounded-lg border border-gray-200 shadow-lg max-h-48 overflow-y-auto">
          {results.map((item: any) => (
            <button key={item.id} type="button"
              onClick={() => { onChange(item.value || item.id); setLabel(item.label); setOpen(false); }}
              className="w-full text-left px-3 py-2 text-sm hover:bg-blue-50 hover:text-blue-700 transition-colors">
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function MassUpdateValueInput({ field, value, onChange }: { field: Field; value: any; onChange: (v: any) => void }) {
  switch (field.type) {
    case "BOOLEAN":
      return (
        <div className="flex items-center gap-3 py-1">
          <Switch checked={!!value} onCheckedChange={onChange} />
          <span className="text-sm text-gray-600">{value ? "Yes" : "No"}</span>
        </div>
      );
    case "DROPDOWN":
    case "STATUS":
    case "RADIO":
      return (
        <Select value={value || "__clear__"} onValueChange={v => onChange(v === "__clear__" ? "" : v)}>
          <SelectTrigger className="h-9"><SelectValue placeholder="Select..." /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__clear__" className="text-gray-400">— Clear value —</SelectItem>
            {(field.options || []).map((o, i) => (
              <SelectItem key={o.id ?? `${o.value}-${i}`} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    case "NUMBER":
    case "DECIMAL":
    case "CURRENCY":
      return (
        <Input type="number" value={value ?? ""} className="h-9"
          onChange={e => onChange(e.target.value === "" ? "" : Number(e.target.value))}
          placeholder="Enter value..." />
      );
    case "DATE":
      return <Input type="date" value={value || ""} className="h-9" onChange={e => onChange(e.target.value)} />;
    case "DATETIME":
      return <Input type="datetime-local" value={value || ""} className="h-9" onChange={e => onChange(e.target.value)} />;
    case "LOOKUP":
    case "GLOBAL_RELATION":
      return <MassUpdateLookupInput field={field} value={value} onChange={onChange} />;
    default:
      return (
        <Input value={value || ""} className="h-9"
          onChange={e => onChange(e.target.value)}
          placeholder={`Enter ${field.label.toLowerCase()}...`} />
      );
  }
}

function MassUpdateModal({
  open, onClose, fields, moduleId, selectedIds, onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  fields: Field[];
  moduleId: string;
  selectedIds: string[];
  onSuccess: (count: number) => void;
}) {
  const [fieldName, setFieldName] = useState("");
  const [value, setValue] = useState<any>("");
  const [updating, setUpdating] = useState(false);
  const [result, setResult] = useState<{ updated: number; errors: string[]; total: number } | null>(null);

  const updatableFields = fields.filter(f =>
    !["AUTO_NUMBER", "FILE", "IMAGE", "SIGNATURE", "FORMULA", "INLINE_SUBFORM"].includes(f.type)
  );
  const selectedField = updatableFields.find(f => f.name === fieldName);

  const reset = () => { setFieldName(""); setValue(""); setResult(null); };
  const handleClose = () => { reset(); onClose(); };

  const handleUpdate = async () => {
    if (!fieldName) return;
    setUpdating(true);
    try {
      const { data } = await api.post(`/modules/${moduleId}/records/bulk-update`, {
        ids: selectedIds, fieldName, value,
      });
      setResult(data);
      onSuccess(data.updated);
    } catch {
      setResult({ updated: 0, errors: selectedIds, total: selectedIds.length });
    } finally {
      setUpdating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) handleClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-blue-600" />
            Mass Update {selectedIds.length} Record{selectedIds.length !== 1 ? "s" : ""}
          </DialogTitle>
          <DialogDescription>
            Apply a single field change to all {selectedIds.length} selected record{selectedIds.length !== 1 ? "s" : ""} at once.
          </DialogDescription>
        </DialogHeader>

        {result ? (
          <div className="py-3">
            <div className={cn(
              "rounded-xl p-5 text-center border",
              result.errors.length === 0
                ? "bg-green-50 border-green-200"
                : result.updated > 0 ? "bg-yellow-50 border-yellow-200" : "bg-red-50 border-red-200"
            )}>
              <CheckCircle2 className={cn("w-9 h-9 mx-auto mb-2",
                result.errors.length === 0 ? "text-green-500" : result.updated > 0 ? "text-yellow-500" : "text-red-400"
              )} />
              <p className="font-semibold text-gray-800 text-base">
                {result.updated} record{result.updated !== 1 ? "s" : ""} updated
              </p>
              {result.errors.length > 0 && (
                <p className="text-sm text-red-500 mt-1">{result.errors.length} failed</p>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-gray-700">Field to Update</Label>
              <Select value={fieldName} onValueChange={v => { setFieldName(v); setValue(""); }}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Choose a field..." />
                </SelectTrigger>
                <SelectContent>
                  {updatableFields.map(f => (
                    <SelectItem key={f.id ?? f.name} value={f.name}>
                      <span className="flex items-center gap-2">
                        {f.label}
                        <span className="text-xs text-gray-400 font-mono">{f.type.toLowerCase()}</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedField && (
              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-gray-700">New Value for "{selectedField.label}"</Label>
                <MassUpdateValueInput field={selectedField} value={value} onChange={setValue} />
              </div>
            )}

            {selectedField && (
              <div className="flex items-start gap-2.5 px-3 py-2.5 bg-amber-50 border border-amber-200 rounded-lg">
                <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-700 leading-relaxed">
                  This will overwrite <strong>{selectedIds.length} record{selectedIds.length !== 1 ? "s" : ""}</strong>.
                  Previous values for <strong>{selectedField.label}</strong> will be permanently replaced.
                </p>
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          {result ? (
            <>
              <Button variant="outline" onClick={reset}>Update Another Field</Button>
              <Button onClick={handleClose}>Done</Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={handleClose}>Cancel</Button>
              <Button onClick={handleUpdate} disabled={!fieldName || updating} className="gap-2">
                {updating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Pencil className="w-4 h-4" />}
                Update {selectedIds.length} Records
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────

export default function ModuleRecordsPage() {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();
  const perm = useModulePermission(slug ?? "");

  const [mod, setMod] = useState<any>(null);
  const [result, setResult] = useState<PaginatedResult | null>(null);
  const [allRecords, setAllRecords] = useState<CrmRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [deleting, setDeleting] = useState(false);
  const [massUpdateOpen, setMassUpdateOpen] = useState(false);
  const [sendEmailRecord, setSendEmailRecord] = useState<CrmRecord | null>(null);
  const [bulkEmailOpen, setBulkEmailOpen] = useState(false);
  const [bulkRecipients, setBulkRecipients] = useState<BulkRecipient[]>([]);
  type ViewMode = "table" | "kanban" | "gallery" | "list" | "calendar";
  const storeView = useViewStore(state => (state.moduleViews[slug] as ViewMode) ?? "table");
  const setModuleView = useViewStore(state => state.setModuleView);
  const [view, setViewLocal] = useState<ViewMode>(storeView);
  const setView = useCallback((v: ViewMode) => { setViewLocal(v); setModuleView(slug, v); }, [slug, setModuleView]);
  const [galleryCardConfig, setGalleryCardConfig] = useState({ imageField: "", titleField: "", secondaryFields: [] as string[] });
  const [showGalleryCustomize, setShowGalleryCustomize] = useState(false);
  const [visibleFieldIds, setVisibleFieldIds] = useState<string[]>([]);
  const columnSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const modIdRef = useRef<string | null>(null);
  const handleColumnChange = useCallback((ids: string[]) => {
    setVisibleFieldIds(ids);
    if (columnSaveTimer.current) clearTimeout(columnSaveTimer.current);
    columnSaveTimer.current = setTimeout(() => {
      if (modIdRef.current) {
        api.put(`/user-preferences/columns:${modIdRef.current}`, { value: ids }).catch(() => {});
      }
    }, 800);
  }, []);

  // Which fields render on each Kanban card — first one is the bold title (same spot the
  // single auto-picked title field used to occupy), any others render as secondary rows
  // below it, same "Label: value" style as the Gallery view's secondary fields.
  const [kanbanFieldIds, setKanbanFieldIds] = useState<string[]>([]);
  const kanbanFieldSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleKanbanFieldChange = useCallback((ids: string[]) => {
    setKanbanFieldIds(ids);
    if (kanbanFieldSaveTimer.current) clearTimeout(kanbanFieldSaveTimer.current);
    kanbanFieldSaveTimer.current = setTimeout(() => {
      if (modIdRef.current) {
        api.put(`/user-preferences/kanbanFields:${modIdRef.current}`, { value: ids }).catch(() => {});
      }
    }, 800);
  }, []);

  // Filters
  const [filterOpen, setFilterOpen] = useState(false);
  const [filterLogic, setFilterLogic] = useState<"AND" | "OR">("AND");
  const [conditions, setConditions] = useState<FilterCondition[]>([]);
  const [appliedConditions, setAppliedConditions] = useState<FilterCondition[]>([]);
  const [appliedLogic, setAppliedLogic] = useState<"AND" | "OR">("AND");

  // Tag quick-filter
  const [tagFilter, setTagFilter] = useState("");

  // Saved views
  const [saveViewName, setSaveViewName] = useState("");
  const [showSaveView, setShowSaveView] = useState(false);

  // Import
  const [importOpen, setImportOpen] = useState(false);

  // Sort
  const [sortField, setSortField] = useState<string | null>(null);
  const [sortDir,   setSortDir]   = useState<"asc" | "desc">("asc");

  // Archive visibility
  const [showArchived, setShowArchived] = useState(false);

  // Table density (compact / normal / comfortable) — persisted in localStorage per module
  type Density = "compact" | "normal" | "comfortable";
  const [density, setDensity] = useState<Density>("normal");
  useEffect(() => {
    if (!slug) return;
    const stored = localStorage.getItem(`crm-density-${slug}`) as Density | null;
    if (stored) setDensity(stored);
  }, [slug]);
  const changeDensity = (d: Density) => { setDensity(d); if (slug) localStorage.setItem(`crm-density-${slug}`, d); };
  const cellPy = density === "compact" ? "py-1" : density === "comfortable" ? "py-3.5" : "py-2";

  // Inline cell editing
  const [editingCell, setEditingCell] = useState<{ recordId: string; fieldKey: string } | null>(null);
  const [editValue,   setEditValue]   = useState<any>(null);
  const [cellSaving,  setCellSaving]  = useState(false);

  // Pagination
  const [limit, setLimit] = useState(25);

  const fetchMod = useCallback(async () => {
    try {
      const { data } = await api.get(`/modules/by-slug/${slug}`);
      setMod(data);
      modIdRef.current = data.id;
      // Restore persisted column preferences, fall back to default first 7
      try {
        const prefRes = await api.get(`/user-preferences/columns:${data.id}`);
        if (prefRes.data?.value && Array.isArray(prefRes.data.value)) {
          const validIds = new Set((data.fields || []).map((f: Field) => f.id));
          const stored = (prefRes.data.value as string[]).filter(id => validIds.has(id));
          if (stored.length > 0) {
            setVisibleFieldIds(stored);
            return data;
          }
        }
      } catch {}
      const defaultVisible = (data.fields || [])
        .filter((f: Field) => !f.isHidden)
        .slice(0, 7)
        .map((f: Field) => f.id);
      setVisibleFieldIds(defaultVisible);
      return data;
    } catch {
      setError("Module not found");
      return null;
    }
  }, [slug]);

  useEffect(() => {
    if (!mod?.id) return;
    (async () => {
      // Restore persisted Kanban card-field preferences, fall back to the same
      // single TEXT/EMAIL field that used to be the only thing shown on a card.
      try {
        const prefRes = await api.get(`/user-preferences/kanbanFields:${mod.id}`);
        if (prefRes.data?.value && Array.isArray(prefRes.data.value)) {
          const validIds = new Set((mod.fields || []).map((f: Field) => f.id));
          const stored = (prefRes.data.value as string[]).filter((id: string) => validIds.has(id));
          if (stored.length > 0) { setKanbanFieldIds(stored); return; }
        }
      } catch {}
      const defaultTitle = (mod.fields || []).find((f: Field) => ["TEXT", "EMAIL"].includes(f.type));
      setKanbanFieldIds(defaultTitle ? [defaultTitle.id] : []);
    })();
  }, [mod?.id]);

  const buildFilterGroup = useCallback((conds: FilterCondition[], logic: "AND" | "OR") => {
    const valid = conds.filter(c => c.field && (noValue(c.operator) || c.value !== ""));
    if (valid.length === 0) return undefined;
    return { logic, conditions: valid, groups: [] };
  }, []);

  const fetchRecords = useCallback(async (
    moduleId: string, currentPage: number,
    conds: FilterCondition[], logic: "AND" | "OR",
    sf: string | null = null, sd: "asc" | "desc" = "asc",
    lim?: number,
  ) => {
    try {
      const fg = buildFilterGroup(conds, logic);
      const params: any = { page: currentPage, limit: lim ?? limit };
      if (search) params.search = search;
      if (fg) params.filterGroup = JSON.stringify(fg);
      if (sf) { params.sortField = sf; params.sortDir = sd; }
      if (showArchived) params.showArchived = 'true';

      const { data } = await api.get(`/modules/${moduleId}/records`, { params });
      setResult(data);
    } catch {
      setError("Failed to load records");
    } finally {
      setLoading(false);
    }
  }, [limit, search, showArchived, buildFilterGroup]);

  const fetchAllRecords = useCallback(async (moduleId: string) => {
    try {
      const { data } = await api.get(`/modules/${moduleId}/records`, { params: { page: 1, limit: 500 } });
      setAllRecords(data.data || []);
    } catch {}
  }, []);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const module = await fetchMod();
      if (module) {
        await Promise.all([
          fetchRecords(module.id, page, appliedConditions, appliedLogic),
          fetchAllRecords(module.id),
        ]);
      }
    };
    load();
  }, [slug]);

  const refresh = () => {
    if (mod) {
      setLoading(true);
      fetchRecords(mod.id, page, appliedConditions, appliedLogic);
      fetchAllRecords(mod.id);
    }
  };

  // Live-refresh: workflows (or another user) can change record data in the
  // background — refetch (debounced, since one save can fire several actions)
  // whenever the backend broadcasts a change for this module.
  useEffect(() => {
    const socket = getSocket();
    if (!socket || !mod?.id) return;
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;
    const handler = (payload: { moduleId?: string }) => {
      if (payload?.moduleId !== mod.id) return;
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        fetchRecords(mod.id, page, appliedConditions, appliedLogic);
        fetchAllRecords(mod.id);
      }, 300);
    };
    socket.on("record:updated", handler);
    return () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      socket.off("record:updated", handler);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mod?.id, page, appliedConditions, appliedLogic]);

  const handleKanbanMove = useCallback(async (recordId: string, newValue: string, fieldName: string) => {
    // Blueprint validation: check if this stage transition is allowed
    if (mod?.id) {
      const rec = allRecords.find(r => r.id === recordId);
      const fromStage = rec?.data?.[fieldName] ?? "";
      if (fromStage !== newValue) {
        const { validateKanbanMove } = useBlueprintRuntimeStore.getState();
        const { allowed, reason } = await validateKanbanMove(mod.id, fromStage, newValue);
        if (!allowed) {
          showToast(reason || "This transition is not allowed by the blueprint", "error");
          return;
        }
      }
    }

    // Optimistic update in BOTH kanban (allRecords) and table (result) data sources
    const applyUpdate = (r: CrmRecord) =>
      r.id === recordId ? { ...r, data: { ...r.data, [fieldName]: newValue } } : r;
    setAllRecords(prev => prev.map(applyUpdate));
    setResult(prev => prev ? { ...prev, data: prev.data.map(applyUpdate) } : prev);
    try {
      await api.patch(`/modules/${mod.id}/records/${recordId}`, { [fieldName]: newValue });
      showToast("Status updated successfully");
    } catch {
      // Revert both data sources on failure
      fetchAllRecords(mod.id);
      setResult(null);
      showToast("Failed to move record", "error");
    }
  }, [mod, allRecords, fetchAllRecords]);

  const applyFilters = () => {
    setAppliedConditions([...conditions]);
    setAppliedLogic(filterLogic);
    setPage(1);
    setLoading(true);
    if (mod) fetchRecords(mod.id, 1, conditions, filterLogic);
  };

  const clearFilters = () => {
    setConditions([]);
    setAppliedConditions([]);
    setPage(1);
    setLoading(true);
    if (mod) fetchRecords(mod.id, 1, [], filterLogic);
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    setLoading(true);
    if (mod) fetchRecords(mod.id, newPage, appliedConditions, appliedLogic, sortField, sortDir);
  };

  const handleSort = (fieldName: string) => {
    const nextDir = sortField === fieldName && sortDir === "asc" ? "desc" : "asc";
    setSortField(fieldName);
    setSortDir(nextDir);
    setLoading(true);
    if (mod) fetchRecords(mod.id, page, appliedConditions, appliedLogic, fieldName, nextDir);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this record?")) return;
    await api.delete(`/modules/${mod.id}/records/${id}`);
    refresh();
  };

  const handleBulkDelete = async () => {
    if (!confirm(`Delete ${selected.length} records? This cannot be undone.`)) return;
    setDeleting(true);
    try {
      await api.post(`/modules/${mod.id}/records/bulk-delete`, { ids: selected });
      setSelected([]);
      refresh();
      showToast(`${selected.length} record${selected.length !== 1 ? "s" : ""} deleted`);
    } catch {
      showToast("Failed to delete records", "error");
    } finally {
      setDeleting(false);
    }
  };

  const handleExportSelected = () => {
    if (!mod || selected.length === 0) return;
    const selectedRecords = (result?.data || []).filter(r => selected.includes(r.id));
    const exportFields = visibleFields.length > 0 ? visibleFields : (mod?.fields || []).slice(0, 7);
    const headers = ["ID", ...exportFields.map((f: Field) => f.label), "Created At"];
    const rows = selectedRecords.map(r => [
      r.id,
      ...exportFields.map((f: Field) => {
        const v = r.data[f.name];
        if (v === null || v === undefined) return "";
        if (Array.isArray(v)) return v.length > 0 && typeof v[0] === "object" ? `${v.length} rows` : v.join("; ");
        if (typeof v === "object") return (v as any).name || (v as any).label || JSON.stringify(v);
        return String(v);
      }),
      r.createdAt,
    ]);
    const csv = [headers, ...rows]
      .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${mod.slug}-selected-${selected.length}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const handleExport = () => {
    if (!mod) return;
    const fg = buildFilterGroup(appliedConditions, appliedLogic);
    const params = new URLSearchParams();
    if (fg) params.set("filterGroup", JSON.stringify(fg));
    const token = localStorage.getItem("access_token");
    const url = `${process.env.NEXT_PUBLIC_API_URL || "/api/v1"}/modules/${mod.id}/records/export/csv?${params}`;
    const a = document.createElement("a");
    a.href = url;
    a.download = `${mod.slug}-export.csv`;
    // Add auth header via fetch
    fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.blob())
      .then(blob => {
        const blobUrl = URL.createObjectURL(blob);
        a.href = blobUrl;
        a.click();
        URL.revokeObjectURL(blobUrl);
      });
  };

  const toggleSelect = (id: string) => setSelected(prev => prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]);

  const visibleFields: Field[] = (mod?.fields || [])
    .filter((f: Field) => visibleFieldIds.includes(f.id))
    .sort((a: Field, b: Field) => visibleFieldIds.indexOf(a.id) - visibleFieldIds.indexOf(b.id));

  // Saved views (API-backed)
  const { views: savedViews, save: saveView, update: updateView, remove: removeSavedView, togglePin: toggleViewPin } = useSavedViews(mod?.id || "");
  const [activeViewId, setActiveViewId] = useState<string | null>(null);
  const [savingView, setSavingView] = useState(false);
  const [toastMsg, setToastMsg] = useState("");
  const [toastType, setToastType] = useState<"success" | "error">("success");
  const [analyzeOpen, setAnalyzeOpen] = useState(false);
  const [analyzeContext, setAnalyzeContext] = useState<AnalysisContext | null>(null);
  const [analyzeLoading, setAnalyzeLoading] = useState(false);
  const showToast = (msg: string, type: "success" | "error" = "success") => {
    setToastMsg(msg); setToastType(type); setTimeout(() => setToastMsg(""), 3000);
  };

  // ── Inline cell editing ───────────────────────────────────────────────────

  const handleCellEdit = (recordId: string, fieldKey: string, currentValue: any) => {
    setEditingCell({ recordId, fieldKey });
    setEditValue(currentValue ?? "");
  };

  const handleCellCancel = () => {
    setEditingCell(null);
    setEditValue(null);
  };

  const handleCellSave = async () => {
    if (!editingCell || !mod) return;
    const { recordId, fieldKey } = editingCell;
    const prevRecord = result?.data.find(r => r.id === recordId);
    const prevValue = prevRecord?.data[fieldKey];
    // No change — just close editor
    if (editValue === prevValue || (editValue === "" && (prevValue === null || prevValue === undefined))) {
      setEditingCell(null);
      return;
    }
    setCellSaving(true);
    const applyUpdate = (r: CrmRecord) =>
      r.id === recordId ? { ...r, data: { ...r.data, [fieldKey]: editValue } } : r;
    setResult(prev => prev ? { ...prev, data: prev.data.map(applyUpdate) } : prev);
    setAllRecords(prev => prev.map(applyUpdate));
    setEditingCell(null);
    try {
      await api.patch(`/modules/${mod.id}/records/${recordId}`, { [fieldKey]: editValue });
      showToast("Saved");
    } catch (err: any) {
      const revert = (r: CrmRecord) =>
        r.id === recordId ? { ...r, data: { ...r.data, [fieldKey]: prevValue } } : r;
      setResult(prev => prev ? { ...prev, data: prev.data.map(revert) } : prev);
      setAllRecords(prev => prev.map(revert));
      showToast(err?.response?.data?.message ?? "Failed to save", "error");
    } finally {
      setCellSaving(false);
    }
  };

  const handleLimitChange = (newLimit: number) => {
    setLimit(newLimit);
    setPage(1);
    setLoading(true);
    if (mod) fetchRecords(mod.id, 1, appliedConditions, appliedLogic, sortField, sortDir, newLimit);
  };

  const handleSaveView = async () => {
    if (!saveViewName.trim()) return;
    setSavingView(true);
    try {
      const created = await saveView(saveViewName, {
        filterLogic: appliedLogic,
        conditions: appliedConditions,
        visibleFieldIds,
      });
      setActiveViewId(created.id);
      setSaveViewName("");
      setShowSaveView(false);
      showToast(`View "${saveViewName}" saved`);
    } catch { showToast("Failed to save view"); }
    setSavingView(false);
  };

  const handleUpdateView = async () => {
    if (!activeViewId) return;
    try {
      await updateView(activeViewId, {
        filterLogic: appliedLogic,
        conditions: appliedConditions,
        visibleFieldIds,
      });
      showToast("View updated");
    } catch { showToast("Failed to update view"); }
  };

  const loadView = (sv: SavedView) => {
    setConditions(sv.conditions);
    setAppliedConditions(sv.conditions);
    setFilterLogic(sv.filterLogic);
    setAppliedLogic(sv.filterLogic);
    setVisibleFieldIds(sv.visibleFieldIds.length > 0 ? sv.visibleFieldIds : visibleFieldIds);
    setActiveViewId(sv.id);
    setPage(1);
    setLoading(true);
    if (mod) fetchRecords(mod.id, 1, sv.conditions, sv.filterLogic);
  };

  const activeFilterCount = appliedConditions.filter(c => c.field && (noValue(c.operator) || c.value !== "")).length + (tagFilter ? 1 : 0);

  // Unique tags from current page records for the filter panel dropdown
  const availableTags = useMemo(() => {
    const tags = new Set<string>();
    (result?.data ?? []).forEach(r => {
      (r.data?._tags ?? []).forEach((t: any) => {
        const name = typeof t === "string" ? t : (t?.name ?? "");
        if (name) tags.add(name);
      });
    });
    return Array.from(tags).sort();
  }, [result?.data]);

  // Normalize a tag entry to its display name (handles both old string[] and new {name,color}[] formats)
  const tagName = (t: any): string => typeof t === "string" ? t : (t?.name ?? "");
  const tagColor = (t: any): string => typeof t === "string" ? "#1d4ed8" : (t?.color ?? "#1d4ed8");

  // Client-side tag filter applied on top of server-paginated results
  const tagFilteredRecords: CrmRecord[] = tagFilter
    ? (result?.data ?? []).filter(r =>
        (r.data?._tags ?? []).some((t: any) => tagName(t).toLowerCase().includes(tagFilter.toLowerCase()))
      )
    : (result?.data ?? []);

  const selectAll = () => {
    const ids = tagFilteredRecords.map(r => r.id);
    setSelected(selected.length === ids.length && ids.length > 0 ? [] : ids);
  };

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <AlertCircle className="w-10 h-10 text-red-400" />
        <p className="text-gray-600">{error}</p>
        <Link href="/studio"><Button variant="outline">Go to Studio</Button></Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <ModuleIcon icon={mod?.icon} slug={mod?.slug} className="w-6 h-6" />
          <div className="min-w-0">
            <h1 className="text-2xl font-bold text-gray-900">{mod?.name || "Loading..."}</h1>
            <p className="text-gray-500 text-sm">
              {result ? `${result.meta.total.toLocaleString()} record${result.meta.total !== 1 ? "s" : ""}` : ""}
              {activeFilterCount > 0 && ` · ${activeFilterCount} filter${activeFilterCount !== 1 ? "s" : ""} active`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {selected.length > 0 && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-100 text-blue-700 text-sm font-medium">
              <Check className="w-3.5 h-3.5" />
              {selected.length} selected
              <button onClick={() => setSelected([])} className="ml-1 text-blue-400 hover:text-blue-700" title="Clear selection">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
          {mod && (
            <PermissionGate slug={slug ?? ""} action="canCreate">
              <Link href={`/m/${slug}/new`}><Button size="sm" className="gap-2"><Plus className="w-4 h-4" />New Record</Button></Link>
            </PermissionGate>
          )}
        </div>
      </div>

      {/* Module Summary */}
      {mod && (
        <ModuleSummaryBar
          modId={mod.id}
          fields={mod.fields || []}
          records={result?.data ?? []}
          total={result?.meta?.total ?? 0}
          summaryStats={(mod as any)?.settings?.summaryStats}
          summaryEnabled={(mod as any)?.settings?.summaryEnabled !== false}
        />
      )}

      {/* Toast */}
      {toastMsg && (
        <div className={cn(
          "fixed bottom-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg text-sm font-medium flex items-center gap-2 animate-in slide-in-from-bottom-2",
          selected.length > 0 ? "bottom-20" : "bottom-4",
          toastType === "error" ? "bg-red-600 text-white" : "bg-green-600 text-white"
        )}>
          <Check className="w-4 h-4" />{toastMsg}
        </div>
      )}

      {/* ── Toolbar ── */}
      <div className="flex items-center gap-2 flex-wrap">

        {/* Search */}
        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          <Input placeholder={`Search ${mod?.name?.toLowerCase() || "records"}...`}
            value={search} onChange={e => setSearch(e.target.value)}
            onKeyDown={e => e.key === "Enter" && refresh()}
            className="pl-9 h-9" />
        </div>

        {/* Filters — badge count includes tag filter */}
        <Button
          variant={filterOpen || activeFilterCount > 0 ? "default" : "outline"}
          size="sm" className="gap-1.5 shrink-0"
          onClick={() => setFilterOpen(!filterOpen)}
        >
          <SlidersHorizontal className="w-4 h-4" />
          <span className="hidden sm:inline">Filters</span>
          {activeFilterCount > 0 && (
            <Badge className="ml-0.5 bg-white text-blue-600 text-[10px] px-1.5 py-0 h-4 leading-4">{activeFilterCount}</Badge>
          )}
        </Button>

        {/* Analyse — table tool, lives with table controls. Fetches every
            record matching the current filters/search (not just the current
            page) so the AI has access to the full table, not a 20-row sample. */}
        <Button
          variant="outline" size="sm" className="gap-1.5 shrink-0"
          disabled={analyzeLoading}
          onClick={async () => {
            if (!mod) return;
            setAnalyzeLoading(true);
            try {
              const ANALYZE_ROW_CAP = 5000;
              const fg = buildFilterGroup(appliedConditions, appliedLogic);
              const params: any = { page: 1, limit: ANALYZE_ROW_CAP };
              if (search) params.search = search;
              if (fg) params.filterGroup = JSON.stringify(fg);
              if (sortField) { params.sortField = sortField; params.sortDir = sortDir; }
              if (showArchived) params.showArchived = 'true';

              const { data } = await api.get(`/modules/${mod.id}/records`, { params });
              const records: any[] = data?.data ?? [];
              const total: number = data?.meta?.total ?? records.length;
              const fields = visibleFields ?? [];
              const fieldNames = fields.map((f: any) => f.label || f.name);

              const header = fieldNames.join(" | ");
              const rows = records.map((r: any) =>
                fields.map((f: any) => String(r[f.name] ?? "")).join(" | ")
              ).join("\n");

              const truncatedNote = total > records.length
                ? `\n\n(Showing the first ${records.length} of ${total} total records — the rest were left out to stay within the AI's context limit.)`
                : "";

              const ctx: AnalysisContext = {
                type: "module",
                title: mod.name ?? "Module",
                contextSummary: `Module: ${mod.name}\nTotal records${search || fg ? " matching the current search/filters" : ""}: ${total}\n\nColumns: ${header}\n\n${header}\n${rows}${truncatedNote}`,
              };
              setAnalyzeContext(ctx);
              setAnalyzeOpen(true);
            } finally {
              setAnalyzeLoading(false);
            }
          }}
        >
          {analyzeLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <BrainCircuit className="w-4 h-4" />}
          <span className="hidden sm:inline">Analyse</span>
        </Button>

        {/* Pivot — table tool, lives with table controls */}
        {mod && (
          <Button
            variant="outline" size="sm" className="gap-1.5 shrink-0"
            onClick={() => router.push(`/analytics/pivot?moduleId=${mod.id}`)}
            title="Open Pivot Table for this module"
          >
            <TableProperties className="w-4 h-4" /><span className="hidden sm:inline">Pivot</span>
          </Button>
        )}

        {/* ── Right: Views · Columns · Data · More ── */}
        <div className="ml-auto flex items-center gap-1.5 flex-wrap">

          {/* Views dropdown — layout switcher + saved views */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant={activeViewId ? "default" : "outline"} size="sm" className="gap-1.5">
                {view === "table"    && <List className="w-4 h-4" />}
                {view === "kanban"   && <LayoutGrid className="w-4 h-4" />}
                {view === "gallery"  && <Images className="w-4 h-4" />}
                {view === "list"     && <AlignLeft className="w-4 h-4" />}
                {view === "calendar" && <CalendarDays className="w-4 h-4" />}
                <span className="hidden sm:inline">
                  {activeViewId ? (savedViews.find(v => v.id === activeViewId)?.name ?? "Views") : "Views"}
                </span>
                <ChevronDown className="w-3 h-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
              <div className="px-2 py-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Layout</div>
              {([
                { v: "table" as ViewMode,    icon: <List className="w-4 h-4" />,         label: "Table" },
                { v: "kanban" as ViewMode,   icon: <LayoutGrid className="w-4 h-4" />,   label: "Kanban" },
                { v: "gallery" as ViewMode,  icon: <Images className="w-4 h-4" />,       label: "Gallery" },
                { v: "list" as ViewMode,     icon: <AlignLeft className="w-4 h-4" />,    label: "List" },
                { v: "calendar" as ViewMode, icon: <CalendarDays className="w-4 h-4" />, label: "Calendar" },
              ]).map(({ v, icon, label }) => (
                <DropdownMenuItem key={v} onClick={() => setView(v)} className="gap-2 cursor-pointer">
                  {icon} {label}
                  {view === v && <Check className="w-3.5 h-3.5 ml-auto text-blue-600" />}
                </DropdownMenuItem>
              ))}

              {savedViews.length > 0 && (
                <>
                  <DropdownMenuSeparator />
                  <div className="px-2 py-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Saved Views</div>
                  {savedViews.filter(v => v.isPinned).map(v => (
                    <ModuleViewItem key={v.id} view={v} isActive={activeViewId === v.id}
                      onLoad={() => loadView(v)}
                      onDelete={() => { removeSavedView(v.id); if (activeViewId === v.id) setActiveViewId(null); }}
                      onTogglePin={() => toggleViewPin(v.id)} />
                  ))}
                  {savedViews.filter(v => !v.isPinned).map(v => (
                    <ModuleViewItem key={v.id} view={v} isActive={activeViewId === v.id}
                      onLoad={() => loadView(v)}
                      onDelete={() => { removeSavedView(v.id); if (activeViewId === v.id) setActiveViewId(null); }}
                      onTogglePin={() => toggleViewPin(v.id)} />
                  ))}
                </>
              )}

              <DropdownMenuSeparator />
              {activeViewId && (
                <DropdownMenuItem onClick={handleUpdateView} className="gap-2 cursor-pointer text-blue-600">
                  <Save className="w-4 h-4" /> Update Current View
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={() => setShowSaveView(true)} className="gap-2 cursor-pointer">
                <BookOpen className="w-4 h-4" /> Save as New View
              </DropdownMenuItem>
              {activeViewId && (
                <DropdownMenuItem onClick={() => { setActiveViewId(null); clearFilters(); }} className="gap-2 cursor-pointer text-gray-500">
                  <X className="w-4 h-4" /> Clear View
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Columns — table view only */}
          {view === "table" && mod?.fields && (
            <ColumnPicker fields={mod.fields} visibleIds={visibleFieldIds} onChange={handleColumnChange} />
          )}

          {/* Card Fields — which fields render on each Kanban card; kanban view only */}
          {view === "kanban" && mod?.fields && (
            <ColumnPicker
              fields={mod.fields}
              visibleIds={kanbanFieldIds}
              onChange={handleKanbanFieldChange}
              label="Card Fields"
              icon={LayoutGrid}
              description="First field is the card title · click to show/hide"
            />
          )}

          {/* Data dropdown — refresh, import, export */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1.5">
                <Database className="w-4 h-4" />
                <span className="hidden sm:inline">Data</span>
                <ChevronDown className="w-3 h-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuItem className="gap-2 cursor-pointer" onClick={refresh}>
                <RefreshCw className="w-4 h-4 text-gray-500" /> Refresh
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <PermissionGate slug={slug ?? ""} action="canImport">
                <DropdownMenuItem className="gap-2 cursor-pointer" onClick={() => setImportOpen(true)}>
                  <Upload className="w-4 h-4 text-gray-500" /> Import Records
                </DropdownMenuItem>
              </PermissionGate>
              <PermissionGate slug={slug ?? ""} action="canExport">
                <DropdownMenuItem className="gap-2 cursor-pointer" onClick={handleExport}>
                  <Download className="w-4 h-4 text-gray-500" /> Export CSV
                </DropdownMenuItem>
              </PermissionGate>
              {selected.length > 0 && (
                <PermissionGate slug={slug ?? ""} action="canExport">
                  <DropdownMenuItem className="gap-2 cursor-pointer" onClick={handleExportSelected}>
                    <Download className="w-4 h-4 text-gray-500" /> Export Selected ({selected.length})
                  </DropdownMenuItem>
                </PermissionGate>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* More dropdown — archive, field rules */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className={cn("gap-1.5", showArchived && "border-amber-300 text-amber-700 bg-amber-50")}>
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuItem
                className="gap-2 cursor-pointer"
                onClick={() => {
                  const next = !showArchived;
                  setShowArchived(next);
                  setPage(1);
                  setLoading(true);
                  if (mod) fetchRecords(mod.id, 1, appliedConditions, appliedLogic, sortField, sortDir, limit);
                }}
              >
                <Archive className={cn("w-4 h-4", showArchived ? "text-amber-500" : "text-gray-500")} />
                {showArchived ? "Hide Archived" : "Show Archived"}
                {showArchived && <Check className="w-3.5 h-3.5 ml-auto text-amber-600" />}
              </DropdownMenuItem>
              {mod && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="gap-2 cursor-pointer" onClick={() => router.push(`/settings/field-rules/${mod.id}`)}>
                    <Zap className="w-4 h-4 text-amber-500" /> Field Rules
                  </DropdownMenuItem>
                  {mod.fields?.some((f: Field) => f.type === "EMAIL") && (
                    <DropdownMenuItem className="gap-2 cursor-pointer" onClick={() => router.push(`/m/${slug}/emails`)}>
                      <Mail className="w-4 h-4 text-indigo-500" /> Mass Email
                    </DropdownMenuItem>
                  )}
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

        </div>
      </div>

      {/* Save view inline input */}
      {showSaveView && (
        <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
          <BookOpen className="w-4 h-4 text-blue-600 shrink-0" />
          <Input value={saveViewName} onChange={e => setSaveViewName(e.target.value)}
            placeholder="View name (e.g. My Active Leads)"
            className="h-7 text-sm flex-1 bg-white"
            onKeyDown={e => { if (e.key === "Enter") handleSaveView(); if (e.key === "Escape") setShowSaveView(false); }}
            autoFocus />
          <Button size="sm" className="h-7 text-xs" onClick={handleSaveView} disabled={!saveViewName.trim() || savingView}>
            {savingView ? <Loader2 className="w-3 h-3 animate-spin" /> : "Save"}
          </Button>
          <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setShowSaveView(false)}>Cancel</Button>
        </div>
      )}

      {/* Filter Panel */}
      <FilterPanel
        fields={mod?.fields || []}
        conditions={conditions}
        logic={filterLogic}
        open={filterOpen}
        onConditionsChange={setConditions}
        onLogicChange={setFilterLogic}
        onClose={() => setFilterOpen(false)}
        onApply={applyFilters}
        onClear={clearFilters}
        tagFilter={tagFilter}
        onTagFilterChange={setTagFilter}
        availableTags={availableTags}
      />

      {/* Active filter badges — field conditions + tag */}
      {(activeFilterCount > 0) && !filterOpen && (
        <div className="flex flex-wrap gap-2 items-center overflow-x-auto -mx-3 px-3">
          <span className="text-xs text-gray-500">Active filters:</span>
          {appliedConditions.filter(c => c.field).map(c => {
            const f = (mod?.fields || []).find((f: Field) => f.name === c.field);
            return (
              <Badge key={c.id} variant="secondary" className="text-xs gap-1">
                {f?.label || c.field} {c.operator.replace(/_/g, " ")} {noValue(c.operator as FilterOperator) ? "" : c.value}
                <button onClick={() => {
                  const next = appliedConditions.filter(x => x.id !== c.id);
                  setConditions(next);
                  setAppliedConditions(next);
                  if (mod) { setLoading(true); fetchRecords(mod.id, 1, next, appliedLogic); }
                }} className="ml-1 hover:text-red-600"><X className="w-2.5 h-2.5" /></button>
              </Badge>
            );
          })}
          {tagFilter && (
            <Badge className="text-xs gap-1 bg-violet-100 text-violet-700 border-violet-200 hover:bg-violet-100">
              🏷️ {tagFilter}
              <button onClick={() => setTagFilter("")} className="ml-1 hover:text-red-600"><X className="w-2.5 h-2.5" /></button>
            </Badge>
          )}
          <button onClick={() => { clearFilters(); setTagFilter(""); }} className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1">
            <X className="w-3 h-3" /> Clear all
          </button>
        </div>
      )}

      {/* Content */}
      {loading ? (
        <TableSkeleton rows={8} columns={Math.min(visibleFields?.length || 5, 6)} />
      ) : view === "kanban" ? (
        <div className="overflow-hidden">
          <KanbanView records={allRecords} mod={mod} slug={slug} onRecordMove={handleKanbanMove} cardFieldIds={kanbanFieldIds} />
        </div>
      ) : view === "gallery" ? (
        <>
          <GalleryView
            records={result?.data ?? []}
            mod={mod}
            slug={slug}
            cardConfig={galleryCardConfig}
            onCustomize={() => setShowGalleryCustomize(true)}
          />
          <GalleryCustomizePanel
            open={showGalleryCustomize}
            fields={mod?.fields ?? []}
            cardConfig={galleryCardConfig}
            onClose={() => setShowGalleryCustomize(false)}
            onChange={setGalleryCardConfig}
          />
        </>
      ) : view === "list" ? (
        <ListView records={result?.data ?? []} mod={mod} slug={slug} />
      ) : view === "calendar" ? (
        <CalendarView
          records={allRecords}
          mod={mod}
          onRecordMove={async (recordId, newDate, fieldName) => {
            try {
              await api.patch(`/modules/${mod?.id}/records/${recordId}`, { [fieldName]: newDate });
              if (mod) fetchRecords(mod.id, page, appliedConditions, appliedLogic);
            } catch {}
          }}
        />
      ) : (
        <>
          <Card>
            <CardContent className="p-0">
              {!result || tagFilteredRecords.length === 0 ? (
                <div className="text-center py-16">
                  <ModuleIcon icon={mod?.icon} slug={mod?.slug} className="w-10 h-10 mb-4 inline-block" />
                  <h3 className="text-base font-semibold text-gray-900 mb-2">
                    {tagFilter ? `No records tagged "${tagFilter}"` : activeFilterCount > 0 ? "No records match your filters" : "No records yet"}
                  </h3>
                  <p className="text-sm text-gray-500 mb-6">
                    {tagFilter ? "Try a different tag or clear the tag filter." : activeFilterCount > 0 ? "Try adjusting or clearing your filters." : `Add your first ${mod?.name?.toLowerCase()} record.`}
                  </p>
                  {tagFilter
                    ? <Button size="sm" variant="outline" onClick={() => setTagFilter("")}>Clear Tag Filter</Button>
                    : activeFilterCount > 0
                      ? <Button size="sm" variant="outline" onClick={clearFilters}>Clear Filters</Button>
                      : <PermissionGate slug={slug ?? ""} action="canCreate"><Link href={`/m/${slug}/new`}><Button size="sm" className="gap-2"><Plus className="w-4 h-4" />Add First Record</Button></Link></PermissionGate>
                  }
                </div>
              ) : (
                <>
                  {/* ── Table info bar: record count + selection + page range ── */}
                  <div className="flex items-center justify-between px-4 py-2 border-b border-gray-100 bg-gray-50/60 text-xs text-gray-500">
                    <div className="flex items-center gap-3">
                      <span className="font-semibold text-gray-700 text-sm">
                        {tagFilter ? tagFilteredRecords.length.toLocaleString() : result.meta.total.toLocaleString()}
                        <span className="font-normal text-gray-400 ml-1">
                          {(tagFilter ? tagFilteredRecords.length : result.meta.total) === 1 ? "record" : "records"}
                        </span>
                      </span>
                      {activeFilterCount > 0 && (
                        <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-600 border border-blue-200 rounded px-1.5 py-0.5 text-[11px]">
                          filtered
                        </span>
                      )}
                      {tagFilter && (
                        <span className="inline-flex items-center gap-1 bg-violet-50 text-violet-600 border border-violet-200 rounded px-1.5 py-0.5 text-[11px]">
                          🏷️ tag filtered
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      {selected.length > 0 && (
                        <span className="inline-flex items-center gap-1 bg-brand text-white rounded px-2 py-0.5 text-[11px] font-medium">
                          {selected.length} selected
                        </span>
                      )}
                      {result.meta.totalPages > 1 && !tagFilter && (
                        <span>
                          {((page - 1) * limit) + 1}–{Math.min(page * limit, result.meta.total)} of {result.meta.total.toLocaleString()}
                        </span>
                      )}
                      {/* Density toggle */}
                      <div className="flex items-center gap-0.5 border border-gray-200 rounded-lg overflow-hidden bg-white">
                        {([
                          { k: "compact" as Density, icon: AlignJustify, title: "Compact" },
                          { k: "normal"  as Density, icon: AlignCenter,  title: "Normal" },
                          { k: "comfortable" as Density, icon: Maximize2, title: "Comfortable" },
                        ] as const).map(({ k, icon: Icon, title }) => (
                          <button
                            key={k}
                            title={title}
                            onClick={() => changeDensity(k)}
                            className={cn(
                              "p-1 transition-colors",
                              density === k ? "bg-gray-100 text-gray-700" : "text-gray-400 hover:text-gray-600"
                            )}
                          >
                            <Icon className="w-3 h-3" />
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                  {/* ── Scrollable table with sticky header ── */}
                  <div className="overflow-x-auto overflow-y-auto max-h-[calc(100vh-240px)] sm:max-h-[calc(100vh-260px)] lg:max-h-[calc(100vh-280px)]">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 z-10">
                      <tr className="border-b border-gray-200 bg-gray-50 shadow-[0_1px_0_0_#e5e7eb]">
                        <th className="w-10 px-4 py-3 bg-gray-50">
                          <Checkbox
                            checked={selected.length === tagFilteredRecords.length && tagFilteredRecords.length > 0}
                            onCheckedChange={selectAll}
                          />
                        </th>
                        {visibleFields.map(f => {
                          const isSorted = sortField === f.name;
                          const sortable = !["FILE","IMAGE","SIGNATURE","INLINE_SUBFORM"].includes(f.type);
                          return (
                            <th
                              key={f.id}
                              className={cn(
                                "px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap bg-gray-50 select-none",
                                sortable && "cursor-pointer hover:text-gray-800 hover:bg-gray-100 transition-colors"
                              )}
                              onClick={() => sortable && handleSort(f.name)}
                            >
                              <div className="flex items-center gap-1.5">
                                {f.label}
                                {sortable && (
                                  <span className={cn("flex flex-col gap-[2px]", isSorted ? "opacity-100" : "opacity-30")}>
                                    <span className={cn("w-0 h-0 border-l-[4px] border-r-[4px] border-b-[5px] border-l-transparent border-r-transparent",
                                      isSorted && sortDir === "asc" ? "border-b-blue-600" : "border-b-gray-400")} />
                                    <span className={cn("w-0 h-0 border-l-[4px] border-r-[4px] border-t-[5px] border-l-transparent border-r-transparent",
                                      isSorted && sortDir === "desc" ? "border-t-blue-600" : "border-t-gray-400")} />
                                  </span>
                                )}
                              </div>
                            </th>
                          );
                        })}
                        <th
                          className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider bg-gray-50 cursor-pointer hover:text-gray-800 hover:bg-gray-100 transition-colors select-none whitespace-nowrap"
                          onClick={() => handleSort("createdAt")}
                        >
                          <div className="flex items-center gap-1.5">
                            Created
                            <span className={cn("flex flex-col gap-[2px]", sortField === "createdAt" ? "opacity-100" : "opacity-30")}>
                              <span className={cn("w-0 h-0 border-l-[4px] border-r-[4px] border-b-[5px] border-l-transparent border-r-transparent",
                                sortField === "createdAt" && sortDir === "asc" ? "border-b-blue-600" : "border-b-gray-400")} />
                              <span className={cn("w-0 h-0 border-l-[4px] border-r-[4px] border-t-[5px] border-l-transparent border-r-transparent",
                                sortField === "createdAt" && sortDir === "desc" ? "border-t-blue-600" : "border-t-gray-400")} />
                            </span>
                          </div>
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-violet-500 uppercase tracking-wider bg-gray-50 whitespace-nowrap">
                          Tags
                        </th>
                        <th className="w-16 px-4 py-3 bg-gray-50"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {tagFilteredRecords.map(record => (
                        <tr key={record.id}
                          className={cn(
                            "hover:bg-gray-50/80 transition-colors group",
                            selected.includes(record.id) && "bg-brand/5",
                            record.isArchived && "opacity-60",
                          )}>
                          <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                            <Checkbox checked={selected.includes(record.id)} onCheckedChange={() => toggleSelect(record.id)} />
                          </td>
                          {visibleFields.map(f => {
                            const isEditable = INLINE_EDITABLE_TYPES.has(f.type) && perm.canEdit;
                            const isEditing = editingCell?.recordId === record.id && editingCell?.fieldKey === f.name;
                            return (
                              <td key={f.id}
                                className={cn(
                                  "px-4 relative",
                                  cellPy,
                                  isEditing ? "bg-brand/5 ring-1 ring-inset ring-brand/40" : "",
                                  !isEditing && isEditable ? "cursor-pointer hover:bg-blue-50/40 group/cell" : "",
                                  !isEditing && !isEditable ? "cursor-pointer" : "",
                                )}
                                onClick={() => {
                                  if (isEditing) return;
                                  if (isEditable) {
                                    handleCellEdit(record.id, f.name, record.data[f.name]);
                                  } else {
                                    router.push(`/m/${slug}/${record.id}`);
                                  }
                                }}
                              >
                                {isEditing ? (
                                  <InlineEditor
                                    field={f}
                                    value={editValue}
                                    onChange={setEditValue}
                                    onCommit={handleCellSave}
                                    onCancel={handleCellCancel}
                                  />
                                ) : (
                                  <div className="flex items-center gap-1 min-h-[22px]">
                                    <FieldValue value={record.data[f.name]} field={f} recordData={record.data} fieldName={f.name} density={density} />
                                    {isEditable && (
                                      <Pencil className="w-3 h-3 text-gray-300 opacity-0 group-hover/cell:opacity-100 shrink-0 ml-auto" />
                                    )}
                                  </div>
                                )}
                              </td>
                            );
                          })}
                          <td className="px-4 py-3 text-xs text-gray-400 cursor-pointer" onClick={() => router.push(`/m/${slug}/${record.id}`)}>
                            <div className="flex items-center gap-1.5">
                              {formatDate(record.createdAt)}
                              {record.isLocked && <span title="Locked"><Lock className="w-3 h-3 text-purple-500 shrink-0" /></span>}
                              {record.isArchived && <span title="Archived"><Archive className="w-3 h-3 text-amber-500 shrink-0" /></span>}
                            </div>
                          </td>
                          <td className="px-4 py-2 cursor-pointer" onClick={() => router.push(`/m/${slug}/${record.id}`)}>
                            {Array.isArray(record.data?._tags) && record.data._tags.length > 0 ? (
                              <div className="flex flex-wrap gap-1">
                                {(record.data._tags as any[]).slice(0, 3).map((t: any) => (
                                  <span
                                    key={tagName(t)}
                                    onClick={e => { e.stopPropagation(); setTagFilter(tagName(t)); }}
                                    title={`Filter by: ${tagName(t)}`}
                                    className="inline-flex items-center px-2 py-0.5 rounded-full text-white text-[11px] font-semibold cursor-pointer hover:opacity-80 transition-opacity"
                                    style={{ backgroundColor: tagColor(t) }}
                                  >
                                    {tagName(t)}
                                  </span>
                                ))}
                                {(record.data._tags as any[]).length > 3 && (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 text-[11px]">
                                    +{(record.data._tags as any[]).length - 3}
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-gray-200 select-none">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100">
                                  <MoreHorizontal className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <Link href={`/m/${slug}/${record.id}`}>
                                  <DropdownMenuItem className="cursor-pointer"><Eye className="mr-2 h-4 w-4" />View</DropdownMenuItem>
                                </Link>
                                <Link href={`/m/${slug}/${record.id}/edit`}>
                                  <DropdownMenuItem className="cursor-pointer"><Edit className="mr-2 h-4 w-4" />Edit</DropdownMenuItem>
                                </Link>
                                {mod?.fields?.some((f: Field) => f.type === "EMAIL") && (
                                  <DropdownMenuItem className="cursor-pointer" onClick={() => setSendEmailRecord(record)}>
                                    <Mail className="mr-2 h-4 w-4" />Send Email
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuSeparator />
                                {perm.canDelete && (
                                  <DropdownMenuItem className="cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-50"
                                    onClick={() => handleDelete(record.id)}>
                                    <Trash2 className="mr-2 h-4 w-4" />Delete
                                  </DropdownMenuItem>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                </>
              )}
            </CardContent>
          </Card>

          {result && result.data.length > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <span>Rows per page:</span>
                <Select value={String(limit)} onValueChange={v => handleLimitChange(Number(v))}>
                  <SelectTrigger className="h-7 w-16 text-xs border-gray-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[10, 25, 50, 100].map(n => (
                      <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {result.meta.totalPages > 1 && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">
                    Showing {((page - 1) * limit) + 1}–{Math.min(page * limit, result.meta.total)} of {result.meta.total.toLocaleString()}
                  </span>
                  <Button variant="outline" size="sm" disabled={page === 1} onClick={() => handlePageChange(page - 1)}>Previous</Button>
                  <span className="text-sm text-gray-600">{page} / {result.meta.totalPages}</span>
                  <Button variant="outline" size="sm" disabled={page >= result.meta.totalPages} onClick={() => handlePageChange(page + 1)}>Next</Button>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {mod && (
        <ImportDialog
          mod={mod}
          open={importOpen}
          onClose={() => setImportOpen(false)}
          onSuccess={refresh}
        />
      )}

      {/* Mass Update Modal */}
      {mod && (
        <MassUpdateModal
          open={massUpdateOpen}
          onClose={() => setMassUpdateOpen(false)}
          fields={mod.fields || []}
          moduleId={mod.id}
          selectedIds={selected}
          onSuccess={count => {
            showToast(`${count} record${count !== 1 ? "s" : ""} updated successfully`);
            refresh();
          }}
        />
      )}

      {/* Send Email modal — opened from a row's "Send Email" action */}
      {sendEmailRecord && (() => {
        const fields: Field[] = mod?.fields || [];
        const recordRaw = sendEmailRecord.data as Record<string, any>;
        const emailField = fields.find(f => f.type === "EMAIL");
        const defaultEmail = emailField ? String(recordRaw[emailField.name] ?? "") : "";

        const nameField =
          fields.find(f => f.type === "TEXT" && ["name","fullName","full_name","firstName","first_name","contactName","clientName","studentName","scholarName"].includes(f.name)) ||
          fields.find(f => f.type === "TEXT");
        const titleField = fields.find(f => ["TEXT", "AUTO_NUMBER", "EMAIL"].includes(f.type));
        const defaultName =
          (nameField ? String(recordRaw[nameField.name] ?? "") : "") ||
          String((titleField ? recordRaw[titleField.name] : "") ?? "");

        const strData: Record<string, string> = {};
        Object.entries(recordRaw).forEach(([k, v]) => {
          if (k.endsWith("__label")) return;
          if (v == null) return;
          if (typeof v === "object") return;
          strData[k] = String(v);
        });

        return (
          <SendEmailModal
            open={!!sendEmailRecord}
            onClose={() => setSendEmailRecord(null)}
            defaultEmail={defaultEmail}
            defaultName={defaultName}
            recordData={strData}
            recordLabel={String((titleField ? recordRaw[titleField.name] : "") ?? sendEmailRecord.id.slice(0, 8))}
            recordId={sendEmailRecord.id}
          />
        );
      })()}

      {/* Bulk Send Email modal — opened from the bulk action toolbar */}
      <BulkSendEmailModal
        open={bulkEmailOpen}
        onClose={() => setBulkEmailOpen(false)}
        recipients={bulkRecipients}
      />

      {/* Bulk Action Toolbar — slides in from bottom when records are selected */}
      {selected.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-40 animate-in slide-in-from-bottom-2 duration-200">
          <div className="mx-auto max-w-5xl px-4 pb-3 pt-0">
            <div className="flex items-center justify-between rounded-xl bg-gray-900 px-4 py-3 shadow-2xl border border-gray-700">
              {/* Left: selection info */}
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 text-white">
                  <Zap className="w-4 h-4 text-blue-400" />
                  <span className="text-sm font-semibold">
                    {selected.length} record{selected.length !== 1 ? "s" : ""} selected
                  </span>
                </div>
                <button
                  onClick={() => setSelected([])}
                  className="text-gray-400 hover:text-white text-xs flex items-center gap-1 transition-colors"
                  title="Clear selection"
                >
                  <X className="w-3.5 h-3.5" /> Deselect all
                </button>
              </div>

              {/* Right: action buttons */}
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={() => setMassUpdateOpen(true)}
                  className="gap-1.5 bg-brand hover:bg-brand-dark text-white border-0 h-8 text-xs"
                >
                  <Pencil className="w-3.5 h-3.5" /> Mass Update
                </Button>
                {perm.canExport && (
                  <Button
                    size="sm"
                    onClick={handleExportSelected}
                    className="gap-1.5 bg-gray-700 hover:bg-gray-600 text-white border-0 h-8 text-xs"
                  >
                    <Download className="w-3.5 h-3.5" /> Export Selected
                  </Button>
                )}
                {mod?.fields?.some((f: Field) => f.type === "EMAIL") && (
                  <Button
                    size="sm"
                    onClick={() => {
                      const emailField = (mod.fields as Field[]).find(f => f.type === "EMAIL")!;
                      const nameField = (mod.fields as Field[]).find(f => f.type === "TEXT" && ["name","fullName","full_name","firstName","first_name","contactName","clientName","studentName","scholarName"].includes(f.name))
                        ?? (mod.fields as Field[]).find(f => f.type === "TEXT");
                      const withEmail = (result?.data ?? []).filter(r => selected.includes(r.id) && r.data?.[emailField.name]);
                      if (withEmail.length === 0) { showToast("None of the selected records have an email address", "error"); return; }
                      setBulkRecipients(withEmail.map(r => ({
                        recordId: r.id,
                        email: String(r.data[emailField.name]),
                        name: nameField ? String(r.data[nameField.name] ?? "") : "",
                        recordData: r.data as Record<string, any>,
                      })));
                      setBulkEmailOpen(true);
                    }}
                    className="gap-1.5 bg-gray-700 hover:bg-gray-600 text-white border-0 h-8 text-xs"
                  >
                    <Mail className="w-3.5 h-3.5" /> Send Email
                  </Button>
                )}
                <div className="w-px h-5 bg-gray-600 mx-1" />
                {perm.canDelete && (
                  <Button
                    size="sm"
                    onClick={handleBulkDelete}
                    disabled={deleting}
                    className="gap-1.5 bg-red-600 hover:bg-red-500 text-white border-0 h-8 text-xs"
                  >
                    {deleting
                      ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      : <Trash2 className="w-3.5 h-3.5" />}
                    Delete {selected.length}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <AnalysisPanel
        open={analyzeOpen}
        onClose={() => setAnalyzeOpen(false)}
        context={analyzeContext}
      />
    </div>
  );
}
