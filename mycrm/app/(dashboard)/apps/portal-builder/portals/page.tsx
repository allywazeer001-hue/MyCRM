"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { portalApi } from "@/lib/portal-api";
import {
  Globe, Plus, Loader2, Pencil, Eye, Trash2, AlertCircle,
  Search, SlidersHorizontal, ChevronDown,
} from "lucide-react";

interface PortalPage {
  id: string;
  title: string;
  slug: string;
  status: string;
  layoutTemplate?: string;
  createdAt: string;
  updatedAt?: string;
}

type StatusFilter = "all" | "PUBLISHED" | "DRAFT";
type SortKey = "newest" | "oldest" | "az" | "za" | "updated";

function SkeletonCard() {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 space-y-3 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="h-4 w-16 bg-gray-800 rounded" />
        <div className="h-5 w-20 bg-gray-800 rounded-full" />
      </div>
      <div className="h-5 w-3/4 bg-gray-800 rounded" />
      <div className="h-3 w-1/2 bg-gray-800 rounded" />
      <div className="h-3 w-24 bg-gray-800 rounded" />
      <div className="flex gap-2 pt-1">
        <div className="h-8 flex-1 bg-gray-800 rounded-lg" />
        <div className="h-8 flex-1 bg-gray-800 rounded-lg" />
        <div className="h-8 w-10 bg-gray-800 rounded-lg" />
      </div>
    </div>
  );
}

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "newest",  label: "Newest first" },
  { value: "oldest",  label: "Oldest first" },
  { value: "updated", label: "Recently updated" },
  { value: "az",      label: "A → Z" },
  { value: "za",      label: "Z → A" },
];

export default function PortalsListPage() {
  const router = useRouter();
  const [portals, setPortals]       = useState<PortalPage[]>([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Search / filter / sort state
  const [query, setQuery]           = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sortKey, setSortKey]       = useState<SortKey>("newest");
  const [showSortMenu, setShowSortMenu] = useState(false);

  const fetchPortals = () => {
    setLoading(true);
    portalApi.get("/portal/padmin/pages")
      .then(res => setPortals(res.data ?? []))
      .catch(() => setError("Failed to load portals. Please try again."))
      .finally(() => setLoading(false));
  };

  useEffect(fetchPortals, []);

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`Delete "${title}"? This cannot be undone.`)) return;
    setDeletingId(id);
    try {
      await portalApi.delete(`/portal/padmin/pages/${id}`);
      setPortals(prev => prev.filter(p => p.id !== id));
    } catch {
      alert("Failed to delete portal. Please try again.");
    } finally {
      setDeletingId(null);
    }
  };

  // Derived list: filter then sort
  const filtered = useMemo(() => {
    let list = portals;

    if (query.trim()) {
      const q = query.trim().toLowerCase();
      list = list.filter(p =>
        p.title.toLowerCase().includes(q) || p.slug.toLowerCase().includes(q)
      );
    }

    if (statusFilter !== "all") {
      list = list.filter(p => p.status === statusFilter);
    }

    return [...list].sort((a, b) => {
      switch (sortKey) {
        case "oldest":  return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        case "az":      return a.title.localeCompare(b.title);
        case "za":      return b.title.localeCompare(a.title);
        case "updated": return new Date(b.updatedAt ?? b.createdAt).getTime() - new Date(a.updatedAt ?? a.createdAt).getTime();
        default:        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
    });
  }, [portals, query, statusFilter, sortKey]);

  const publishedCount = portals.filter(p => p.status === "PUBLISHED").length;
  const draftCount     = portals.filter(p => p.status !== "PUBLISHED").length;

  return (
    <div className="space-y-6" onClick={() => setShowSortMenu(false)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Globe className="w-5 h-5 text-indigo-400" />
            My Portals
          </h1>
          <p className="text-sm text-gray-400 mt-0.5">
            {portals.length > 0
              ? `${portals.length} portal${portals.length !== 1 ? "s" : ""} · ${publishedCount} published · ${draftCount} draft`
              : "Manage and build your customer-facing portals"}
          </p>
        </div>
        <button
          onClick={() => router.push("/apps/portal-builder/portals/new")}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold rounded-xl transition-colors"
        >
          <Plus className="w-4 h-4" />
          Create Portal
        </button>
      </div>

      {/* Search + filter bar */}
      {!loading && portals.length > 0 && (
        <div className="flex items-center gap-3 flex-wrap">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500 pointer-events-none" />
            <input
              type="text"
              placeholder="Search portals…"
              value={query}
              onChange={e => setQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-gray-900 border border-gray-800 focus:border-indigo-600 rounded-xl text-sm text-white placeholder-gray-600 outline-none transition-colors"
            />
          </div>

          {/* Status pills */}
          <div className="flex items-center gap-1 bg-gray-900 border border-gray-800 rounded-xl p-1">
            {([
              { v: "all",       l: "All" },
              { v: "PUBLISHED", l: "Published" },
              { v: "DRAFT",     l: "Draft" },
            ] as { v: StatusFilter; l: string }[]).map(({ v, l }) => (
              <button
                key={v}
                onClick={() => setStatusFilter(v)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
                  statusFilter === v
                    ? "bg-indigo-600 text-white"
                    : "text-gray-400 hover:text-white"
                }`}
              >{l}</button>
            ))}
          </div>

          {/* Sort dropdown */}
          <div className="relative">
            <button
              onClick={e => { e.stopPropagation(); setShowSortMenu(v => !v); }}
              className="flex items-center gap-1.5 px-3 py-2 bg-gray-900 border border-gray-800 hover:border-gray-700 rounded-xl text-xs text-gray-400 hover:text-white transition-colors"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              {SORT_OPTIONS.find(o => o.value === sortKey)?.label}
              <ChevronDown className="w-3 h-3" />
            </button>
            {showSortMenu && (
              <div
                className="absolute right-0 top-full mt-1 bg-gray-900 border border-gray-800 rounded-xl shadow-2xl z-30 py-1 w-48"
                onClick={e => e.stopPropagation()}
              >
                {SORT_OPTIONS.map(o => (
                  <button
                    key={o.value}
                    onClick={() => { setSortKey(o.value); setShowSortMenu(false); }}
                    className={`w-full text-left px-3 py-2 text-xs transition-colors ${
                      sortKey === o.value
                        ? "text-indigo-400 font-semibold bg-indigo-950/40"
                        : "text-gray-400 hover:text-white hover:bg-gray-800"
                    }`}
                  >{o.value === sortKey ? "✓ " : ""}{o.label}</button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 bg-red-950/30 border border-red-900/50 rounded-xl px-4 py-3">
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => <SkeletonCard key={i} />)}
        </div>
      )}

      {/* Empty — no portals at all */}
      {!loading && !error && portals.length === 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-16 text-center">
          <Globe className="w-10 h-10 text-gray-700 mx-auto mb-3" />
          <p className="text-lg font-semibold text-gray-300 mb-1">No portals yet</p>
          <p className="text-sm text-gray-500 mb-5">Create your first portal to get started</p>
          <button
            onClick={() => router.push("/apps/portal-builder/portals/new")}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold rounded-xl transition-colors"
          >
            <Plus className="w-4 h-4" />Create Portal
          </button>
        </div>
      )}

      {/* No results after filter */}
      {!loading && portals.length > 0 && filtered.length === 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-12 text-center">
          <Search className="w-8 h-8 text-gray-700 mx-auto mb-3" />
          <p className="text-sm font-semibold text-gray-400 mb-1">No portals match your search</p>
          <button onClick={() => { setQuery(""); setStatusFilter("all"); }}
            className="text-xs text-indigo-400 hover:text-indigo-300 mt-2">
            Clear filters
          </button>
        </div>
      )}

      {/* Grid */}
      {!loading && filtered.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(p => (
            <div
              key={p.id}
              className="group bg-gray-900 border border-gray-800 rounded-2xl p-5 flex flex-col gap-3 hover:border-gray-700 hover:shadow-lg hover:shadow-black/20 transition-all duration-150"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="w-9 h-9 rounded-xl bg-indigo-900/40 border border-indigo-800/50 flex items-center justify-center shrink-0">
                  <Globe className="w-4 h-4 text-indigo-400" />
                </div>
                <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${
                  p.status === "PUBLISHED"
                    ? "bg-green-900/40 text-green-400 border-green-800/50"
                    : "bg-gray-800 text-gray-500 border border-gray-700"
                }`}>
                  {p.status}
                </span>
              </div>

              <div className="space-y-1 flex-1">
                <h3 className="font-semibold text-white text-sm leading-snug group-hover:text-indigo-300 transition-colors">
                  {p.title}
                </h3>
                <p className="text-xs font-mono text-gray-500 truncate">/{p.slug}</p>
                <p className="text-[10px] text-gray-600">
                  Created {new Date(p.createdAt).toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" })}
                </p>
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => router.push(`/apps/portal-builder/portals/${p.id}`)}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg transition-colors"
                >
                  <Pencil className="w-3 h-3" />Edit
                </button>
                <a
                  href={`/portal/${p.slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs font-semibold rounded-lg transition-colors"
                >
                  <Eye className="w-3 h-3" />Preview
                </a>
                <button
                  onClick={() => handleDelete(p.id, p.title)}
                  disabled={deletingId === p.id}
                  className="flex items-center justify-center px-3 py-2 bg-gray-800 hover:bg-red-900/40 hover:text-red-400 text-gray-500 rounded-lg transition-colors disabled:opacity-50"
                >
                  {deletingId === p.id
                    ? <Loader2 className="w-3 h-3 animate-spin" />
                    : <Trash2 className="w-3 h-3" />}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
