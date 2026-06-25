"use client";
import { useEffect, useState, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import { portalApi } from "@/lib/portal-api";
import {
  Loader2, Plus, Trash2, Pencil, FileText, Globe, Lock,
  CheckCircle2, Clock, Star, ChevronDown, Users, Search,
  Shield, UserCheck, Building2, X, Eye, EyeOff,
  Monitor, Smartphone, Tablet, ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ── Types ──────────────────────────────────────────────────────────────────

interface PortalPage {
  id: string;
  title: string;
  slug: string;
  description?: string;
  status: string;
  publishedAt?: string;
  createdAt: string;
  updatedAt: string;
  accessTypes?: any;
  isPinned?: boolean; // stored in localStorage
}

interface Department { id: string; name: string; color: string }

const STATUS_STYLES: Record<string, string> = {
  PUBLISHED: "bg-emerald-100 text-emerald-700",
  DRAFT:     "bg-amber-100   text-amber-700",
  ARCHIVED:  "bg-gray-100    text-gray-500",
};

const PINNED_KEY = "portal-page-pins";

function getPinnedIds(): Set<string> {
  try { return new Set(JSON.parse(localStorage.getItem(PINNED_KEY) ?? "[]")); }
  catch { return new Set(); }
}
function savePinnedIds(ids: Set<string>) {
  localStorage.setItem(PINNED_KEY, JSON.stringify([...ids]));
}

// ── Dropdown shell ─────────────────────────────────────────────────────────

function Dropdown({ trigger, children, align = "left" }: {
  trigger: React.ReactNode;
  children: React.ReactNode;
  align?: "left" | "right";
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);
  return (
    <div ref={ref} className="relative">
      <div onClick={() => setOpen(p => !p)}>{trigger}</div>
      {open && (
        <div className={cn(
          "absolute top-full mt-1.5 z-50 bg-white border border-gray-200 rounded-xl shadow-2xl min-w-[220px]",
          align === "right" ? "right-0" : "left-0"
        )}>
          {children}
        </div>
      )}
    </div>
  );
}

// ── Access Control Panel ───────────────────────────────────────────────────

function AccessPanel({ page, departments, onUpdate }: {
  page: PortalPage;
  departments: Department[];
  onUpdate: (id: string, accessTypes: any) => void;
}) {
  const access = page.accessTypes ?? {};
  const mode: "all" | "departments" | "custom" = access.mode ?? "all";
  const allowedDepts: string[] = access.allowedDepartments ?? [];
  const [saving, setSaving] = useState(false);

  const setMode = async (m: string) => {
    setSaving(true);
    try {
      const updated = { ...access, mode: m };
      await portalApi.patch(`/portal/padmin/pages/${page.id}`, { accessTypes: updated });
      onUpdate(page.id, updated);
    } catch {} finally { setSaving(false); }
  };

  const toggleDept = async (deptId: string) => {
    const next = allowedDepts.includes(deptId)
      ? allowedDepts.filter(d => d !== deptId)
      : [...allowedDepts, deptId];
    setSaving(true);
    try {
      const updated = { ...access, mode: "departments", allowedDepartments: next };
      await portalApi.patch(`/portal/padmin/pages/${page.id}`, { accessTypes: updated });
      onUpdate(page.id, updated);
    } catch {} finally { setSaving(false); }
  };

  return (
    <div className="p-4 space-y-3 min-w-[260px]">
      <p className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">Page Access</p>

      {/* Mode selector */}
      {[
        { val: "all",         label: "All Portal Users",   icon: Users },
        { val: "departments", label: "By Department",       icon: Building2 },
        { val: "custom",      label: "Custom Users",        icon: UserCheck },
      ].map(({ val, label, icon: Icon }) => (
        <button
          key={val}
          onClick={() => setMode(val)}
          className={cn(
            "w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors text-left",
            mode === val
              ? "bg-blue-600 text-white"
              : "text-gray-600 hover:bg-gray-100"
          )}
        >
          {saving && mode === val ? <Loader2 className="w-4 h-4 animate-spin" /> : <Icon className="w-4 h-4 shrink-0" />}
          {label}
        </button>
      ))}

      {/* Department list */}
      {mode === "departments" && departments.length > 0 && (
        <div className="mt-2 pt-2 border-t border-gray-200 space-y-1.5">
          <p className="text-[11px] text-gray-500 uppercase tracking-wider mb-2">Select Departments</p>
          {departments.map(dept => (
            <button
              key={dept.id}
              onClick={() => toggleDept(dept.id)}
              className={cn(
                "w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-sm transition-colors text-left",
                allowedDepts.includes(dept.id)
                  ? "bg-blue-50 text-blue-700"
                  : "text-gray-600 hover:bg-gray-100"
              )}
            >
              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: dept.color }} />
              {dept.name}
              {allowedDepts.includes(dept.id) && <CheckCircle2 className="w-3.5 h-3.5 ml-auto text-blue-600" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Device Preview Modal ───────────────────────────────────────────────────

const DEVICES = [
  { key: "phone",   label: "Phone",   Icon: Smartphone, w: 375,  h: 812,  scale: 0.72 },
  { key: "tablet",  label: "Tablet",  Icon: Tablet,     w: 768,  h: 1024, scale: 0.58 },
  { key: "laptop",  label: "Laptop",  Icon: Monitor,    w: 1280, h: 800,  scale: 0.50 },
  { key: "desktop", label: "Desktop", Icon: Monitor,    w: 1440, h: 900,  scale: 0.46 },
] as const;

type DeviceKey = typeof DEVICES[number]["key"];

function PagePreviewModal({ page, onClose }: { page: PortalPage; onClose: () => void }) {
  const [device, setDevice] = useState<DeviceKey>("phone");
  const current = DEVICES.find(d => d.key === device)!;
  const pageUrl = `/portal/pages/${page.slug}`;

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col bg-gray-100/95 backdrop-blur-sm">
      {/* Top bar */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-200 bg-white shrink-0 shadow-sm">
        <div className="flex items-center gap-2 min-w-0">
          <Monitor className="w-4 h-4 text-blue-500 shrink-0" />
          <span className="text-sm font-semibold text-gray-900 truncate">{page.title}</span>
          <span className="text-xs text-gray-400 font-mono hidden sm:inline">/{page.slug}</span>
        </div>

        {/* Device picker */}
        <div className="flex items-center gap-1 mx-auto p-1 rounded-xl bg-gray-100 border border-gray-200">
          {DEVICES.map(({ key, label, Icon }) => (
            <button
              key={key}
              onClick={() => setDevice(key)}
              title={label}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all",
                device === key
                  ? "bg-white text-blue-600 shadow-sm border border-gray-200"
                  : "text-gray-500 hover:text-gray-800 hover:bg-gray-200"
              )}
            >
              <Icon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{label}</span>
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <a
            href={pageUrl}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium text-gray-500 hover:text-gray-800 hover:bg-gray-100 transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Open</span>
          </a>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-500 hover:text-gray-800 hover:bg-gray-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Device size label */}
      <div className="flex items-center justify-center py-2 shrink-0">
        <span className="text-[11px] text-gray-500 font-mono">
          {current.w} × {current.h}px · {Math.round(current.scale * 100)}% zoom
        </span>
      </div>

      {/* Preview area */}
      <div className="flex-1 overflow-auto flex items-start justify-center pb-8 px-4">
        <div
          className="relative"
          style={{
            width: current.w * current.scale,
            height: current.h * current.scale,
            flexShrink: 0,
          }}
        >
          {/* Device frame */}
          <div
            className="absolute inset-0 rounded-2xl overflow-hidden shadow-2xl"
            style={{
              border: `${device === "phone" ? "10px" : device === "tablet" ? "14px" : "12px"} solid #1f2937`,
              borderRadius: device === "phone" ? "28px" : device === "tablet" ? "20px" : "12px",
              boxShadow: "0 0 0 1px #374151, 0 25px 60px rgba(0,0,0,0.6)",
            }}
          >
            <iframe
              src={pageUrl}
              title={`Preview: ${page.title}`}
              style={{
                width: current.w,
                height: current.h,
                border: "none",
                transformOrigin: "top left",
                transform: `scale(${current.scale})`,
                display: "block",
                background: "#fff",
              }}
            />
          </div>

          {/* Phone notch */}
          {device === "phone" && (
            <div
              className="absolute left-1/2 -translate-x-1/2 bg-gray-700 rounded-full z-10"
              style={{ top: -6, width: 60, height: 12 }}
            />
          )}
        </div>
      </div>

      {/* Bottom hint */}
      <div className="flex items-center justify-center pb-4 shrink-0">
        <p className="text-[10px] text-gray-500 text-center px-4">
          Preview requires portal session. If the page appears blank, open it in a portal tab first.
        </p>
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────

export default function PagesListPage() {
  const router = useRouter();
  const [pages, setPages] = useState<PortalPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ title: "", slug: "", description: "" });
  const [error, setError] = useState("");
  const [departments, setDepartments] = useState<Department[]>([]);
  const [search, setSearch] = useState("");
  const [pinnedIds, setPinnedIds] = useState<Set<string>>(new Set());
  const [activeFilter, setActiveFilter] = useState<"all" | "favorites">("all");

  const load = () => {
    setLoading(true);
    Promise.all([
      portalApi.get("/portal/padmin/pages"),
      portalApi.get("/portal/padmin/departments").catch(() => ({ data: [] })),
    ])
      .then(([pagesRes, deptsRes]) => {
        setPages(pagesRes.data ?? []);
        setDepartments(deptsRes.data ?? []);
        setPinnedIds(getPinnedIds());
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  // ── Derived lists ─────────────────────────────────────────────────────
  const filteredPages = useMemo(() => {
    let list = pages;
    if (activeFilter === "favorites") list = list.filter(p => pinnedIds.has(p.id));
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(p =>
        p.title.toLowerCase().includes(q) || p.slug.toLowerCase().includes(q)
      );
    }
    // Pinned pages sort to top
    return [...list].sort((a, b) => {
      const aPin = pinnedIds.has(a.id) ? 0 : 1;
      const bPin = pinnedIds.has(b.id) ? 0 : 1;
      return aPin - bPin;
    });
  }, [pages, pinnedIds, activeFilter, search]);

  const pinnedPages = useMemo(() => pages.filter(p => pinnedIds.has(p.id)), [pages, pinnedIds]);

  // ── Actions ────────────────────────────────────────────────────────────

  const togglePin = (page: PortalPage) => {
    const next = new Set(pinnedIds);
    if (next.has(page.id)) next.delete(page.id); else next.add(page.id);
    setPinnedIds(next);
    savePinnedIds(next);
  };

  const handleCreate = async () => {
    if (!form.title.trim()) { setError("Title is required"); return; }
    setCreating(true); setError("");
    try {
      const res = await portalApi.post("/portal/padmin/pages", form);
      router.push(`/portal/admin/pages/${res.data.id}`);
    } catch (e: any) {
      setError(e?.response?.data?.message ?? "Failed to create page");
      setCreating(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this page? This cannot be undone.")) return;
    try { await portalApi.delete(`/portal/padmin/pages/${id}`); load(); } catch {}
  };

  const handlePublish = async (page: PortalPage) => {
    const newStatus = page.status === "PUBLISHED" ? "DRAFT" : "PUBLISHED";
    try {
      await portalApi.patch(`/portal/padmin/pages/${page.id}/publish`, { status: newStatus });
      setPages(prev => prev.map(p => p.id === page.id ? { ...p, status: newStatus } : p));
    } catch {}
  };

  const handleAccessUpdate = (id: string, accessTypes: any) => {
    setPages(prev => prev.map(p => p.id === id ? { ...p, accessTypes } : p));
  };

  return (
    <div className="space-y-5 max-w-5xl mx-auto">

      {/* ── Zoho-style top bar ─────────────────────────────────────────── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FileText className="w-5 h-5 text-blue-400" />
            <div>
              <h1 className="text-xl font-bold text-gray-900">Portal Pages</h1>
              <p className="text-sm text-gray-500 mt-0.5">Manage portal pages, access, and visibility.</p>
            </div>
          </div>
          <button
            onClick={() => { setShowCreate(true); setError(""); }}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" /> New Page
          </button>
        </div>

        {/* ── Control bar (Favorites | Page Selector | Access | Search) ── */}
        <div className="flex flex-wrap items-center gap-2">

          {/* 1. Favorites dropdown */}
          <Dropdown
            trigger={
              <button className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm font-medium transition-colors",
                activeFilter === "favorites"
                  ? "bg-amber-50 border-amber-300 text-amber-700"
                  : "bg-white border-gray-200 text-gray-600 hover:border-gray-400"
              )}>
                <Star className={cn("w-3.5 h-3.5", activeFilter === "favorites" && "fill-amber-400 text-amber-400")} />
                Favorites
                {pinnedPages.length > 0 && (
                  <span className="text-xs bg-amber-900/50 text-amber-400 px-1.5 py-0.5 rounded-full">
                    {pinnedPages.length}
                  </span>
                )}
                <ChevronDown className="w-3.5 h-3.5 text-gray-500" />
              </button>
            }
          >
            <div className="py-2">
              <div className="px-3 py-1.5 text-[11px] text-gray-500 uppercase tracking-wider font-semibold">
                Pinned Pages
              </div>
              {pinnedPages.length === 0 ? (
                <div className="px-4 py-3 text-xs text-gray-500">
                  No favorites yet. Click ★ on any page to pin it.
                </div>
              ) : (
                pinnedPages.map(p => (
                  <button
                    key={p.id}
                    onClick={() => { setActiveFilter("all"); setSearch(p.title); }}
                    className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors text-left"
                  >
                    <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400 shrink-0" />
                    <span className="truncate">{p.title}</span>
                    <span className={cn("ml-auto text-xs px-1.5 py-0.5 rounded-full shrink-0", STATUS_STYLES[p.status] ?? STATUS_STYLES.DRAFT)}>
                      {p.status}
                    </span>
                  </button>
                ))
              )}
              <div className="border-t border-gray-100 mt-1 pt-1 px-3 py-1.5">
                <button
                  onClick={() => setActiveFilter(f => f === "favorites" ? "all" : "favorites")}
                  className="text-xs text-blue-600 hover:text-blue-500 transition-colors"
                >
                  {activeFilter === "favorites" ? "Show all pages" : "Show favorites only"}
                </button>
              </div>
            </div>
          </Dropdown>

          {/* 2. Page selector (All Pages dropdown — quick-jump) */}
          <Dropdown
            trigger={
              <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border bg-white border-gray-200 text-gray-600 hover:border-gray-400 text-sm font-medium transition-colors">
                <Globe className="w-3.5 h-3.5 text-blue-600" />
                {filteredPages.length > 0 ? `${filteredPages.length} Pages` : "All Pages"}
                <ChevronDown className="w-3.5 h-3.5 text-gray-500" />
              </button>
            }
          >
            <div className="py-2 max-h-72 overflow-y-auto">
              <div className="px-3 py-1 mb-1">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
                  <input
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Search pages…"
                    className="w-full bg-white border border-gray-200 rounded-lg pl-8 pr-3 py-1.5 text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>
              {pages.length === 0 && (
                <div className="px-4 py-3 text-xs text-gray-500">No pages created yet.</div>
              )}
              {pages
                .filter(p => !search || p.title.toLowerCase().includes(search.toLowerCase()))
                .map(p => (
                  <button
                    key={p.id}
                    onClick={() => router.push(`/portal/admin/pages/${p.id}`)}
                    className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-gray-900 transition-colors text-left group"
                  >
                    {pinnedIds.has(p.id)
                      ? <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400 shrink-0" />
                      : <FileText className="w-3.5 h-3.5 text-gray-600 shrink-0" />}
                    <span className="flex-1 truncate">{p.title}</span>
                    <span className="text-[10px] font-mono text-gray-600 group-hover:text-gray-400">/{p.slug}</span>
                  </button>
                ))}
            </div>
          </Dropdown>

          {/* 3. Access / Custom Users (global info) */}
          <Dropdown
            trigger={
              <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border bg-white border-gray-200 text-gray-600 hover:border-gray-400 text-sm font-medium transition-colors">
                <Shield className="w-3.5 h-3.5 text-purple-500" />
                Access Control
                <ChevronDown className="w-3.5 h-3.5 text-gray-500" />
              </button>
            }
          >
            <div className="py-2 min-w-[240px]">
              <div className="px-3 py-1.5 text-[11px] text-gray-500 uppercase tracking-wider font-semibold">
                Page Access Summary
              </div>
              {pages.length === 0 && (
                <div className="px-4 py-3 text-xs text-gray-500">No pages yet.</div>
              )}
              {pages.map(p => {
                const mode = p.accessTypes?.mode ?? "all";
                return (
                  <div key={p.id} className="flex items-center gap-2.5 px-4 py-2 text-xs text-gray-500">
                    <span className="flex-1 text-gray-800 truncate">{p.title}</span>
                    <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-medium", {
                      "bg-emerald-100 text-emerald-700": mode === "all",
                      "bg-blue-100 text-blue-700":       mode === "departments",
                      "bg-purple-100 text-purple-700":   mode === "custom",
                    })}>
                      {mode === "all" ? "All Users" : mode === "departments" ? "By Dept" : "Custom"}
                    </span>
                  </div>
                );
              })}
            </div>
          </Dropdown>

          {/* Search bar */}
          <div className="flex-1 min-w-0 sm:min-w-48 relative w-full sm:w-auto">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search pages…"
              className="w-full bg-white border border-gray-200 rounded-lg pl-9 pr-9 py-1.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-blue-500"
            />
            {search && (
              <button onClick={() => setSearch("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-400">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Create form ────────────────────────────────────────────────── */}
      {showCreate && (
        <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-900">Create New Page</h2>
            <button onClick={() => setShowCreate(false)} className="text-gray-400 hover:text-gray-700">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-600 mb-1.5">Page Title *</label>
              <input
                value={form.title}
                onChange={e => {
                  const title = e.target.value;
                  const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
                  setForm(f => ({ ...f, title, slug }));
                }}
                placeholder="e.g. Patient Registration"
                className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1.5">Slug</label>
              <input
                value={form.slug}
                onChange={e => setForm(f => ({ ...f, slug: e.target.value }))}
                placeholder="auto-generated"
                className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-blue-500"
              />
            </div>
            <div className="col-span-1 sm:col-span-2">
              <label className="block text-xs text-gray-600 mb-1.5">Description (optional)</label>
              <input
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder="Short description"
                className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>
          {error && <p className="text-xs text-red-400">{error}</p>}
          <div className="flex gap-2 pt-1">
            <button onClick={handleCreate} disabled={creating}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors">
              {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              Create & Edit
            </button>
            <button onClick={() => setShowCreate(false)} className="px-4 py-2 text-gray-500 hover:text-gray-800 hover:bg-gray-100 text-sm rounded-lg transition-colors">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* ── Pages list ─────────────────────────────────────────────────── */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-visible shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <Loader2 className="w-5 h-5 animate-spin text-blue-400" />
          </div>
        ) : filteredPages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
            <FileText className="w-8 h-8 text-gray-300" />
            <p className="text-sm text-gray-500">
              {search ? `No pages match "${search}"` : activeFilter === "favorites" ? "No favorites yet." : "No pages yet."}
            </p>
            {!search && activeFilter !== "favorites" && (
              <button onClick={() => setShowCreate(true)} className="flex items-center gap-1.5 text-sm text-blue-400 hover:text-blue-300">
                <Plus className="w-4 h-4" /> Create your first page
              </button>
            )}
          </div>
        ) : (
          <>
            {/* Table header */}
            <div className="hidden sm:grid grid-cols-[auto_1fr_auto_auto_auto] items-center px-5 py-2.5 border-b border-gray-100 bg-gray-50 gap-4 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
              <span className="w-6" />
              <span>Page</span>
              <span>Access</span>
              <span>Status</span>
              <span className="text-right">{filteredPages.length} of {pages.length}</span>
            </div>
            <div className="divide-y divide-gray-100">
              {filteredPages.map(page => {
                const pinned = pinnedIds.has(page.id);
                const mode = page.accessTypes?.mode ?? "all";
                return (
                  <div key={page.id} className={cn(
                    "flex items-center gap-3 sm:gap-4 px-3 sm:px-5 py-3 sm:py-3.5 hover:bg-gray-50 transition-colors group",
                    pinned && "bg-amber-50/40"
                  )}>
                    {/* Pin star */}
                    <button
                      onClick={() => togglePin(page)}
                      title={pinned ? "Remove from favorites" : "Add to favorites"}
                      className="shrink-0 transition-all"
                    >
                      <Star className={cn(
                        "w-4 h-4 transition-colors",
                        pinned ? "fill-amber-400 text-amber-400" : "text-gray-300 hover:text-amber-400"
                      )} />
                    </button>

                    {/* Icon */}
                    <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                      {page.status === "PUBLISHED"
                        ? <Globe className="w-4 h-4 text-emerald-600" />
                        : <Lock className="w-4 h-4 text-gray-400" />}
                    </div>

                    {/* Title + slug */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-gray-900 truncate">{page.title}</p>
                        {pinned && <Star className="w-3 h-3 fill-amber-400 text-amber-400 shrink-0" />}
                      </div>
                      <p className="text-xs text-gray-500 font-mono mt-0.5">/{page.slug}</p>
                    </div>

                    {/* Access badge + control */}
                    <Dropdown align="right" trigger={
                      <button className={cn(
                        "flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors",
                        mode === "all"         ? "bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100" :
                        mode === "departments" ? "bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100" :
                                                 "bg-purple-50 border-purple-200 text-purple-700 hover:bg-purple-100"
                      )}>
                        {mode === "all" ? <Users className="w-3.5 h-3.5" /> :
                         mode === "departments" ? <Building2 className="w-3.5 h-3.5" /> :
                         <UserCheck className="w-3.5 h-3.5" />}
                        {mode === "all" ? "All Users" : mode === "departments" ? "By Dept" : "Custom"}
                        <ChevronDown className="w-3 h-3 opacity-60" />
                      </button>
                    }>
                      <AccessPanel
                        page={page}
                        departments={departments}
                        onUpdate={handleAccessUpdate}
                      />
                    </Dropdown>

                    {/* Status badge */}
                    <span className={cn(
                      "shrink-0 text-xs px-2.5 py-1 rounded-full font-medium flex items-center gap-1",
                      STATUS_STYLES[page.status] ?? STATUS_STYLES.DRAFT
                    )}>
                      {page.status === "PUBLISHED"
                        ? <><CheckCircle2 className="w-3 h-3" />Live</>
                        : <><Clock className="w-3 h-3" />Draft</>}
                    </span>

                    {/* Actions */}
                    <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => handlePublish(page)}
                        title={page.status === "PUBLISHED" ? "Unpublish" : "Publish"}
                        className={cn(
                          "p-1.5 rounded-lg transition-colors",
                          page.status === "PUBLISHED"
                            ? "text-gray-400 hover:text-amber-600 hover:bg-amber-50"
                            : "text-gray-400 hover:text-emerald-600 hover:bg-emerald-50"
                        )}
                      >
                        {page.status === "PUBLISHED" ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                      <button
                        onClick={() => router.push(`/portal/admin/pages/${page.id}`)}
                        className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Edit page"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(page.id)}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete page"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
