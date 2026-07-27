"use client";
import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, Save, Loader2, Plus, X, Trash2,
  GitFork, ChevronDown, Check, Users, Building2,
  User, Settings2, Eye, Zap, CheckCircle2, AlertCircle,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";
import { useModulesStore } from "@/store/modules.store";
import { cn } from "@/lib/utils";
import { ModuleIcon } from "@/components/ui/module-icon";

const uid = () => `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

// ── Types ─────────────────────────────────────────────────────────────────────

interface Condition {
  id: string;
  field: string;
  operator: string;
  value: string;
}

interface ActionDef {
  id: string;
  label: string;
  color: string;
  bulk: boolean;
  fieldUpdates: { field: string; value: string }[];
}

interface Draft {
  name: string;
  description: string;
  moduleId: string;
  isEnabled: boolean;
  priority: number;
  targetRoles: string[];
  filterConditions: Condition[];
  conditionsLogic: "AND" | "OR";
  displayFields: string[];
  actions: ActionDef[];
}

const EMPTY: Draft = {
  name: "", description: "", moduleId: "",
  isEnabled: true, priority: 0,
  targetRoles: [], filterConditions: [],
  conditionsLogic: "AND", displayFields: [], actions: [],
};

const SYSTEM_ROLES = ["SUPER_ADMIN", "ADMIN", "MANAGER", "USER", "VIEWER"];

const OPERATORS = [
  { v: "is",           l: "is" },
  { v: "is_not",       l: "is not" },
  { v: "contains",     l: "contains" },
  { v: "not_contains", l: "doesn't contain" },
  { v: "empty",        l: "is empty" },
  { v: "not_empty",    l: "is not empty" },
  { v: "gt",           l: "greater than" },
  { v: "lt",           l: "less than" },
];

const ACTION_COLORS = ["#3b82f6","#22c55e","#f97316","#ef4444","#8b5cf6","#0ea5e9","#64748b"];

// ── Small atoms ───────────────────────────────────────────────────────────────

function Toast({ msg, type }: { msg: string; type: "success" | "error" }) {
  return (
    <div className={cn(
      "fixed bottom-6 right-6 z-[200] flex items-center gap-2 px-4 py-3 rounded-xl border shadow-lg text-sm font-medium",
      type === "success" ? "bg-green-50 border-green-200 text-green-700" : "bg-red-50 border-red-200 text-red-700",
    )}>
      {type === "success" ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
      {msg}
    </div>
  );
}

function StepBadge({ n, active }: { n: number; active?: boolean }) {
  return (
    <span className={cn(
      "w-6 h-6 rounded-full text-[11px] font-bold flex items-center justify-center shrink-0 transition-colors",
      active ? "bg-violet-600 text-white" : "bg-gray-100 text-gray-400",
    )}>{n}</span>
  );
}

function SectionCard({ step, icon: Icon, title, subtitle, children, active = true }: {
  step: number; icon: any; title: string; subtitle: string;
  children: React.ReactNode; active?: boolean;
}) {
  return (
    <div className={cn(
      "rounded-2xl border bg-white overflow-hidden transition-all",
      active ? "border-gray-200" : "border-gray-100 opacity-60 pointer-events-none",
    )}>
      <div className="flex items-center gap-3 px-5 py-3.5 border-b border-gray-100 bg-gray-50/50">
        <StepBadge n={step} active={active} />
        <Icon className="w-4 h-4 text-gray-400 shrink-0" />
        <div>
          <p className="text-sm font-semibold text-gray-900">{title}</p>
          <p className="text-xs text-gray-400">{subtitle}</p>
        </div>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

// ── Chip toggle ───────────────────────────────────────────────────────────────

function Chip({ label, selected, onClick, color }: {
  label: string; selected: boolean; onClick: () => void; color?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all",
        selected ? "border-violet-600 bg-violet-600 text-white" : "border-gray-200 bg-white text-gray-600 hover:border-violet-300 hover:text-violet-700",
      )}
      style={selected && color ? { backgroundColor: color, borderColor: color } : undefined}
    >
      {selected && <Check className="w-3 h-3" />}
      {label}
    </button>
  );
}

// ── Field value select (uses options if field has them) ───────────────────────

function FieldValueInput({ field, value, onChange }: {
  field: any | null; value: string; onChange: (v: string) => void;
}) {
  if (field?.options?.length) {
    return (
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="h-8 text-xs border border-gray-200 rounded-lg px-2 bg-white flex-1 min-w-0 focus:outline-none focus:ring-1 focus:ring-violet-400"
      >
        <option value="">Select value…</option>
        {field.options.map((o: any) => (
          <option key={o.value ?? o.id} value={o.value ?? o.label}>{o.label}</option>
        ))}
      </select>
    );
  }
  return (
    <Input
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder="Value…"
      className="h-8 text-xs flex-1 min-w-0"
    />
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function RoutingConfigPage() {
  const { id }    = useParams<{ id: string }>();
  const router    = useRouter();
  const isNew     = id === "new";

  const { modules, fetchModules } = useModulesStore();
  const [departments, setDepts]   = useState<any[]>([]);
  const [draft, setDraft]         = useState<Draft>(EMPTY);
  const [loading, setLoading]     = useState(!isNew);
  const [saving, setSaving]       = useState(false);
  const [dirty, setDirty]         = useState(false);
  const [toast, setToast]         = useState<{ msg: string; type: "success" | "error" } | null>(null);
  const [customRoleInput, setCustomRoleInput] = useState("");
  const customRef = useRef<HTMLInputElement>(null);

  const showToast = (msg: string, type: "success" | "error" = "success") => {
    setToast({ msg, type }); setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    fetchModules();
    api.get("/departments").then(r => setDepts(r.data ?? [])).catch(() => {});
  }, []); // eslint-disable-line

  useEffect(() => {
    if (isNew) return;
    api.get(`/record-routing/configs/${id}`)
      .then(({ data }) => setDraft({
        name:             data.name ?? "",
        description:      data.description ?? "",
        moduleId:         data.moduleId ?? "",
        isEnabled:        data.isEnabled ?? true,
        priority:         data.priority ?? 0,
        targetRoles:      data.targetRoles ?? [],
        filterConditions: (data.filterConditions ?? []).map((c: any) => ({ ...c, id: c.id || uid() })),
        conditionsLogic:  data.conditionsLogic ?? "AND",
        displayFields:    data.displayFields ?? [],
        actions:          (data.actions ?? []).map((a: any) => ({ ...a, id: a.id || uid() })),
      }))
      .catch(() => showToast("Failed to load config", "error"))
      .finally(() => setLoading(false));
  }, [id, isNew]); // eslint-disable-line

  const mod    = modules.find(m => m.id === draft.moduleId);
  const fields = (mod?.fields ?? []).sort((a: any, b: any) => a.order - b.order);

  const upd = (k: keyof Draft, v: any) => {
    setDraft(d => ({ ...d, [k]: v }));
    setDirty(true);
  };

  const toggleRole = (r: string) => upd("targetRoles",
    draft.targetRoles.includes(r)
      ? draft.targetRoles.filter(x => x !== r)
      : [...draft.targetRoles, r],
  );

  const addCustomRole = () => {
    const v = customRoleInput.trim();
    if (v && !draft.targetRoles.includes(v)) {
      upd("targetRoles", [...draft.targetRoles, v]);
    }
    setCustomRoleInput("");
  };

  const addCondition = () => upd("filterConditions", [
    ...draft.filterConditions,
    { id: uid(), field: fields[0]?.name ?? "", operator: "is", value: "" },
  ]);

  const updCondition = (cid: string, patch: Partial<Condition>) =>
    upd("filterConditions", draft.filterConditions.map(c => c.id === cid ? { ...c, ...patch } : c));

  const removeCondition = (cid: string) =>
    upd("filterConditions", draft.filterConditions.filter(c => c.id !== cid));

  const addAction = () => upd("actions", [
    ...draft.actions,
    { id: uid(), label: "", color: ACTION_COLORS[draft.actions.length % ACTION_COLORS.length], bulk: false, fieldUpdates: [] },
  ]);

  const updAction = (aid: string, patch: Partial<ActionDef>) =>
    upd("actions", draft.actions.map(a => a.id === aid ? { ...a, ...patch } : a));

  const removeAction = (aid: string) =>
    upd("actions", draft.actions.filter(a => a.id !== aid));

  const handleSave = async () => {
    if (!draft.name.trim() || !draft.moduleId) { showToast("Name and module are required", "error"); return; }
    setSaving(true);
    try {
      if (isNew) {
        const { data } = await api.post("/record-routing/configs", draft);
        showToast("Configuration created");
        router.replace(`/settings/routing/${data.id}`);
      } else {
        await api.patch(`/record-routing/configs/${id}`, draft);
        showToast("Saved");
        setDirty(false);
      }
    } catch { showToast("Failed to save", "error"); }
    finally { setSaving(false); }
  };

  if (loading) return (
    <div className="fixed inset-0 bg-white flex items-center justify-center">
      <Loader2 className="w-5 h-5 animate-spin text-violet-500" />
    </div>
  );

  const hasModule = !!draft.moduleId;

  return (
    <div className="fixed inset-0 z-40 bg-gray-50 flex flex-col overflow-hidden">
      {toast && <Toast msg={toast.msg} type={toast.type} />}

      {/* Top bar */}
      <div className="h-14 shrink-0 border-b border-gray-200 bg-white flex items-center gap-3 px-4">
        <Link href="/settings/routing">
          <button className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400">
            <ArrowLeft className="w-4 h-4" />
          </button>
        </Link>
        <GitFork className="w-4 h-4 text-violet-500 shrink-0" />
        <span className="text-xs text-gray-400">Request Routing</span>
        <span className="text-xs text-gray-300">/</span>
        <input
          value={draft.name}
          onChange={e => upd("name", e.target.value)}
          placeholder="Configuration name…"
          className="flex-1 min-w-0 text-sm font-semibold text-gray-900 bg-transparent border-none outline-none placeholder:text-gray-400"
        />
        {dirty && (
          <span className="text-xs text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full shrink-0">Unsaved</span>
        )}

        {/* Enable toggle */}
        <button
          type="button"
          onClick={() => upd("isEnabled", !draft.isEnabled)}
          className={cn(
            "flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all shrink-0",
            draft.isEnabled ? "border-green-200 bg-green-50 text-green-700" : "border-gray-200 bg-white text-gray-500",
          )}
        >
          <div className={cn("w-7 h-4 rounded-full relative transition-colors", draft.isEnabled ? "bg-green-500" : "bg-gray-300")}>
            <div className={cn("absolute top-0.5 w-3 h-3 rounded-full bg-white shadow transition-all", draft.isEnabled ? "left-3.5" : "left-0.5")} />
          </div>
          {draft.isEnabled ? "Enabled" : "Disabled"}
        </button>

        <Button onClick={handleSave} disabled={saving || !draft.name.trim() || !draft.moduleId} className="gap-1.5 shrink-0">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {isNew ? "Create" : "Save"}
        </Button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">

          {/* ── Step 1: Module ── */}
          <SectionCard step={1} icon={Settings2} title="Module" subtitle="Which data collection does this apply to?">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {modules.map(m => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => {
                    upd("moduleId", m.id);
                    upd("filterConditions", []);
                    upd("displayFields", []);
                    upd("actions", []);
                  }}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-medium transition-all text-left",
                    draft.moduleId === m.id
                      ? "border-violet-600 bg-violet-50 text-violet-700 shadow-sm"
                      : "border-gray-200 bg-white text-gray-600 hover:border-violet-300",
                  )}
                >
                  <span className="shrink-0"><ModuleIcon icon={m.icon} slug={m.slug} className="w-4 h-4" /></span>
                  <span className="truncate">{m.name}</span>
                  {draft.moduleId === m.id && <Check className="w-3.5 h-3.5 ml-auto shrink-0" />}
                </button>
              ))}
            </div>
          </SectionCard>

          {/* ── Step 2: Conditions ── */}
          <SectionCard step={2} icon={Eye} title="Show records when…" subtitle="Records matching these conditions appear in the queue" active={hasModule}>
            <div className="space-y-3">
              {/* AND/OR toggle */}
              {draft.filterConditions.length > 1 && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">Match</span>
                  {(["AND","OR"] as const).map(l => (
                    <button key={l} type="button" onClick={() => upd("conditionsLogic", l)}
                      className={cn(
                        "px-2.5 py-1 rounded-lg text-xs font-bold border transition-all",
                        draft.conditionsLogic === l ? "bg-violet-600 text-white border-violet-600" : "bg-white text-gray-500 border-gray-200",
                      )}>
                      {l}
                    </button>
                  ))}
                  <span className="text-xs text-gray-400">conditions</span>
                </div>
              )}

              {draft.filterConditions.length === 0 && (
                <div className="py-4 text-center border-2 border-dashed border-gray-100 rounded-xl">
                  <p className="text-sm text-gray-400">No conditions — all records will appear</p>
                </div>
              )}

              {draft.filterConditions.map((cond, idx) => {
                const fieldDef = fields.find((f: any) => f.name === cond.field);
                const needsValue = !["empty","not_empty"].includes(cond.operator);
                return (
                  <div key={cond.id} className="flex items-center gap-2 flex-wrap bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5">
                    {idx > 0 && (
                      <span className="text-[10px] font-bold text-violet-600 bg-violet-50 border border-violet-200 rounded px-1.5 py-0.5 shrink-0">
                        {draft.conditionsLogic}
                      </span>
                    )}
                    {/* Field */}
                    <select
                      value={cond.field}
                      onChange={e => updCondition(cond.id, { field: e.target.value, value: "" })}
                      className="h-8 text-xs border border-gray-200 rounded-lg px-2 bg-white focus:outline-none focus:ring-1 focus:ring-violet-400 min-w-0 flex-1"
                    >
                      <option value="">Field…</option>
                      {fields.map((f: any) => <option key={f.id ?? f.name} value={f.name}>{f.label ?? f.name}</option>)}
                    </select>
                    {/* Operator */}
                    <select
                      value={cond.operator}
                      onChange={e => updCondition(cond.id, { operator: e.target.value })}
                      className="h-8 text-xs border border-gray-200 rounded-lg px-2 bg-white focus:outline-none focus:ring-1 focus:ring-violet-400 w-36 shrink-0"
                    >
                      {OPERATORS.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
                    </select>
                    {/* Value */}
                    {needsValue && (
                      <FieldValueInput
                        field={fieldDef}
                        value={cond.value}
                        onChange={v => updCondition(cond.id, { value: v })}
                      />
                    )}
                    <button onClick={() => removeCondition(cond.id)} className="text-gray-400 hover:text-red-500 shrink-0">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}

              <button
                type="button"
                onClick={addCondition}
                disabled={!hasModule}
                className="flex items-center gap-1.5 text-xs text-violet-600 hover:text-violet-800 font-medium disabled:opacity-40"
              >
                <Plus className="w-3.5 h-3.5" /> Add condition
              </button>
            </div>
          </SectionCard>

          {/* ── Step 3: Show to ── */}
          <SectionCard step={3} icon={Users} title="Show to" subtitle="Who sees these records in their queue" active={hasModule}>
            <div className="space-y-4">
              <p className="text-xs text-gray-400">Leave all empty to show to everyone. Add specific roles, departments, or job titles to restrict.</p>

              {/* System roles */}
              <div>
                <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <User className="w-3 h-3" /> System roles
                </p>
                <div className="flex flex-wrap gap-2">
                  {SYSTEM_ROLES.map(r => (
                    <Chip key={r} label={r} selected={draft.targetRoles.includes(r)} onClick={() => toggleRole(r)} />
                  ))}
                </div>
              </div>

              {/* Departments */}
              {departments.length > 0 && (
                <div>
                  <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Building2 className="w-3 h-3" /> Departments
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {departments.map(d => (
                      <Chip key={d.id} label={d.name} selected={draft.targetRoles.includes(d.name)} onClick={() => toggleRole(d.name)} />
                    ))}
                  </div>
                </div>
              )}

              {/* Custom job title */}
              <div>
                <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Settings2 className="w-3 h-3" /> Job title / custom role
                </p>
                <div className="flex gap-2">
                  <Input
                    ref={customRef}
                    value={customRoleInput}
                    onChange={e => setCustomRoleInput(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addCustomRole(); } }}
                    placeholder="e.g. Finance Officer, Doctor…"
                    className="h-8 text-xs flex-1"
                  />
                  <button
                    type="button"
                    onClick={addCustomRole}
                    disabled={!customRoleInput.trim()}
                    className="px-3 h-8 text-xs rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40"
                  >
                    Add
                  </button>
                </div>
                <p className="text-[10px] text-gray-400 mt-1">New users with this job title will automatically see this queue.</p>
              </div>

              {/* Selected summary */}
              {draft.targetRoles.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-2 border-t border-gray-100">
                  {draft.targetRoles.map(r => (
                    <span key={r} className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-violet-50 border border-violet-200 text-xs font-medium text-violet-700">
                      {r}
                      <button onClick={() => upd("targetRoles", draft.targetRoles.filter(x => x !== r))}>
                        <X className="w-2.5 h-2.5" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </SectionCard>

          {/* ── Step 4: Display fields ── */}
          <SectionCard step={4} icon={Eye} title="What to display" subtitle="Fields shown as columns in the queue" active={hasModule}>
            {fields.length === 0 ? (
              <p className="text-sm text-gray-400">Select a module first.</p>
            ) : (
              <div className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  {fields.map((f: any) => (
                    <Chip
                      key={f.id ?? f.name}
                      label={f.label ?? f.name}
                      selected={draft.displayFields.includes(f.name)}
                      onClick={() => upd("displayFields",
                        draft.displayFields.includes(f.name)
                          ? draft.displayFields.filter(n => n !== f.name)
                          : [...draft.displayFields, f.name],
                      )}
                    />
                  ))}
                </div>
                {draft.displayFields.length > 0 && (
                  <div className="flex items-center gap-1.5 pt-2 border-t border-gray-100 flex-wrap">
                    <span className="text-xs text-gray-400 shrink-0">Order:</span>
                    {draft.displayFields.map((f, i) => (
                      <span key={f} className="flex items-center gap-1 text-xs text-gray-600 bg-gray-100 px-2 py-0.5 rounded">
                        <span className="text-gray-400 text-[10px]">{i + 1}</span>
                        {fields.find((x: any) => x.name === f)?.label ?? f}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}
          </SectionCard>

          {/* ── Step 5: Actions ── */}
          <SectionCard step={5} icon={Zap} title="Actions" subtitle="Buttons users can click on each record" active={hasModule}>
            <div className="space-y-3">
              {draft.actions.length === 0 && (
                <div className="py-4 text-center border-2 border-dashed border-gray-100 rounded-xl">
                  <p className="text-sm text-gray-400">No actions — records are view-only</p>
                </div>
              )}

              {draft.actions.map((action, idx) => (
                <div key={action.id} className="border border-gray-200 rounded-xl overflow-hidden">
                  {/* Action header */}
                  <div className="flex items-center gap-3 px-4 py-3 bg-gray-50/60 border-b border-gray-100">
                    <div
                      className="w-3 h-3 rounded-full shrink-0 ring-2 ring-white shadow"
                      style={{ backgroundColor: action.color }}
                    />
                    <Input
                      value={action.label}
                      onChange={e => updAction(action.id, { label: e.target.value })}
                      placeholder="Button label (e.g. Approve, Reject…)"
                      className="h-7 text-xs flex-1 border-0 bg-transparent shadow-none px-0 focus-visible:ring-0 font-medium"
                    />
                    <div className="flex items-center gap-2 shrink-0">
                      {/* Color picker */}
                      <div className="flex gap-1">
                        {ACTION_COLORS.map(c => (
                          <button
                            key={c}
                            type="button"
                            onClick={() => updAction(action.id, { color: c })}
                            className={cn("w-4 h-4 rounded-full transition-transform hover:scale-125", action.color === c && "ring-2 ring-offset-1 ring-gray-400")}
                            style={{ backgroundColor: c }}
                          />
                        ))}
                      </div>
                      {/* Bulk toggle */}
                      <label className="flex items-center gap-1 text-[11px] text-gray-500 cursor-pointer select-none whitespace-nowrap">
                        <input
                          type="checkbox"
                          checked={action.bulk ?? false}
                          onChange={e => updAction(action.id, { bulk: e.target.checked })}
                          className="rounded w-3 h-3"
                        />
                        Bulk
                      </label>
                      <button onClick={() => removeAction(action.id)} className="text-gray-400 hover:text-red-500">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Field updates */}
                  <div className="px-4 py-3 space-y-2">
                    <p className="text-[11px] text-gray-400 font-medium">When clicked, set:</p>
                    {(action.fieldUpdates ?? []).map((fu, fi) => {
                      const fieldDef = fields.find((f: any) => f.name === fu.field);
                      return (
                        <div key={fi} className="flex items-center gap-2">
                          <select
                            value={fu.field}
                            onChange={e => {
                              const next = [...(action.fieldUpdates ?? [])];
                              next[fi] = { ...fu, field: e.target.value, value: "" };
                              updAction(action.id, { fieldUpdates: next });
                            }}
                            className="h-7 text-xs border border-gray-200 rounded-lg px-2 bg-white focus:outline-none focus:ring-1 focus:ring-violet-400 w-36"
                          >
                            <option value="">Field…</option>
                            {fields.map((f: any) => <option key={f.id ?? f.name} value={f.name}>{f.label ?? f.name}</option>)}
                          </select>
                          <ArrowRight className="w-3 h-3 text-gray-300 shrink-0" />
                          <FieldValueInput
                            field={fieldDef ?? null}
                            value={fu.value}
                            onChange={v => {
                              const next = [...(action.fieldUpdates ?? [])];
                              next[fi] = { ...fu, value: v };
                              updAction(action.id, { fieldUpdates: next });
                            }}
                          />
                          <button
                            onClick={() => {
                              const next = (action.fieldUpdates ?? []).filter((_, i) => i !== fi);
                              updAction(action.id, { fieldUpdates: next });
                            }}
                            className="text-gray-400 hover:text-red-500 shrink-0"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      );
                    })}
                    <button
                      type="button"
                      disabled={!hasModule}
                      onClick={() => {
                        const next = [...(action.fieldUpdates ?? []), { field: fields[0]?.name ?? "", value: "" }];
                        updAction(action.id, { fieldUpdates: next });
                      }}
                      className="text-[11px] text-violet-600 hover:text-violet-800 flex items-center gap-1 disabled:opacity-40"
                    >
                      <Plus className="w-3 h-3" /> Add field update
                    </button>
                  </div>
                </div>
              ))}

              <button
                type="button"
                onClick={addAction}
                className="flex items-center gap-1.5 text-xs text-violet-600 hover:text-violet-800 font-medium"
              >
                <Plus className="w-3.5 h-3.5" /> Add action
              </button>
            </div>
          </SectionCard>

        </div>
      </div>
    </div>
  );
}
