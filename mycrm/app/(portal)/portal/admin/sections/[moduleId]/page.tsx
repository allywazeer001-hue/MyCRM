"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { portalApi } from "@/lib/portal-api";
import { Loader2, Plus, Trash2, Edit2, ChevronUp, ChevronDown, Save, X, Eye, EyeOff } from "lucide-react";

const SECTION_TYPES = [
  { value: "section",  label: "Section" },
  { value: "tab",      label: "Tab" },
  { value: "group",    label: "Collapsible Group" },
  { value: "card",     label: "Card" },
];

interface Section {
  id: string; label: string; type: string; icon?: string;
  order: number; isCollapsible: boolean; isVisible: boolean;
  isAdminOnly: boolean; status: string;
  fields: { id: string; label: string; fieldKey: string }[];
}

export default function SectionBuilderPage() {
  const { moduleId } = useParams<{ moduleId: string }>();
  const [sections, setSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editSection, setEditSection] = useState<Section | null>(null);
  const [form, setForm] = useState({ label: "", type: "section", icon: "", isCollapsible: false, isVisible: true, isAdminOnly: false });
  const [saving, setSaving] = useState(false);

  const load = () => {
    const qs = moduleId !== "global" ? `?moduleConfigId=${moduleId}` : "";
    portalApi.get(`/portal/padmin/sections${qs}`)
      .then(r => setSections(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [moduleId]);

  const openNew = () => {
    setEditSection(null);
    setForm({ label: "", type: "section", icon: "", isCollapsible: false, isVisible: true, isAdminOnly: false });
    setShowForm(true);
  };

  const openEdit = (s: Section) => {
    setEditSection(s);
    setForm({ label: s.label, type: s.type, icon: s.icon ?? "", isCollapsible: s.isCollapsible, isVisible: s.isVisible, isAdminOnly: s.isAdminOnly });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.label.trim()) return;
    setSaving(true);
    try {
      const dto = { ...form, icon: form.icon || null, ...(moduleId !== "global" ? { portalModuleConfigId: moduleId } : {}) };
      if (editSection) {
        const { data } = await portalApi.patch(`/portal/padmin/sections/${editSection.id}`, dto);
        setSections(prev => prev.map(s => s.id === editSection.id ? { ...data, fields: editSection.fields } : s));
      } else {
        const { data } = await portalApi.post("/portal/padmin/sections", dto);
        setSections(prev => [...prev, { ...data, fields: [] }]);
      }
      setShowForm(false);
    } catch {}
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this section? Fields inside will be unlinked.")) return;
    await portalApi.delete(`/portal/padmin/sections/${id}`);
    setSections(prev => prev.filter(s => s.id !== id));
  };

  const move = async (idx: number, dir: -1 | 1) => {
    const arr = [...sections];
    const t = idx + dir;
    if (t < 0 || t >= arr.length) return;
    [arr[idx], arr[t]] = [arr[t], arr[idx]];
    setSections(arr);
    await portalApi.post("/portal/padmin/sections/reorder", { ids: arr.map(s => s.id) });
  };

  const toggleVisible = async (section: Section) => {
    const { data } = await portalApi.patch(`/portal/padmin/sections/${section.id}`, { isVisible: !section.isVisible });
    setSections(prev => prev.map(s => s.id === section.id ? { ...data, fields: section.fields } : s));
  };

  return (
    <div className="space-y-5 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Section Builder</h1>
          <p className="text-sm text-gray-400 mt-0.5">Organise portal fields into sections, tabs, groups, and cards.</p>
        </div>
        <button onClick={openNew} className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
          <Plus className="w-4 h-4" />New Section
        </button>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-40"><Loader2 className="w-5 h-5 animate-spin text-blue-400" /></div>
        ) : sections.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-600">
            <p className="text-sm">No sections yet. Create your first section to group portal fields.</p>
          </div>
        ) : (
          sections.map((section, idx) => (
            <div key={section.id} className={`px-4 py-3 border-b border-gray-800 hover:bg-gray-800/50 transition-colors ${!section.isVisible ? "opacity-50" : ""}`}>
              <div className="flex items-center gap-3">
                {section.icon && <span className="text-lg">{section.icon}</span>}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-white">{section.label}</p>
                    <span className="text-xs bg-blue-900/30 text-blue-400 px-1.5 py-0.5 rounded">{section.type}</span>
                    {section.isCollapsible && <span className="text-xs text-gray-500">collapsible</span>}
                    {section.isAdminOnly && <span className="text-xs text-amber-500">admin-only</span>}
                  </div>
                  {section.fields.length > 0 && (
                    <p className="text-xs text-gray-500 mt-0.5">{section.fields.length} field{section.fields.length !== 1 ? "s" : ""}: {section.fields.map(f => f.label).join(", ")}</p>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => move(idx, -1)} disabled={idx === 0} className="p-1 text-gray-600 hover:text-gray-300 disabled:opacity-30"><ChevronUp className="w-3.5 h-3.5" /></button>
                  <button onClick={() => move(idx, 1)} disabled={idx === sections.length - 1} className="p-1 text-gray-600 hover:text-gray-300 disabled:opacity-30"><ChevronDown className="w-3.5 h-3.5" /></button>
                  <button onClick={() => toggleVisible(section)} className={`p-1.5 rounded ${section.isVisible ? "text-green-500" : "text-gray-600"}`}>
                    {section.isVisible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                  </button>
                  <button onClick={() => openEdit(section)} className="p-1.5 text-gray-400 hover:text-blue-400 hover:bg-blue-900/20 rounded"><Edit2 className="w-3.5 h-3.5" /></button>
                  <button onClick={() => handleDelete(section.id)} className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-red-900/20 rounded"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
              <p className="font-semibold text-white">{editSection ? "Edit Section" : "New Section"}</p>
              <button onClick={() => setShowForm(false)} className="p-1.5 text-gray-500 hover:text-gray-300 rounded-lg hover:bg-gray-800"><X className="w-4 h-4" /></button>
            </div>
            <div className="px-6 py-4 space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-400 mb-1">Label *</label>
                  <input className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500" value={form.label} onChange={e => setForm(f => ({ ...f, label: e.target.value }))} placeholder="Section name" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">Icon (emoji)</label>
                  <input className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-center focus:outline-none focus:ring-2 focus:ring-blue-500" value={form.icon} onChange={e => setForm(f => ({ ...f, icon: e.target.value }))} placeholder="📋" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Type</label>
                <select className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
                  {SECTION_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                {[
                  { key: "isCollapsible", label: "Collapsible" },
                  { key: "isVisible", label: "Visible to users" },
                  { key: "isAdminOnly", label: "Admin-only" },
                ].map(({ key, label }) => (
                  <label key={key} className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
                    <input type="checkbox" checked={(form as any)[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.checked }))} className="rounded accent-blue-500" />
                    {label}
                  </label>
                ))}
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-800 flex justify-end gap-2">
              <button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-gray-400 hover:text-gray-200 hover:bg-gray-800 rounded-lg">Cancel</button>
              <button onClick={handleSave} disabled={saving || !form.label.trim()} className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                {editSection ? "Update" : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
