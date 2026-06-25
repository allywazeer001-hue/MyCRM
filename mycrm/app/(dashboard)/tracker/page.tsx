"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Loader2, BarChart3, Layers } from "lucide-react";
import { api } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

interface Module { id: string; name: string; slug: string; }
interface Tracker {
  id: string;
  name: string;
  description: string | null;
  module: { id: string; name: string };
  criteria: { id: string; name: string; maxPoints: number }[];
  _count: { scores: number };
  createdAt: string;
}

export default function TrackersPage() {
  const router = useRouter();
  const [trackers, setTrackers] = useState<Tracker[]>([]);
  const [modules, setModules]   = useState<Module[]>([]);
  const [loading, setLoading]   = useState(true);
  const [showNew, setShowNew]   = useState(false);
  const [creating, setCreating] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const [form, setForm] = useState({ name: "", description: "", moduleId: "" });

  const load = () => {
    setLoading(true);
    api.get("/tracker").then(r => setTrackers(r.data)).catch(() => {}).finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    api.get("/modules").then(r => setModules(Array.isArray(r.data) ? r.data : (r.data?.modules ?? []))).catch(() => {});
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleCreate = async () => {
    if (!form.name.trim() || !form.moduleId) return;
    setCreating(true);
    try {
      const { data } = await api.post("/tracker", {
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        moduleId: form.moduleId,
      });
      setShowNew(false);
      setForm({ name: "", description: "", moduleId: "" });
      router.push(`/tracker/${data.id}`);
    } catch { alert("Failed to create tracker"); }
    finally { setCreating(false); }
  };

  const handleDelete = async (id: string) => {
    try { await api.delete(`/tracker/${id}`); setDeleteId(null); load(); }
    catch { alert("Failed to delete"); }
  };

  const totalMaxPts = (t: Tracker) => t.criteria.reduce((s, c) => s + c.maxPoints, 0);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Trackers</h1>
          <p className="text-sm text-gray-500 mt-1">Rate and score records from any module</p>
        </div>
        <Button onClick={() => setShowNew(true)} className="bg-blue-600 hover:bg-blue-700 text-white">
          <Plus className="w-4 h-4 mr-2" /> New Tracker
        </Button>
      </div>

      {/* Grid */}
      {trackers.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-16 text-center">
          <BarChart3 className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">No trackers yet</p>
          <p className="text-gray-400 text-sm mt-1">Create a tracker, link it to a module, and start rating records</p>
          <Button className="mt-4 bg-blue-600 hover:bg-blue-700 text-white" onClick={() => setShowNew(true)}>
            <Plus className="w-4 h-4 mr-2" /> New Tracker
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {trackers.map(t => (
            <div
              key={t.id}
              onClick={() => router.push(`/tracker/${t.id}`)}
              className="rounded-xl border border-slate-200 shadow-sm bg-white hover:shadow-md transition-shadow cursor-pointer"
            >
              <div className="p-5">
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shrink-0">
                    <BarChart3 className="w-4 h-4 text-white" />
                  </div>
                  <button
                    onClick={e => { e.stopPropagation(); setDeleteId(t.id); }}
                    className="p-1.5 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <h3 className="font-semibold text-gray-900 mb-1">{t.name}</h3>
                {t.description && <p className="text-sm text-gray-500 mb-2 line-clamp-2">{t.description}</p>}

                <div className="flex items-center gap-1.5 mt-2">
                  <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-medium">
                    <Layers className="w-3 h-3" />{t.module.name}
                  </span>
                </div>

                <div className="flex gap-3 mt-3 text-xs text-gray-500">
                  <span>{t.criteria.length} criteria</span>
                  <span>·</span>
                  <span>{totalMaxPts(t)} max pts</span>
                </div>
              </div>

              <div className="border-t border-slate-100 px-5 py-3 text-xs text-gray-400 flex justify-between">
                <span>Created {formatDate(t.createdAt)}</span>
                <span className="font-medium text-blue-600">Open →</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* New Tracker Modal */}
      <Dialog open={showNew} onOpenChange={setShowNew}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>New Tracker</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Name <span className="text-red-500">*</span></Label>
              <Input
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Employee Performance Q3"
                className="mt-1"
                autoFocus
              />
            </div>
            <div>
              <Label>Description <span className="text-gray-400 text-xs">(optional)</span></Label>
              <Input
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder="Brief description"
                className="mt-1"
              />
            </div>
            <div>
              <Label>Module <span className="text-red-500">*</span></Label>
              <Select value={form.moduleId} onValueChange={v => setForm(f => ({ ...f, moduleId: v }))}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select a module…" />
                </SelectTrigger>
                <SelectContent>
                  {modules.map(m => (
                    <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-400 mt-1">All records from this module will appear in your scoring grid</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNew(false)}>Cancel</Button>
            <Button
              onClick={handleCreate}
              disabled={creating || !form.name.trim() || !form.moduleId}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {creating && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Create &amp; Configure
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Delete Tracker?</DialogTitle></DialogHeader>
          <p className="text-sm text-gray-600">This will permanently delete the tracker and all scores.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => deleteId && handleDelete(deleteId)}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
