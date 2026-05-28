"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { portalApi } from "@/lib/portal-api";
import {
  Loader2, Plus, Trash2, Pencil, FileText, Globe, Lock,
  CheckCircle2, Clock,
} from "lucide-react";

interface PortalPage {
  id: string;
  title: string;
  slug: string;
  description?: string;
  status: string;
  publishedAt?: string;
  createdAt: string;
  updatedAt: string;
}

const STATUS_STYLES: Record<string, string> = {
  PUBLISHED: "bg-emerald-900/30 text-emerald-400",
  DRAFT:     "bg-amber-900/30 text-amber-400",
  ARCHIVED:  "bg-gray-800 text-gray-500",
};

export default function PagesListPage() {
  const router = useRouter();
  const [pages, setPages] = useState<PortalPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ title: "", slug: "", description: "" });
  const [error, setError] = useState("");

  const load = () => {
    setLoading(true);
    portalApi.get("/portal/padmin/pages")
      .then(r => setPages(r.data ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async () => {
    if (!form.title.trim()) { setError("Title is required"); return; }
    setCreating(true);
    setError("");
    try {
      const res = await portalApi.post("/portal/padmin/pages", form);
      router.push(`/portal/admin/pages/${res.data.id}`);
    } catch (e: any) {
      setError(e?.response?.data?.message ?? "Failed to create page");
      setCreating(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this page? This cannot be undone.")) return;
    try {
      await portalApi.delete(`/portal/padmin/pages/${id}`);
      load();
    } catch {}
  };

  const handlePublish = async (page: PortalPage) => {
    const newStatus = page.status === "PUBLISHED" ? "DRAFT" : "PUBLISHED";
    try {
      await portalApi.patch(`/portal/padmin/pages/${page.id}/publish`, { status: newStatus });
      setPages(prev => prev.map(p => p.id === page.id ? { ...p, status: newStatus } : p));
    } catch {}
  };

  return (
    <div className="space-y-5 max-w-4xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <FileText className="w-5 h-5 text-blue-400" />
          <div>
            <h1 className="text-xl font-bold text-white">Portal Pages</h1>
            <p className="text-sm text-gray-400 mt-0.5">Create and manage portal pages with custom content and fields.</p>
          </div>
        </div>
        <button
          onClick={() => { setShowCreate(true); setError(""); }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Page
        </button>
      </div>

      {/* Create form */}
      {showCreate && (
        <div className="bg-gray-900 border border-gray-700 rounded-xl p-5 space-y-4">
          <h2 className="text-sm font-semibold text-white">Create New Page</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-400 mb-1.5">Page Title *</label>
              <input
                value={form.title}
                onChange={e => {
                  const title = e.target.value;
                  const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
                  setForm(f => ({ ...f, title, slug }));
                }}
                placeholder="e.g. Welcome"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1.5">Slug</label>
              <input
                value={form.slug}
                onChange={e => setForm(f => ({ ...f, slug: e.target.value }))}
                placeholder="auto-generated"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-blue-500"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-xs text-gray-400 mb-1.5">Description (optional)</label>
              <input
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder="Short description"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>
          {error && <p className="text-xs text-red-400">{error}</p>}
          <div className="flex gap-2 pt-1">
            <button
              onClick={handleCreate}
              disabled={creating}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
            >
              {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              Create & Edit
            </button>
            <button onClick={() => setShowCreate(false)} className="px-4 py-2 text-gray-400 hover:text-white text-sm rounded-lg transition-colors">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Pages list */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <Loader2 className="w-5 h-5 animate-spin text-blue-400" />
          </div>
        ) : pages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
            <FileText className="w-8 h-8 text-gray-700" />
            <p className="text-sm text-gray-500">No pages yet.</p>
            <button onClick={() => setShowCreate(true)} className="flex items-center gap-1.5 text-sm text-blue-400 hover:text-blue-300">
              <Plus className="w-4 h-4" />Create your first page
            </button>
          </div>
        ) : (
          <div className="divide-y divide-gray-800">
            {pages.map(page => (
              <div key={page.id} className="flex items-center gap-4 px-5 py-4 hover:bg-gray-800/30 transition-colors">
                <div className="w-9 h-9 rounded-lg bg-gray-800 flex items-center justify-center shrink-0">
                  {page.status === "PUBLISHED" ? (
                    <Globe className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <Lock className="w-4 h-4 text-gray-500" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-white truncate">{page.title}</p>
                    <span className={`shrink-0 text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_STYLES[page.status] ?? STATUS_STYLES.DRAFT}`}>
                      {page.status === "PUBLISHED" ? (
                        <span className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3" />{page.status}</span>
                      ) : (
                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{page.status}</span>
                      )}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 font-mono mt-0.5">/{page.slug}</p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => handlePublish(page)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                      page.status === "PUBLISHED"
                        ? "bg-amber-900/20 text-amber-400 hover:bg-amber-900/40"
                        : "bg-emerald-900/20 text-emerald-400 hover:bg-emerald-900/40"
                    }`}
                  >
                    {page.status === "PUBLISHED" ? "Unpublish" : "Publish"}
                  </button>
                  <button
                    onClick={() => router.push(`/portal/admin/pages/${page.id}`)}
                    className="p-1.5 text-gray-500 hover:text-blue-400 hover:bg-blue-900/20 rounded-lg transition-colors"
                    title="Edit page"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(page.id)}
                    className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-red-900/20 rounded-lg transition-colors"
                    title="Delete page"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
