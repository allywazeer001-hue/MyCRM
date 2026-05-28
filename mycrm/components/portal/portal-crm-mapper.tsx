"use client";
import { useState, useEffect } from "react";
import { portalApi } from "@/lib/portal-api";
import {
  Link2, Link2Off, Plus, ChevronDown, Loader2, CheckCircle2,
  AlertCircle, Database, Sparkles,
} from "lucide-react";

interface PortalField {
  id: string;
  label: string;
  fieldKey: string;
  fieldType: string;
  mappedCrmFieldName?: string | null;
  mappedCrmModuleSlug?: string | null;
}

interface CrmModule {
  id: string;
  name: string;
  slug: string;
}

interface CrmField {
  id: string;
  label: string;
  slug: string;
  fieldType: string;
}

interface Props {
  pageId: string;
}

const FIELD_TYPE_OPTIONS = [
  { value: "text", label: "Text" },
  { value: "number", label: "Number" },
  { value: "date", label: "Date" },
  { value: "boolean", label: "Yes / No" },
  { value: "select", label: "Select" },
  { value: "textarea", label: "Long Text" },
];

function MappingRow({ field, modules, onMapped, onUnmapped }: {
  field: PortalField;
  modules: CrmModule[];
  onMapped: (fieldId: string, crmFieldName: string, moduleSlug: string) => void;
  onUnmapped: (fieldId: string) => void;
}) {
  const [mode, setMode] = useState<"idle" | "map" | "create">("idle");
  const [selectedModule, setSelectedModule] = useState("");
  const [crmFields, setCrmFields] = useState<CrmField[]>([]);
  const [loadingFields, setLoadingFields] = useState(false);
  const [selectedField, setSelectedField] = useState("");
  const [newFieldLabel, setNewFieldLabel] = useState(field.label);
  const [newFieldType, setNewFieldType] = useState("text");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const isMapped = !!field.mappedCrmFieldName;

  const loadCrmFields = async (moduleId: string) => {
    setLoadingFields(true);
    try {
      const r = await portalApi.get(`/portal/padmin/crm-modules/${moduleId}/fields`);
      setCrmFields(r.data ?? []);
    } catch {
      setCrmFields([]);
    }
    setLoadingFields(false);
  };

  const handleModuleChange = (moduleId: string) => {
    setSelectedModule(moduleId);
    setSelectedField("");
    if (moduleId) loadCrmFields(moduleId);
    else setCrmFields([]);
  };

  const handleMap = async () => {
    if (!selectedModule || !selectedField) return;
    const mod = modules.find(m => m.id === selectedModule);
    if (!mod) return;
    setSaving(true);
    setError("");
    try {
      await portalApi.patch(`/portal/padmin/fields/${field.id}/map-crm`, {
        crmFieldName: selectedField,
        crmModuleSlug: mod.slug,
      });
      onMapped(field.id, selectedField, mod.slug);
      setMode("idle");
    } catch (e: any) {
      setError(e?.response?.data?.message ?? "Failed to map field");
    }
    setSaving(false);
  };

  const handleCreate = async () => {
    if (!selectedModule || !newFieldLabel.trim()) return;
    setSaving(true);
    setError("");
    try {
      await portalApi.post(`/portal/padmin/fields/${field.id}/create-crm-field`, {
        moduleId: selectedModule,
        fieldLabel: newFieldLabel.trim(),
        fieldType: newFieldType,
      });
      const mod = modules.find(m => m.id === selectedModule);
      onMapped(field.id, newFieldLabel.trim().toLowerCase().replace(/\s+/g, "_"), mod?.slug ?? "");
      setMode("idle");
    } catch (e: any) {
      setError(e?.response?.data?.message ?? "Failed to create CRM field");
    }
    setSaving(false);
  };

  const handleUnmap = async () => {
    setSaving(true);
    setError("");
    try {
      await portalApi.patch(`/portal/padmin/fields/${field.id}/unmap-crm`);
      onUnmapped(field.id);
    } catch (e: any) {
      setError(e?.response?.data?.message ?? "Failed to unmap field");
    }
    setSaving(false);
  };

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      {/* Field header row */}
      <div className="flex items-center gap-3 px-4 py-3 bg-gray-50">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 truncate">{field.label}</p>
          <p className="text-xs text-gray-400 font-mono">{field.fieldKey}</p>
        </div>
        {isMapped ? (
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 bg-green-50 text-green-700 border border-green-200 rounded-lg px-2.5 py-1 text-xs font-medium">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span className="font-mono">{field.mappedCrmModuleSlug}.{field.mappedCrmFieldName}</span>
            </div>
            <button
              onClick={handleUnmap}
              disabled={saving}
              className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
              title="Remove mapping"
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Link2Off className="w-3.5 h-3.5" />}
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-1">
            <span className="text-xs text-gray-400 mr-1">Unmapped</span>
            <button
              onClick={() => { setMode(mode === "map" ? "idle" : "map"); setError(""); }}
              className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium border border-gray-200 rounded-lg hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700 transition-colors"
            >
              <Link2 className="w-3.5 h-3.5" />
              Map
            </button>
            <button
              onClick={() => { setMode(mode === "create" ? "idle" : "create"); setError(""); }}
              className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium border border-gray-200 rounded-lg hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Create
            </button>
          </div>
        )}
      </div>

      {/* Map to existing field */}
      {mode === "map" && (
        <div className="px-4 py-3 border-t border-gray-100 space-y-3 bg-white">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Map to existing CRM field</p>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs text-gray-500 mb-1">CRM Module</label>
              <div className="relative">
                <select
                  value={selectedModule}
                  onChange={e => handleModuleChange(e.target.value)}
                  className="w-full px-3 py-2 pr-8 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 appearance-none bg-white"
                >
                  <option value="">Select module…</option>
                  {modules.map(m => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2 top-2.5 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
              </div>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">CRM Field</label>
              <div className="relative">
                {loadingFields ? (
                  <div className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg text-xs text-gray-400">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />Loading…
                  </div>
                ) : (
                  <>
                    <select
                      value={selectedField}
                      onChange={e => setSelectedField(e.target.value)}
                      disabled={!selectedModule}
                      className="w-full px-3 py-2 pr-8 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 appearance-none bg-white disabled:opacity-50"
                    >
                      <option value="">Select field…</option>
                      {crmFields.map(f => (
                        <option key={f.id} value={f.slug}>{f.label} ({f.fieldType})</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-2 top-2.5 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                  </>
                )}
              </div>
            </div>
          </div>
          {error && <p className="text-xs text-red-500 flex items-center gap-1"><AlertCircle className="w-3.5 h-3.5" />{error}</p>}
          <div className="flex gap-2">
            <button
              onClick={handleMap}
              disabled={saving || !selectedModule || !selectedField}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-medium rounded-lg transition-colors"
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Link2 className="w-3.5 h-3.5" />}
              Apply Mapping
            </button>
            <button onClick={() => setMode("idle")} className="px-3 py-1.5 text-gray-500 text-xs rounded-lg hover:bg-gray-100">Cancel</button>
          </div>
        </div>
      )}

      {/* Create new CRM field */}
      {mode === "create" && (
        <div className="px-4 py-3 border-t border-gray-100 space-y-3 bg-white">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Create new CRM field</p>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Module</label>
              <div className="relative">
                <select
                  value={selectedModule}
                  onChange={e => setSelectedModule(e.target.value)}
                  className="w-full px-3 py-2 pr-8 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 appearance-none bg-white"
                >
                  <option value="">Select…</option>
                  {modules.map(m => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2 top-2.5 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
              </div>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Field Label</label>
              <input
                value={newFieldLabel}
                onChange={e => setNewFieldLabel(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="e.g. GPA Score"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Type</label>
              <div className="relative">
                <select
                  value={newFieldType}
                  onChange={e => setNewFieldType(e.target.value)}
                  className="w-full px-3 py-2 pr-8 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 appearance-none bg-white"
                >
                  {FIELD_TYPE_OPTIONS.map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2 top-2.5 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
              </div>
            </div>
          </div>
          {error && <p className="text-xs text-red-500 flex items-center gap-1"><AlertCircle className="w-3.5 h-3.5" />{error}</p>}
          <div className="flex gap-2">
            <button
              onClick={handleCreate}
              disabled={saving || !selectedModule || !newFieldLabel.trim()}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-medium rounded-lg transition-colors"
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
              Create & Map
            </button>
            <button onClick={() => setMode("idle")} className="px-3 py-1.5 text-gray-500 text-xs rounded-lg hover:bg-gray-100">Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}

export function PortalCrmMapper({ pageId }: Props) {
  const [fields, setFields] = useState<PortalField[]>([]);
  const [modules, setModules] = useState<CrmModule[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [fieldsRes, modulesRes] = await Promise.all([
          portalApi.get(`/portal/padmin/fields?pageId=${pageId}`),
          portalApi.get("/portal/padmin/crm-modules"),
        ]);
        setFields(fieldsRes.data ?? []);
        setModules(modulesRes.data ?? []);
      } catch {}
      setLoading(false);
    };
    load();
  }, [pageId]);

  const handleMapped = (fieldId: string, crmFieldName: string, moduleSlug: string) => {
    setFields(prev => prev.map(f =>
      f.id === fieldId ? { ...f, mappedCrmFieldName: crmFieldName, mappedCrmModuleSlug: moduleSlug } : f
    ));
  };

  const handleUnmapped = (fieldId: string) => {
    setFields(prev => prev.map(f =>
      f.id === fieldId ? { ...f, mappedCrmFieldName: null, mappedCrmModuleSlug: null } : f
    ));
  };

  const mappableFields = fields.filter(f =>
    !["header", "label", "separator", "divider", "spacer"].includes(f.fieldType)
  );
  const mappedCount = mappableFields.filter(f => f.mappedCrmFieldName).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <Loader2 className="w-5 h-5 animate-spin text-indigo-500" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
            <Database className="w-4 h-4 text-indigo-500" />
            CRM Field Mapping
          </h3>
          <p className="text-xs text-gray-500 mt-0.5">
            Connect portal fields to CRM record data for two-way sync.
          </p>
        </div>
        <div className="text-right">
          <p className="text-xl font-bold text-indigo-600">{mappedCount}/{mappableFields.length}</p>
          <p className="text-xs text-gray-400">fields mapped</p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-indigo-500 rounded-full transition-all duration-500"
          style={{ width: mappableFields.length ? `${(mappedCount / mappableFields.length) * 100}%` : "0%" }}
        />
      </div>

      {/* Info box */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-xs text-blue-700 space-y-1">
        <p className="font-semibold">How CRM mapping works</p>
        <ul className="list-disc ml-4 space-y-0.5 text-blue-600">
          <li>Mapped fields read & write to the CRM record's data when a portal user submits</li>
          <li>Unmapped fields store values in the portal user's private custom data</li>
          <li>"Map" connects to an existing CRM field; "Create" auto-creates one and links it</li>
        </ul>
      </div>

      {mappableFields.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 text-center gap-2">
          <Database className="w-8 h-8 text-gray-200" />
          <p className="text-sm text-gray-400">No mappable fields on this page yet.</p>
          <p className="text-xs text-gray-400">Add input fields in the Builder tab first.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {mappableFields.map(field => (
            <MappingRow
              key={field.id}
              field={field}
              modules={modules}
              onMapped={handleMapped}
              onUnmapped={handleUnmapped}
            />
          ))}
        </div>
      )}
    </div>
  );
}
