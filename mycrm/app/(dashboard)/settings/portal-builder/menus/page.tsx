"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import {
  Loader2, Save, Plus, Trash2, ChevronUp, ChevronDown,
  GripVertical, ChevronRight, ChevronDown as Expand, Eye, EyeOff,
} from "lucide-react";

const ITEM_TYPES = [
  { value: "page",          label: "Portal Page" },
  { value: "dashboard",     label: "Dashboard (built-in)" },
  { value: "records",       label: "My Record (built-in)" },
  { value: "profile",       label: "Profile (built-in)" },
  { value: "notifications", label: "Notifications (built-in)" },
  { value: "external",      label: "External URL" },
  { value: "divider",       label: "Divider" },
];

const BUILT_IN_TARGETS: Record<string, string> = {
  dashboard:     "/portal/dashboard",
  records:       "/portal/records",
  profile:       "/portal/profile",
  notifications: "/portal/notifications",
};

interface MenuItem {
  id?: string;
  label: string;
  icon: string;
  type: string;
  target: string;
  order: number;
  isVisible: boolean;
  accessTypes: string[];
  children: ChildItem[];
  expanded?: boolean;
}

interface ChildItem {
  id?: string;
  label: string;
  icon: string;
  type: string;
  target: string;
  order: number;
  isVisible: boolean;
  accessTypes: string[];
}

function makeItem(order: number): MenuItem {
  return { label: "New Item", icon: "📌", type: "dashboard", target: "/portal/dashboard", order, isVisible: true, accessTypes: [], children: [], expanded: true };
}

function makeChild(order: number): ChildItem {
  return { label: "Sub Item", icon: "•", type: "page", target: "", order, isVisible: true, accessTypes: [] };
}

export default function MenuBuilderPage() {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    api.get("/portal/admin/builder/menu")
      .then(r => {
        const data = r.data as any[];
        setItems(data.map((item: any, i: number) => ({
          ...item,
          order: i,
          children: (item.children || []).map((c: any, j: number) => ({ ...c, order: j })),
          expanded: false,
        })));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      const payload = items.map((item, i) => ({
        ...item,
        order: i,
        children: (item.children || []).map((c, j) => ({ ...c, order: j })),
      }));
      await api.post("/portal/admin/builder/menu", { items: payload });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {}
    setSaving(false);
  };

  const updateItem = (idx: number, patch: Partial<MenuItem>) => {
    setItems(prev => prev.map((it, i) => i === idx ? { ...it, ...patch } : it));
  };

  const updateChild = (parentIdx: number, childIdx: number, patch: Partial<ChildItem>) => {
    setItems(prev => prev.map((it, i) => {
      if (i !== parentIdx) return it;
      return { ...it, children: it.children.map((c, j) => j === childIdx ? { ...c, ...patch } : c) };
    }));
  };

  const deleteItem = (idx: number) => setItems(prev => prev.filter((_, i) => i !== idx));
  const deleteChild = (parentIdx: number, childIdx: number) => {
    setItems(prev => prev.map((it, i) => i !== parentIdx ? it : { ...it, children: it.children.filter((_, j) => j !== childIdx) }));
  };

  const moveItem = (idx: number, dir: -1 | 1) => {
    const target = idx + dir;
    if (target < 0 || target >= items.length) return;
    setItems(prev => { const a = [...prev]; [a[idx], a[target]] = [a[target], a[idx]]; return a; });
  };

  const addItem = () => setItems(prev => [...prev, makeItem(prev.length)]);
  const addChild = (parentIdx: number) => {
    setItems(prev => prev.map((it, i) => i !== parentIdx ? it : { ...it, children: [...it.children, makeChild(it.children.length)], expanded: true }));
  };

  const resolveTarget = (type: string) => BUILT_IN_TARGETS[type] || "";

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-6 h-6 animate-spin text-indigo-500" /></div>;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Menu Builder</h1>
          <p className="text-sm text-gray-500 mt-0.5">Design the portal sidebar navigation with drag-and-drop hierarchy.</p>
        </div>
        <button onClick={save} disabled={saving} className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors">
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : saved ? <span className="text-green-300">✓</span> : <Save className="w-3.5 h-3.5" />}
          {saved ? "Saved" : "Save Menu"}
        </button>
      </div>

      <div className="space-y-3">
        {items.map((item, idx) => (
          <div key={idx} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            {/* Parent row */}
            <div className="flex items-center gap-2 px-4 py-3 bg-gray-50 border-b border-gray-100">
              <GripVertical className="w-4 h-4 text-gray-300 shrink-0" />
              <input className="w-8 border border-gray-200 rounded px-1.5 py-1 text-sm text-center" value={item.icon} onChange={e => updateItem(idx, { icon: e.target.value })} />
              <input className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-sm font-medium" value={item.label} onChange={e => updateItem(idx, { label: e.target.value })} placeholder="Label" />
              <select className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm text-gray-600" value={item.type} onChange={e => { const type = e.target.value; updateItem(idx, { type, target: resolveTarget(type) }); }}>
                {ITEM_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
              {(item.type === "page" || item.type === "external") && (
                <input className="w-40 border border-gray-200 rounded-lg px-2 py-1.5 text-xs font-mono text-gray-600" placeholder={item.type === "external" ? "https://..." : "/portal/pages/slug"} value={item.target} onChange={e => updateItem(idx, { target: e.target.value })} />
              )}
              <button onClick={() => updateItem(idx, { isVisible: !item.isVisible })} className={`p-1.5 rounded ${item.isVisible ? "text-green-600" : "text-gray-300"}`} title={item.isVisible ? "Visible" : "Hidden"}>
                {item.isVisible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
              </button>
              <button disabled={idx === 0} onClick={() => moveItem(idx, -1)} className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"><ChevronUp className="w-3.5 h-3.5" /></button>
              <button disabled={idx === items.length - 1} onClick={() => moveItem(idx, 1)} className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"><ChevronDown className="w-3.5 h-3.5" /></button>
              <button onClick={() => deleteItem(idx)} className="p-1.5 text-gray-400 hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
              {item.type !== "divider" && (
                <button onClick={() => updateItem(idx, { expanded: !item.expanded })} className="p-1 text-gray-400 hover:text-gray-600">
                  {item.expanded ? <Expand className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                </button>
              )}
            </div>

            {/* Children */}
            {item.expanded && item.type !== "divider" && (
              <div className="px-4 pb-3 pt-2 space-y-2">
                {item.children.map((child, ci) => (
                  <div key={ci} className="flex items-center gap-2 pl-6 border-l-2 border-gray-100">
                    <input className="w-8 border border-gray-200 rounded px-1.5 py-1 text-sm text-center" value={child.icon} onChange={e => updateChild(idx, ci, { icon: e.target.value })} />
                    <input className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-sm" value={child.label} onChange={e => updateChild(idx, ci, { label: e.target.value })} placeholder="Sub-item label" />
                    <select className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm text-gray-600" value={child.type} onChange={e => { const t = e.target.value; updateChild(idx, ci, { type: t, target: resolveTarget(t) }); }}>
                      {ITEM_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                    {(child.type === "page" || child.type === "external") && (
                      <input className="w-36 border border-gray-200 rounded-lg px-2 py-1.5 text-xs font-mono text-gray-600" placeholder="Target" value={child.target} onChange={e => updateChild(idx, ci, { target: e.target.value })} />
                    )}
                    <button onClick={() => deleteChild(idx, ci)} className="p-1 text-gray-400 hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                ))}
                <button onClick={() => addChild(idx)} className="pl-6 text-xs text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1">
                  <Plus className="w-3 h-3" />Add sub-item
                </button>
              </div>
            )}
          </div>
        ))}

        <button onClick={addItem} className="w-full py-3 border-2 border-dashed border-gray-200 rounded-xl text-sm text-gray-400 hover:border-indigo-300 hover:text-indigo-500 transition-colors flex items-center justify-center gap-2">
          <Plus className="w-4 h-4" />Add Menu Item
        </button>
      </div>

      <div className="bg-blue-50 border border-blue-100 rounded-xl px-5 py-3 text-xs text-blue-700">
        <strong>Tip:</strong> Use built-in types (Dashboard, My Record, etc.) for core navigation. Use "Portal Page" to link to pages you built in Page Builder. Changes take effect immediately after saving.
      </div>
    </div>
  );
}
