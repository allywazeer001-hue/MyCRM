"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import {
  Loader2, Plus, Trash2, Edit2, Bell, Send, CheckCircle,
  Globe, Clock, Eye, EyeOff, AlertCircle, X,
} from "lucide-react";

interface Announcement {
  id: string;
  title: string;
  body: string;
  type: string;
  targetTypes: string[];
  isPublished: boolean;
  publishedAt: string;
  scheduledAt?: string;
  expiresAt?: string;
  createdAt: string;
}

const ANN_TYPES = [
  { value: "general",     label: "General",     color: "bg-blue-50 text-blue-700" },
  { value: "maintenance", label: "Maintenance",  color: "bg-amber-50 text-amber-700" },
  { value: "update",      label: "Update",       color: "bg-green-50 text-green-700" },
  { value: "urgent",      label: "Urgent",       color: "bg-red-50 text-red-700" },
];

const PORTAL_TYPES = [
  "standard", "academic", "medical", "hr", "crm", "vendor", "member",
];

function typeColor(type: string) {
  return ANN_TYPES.find(t => t.value === type)?.color ?? "bg-gray-100 text-gray-600";
}

function FormModal({ onClose, onSave, initial }: {
  onClose: () => void;
  onSave: (d: any) => Promise<void>;
  initial?: Partial<Announcement>;
}) {
  const [form, setForm] = useState({
    title: initial?.title ?? "",
    body: initial?.body ?? "",
    type: initial?.type ?? "general",
    targetTypes: (initial?.targetTypes as string[]) ?? [],
    scheduledAt: initial?.scheduledAt ? initial.scheduledAt.slice(0, 16) : "",
    expiresAt: initial?.expiresAt ? initial.expiresAt.slice(0, 16) : "",
    isPublished: initial?.isPublished ?? true,
  });
  const [saving, setSaving] = useState(false);

  const toggleTarget = (t: string) => {
    setForm(f => ({ ...f, targetTypes: f.targetTypes.includes(t) ? f.targetTypes.filter(x => x !== t) : [...f.targetTypes, t] }));
  };

  const submit = async () => {
    if (!form.title.trim() || !form.body.trim()) return;
    setSaving(true);
    await onSave({ ...form, scheduledAt: form.scheduledAt || null, expiresAt: form.expiresAt || null });
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <p className="font-semibold text-gray-900">{initial ? "Edit Announcement" : "New Announcement"}</p>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"><X className="w-4 h-4" /></button>
        </div>
        <div className="px-6 py-4 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Title</label>
            <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Announcement title" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Message</label>
            <textarea rows={4} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500" value={form.body} onChange={e => setForm(f => ({ ...f, body: e.target.value }))} placeholder="Announcement body..." />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Type</label>
              <select className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
                {ANN_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div className="flex items-end gap-2">
              <button onClick={() => setForm(f => ({ ...f, isPublished: !f.isPublished }))} className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${form.isPublished ? "bg-green-50 border-green-200 text-green-700" : "bg-gray-50 border-gray-200 text-gray-500"}`}>
                {form.isPublished ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                {form.isPublished ? "Published" : "Draft"}
              </button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Schedule At (optional)</label>
              <input type="datetime-local" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" value={form.scheduledAt} onChange={e => setForm(f => ({ ...f, scheduledAt: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Expires At (optional)</label>
              <input type="datetime-local" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" value={form.expiresAt} onChange={e => setForm(f => ({ ...f, expiresAt: e.target.value }))} />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-2">Target Portal Types (leave empty for all)</label>
            <div className="flex flex-wrap gap-2">
              {PORTAL_TYPES.map(t => (
                <button key={t} onClick={() => toggleTarget(t)} className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${form.targetTypes.includes(t) ? "bg-indigo-600 text-white border-indigo-600" : "border-gray-200 text-gray-500 hover:border-indigo-300"}`}>
                  {t}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">Cancel</button>
          <button onClick={submit} disabled={saving || !form.title.trim() || !form.body.trim()} className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50">
            {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {initial ? "Update" : "Create"}
          </button>
        </div>
      </div>
    </div>
  );
}

function BroadcastModal({ onClose }: { onClose: () => void }) {
  const [form, setForm] = useState({ title: "", body: "", targetTypes: [] as string[] });
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ sent: number } | null>(null);

  const toggleTarget = (t: string) => {
    setForm(f => ({ ...f, targetTypes: f.targetTypes.includes(t) ? f.targetTypes.filter(x => x !== t) : [...f.targetTypes, t] }));
  };

  const send = async () => {
    if (!form.title.trim() || !form.body.trim()) return;
    setSending(true);
    try {
      const { data } = await api.post("/portal/admin/builder/announcements/broadcast", form);
      setResult(data);
    } catch {}
    setSending(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <Send className="w-4 h-4 text-indigo-600" />
            <p className="font-semibold text-gray-900">Broadcast Notification</p>
          </div>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"><X className="w-4 h-4" /></button>
        </div>
        {result ? (
          <div className="px-6 py-8 text-center">
            <CheckCircle className="w-10 h-10 text-green-500 mx-auto mb-3" />
            <p className="text-lg font-semibold text-gray-900">Broadcast Sent!</p>
            <p className="text-sm text-gray-500 mt-1">Delivered to <strong>{result.sent}</strong> active portal users.</p>
            <button onClick={onClose} className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700">Done</button>
          </div>
        ) : (
          <>
            <div className="px-6 py-4 space-y-4">
              <div className="bg-amber-50 border border-amber-100 rounded-lg px-4 py-3 text-xs text-amber-800 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                This will create an in-app notification for all active portal users immediately.
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Title</label>
                <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Notification title" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Message</label>
                <textarea rows={3} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500" value={form.body} onChange={e => setForm(f => ({ ...f, body: e.target.value }))} placeholder="Notification message..." />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-2">Target Types (empty = all)</label>
                <div className="flex flex-wrap gap-2">
                  {PORTAL_TYPES.map(t => (
                    <button key={t} onClick={() => toggleTarget(t)} className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${form.targetTypes.includes(t) ? "bg-indigo-600 text-white border-indigo-600" : "border-gray-200 text-gray-500 hover:border-indigo-300"}`}>
                      {t}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-2">
              <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">Cancel</button>
              <button onClick={send} disabled={sending || !form.title.trim() || !form.body.trim()} className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50">
                {sending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                Send Broadcast
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function NotificationsManagerPage() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState<Announcement | null>(null);
  const [showBroadcast, setShowBroadcast] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    api.get("/portal/admin/builder/announcements")
      .then(r => setAnnouncements(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async (dto: any) => {
    if (editItem) {
      const { data } = await api.patch(`/portal/admin/builder/announcements/${editItem.id}`, dto);
      setAnnouncements(prev => prev.map(a => a.id === editItem.id ? data : a));
    } else {
      const { data } = await api.post("/portal/admin/builder/announcements", dto);
      setAnnouncements(prev => [data, ...prev]);
    }
    setShowForm(false);
    setEditItem(null);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this announcement?")) return;
    setDeleting(id);
    try {
      await api.delete(`/portal/admin/builder/announcements/${id}`);
      setAnnouncements(prev => prev.filter(a => a.id !== id));
    } catch {}
    setDeleting(null);
  };

  const togglePublish = async (ann: Announcement) => {
    const { data } = await api.patch(`/portal/admin/builder/announcements/${ann.id}`, { isPublished: !ann.isPublished });
    setAnnouncements(prev => prev.map(a => a.id === ann.id ? data : a));
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Notifications & Announcements</h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage portal announcements and send broadcasts to portal users.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowBroadcast(true)} className="flex items-center gap-1.5 px-3 py-2 bg-amber-50 text-amber-700 border border-amber-200 rounded-lg text-sm font-medium hover:bg-amber-100 transition-colors">
            <Send className="w-3.5 h-3.5" />Broadcast
          </button>
          <button onClick={() => { setEditItem(null); setShowForm(true); }} className="flex items-center gap-1.5 px-3 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors">
            <Plus className="w-4 h-4" />New Announcement
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-40"><Loader2 className="w-6 h-6 animate-spin text-indigo-500" /></div>
        ) : announcements.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <Bell className="w-8 h-8 mb-2 opacity-40" />
            <p className="text-sm">No announcements yet.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {announcements.map(ann => (
              <div key={ann.id} className={`px-5 py-4 flex items-start gap-3 ${!ann.isPublished ? "bg-gray-50/50" : ""}`}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <p className="text-sm font-semibold text-gray-800">{ann.title}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${typeColor(ann.type)}`}>{ann.type}</span>
                    {!ann.isPublished && <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">Draft</span>}
                    {ann.scheduledAt && <span className="text-xs text-amber-600 flex items-center gap-0.5"><Clock className="w-3 h-3" />Scheduled</span>}
                    {(ann.targetTypes as any as string[]).length > 0 && (
                      <span className="text-xs text-indigo-600">{(ann.targetTypes as any as string[]).join(", ")}</span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 line-clamp-2">{ann.body}</p>
                  {ann.expiresAt && <p className="text-xs text-red-500 mt-0.5">Expires: {new Date(ann.expiresAt).toLocaleDateString()}</p>}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => togglePublish(ann)} className={`p-1.5 rounded-lg transition-colors ${ann.isPublished ? "text-green-600 hover:bg-green-50" : "text-gray-400 hover:bg-gray-100"}`} title={ann.isPublished ? "Unpublish" : "Publish"}>
                    {ann.isPublished ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                  </button>
                  <button onClick={() => { setEditItem(ann); setShowForm(true); }} className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors">
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleDelete(ann.id)} disabled={deleting === ann.id} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50">
                    {deleting === ann.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {(showForm || editItem) && (
        <FormModal
          initial={editItem ?? undefined}
          onClose={() => { setShowForm(false); setEditItem(null); }}
          onSave={handleSave}
        />
      )}
      {showBroadcast && <BroadcastModal onClose={() => setShowBroadcast(false)} />}
    </div>
  );
}
