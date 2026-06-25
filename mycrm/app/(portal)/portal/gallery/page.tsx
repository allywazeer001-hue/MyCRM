"use client";
import { useEffect, useState } from "react";
import { PortalShell } from "@/components/portal/portal-shell";
import { portalApi } from "@/lib/portal-api";
import { usePortalAuthStore } from "@/store/portal-auth.store";
import {
  Search, Download, Eye, FolderOpen, Loader2,
  FileText, Image, Film, File, BookOpen,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const CATEGORIES = [
  "All",
  "Publications",
  "Events",
  "Learning Materials",
  "Marketing Assets",
  "Reports",
  "General Documents",
];

function fileIcon(mimeType: string) {
  if (mimeType.startsWith("image/")) return <Image className="w-5 h-5 text-violet-500" />;
  if (mimeType.startsWith("video/")) return <Film className="w-5 h-5 text-red-500" />;
  if (mimeType.includes("pdf")) return <FileText className="w-5 h-5 text-orange-500" />;
  if (mimeType.includes("word") || mimeType.includes("document")) return <BookOpen className="w-5 h-5 text-blue-500" />;
  return <File className="w-5 h-5 text-gray-400" />;
}

function formatBytes(bytes: number) {
  if (!bytes) return "";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

export default function PortalGalleryPage() {
  const { user }                                    = usePortalAuthStore();
  const [files, setFiles]                           = useState<any[]>([]);
  const [loading, setLoading]                       = useState(true);
  const [search, setSearch]                         = useState("");
  const [activeCategory, setActiveCategory]         = useState("All");

  useEffect(() => {
    const params: any = { archived: "false" };
    if (activeCategory !== "All") params.category = activeCategory;
    setLoading(true);
    // Portal users access gallery through the same admin API (read-only)
    portalApi.get("/gallery", { params })
      .then(r => setFiles(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [activeCategory]);

  const handleDownload = async (file: any) => {
    await portalApi.post(`/gallery/${file.id}/download`).catch(() => {});
    window.open(file.fileUrl, "_blank");
  };

  const filtered = files.filter(f =>
    !search ||
    f.name.toLowerCase().includes(search.toLowerCase()) ||
    f.originalName?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <PortalShell>
      <div className="max-w-4xl mx-auto pb-12">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Gallery</h1>
          <p className="text-sm text-gray-500 mt-0.5">Browse and download shared files and documents</p>
        </div>

        {/* Category tabs */}
        <div className="flex gap-2 flex-wrap mb-5">
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={cn(
                "px-3 py-1.5 rounded-full text-xs font-medium transition-colors",
                activeCategory === cat
                  ? "bg-indigo-600 text-white"
                  : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
              )}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative max-w-xs mb-6">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Search files…"
            className="pl-8 h-9 text-sm"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-gray-400">
            <FolderOpen className="w-10 h-10 mb-3 opacity-40" />
            <p className="text-sm">No files in this category</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {filtered.map(f => (
              <div key={f.id} className="bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-all overflow-hidden group">
                {/* Preview */}
                <div className="h-28 bg-gray-50 flex items-center justify-center overflow-hidden border-b border-gray-100">
                  {f.mimeType?.startsWith("image/") ? (
                    <img src={f.fileUrl} alt={f.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  ) : (
                    <div className="scale-150">{fileIcon(f.mimeType ?? "")}</div>
                  )}
                </div>

                <div className="p-3">
                  <p className="text-xs font-medium text-gray-800 truncate">{f.name}</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">{f.category}</p>
                  {f.fileSize > 0 && <p className="text-[10px] text-gray-400">{formatBytes(f.fileSize)}</p>}
                  <p className="text-[10px] text-gray-400">{formatDate(f.createdAt)}</p>

                  <div className="flex items-center gap-1.5 mt-2">
                    <button
                      onClick={() => window.open(f.fileUrl, "_blank")}
                      className="flex-1 flex items-center justify-center gap-1 h-7 rounded-lg border border-gray-200 text-xs text-gray-600 hover:bg-gray-50 transition"
                    >
                      <Eye className="w-3 h-3" /> View
                    </button>
                    <button
                      onClick={() => handleDownload(f)}
                      className="flex-1 flex items-center justify-center gap-1 h-7 rounded-lg bg-indigo-50 border border-indigo-100 text-xs text-indigo-600 hover:bg-indigo-100 transition"
                    >
                      <Download className="w-3 h-3" /> Download
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </PortalShell>
  );
}
