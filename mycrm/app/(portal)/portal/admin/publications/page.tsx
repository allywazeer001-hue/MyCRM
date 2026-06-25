"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Plus, Search, Trash2, BarChart2, Send, Archive,
  RotateCcw, Loader2, Newspaper, CalendarDays,
} from "lucide-react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface Publication {
  id: string;
  title: string;
  excerpt?: string;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  publishedAt?: string;
  isEvent: boolean;
  eventDate?: string;
  viewCount: number;
  clickCount: number;
  coverImageUrl?: string;
  coverFile?: { fileUrl: string };
  author: { id: string; firstName: string; lastName: string };
  createdAt: string;
  _count: { engagements: number };
}

const STATUS_STYLES: Record<string, string> = {
  DRAFT:     "bg-gray-100 text-gray-600",
  PUBLISHED: "bg-green-100 text-green-700",
  ARCHIVED:  "bg-amber-100 text-amber-700",
};

function formatDate(d?: string) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

export default function AdminPublicationsPage() {
  const router = useRouter();
  const [publications, setPublications] = useState<Publication[]>([]);
  const [loading, setLoading]           = useState(true);
  const [search, setSearch]             = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [stats, setStats]               = useState<any>(null);

  const load = () => {
    setLoading(true);
    const params: any = {};
    if (statusFilter !== "ALL") params.status = statusFilter;
    if (search) params.search = search;
    api.get("/publications", { params })
      .then(r => setPublications(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [statusFilter]); // eslint-disable-line
  useEffect(() => {
    api.get("/publications/stats").then(r => setStats(r.data)).catch(() => {});
  }, []); // eslint-disable-line

  const handleSearch = (e: React.FormEvent) => { e.preventDefault(); load(); };

  const act = (method: "post" | "delete", path: string, e: React.MouseEvent) => {
    e.stopPropagation();
    api[method](path).then(load).catch(() => {});
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Delete this publication permanently?")) return;
    api.delete(`/publications/${id}`).then(load).catch(() => {});
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Publications</h1>
          <p className="text-sm text-gray-500 mt-0.5">Create and manage posts, events and announcements</p>
        </div>
        <Button size="sm" onClick={() => router.push("/portal/admin/publications/new")}
          className="bg-rose-600 hover:bg-rose-700 text-white border-0">
          <Plus className="w-4 h-4 mr-1.5" /> New Publication
        </Button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Total", value: stats.total },
            { label: "Published this month", value: stats.publishedThisMonth },
            { label: "Link clicks", value: stats.totalClicks },
            { label: "Downloads", value: stats.totalDownloads },
          ].map(s => (
            <div key={s.label} className="bg-white border border-gray-200 rounded-xl px-4 py-3 shadow-sm">
              <p className="text-2xl font-bold text-gray-900">{s.value}</p>
              <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        {["ALL", "DRAFT", "PUBLISHED", "ARCHIVED"].map(s => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={cn(
              "px-3 py-1 rounded-full text-xs font-medium transition-colors",
              statusFilter === s ? "bg-rose-600 text-white" : "bg-white border border-gray-200 text-gray-500 hover:text-gray-800 hover:border-gray-300"
            )}
          >
            {s === "ALL" ? "All" : s.charAt(0) + s.slice(1).toLowerCase()}
          </button>
        ))}
        <form onSubmit={handleSearch} className="ml-auto flex gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <Input
              placeholder="Search…"
              className="pl-8 h-8 text-sm w-48 bg-white border-gray-200 text-gray-800 placeholder:text-gray-400 focus-visible:ring-rose-500"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <Button type="submit" size="sm" variant="outline" className="border-gray-200 text-gray-600 hover:bg-gray-50 h-8">Search</Button>
        </form>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-rose-500" />
        </div>
      ) : publications.length === 0 ? (
        <div className="flex flex-col items-center py-16 text-gray-400">
          <Newspaper className="w-10 h-10 mb-3 opacity-40" />
          <p className="text-sm">No publications yet</p>
          <Button size="sm" className="mt-3 bg-rose-600 hover:bg-rose-700 border-0" onClick={() => router.push("/portal/admin/publications/new")}>
            Create your first publication
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {publications.map(pub => (
            <div
              key={pub.id}
              onClick={() => router.push(`/portal/admin/publications/${pub.id}`)}
              className="bg-white border border-gray-200 rounded-xl p-4 flex items-start gap-4 cursor-pointer hover:border-gray-300 hover:shadow-sm transition-all group"
            >
              {/* Cover */}
              <div className="w-14 h-14 flex-shrink-0 rounded-lg overflow-hidden bg-gray-100 border border-gray-200 relative">
                <div className="absolute inset-0 flex items-center justify-center">
                  {pub.isEvent ? <CalendarDays className="w-5 h-5 text-rose-400" /> : <Newspaper className="w-5 h-5 text-gray-400" />}
                </div>
                {(pub.coverFile?.fileUrl || pub.coverImageUrl) && (
                  <img
                    src={pub.coverFile?.fileUrl ?? pub.coverImageUrl}
                    alt={pub.title}
                    className="absolute inset-0 w-full h-full object-cover"
                    onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
                  />
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-sm font-semibold text-gray-800 truncate">{pub.title}</h3>
                  <span className={cn("text-[10px] font-medium px-1.5 py-0.5 rounded-full", STATUS_STYLES[pub.status])}>
                    {pub.status}
                  </span>
                  {pub.isEvent && (
                    <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-600">Event</span>
                  )}
                </div>
                {pub.excerpt && <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{pub.excerpt}</p>}
                <div className="flex items-center gap-4 mt-1.5 flex-wrap">
                  <span className="text-[11px] text-gray-400">By {pub.author.firstName} {pub.author.lastName}</span>
                  <span className="text-[11px] text-gray-400">{formatDate(pub.publishedAt ?? pub.createdAt)}</span>
                  <span className="text-[11px] text-gray-400">{pub.viewCount} views</span>
                  <span className="text-[11px] text-gray-400">{pub.clickCount} clicks</span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1 flex-shrink-0" onClick={e => e.stopPropagation()}>
                <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-gray-400 hover:text-gray-700" title="Analytics"
                  onClick={e => { e.stopPropagation(); router.push(`/portal/admin/publications/${pub.id}/analytics`); }}>
                  <BarChart2 className="w-3.5 h-3.5" />
                </Button>
                {pub.status === "DRAFT" && (
                  <Button size="sm" variant="ghost" className="h-7 text-xs px-2 text-green-600 hover:text-green-700"
                    onClick={e => act("post", `/publications/${pub.id}/publish`, e)}>
                    <Send className="w-3 h-3 mr-1" /> Publish
                  </Button>
                )}
                {pub.status === "PUBLISHED" && (
                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-amber-500 hover:text-amber-600" title="Unpublish"
                    onClick={e => act("post", `/publications/${pub.id}/unpublish`, e)}>
                    <RotateCcw className="w-3.5 h-3.5" />
                  </Button>
                )}
                {pub.status !== "ARCHIVED" && (
                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-gray-400 hover:text-gray-600" title="Archive"
                    onClick={e => act("post", `/publications/${pub.id}/archive`, e)}>
                    <Archive className="w-3.5 h-3.5" />
                  </Button>
                )}
                <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-red-400 hover:text-red-600" title="Delete"
                  onClick={e => handleDelete(pub.id, e)}>
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
