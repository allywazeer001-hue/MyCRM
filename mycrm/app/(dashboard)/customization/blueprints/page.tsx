"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, GitBranch, Loader2, Pencil, Trash2 } from "lucide-react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

interface Blueprint { id: string; name: string; description: string | null; isActive: boolean; _count: { stages: number; instances: number }; }

export default function BlueprintsPage() {
  const router = useRouter();
  const [blueprints, setBlueprints] = useState<Blueprint[]>([]);
  const [loading, setLoading]  = useState(true);
  const [showNew, setShowNew]  = useState(false);
  const [saving, setSaving]    = useState(false);
  const [form, setForm]        = useState({ name: "", description: "" });

  const load = () => {
    setLoading(true);
    api.get("/request-blueprints").then(r => setBlueprints(r.data)).catch(() => {}).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const create = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      const { data } = await api.post("/request-blueprints", form);
      setShowNew(false);
      router.push(`/customization/blueprints/${data.id}`);
    } catch { alert("Failed"); }
    finally { setSaving(false); }
  };

  const del = async (id: string) => {
    if (!confirm("Delete this blueprint?")) return;
    await api.delete(`/request-blueprints/${id}`).catch(() => alert("Failed"));
    load();
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-gray-900">Blueprints</h1><p className="text-sm text-gray-500 mt-0.5">Design approval workflows</p></div>
        <Button onClick={() => setShowNew(true)} className="bg-blue-600 hover:bg-blue-700 text-white gap-2"><Plus className="w-4 h-4" /> New Blueprint</Button>
      </div>

      {loading ? <div className="flex items-center justify-center h-32"><Loader2 className="w-6 h-6 animate-spin text-blue-500" /></div>
      : blueprints.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-slate-300 p-12 text-center">
          <GitBranch className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">No blueprints yet</p>
          <Button onClick={() => setShowNew(true)} className="mt-4 bg-blue-600 hover:bg-blue-700 text-white">Create Blueprint</Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {blueprints.map(b => (
            <div key={b.id} onClick={() => router.push(`/customization/blueprints/${b.id}`)} className="rounded-xl border border-slate-200 bg-white p-5 hover:shadow-md transition-shadow cursor-pointer">
              <div className="flex items-start justify-between mb-3">
                <div className="w-9 h-9 rounded-lg bg-purple-100 flex items-center justify-center shrink-0"><GitBranch className="w-4 h-4 text-purple-600" /></div>
                <button onClick={e => { e.stopPropagation(); del(b.id); }} className="p-1.5 text-gray-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
              </div>
              <h3 className="font-semibold text-gray-900">{b.name}</h3>
              {b.description && <p className="text-sm text-gray-500 mt-1 line-clamp-2">{b.description}</p>}
              <div className="flex gap-3 mt-3 text-xs text-gray-500">
                <span>{b._count.stages} stages</span><span>·</span><span>{b._count.instances} instances</span>
              </div>
              <div className="border-t border-slate-100 mt-3 pt-3 text-xs text-blue-600 font-medium">Edit Blueprint →</div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={showNew} onOpenChange={setShowNew}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>New Blueprint</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div><Label>Name *</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="mt-1" autoFocus placeholder="e.g. Scholar Payment Workflow" /></div>
            <div><Label>Description</Label><Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="mt-1" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNew(false)}>Cancel</Button>
            <Button onClick={create} disabled={saving || !form.name.trim()} className="bg-blue-600 hover:bg-blue-700 text-white">
              {saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />} Create & Edit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
