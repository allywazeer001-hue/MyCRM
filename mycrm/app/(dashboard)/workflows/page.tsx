"use client";
import { useEffect, useRef, useState } from "react";
import {
  Workflow, Plus, Play, Pause, Zap, Clock, Bell, Globe, Trash2,
  ChevronDown, ChevronRight, X, Settings2, CheckCircle2, AlertCircle,
  ArrowRight, Loader2, Edit2, History, Mail, Link2, CheckSquare,
  FileText, RotateCcw,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { api } from "@/lib/api";
import { useModulesStore } from "@/store/modules.store";
import { cn } from "@/lib/utils";
import {
  ConditionGroup, ensureIds, normalizeConditionTree, summarizeTree, uid,
} from "@/lib/condition-tree";
import { ACTION_TYPES } from "@/components/workflows/condition-operators";
import { RuleGroup, RuleGroupsEditor, emptyRuleGroup } from "@/components/workflows/RuleGroupsEditor";
import { ModuleIcon } from "@/components/ui/module-icon";

// ── Types ─────────────────────────────────────────────────────────────────────

interface WorkflowDraft {
  name: string;
  description: string;
  trigger: string;
  triggerConfig: any;
  moduleId: string;
  tags: string[];
  ruleGroups: RuleGroup[];
}

// ── Constants ─────────────────────────────────────────────────────────────────

const TRIGGER_OPTIONS = [
  { value: "RECORD_CREATED",  label: "Record Created",  icon: "✨", description: "Fires when a new record is added" },
  { value: "RECORD_UPDATED",  label: "Record Updated",  icon: "✏️", description: "Fires when any field is changed" },
  { value: "FIELD_CHANGED",   label: "Field Changed",   icon: "🔀", description: "Fires when a specific field changes" },
  { value: "RECORD_DELETED",  label: "Record Deleted",  icon: "🗑️", description: "Fires when a record is deleted" },
  { value: "FORM_SUBMITTED",  label: "Form Submitted",  icon: "📋", description: "Fires when a public form is submitted" },
  { value: "MANUAL",          label: "Manual",          icon: "▶️", description: "Triggered manually by a user" },
];

const TRIGGER_ICONS: Record<string, any> = {
  RECORD_CREATED: Zap,
  RECORD_UPDATED: Edit2,
  FIELD_CHANGED:  Settings2,
  RECORD_DELETED: Trash2,
  FORM_SUBMITTED: FileText,
  SCHEDULED:      Clock,
  MANUAL:         Play,
  WEBHOOK:        Globe,
};

function relativeTime(iso: string | null) {
  if (!iso) return "Never";
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

// Legacy `conditions` was a flat array; the new tree can nest groups arbitrarily,
// so the list-card badge counts leaf conditions recursively either way.
function countConditionLeaves(node: any): number {
  if (!node) return 0;
  if (node.type === "condition") return 1;
  if (node.type === "group") return (node.children || []).reduce((sum: number, c: any) => sum + countConditionLeaves(c), 0);
  return 0;
}

// ── Run History Panel ─────────────────────────────────────────────────────────

function RunHistoryPanel({
  workflowId, workflowName, onClose,
}: {
  workflowId: string;
  workflowName: string;
  onClose: () => void;
}) {
  const [executions, setExecutions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api.get(`/workflows/${workflowId}/executions`)
      .then(({ data }) => { if (!cancelled) setExecutions(data); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [workflowId]);

  return (
    <div className="fixed inset-y-0 right-0 w-full max-w-[440px] bg-white border-l border-gray-200 shadow-2xl z-50 flex flex-col">
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-gray-50">
        <div>
          <p className="text-sm font-semibold text-gray-900 flex items-center gap-2">
            <History className="w-4 h-4 text-blue-600" /> Run History
          </p>
          <p className="text-xs text-gray-500 mt-0.5 truncate max-w-[300px]">{workflowName}</p>
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
          </div>
        ) : executions.length === 0 ? (
          <div className="text-center py-16">
            <RotateCcw className="w-8 h-8 text-gray-200 mx-auto mb-3" />
            <p className="text-sm text-gray-400">No executions yet.</p>
            <p className="text-xs text-gray-300 mt-1">Trigger the workflow to see runs here.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {executions.map((exec, i) => {
              const isSuccess = exec.status === "SUCCESS";
              const isFailed = exec.status === "FAILED";
              const isRunning = exec.status === "RUNNING";
              const duration = exec.finishedAt && exec.startedAt
                ? Math.round((new Date(exec.finishedAt).getTime() - new Date(exec.startedAt).getTime()) / 1000)
                : null;
              return (
                <div key={exec.id} className={cn(
                  "rounded-lg border p-3 transition-all",
                  isSuccess ? "border-green-200 bg-green-50" :
                  isFailed  ? "border-red-200 bg-red-50" :
                              "border-gray-200 bg-gray-50"
                )}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        "w-5 h-5 rounded-full text-xs font-bold flex items-center justify-center",
                        isSuccess ? "bg-green-600 text-white" :
                        isFailed  ? "bg-red-600 text-white" :
                                    "bg-gray-400 text-white"
                      )}>
                        {i + 1}
                      </span>
                      <Badge className={cn(
                        "text-xs px-2 py-0",
                        isSuccess ? "bg-green-100 text-green-700 border-green-300" :
                        isFailed  ? "bg-red-100 text-red-700 border-red-300" :
                                    "bg-gray-100 text-gray-600 border-gray-300"
                      )}>
                        {isRunning ? "Running…" : exec.status}
                      </Badge>
                    </div>
                    <div className="text-xs text-gray-400 text-right">
                      <p>{relativeTime(exec.startedAt)}</p>
                      {duration !== null && <p className="text-gray-300">{duration}s</p>}
                    </div>
                  </div>
                  {exec.startedAt && (
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(exec.startedAt).toLocaleString()}
                    </p>
                  )}
                  {isFailed && exec.error && (
                    <div className="mt-1.5 p-2 bg-red-100 rounded text-xs text-red-700 font-mono break-all">
                      {exec.error}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Workflow Builder Dialog ───────────────────────────────────────────────────

function WorkflowBuilderDialog({
  open, onClose, onSave, modules, allWorkflows, initial,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (data: WorkflowDraft) => Promise<void>;
  modules: any[];
  allWorkflows: any[];
  initial?: any;
}) {
  const [openSection, setOpenSection] = useState<string>("setup");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [orgUsers, setOrgUsers] = useState<any[]>([]);
  const [orgDepts, setOrgDepts] = useState<any[]>([]);
  const [tagInput, setTagInput] = useState("");
  // Track which workflow ID was last initialised so the draft is NOT wiped if
  // `initial` momentarily becomes null during the close animation (the parent
  // sets editingWorkflow=null before setShowBuilder=false, causing a render
  // where open=true but initial=null — this guard prevents that reset).
  const initializedForRef = useRef<string | null>(null);
  const [draft, setDraft] = useState<WorkflowDraft>({
    name: "",
    description: "",
    trigger: "RECORD_CREATED",
    triggerConfig: {},
    moduleId: "",
    tags: [],
    ruleGroups: [emptyRuleGroup(0)],
  });

  useEffect(() => {
    if (!open) {
      // Reset the guard so the next open will re-initialise correctly.
      initializedForRef.current = null;
      return;
    }

    // Identify this "session" by the workflow being edited (or "__new__" for create).
    // If initial becomes null while the dialog is still open (happens because the
    // parent sets editingWorkflow=null before showBuilder=false), we do NOT reset —
    // otherwise the user's in-flight edits are lost.
    const targetKey = initial?.id ?? "__new__";
    if (initializedForRef.current === targetKey) return;
    initializedForRef.current = targetKey;

    setOpenSection("setup");
    setSaveError("");
    Promise.all([
      api.get("/users").catch(() => ({ data: [] })),
      api.get("/departments").catch(() => ({ data: [] })),
    ]).then(([u, d]) => {
      setOrgUsers(Array.isArray(u.data) ? u.data : (u.data?.users ?? []));
      setOrgDepts(Array.isArray(d.data) ? d.data : (d.data?.departments ?? []));
    });

    if (initial) {
      const mapAction = (a: any) => ({
        ...a,
        id: a.id || uid(),
        recipientUsers: a.recipientUsers || [],
        recipientDepts: a.recipientDepts || [],
      });

      let ruleGroups: RuleGroup[];
      if (Array.isArray(initial.ruleGroups) && initial.ruleGroups.length > 0) {
        ruleGroups = initial.ruleGroups.map((rg: any, i: number) => ({
          id: rg.id || uid(),
          name: rg.name || `Rule ${i + 1}`,
          order: rg.order ?? i,
          isActive: rg.isActive !== false,
          conditions: ensureIds(normalizeConditionTree(rg.conditions)) as ConditionGroup,
          actions: (rg.actions || []).map(mapAction),
        }));
      } else {
        // Legacy workflow with zero WorkflowRuleGroup rows — synthesize a single
        // "Rule 1" from the old flat conditions[] + actions[] so it's editable
        // through the same rule-group UI, without migrating anything server-side.
        ruleGroups = [{
          id: uid(),
          name: "Rule 1",
          order: 0,
          isActive: true,
          conditions: ensureIds(normalizeConditionTree(initial.conditions)) as ConditionGroup,
          actions: (initial.actions || []).map(mapAction),
        }];
      }

      setDraft({
        name: initial.name || "",
        description: initial.description || "",
        trigger: initial.trigger || "RECORD_CREATED",
        triggerConfig: initial.triggerConfig || {},
        moduleId: initial.moduleId || "",
        tags: Array.isArray(initial.tags) ? initial.tags : [],
        ruleGroups,
      });
    } else {
      setDraft({ name: "", description: "", trigger: "RECORD_CREATED", triggerConfig: {}, moduleId: "", tags: [], ruleGroups: [emptyRuleGroup(0)] });
    }
  }, [open, initial]);

  const mod = modules.find(m => m.id === draft.moduleId);
  const fields: any[] = mod?.fields || [];

  const set = <K extends keyof WorkflowDraft>(k: K, v: WorkflowDraft[K]) =>
    setDraft(d => ({ ...d, [k]: v }));

  const handleSave = async () => {
    if (!draft.name.trim() || !draft.moduleId || !draft.trigger) return;
    setSaving(true);
    setSaveError("");
    try {
      await onSave(draft);
      onClose();
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || "Failed to save workflow. Please try again.";
      setSaveError(Array.isArray(msg) ? msg.join(", ") : String(msg));
    } finally {
      setSaving(false);
    }
  };

  const selectedTrigger = TRIGGER_OPTIONS.find(t => t.value === draft.trigger);
  const groupsMissingActions = draft.ruleGroups.filter(rg => rg.actions.length === 0);
  const allGroupsHaveActions = draft.ruleGroups.length > 0 && groupsMissingActions.length === 0;
  const needsFieldChangedTarget = draft.trigger === "FIELD_CHANGED" && !draft.triggerConfig?.fieldName;
  const canSave = !saving && !!draft.name.trim() && !!draft.moduleId && !!draft.trigger && allGroupsHaveActions && !needsFieldChangedTarget;

  // Surfaced next to the Save button so a disabled button never fails silently —
  // this is the #1 cause of "I set up a condition and nothing happens" reports.
  const cantSaveReason = !draft.name.trim()
    ? "Enter a workflow name"
    : !draft.moduleId
      ? "Select a module"
      : !draft.trigger
        ? "Select a trigger"
        : needsFieldChangedTarget
          ? "Pick which field this workflow should watch"
          : draft.ruleGroups.length === 0
            ? "Add at least one rule group"
            : groupsMissingActions.length > 0
              ? `"${groupsMissingActions[0].name}" needs at least one action before you can save`
            : "";

  if (!open) return null;

  const setupSummary = draft.name
    ? `${draft.name}${mod ? ` · ${mod.name}` : ""}`
    : "Not configured";

  const trigSummary = selectedTrigger
    ? `${selectedTrigger.icon} ${selectedTrigger.label}${mod ? ` in ${mod.name}` : ""}`
    : "No trigger selected";

  const ruleGroupsSummary = draft.ruleGroups.length === 0
    ? "No rule groups yet"
    : draft.ruleGroups.map(rg => {
        const treeSummary = summarizeTree(rg.conditions, fields);
        return draft.ruleGroups.length > 1 ? `${rg.name}: ${treeSummary}` : treeSummary;
      }).join(" · ");

  const toggle = (sec: string) => setOpenSection(s => s === sec ? "" : sec);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-gray-50">

      {/* ── Header ── */}
      <div className="shrink-0 bg-white border-b border-gray-200 px-6 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shrink-0">
            <Workflow className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900">{initial ? "Edit Workflow" : "New Workflow"}</p>
            <p className="text-xs text-gray-400">Configure trigger, conditions, and actions — all in one view</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {saveError && (
            <span className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-1.5 max-w-xs truncate">
              {saveError}
            </span>
          )}
          {!saveError && !canSave && cantSaveReason && (
            <span className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-1.5 max-w-xs truncate" title={cantSaveReason}>
              {cantSaveReason}
            </span>
          )}
          <Button variant="ghost" size="sm" className="h-8" onClick={onClose}>Cancel</Button>
          <Button size="sm" className="h-8 gap-1.5" disabled={!canSave} onClick={handleSave} title={cantSaveReason || undefined}>
            {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {initial ? "Update" : "Save Workflow"}
          </Button>
        </div>
      </div>

      {/* ── Scrollable body ── */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto p-6 pb-16 space-y-0">

          {/* ── SETUP CARD ── */}
          <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
            <button type="button" onClick={() => toggle("setup")}
              className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
                  <Settings2 className="w-4 h-4" />
                </div>
                <div className="text-left min-w-0">
                  <p className="text-sm font-semibold text-gray-900">Setup</p>
                  {openSection !== "setup" && (
                    <p className="text-xs text-gray-500 mt-0.5 truncate max-w-md">{setupSummary}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {draft.name && openSection !== "setup" && (
                  <span className="text-[10px] font-medium px-2 py-0.5 bg-green-100 text-green-700 rounded-full">Configured</span>
                )}
                <ChevronDown className={cn("w-4 h-4 text-gray-400 transition-transform", openSection === "setup" && "rotate-180")} />
              </div>
            </button>
            {openSection === "setup" && (
              <div className="px-5 pb-5 pt-1 border-t border-gray-100 space-y-4">
                <div className="grid grid-cols-2 gap-4 pt-2">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Workflow Name *</Label>
                    <Input value={draft.name} onChange={e => set("name", e.target.value)} placeholder="e.g. Auto-assign on create" className="h-9" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Module *</Label>
                    <Select value={draft.moduleId} onValueChange={v => set("moduleId", v)}>
                      <SelectTrigger className="h-9"><SelectValue placeholder="Select module" /></SelectTrigger>
                      <SelectContent>{modules.map(m => <SelectItem key={m.id} value={m.id}><ModuleIcon icon={m.icon} slug={m.slug} className="w-4 h-4 inline-block mr-1 -mt-0.5" /> {m.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Description</Label>
                  <Input value={draft.description} onChange={e => set("description", e.target.value)} placeholder="Optional description" className="h-9" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-medium">Tags</Label>
                  <div className="flex flex-wrap gap-1.5">
                    {draft.tags.map(tag => (
                      <span key={tag} className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-xs font-medium">
                        #{tag}
                        <button type="button" onClick={() => set("tags", draft.tags.filter(t => t !== tag))}><X className="w-3 h-3" /></button>
                      </span>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Input className="h-8 text-xs flex-1" placeholder="Add tag and press Enter"
                      value={tagInput} onChange={e => setTagInput(e.target.value)}
                      onKeyDown={e => {
                        if ((e.key === "Enter" || e.key === ",") && tagInput.trim()) {
                          e.preventDefault();
                          const t = tagInput.trim().toLowerCase().replace(/\s+/g, "-");
                          if (!draft.tags.includes(t)) set("tags", [...draft.tags, t]);
                          setTagInput("");
                        }
                      }} />
                    <Button type="button" variant="outline" size="sm" className="h-8 px-3 text-xs"
                      onClick={() => {
                        const t = tagInput.trim().toLowerCase().replace(/\s+/g, "-");
                        if (t && !draft.tags.includes(t)) set("tags", [...draft.tags, t]);
                        setTagInput("");
                      }}>Add</Button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Flow connector */}
          <div className="flex flex-col items-center py-1">
            <div className="w-px h-5 bg-gray-300" />
            <div className="w-0 h-0 border-l-[5px] border-l-transparent border-r-[5px] border-r-transparent border-t-[6px] border-t-gray-300" />
          </div>

          {/* ── TRIGGER CARD ── */}
          <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
            <button type="button" onClick={() => toggle("trigger")}
              className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-yellow-100 flex items-center justify-center text-yellow-600 shrink-0">
                  <Zap className="w-4 h-4" />
                </div>
                <div className="text-left min-w-0">
                  <p className="text-sm font-semibold text-gray-900">
                    Trigger <span className="text-[10px] text-red-400 font-normal">required</span>
                  </p>
                  {openSection !== "trigger" && (
                    <p className={cn("text-xs mt-0.5 truncate max-w-md", draft.trigger ? "text-gray-600" : "text-amber-500")}>{trigSummary}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {draft.trigger && openSection !== "trigger" && (
                  <span className="text-[10px] font-medium px-2 py-0.5 bg-green-100 text-green-700 rounded-full">Configured</span>
                )}
                <ChevronDown className={cn("w-4 h-4 text-gray-400 transition-transform", openSection === "trigger" && "rotate-180")} />
              </div>
            </button>
            {openSection === "trigger" && (
              <div className="px-5 pb-5 border-t border-gray-100">
                <div className="grid grid-cols-2 gap-3 mt-4">
                  {TRIGGER_OPTIONS.map(t => (
                    <button key={t.value} onClick={() => set("trigger", t.value)}
                      className={cn(
                        "p-4 rounded-xl border-2 text-left transition-all",
                        draft.trigger === t.value ? "border-blue-500 bg-blue-50" : "border-gray-200 hover:border-gray-300 bg-white"
                      )}>
                      <div className="flex items-center gap-2.5">
                        <span className="text-xl">{t.icon}</span>
                        <div>
                          <p className={cn("text-sm font-medium", draft.trigger === t.value ? "text-blue-700" : "text-gray-800")}>{t.label}</p>
                          <p className="text-xs text-gray-400 mt-0.5">{t.description}</p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
                {selectedTrigger && (
                  <div className="mt-3 flex items-center gap-2 px-4 py-2.5 bg-blue-50 rounded-xl text-xs text-blue-700 border border-blue-100">
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                    <strong>{selectedTrigger.label}</strong> — {selectedTrigger.description}
                  </div>
                )}

                {/* Field Changed needs to know WHICH field to watch — without it the
                    backend never matches this workflow at all (see
                    WorkflowsService.executeForRecord), rather than firing on every
                    edit the way Record Updated does. */}
                {draft.trigger === "FIELD_CHANGED" && (
                  <div className="mt-3 border border-violet-200 rounded-xl bg-violet-50/30 p-4 space-y-2">
                    <p className="text-[11px] font-bold uppercase tracking-wide text-violet-500">Field to Watch</p>
                    {!draft.moduleId ? (
                      <p className="text-xs text-gray-500">Pick a module below first, then choose which field to watch.</p>
                    ) : (
                      <>
                        <Select value={draft.triggerConfig?.fieldName || ""} onValueChange={v => set("triggerConfig", { ...draft.triggerConfig, fieldName: v })}>
                          <SelectTrigger className="h-9 text-sm bg-white"><SelectValue placeholder="Select a field…" /></SelectTrigger>
                          <SelectContent>
                            {fields.map((f: any) => <SelectItem key={f.id} value={f.name}>{f.label}</SelectItem>)}
                          </SelectContent>
                        </Select>
                        <p className="text-[11px] text-gray-400 leading-snug">
                          {draft.triggerConfig?.fieldName
                            ? `Fires only when "${fields.find((f: any) => f.name === draft.triggerConfig.fieldName)?.label ?? draft.triggerConfig.fieldName}" changes — not on edits to any other field.`
                            : "This workflow won't run until you pick a field."}
                        </p>
                      </>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Flow connector */}
          <div className="flex flex-col items-center py-1">
            <div className="w-px h-5 bg-gray-300" />
            <div className="w-0 h-0 border-l-[5px] border-l-transparent border-r-[5px] border-r-transparent border-t-[6px] border-t-gray-300" />
          </div>

          {/* ── RULES CARD (conditions + actions, per rule group) ── */}
          <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
            <button type="button" onClick={() => toggle("rules")}
              className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center text-purple-600 shrink-0">
                  <CheckSquare className="w-4 h-4" />
                </div>
                <div className="text-left min-w-0">
                  <p className="text-sm font-semibold text-gray-900">
                    Rules
                    <span className="ml-2 text-xs font-normal text-purple-600 bg-purple-100 px-1.5 py-0.5 rounded-full">{draft.ruleGroups.length}</span>
                    <span className="ml-2 text-[10px] text-red-400 font-normal">required</span>
                  </p>
                  {openSection !== "rules" && (
                    <p className="text-xs text-gray-500 mt-0.5 truncate max-w-md">{ruleGroupsSummary}</p>
                  )}
                </div>
              </div>
              <ChevronDown className={cn("w-4 h-4 text-gray-400 transition-transform shrink-0", openSection === "rules" && "rotate-180")} />
            </button>
            {openSection === "rules" && (
              <div className="px-5 pb-5 border-t border-gray-100 pt-4">
                <p className="text-xs text-gray-400 mb-3">
                  Each rule group has its own conditions and actions, evaluated independently — a workflow can fire multiple unrelated rules from the same trigger.
                </p>
                {!draft.moduleId ? (
                  <div className="py-6 text-center text-sm text-amber-600 bg-amber-50 rounded-xl border border-amber-100">
                    Select a module in Setup first.
                  </div>
                ) : (
                  <RuleGroupsEditor
                    ruleGroups={draft.ruleGroups}
                    onChange={v => set("ruleGroups", v)}
                    fields={fields}
                    modules={modules}
                    allWorkflows={allWorkflows}
                    orgUsers={orgUsers}
                    orgDepts={orgDepts}
                  />
                )}
              </div>
            )}
          </div>

        </div>
      </div>

    </div>
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
  const [historyWfId, setHistoryWfId] = useState<string | null>(null);

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
    // No top-level `conditions`/`actions` keys — rule groups replace both. Omitting
    // `actions` (rather than sending `actions: []`) leaves any legacy WorkflowAction
    // rows alone; the execution engine ignores them once ruleGroups exist.
    const payload = {
      name: draft.name,
      description: draft.description,
      trigger: draft.trigger,
      triggerConfig: draft.triggerConfig,
      moduleId: draft.moduleId,
      tags: draft.tags,
      ruleGroups: draft.ruleGroups.map(rg => ({
        id: rg.id,
        name: rg.name,
        order: rg.order,
        isActive: rg.isActive,
        conditions: rg.conditions,
        actions: rg.actions.map(a => ({
          id: a.id, type: a.type, config: a.config, order: a.order,
          recipientUsers: a.recipientUsers, recipientDepts: a.recipientDepts,
        })),
      })),
    };
    if (editingWorkflow) {
      const { data } = await api.patch(`/workflows/${editingWorkflow.id}`, payload);
      setWorkflows(prev => prev.map(w => w.id === editingWorkflow.id ? data : w));
    } else {
      const { data } = await api.post("/workflows", payload);
      setWorkflows(prev => [data, ...prev]);
    }
    // Do NOT call setEditingWorkflow(null) here — that's the onClose callback's job.
    // Calling it early (while showBuilder is still true) causes a render where
    // initial=null but open=true, which previously wiped the draft mid-save.
  };

  const historyWorkflow = workflows.find(w => w.id === historyWfId);

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
            // Prefer the new rule groups when present — legacy top-level actions[]
            // is left empty once a workflow is saved through the rule-group UI.
            const ruleGroupsList: any[] = wf.ruleGroups || [];
            const usingRuleGroups = ruleGroupsList.length > 0;
            const actions: any[] = usingRuleGroups
              ? ruleGroupsList.flatMap((rg: any) => rg.actions || [])
              : (wf.actions || []);
            const conditionsCount = usingRuleGroups
              ? ruleGroupsList.reduce((sum: number, rg: any) => sum + countConditionLeaves(rg.conditions), 0)
              : (wf.conditions?.length ?? 0);
            const lastExec = wf.lastExecution;
            return (
              <Card key={wf.id} className={cn("transition-all hover:shadow-md", !wf.isActive && "opacity-60")}>
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
                        {Array.isArray(wf.tags) && wf.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {wf.tags.map((tag: string) => (
                              <span key={tag} className="px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-500 text-[10px] font-medium">
                                #{tag}
                              </span>
                            ))}
                          </div>
                        )}
                        {/* Last run info */}
                        {lastExec ? (
                          <div className="flex items-center gap-1.5 mt-1.5">
                            <span className={cn(
                              "w-1.5 h-1.5 rounded-full",
                              lastExec.status === "SUCCESS" ? "bg-green-500" :
                              lastExec.status === "FAILED"  ? "bg-red-500" : "bg-gray-400"
                            )} />
                            <span className="text-xs text-gray-400">
                              Last run: <span className={cn(
                                "font-medium",
                                lastExec.status === "SUCCESS" ? "text-green-600" :
                                lastExec.status === "FAILED"  ? "text-red-600" : "text-gray-500"
                              )}>{lastExec.status}</span>
                              {" "}· {relativeTime(lastExec.startedAt)}
                            </span>
                          </div>
                        ) : (
                          <p className="text-xs text-gray-300 mt-1">Never run</p>
                        )}
                      </div>
                    </div>
                    <Switch checked={wf.isActive} onCheckedChange={() => toggleWorkflow(wf.id)} />
                  </div>

                  {/* Conditions + Actions summary */}
                  <div className="flex items-center gap-2 text-xs text-gray-500 mb-3 flex-wrap">
                    {conditionsCount > 0 && (
                      <Badge variant="outline" className="text-xs gap-1 font-normal">
                        {conditionsCount} condition{conditionsCount !== 1 ? "s" : ""}
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
                    <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 text-gray-500 hover:text-blue-600"
                      onClick={() => setHistoryWfId(wf.id)}>
                      <History className="w-3 h-3" /> History
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
        allWorkflows={workflows}
        initial={editingWorkflow}
      />

      {/* Run History Slide-over */}
      {historyWfId && historyWorkflow && (
        <>
          <div className="fixed inset-0 bg-black/20 z-40" onClick={() => setHistoryWfId(null)} />
          <RunHistoryPanel
            workflowId={historyWfId}
            workflowName={historyWorkflow.name}
            onClose={() => setHistoryWfId(null)}
          />
        </>
      )}
    </div>
  );
}
