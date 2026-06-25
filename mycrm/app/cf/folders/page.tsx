"use client";
import { useState, useEffect } from "react";
import { FolderOpen, Plus, Search, FileText, ChevronRight, Pencil, Trash2, X, Check } from "lucide-react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

interface Folder {
  id: string;
  name: string;
  description?: string;
  color: string;
  createdById: string;
  createdAt: string;
  _count?: { forms: number };
}

interface Form {
  id: string;
  name: string;
  description?: string;
  type?: string;
}

const COLOR_PRESETS = ["#7c3aed", "#0891b2", "#059669", "#d97706", "#e11d48", "#2563eb"];

export default function MyFoldersPage() {
  const router = useRouter();
  const [folders, setFolders] = useState<Folder[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [folderForms, setFolderForms] = useState<Record<string, Form[]>>({});
  const [newFolderName, setNewFolderName] = useState("");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedColor, setSelectedColor] = useState(COLOR_PRESETS[0]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [search, setSearch] = useState("");
  const [loadingForms, setLoadingForms] = useState<string | null>(null);

  useEffect(() => {
    api.get("/forms/folders")
      .then((r) => setFolders(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filteredFolders = folders.filter((f) =>
    f.name.toLowerCase().includes(search.toLowerCase())
  );

  async function toggleExpand(folderId: string) {
    if (expandedId === folderId) { setExpandedId(null); return; }
    setExpandedId(folderId);
    if (!folderForms[folderId]) {
      setLoadingForms(folderId);
      try {
        const r = await api.get(`/forms/folders/${folderId}/forms`);
        setFolderForms((prev) => ({ ...prev, [folderId]: r.data }));
      } catch {
        setFolderForms((prev) => ({ ...prev, [folderId]: [] }));
      } finally {
        setLoadingForms(null);
      }
    }
  }

  async function handleCreate() {
    if (!newFolderName.trim()) return;
    setCreating(true);
    try {
      const r = await api.post("/forms/folders", { name: newFolderName.trim(), color: selectedColor });
      setFolders((prev) => [r.data, ...prev]);
      setNewFolderName("");
      setSelectedColor(COLOR_PRESETS[0]);
      setShowCreateForm(false);
    } catch {
    } finally {
      setCreating(false);
    }
  }

  async function handleRename(folder: Folder) {
    const trimmed = editName.trim();
    if (!trimmed || trimmed === folder.name) { setEditingId(null); return; }
    try {
      const r = await api.patch(`/forms/folders/${folder.id}`, { name: trimmed });
      setFolders((prev) => prev.map((f) => (f.id === folder.id ? { ...f, name: r.data.name ?? trimmed } : f)));
    } catch {
    } finally {
      setEditingId(null);
    }
  }

  async function handleDelete(folderId: string, folderName: string) {
    if (!window.confirm(`Delete folder "${folderName}"? Forms inside will not be deleted.`)) return;
    try {
      await api.delete(`/forms/folders/${folderId}`);
      setFolders((prev) => prev.filter((f) => f.id !== folderId));
      if (expandedId === folderId) setExpandedId(null);
    } catch {}
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3.5 shrink-0" style={{ borderBottom: "1px solid #f1f5f9" }}>
        <div>
          <h1 className="text-[15px] font-bold text-slate-800">My Folders</h1>
          <p className="text-[11px] text-slate-400 mt-0.5">{folders.length} {folders.length === 1 ? "folder" : "folders"}</p>
        </div>
        <button
          onClick={() => setShowCreateForm(true)}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[12px] font-bold text-white transition-all duration-200"
          style={{ background: "linear-gradient(135deg, #7c3aed, #4f46e5)", boxShadow: "0 3px 12px rgba(124,58,237,0.35)" }}
        >
          <Plus className="w-3.5 h-3.5" />
          New Folder
        </button>
      </div>

      {/* Search */}
      <div className="px-5 py-3 shrink-0" style={{ borderBottom: "1px solid #f8fafc" }}>
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search folders…"
            className="w-full pl-8 pr-3 py-2 text-[12px] rounded-xl outline-none transition-all"
            style={{ background: "#f8f7ff", border: "1.5px solid #ede9fe", color: "#1e1b4b" }}
            onFocus={e => { e.currentTarget.style.borderColor = "#a78bfa"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(167,139,250,0.15)"; }}
            onBlur={e  => { e.currentTarget.style.borderColor = "#ede9fe";  e.currentTarget.style.boxShadow = "none"; }}
          />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-5 space-y-2">
        {/* Inline create form */}
        {showCreateForm && (
          <div className="p-4 rounded-xl mb-2" style={{ background: "#faf9ff", border: "1.5px solid #ede9fe" }}>
            <p className="text-[11px] font-bold text-slate-600 mb-2">New Folder</p>
            <input
              autoFocus
              className="w-full px-3 py-2 rounded-xl text-[13px] outline-none mb-3 transition-all"
              style={{ border: "1.5px solid #ede9fe", background: "white", color: "#1e1b4b" }}
              placeholder="Folder name…"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleCreate();
                if (e.key === "Escape") setShowCreateForm(false);
              }}
              onFocus={e => { e.currentTarget.style.borderColor = "#a78bfa"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(167,139,250,0.15)"; }}
              onBlur={e  => { e.currentTarget.style.borderColor = "#ede9fe"; e.currentTarget.style.boxShadow = "none"; }}
            />
            <div className="flex items-center gap-2 mb-3">
              {COLOR_PRESETS.map((c) => (
                <button
                  key={c}
                  onClick={() => setSelectedColor(c)}
                  className="w-5 h-5 rounded-full transition-transform"
                  style={{
                    background: c,
                    outline: selectedColor === c ? `2px solid ${c}` : "none",
                    outlineOffset: "2px",
                    transform: selectedColor === c ? "scale(1.2)" : "scale(1)",
                  }}
                />
              ))}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleCreate}
                disabled={creating || !newFolderName.trim()}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-[12px] font-bold text-white disabled:opacity-50"
                style={{ background: "linear-gradient(135deg, #7c3aed, #4f46e5)" }}
              >
                <Check className="w-3.5 h-3.5" />
                {creating ? "Creating…" : "Create"}
              </button>
              <button onClick={() => setShowCreateForm(false)} className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="w-6 h-6 rounded-full border-2 animate-spin" style={{ borderColor: "#ede9fe", borderTopColor: "#7c3aed" }} />
          </div>
        ) : filteredFolders.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-56 text-center">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4" style={{ background: "linear-gradient(135deg, #ede9fe, #e0e7ff)" }}>
              <FolderOpen className="w-8 h-8 text-violet-400" />
            </div>
            <p className="font-bold text-slate-700 text-[15px]">
              {search ? "No matching folders" : "No folders yet"}
            </p>
            <p className="text-slate-400 text-[12px] mt-1 mb-5">
              {search ? "Try a different search term" : "Create a folder to organise your forms"}
            </p>
            {!search && (
              <button
                onClick={() => setShowCreateForm(true)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[12px] font-bold text-white"
                style={{ background: "linear-gradient(135deg, #7c3aed, #4f46e5)", boxShadow: "0 3px 10px rgba(124,58,237,0.3)" }}
              >
                <Plus className="w-3.5 h-3.5" />
                Create Folder
              </button>
            )}
          </div>
        ) : (
          filteredFolders.map((folder) => (
            <div key={folder.id}>
              {/* Folder row */}
              <div
                className="cf-folder-row group flex items-center gap-3 p-3.5 bg-white rounded-xl cursor-pointer transition-all"
                style={{ border: "1.5px solid #f1f5f9", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}
                onClick={() => { if (editingId === folder.id) return; toggleExpand(folder.id); }}
              >
                {/* Color dot */}
                <div className="w-3 h-3 rounded-full shrink-0" style={{ background: folder.color || "#7c3aed" }} />

                {/* Name / inline edit */}
                <div className="flex-1 min-w-0">
                  {editingId === folder.id ? (
                    <input
                      autoFocus
                      className="w-full text-[13px] text-slate-800 font-bold outline-none border-b pb-0.5"
                      style={{ borderColor: "#a78bfa" }}
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      onBlur={() => handleRename(folder)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleRename(folder);
                        if (e.key === "Escape") setEditingId(null);
                      }}
                    />
                  ) : (
                    <p className="text-slate-800 text-[13px] font-bold truncate">{folder.name}</p>
                  )}
                  <p className="text-[10.5px] text-slate-400 mt-0.5">
                    {folderForms[folder.id]
                      ? `${folderForms[folder.id].length} form${folderForms[folder.id].length !== 1 ? "s" : ""}`
                      : folder._count
                      ? `${folder._count.forms} form${folder._count.forms !== 1 ? "s" : ""}`
                      : "Folder"}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    className="p-1.5 rounded-lg text-slate-400 hover:text-violet-600 hover:bg-violet-50 transition-colors"
                    onClick={(e) => { e.stopPropagation(); setEditingId(folder.id); setEditName(folder.name); }}
                    title="Rename"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                    onClick={(e) => { e.stopPropagation(); handleDelete(folder.id, folder.name); }}
                    title="Delete"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <ChevronRight
                  className="w-4 h-4 text-slate-300 transition-transform duration-200 shrink-0"
                  style={{ transform: expandedId === folder.id ? "rotate(90deg)" : "rotate(0deg)" }}
                />
              </div>

              {/* Expanded forms list */}
              {expandedId === folder.id && (
                <div className="mt-1 ml-5 space-y-1 pb-1">
                  {loadingForms === folder.id ? (
                    <div className="flex items-center justify-center py-4">
                      <div className="w-4 h-4 rounded-full border-2 animate-spin" style={{ borderColor: "#ede9fe", borderTopColor: "#7c3aed" }} />
                    </div>
                  ) : !folderForms[folder.id] || folderForms[folder.id].length === 0 ? (
                    <p className="text-[11px] text-slate-400 px-3 py-2">No forms in this folder</p>
                  ) : (
                    folderForms[folder.id].map((form) => (
                      <div
                        key={form.id}
                        className="cf-folder-form-row flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-all"
                        style={{ background: "#faf9ff", border: "1px solid #f5f3ff" }}
                        onClick={() => router.push(`/cf/forms/${form.id}/builder`)}
                      >
                        <FileText className="w-3.5 h-3.5 text-violet-400 shrink-0" />
                        <span className="text-[12px] text-slate-600 font-medium truncate flex-1">{form.name}</span>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      <style jsx global>{`
        .cf-folder-row:hover { transform: translateY(-1px); border-color: #e0d9f7 !important; box-shadow: 0 4px 14px rgba(0,0,0,0.08) !important; }
        .cf-folder-form-row:hover { background: #ede9fe !important; border-color: #c4b5fd !important; }
      `}</style>
    </div>
  );
}
