"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { portalApi } from "@/lib/portal-api";
import { FormInput, Layers, Users, FileText, ChevronRight, Menu } from "lucide-react";

const SECTIONS = [
  {
    href: "/portal/admin/fields",
    icon: FormInput,
    color: "violet",
    title: "Field Builder",
    description: "Create and manage custom portal fields. Map them to CRM data for two-way sync.",
  },
  {
    href: "/portal/admin/sections",
    icon: Layers,
    color: "blue",
    title: "Section Builder",
    description: "Organise fields into sections, tabs, and groups. Control layout and visibility.",
  },
  {
    href: "/portal/admin/menu",
    icon: Menu,
    color: "orange",
    title: "Menu Builder",
    description: "Create and manage portal navigation menus. Append items without breaking existing structure.",
  },
  {
    href: "/portal/admin/pages",
    icon: FileText,
    color: "sky",
    title: "Pages",
    description: "Build portal pages with custom fields and sections. Draft, preview, and publish.",
  },
  {
    href: "/portal/admin/users",
    icon: Users,
    color: "emerald",
    title: "Portal Users",
    description: "View and manage portal user accounts, roles, and admin permissions.",
  },
];

const C: Record<string, { card: string; icon: string }> = {
  violet:  { card: "border-violet-800/30 bg-violet-900/10",  icon: "text-violet-400 bg-violet-900/30" },
  blue:    { card: "border-blue-800/30 bg-blue-900/10",      icon: "text-blue-400 bg-blue-900/30" },
  orange:  { card: "border-orange-800/30 bg-orange-900/10",  icon: "text-orange-400 bg-orange-900/30" },
  sky:     { card: "border-sky-800/30 bg-sky-900/10",        icon: "text-sky-400 bg-sky-900/30" },
  emerald: { card: "border-emerald-800/30 bg-emerald-900/10", icon: "text-emerald-400 bg-emerald-900/30" },
};

export default function PortalAdminHub() {
  const router = useRouter();
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    portalApi.get("/portal/padmin/stats").then(r => setStats(r.data)).catch(() => {});
  }, []);

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-xl font-bold text-white">Portal Admin Panel</h1>
        <p className="text-sm text-gray-400 mt-1">
          Build and manage your portal experience — fields, sections, layouts, and users.
        </p>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
          {[
            { label: "Users",      value: stats.totalUsers },
            { label: "Sections",   value: stats.totalSections },
            { label: "Fields",     value: stats.totalFields },
            { label: "Documents",  value: stats.totalDocuments },
            { label: "Pages",      value: stats.totalPages },
            { label: "Menu items", value: stats.totalMenuItems },
          ].map(s => (
            <div key={s.label} className="bg-gray-900 border border-gray-800 rounded-xl px-4 py-3">
              <p className="text-2xl font-bold text-white">{s.value}</p>
              <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Navigation cards */}
      <div className="space-y-3">
        {SECTIONS.map(({ href, icon: Icon, color, title, description }) => {
          const c = C[color];
          return (
            <button
              key={href}
              onClick={() => router.push(href)}
              className={`w-full border ${c.card} rounded-xl p-5 flex items-center gap-4 text-left hover:brightness-125 transition-all group`}
            >
              <div className={`w-11 h-11 rounded-xl ${c.icon} flex items-center justify-center shrink-0`}>
                <Icon className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white">{title}</p>
                <p className="text-xs text-gray-400 mt-0.5">{description}</p>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-600 group-hover:text-gray-400 transition-colors shrink-0" />
            </button>
          );
        })}
      </div>
    </div>
  );
}
