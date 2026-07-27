"use client";
import { useState, useEffect } from "react";
import { FolderInput, Search, FileText, ChevronRight, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";

interface SharedFolder {
  id: string;
  name: string;
  description?: string;
  color: string;
  createdBy: { firstName: string; lastName: string };
  createdAt: string;
  _count?: { forms: number };
}

interface Form {
  id: string;
  name: string;
  description?: string;
  type?: string;
}

export default function SharedFoldersPage() {
  const router = useRouter();
  const [folders, setFolders] = useState<SharedFolder[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [folderForms, setFolderForms] = useState<Record<string, Form[]>>({});
  const [loadingForms, setLoadingForms] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    api.get("/forms/shared-folders")
      .then((r) => setFolders(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = folders.filter((f) =>
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

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3.5 shrink-0" style={{ borderBottom: "1px solid #f1f5f9" }}>
        <div>
          <h1 className="text-[15px] font-bold text-slate-800">Shared Folders</h1>
          <p className="text-[11px] text-slate-400 mt-0.5">
            {folders.length} {folders.length === 1 ? "collection" : "collections"} shared with you
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="px-5 py-3 shrink-0" style={{ borderBottom: "1px solid #f8fafc" }}>
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search shared folders…"
            className="w-full pl-8 pr-3 py-2 text-[12px] rounded-xl outline-none transition-all"
            style={{ background: "#f8f7ff", border: "1.5px solid #ede9fe", color: "#1e1b4b" }}
            onFocus={e => { e.currentTarget.style.borderColor = "#a78bfa"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(167,139,250,0.15)"; }}
            onBlur={e  => { e.currentTarget.style.borderColor = "#ede9fe";  e.currentTarget.style.boxShadow = "none"; }}
          />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-5 space-y-2">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="w-6 h-6 rounded-full border-2 animate-spin" style={{ borderColor: "#ede9fe", borderTopColor: "#7c3aed" }} />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-56 text-center">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4" style={{ background: "linear-gradient(135deg, #f3e8ff, #e0e7ff)" }}>
              <FolderInput className="w-8 h-8 text-purple-400" />
            </div>
            <p className="font-bold text-slate-700 text-[15px]">
              {search ? "No matching folders" : "No shared folders yet"}
            </p>
            <p className="text-slate-400 text-[12px] mt-1">
              {search ? "Try a different search term" : "Folders shared with you will appear here"}
            </p>
          </div>
        ) : (
          filtered.map((folder) => (
            <div key={folder.id}>
              <div
                className="cf-sfolder-row group flex items-center gap-3 p-3.5 bg-white rounded-xl cursor-pointer transition-all"
                style={{ border: "1.5px solid #f1f5f9", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}
                onClick={() => toggleExpand(folder.id)}
              >
                <div className="w-3 h-3 rounded-full shrink-0" style={{ background: folder.color || "#7c3aed" }} />

                <div className="flex-1 min-w-0">
                  <p className="text-slate-800 text-[13px] font-bold truncate">{folder.name}</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <Users className="w-3 h-3 text-slate-300" />
                    <span className="text-[10.5px] text-slate-400">
                      by {folder.createdBy.firstName} {folder.createdBy.lastName}
                    </span>
                  </div>
                </div>

                <ChevronRight
                  className="w-4 h-4 text-slate-300 transition-transform duration-200 shrink-0"
                  style={{ transform: expandedId === folder.id ? "rotate(90deg)" : "rotate(0deg)" }}
                />
              </div>

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
                        className="cf-sfolder-form-row flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-all"
                        style={{ background: "#faf9ff", border: "1px solid #f5f3ff" }}
                        onClick={() => window.open(`/cloudforms/forms/${form.id}/builder`, '_blank')}
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
        .cf-sfolder-row:hover { transform: translateY(-1px); border-color: #e0d9f7 !important; box-shadow: 0 4px 14px rgba(0,0,0,0.08) !important; }
        .cf-sfolder-form-row:hover { background: #ede9fe !important; border-color: #c4b5fd !important; }
      `}</style>
    </div>
  );
}
