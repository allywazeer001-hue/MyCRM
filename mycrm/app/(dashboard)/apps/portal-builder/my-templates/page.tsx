"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { portalApi } from "@/lib/portal-api";
import {
  Loader2, Star, Trash2, Check, X, ChevronRight, Save,
  AlertCircle, Plus, CheckCircle,
} from "lucide-react";

type ApplyState = "idle" | "applying" | "done" | "error";

interface SavedTemplate {
  id: string;
  name: string;
  description?: string;
  category: string;
  createdAt: string;
  snapshot?: any;
}

function TemplateRow({ tpl, onDelete }: { tpl: SavedTemplate; onDelete: (id: string) => void }) {
  const router = useRouter();
  const [state, setState] = useState<ApplyState>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [deleting, setDeleting] = useState(false);

  const apply = async () => {
    setState("applying");
    setErrorMsg("");
    try {
      const result = await portalApi.post(`/portal/padmin/templates/${tpl.id}/apply`);
      setState("done");
      const createdPages: any[] = result.data.pages ?? [];
      setTimeout(() => {
        if (createdPages.length > 0) {
          router.push(`/apps/portal-builder/pages/${createdPages[0].id}`);
        } else {
          router.push("/apps/portal-builder/publish");
        }
      }, 700);
    } catch (e: any) {
      setState("error");
      setErrorMsg(e?.response?.data?.message ?? "Failed to apply template");
    }
  };

  const del = async () => {
    setDeleting(true);
    try {
      await portalApi.delete(`/portal/padmin/templates/${tpl.id}`);
      onDelete(tpl.id);
    } catch {}
    setDeleting(false);
  };

  const pageCount = tpl.snapshot?.pages?.length ?? 0;

  return (
    <div className="bg-gray-900 border border-gray-700 rounded-xl p-4 hover:border-gray-600 transition-colors">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-sm font-semibold text-white truncate">{tpl.name}</h3>
            <span className="text-xs px-2 py-0.5 rounded-full bg-gray-800 text-gray-400 shrink-0">{tpl.category}</span>
          </div>
          {tpl.description && (
            <p className="text-xs text-gray-500 mb-1 line-clamp-1">{tpl.description}</p>
          )}
          <p className="text-xs text-gray-700">
            Saved {new Date(tpl.createdAt).toLocaleDateString()}
            {pageCount > 0 && ` · ${pageCount} page${pageCount !== 1 ? "s" : ""}`}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {state === "error" && (
            <span className="text-xs text-red-400 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />{errorMsg}
            </span>
          )}
          {state === "done" ? (
            <span className="text-xs text-green-400 flex items-center gap-1">
              <CheckCircle className="w-3.5 h-3.5" />Applied!
            </span>
          ) : (
            <button
              onClick={apply}
              disabled={state === "applying"}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-medium rounded-lg transition-colors"
            >
              {state === "applying"
                ? <><Loader2 className="w-3 h-3 animate-spin" />Applying...</>
                : <><ChevronRight className="w-3 h-3" />Apply</>
              }
            </button>
          )}
          <button
            onClick={del}
            disabled={deleting || state === "applying"}
            className="p-1.5 text-gray-600 hover:text-red-400 hover:bg-red-900/20 rounded-lg transition-colors disabled:opacity-50"
            title="Delete template"
          >
            {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function MyTemplatesPage() {
  const [templates, setTemplates] = useState<SavedTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [pages, setPages] = useState<any[]>([]);
  const [showSaveForm, setShowSaveForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveForm, setSaveForm] = useState({
    name: "", description: "", category: "Custom",
    pageId: "", includeAllPages: false, includeMenus: true,
  });

  const load = () => {
    setLoading(true);
    portalApi.get("/portal/padmin/templates")
      .then(r => setTemplates((r.data ?? []).filter((t: any) => !t.isBuiltIn)))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    portalApi.get("/portal/padmin/pages").then(r => setPages(r.data ?? [])).catch(() => {});
  }, []);

  const handleSave = async () => {
    if (!saveForm.name.trim()) { setSaveError("Name is required"); return; }
    setSaving(true);
    setSaveError("");
    try {
      await portalApi.post("/portal/padmin/templates", {
        name: saveForm.name.trim(),
        description: saveForm.description || undefined,
        category: saveForm.category,
        pageId: saveForm.pageId || undefined,
        includeAllPages: saveForm.includeAllPages,
        includeMenus: saveForm.includeMenus,
      });
      setSaveSuccess(true);
      load();
      setTimeout(() => {
        setShowSaveForm(false);
        setSaveSuccess(false);
        setSaveForm({ name: "", description: "", category: "Custom", pageId: "", includeAllPages: false, includeMenus: true });
      }, 1200);
    } catch (e: any) {
      setSaveError(e?.response?.data?.message ?? "Failed to save template");
    }
    setSaving(false);
  };

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-white flex items-center gap-2">
            <Star className="w-5 h-5 text-amber-400" />
            My Templates
          </h1>
          <p className="text-sm text-gray-400 mt-0.5">Save your current portal setup as a reusable template, or apply a saved template.</p>
        </div>
        <button
          onClick={() => { setShowSaveForm(v => !v); setSaveError(""); setSaveSuccess(false); }}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          Save Portal as Template
        </button>
      </div>

      {/* Save form */}
      {showSaveForm && (
        <div className="bg-gray-900 border border-gray-700 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-white">Capture Current Portal as Template</h2>
            <button onClick={() => setShowSaveForm(false)} className="text-gray-500 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-400 mb-1.5">Template Name *</label>
              <input
                value={saveForm.name}
                onChange={e => setSaveForm(f => ({ ...f, name: e.target.value }))}
                autoFocus
                placeholder="e.g. My Student Portal"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1.5">Category</label>
              <input
                value={saveForm.category}
                onChange={e => setSaveForm(f => ({ ...f, category: e.target.value }))}
                placeholder="e.g. Education, HR, Custom"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-xs text-gray-400 mb-1.5">Description (optional)</label>
              <input
                value={saveForm.description}
                onChange={e => setSaveForm(f => ({ ...f, description: e.target.value }))}
                placeholder="Describe what this template is for..."
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-xs text-gray-400 font-medium">What to capture</p>
            <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-300">
              <input
                type="checkbox"
                checked={saveForm.includeAllPages}
                onChange={e => setSaveForm(f => ({ ...f, includeAllPages: e.target.checked, pageId: e.target.checked ? "" : f.pageId }))}
                className="rounded accent-indigo-500"
              />
              Include all pages (full portal snapshot)
            </label>
            {!saveForm.includeAllPages && (
              <div>
                <label className="block text-xs text-gray-400 mb-1.5">Or save a single page</label>
                <select
                  value={saveForm.pageId}
                  onChange={e => setSaveForm(f => ({ ...f, pageId: e.target.value }))}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="">— Blank template (no pages) —</option>
                  {pages.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
                </select>
              </div>
            )}
            <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-300">
              <input
                type="checkbox"
                checked={saveForm.includeMenus}
                onChange={e => setSaveForm(f => ({ ...f, includeMenus: e.target.checked }))}
                className="rounded accent-indigo-500"
              />
              Include current navigation menu
            </label>
          </div>

          {saveError && (
            <p className="text-xs text-red-400 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />{saveError}
            </p>
          )}

          <div className="flex gap-2">
            <button
              onClick={handleSave}
              disabled={saving || saveSuccess}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
            >
              {saveSuccess
                ? <><CheckCircle className="w-4 h-4 text-green-300" />Saved!</>
                : saving
                  ? <><Loader2 className="w-4 h-4 animate-spin" />Saving...</>
                  : <><Save className="w-4 h-4" />Save Template</>
              }
            </button>
            <button onClick={() => setShowSaveForm(false)} className="px-4 py-2 text-gray-400 hover:text-white text-sm rounded-lg">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Saved templates list */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-5 h-5 animate-spin text-indigo-400" />
        </div>
      ) : templates.length === 0 ? (
        <div className="bg-gray-900 border border-gray-800 rounded-xl py-16 text-center">
          <Star className="w-10 h-10 text-gray-800 mx-auto mb-3" />
          <p className="text-sm text-gray-500 font-medium">No saved templates yet</p>
          <p className="text-xs text-gray-600 mt-1">Click "Save Portal as Template" to capture your current portal setup.</p>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-xs text-gray-600 font-medium uppercase tracking-wider">{templates.length} saved template{templates.length !== 1 ? "s" : ""}</p>
          {templates.map(tpl => (
            <TemplateRow
              key={tpl.id}
              tpl={tpl}
              onDelete={id => setTemplates(prev => prev.filter(t => t.id !== id))}
            />
          ))}
        </div>
      )}
    </div>
  );
}
