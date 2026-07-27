"use client";
import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { ModuleIcon } from "@/components/ui/module-icon";
import {
  Loader2, ArrowLeft, Plus, Trash2, Save, CheckCircle,
  GripVertical, Eye, EyeOff, Pencil, Lock,
} from "lucide-react";

// ── Types ────────────────────────────────────────────────────────────────────

interface CrmField { id: string; name: string; label: string; type: string }
interface MappingRow {
  id: string; // local key
  crmFieldName: string;
  portalFieldName: string;
  displayLabel: string;
  isIdentity: boolean;
  isEditable: boolean;
  isVisible: boolean;
}

const PORTAL_TYPES = [
  { value: "standard", label: "Standard Portal" },
  { value: "academic", label: "Academic (Students)" },
  { value: "medical",  label: "Medical / Healthcare" },
  { value: "hr",       label: "HR / Employees" },
  { value: "crm",      label: "CRM / Clients" },
  { value: "vendor",   label: "Vendors" },
  { value: "member",   label: "Members" },
];

const PORTAL_FIELD_OPTIONS = [
  { value: "firstName",  label: "→ Portal First Name",  identity: true },
  { value: "lastName",   label: "→ Portal Last Name",   identity: true },
  { value: "email",      label: "→ Portal Email (Login)", identity: true },
  { value: "phone",      label: "→ Portal Phone",       identity: true },
  { value: "display",    label: "Display only",         identity: false },
];

function uid() { return Math.random().toString(36).slice(2); }

// ── Component ────────────────────────────────────────────────────────────────

export default function ModulePortalConfigPage() {
  const { moduleId } = useParams() as { moduleId: string };
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [module, setModule] = useState<any>(null);
  const [config, setConfig] = useState<any>(null);
  const [crmFields, setCrmFields] = useState<CrmField[]>([]);
  const [mappings, setMappings] = useState<MappingRow[]>([]);

  // Basic settings
  const [portalLabel, setPortalLabel] = useState("");
  const [portalType, setPortalType] = useState("standard");
  const [isEnabled, setIsEnabled] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/portal/admin/module-configs/${moduleId}`);
      setModule(data.module);
      setCrmFields(data.module?.fields ?? []);
      setConfig(data.config);
      if (data.config) {
        setPortalLabel(data.config.portalLabel ?? "");
        setPortalType(data.config.portalType ?? "standard");
        setIsEnabled(data.config.isEnabled ?? true);
        setMappings((data.config.fieldMappings ?? []).map((m: any) => ({ ...m, id: m.id ?? uid() })));
      } else {
        setPortalLabel(`${data.module?.name ?? ""} Portal`);
      }
    } catch {}
    setLoading(false);
  }, [moduleId]);

  useEffect(() => { load(); }, [load]);

  const addRow = () => {
    setMappings(prev => [...prev, {
      id: uid(),
      crmFieldName: crmFields[0]?.name ?? "",
      portalFieldName: "display",
      displayLabel: "",
      isIdentity: false,
      isEditable: false,
      isVisible: true,
    }]);
  };

  const removeRow = (id: string) => setMappings(prev => prev.filter(r => r.id !== id));

  const updateRow = (id: string, patch: Partial<MappingRow>) => {
    setMappings(prev => prev.map(r => {
      if (r.id !== id) return r;
      const updated = { ...r, ...patch };
      // Auto-set isIdentity based on portalFieldName
      const opt = PORTAL_FIELD_OPTIONS.find(o => o.value === updated.portalFieldName);
      updated.isIdentity = opt?.identity ?? false;
      // Auto-fill displayLabel from CRM field label if empty
      if (patch.crmFieldName && !r.displayLabel) {
        const field = crmFields.find(f => f.name === patch.crmFieldName);
        if (field) updated.displayLabel = field.label;
      }
      return updated;
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    try {
      // Save basic config
      await api.patch(`/portal/admin/module-configs/${moduleId}`, {
        portalLabel, portalType, isEnabled,
      });
      // Save field mappings
      await api.put(`/portal/admin/module-configs/${moduleId}/mappings`, {
        mappings: mappings.map((m, i) => ({
          crmFieldName: m.crmFieldName,
          portalFieldName: m.portalFieldName,
          displayLabel: m.displayLabel,
          isIdentity: m.isIdentity,
          isEditable: m.isEditable,
          isVisible: m.isVisible,
          order: i,
        })),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {}
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
      </div>
    );
  }

  const identityMappings = mappings.filter(m => m.isIdentity);
  const hasEmail = identityMappings.some(m => m.portalFieldName === "email");
  const hasName = identityMappings.some(m => ["firstName", "lastName"].includes(m.portalFieldName));
  const configValid = hasEmail && hasName;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => router.push("/settings/portal")} className="p-1.5 rounded-lg hover:bg-gray-100">
          <ArrowLeft className="w-4 h-4 text-gray-500" />
        </button>
        <div>
          <div className="flex items-center gap-2">
            <ModuleIcon icon={module?.icon} slug={module?.slug} className="w-5 h-5" />
            <h1 className="text-xl font-bold text-gray-900">{module?.name} — Portal Config</h1>
          </div>
          <p className="text-sm text-gray-500 mt-0.5 ml-7">Configure portal access and field mappings</p>
        </div>
      </div>

      {/* Validation banner */}
      {!configValid && mappings.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-800 flex items-start gap-2">
          <span className="font-semibold shrink-0">⚠</span>
          <span>
            Map at least one field to <strong>Portal Email (Login)</strong> and one to <strong>First Name</strong> or <strong>Last Name</strong> to enable portal user creation.
          </span>
        </div>
      )}

      {/* Basic settings */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-4">
        <h2 className="text-sm font-semibold text-gray-800">Basic Settings</h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-600">Portal Label</label>
            <input
              type="text"
              value={portalLabel}
              onChange={e => setPortalLabel(e.target.value)}
              placeholder={`${module?.name} Portal`}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-600">Portal Type</label>
            <select
              value={portalType}
              onChange={e => setPortalType(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {PORTAL_TYPES.map(t => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="flex items-center gap-3 pt-1">
          <button
            onClick={() => setIsEnabled(e => !e)}
            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
              isEnabled ? "bg-indigo-600" : "bg-gray-200"
            }`}
          >
            <span className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform ${
              isEnabled ? "translate-x-4.5" : "translate-x-0.5"
            }`} />
          </button>
          <span className="text-sm text-gray-700">
            Portal access <strong>{isEnabled ? "enabled" : "disabled"}</strong> for this module
          </span>
        </div>
      </div>

      {/* Field mappings */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-50">
          <div>
            <h2 className="text-sm font-semibold text-gray-800">Field Mappings</h2>
            <p className="text-xs text-gray-400 mt-0.5">Map CRM fields to portal identity and display fields</p>
          </div>
          <button
            onClick={addRow}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors"
          >
            <Plus className="w-3.5 h-3.5" /> Add Field
          </button>
        </div>

        {mappings.length === 0 ? (
          <div className="text-center py-10 text-sm text-gray-400">
            <p className="mb-3">No field mappings yet.</p>
            <button onClick={addRow} className="text-indigo-600 hover:underline font-medium">Add your first mapping</button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 w-8"></th>
                  <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500">CRM Field</th>
                  <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500">Maps To</th>
                  <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500">Display Label</th>
                  <th className="px-3 py-2.5 text-center text-xs font-semibold text-gray-500 w-16" title="Visible in portal">
                    <Eye className="w-3.5 h-3.5 mx-auto" />
                  </th>
                  <th className="px-3 py-2.5 text-center text-xs font-semibold text-gray-500 w-16" title="User can edit">
                    <Pencil className="w-3.5 h-3.5 mx-auto" />
                  </th>
                  <th className="px-3 py-2.5 w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {mappings.map((row) => {
                  const isIdentityRow = PORTAL_FIELD_OPTIONS.find(o => o.value === row.portalFieldName)?.identity;
                  return (
                    <tr key={row.id} className="hover:bg-gray-50/50">
                      <td className="px-3 py-2.5 text-gray-300">
                        <GripVertical className="w-4 h-4 cursor-grab" />
                      </td>
                      <td className="px-3 py-2.5">
                        <select
                          value={row.crmFieldName}
                          onChange={e => updateRow(row.id, { crmFieldName: e.target.value })}
                          className="w-full px-2 py-1.5 border border-gray-200 rounded-md text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        >
                          {crmFields.map(f => (
                            <option key={f.id} value={f.name}>{f.label} ({f.type.toLowerCase()})</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-3 py-2.5">
                        <select
                          value={row.portalFieldName}
                          onChange={e => updateRow(row.id, { portalFieldName: e.target.value })}
                          className="w-full px-2 py-1.5 border border-gray-200 rounded-md text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        >
                          {PORTAL_FIELD_OPTIONS.map(o => (
                            <option key={o.value} value={o.value}>{o.label}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-3 py-2.5">
                        <input
                          type="text"
                          value={row.displayLabel}
                          onChange={e => updateRow(row.id, { displayLabel: e.target.value })}
                          placeholder="Label shown in portal"
                          className="w-full px-2 py-1.5 border border-gray-200 rounded-md text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        {isIdentityRow ? (
                          <Lock className="w-3.5 h-3.5 text-gray-300 mx-auto" aria-label="Identity fields are always visible" />
                        ) : (
                          <button onClick={() => updateRow(row.id, { isVisible: !row.isVisible })}>
                            {row.isVisible
                              ? <Eye className="w-4 h-4 text-indigo-500 mx-auto" />
                              : <EyeOff className="w-4 h-4 text-gray-300 mx-auto" />}
                          </button>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        {isIdentityRow ? (
                          <Lock className="w-3.5 h-3.5 text-gray-300 mx-auto" aria-label="Identity fields are not editable" />
                        ) : (
                          <button onClick={() => updateRow(row.id, { isEditable: !row.isEditable })}>
                            {row.isEditable
                              ? <Pencil className="w-4 h-4 text-indigo-500 mx-auto" />
                              : <Pencil className="w-4 h-4 text-gray-300 mx-auto" />}
                          </button>
                        )}
                      </td>
                      <td className="px-3 py-2.5">
                        <button
                          onClick={() => removeRow(row.id)}
                          className="p-1 rounded text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Identity field status */}
        {mappings.length > 0 && (
          <div className="px-5 py-3 border-t border-gray-50 flex items-center gap-4 bg-gray-50/50">
            <span className="text-xs text-gray-500 font-medium">Identity fields:</span>
            {["email", "firstName", "lastName"].map(key => {
              const mapped = mappings.some(m => m.portalFieldName === key);
              const label = key === "email" ? "Email" : key === "firstName" ? "First Name" : "Last Name";
              return (
                <span key={key} className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${
                  mapped ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-400"
                }`}>
                  {mapped ? "✓" : "○"} {label}
                </span>
              );
            })}
          </div>
        )}
      </div>

      {/* Save */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => router.push("/settings/portal")}
          className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
        >
          ← Back to Portal Settings
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-medium rounded-lg text-sm transition-colors"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? <CheckCircle className="w-4 h-4" /> : <Save className="w-4 h-4" />}
          {saved ? "Saved!" : "Save Configuration"}
        </button>
      </div>
    </div>
  );
}
