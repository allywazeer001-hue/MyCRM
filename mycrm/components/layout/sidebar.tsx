"use client";
import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Settings, ChevronRight, Database,
  Workflow, BarChart3, Bell, Users, Building2, Plus,
  ChevronLeft, FileText, FileBarChart2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useModulesStore } from "@/store/modules.store";
import { useAuthStore } from "@/store/auth.store";
import { ScrollArea } from "@/components/ui/scroll-area";

const coreNavItems = [
  { href: "/dashboard",            label: "Dashboard",     icon: LayoutDashboard },
  { href: "/analytics",            label: "Data Visualization", icon: BarChart3 },
  { href: "/workflows",            label: "Workflows",     icon: Workflow },
  { href: "/forms",                label: "Forms",         icon: FileText },
  { href: "/apps/report-builder",  label: "Reports",       icon: FileBarChart2 },
  { href: "/notifications",        label: "Notifications", icon: Bell },
];

const adminNavItems = [
  { href: "/studio",    label: "Module Studio", icon: Database },
  { href: "/users",     label: "Users",         icon: Users },
  { href: "/settings",  label: "Settings",      icon: Settings },
];

const MODULE_ICONS: Record<string, string> = {
  default: "📦",
  patients: "🏥",
  employees: "👥",
  projects: "📋",
  assets: "🔧",
  inventory: "📦",
  donors: "💝",
  cases: "📁",
};

export function Sidebar() {
  const pathname = usePathname();
  const { modules } = useModulesStore();
  const { user } = useAuthStore();
  const [collapsed, setCollapsed] = useState(false);
  const [modulesExpanded, setModulesExpanded] = useState(true);

  const isAdmin = user?.role === "SUPER_ADMIN" || user?.role === "ADMIN";

  const isActive = (href: string) => {
    if (href === "/settings") return pathname === "/settings" || pathname.startsWith("/settings/") || pathname.startsWith("/admin/");
    return pathname === href || pathname.startsWith(href + "/");
  };

  return (
    <aside
      className={cn(
        "flex flex-col bg-white border-r border-gray-200 transition-all duration-300 shrink-0",
        collapsed ? "w-16" : "w-60"
      )}
    >
      {/* Logo */}
      <div className={cn("flex items-center h-14 px-4 border-b border-gray-100", collapsed ? "justify-center" : "justify-between")}>
        {!collapsed && (
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center shrink-0">
              <Building2 className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-gray-900 text-sm">Enterprise CRM</span>
          </div>
        )}
        {collapsed && (
          <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center">
            <Building2 className="w-4 h-4 text-white" />
          </div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="text-gray-400 hover:text-gray-600 p-1 rounded hidden md:flex"
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      <ScrollArea className="flex-1">
        <nav className="p-2 space-y-0.5">
          {/* Core Nav */}
          {coreNavItems.map((item) => (
            <Link key={item.href} href={item.href}>
              <div className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors cursor-pointer",
                isActive(item.href)
                  ? "bg-blue-50 text-blue-700 font-medium"
                  : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
              )}>
                <item.icon className="w-4 h-4 shrink-0" />
                {!collapsed && <span>{item.label}</span>}
              </div>
            </Link>
          ))}

          {/* Modules Section */}
          {!collapsed && (
            <div className="pt-3 pb-1">
              <button
                onClick={() => setModulesExpanded(!modulesExpanded)}
                className="flex items-center justify-between w-full px-3 py-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wider hover:text-gray-600"
              >
                <span>Modules</span>
                <ChevronRight className={cn("w-3 h-3 transition-transform", modulesExpanded && "rotate-90")} />
              </button>
            </div>
          )}

          {modulesExpanded && (
            <>
              {modules.map((mod) => (
                <Link key={mod.id} href={`/m/${mod.slug}`}>
                  <div className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors cursor-pointer",
                    isActive(`/m/${mod.slug}`)
                      ? "bg-blue-50 text-blue-700 font-medium"
                      : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                  )}>
                    <span className="text-base shrink-0">
                      {mod.icon || MODULE_ICONS[mod.slug] || MODULE_ICONS.default}
                    </span>
                    {!collapsed && <span className="truncate">{mod.name}</span>}
                  </div>
                </Link>
              ))}

              {!collapsed && (
                <Link href="/studio/new">
                  <div className="flex items-center gap-3 px-3 py-2 rounded-md text-sm text-gray-400 hover:text-gray-600 hover:bg-gray-50 cursor-pointer transition-colors">
                    <Plus className="w-4 h-4 shrink-0" />
                    <span>New Module</span>
                  </div>
                </Link>
              )}
            </>
          )}

          {/* Admin Section — only visible to admins */}
          {isAdmin && (
            <>
              {!collapsed && (
                <div className="pt-3 pb-1">
                  <p className="px-3 py-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wider">Admin</p>
                </div>
              )}
              {adminNavItems.map((item) => (
                <Link key={item.href} href={item.href}>
                  <div className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors cursor-pointer",
                    isActive(item.href)
                      ? "bg-blue-50 text-blue-700 font-medium"
                      : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                  )}>
                    <item.icon className="w-4 h-4 shrink-0" />
                    {!collapsed && <span>{item.label}</span>}
                  </div>
                </Link>
              ))}
            </>
          )}
        </nav>
      </ScrollArea>
    </aside>
  );
}
