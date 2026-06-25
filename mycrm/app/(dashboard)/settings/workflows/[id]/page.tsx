"use client";
import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, Save, Loader2, Plus, X, CheckCircle2, AlertCircle,
  Zap, Edit2, Settings2, Trash2, Play, ChevronDown, Workflow,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { api } from "@/lib/api";
import { useModulesStore } from "@/store/modules.store";
import { cn } from "@/lib/utils";

// ── helpers ───────────────────────────────────────────────────────────────────

const uid = () => `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

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

// ── constants ─────────────────────────────────────────────────────────────────

const TRIGGER_OPTIONS = [
  { value: "RECORD_CREATED", label: "Record Created",  icon: "✨", description: "Fires when a new record is added" },
  { value: "RECORD_UPDATED", label: "Record Updated",  icon: "✏️", description: "Fires when any field is changed" },
  { value: "FIELD_CHANGED",  label: "Field Changed",   icon: "🔀", description: "Fires when a specific field changes" },
  { value: "RECORD_DELETED", label: "Record Deleted",  icon: "🗑️", description: "Fires when a record is removed" },
  { value: "MANUAL",         label: "Manual",          icon: "▶️", description: "Triggered manually by a user" },
];

const CONDITION_OPERATORS = [
  { value: "is",           label: "is" },
  { value: "is_not",       label: "is not" },
  { value: "contains",     label: "contains" },
  { value: "not_contains", label: "does not contain" },
  { value: "empty",        label: "is empty" },
  { value: "not_empty",    label: "is not empty" },
  { value: "gt",           label: "greater than" },
  { value: "lt",           label: "less than" },
];

const WF_ACTION_TYPES = [
  { value: "SET_FIELD",         label: "Set Field Value",        icon: "✏️", description: "Update a single field to a fixed value" },
  { value: "UPDATE_RECORD",     label: "Update Multiple Fields", icon: "📝", description: "Set values on several fields at once" },
  { value: "SEND_NOTIFICATION", label: "Send Notification",      icon: "🔔", description: "Push an in-app notification to users" },
  { value: "ASSIGN_USER",       label: "Assign User",            icon: "👤", description: "Set the assigned user on the record" },
  { value: "CREATE_RECORD",     label: "Create Record",          icon: "➕", description: "Automatically create a linked record" },
];

// ── Extended action type picker ───────────────────────────────────────────────

function ActionTypePicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selected = WF_ACTION_TYPES.find(t => t.value === value) || WF_ACTION_TYPES[0];

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={ref} className="relative flex-1">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-2.5 px-3 py-2.5 bg-white border border-gray-200 rounded-lg text-sm hover:border-violet-300 transition-colors text-left"
      >
        <span className="text-lg leading-none">{selected.icon}</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-800">{selected.label}</p>
          <p className="text-xs text-gray-400">{selected.description}</p>
        </div>
        <ChevronDown className={cn("w-4 h-4 text-gray-400 transition-transform shrink-0", open && "rotate-180")} />
      </button>
      {open && (
        <div className="absolute left-0 top-full mt-1 z-50 w-96 bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden">
          {WF_ACTION_TYPES.map(t => (
            <button
              key={t.value}
              type="button"
              onClick={() => { onChange(t.value); setOpen(false); }}
              className={cn(
                "flex items-start gap-3 p-3.5 w-full text-left hover:bg-violet-50 transition-colors border-b border-gray-50 last:border-0",
                value === t.value && "bg-violet-50"
              )}
            >
              <span className="text-xl mt-0.5 shrink-0 leading-none">{t.icon}</span>
              <div className="flex-1 min-w-0">
                <p className={cn("text-sm font-medium", value === t.value ? "text-violet-700" : "text-gray-900")}>{t.label}</p>
                <p className="text-xs text-gray-400 mt-0.5">{t.description}</p>
              </div>
              {value === t.value && <CheckCircle2 className="w-4 h-4 text-violet-500 ml-auto shrink-0 mt-1" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Action config ─────────────────────────────────────────────────────────────

function ActionConfigEditor({ action, fields, onChange }: {
  action: any; fields: any[]; onChange: (cfg: any) => void;
}) {
  const cfg = action.config;
  switch (action.type) {
    case "SET_FIELD":
      return (
        <div className="grid grid-cols-2 gap-3 mt-3">
          <div>
            <Label className="text-xs text-gray-500 mb-1.5 block">Field</Label>
            <Select value={cfg.field || ""} onValueChange={v => onChange({ ...cfg, field: v })}>
              <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Select field" /></SelectTrigger>
              <SelectContent>{fields.map(f => <SelectItem key={f.name} value={f.name} className="text-xs">{f.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs text-gray-500 mb-1.5 block">Value</Label>
            <Input className="h-9 text-sm" value={cfg.value || ""} onChange={e => onChange({ ...cfg, value: e.target.value })} placeholder="Value" />
          </div>
        </div>
      );
    case "UPDATE_RECORD": {
      const updates: any[] = cfg.updates || [{ field: "", value: "" }];
      return (
        <div className="mt-3 space-y-2">
          {updates.map((u: any, i: number) => (
            <div key={i} className="grid grid-cols-2 gap-2">
              <Select value={u.field} onValueChange={v => { const n = [...updates]; n[i] = { ...u, field: v }; onChange({ ...cfg, updates: n }); }}>
                <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Field" /></SelectTrigger>
                <SelectContent>{fields.map(f => <SelectItem key={f.name} value={f.name} className="text-xs">{f.label}</SelectItem>)}</SelectContent>
              </Select>
              <div className="flex gap-2">
                <Input className="h-9 text-sm" value={u.value} placeholder="Value"
                  onChange={e => { const n = [...updates]; n[i] = { ...u, value: e.target.value }; onChange({ ...cfg, updates: n }); }} />
                {updates.length > 1 && (
                  <button onClick={() => onChange({ ...cfg, updates: updates.filter((_: any, j: number) => j !== i) })}
                    className="text-gray-400 hover:text-red-500 shrink-0">
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
          <button className="text-xs text-violet-600 hover:text-violet-800 flex items-center gap-1 mt-1"
            onClick={() => onChange({ ...cfg, updates: [...updates, { field: "", value: "" }] })}>
            <Plus className="w-3 h-3" /> Add field
          </button>
        </div>
      );
    }
    case "SEND_NOTIFICATION":
      return (
        <div className="mt-3 space-y-2">
          <Input className="h-9 text-sm" value={cfg.title || ""} placeholder="Notification title" onChange={e => onChange({ ...cfg, title: e.target.value })} />
          <Textarea className="text-sm min-h-[72px] resize-none" value={cfg.message || ""} placeholder="Notification message" onChange={e => onChange({ ...cfg, message: e.target.value })} />
        </div>
      );
    default:
      return null;
  }
}

// ── Main page ─────────────────────────────────────────────────────────────────

const EMPTY_DRAFT = {
  name: "", description: "", trigger: "RECORD_CREATED", moduleId: "", conditions: [], actions: [],
};

export default function WorkflowBuilderPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { modules, fetchModules } = useModulesStore();

  const isNew = id === "new";
  const [draft, setDraft] = useState<any>(EMPTY_DRAFT);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  const showToast = (msg: string, type: "success" | "error" = "success") => {
    setToast({ msg, type }); setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => { fetchModules(); }, [fetchModules]);

  useEffect(() => {
    if (isNew) return;
    api.get(`/workflows/${id}`)
      .then(({ data }) => setDraft({
        name: data.name || "",
        description: data.description || "",
        trigger: data.trigger || "RECORD_CREATED",
        moduleId: data.moduleId || "",
        conditions: (data.conditions || []).map((c: any) => ({ ...c, id: c.id || uid() })),
        actions: (data.actions || []).map((a: any) => ({ ...a, id: a.id || uid() })),
      }))
      .catch(() => showToast("Failed to load workflow", "error"))
      .finally(() => setLoading(false));
  }, [id, isNew]);

  const mod = modules.find(m => m.id === draft.moduleId);
  const fields: any[] = mod?.fields || [];

  const set = (k: string, v: any) => { setDraft((d: any) => ({ ...d, [k]: v })); setDirty(true); };

  const handleSave = async () => {
    if (!draft.name.trim() || !draft.moduleId) return;
    setSaving(true);
    try {
      if (isNew) {
        const { data } = await api.post("/workflows", draft);
        showToast("Workflow created");
        router.replace(`/settings/workflows/${data.id}`);
      } else {
        await api.patch(`/workflows/${id}`, draft);
        showToast("Workflow saved");
        setDirty(false);
      }
    } catch {
      showToast("Failed to save", "error");
    } finally {
      setSaving(false);
    }
  };

  const canSave = draft.name.trim() && draft.moduleId && draft.actions.length > 0;

  if (loading) {
    return (
      <div className="fixed inset-0 z-40 bg-white flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-violet-500" />
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-40 bg-white flex flex-col overflow-hidden">
      {toast && <Toast msg={toast.msg} type={toast.type} />}

      {/* ── Top bar ───────────────────────────────────────────────────── */}
      <div className="h-14 shrink-0 border-b border-gray-200 bg-white flex items-center gap-4 px-4">
        <Link href="/settings/automation?tab=workflows">
          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>

        <div className="flex items-center gap-2 mr-4">
          <Workflow className="w-4 h-4 text-violet-500 shrink-0" />
          <span className="text-xs text-gray-400 font-medium">Workflows</span>
        </div>

        {/* Editable name */}
        <input
          value={draft.name}
          onChange={e => set("name", e.target.value)}
          placeholder="Workflow name..."
          className="flex-1 min-w-0 text-sm font-semibold text-gray-900 bg-transparent border-none outline-none placeholder:text-gray-400"
        />

        {dirty && (
          <span className="text-xs text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full shrink-0">
            Unsaved changes
          </span>
        )}

        <Button onClick={handleSave} disabled={saving || !canSave} className="gap-2 shrink-0">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {isNew ? "Create Workflow" : "Save"}
        </Button>
      </div>

      {/* ── Body ──────────────────────────────────────────────────────── */}
      <div className="flex-1 flex overflow-hidden">

        {/* Left panel — module + trigger */}
        <div className="w-80 shrink-0 border-r border-gray-200 flex flex-col overflow-hidden bg-gray-50/40">
          <div className="flex-1 overflow-y-auto p-5 space-y-6">

            {/* Description */}
            <div>
              <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 block">Description</Label>
              <Textarea
                value={draft.description}
                onChange={e => set("description", e.target.value)}
                placeholder="What does this workflow do?"
                rows={2}
                className="text-sm resize-none"
              />
            </div>

            {/* Module */}
            <div>
              <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 block">Module</Label>
              <Select value={draft.moduleId} onValueChange={v => set("moduleId", v)}>
                <SelectTrigger className="h-10 text-sm bg-white">
                  <SelectValue placeholder="Select module" />
                </SelectTrigger>
                <SelectContent>
                  {modules.map(m => <SelectItem key={m.id} value={m.id}>{m.icon} {m.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {/* Trigger */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="w-5 h-5 rounded-full bg-violet-600 text-white text-[10px] flex items-center justify-center font-bold">1</span>
                <Label className="text-xs font-semibold text-gray-700">When this happens</Label>
                <span className="text-[11px] text-gray-400">Trigger</span>
              </div>
              <div className="space-y-1.5">
                {TRIGGER_OPTIONS.map(t => (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => set("trigger", t.value)}
                    className={cn(
                      "flex items-center gap-3 p-3 rounded-xl border text-left w-full transition-all",
                      draft.trigger === t.value
                        ? "border-violet-400 bg-violet-50 shadow-sm"
                        : "border-gray-200 hover:border-gray-300 bg-white hover:bg-gray-50"
                    )}
                  >
                    <span className="text-xl leading-none shrink-0">{t.icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className={cn("text-xs font-semibold", draft.trigger === t.value ? "text-violet-700" : "text-gray-800")}>{t.label}</p>
                      <p className="text-[11px] text-gray-400 mt-0.5 leading-snug">{t.description}</p>
                    </div>
                    {draft.trigger === t.value && <CheckCircle2 className="w-4 h-4 text-violet-500 shrink-0" />}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right panel — conditions + actions */}
        <div className="flex-1 overflow-y-auto p-8 space-y-10 bg-white">

          {/* Conditions */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <span className="w-6 h-6 rounded-full bg-amber-500 text-white text-[11px] flex items-center justify-center font-bold">2</span>
                <div>
                  <p className="text-sm font-semibold text-gray-900">Only if</p>
                  <p className="text-xs text-gray-400">Conditions — optional, runs on every trigger if empty</p>
                </div>
              </div>
              <Button variant="outline" size="sm" className="h-8 gap-1.5" disabled={!draft.moduleId}
                onClick={() => set("conditions", [...draft.conditions, { id: uid(), field: fields[0]?.name || "", operator: "is", value: "", logic: "AND" }])}>
                <Plus className="w-3.5 h-3.5" /> Add Condition
              </Button>
            </div>

            {draft.conditions.length === 0 ? (
              <div className="border-2 border-dashed border-gray-100 rounded-xl px-6 py-8 text-center">
                <p className="text-sm text-gray-400">No conditions — workflow runs on every trigger event</p>
                {!draft.moduleId && <p className="text-xs text-gray-300 mt-1">Select a module first to add conditions</p>}
              </div>
            ) : (
              <div className="space-y-2">
                {draft.conditions.map((cond: any, idx: number) => (
                  <div key={cond.id} className="flex items-center gap-2 flex-wrap bg-amber-50/60 border border-amber-100 p-3 rounded-xl">
                    {idx > 0 && (
                      <Select value={cond.logic || "AND"} onValueChange={v => set("conditions", draft.conditions.map((c: any) => c.id === cond.id ? { ...c, logic: v } : c))}>
                        <SelectTrigger className="h-8 w-16 text-xs font-bold"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="AND" className="text-xs font-medium">AND</SelectItem>
                          <SelectItem value="OR" className="text-xs font-medium">OR</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                    <Select value={cond.field} onValueChange={v => set("conditions", draft.conditions.map((c: any) => c.id === cond.id ? { ...c, field: v } : c))}>
                      <SelectTrigger className="h-8 text-xs w-40"><SelectValue placeholder="Field" /></SelectTrigger>
                      <SelectContent>{fields.map((f: any) => <SelectItem key={f.name} value={f.name} className="text-xs">{f.label}</SelectItem>)}</SelectContent>
                    </Select>
                    <Select value={cond.operator} onValueChange={v => set("conditions", draft.conditions.map((c: any) => c.id === cond.id ? { ...c, operator: v } : c))}>
                      <SelectTrigger className="h-8 text-xs w-44"><SelectValue /></SelectTrigger>
                      <SelectContent>{CONDITION_OPERATORS.map(o => <SelectItem key={o.value} value={o.value} className="text-xs">{o.label}</SelectItem>)}</SelectContent>
                    </Select>
                    {!["empty", "not_empty"].includes(cond.operator) && (
                      <Input className="h-8 text-xs w-32" value={cond.value} placeholder="Value"
                        onChange={e => set("conditions", draft.conditions.map((c: any) => c.id === cond.id ? { ...c, value: e.target.value } : c))} />
                    )}
                    <button onClick={() => set("conditions", draft.conditions.filter((c: any) => c.id !== cond.id))}
                      className="ml-auto p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Actions */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <span className="w-6 h-6 rounded-full bg-green-600 text-white text-[11px] flex items-center justify-center font-bold">3</span>
                <div>
                  <p className="text-sm font-semibold text-gray-900">Then do this</p>
                  <p className="text-xs text-gray-400">Actions — executed in order</p>
                </div>
              </div>
              <Button variant="outline" size="sm" className="h-8 gap-1.5" disabled={!draft.moduleId}
                onClick={() => set("actions", [...draft.actions, { id: uid(), type: "SET_FIELD", config: {}, order: draft.actions.length }])}>
                <Plus className="w-3.5 h-3.5" /> Add Action
              </Button>
            </div>

            {draft.actions.length === 0 ? (
              <div className="border-2 border-dashed border-gray-100 rounded-xl px-6 py-8 text-center">
                <p className="text-sm text-gray-400">
                  {draft.moduleId ? "Add at least one action to execute" : "Select a module first"}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {draft.actions.map((action: any, idx: number) => (
                  <div key={action.id} className="border border-gray-200 rounded-xl p-4 bg-white shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-start gap-3">
                      <span className="w-6 h-6 rounded-full bg-green-100 text-green-700 text-xs flex items-center justify-center font-bold shrink-0 mt-0.5">{idx + 1}</span>
                      <div className="flex-1 min-w-0">
                        <ActionTypePicker
                          value={action.type}
                          onChange={v => set("actions", draft.actions.map((a: any) => a.id === action.id ? { ...a, type: v, config: {} } : a))}
                        />
                        <ActionConfigEditor
                          action={action}
                          fields={fields}
                          onChange={cfg => set("actions", draft.actions.map((a: any) => a.id === action.id ? { ...a, config: cfg } : a))}
                        />
                      </div>
                      <button
                        onClick={() => set("actions", draft.actions.filter((a: any) => a.id !== action.id))}
                        className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50 shrink-0 mt-0.5"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
