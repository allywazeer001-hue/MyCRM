"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { portalApi } from "@/lib/portal-api";
import {
  Loader2, Plus, Trash2, Globe, EyeOff, FileText,
  LayoutGrid, AlertCircle, Pencil, ChevronRight, Check,
  Columns, Layout, AppWindow, LayoutDashboard, PanelLeft,
} from "lucide-react";

// ── Layout templates ──────────────────────────────────────────────────────────
const LAYOUTS = [
  {
    id: "blank",
    name: "Blank Canvas",
    desc: "Start completely empty",
    icon: FileText,
    accent: "gray",
    preview: "╔══════════╗\n║          ║\n║  Empty   ║\n║          ║\n╚══════════╝",
    cols: 1,
  },
  {
    id: "single",
    name: "Single Column",
    desc: "One-column stacked sections",
    icon: Layout,
    accent: "indigo",
    preview: "┌──────────┐\n│ Section  │\n├──────────┤\n│ Section  │\n└──────────┘",
    cols: 1,
  },
  {
    id: "two-column",
    name: "Two Columns",
    desc: "Side-by-side equal columns",
    icon: Columns,
    accent: "violet",
    preview: "┌────┬─────┐\n│    │     │\n│    │     │\n└────┴─────┘",
    cols: 2,
  },
  {
    id: "sidebar",
    name: "Sidebar Layout",
    desc: "Narrow sidebar + main area",
    icon: PanelLeft,
    accent: "blue",
    preview: "┌──┬───────┐\n│  │ Main  │\n│SB│       │\n└──┴───────┘",
    cols: 2,
  },
  {
    id: "three-column",
    name: "Three Columns",
    desc: "Wide triple-column grid",
    icon: AppWindow,
    accent: "emerald",
    preview: "┌───┬───┬──┐\n│   │   │  │\n│   │   │  │\n└───┴───┴──┘",
    cols: 3,
  },
  {
    id: "dashboard",
    name: "Dashboard",
    desc: "Stat cards + content area",
    icon: LayoutDashboard,
    accent: "amber",
    preview: "┌─┬─┬─┬─┐\n│ │ │ │ │\n├─┴─┴─┴─┤\n│ Charts │\n└────────┘",
    cols: 1,
  },
  {
    id: "cards",
    name: "Cards Layout",
    desc: "Card-based responsive grid",
    icon: LayoutGrid,
    accent: "rose",
    preview: "┌────┬────┐\n│Card│Card│\n├────┼────┤\n│Card│Card│\n└────┴────┘",
    cols: 2,
  },
];

const ACCENT_CLS: Record<string, { border: string; bg: string; text: string; badge: string }> = {
  gray:   { border: "border-gray-700",   bg: "bg-gray-800",   text: "text-gray-400",   badge: "bg-gray-800 text-gray-400" },
  indigo: { border: "border-indigo-700", bg: "bg-indigo-900/20", text: "text-indigo-400", badge: "bg-indigo-900/50 text-indigo-300" },
  violet: { border: "border-violet-700", bg: "bg-violet-900/20", text: "text-violet-400", badge: "bg-violet-900/50 text-violet-300" },
  blue:   { border: "border-blue-700",   bg: "bg-blue-900/20",   text: "text-blue-400",   badge: "bg-blue-900/50 text-blue-300" },
  emerald:{ border: "border-emerald-700",bg: "bg-emerald-900/20",text: "text-emerald-400",badge: "bg-emerald-900/50 text-emerald-300" },
  amber:  { border: "border-amber-700",  bg: "bg-amber-900/20",  text: "text-amber-400",  badge: "bg-amber-900/50 text-amber-300" },
  rose:   { border: "border-rose-700",   bg: "bg-rose-900/20",   text: "text-rose-400",   badge: "bg-rose-900/50 text-rose-300" },
};

// ── Components ────────────────────────────────────────────────────────────────
function StatusDot({ status }: { status: string }) {
  const pub = status === "PUBLISHED";
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${pub ? "bg-green-900/50 text-green-400" : "bg-gray-800 text-gray-500"}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${pub ? "bg-green-500" : "bg-gray-500"}`} />
      {pub ? "Live" : "Draft"}
    </span>
  );
}

function PageThumbnail({ layoutTemplate }: { layoutTemplate?: string }) {
  const template = layoutTemplate ?? "single";
  return (
    <div className="h-28 bg-gradient-to-br from-gray-800 to-gray-850 relative overflow-hidden">
      <div className="absolute inset-4 flex flex-col gap-2 opacity-50">
        {/* Simulate layout */}
        {template === "dashboard" ? (
          <>
            <div className="grid grid-cols-4 gap-1">
              {[1,2,3,4].map(i => <div key={i} className="h-4 bg-gray-600 rounded" />)}
            </div>
            <div className="flex-1 bg-gray-600/60 rounded" />
          </>
        ) : template === "cards" ? (
          <div className="grid grid-cols-2 gap-1.5 flex-1">
            {[1,2,3,4].map(i => <div key={i} className="bg-gray-600/70 rounded" />)}
          </div>
        ) : (template === "two-column" || template === "sidebar") ? (
          <div className="flex gap-2 flex-1">
            <div className={`${template === "sidebar" ? "w-1/4" : "w-2/5"} space-y-1.5`}>
              <div className="h-1.5 bg-gray-500 rounded" />
              <div className="h-1.5 bg-gray-600 rounded w-4/5" />
              <div className="h-1.5 bg-gray-600 rounded w-3/5" />
            </div>
            <div className="flex-1 space-y-1.5">
              <div className="h-1.5 bg-gray-500 rounded" />
              <div className="h-1.5 bg-gray-600 rounded" />
              <div className="h-1.5 bg-gray-600 rounded w-4/5" />
            </div>
          </div>
        ) : template === "three-column" ? (
          <div className="flex gap-1.5 flex-1">
            {[1,2,3].map(i => (
              <div key={i} className="flex-1 space-y-1.5">
                <div className="h-1.5 bg-gray-500 rounded" />
                <div className="h-1.5 bg-gray-600 rounded" />
                <div className="h-1.5 bg-gray-600 rounded w-3/5" />
              </div>
            ))}
          </div>
        ) : template === "blank" ? (
          <div className="flex-1 flex items-center justify-center">
            <Plus className="w-6 h-6 text-gray-600" />
          </div>
        ) : (
          <div className="flex-1 space-y-1.5">
            <div className="h-1.5 bg-gray-500 rounded w-1/2" />
            <div className="h-1.5 bg-gray-600 rounded" />
            <div className="h-1.5 bg-gray-600 rounded w-4/5" />
            <div className="h-1.5 bg-gray-600 rounded w-3/5" />
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function PagesListPage() {
  const router = useRouter();
  const [pages, setPages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [step, setStep] = useState<"name" | "layout">("name");
  const [form, setForm] = useState({ title: "", layout: "single" });
  const [createError, setCreateError] = useState("");
  const [deleting, setDeleting] = useState<string | null>(null);
  const [toggling, setToggling] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    portalApi.get("/portal/padmin/pages")
      .then(r => setPages(r.data ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => {
    setForm({ title: "", layout: "single" });
    setStep("name");
    setCreateError("");
    setShowModal(true);
  };

  const handleCreate = async () => {
    if (!form.title.trim()) { setCreateError("Page title is required"); return; }
    setCreating(true);
    setCreateError("");
    try {
      const res = await portalApi.post("/portal/padmin/pages", {
        title: form.title.trim(),
        layoutTemplate: form.layout,
      });
      setShowModal(false);
      router.push(`/apps/portal-builder/pages/${res.data.id}`);
    } catch (e: any) {
      setCreateError(e?.response?.data?.message ?? "Failed to create page");
    }
    setCreating(false);
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm("Delete this page? This cannot be undone.")) return;
    setDeleting(id);
    try {
      await portalApi.delete(`/portal/padmin/pages/${id}`);
      setPages(prev => prev.filter(p => p.id !== id));
    } catch {}
    setDeleting(null);
  };

  const handleToggleStatus = async (page: any, e: React.MouseEvent) => {
    e.stopPropagation();
    const newStatus = page.status === "PUBLISHED" ? "DRAFT" : "PUBLISHED";
    setToggling(page.id);
    try {
      await portalApi.patch(`/portal/padmin/pages/${page.id}`, { status: newStatus });
      setPages(prev => prev.map(p => p.id === page.id ? { ...p, status: newStatus } : p));
    } catch {}
    setToggling(null);
  };

  const published = pages.filter(p => p.status === "PUBLISHED").length;

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-white flex items-center gap-2">
            <FileText className="w-5 h-5 text-indigo-400" />
            Pages
          </h1>
          <p className="text-sm text-gray-400 mt-0.5">
            {pages.length} page{pages.length !== 1 ? "s" : ""}
            {published > 0 && <> · <span className="text-green-400">{published} live</span></>}
          </p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold rounded-xl transition-colors"
        >
          <Plus className="w-4 h-4" />New Page
        </button>
      </div>

      {/* Pages grid */}
      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-5 h-5 animate-spin text-indigo-400" />
        </div>
      ) : pages.length === 0 ? (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl py-24 flex flex-col items-center gap-5">
          <div className="w-16 h-16 rounded-2xl bg-gray-800 flex items-center justify-center">
            <LayoutGrid className="w-7 h-7 text-gray-600" />
          </div>
          <div className="text-center">
            <p className="text-white font-bold text-base">No pages yet</p>
            <p className="text-sm text-gray-500 mt-1">Create your first page or start from a portal template.</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={openCreate}
              className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold rounded-xl"
            >
              <Plus className="w-4 h-4" />New Page
            </button>
            <button
              onClick={() => router.push("/apps/portal-builder/templates")}
              className="flex items-center gap-2 px-4 py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm font-medium rounded-xl"
            >
              Browse Templates <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {pages.map(page => (
            <div
              key={page.id}
              onClick={() => router.push(`/apps/portal-builder/pages/${page.id}`)}
              className="group bg-gray-900 border border-gray-700 rounded-xl overflow-hidden hover:border-indigo-500 hover:shadow-xl hover:shadow-indigo-900/20 transition-all cursor-pointer"
            >
              {/* Visual thumbnail */}
              <div className="relative border-b border-gray-700">
                <PageThumbnail layoutTemplate={page.layoutTemplate} />
                <div className="absolute inset-0 bg-indigo-600/0 group-hover:bg-indigo-600/8 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                  <span className="bg-indigo-600 text-white text-xs font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1.5 shadow-lg">
                    <Pencil className="w-3.5 h-3.5" />Open Builder
                  </span>
                </div>
              </div>

              {/* Info */}
              <div className="p-4">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <p className="text-sm font-bold text-white truncate flex-1">{page.title}</p>
                  <StatusDot status={page.status} />
                </div>
                <p className="text-xs text-gray-600 font-mono truncate mb-3">/{page.slug}</p>

                {/* Actions */}
                <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                  <button
                    onClick={(e) => handleToggleStatus(page, e)}
                    disabled={toggling === page.id}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                      page.status === "PUBLISHED"
                        ? "text-amber-400 hover:bg-amber-900/20"
                        : "text-green-400 hover:bg-green-900/20"
                    }`}
                  >
                    {toggling === page.id
                      ? <Loader2 className="w-3 h-3 animate-spin" />
                      : page.status === "PUBLISHED"
                        ? <><EyeOff className="w-3 h-3" />Unpublish</>
                        : <><Globe className="w-3 h-3" />Publish</>
                    }
                  </button>
                  <div className="w-px h-4 bg-gray-700" />
                  <button
                    onClick={(e) => { e.stopPropagation(); router.push(`/apps/portal-builder/pages/${page.id}`); }}
                    className="p-1.5 text-gray-600 hover:text-indigo-400 hover:bg-indigo-900/20 rounded-lg transition-colors"
                    title="Open Builder"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={(e) => handleDelete(page.id, e)}
                    disabled={deleting === page.id}
                    className="p-1.5 text-gray-600 hover:text-red-400 hover:bg-red-900/20 rounded-lg transition-colors"
                    title="Delete Page"
                  >
                    {deleting === page.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create page modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl w-full max-w-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700">
              <div>
                <h2 className="text-sm font-bold text-white">
                  {step === "name" ? "New Page" : "Choose Layout"}
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  {step === "name" ? "Give your page a title" : "How should the page be structured?"}
                </p>
              </div>
              <button onClick={() => setShowModal(false)} className="p-1.5 text-gray-500 hover:text-white rounded-lg transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            {step === "name" ? (
              <div className="px-6 py-6 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1.5">Page Title *</label>
                  <input
                    autoFocus
                    value={form.title}
                    onChange={e => { setForm(f => ({ ...f, title: e.target.value })); setCreateError(""); }}
                    onKeyDown={e => e.key === "Enter" && form.title.trim() && setStep("layout")}
                    placeholder="e.g. My Profile, Dashboard, Documents..."
                    className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-indigo-500"
                  />
                  {createError && (
                    <p className="text-xs text-red-400 mt-1.5 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />{createError}
                    </p>
                  )}
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      if (form.title.trim()) { setCreateError(""); setStep("layout"); }
                      else setCreateError("Page title is required");
                    }}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold rounded-xl"
                  >
                    Next — Choose Layout <ChevronRight className="w-4 h-4" />
                  </button>
                  <button onClick={() => setShowModal(false)} className="px-4 text-gray-500 hover:text-white text-sm rounded-xl transition-colors">
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="px-6 py-6 space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                  {LAYOUTS.map(layout => {
                    const ac = ACCENT_CLS[layout.accent];
                    return (
                      <button
                        key={layout.id}
                        onClick={() => setForm(f => ({ ...f, layout: layout.id }))}
                        className={`text-left border rounded-xl p-3 transition-all ${
                          form.layout === layout.id
                            ? `${ac.border} ${ac.bg} ring-1 ring-offset-0 ring-offset-gray-900`
                            : "border-gray-700 bg-gray-800 hover:border-gray-600"
                        }`}
                      >
                        <pre className={`text-[8px] font-mono leading-tight mb-2 whitespace-pre ${
                          form.layout === layout.id ? ac.text : "text-gray-600"
                        }`}>{layout.preview}</pre>
                        <p className={`text-xs font-bold leading-tight ${
                          form.layout === layout.id ? "text-white" : "text-gray-400"
                        }`}>{layout.name}</p>
                        <p className="text-[9px] text-gray-600 mt-0.5 leading-tight">{layout.desc}</p>
                      </button>
                    );
                  })}
                </div>
                {createError && (
                  <p className="text-xs text-red-400 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />{createError}
                  </p>
                )}
                <div className="flex gap-3">
                  <button
                    onClick={handleCreate}
                    disabled={creating}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-semibold rounded-xl"
                  >
                    {creating
                      ? <><Loader2 className="w-4 h-4 animate-spin" />Creating...</>
                      : <><Check className="w-4 h-4" />Create & Open Builder</>
                    }
                  </button>
                  <button onClick={() => setStep("name")} className="px-4 text-gray-500 hover:text-white text-sm rounded-xl transition-colors">
                    ← Back
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// X icon for the modal close button
function X({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}
