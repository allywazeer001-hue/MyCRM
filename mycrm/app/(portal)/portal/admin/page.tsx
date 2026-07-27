"use client";
import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { portalApi } from "@/lib/portal-api";
import {
  FormInput, Layers, Users, FileText, ChevronRight, Menu,
  Newspaper, Images, Loader2, ChevronUp, ChevronDown, Search, ArrowUpDown,
} from "lucide-react";

const SECTIONS = [
  { href: "/portal/admin/publications", icon: Newspaper, color: "rose",    title: "Publications",    description: "Create and publish posts, announcements and events." },
  { href: "/portal/admin/gallery",      icon: Images,    color: "amber",   title: "Gallery",         description: "Manage shared files, images and learning materials." },
  { href: "/portal/admin/fields",       icon: FormInput, color: "violet",  title: "Field Builder",   description: "Create custom portal fields and map them to CRM data." },
  { href: "/portal/admin/sections",     icon: Layers,    color: "blue",    title: "Section Builder", description: "Organise fields into sections, tabs, and groups." },
  { href: "/portal/admin/menu",         icon: Menu,      color: "orange",  title: "Menu Builder",    description: "Create and manage portal navigation menus." },
  { href: "/portal/admin/pages",        icon: FileText,  color: "sky",     title: "Pages",           description: "Build portal pages, draft, preview, and publish." },
  { href: "/portal/admin/users",        icon: Users,     color: "emerald", title: "Portal Users",    description: "Manage portal user accounts, roles, and permissions." },
];

const C: Record<string, { card: string; icon: string }> = {
  rose:    { card: "border-rose-200 bg-rose-50",       icon: "text-rose-600 bg-rose-100" },
  amber:   { card: "border-amber-200 bg-amber-50",     icon: "text-amber-600 bg-amber-100" },
  violet:  { card: "border-violet-200 bg-violet-50",   icon: "text-violet-600 bg-violet-100" },
  blue:    { card: "border-blue-200 bg-blue-50",       icon: "text-blue-600 bg-blue-100" },
  orange:  { card: "border-orange-200 bg-orange-50",   icon: "text-orange-600 bg-orange-100" },
  sky:     { card: "border-sky-200 bg-sky-50",         icon: "text-sky-600 bg-sky-100" },
  emerald: { card: "border-emerald-200 bg-emerald-50", icon: "text-emerald-600 bg-emerald-100" },
};

type SortKey = "postsOpened" | "name" | "lastActivity";

function timeAgo(d?: string | null) {
  if (!d) return "";
  const ms = Date.now() - new Date(d).getTime();
  const s = Math.floor(ms / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const days = Math.floor(h / 24);
  if (days < 7) return `${days}d ago`;
  const wks = Math.floor(days / 7);
  if (wks < 4) return `${wks}w ago`;
  const mo = Math.floor(days / 30);
  if (mo < 12) return `${mo}mo ago`;
  return `${Math.floor(mo / 12)}y ago`;
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function PortalAdminHub() {
  const router = useRouter();
  const [stats, setStats]               = useState<any>(null);
  const [portalUsers, setPortalUsers]   = useState<any[] | null>(null);
  const [usersLoading, setUsersLoading] = useState(true);
  const [sortKey, setSortKey]           = useState<SortKey>("postsOpened");
  const [sortDir, setSortDir]           = useState<"asc" | "desc">("desc");
  const [search, setSearch]             = useState("");

  useEffect(() => {
    portalApi.get("/portal/padmin/stats").then(r => setStats(r.data)).catch(() => {});
  }, []);

  useEffect(() => {
    setUsersLoading(true);
    api.get("/publications/user-engagement/summary")
      .then(r => setPortalUsers(r.data.users ?? []))
      .catch(() => setPortalUsers([]))
      .finally(() => setUsersLoading(false));
  }, []);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir(key === "postsOpened" ? "desc" : "asc"); }
  };

  const SortIcon = ({ col }: { col: SortKey }) => {
    if (sortKey !== col) return <ArrowUpDown className="w-3 h-3 opacity-30" />;
    return sortDir === "asc" ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />;
  };

  const displayedUsers = useMemo(() => {
    if (!portalUsers) return [];
    let list = portalUsers;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((u: any) =>
        u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q),
      );
    }
    return [...list].sort((a: any, b: any) => {
      let cmp = 0;
      if (sortKey === "postsOpened")  cmp = (a.postsOpened ?? 0) - (b.postsOpened ?? 0);
      else if (sortKey === "name")    cmp = a.name.localeCompare(b.name);
      else {
        const ta = a.lastActivity ? new Date(a.lastActivity).getTime() : 0;
        const tb = b.lastActivity ? new Date(b.lastActivity).getTime() : 0;
        cmp = ta - tb;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [portalUsers, search, sortKey, sortDir]);

  return (
    <div className="max-w-5xl mx-auto space-y-6">

      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-gray-900">Portal Admin Panel</h1>
        <p className="text-sm text-gray-500 mt-1">
          Build and manage your portal — fields, sections, layouts, menus and users.
        </p>
      </div>

      {/* Stats strip */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { label: "Users",      value: stats.totalUsers },
            { label: "Sections",   value: stats.totalSections },
            { label: "Fields",     value: stats.totalFields },
            { label: "Documents",  value: stats.totalDocuments },
            { label: "Pages",      value: stats.totalPages },
            { label: "Menu items", value: stats.totalMenuItems },
          ].map(s => (
            <div key={s.label} className="bg-white border border-gray-200 rounded-xl px-4 py-3 shadow-sm text-center">
              <p className="text-2xl font-bold text-gray-900">{s.value ?? 0}</p>
              <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Main grid: engagement (wider) + nav cards */}
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6 items-start">

        {/* User Engagement table — 3/5 */}
        <div className="xl:col-span-3 bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden flex flex-col">
          {/* Table header */}
          <div className="px-5 py-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex-1 min-w-0">
              <h2 className="text-sm font-semibold text-gray-900">User Engagement</h2>
              <p className="text-xs text-gray-400 mt-0.5">Posts opened per portal user</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {portalUsers !== null && (
                <span className="text-xs text-gray-400 whitespace-nowrap">
                  {displayedUsers.length}/{portalUsers.length}
                </span>
              )}
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search users…"
                  className="pl-8 pr-3 py-1.5 text-xs border border-gray-200 rounded-lg bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:border-violet-400 focus:ring-1 focus:ring-violet-400 w-36"
                />
              </div>
            </div>
          </div>

          {usersLoading ? (
            <div className="flex items-center justify-center py-14">
              <Loader2 className="w-5 h-5 animate-spin text-violet-500" />
            </div>
          ) : (
            <div className="overflow-y-auto" style={{ maxHeight: 360 }}>
              <table className="w-full text-xs">
                <thead className="sticky top-0 z-10 bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="text-left px-5 py-3 font-medium">
                      <button onClick={() => toggleSort("name")}
                        className="flex items-center gap-1 text-gray-500 hover:text-gray-900 transition-colors">
                        User <SortIcon col="name" />
                      </button>
                    </th>
                    <th className="text-center px-4 py-3 font-medium w-24">
                      <button onClick={() => toggleSort("postsOpened")}
                        className="flex items-center gap-1 text-gray-500 hover:text-gray-900 transition-colors mx-auto">
                        Posts <SortIcon col="postsOpened" />
                      </button>
                    </th>
                    <th className="text-left px-4 py-3 font-medium">
                      <button onClick={() => toggleSort("lastActivity")}
                        className="flex items-center gap-1 text-gray-500 hover:text-gray-900 transition-colors">
                        Last Active <SortIcon col="lastActivity" />
                      </button>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {displayedUsers.map((u: any) => (
                    <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-3">
                        <p className="font-medium text-gray-800 truncate max-w-[160px]">{u.name}</p>
                        <p className="text-gray-400 mt-0.5 truncate max-w-[160px]">{u.email}</p>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {u.postsOpened > 0
                          ? <span className="inline-block min-w-[28px] px-2 py-0.5 rounded-full bg-violet-100 text-violet-700 font-semibold">{u.postsOpened}</span>
                          : <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        {u.lastActivity ? (
                          <>
                            <span className="text-gray-700 font-medium">{timeAgo(u.lastActivity)}</span>
                            <span className="block text-gray-400 text-[10px] mt-0.5">{formatDate(u.lastActivity)}</span>
                          </>
                        ) : (
                          <span className="text-gray-300">No activity</span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {displayedUsers.length === 0 && (
                    <tr>
                      <td colSpan={3} className="px-5 py-12 text-center text-gray-400">
                        {search.trim() ? "No users match your search" : "No portal users yet"}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Navigation cards — 2/5 */}
        <div className="xl:col-span-2 space-y-2">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Manage</h2>
          {SECTIONS.map(({ href, icon: Icon, color, title, description }) => {
            const c = C[color];
            return (
              <button
                key={href}
                onClick={() => router.push(href)}
                className={`w-full border ${c.card} rounded-xl px-4 py-3.5 flex items-center gap-3 text-left hover:brightness-95 transition-all group`}
              >
                <div className={`w-9 h-9 rounded-lg ${c.icon} flex items-center justify-center shrink-0`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900">{title}</p>
                  <p className="text-[11px] text-gray-500 mt-0.5 leading-snug line-clamp-1">{description}</p>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-gray-400 group-hover:text-gray-600 transition-colors shrink-0" />
              </button>
            );
          })}
        </div>

      </div>
    </div>
  );
}
