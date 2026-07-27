"use client";
import { useEffect, useState, Suspense } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, Save, Loader2, CheckCircle2, AlertCircle, Workflow, RefreshCw, Lock, Link2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { api } from "@/lib/api";
import { useModulesStore } from "@/store/modules.store";
import { cn } from "@/lib/utils";
import {
  ConditionGroup, ensureIds, normalizeConditionTree, uid,
} from "@/lib/condition-tree";
import { RuleGroup, RuleGroupsEditor, emptyRuleGroup } from "@/components/workflows/RuleGroupsEditor";
import { findBlueprintLinksForWorkflows } from "@/lib/blueprint-links";
import { ModuleIcon } from "@/components/ui/module-icon";

// ── helpers ───────────────────────────────────────────────────────────────────

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
  { value: "SCHEDULED",      label: "Scheduled",       icon: "🕐", description: "Fires on a recurring schedule or date field" },
];

// Condition operators, action types, and action config editing now live in the
// shared components/workflows/* modules (condition-operators.ts,
// action-config-editor.tsx), used below via RuleGroupsEditor — kept in sync across
// this page and app/(dashboard)/workflows/page.tsx instead of drifting per-page.

// ── Scheduled trigger config ──────────────────────────────────────────────────

function ScheduledTriggerConfig({ config, moduleId, modules, onChange }: {
  config: any;
  moduleId: string;
  modules: any[];
  onChange: (c: any) => void;
}) {
  const [dateFields, setDateFields] = useState<any[]>([]);
  const scheduleType: string = config.scheduleType || "RECURRING";
  const upd = (k: string, v: any) => onChange({ ...config, [k]: v });

  useEffect(() => {
    if (scheduleType !== "DATE_FIELD" || !moduleId) { setDateFields([]); return; }
    api.get(`/modules/${moduleId}/fields`)
      .then(({ data }) =>
        setDateFields((data ?? []).filter((f: any) => ["DATE", "DATETIME"].includes(f.type)))
      )
      .catch(() => {});
  }, [scheduleType, moduleId]);

  return (
    <div className="mt-3 border border-violet-200 rounded-xl bg-violet-50/30 p-4 space-y-4">
      <p className="text-[11px] font-bold uppercase tracking-wide text-violet-500">Schedule Configuration</p>

      {/* Schedule type */}
      <div className="grid grid-cols-2 gap-2">
        {[
          { v: "RECURRING",  l: "Recurring",   d: "Run on a fixed schedule" },
          { v: "DATE_FIELD", l: "Date Field",   d: "Trigger based on a record date" },
        ].map(o => (
          <button
            key={o.v}
            type="button"
            onClick={() => upd("scheduleType", o.v)}
            className={cn(
              "p-3 rounded-xl border text-left text-xs transition-all",
              scheduleType === o.v
                ? "border-violet-400 bg-violet-50 shadow-sm"
                : "border-gray-200 bg-white hover:border-gray-300"
            )}
          >
            <p className={cn("font-semibold", scheduleType === o.v ? "text-violet-700" : "text-gray-700")}>{o.l}</p>
            <p className="text-gray-400 mt-0.5 leading-snug">{o.d}</p>
          </button>
        ))}
      </div>

      {/* RECURRING options */}
      {scheduleType === "RECURRING" && (
        <>
          <div>
            <Label className="text-xs font-medium text-gray-500 mb-1.5 block">Frequency</Label>
            <Select value={config.frequency || "DAILY"} onValueChange={v => upd("frequency", v)}>
              <SelectTrigger className="h-9 text-sm bg-white"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="DAILY">Daily</SelectItem>
                <SelectItem value="WEEKDAYS">Weekdays only (Mon–Fri)</SelectItem>
                <SelectItem value="WEEKLY">Weekly</SelectItem>
                <SelectItem value="MONTHLY">Monthly</SelectItem>
                <SelectItem value="QUARTERLY">Quarterly</SelectItem>
                <SelectItem value="YEARLY">Yearly</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {config.frequency === "WEEKLY" && (
            <div>
              <Label className="text-xs font-medium text-gray-500 mb-1.5 block">Day of Week</Label>
              <Select value={String(config.dayOfWeek ?? 1)} onValueChange={v => upd("dayOfWeek", Number(v))}>
                <SelectTrigger className="h-9 text-sm bg-white"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"].map((d, i) => (
                    <SelectItem key={i} value={String(i)}>{d}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {["MONTHLY","QUARTERLY","YEARLY"].includes(config.frequency || "DAILY") && (
            <div>
              <Label className="text-xs font-medium text-gray-500 mb-1.5 block">Day of Month</Label>
              <Input
                type="number" min={1} max={28}
                value={config.dayOfMonth ?? 1}
                onChange={e => upd("dayOfMonth", Number(e.target.value))}
                className="h-9 text-sm w-24 bg-white"
              />
            </div>
          )}

          <div>
            <Label className="text-xs font-medium text-gray-500 mb-1.5 block">Run Time (server time)</Label>
            <Input
              type="time"
              value={config.time || "08:00"}
              onChange={e => upd("time", e.target.value)}
              className="h-9 text-sm w-36 bg-white"
            />
          </div>
        </>
      )}

      {/* DATE_FIELD options */}
      {scheduleType === "DATE_FIELD" && (
        <>
          {!moduleId && (
            <p className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-lg p-2.5">
              Select a module above to configure date field triggers.
            </p>
          )}
          {moduleId && dateFields.length === 0 && (
            <p className="text-xs text-gray-400 italic">No date or datetime fields found in this module.</p>
          )}
          {moduleId && dateFields.length > 0 && (
            <>
              <div>
                <Label className="text-xs font-medium text-gray-500 mb-1.5 block">Date Field</Label>
                <Select value={config.fieldName || ""} onValueChange={v => upd("fieldName", v)}>
                  <SelectTrigger className="h-9 text-sm bg-white"><SelectValue placeholder="Select date field" /></SelectTrigger>
                  <SelectContent>
                    {dateFields.map(f => <SelectItem key={f.id ?? f.name} value={f.name}>{f.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs font-medium text-gray-500 mb-1.5 block">Days Offset</Label>
                  <Input
                    type="number"
                    value={config.offset ?? 0}
                    onChange={e => upd("offset", Number(e.target.value))}
                    className="h-9 text-sm bg-white"
                    placeholder="0"
                  />
                  <p className="text-[10px] text-gray-400 mt-1">Negative = before, positive = after</p>
                </div>
                <div>
                  <Label className="text-xs font-medium text-gray-500 mb-1.5 block">Run Time</Label>
                  <Input
                    type="time"
                    value={config.time || "09:00"}
                    onChange={e => upd("time", e.target.value)}
                    className="h-9 text-sm bg-white"
                  />
                </div>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}

// ── Field Changed trigger config ────────────────────────────────────────────────
// FIELD_CHANGED needs to know WHICH field to watch — without this, the backend
// never matches it (a workflow with no fieldName configured simply never fires,
// see WorkflowsService.executeForRecord), rather than silently firing on every
// edit the way Record Updated does.

function FieldChangedTriggerConfig({ config, moduleId, onChange }: {
  config: any;
  moduleId: string;
  onChange: (c: any) => void;
}) {
  const [fields, setFields] = useState<any[]>([]);

  useEffect(() => {
    if (!moduleId) { setFields([]); return; }
    api.get(`/modules/${moduleId}/fields`)
      .then(({ data }) => setFields(data ?? []))
      .catch(() => setFields([]));
  }, [moduleId]);

  if (!moduleId) {
    return (
      <div className="mt-3 border border-violet-200 rounded-xl bg-violet-50/30 p-4">
        <p className="text-xs text-gray-500">Pick a module above first, then choose which field to watch.</p>
      </div>
    );
  }

  return (
    <div className="mt-3 border border-violet-200 rounded-xl bg-violet-50/30 p-4 space-y-2">
      <p className="text-[11px] font-bold uppercase tracking-wide text-violet-500">Field to Watch</p>
      <Select value={config.fieldName || ""} onValueChange={v => onChange({ ...config, fieldName: v })}>
        <SelectTrigger className="h-9 text-sm bg-white"><SelectValue placeholder="Select a field…" /></SelectTrigger>
        <SelectContent>
          {fields.map(f => <SelectItem key={f.id} value={f.name}>{f.label}</SelectItem>)}
        </SelectContent>
      </Select>
      <p className="text-[11px] text-gray-400 leading-snug">
        {config.fieldName
          ? `Fires only when "${fields.find(f => f.name === config.fieldName)?.label ?? config.fieldName}" changes — not on edits to any other field.`
          : "This workflow won't run until you pick a field."}
      </p>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

const EMPTY_DRAFT = {
  name: "", description: "", trigger: "RECORD_CREATED", triggerConfig: {}, moduleId: "", tags: [], isRepeatable: true,
  ruleGroups: [emptyRuleGroup(0)] as RuleGroup[],
};

function WorkflowBuilderPageInner() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { modules, fetchModules } = useModulesStore();

  const isNew = id === "new";
  // Present when this page was opened from a Blueprint transition's "Create new
  // workflow" action — preselects the module and, on save, links the new
  // workflow back to that specific transition (see handleSave below).
  const linkModuleId = searchParams.get("moduleId") || "";
  const linkBlueprintId = searchParams.get("blueprintId") || "";
  const linkTransitionId = searchParams.get("transitionId") || "";
  const isLinkFlow = isNew && !!linkBlueprintId && !!linkTransitionId;

  const [draft, setDraft] = useState<any>(() =>
    isNew && linkModuleId ? { ...EMPTY_DRAFT, moduleId: linkModuleId } : EMPTY_DRAFT
  );
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);
  const [orgUsers, setOrgUsers] = useState<any[]>([]);
  const [orgDepts, setOrgDepts] = useState<any[]>([]);
  const [allWorkflows, setAllWorkflows] = useState<any[]>([]);
  const [linkInfo, setLinkInfo] = useState<{ blueprintName: string; transitionName: string } | null>(null);
  const [linkedDone, setLinkedDone] = useState(false);

  useEffect(() => {
    if (!isLinkFlow) return;
    api.get(`/blueprints/${linkBlueprintId}`).then(({ data }) => {
      const transitions = (data?.transitions ?? []) as any[];
      const transition = transitions.find(t => t.id === linkTransitionId);
      setLinkInfo({ blueprintName: data?.name ?? "Blueprint", transitionName: transition?.name ?? "Transition" });
    }).catch(() => {});
  }, [isLinkFlow, linkBlueprintId, linkTransitionId]);

  // For an existing workflow opened directly (not via the "create for this
  // transition" flow above) — discover whether some blueprint transition already
  // links to it, so the "locked to blueprint" banner still shows.
  useEffect(() => {
    if (isNew || isLinkFlow) return;
    findBlueprintLinksForWorkflows().then(map => {
      const link = map.get(id as string);
      if (link) setLinkInfo({ blueprintName: link.blueprintName, transitionName: link.transitionName });
    });
  }, [isNew, isLinkFlow, id]);

  const showToast = (msg: string, type: "success" | "error" = "success") => {
    setToast({ msg, type }); setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => { fetchModules(); }, [fetchModules]);

  useEffect(() => {
    Promise.all([
      api.get("/users").catch(() => ({ data: [] })),
      api.get("/departments").catch(() => ({ data: [] })),
      api.get("/workflows").catch(() => ({ data: [] })),
    ]).then(([u, d, w]) => {
      setOrgUsers(Array.isArray(u.data) ? u.data : (u.data?.users ?? []));
      setOrgDepts(Array.isArray(d.data) ? d.data : (d.data?.departments ?? []));
      setAllWorkflows(Array.isArray(w.data) ? w.data : []);
    });
  }, []);

  useEffect(() => {
    if (isNew) return;
    const mapAction = (a: any) => ({
      ...a,
      id: a.id || uid(),
      recipientUsers: a.recipientUsers || [],
      recipientDepts: a.recipientDepts || [],
    });

    api.get(`/workflows/${id}`)
      .then(({ data }) => {
        let ruleGroups: RuleGroup[];
        if (Array.isArray(data.ruleGroups) && data.ruleGroups.length > 0) {
          ruleGroups = data.ruleGroups.map((rg: any, i: number) => ({
            id: rg.id || uid(),
            name: rg.name || `Rule ${i + 1}`,
            order: rg.order ?? i,
            isActive: rg.isActive !== false,
            conditions: ensureIds(normalizeConditionTree(rg.conditions)) as ConditionGroup,
            actions: (rg.actions || []).map(mapAction),
          }));
        } else {
          // Legacy workflow with zero WorkflowRuleGroup rows — synthesize a single
          // "Rule 1" from the old flat conditions[] + actions[], editable through
          // the same rule-group UI, without migrating anything server-side.
          ruleGroups = [{
            id: uid(),
            name: "Rule 1",
            order: 0,
            isActive: true,
            conditions: ensureIds(normalizeConditionTree(data.conditions)) as ConditionGroup,
            actions: (data.actions || []).map(mapAction),
          }];
        }

        setDraft({
          name: data.name || "",
          description: data.description || "",
          trigger: data.trigger || "RECORD_CREATED",
          triggerConfig: data.triggerConfig || {},
          moduleId: data.moduleId || "",
          tags: Array.isArray(data.tags) ? data.tags : [],
          isRepeatable: data.isRepeatable !== false,
          ruleGroups,
        });
      })
      .catch(() => showToast("Failed to load workflow", "error"))
      .finally(() => setLoading(false));
  }, [id, isNew]);

  const mod = modules.find(m => m.id === draft.moduleId);
  const fields: any[] = mod?.fields || [];

  const set = (k: string, v: any) => { setDraft((d: any) => ({ ...d, [k]: v })); setDirty(true); };

  const isScheduledRecurring = draft.trigger === "SCHEDULED" && (draft.triggerConfig?.scheduleType || "RECURRING") === "RECURRING";

  const handleSave = async () => {
    if (!draft.name.trim() || (!draft.moduleId && !isScheduledRecurring)) return;
    setSaving(true);
    try {
      // No top-level `conditions`/`actions` keys — rule groups replace both.
      // Omitting `actions` (rather than sending `actions: []`) leaves any legacy
      // WorkflowAction rows alone; the execution engine ignores them once
      // ruleGroups exist.
      const payload = {
        name: draft.name,
        description: draft.description,
        trigger: draft.trigger,
        triggerConfig: draft.triggerConfig,
        moduleId: draft.moduleId,
        tags: draft.tags,
        isRepeatable: draft.isRepeatable,
        ruleGroups: draft.ruleGroups.map((rg: RuleGroup) => ({
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
      if (isNew) {
        const { data } = await api.post("/workflows", payload);
        if (isLinkFlow) {
          await api.patch(`/blueprints/${linkBlueprintId}/transitions/${linkTransitionId}/link-workflow`, { workflowId: data.id });
          // Notify the blueprint tab (if this page was window.open()'d from it) so
          // it can refresh the linked-workflow display without a manual reload.
          try {
            window.opener?.postMessage({ type: "workflow-linked", transitionId: linkTransitionId, workflowId: data.id, workflowName: data.name }, "*");
          } catch {}
          showToast("Workflow created and linked to blueprint");
          setLinkedDone(true);
          router.replace(`/settings/workflows/${data.id}`);
        } else {
          showToast("Workflow created");
          router.replace(`/settings/workflows/${data.id}`);
        }
      } else {
        await api.patch(`/workflows/${id}`, payload);
        showToast("Workflow saved");
        setDirty(false);
      }
    } catch {
      showToast("Failed to save", "error");
    } finally {
      setSaving(false);
    }
  };

  const groupsMissingActions = draft.ruleGroups.filter((rg: RuleGroup) => rg.actions.length === 0);
  const allGroupsHaveActions = draft.ruleGroups.length > 0 && groupsMissingActions.length === 0;
  const needsFieldChangedTarget = draft.trigger === "FIELD_CHANGED" && !draft.triggerConfig?.fieldName;
  const canSave = draft.name.trim() && (draft.moduleId || isScheduledRecurring) && allGroupsHaveActions && !needsFieldChangedTarget;

  // Surfaced next to the Save button so a disabled button never fails silently —
  // this is the #1 cause of "I set up a condition and nothing happens" reports.
  const cantSaveReason = !draft.name.trim()
    ? "Enter a workflow name"
    : (!draft.moduleId && !isScheduledRecurring)
      ? "Select a module"
      : needsFieldChangedTarget
        ? "Pick which field this workflow should watch"
        : draft.ruleGroups.length === 0
          ? "Add at least one rule group"
          : groupsMissingActions.length > 0
            ? `"${groupsMissingActions[0].name}" needs at least one action before you can save`
            : "";

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

        <Button onClick={handleSave} disabled={saving || !canSave} className="gap-2 shrink-0" title={cantSaveReason || undefined}>
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {isNew ? "Create Workflow" : "Save"}
        </Button>
      </div>

      {!canSave && !saving && cantSaveReason && (
        <div className="shrink-0 flex items-center gap-2 px-4 py-2 bg-amber-50 border-b border-amber-100 text-xs text-amber-700">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>Can&apos;t save yet — {cantSaveReason}.</span>
        </div>
      )}

      {isLinkFlow && !linkedDone && (
        <div className="shrink-0 flex items-center gap-2 px-4 py-2 bg-indigo-50 border-b border-indigo-100 text-xs text-indigo-700">
          <Link2 className="w-3.5 h-3.5 shrink-0" />
          <span>
            Creating a workflow for blueprint <strong>{linkInfo?.blueprintName ?? "…"}</strong>
            {" → "}transition <strong>{linkInfo?.transitionName ?? "…"}</strong>.
            It will be linked automatically once saved — no need to open Workflows separately.
          </span>
        </div>
      )}
      {linkedDone && (
        <div className="shrink-0 flex items-center gap-2 px-4 py-2 bg-green-50 border-b border-green-100 text-xs text-green-700">
          <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
          <span>
            Linked to blueprint <strong>{linkInfo?.blueprintName ?? "this blueprint"}</strong>
            {" → "}transition <strong>{linkInfo?.transitionName ?? ""}</strong>. You can close this tab and return to the blueprint.
          </span>
        </div>
      )}
      {!isLinkFlow && !linkedDone && linkInfo && (
        <div className="shrink-0 flex items-center gap-2 px-4 py-2 bg-indigo-50 border-b border-indigo-100 text-xs text-indigo-700">
          <Lock className="w-3.5 h-3.5 shrink-0" />
          <span>
            Locked to blueprint <strong>{linkInfo.blueprintName}</strong>
            {" → "}transition <strong>{linkInfo.transitionName}</strong>. Its conditions gate whether this transition fires, in addition to this workflow's own rule groups.
          </span>
        </div>
      )}

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
                  {modules.map(m => <SelectItem key={m.id} value={m.id}><ModuleIcon icon={m.icon} slug={m.slug} className="w-4 h-4 inline-block mr-1 -mt-0.5" /> {m.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {/* Repeat behaviour */}
            <div>
              <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 block">Behaviour</Label>
              <button
                type="button"
                onClick={() => set("isRepeatable", !draft.isRepeatable)}
                className={cn(
                  "flex items-center gap-3 p-3.5 rounded-xl border w-full text-left transition-all",
                  draft.isRepeatable
                    ? "border-violet-300 bg-violet-50"
                    : "border-amber-300 bg-amber-50"
                )}
              >
                <div className={cn(
                  "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
                  draft.isRepeatable ? "bg-violet-100" : "bg-amber-100"
                )}>
                  {draft.isRepeatable
                    ? <RefreshCw className="w-4 h-4 text-violet-600" />
                    : <Lock className="w-4 h-4 text-amber-600" />
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <p className={cn("text-xs font-semibold", draft.isRepeatable ? "text-violet-700" : "text-amber-700")}>
                    {draft.isRepeatable ? "Repeatable" : "Run once per record"}
                  </p>
                  <p className="text-[11px] text-gray-400 mt-0.5 leading-snug">
                    {draft.isRepeatable
                      ? "Fires every time the trigger condition is met"
                      : "Only fires once per record — skipped if already ran"}
                  </p>
                </div>
                <div className={cn(
                  "w-9 h-5 rounded-full relative shrink-0 transition-colors",
                  draft.isRepeatable ? "bg-violet-500" : "bg-amber-500"
                )}>
                  <div className={cn(
                    "absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform",
                    draft.isRepeatable ? "left-4" : "left-0.5"
                  )} />
                </div>
              </button>
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

              {draft.trigger === "SCHEDULED" && (
                <ScheduledTriggerConfig
                  config={draft.triggerConfig || {}}
                  moduleId={draft.moduleId}
                  modules={modules}
                  onChange={tc => set("triggerConfig", tc)}
                />
              )}

              {draft.trigger === "FIELD_CHANGED" && (
                <FieldChangedTriggerConfig
                  config={draft.triggerConfig || {}}
                  moduleId={draft.moduleId}
                  onChange={tc => set("triggerConfig", tc)}
                />
              )}
            </div>
          </div>
        </div>

        {/* Right panel — rule groups (nested conditions + actions) */}
        <div className="flex-1 overflow-y-auto p-8 bg-white">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center gap-2.5 mb-4">
              <span className="w-6 h-6 rounded-full bg-amber-500 text-white text-[11px] flex items-center justify-center font-bold">2</span>
              <div>
                <p className="text-sm font-semibold text-gray-900">Rules</p>
                <p className="text-xs text-gray-400">
                  Each rule group evaluates its own conditions independently, then runs its own actions.
                  {!draft.moduleId && !isScheduledRecurring && " Select a module first."}
                </p>
              </div>
            </div>
            <RuleGroupsEditor
              ruleGroups={draft.ruleGroups}
              onChange={(v: RuleGroup[]) => set("ruleGroups", v)}
              fields={fields}
              modules={modules}
              allWorkflows={allWorkflows}
              orgUsers={orgUsers}
              orgDepts={orgDepts}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function WorkflowBuilderPage() {
  return (
    <Suspense fallback={<div className="fixed inset-0 z-40 bg-white flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-violet-500" /></div>}>
      <WorkflowBuilderPageInner />
    </Suspense>
  );
}
