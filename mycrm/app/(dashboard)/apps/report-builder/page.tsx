"use client";
import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  FileBarChart2, Plus, Trash2, Play, Pencil, Clock, Search, Loader2, BarChart3,
  Folder, FolderPlus, FolderOpen, Shield, X, Check, ChevronDown,
} from "lucide-react";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { AccessControlEditor, type AccessRules } from "@/components/ui/access-control-editor";

interface SavedReport {
  id: string;
  name: string;
  description?: string;
  moduleName: string;
  columns: { fieldLabel: string; alias?: string }[];
  filters: unknown[];
  folderId: string | null;
  createdAt: string;
  updatedAt: string;
}

interface ReportFolder extends AccessRules {
  id: string;
  name: string;
  createdById: string;
  createdAt: string;
  updatedAt: string;
}

const UNFILED = "__unfiled__";

// ── New Folder dialog ───────────────────────────────────────────────────────

function NewFolderDialog({ onCreate, onCancel }: { onCreate: (name: string) => void; onCancel: () => void }) {
  const [name, setName] = useState("");
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative z-10 bg-white rounded-2xl shadow-2xl w-full max-w-sm border border-gray-200">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center"><FolderPlus className="w-4 h-4 text-blue-600" /></div>
            <h3 className="font-semibold text-gray-900 text-sm">New Folder</h3>
          </div>
          <button onClick={onCancel} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
        </div>
        <div className="px-5 py-4">
          <input
            autoFocus
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && name.trim()) onCreate(name.trim()); }}
            placeholder="Folder name…"
            className="w-full h-9 px-3 text-sm border border-gray-200 rounded-lg outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20"
          />
        </div>
        <div className="flex justify-end gap-2 px-5 py-4 border-t border-gray-100 bg-gray-50/50 rounded-b-2xl">
          <button onClick={onCancel} className="px-3 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">Cancel</button>
          <button
            disabled={!name.trim()}
            onClick={() => onCreate(name.trim())}
            className="px-3 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white text-xs font-semibold rounded-lg transition-colors"
          >
            Create
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Folder access-control dialog ────────────────────────────────────────────

function FolderAccessDialog({ folder, onSave, onCancel }: {
  folder: ReportFolder;
  onSave: (rules: AccessRules) => Promise<void>;
  onCancel: () => void;
}) {
  const [rules, setRules] = useState<AccessRules>({
    isPublic: folder.isPublic,
    sharedRoles: folder.sharedRoles ?? [],
    sharedDepartments: folder.sharedDepartments ?? [],
    sharedUsers: folder.sharedUsers ?? [],
  });
  const [saving, setSaving] = useState(false);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative z-10 bg-white rounded-2xl shadow-2xl w-full max-w-md border border-gray-200 flex flex-col max-h-[85vh]">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
          <div>
            <p className="text-sm font-semibold text-gray-900">Folder Access</p>
            <p className="text-xs text-gray-400 mt-0.5">Who can see &quot;{folder.name}&quot; and its reports</p>
          </div>
          <button onClick={onCancel} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4">
          <AccessControlEditor {...rules} onChange={setRules} />
        </div>
        <div className="flex justify-end gap-2 px-5 py-4 border-t border-gray-100 bg-gray-50/50 rounded-b-2xl shrink-0">
          <button onClick={onCancel} className="px-3 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">Cancel</button>
          <button
            disabled={saving}
            onClick={async () => { setSaving(true); await onSave(rules); setSaving(false); }}
            className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-60 text-white text-xs font-semibold rounded-lg transition-colors"
          >
            {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}Save
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Move-to-folder dropdown ─────────────────────────────────────────────────

function MoveToFolderMenu({ folders, currentFolderId, onMove }: {
  folders: ReportFolder[];
  currentFolderId: string | null;
  onMove: (folderId: string | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    if (open) document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        title="Move to folder"
        className="flex items-center justify-center px-3 py-2 bg-gray-100 hover:bg-blue-50 hover:text-blue-600 text-gray-400 rounded-lg transition-colors"
      >
        <FolderOpen className="w-3 h-3" />
      </button>
      {open && (
        <div className="absolute z-30 bottom-full right-0 mb-1.5 w-48 bg-white border border-gray-200 rounded-xl shadow-xl max-h-56 overflow-y-auto">
          <button
            onClick={() => { onMove(null); setOpen(false); }}
            className={cn(
              "w-full flex items-center justify-between gap-2 px-3 py-2 text-xs hover:bg-gray-50 transition-colors",
              currentFolderId === null && "text-blue-600 font-semibold bg-blue-50/50"
            )}
          >
            Unfiled
            {currentFolderId === null && <Check className="w-3 h-3" />}
          </button>
          {folders.map(f => (
            <button
              key={f.id}
              onClick={() => { onMove(f.id); setOpen(false); }}
              className={cn(
                "w-full flex items-center justify-between gap-2 px-3 py-2 text-xs hover:bg-gray-50 transition-colors truncate",
                currentFolderId === f.id && "text-blue-600 font-semibold bg-blue-50/50"
              )}
            >
              <span className="truncate">{f.name}</span>
              {currentFolderId === f.id && <Check className="w-3 h-3 shrink-0" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────

export default function ReportBuilderPage() {
  const router = useRouter();
  const [reports, setReports] = useState<SavedReport[]>([]);
  const [folders, setFolders] = useState<ReportFolder[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null); // null = All, UNFILED = unfiled
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [accessFolder, setAccessFolder] = useState<ReportFolder | null>(null);
  const [renamingFolderId, setRenamingFolderId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");

  const fetchAll = useCallback(async () => {
    try {
      const [reportsRes, foldersRes] = await Promise.all([
        api.get("/reports"),
        api.get("/reports/folders").catch(() => ({ data: [] })),
      ]);
      setReports(Array.isArray(reportsRes.data) ? reportsRes.data : []);
      setFolders(Array.isArray(foldersRes.data) ? foldersRes.data : []);
    } catch {
      setReports([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  useEffect(() => {
    const onVisible = () => { if (document.visibilityState === "visible") fetchAll(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [fetchAll]);

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete report "${name}"? This cannot be undone.`)) return;
    try {
      await api.delete(`/reports/${id}`);
      setReports(prev => prev.filter(r => r.id !== id));
    } catch {
      alert("Failed to delete report. Please try again.");
    }
  };

  const handleMove = async (reportId: string, folderId: string | null) => {
    const prev = reports;
    setReports(rs => rs.map(r => r.id === reportId ? { ...r, folderId } : r));
    try {
      await api.patch(`/reports/${reportId}`, { folderId });
    } catch {
      setReports(prev);
      alert("Failed to move report. Please try again.");
    }
  };

  const handleCreateFolder = async (name: string) => {
    try {
      const { data } = await api.post("/reports/folders", { name });
      setFolders(fs => [...fs, data]);
      setShowNewFolder(false);
    } catch {
      alert("Failed to create folder. Please try again.");
    }
  };

  const handleRenameFolder = async (id: string) => {
    const name = renameValue.trim();
    setRenamingFolderId(null);
    if (!name) return;
    const prev = folders;
    setFolders(fs => fs.map(f => f.id === id ? { ...f, name } : f));
    try {
      await api.patch(`/reports/folders/${id}`, { name });
    } catch {
      setFolders(prev);
      alert("Failed to rename folder. Please try again.");
    }
  };

  const handleDeleteFolder = async (folder: ReportFolder) => {
    if (!confirm(`Delete folder "${folder.name}"? Reports inside will become unfiled, not deleted.`)) return;
    try {
      await api.delete(`/reports/folders/${folder.id}`);
      setFolders(fs => fs.filter(f => f.id !== folder.id));
      setReports(rs => rs.map(r => r.folderId === folder.id ? { ...r, folderId: null } : r));
      if (selectedFolder === folder.id) setSelectedFolder(null);
    } catch {
      alert("Failed to delete folder. Please try again.");
    }
  };

  const handleSaveAccess = async (rules: AccessRules) => {
    if (!accessFolder) return;
    try {
      await api.patch(`/reports/folders/${accessFolder.id}`, rules);
      setFolders(fs => fs.map(f => f.id === accessFolder.id ? { ...f, ...rules } : f));
      setAccessFolder(null);
    } catch {
      alert("Failed to update folder access. Please try again.");
    }
  };

  const folderFiltered = reports.filter(r => {
    if (selectedFolder === null) return true;
    if (selectedFolder === UNFILED) return !r.folderId;
    return r.folderId === selectedFolder;
  });
  const filtered = folderFiltered.filter(r =>
    !query.trim() || r.name.toLowerCase().includes(query.toLowerCase())
  );

  const countInFolder = (folderId: string | typeof UNFILED | null) =>
    reports.filter(r => folderId === UNFILED ? !r.folderId : r.folderId === folderId).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="flex gap-6 items-start">
      {/* ── Folder sidebar ── */}
      <div className="w-56 shrink-0 space-y-1">
        <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest px-2 mb-2">Folders</p>

        <button
          onClick={() => setSelectedFolder(null)}
          className={cn(
            "w-full flex items-center justify-between gap-2 px-2.5 py-2 rounded-lg text-sm transition-colors",
            selectedFolder === null ? "bg-blue-50 text-blue-700 font-semibold" : "text-gray-600 hover:bg-gray-50"
          )}
        >
          <span className="flex items-center gap-2"><FileBarChart2 className="w-3.5 h-3.5" />All Reports</span>
          <span className="text-[10px] text-gray-400">{reports.length}</span>
        </button>

        <button
          onClick={() => setSelectedFolder(UNFILED)}
          className={cn(
            "w-full flex items-center justify-between gap-2 px-2.5 py-2 rounded-lg text-sm transition-colors",
            selectedFolder === UNFILED ? "bg-blue-50 text-blue-700 font-semibold" : "text-gray-600 hover:bg-gray-50"
          )}
        >
          <span className="flex items-center gap-2"><Folder className="w-3.5 h-3.5" />Unfiled</span>
          <span className="text-[10px] text-gray-400">{countInFolder(UNFILED)}</span>
        </button>

        <div className="pt-1 space-y-0.5">
          {folders.map(f => (
            <div
              key={f.id}
              className={cn(
                "group flex items-center gap-1 px-2.5 py-2 rounded-lg text-sm transition-colors",
                selectedFolder === f.id ? "bg-blue-50 text-blue-700 font-semibold" : "text-gray-600 hover:bg-gray-50"
              )}
            >
              {renamingFolderId === f.id ? (
                <input
                  autoFocus
                  value={renameValue}
                  onChange={e => setRenameValue(e.target.value)}
                  onBlur={() => handleRenameFolder(f.id)}
                  onKeyDown={e => { if (e.key === "Enter") handleRenameFolder(f.id); if (e.key === "Escape") setRenamingFolderId(null); }}
                  className="flex-1 min-w-0 h-6 px-1.5 text-xs border border-blue-300 rounded outline-none"
                />
              ) : (
                <button onClick={() => setSelectedFolder(f.id)} className="flex-1 min-w-0 flex items-center gap-2 text-left">
                  <Folder className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">{f.name}</span>
                </button>
              )}
              <span className="text-[10px] text-gray-400 shrink-0 group-hover:hidden">{countInFolder(f.id)}</span>
              <div className="shrink-0 hidden group-hover:flex items-center gap-0.5">
                <button onClick={() => setAccessFolder(f)} title="Access control" className="p-1 rounded hover:bg-gray-200 text-gray-400 hover:text-indigo-600">
                  <Shield className="w-3 h-3" />
                </button>
                <button onClick={() => { setRenamingFolderId(f.id); setRenameValue(f.name); }} title="Rename" className="p-1 rounded hover:bg-gray-200 text-gray-400 hover:text-gray-700">
                  <Pencil className="w-3 h-3" />
                </button>
                <button onClick={() => handleDeleteFolder(f)} title="Delete folder" className="p-1 rounded hover:bg-gray-200 text-gray-400 hover:text-red-500">
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={() => setShowNewFolder(true)}
          className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs font-semibold text-blue-600 hover:bg-blue-50 transition-colors mt-1"
        >
          <FolderPlus className="w-3.5 h-3.5" />New Folder
        </button>
      </div>

      {/* ── Main content ── */}
      <div className="flex-1 min-w-0 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <FileBarChart2 className="w-5 h-5 text-blue-600" />
              {selectedFolder === null ? "Reports" : selectedFolder === UNFILED ? "Unfiled Reports" : (folders.find(f => f.id === selectedFolder)?.name ?? "Reports")}
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {folderFiltered.length > 0
                ? `${folderFiltered.length} saved report${folderFiltered.length !== 1 ? "s" : ""}`
                : "Build dynamic reports from your CRM data"}
            </p>
          </div>
          <button
            onClick={() => router.push("/apps/report-builder/new")}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold rounded-xl transition-colors"
          >
            <Plus className="w-4 h-4" />New Report
          </button>
        </div>

        {/* Search */}
        {reports.length > 0 && (
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search reports…"
              value={query}
              onChange={e => setQuery(e.target.value)}
              className="w-full pl-10 pr-3 py-2 border border-gray-200 rounded-xl text-sm placeholder-gray-400 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20"
            />
          </div>
        )}

        {/* Empty state */}
        {reports.length === 0 && (
          <div className="border border-dashed border-gray-200 rounded-2xl p-16 text-center bg-gray-50">
            <FileBarChart2 className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-lg font-semibold text-gray-500 mb-1">No reports yet</p>
            <p className="text-sm text-gray-400 mb-5">Build dynamic reports from your CRM modules</p>
            <button
              onClick={() => router.push("/apps/report-builder/new")}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold rounded-xl transition-colors"
            >
              <Plus className="w-4 h-4" />Build a Report
            </button>
          </div>
        )}

        {/* No results in this folder */}
        {reports.length > 0 && folderFiltered.length === 0 && (
          <div className="text-center py-12">
            <Folder className="w-8 h-8 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-400">No reports in this folder</p>
          </div>
        )}

        {/* No search results */}
        {folderFiltered.length > 0 && filtered.length === 0 && (
          <div className="text-center py-12">
            <Search className="w-8 h-8 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-400">No reports match your search</p>
            <button onClick={() => setQuery("")} className="text-xs text-blue-500 hover:text-blue-700 mt-1">Clear</button>
          </div>
        )}

        {/* Reports grid */}
        {filtered.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map(r => (
              <div
                key={r.id}
                className="group bg-white border border-gray-200 rounded-2xl p-5 flex flex-col gap-3 hover:border-blue-300 hover:shadow-md transition-all"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0">
                    <FileBarChart2 className="w-4 h-4 text-blue-600" />
                  </div>
                  <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-blue-50 text-blue-600 border border-blue-100">
                    {r.moduleName}
                  </span>
                </div>

                <div className="flex-1 space-y-1">
                  <h3 className="font-semibold text-gray-900 text-sm group-hover:text-blue-700 transition-colors leading-snug">
                    {r.name}
                  </h3>
                  {r.description && (
                    <p className="text-xs text-gray-500 line-clamp-2">{r.description}</p>
                  )}
                  <p className="text-[10px] text-gray-400">
                    {(r.columns as any[]).length} column{(r.columns as any[]).length !== 1 ? "s" : ""}
                    {(r.filters as any[]).length > 0
                      ? ` · ${(r.filters as any[]).length} filter${(r.filters as any[]).length !== 1 ? "s" : ""}`
                      : ""}
                  </p>
                  <p className="text-[10px] text-gray-400 flex items-center gap-1">
                    <Clock className="w-2.5 h-2.5" />
                    {new Date(r.updatedAt).toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" })}
                  </p>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => router.push(`/apps/report-builder/${r.id}`)}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg transition-colors"
                  >
                    <Play className="w-3 h-3" />Run
                  </button>
                  <button
                    onClick={() => router.push(`/apps/report-builder/new?edit=${r.id}`)}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold rounded-lg transition-colors"
                  >
                    <Pencil className="w-3 h-3" />Edit
                  </button>
                  <button
                    onClick={() => router.push(`/analytics?openReportWizard=${r.id}`)}
                    title="Create a visualization from this report"
                    className="flex items-center justify-center px-3 py-2 bg-gray-100 hover:bg-indigo-50 hover:text-indigo-600 text-gray-400 rounded-lg transition-colors"
                  >
                    <BarChart3 className="w-3 h-3" />
                  </button>
                  <MoveToFolderMenu
                    folders={folders}
                    currentFolderId={r.folderId}
                    onMove={folderId => handleMove(r.id, folderId)}
                  />
                  <button
                    onClick={() => handleDelete(r.id, r.name)}
                    className="flex items-center justify-center px-3 py-2 bg-gray-100 hover:bg-red-50 hover:text-red-500 text-gray-400 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showNewFolder && (
        <NewFolderDialog onCreate={handleCreateFolder} onCancel={() => setShowNewFolder(false)} />
      )}
      {accessFolder && (
        <FolderAccessDialog folder={accessFolder} onSave={handleSaveAccess} onCancel={() => setAccessFolder(null)} />
      )}
    </div>
  );
}
