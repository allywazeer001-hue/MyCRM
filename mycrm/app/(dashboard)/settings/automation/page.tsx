"use client";
import { useEffect, useState, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Zap, Plus, Workflow, GitBranch,
  Play, Trash2, Edit2, CheckCircle2, AlertCircle,
  Loader2, Settings2, ChevronRight, Lock, ArrowRight,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";

import { api } from "@/lib/api";
import { useModulesStore } from "@/store/modules.store";
import { cn } from "@/lib/utils";

// ── helpers ───────────────────────────────────────────────────────────────────

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
// WORKFLOWS
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

// ─── Workflows Tab ─────────────────────────────────────────────────────────────

function WorkflowsTab({ modules }: { modules: any[] }) {
  const [workflows, setWorkflows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  const showToast = (msg: string, type: "success" | "error" = "success") => {
    setToast({ msg, type }); setTimeout(() => setToast(null), 3000);
  };

  const load = useCallback(async () => {
    try { const { data } = await api.get("/workflows"); setWorkflows(data || []); }
    catch {} finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const toggle = async (id: string) => {
    try {
      const { data } = await api.patch(`/workflows/${id}/toggle`);
      setWorkflows(p => p.map(w => w.id === id ? data : w));
    } catch { showToast("Failed to toggle", "error"); }
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this workflow?")) return;
    try {
      await api.delete(`/workflows/${id}`);
      setWorkflows(p => p.filter(w => w.id !== id));
      showToast("Workflow deleted");
    } catch { showToast("Failed to delete", "error"); }
  };

  return (
    <div className="flex-1 overflow-y-auto p-6">
      {toast && <Toast msg={toast.msg} type={toast.type} />}

      <div className="flex items-start gap-4 mb-6">
        <div className="flex-1 flex items-start gap-3 p-4 bg-violet-50 border border-violet-100 rounded-xl">
          <Zap className="w-4 h-4 text-violet-500 mt-0.5 shrink-0" />
          <p className="text-xs text-violet-700 leading-relaxed">
            Workflows automate actions when records change — set up triggers, optional conditions, and a sequence of actions to execute automatically.
          </p>
        </div>
        <Link href="/settings/workflows/new">
          <Button className="gap-2 shrink-0 h-9">
            <Plus className="w-4 h-4" /> New Workflow
          </Button>
        </Link>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40"><Loader2 className="w-5 h-5 animate-spin text-violet-500" /></div>
      ) : workflows.length === 0 ? (
        <div className="border-2 border-dashed border-gray-200 rounded-2xl p-14 text-center space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-violet-50 flex items-center justify-center mx-auto">
            <Workflow className="w-7 h-7 text-violet-300" />
          </div>
          <p className="text-sm font-semibold text-gray-700">No Workflows yet</p>
          <p className="text-xs text-gray-400 max-w-xs mx-auto">Create your first automation workflow with triggers, conditions and actions.</p>
          <Link href="/settings/workflows/new">
            <Button size="sm" className="gap-2 mt-2">
              <Plus className="w-4 h-4" /> Create Workflow
            </Button>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {workflows.map(wf => {
            const TriggerIcon = TRIGGER_ICONS[wf.trigger] || Zap;
            const trigger = TRIGGER_OPTIONS.find(t => t.value === wf.trigger);
            const mod = modules.find(m => m.id === wf.moduleId);
            return (
              <div key={wf.id} className={cn(
                "bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-md hover:border-gray-300 transition-all",
                !wf.isActive && "opacity-60"
              )}>
                {/* Accent strip */}
                <div className={cn("h-1.5", wf.isActive ? "bg-gradient-to-r from-violet-500 to-green-500" : "bg-gray-200")} />
                <div className="p-4">
                  <div className="flex items-start gap-2.5 mb-3">
                    <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center shrink-0", wf.isActive ? "bg-green-50" : "bg-gray-100")}>
                      <TriggerIcon className={cn("w-4 h-4", wf.isActive ? "text-green-600" : "text-gray-400")} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">{wf.name}</p>
                      {mod && <p className="text-xs text-gray-500 mt-0.5">{mod.icon || "📋"} {mod.name}</p>}
                    </div>
                    <Switch checked={wf.isActive} onCheckedChange={() => toggle(wf.id)} className="scale-75 shrink-0" />
                  </div>

                  {/* Trigger + actions summary */}
                  <div className="flex items-center gap-1.5 flex-wrap mb-3">
                    <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-violet-50 text-violet-700 border border-violet-100">
                      {trigger?.icon} {trigger?.label ?? wf.trigger}
                    </span>
                    {(wf.conditions?.length ?? 0) > 0 && (
                      <span className="text-[10px] text-gray-400">{wf.conditions.length} cond.</span>
                    )}
                    {(wf.actions?.length ?? 0) > 0 && (
                      <>
                        <ArrowRight className="w-3 h-3 text-gray-300" />
                        <span className="text-[10px] text-gray-500">{wf.actions.length} action{wf.actions.length !== 1 ? "s" : ""}</span>
                      </>
                    )}
                  </div>

                  <div className="flex items-center gap-2 pt-2.5 border-t border-gray-100">
                    <Link href={`/settings/workflows/${wf.id}`} className="flex-1">
                      <Button size="sm" variant="outline" className="w-full gap-1 h-7 text-xs">
                        <Edit2 className="w-3 h-3" /> Edit
                      </Button>
                    </Link>
                    <Button size="sm" variant="ghost" onClick={() => remove(wf.id)}
                      className="h-7 w-7 p-0 text-gray-400 hover:text-red-500 hover:bg-red-50 shrink-0">
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// BLUEPRINTS
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
    const phases = (field?.options || []).map((o: any, i: number) => ({
      id: o.value, name: o.value, label: o.label, color: o.color || "#6366f1", order: i,
    }));
    setSaving(true);
    try {
      const { data } = await api.post("/blueprints", {
        name: name.trim(), description: description.trim() || undefined,
        moduleId: selectedMod.id, statusFieldName: statusField,
        phases, transitions: [], fieldLocks: {},
      });
      onCreated(data); onClose();
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

        <div className="flex items-center gap-1 py-1">
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
                  <p className="flex-1 text-sm font-medium text-gray-900">{mod.name}</p>
                  <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-indigo-500" />
                </button>
              ))}
          </div>
        )}

        {step === 2 && selectedMod && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg text-sm">
              <span>{selectedMod.icon || "📋"}</span>
              <span className="font-medium text-gray-700">{selectedMod.name}</span>
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
                <div className="flex gap-1">
                  {(f.options || []).slice(0, 4).map((o: any) => (
                    <div key={o.value} className="w-3 h-3 rounded-full border border-white" style={{ backgroundColor: o.color || "#6366f1" }} />
                  ))}
                </div>
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

  const showToast = (msg: string, type: "success" | "error" = "success") => {
    setToast({ msg, type }); setTimeout(() => setToast(null), 3000);
  };

  const load = useCallback(async () => {
    try { const { data } = await api.get("/blueprints"); setBlueprints(data || []); }
    catch {} finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const handleToggle = async (id: string, active: boolean) => {
    setBlueprints(p => p.map(b => b.id === id ? { ...b, isActive: active } : b));
    try {
      await api.patch(`/blueprints/${id}`, { isActive: active });
      showToast(active ? "Blueprint activated" : "Blueprint deactivated");
    } catch {
      setBlueprints(p => p.map(b => b.id === id ? { ...b, isActive: !active } : b));
      showToast("Failed to update", "error");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this Blueprint?")) return;
    try {
      await api.delete(`/blueprints/${id}`);
      setBlueprints(p => p.filter(b => b.id !== id));
      showToast("Blueprint deleted");
    } catch { showToast("Failed to delete", "error"); }
  };

  return (
    <div className="flex-1 overflow-y-auto p-6">
      {toast && <Toast msg={toast.msg} type={toast.type} />}

      <div className="flex items-start gap-4 mb-6">
        <div className="flex-1 flex items-start gap-3 p-4 bg-indigo-50 border border-indigo-100 rounded-xl">
          <Lock className="w-4 h-4 text-indigo-500 mt-0.5 shrink-0" />
          <p className="text-xs text-indigo-700 leading-relaxed">
            Blueprints control record lifecycles — define phases, configure field locks per phase, and add rule logic for automated transitions.
          </p>
        </div>
        <Button className="gap-2 shrink-0 h-9" onClick={() => setCreateOpen(true)}>
          <Plus className="w-4 h-4" /> New Blueprint
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40"><Loader2 className="w-5 h-5 animate-spin text-indigo-500" /></div>
      ) : blueprints.length === 0 ? (
        <div className="border-2 border-dashed border-gray-200 rounded-2xl p-14 text-center space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-indigo-50 flex items-center justify-center mx-auto">
            <GitBranch className="w-7 h-7 text-indigo-300" />
          </div>
          <p className="text-sm font-semibold text-gray-700">No Blueprints yet</p>
          <p className="text-xs text-gray-400 max-w-xs mx-auto">Create your first Blueprint to control record lifecycles with phases and transitions.</p>
          <Button size="sm" className="gap-2 mt-2" onClick={() => setCreateOpen(true)}>
            <Plus className="w-4 h-4" /> Create Blueprint
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {blueprints.map(bp => {
            const phases = bp.phases as any[];
            return (
              <div key={bp.id} className={cn(
                "bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-md hover:border-gray-300 transition-all",
                !bp.isActive && "opacity-60"
              )}>
                <div className="h-1.5 flex">
                  {phases.length > 0
                    ? phases.slice(0, 8).map((p, i) => <div key={i} className="flex-1" style={{ backgroundColor: p.color || "#6366f1" }} />)
                    : <div className="flex-1 bg-gray-200" />}
                </div>
                <div className="p-4">
                  <div className="flex items-start gap-2.5 mb-3">
                    <div className="w-9 h-9 rounded-lg bg-indigo-100 flex items-center justify-center shrink-0">
                      <GitBranch className="w-4 h-4 text-indigo-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">{bp.name}</p>
                      {bp.module && <p className="text-xs text-gray-500 mt-0.5">{bp.module.icon || "📋"} {bp.module.name}</p>}
                    </div>
                    <Switch checked={bp.isActive} onCheckedChange={v => handleToggle(bp.id, v)} className="scale-75 shrink-0" />
                  </div>

                  {phases.length > 0 && (
                    <div className="flex items-center gap-1 flex-wrap mb-3">
                      {phases.slice(0, 3).map((p: any, i: number) => (
                        <span key={i} className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full border"
                          style={{ borderColor: p.color + "44", backgroundColor: p.color + "11", color: p.color }}>
                          <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: p.color }} />
                          {p.label || p.name}
                        </span>
                      ))}
                      {phases.length > 3 && <span className="text-[10px] text-gray-400">+{phases.length - 3}</span>}
                    </div>
                  )}

                  <div className="flex items-center gap-2 pt-2.5 border-t border-gray-100">
                    <Link href={`/settings/blueprints/${bp.id}`} className="flex-1">
                      <Button size="sm" variant="outline" className="w-full gap-1 h-7 text-xs">
                        <Edit2 className="w-3 h-3" /> Edit
                      </Button>
                    </Link>
                    <Button size="sm" variant="ghost" onClick={() => handleDelete(bp.id)}
                      className="h-7 w-7 p-0 text-gray-400 hover:text-red-500 hover:bg-red-50 shrink-0">
                      <Trash2 className="w-3 h-3" />
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
  { id: "workflows",  label: "Workflows",  icon: Workflow },
  { id: "blueprints", label: "Blueprints", icon: GitBranch },
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
    <div className="flex flex-col h-full">
      {/* Page header */}
      <div className="shrink-0 px-6 pt-5 pb-0 bg-white border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <Zap className="w-4 h-4 text-violet-600" /> Automation
            </h1>
            <p className="text-xs text-gray-500 mt-0.5">Workflows, blueprints, and rule-based process automation.</p>
          </div>
        </div>

        {/* Tab bar */}
        <div className="flex items-center gap-0">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={cn(
                "flex items-center gap-2 px-5 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors",
                activeTab === id
                  ? "border-violet-600 text-violet-700"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              )}
            >
              <Icon className={cn("w-4 h-4", activeTab === id ? "text-violet-600" : "text-gray-400")} />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content — fills remaining height */}
      <div className="flex-1 overflow-hidden">
        {activeTab === "workflows"  && <WorkflowsTab modules={modules} />}
        {activeTab === "blueprints" && <BlueprintsTab />}
      </div>
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
