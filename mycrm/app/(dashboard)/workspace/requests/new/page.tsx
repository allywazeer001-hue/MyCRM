"use client";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Loader2 } from "lucide-react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface RType { id: string; name: string; icon: string; color: string; prefix: string; description: string | null; }

export default function NewRequestPage() {
  const router = useRouter();
  const sp = useSearchParams();
  const [types, setTypes] = useState<RType[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [form, setForm] = useState({
    typeId: sp.get("typeId") ?? "",
    title: "", description: "", priority: "MEDIUM", dueDate: "",
    assignedUserId: "", data: {} as Record<string, any>,
  });

  useEffect(() => {
    api.get("/request-types").then(r => { setTypes(r.data); if (r.data.length === 1 && !form.typeId) setForm(f => ({ ...f, typeId: r.data[0].id })); }).catch(() => {}).finally(() => setLoading(false));
  }, []); // eslint-disable-line

  const submit = async () => {
    if (!form.typeId || !form.title.trim()) return;
    setSaving(true);
    try {
      const { data } = await api.post("/requests", { ...form, dueDate: form.dueDate || null, assignedUserId: form.assignedUserId || null });
      router.push(`/workspace/requests/${data.id}`);
    } catch (err: any) { alert(err?.response?.data?.message ?? "Failed to submit"); }
    finally { setSaving(false); }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-blue-500" /></div>;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => router.push("/workspace/requests")} className="p-1.5 rounded-md hover:bg-slate-100 text-gray-500"><ArrowLeft className="w-5 h-5" /></button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">New Request</h1>
          <p className="text-sm text-gray-500">Fill in the details to submit a request</p>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6 space-y-5">
        {/* Type selector */}
        <div>
          <Label>Request Type *</Label>
          {types.length === 0 ? (
            <p className="text-sm text-amber-600 mt-1">No request types configured. Go to Customization → Request Types.</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2">
              {types.map(t => (
                <button
                  key={t.id}
                  onClick={() => setForm(f => ({ ...f, typeId: t.id }))}
                  className={`flex items-center gap-2 p-3 rounded-lg border-2 text-sm font-medium text-left transition-all ${form.typeId === t.id ? "border-blue-500 bg-blue-50" : "border-slate-200 hover:border-slate-300"}`}
                >
                  <div className="w-6 h-6 rounded-md flex items-center justify-center text-white text-xs font-bold shrink-0" style={{ backgroundColor: t.color }}>{t.name[0]}</div>
                  <span className="truncate">{t.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {form.typeId && (
          <>
            <div><Label>Title *</Label><Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} className="mt-1" placeholder="Brief description of your request" autoFocus /></div>
            <div>
              <Label>Description</Label>
              <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="mt-1 w-full border border-slate-200 rounded-md px-3 py-2 text-sm min-h-[100px] focus:outline-none focus:ring-2 focus:ring-blue-400 resize-y" placeholder="Provide more context about your request…" />
            </div>
            <div className="flex gap-4">
              <div className="flex-1">
                <Label>Priority</Label>
                <select value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))} className="mt-1 w-full border border-slate-200 rounded-md px-3 py-2 text-sm h-10">
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                  <option value="URGENT">Urgent</option>
                </select>
              </div>
              <div className="flex-1"><Label>Due Date</Label><Input type="date" value={form.dueDate} onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))} className="mt-1" /></div>
            </div>
          </>
        )}
      </div>

      {form.typeId && (
        <div className="flex gap-3 justify-end">
          <Button variant="outline" onClick={() => router.push("/workspace/requests")}>Cancel</Button>
          <Button onClick={submit} disabled={saving || !form.title.trim()} className="bg-blue-600 hover:bg-blue-700 text-white">
            {saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />} Submit Request
          </Button>
        </div>
      )}
    </div>
  );
}
