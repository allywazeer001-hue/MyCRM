"use client";
import { useEffect, useState } from "react";
import {
  Workflow, Plus, Play, Pause, Zap, Clock, Bell, Globe, Trash2,
  ChevronDown, ChevronRight, X, Settings2, CheckCircle2, AlertCircle,
  ArrowRight, Loader2, Edit2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { api } from "@/lib/api";
import { useModulesStore } from "@/store/modules.store";
import { cn } from "@/lib/utils";

// ── Types ─────────────────────────────────────────────────────────────────────

interface WorkflowCondition {
  id: string;
  field: string;
  operator: string;
  value: string;
  logic?: "AND" | "OR";
}

interface WorkflowAction {
  id: string;
  type: string;
  config: Record<string, any>;
  order: number;
}

interface WorkflowDraft {
  name: string;
  description: string;
  trigger: string;
  moduleId: string;
  conditions: WorkflowCondition[];
  actions: WorkflowAction[];
}

// ── Constants ─────────────────────────────────────────────────────────────────

const TRIGGER_OPTIONS = [
  { value: "RECORD_CREATED", label: "Record Created", icon: "✨", description: "Fires when a new record is added" },
  { value: "RECORD_UPDATED", label: "Record Updated", icon: "✏️", description: "Fires when any field is changed" },
  { value: "FIELD_CHANGED",  label: "Field Changed",  icon: "🔀", description: "Fires when a specific field changes" },
  { value: "RECORD_DELETED", label: "Record Deleted", icon: "🗑️", description: "Fires when a record is deleted" },
  { value: "MANUAL",         label: "Manual",         icon: "▶️", description: "Triggered manually by a user" },
];

const TRIGGER_ICONS: Record<string, any> = {
  RECORD_CREATED: Zap,
  RECORD_UPDATED: Edit2,
  FIELD_CHANGED: Settings2,
  RECORD_DELETED: Trash2,
  SCHEDULED: Clock,
  MANUAL: Play,
  WEBHOOK: Globe,
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

const ACTION_TYPES = [
  { value: "SET_FIELD",          label: "Set Field Value",     icon: "✏️" },
  { value: "UPDATE_RECORD",      label: "Update Multiple Fields", icon: "📝" },
  { value: "SEND_NOTIFICATION",  label: "Send Notification",   icon: "🔔" },
  { value: "ASSIGN_USER",        label: "Assign User",         icon: "👤" },
  { value: "CREATE_RECORD",      label: "Create Record",       icon: "➕" },
];

const needsValue = (op: string) => !["empty", "not_empty"].includes(op);

const OPTION_FIELD_TYPES = ["DROPDOWN", "STATUS", "RADIO", "SELECT", "MULTI_SELECT", "CHECKBOX"];

function isOptionField(fields: any[], fieldName: string) {
  const f = fields.find(f => f.name === fieldName);
  return f && OPTION_FIELD_TYPES.includes(f.type?.toUpperCase());
}

function fieldOptions(fields: any[], fieldName: string): { label: string; value: string }[] {
  const f = fields.find(f => f.name === fieldName);
  return (f?.options ?? []).map((o: any) => ({ label: o.label, value: o.value ?? o.label }));
}

function uid() { return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`; }

// ── Action Config Editor ──────────────────────────────────────────────────────

function ActionConfigEditor({
  action, fields, modules, onChange,
}: {
  action: WorkflowAction;
  fields: any[];
  modules: any[];
  onChange: (cfg: Record<string, any>) => void;
}) {
  const cfg = action.config;

  switch (action.type) {
    case "SET_FIELD":
      return (
        <div className="grid grid-cols-2 gap-2 mt-2">
          <div>
            <Label className="text-xs">Field</Label>
            <Select value={cfg.field || ""} onValueChange={(v) => onChange({ ...cfg, field: v, value: "" })}>
              <SelectTrigger className="h-8 text-xs mt-1"><SelectValue placeholder="Select field" /></SelectTrigger>
              <SelectContent>{fields.map(f => <SelectItem key={f.name} value={f.name} className="text-xs">{f.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Value</Label>
            <div className="flex gap-1 mt-1">
              {isOptionField(fields, cfg.field) ? (
                <Select value={cfg.value || ""} onValueChange={(v) => onChange({ ...cfg, value: v })}>
                  <SelectTrigger className="h-8 text-xs flex-1"><SelectValue placeholder="Select value" /></SelectTrigger>
                  <SelectContent>
                    {fieldOptions(fields, cfg.field).map(o => (
                      <SelectItem key={o.value} value={o.value} className="text-xs">{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  className="h-8 text-xs flex-1"
                  value={cfg.value || ""}
                  onChange={(e) => onChange({ ...cfg, value: e.target.value })}
                  placeholder="Value or __NOW__ for current date"
                />
              )}
            </div>
          </div>
        </div>
      );

    case "UPDATE_RECORD": {
      const updates: { field: string; value: string }[] = cfg.updates || [{ field: "", value: "" }];
      return (
        <div className="mt-2 space-y-2">
          {updates.map((u, i) => (
            <div key={i} className="grid grid-cols-2 gap-2 items-center">
              <Select value={u.field} onValueChange={(v) => {
                const next = [...updates]; next[i] = { field: v, value: "" };
                onChange({ ...cfg, updates: next });
              }}>
                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Field" /></SelectTrigger>
                <SelectContent>{fields.map(f => <SelectItem key={f.name} value={f.name} className="text-xs">{f.label}</SelectItem>)}</SelectContent>
              </Select>
              <div className="flex gap-1">
                {isOptionField(fields, u.field) ? (
                  <Select value={u.value} onValueChange={(v) => {
                    const next = [...updates]; next[i] = { ...u, value: v };
                    onChange({ ...cfg, updates: next });
                  }}>
                    <SelectTrigger className="h-8 text-xs flex-1"><SelectValue placeholder="Select value" /></SelectTrigger>
                    <SelectContent>
                      {fieldOptions(fields, u.field).map(o => (
                        <SelectItem key={o.value} value={o.value} className="text-xs">{o.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input className="h-8 text-xs flex-1" value={u.value} placeholder="Value"
                    onChange={(e) => { const next = [...updates]; next[i] = { ...u, value: e.target.value }; onChange({ ...cfg, updates: next }); }} />
                )}
                {updates.length > 1 && (
                  <button onClick={() => onChange({ ...cfg, updates: updates.filter((_, j) => j !== i) })} className="text-gray-400 hover:text-red-500">
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          ))}
          <button className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
            onClick={() => onChange({ ...cfg, updates: [...updates, { field: "", value: "" }] })}>
            <Plus className="w-3 h-3" /> Add field
          </button>
        </div>
      );
    }

    case "SEND_NOTIFICATION":
      return (
        <div className="mt-2 space-y-2">
          <div>
            <Label className="text-xs">Title</Label>
            <Input className="h-8 text-xs mt-1" value={cfg.title || ""} placeholder="Notification title"
              onChange={(e) => onChange({ ...cfg, title: e.target.value })} />
          </div>
          <div>
            <Label className="text-xs">Message</Label>
            <Textarea className="text-xs mt-1 min-h-[60px]" value={cfg.message || ""} placeholder="Notification message"
              onChange={(e) => onChange({ ...cfg, message: e.target.value })} />
          </div>
        </div>
      );

    case "ASSIGN_USER":
      return (
        <div className="grid grid-cols-2 gap-2 mt-2">
          <div>
            <Label className="text-xs">Field</Label>
            <Select value={cfg.field || ""} onValueChange={(v) => onChange({ ...cfg, field: v })}>
              <SelectTrigger className="h-8 text-xs mt-1"><SelectValue placeholder="Assignee field" /></SelectTrigger>
              <SelectContent>{fields.map(f => <SelectItem key={f.name} value={f.name} className="text-xs">{f.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">User ID</Label>
            <Input className="h-8 text-xs mt-1" value={cfg.userId || ""} placeholder="User ID"
              onChange={(e) => onChange({ ...cfg, userId: e.target.value })} />
          </div>
        </div>
      );

    case "CREATE_RECORD":
      return (
        <div className="mt-2">
          <Label className="text-xs">Target Module</Label>
          <Select value={cfg.moduleId || ""} onValueChange={(v) => onChange({ ...cfg, moduleId: v })}>
            <SelectTrigger className="h-9 mt-1"><SelectValue placeholder="Select module" /></SelectTrigger>
            <SelectContent>{modules.map(m => <SelectItem key={m.id} value={m.id}>{m.icon} {m.name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      );

    default:
      return null;
  }
}

// ── Workflow Builder Dialog ───────────────────────────────────────────────────

function WorkflowBuilderDialog({
  open, onClose, onSave, modules, initial,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (data: WorkflowDraft) => Promise<void>;
  modules: any[];
  initial?: any;
}) {
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState<WorkflowDraft>({
    name: "",
    description: "",
    trigger: "RECORD_CREATED",
    moduleId: "",
    conditions: [],
    actions: [],
  });

  useEffect(() => {
    if (open) {
      setDraft(initial ? {
        name: initial.name || "",
        description: initial.description || "",
        trigger: initial.trigger || "RECORD_CREATED",
        moduleId: initial.moduleId || "",
        conditions: (initial.conditions || []).map((c: any) => ({ ...c, id: c.id || uid() })),
        actions: (initial.actions || []).map((a: any) => ({ ...a, id: a.id || uid() })),
      } : {
        name: "",
        description: "",
        trigger: "RECORD_CREATED",
        moduleId: "",
        conditions: [],
        actions: [],
      });
    }
  }, [open, initial]);

  const mod = modules.find(m => m.id === draft.moduleId);
  const fields: any[] = mod?.fields || [];

  const set = <K extends keyof WorkflowDraft>(k: K, v: WorkflowDraft[K]) =>
    setDraft(d => ({ ...d, [k]: v }));

  const addCondition = () =>
    set("conditions", [...draft.conditions, { id: uid(), field: fields[0]?.name || "", operator: "is", value: "", logic: "AND" }]);

  const updateCondition = (id: string, patch: Partial<WorkflowCondition>) =>
    set("conditions", draft.conditions.map(c => c.id === id ? { ...c, ...patch } : c));

  const removeCondition = (id: string) =>
    set("conditions", draft.conditions.filter(c => c.id !== id));

  const addAction = () =>
    set("actions", [...draft.actions, { id: uid(), type: "SET_FIELD", config: {}, order: draft.actions.length }]);

  const updateAction = (id: string, patch: Partial<WorkflowAction>) =>
    set("actions", draft.actions.map(a => a.id === id ? { ...a, ...patch } : a));

  const removeAction = (id: string) =>
    set("actions", draft.actions.filter(a => a.id !== id));

  const handleSave = async () => {
    if (!draft.name.trim() || !draft.moduleId || !draft.trigger) return;
    setSaving(true);
    try {
      await onSave(draft);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const selectedTrigger = TRIGGER_OPTIONS.find(t => t.value === draft.trigger);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Workflow className="w-5 h-5 text-blue-600" />
            {initial ? "Edit Workflow" : "New Workflow"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-2">
          {/* Name & Description */}
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
            <Input value={draft.description} onChange={e => set("description", e.target.value)} placeholder="Optional description" className="h-9" />
          </div>

          {/* Trigger */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center font-bold">1</div>
              <Label className="text-sm font-semibold text-gray-800">Trigger</Label>
            </div>
            <div className="grid grid-cols-2 gap-2 pl-8">
              {TRIGGER_OPTIONS.map(t => (
                <button key={t.value} onClick={() => set("trigger", t.value)}
                  className={cn(
                    "p-3 rounded-lg border text-left transition-all",
                    draft.trigger === t.value
                      ? "border-blue-500 bg-blue-50"
                      : "border-gray-200 hover:border-gray-300 bg-white"
                  )}>
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{t.icon}</span>
                    <div>
                      <p className={cn("text-xs font-medium", draft.trigger === t.value ? "text-blue-700" : "text-gray-800")}>{t.label}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{t.description}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
            {selectedTrigger && (
              <div className="pl-8">
                <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 rounded-lg text-xs text-blue-700">
                  <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
                  Trigger: <strong>{selectedTrigger.label}</strong> — {selectedTrigger.description}
                </div>
              </div>
            )}
          </div>

          {/* Conditions */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-amber-500 text-white text-xs flex items-center justify-center font-bold">2</div>
                <Label className="text-sm font-semibold text-gray-800">Conditions</Label>
                <span className="text-xs text-gray-400">(optional — run when ALL match)</span>
              </div>
              <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={addCondition} disabled={!draft.moduleId}>
                <Plus className="w-3 h-3" /> Add
              </Button>
            </div>

            {draft.conditions.length === 0 ? (
              <div className="pl-8 text-xs text-gray-400 py-2">No conditions — workflow runs on every trigger event.</div>
            ) : (
              <div className="pl-8 space-y-2">
                {draft.conditions.map((cond, idx) => (
                  <div key={cond.id} className="flex items-center gap-2 flex-wrap">
                    {idx > 0 && (
                      <Select value={cond.logic || "AND"} onValueChange={v => updateCondition(cond.id, { logic: v as "AND" | "OR" })}>
                        <SelectTrigger className="h-7 w-16 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="AND" className="text-xs">AND</SelectItem>
                          <SelectItem value="OR" className="text-xs">OR</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                    <Select value={cond.field} onValueChange={v => updateCondition(cond.id, { field: v })}>
                      <SelectTrigger className="h-7 text-xs w-36"><SelectValue placeholder="Field" /></SelectTrigger>
                      <SelectContent>{fields.map(f => <SelectItem key={f.name} value={f.name} className="text-xs">{f.label}</SelectItem>)}</SelectContent>
                    </Select>
                    <Select value={cond.operator} onValueChange={v => updateCondition(cond.id, { operator: v, value: "" })}>
                      <SelectTrigger className="h-7 text-xs w-36"><SelectValue /></SelectTrigger>
                      <SelectContent>{CONDITION_OPERATORS.map(o => <SelectItem key={o.value} value={o.value} className="text-xs">{o.label}</SelectItem>)}</SelectContent>
                    </Select>
                    {needsValue(cond.operator) && (
                      isOptionField(fields, cond.field) ? (
                        <Select value={cond.value} onValueChange={v => updateCondition(cond.id, { value: v })}>
                          <SelectTrigger className="h-7 text-xs w-36"><SelectValue placeholder="Value" /></SelectTrigger>
                          <SelectContent>
                            {fieldOptions(fields, cond.field).map(o => (
                              <SelectItem key={o.value} value={o.value} className="text-xs">{o.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <Input className="h-7 text-xs w-28" value={cond.value} placeholder="Value"
                          onChange={e => updateCondition(cond.id, { value: e.target.value })} />
                      )
                    )}
                    <button onClick={() => removeCondition(cond.id)} className="text-gray-400 hover:text-red-500">
                      <X className="w-3.5 h-3.5" />
                    </button>
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
                <Label className="text-sm font-semibold text-gray-800">Actions</Label>
                <span className="text-xs text-gray-400">(executed in order)</span>
              </div>
              <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={addAction} disabled={!draft.moduleId}>
                <Plus className="w-3 h-3" /> Add
              </Button>
            </div>

            {draft.actions.length === 0 ? (
              <div className="pl-8 text-xs text-gray-400 py-2">No actions added yet.</div>
            ) : (
              <div className="pl-8 space-y-3">
                {draft.actions.map((action, idx) => (
                  <div key={action.id} className="border border-gray-200 rounded-lg p-3 bg-white">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-gray-100 text-gray-600 text-xs flex items-center justify-center font-medium flex-shrink-0">
                        {idx + 1}
                      </span>
                      <Select value={action.type} onValueChange={v => updateAction(action.id, { type: v, config: {} })}>
                        <SelectTrigger className="h-8 text-xs flex-1"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {ACTION_TYPES.map(t => (
                            <SelectItem key={t.value} value={t.value} className="text-xs">
                              {t.icon} {t.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <button onClick={() => removeAction(action.id)} className="text-gray-400 hover:text-red-500 flex-shrink-0">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <ActionConfigEditor
                      action={action}
                      fields={fields}
                      modules={modules}
                      onChange={cfg => updateAction(action.id, { config: cfg })}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            onClick={handleSave}
            disabled={saving || !draft.name.trim() || !draft.moduleId || !draft.trigger || draft.actions.length === 0}
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            {initial ? "Update Workflow" : "Create Workflow"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function WorkflowsPage() {
  const { modules } = useModulesStore();
  const [workflows, setWorkflows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showBuilder, setShowBuilder] = useState(false);
  const [editingWorkflow, setEditingWorkflow] = useState<any | null>(null);
  const [error, setError] = useState("");

  const fetchWorkflows = async () => {
    try {
      const { data } = await api.get("/workflows");
      setWorkflows(data);
    } catch {
      setError("Failed to load workflows");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchWorkflows(); }, []);

  const toggleWorkflow = async (id: string) => {
    try {
      const { data } = await api.patch(`/workflows/${id}/toggle`);
      setWorkflows(prev => prev.map(w => w.id === id ? data : w));
    } catch {}
  };

  const deleteWorkflow = async (id: string) => {
    if (!confirm("Delete this workflow?")) return;
    try {
      await api.delete(`/workflows/${id}`);
      setWorkflows(prev => prev.filter(w => w.id !== id));
    } catch {}
  };

  const handleSave = async (draft: WorkflowDraft) => {
    if (editingWorkflow) {
      const { data } = await api.patch(`/workflows/${editingWorkflow.id}`, draft);
      setWorkflows(prev => prev.map(w => w.id === editingWorkflow.id ? data : w));
    } else {
      const { data } = await api.post("/workflows", draft);
      setWorkflows(prev => [data, ...prev]);
    }
    setEditingWorkflow(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Workflows</h1>
          <p className="text-gray-500 mt-1 text-sm">Automate actions when records change.</p>
        </div>
        <Button className="gap-2" onClick={() => { setEditingWorkflow(null); setShowBuilder(true); }}>
          <Plus className="w-4 h-4" />
          New Workflow
        </Button>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      ) : workflows.length === 0 ? (
        <div className="text-center py-20">
          <div className="w-20 h-20 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Workflow className="w-10 h-10 text-blue-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No workflows yet</h3>
          <p className="text-gray-500 mb-6 max-w-md mx-auto text-sm">
            Automate your processes with triggers, conditions, and actions.
            Set a field, send a notification, or assign a user automatically.
          </p>
          <Button className="gap-2" onClick={() => setShowBuilder(true)}>
            <Plus className="w-4 h-4" />
            Create First Workflow
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {workflows.map((wf) => {
            const TriggerIcon = TRIGGER_ICONS[wf.trigger] || Zap;
            const actions: any[] = wf.actions || [];
            return (
              <Card key={wf.id} className={cn("transition-all", !wf.isActive && "opacity-60")}>
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-start gap-3">
                      <div className={cn(
                        "w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0",
                        wf.isActive ? "bg-green-50" : "bg-gray-50"
                      )}>
                        <TriggerIcon className={cn("w-5 h-5", wf.isActive ? "text-green-600" : "text-gray-400")} />
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-gray-900 truncate">{wf.name}</p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {TRIGGER_OPTIONS.find(t => t.value === wf.trigger)?.label ?? wf.trigger}
                          {wf.moduleId && " · " + (modules.find(m => m.id === wf.moduleId)?.name || "Module")}
                        </p>
                        {wf.description && <p className="text-xs text-gray-400 mt-1 truncate">{wf.description}</p>}
                      </div>
                    </div>
                    <Switch checked={wf.isActive} onCheckedChange={() => toggleWorkflow(wf.id)} />
                  </div>

                  {/* Conditions + Actions summary */}
                  <div className="flex items-center gap-2 text-xs text-gray-500 mb-3 flex-wrap">
                    {(wf.conditions?.length ?? 0) > 0 && (
                      <Badge variant="outline" className="text-xs gap-1 font-normal">
                        {wf.conditions.length} condition{wf.conditions.length !== 1 ? "s" : ""}
                      </Badge>
                    )}
                    <ArrowRight className="w-3 h-3 text-gray-300" />
                    {actions.length > 0 ? (
                      actions.slice(0, 3).map((a: any, i: number) => (
                        <Badge key={i} className="text-xs font-normal bg-blue-50 text-blue-700 border-blue-200">
                          {ACTION_TYPES.find(t => t.value === a.type)?.icon}{" "}
                          {ACTION_TYPES.find(t => t.value === a.type)?.label ?? a.type}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-gray-400">No actions</span>
                    )}
                    {actions.length > 3 && <span className="text-gray-400">+{actions.length - 3} more</span>}
                  </div>

                  <div className="flex items-center gap-2 pt-2 border-t border-gray-50">
                    <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 text-gray-600"
                      onClick={() => { setEditingWorkflow(wf); setShowBuilder(true); }}>
                      <Edit2 className="w-3 h-3" /> Edit
                    </Button>
                    <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 text-red-500 hover:text-red-700"
                      onClick={() => deleteWorkflow(wf.id)}>
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

      <WorkflowBuilderDialog
        open={showBuilder}
        onClose={() => { setShowBuilder(false); setEditingWorkflow(null); }}
        onSave={handleSave}
        modules={modules}
        initial={editingWorkflow}
      />
    </div>
  );
}
