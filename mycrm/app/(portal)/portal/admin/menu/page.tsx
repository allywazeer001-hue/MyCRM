"use client";
import { useEffect, useState } from "react";
import { portalApi } from "@/lib/portal-api";
import {
  Loader2, Plus, Trash2, Pencil, GripVertical, ChevronDown, ChevronRight,
  Check, X, Menu, Eye, EyeOff, Link2, FileText,
} from "lucide-react";

interface MenuItem {
  id: string;
  label: string;
  icon?: string;
  type: string;
  target?: string;
  isVisible: boolean;
  order: number;
  parentId?: string;
  children?: MenuItem[];
}

const ICONS = ["Home", "LayoutDashboard", "User", "FileText", "Bell", "Settings", "Star", "Bookmark", "HelpCircle", "ChevronRight", "Newspaper", "Images"];
const TYPES = ["page", "link", "section", "divider", "publications", "gallery", "dashboard", "records", "notifications", "profile"];

// Built-in types resolve to fixed URLs — no target needed
const BUILTIN_TARGETS: Record<string, string> = {
  dashboard:     "/portal/dashboard",
  records:       "/portal/records",
  notifications: "/portal/notifications",
  profile:       "/portal/profile",
  publications:  "/portal/publications",
  gallery:       "/portal/gallery",
};

function ItemRow({
  item,
  depth,
  onEdit,
  onDelete,
  onToggleVisibility,
}: {
  item: MenuItem;
  depth: number;
  onEdit: (item: MenuItem) => void;
  onDelete: (id: string) => void;
  onToggleVisibility: (item: MenuItem) => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const hasChildren = (item.children?.length ?? 0) > 0;

  return (
    <>
      <div
        className={`flex items-center gap-3 px-4 py-3 border-b border-gray-100 hover:bg-gray-50 transition-colors`}
        style={{ paddingLeft: `${16 + depth * 24}px` }}
      >
        <GripVertical className="w-4 h-4 text-gray-600 shrink-0 cursor-grab" />
        {hasChildren ? (
          <button onClick={() => setExpanded(e => !e)} className="text-gray-400 hover:text-gray-700">
            {expanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
          </button>
        ) : (
          <span className="w-3.5" />
        )}
        <span className="text-xs px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 font-mono shrink-0">{item.type}</span>
        <span className="flex-1 text-sm text-gray-900 truncate">{item.label}</span>
        {item.target && (
          <span className="text-xs text-gray-600 truncate max-w-[160px] hidden sm:block">{item.target}</span>
        )}
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => onToggleVisibility(item)}
            className={`p-1.5 rounded-lg transition-colors ${item.isVisible ? "text-green-500 hover:text-green-600" : "text-gray-400 hover:text-gray-600"}`}
            title={item.isVisible ? "Visible" : "Hidden"}
          >
            {item.isVisible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={() => onEdit(item)}
            className="p-1.5 text-gray-400 hover:text-violet-600 hover:bg-violet-50 rounded-lg transition-colors"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onDelete(item.id)}
            className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
      {expanded && hasChildren &&
        item.children!.map(child => (
          <ItemRow
            key={child.id}
            item={child}
            depth={depth + 1}
            onEdit={onEdit}
            onDelete={onDelete}
            onToggleVisibility={onToggleVisibility}
          />
        ))}
    </>
  );
}

interface FormState {
  label: string;
  type: string;
  target: string;
  icon: string;
  isVisible: boolean;
  parentId: string;
  autoCreatePage: boolean;
}

const EMPTY_FORM: FormState = {
  label: "", type: "page", target: "", icon: "", isVisible: true, parentId: "", autoCreatePage: false,
};

export default function MenuBuilderPage() {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [error, setError] = useState("");

  const load = () => {
    setLoading(true);
    portalApi.get("/portal/padmin/menu")
      .then(r => setItems(r.data ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const flatItems = (tree: MenuItem[]): MenuItem[] =>
    tree.flatMap(i => [i, ...(i.children ?? [])]);

  const openAdd = () => { setForm(EMPTY_FORM); setEditingId(null); setError(""); setShowForm(true); };

  const openEdit = (item: MenuItem) => {
    setForm({
      label: item.label,
      type: item.type,
      target: item.target ?? "",
      icon: item.icon ?? "",
      isVisible: item.isVisible,
      parentId: item.parentId ?? "",
      autoCreatePage: false,
    });
    setEditingId(item.id);
    setError("");
    setShowForm(true);
  };

  const closeForm = () => { setShowForm(false); setEditingId(null); setForm(EMPTY_FORM); };

  const handleSave = async () => {
    if (!form.label.trim()) { setError("Label is required"); return; }
    setSaving(true);
    setError("");
    try {
      const isBuiltin = form.type in BUILTIN_TARGETS;
      const payload = {
        label: form.label.trim(),
        type: form.type,
        target: isBuiltin ? BUILTIN_TARGETS[form.type] : (form.target || undefined),
        icon: form.icon || form.type || undefined,
        isVisible: form.isVisible,
        parentId: form.parentId || undefined,
        autoCreatePage: form.autoCreatePage,
      };
      if (editingId) {
        await portalApi.patch(`/portal/padmin/menu/${editingId}`, payload);
      } else {
        await portalApi.post("/portal/padmin/menu", payload);
      }
      closeForm();
      load();
    } catch (e: any) {
      setError(e?.response?.data?.message ?? "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this menu item?")) return;
    try {
      await portalApi.delete(`/portal/padmin/menu/${id}`);
      load();
    } catch {}
  };

  const handleToggleVisibility = async (item: MenuItem) => {
    try {
      await portalApi.patch(`/portal/padmin/menu/${item.id}`, { isVisible: !item.isVisible });
      load();
    } catch {}
  };

  const allFlat = flatItems(items);
  const rootItems = items.filter(i => !i.parentId);

  return (
    <div className="space-y-5 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Menu className="w-5 h-5 text-violet-500" />
          <div>
            <h1 className="text-xl font-bold text-gray-900">Menu Builder</h1>
            <p className="text-sm text-gray-500 mt-0.5">Create and manage portal navigation menus.</p>
          </div>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Item
        </button>
      </div>

      {/* Form drawer */}
      {showForm && (
        <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-900">{editingId ? "Edit Menu Item" : "Add Menu Item"}</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-600 mb-1.5">Label *</label>
              <input
                value={form.label}
                onChange={e => setForm(f => ({ ...f, label: e.target.value }))}
                placeholder="e.g. My Documents"
                className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1.5">Type</label>
              <select
                value={form.type}
                onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
                className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
              >
                {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1.5">Target URL / Slug</label>
              <div className="relative">
                <Link2 className="absolute left-3 top-2.5 w-3.5 h-3.5 text-gray-400" />
                <input
                  value={form.type in BUILTIN_TARGETS ? BUILTIN_TARGETS[form.type] : form.target}
                  onChange={e => setForm(f => ({ ...f, target: e.target.value }))}
                  placeholder="/portal/pages/my-page"
                  className="w-full bg-white border border-gray-200 rounded-lg pl-8 pr-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-50"
                  disabled={form.autoCreatePage || form.type in BUILTIN_TARGETS}
                />
              </div>
              {form.type in BUILTIN_TARGETS && (
                <p className="text-[10px] text-gray-400 mt-1">Built-in page — target is auto-set</p>
              )}
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1.5">Icon name</label>
              <input
                value={form.icon}
                onChange={e => setForm(f => ({ ...f, icon: e.target.value }))}
                placeholder="e.g. FileText"
                className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
              />
            </div>
            {!editingId && (
              <div>
                <label className="block text-xs text-gray-600 mb-1.5">Parent item (optional)</label>
                <select
                  value={form.parentId}
                  onChange={e => setForm(f => ({ ...f, parentId: e.target.value }))}
                  className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
                >
                  <option value="">— Top-level —</option>
                  {rootItems.map(i => (
                    <option key={i.id} value={i.id}>{i.label}</option>
                  ))}
                </select>
              </div>
            )}
            <div className="flex flex-col justify-end gap-2">
              <label className="flex items-center gap-2.5 cursor-pointer">
                <div
                  onClick={() => setForm(f => ({ ...f, isVisible: !f.isVisible }))}
                  className={`w-9 h-5 rounded-full transition-colors cursor-pointer ${form.isVisible ? "bg-violet-600" : "bg-gray-300"} flex items-center px-0.5`}
                >
                  <div className={`w-4 h-4 rounded-full bg-white transition-transform ${form.isVisible ? "translate-x-4" : "translate-x-0"}`} />
                </div>
                <span className="text-xs text-gray-600">Visible</span>
              </label>
              {!editingId && form.type === "page" && (
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <div
                    onClick={() => setForm(f => ({ ...f, autoCreatePage: !f.autoCreatePage, target: f.autoCreatePage ? f.target : "" }))}
                    className={`w-9 h-5 rounded-full transition-colors cursor-pointer ${form.autoCreatePage ? "bg-emerald-600" : "bg-gray-300"} flex items-center px-0.5`}
                  >
                    <div className={`w-4 h-4 rounded-full bg-white transition-transform ${form.autoCreatePage ? "translate-x-4" : "translate-x-0"}`} />
                  </div>
                  <span className="text-xs text-gray-600">Auto-create page</span>
                </label>
              )}
            </div>
          </div>

          {error && <p className="text-xs text-red-600">{error}</p>}

          <div className="flex items-center gap-2 pt-1">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              {editingId ? "Update" : "Add"}
            </button>
            <button onClick={closeForm} className="flex items-center gap-1.5 px-4 py-2 text-gray-500 hover:text-gray-800 hover:bg-gray-100 text-sm rounded-lg transition-colors">
              <X className="w-4 h-4" />Cancel
            </button>
          </div>
        </div>
      )}

      {/* Menu tree */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <Loader2 className="w-5 h-5 animate-spin text-violet-400" />
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
            <Menu className="w-8 h-8 text-gray-300" />
            <p className="text-sm text-gray-500">No menu items yet.</p>
            <button onClick={openAdd} className="flex items-center gap-1.5 text-sm text-violet-600 hover:text-violet-700">
              <Plus className="w-4 h-4" />Add the first item
            </button>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2 px-4 py-2.5 border-b border-gray-100 bg-gray-50">
              <span className="text-xs text-gray-500 font-medium">{allFlat.length} item{allFlat.length !== 1 ? "s" : ""}</span>
            </div>
            {items.map(item => (
              <ItemRow
                key={item.id}
                item={item}
                depth={0}
                onEdit={openEdit}
                onDelete={handleDelete}
                onToggleVisibility={handleToggleVisibility}
              />
            ))}
          </>
        )}
      </div>
    </div>
  );
}
