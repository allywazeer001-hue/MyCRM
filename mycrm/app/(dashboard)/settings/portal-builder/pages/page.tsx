"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { Loader2, Plus, FileText, Globe, Edit2, Trash2, Eye, EyeOff, Clock } from "lucide-react";

interface PortalPage {
  id: string;
  title: string;
  slug: string;
  description?: string;
  icon?: string;
  status: "DRAFT" | "PUBLISHED" | "UNPUBLISHED";
  publishedAt?: string;
  updatedAt: string;
}

const STATUS_STYLES: Record<string, string> = {
  PUBLISHED:   "bg-green-50 text-green-700",
  DRAFT:       "bg-gray-100 text-gray-600",
  UNPUBLISHED: "bg-amber-50 text-amber-700",
};

export default function PortalPagesListPage() {
  const router = useRouter();
  const [pages, setPages] = useState<PortalPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newSlug, setNewSlug] = useState("");
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    api.get("/portal/admin/builder/pages")
      .then(r => setPages(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

  const handleCreate = async () => {
    if (!newTitle.trim()) return;
    setCreating(true);
    try {
      const { data } = await api.post("/portal/admin/builder/pages", { title: newTitle, slug: newSlug || slugify(newTitle) });
      setPages(p => [data, ...p]);
      setShowNew(false);
      setNewTitle("");
      setNewSlug("");
      router.push(`/settings/portal-builder/pages/${data.id}`);
    } catch {}
    setCreating(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this page? This cannot be undone.")) return;
    setDeleting(id);
    try {
      await api.delete(`/portal/admin/builder/pages/${id}`);
      setPages(p => p.filter(x => x.id !== id));
    } catch {}
    setDeleting(null);
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Page Builder</h1>
          <p className="text-sm text-gray-500 mt-0.5">Create and manage custom portal pages.</p>
        </div>
        <button
          onClick={() => setShowNew(true)}
          className="flex items-center gap-1.5 px-3 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Page
        </button>
      </div>

      {showNew && (
        <div className="bg-white rounded-xl border border-indigo-100 shadow-sm p-5 space-y-3">
          <p className="text-sm font-semibold text-gray-800">New Page</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Title</label>
              <input
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Page title"
                value={newTitle}
                onChange={e => { setNewTitle(e.target.value); if (!newSlug) setNewSlug(slugify(e.target.value)); }}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Slug (URL)</label>
              <input
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="my-page"
                value={newSlug}
                onChange={e => setNewSlug(slugify(e.target.value))}
              />
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <button onClick={() => setShowNew(false)} className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">Cancel</button>
            <button
              onClick={handleCreate}
              disabled={creating || !newTitle.trim()}
              className="px-4 py-1.5 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-1.5"
            >
              {creating && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Create & Edit
            </button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
          </div>
        ) : pages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <FileText className="w-8 h-8 mb-2 opacity-40" />
            <p className="text-sm">No pages yet. Create your first portal page.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {pages.map(page => (
              <div key={page.id} className="flex items-center gap-3 px-5 py-4">
                <div className="w-9 h-9 rounded-lg bg-gray-50 border border-gray-100 flex items-center justify-center text-base shrink-0">
                  {page.icon || "📄"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800 truncate">{page.title}</p>
                  <p className="text-xs text-gray-400 font-mono truncate">/{page.slug}</p>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_STYLES[page.status]}`}>
                  {page.status.charAt(0) + page.status.slice(1).toLowerCase()}
                </span>
                <button
                  onClick={() => router.push(`/settings/portal-builder/pages/${page.id}`)}
                  className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                  title="Edit"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(page.id)}
                  disabled={deleting === page.id}
                  className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                  title="Delete"
                >
                  {deleting === page.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
