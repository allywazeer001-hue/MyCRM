"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Plus, FileText, Trash2, ExternalLink, MoreHorizontal,
  Edit3, Share2, Loader2, Search, Copy, CheckCheck,
  FolderOpen, FolderX, X, LayoutGrid, List,
  ChevronDown,
} from "lucide-react";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Building2, Check, Users as UsersIcon } from "lucide-react";

const CARD_PALETTES = [
  { grad: "from-violet-500 to-indigo-500" },
  { grad: "from-indigo-500 to-blue-500"  },
  { grad: "from-blue-500 to-cyan-500"    },
  { grad: "from-teal-500 to-emerald-500" },
  { grad: "from-emerald-500 to-green-500"},
  { grad: "from-pink-500 to-rose-500"    },
  { grad: "from-amber-500 to-orange-500" },
  { grad: "from-fuchsia-500 to-purple-500"},
];

function FormDocIcon() {
  return (
    <svg width="30" height="30" viewBox="0 0 24 24" fill="none">
      <rect x="3" y="2" width="18" height="20" rx="4" fill="white" opacity="0.9" />
      <rect x="7" y="7"  width="10" height="2.5" rx="1.25" fill="currentColor" opacity="0.45" />
      <rect x="7" y="11" width="7"  height="2"   rx="1"    fill="currentColor" opacity="0.35" />
      <rect x="7" y="15" width="8.5" height="2"  rx="1"    fill="currentColor" opacity="0.35" />
    </svg>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function CloudFormsHome() {
  const router       = useRouter();
  const searchParams = useSearchParams();

  const [forms,      setForms]      = useState<any[]>([]);
  const [modules,    setModules]    = useState<any[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [creating,   setCreating]   = useState(false);
  const [search,     setSearch]     = useState("");
  const [openMenu,   setOpenMenu]   = useState<string | null>(null);
  const [copied,     setCopied]     = useState<string | null>(null);
  const [viewMode,   setViewMode]   = useState<"grid" | "list">("grid");

  // Share panel state
  const [shareForm,    setShareForm]    = useState<{ id: string; name: string } | null>(null);
  const [shareTab,     setShareTab]     = useState<"users" | "depts">("users");
  const [shareLoading, setShareLoading] = useState(false);
  const [shareSaving,  setShareSaving]  = useState(false);
  const [shareUsers,   setShareUsers]   = useState<any[]>([]);
  const [shareDepts,   setShareDepts]   = useState<any[]>([]);
  const [sharedUsers,  setSharedUsers]  = useState<string[]>([]);
  const [sharedDepts,  setSharedDepts]  = useState<string[]>([]);
  const [shareSearch,  setShareSearch]  = useState("");

  useEffect(() => {
    if (!shareForm) return;
    setShareLoading(true); setShareSearch(""); setShareTab("users");
    Promise.all([
      api.get(`/forms/${shareForm.id}/sharing`),
      api.get("/users?limit=200"),
      api.get("/departments"),
    ]).then(([s, u, d]) => {
      setSharedUsers(s.data?.sharedUsers ?? []);
      setSharedDepts(s.data?.sharedDepts ?? []);
      setShareUsers(u.data?.data ?? u.data ?? []);
      setShareDepts(d.data ?? []);
    }).catch(() => {}).finally(() => setShareLoading(false));
  }, [shareForm?.id]);

  const handleShareSave = async () => {
    if (!shareForm) return;
    setShareSaving(true);
    try {
      await api.patch(`/forms/${shareForm.id}/sharing`, { sharedUsers, sharedDepts });
      setShareForm(null);
    } catch { setShareSaving(false); }
  };

  // Folder picker state
  const [showFolderPicker, setShowFolderPicker] = useState<string | null>(null);
  const [folders,          setFolders]          = useState<{ id: string; name: string; color: string }[]>([]);
  const [foldersLoading,   setFoldersLoading]   = useState(false);
  const [foldersError,     setFoldersError]     = useState(false);
  const [movingTo,         setMovingTo]         = useState<string | null>(null);
  const [folderToast,      setFolderToast]      = useState<string | null>(null);
  const [formData,   setFormData]   = useState({
    name: "", description: "", moduleId: "", type: "INTERNAL",
  });

  useEffect(() => {
    if (searchParams.get("new") === "1") setShowCreate(true);
  }, [searchParams]);

  useEffect(() => {
    Promise.all([api.get("/forms"), api.get("/modules")])
      .then(([f, m]) => { setForms(f.data || []); setModules(m.data || []); })
      .finally(() => setLoading(false));
  }, []);

  const createForm = async () => {
    if (!formData.name.trim()) return;
    setCreating(true);
    try {
      const { data } = await api.post("/forms", formData);
      setForms((prev: any[]) => [...prev, data]);
      setShowCreate(false);
      setFormData({ name: "", description: "", moduleId: "", type: "INTERNAL" });
      window.open(`/cloudforms/forms/${data.id}/builder`, '_blank');
    } catch {
    } finally {
      setCreating(false);
    }
  };

  const deleteForm = async (id: string) => {
    if (!confirm("Delete this form?")) return;
    await api.delete(`/forms/${id}`);
    setForms(prev => prev.filter(f => f.id !== id));
    setOpenMenu(null);
  };

  const copyLink = (token: string, id: string) => {
    navigator.clipboard.writeText(`${window.location.origin}/f/${token}`);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const openFolderPicker = async (formId: string) => {
    setOpenMenu(null);
    setShowFolderPicker(formId);
    if (folders.length === 0 && !foldersError) {
      setFoldersLoading(true);
      try {
        const { data } = await api.get("/forms/folders");
        setFolders(data || []);
      } catch {
        setFoldersError(true);
      } finally {
        setFoldersLoading(false);
      }
    }
  };

  const moveToFolder = async (formId: string, folderId: string | null, folderName?: string) => {
    setMovingTo(folderId ?? "__none__");
    try {
      await api.patch(`/forms/${formId}`, { folderId });
      setShowFolderPicker(null);
      setMovingTo(null);
      if (folderName) {
        setFolderToast(`Moved to ${folderName}`);
        setTimeout(() => setFolderToast(null), 2500);
      }
    } catch {
      setMovingTo(null);
    }
  };

  const filtered = forms.filter(f =>
    f.name.toLowerCase().includes(search.toLowerCase())
  );

  const menuActions = (f: any) => [
    {
      Icon: Edit3, label: "Edit Builder", danger: false,
      action: () => { setOpenMenu(null); window.open(`/cloudforms/forms/${f.id}/builder`, '_blank'); },
    },
    {
      Icon: Share2, label: "Share Access", danger: false,
      action: () => { setOpenMenu(null); setShareForm({ id: f.id, name: f.name }); },
    },
    ...(f.token ? [{
      Icon: copied === f.id ? CheckCheck : Copy,
      label: copied === f.id ? "Copied!" : "Copy Link", danger: false,
      action: () => copyLink(f.token, f.id),
    }] : []),
    {
      Icon: FolderOpen, label: "Move to Folder", danger: false,
      action: () => openFolderPicker(f.id),
    },
    {
      Icon: Trash2, label: "Delete", danger: true,
      action: () => deleteForm(f.id),
    },
  ];

  return (
    <div className="flex flex-col h-full overflow-hidden">

      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3.5 shrink-0" style={{ borderBottom: "1px solid #f1f5f9" }}>
        <div>
          <h1 className="text-[15px] font-bold text-slate-800">My Forms</h1>
          <p className="text-[11px] text-slate-400 mt-0.5">Build, share and collect responses</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="cf-create-btn flex items-center gap-1.5 px-4 py-2 rounded-xl text-[12px] font-bold text-white transition-all duration-200"
          style={{ background: "linear-gradient(135deg, #7c3aed, #4f46e5)", boxShadow: "0 3px 12px rgba(124,58,237,0.35)" }}
        >
          <Plus className="w-3.5 h-3.5" />
          New Form
        </button>
      </div>

      {/* Search + view toggle */}
      <div className="flex items-center gap-2 px-5 py-3 shrink-0" style={{ borderBottom: "1px solid #f8fafc" }}>
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search forms…"
            className="w-full pl-8 pr-3 py-2 text-[12px] rounded-xl outline-none transition-all"
            style={{ background: "#f8f7ff", border: "1.5px solid #ede9fe", color: "#1e1b4b" }}
            onFocus={e => { e.currentTarget.style.borderColor = "#a78bfa"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(167,139,250,0.15)"; }}
            onBlur={e  => { e.currentTarget.style.borderColor = "#ede9fe";  e.currentTarget.style.boxShadow = "none"; }}
          />
        </div>
        {/* View toggle */}
        <div className="flex items-center rounded-xl overflow-hidden shrink-0" style={{ border: "1.5px solid #ede9fe", background: "#f8f7ff" }}>
          <button
            onClick={() => setViewMode("grid")}
            className={cn("p-2 transition-all", viewMode === "grid" ? "text-white" : "text-slate-400 hover:text-violet-500")}
            style={viewMode === "grid" ? { background: "linear-gradient(135deg, #7c3aed, #4f46e5)" } : {}}
            title="Grid view"
          >
            <LayoutGrid className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setViewMode("list")}
            className={cn("p-2 transition-all", viewMode === "list" ? "text-white" : "text-slate-400 hover:text-violet-500")}
            style={viewMode === "list" ? { background: "linear-gradient(135deg, #7c3aed, #4f46e5)" } : {}}
            title="List view"
          >
            <List className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Forms */}
      <div className="flex-1 overflow-auto p-5">

        {loading && (
          <div className="flex items-center justify-center h-48">
            <Loader2 className="w-6 h-6 animate-spin text-violet-400" />
          </div>
        )}

        {!loading && filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center h-56 text-center">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4" style={{ background: "linear-gradient(135deg, #ede9fe, #e0e7ff)" }}>
              <FileText className="w-8 h-8 text-violet-400" />
            </div>
            <p className="font-bold text-slate-700 text-[15px]">
              {search ? "No matching forms" : "No forms yet"}
            </p>
            <p className="text-slate-400 text-[12px] mt-1 mb-5">
              {search ? "Try a different search term" : "Create your first form to get started"}
            </p>
            {!search && (
              <button
                onClick={() => setShowCreate(true)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[12px] font-bold text-white"
                style={{ background: "linear-gradient(135deg, #7c3aed, #4f46e5)", boxShadow: "0 3px 10px rgba(124,58,237,0.3)" }}
              >
                <Plus className="w-3.5 h-3.5" />
                Create Form
              </button>
            )}
          </div>
        )}

        {/* ── Grid view ── */}
        {!loading && filtered.length > 0 && viewMode === "grid" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.map((f, i) => {
              const pal = CARD_PALETTES[i % CARD_PALETTES.length];
              return (
                <div
                  key={f.id}
                  className="cf-form-card group bg-white rounded-2xl overflow-hidden cursor-pointer relative"
                  style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.06)", border: "1.5px solid #f1f5f9" }}
                  onClick={() => window.open(`/cloudforms/forms/${f.id}/builder`, '_blank')}
                >
                  <div className={cn("h-[80px] bg-gradient-to-br flex items-center justify-center relative", pal.grad)}>
                    <FormDocIcon />
                    <button
                      className="absolute top-2 right-2 w-6 h-6 rounded-lg flex items-center justify-center transition-all hover:bg-white/20"
                      style={{ color: "rgba(255,255,255,0.9)" }}
                      onClick={e => { e.stopPropagation(); setOpenMenu(openMenu === f.id ? null : f.id); }}
                    >
                      <MoreHorizontal className="w-3.5 h-3.5" />
                    </button>

                    {openMenu === f.id && (
                      <>
                        <div className="fixed inset-0 z-10" onClick={e => { e.stopPropagation(); setOpenMenu(null); }} />
                        <div
                          className="absolute top-8 right-2 z-20 bg-white rounded-xl overflow-hidden text-left"
                          style={{ boxShadow: "0 8px 28px rgba(0,0,0,0.14)", width: 168, border: "1px solid #f1f5f9" }}
                          onClick={e => e.stopPropagation()}
                        >
                          {menuActions(f).map(item => (
                            <button
                              key={item.label}
                              onClick={item.action}
                              className={cn(
                                "w-full flex items-center gap-2.5 px-3.5 py-2.5 text-[12px] font-medium transition-colors",
                                item.danger ? "text-red-500 hover:bg-red-50" : "text-slate-600 hover:bg-slate-50"
                              )}
                            >
                              <item.Icon className="w-3.5 h-3.5" />
                              {item.label}
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                  </div>

                  <div className="p-3.5">
                    <h3 className="font-bold text-slate-800 text-[12.5px] truncate">{f.name}</h3>
                    {f.description && <p className="text-[11px] text-slate-400 mt-0.5 truncate">{f.description}</p>}
                    <div className="flex items-center justify-between mt-2.5">
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: "#f5f3ff", color: "#7c3aed" }}>
                        {f.type === "MODULE" ? "Module" : "Standalone"}
                      </span>
                      {f.token && (
                        <a
                          href={`/f/${f.token}`}
                          target="_blank"
                          rel="noreferrer"
                          onClick={e => e.stopPropagation()}
                          className="text-slate-400 hover:text-violet-600 transition-colors"
                          title="Preview"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── List view ── */}
        {!loading && filtered.length > 0 && viewMode === "list" && (
          <div className="space-y-1.5">
            {filtered.map((f, i) => {
              const pal = CARD_PALETTES[i % CARD_PALETTES.length];
              return (
                <div
                  key={f.id}
                  className="cf-list-row group flex items-center gap-3 px-3.5 py-3 bg-white rounded-xl cursor-pointer transition-all"
                  style={{ border: "1.5px solid #f1f5f9", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
                  onClick={() => window.open(`/cloudforms/forms/${f.id}/builder`, '_blank')}
                >
                  {/* Color bar */}
                  <div className={cn("w-1.5 h-10 rounded-full bg-gradient-to-b shrink-0", pal.grad)} />

                  {/* Icon */}
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: "linear-gradient(135deg, #ede9fe, #e0e7ff)" }}>
                    <FileText className="w-4 h-4 text-violet-500" />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-slate-800 text-[13px] truncate">{f.name}</p>
                    {f.description && <p className="text-[11px] text-slate-400 truncate">{f.description}</p>}
                  </div>

                  {/* Meta */}
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="hidden sm:inline text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: "#f5f3ff", color: "#7c3aed" }}>
                      {f.type === "MODULE" ? "Module" : "Standalone"}
                    </span>
                    {f.token && (
                      <a
                        href={`/f/${f.token}`}
                        target="_blank"
                        rel="noreferrer"
                        onClick={e => e.stopPropagation()}
                        className="text-slate-400 hover:text-violet-600 transition-colors"
                        title="Preview"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                    <button
                      className="w-6 h-6 rounded-lg flex items-center justify-center transition-all text-slate-400 hover:bg-slate-100 relative"
                      onClick={e => { e.stopPropagation(); setOpenMenu(openMenu === f.id ? null : f.id); }}
                    >
                      <MoreHorizontal className="w-3.5 h-3.5" />

                      {openMenu === f.id && (
                        <>
                          <div className="fixed inset-0 z-10" onClick={e => { e.stopPropagation(); setOpenMenu(null); }} />
                          <div
                            className="absolute top-7 right-0 z-20 bg-white rounded-xl overflow-hidden text-left"
                            style={{ boxShadow: "0 8px 28px rgba(0,0,0,0.14)", width: 168, border: "1px solid #f1f5f9" }}
                            onClick={e => e.stopPropagation()}
                          >
                            {menuActions(f).map(item => (
                              <button
                                key={item.label}
                                onClick={item.action}
                                className={cn(
                                  "w-full flex items-center gap-2.5 px-3.5 py-2.5 text-[12px] font-medium transition-colors",
                                  item.danger ? "text-red-500 hover:bg-red-50" : "text-slate-600 hover:bg-slate-50"
                                )}
                              >
                                <item.Icon className="w-3.5 h-3.5" />
                                {item.label}
                              </button>
                            ))}
                          </div>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Create form modal ── */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0" style={{ background: "rgba(30,27,75,0.5)", backdropFilter: "blur(4px)" }} onClick={() => setShowCreate(false)} />
          <div className="relative bg-white rounded-2xl p-6 w-full max-w-md" style={{ boxShadow: "0 24px 64px rgba(30,27,75,0.25)" }}>
            <div className="flex items-center gap-3 mb-5">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white" style={{ background: "linear-gradient(135deg, #7c3aed, #4f46e5)" }}>
                <FileText className="w-4.5 h-4.5" />
              </div>
              <div>
                <h2 className="text-[15px] font-bold text-slate-800">Create New Form</h2>
                <p className="text-[11px] text-slate-400">Fill in the details below</p>
              </div>
            </div>

            <div className="space-y-3.5">
              <div>
                <label className="text-[11px] font-bold text-slate-600 mb-1.5 block">Form Name *</label>
                <input
                  autoFocus
                  value={formData.name}
                  onChange={e => setFormData(p => ({ ...p, name: e.target.value }))}
                  placeholder="e.g. Customer Feedback Survey"
                  onKeyDown={e => e.key === "Enter" && createForm()}
                  className="w-full px-3.5 py-2.5 rounded-xl text-[13px] outline-none transition-all"
                  style={{ border: "1.5px solid #ede9fe", background: "#faf9ff", color: "#1e1b4b" }}
                  onFocus={e => { e.currentTarget.style.borderColor = "#a78bfa"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(167,139,250,0.15)"; }}
                  onBlur={e  => { e.currentTarget.style.borderColor = "#ede9fe";  e.currentTarget.style.boxShadow = "none"; }}
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-slate-600 mb-1.5 block">Description</label>
                <input
                  value={formData.description}
                  onChange={e => setFormData(p => ({ ...p, description: e.target.value }))}
                  placeholder="Optional description"
                  className="w-full px-3.5 py-2.5 rounded-xl text-[13px] outline-none transition-all"
                  style={{ border: "1.5px solid #ede9fe", background: "#faf9ff", color: "#1e1b4b" }}
                  onFocus={e => { e.currentTarget.style.borderColor = "#a78bfa"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(167,139,250,0.15)"; }}
                  onBlur={e  => { e.currentTarget.style.borderColor = "#ede9fe";  e.currentTarget.style.boxShadow = "none"; }}
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-slate-600 mb-1.5 block">Form Type</label>
                <select
                  value={formData.type}
                  onChange={e => setFormData(p => ({ ...p, type: e.target.value, moduleId: "" }))}
                  className="w-full px-3.5 py-2.5 rounded-xl text-[13px] outline-none transition-all bg-white"
                  style={{ border: "1.5px solid #ede9fe", color: "#1e1b4b" }}
                >
                  <option value="INTERNAL">Standalone Form</option>
                  <option value="MODULE">Linked to Module</option>
                </select>
              </div>
              {formData.type === "MODULE" && (
                <div>
                  <label className="text-[11px] font-bold text-slate-600 mb-1.5 block">Module</label>
                  <select
                    value={formData.moduleId}
                    onChange={e => setFormData(p => ({ ...p, moduleId: e.target.value }))}
                    className="w-full px-3.5 py-2.5 rounded-xl text-[13px] outline-none bg-white"
                    style={{ border: "1.5px solid #ede9fe", color: "#1e1b4b" }}
                  >
                    <option value="">Select a module</option>
                    {modules.map((m: any) => <option key={m.id} value={m.id}>{m.name}</option>)}
                  </select>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2.5 mt-6">
              <button onClick={() => setShowCreate(false)} className="px-4 py-2 rounded-xl text-[12px] font-semibold text-slate-500 hover:bg-slate-100 transition-colors">
                Cancel
              </button>
              <button
                onClick={createForm}
                disabled={!formData.name.trim() || creating}
                className="flex items-center gap-2 px-5 py-2 rounded-xl text-[12px] font-bold text-white transition-all disabled:opacity-50"
                style={{ background: "linear-gradient(135deg, #7c3aed, #4f46e5)", boxShadow: creating ? "none" : "0 4px 14px rgba(124,58,237,0.35)" }}
              >
                {creating && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                {creating ? "Creating…" : "Create Form"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Folder picker modal ── */}
      {showFolderPicker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.4)" }} onClick={() => setShowFolderPicker(null)}>
          <div className="bg-white rounded-2xl shadow-2xl p-4 w-64 max-h-80 overflow-y-auto relative" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-[12px] font-bold text-slate-700">Move to Folder</span>
              <button onClick={() => setShowFolderPicker(null)} className="w-5 h-5 flex items-center justify-center rounded-md hover:bg-slate-100 text-slate-400">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            {foldersLoading && <div className="flex items-center justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-violet-400" /></div>}
            {!foldersLoading && foldersError && <p className="text-[12px] text-slate-400 text-center py-4">Could not load folders</p>}
            {!foldersLoading && !foldersError && (
              <div className="flex flex-col gap-0.5">
                <button
                  disabled={movingTo !== null}
                  onClick={() => moveToFolder(showFolderPicker, null)}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-slate-50 cursor-pointer text-sm text-slate-500 w-full transition-colors disabled:opacity-50"
                >
                  <FolderX className="w-3 h-3 shrink-0" />
                  <span className="text-[12px]">Remove from folder</span>
                  {movingTo === "__none__" && <Loader2 className="w-3 h-3 animate-spin ml-auto" />}
                </button>
                {folders.map(folder => (
                  <button
                    key={folder.id}
                    disabled={movingTo !== null}
                    onClick={() => moveToFolder(showFolderPicker, folder.id, folder.name)}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-slate-50 cursor-pointer text-sm w-full transition-colors disabled:opacity-50"
                  >
                    <span className="w-3 h-3 rounded-full shrink-0" style={{ background: folder.color }} />
                    <span className="text-[12px] text-slate-700 truncate">{folder.name}</span>
                    {movingTo === folder.id && <Loader2 className="w-3 h-3 animate-spin ml-auto text-violet-400" />}
                  </button>
                ))}
                {folders.length === 0 && <p className="text-[12px] text-slate-400 text-center py-2">No folders yet</p>}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Share panel ── */}
      {shareForm && (
        <>
        <div className="fixed inset-0 z-40 bg-black/30" onClick={() => setShareForm(null)} />
        <div className="fixed z-50 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[calc(100vw-2rem)] max-w-[300px] rounded-2xl bg-white flex flex-col overflow-hidden"
          style={{ boxShadow: "0 4px 24px rgba(0,0,0,0.2)", border: "1px solid #ede9fe", maxHeight: "80vh" }}>

          {/* Header */}
          <div className="flex items-center gap-2 px-3 pt-3 pb-2.5 shrink-0" style={{ borderBottom: "1px solid #f1f5f9" }}>
            <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white shrink-0"
              style={{ background: "linear-gradient(135deg,#7c3aed,#4f46e5)" }}>
              <Share2 className="w-3.5 h-3.5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-bold text-slate-700 leading-tight">Share Form</p>
              <p className="text-[9px] text-slate-400 truncate">{shareForm.name}</p>
            </div>
            <button onClick={() => setShareForm(null)}
              className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 transition-colors shrink-0">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {shareLoading ? (
            <div className="flex items-center justify-center flex-1">
              <div className="w-5 h-5 rounded-full border-2 animate-spin" style={{ borderColor: "#ede9fe", borderTopColor: "#7c3aed" }} />
            </div>
          ) : (
            <div className="flex flex-col flex-1 min-h-0">
              {/* Tabs */}
              <div className="flex border-b border-slate-100 px-1.5 pt-1.5 shrink-0">
                {([
                  { key: "users" as const, label: "Users",       Icon: UsersIcon },
                  { key: "depts" as const, label: "Departments", Icon: Building2 },
                ]).map(({ key, label, Icon }) => (
                  <button key={key} onClick={() => setShareTab(key)}
                    className={cn(
                      "flex items-center gap-1 px-2 py-1.5 text-[10px] font-semibold rounded-t-lg transition-colors",
                      shareTab === key ? "text-violet-700 border-b-2 border-violet-600" : "text-slate-500 hover:text-slate-700"
                    )}>
                    <Icon className="w-3 h-3" />{label}
                    {key === "depts" && sharedDepts.length > 0 && (
                      <span className="w-3.5 h-3.5 rounded-full text-[8px] font-bold text-white flex items-center justify-center ml-0.5" style={{ background: "#7c3aed" }}>{sharedDepts.length}</span>
                    )}
                    {key === "users" && sharedUsers.length > 0 && (
                      <span className="w-3.5 h-3.5 rounded-full text-[8px] font-bold text-white flex items-center justify-center ml-0.5" style={{ background: "#7c3aed" }}>{sharedUsers.length}</span>
                    )}
                  </button>
                ))}
              </div>

              {/* List */}
              <div className="flex-1 overflow-y-auto px-2.5 py-2">
                {shareTab === "users" && <>
                  <div className="relative mb-2">
                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-2.5 h-2.5 text-slate-400" />
                    <input value={shareSearch} onChange={e => setShareSearch(e.target.value)} placeholder="Search…"
                      className="w-full pl-6 pr-2 py-1.5 text-[11px] rounded-lg outline-none"
                      style={{ border: "1.5px solid #ede9fe", background: "#f8f7ff" }} />
                  </div>
                  <div className="space-y-1">
                    {shareUsers.filter(u => `${u.firstName} ${u.lastName} ${u.email}`.toLowerCase().includes(shareSearch.toLowerCase())).slice(0, 50).map((u: any) => (
                      <button key={u.id}
                        onClick={() => setSharedUsers(p => p.includes(u.id) ? p.filter(x => x !== u.id) : [...p, u.id])}
                        className={cn("w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left transition-all",
                          sharedUsers.includes(u.id) ? "text-violet-700" : "text-slate-600 hover:bg-slate-50")}
                        style={sharedUsers.includes(u.id) ? { background: "#f5f3ff", border: "1px solid #c4b5fd" } : { border: "1px solid #f1f5f9" }}>
                        <div className="w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold text-white shrink-0"
                          style={{ background: "linear-gradient(135deg,#7c3aed,#4f46e5)" }}>
                          {u.firstName?.[0]}{u.lastName?.[0]}
                        </div>
                        <span className="text-[10px] font-medium truncate flex-1">{u.firstName} {u.lastName}</span>
                        {sharedUsers.includes(u.id) && <Check className="w-3 h-3 text-violet-600 shrink-0" />}
                      </button>
                    ))}
                  </div>
                </>}
                {shareTab === "depts" && (
                  <div className="space-y-1">
                    {shareDepts.map((d: any) => (
                      <button key={d.id}
                        onClick={() => setSharedDepts(p => p.includes(d.id) ? p.filter(x => x !== d.id) : [...p, d.id])}
                        className={cn("w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left transition-all",
                          sharedDepts.includes(d.id) ? "text-violet-700" : "text-slate-600 hover:bg-slate-50")}
                        style={sharedDepts.includes(d.id) ? { background: "#f5f3ff", border: "1px solid #c4b5fd" } : { border: "1px solid #f1f5f9" }}>
                        <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: d.color || "#7c3aed" }} />
                        <span className="text-[10px] font-medium truncate flex-1">{d.name}</span>
                        {sharedDepts.includes(d.id) && <Check className="w-3 h-3 text-violet-600 shrink-0" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="px-2.5 py-2.5 shrink-0" style={{ borderTop: "1px solid #f1f5f9" }}>
                <p className="text-[9px] text-slate-400 mb-2">
                  {sharedDepts.length === 0 && sharedUsers.length === 0 ? "Owner only" :
                    [sharedDepts.length > 0 && `${sharedDepts.length} dept${sharedDepts.length > 1 ? "s" : ""}`,
                     sharedUsers.length > 0 && `${sharedUsers.length} user${sharedUsers.length > 1 ? "s" : ""}`]
                    .filter(Boolean).join(" · ")}
                </p>
                <div className="flex gap-1.5">
                  <button onClick={() => setShareForm(null)}
                    className="flex-1 py-1.5 rounded-lg text-[10px] font-semibold text-slate-500 hover:bg-slate-100 transition-colors">
                    Cancel
                  </button>
                  <button onClick={handleShareSave} disabled={shareSaving}
                    className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-[10px] font-bold text-white disabled:opacity-50"
                    style={{ background: "linear-gradient(135deg,#7c3aed,#4f46e5)" }}>
                    {shareSaving && <Loader2 className="w-2.5 h-2.5 animate-spin" />}
                    {shareSaving ? "Saving…" : "Save"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
        </>
      )}

      {/* ── Toast ── */}
      {folderToast && (
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-xl text-[12px] font-semibold text-white shadow-lg" style={{ background: "linear-gradient(135deg, #7c3aed, #4f46e5)" }}>
          {folderToast}
        </div>
      )}

      <style jsx global>{`
        .cf-form-card:hover  { transform: translateY(-3px); box-shadow: 0 8px 28px rgba(0,0,0,0.11) !important; border-color: #e0d9f7 !important; }
        .cf-create-btn:hover { transform: translateY(-1px); box-shadow: 0 6px 20px rgba(124,58,237,0.45) !important; }
        .cf-list-row:hover   { transform: translateY(-1px); border-color: #e0d9f7 !important; box-shadow: 0 4px 14px rgba(0,0,0,0.08) !important; }
      `}</style>
    </div>
  );
}
