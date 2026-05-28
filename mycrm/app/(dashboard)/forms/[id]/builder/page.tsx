"use client";
import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import {
  ArrowLeft, Plus, GripVertical, X, Save, Loader2,
  Settings, Layers, Trash2, Lock as LockIcon,
  Calendar, MessageSquare, Image as ImageIcon, CheckCircle2,
  Zap, ArrowRight, ChevronRight, ExternalLink,
} from "lucide-react";
import {
  DndContext, DragEndEvent, DragStartEvent, DragOverlay, PointerSensor, useSensor, useSensors, closestCenter,
} from "@dnd-kit/core";
import {
  SortableContext, useSortable, verticalListSortingStrategy, rectSortingStrategy, arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api";
import Link from "next/link";
import { cn } from "@/lib/utils";

// ── Types ─────────────────────────────────────────────────────────────────────

type RuleOperator = "equals" | "not_equals" | "contains" | "is_empty" | "not_empty" | "gt" | "lt";
type RuleAction   = "show" | "hide" | "require" | "unrequire" | "disable";

interface FieldRule {
  id: string;
  fieldKey: string;
  operator: RuleOperator;
  value: string;
  action: RuleAction;
}

interface ConditionalLogic {
  rules: FieldRule[];
  lookupAutoFill?: { sourceField: string; targetFieldKey: string }[];
}

// ── Form-level Rules ─────────────────────────────────────────────────────────

type FormRuleActionType =
  | "show_field" | "hide_field" | "require_field" | "unrequire_field"
  | "set_value" | "show_message" | "block_submit"
  | "show_section" | "hide_section" | "enable_field" | "disable_field";

interface FormRuleCondition { id: string; fieldKey: string; operator: string; value: string; }
interface FormRuleAction    { id: string; type: FormRuleActionType; target: string; value?: string; }

interface FormRule {
  id: string;
  name: string;
  enabled: boolean;
  conditionsLogic: "AND" | "OR";
  conditions: FormRuleCondition[];
  actions: FormRuleAction[];
  isSubmitBlocker?: boolean;
  blockMessage?: string;
}

const FIELD_TYPE_ICONS: Record<string, string> = {
  TEXT: "T", TEXTAREA: "¶", RICH_TEXT: "R", NUMBER: "#", DECIMAL: "0.0",
  CURRENCY: "$", EMAIL: "@", PHONE: "☎", URL: "🔗", DATE: "📅",
  DATETIME: "🕐", BOOLEAN: "✓", DROPDOWN: "▼", MULTI_SELECT: "☑",
  STATUS: "●", RADIO: "◉", FILE: "📎", IMAGE: "🖼", USER_SELECT: "👤",
  TAGS: "🏷", RATING: "⭐", PROGRESS: "%", FORMULA: "fx", AUTO_NUMBER: "🔢",
  COLOR_PICKER: "🎨", LOOKUP: "🔍", GLOBAL_RELATION: "🌐", SIGNATURE: "✍",
};

function buildRenderItems(fields: any[], sections: any[]) {
  const items: ({ type: "section"; section: any; isFirst: boolean } | { type: "field"; ff: any })[] = [];
  let lastSectionId: string | undefined | null = undefined;
  let sectionCount = 0;
  for (const ff of fields) {
    const sectionId = ff.sectionId || null;
    if (sectionId !== lastSectionId) {
      const section = sections.find((s: any) => s.id === sectionId);
      if (sectionId && section) {
        items.push({ type: "section", section, isFirst: sectionCount === 0 });
        sectionCount++;
      }
      lastSectionId = sectionId;
    }
    items.push({ type: "field", ff });
  }
  return items;
}

function parseLogic(ff: any): ConditionalLogic {
  const raw = ff?.conditionalLogic;
  if (!raw) return { rules: [], lookupAutoFill: [] };
  if (typeof raw === "string") { try { return JSON.parse(raw); } catch { return { rules: [], lookupAutoFill: [] }; } }
  return { rules: [], lookupAutoFill: [], ...raw };
}

// ── Sortable field card ────────────────────────────────────────────────────────

function SortableFormFieldItem({ ff, moduleField, isSelected, onSelect, onRemove }: {
  ff: any; moduleField: any; isSelected: boolean; onSelect: () => void; onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: ff.id });
  const style = { transform: CSS.Transform.toString(transform), transition };
  const logic = parseLogic(ff);
  const ruleCount = logic.rules?.length || 0;

  return (
    <div
      ref={setNodeRef} style={style}
      className={cn(
        "flex items-center gap-3 p-3 rounded-lg border transition-all cursor-pointer",
        isDragging ? "opacity-50 shadow-lg bg-white" : "",
        isSelected ? "border-blue-400 bg-blue-50 shadow-sm" : "border-gray-200 bg-white hover:border-gray-300"
      )}
      onClick={onSelect}
    >
      <button {...attributes} {...listeners} className="text-gray-400 cursor-grab shrink-0" onClick={e => e.stopPropagation()}>
        <GripVertical className="w-4 h-4" />
      </button>
      <div className="w-6 h-6 rounded bg-gray-100 flex items-center justify-center text-xs font-mono text-gray-600 shrink-0">
        {FIELD_TYPE_ICONS[moduleField?.type] || "?"}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate">{ff.customLabel || moduleField?.label || ff.fieldId}</p>
        <p className="text-xs text-gray-400">{moduleField?.type}</p>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        {ff.isHidden && <Badge variant="secondary" className="text-[10px] px-1 py-0">Hidden</Badge>}
        {ff.isReadonly && <Badge variant="outline" className="text-[10px] px-1 py-0">ReadOnly</Badge>}
        {ff.isRequired && <Badge className="text-[10px] px-1 py-0 bg-blue-100 text-blue-700 border-0">Required</Badge>}
        {ruleCount > 0 && (
          <Badge variant="secondary" className="text-[10px] px-1 py-0 gap-0.5">
            <Zap className="w-2.5 h-2.5" />{ruleCount}
          </Badge>
        )}
        <button onClick={e => { e.stopPropagation(); onRemove(); }} className="text-gray-400 hover:text-red-500 p-0.5 ml-0.5">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
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

  const otherFields = formFields
    .filter(f => f.id !== ff.id)
    .map(f => ({ ff: f, mf: allModuleFields.find((m: any) => m.id === f.fieldId) }))
    .filter(x => x.mf);

  const save = (newRules: FieldRule[]) =>
    onUpdate({ conditionalLogic: { ...logic, rules: newRules } });

  const addRule = () => save([...rules, {
    id: `rule-${Date.now()}`,
    fieldKey: otherFields[0]?.mf?.name || "",
    operator: "equals", value: "", action: "show",
  }]);

  const upd = (idx: number, changes: Partial<FieldRule>) =>
    save(rules.map((r, i) => i === idx ? { ...r, ...changes } : r));

  const del = (idx: number) => save(rules.filter((_, i) => i !== idx));

  const needsValue = (op: RuleOperator) => !["is_empty", "not_empty"].includes(op);

  if (otherFields.length === 0) {
    return (
      <div className="text-center py-6 text-xs text-gray-400 border-2 border-dashed rounded-lg">
        Add more fields to the form to create rules between them.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-gray-500 leading-relaxed">
          Rules are evaluated live as the user fills the form.
        </p>
        <Button size="sm" variant="outline" onClick={addRule} className="h-7 text-xs gap-1 shrink-0">
          <Plus className="w-3 h-3" /> Add Rule
        </Button>
      </div>

      {rules.length === 0 ? (
        <div className="text-center py-4 text-xs text-gray-400 border-2 border-dashed border-gray-200 rounded-lg">
          No rules yet. Click "Add Rule" to define conditional behavior.
        </div>
      ) : (
        rules.map((rule, idx) => (
          <div key={rule.id} className="p-3 bg-gray-50 rounded-lg border border-gray-200 space-y-2">
            <div className="flex items-center justify-between mb-1">
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Rule {idx + 1}</p>
              <button onClick={() => del(idx)} className="text-gray-300 hover:text-red-500">
                <Trash2 className="w-3 h-3" />
              </button>
            </div>

            <div className="space-y-1.5">
              <p className="text-[10px] text-blue-600 font-semibold uppercase tracking-wide">IF</p>
              <Select value={rule.fieldKey} onValueChange={v => upd(idx, { fieldKey: v })}>
                <SelectTrigger className="h-7 text-xs"><SelectValue placeholder="Select field…" /></SelectTrigger>
                <SelectContent>
                  {otherFields.map(({ ff: f, mf }) => (
                    <SelectItem key={mf.name} value={mf.name} className="text-xs">
                      {f.customLabel || mf.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={rule.operator} onValueChange={v => upd(idx, { operator: v as RuleOperator })}>
                <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(OP_LABELS) as RuleOperator[]).map(op => (
                    <SelectItem key={op} value={op} className="text-xs">{OP_LABELS[op]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {needsValue(rule.operator) && (
                <Input value={rule.value} onChange={e => upd(idx, { value: e.target.value })}
                  placeholder="Value…" className="h-7 text-xs" />
              )}
            </div>

            <div className="space-y-1.5 pt-1 border-t border-gray-200">
              <p className="text-[10px] text-green-600 font-semibold uppercase tracking-wide">THEN</p>
              <Select value={rule.action} onValueChange={v => upd(idx, { action: v as RuleAction })}>
                <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(ACTION_LABELS) as RuleAction[]).map(a => (
                    <SelectItem key={a} value={a} className="text-xs">{ACTION_LABELS[a]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        ))
      )}
    </div>
  );
}

// ── Lookup Auto-Fill Editor ────────────────────────────────────────────────────

function LookupAutoFillEditor({ ff, formFields, allModuleFields, onUpdate }: {
  ff: any; formFields: any[]; allModuleFields: any[]; onUpdate: (c: any) => void;
}) {
  const logic = parseLogic(ff);
  const autoFill = logic.lookupAutoFill || [];

  const otherFields = formFields
    .filter(f => f.id !== ff.id)
    .map(f => ({ ff: f, mf: allModuleFields.find((m: any) => m.id === f.fieldId) }))
    .filter(x => x.mf);

  const save = (entries: typeof autoFill) =>
    onUpdate({ conditionalLogic: { ...logic, lookupAutoFill: entries } });

  return (
    <div className="space-y-3">
      <div>
        <p className="text-xs font-medium text-gray-700 mb-1">CRM Auto-Fill</p>
        <p className="text-xs text-gray-400 leading-relaxed">
          When a CRM record is selected, automatically copy its field values into other form fields.
        </p>
      </div>

      <div className="space-y-2">
        {autoFill.map((entry, idx) => (
          <div key={idx} className="flex items-center gap-1.5">
            <div className="flex-1 space-y-0.5">
              <p className="text-[10px] text-gray-400">CRM field name</p>
              <Input value={entry.sourceField}
                onChange={e => save(autoFill.map((x, i) => i === idx ? { ...x, sourceField: e.target.value } : x))}
                placeholder="e.g. email" className="h-7 text-xs" />
            </div>
            <ArrowRight className="w-3.5 h-3.5 text-gray-400 shrink-0 mt-4" />
            <div className="flex-1 space-y-0.5">
              <p className="text-[10px] text-gray-400">Fill into form field</p>
              <Select
                value={entry.targetFieldKey || "_none"}
                onValueChange={v => save(autoFill.map((x, i) => i === idx ? { ...x, targetFieldKey: v === "_none" ? "" : v } : x))}
              >
                <SelectTrigger className="h-7 text-xs"><SelectValue placeholder="Target…" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none" className="text-xs italic text-gray-400">Select field…</SelectItem>
                  {otherFields.map(({ ff: f, mf }) => (
                    <SelectItem key={mf.name} value={mf.name} className="text-xs">{f.customLabel || mf.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <button onClick={() => save(autoFill.filter((_, i) => i !== idx))}
              className="text-gray-300 hover:text-red-500 mt-4 shrink-0">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>

      <Button size="sm" variant="outline"
        onClick={() => save([...autoFill, { sourceField: "", targetFieldKey: "" }])}
        className="w-full gap-1.5 text-xs">
        <Plus className="w-3 h-3" /> Add Mapping
      </Button>

      {autoFill.length > 0 && (
        <div className="p-2.5 bg-blue-50 border border-blue-100 rounded-lg text-[10px] text-blue-600 leading-relaxed">
          Example: CRM field "email" → fills the Email Address field in this form automatically.
        </div>
      )}
    </div>
  );
}

// ── Form Rule Engine ─────────────────────────────────────────────────────────

const FORM_RULE_OPS = [
  { value: "equals",    label: "equals" },
  { value: "not_equals",label: "does not equal" },
  { value: "contains",  label: "contains" },
  { value: "is_empty",  label: "is empty" },
  { value: "not_empty", label: "is not empty" },
  { value: "gt",        label: "greater than" },
  { value: "lt",        label: "less than" },
];

const FORM_RULE_ACTIONS: { value: FormRuleActionType; label: string; hasTarget: boolean; hasValue: boolean; targetType: "field" | "section" | "none" }[] = [
  { value: "show_field",      label: "Show field",           hasTarget: true,  hasValue: false, targetType: "field"   },
  { value: "hide_field",      label: "Hide field",           hasTarget: true,  hasValue: false, targetType: "field"   },
  { value: "require_field",   label: "Make field required",  hasTarget: true,  hasValue: false, targetType: "field"   },
  { value: "unrequire_field", label: "Make field optional",  hasTarget: true,  hasValue: false, targetType: "field"   },
  { value: "enable_field",    label: "Enable field",         hasTarget: true,  hasValue: false, targetType: "field"   },
  { value: "disable_field",   label: "Disable field",        hasTarget: true,  hasValue: false, targetType: "field"   },
  { value: "show_section",    label: "Show section",         hasTarget: true,  hasValue: false, targetType: "section" },
  { value: "hide_section",    label: "Hide section",         hasTarget: true,  hasValue: false, targetType: "section" },
  { value: "set_value",       label: "Auto-fill value",      hasTarget: true,  hasValue: true,  targetType: "field"   },
  { value: "show_message",    label: "Show message",         hasTarget: false, hasValue: true,  targetType: "none"    },
  { value: "block_submit",    label: "Block submission",     hasTarget: false, hasValue: true,  targetType: "none"    },
];

function newUid() { return `r-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`; }

const OPTION_BEARING_TYPES = ["DROPDOWN", "STATUS", "RADIO", "MULTI_SELECT"];

function FormRuleEngine({ formFields, allModuleFields, sections, settings, onSettingsChange, onSave, saving }: {
  formFields: any[]; allModuleFields: any[]; sections: any[]; settings: any;
  onSettingsChange: (u: any) => void; onSave: () => Promise<void>; saving: boolean;
}) {
  const rules: FormRule[] = settings.formRules || [];
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<{ text: string; ok: boolean } | null>(null);

  const setRules = (next: FormRule[]) => onSettingsChange({ formRules: next });

  const handleAddRule = () => {
    const newRule: FormRule = {
      id: newUid(), name: `Rule ${rules.length + 1}`, enabled: true,
      conditionsLogic: "AND", conditions: [], actions: [],
    };
    setRules([...rules, newRule]);
    setEditingRuleId(newRule.id);
  };

  const delRule = (ruleId: string) => {
    setRules(rules.filter(r => r.id !== ruleId));
    if (editingRuleId === ruleId) setEditingRuleId(null);
  };

  const updRule = (ruleId: string, changes: Partial<FormRule>) =>
    setRules(rules.map(r => r.id === ruleId ? { ...r, ...changes } : r));

  const handleSaveRule = async () => {
    try {
      await onSave();
      setToastMsg({ text: "Rule saved successfully", ok: true });
      setEditingRuleId(null);
    } catch {
      setToastMsg({ text: "Failed to save rule", ok: false });
    }
    setTimeout(() => setToastMsg(null), 3000);
  };

  // Rich field metadata — includes options for smart value pickers
  const fieldOptions = formFields.map(ff => {
    const mf = allModuleFields.find((m: any) => m.id === ff.fieldId);
    return {
      key: (mf?.name || ff.fieldId) as string,
      label: (ff.customLabel || mf?.label || ff.fieldId) as string,
      type: (mf?.type || "TEXT") as string,
      options: (mf?.options || []) as { value: string; label: string }[],
    };
  });

  const needsCondValue = (op: string) => !["is_empty", "not_empty"].includes(op);

  const editingRule = editingRuleId ? (rules.find(r => r.id === editingRuleId) ?? null) : null;

  // ── Rules List View ───────────────────────────────────────────────────────────
  if (!editingRule) {
    return (
      <ScrollArea className="h-full">
        <div className="p-6 max-w-3xl mx-auto space-y-4">
          {toastMsg && (
            <div className={cn(
              "flex items-center gap-2 px-4 py-3 rounded-lg text-sm font-medium border",
              toastMsg.ok
                ? "bg-green-50 text-green-700 border-green-200"
                : "bg-red-50 text-red-700 border-red-200"
            )}>
              <CheckCircle2 className="w-4 h-4 shrink-0" /> {toastMsg.text}
            </div>
          )}

          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-gray-900">Form Rules</h2>
              <p className="text-xs text-gray-400 mt-0.5">
                Rules fire instantly as users fill the form. Conditions trigger actions immediately.
              </p>
            </div>
            <Button size="sm" onClick={handleAddRule} className="gap-1.5 shrink-0">
              <Plus className="w-3.5 h-3.5" /> Add Rule
            </Button>
          </div>

          {rules.length === 0 ? (
            <div className="border-2 border-dashed border-gray-200 rounded-xl p-12 text-center">
              <Zap className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="text-sm font-medium text-gray-500">No form rules yet</p>
              <p className="text-xs text-gray-400 mt-1">
                Create rules to dynamically control field visibility, requirements, and more.
              </p>
              <Button size="sm" variant="outline" onClick={handleAddRule} className="mt-4 gap-1.5">
                <Plus className="w-3.5 h-3.5" /> Create First Rule
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {rules.map(rule => (
                <div key={rule.id}
                  className={cn("bg-white border rounded-xl p-4 flex items-center gap-3 hover:border-blue-300 transition-colors", !rule.enabled && "opacity-60")}
                >
                  <Switch checked={rule.enabled}
                    onCheckedChange={v => updRule(rule.id, { enabled: v })} />
                  <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setEditingRuleId(rule.id)}>
                    <p className="text-sm font-medium text-gray-900 truncate">{rule.name || "Unnamed rule"}</p>
                    <p className="text-xs text-gray-400">
                      {rule.conditions.length} condition{rule.conditions.length !== 1 ? "s" : ""} · {rule.actions.length} action{rule.actions.length !== 1 ? "s" : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button size="sm" variant="outline" onClick={() => setEditingRuleId(rule.id)} className="h-7 text-xs">
                      Edit
                    </Button>
                    <button onClick={() => delRule(rule.id)} className="text-gray-400 hover:text-red-500 p-1">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </ScrollArea>
    );
  }

  // ── Rule Edit View ────────────────────────────────────────────────────────────
  return (
    <ScrollArea className="h-full">
      <div className="p-6 max-w-3xl mx-auto space-y-6">
        {/* Edit header */}
        <div className="flex items-center gap-3">
          <button onClick={() => setEditingRuleId(null)} className="text-gray-400 hover:text-gray-600">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <h2 className="text-base font-semibold text-gray-900 flex-1">
            {editingRule.name || "Edit Rule"}
          </h2>
          <Button size="sm" variant="outline" onClick={() => setEditingRuleId(null)}>Cancel</Button>
          <Button size="sm" onClick={handleSaveRule} disabled={saving} className="gap-1.5">
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            Save Rule
          </Button>
        </div>

        <div className="bg-white border rounded-xl overflow-hidden shadow-sm">
          {/* Rule name + toggle */}
          <div className="flex items-center gap-3 px-4 py-3 border-b bg-gray-50/60">
            <Switch checked={editingRule.enabled}
              onCheckedChange={v => updRule(editingRule.id, { enabled: v })} />
            <input
              value={editingRule.name}
              onChange={e => updRule(editingRule.id, { name: e.target.value })}
              className="flex-1 text-sm font-medium bg-transparent border-0 outline-none text-gray-900 placeholder:text-gray-400"
              placeholder="Rule name…"
            />
          </div>

          <div className="p-4 space-y-6">
            {/* ── Conditions ── */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide">When</p>
                <Select value={editingRule.conditionsLogic}
                  onValueChange={v => updRule(editingRule.id, { conditionsLogic: v as "AND" | "OR" })}>
                  <SelectTrigger className="h-6 text-xs w-16 px-1.5"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="AND" className="text-xs">ALL</SelectItem>
                    <SelectItem value="OR"  className="text-xs">ANY</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-400">of these conditions match:</p>
              </div>

              <div className="space-y-2">
                {editingRule.conditions.map((cond, ci) => {
                  const condField = fieldOptions.find(f => f.key === cond.fieldKey);
                  return (
                    <div key={cond.id} className="flex items-center gap-1.5 flex-wrap bg-gray-50 rounded-lg p-2">
                      {/* Field picker */}
                      <Select value={cond.fieldKey || "_none"} onValueChange={v =>
                        updRule(editingRule.id, { conditions: editingRule.conditions.map((c, i) =>
                          i === ci ? { ...c, fieldKey: v === "_none" ? "" : v, value: "" } : c) })
                      }>
                        <SelectTrigger className="h-7 text-xs w-40"><SelectValue placeholder="Select field…" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="_none" className="text-xs italic text-gray-400">Select field…</SelectItem>
                          {fieldOptions.map(f => <SelectItem key={f.key} value={f.key} className="text-xs">{f.label}</SelectItem>)}
                        </SelectContent>
                      </Select>

                      {/* Operator picker */}
                      <Select value={cond.operator || "equals"} onValueChange={v =>
                        updRule(editingRule.id, { conditions: editingRule.conditions.map((c, i) =>
                          i === ci ? { ...c, operator: v, value: "" } : c) })
                      }>
                        <SelectTrigger className="h-7 text-xs w-36"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {FORM_RULE_OPS.map(op => <SelectItem key={op.value} value={op.value} className="text-xs">{op.label}</SelectItem>)}
                        </SelectContent>
                      </Select>

                      {/* Smart value picker: dropdown for option fields, text for others */}
                      {needsCondValue(cond.operator) && condField &&
                        OPTION_BEARING_TYPES.includes(condField.type) && condField.options.length > 0 ? (
                        <Select value={cond.value || "_none"} onValueChange={v =>
                          updRule(editingRule.id, { conditions: editingRule.conditions.map((c, i) =>
                            i === ci ? { ...c, value: v === "_none" ? "" : v } : c) })
                        }>
                          <SelectTrigger className="h-7 text-xs w-36"><SelectValue placeholder="Select value…" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="_none" className="text-xs italic text-gray-400">Select value…</SelectItem>
                            {condField.options.map(o => (
                              <SelectItem key={o.value} value={o.value} className="text-xs">{o.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : needsCondValue(cond.operator) ? (
                        <Input value={cond.value || ""} onChange={e =>
                          updRule(editingRule.id, { conditions: editingRule.conditions.map((c, i) =>
                            i === ci ? { ...c, value: e.target.value } : c) })
                        } placeholder="Value…" className="h-7 text-xs w-32" />
                      ) : null}

                      <button onClick={() =>
                        updRule(editingRule.id, { conditions: editingRule.conditions.filter((_, i) => i !== ci) })
                      } className="text-gray-300 hover:text-red-500 p-0.5 ml-auto">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })}
                <button onClick={() =>
                  updRule(editingRule.id, { conditions: [...editingRule.conditions, { id: newUid(), fieldKey: "", operator: "equals", value: "" }] })
                } className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1 mt-1">
                  <Plus className="w-3 h-3" /> Add Condition
                </button>
              </div>
            </div>

            {/* ── Actions ── */}
            <div>
              <p className="text-xs font-semibold text-green-600 uppercase tracking-wide mb-3">Then</p>
              <div className="space-y-2">
                {editingRule.actions.map((action, ai) => {
                  const actionDef = FORM_RULE_ACTIONS.find(a => a.value === action.type);
                  const isSectionAction = actionDef?.targetType === "section";
                  return (
                    <div key={action.id} className="flex items-center gap-1.5 flex-wrap bg-gray-50 rounded-lg p-2">
                      {/* Action type */}
                      <Select value={action.type} onValueChange={v =>
                        updRule(editingRule.id, { actions: editingRule.actions.map((a, i) =>
                          i === ai ? { ...a, type: v as FormRuleActionType, target: "", value: "" } : a) })
                      }>
                        <SelectTrigger className="h-7 text-xs w-48"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {FORM_RULE_ACTIONS.map(a => <SelectItem key={a.value} value={a.value} className="text-xs">{a.label}</SelectItem>)}
                        </SelectContent>
                      </Select>

                      {/* Target: section or field */}
                      {actionDef?.hasTarget && (
                        isSectionAction ? (
                          <Select value={action.target || "_none"} onValueChange={v =>
                            updRule(editingRule.id, { actions: editingRule.actions.map((a, i) =>
                              i === ai ? { ...a, target: v === "_none" ? "" : v } : a) })
                          }>
                            <SelectTrigger className="h-7 text-xs w-40"><SelectValue placeholder="Section…" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="_none" className="text-xs italic text-gray-400">Select section…</SelectItem>
                              {sections.map(s => <SelectItem key={s.id} value={s.id} className="text-xs">{s.label}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        ) : (
                          <Select value={action.target || "_none"} onValueChange={v =>
                            updRule(editingRule.id, { actions: editingRule.actions.map((a, i) =>
                              i === ai ? { ...a, target: v === "_none" ? "" : v } : a) })
                          }>
                            <SelectTrigger className="h-7 text-xs w-40"><SelectValue placeholder="Field…" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="_none" className="text-xs italic text-gray-400">Select field…</SelectItem>
                              {fieldOptions.map(f => <SelectItem key={f.key} value={f.key} className="text-xs">{f.label}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        )
                      )}

                      {/* Optional value input */}
                      {actionDef?.hasValue && (
                        <Input value={action.value || ""} onChange={e =>
                          updRule(editingRule.id, { actions: editingRule.actions.map((a, i) =>
                            i === ai ? { ...a, value: e.target.value } : a) })
                        }
                        placeholder={
                          action.type === "block_submit" ? "Error message…"
                          : action.type === "show_message" ? "Message…"
                          : "Value…"
                        }
                        className="h-7 text-xs w-48" />
                      )}

                      <button onClick={() =>
                        updRule(editingRule.id, { actions: editingRule.actions.filter((_, i) => i !== ai) })
                      } className="text-gray-300 hover:text-red-500 p-0.5 ml-auto">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })}
                <button onClick={() =>
                  updRule(editingRule.id, { actions: [...editingRule.actions, { id: newUid(), type: "show_field" as FormRuleActionType, target: "", value: "" }] })
                } className="text-xs text-green-600 hover:text-green-700 flex items-center gap-1 mt-1">
                  <Plus className="w-3 h-3" /> Add Action
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom save bar */}
        <div className="flex justify-end gap-2 pb-4">
          <Button size="sm" variant="outline" onClick={() => setEditingRuleId(null)}>Cancel</Button>
          <Button size="sm" onClick={handleSaveRule} disabled={saving} className="gap-1.5">
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            Save Rule
          </Button>
        </div>
      </div>
    </ScrollArea>
  );
}

// ── Form Settings Panel ────────────────────────────────────────────────────────

function FormSettingsPanel({ form, settings, onSettingsChange, onSave, saving }: {
  form: any; settings: any;
  onSettingsChange: (updates: Partial<typeof settings>) => void;
  onSave: () => void; saving: boolean;
}) {
  const set = (key: string, val: any) => onSettingsChange({ [key]: val });
  const setNested = (root: string, key: string, val: any) =>
    onSettingsChange({ [root]: { ...(settings[root] || {}), [key]: val } });

  const header = settings.header || {};
  const postSubmit = settings.postSubmit || {};

  return (
    <ScrollArea className="h-full">
      <div className="p-6 max-w-2xl mx-auto space-y-8">

        {/* ── Availability ── */}
        <section>
          <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-blue-500" /> Form Availability
          </h3>
          <div className="space-y-4 pl-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-700">Accept Submissions</p>
                <p className="text-xs text-gray-400">Disable to temporarily close this form</p>
              </div>
              <Switch checked={settings.isEnabled !== false} onCheckedChange={v => set("isEnabled", v)} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs">Opens At</Label>
                <input type="datetime-local" value={settings.startDate || ""}
                  onChange={e => set("startDate", e.target.value || null)}
                  className="w-full h-9 text-xs border border-gray-200 rounded-md px-3 bg-white focus:outline-none focus:ring-2 focus:ring-blue-400" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Closes At</Label>
                <input type="datetime-local" value={settings.endDate || ""}
                  onChange={e => set("endDate", e.target.value || null)}
                  className="w-full h-9 text-xs border border-gray-200 rounded-md px-3 bg-white focus:outline-none focus:ring-2 focus:ring-blue-400" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Max Submissions</Label>
              <Input type="number" min="0"
                value={settings.submissionLimit || ""}
                onChange={e => set("submissionLimit", e.target.value ? parseInt(e.target.value) : null)}
                placeholder="Unlimited" className="max-w-40 h-9 text-sm" />
              <p className="text-xs text-gray-400">Leave empty for unlimited</p>
            </div>
          </div>
        </section>

        <Separator />

        {/* ── Status Messages ── */}
        <section>
          <h3 className="text-sm font-semibold text-gray-900 mb-1 flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-amber-500" /> Status Messages
          </h3>
          <p className="text-xs text-gray-400 mb-4 pl-6">
            Shown to users when the form is unavailable for each reason.
          </p>
          <div className="space-y-3 pl-6">
            {[
              { key: "closedMessage",      label: "Form Closed",   placeholder: "This form is currently closed." },
              { key: "expiredMessage",     label: "Form Expired",  placeholder: "This form is no longer accepting submissions." },
              { key: "limitReachedMessage",label: "Limit Reached", placeholder: "Maximum responses have been collected." },
              { key: "notStartedMessage",  label: "Not Yet Open",  placeholder: "This form is not yet open. Please check back later." },
            ].map(({ key, label, placeholder }) => (
              <div key={key} className="space-y-1.5">
                <Label className="text-xs">{label}</Label>
                <Input value={settings[key] || ""} onChange={e => set(key, e.target.value)}
                  placeholder={placeholder} className="h-9 text-sm" />
              </div>
            ))}
          </div>
        </section>

        <Separator />

        {/* ── Header & Branding ── */}
        <section>
          <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <ImageIcon className="w-4 h-4 text-purple-500" /> Header & Branding
          </h3>
          <div className="space-y-4 pl-6">
            <div className="space-y-1.5">
              <Label className="text-xs">Logo URL</Label>
              <Input value={header.logoUrl || ""} onChange={e => setNested("header", "logoUrl", e.target.value)}
                placeholder="https://example.com/logo.png" className="h-9 text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Banner / Cover Image URL</Label>
              <Input value={header.bannerUrl || ""} onChange={e => setNested("header", "bannerUrl", e.target.value)}
                placeholder="https://example.com/banner.jpg" className="h-9 text-sm" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs">Header Title</Label>
                <Input value={header.title || ""} onChange={e => setNested("header", "title", e.target.value)}
                  placeholder={form?.name} className="h-9 text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Subtitle</Label>
                <Input value={header.subtitle || ""} onChange={e => setNested("header", "subtitle", e.target.value)}
                  placeholder="Optional subtitle" className="h-9 text-sm" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs">Text Alignment</Label>
                <Select value={header.alignment || "center"} onValueChange={v => setNested("header", "alignment", v)}>
                  <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="left" className="text-xs">Left</SelectItem>
                    <SelectItem value="center" className="text-xs">Center</SelectItem>
                    <SelectItem value="right" className="text-xs">Right</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Background</Label>
                <div className="flex items-center gap-1.5">
                  <input type="color" value={header.bgColor || "#4F46E5"}
                    onChange={e => setNested("header", "bgColor", e.target.value)}
                    className="w-9 h-9 rounded border border-gray-200 cursor-pointer p-0.5" />
                  <Input value={header.bgColor || "#4F46E5"} onChange={e => setNested("header", "bgColor", e.target.value)}
                    className="h-9 text-xs font-mono" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Text Color</Label>
                <div className="flex items-center gap-1.5">
                  <input type="color" value={header.textColor || "#FFFFFF"}
                    onChange={e => setNested("header", "textColor", e.target.value)}
                    className="w-9 h-9 rounded border border-gray-200 cursor-pointer p-0.5" />
                  <Input value={header.textColor || "#FFFFFF"} onChange={e => setNested("header", "textColor", e.target.value)}
                    className="h-9 text-xs font-mono" />
                </div>
              </div>
            </div>

            {/* Live preview */}
            {(header.title || header.logoUrl || header.bannerUrl || header.subtitle) && (
              <div className="rounded-xl overflow-hidden border border-gray-200 shadow-sm">
                {header.bannerUrl && (
                  <div className="h-28 bg-gray-100 overflow-hidden">
                    <img src={header.bannerUrl} alt="Banner" className="w-full h-full object-cover" onError={e => { (e.target as any).style.display = "none"; }} />
                  </div>
                )}
                <div className="px-6 py-5" style={{ backgroundColor: header.bgColor || "#4F46E5", color: header.textColor || "#FFFFFF", textAlign: (header.alignment || "center") as any }}>
                  {header.logoUrl && <img src={header.logoUrl} alt="Logo" className="h-8 mb-3 inline-block" onError={e => { (e.target as any).style.display = "none"; }} />}
                  <p className="font-bold text-lg leading-tight">{header.title || form?.name}</p>
                  {header.subtitle && <p className="text-sm mt-1 opacity-80">{header.subtitle}</p>}
                </div>
              </div>
            )}
          </div>
        </section>

        <Separator />

        {/* ── Post-Submit ── */}
        <section>
          <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-green-500" /> After Submission
          </h3>
          <div className="space-y-4 pl-6">
            <div className="space-y-1.5">
              <Label className="text-xs">Thank You Message</Label>
              <Textarea value={postSubmit.message || ""}
                onChange={e => setNested("postSubmit", "message", e.target.value)}
                placeholder="Thank you! Your response has been recorded."
                rows={3} className="text-sm resize-none" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Redirect After Submission (optional)</Label>
              <Input value={postSubmit.redirectUrl || ""} onChange={e => setNested("postSubmit", "redirectUrl", e.target.value)}
                placeholder="https://your-website.com/thank-you" className="h-9 text-sm" />
            </div>
            {postSubmit.redirectUrl && (
              <div className="space-y-1.5">
                <Label className="text-xs">Redirect Delay (seconds)</Label>
                <Input type="number" min="0" max="30"
                  value={postSubmit.redirectDelay ?? 3}
                  onChange={e => setNested("postSubmit", "redirectDelay", parseInt(e.target.value) || 0)}
                  className="max-w-28 h-9 text-sm" />
              </div>
            )}
            <div className="flex items-center justify-between py-1">
              <div>
                <p className="text-sm font-medium text-gray-700">Push Data to CRM Module</p>
                <p className="text-xs text-gray-400">Create a CRM record for every submission</p>
              </div>
              <Switch
                checked={postSubmit.createRecord !== false}
                onCheckedChange={v => setNested("postSubmit", "createRecord", v)}
              />
            </div>
          </div>
        </section>

        <div className="flex justify-end pt-2">
          <Button onClick={onSave} disabled={saving} className="gap-2">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save Settings
          </Button>
        </div>
      </div>
    </ScrollArea>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────

export default function FormBuilderPage() {
  const { id } = useParams<{ id: string }>();
  const [form, setForm] = useState<any>(null);
  const [formFields, setFormFields] = useState<any[]>([]);
  const [availableFields, setAvailableFields] = useState<any[]>([]);
  const [allModuleFields, setAllModuleFields] = useState<any[]>([]);
  const [sections, setSections] = useState<any[]>([]);
  const [selectedFF, setSelectedFF] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [accessingForm, setAccessingForm] = useState(false);
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [newSectionLabel, setNewSectionLabel] = useState("");
  const [mode, setMode] = useState<"builder" | "rules" | "settings">("builder");
  const [rightTab, setRightTab] = useState<"properties" | "rules" | "autofill">("properties");
  const [localSettings, setLocalSettings] = useState<any>({});
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

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
    setLocalSettings(f.settings || {});
    if (f.moduleId) {
      try {
        const allRes = await api.get(`/modules/${f.moduleId}/fields`);
        setAllModuleFields(allRes.data || []);
      } catch {}
    }
  }, [id]);

  useEffect(() => { loadForm().finally(() => setLoading(false)); }, [loadForm]);

  const getModuleField = (fieldId: string) =>
    allModuleFields.find(f => f.id === fieldId) || availableFields.find(f => f.id === fieldId);

  const addFieldToForm = async (fieldId: string) => {
    const { data } = await api.post(`/forms/${id}/fields`, { fieldId });
    setFormFields(prev => [...prev, data]);
    setAvailableFields(prev => prev.filter(f => f.id !== fieldId));
    setSelectedFF(data);
    setRightTab("properties");
  };

  const removeFieldFromForm = async (ffId: string, fieldId: string) => {
    await api.delete(`/forms/${id}/fields/${ffId}`);
    setFormFields(prev => prev.filter(f => f.id !== ffId));
    const mf = allModuleFields.find(f => f.id === fieldId);
    if (mf) setAvailableFields(prev => [...prev, mf].sort((a, b) => a.order - b.order));
    if (selectedFF?.id === ffId) setSelectedFF(null);
  };

  const updateFormField = async (ffId: string, changes: any) => {
    const updated = { ...selectedFF, ...changes };
    setSelectedFF(updated);
    setFormFields(prev => prev.map(f => f.id === ffId ? updated : f));
    try { await api.patch(`/forms/${id}/fields/${ffId}`, changes); } catch {}
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(String(event.active.id));
  };

  const handleDragCancel = () => setActiveId(null);

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIdx = formFields.findIndex(f => f.id === active.id);
    const newIdx = formFields.findIndex(f => f.id === over.id);
    const reordered = arrayMove(formFields, oldIdx, newIdx);
    setFormFields(reordered);
    await api.post(`/forms/${id}/fields/reorder`, { formFieldIds: reordered.map(f => f.id) });
  };

  const formLayout = (localSettings?.layout as any) || {};
  const columns = (formLayout.columns as 1 | 2 | 3) || 2;
  const fieldSpans = (formLayout.spans as Record<string, number>) || {};

  const getColSpan = (ffId: string) => {
    const span = fieldSpans[ffId] || 1;
    return Math.min(span, columns) as 1 | 2 | 3;
  };

  const updateLayout = async (patch: Record<string, any>) => {
    const newSettings = { ...localSettings, layout: { ...formLayout, ...patch } };
    setLocalSettings(newSettings);
    try { await api.patch(`/forms/${id}`, { settings: newSettings }); } catch {}
  };

  const handleColumnsChange = (n: 1 | 2 | 3) => updateLayout({ columns: n });

  const handleColSpanChange = (ffId: string, span: number) =>
    updateLayout({ spans: { ...fieldSpans, [ffId]: span } });

  const addSection = async () => {
    if (!newSectionLabel.trim()) return;
    const { data } = await api.post(`/forms/${id}/sections`, { label: newSectionLabel.trim() });
    setSections(prev => [...prev, data]);
    setNewSectionLabel("");
  };

  const removeSection = async (sectionId: string) => {
    await api.delete(`/forms/${id}/sections/${sectionId}`);
    setSections(prev => prev.filter(s => s.id !== sectionId));
  };

  const saveForm = async () => {
    if (!form) return;
    setSaving(true);
    try { await api.patch(`/forms/${id}`, { name: form.name, description: form.description, type: form.type }); }
    finally { setSaving(false); }
  };

  const openForm = async () => {
    if (form?.token) {
      window.open(`/f/${form.token}`, "_blank");
      return;
    }
    setAccessingForm(true);
    try {
      const { data } = await api.post(`/forms/${id}/generate-token`);
      setForm((prev: any) => ({ ...prev, token: data.token }));
      window.open(`/f/${data.token}`, "_blank");
    } catch {}
    setAccessingForm(false);
  };

  const saveSettings = async () => {
    setSettingsSaving(true);
    try { await api.patch(`/forms/${id}`, { settings: localSettings }); }
    finally { setSettingsSaving(false); }
  };

  const handleSettingsChange = (updates: any) => {
    setLocalSettings((prev: any) => ({ ...prev, ...updates }));
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 text-blue-600 animate-spin" /></div>;
  }

  const selectedMF = selectedFF ? getModuleField(selectedFF.fieldId) : null;
  const isLookupField = selectedMF?.type === "LOOKUP";

  return (
    <div className="flex flex-col h-full -m-6">
      {/* ── Header ── */}
      <div className="flex items-center justify-between px-6 py-3 bg-white border-b shrink-0">
        <div className="flex items-center gap-3">
          <Link href="/forms">
            <Button variant="ghost" size="icon" className="h-8 w-8"><ArrowLeft className="w-4 h-4" /></Button>
          </Link>
          <div>
            <h1 className="font-semibold text-gray-900">{form?.name}</h1>
            <p className="text-xs text-gray-400">{formFields.length} fields</p>
          </div>
        </div>
        {/* Mode switcher */}
        <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
          <button onClick={() => setMode("builder")}
            className={cn("px-3 py-1.5 rounded-md text-xs font-medium transition-colors", mode === "builder" ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700")}>
            Fields
          </button>
          <button onClick={() => setMode("rules")}
            className={cn("px-3 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5", mode === "rules" ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700")}>
            <Zap className="w-3.5 h-3.5" /> Rules
          </button>
          <button onClick={() => setMode("settings")}
            className={cn("px-3 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5", mode === "settings" ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700")}>
            <Settings className="w-3.5 h-3.5" /> Settings
          </button>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={openForm} disabled={accessingForm} className="gap-2">
            {accessingForm ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ExternalLink className="w-3.5 h-3.5" />}
            Open Form
          </Button>
          <Link href={`/forms/${id}/permissions`}>
            <Button variant="outline" size="sm" className="gap-2"><LockIcon className="w-3.5 h-3.5" /> Permissions</Button>
          </Link>
          <Button size="sm" onClick={saveForm} disabled={saving} className="gap-2">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save
          </Button>
        </div>
      </div>

      {/* ── Rules Mode ── */}
      {mode === "rules" && (
        <div className="flex-1 overflow-hidden bg-gray-50">
          <FormRuleEngine
            formFields={formFields}
            allModuleFields={allModuleFields}
            sections={sections}
            settings={localSettings}
            onSettingsChange={handleSettingsChange}
            onSave={saveSettings}
            saving={settingsSaving}
          />
        </div>
      )}

      {/* ── Settings Mode ── */}
      {mode === "settings" && (
        <div className="flex-1 overflow-hidden bg-gray-50">
          <FormSettingsPanel
            form={form}
            settings={localSettings}
            onSettingsChange={handleSettingsChange}
            onSave={saveSettings}
            saving={settingsSaving}
          />
        </div>
      )}

      {/* ── Builder Mode ── */}
      {mode === "builder" && (
        <div className="flex flex-1 overflow-hidden">
          {/* Left: Available Fields */}
          <div className="w-56 bg-white border-r flex flex-col shrink-0">
            <div className="px-3 py-3 border-b">
              <p className="text-xs font-semibold text-gray-500 uppercase">Available Fields</p>
              <p className="text-xs text-gray-400 mt-0.5">Click to add</p>
            </div>
            <ScrollArea className="flex-1">
              <div className="p-2 space-y-0.5">
                {availableFields.length === 0
                  ? <p className="text-xs text-gray-400 text-center py-4">All fields added</p>
                  : availableFields.map(f => (
                    <button key={f.id} onClick={() => addFieldToForm(f.id)}
                      className="w-full flex items-center gap-2 px-2.5 py-2 rounded-md hover:bg-blue-50 hover:text-blue-700 text-left transition-colors group">
                      <span className="w-6 h-6 bg-gray-100 group-hover:bg-blue-100 rounded text-xs flex items-center justify-center font-mono text-gray-600 shrink-0">
                        {FIELD_TYPE_ICONS[f.type] || "T"}
                      </span>
                      <p className="text-xs font-medium truncate">{f.label}</p>
                    </button>
                  ))
                }
              </div>
            </ScrollArea>

            {/* Sections */}
            <div className="border-t p-3 space-y-2">
              <p className="text-xs font-semibold text-gray-500 uppercase">Sections</p>
              <div className="space-y-1">
                {sections.map(s => (
                  <div key={s.id} className="flex items-center justify-between text-xs bg-gray-50 rounded px-2 py-1">
                    <span className="truncate">{s.label}</span>
                    <button onClick={() => removeSection(s.id)} className="text-gray-400 hover:text-red-500 ml-1">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
              <div className="flex gap-1">
                <input value={newSectionLabel} onChange={e => setNewSectionLabel(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && addSection()}
                  placeholder="Section name"
                  className="flex-1 text-xs border border-gray-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-400" />
                <button onClick={addSection} className="px-2 py-1 bg-gray-100 rounded text-xs hover:bg-gray-200">+</button>
              </div>
            </div>
          </div>

          {/* Center: Canvas */}
          <div className="flex-1 bg-gray-50 overflow-y-auto flex flex-col">
            {/* Canvas toolbar */}
            <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-2.5 bg-white border-b shrink-0">
              <p className="text-xs text-gray-500">
                {formFields.length === 0
                  ? "← Click a field to add it"
                  : `${formFields.length} field${formFields.length !== 1 ? "s" : ""} · Drag to reorder`}
              </p>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-medium text-gray-400 uppercase tracking-wide">Columns</span>
                <div className="flex items-center bg-gray-100 rounded-md p-0.5 gap-0.5">
                  {([1, 2, 3] as const).map((n) => (
                    <button
                      key={n}
                      onClick={() => handleColumnsChange(n)}
                      className={cn(
                        "w-8 h-6 rounded text-xs font-semibold transition-colors",
                        columns === n
                          ? "bg-white shadow-sm text-blue-600"
                          : "text-gray-400 hover:text-gray-700"
                      )}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex-1 p-6">
              <div className="max-w-4xl mx-auto">
                {formFields.length === 0 ? (
                  <div className="border-2 border-dashed border-gray-300 rounded-xl p-12 text-center">
                    <Layers className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                    <p className="text-sm text-gray-400">Add fields from the left panel</p>
                    <p className="text-xs text-gray-300 mt-1">Click a field or drag it onto the canvas</p>
                  </div>
                ) : (
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragStart={handleDragStart}
                    onDragEnd={handleDragEnd}
                    onDragCancel={handleDragCancel}
                  >
                    <SortableContext
                      items={formFields.map((f) => f.id)}
                      strategy={columns === 1 ? verticalListSortingStrategy : rectSortingStrategy}
                    >
                      <div
                        className={cn(
                          "grid gap-3",
                          columns === 1 && "grid-cols-1",
                          columns === 2 && "grid-cols-2",
                          columns === 3 && "grid-cols-3"
                        )}
                      >
                        {buildRenderItems(formFields, sections).map((item) => {
                          if (item.type === "section") {
                            return (
                              <div
                                key={`sec-${item.section.id}`}
                                className={cn(
                                  "col-span-full flex items-center gap-3 py-2",
                                  !item.isFirst && "mt-1"
                                )}
                              >
                                <div className="flex-1 h-px bg-gray-200" />
                                <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest px-1 whitespace-nowrap">
                                  {item.section.label}
                                </span>
                                <div className="flex-1 h-px bg-gray-200" />
                              </div>
                            );
                          }
                          const ff = item.ff;
                          const span = getColSpan(ff.id);
                          return (
                            <div
                              key={ff.id}
                              style={{ gridColumn: `span ${span}` }}
                              className={cn(activeId === ff.id && "opacity-40")}
                            >
                              <SortableFormFieldItem
                                ff={ff}
                                moduleField={getModuleField(ff.fieldId)}
                                isSelected={selectedFF?.id === ff.id}
                                onSelect={() => { setSelectedFF(ff); setRightTab("properties"); }}
                                onRemove={() => removeFieldFromForm(ff.id, ff.fieldId)}
                              />
                            </div>
                          );
                        })}
                      </div>
                    </SortableContext>

                    <DragOverlay dropAnimation={null}>
                      {activeId
                        ? (() => {
                            const ff = formFields.find((f) => f.id === activeId);
                            if (!ff) return null;
                            const mf = getModuleField(ff.fieldId);
                            return (
                              <div className="flex items-center gap-3 p-3 rounded-lg border-2 border-blue-400 bg-white shadow-2xl cursor-grabbing rotate-1 scale-105">
                                <GripVertical className="w-4 h-4 text-blue-400" />
                                <div className="w-6 h-6 rounded bg-blue-100 flex items-center justify-center text-xs font-mono text-blue-600 shrink-0">
                                  {FIELD_TYPE_ICONS[mf?.type || ""] || "?"}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-gray-900 truncate">
                                    {ff.customLabel || mf?.label || ff.fieldId}
                                  </p>
                                  <p className="text-xs text-blue-400">{mf?.type}</p>
                                </div>
                              </div>
                            );
                          })()
                        : null}
                    </DragOverlay>
                  </DndContext>
                )}
              </div>
            </div>
          </div>

          {/* Right: Properties */}
          <div className="w-80 bg-white border-l flex flex-col shrink-0">
            {selectedFF ? (
              <>
                {/* Tab header */}
                <div className="px-4 py-2.5 border-b flex items-center justify-between shrink-0">
                  <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-0.5">
                    {[
                      { key: "properties", label: "Properties" },
                      { key: "rules",      label: "Rules" },
                      ...(isLookupField ? [{ key: "autofill", label: "Auto-Fill" }] : []),
                    ].map(tab => (
                      <button key={tab.key} onClick={() => setRightTab(tab.key as any)}
                        className={cn("px-2.5 py-1 rounded-md text-xs font-medium transition-colors",
                          rightTab === tab.key ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700")}>
                        {tab.label}
                      </button>
                    ))}
                  </div>
                  <button onClick={() => setSelectedFF(null)} className="text-gray-400 hover:text-gray-600">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <ScrollArea className="flex-1">
                  <div className="p-4">

                    {/* ── Properties tab ── */}
                    {rightTab === "properties" && (
                      <div className="space-y-4">
                        <div className="space-y-1.5">
                          <Label className="text-xs">Custom Label</Label>
                          <Input value={selectedFF.customLabel || ""}
                            onChange={e => updateFormField(selectedFF.id, { customLabel: e.target.value })}
                            placeholder={selectedMF?.label || "Override label"} />
                          <p className="text-xs text-gray-400">Leave empty to use original label</p>
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs">Custom Placeholder</Label>
                          <Input value={selectedFF.customPlaceholder || ""}
                            onChange={e => updateFormField(selectedFF.id, { customPlaceholder: e.target.value })}
                            placeholder="Override placeholder" />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs">Section</Label>
                          <Select value={selectedFF.sectionId || "none"}
                            onValueChange={v => updateFormField(selectedFF.id, { sectionId: v === "none" ? null : v })}>
                            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">No section</SelectItem>
                              {sections.map(s => <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                        {columns > 1 && (
                          <div className="space-y-1.5">
                            <Label className="text-xs">Column Span</Label>
                            <div className="flex gap-1">
                              {(Array.from({ length: columns }, (_, i) => i + 1) as number[]).map((n) => (
                                <button
                                  key={n}
                                  onClick={() => handleColSpanChange(selectedFF.id, n)}
                                  className={cn(
                                    "flex-1 py-1.5 text-xs font-medium border rounded-md transition-colors",
                                    getColSpan(selectedFF.id) === n
                                      ? "bg-blue-600 text-white border-blue-600"
                                      : "bg-white text-gray-600 border-gray-200 hover:border-blue-300"
                                  )}
                                >
                                  {n === 1 ? "½" : n === 2 ? columns === 3 ? "⅔" : "Full" : "Full"}
                                </button>
                              ))}
                            </div>
                            <p className="text-[11px] text-gray-400">
                              {getColSpan(selectedFF.id) === 1 ? "Standard width" : "Spans multiple columns"}
                            </p>
                          </div>
                        )}
                        <Separator />
                        <div className="space-y-3">
                          {[
                            { key: "isRequired", label: "Required",   desc: "User must fill this field" },
                            { key: "isHidden",   label: "Hidden",     desc: "Not shown (unless revealed by a rule)" },
                            { key: "isReadonly", label: "Read-Only",  desc: "Visible but cannot be edited" },
                          ].map(({ key, label, desc }) => (
                            <div key={key} className="flex items-center justify-between">
                              <div>
                                <p className="text-sm font-medium text-gray-700">{label}</p>
                                <p className="text-xs text-gray-400">{desc}</p>
                              </div>
                              <Switch checked={!!selectedFF[key]}
                                onCheckedChange={v => updateFormField(selectedFF.id, { [key]: v })} />
                            </div>
                          ))}
                        </div>
                        {/* Field info */}
                        <Separator />
                        <div className="p-2.5 bg-gray-50 rounded-lg space-y-1 text-xs text-gray-400">
                          <p>Type: <span className="font-mono text-gray-600">{selectedMF?.type}</span></p>
                          <p>Key: <span className="font-mono text-gray-600">{selectedMF?.name}</span></p>
                        </div>
                      </div>
                    )}

                    {/* ── Rules tab ── */}
                    {rightTab === "rules" && (
                      <FieldRulesEditor
                        ff={selectedFF}
                        formFields={formFields}
                        allModuleFields={allModuleFields}
                        onUpdate={changes => updateFormField(selectedFF.id, changes)}
                      />
                    )}

                    {/* ── Auto-Fill tab (LOOKUP only) ── */}
                    {rightTab === "autofill" && isLookupField && (
                      <LookupAutoFillEditor
                        ff={selectedFF}
                        formFields={formFields}
                        allModuleFields={allModuleFields}
                        onUpdate={changes => updateFormField(selectedFF.id, changes)}
                      />
                    )}
                  </div>
                </ScrollArea>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center p-6">
                <Settings className="w-10 h-10 text-gray-300 mb-3" />
                <p className="text-sm font-medium text-gray-500">Select a field</p>
                <p className="text-xs text-gray-400 mt-1">Click any field in the canvas to configure it</p>
                <div className="mt-6 space-y-2 text-left w-full">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Quick Tips</p>
                  {[
                    ["Properties", "Custom label, section, required, hidden"],
                    ["Rules", "Conditional show/hide/require based on other fields"],
                    ["Auto-Fill", "Auto-populate fields from CRM lookup"],
                  ].map(([title, desc]) => (
                    <div key={title} className="flex items-start gap-2 text-xs text-gray-500">
                      <ChevronRight className="w-3.5 h-3.5 shrink-0 mt-0.5 text-blue-400" />
                      <div><span className="font-medium text-gray-700">{title}</span> — {desc}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
