"use client";
import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, Loader2, FileText } from "lucide-react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

const COLORS = ["#3b82f6","#22c55e","#f97316","#8b5cf6","#ef4444","#14b8a6","#eab308"];
const ICONS  = ["FileText","ShoppingCart","CreditCard","Plane","Calendar","Package","Users","ClipboardList"];

interface RType { id: string; name: string; description: string | null; icon: string; color: string; prefix: string; isActive: boolean; blueprintId: string | null; blueprint: { id: string; name: string } | null; _count: { requests: number }; }

const blank = { name: "", description: "", icon: "FileText", color: "#3b82f6", prefix: "REQ", blueprintId: "" };

export default function RequestTypesPage() {
  const [types, setTypes]   = useState<RType[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]  = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [editing, setEditing] = useState<RType | null>(null);
  const [form, setForm]      = useState(blank);
  const [blueprints, setBlueprints] = useState<{ id: string; name: string }[]>([]);

  const load = () => {
    setLoading(true);
    api.get("/request-types").then(r => setTypes(r.data)).catch(() => {}).finally(() => setLoading(false));
  };
  useEffect(() => {
    load();
    api.get("/request-blueprints").then(r => setBlueprints(r.data)).catch(() => {});
  }, []);

  const openNew = () => { setForm(blank); setEditing(null); setShowNew(true); };
  const openEdit = (t: RType) => {
    setForm({ name: t.name, description: t.description ?? "", icon: t.icon, color: t.color, prefix: t.prefix, blueprintId: t.blueprintId ?? "" });
    setEditing(t); setShowNew(true);
  };

  const save = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      const payload = { ...form, blueprintId: form.blueprintId || null };
      if (editing) await api.patch(`/request-types/${editing.id}`, payload);
      else         await api.post("/request-types", payload);
      setShowNew(false); load();
    } catch { alert("Failed to save"); }
    finally { setSaving(false); }
  };

  const del = async (id: string) => {
    if (!confirm("Delete this request type?")) return;
    await api.delete(`/request-types/${id}`).catch(() => alert("Failed to delete"));
    load();
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Request Types</h1>
          <p className="text-sm text-gray-500 mt-0.5">Define categories for requests</p>
        </div>
        <Button onClick={openNew} className="bg-blue-600 hover:bg-blue-700 text-white gap-2">
          <Plus className="w-4 h-4" /> New Type
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-32"><Loader2 className="w-6 h-6 animate-spin text-blue-500" /></div>
      ) : types.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-slate-300 p-12 text-center">
          <FileText className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No request types yet. Create one to get started.</p>
          <Button onClick={openNew} className="mt-4 bg-blue-600 hover:bg-blue-700 text-white">Create First Type</Button>
        </div>
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Type</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Prefix</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Blueprint</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Requests</th>
                <th className="w-20" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {types.map(t => (
                <tr key={t.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold shrink-0" style={{ backgroundColor: t.color }}>{t.name[0]}</div>
                      <div>
                        <p className="font-medium text-gray-900">{t.name}</p>
                        {t.description && <p className="text-xs text-gray-400 truncate max-w-xs">{t.description}</p>}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3"><span className="font-mono text-xs bg-slate-100 px-2 py-0.5 rounded">{t.prefix}</span></td>
                  <td className="px-4 py-3 text-sm text-gray-600">{t.blueprint?.name ?? <span className="text-gray-300">—</span>}</td>
                  <td className="px-4 py-3 text-center font-medium">{t._count.requests}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1 justify-end">
                      <button onClick={() => openEdit(t)} className="p-1.5 rounded text-gray-400 hover:text-blue-600 hover:bg-blue-50"><Pencil className="w-4 h-4" /></button>
                      <button onClick={() => del(t.id)} className="p-1.5 rounded text-gray-400 hover:text-red-600 hover:bg-red-50"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={showNew} onOpenChange={setShowNew}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editing ? "Edit Request Type" : "New Request Type"}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div><Label>Name *</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="mt-1" autoFocus /></div>
            <div><Label>Description</Label><Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="mt-1" /></div>
            <div className="flex gap-3">
              <div className="flex-1"><Label>Prefix (3-5 chars)</Label><Input value={form.prefix} maxLength={6} onChange={e => setForm(f => ({ ...f, prefix: e.target.value.toUpperCase() }))} className="mt-1 font-mono" /></div>
              <div><Label>Color</Label>
                <div className="flex gap-1 mt-1 flex-wrap">
                  {COLORS.map(c => <button key={c} onClick={() => setForm(f => ({ ...f, color: c }))} className={`w-6 h-6 rounded-full border-2 transition-all ${form.color === c ? "border-gray-700 scale-110" : "border-transparent"}`} style={{ backgroundColor: c }} />)}
                </div>
              </div>
            </div>
            <div>
              <Label>Blueprint (workflow)</Label>
              <select value={form.blueprintId} onChange={e => setForm(f => ({ ...f, blueprintId: e.target.value }))} className="mt-1 w-full border border-slate-200 rounded-md px-3 py-2 text-sm">
                <option value="">No blueprint</option>
                {blueprints.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNew(false)}>Cancel</Button>
            <Button onClick={save} disabled={saving || !form.name.trim()} className="bg-blue-600 hover:bg-blue-700 text-white">
              {saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />} {editing ? "Save" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
