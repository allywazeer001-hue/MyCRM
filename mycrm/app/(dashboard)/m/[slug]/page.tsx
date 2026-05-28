"use client";
import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Plus, Search, Trash2, MoreHorizontal, RefreshCw, Eye, Edit,
  List, Loader2, AlertCircle, Columns3, X,
  ChevronDown, Check, LayoutGrid, Download, Save, BookOpen,
  SlidersHorizontal, Upload, FileText, CheckCircle2, Pin, PinOff,
  Pencil, Mail, Zap
} from "lucide-react";
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
import { formatDate, cn } from "@/lib/utils";

// ── Types ──────────────────────────────────────────────────────────────────

interface CrmRecord {
  id: string;
  data: Record<string, any>;
  createdAt: string;
  updatedAt: string;
  createdBy?: { firstName: string; lastName: string };
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
  { value: "empty", label: "Is Empty" },
  { value: "not_empty", label: "Is Not Empty" },
];

function getOps(field?: Field) {
  if (!field) return TEXT_OPS;
  if (["NUMBER", "DECIMAL", "CURRENCY", "RATING", "PROGRESS"].includes(field.type)) return NUM_OPS;
  if (["DATE", "DATETIME"].includes(field.type)) return DATE_OPS;
  if (["DROPDOWN", "STATUS", "RADIO", "MULTI_SELECT", "BOOLEAN"].includes(field.type)) return CHOICE_OPS;
  return TEXT_OPS;
}

function noValue(op: FilterOperator) {
  return ["empty", "not_empty", "today", "yesterday", "this_week", "this_month", "last_month"].includes(op);
}

function newCond(): FilterCondition {
  return { id: crypto.randomUUID(), field: "", operator: "contains", value: "" };
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

    if (["DROPDOWN", "STATUS", "RADIO"].includes(field?.type || "")) {
      return (
        <Select value={condition.value || "__none__"} onValueChange={v => onChange({ ...condition, value: v === "__none__" ? "" : v })}>
          <SelectTrigger className="h-8 text-xs w-36"><SelectValue placeholder="Select..." /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__" className="text-xs">Select...</SelectItem>
            {field?.options?.map(o => <SelectItem key={o.value} value={o.value} className="text-xs">{o.label}</SelectItem>)}
          </SelectContent>
        </Select>
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
            <SelectItem key={f.name} value={f.name} className="text-xs">{f.label}</SelectItem>
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
}) {
  if (!open) return null;

  const update = (id: string, c: FilterCondition) =>
    onConditionsChange(conditions.map(x => x.id === id ? c : x));
  const remove = (id: string) =>
    onConditionsChange(conditions.filter(x => x.id !== id));
  const add = () => onConditionsChange([...conditions, newCond()]);

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
                  logic === l ? "bg-blue-600 text-white" : "bg-white text-gray-600 hover:bg-gray-50")}>
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
    </div>
  );
}

// ── Field Value Renderer ───────────────────────────────────────────────────

function FieldValue({ value, field }: { value: any; field?: Field }) {
  if (value === null || value === undefined || value === "") {
    return <span className="text-gray-300">—</span>;
  }
  if (field?.type === "BOOLEAN") {
    return <Badge variant={value ? "success" : "secondary"} className="text-xs">{value ? "Yes" : "No"}</Badge>;
  }
  if (field?.type === "STATUS" || field?.type === "DROPDOWN") {
    const opt = field.options?.find(o => o.value === value);
    const label = opt?.label || value;
    const colors: Record<string, string> = {
      active: "success", inactive: "secondary", pending: "warning",
      completed: "success", cancelled: "destructive",
    };
    return <Badge variant={(colors[String(value).toLowerCase()] as any) || "secondary"} className="text-xs">{label}</Badge>;
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
      ? <span className="text-sm text-gray-700 truncate max-w-[200px] block">{String(readable)}</span>
      : <span className="text-gray-300">—</span>;
  }
  return <span className="text-sm text-gray-700 truncate max-w-[200px] block">{String(value)}</span>;
}

// ── Column Picker ──────────────────────────────────────────────────────────

function ColumnPicker({ fields, visibleIds, onChange }: { fields: Field[]; visibleIds: string[]; onChange: (ids: string[]) => void }) {
  const toggle = (id: string) => {
    if (visibleIds.includes(id)) {
      if (visibleIds.length <= 1) return;
      onChange(visibleIds.filter(x => x !== id));
    } else {
      onChange([...visibleIds, id]);
    }
  };
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Columns3 className="w-4 h-4" />
          Columns
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-2" align="end">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide px-2 pb-2">Show / Hide</p>
        {fields.filter(f => !["FILE", "IMAGE", "SIGNATURE"].includes(f.type)).map(f => (
          <button key={f.id} onClick={() => toggle(f.id)}
            className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-gray-50 text-sm">
            <div className={cn("w-4 h-4 rounded border flex items-center justify-center flex-shrink-0",
              visibleIds.includes(f.id) ? "bg-blue-600 border-blue-600" : "border-gray-300")}>
              {visibleIds.includes(f.id) && <Check className="w-3 h-3 text-white" />}
            </div>
            <span className="text-gray-700 truncate">{f.label}</span>
          </button>
        ))}
      </PopoverContent>
    </Popover>
  );
}

// ── Kanban View (DnD) ─────────────────────────────────────────────────────

function KanbanCard({ record, titleField }: { record: CrmRecord; titleField: Field | undefined }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: record.id,
    data: { record },
  });
  const style = transform
    ? { transform: `translate3d(${transform.x}px,${transform.y}px,0)`, opacity: isDragging ? 0.3 : 1 }
    : undefined;
  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className="p-3 rounded-lg border border-gray-200 bg-white hover:shadow-sm cursor-grab active:cursor-grabbing transition-shadow space-y-1.5"
    >
      <p className="text-sm font-medium text-gray-800 truncate">
        {titleField ? record.data[titleField.name] || "Untitled" : record.id.slice(0, 8)}
      </p>
      <p className="text-xs text-gray-400">{formatDate(record.createdAt)}</p>
    </div>
  );
}

function KanbanColumn({ col, records, titleField, slug }: {
  col: { value: string; label: string; color?: string };
  records: CrmRecord[];
  titleField: Field | undefined;
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
          <KanbanCard key={record.id} record={record} titleField={titleField} />
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

function KanbanView({ records, mod, slug, onRecordMove }: {
  records: CrmRecord[];
  mod: any;
  slug: string;
  onRecordMove: (recordId: string, newValue: string, fieldName: string) => void;
}) {
  const [activeRecord, setActiveRecord] = useState<CrmRecord | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const statusField: Field | undefined = mod?.fields?.find((f: Field) => ["STATUS", "DROPDOWN"].includes(f.type));
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
  const titleField: Field | undefined = mod?.fields?.find((f: Field) => ["TEXT", "EMAIL"].includes(f.type));

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
      <div className="flex gap-4 overflow-x-auto pb-4 pt-1" style={{ minHeight: "60vh" }}>
        {columns.map(col => {
          const colRecords = records.filter(r => {
            const v = r.data[statusField.name];
            return col.value === "__none__" ? !v : v === col.value;
          });
          return (
            <KanbanColumn key={col.value} col={col} records={colRecords} titleField={titleField} slug={slug} />
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
    const base = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";
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
                dragOver ? "border-blue-500 bg-blue-50" : file ? "border-green-400 bg-green-50" : "border-gray-200 hover:border-blue-300 hover:bg-blue-50/30"
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
                      <SelectItem key={f.name} value={f.name}>{f.label}</SelectItem>
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
            {(field.options || []).map(o => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
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
                    <SelectItem key={f.name} value={f.name}>
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
  const storeView = useViewStore(state => (state.moduleViews[slug] as "table" | "kanban") ?? "table");
  const setModuleView = useViewStore(state => state.setModuleView);
  const [view, setViewLocal] = useState<"table" | "kanban">(storeView);
  const setView = useCallback((v: "table" | "kanban") => { setViewLocal(v); setModuleView(slug, v); }, [slug, setModuleView]);
  const [visibleFieldIds, setVisibleFieldIds] = useState<string[]>([]);

  // Filters
  const [filterOpen, setFilterOpen] = useState(false);
  const [filterLogic, setFilterLogic] = useState<"AND" | "OR">("AND");
  const [conditions, setConditions] = useState<FilterCondition[]>([]);
  const [appliedConditions, setAppliedConditions] = useState<FilterCondition[]>([]);
  const [appliedLogic, setAppliedLogic] = useState<"AND" | "OR">("AND");

  // Saved views
  const [saveViewName, setSaveViewName] = useState("");
  const [showSaveView, setShowSaveView] = useState(false);

  // Import
  const [importOpen, setImportOpen] = useState(false);

  const limit = 25;

  const fetchMod = useCallback(async () => {
    try {
      const { data } = await api.get(`/modules/by-slug/${slug}`);
      setMod(data);
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

  const buildFilterGroup = useCallback((conds: FilterCondition[], logic: "AND" | "OR") => {
    const valid = conds.filter(c => c.field && (noValue(c.operator) || c.value !== ""));
    if (valid.length === 0) return undefined;
    return { logic, conditions: valid, groups: [] };
  }, []);

  const fetchRecords = useCallback(async (moduleId: string, currentPage: number, conds: FilterCondition[], logic: "AND" | "OR") => {
    try {
      const fg = buildFilterGroup(conds, logic);
      const params: any = { page: currentPage, limit };
      if (search) params.search = search;
      if (fg) params.filterGroup = JSON.stringify(fg);

      const { data } = await api.get(`/modules/${moduleId}/records`, { params });
      setResult(data);
    } catch {
      setError("Failed to load records");
    } finally {
      setLoading(false);
    }
  }, [limit, search, buildFilterGroup]);

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

  const handleKanbanMove = useCallback(async (recordId: string, newValue: string, fieldName: string) => {
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
  }, [mod, fetchAllRecords]);

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
    if (mod) fetchRecords(mod.id, newPage, appliedConditions, appliedLogic);
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
    const url = `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1"}/modules/${mod.id}/records/export/csv?${params}`;
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
  const selectAll = () => {
    const ids = result?.data.map(r => r.id) || [];
    setSelected(selected.length === ids.length ? [] : ids);
  };

  const visibleFields: Field[] = (mod?.fields || [])
    .filter((f: Field) => visibleFieldIds.includes(f.id))
    .sort((a: Field, b: Field) => visibleFieldIds.indexOf(a.id) - visibleFieldIds.indexOf(b.id));

  // Saved views (API-backed)
  const { views: savedViews, save: saveView, update: updateView, remove: removeSavedView, togglePin: toggleViewPin } = useSavedViews(mod?.id || "");
  const [activeViewId, setActiveViewId] = useState<string | null>(null);
  const [savingView, setSavingView] = useState(false);
  const [toastMsg, setToastMsg] = useState("");
  const [toastType, setToastType] = useState<"success" | "error">("success");
  const showToast = (msg: string, type: "success" | "error" = "success") => {
    setToastMsg(msg); setToastType(type); setTimeout(() => setToastMsg(""), 3000);
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

  const activeFilterCount = appliedConditions.filter(c => c.field && (noValue(c.operator) || c.value !== "")).length;

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
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{mod?.icon || "📦"}</span>
          <div>
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
          <Button variant="outline" size="sm" onClick={refresh}><RefreshCw className="w-4 h-4" /></Button>
          {mod && <Link href={`/m/${slug}/new`}><Button size="sm" className="gap-2"><Plus className="w-4 h-4" />New Record</Button></Link>}
        </div>
      </div>

      {/* Pinned views quick-access */}
      {savedViews.filter(v => v.isPinned).length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-gray-400 font-medium">Views:</span>
          {savedViews.filter(v => v.isPinned).map(v => (
            <button key={v.id} onClick={() => loadView(v)}
              className={cn(
                "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-colors border",
                activeViewId === v.id
                  ? "bg-blue-600 text-white border-blue-600"
                  : "bg-white text-gray-700 border-gray-200 hover:border-blue-300 hover:text-blue-600"
              )}>
              <Pin className="w-2.5 h-2.5" />
              {v.name}
            </button>
          ))}
        </div>
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

      {/* Toolbar */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input placeholder={`Search ${mod?.name?.toLowerCase() || "records"}...`}
            value={search} onChange={e => setSearch(e.target.value)}
            onKeyDown={e => e.key === "Enter" && refresh()}
            className="pl-9 h-9" />
        </div>

        {/* Filter button */}
        <Button
          variant={filterOpen || activeFilterCount > 0 ? "default" : "outline"}
          size="sm"
          className="gap-2"
          onClick={() => setFilterOpen(!filterOpen)}
        >
          <SlidersHorizontal className="w-4 h-4" />
          Filters
          {activeFilterCount > 0 && (
            <Badge className="ml-1 bg-white text-blue-600 text-xs px-1.5">{activeFilterCount}</Badge>
          )}
        </Button>

        {/* Saved views */}
        {(savedViews.length > 0 || activeFilterCount > 0) && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant={activeViewId ? "default" : "outline"} size="sm" className="gap-2">
                <BookOpen className="w-4 h-4" />
                {activeViewId ? (savedViews.find(v => v.id === activeViewId)?.name || "Views") : "Views"}
                {savedViews.filter(v => v.isPinned).length > 0 && !activeViewId && (
                  <Pin className="w-3 h-3 text-blue-500" />
                )}
                <ChevronDown className="w-3 h-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-60">
              {/* Pinned views */}
              {savedViews.filter(v => v.isPinned).length > 0 && (
                <>
                  <div className="px-2 py-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wider">Pinned</div>
                  {savedViews.filter(v => v.isPinned).map(v => (
                    <ModuleViewItem key={v.id} view={v} isActive={activeViewId === v.id}
                      onLoad={() => loadView(v)}
                      onDelete={() => { removeSavedView(v.id); if (activeViewId === v.id) setActiveViewId(null); }}
                      onTogglePin={() => toggleViewPin(v.id)} />
                  ))}
                  {savedViews.filter(v => !v.isPinned).length > 0 && <DropdownMenuSeparator />}
                </>
              )}
              {/* Unpinned views */}
              {savedViews.filter(v => !v.isPinned).length > 0 && (
                <>
                  {savedViews.filter(v => v.isPinned).length > 0 && (
                    <div className="px-2 py-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wider">All Views</div>
                  )}
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
              <DropdownMenuItem onClick={() => setShowSaveView(true)} className="gap-2 cursor-pointer text-gray-600">
                <BookOpen className="w-4 h-4" /> Save as New View
              </DropdownMenuItem>
              {activeViewId && (
                <DropdownMenuItem onClick={() => { setActiveViewId(null); clearFilters(); }} className="gap-2 cursor-pointer text-gray-500">
                  <X className="w-4 h-4" /> Clear view
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        <div className="ml-auto flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-2" onClick={() => setImportOpen(true)}>
            <Upload className="w-4 h-4" /> Import
          </Button>
          <Button variant="outline" size="sm" className="gap-2" onClick={handleExport}>
            <Download className="w-4 h-4" /> Export CSV
          </Button>

          {view === "table" && mod?.fields && (
            <ColumnPicker fields={mod.fields} visibleIds={visibleFieldIds} onChange={setVisibleFieldIds} />
          )}

          <div className="flex rounded-md border border-gray-200 overflow-hidden">
            {(["table", "kanban"] as const).map((v, i) => (
              <button key={v} onClick={() => setView(v)}
                className={cn("px-2.5 py-1.5 flex items-center gap-1.5 text-xs font-medium transition-colors",
                  i > 0 && "border-l border-gray-200",
                  view === v ? "bg-blue-600 text-white" : "bg-white text-gray-600 hover:bg-gray-50")}>
                {v === "table" ? <List className="w-3.5 h-3.5" /> : <LayoutGrid className="w-3.5 h-3.5" />}
                {v.charAt(0).toUpperCase() + v.slice(1)}
              </button>
            ))}
          </div>
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
      />

      {/* Active filter badges */}
      {activeFilterCount > 0 && !filterOpen && (
        <div className="flex flex-wrap gap-2 items-center">
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
          <button onClick={clearFilters} className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1">
            <X className="w-3 h-3" /> Clear all
          </button>
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center h-48">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
        </div>
      ) : view === "kanban" ? (
        <KanbanView records={allRecords} mod={mod} slug={slug} onRecordMove={handleKanbanMove} />
      ) : (
        <>
          <Card>
            <CardContent className="p-0">
              {!result || result.data.length === 0 ? (
                <div className="text-center py-16">
                  <span className="text-4xl mb-4 block">{mod?.icon || "📦"}</span>
                  <h3 className="text-base font-semibold text-gray-900 mb-2">
                    {activeFilterCount > 0 ? "No records match your filters" : "No records yet"}
                  </h3>
                  <p className="text-sm text-gray-500 mb-6">
                    {activeFilterCount > 0 ? "Try adjusting or clearing your filters." : `Add your first ${mod?.name?.toLowerCase()} record.`}
                  </p>
                  {activeFilterCount > 0
                    ? <Button size="sm" variant="outline" onClick={clearFilters}>Clear Filters</Button>
                    : <Link href={`/m/${slug}/new`}><Button size="sm" className="gap-2"><Plus className="w-4 h-4" />Add First Record</Button></Link>
                  }
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100 bg-gray-50/50">
                        <th className="w-10 px-4 py-3">
                          <Checkbox
                            checked={selected.length === result.data.length && result.data.length > 0}
                            onCheckedChange={selectAll}
                          />
                        </th>
                        {visibleFields.map(f => (
                          <th key={f.id} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">
                            {f.label}
                          </th>
                        ))}
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Created</th>
                        <th className="w-16 px-4 py-3"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {result.data.map(record => (
                        <tr key={record.id}
                          className={cn("hover:bg-gray-50/80 transition-colors group", selected.includes(record.id) && "bg-blue-50/40")}>
                          <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                            <Checkbox checked={selected.includes(record.id)} onCheckedChange={() => toggleSelect(record.id)} />
                          </td>
                          {visibleFields.map(f => (
                            <td key={f.id} className="px-4 py-3 cursor-pointer" onClick={() => router.push(`/m/${slug}/${record.id}`)}>
                              <FieldValue value={record.data[f.name]} field={f} />
                            </td>
                          ))}
                          <td className="px-4 py-3 text-xs text-gray-400 cursor-pointer" onClick={() => router.push(`/m/${slug}/${record.id}`)}>
                            {formatDate(record.createdAt)}
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
                                <DropdownMenuSeparator />
                                <DropdownMenuItem className="cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-50"
                                  onClick={() => handleDelete(record.id)}>
                                  <Trash2 className="mr-2 h-4 w-4" />Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          {result && result.meta.totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500">
                Showing {((page - 1) * limit) + 1}–{Math.min(page * limit, result.meta.total)} of {result.meta.total}
              </p>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" disabled={page === 1} onClick={() => handlePageChange(page - 1)}>Previous</Button>
                <span className="text-sm text-gray-600">Page {page} of {result.meta.totalPages}</span>
                <Button variant="outline" size="sm" disabled={page >= result.meta.totalPages} onClick={() => handlePageChange(page + 1)}>Next</Button>
              </div>
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
                  className="gap-1.5 bg-blue-600 hover:bg-blue-500 text-white border-0 h-8 text-xs"
                >
                  <Pencil className="w-3.5 h-3.5" /> Mass Update
                </Button>
                <Button
                  size="sm"
                  onClick={handleExportSelected}
                  className="gap-1.5 bg-gray-700 hover:bg-gray-600 text-white border-0 h-8 text-xs"
                >
                  <Download className="w-3.5 h-3.5" /> Export Selected
                </Button>
                <Button
                  size="sm"
                  disabled
                  title="Email integration coming soon"
                  className="gap-1.5 bg-gray-700 text-gray-400 border-0 h-8 text-xs cursor-not-allowed opacity-50"
                >
                  <Mail className="w-3.5 h-3.5" /> Send Email
                </Button>
                <div className="w-px h-5 bg-gray-600 mx-1" />
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
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
