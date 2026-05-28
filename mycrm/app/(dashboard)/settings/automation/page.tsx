"use client";
import { useEffect, useState, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Zap, Plus, ArrowLeft, Workflow, GitBranch,
  Play, Pause, Trash2, Edit2, CheckCircle2, AlertCircle,
  ArrowRight, Loader2, X, Settings2, ChevronRight, Circle,
  Lock, ToggleRight,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { api } from "@/lib/api";
import { useModulesStore } from "@/store/modules.store";
import { cn } from "@/lib/utils";

// ── Shared helpers ────────────────────────────────────────────────────────────

const uid = () => `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

function Toast({ msg, type }: { msg: string; type: "success" | "error" }) {
  return (
    <div className={cn(
      "fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-xl border shadow-lg text-sm font-medium",
      type === "success" ? "bg-green-50 border-green-200 text-green-700" : "bg-red-50 border-red-200 text-red-700",
    )}>
      {type === "success" ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
      {msg}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// WORKFLOWS SECTION
// ════════════════════════════════════════════════════════════════════════════

const TRIGGER_OPTIONS = [
  { value: "RECORD_CREATED", label: "Record Created",  icon: "✨", description: "Fires when a new record is added" },
  { value: "RECORD_UPDATED", label: "Record Updated",  icon: "✏️", description: "Fires when any field is changed" },
  { value: "FIELD_CHANGED",  label: "Field Changed",   icon: "🔀", description: "Fires when a specific field changes" },
  { value: "RECORD_DELETED", label: "Record Deleted",  icon: "🗑️", description: "Fires when a record is deleted" },
  { value: "MANUAL",         label: "Manual",          icon: "▶️", description: "Triggered manually by a user" },
];
const TRIGGER_ICONS: Record<string, any> = {
  RECORD_CREATED: Zap, RECORD_UPDATED: Edit2, FIELD_CHANGED: Settings2,
  RECORD_DELETED: Trash2, MANUAL: Play,
};
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
  { value: "SET_FIELD",         label: "Set Field Value",        icon: "✏️" },
  { value: "UPDATE_RECORD",     label: "Update Multiple Fields", icon: "📝" },
  { value: "SEND_NOTIFICATION", label: "Send Notification",      icon: "🔔" },
  { value: "ASSIGN_USER",       label: "Assign User",            icon: "👤" },
  { value: "CREATE_RECORD",     label: "Create Record",          icon: "➕" },
];

function ActionConfigEditor({ action, fields, modules, onChange }: {
  action: any; fields: any[]; modules: any[]; onChange: (cfg: any) => void;
}) {
  const cfg = action.config;
  switch (action.type) {
    case "SET_FIELD":
      return (
        <div className="grid grid-cols-2 gap-2 mt-2">
          <div>
            <Label className="text-xs">Field</Label>
            <Select value={cfg.field || ""} onValueChange={v => onChange({ ...cfg, field: v })}>
              <SelectTrigger className="h-8 text-xs mt-1"><SelectValue placeholder="Select field" /></SelectTrigger>
              <SelectContent>{fields.map(f => <SelectItem key={f.name} value={f.name} className="text-xs">{f.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Value</Label>
            <Input className="h-8 text-xs mt-1" value={cfg.value || ""} onChange={e => onChange({ ...cfg, value: e.target.value })} placeholder="Value" />
          </div>
        </div>
      );
    case "UPDATE_RECORD": {
      const updates: any[] = cfg.updates || [{ field: "", value: "" }];
      return (
        <div className="mt-2 space-y-2">
          {updates.map((u: any, i: number) => (
            <div key={i} className="grid grid-cols-2 gap-2">
              <Select value={u.field} onValueChange={v => { const next = [...updates]; next[i] = { ...u, field: v }; onChange({ ...cfg, updates: next }); }}>
                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Field" /></SelectTrigger>
                <SelectContent>{fields.map(f => <SelectItem key={f.name} value={f.name} className="text-xs">{f.label}</SelectItem>)}</SelectContent>
              </Select>
              <div className="flex gap-1">
                <Input className="h-8 text-xs" value={u.value} placeholder="Value"
                  onChange={e => { const next = [...updates]; next[i] = { ...u, value: e.target.value }; onChange({ ...cfg, updates: next }); }} />
                {updates.length > 1 && <button onClick={() => onChange({ ...cfg, updates: updates.filter((_: any, j: number) => j !== i) })} className="text-gray-400 hover:text-red-500"><X className="w-3.5 h-3.5" /></button>}
              </div>
            </div>
          ))}
          <button className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1" onClick={() => onChange({ ...cfg, updates: [...updates, { field: "", value: "" }] })}>
            <Plus className="w-3 h-3" /> Add field
          </button>
        </div>
      );
    }
    case "SEND_NOTIFICATION":
      return (
        <div className="mt-2 space-y-2">
          <Input className="h-8 text-xs" value={cfg.title || ""} placeholder="Title" onChange={e => onChange({ ...cfg, title: e.target.value })} />
          <Textarea className="text-xs min-h-[56px]" value={cfg.message || ""} placeholder="Message" onChange={e => onChange({ ...cfg, message: e.target.value })} />
        </div>
      );
    default:
      return null;
  }
}

function WorkflowBuilderDialog({ open, onClose, onSave, modules, initial }: {
  open: boolean; onClose: () => void; onSave: (data: any) => Promise<void>;
  modules: any[]; initial?: any;
}) {
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState<any>({ name: "", description: "", trigger: "RECORD_CREATED", moduleId: "", conditions: [], actions: [] });

  useEffect(() => {
    if (open) {
      setDraft(initial ? {
        name: initial.name || "", description: initial.description || "",
        trigger: initial.trigger || "RECORD_CREATED", moduleId: initial.moduleId || "",
        conditions: (initial.conditions || []).map((c: any) => ({ ...c, id: c.id || uid() })),
        actions: (initial.actions || []).map((a: any) => ({ ...a, id: a.id || uid() })),
      } : { name: "", description: "", trigger: "RECORD_CREATED", moduleId: "", conditions: [], actions: [] });
    }
  }, [open, initial]);

  const mod = modules.find(m => m.id === draft.moduleId);
  const fields: any[] = mod?.fields || [];
  const set = (k: string, v: any) => setDraft((d: any) => ({ ...d, [k]: v }));

  const handleSave = async () => {
    if (!draft.name.trim() || !draft.moduleId) return;
    setSaving(true);
    try { await onSave(draft); onClose(); } finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Workflow className="w-5 h-5 text-violet-600" />
            {initial ? "Edit Workflow" : "New Workflow"}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-5 py-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Workflow Name *</Label>
              <Input value={draft.name} onChange={e => set("name", e.target.value)} placeholder="e.g. Auto-assign on create" className="h-9" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Module *</Label>
              <Select value={draft.moduleId} onValueChange={v => set("moduleId", v)}>
                <SelectTrigger className="h-9"><SelectValue placeholder="Select module" /></SelectTrigger>
                <SelectContent>{modules.map(m => <SelectItem key={m.id} value={m.id}>{m.icon} {m.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Description</Label>
            <Input value={draft.description} onChange={e => set("description", e.target.value)} placeholder="Optional" className="h-9" />
          </div>
          {/* Trigger */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-violet-600 text-white text-xs flex items-center justify-center font-bold">1</div>
              <Label className="text-sm font-semibold">Trigger</Label>
            </div>
            <div className="grid grid-cols-2 gap-2 pl-8">
              {TRIGGER_OPTIONS.map(t => (
                <button key={t.value} onClick={() => set("trigger", t.value)}
                  className={cn("p-3 rounded-lg border text-left transition-all", draft.trigger === t.value ? "border-violet-500 bg-violet-50" : "border-gray-200 hover:border-gray-300 bg-white")}>
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{t.icon}</span>
                    <div>
                      <p className={cn("text-xs font-medium", draft.trigger === t.value ? "text-violet-700" : "text-gray-800")}>{t.label}</p>
                      <p className="text-[10px] text-gray-400 mt-0.5">{t.description}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
          {/* Conditions */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-amber-500 text-white text-xs flex items-center justify-center font-bold">2</div>
                <Label className="text-sm font-semibold">Conditions</Label>
                <span className="text-xs text-gray-400">(optional)</span>
              </div>
              <Button variant="outline" size="sm" className="h-7 text-xs gap-1" disabled={!draft.moduleId}
                onClick={() => set("conditions", [...draft.conditions, { id: uid(), field: fields[0]?.name || "", operator: "is", value: "", logic: "AND" }])}>
                <Plus className="w-3 h-3" /> Add
              </Button>
            </div>
            {draft.conditions.length === 0 ? (
              <p className="pl-8 text-xs text-gray-400">No conditions — runs on every trigger.</p>
            ) : (
              <div className="pl-8 space-y-2">
                {draft.conditions.map((cond: any, idx: number) => (
                  <div key={cond.id} className="flex items-center gap-2 flex-wrap">
                    {idx > 0 && (
                      <Select value={cond.logic || "AND"} onValueChange={v => set("conditions", draft.conditions.map((c: any) => c.id === cond.id ? { ...c, logic: v } : c))}>
                        <SelectTrigger className="h-7 w-16 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent><SelectItem value="AND" className="text-xs">AND</SelectItem><SelectItem value="OR" className="text-xs">OR</SelectItem></SelectContent>
                      </Select>
                    )}
                    <Select value={cond.field} onValueChange={v => set("conditions", draft.conditions.map((c: any) => c.id === cond.id ? { ...c, field: v } : c))}>
                      <SelectTrigger className="h-7 text-xs w-36"><SelectValue placeholder="Field" /></SelectTrigger>
                      <SelectContent>{fields.map((f: any) => <SelectItem key={f.name} value={f.name} className="text-xs">{f.label}</SelectItem>)}</SelectContent>
                    </Select>
                    <Select value={cond.operator} onValueChange={v => set("conditions", draft.conditions.map((c: any) => c.id === cond.id ? { ...c, operator: v } : c))}>
                      <SelectTrigger className="h-7 text-xs w-36"><SelectValue /></SelectTrigger>
                      <SelectContent>{CONDITION_OPERATORS.map(o => <SelectItem key={o.value} value={o.value} className="text-xs">{o.label}</SelectItem>)}</SelectContent>
                    </Select>
                    {!["empty", "not_empty"].includes(cond.operator) && (
                      <Input className="h-7 text-xs w-28" value={cond.value} placeholder="Value"
                        onChange={e => set("conditions", draft.conditions.map((c: any) => c.id === cond.id ? { ...c, value: e.target.value } : c))} />
                    )}
                    <button onClick={() => set("conditions", draft.conditions.filter((c: any) => c.id !== cond.id))} className="text-gray-400 hover:text-red-500"><X className="w-3.5 h-3.5" /></button>
                  </div>
                ))}
              </div>
            )}
          </div>
          {/* Actions */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-green-600 text-white text-xs flex items-center justify-center font-bold">3</div>
                <Label className="text-sm font-semibold">Actions</Label>
                <span className="text-xs text-gray-400">(executed in order)</span>
              </div>
              <Button variant="outline" size="sm" className="h-7 text-xs gap-1" disabled={!draft.moduleId}
                onClick={() => set("actions", [...draft.actions, { id: uid(), type: "SET_FIELD", config: {}, order: draft.actions.length }])}>
                <Plus className="w-3 h-3" /> Add
              </Button>
            </div>
            {draft.actions.length === 0 ? (
              <p className="pl-8 text-xs text-gray-400">No actions added yet.</p>
            ) : (
              <div className="pl-8 space-y-3">
                {draft.actions.map((action: any, idx: number) => (
                  <div key={action.id} className="border border-gray-200 rounded-lg p-3 bg-white">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-gray-100 text-gray-600 text-xs flex items-center justify-center font-medium shrink-0">{idx + 1}</span>
                      <Select value={action.type} onValueChange={v => set("actions", draft.actions.map((a: any) => a.id === action.id ? { ...a, type: v, config: {} } : a))}>
                        <SelectTrigger className="h-8 text-xs flex-1"><SelectValue /></SelectTrigger>
                        <SelectContent>{WF_ACTION_TYPES.map(t => <SelectItem key={t.value} value={t.value} className="text-xs">{t.icon} {t.label}</SelectItem>)}</SelectContent>
                      </Select>
                      <button onClick={() => set("actions", draft.actions.filter((a: any) => a.id !== action.id))} className="text-gray-400 hover:text-red-500 shrink-0"><X className="w-3.5 h-3.5" /></button>
                    </div>
                    <ActionConfigEditor action={action} fields={fields} modules={modules} onChange={cfg => set("actions", draft.actions.map((a: any) => a.id === action.id ? { ...a, config: cfg } : a))} />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving || !draft.name.trim() || !draft.moduleId || draft.actions.length === 0}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            {initial ? "Update Workflow" : "Create Workflow"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function WorkflowsTab({ modules }: { modules: any[] }) {
  const [workflows, setWorkflows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showBuilder, setShowBuilder] = useState(false);
  const [editingWf, setEditingWf] = useState<any>(null);

  const fetch = async () => {
    try { const { data } = await api.get("/workflows"); setWorkflows(data); }
    catch {} finally { setLoading(false); }
  };
  useEffect(() => { fetch(); }, []);

  const toggle = async (id: string) => {
    try { const { data } = await api.patch(`/workflows/${id}/toggle`); setWorkflows(p => p.map(w => w.id === id ? data : w)); } catch {}
  };
  const remove = async (id: string) => {
    if (!confirm("Delete this workflow?")) return;
    try { await api.delete(`/workflows/${id}`); setWorkflows(p => p.filter(w => w.id !== id)); } catch {}
  };
  const save = async (draft: any) => {
    if (editingWf) { const { data } = await api.patch(`/workflows/${editingWf.id}`, draft); setWorkflows(p => p.map(w => w.id === editingWf.id ? data : w)); }
    else { const { data } = await api.post("/workflows", draft); setWorkflows(p => [data, ...p]); }
    setEditingWf(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">Automate actions when records change.</p>
        <Button className="gap-2" size="sm" onClick={() => { setEditingWf(null); setShowBuilder(true); }}>
          <Plus className="w-4 h-4" /> New Workflow
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40"><Loader2 className="w-5 h-5 animate-spin text-violet-500" /></div>
      ) : workflows.length === 0 ? (
        <div className="text-center py-16 border-2 border-dashed border-gray-200 rounded-xl space-y-3">
          <Workflow className="w-12 h-12 text-gray-300 mx-auto" />
          <p className="text-sm font-medium text-gray-600">No workflows yet</p>
          <p className="text-xs text-gray-400 max-w-xs mx-auto">Automate processes with triggers, conditions, and actions.</p>
          <Button size="sm" className="gap-2 mt-2" onClick={() => setShowBuilder(true)}>
            <Plus className="w-4 h-4" /> Create First Workflow
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {workflows.map(wf => {
            const TriggerIcon = TRIGGER_ICONS[wf.trigger] || Zap;
            return (
              <Card key={wf.id} className={cn("transition-all", !wf.isActive && "opacity-60")}>
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-start gap-3">
                      <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center shrink-0", wf.isActive ? "bg-green-50" : "bg-gray-50")}>
                        <TriggerIcon className={cn("w-5 h-5", wf.isActive ? "text-green-600" : "text-gray-400")} />
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-gray-900 truncate text-sm">{wf.name}</p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {TRIGGER_OPTIONS.find(t => t.value === wf.trigger)?.label ?? wf.trigger}
                          {wf.moduleId && " · " + (modules.find(m => m.id === wf.moduleId)?.name || "Module")}
                        </p>
                      </div>
                    </div>
                    <Switch checked={wf.isActive} onCheckedChange={() => toggle(wf.id)} className="scale-75" />
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-500 mb-3 flex-wrap">
                    {(wf.conditions?.length ?? 0) > 0 && <Badge variant="outline" className="text-xs">{wf.conditions.length} cond.</Badge>}
                    <ArrowRight className="w-3 h-3 text-gray-300" />
                    {(wf.actions || []).slice(0, 3).map((a: any, i: number) => (
                      <Badge key={i} className="text-xs font-normal bg-violet-50 text-violet-700 border-violet-200">
                        {WF_ACTION_TYPES.find(t => t.value === a.type)?.label ?? a.type}
                      </Badge>
                    ))}
                  </div>
                  <div className="flex items-center gap-2 pt-2 border-t border-gray-50">
                    <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={() => { setEditingWf(wf); setShowBuilder(true); }}>
                      <Edit2 className="w-3 h-3" /> Edit
                    </Button>
                    <Button variant="ghost" size="sm" className="h-7 text-xs text-red-500 hover:text-red-700 gap-1" onClick={() => remove(wf.id)}>
                      <Trash2 className="w-3 h-3" /> Delete
                    </Button>
                    <Badge className={cn("ml-auto text-xs", wf.isActive ? "bg-green-50 text-green-700 border-green-200" : "bg-gray-50 text-gray-500")}>
                      {wf.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <WorkflowBuilderDialog open={showBuilder} onClose={() => { setShowBuilder(false); setEditingWf(null); }} onSave={save} modules={modules} initial={editingWf} />
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// BLUEPRINTS SECTION
// ════════════════════════════════════════════════════════════════════════════

interface Blueprint {
  id: string; name: string; description?: string; moduleId: string;
  statusFieldName: string; phases: any[]; transitions: any[];
  isActive: boolean; module?: { id: string; name: string; slug: string; icon?: string };
}

const STATUS_FIELD_TYPES = ["STATUS", "DROPDOWN", "RADIO"];

function CreateBlueprintWizard({ open, onClose, onCreated }: {
  open: boolean; onClose: () => void; onCreated: (bp: Blueprint) => void;
}) {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [mods, setMods] = useState<any[]>([]);
  const [selectedMod, setSelectedMod] = useState<any>(null);
  const [statusField, setStatusField] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setStep(1); setSelectedMod(null); setStatusField(""); setName(""); setDescription("");
      setLoading(true);
      api.get("/modules").then(({ data }) => setMods((data || []).filter((m: any) => m.isActive))).catch(() => {}).finally(() => setLoading(false));
    }
  }, [open]);

  const sfFields = (selectedMod?.fields || []).filter((f: any) => STATUS_FIELD_TYPES.includes(f.type) && f.isActive);

  const handleCreate = async () => {
    if (!name.trim() || !selectedMod || !statusField) return;
    const field = sfFields.find((f: any) => f.name === statusField);
    const phases = (field?.options || []).map((o: any, i: number) => ({ id: o.value, name: o.value, label: o.label, color: o.color || "#6366f1", order: i }));
    setSaving(true);
    try {
      const { data } = await api.post("/blueprints", { name: name.trim(), description: description.trim() || undefined, moduleId: selectedMod.id, statusFieldName: statusField, phases, transitions: [], fieldLocks: {} });
      onCreated(data);
      onClose();
      router.push(`/settings/blueprints/${data.id}`);
    } catch {} finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GitBranch className="w-5 h-5 text-indigo-600" />
            {step === 1 ? "Select Module" : step === 2 ? "Select Phase Field" : "Blueprint Details"}
          </DialogTitle>
          <DialogDescription>
            {step === 1 && "Choose which module this Blueprint will control."}
            {step === 2 && "Select the field whose values become the process phases."}
            {step === 3 && "Name your Blueprint."}
          </DialogDescription>
        </DialogHeader>

        {/* Step indicator */}
        <div className="flex items-center gap-2 py-1">
          {([1, 2, 3] as const).map(s => (
            <div key={s} className={cn("flex items-center gap-1 text-xs font-medium", step >= s ? "text-indigo-600" : "text-gray-400")}>
              <div className={cn("w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold",
                step > s ? "bg-indigo-600 text-white" : step === s ? "bg-indigo-100 text-indigo-700 border border-indigo-300" : "bg-gray-100 text-gray-400")}>
                {step > s ? "✓" : s}
              </div>
              {s < 3 && <div className={cn("w-8 h-px", step > s ? "bg-indigo-300" : "bg-gray-200")} />}
            </div>
          ))}
        </div>

        {step === 1 && (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {loading ? <div className="py-8 text-center"><Loader2 className="w-5 h-5 animate-spin mx-auto text-gray-400" /></div>
              : mods.map(mod => (
                <button key={mod.id} onClick={() => { setSelectedMod(mod); setStatusField(""); setStep(2); }}
                  className="w-full flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:border-indigo-300 hover:bg-indigo-50/50 text-left transition-colors group">
                  <div className="w-8 h-8 rounded-lg bg-gray-100 group-hover:bg-indigo-100 flex items-center justify-center text-sm">{mod.icon || "📋"}</div>
                  <div className="flex-1 min-w-0"><p className="text-sm font-medium text-gray-900">{mod.name}</p></div>
                  <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-indigo-500" />
                </button>
              ))}
          </div>
        )}

        {step === 2 && selectedMod && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg text-sm">
              <span>{selectedMod.icon || "📋"}</span><span className="font-medium text-gray-700">{selectedMod.name}</span>
              <button onClick={() => setStep(1)} className="ml-auto text-xs text-gray-400 hover:text-gray-600">Change</button>
            </div>
            {sfFields.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-6">No Status/Dropdown/Radio fields found.</p>
            ) : sfFields.map((f: any) => (
              <button key={f.id} onClick={() => { setStatusField(f.name); setName(`${selectedMod.name} Blueprint`); setStep(3); }}
                className="w-full flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:border-indigo-300 hover:bg-indigo-50/50 text-left transition-colors group">
                <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center text-xs font-bold text-purple-700">
                  {f.type === "STATUS" ? "●" : f.type === "DROPDOWN" ? "▼" : "◉"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">{f.label}</p>
                  <p className="text-xs text-gray-400">{(f.options || []).slice(0, 3).map((o: any) => o.label).join(", ")}</p>
                </div>
                <div className="flex gap-1">{(f.options || []).slice(0, 4).map((o: any) => <div key={o.value} className="w-3 h-3 rounded-full border border-white" style={{ backgroundColor: o.color || "#6366f1" }} />)}</div>
                <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-indigo-500" />
              </button>
            ))}
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-lg text-xs text-indigo-700 space-y-1">
              <p><span className="font-semibold">Module:</span> {selectedMod?.name}</p>
              <p><span className="font-semibold">Phase Field:</span> {sfFields.find((f: any) => f.name === statusField)?.label || statusField}</p>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm">Blueprint Name</Label>
              <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Student Admission Process" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm">Description <span className="text-gray-400 font-normal">(optional)</span></Label>
              <Textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} className="resize-none text-sm" />
            </div>
          </div>
        )}

        <DialogFooter>
          {step > 1 && <Button variant="outline" onClick={() => setStep(s => (s - 1) as 1 | 2 | 3)}>Back</Button>}
          {step === 3 && (
            <Button onClick={handleCreate} disabled={!name.trim() || saving} className="gap-2">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <GitBranch className="w-4 h-4" />}
              Create Blueprint
            </Button>
          )}
          {step < 3 && <Button variant="outline" onClick={onClose}>Cancel</Button>}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function BlueprintsTab() {
  const [blueprints, setBlueprints] = useState<Blueprint[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  const showToast = (msg: string, type: "success" | "error" = "success") => { setToast({ msg, type }); setTimeout(() => setToast(null), 3000); };

  const load = useCallback(async () => {
    try { const { data } = await api.get("/blueprints"); setBlueprints(data || []); } catch {} finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const handleToggle = async (id: string, active: boolean) => {
    setBlueprints(p => p.map(b => b.id === id ? { ...b, isActive: active } : b));
    try { await api.patch(`/blueprints/${id}`, { isActive: active }); showToast(active ? "Blueprint activated" : "Blueprint deactivated"); }
    catch { setBlueprints(p => p.map(b => b.id === id ? { ...b, isActive: !active } : b)); showToast("Failed to update", "error"); }
  };
  const handleDelete = async (id: string) => {
    if (!confirm("Delete this Blueprint?")) return;
    try { await api.delete(`/blueprints/${id}`); setBlueprints(p => p.filter(b => b.id !== id)); showToast("Blueprint deleted"); }
    catch { showToast("Failed to delete", "error"); }
  };

  return (
    <div className="space-y-4">
      {toast && <Toast msg={toast.msg} type={toast.type} />}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">Define process flows, phase transitions, and field locking rules.</p>
        <Button size="sm" className="gap-2" onClick={() => setCreateOpen(true)}>
          <Plus className="w-4 h-4" /> New Blueprint
        </Button>
      </div>

      <div className="flex items-start gap-3 p-4 bg-indigo-50 border border-indigo-100 rounded-xl">
        <Lock className="w-4 h-4 text-indigo-500 mt-0.5 shrink-0" />
        <p className="text-xs text-indigo-700 leading-relaxed">
          Blueprints control record lifecycles — define phases, configure field locks per phase, and add IF/ELSE rule logic for automated transitions.
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40"><Loader2 className="w-5 h-5 animate-spin text-indigo-500" /></div>
      ) : blueprints.length === 0 ? (
        <div className="border-2 border-dashed border-gray-200 rounded-xl p-14 text-center space-y-3">
          <GitBranch className="w-12 h-12 text-gray-300 mx-auto" />
          <p className="text-sm font-medium text-gray-600">No Blueprints yet</p>
          <p className="text-xs text-gray-400 max-w-xs mx-auto">Create your first Blueprint to control record lifecycles.</p>
          <Button size="sm" className="gap-2 mt-2" onClick={() => setCreateOpen(true)}><Plus className="w-4 h-4" /> Create Blueprint</Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {blueprints.map(bp => {
            const phases = bp.phases as any[];
            const transitions = bp.transitions as any[];
            return (
              <div key={bp.id} className={cn("bg-white border rounded-xl overflow-hidden hover:shadow-sm transition-all", !bp.isActive && "opacity-60")}>
                <div className="h-1.5 flex">
                  {phases.slice(0, 8).map((p, i) => <div key={i} className="flex-1" style={{ backgroundColor: p.color || "#6366f1" }} />)}
                  {phases.length === 0 && <div className="flex-1 bg-gray-200" />}
                </div>
                <div className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center shrink-0"><GitBranch className="w-4 h-4 text-indigo-600" /></div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">{bp.name}</p>
                      {bp.module && <p className="text-xs text-gray-500 mt-0.5">{bp.module.icon || "📋"} {bp.module.name}</p>}
                    </div>
                    <Switch checked={bp.isActive} onCheckedChange={v => handleToggle(bp.id, v)} className="scale-75 shrink-0" />
                  </div>
                  {phases.length > 0 && (
                    <div className="mt-3 flex items-center gap-1.5 flex-wrap">
                      {phases.slice(0, 4).map((p: any, i: number) => (
                        <span key={i} className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full border"
                          style={{ borderColor: p.color + "44", backgroundColor: p.color + "11", color: p.color }}>
                          <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: p.color }} />
                          {p.label || p.name}
                        </span>
                      ))}
                      {phases.length > 4 && <span className="text-[10px] text-gray-400">+{phases.length - 4}</span>}
                    </div>
                  )}
                  <div className="mt-3 flex items-center gap-2">
                    <Link href={`/settings/blueprints/${bp.id}`} className="flex-1">
                      <Button size="sm" variant="outline" className="w-full gap-1.5 h-8 text-xs">
                        <Edit2 className="w-3.5 h-3.5" /> Edit Blueprint
                      </Button>
                    </Link>
                    <Button size="sm" variant="ghost" onClick={() => handleDelete(bp.id)} className="h-8 w-8 p-0 text-gray-400 hover:text-red-500 hover:bg-red-50">
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <CreateBlueprintWizard open={createOpen} onClose={() => setCreateOpen(false)} onCreated={() => load()} />
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ════════════════════════════════════════════════════════════════════════════

const TABS = [
  { id: "workflows",  label: "Workflows",  icon: Workflow,   color: "text-green-600" },
  { id: "blueprints", label: "Blueprints", icon: GitBranch,  color: "text-indigo-600" },
] as const;

type TabId = typeof TABS[number]["id"];

function AutomationPageInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { modules, fetchModules } = useModulesStore();
  const activeTab: TabId = (searchParams.get("tab") as TabId) || "workflows";

  useEffect(() => { fetchModules(); }, [fetchModules]);

  const setTab = (t: TabId) => router.push(`/settings/automation?tab=${t}`, { scroll: false });

  return (
    <div className="space-y-6 pb-10">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/settings">
          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Zap className="w-5 h-5 text-violet-600" /> Automation
          </h1>
          <p className="text-sm text-gray-500">Workflows, blueprints, and rule-based process automation.</p>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex items-center gap-1 border-b border-gray-200">
        {TABS.map(({ id, label, icon: Icon, color }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={cn(
              "flex items-center gap-2 px-5 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors",
              activeTab === id
                ? "border-violet-600 text-violet-600"
                : "border-transparent text-gray-500 hover:text-gray-700",
            )}
          >
            <Icon className={cn("w-4 h-4", activeTab === id ? "text-violet-600" : "text-gray-400")} />
            {label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === "workflows"  && <WorkflowsTab modules={modules} />}
      {activeTab === "blueprints" && <BlueprintsTab />}
    </div>
  );
}

export default function AutomationPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-64"><Loader2 className="w-6 h-6 animate-spin text-violet-500" /></div>}>
      <AutomationPageInner />
    </Suspense>
  );
}
