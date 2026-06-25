"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { portalApi } from "@/lib/portal-api";
import {
  Loader2, Plus, Trash2, Edit2, ChevronUp, ChevronDown, Save, X, Eye, EyeOff,
  Link2,
} from "lucide-react";

const FIELD_TYPES = [
  { value: "text",        label: "Text" },
  { value: "textarea",    label: "Textarea" },
  { value: "number",      label: "Number" },
  { value: "boolean",     label: "Boolean (Yes/No)" },
  { value: "date",        label: "Date" },
  { value: "datetime",    label: "Date & Time" },
  { value: "dropdown",    label: "Dropdown" },
  { value: "multiselect", label: "Multi-select" },
  { value: "upload",      label: "File Upload" },
  { value: "formula",     label: "Formula" },
  { value: "global-list", label: "Global List" },
  { value: "table",       label: "Table / Subform" },
];

interface PortalField {
  id: string; label: string; fieldKey: string; fieldType: string;
  placeholder?: string; defaultValue?: string; helpText?: string;
  options: any[]; isRequired: boolean; isVisible: boolean; isEditable: boolean;
  isReadOnly: boolean; isAdminOnly: boolean; mappedCrmFieldName?: string;
  sectionId?: string; order: number; status: string;
}

function FieldRow({ field, onEdit, onDelete, onMoveUp, onMoveDown, isFirst, isLast }: {
  field: PortalField; onEdit: () => void; onDelete: () => void;
  onMoveUp: () => void; onMoveDown: () => void; isFirst: boolean; isLast: boolean;
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 hover:bg-gray-50 transition-colors">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-medium text-gray-900 truncate">{field.label}</p>
          <span className="text-xs text-gray-400 font-mono">{field.fieldKey}</span>
          {field.mappedCrmFieldName && (
            <span className="flex items-center gap-0.5 text-xs text-violet-600 bg-violet-50 px-1.5 py-0.5 rounded border border-violet-100">
              <Link2 className="w-3 h-3" />{field.mappedCrmFieldName}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          <span className="text-xs text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">{field.fieldType}</span>
          {field.isRequired && <span className="text-xs text-red-500 font-medium">required</span>}
          {field.isReadOnly && <span className="text-xs text-amber-600 font-medium">read-only</span>}
          {field.isAdminOnly && <span className="text-xs text-blue-600 font-medium">admin-only</span>}
        </div>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <button onClick={onMoveUp} disabled={isFirst} className="p-1 text-gray-400 hover:text-gray-700 disabled:opacity-30"><ChevronUp className="w-3.5 h-3.5" /></button>
        <button onClick={onMoveDown} disabled={isLast} className="p-1 text-gray-400 hover:text-gray-700 disabled:opacity-30"><ChevronDown className="w-3.5 h-3.5" /></button>
        <button className={`p-1.5 rounded ${field.isVisible ? "text-green-500" : "text-gray-400"}`}>
          {field.isVisible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
        </button>
        <button onClick={onEdit} className="p-1.5 text-gray-400 hover:text-violet-600 hover:bg-violet-50 rounded transition-colors"><Edit2 className="w-3.5 h-3.5" /></button>
        <button onClick={onDelete} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
      </div>
    </div>
  );
}

function FieldForm({ initial, moduleId, onSave, onClose }: {
  initial?: Partial<PortalField>; moduleId: string;
  onSave: (dto: any) => Promise<void>; onClose: () => void;
}) {
  const [form, setForm] = useState({
    label: initial?.label ?? "",
    fieldKey: initial?.fieldKey ?? "",
    fieldType: initial?.fieldType ?? "text",
    placeholder: initial?.placeholder ?? "",
    defaultValue: initial?.defaultValue ?? "",
    helpText: initial?.helpText ?? "",
    isRequired: initial?.isRequired ?? false,
    isVisible: initial?.isVisible ?? true,
    isEditable: initial?.isEditable ?? true,
    isReadOnly: initial?.isReadOnly ?? false,
    isAdminOnly: initial?.isAdminOnly ?? false,
    mappedCrmFieldName: initial?.mappedCrmFieldName ?? "",
    options: initial?.options ?? [],
  });
  const [saving, setSaving] = useState(false);
  const [optionInput, setOptionInput] = useState("");

  const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");

  const submit = async () => {
    if (!form.label.trim()) return;
    setSaving(true);
    const payload = {
      ...form,
      fieldKey: form.fieldKey || slugify(form.label),
      mappedCrmFieldName: form.mappedCrmFieldName || null,
      ...(moduleId !== "global" ? { portalModuleConfigId: moduleId } : {}),
    };
    await onSave(payload);
    setSaving(false);
  };

  const addOption = () => {
    if (!optionInput.trim()) return;
    setForm(f => ({ ...f, options: [...f.options, { label: optionInput.trim(), value: slugify(optionInput.trim()) }] }));
    setOptionInput("");
  };

  const inputCls = "w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-violet-500";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white border border-gray-200 rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <p className="font-semibold text-gray-900">{initial?.id ? "Edit Field" : "New Field"}</p>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"><X className="w-4 h-4" /></button>
        </div>
        <div className="px-6 py-4 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Label *</label>
              <input className={inputCls} value={form.label} onChange={e => { setForm(f => ({ ...f, label: e.target.value })); if (!form.fieldKey) setForm(f => ({ ...f, fieldKey: slugify(e.target.value) })); }} placeholder="Field label" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Field Key</label>
              <input className={`${inputCls} font-mono`} value={form.fieldKey} onChange={e => setForm(f => ({ ...f, fieldKey: slugify(e.target.value) }))} placeholder="auto_generated" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Field Type</label>
            <select className={inputCls} value={form.fieldType} onChange={e => setForm(f => ({ ...f, fieldType: e.target.value }))}>
              {FIELD_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>

          {(form.fieldType === "dropdown" || form.fieldType === "multiselect") && (
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Options</label>
              <div className="space-y-1 mb-2">
                {form.options.map((o, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs text-gray-700 bg-gray-50 border border-gray-100 px-2 py-1.5 rounded-lg">
                    <span className="flex-1">{o.label}</span>
                    <button onClick={() => setForm(f => ({ ...f, options: f.options.filter((_, j) => j !== i) }))} className="text-gray-400 hover:text-red-500 transition-colors"><X className="w-3 h-3" /></button>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <input className={`${inputCls} flex-1`} value={optionInput} onChange={e => setOptionInput(e.target.value)} onKeyDown={e => e.key === "Enter" && addOption()} placeholder="Option label" />
                <button onClick={addOption} className="px-3 py-1.5 bg-violet-600 text-white rounded-lg text-sm hover:bg-violet-700 transition-colors font-medium">+</button>
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Map to CRM Field (optional)</label>
            <input className={`${inputCls} font-mono`} value={form.mappedCrmFieldName} onChange={e => setForm(f => ({ ...f, mappedCrmFieldName: e.target.value }))} placeholder="crm_field_name (for two-way sync)" />
            <p className="text-xs text-gray-400 mt-1">Updates to this field will sync to/from the CRM record.</p>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Placeholder</label>
            <input className={inputCls} value={form.placeholder} onChange={e => setForm(f => ({ ...f, placeholder: e.target.value }))} />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Help Text</label>
            <input className={inputCls} value={form.helpText} onChange={e => setForm(f => ({ ...f, helpText: e.target.value }))} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            {[
              { key: "isRequired", label: "Required" },
              { key: "isVisible",  label: "Visible to users" },
              { key: "isEditable", label: "User-editable" },
              { key: "isReadOnly", label: "Read-only" },
              { key: "isAdminOnly", label: "Admin-only" },
            ].map(({ key, label }) => (
              <label key={key} className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                <input type="checkbox" checked={(form as any)[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.checked }))} className="rounded accent-violet-500" />
                {label}
              </label>
            ))}
          </div>
        </div>
        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors">Cancel</button>
          <button onClick={submit} disabled={saving || !form.label.trim()} className="flex items-center gap-1.5 px-4 py-2 bg-violet-600 text-white rounded-lg text-sm font-medium hover:bg-violet-700 disabled:opacity-50 transition-colors">
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            {initial?.id ? "Update" : "Create Field"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function FieldBuilderPage() {
  const { moduleId } = useParams<{ moduleId: string }>();
  const [fields, setFields] = useState<PortalField[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editField, setEditField] = useState<PortalField | null>(null);

  const load = () => {
    const qs = moduleId !== "global" ? `?moduleConfigId=${moduleId}` : "";
    portalApi.get(`/portal/padmin/fields${qs}`)
      .then(r => setFields(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [moduleId]);

  const handleSave = async (dto: any) => {
    if (editField) {
      const { data } = await portalApi.patch(`/portal/padmin/fields/${editField.id}`, dto);
      setFields(prev => prev.map(f => f.id === editField.id ? data : f));
    } else {
      const { data } = await portalApi.post("/portal/padmin/fields", dto);
      setFields(prev => [...prev, data]);
    }
    setShowForm(false);
    setEditField(null);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this field?")) return;
    await portalApi.delete(`/portal/padmin/fields/${id}`);
    setFields(prev => prev.filter(f => f.id !== id));
  };

  const moveField = async (idx: number, dir: -1 | 1) => {
    const newFields = [...fields];
    const target = idx + dir;
    if (target < 0 || target >= newFields.length) return;
    [newFields[idx], newFields[target]] = [newFields[target], newFields[idx]];
    setFields(newFields);
    await portalApi.post("/portal/padmin/fields/reorder", { ids: newFields.map(f => f.id) });
  };

  return (
    <div className="space-y-5 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">
            {moduleId === "global" ? "Global" : "Module"} Fields
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">Create custom fields with optional CRM mapping for two-way sync.</p>
        </div>
        <button
          onClick={() => { setEditField(null); setShowForm(true); }}
          className="flex items-center gap-1.5 px-3 py-2 bg-violet-600 text-white rounded-lg text-sm font-medium hover:bg-violet-700 transition-colors"
        >
          <Plus className="w-4 h-4" />New Field
        </button>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center h-40"><Loader2 className="w-5 h-5 animate-spin text-violet-500" /></div>
        ) : fields.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <p className="text-sm">No fields yet. Create your first portal field.</p>
          </div>
        ) : (
          fields.map((field, idx) => (
            <FieldRow
              key={field.id}
              field={field}
              onEdit={() => { setEditField(field); setShowForm(true); }}
              onDelete={() => handleDelete(field.id)}
              onMoveUp={() => moveField(idx, -1)}
              onMoveDown={() => moveField(idx, 1)}
              isFirst={idx === 0}
              isLast={idx === fields.length - 1}
            />
          ))
        )}
      </div>

      {(showForm || editField) && (
        <FieldForm
          initial={editField ?? undefined}
          moduleId={moduleId}
          onSave={handleSave}
          onClose={() => { setShowForm(false); setEditField(null); }}
        />
      )}
    </div>
  );
}
