"use client";
import { useState, useRef, useEffect } from "react";
import {
  Trash2, X, Plus, Check, ChevronDown, ChevronsRight, ArrowRight,
  Bell, Users, RotateCcw,
  Zap, MessageSquare, Send,
  MousePointerClick, CheckCircle2, GitBranch, Clock, Webhook, Radio,
  Link2, ExternalLink, Loader2, Lock,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";
import { ConditionTreeBuilder } from "@/components/workflows/ConditionTreeBuilder";
import { ConditionGroup, countConditionLeaves, ensureIds, normalizeConditionTreeFromParts } from "@/lib/condition-tree";
import type { CategorizedOperator } from "@/lib/field-type-operators";
import type {
  FlowTransition, FlowPhase, ModuleField, OrgUser, OrgDepartment,
  TransitionAction, ActionType, TransitionType, WorkflowTriggerType,
} from "./flow-types";

export type { FlowTransition };

// ── Helpers ───────────────────────────────────────────────────────────────────

const uid = () => Math.random().toString(36).slice(2, 9);

const ACTION_LABELS: Record<ActionType, string> = {
  update_field:      "Update Field",
  add_tags:          "Add Tags",
  remove_tags:       "Remove Tags",
  assign_user:       "Assign to User",
  assign_role:       "Assign to Role",
  assign_department: "Assign to Department",
  assign_dynamic:    "Assign via Field",
  lock_record:       "Lock Entire Record",
  lock_fields:       "Lock Fields",
  unlock_fields:     "Unlock Fields",
  enable_fields:     "Enable Fields",
  disable_fields:    "Disable Fields",
  write_timeline:    "Write Timeline Entry",
  notify:            "Send Notification",
  create_activity:   "Create Activity",
  schedule_reminder: "Schedule Reminder",
  refresh_queue:     "Refresh Queue",
  run_automation:    "Run Automation",
};

const ACTION_GROUPS: { label: string; types: ActionType[] }[] = [
  { label: "Field & Status",   types: ["update_field"] },
  { label: "Tags",             types: ["add_tags","remove_tags"] },
  { label: "Assignment",       types: ["assign_user","assign_role","assign_department","assign_dynamic"] },
  { label: "Field Access",     types: ["lock_record","lock_fields","unlock_fields","enable_fields","disable_fields"] },
  { label: "Communication",    types: ["write_timeline","notify"] },
  { label: "Automation",       types: ["create_activity","schedule_reminder","refresh_queue","run_automation"] },
];

const toggleArr = (arr: string[], v: string) =>
  arr.includes(v) ? arr.filter(x => x !== v) : [...arr, v];

// ── Transition Type ───────────────────────────────────────────────────────────

const TRANSITION_TYPES: { value: TransitionType; label: string; icon: any; color: string; disabled?: boolean }[] = [
  { value: "manual",       label: "Manual Button", icon: MousePointerClick, color: "#374151" },
  { value: "approval",     label: "Approval",      icon: CheckCircle2,      color: "#f59e0b" },
  { value: "condition",    label: "Condition",     icon: GitBranch,         color: "#8b5cf6" },
  { value: "workflow",     label: "Workflow",      icon: Zap,               color: "#0ea5e9" },
  { value: "schedule",     label: "Schedule",      icon: Clock,             color: "#10b981" },
  { value: "webhook",      label: "Webhook/API",   icon: Webhook,           color: "#9ca3af", disabled: true },
  { value: "system_event", label: "System Event",  icon: Radio,             color: "#9ca3af", disabled: true },
];

const WORKFLOW_TRIGGERS: { value: WorkflowTriggerType; label: string }[] = [
  { value: "always",          label: "Continuously (any save)" },
  { value: "on_create",       label: "On Create" },
  { value: "on_edit",         label: "On Edit" },
  { value: "on_status_change", label: "On Status Change" },
  { value: "on_form_submit",  label: "On Form Submit" },
];

// `types` tags which field-type categories (see @/lib/field-type-operators) an
// operator is valid for — omitted means "always shown" (e.g. "has changed").
//
// "changed to X" / "changed from X" are listed FIRST, deliberately, so they're
// impossible to miss: they're the only operators that fire on the specific
// moment a field transitions to (or away from) a value. "equals" looks like the
// obvious pick but matches whenever the field ALREADY holds that value — every
// unrelated save re-evaluates true — and "has changed" fires on ANY new value,
// not the one you actually care about. Picking "equals" here is the single most
// common reason an automatic transition condition silently "does nothing."
const CONDITION_OPS: CategorizedOperator[] = [
  { value: "changed_to",   label: "changed to",                 types: ["TEXT", "NUMBER", "PICKLIST", "LOOKUP"] },
  { value: "changed_from", label: "changed from",               types: ["TEXT", "NUMBER", "PICKLIST", "LOOKUP"] },
  { value: "equals",       label: "equals",                     types: ["TEXT", "NUMBER", "PICKLIST", "LOOKUP"] },
  { value: "not_equals",   label: "not equals",                 types: ["TEXT", "NUMBER", "PICKLIST", "LOOKUP"] },
  { value: "contains",     label: "contains",                   types: ["TEXT", "MULTI_SELECT"] },
  { value: "not_contains", label: "does not contain",           types: ["TEXT", "MULTI_SELECT"] },
  { value: "starts_with",  label: "starts with",                types: ["TEXT"] },
  { value: "ends_with",    label: "ends with",                  types: ["TEXT"] },
  { value: "gt",           label: ">",                          types: ["NUMBER"] },
  { value: "lt",           label: "<",                          types: ["NUMBER"] },
  { value: "gte",          label: ">=",                         types: ["NUMBER"] },
  { value: "lte",          label: "<=",                         types: ["NUMBER"] },
  { value: "between",      label: "between (a,b)",              types: ["NUMBER", "DATE", "DATETIME"] },
  { value: "is_one_of",    label: "is one of (comma-separated)", types: ["TEXT", "PICKLIST"] },
  { value: "not_in",       label: "is not one of (comma-separated)", types: ["TEXT", "PICKLIST"] },
  { value: "before",       label: "before",                     types: ["DATE", "DATETIME"] },
  { value: "after",        label: "after",                      types: ["DATE", "DATETIME"] },
  { value: "on",           label: "on",                         types: ["DATE", "DATETIME"] },
  { value: "on_or_before", label: "on or before",               types: ["DATE", "DATETIME"] },
  { value: "on_or_after",  label: "on or after",                types: ["DATE", "DATETIME"] },
  { value: "is_true",      label: "is true",                    types: ["BOOLEAN"] },
  { value: "is_false",     label: "is false",                   types: ["BOOLEAN"] },
  { value: "checked",      label: "checked",                    types: ["CHECKBOX"] },
  { value: "unchecked",    label: "unchecked",                  types: ["CHECKBOX"] },
  { value: "contains_any", label: "contains any of",            types: ["MULTI_SELECT"] },
  { value: "contains_all", label: "contains all of",            types: ["MULTI_SELECT"] },
  { value: "is_empty",     label: "is empty",                   types: ["TEXT", "NUMBER", "DATE", "DATETIME", "PICKLIST", "MULTI_SELECT", "LOOKUP"] },
  { value: "not_empty",    label: "is not empty",                types: ["TEXT", "NUMBER", "DATE", "DATETIME", "PICKLIST", "MULTI_SELECT", "LOOKUP"] },
  { value: "changed",      label: "has changed" },
];

const NO_VALUE_OPS = ["is_empty", "not_empty", "changed", "is_true", "is_false", "checked", "unchecked"];

// Nested AND/OR condition-group editor, shared with the Workflow engine's builder
// (mycrm/components/workflows/ConditionTreeBuilder.tsx) — same visual tree UI,
// configured with Blueprint's own operator vocabulary. Bridges the legacy flat
// `conditions[]` + separate `conditionsLogic` shape into a tree on read; going
// forward, `conditions` is saved as a single tree object and `conditionsLogic`
// is left undefined (vestigial).
function BlueprintConditionEditor({
  conditions, conditionsLogic, fields, onChange,
}: {
  conditions: any;
  conditionsLogic?: "AND" | "OR";
  fields: ModuleField[];
  onChange: (conditions: ConditionGroup) => void;
}) {
  const tree = ensureIds(normalizeConditionTreeFromParts(conditions, conditionsLogic)) as ConditionGroup;
  return (
    <ConditionTreeBuilder
      group={tree}
      root={tree}
      onChange={onChange}
      fields={fields}
      isRoot
      operators={CONDITION_OPS}
      noValueOperators={NO_VALUE_OPS}
      loadDynamicOptions={() => {}}
      dynamicOptions={{}}
    />
  );
}

// Links a transition to a centrally-managed Workflow entity instead of
// duplicating condition/action config on the blueprint itself. Supports
// creating a brand-new workflow (opens the full workflow builder in a new tab,
// preselecting the module and carrying blueprint/transition context so it can
// link itself back on save — see mycrm/app/(dashboard)/settings/workflows/[id]/page.tsx)
// or linking an existing one from the same module.
function WorkflowLinkPicker({
  workflowId, moduleId, blueprintId, transitionId, onChange,
}: {
  workflowId?: string;
  moduleId: string;
  blueprintId: string;
  transitionId: string;
  onChange: (workflowId: string | undefined) => void;
}) {
  const [workflows, setWorkflows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPicker, setShowPicker] = useState(false);

  useEffect(() => {
    api.get("/workflows").then(({ data }) => setWorkflows(Array.isArray(data) ? data : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // The new-tab workflow builder posts back here once it creates+links a
  // workflow for this exact transition, so the panel updates without a reload.
  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.data?.type === "workflow-linked" && e.data?.transitionId === transitionId) {
        onChange(e.data.workflowId);
        api.get("/workflows").then(({ data }) => setWorkflows(Array.isArray(data) ? data : [])).catch(() => {});
      }
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, [transitionId, onChange]);

  const linked = workflows.find(w => w.id === workflowId);
  const moduleWorkflows = workflows.filter(w => w.moduleId === moduleId && w.id !== workflowId);

  const createNew = () => {
    const params = new URLSearchParams({ moduleId, blueprintId, transitionId });
    window.open(`/settings/workflows/new?${params.toString()}`, "_blank");
  };

  if (loading) {
    return <div className="flex items-center gap-2 text-xs text-gray-400"><Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading workflows…</div>;
  }

  if (linked) {
    return (
      <div className="flex items-center gap-2 bg-indigo-50 border border-indigo-100 rounded-lg px-2.5 py-2">
        <Link2 className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-indigo-700 truncate">{linked.name}</p>
          <p className="text-[10px] text-gray-400">{linked.isActive ? "Active" : "Inactive"} · Linked to this blueprint</p>
        </div>
        <a href={`/settings/workflows/${linked.id}`} target="_blank" rel="noreferrer" title="Open workflow"
          className="text-gray-400 hover:text-indigo-600 shrink-0">
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
        <button type="button" onClick={() => onChange(undefined)} title="Unlink" className="text-gray-400 hover:text-red-500 shrink-0">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      <button type="button" onClick={createNew}
        className="w-full flex items-center justify-center gap-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg py-2 transition-colors">
        <Plus className="w-3.5 h-3.5" /> Create New Workflow
      </button>
      {moduleWorkflows.length > 0 && (
        showPicker ? (
          <NativeSelect value="" onChange={v => { onChange(v); setShowPicker(false); }} className="w-full">
            <option value="">Select a workflow…</option>
            {moduleWorkflows.map(w => <option key={w.id} value={w.id}>{w.name}{!w.isActive ? " (inactive)" : ""}</option>)}
          </NativeSelect>
        ) : (
          <button type="button" onClick={() => setShowPicker(true)}
            className="w-full text-xs text-gray-500 hover:text-indigo-600 border border-gray-200 hover:border-indigo-300 rounded-lg py-1.5 transition-colors">
            Link Existing Workflow
          </button>
        )
      )}
    </div>
  );
}

// ── Atoms ─────────────────────────────────────────────────────────────────────

function Pill({ label, on, onClick }: { label: string; on: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1 px-2.5 py-1 rounded-full border text-[11px] font-semibold transition-all select-none",
        on ? "bg-violet-600 text-white border-violet-600" : "bg-white text-gray-500 border-gray-200 hover:border-violet-300",
      )}
    >
      {on && <Check className="w-2.5 h-2.5 shrink-0" />}
      {label}
    </button>
  );
}

function NativeSelect({ value, onChange, children, className }: {
  value: string; onChange: (v: string) => void;
  children: React.ReactNode; className?: string;
}) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      className={cn(
        "h-8 text-xs border border-gray-200 rounded-lg px-2 bg-white focus:outline-none focus:ring-1 focus:ring-violet-400",
        className,
      )}
    >
      {children}
    </select>
  );
}

export function MultiSelect({ options, selected, onChange, placeholder = "Select…" }: {
  options: { value: string; label: string }[];
  selected: string[];
  onChange: (v: string[]) => void;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const toggle = (v: string) =>
    onChange(selected.includes(v) ? selected.filter(x => x !== v) : [...selected, v]);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    if (open) document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="w-full min-h-[32px] border border-gray-200 rounded-lg px-2.5 py-1 flex flex-wrap gap-1 items-center bg-white hover:border-violet-300 transition-colors text-left"
      >
        {selected.length === 0 ? (
          <span className="text-[11px] text-gray-400 flex-1">{placeholder}</span>
        ) : selected.map(v => (
          <span key={v} className="inline-flex items-center gap-1 bg-violet-100 text-violet-700 text-[11px] rounded-md px-1.5 py-0.5 font-medium">
            {options.find(o => o.value === v)?.label ?? v}
            <span
              role="button"
              onMouseDown={e => { e.stopPropagation(); toggle(v); }}
              className="cursor-pointer hover:text-red-500 leading-none"
            >
              <X className="w-2.5 h-2.5" />
            </span>
          </span>
        ))}
        <ChevronDown className="w-3.5 h-3.5 text-gray-400 ml-auto shrink-0" />
      </button>
      {open && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-xl max-h-48 overflow-y-auto">
          {options.length === 0
            ? <p className="px-3 py-2 text-xs text-gray-400 italic">No options available</p>
            : options.map(opt => (
              <label key={opt.value} className="flex items-center gap-2.5 px-3 py-2 hover:bg-violet-50 cursor-pointer">
                <input type="checkbox" checked={selected.includes(opt.value)} onChange={() => toggle(opt.value)}
                  className="rounded accent-violet-600" />
                <span className="text-xs text-gray-700">{opt.label}</span>
              </label>
            ))
          }
        </div>
      )}
    </div>
  );
}

export function UserSearch({ users, selected, onChange, placeholder = "Search users…" }: {
  users: OrgUser[]; selected: string[];
  onChange: (ids: string[]) => void; placeholder?: string;
}) {
  const [q, setQ] = useState("");
  const hits = users
    .filter(u => !selected.includes(u.id) &&
      `${u.firstName} ${u.lastName} ${u.email}`.toLowerCase().includes(q.toLowerCase()))
    .slice(0, 5);
  return (
    <div className="space-y-1.5">
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {selected.map(id => {
            const u = users.find(x => x.id === id);
            return (
              <span key={id} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-50 border border-indigo-200 text-[11px] text-indigo-700 font-semibold">
                {u ? `${u.firstName} ${u.lastName}` : id}
                <button type="button" onClick={() => onChange(selected.filter(x => x !== id))}>
                  <X className="w-2.5 h-2.5" />
                </button>
              </span>
            );
          })}
        </div>
      )}
      <div className="relative">
        <Input value={q} onChange={e => setQ(e.target.value)}
          onBlur={() => setTimeout(() => setQ(""), 150)}
          placeholder={placeholder} className="h-7 text-xs" />
        {q.length > 0 && (
          <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden">
            {hits.length === 0
              ? <p className="px-3 py-2 text-xs text-gray-400 italic">No users found</p>
              : hits.map(u => (
                  <button key={u.id} type="button"
                    onMouseDown={e => e.preventDefault()}
                    onClick={() => { onChange([...selected, u.id]); setQ(""); }}
                    className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-violet-50 text-left">
                    <div className="w-6 h-6 rounded-full bg-violet-100 text-violet-700 text-[10px] font-bold flex items-center justify-center shrink-0">
                      {(u.firstName?.[0] ?? "").toUpperCase()}{(u.lastName?.[0] ?? "").toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold truncate">{u.firstName} {u.lastName}</p>
                      <p className="text-[10px] text-gray-400 truncate">{u.email}</p>
                    </div>
                  </button>
                ))
            }
          </div>
        )}
      </div>
    </div>
  );
}

// ── Accordion section ─────────────────────────────────────────────────────────

function Sec({
  icon: Icon, title, defaultOpen = false, badge, children,
}: {
  icon: any; title: string; defaultOpen?: boolean;
  badge?: string | number; children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-gray-100 last:border-0">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-2 px-4 py-2.5 hover:bg-gray-50 transition-colors text-left"
      >
        <Icon className="w-3.5 h-3.5 text-gray-400 shrink-0" />
        <span className="flex-1 text-xs font-semibold text-gray-700">{title}</span>
        {!!badge && (
          <span className="text-[10px] bg-violet-100 text-violet-700 font-bold px-1.5 py-0.5 rounded-full shrink-0">
            {badge}
          </span>
        )}
        <ChevronDown className={cn("w-3.5 h-3.5 text-gray-300 transition-transform shrink-0", open && "rotate-180")} />
      </button>
      {open && <div className="px-4 pb-4 space-y-3">{children}</div>}
    </div>
  );
}

// ── Action builder ────────────────────────────────────────────────────────────

function ActionCard({
  action, fields, users, departments, phases, staffRoles, onUpdate, onDelete,
}: {
  action: TransitionAction;
  fields: ModuleField[];
  users: OrgUser[];
  departments: OrgDepartment[];
  phases: FlowPhase[];
  staffRoles: { value: string; label: string }[];
  onUpdate: (config: Record<string, any>) => void;
  onDelete: () => void;
}) {
  const cfg = action.config ?? {};
  const nonAutoFields = fields.filter(f => !["FORMULA","AUTO_NUMBER","INLINE_SUBFORM"].includes(f.type));
  const fieldDef = fields.find(f => f.name === cfg.field);

  const [tagInput, setTagInput] = useState("");
  const addTag = () => {
    if (!tagInput.trim()) return;
    const tags = cfg.tags ?? [];
    if (!tags.includes(tagInput.trim())) onUpdate({ ...cfg, tags: [...tags, tagInput.trim()] });
    setTagInput("");
  };

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 border-b border-gray-100">
        <span className="text-[10px] font-bold text-violet-600 bg-violet-50 border border-violet-200 rounded-full px-2 py-0.5 shrink-0">
          {ACTION_LABELS[action.type] ?? action.type}
        </span>
        <div className="flex-1" />
        <button type="button" onClick={onDelete} className="text-gray-300 hover:text-red-500 transition-colors">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Config body */}
      <div className="px-3 py-2.5 space-y-2">
        {/* Update field */}
        {action.type === "update_field" && (
          <div className="flex items-center gap-1.5">
            <NativeSelect value={cfg.field ?? ""} onChange={v => onUpdate({ ...cfg, field: v, value: "" })} className="flex-1">
              <option value="">Select field…</option>
              {nonAutoFields.map(f => <option key={f.id ?? f.name} value={f.name}>{f.label}</option>)}
            </NativeSelect>
            <ArrowRight className="w-3 h-3 text-gray-400 shrink-0" />
            {fieldDef?.options?.length
              ? <NativeSelect value={cfg.value ?? ""} onChange={v => onUpdate({ ...cfg, value: v })} className="flex-1">
                  <option value="">Value…</option>
                  {fieldDef.options.map((o, i) => <option key={o.id ?? `${o.value}-${i}`} value={o.value}>{o.label}</option>)}
                </NativeSelect>
              : <Input value={cfg.value ?? ""} onChange={e => onUpdate({ ...cfg, value: e.target.value })}
                  placeholder="Value…" className="h-8 text-xs flex-1 min-w-0" />
            }
          </div>
        )}

        {/* Tags */}
        {(action.type === "add_tags" || action.type === "remove_tags") && (
          <div className="space-y-1.5">
            {(cfg.tags ?? []).length > 0 && (
              <div className="flex flex-wrap gap-1">
                {(cfg.tags as string[]).map((tag) => (
                  <span key={tag} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gray-100 text-[11px] font-medium text-gray-700">
                    {tag}
                    <button
                      type="button"
                      onClick={() => onUpdate({ ...cfg, tags: (cfg.tags as string[]).filter(t => t !== tag) })}
                      className="hover:text-red-500"
                    >
                      <X className="w-2.5 h-2.5" />
                    </button>
                  </span>
                ))}
              </div>
            )}
            <div className="flex gap-1.5">
              <input
                value={tagInput}
                onChange={e => setTagInput(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addTag(); } }}
                placeholder="Type a tag name…"
                className="flex-1 h-8 text-xs border border-gray-200 rounded-lg px-2.5 focus:outline-none focus:ring-1 focus:ring-violet-400"
              />
              <button
                type="button"
                onClick={addTag}
                className="h-8 px-3 rounded-lg bg-violet-600 text-white text-xs font-bold hover:bg-violet-700 shrink-0"
              >
                Add
              </button>
            </div>
          </div>
        )}

        {/* Assign user */}
        {action.type === "assign_user" && (
          <UserSearch users={users} selected={cfg.userId ? [cfg.userId] : []}
            onChange={ids => onUpdate({ ...cfg, userId: ids[0] ?? "" })} />
        )}

        {/* Assign role — uses staff roles */}
        {action.type === "assign_role" && (
          <NativeSelect value={cfg.role ?? ""} onChange={v => onUpdate({ ...cfg, role: v })} className="w-full">
            <option value="">Select role…</option>
            {staffRoles.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
          </NativeSelect>
        )}

        {/* Assign department */}
        {action.type === "assign_department" && (
          departments.length > 0
            ? <NativeSelect value={cfg.department ?? ""} onChange={v => onUpdate({ ...cfg, department: v })} className="w-full">
                <option value="">Select department…</option>
                {departments.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
              </NativeSelect>
            : <Input value={cfg.department ?? ""} onChange={e => onUpdate({ ...cfg, department: e.target.value })}
                placeholder="Department name…" className="h-7 text-xs" />
        )}

        {/* Assign via dynamic field */}
        {action.type === "assign_dynamic" && (
          <NativeSelect value={cfg.field ?? ""} onChange={v => onUpdate({ ...cfg, field: v })} className="w-full">
            <option value="">Select user field on the record…</option>
            {fields.filter(f => f.type === "USER" || f.type === "LOOKUP").map(f => (
              <option key={f.id ?? f.name} value={f.name}>{f.label}</option>
            ))}
          </NativeSelect>
        )}

        {/* Lock / unlock / enable / disable fields */}
        {["lock_fields","unlock_fields","enable_fields","disable_fields"].includes(action.type) && (
          <MultiSelect
            options={nonAutoFields.map(f => ({ value: f.name, label: f.label }))}
            selected={cfg.fields ?? []}
            onChange={fs => onUpdate({ ...cfg, fields: fs })}
            placeholder="Select fields…"
          />
        )}

        {/* Lock record — no config needed */}
        {action.type === "lock_record" && (
          <p className="text-[11px] text-gray-400 italic">Entire record will be locked after this transition.</p>
        )}

        {/* Timeline entry */}
        {action.type === "write_timeline" && (
          <div className="space-y-1">
            <textarea value={cfg.template ?? ""} onChange={e => onUpdate({ ...cfg, template: e.target.value })}
              placeholder={"e.g. {{User}} approved the payment and forwarded it to Finance."}
              rows={2}
              className="w-full text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none resize-none" />
            <p className="text-[10px] text-gray-400">Placeholders: {"{{User}}"} {"{{CurrentStage}}"} {"{{NextStage}}"} {"{{Date}}"} {"{{RecordNo}}"}</p>
          </div>
        )}

        {/* Notification */}
        {action.type === "notify" && (
          <div className="space-y-2">
            <MultiSelect
              options={staffRoles}
              selected={cfg.roles ?? []}
              onChange={roles => onUpdate({ ...cfg, roles })}
              placeholder="Select roles to notify…"
            />
            <Input value={cfg.template ?? ""} onChange={e => onUpdate({ ...cfg, template: e.target.value })}
              placeholder={"Message: e.g. Payment {{No}} awaits your approval."}
              className="h-7 text-xs" />
          </div>
        )}

        {/* Create activity */}
        {action.type === "create_activity" && (
          <Input value={cfg.description ?? ""} onChange={e => onUpdate({ ...cfg, description: e.target.value })}
            placeholder="Activity description…" className="h-7 text-xs" />
        )}

        {/* Schedule reminder */}
        {action.type === "schedule_reminder" && (
          <div className="flex gap-2 items-center">
            <span className="text-xs text-gray-500 shrink-0">Remind in</span>
            <Input type="number" value={cfg.dueIn ?? ""} min={1}
              onChange={e => onUpdate({ ...cfg, dueIn: parseInt(e.target.value) || 1 })}
              className="h-7 text-xs w-16" />
            <NativeSelect value={cfg.unit ?? "days"} onChange={v => onUpdate({ ...cfg, unit: v })} className="flex-1">
              <option value="hours">Hours</option>
              <option value="days">Days</option>
              <option value="business_days">Business days</option>
            </NativeSelect>
          </div>
        )}

        {/* Refresh queue / run automation */}
        {action.type === "refresh_queue" && (
          <p className="text-[11px] text-gray-400 italic">Queue will refresh after this transition executes.</p>
        )}
        {action.type === "run_automation" && (
          <Input value={cfg.name ?? ""} onChange={e => onUpdate({ ...cfg, name: e.target.value })}
            placeholder="Automation or workflow name…" className="h-7 text-xs" />
        )}
      </div>
    </div>
  );
}

// ── Restrict-by modes ─────────────────────────────────────────────────────────

const RESTRICT_MODES = [
  { value: "role",       label: "By Team Role" },
  { value: "department", label: "By Department" },
  { value: "user",       label: "By Specific User" },
];

// ── Generate Request section ──────────────────────────────────────────────────

const REQUEST_ASSIGN_MODES: { value: "role" | "department" | "user"; label: string }[] = [
  { value: "role",       label: "By Team Role" },
  { value: "department", label: "By Department" },
  { value: "user",       label: "By Specific User" },
];

const REQUEST_PRIORITY_OPTIONS = [
  { value: "low",      label: "Low"      },
  { value: "medium",   label: "Medium"   },
  { value: "high",     label: "High"     },
  { value: "critical", label: "Critical" },
];

function GenerateRequestSec({
  t, upd, staffRoles, departments, users,
}: {
  t: FlowTransition;
  upd: (patch: Partial<FlowTransition>) => void;
  staffRoles: { value: string; label: string }[];
  departments: OrgDepartment[];
  users: OrgUser[];
}) {
  const enabled = !!t.generateRequest;
  const modes = t.requestAssignModes ?? [];
  const toggleMode = (mode: "role" | "department" | "user") => {
    const next = modes.includes(mode) ? modes.filter(m => m !== mode) : [...modes, mode];
    upd({ requestAssignModes: next });
  };

  const badge = enabled ? (
    (t.requestRoles?.length ?? 0) +
    (t.requestDepts?.length ?? 0) +
    (t.requestUsers?.length ?? 0)
  ) || undefined : undefined;

  return (
    <Sec icon={Send} title="Generate Request" badge={badge}>
      <label className="flex items-center justify-between cursor-pointer mb-2">
        <div>
          <p className="text-xs font-semibold text-gray-700">Send a request when this transition runs</p>
          <p className="text-[10px] text-gray-400">The assigned person reviews, and processing completes the phase move</p>
        </div>
        <Switch checked={enabled} onCheckedChange={v => upd({ generateRequest: v })} />
      </label>

      {enabled && (
        <div className="space-y-3 pl-3 border-l-2 border-emerald-200">

          {/* Request title */}
          <div className="space-y-1">
            <p className="text-[10px] font-semibold text-gray-500">Request title</p>
            <Input
              value={t.requestTitle ?? ""}
              onChange={e => upd({ requestTitle: e.target.value })}
              placeholder={`e.g. Approve "${t.name || "this transition"}"`}
              className="h-8 text-xs"
            />
            <p className="text-[10px] text-gray-400">Defaults to the transition name if left empty.</p>
          </div>

          {/* Priority + Due */}
          <div className="flex gap-2">
            <div className="flex-1 space-y-1">
              <p className="text-[10px] font-semibold text-gray-500">Priority</p>
              <NativeSelect
                value={t.requestPriority ?? "medium"}
                onChange={v => upd({ requestPriority: v as "low" | "medium" | "high" | "critical" })}
                className="w-full"
              >
                {REQUEST_PRIORITY_OPTIONS.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </NativeSelect>
            </div>
            <div className="flex-1 space-y-1">
              <p className="text-[10px] font-semibold text-gray-500">Due in (days)</p>
              <Input
                type="number"
                min={0}
                value={t.requestDueDays ?? ""}
                onChange={e => upd({ requestDueDays: parseInt(e.target.value) || 0 })}
                placeholder="e.g. 3"
                className="h-8 text-xs"
              />
            </div>
          </div>

          {/* Assign to */}
          <div>
            <p className="text-[10px] font-semibold text-gray-500 mb-1.5">Assign to</p>
            <div className="flex flex-wrap gap-1.5">
              {REQUEST_ASSIGN_MODES.map(m => (
                <button
                  key={m.value}
                  type="button"
                  onClick={() => toggleMode(m.value as any)}
                  className={cn(
                    "inline-flex items-center gap-1 px-2.5 py-1 rounded-full border text-[11px] font-semibold transition-all",
                    modes.includes(m.value)
                      ? "bg-emerald-600 text-white border-emerald-600"
                      : "bg-white text-gray-500 border-gray-200 hover:border-emerald-300",
                  )}
                >
                  {modes.includes(m.value) && <Check className="w-2.5 h-2.5 shrink-0" />}
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {modes.includes("role") && (
            <div className="space-y-1">
              <p className="text-[10px] font-semibold text-gray-500">Team Roles</p>
              <MultiSelect
                options={staffRoles.length > 0 ? staffRoles : [{ value: "", label: "No roles configured" }]}
                selected={t.requestRoles ?? []}
                onChange={v => upd({ requestRoles: v })}
                placeholder="Select team roles…"
              />
            </div>
          )}

          {modes.includes("department") && (
            <div className="space-y-1">
              <p className="text-[10px] font-semibold text-gray-500">Departments</p>
              <MultiSelect
                options={departments.map(d => ({ value: d.name, label: d.name }))}
                selected={t.requestDepts ?? []}
                onChange={v => upd({ requestDepts: v })}
                placeholder="Select departments…"
              />
            </div>
          )}

          {modes.includes("user") && (
            <div className="space-y-1">
              <p className="text-[10px] font-semibold text-gray-500">Specific Users</p>
              <UserSearch
                users={users}
                selected={t.requestUsers ?? []}
                onChange={ids => upd({ requestUsers: ids })}
              />
            </div>
          )}

          <div className="space-y-1">
            <p className="text-[10px] font-semibold text-gray-500">Request note (optional)</p>
            <textarea
              value={t.requestNote ?? ""}
              onChange={e => upd({ requestNote: e.target.value })}
              rows={2}
              placeholder={"e.g. Please review and process this payment before end of day."}
              className="w-full text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none resize-none"
            />
          </div>

          <label className="flex items-center justify-between cursor-pointer">
            <div>
              <p className="text-xs font-semibold text-gray-700">Block stage advance until processed</p>
              <p className="text-[10px] text-gray-400">Record stays in current stage until request is completed</p>
            </div>
            <Switch
              checked={!!t.requestBlocksTransition}
              onCheckedChange={v => upd({ requestBlocksTransition: v })}
            />
          </label>
        </div>
      )}
    </Sec>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function TransitionPanel({
  transition: t, phases, fields, users, departments = [], staffRoles = [],
  blueprintId = "", moduleId = "",
  onChange, onDelete, onClose,
}: {
  transition: FlowTransition;
  phases: FlowPhase[];
  fields: ModuleField[];
  users: OrgUser[];
  departments?: OrgDepartment[];
  staffRoles?: { value: string; label: string }[];
  blueprintId?: string;
  moduleId?: string;
  onChange: (patch: Partial<FlowTransition>) => void;
  onDelete: () => void;
  onClose: () => void;
}) {
  const upd = (patch: Partial<FlowTransition>) => onChange(patch);
  const [showActionMenu, setShowActionMenu] = useState(false);
  const [activeTab, setActiveTab] = useState<"before"|"after">("before");
  const menuRef = useRef<HTMLDivElement>(null);

  const isCommon = !!t.isCommon || t.fromPhaseId === "*";
  const to   = phases.find(p => p.id === t.toPhaseId);
  const color = t.buttonColor || "#3b82f6";
  const transitionType = t.transitionType ?? "manual";

  const actions = t.actions ?? [];
  const updAction = (id: string, config: Record<string, any>) =>
    upd({ actions: actions.map(a => a.id === id ? { ...a, config } : a) });
  const delAction = (id: string) => upd({ actions: actions.filter(a => a.id !== id) });
  const addAction = (type: ActionType) => {
    upd({ actions: [...actions, { id: uid(), type, config: {} }] });
    setShowActionMenu(false);
  };

  // Derive which restriction modes are currently active based on existing data
  const [restrictModes, setRestrictModes] = useState<string[]>(() => {
    const r: string[] = [];
    if ((t.allowedRoles?.length ?? 0) > 0) r.push("role");
    if ((t.allowedDepartments?.length ?? 0) > 0) r.push("department");
    if ((t.allowedUsers?.length ?? 0) > 0) r.push("user");
    return r;
  });

  const toggleMode = (mode: string) => {
    if (restrictModes.includes(mode)) {
      setRestrictModes(restrictModes.filter(m => m !== mode));
      if (mode === "role") upd({ allowedRoles: [] });
      if (mode === "department") upd({ allowedDepartments: [] });
      if (mode === "user") upd({ allowedUsers: [] });
    } else {
      setRestrictModes([...restrictModes, mode]);
    }
  };

  const totalAllowed =
    (t.allowedRoles?.length ?? 0) +
    (t.allowedDepartments?.length ?? 0) +
    (t.allowedUsers?.length ?? 0);

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Color bar */}
      <div className="h-1 w-full shrink-0" style={{ backgroundColor: isCommon ? "#7c3aed" : color }} />

      {/* Header */}
      <div className="px-4 py-2.5 border-b border-gray-100 flex items-center gap-2 shrink-0">
        <div className="flex-1 min-w-0">
          <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">Transition Button</p>
          <div className="flex items-center gap-1.5 text-[11px]">
            {isCommon
              ? <span className="font-semibold text-violet-600 flex items-center gap-0.5"><ChevronsRight className="w-3 h-3" />Any Stage</span>
              : <span className="text-gray-400 italic">from current stage</span>
            }
            <ArrowRight className="w-3 h-3 text-gray-300 shrink-0" />
            <span className="font-medium truncate max-w-[80px]" style={{ color: to?.color }}>{to?.name ?? "?"}</span>
          </div>
        </div>
        <button onClick={onDelete} title="Delete transition"
          className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
          <Trash2 className="w-3.5 h-3.5" />
        </button>
        <button onClick={onClose} title="Close"
          className="p-1.5 text-gray-300 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto">

        {/* ── Button Appearance ── */}
        <div className="px-4 pt-4 pb-3 border-b border-gray-100 space-y-3">
          <label className={cn(
            "flex items-center justify-between rounded-xl px-3 py-2.5 border cursor-pointer",
            isCommon ? "bg-violet-50 border-violet-200" : "bg-gray-50 border-gray-200",
          )}>
            <div>
              <p className={cn("text-xs font-bold", isCommon ? "text-violet-800" : "text-gray-700")}>Available from any stage</p>
              <p className="text-[10px] text-gray-400">{isCommon ? "Shows on every record regardless of stage" : "Only appears on one specific source stage"}</p>
            </div>
            <Switch checked={isCommon} onCheckedChange={checked => {
              if (checked) upd({ isCommon: true, fromPhaseId: "*" });
              else upd({ isCommon: false, fromPhaseId: phases.find(p => p.id !== t.toPhaseId)?.id ?? "" });
            }} />
          </label>

          {/* Transition type */}
          <div className="space-y-1">
            <label className="text-[10px] font-semibold text-gray-500">Transition type</label>
            <div className="grid grid-cols-4 gap-1">
              {TRANSITION_TYPES.map(tt => {
                const active = (t.transitionType ?? "manual") === tt.value;
                const Icon = tt.icon;
                return (
                  <button
                    key={tt.value}
                    type="button"
                    disabled={tt.disabled}
                    title={tt.disabled ? `${tt.label} — coming soon` : tt.label}
                    onClick={() => {
                      const patch: Partial<FlowTransition> = { transitionType: tt.value };
                      if (tt.value === "approval") patch.requiresApproval = true;
                      upd(patch);
                    }}
                    className={cn(
                      "flex flex-col items-center gap-0.5 rounded-lg border px-1 py-1.5 transition-colors",
                      tt.disabled
                        ? "opacity-40 cursor-not-allowed border-gray-100"
                        : active
                          ? "text-white border-transparent"
                          : "bg-white border-gray-200 text-gray-500 hover:border-gray-300",
                    )}
                    style={active && !tt.disabled ? { backgroundColor: tt.color } : undefined}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span className="text-[9px] font-semibold leading-tight text-center">{tt.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Label + color + preview */}
          <div className="flex gap-2 items-end">
            <div className="flex-1 space-y-1">
              <label className="text-[10px] font-semibold text-gray-500">Button label</label>
              <Input value={t.name} onChange={e => upd({ name: e.target.value })}
                placeholder="e.g. Approve, Reject, Forward…" className="h-8 text-sm" />
            </div>
            <div className="space-y-1 shrink-0">
              <label className="text-[10px] font-semibold text-gray-500">Color</label>
              <input type="color" value={color}
                onChange={e => upd({ buttonColor: e.target.value })}
                className="h-8 w-10 cursor-pointer rounded-lg border border-gray-200 p-0.5 bg-white" />
            </div>
            <span className="px-3 py-1.5 rounded-lg text-white text-sm font-semibold shadow-sm shrink-0"
              style={{ backgroundColor: isCommon ? "#7c3aed" : color }}>
              {t.name || "Preview"}
            </span>
          </div>

          <Input value={t.description ?? ""} onChange={e => upd({ description: e.target.value })}
            placeholder="Internal description (optional)…" className="h-8 text-xs text-gray-500" />
        </div>

        {/* ── Tabs ── */}
        <div className="flex border-b border-gray-200 shrink-0 bg-white sticky top-0 z-10">
          {(["before","after"] as const).map(tab => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={cn(
                "flex-1 py-2.5 text-xs font-semibold transition-colors border-b-2 -mb-px",
                activeTab === tab
                  ? tab === "before"
                    ? "border-blue-500 text-blue-600 bg-blue-50/40"
                    : "border-emerald-500 text-emerald-600 bg-emerald-50/40"
                  : "border-transparent text-gray-400 hover:text-gray-600 hover:bg-gray-50",
              )}
            >
              {tab === "before" ? "Before" : "After"}
              {tab === "before" && totalAllowed > 0 && (
                <span className="ml-1.5 text-[9px] bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded-full font-bold">
                  {totalAllowed}
                </span>
              )}
              {tab === "after" && actions.length > 0 && (
                <span className="ml-1.5 text-[9px] bg-emerald-100 text-emerald-600 px-1.5 py-0.5 rounded-full font-bold">
                  {actions.length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ── BEFORE tab ── */}
        {activeTab === "before" && (
          <div>
            {(transitionType === "manual" || transitionType === "approval") && (
            <Sec icon={Users} title="Who can use this button" defaultOpen badge={totalAllowed || undefined}>
              <p className="text-[10px] text-gray-400 mb-2">Leave empty to allow everyone. Select how to restrict access:</p>

              {/* Restrict-by mode chips */}
              <div className="flex flex-wrap gap-1.5 mb-3">
                {RESTRICT_MODES.map(m => (
                  <button
                    key={m.value}
                    type="button"
                    onClick={() => toggleMode(m.value)}
                    className={cn(
                      "inline-flex items-center gap-1 px-2.5 py-1 rounded-full border text-[11px] font-semibold transition-all",
                      restrictModes.includes(m.value)
                        ? "bg-brand text-white border-brand"
                        : "bg-white text-gray-500 border-gray-200 hover:border-brand/50",
                    )}
                  >
                    {restrictModes.includes(m.value) && <Check className="w-2.5 h-2.5 shrink-0" />}
                    {m.label}
                  </button>
                ))}
              </div>

              {/* By Role — uses Staff Roles from Global Lists */}
              {restrictModes.includes("role") && (
                <div className="space-y-1 mb-3">
                  <p className="text-[10px] font-semibold text-gray-500">Team Roles</p>
                  <MultiSelect
                    options={staffRoles.length > 0 ? staffRoles : [{ value: "", label: "No roles configured — add them in Global Lists → Staff Roles" }]}
                    selected={t.allowedRoles ?? []}
                    onChange={roles => upd({ allowedRoles: roles })}
                    placeholder="Select team roles…"
                  />
                  {staffRoles.length === 0 && (
                    <p className="text-[10px] text-amber-600">Configure roles in Global Lists → Staff Roles first.</p>
                  )}
                </div>
              )}

              {/* By Department */}
              {restrictModes.includes("department") && (
                <div className="space-y-1 mb-3">
                  <p className="text-[10px] font-semibold text-gray-500">Departments</p>
                  <MultiSelect
                    options={departments.map(d => ({ value: d.name, label: d.name }))}
                    selected={t.allowedDepartments ?? []}
                    onChange={depts => upd({ allowedDepartments: depts })}
                    placeholder="Select departments…"
                  />
                </div>
              )}

              {/* By Specific User */}
              {restrictModes.includes("user") && (
                <div className="space-y-1 mb-3">
                  <p className="text-[10px] font-semibold text-gray-500">Specific Users</p>
                  <UserSearch users={users} selected={t.allowedUsers ?? []}
                    onChange={ids => upd({ allowedUsers: ids })} />
                </div>
              )}

              <div className="space-y-1.5 border-t border-gray-100 pt-3">
                {[
                  { k: "allowRecordOwner",   l: "Record owner" },
                  { k: "allowSupervisors",   l: "Supervisors" },
                  { k: "allowAdminOverride", l: "Admins (always)" },
                ].map(({ k, l }) => (
                  <label key={k} className="flex items-center justify-between cursor-pointer">
                    <span className="text-xs text-gray-600">{l}</span>
                    <Switch checked={!!(t as any)[k]} onCheckedChange={v => upd({ [k]: v } as any)} />
                  </label>
                ))}
              </div>

              <div className="border-t border-gray-100 pt-2 space-y-2">
                {transitionType === "approval" ? (
                  <div className="space-y-1">
                    <p className="text-[10px] font-semibold text-gray-500">Roles that can approve</p>
                    <MultiSelect
                      options={staffRoles}
                      selected={t.approvalRoles ?? []}
                      onChange={roles => upd({ approvalRoles: roles })}
                      placeholder="Select approver roles…"
                    />
                  </div>
                ) : (
                  <>
                    <label className="flex items-center justify-between cursor-pointer">
                      <span className="text-xs font-semibold text-gray-700">Requires approval before executing</span>
                      <Switch checked={t.requiresApproval} onCheckedChange={v => upd({ requiresApproval: v })} />
                    </label>
                    {t.requiresApproval && (
                      <div className="pl-3 border-l-2 border-emerald-200 space-y-1">
                        <p className="text-[10px] text-gray-400">Roles that can approve</p>
                        <MultiSelect
                          options={staffRoles}
                          selected={t.approvalRoles ?? []}
                          onChange={roles => upd({ approvalRoles: roles })}
                          placeholder="Select approver roles…"
                        />
                      </div>
                    )}
                  </>
                )}
              </div>
            </Sec>
            )}

            {transitionType === "condition" && (
              <Sec icon={GitBranch} title="Condition rules" defaultOpen badge={countConditionLeaves(normalizeConditionTreeFromParts(t.conditions, t.conditionsLogic)) || undefined}>
                <p className="text-[10px] text-gray-400 mb-2">
                  This transition fires automatically whenever a record on this stage is saved and these conditions match. No button is shown.
                </p>
                <BlueprintConditionEditor
                  conditions={t.conditions ?? []}
                  conditionsLogic={t.conditionsLogic}
                  fields={fields}
                  onChange={conditions => upd({ conditions, conditionsLogic: undefined })}
                />
              </Sec>
            )}

            {transitionType === "workflow" && (
              <Sec icon={Zap} title="Workflow trigger" defaultOpen>
                <div className="space-y-1 mb-3">
                  <p className="text-[10px] font-semibold text-gray-500">Fires when…</p>
                  <NativeSelect
                    value={t.workflowTriggerType ?? "always"}
                    onChange={v => upd({ workflowTriggerType: v as any })}
                    className="w-full"
                  >
                    {WORKFLOW_TRIGGERS.map(wt => <option key={wt.value} value={wt.value}>{wt.label}</option>)}
                  </NativeSelect>
                </div>
                <div className="border-t border-gray-100 pt-2 mb-3">
                  <p className="text-[10px] font-semibold text-gray-500 mb-1.5">Linked Workflow</p>
                  <p className="text-[10px] text-gray-400 mb-1.5">
                    Runs the linked workflow's own rule groups when the timing above matches — manage its conditions and actions centrally instead of duplicating them here.
                  </p>
                  <WorkflowLinkPicker
                    workflowId={t.workflowId}
                    moduleId={moduleId}
                    blueprintId={blueprintId}
                    transitionId={t.id}
                    onChange={workflowId => upd({ workflowId })}
                  />
                </div>
                <div className="border-t border-gray-100 pt-2">
                  <p className="text-[10px] text-gray-400 flex items-center gap-1">
                    <Lock className="w-3 h-3 shrink-0" />
                    {t.workflowId
                      ? "Conditions are managed in the linked workflow — unlink above to set conditions here instead."
                      : "Conditions are managed in the linked workflow. Link or create one above — there's no separate blueprint-level condition builder for this transition type."}
                  </p>
                </div>
              </Sec>
            )}

            {transitionType === "schedule" && (
              <Sec icon={Clock} title="Schedule" defaultOpen>
                <div className="flex gap-1.5 mb-3">
                  {(["offset","datetime"] as const).map(m => (
                    <button key={m} type="button" onClick={() => upd({ scheduleMode: m })}
                      className={cn("flex-1 py-1.5 rounded-lg border text-[11px] font-semibold capitalize transition-all",
                        (t.scheduleMode ?? "offset") === m
                          ? "bg-emerald-600 text-white border-emerald-600"
                          : "bg-white text-gray-500 border-gray-200 hover:border-emerald-300")}>
                      {m === "offset" ? "After a duration" : "Specific date/time"}
                    </button>
                  ))}
                </div>
                {(t.scheduleMode ?? "offset") === "offset" ? (
                  <div className="flex gap-1.5">
                    <Input type="number" min={1} value={t.scheduleOffsetValue ?? ""}
                      onChange={e => upd({ scheduleOffsetValue: parseInt(e.target.value) || undefined })}
                      placeholder="e.g. 3" className="h-8 text-xs w-20" />
                    <NativeSelect value={t.scheduleOffsetUnit ?? "days"} onChange={v => upd({ scheduleOffsetUnit: v as any })} className="flex-1">
                      <option value="minutes">Minutes</option>
                      <option value="hours">Hours</option>
                      <option value="days">Days</option>
                      <option value="weeks">Weeks</option>
                      <option value="months">Months</option>
                    </NativeSelect>
                  </div>
                ) : (
                  <Input type="datetime-local" value={t.scheduleDateTime ?? ""}
                    onChange={e => upd({ scheduleDateTime: e.target.value })} className="h-8 text-xs w-full" />
                )}
                <p className="text-[10px] text-gray-400 mt-2">
                  Timer starts the moment a record enters this transition's source stage. Leaving that stage before it fires cancels it.
                </p>
              </Sec>
            )}

            {(transitionType === "manual" || transitionType === "approval") && (
            <Sec icon={MessageSquare} title="Confirmation & Comment">
              <div className="space-y-1">
                <label className="text-[10px] font-semibold text-gray-500">Confirmation message</label>
                <Input value={t.confirmMessage ?? ""} onChange={e => upd({ confirmMessage: e.target.value })}
                  placeholder='e.g. "Are you sure you want to approve this payment?"'
                  className="h-8 text-xs" />
                <p className="text-[10px] text-gray-400">Leave empty to skip the dialog.</p>
              </div>

              <div className="border-t border-gray-100 pt-2 space-y-2">
                <p className="text-[10px] font-semibold text-gray-500">Comment</p>
                <div className="flex gap-2">
                  {(["optional","required","disabled"] as const).map(m => (
                    <button key={m} type="button" onClick={() => upd({ commentMode: m })}
                      className={cn("flex-1 py-1.5 rounded-lg border text-[11px] font-semibold capitalize transition-all",
                        t.commentMode === m
                          ? "bg-violet-600 text-white border-violet-600"
                          : "bg-white text-gray-500 border-gray-200 hover:border-violet-300")}>
                      {m}
                    </button>
                  ))}
                </div>
                {t.commentMode !== "disabled" && (
                  <Input value={t.commentPlaceholder ?? ""} onChange={e => upd({ commentPlaceholder: e.target.value })}
                    placeholder="Placeholder e.g. Approval Remarks…" className="h-8 text-xs" />
                )}
              </div>

              <div className="border-t border-gray-100 pt-2 space-y-2">
                <p className="text-[10px] font-semibold text-gray-500">Attachment</p>
                <div className="flex gap-2">
                  {(["optional","required","disabled"] as const).map(m => (
                    <button key={m} type="button" onClick={() => upd({ attachmentMode: m })}
                      className={cn("flex-1 py-1.5 rounded-lg border text-[11px] font-semibold capitalize transition-all",
                        t.attachmentMode === m
                          ? "bg-orange-500 text-white border-orange-500"
                          : "bg-white text-gray-500 border-gray-200 hover:border-orange-300")}>
                      {m}
                    </button>
                  ))}
                </div>
              </div>
            </Sec>
            )}
          </div>
        )}

        {/* ── AFTER tab ── */}
        {activeTab === "after" && (
          <div>
            {/* Generate Request */}
            <GenerateRequestSec
              t={t} upd={upd}
              staffRoles={staffRoles}
              departments={departments}
              users={users}
            />

            {/* Actions */}
            <Sec icon={Zap} title="Actions" defaultOpen badge={actions.length || undefined}>
              <p className="text-[10px] text-gray-400">Steps that run when the button is clicked, in order.</p>
              <div className="space-y-2">
                {actions.map(action => (
                  <ActionCard key={action.id} action={action} fields={fields}
                    users={users} departments={departments} phases={phases}
                    staffRoles={staffRoles}
                    onUpdate={cfg => updAction(action.id, cfg)}
                    onDelete={() => delAction(action.id)} />
                ))}
              </div>
              <div className="relative" ref={menuRef}>
                <button type="button" onClick={() => setShowActionMenu(v => !v)}
                  className="flex items-center gap-1.5 text-xs font-semibold text-violet-600 hover:text-violet-800 border border-violet-200 border-dashed rounded-xl px-3 py-2 w-full justify-center hover:bg-violet-50 transition-colors">
                  <Plus className="w-3.5 h-3.5" /> Add Action
                </button>
                {showActionMenu && (
                  <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden">
                    {ACTION_GROUPS.map(group => (
                      <div key={group.label}>
                        <p className="px-3 pt-2 pb-1 text-[9px] font-bold uppercase tracking-widest text-gray-400">{group.label}</p>
                        {group.types.map(type => (
                          <button key={type} type="button" onClick={() => addAction(type)}
                            className="w-full text-left px-3 py-1.5 text-xs hover:bg-violet-50 text-gray-700 hover:text-violet-700 transition-colors">
                            {ACTION_LABELS[type]}
                          </button>
                        ))}
                      </div>
                    ))}
                    <div className="border-t border-gray-100 p-1.5">
                      <button type="button" onClick={() => setShowActionMenu(false)}
                        className="w-full text-center text-[11px] text-gray-400 hover:text-gray-600 py-1">Cancel</button>
                    </div>
                  </div>
                )}
              </div>
            </Sec>

            {/* Notifications */}
            <Sec icon={Bell} title="Notifications"
              badge={(t.notifyRoles?.length ?? 0) + (t.notifyAssignedUser ? 1 : 0) || undefined}>
              <div className="space-y-1">
                <p className="text-[10px] font-semibold text-gray-500">Team Roles</p>
                <MultiSelect
                  options={staffRoles}
                  selected={t.notifyRoles ?? []}
                  onChange={roles => upd({ notifyRoles: roles })}
                  placeholder="Select roles to notify…"
                />
              </div>
              {departments.length > 0 && (
                <div className="space-y-1">
                  <p className="text-[10px] font-semibold text-gray-500">Departments</p>
                  <MultiSelect
                    options={departments.map(d => ({ value: d.name, label: d.name }))}
                    selected={t.notifyDepartments ?? []}
                    onChange={depts => upd({ notifyDepartments: depts })}
                    placeholder="Select departments to notify…"
                  />
                </div>
              )}
              <UserSearch users={users} selected={t.notifyUsers ?? []}
                onChange={ids => upd({ notifyUsers: ids })} placeholder="Add specific users…" />
              <div className="space-y-1.5 pt-1">
                {[
                  { k: "notifyAssignedUser",  l: "Assigned user" },
                  { k: "notifyPreviousOwner", l: "Previous owner" },
                  { k: "notifyRecordCreator", l: "Record creator" },
                ].map(({ k, l }) => (
                  <label key={k} className="flex items-center justify-between cursor-pointer">
                    <span className="text-xs text-gray-600">{l}</span>
                    <Switch checked={!!(t as any)[k]} onCheckedChange={v => upd({ [k]: v } as any)} />
                  </label>
                ))}
              </div>
              <div className="flex gap-2 pt-1">
                {(["in_app","email","sms"] as const).map(ch => (
                  <Pill key={ch}
                    label={ch === "in_app" ? "In-App" : ch === "email" ? "Email" : "SMS"}
                    on={(t.notifyChannels ?? ["in_app"]).includes(ch)}
                    onClick={() => {
                      const arr = t.notifyChannels ?? ["in_app"];
                      upd({ notifyChannels: arr.includes(ch) ? arr.filter(x => x !== ch) : [...arr, ch] });
                    }} />
                ))}
              </div>
              <textarea value={t.notifyTemplate ?? ""} onChange={e => upd({ notifyTemplate: e.target.value })}
                placeholder={"e.g. Payment {{No}} has been forwarded to Finance."}
                rows={2}
                className="w-full text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none resize-none" />
            </Sec>

            {/* Process Message */}
            <Sec icon={MessageSquare} title="Process message">
              <Input value={t.processBanner ?? ""} onChange={e => upd({ processBanner: e.target.value })}
                placeholder="e.g. Waiting for Finance Approval" className="h-8 text-sm" />
              <div className="space-y-1 pt-1">
                <label className="text-[10px] font-semibold text-gray-500">Previous owner view</label>
                <NativeSelect value={t.prevUserVisibility ?? "none"}
                  onChange={v => upd({ prevUserVisibility: v === "none" ? undefined : v as any })}
                  className="w-full">
                  <option value="none">— No change —</option>
                  <option value="read_only">Read only</option>
                  <option value="hidden">Hidden</option>
                  <option value="progress_only">Progress only</option>
                  <option value="show_banner">Show banner</option>
                  <option value="allow_comments">Allow comments</option>
                </NativeSelect>
                <Input value={t.prevUserMessage ?? ""} onChange={e => upd({ prevUserMessage: e.target.value })}
                  placeholder="Message to previous owner…" className="h-8 text-xs" />
              </div>
            </Sec>

            {/* Rollback */}
            <Sec icon={RotateCcw} title="Rollback">
              <NativeSelect value={t.rollbackTarget ?? "none"}
                onChange={v => upd({ rollbackTarget: v === "none" ? undefined : v as any })}
                className="w-full">
                <option value="none">— Not configured —</option>
                <option value="previous_stage">Return to previous stage</option>
                <option value="record_creator">Return to record creator</option>
                <option value="selected_stage">Return to specific stage</option>
                <option value="previous_approver">Return to previous approver</option>
              </NativeSelect>
              {t.rollbackTarget === "selected_stage" && (
                <NativeSelect value={t.rollbackStageId ?? ""} onChange={v => upd({ rollbackStageId: v })} className="w-full">
                  <option value="">Select stage…</option>
                  {phases.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </NativeSelect>
              )}
              {t.rollbackTarget && (
                <div className="space-y-1.5 pl-3 border-l-2 border-red-100">
                  {[
                    { k: "rollbackRestoreStatus",     l: "Restore previous status" },
                    { k: "rollbackRestoreTags",       l: "Restore previous tags" },
                    { k: "rollbackUnlockFields",      l: "Unlock fields" },
                    { k: "rollbackRestoreAssignment", l: "Restore previous assignment" },
                    { k: "rollbackReturnToQueue",     l: "Return to previous queue" },
                  ].map(({ k, l }) => (
                    <label key={k} className="flex items-center justify-between cursor-pointer">
                      <span className="text-xs text-gray-600">{l}</span>
                      <Switch checked={!!(t as any)[k]} onCheckedChange={v => upd({ [k]: v } as any)} />
                    </label>
                  ))}
                </div>
              )}
            </Sec>

          </div>
        )}

      </div>
    </div>
  );
}
