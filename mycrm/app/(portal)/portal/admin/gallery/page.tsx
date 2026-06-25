"use client";
import { useEffect, useState, useRef } from "react";
import {
  Upload, Search, Archive, Trash2, Download, Eye,
  FileText, Image, Film, File, BookOpen, MoreVertical,
  RefreshCw, FolderOpen, Loader2,
} from "lucide-react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

interface GalleryFile {
  id: string; name: string; originalName: string; description?: string;
  fileUrl: string; mimeType: string; fileSize: number; category: string;
  tags: string[]; downloadCount: number; isArchived: boolean; createdAt: string;
}

const CATEGORIES = ["All", "Publications", "Events", "Learning Materials", "Marketing Assets", "Reports", "General Documents"];

function fileIcon(mimeType: string) {
  if (mimeType.startsWith("image/")) return <Image className="w-5 h-5 text-violet-500" />;
  if (mimeType.startsWith("video/")) return <Film className="w-5 h-5 text-red-500" />;
  if (mimeType.includes("pdf")) return <FileText className="w-5 h-5 text-orange-500" />;
  if (mimeType.includes("word") || mimeType.includes("document")) return <BookOpen className="w-5 h-5 text-blue-500" />;
  return <File className="w-5 h-5 text-gray-400" />;
}

function formatBytes(b: number) {
  if (!b) return "—";
  const k = 1024, s = ["B","KB","MB","GB"], i = Math.floor(Math.log(b)/Math.log(k));
  return `${parseFloat((b/Math.pow(k,i)).toFixed(1))} ${s[i]}`;
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

export default function AdminGalleryPage() {
  const [files, setFiles]               = useState<GalleryFile[]>([]);
  const [loading, setLoading]           = useState(true);
  const [search, setSearch]             = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [showArchived, setShowArchived] = useState(false);
  const [uploading, setUploading]       = useState(false);
  const [showUpload, setShowUpload]     = useState(false);
  const [editFile, setEditFile]         = useState<GalleryFile | null>(null);
  const [stats, setStats]               = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [uploadForm, setUploadForm] = useState({ name: "", description: "", category: "General Documents", tags: "", file: null as File | null });
  const [editForm, setEditForm]     = useState({ name: "", description: "", category: "", tags: "" });

  const inputClass = "bg-white border-gray-200 text-gray-900 placeholder:text-gray-400 focus-visible:ring-amber-500 h-8 text-sm";

  const load = () => {
    setLoading(true);
    const params: any = { archived: showArchived ? "true" : "false" };
    if (activeCategory !== "All") params.category = activeCategory;
    if (search) params.search = search;
    api.get("/gallery", { params }).then(r => setFiles(r.data)).catch(() => {}).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [activeCategory, showArchived]); // eslint-disable-line
  useEffect(() => { api.get("/gallery/stats").then(r => setStats(r.data)).catch(() => {}); }, []); // eslint-disable-line

  const handleUpload = async () => {
    if (!uploadForm.file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", uploadForm.file);
      if (uploadForm.name) fd.append("name", uploadForm.name);
      if (uploadForm.description) fd.append("description", uploadForm.description);
      fd.append("category", uploadForm.category);
      fd.append("tags", JSON.stringify(uploadForm.tags.split(",").map(t => t.trim()).filter(Boolean)));
      await api.post("/gallery/upload", fd, { headers: { "Content-Type": "multipart/form-data" } });
      setShowUpload(false);
      setUploadForm({ name: "", description: "", category: "General Documents", tags: "", file: null });
      load();
      api.get("/gallery/stats").then(r => setStats(r.data)).catch(() => {});
    } catch { /* silent */ } finally { setUploading(false); }
  };

  const handleEdit = async () => {
    if (!editFile) return;
    await api.patch(`/gallery/${editFile.id}`, {
      name: editForm.name,
      description: editForm.description || undefined,
      category: editForm.category,
      tags: editForm.tags.split(",").map(t => t.trim()).filter(Boolean),
    });
    setEditFile(null);
    load();
  };

  const handleArchive = async (id: string, archived: boolean) => {
    await api.post(`/gallery/${id}/${archived ? "unarchive" : "archive"}`);
    load();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this file permanently?")) return;
    await api.delete(`/gallery/${id}`);
    load();
  };

  const filtered = files.filter(f =>
    !search || f.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Gallery</h1>
          <p className="text-sm text-gray-500 mt-0.5">Central media and file repository for portal content</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="ghost" onClick={() => setShowArchived(s => !s)}
            className={cn("h-8 text-xs border", showArchived ? "border-amber-300 text-amber-700 bg-amber-50" : "border-gray-200 text-gray-500 hover:text-gray-800 hover:border-gray-300")}>
            <Archive className="w-3.5 h-3.5 mr-1.5" />
            {showArchived ? "Show Active" : "Archived"}
          </Button>
          <Button size="sm" onClick={() => setShowUpload(true)} className="h-8 bg-amber-600 hover:bg-amber-700 border-0 text-white">
            <Upload className="w-3.5 h-3.5 mr-1.5" /> Upload
          </Button>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="flex items-center gap-5 text-xs text-gray-500 bg-white border border-gray-200 rounded-xl px-4 py-2.5 shadow-sm">
          <span><strong className="text-gray-800">{stats.total}</strong> files</span>
          <span><strong className="text-gray-800">{formatBytes(stats.storageBytes)}</strong> used</span>
          <span><strong className="text-gray-800">{stats.archived}</strong> archived</span>
        </div>
      )}

      {/* Category filter pills */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {CATEGORIES.map(cat => {
          const count = stats?.byCategory?.find((c: any) => c.category === cat)?.count;
          return (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={cn(
                "px-3 py-1.5 rounded-full text-xs font-medium transition-colors whitespace-nowrap",
                activeCategory === cat
                  ? "bg-amber-600 text-white"
                  : "bg-white border border-gray-200 text-gray-600 hover:border-amber-300 hover:text-amber-700"
              )}
            >
              {cat}{count ? ` (${count})` : ""}
            </button>
          );
        })}
      </div>

      {/* Search bar */}
      <form onSubmit={e => { e.preventDefault(); load(); }} className="flex gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          <Input placeholder="Search files…" className={cn(inputClass, "pl-8")} value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Button type="submit" size="sm" variant="ghost" className="h-8 border border-gray-200 text-gray-500 hover:text-gray-800">Search</Button>
        <Button type="button" size="sm" variant="ghost" className="h-8 text-gray-400 hover:text-gray-700" onClick={load}><RefreshCw className="w-3.5 h-3.5" /></Button>
      </form>

      {/* Files grid */}
      {loading ? (
        <div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-amber-500" /></div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center py-16 text-gray-400">
          <FolderOpen className="w-10 h-10 mb-3 opacity-40" />
          <p className="text-sm">No files found</p>
          <Button size="sm" className="mt-3 bg-amber-600 hover:bg-amber-700 border-0 text-white" onClick={() => setShowUpload(true)}>Upload a file</Button>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {filtered.map(f => (
            <div key={f.id} className={cn("bg-white rounded-xl border border-gray-200 hover:border-gray-300 hover:shadow-sm transition-all group", f.isArchived && "opacity-50")}>
              <div className="h-28 flex items-center justify-center bg-gray-50 rounded-t-xl border-b border-gray-100 overflow-hidden">
                {f.mimeType.startsWith("image/") ? (
                  <img src={f.fileUrl} alt={f.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="scale-150">{fileIcon(f.mimeType)}</div>
                )}
              </div>
              <div className="p-2.5">
                <p className="text-[11px] font-medium text-gray-800 truncate">{f.name}</p>
                <p className="text-[10px] text-gray-400 mt-0.5">{formatBytes(f.fileSize)} · {f.category}</p>
                <p className="text-[10px] text-gray-400">{formatDate(f.createdAt)}</p>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-[10px] text-gray-400">{f.downloadCount} dl</span>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-700">
                        <MoreVertical className="w-3.5 h-3.5" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-40">
                      <DropdownMenuItem className="text-xs" onClick={() => window.open(f.fileUrl, "_blank")}>
                        <Eye className="w-3.5 h-3.5 mr-2" /> Preview
                      </DropdownMenuItem>
                      <DropdownMenuItem className="text-xs" onClick={() => window.open(f.fileUrl, "_blank")}>
                        <Download className="w-3.5 h-3.5 mr-2" /> Download
                      </DropdownMenuItem>
                      <DropdownMenuItem className="text-xs"
                        onClick={() => { setEditForm({ name: f.name, description: f.description ?? "", category: f.category, tags: f.tags.join(", ") }); setEditFile(f); }}>
                        Edit details
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="text-xs" onClick={() => handleArchive(f.id, f.isArchived)}>
                        <Archive className="w-3.5 h-3.5 mr-2" /> {f.isArchived ? "Unarchive" : "Archive"}
                      </DropdownMenuItem>
                      <DropdownMenuItem className="text-red-600 focus:text-red-700 text-xs" onClick={() => handleDelete(f.id)}>
                        <Trash2 className="w-3.5 h-3.5 mr-2" /> Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upload dialog */}
      <Dialog open={showUpload} onOpenChange={setShowUpload}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Upload File</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div
              className={cn("border-2 border-dashed rounded-lg p-5 text-center cursor-pointer transition-colors",
                uploadForm.file ? "border-amber-400 bg-amber-50" : "border-gray-200 hover:border-amber-400")}
              onClick={() => fileInputRef.current?.click()}
            >
              <input ref={fileInputRef} type="file" className="hidden" onChange={e => {
                const f = e.target.files?.[0];
                if (f) setUploadForm(s => ({ ...s, file: f, name: s.name || f.name }));
              }} />
              {uploadForm.file ? (
                <p className="text-sm text-amber-700 font-medium">{uploadForm.file.name} ({formatBytes(uploadForm.file.size)})</p>
              ) : (
                <div>
                  <Upload className="w-7 h-7 mx-auto mb-2 text-gray-400" />
                  <p className="text-sm text-gray-500">Click to browse or drag & drop</p>
                  <p className="text-xs text-gray-400 mt-1">Max 50 MB</p>
                </div>
              )}
            </div>
            <div className="space-y-1"><Label className="text-xs text-gray-600">Display name</Label>
              <Input value={uploadForm.name} onChange={e => setUploadForm(s => ({ ...s, name: e.target.value }))} placeholder="File name" className={inputClass} /></div>
            <div className="space-y-1"><Label className="text-xs text-gray-600">Description</Label>
              <Input value={uploadForm.description} onChange={e => setUploadForm(s => ({ ...s, description: e.target.value }))} placeholder="Optional" className={inputClass} /></div>
            <div className="space-y-1"><Label className="text-xs text-gray-600">Category</Label>
              <select value={uploadForm.category} onChange={e => setUploadForm(s => ({ ...s, category: e.target.value }))}
                className="w-full h-8 text-sm bg-white border border-gray-200 rounded-md px-2 text-gray-900">
                {CATEGORIES.filter(c => c !== "All").map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="space-y-1"><Label className="text-xs text-gray-600">Tags (comma-separated)</Label>
              <Input value={uploadForm.tags} onChange={e => setUploadForm(s => ({ ...s, tags: e.target.value }))} placeholder="e.g. annual, report" className={inputClass} /></div>
          </div>
          <DialogFooter>
            <Button variant="ghost" size="sm" className="text-gray-500 hover:text-gray-800" onClick={() => setShowUpload(false)}>Cancel</Button>
            <Button size="sm" onClick={handleUpload} disabled={!uploadForm.file || uploading} className="bg-amber-600 hover:bg-amber-700 border-0 text-white">
              {uploading ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Upload className="w-3.5 h-3.5 mr-1.5" />} Upload
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit dialog */}
      <Dialog open={!!editFile} onOpenChange={v => !v && setEditFile(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Edit File Details</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1"><Label className="text-xs text-gray-600">Name</Label>
              <Input value={editForm.name} onChange={e => setEditForm(s => ({ ...s, name: e.target.value }))} className={inputClass} /></div>
            <div className="space-y-1"><Label className="text-xs text-gray-600">Description</Label>
              <Input value={editForm.description} onChange={e => setEditForm(s => ({ ...s, description: e.target.value }))} className={inputClass} /></div>
            <div className="space-y-1"><Label className="text-xs text-gray-600">Category</Label>
              <select value={editForm.category} onChange={e => setEditForm(s => ({ ...s, category: e.target.value }))}
                className="w-full h-8 text-sm bg-white border border-gray-200 rounded-md px-2 text-gray-900">
                {CATEGORIES.filter(c => c !== "All").map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="space-y-1"><Label className="text-xs text-gray-600">Tags</Label>
              <Input value={editForm.tags} onChange={e => setEditForm(s => ({ ...s, tags: e.target.value }))} className={inputClass} /></div>
          </div>
          <DialogFooter>
            <Button variant="ghost" size="sm" className="text-gray-500 hover:text-gray-800" onClick={() => setEditFile(null)}>Cancel</Button>
            <Button size="sm" onClick={handleEdit} className="bg-amber-600 hover:bg-amber-700 border-0 text-white">Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
