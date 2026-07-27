"use client";

import { useState, useEffect, useCallback } from "react";
import {
  ShieldCheck, Plus, Trash2, CheckCircle2, AlertCircle,
  Loader2, ChevronLeft, Info, Layers,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import Link from "next/link";

// ── Types ─────────────────────────────────────────────────────────────────────

interface DuplicateRule {
  id: string;
  moduleId: string;
  fields: string[];
  label: string;
}

interface MissingDataRule {
  id: string;
  moduleId: string;
  fields: string[];
  label: string;
}

interface Config {
  autoMode: boolean;
  schedule: "DISABLED" | "DAILY" | "WEEKLY" | "MONTHLY";
  scheduledHour: number;
  duplicateRules: DuplicateRule[];
  missingDataRules: MissingDataRule[];
  notifyDuplicate: boolean;
  notifyMissing: boolean;
  notifyInvalid: boolean;
  includedModules: string[];
  notifyRoles: string[];
}

interface Module { id: string; name: string; slug: string; }
interface Field  { id: string; name: string; label: string; type: string; }

const DEFAULT_CONFIG: Config = {
  autoMode: false,
  schedule: "DISABLED",
  scheduledHour: 2,
  duplicateRules: [],
  missingDataRules: [],
  notifyDuplicate: true,
  notifyMissing: true,
  notifyInvalid: false,
  includedModules: [],
  notifyRoles: ["ADMIN", "SUPER_ADMIN"],
};

const NOTIFY_ROLE_OPTIONS = [
  { value: "SUPER_ADMIN", label: "Super Admin" },
  { value: "ADMIN",       label: "Admin" },
  { value: "MANAGER",     label: "Manager" },
  { value: "USER",        label: "User" },
];

function Toggle({ checked, onChange, label, description }: {
  checked: boolean; onChange: (v: boolean) => void;
  label: string; description?: string;
}) {
  return (
    <label className="flex items-start justify-between gap-4 py-3 cursor-pointer group">
      <div className="flex-1">
        <p className="text-sm font-medium text-gray-800 group-hover:text-gray-900">{label}</p>
        {description && <p className="text-xs text-gray-400 mt-0.5">{description}</p>}
      </div>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={cn(
          "w-10 h-5 rounded-full transition-colors relative shrink-0 mt-0.5",
          checked ? "bg-blue-500" : "bg-gray-200"
        )}
      >
        <span className={cn(
          "absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform",
          checked ? "translate-x-5" : "translate-x-0.5"
        )} />
      </button>
    </label>
  );
}

// ── Add Duplicate Rule Form ───────────────────────────────────────────────────

function AddRuleForm({
  modules,
  onAdd,
  onCancel,
}: { modules: Module[]; onAdd: (rule: DuplicateRule) => void; onCancel: () => void }) {
  const [modId, setModId] = useState("");
  const [fields, setFields] = useState<Field[]>([]);
  const [selectedFields, setSelectedFields] = useState<string[]>([]);
  const [label, setLabel] = useState("");
  const [loadingFields, setLoadingFields] = useState(false);

  const loadFields = useCallback(async (mid: string) => {
    if (!mid) return;
    setLoadingFields(true);
    try {
      const { data } = await api.get(`/modules/${mid}/fields`);
      const usable = (data ?? []).filter((f: Field) =>
        !["AUTO_NUMBER","FORMULA","MIRROR","LOOKUP","FILE","IMAGE","SIGNATURE","RICH_TEXT"].includes(f.type)
      );
      setFields(usable);
    } catch { setFields([]); } finally { setLoadingFields(false); }
  }, []);

  const handleModChange = (mid: string) => {
    setModId(mid); setSelectedFields([]); setFields([]);
    if (mid) loadFields(mid);
  };

  const toggleField = (name: string) =>
    setSelectedFields(prev =>
      prev.includes(name) ? prev.filter(f => f !== name) : [...prev, name]
    );

  const submit = () => {
    if (!modId || selectedFields.length === 0) return;
    onAdd({
      id: Math.random().toString(36).slice(2, 9),
      moduleId: modId,
      fields: selectedFields,
      label: label.trim() || selectedFields.join(" + "),
    });
  };

  return (
    <div className="border border-blue-100 rounded-xl bg-blue-50/40 p-4 space-y-4">
      <p className="text-sm font-semibold text-gray-700">New Duplicate Detection Rule</p>

      <div className="space-y-1.5">
        <label className="text-xs font-medium text-gray-500">Module</label>
        <select
          value={modId}
          onChange={e => handleModChange(e.target.value)}
          className="w-full h-9 px-3 text-sm rounded-lg border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
        >
          <option value="">Select module…</option>
          {modules.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
        </select>
      </div>

      {loadingFields && (
        <div className="flex items-center gap-2 text-xs text-gray-400">
          <Loader2 className="w-3 h-3 animate-spin" /> Loading fields…
        </div>
      )}

      {fields.length > 0 && (
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-gray-500">
            Match on Fields (select one or more)
          </label>
          <div className="flex flex-wrap gap-1.5">
            {fields.map(f => (
              <button
                key={f.id ?? f.name}
                type="button"
                onClick={() => toggleField(f.name)}
                className={cn(
                  "px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors",
                  selectedFields.includes(f.name)
                    ? "bg-blue-500 text-white border-blue-500"
                    : "bg-white text-gray-600 border-gray-200 hover:border-blue-300"
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-1.5">
        <label className="text-xs font-medium text-gray-500">Rule Label (optional)</label>
        <input
          type="text"
          value={label}
          onChange={e => setLabel(e.target.value)}
          placeholder="e.g. Duplicate Employee"
          className="w-full h-9 px-3 text-sm rounded-lg border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
        />
      </div>

      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={onCancel} className="flex-1 h-8 text-xs">
          Cancel
        </Button>
        <Button size="sm" onClick={submit}
          disabled={!modId || selectedFields.length === 0}
          className="flex-1 h-8 text-xs gap-1 bg-blue-600 hover:bg-blue-700 text-white">
          <Plus className="w-3 h-3" /> Add Rule
        </Button>
      </div>
    </div>
  );
}

// ── Add Missing Rule Form ─────────────────────────────────────────────────────

function AddMissingRuleForm({
  modules,
  onAdd,
  onCancel,
}: { modules: Module[]; onAdd: (rule: MissingDataRule) => void; onCancel: () => void }) {
  const [modId, setModId] = useState("");
  const [fields, setFields] = useState<Field[]>([]);
  const [selectedFields, setSelectedFields] = useState<string[]>([]);
  const [label, setLabel] = useState("");
  const [loadingFields, setLoadingFields] = useState(false);

  const loadFields = useCallback(async (mid: string) => {
    if (!mid) return;
    setLoadingFields(true);
    try {
      const { data } = await api.get(`/modules/${mid}/fields`);
      setFields((data ?? []).filter((f: Field) =>
        !["AUTO_NUMBER","FORMULA","MIRROR","LOOKUP","FILE","IMAGE","SIGNATURE","RICH_TEXT"].includes(f.type)
      ));
    } catch { setFields([]); } finally { setLoadingFields(false); }
  }, []);

  const handleModChange = (mid: string) => {
    setModId(mid); setSelectedFields([]); setFields([]);
    if (mid) loadFields(mid);
  };

  const toggleField = (name: string) =>
    setSelectedFields(prev => prev.includes(name) ? prev.filter(f => f !== name) : [...prev, name]);

  const submit = () => {
    if (!modId || selectedFields.length === 0) return;
    onAdd({
      id: Math.random().toString(36).slice(2, 9),
      moduleId: modId,
      fields: selectedFields,
      label: label.trim() || selectedFields.join(", "),
    });
  };

  return (
    <div className="border border-green-100 rounded-xl bg-green-50/40 p-4 space-y-4">
      <p className="text-sm font-semibold text-gray-700">New Missing Data Rule</p>

      <div className="space-y-1.5">
        <label className="text-xs font-medium text-gray-500">Module</label>
        <select
          value={modId}
          onChange={e => handleModChange(e.target.value)}
          className="w-full h-9 px-3 text-sm rounded-lg border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-400"
        >
          <option value="">Select module…</option>
          {modules.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
        </select>
      </div>

      {loadingFields && (
        <div className="flex items-center gap-2 text-xs text-gray-400">
          <Loader2 className="w-3 h-3 animate-spin" /> Loading fields…
        </div>
      )}

      {fields.length > 0 && (
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-gray-500">
            Monitored Fields (select fields that should trigger warnings when empty)
          </label>
          <div className="flex flex-wrap gap-1.5">
            {fields.map(f => (
              <button
                key={f.id ?? f.name}
                type="button"
                onClick={() => toggleField(f.name)}
                className={cn(
                  "px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors",
                  selectedFields.includes(f.name)
                    ? "bg-green-500 text-white border-green-500"
                    : "bg-white text-gray-600 border-gray-200 hover:border-green-300"
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-1.5">
        <label className="text-xs font-medium text-gray-500">Rule Label (optional)</label>
        <input
          type="text"
          value={label}
          onChange={e => setLabel(e.target.value)}
          placeholder="e.g. Student Required Fields"
          className="w-full h-9 px-3 text-sm rounded-lg border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-400"
        />
      </div>

      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={onCancel} className="flex-1 h-8 text-xs">Cancel</Button>
        <Button size="sm" onClick={submit}
          disabled={!modId || selectedFields.length === 0}
          className="flex-1 h-8 text-xs gap-1 bg-green-600 hover:bg-green-700 text-white">
          <Plus className="w-3 h-3" /> Add Rule
        </Button>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function DataQualityConfigPage() {
  const [config, setConfig] = useState<Config>(DEFAULT_CONFIG);
  const [modules, setModules] = useState<Module[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ text: string; type: "success" | "error" } | null>(null);
  const [showAddRule, setShowAddRule] = useState(false);
  const [showAddMissingRule, setShowAddMissingRule] = useState(false);

  useEffect(() => {
    Promise.all([
      api.get("/data-quality/config").then(r => r.data),
      api.get("/modules").then(r => r.data),
    ]).then(([cfg, mods]) => {
      setConfig({
        ...DEFAULT_CONFIG,
        ...cfg,
        duplicateRules: (cfg.duplicateRules ?? []).map((r: any, i: number) => ({
          ...r, id: r.id ?? String(i),
        })),
        missingDataRules: (cfg.missingDataRules ?? []).map((r: any, i: number) => ({
          ...r, id: r.id ?? String(i),
        })),
        includedModules: cfg.includedModules ?? [],
        notifyRoles: cfg.notifyRoles ?? ["ADMIN", "SUPER_ADMIN"],
      });
      setModules(mods ?? []);
    }).catch(() => {})
    .finally(() => setLoading(false));
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      await api.put("/data-quality/config", {
        ...config,
        scheduledHour: Number(config.scheduledHour),
      });
      setMsg({ text: "Configuration saved successfully.", type: "success" });
    } catch {
      setMsg({ text: "Failed to save configuration.", type: "error" });
    } finally {
      setSaving(false);
      setTimeout(() => setMsg(null), 3500);
    }
  };

  const addRule = (rule: DuplicateRule) => {
    setConfig(c => ({ ...c, duplicateRules: [...c.duplicateRules, rule] }));
    setShowAddRule(false);
  };

  const removeRule = (id: string) =>
    setConfig(c => ({ ...c, duplicateRules: c.duplicateRules.filter(r => r.id !== id) }));

  const addMissingRule = (rule: MissingDataRule) => {
    setConfig(c => ({ ...c, missingDataRules: [...(c.missingDataRules ?? []), rule] }));
    setShowAddMissingRule(false);
  };

  const removeMissingRule = (id: string) =>
    setConfig(c => ({ ...c, missingDataRules: (c.missingDataRules ?? []).filter(r => r.id !== id) }));

  const toggleIncludedModule = (id: string, checked: boolean) =>
    setConfig(c => ({
      ...c,
      includedModules: checked
        ? [...c.includedModules, id]
        : c.includedModules.filter(m => m !== id),
    }));

  const toggleNotifyRole = (role: string, checked: boolean) =>
    setConfig(c => ({
      ...c,
      notifyRoles: checked
        ? [...(c.notifyRoles ?? []), role]
        : (c.notifyRoles ?? []).filter(r => r !== role),
    }));

  const getModuleName = (id: string) => modules.find(m => m.id === id)?.name ?? id;

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">

      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/data-quality">
          <button className="text-gray-400 hover:text-gray-600 transition-colors">
            <ChevronLeft className="w-5 h-5" />
          </button>
        </Link>
        <div className="w-9 h-9 rounded-xl bg-blue-100 flex items-center justify-center shrink-0">
          <ShieldCheck className="w-5 h-5 text-blue-600" />
        </div>
        <div>
          <h1 className="text-base font-semibold text-gray-900">Data Quality Configuration</h1>
          <p className="text-xs text-gray-400">Configure validation, scan scope, rules, and notifications.</p>
        </div>
      </div>

      {/* Status message */}
      {msg && (
        <div className={cn(
          "flex items-center gap-2 p-3 rounded-lg border text-sm",
          msg.type === "success"
            ? "bg-green-50 border-green-200 text-green-700"
            : "bg-red-50 border-red-200 text-red-700"
        )}>
          {msg.type === "success"
            ? <CheckCircle2 className="w-4 h-4 shrink-0" />
            : <AlertCircle className="w-4 h-4 shrink-0" />}
          {msg.text}
        </div>
      )}

      {/* Auto Mode */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-1">
        <p className="text-sm font-semibold text-gray-800 mb-3">Automatic Validation</p>
        <Toggle
          checked={config.autoMode}
          onChange={v => setConfig(c => ({ ...c, autoMode: v }))}
          label="Enable Auto-Validation"
          description="Runs lightweight checks (duplicates, required fields, format validation) when your frontend calls the /data-quality/check endpoint before saving a record."
        />
        {config.autoMode && (
          <div className="mt-2 px-3 py-2 bg-blue-50 rounded-lg border border-blue-100 flex items-start gap-2 text-xs text-blue-700">
            <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" />
            Auto-validation requires the frontend form to call <code className="font-mono bg-blue-100 px-1 rounded">POST /api/v1/data-quality/check</code> before submitting.
          </div>
        )}
      </div>

      {/* Scheduled Scans */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
        <p className="text-sm font-semibold text-gray-800">Scheduled Scans</p>

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-gray-500">Scan Frequency</label>
          <select
            value={config.schedule}
            onChange={e => setConfig(c => ({ ...c, schedule: e.target.value as Config["schedule"] }))}
            className="w-full h-9 px-3 text-sm rounded-lg border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
          >
            <option value="DISABLED">Disabled (manual only)</option>
            <option value="DAILY">Daily</option>
            <option value="WEEKLY">Weekly (Sunday)</option>
            <option value="MONTHLY">Monthly (1st of month)</option>
          </select>
        </div>

        {config.schedule !== "DISABLED" && (
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-500">Run Hour (0–23, server time)</label>
            <input
              type="number"
              min={0} max={23}
              value={config.scheduledHour}
              onChange={e => setConfig(c => ({ ...c, scheduledHour: parseInt(e.target.value, 10) || 2 }))}
              className="w-24 h-9 px-3 text-sm rounded-lg border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
            />
          </div>
        )}
      </div>

      {/* Module Scope */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center shrink-0 mt-0.5">
            <Layers className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-gray-800">Scan Scope — Modules</p>
            <p className="text-xs text-gray-400 mt-0.5">
              Select which modules are included in scans. Leave all unchecked to scan every active module.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setConfig(c => ({ ...c, includedModules: modules.map(m => m.id) }))}
            className="text-xs text-blue-600 hover:text-blue-800 hover:underline transition-colors"
          >
            Select All
          </button>
          <span className="text-gray-200">|</span>
          <button
            onClick={() => setConfig(c => ({ ...c, includedModules: [] }))}
            className="text-xs text-gray-500 hover:text-gray-700 hover:underline transition-colors"
          >
            Clear
          </button>
          <span className="text-xs text-gray-400 ml-auto font-medium">
            {config.includedModules.length === 0
              ? "All modules"
              : `${config.includedModules.length} of ${modules.length} selected`}
          </span>
        </div>

        {modules.length === 0 ? (
          <p className="text-xs text-gray-400 text-center py-2">No modules found.</p>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {modules.map(m => {
              const included = config.includedModules.includes(m.id);
              return (
                <label
                  key={m.id}
                  className={cn(
                    "flex items-center gap-2.5 px-3 py-2.5 rounded-lg border cursor-pointer transition-all",
                    included
                      ? "border-indigo-300 bg-indigo-50/60 text-indigo-700"
                      : "border-gray-200 bg-white text-gray-700 hover:border-indigo-200 hover:bg-indigo-50/30"
                  )}
                >
                  <input
                    type="checkbox"
                    checked={included}
                    onChange={e => toggleIncludedModule(m.id, e.target.checked)}
                    className="w-3.5 h-3.5 rounded border-gray-300 text-indigo-500 focus:ring-indigo-400/30"
                  />
                  <span className="text-sm font-medium truncate">{m.name}</span>
                </label>
              );
            })}
          </div>
        )}

        {config.includedModules.length === 0 && (
          <div className="flex items-start gap-2 px-3 py-2.5 bg-amber-50 rounded-lg border border-amber-100 text-xs text-amber-700">
            <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" />
            All active modules will be scanned. Select specific modules to narrow the scope.
          </div>
        )}
      </div>

      {/* Duplicate Rules */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-gray-800">Duplicate Detection Rules</p>
            <p className="text-xs text-gray-400 mt-0.5">
              Defines which field combinations to check for duplicates during scans.
              Fields marked as Unique in Module Studio are automatically checked.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => setShowAddRule(true)}
            className="h-8 px-3 text-xs gap-1 shrink-0">
            <Plus className="w-3 h-3" /> Add Rule
          </Button>
        </div>

        {showAddRule && (
          <AddRuleForm
            modules={modules}
            onAdd={addRule}
            onCancel={() => setShowAddRule(false)}
          />
        )}

        {config.duplicateRules.length === 0 ? (
          <p className="text-xs text-gray-400 py-2 text-center">
            No custom rules. Fields marked as Unique in Module Studio are checked automatically.
          </p>
        ) : (
          <div className="space-y-2">
            {config.duplicateRules.map(rule => (
              <div key={rule.id}
                className="flex items-center justify-between px-3 py-2.5 bg-gray-50 rounded-lg border border-gray-100">
                <div>
                  <p className="text-xs font-medium text-gray-700">{rule.label}</p>
                  <p className="text-[11px] text-gray-400">
                    {getModuleName(rule.moduleId)} · {rule.fields.join(", ")}
                  </p>
                </div>
                <button
                  onClick={() => removeRule(rule.id)}
                  className="text-gray-300 hover:text-red-400 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Missing Data Rules */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-gray-800">Missing Data Rules</p>
            <p className="text-xs text-gray-400 mt-0.5">
              Define which fields to monitor per module. Modules without a rule fall back to
              checking all required fields.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => setShowAddMissingRule(true)}
            className="h-8 px-3 text-xs gap-1 shrink-0 border-green-200 text-green-700 hover:bg-green-50">
            <Plus className="w-3 h-3" /> Add Rule
          </Button>
        </div>

        {showAddMissingRule && (
          <AddMissingRuleForm
            modules={modules}
            onAdd={addMissingRule}
            onCancel={() => setShowAddMissingRule(false)}
          />
        )}

        {(config.missingDataRules ?? []).length === 0 ? (
          <p className="text-xs text-gray-400 py-2 text-center">
            No custom rules. All required fields are monitored by default.
          </p>
        ) : (
          <div className="space-y-2">
            {(config.missingDataRules ?? []).map(rule => (
              <div key={rule.id}
                className="flex items-center justify-between px-3 py-2.5 bg-green-50/60 rounded-lg border border-green-100">
                <div>
                  <p className="text-xs font-medium text-gray-700">{rule.label}</p>
                  <p className="text-[11px] text-gray-400">
                    {getModuleName(rule.moduleId)} · monitoring {rule.fields.length} field{rule.fields.length !== 1 ? "s" : ""}
                  </p>
                </div>
                <button
                  onClick={() => removeMissingRule(rule.id)}
                  className="text-gray-300 hover:text-red-400 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Notifications */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
        <div>
          <p className="text-sm font-semibold text-gray-800">Notifications</p>
          <p className="text-xs text-gray-400 mt-0.5">
            Notify selected roles after each scan when issues are found.
          </p>
        </div>

        {/* Issue type toggles */}
        <div className="divide-y divide-gray-50">
          <Toggle
            checked={config.notifyDuplicate}
            onChange={v => setConfig(c => ({ ...c, notifyDuplicate: v }))}
            label="Notify on Duplicate Records"
            description="Send a notification when duplicate records are detected."
          />
          <Toggle
            checked={config.notifyMissing}
            onChange={v => setConfig(c => ({ ...c, notifyMissing: v }))}
            label="Notify on Missing Required Data"
            description="Send a notification when records have missing mandatory fields."
          />
          <Toggle
            checked={config.notifyInvalid}
            onChange={v => setConfig(c => ({ ...c, notifyInvalid: v }))}
            label="Notify on Invalid Formats"
            description="Send a notification for invalid emails, phones, dates, and URLs."
          />
        </div>

        {/* Notification roles */}
        <div className="pt-3 border-t border-gray-100">
          <p className="text-xs font-semibold text-gray-600 mb-1">Notify Roles</p>
          <p className="text-xs text-gray-400 mb-3">
            Users with these roles will receive scan notification messages.
          </p>
          <div className="flex flex-wrap gap-2">
            {NOTIFY_ROLE_OPTIONS.map(opt => {
              const active = (config.notifyRoles ?? []).includes(opt.value);
              return (
                <label
                  key={opt.value}
                  className={cn(
                    "flex items-center gap-2 px-3 py-1.5 rounded-lg border cursor-pointer transition-all select-none",
                    active
                      ? "border-blue-300 bg-blue-50 text-blue-700"
                      : "border-gray-200 bg-white text-gray-600 hover:border-blue-200 hover:bg-blue-50/40"
                  )}
                >
                  <input
                    type="checkbox"
                    checked={active}
                    onChange={e => toggleNotifyRole(opt.value, e.target.checked)}
                    className="w-3.5 h-3.5 rounded border-gray-300 text-blue-500 focus:ring-blue-400/30"
                  />
                  <span className="text-xs font-medium">{opt.label}</span>
                </label>
              );
            })}
          </div>
          {(config.notifyRoles ?? []).length === 0 && (
            <p className="text-xs text-amber-600 mt-2 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              No roles selected — no notifications will be sent.
            </p>
          )}
        </div>
      </div>

      {/* Save */}
      <div className="flex justify-end pb-6">
        <Button onClick={save} disabled={saving}
          className="h-9 px-6 text-sm gap-2 bg-blue-600 hover:bg-blue-700 text-white">
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
          Save Configuration
        </Button>
      </div>
    </div>
  );
}
