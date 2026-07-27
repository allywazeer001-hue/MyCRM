"use client";
import { useState, useMemo, useEffect } from "react";
import { Plus, Trash2, Clock, Repeat, CalendarClock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { useModulesStore, type Field } from "@/store/modules.store";
import { api } from "@/lib/api";

// ── Types ──────────────────────────────────────────────────────────────────────

export type ActionType = "SET_FIELD_DEFAULT" | "UPDATE_FIELD_OPTIONS" | "UPDATE_SAVED_FILTER" | "SET_WORKFLOW_ACTIVE";

export interface ConfigAction {
  id: string;
  type: ActionType;
  targetId: string;
  config: Record<string, any>;
}

export interface ScheduledConfigFormValue {
  name: string;
  description: string;
  isRecurring: boolean;
  recurrencePattern: "DAILY" | "WEEKLY" | "MONTHLY";
  recurrenceDayOfWeek: number;
  recurrenceDayOfMonth: number;
  timeOfDay: string;
  runAt: string; // datetime-local string
  actions: ConfigAction[];
}

const ACTION_TYPE_OPTS: { value: ActionType; label: string }[] = [
  { value: "SET_FIELD_DEFAULT", label: "Set a field's default value" },
  { value: "UPDATE_FIELD_OPTIONS", label: "Update a dropdown field's options" },
  { value: "UPDATE_SAVED_FILTER", label: "Update a saved filter" },
  { value: "SET_WORKFLOW_ACTIVE", label: "Turn a workflow on/off" },
];

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const OPTION_BEARING_TYPES = ["DROPDOWN", "MULTI_SELECT", "RADIO"];

function newActionId() { return `act-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`; }

export function emptyFormValue(): ScheduledConfigFormValue {
  const now = new Date(Date.now() + 60 * 60 * 1000); // default: an hour from now
  return {
    name: "",
    description: "",
    isRecurring: false,
    recurrencePattern: "DAILY",
    recurrenceDayOfWeek: 1,
    recurrenceDayOfMonth: 1,
    timeOfDay: "09:00",
    runAt: now.toISOString().slice(0, 16),
    actions: [],
  };
}

// ── One action's target + config picker, specific to its type ──────────────────

function ActionEditor({ action, onChange, onRemove }: {
  action: ConfigAction;
  onChange: (patch: Partial<ConfigAction>) => void;
  onRemove: () => void;
}) {
  const { modules } = useModulesStore();
  const [moduleId, setModuleId] = useState("");
  const [savedFilters, setSavedFilters] = useState<any[]>([]);
  const [workflows, setWorkflows] = useState<any[]>([]);
  const [optionsText, setOptionsText] = useState(
    (action.config?.options ?? []).map((o: any) => o.label).join("\n")
  );

  useEffect(() => {
    if (action.type === "UPDATE_SAVED_FILTER") {
      api.get("/analytics/saved-filters").then(r => setSavedFilters(r.data ?? [])).catch(() => setSavedFilters([]));
    }
    if (action.type === "SET_WORKFLOW_ACTIVE") {
      api.get("/workflows").then(r => setWorkflows(r.data ?? [])).catch(() => setWorkflows([]));
    }
  }, [action.type]);

  // For field-targeting actions, figure out which module the currently-selected
  // field belongs to (so the module dropdown reflects an already-picked field on edit).
  useEffect(() => {
    if ((action.type === "SET_FIELD_DEFAULT" || action.type === "UPDATE_FIELD_OPTIONS") && action.targetId && !moduleId) {
      const mod = modules.find((m: any) => m.fields?.some((f: Field) => f.id === action.targetId));
      if (mod) setModuleId(mod.id);
    }
  }, [action.targetId, action.type, modules, moduleId]);

  const fieldsForModule = useMemo(() => {
    const mod = modules.find((m: any) => m.id === moduleId);
    const all: Field[] = mod?.fields ?? [];
    return action.type === "UPDATE_FIELD_OPTIONS" ? all.filter(f => OPTION_BEARING_TYPES.includes(f.type)) : all;
  }, [modules, moduleId, action.type]);

  const selectedField = fieldsForModule.find(f => f.id === action.targetId);
  const savedFilter = savedFilters.find(f => f.id === action.targetId);
  const filterFields: Field[] = useMemo(() => {
    if (!savedFilter?.moduleId) return [];
    return modules.find((m: any) => m.id === savedFilter.moduleId)?.fields ?? [];
  }, [savedFilter, modules]);

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-3 space-y-3">
      <div className="flex items-center gap-2">
        <select
          value={action.type}
          onChange={e => onChange({ type: e.target.value as ActionType, targetId: "", config: {} })}
          className="flex-1 text-sm border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-blue-400"
        >
          {ACTION_TYPE_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <button onClick={onRemove} className="text-gray-300 hover:text-red-500 transition-colors shrink-0" title="Remove action">
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {(action.type === "SET_FIELD_DEFAULT" || action.type === "UPDATE_FIELD_OPTIONS") && (
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">Module</label>
            <select value={moduleId} onChange={e => { setModuleId(e.target.value); onChange({ targetId: "" }); }}
              className="w-full text-sm border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-blue-400">
              <option value="">-- select a module --</option>
              {modules.map((m: any) => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">Field</label>
            <select value={action.targetId} onChange={e => onChange({ targetId: e.target.value })}
              disabled={!moduleId} className="w-full text-sm border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-blue-400 disabled:bg-gray-50">
              <option value="">-- select a field --</option>
              {fieldsForModule.map(f => <option key={f.id} value={f.id}>{f.label}</option>)}
            </select>
          </div>
        </div>
      )}

      {action.type === "SET_FIELD_DEFAULT" && action.targetId && (
        <div>
          <label className="text-xs font-medium text-gray-500 mb-1 block">New default value</label>
          <Input
            value={action.config?.defaultValue ?? ""}
            onChange={e => onChange({ config: { ...action.config, defaultValue: e.target.value } })}
            placeholder={selectedField?.type === "DROPDOWN" ? "Must match one of the field's option values" : "Value…"}
          />
        </div>
      )}

      {action.type === "UPDATE_FIELD_OPTIONS" && action.targetId && (
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-gray-500 mb-1 block">Options (one per line)</label>
          <textarea
            value={optionsText}
            onChange={e => {
              setOptionsText(e.target.value);
              const lines = e.target.value.split("\n").map(l => l.trim()).filter(Boolean);
              onChange({ config: { ...action.config, options: lines.map(label => ({ label, value: label.toLowerCase().replace(/\s+/g, "_") })) } });
            }}
            rows={4}
            placeholder={"Option 1\nOption 2\nOption 3"}
            className="w-full text-xs border border-gray-200 rounded-md p-2 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <label className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer">
            <input type="checkbox" checked={action.config?.replaceExisting !== false}
              onChange={e => onChange({ config: { ...action.config, replaceExisting: e.target.checked } })}
              className="rounded" />
            Replace existing options (uncheck to append instead)
          </label>
        </div>
      )}

      {action.type === "UPDATE_SAVED_FILTER" && (
        <div className="space-y-2">
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">Saved filter</label>
            <select value={action.targetId} onChange={e => onChange({ targetId: e.target.value })}
              className="w-full text-sm border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-blue-400">
              <option value="">-- select a saved filter --</option>
              {savedFilters.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
            </select>
          </div>
          {action.targetId && (
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-500 mb-1 block">New conditions (all must match)</label>
              {(action.config?.conditions ?? []).map((c: any, i: number) => (
                <div key={i} className="flex items-center gap-1.5">
                  <select value={c.field ?? ""} onChange={e => {
                    const conditions = [...(action.config?.conditions ?? [])];
                    conditions[i] = { ...c, field: e.target.value };
                    onChange({ config: { ...action.config, conditions } });
                  }} className="flex-1 text-xs border border-gray-200 rounded-md px-2 py-1.5">
                    <option value="">Field…</option>
                    {filterFields.map(f => <option key={f.id} value={f.name}>{f.label}</option>)}
                  </select>
                  <select value={c.operator ?? "equals"} onChange={e => {
                    const conditions = [...(action.config?.conditions ?? [])];
                    conditions[i] = { ...c, operator: e.target.value };
                    onChange({ config: { ...action.config, conditions } });
                  }} className="text-xs border border-gray-200 rounded-md px-2 py-1.5">
                    <option value="equals">equals</option>
                    <option value="not_equals">does not equal</option>
                    <option value="is_empty">is empty</option>
                    <option value="not_empty">is not empty</option>
                  </select>
                  <Input value={c.value ?? ""} onChange={e => {
                    const conditions = [...(action.config?.conditions ?? [])];
                    conditions[i] = { ...c, value: e.target.value };
                    onChange({ config: { ...action.config, conditions } });
                  }} placeholder="Value…" className="flex-1 h-8 text-xs" />
                  <button onClick={() => {
                    const conditions = (action.config?.conditions ?? []).filter((_: any, j: number) => j !== i);
                    onChange({ config: { ...action.config, conditions } });
                  }} className="text-gray-300 hover:text-red-500 shrink-0"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              ))}
              <button onClick={() => onChange({ config: { ...action.config, conditions: [...(action.config?.conditions ?? []), { field: "", operator: "equals", value: "" }] } })}
                className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800">
                <Plus className="w-3 h-3" /> Add condition
              </button>
            </div>
          )}
        </div>
      )}

      {action.type === "SET_WORKFLOW_ACTIVE" && (
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">Workflow</label>
            <select value={action.targetId} onChange={e => onChange({ targetId: e.target.value })}
              className="w-full text-sm border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-blue-400">
              <option value="">-- select a workflow --</option>
              {workflows.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">Set to</label>
            <select value={action.config?.isActive ? "on" : "off"} onChange={e => onChange({ config: { ...action.config, isActive: e.target.value === "on" } })}
              className="w-full text-sm border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-blue-400">
              <option value="on">Active</option>
              <option value="off">Inactive</option>
            </select>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main form ────────────────────────────────────────────────────────────────

export function ScheduledConfigForm({ value, onChange }: {
  value: ScheduledConfigFormValue;
  onChange: (v: ScheduledConfigFormValue) => void;
}) {
  const set = <K extends keyof ScheduledConfigFormValue>(k: K, v: ScheduledConfigFormValue[K]) => onChange({ ...value, [k]: v });

  const addAction = () => set("actions", [...value.actions, { id: newActionId(), type: "SET_FIELD_DEFAULT", targetId: "", config: {} }]);
  const updateAction = (id: string, patch: Partial<ConfigAction>) =>
    set("actions", value.actions.map(a => a.id === id ? { ...a, ...patch } : a));
  const removeAction = (id: string) => set("actions", value.actions.filter(a => a.id !== id));

  return (
    <div className="space-y-5">
      <div className="space-y-1.5">
        <Label className="text-xs">Name</Label>
        <Input value={value.name} onChange={e => set("name", e.target.value)} placeholder="e.g. Switch to next semester's dropdown options" />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">Description (optional)</Label>
        <Input value={value.description} onChange={e => set("description", e.target.value)} placeholder="What this schedule is for" />
      </div>

      {/* Schedule */}
      <div className="rounded-xl border border-gray-200 p-3 space-y-3">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1.5">
          <CalendarClock className="w-3.5 h-3.5" /> When
        </p>
        <div className="grid grid-cols-2 gap-2">
          <button type="button" onClick={() => set("isRecurring", false)}
            className={cn("text-left px-3 py-2 rounded-xl border transition",
              !value.isRecurring ? "border-blue-400 bg-blue-50" : "border-gray-200 hover:border-gray-300")}>
            <p className="text-sm font-medium text-gray-800">One-time</p>
            <p className="text-[11px] text-gray-400">Fires once at a specific date &amp; time</p>
          </button>
          <button type="button" onClick={() => set("isRecurring", true)}
            className={cn("text-left px-3 py-2 rounded-xl border transition",
              value.isRecurring ? "border-blue-400 bg-blue-50" : "border-gray-200 hover:border-gray-300")}>
            <p className="text-sm font-medium text-gray-800 flex items-center gap-1"><Repeat className="w-3 h-3" /> Recurring</p>
            <p className="text-[11px] text-gray-400">Repeats Daily, Weekly, or Monthly</p>
          </button>
        </div>

        {!value.isRecurring ? (
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">Run at</label>
            <input type="datetime-local" value={value.runAt} onChange={e => set("runAt", e.target.value)}
              className="w-full text-sm border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-blue-400" />
          </div>
        ) : (
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Repeats</label>
                <select value={value.recurrencePattern} onChange={e => set("recurrencePattern", e.target.value as any)}
                  className="w-full text-sm border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-blue-400">
                  <option value="DAILY">Daily</option>
                  <option value="WEEKLY">Weekly</option>
                  <option value="MONTHLY">Monthly</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block flex items-center gap-1"><Clock className="w-3 h-3" /> At</label>
                <input type="time" value={value.timeOfDay} onChange={e => set("timeOfDay", e.target.value)}
                  className="w-full text-sm border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-blue-400" />
              </div>
            </div>
            {value.recurrencePattern === "WEEKLY" && (
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">On</label>
                <select value={value.recurrenceDayOfWeek} onChange={e => set("recurrenceDayOfWeek", Number(e.target.value))}
                  className="w-full text-sm border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-blue-400">
                  {WEEKDAYS.map((d, i) => <option key={i} value={i}>{d}</option>)}
                </select>
              </div>
            )}
            {value.recurrencePattern === "MONTHLY" && (
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Day of month</label>
                <Input type="number" min={1} max={31} value={value.recurrenceDayOfMonth}
                  onChange={e => set("recurrenceDayOfMonth", Math.max(1, Math.min(31, Number(e.target.value) || 1)))} />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="space-y-2">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">What to change</p>
        {value.actions.length === 0 && (
          <div className="flex flex-col items-center justify-center py-8 rounded-xl border-2 border-dashed border-gray-200 text-gray-400 gap-2">
            <p className="text-xs">No actions yet — click Add Action to start.</p>
          </div>
        )}
        <div className="space-y-2">
          {value.actions.map(a => (
            <ActionEditor key={a.id} action={a} onChange={patch => updateAction(a.id, patch)} onRemove={() => removeAction(a.id)} />
          ))}
        </div>
        <Button size="sm" variant="outline" onClick={addAction} className="gap-1.5">
          <Plus className="w-3.5 h-3.5" /> Add Action
        </Button>
      </div>
    </div>
  );
}
