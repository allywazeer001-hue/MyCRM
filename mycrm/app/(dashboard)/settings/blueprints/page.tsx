"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  GitBranch, Plus, Loader2, ArrowLeft, Trash2, Edit,
  CheckCircle2, AlertCircle, ChevronRight, Circle, Zap,
  Lock, ToggleRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { ModuleIcon } from "@/components/ui/module-icon";

// ── Types ─────────────────────────────────────────────────────────────────────

interface Blueprint {
  id: string;
  name: string;
  description?: string;
  moduleId: string;
  statusFieldName: string;
  phases: any[];
  transitions: any[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  module?: { id: string; name: string; slug: string; icon?: string };
}

interface Module { id: string; name: string; slug: string; icon?: string; fields: any[]; }

// ── Toast ──────────────────────────────────────────────────────────────────────

function Toast({ msg, type }: { msg: string; type: "success" | "error" }) {
  return (
    <div className={cn(
      "fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-xl border shadow-lg text-sm font-medium transition-all",
      type === "success"
        ? "bg-green-50 border-green-200 text-green-700"
        : "bg-red-50 border-red-200 text-red-700",
    )}>
      {type === "success" ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
      {msg}
    </div>
  );
}

// ── Creation Wizard ────────────────────────────────────────────────────────────

const STATUS_FIELD_TYPES = ["STATUS", "DROPDOWN", "RADIO"];

function CreateWizard({ open, onClose, onCreated }: {
  open: boolean;
  onClose: () => void;
  onCreated: (bp: Blueprint) => void;
}) {
  const [step, setStep]           = useState<1 | 2 | 3>(1);
  const [modules, setModules]     = useState<Module[]>([]);
  const [selectedMod, setSelectedMod] = useState<Module | null>(null);
  const [statusField, setStatusField] = useState("");
  const [name, setName]           = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving]       = useState(false);
  const [loadingMods, setLoadingMods] = useState(false);

  const loadModules = useCallback(async () => {
    setLoadingMods(true);
    try {
      const { data } = await api.get("/modules");
      setModules((data || []).filter((m: any) => m.isActive));
    } catch {}
    finally { setLoadingMods(false); }
  }, []);

  useEffect(() => {
    if (open) { loadModules(); setStep(1); setSelectedMod(null); setStatusField(""); setName(""); setDescription(""); }
  }, [open, loadModules]);

  const statusFields = (selectedMod?.fields || []).filter(
    (f: any) => STATUS_FIELD_TYPES.includes(f.type) && f.isActive,
  );

  const handleSelectModule = (mod: Module) => {
    setSelectedMod(mod);
    setStatusField("");
    setStep(2);
  };

  const handleSelectField = (fieldName: string) => {
    setStatusField(fieldName);
    const field = statusFields.find((f: any) => f.name === fieldName);
    const phases = (field?.options || []).map((o: any, i: number) => ({
      id: o.value,
      name: o.value,
      label: o.label,
      color: o.color || "#6366f1",
      order: i,
    }));
    setName(`${selectedMod?.name} Blueprint`);
    setStep(3);
  };

  const handleCreate = async () => {
    if (!name.trim() || !selectedMod || !statusField) return;
    const field = statusFields.find((f: any) => f.name === statusField);
    const phases = (field?.options || []).map((o: any, i: number) => ({
      id: o.value, name: o.value, label: o.label,
      color: o.color || "#6366f1", order: i,
    }));
    setSaving(true);
    try {
      const { data } = await api.post("/blueprints", {
        name: name.trim(),
        description: description.trim() || undefined,
        moduleId: selectedMod.id,
        statusFieldName: statusField,
        phases,
        transitions: [],
        fieldLocks: {},
      });
      onCreated(data);
      onClose();
    } catch {}
    finally { setSaving(false); }
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
            {step === 2 && "Select the field whose values represent the phases of the process."}
            {step === 3 && "Give your Blueprint a name and optional description."}
          </DialogDescription>
        </DialogHeader>

        {/* Step indicator */}
        <div className="flex items-center gap-2 py-2">
          {([1, 2, 3] as const).map(s => (
            <div key={s} className={cn(
              "flex items-center gap-1 text-xs font-medium",
              step >= s ? "text-indigo-600" : "text-gray-400",
            )}>
              <div className={cn(
                "w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold",
                step > s ? "bg-indigo-600 text-white" : step === s ? "bg-indigo-100 text-indigo-700 border border-indigo-300" : "bg-gray-100 text-gray-400",
              )}>
                {step > s ? "✓" : s}
              </div>
              {s < 3 && <div className={cn("w-8 h-px", step > s ? "bg-indigo-300" : "bg-gray-200")} />}
            </div>
          ))}
        </div>

        {/* Step 1: Module selection */}
        {step === 1 && (
          <div className="space-y-2 max-h-72 overflow-y-auto">
            {loadingMods ? (
              <div className="py-8 text-center"><Loader2 className="w-5 h-5 animate-spin mx-auto text-gray-400" /></div>
            ) : modules.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">No modules found</p>
            ) : (
              modules.map(mod => (
                <button key={mod.id} onClick={() => handleSelectModule(mod)}
                  className="w-full flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:border-indigo-300 hover:bg-indigo-50/50 text-left transition-colors group">
                  <div className="w-8 h-8 rounded-lg bg-gray-100 group-hover:bg-indigo-100 flex items-center justify-center text-sm">
                    <ModuleIcon icon={mod.icon} slug={mod.slug} className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">{mod.name}</p>
                    <p className="text-xs text-gray-400">{(mod.fields || []).length} fields</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-indigo-500" />
                </button>
              ))
            )}
          </div>
        )}

        {/* Step 2: Status field selection */}
        {step === 2 && selectedMod && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 mb-3 p-2 bg-gray-50 rounded-lg">
              <ModuleIcon icon={selectedMod.icon} slug={selectedMod.slug} className="w-4 h-4" />
              <span className="text-sm font-medium text-gray-700">{selectedMod.name}</span>
              <button onClick={() => setStep(1)} className="ml-auto text-xs text-gray-400 hover:text-gray-600">Change</button>
            </div>
            {statusFields.length === 0 ? (
              <div className="py-6 text-center text-sm text-gray-400">
                <AlertCircle className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                No Status, Dropdown, or Radio fields found in this module.
              </div>
            ) : (
              statusFields.map((f: any) => (
                <button key={f.id} onClick={() => handleSelectField(f.name)}
                  className="w-full flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:border-indigo-300 hover:bg-indigo-50/50 text-left transition-colors group">
                  <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center text-xs font-bold text-purple-700">
                    {f.type === "STATUS" ? "●" : f.type === "DROPDOWN" ? "▼" : "◉"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">{f.label}</p>
                    <p className="text-xs text-gray-400">
                      {(f.options || []).length} options: {(f.options || []).slice(0, 3).map((o: any) => o.label).join(", ")}
                      {(f.options || []).length > 3 ? "…" : ""}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    {(f.options || []).slice(0, 4).map((o: any) => (
                      <div key={o.value} className="w-3 h-3 rounded-full border border-white shadow-sm"
                        style={{ backgroundColor: o.color || "#6366f1" }} />
                    ))}
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-indigo-500" />
                </button>
              ))
            )}
          </div>
        )}

        {/* Step 3: Name + description */}
        {step === 3 && (
          <div className="space-y-4">
            <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-lg text-xs text-indigo-700 space-y-1">
              <p><span className="font-semibold">Module:</span> {selectedMod?.name}</p>
              <p><span className="font-semibold">Phase Field:</span> {statusFields.find((f: any) => f.name === statusField)?.label || statusField}</p>
              <p><span className="font-semibold">Phases:</span> {statusFields.find((f: any) => f.name === statusField)?.options?.map((o: any) => o.label).join(" → ")}</p>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm">Blueprint Name</Label>
              <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Student Admission Process" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm">Description <span className="text-gray-400 font-normal">(optional)</span></Label>
              <Textarea value={description} onChange={e => setDescription(e.target.value)}
                placeholder="Describe the purpose of this blueprint…" rows={2} className="resize-none text-sm" />
            </div>
          </div>
        )}

        <DialogFooter>
          {step > 1 && (
            <Button variant="outline" onClick={() => setStep(s => (s - 1) as 1 | 2 | 3)}>Back</Button>
          )}
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

// ── Blueprint Card ─────────────────────────────────────────────────────────────

function BlueprintCard({ bp, onToggle, onDelete }: {
  bp: Blueprint;
  onToggle: (id: string, active: boolean) => void;
  onDelete: (id: string) => void;
}) {
  const phases = bp.phases as any[];
  const transitions = bp.transitions as any[];

  return (
    <div className={cn(
      "bg-white border rounded-xl overflow-hidden hover:shadow-sm transition-all",
      !bp.isActive && "opacity-60",
    )}>
      {/* Accent strip */}
      <div className={cn("h-1.5", bp.isActive ? "bg-indigo-500" : "bg-gray-200")} />

      <div className="p-5">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg bg-indigo-100 flex items-center justify-center shrink-0">
            <GitBranch className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-semibold text-gray-900">{bp.name}</h3>
              {!bp.isActive && <Badge variant="outline" className="text-[10px] text-gray-400">Inactive</Badge>}
            </div>
            {bp.description && <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{bp.description}</p>}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <Switch
              checked={bp.isActive}
              onCheckedChange={v => onToggle(bp.id, v)}
              className="scale-75"
            />
          </div>
        </div>

        {/* Meta info */}
        <div className="mt-3 flex items-center gap-3 flex-wrap text-xs text-gray-500">
          {bp.module && (
            <span className="flex items-center gap-1">
              <ModuleIcon icon={bp.module.icon} slug={bp.module.slug} className="w-3.5 h-3.5" /> {bp.module.name}
            </span>
          )}
          <span className="flex items-center gap-1">
            <Circle className="w-2.5 h-2.5" /> {phases.length} phases
          </span>
          <span className="flex items-center gap-1">
            <Zap className="w-2.5 h-2.5" /> {transitions.length} transitions
          </span>
        </div>

        {/* Phase pills */}
        {phases.length > 0 && (
          <div className="mt-3 flex items-center gap-1.5 flex-wrap">
            {phases.slice(0, 5).map((p: any, i: number) => (
              <span key={i} className="inline-flex items-center text-[10px] font-medium px-2 py-0.5 rounded-full border border-gray-200 bg-gray-50 text-gray-600">
                {p.label || p.name}
              </span>
            ))}
            {phases.length > 5 && (
              <span className="text-[10px] text-gray-400">+{phases.length - 5} more</span>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="mt-4 flex items-center gap-2">
          <Link href={`/settings/blueprints/${bp.id}`} className="flex-1">
            <Button size="sm" variant="outline" className="w-full gap-1.5 h-8 text-xs">
              <Edit className="w-3.5 h-3.5" /> Edit Blueprint
            </Button>
          </Link>
          <Button size="sm" variant="ghost"
            onClick={() => onDelete(bp.id)}
            className="h-8 w-8 p-0 text-gray-400 hover:text-red-500 hover:bg-red-50">
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────

export default function BlueprintsPage() {
  const router = useRouter();
  const [blueprints, setBlueprints] = useState<Blueprint[]>([]);
  const [loading, setLoading]       = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [toast, setToast]           = useState<{ msg: string; type: "success" | "error" } | null>(null);

  const showToast = (msg: string, type: "success" | "error" = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const load = useCallback(async () => {
    try {
      const { data } = await api.get("/blueprints");
      setBlueprints(data || []);
    } catch {}
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleCreated = (bp: Blueprint) => {
    showToast("Blueprint created successfully");
    router.push(`/settings/blueprints/${bp.id}`);
  };

  const handleToggle = async (id: string, active: boolean) => {
    setBlueprints(prev => prev.map(b => b.id === id ? { ...b, isActive: active } : b));
    try {
      await api.patch(`/blueprints/${id}`, { isActive: active });
      showToast(active ? "Blueprint activated" : "Blueprint deactivated");
    } catch {
      setBlueprints(prev => prev.map(b => b.id === id ? { ...b, isActive: !active } : b));
      showToast("Failed to update blueprint", "error");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this Blueprint? This cannot be undone.")) return;
    try {
      await api.delete(`/blueprints/${id}`);
      setBlueprints(prev => prev.filter(b => b.id !== id));
      showToast("Blueprint deleted");
    } catch {
      showToast("Failed to delete blueprint", "error");
    }
  };

  return (
    <div className="space-y-6 p-6">
      {toast && <Toast msg={toast.msg} type={toast.type} />}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/settings">
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <GitBranch className="w-5 h-5 text-indigo-600" /> Blueprints
            </h1>
            <p className="text-sm text-gray-500">Process flows, phase transitions, and field locking rules.</p>
          </div>
        </div>
        <Button onClick={() => setCreateOpen(true)} className="gap-2">
          <Plus className="w-4 h-4" /> New Blueprint
        </Button>
      </div>

      {/* Info banner */}
      <div className="flex items-start gap-3 p-4 bg-indigo-50 border border-indigo-100 rounded-xl">
        <Lock className="w-4 h-4 text-indigo-500 mt-0.5 shrink-0" />
        <div className="text-sm text-indigo-700 space-y-0.5">
          <p className="font-medium">How Blueprints work</p>
          <p className="text-xs text-indigo-600 leading-relaxed">
            A Blueprint controls the lifecycle of records in a module. Define phases (e.g. Registered → Reviewing → Approved),
            configure which fields are locked per phase, and add transition conditions to enforce your process flow.
          </p>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center h-48">
          <Loader2 className="w-6 h-6 text-indigo-500 animate-spin" />
        </div>
      ) : blueprints.length === 0 ? (
        <div className="border-2 border-dashed border-gray-200 rounded-xl p-16 text-center">
          <GitBranch className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-sm font-medium text-gray-600 mb-1">No Blueprints yet</p>
          <p className="text-xs text-gray-400 mb-6 max-w-sm mx-auto">
            Create your first Blueprint to control process flows, enforce field rules,
            and manage record lifecycles across your modules.
          </p>
          <Button onClick={() => setCreateOpen(true)} className="gap-2">
            <Plus className="w-4 h-4" /> Create First Blueprint
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {blueprints.map(bp => (
            <BlueprintCard key={bp.id} bp={bp} onToggle={handleToggle} onDelete={handleDelete} />
          ))}
        </div>
      )}

      <CreateWizard open={createOpen} onClose={() => setCreateOpen(false)} onCreated={handleCreated} />
    </div>
  );
}
