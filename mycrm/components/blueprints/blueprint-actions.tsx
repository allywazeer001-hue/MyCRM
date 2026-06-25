"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import {
  Loader2, GitBranch, CheckCircle2, Clock, AlertCircle,
  ChevronRight, X, Info, Play, Upload, File as FileIcon, Trash2,
  CheckCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";
import {
  useBlueprintRuntimeStore,
  type BlueprintTransition,
  type BlueprintPhase,
  type BlueprintPhaseGroup,
  type StageHistoryEntry,
} from "@/store/blueprint-runtime.store";

// ── Stage Badge ────────────────────────────────────────────────────────────────

export function StageBadge({ stage }: { stage: BlueprintPhase }) {
  const color = stage.color || "#6366f1";
  return (
    <span
      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border"
      style={{ backgroundColor: color + "20", borderColor: color + "60", color }}
    >
      <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
      {stage.name}
    </span>
  );
}

// ── File Attachment ───────────────────────────────────────────────────────────

function FileAttachment({ value, onChange, label }: {
  value: string | null; onChange: (url: string | null) => void; label: string;
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const upload = async (file: File) => {
    setUploading(true); setError(null);
    try {
      const form = new FormData();
      form.append("file", file);
      const { data } = await api.post("/files/upload", form, { headers: { "Content-Type": "multipart/form-data" } });
      onChange(data.url ?? data.path ?? data.filename ?? null);
    } catch { setError("Upload failed. Try again."); }
    finally { setUploading(false); }
  };

  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-gray-700">{label}<span className="text-red-500 ml-0.5">*</span></label>
      {value ? (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-50 border border-blue-200">
          <FileIcon className="w-4 h-4 text-blue-500 shrink-0" />
          <a href={value} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-700 underline truncate flex-1">{value.split("/").pop()}</a>
          <button type="button" onClick={() => onChange(null)} className="text-gray-400 hover:text-red-500 shrink-0"><Trash2 className="w-3.5 h-3.5" /></button>
        </div>
      ) : (
        <div>
          <input ref={inputRef} type="file" className="hidden" onChange={e => { if (e.target.files?.[0]) upload(e.target.files[0]); }} />
          <button type="button" onClick={() => inputRef.current?.click()} disabled={uploading}
            className="flex items-center gap-2 w-full px-3 py-2 rounded-lg border-2 border-dashed text-sm text-gray-500 hover:border-blue-300 hover:text-blue-600 transition-colors disabled:opacity-50">
            {uploading ? <Loader2 className="w-4 h-4 animate-spin shrink-0" /> : <Upload className="w-4 h-4 shrink-0" />}
            {uploading ? "Uploading…" : "Click to upload file"}
          </button>
          {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
        </div>
      )}
    </div>
  );
}

// ── Transition Dialog ─────────────────────────────────────────────────────────

function TransitionDialog({ transition, fields, onConfirm, onCancel, executing }: {
  transition: BlueprintTransition;
  fields: { name: string; label: string; type?: string }[];
  onConfirm: (formData: Record<string, string>) => void;
  onCancel: () => void;
  executing: boolean;
}) {
  const [formData, setFormData] = useState<Record<string, string>>({});
  const requiredFieldDefs = (transition.requiredFields || []).map(name => fields.find(f => f.name === name) || { name, label: name, type: "TEXT" });
  const allFilled = requiredFieldDefs.every(f => (formData[f.name] ?? "") !== "");
  const color = transition.buttonColor || "#3b82f6";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative z-10 bg-white rounded-2xl shadow-2xl w-full max-w-md border border-gray-200">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: color + "20" }}>
              <ChevronRight className="w-4 h-4" style={{ color }} />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 text-sm">{transition.name}</h3>
              {transition.description && <p className="text-xs text-gray-500 mt-0.5">{transition.description}</p>}
            </div>
          </div>
          <button onClick={onCancel} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
        </div>

        <div className="px-5 py-4 space-y-4 max-h-[60vh] overflow-y-auto">
          {transition.confirmMessage && (
            <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-amber-50 border border-amber-200">
              <Info className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
              <p className="text-sm text-amber-800">{transition.confirmMessage}</p>
            </div>
          )}
          {transition.requiresApproval && (
            <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-blue-50 border border-blue-200">
              <Clock className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
              <p className="text-sm text-blue-800">This action requires approval before the stage changes.</p>
            </div>
          )}
          {requiredFieldDefs.length > 0 && (
            <div className="space-y-3">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Required Fields</p>
              {requiredFieldDefs.map(field => {
                const isFile = field.type === "FILE" || field.type === "IMAGE";
                return (
                  <div key={field.name}>
                    {isFile ? (
                      <FileAttachment label={field.label} value={formData[field.name] || null}
                        onChange={url => setFormData(prev => ({ ...prev, [field.name]: url ?? "" }))} />
                    ) : (
                      <div className="space-y-1">
                        <label className="text-sm font-medium text-gray-700">{field.label}<span className="text-red-500 ml-0.5">*</span></label>
                        <input type="text" value={formData[field.name] || ""} placeholder={`Enter ${field.label.toLowerCase()}`}
                          onChange={e => setFormData(prev => ({ ...prev, [field.name]: e.target.value }))}
                          className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 px-5 py-4 border-t border-gray-100 bg-gray-50/50 rounded-b-2xl">
          <Button variant="outline" size="sm" onClick={onCancel} disabled={executing}>Cancel</Button>
          <Button size="sm" disabled={executing || (requiredFieldDefs.length > 0 && !allFilled)}
            onClick={() => onConfirm(formData)} style={{ backgroundColor: color }} className="text-white hover:opacity-90 border-0">
            {executing ? <><Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />Processing…</> : transition.name}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Initialize Dialog ─────────────────────────────────────────────────────────

function InitializeDialog({ blueprintName, phases, onConfirm, onCancel, saving }: {
  blueprintName: string; phases: BlueprintPhase[]; onConfirm: (stageId: string) => void; onCancel: () => void; saving: boolean;
}) {
  const [selected, setSelected] = useState(phases[0]?.id ?? "");
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative z-10 bg-white rounded-2xl shadow-2xl w-full max-w-sm border border-gray-200">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center"><Play className="w-4 h-4 text-indigo-600" /></div>
            <div><h3 className="font-semibold text-gray-900 text-sm">Start Process</h3><p className="text-xs text-gray-500 mt-0.5">{blueprintName}</p></div>
          </div>
          <button onClick={onCancel} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
        </div>
        <div className="px-5 py-4 space-y-3">
          <p className="text-sm text-gray-600">Select the initial stage for this record:</p>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {phases.map(phase => {
              const color = phase.color || "#6366f1";
              const isSel = phase.id === selected;
              return (
                <button key={phase.id} type="button" onClick={() => setSelected(phase.id)}
                  className={cn("w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border-2 transition-all text-left", isSel ? "shadow-sm" : "border-gray-200 hover:border-gray-300")}
                  style={isSel ? { borderColor: color, backgroundColor: color + "10" } : {}}>
                  <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: color }} />
                  <span className="text-sm font-medium text-gray-800">{phase.name}</span>
                  {isSel && <CheckCircle2 className="w-4 h-4 ml-auto shrink-0" style={{ color }} />}
                </button>
              );
            })}
          </div>
        </div>
        <div className="flex justify-end gap-2 px-5 py-4 border-t border-gray-100 bg-gray-50/50 rounded-b-2xl">
          <Button variant="outline" size="sm" onClick={onCancel} disabled={saving}>Cancel</Button>
          <Button size="sm" disabled={saving || !selected} onClick={() => onConfirm(selected)} className="bg-indigo-600 hover:bg-indigo-700 text-white border-0">
            {saving ? <><Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />Starting…</> : "Start Process"}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Pending Task Banner ───────────────────────────────────────────────────────

function PendingTaskBanner({ recordId, onTaskComplete }: { recordId: string; onTaskComplete: () => void }) {
  const [tasks, setTasks] = useState<any[]>([]);
  const [completing, setCompleting] = useState<string | null>(null);

  const fetchTasks = useCallback(async () => {
    try {
      const { data } = await api.get(`/blueprints/record/${recordId}/tasks`);
      setTasks((data ?? []).filter((t: any) => t.status === "pending"));
    } catch { /* silent */ }
  }, [recordId]);

  useEffect(() => { fetchTasks(); }, [fetchTasks]);

  const handleAction = async (taskId: string, action: "approve" | "reject") => {
    setCompleting(taskId);
    try {
      await api.post(`/blueprints/pending-tasks/${taskId}/action`, { action });
      await fetchTasks();
      onTaskComplete();
    } catch { /* silent */ }
    setCompleting(null);
  };

  if (!tasks.length) return null;

  return (
    <div className="flex flex-col gap-2 px-4 pb-3">
      {tasks.map(task => (
        <div key={task.id} className="flex items-center justify-between px-4 py-3 rounded-xl bg-amber-50 border border-amber-200">
          <div className="flex items-center gap-2.5">
            <Clock className="w-4 h-4 text-amber-500 shrink-0" />
            <div>
              <p className="text-sm font-medium text-amber-800">Pending Approval: {task.transitionName}</p>
              <p className="text-xs text-amber-600">Waiting for {task.assignedRole || "approver"}</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button onClick={() => handleAction(task.id, "reject")} disabled={completing === task.id}
              className="px-2.5 py-1 rounded-lg text-xs font-medium text-red-700 bg-red-50 border border-red-200 hover:bg-red-100 disabled:opacity-50">Reject</button>
            <button onClick={() => handleAction(task.id, "approve")} disabled={completing === task.id}
              className="px-2.5 py-1 rounded-lg text-xs font-medium text-green-700 bg-green-50 border border-green-200 hover:bg-green-100 disabled:opacity-50">
              {completing === task.id ? "…" : "Approve"}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Process Flow Bar ──────────────────────────────────────────────────────────

type StageStatus = "completed" | "current" | "pending";

function getStageStatus(
  phase: BlueprintPhase,
  currentStage: BlueprintPhase | null,
  history: StageHistoryEntry[],
  allPhases: BlueprintPhase[],
): StageStatus {
  if (!currentStage) return "pending";
  if (phase.id === currentStage.id) return "current";

  // Check audit history first (most accurate)
  const visitedIds = new Set(history.map(h => h.toStage));
  const visitedNames = new Set(history.map(h => h.toStage));
  if (visitedIds.has(phase.id) || visitedNames.has(phase.name)) return "completed";

  // Fallback: order-based (stages before current = completed)
  const sortedAll = [...allPhases].sort((a, b) => a.order - b.order);
  const currIdx = sortedAll.findIndex(p => p.id === currentStage.id);
  const thisIdx = sortedAll.findIndex(p => p.id === phase.id);
  if (currIdx >= 0 && thisIdx >= 0 && thisIdx < currIdx) return "completed";

  return "pending";
}

function daysInStage(history: StageHistoryEntry[], currentStage: BlueprintPhase | null): number | null {
  if (!currentStage) return null;
  const entry = [...history].reverse().find(h => h.toStage === currentStage.id || h.toStage === currentStage.name);
  if (!entry) return null;
  const diff = Date.now() - new Date(entry.timestamp).getTime();
  return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
}

function StageNode({ phase, status, isLast }: { phase: BlueprintPhase; status: StageStatus; isLast: boolean }) {
  const color = phase.color || "#6366f1";

  const icon =
    status === "completed" ? (
      <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ backgroundColor: color }}>
        <CheckCheck className="w-3.5 h-3.5 text-white" strokeWidth={2.5} />
      </div>
    ) : status === "current" ? (
      <div className="relative w-6 h-6 flex items-center justify-center">
        <div className="absolute inset-0 rounded-full animate-ping opacity-25" style={{ backgroundColor: color }} />
        <div className="w-6 h-6 rounded-full border-2 flex items-center justify-center" style={{ borderColor: color }}>
          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
        </div>
      </div>
    ) : (
      <div className="w-6 h-6 rounded-full border-2 border-gray-200 flex items-center justify-center bg-white">
        <div className="w-2 h-2 rounded-full bg-gray-200" />
      </div>
    );

  return (
    <div className="flex items-center shrink-0">
      <div className="flex flex-col items-center gap-1 w-28 shrink-0">
        {/* Status icon */}
        <div className="flex items-center justify-center h-8">{icon}</div>
        {/* Stage name */}
        <p className={cn(
          "text-[11px] font-semibold text-center leading-tight w-full px-1",
          status === "current" ? "text-gray-900" : status === "completed" ? "text-gray-600" : "text-gray-400"
        )}>
          {phase.name}
        </p>
      </div>
      {/* Connector */}
      {!isLast && (
        <div className="w-6 h-[2px] shrink-0 mt-[-16px]"
          style={{ backgroundColor: status === "completed" ? phase.color : "#e5e7eb" }} />
      )}
    </div>
  );
}

function PhaseGroup({
  group, stages, currentStage, history, allPhases,
}: {
  group: BlueprintPhaseGroup | null;
  stages: BlueprintPhase[];
  currentStage: BlueprintPhase | null;
  history: StageHistoryEntry[];
  allPhases: BlueprintPhase[];
}) {
  const statuses = stages.map(s => getStageStatus(s, currentStage, history, allPhases));
  const completedCount = statuses.filter(s => s === "completed").length;
  const hasCurrent = statuses.includes("current");
  const progress = stages.length > 0 ? (completedCount + (hasCurrent ? 0.5 : 0)) / stages.length : 0;
  const groupColor = group?.color || "#6366f1";

  return (
    <div className="flex flex-col gap-2 shrink-0">
      {/* Phase group header */}
      {group && (
        <div className="flex items-center gap-2">
          <div className="h-[3px] w-full rounded-full bg-gray-100 overflow-hidden">
            <div className="h-full rounded-full transition-all duration-500" style={{ width: `${progress * 100}%`, backgroundColor: groupColor }} />
          </div>
          <span className="text-[10px] font-bold uppercase tracking-widest whitespace-nowrap shrink-0" style={{ color: groupColor }}>
            {group.name}
          </span>
          <span className="text-[10px] text-gray-400 shrink-0">
            {completedCount}/{stages.length}
          </span>
        </div>
      )}

      {/* Stages row */}
      <div className="flex items-start">
        {stages.map((phase, i) => (
          <StageNode
            key={phase.id}
            phase={phase}
            status={getStageStatus(phase, currentStage, history, allPhases)}
            isLast={i === stages.length - 1}
          />
        ))}
      </div>
    </div>
  );
}

// ── Main Process Flow ─────────────────────────────────────────────────────────

function ProcessFlow({
  phases, phaseGroups, currentStage, history,
}: {
  phases: BlueprintPhase[];
  phaseGroups: BlueprintPhaseGroup[];
  currentStage: BlueprintPhase | null;
  history: StageHistoryEntry[];
}) {
  const sorted = [...phases].sort((a, b) => a.order - b.order);

  if (phaseGroups.length > 0) {
    // Group-aware layout
    const sortedGroups = [...phaseGroups].sort((a, b) => a.order - b.order);
    const ungrouped = sorted.filter(p => !p.groupId || !phaseGroups.find(g => g.id === p.groupId));

    return (
      <div className="flex items-start gap-6 overflow-x-auto py-2 px-4 scroll-smooth" style={{ scrollbarWidth: "thin" }}>
        {sortedGroups.map((group, gi) => {
          const groupStages = sorted.filter(p => p.groupId === group.id);
          if (!groupStages.length) return null;
          return (
            <div key={group.id} className="flex items-start gap-0">
              <PhaseGroup group={group} stages={groupStages} currentStage={currentStage} history={history} allPhases={sorted} />
              {gi < sortedGroups.length - 1 && (
                <div className="w-8 h-[2px] shrink-0 mt-[20px] mx-1 bg-gray-200" />
              )}
            </div>
          );
        })}
        {ungrouped.length > 0 && (
          <PhaseGroup group={null} stages={ungrouped} currentStage={currentStage} history={history} allPhases={sorted} />
        )}
      </div>
    );
  }

  // Flat layout (no groups)
  return (
    <div className="flex items-start overflow-x-auto py-2 px-4 scroll-smooth" style={{ scrollbarWidth: "thin" }}>
      {sorted.map((phase, i) => (
        <StageNode
          key={phase.id}
          phase={phase}
          status={getStageStatus(phase, currentStage, history, sorted)}
          isLast={i === sorted.length - 1}
        />
      ))}
    </div>
  );
}

// ── Transition Button ─────────────────────────────────────────────────────────

function TransitionButton({ transition, onExecute, executing }: {
  transition: BlueprintTransition; onExecute: (t: BlueprintTransition) => void; executing: boolean;
}) {
  const color = transition.buttonColor || "#3b82f6";
  return (
    <button onClick={() => onExecute(transition)} disabled={executing} title={transition.description}
      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-sm font-semibold border transition-all shadow-sm hover:opacity-90 hover:shadow-md active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
      style={{ backgroundColor: color + "15", borderColor: color + "55", color }}>
      {executing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ChevronRight className="w-3.5 h-3.5" />}
      {transition.name}
      {transition.requiresApproval && <Clock className="w-3 h-3 ml-0.5 opacity-70" aria-label="Requires approval" />}
    </button>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

interface BlueprintActionsProps {
  recordId: string;
  moduleFields?: { name: string; label: string; type?: string }[];
  onStageChanged?: (newStage: string) => void;
  compact?: boolean;
}

export function BlueprintActions({ recordId, moduleFields = [], onStageChanged, compact = false }: BlueprintActionsProps) {
  const { recordStates, loadingRecords, loadForRecord, executeTransition, initializeRecord } = useBlueprintRuntimeStore();

  const state = recordStates[recordId];
  const isLoading = loadingRecords.has(recordId);

  const [pendingTransition, setPendingTransition] = useState<BlueprintTransition | null>(null);
  const [showInitDialog, setShowInitDialog] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  useEffect(() => {
    if (!recordId) return;
    loadForRecord(recordId);
  }, [recordId]); // eslint-disable-line

  const showToast = useCallback((msg: string, type: "success" | "error" = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  }, []);

  const handleTransitionClick = (t: BlueprintTransition) => {
    if (!t.confirmMessage && !t.requiredFields?.length && !t.requiresApproval) {
      runTransition(t, {});
    } else {
      setPendingTransition(t);
    }
  };

  const runTransition = async (t: BlueprintTransition, formData: Record<string, any>) => {
    setExecuting(true);
    setPendingTransition(null);
    try {
      const result = await executeTransition(recordId, t.id, formData);
      if (result.status === "completed") {
        showToast(result.message || "Stage updated successfully", "success");
        onStageChanged?.(result.newStage ?? "");
      } else if (result.status === "pending_approval") {
        showToast("Approval request sent — waiting for approver", "success");
      }
    } catch (err: any) {
      showToast(err?.response?.data?.message || "Failed to execute transition", "error");
    } finally {
      setExecuting(false);
    }
  };

  const handleInitialize = async (stageId: string) => {
    setExecuting(true);
    setShowInitDialog(false);
    try {
      await initializeRecord(recordId, stageId);
      const phase = state?.phases?.find(p => p.id === stageId);
      showToast(`Process started — stage set to "${phase?.name ?? stageId}"`, "success");
      onStageChanged?.(stageId);
    } catch (err: any) {
      showToast(err?.response?.data?.message || "Failed to initialize process", "error");
    } finally {
      setExecuting(false);
    }
  };

  if (!isLoading && !state?.blueprint) return null;

  if (isLoading) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden animate-pulse">
        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100">
          <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />
          <span className="text-sm text-gray-400">Loading process flow…</span>
        </div>
        <div className="h-20 bg-gray-50/60" />
      </div>
    );
  }

  const { blueprint, currentStage, availableTransitions, phases, phaseGroups, canInitialize, stageHistory } = state!;
  const days = daysInStage(stageHistory ?? [], currentStage);
  const borderColor = currentStage?.color ? currentStage.color + "50" : "#e5e7eb";
  const accentColor = currentStage?.color || "#6366f1";

  return (
    <>
      {/* Toast */}
      {toast && (
        <div className={cn(
          "fixed top-4 right-4 z-[9999] flex items-center gap-2 px-4 py-3 rounded-xl shadow-xl text-sm font-medium border animate-in slide-in-from-top-2 fade-in duration-200",
          toast.type === "success" ? "bg-green-50 border-green-200 text-green-800" : "bg-red-50 border-red-200 text-red-800"
        )}>
          {toast.type === "success" ? <CheckCircle2 className="w-4 h-4 text-green-500" /> : <AlertCircle className="w-4 h-4 text-red-500" />}
          {toast.msg}
        </div>
      )}

      {pendingTransition && (
        <TransitionDialog
          transition={pendingTransition}
          fields={moduleFields}
          onConfirm={formData => runTransition(pendingTransition, formData)}
          onCancel={() => setPendingTransition(null)}
          executing={executing}
        />
      )}

      {showInitDialog && blueprint && (
        <InitializeDialog
          blueprintName={blueprint.name}
          phases={phases || []}
          onConfirm={handleInitialize}
          onCancel={() => setShowInitDialog(false)}
          saving={executing}
        />
      )}

      {/* Main process flow card */}
      <div className="rounded-2xl border bg-white shadow-sm overflow-hidden" style={{ borderColor }}>

        {/* Header bar */}
        <div className="flex items-center gap-3 px-4 py-2.5 border-b" style={{ borderBottomColor: borderColor, backgroundColor: accentColor + "08" }}>
          <GitBranch className="w-3.5 h-3.5 shrink-0" style={{ color: accentColor }} />
          <span className="text-xs font-bold text-gray-700 flex-1 truncate">{blueprint?.name}</span>

          {currentStage && (
            <StageBadge stage={currentStage} />
          )}

          {days !== null && (
            <span className="text-[10px] text-gray-400 shrink-0 tabular-nums">
              <Clock className="w-3 h-3 inline mr-0.5 text-gray-300" />{days}d in stage
            </span>
          )}

          {!currentStage && !canInitialize && (
            <span className="text-[10px] text-gray-400 italic px-2 py-0.5 rounded-full bg-gray-100 border border-gray-200 shrink-0">Not started</span>
          )}
        </div>

        {/* Stage timeline */}
        {phases.length > 0 && (currentStage || canInitialize) && (
          <div className="bg-gray-50/40 border-b" style={{ borderBottomColor: "#f1f5f9" }}>
            <ProcessFlow
              phases={phases}
              phaseGroups={phaseGroups ?? []}
              currentStage={currentStage}
              history={stageHistory ?? []}
            />
          </div>
        )}

        {/* Action row */}
        <div className="px-4 py-3 flex flex-wrap items-center gap-2.5">
          {availableTransitions.length > 0 ? (
            availableTransitions.map(t => (
              <TransitionButton key={t.id} transition={t} onExecute={handleTransitionClick} executing={executing} />
            ))
          ) : canInitialize ? (
            <button onClick={() => setShowInitDialog(true)} disabled={executing}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-sm font-semibold bg-indigo-50 border border-indigo-200 text-indigo-700 hover:bg-indigo-100 transition-colors shadow-sm disabled:opacity-50">
              {executing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
              Start Process
            </button>
          ) : currentStage ? (
            <span className="text-xs text-gray-400 italic">No transitions available at this stage</span>
          ) : null}
        </div>

        {/* Pending approval tasks */}
        <PendingTaskBanner
          recordId={recordId}
          onTaskComplete={() => {
            useBlueprintRuntimeStore.getState().refreshForRecord(recordId);
            onStageChanged?.("");
          }}
        />
      </div>
    </>
  );
}

export default BlueprintActions;
