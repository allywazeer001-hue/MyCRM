"use client";
import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Zap, Plus, Trash2, ChevronDown, ChevronUp, Loader2,
  ToggleLeft, ToggleRight, ArrowLeft, GripVertical,
  CheckCircle2, AlertCircle, Save, X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
const uid = () => Math.random().toString(36).slice(2, 10);

// ── Types ──────────────────────────────────────────────────────────────────────

type FieldCondition = {
  id: string; field: string;
  operator: string; value: string;
};
type FieldAction = {
  id: string; type: string; targetField: string; value?: string;
};
type Rule = {
  id?: string; name: string; description?: string;
  priority: number; isEnabled: boolean;
  logic: "AND" | "OR";
  conditions: FieldCondition[]; actions: FieldAction[];
  stopOnMatch: boolean; runOnLoad: boolean;
};
type FieldOption = { id: string; label: string; value: string };
type Field = { id: string; name: string; label: string; type: string; options?: FieldOption[] };

// ── Constants ─────────────────────────────────────────────────────────────────

const OPERATORS = [
  { value: "equals",       label: "Equals" },
  { value: "not_equals",   label: "Does not equal" },
  { value: "contains",     label: "Contains" },
  { value: "not_contains", label: "Does not contain" },
  { value: "starts_with",  label: "Starts with" },
  { value: "ends_with",    label: "Ends with" },
  { value: "empty",        label: "Is empty" },
  { value: "not_empty",    label: "Is not empty" },
  { value: "gt",           label: "Greater than" },
  { value: "lt",           label: "Less than" },
];

const ACTION_TYPES = [
  { value: "set_value",      label: "Set value", needsValue: true },
  { value: "clear",          label: "Clear value", needsValue: false },
  { value: "show",           label: "Show field", needsValue: false },
  { value: "hide",           label: "Hide field", needsValue: false },
  { value: "enable",         label: "Enable field", needsValue: false },
  { value: "disable",        label: "Disable field", needsValue: false },
  { value: "make_required",  label: "Make required", needsValue: false },
  { value: "remove_required",label: "Remove required", needsValue: false },
];

const NO_VALUE_OPS = new Set(["empty", "not_empty"]);

function emptyRule(): Omit<Rule, "id"> {
  return {
    name: "New Rule", description: "", priority: 0, isEnabled: true,
    logic: "AND", conditions: [], actions: [], stopOnMatch: false, runOnLoad: true,
  };
}

// ── Toast ─────────────────────────────────────────────────────────────────────

function Toast({ msg, type }: { msg: string; type: "success" | "error" }) {
  return (
    <div className={cn(
      "fixed bottom-6 right-6 z-[200] flex items-center gap-2 px-4 py-3 rounded-xl border shadow-lg text-sm font-medium",
      type === "success" ? "bg-green-50 border-green-200 text-green-700" : "bg-red-50 border-red-200 text-red-700",
    )}>
      {type === "success" ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
      {msg}
    </div>
  );
}

// ── Select helper ─────────────────────────────────────────────────────────────

function Select({ value, onChange, children, className }: {
  value: string; onChange: (v: string) => void;
  children: React.ReactNode; className?: string;
}) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      className={cn(
        "h-8 px-2 text-xs rounded-lg border border-gray-200 bg-white text-gray-700",
        "focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400",
        className,
      )}
    >
      {children}
    </select>
  );
}

// ── ConditionRow ──────────────────────────────────────────────────────────────

function ConditionRow({
  cond, fields, onChange, onRemove,
}: {
  cond: FieldCondition; fields: Field[];
  onChange: (c: FieldCondition) => void; onRemove: () => void;
}) {
  const needsValue = !NO_VALUE_OPS.has(cond.operator);
  const selectedField = fields.find(f => f.name === cond.field);
  const fieldOptions  = selectedField?.options ?? [];

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <Select value={cond.field} onChange={v => onChange({ ...cond, field: v, value: "" })} className="flex-1 min-w-[120px]">
        <option value="">Select field…</option>
        {fields.map(f => <option key={f.id} value={f.name}>{f.label}</option>)}
      </Select>

      <Select value={cond.operator} onChange={v => onChange({ ...cond, operator: v })} className="flex-1 min-w-[130px]">
        {OPERATORS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </Select>

      {needsValue && (
        fieldOptions.length > 0
          ? (
            <Select value={cond.value} onChange={v => onChange({ ...cond, value: v })} className="flex-1 min-w-[100px]">
              <option value="">Select value…</option>
              {fieldOptions.map(o => <option key={o.id} value={o.value}>{o.label}</option>)}
            </Select>
          )
          : (
            <Input
              value={cond.value}
              onChange={e => onChange({ ...cond, value: e.target.value })}
              placeholder="Value…"
              className="h-8 text-xs flex-1 min-w-[100px]"
            />
          )
      )}

      <button onClick={onRemove} className="p-1 text-gray-300 hover:text-red-400 transition-colors">
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

// ── ActionRow ─────────────────────────────────────────────────────────────────

function ActionRow({
  action, fields, onChange, onRemove,
}: {
  action: FieldAction; fields: Field[];
  onChange: (a: FieldAction) => void; onRemove: () => void;
}) {
  const meta         = ACTION_TYPES.find(t => t.value === action.type);
  const targetField  = fields.find(f => f.name === action.targetField);
  const fieldOptions = targetField?.options ?? [];

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <Select value={action.type} onChange={v => onChange({ ...action, type: v })} className="flex-1 min-w-[130px]">
        {ACTION_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
      </Select>

      <Select value={action.targetField} onChange={v => onChange({ ...action, targetField: v, value: "" })} className="flex-1 min-w-[120px]">
        <option value="">Select field…</option>
        {fields.map(f => <option key={f.id} value={f.name}>{f.label}</option>)}
      </Select>

      {meta?.needsValue && (
        fieldOptions.length > 0
          ? (
            <Select value={action.value ?? ""} onChange={v => onChange({ ...action, value: v })} className="flex-1 min-w-[100px]">
              <option value="">Select value…</option>
              {fieldOptions.map(o => <option key={o.id} value={o.value}>{o.label}</option>)}
            </Select>
          )
          : (
            <Input
              value={action.value ?? ""}
              onChange={e => onChange({ ...action, value: e.target.value })}
              placeholder="Value…"
              className="h-8 text-xs flex-1 min-w-[100px]"
            />
          )
      )}

      <button onClick={onRemove} className="p-1 text-gray-300 hover:text-red-400 transition-colors">
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

// ── RuleCard ──────────────────────────────────────────────────────────────────

function RuleCard({
  rule, fields, onChange, onSave, onDelete, saving,
}: {
  rule: Rule; fields: Field[];
  onChange: (r: Rule) => void;
  onSave: () => void; onDelete: () => void;
  saving: boolean;
}) {
  const [expanded, setExpanded] = useState(!rule.id);

  const addCondition = () => onChange({
    ...rule,
    conditions: [...rule.conditions, { id: uid(), field: "", operator: "equals", value: "" }],
  });

  const addAction = () => onChange({
    ...rule,
    actions: [...rule.actions, { id: uid(), type: "set_value", targetField: "", value: "" }],
  });

  const updateCond = (idx: number, c: FieldCondition) => onChange({
    ...rule, conditions: rule.conditions.map((x, i) => i === idx ? c : x),
  });

  const removeCond = (idx: number) => onChange({
    ...rule, conditions: rule.conditions.filter((_, i) => i !== idx),
  });

  const updateAction = (idx: number, a: FieldAction) => onChange({
    ...rule, actions: rule.actions.map((x, i) => i === idx ? a : x),
  });

  const removeAction = (idx: number) => onChange({
    ...rule, actions: rule.actions.filter((_, i) => i !== idx),
  });

  return (
    <div className={cn(
      "border rounded-xl overflow-hidden bg-white transition-all",
      rule.isEnabled ? "border-gray-200" : "border-gray-100 opacity-60",
    )}>
      {/* Header */}
      <div
        className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50 select-none"
        onClick={() => setExpanded(e => !e)}
      >
        <GripVertical className="w-3.5 h-3.5 text-gray-300 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 truncate">{rule.name || "Untitled rule"}</p>
          {!expanded && (
            <p className="text-[11px] text-gray-400 mt-0.5">
              {rule.conditions.length} condition{rule.conditions.length !== 1 ? "s" : ""} · {rule.actions.length} action{rule.actions.length !== 1 ? "s" : ""}
            </p>
          )}
        </div>

        <button
          onClick={e => { e.stopPropagation(); onChange({ ...rule, isEnabled: !rule.isEnabled }); }}
          className="p-1 rounded-md hover:bg-gray-100 transition-colors"
          title={rule.isEnabled ? "Disable" : "Enable"}
        >
          {rule.isEnabled
            ? <ToggleRight className="w-4 h-4 text-blue-500" />
            : <ToggleLeft className="w-4 h-4 text-gray-300" />}
        </button>

        {expanded ? <ChevronUp className="w-4 h-4 text-gray-400 shrink-0" /> : <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" />}
      </div>

      {/* Body */}
      {expanded && (
        <div className="border-t border-gray-100 px-4 py-4 space-y-5">
          {/* Basic info */}
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="text-[11px] font-medium text-gray-500 uppercase tracking-wide mb-1 block">Name</label>
              <Input
                value={rule.name}
                onChange={e => onChange({ ...rule, name: e.target.value })}
                className="h-8 text-sm"
                placeholder="Rule name"
              />
            </div>
            <div className="w-20">
              <label className="text-[11px] font-medium text-gray-500 uppercase tracking-wide mb-1 block">Priority</label>
              <Input
                type="number"
                value={rule.priority}
                onChange={e => onChange({ ...rule, priority: parseInt(e.target.value) || 0 })}
                className="h-8 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="text-[11px] font-medium text-gray-500 uppercase tracking-wide mb-1 block">Description</label>
            <Input
              value={rule.description ?? ""}
              onChange={e => onChange({ ...rule, description: e.target.value })}
              className="h-8 text-sm"
              placeholder="Optional description"
            />
          </div>

          {/* Options row */}
          <div className="flex flex-wrap gap-4">
            <label className="flex items-center gap-2 text-xs text-gray-600 cursor-pointer">
              <input
                type="checkbox"
                checked={rule.stopOnMatch}
                onChange={e => onChange({ ...rule, stopOnMatch: e.target.checked })}
                className="rounded border-gray-300"
              />
              Stop processing on match
            </label>
            <label className="flex items-center gap-2 text-xs text-gray-600 cursor-pointer">
              <input
                type="checkbox"
                checked={rule.runOnLoad}
                onChange={e => onChange({ ...rule, runOnLoad: e.target.checked })}
                className="rounded border-gray-300"
              />
              Run on record load
            </label>
          </div>

          {/* Conditions */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-medium text-gray-500 uppercase tracking-wide">Conditions</span>
                <Select
                  value={rule.logic}
                  onChange={v => onChange({ ...rule, logic: v as "AND" | "OR" })}
                  className="h-6 text-[10px] w-16"
                >
                  <option value="AND">ALL (AND)</option>
                  <option value="OR">ANY (OR)</option>
                </Select>
              </div>
              <button
                onClick={addCondition}
                className="flex items-center gap-1 text-[11px] text-blue-600 hover:text-blue-700 transition-colors"
              >
                <Plus className="w-3 h-3" /> Add
              </button>
            </div>

            {rule.conditions.length === 0 ? (
              <p className="text-xs text-gray-400 py-2 text-center border border-dashed border-gray-200 rounded-lg">
                No conditions — rule will never trigger
              </p>
            ) : (
              <div className="space-y-2">
                {rule.conditions.map((cond, i) => (
                  <ConditionRow
                    key={cond.id}
                    cond={cond}
                    fields={fields}
                    onChange={c => updateCond(i, c)}
                    onRemove={() => removeCond(i)}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Actions */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-medium text-gray-500 uppercase tracking-wide">Then do</span>
              <button
                onClick={addAction}
                className="flex items-center gap-1 text-[11px] text-blue-600 hover:text-blue-700 transition-colors"
              >
                <Plus className="w-3 h-3" /> Add
              </button>
            </div>

            {rule.actions.length === 0 ? (
              <p className="text-xs text-gray-400 py-2 text-center border border-dashed border-gray-200 rounded-lg">
                No actions — add at least one
              </p>
            ) : (
              <div className="space-y-2">
                {rule.actions.map((action, i) => (
                  <ActionRow
                    key={action.id}
                    action={action}
                    fields={fields}
                    onChange={a => updateAction(i, a)}
                    onRemove={() => removeAction(i)}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Footer buttons */}
          <div className="flex items-center justify-between pt-1 border-t border-gray-100">
            <button
              onClick={onDelete}
              className="flex items-center gap-1.5 text-xs text-red-400 hover:text-red-600 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" /> Delete rule
            </button>
            <Button size="sm" onClick={onSave} disabled={saving} className="h-7 text-xs">
              {saving ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Save className="w-3 h-3 mr-1" />}
              Save
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function FieldRulesModulePage() {
  const params  = useParams();
  const router  = useRouter();
  const moduleId = params.moduleId as string;

  const [fields,  setFields]  = useState<Field[]>([]);
  const [rules,   setRules]   = useState<Rule[]>([]);
  const [modName, setModName] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState<Record<string, boolean>>({});
  const [toast,   setToast]   = useState<{ msg: string; type: "success" | "error" } | null>(null);

  const showToast = (msg: string, type: "success" | "error" = "success") => {
    setToast({ msg, type }); setTimeout(() => setToast(null), 3000);
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [modRes, rulesRes] = await Promise.allSettled([
        api.get(`/modules/${moduleId}`),
        api.get(`/modules/${moduleId}/field-rules`),
      ]);
      if (modRes.status === "fulfilled") {
        const mod = modRes.value.data;
        setModName(mod.name ?? "Module");
        setFields(Array.isArray(mod.fields) ? mod.fields : []);
      }
      if (rulesRes.status === "fulfilled") {
        setRules(Array.isArray(rulesRes.value.data) ? rulesRes.value.data : []);
      }
    } finally {
      setLoading(false);
    }
  }, [moduleId]);

  useEffect(() => { load(); }, [load]);

  const addRule = () => {
    setRules(r => [...r, emptyRule() as Rule]);
  };

  const updateRule = (idx: number, rule: Rule) => {
    setRules(r => r.map((x, i) => i === idx ? rule : x));
  };

  const saveRule = async (idx: number) => {
    const rule = rules[idx];
    const key  = rule.id ?? `new-${idx}`;
    setSaving(s => ({ ...s, [key]: true }));
    try {
      if (rule.id) {
        const res = await api.patch(`/modules/${moduleId}/field-rules/${rule.id}`, rule);
        setRules(r => r.map((x, i) => i === idx ? res.data : x));
        showToast("Rule saved");
      } else {
        const res = await api.post(`/modules/${moduleId}/field-rules`, rule);
        setRules(r => r.map((x, i) => i === idx ? res.data : x));
        showToast("Rule created");
      }
    } catch {
      showToast("Failed to save rule", "error");
    } finally {
      setSaving(s => { const n = { ...s }; delete n[key]; return n; });
    }
  };

  const deleteRule = async (idx: number) => {
    const rule = rules[idx];
    if (!rule.id) { setRules(r => r.filter((_, i) => i !== idx)); return; }
    if (!confirm("Delete this rule?")) return;
    try {
      await api.delete(`/modules/${moduleId}/field-rules/${rule.id}`);
      setRules(r => r.filter((_, i) => i !== idx));
      showToast("Rule deleted");
    } catch {
      showToast("Failed to delete rule", "error");
    }
  };

  return (
    <div className="max-w-2xl mx-auto py-8 px-4">
      {toast && <Toast msg={toast.msg} type={toast.type} />}

      {/* Back nav */}
      <button
        onClick={() => router.push("/settings/field-rules")}
        className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors mb-5"
      >
        <ArrowLeft className="w-3.5 h-3.5" /> Back
      </button>

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center">
            <Zap className="w-4 h-4 text-amber-600" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-gray-900">Field Rules — {modName}</h1>
            <p className="text-sm text-gray-500">{rules.length} rule{rules.length !== 1 ? "s" : ""}</p>
          </div>
        </div>
        <Button size="sm" onClick={addRule} className="flex items-center gap-1.5">
          <Plus className="w-3.5 h-3.5" /> Add Rule
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-5 h-5 animate-spin text-gray-300" />
        </div>
      ) : rules.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-gray-200 rounded-xl bg-gray-50">
          <Zap className="w-8 h-8 text-gray-200 mx-auto mb-3" />
          <p className="text-sm font-medium text-gray-500">No field rules yet</p>
          <p className="text-xs text-gray-400 mt-1 mb-4">Rules auto-populate and control fields as users type</p>
          <Button size="sm" variant="outline" onClick={addRule}>
            <Plus className="w-3.5 h-3.5 mr-1.5" /> Create first rule
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {rules.map((rule, idx) => (
            <RuleCard
              key={rule.id ?? `new-${idx}`}
              rule={rule}
              fields={fields}
              onChange={r => updateRule(idx, r)}
              onSave={() => saveRule(idx)}
              onDelete={() => deleteRule(idx)}
              saving={!!saving[rule.id ?? `new-${idx}`]}
            />
          ))}
        </div>
      )}
    </div>
  );
}
