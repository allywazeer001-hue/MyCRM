"use client";
import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { usePortalAuthStore } from "@/store/portal-auth.store";
import {
  LayoutDashboard, FormInput, Layers, Users, ArrowLeft, Shield,
  Menu, FileText, PanelLeftClose, PanelLeftOpen,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/portal/admin",          label: "Overview",        icon: LayoutDashboard, exact: true },
  { href: "/portal/admin/fields",   label: "Field Builder",   icon: FormInput },
  { href: "/portal/admin/sections", label: "Section Builder", icon: Layers },
  { href: "/portal/admin/menu",     label: "Menu Builder",    icon: Menu },
  { href: "/portal/admin/pages",    label: "Pages",           icon: FileText },
  { href: "/portal/admin/users",    label: "Portal Users",    icon: Users },
];

export function PortalAdminShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, user } = usePortalAuthStore();
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) { router.push("/portal/login"); return; }
    if (!user?.isPortalAdmin) { router.push("/portal/dashboard"); }
  }, [isAuthenticated, user?.isPortalAdmin, router]);

  if (!isAuthenticated || !user?.isPortalAdmin) return null;

  return (
    <div className="flex h-screen bg-gray-950 overflow-hidden">
      <aside className={cn(
        "shrink-0 flex flex-col bg-gray-900 border-r border-gray-800 transition-all duration-200 overflow-hidden",
        collapsed ? "w-14" : "w-60"
      )}>
        {/* Header */}
        <div className="h-14 px-3 border-b border-gray-800 flex items-center justify-between gap-2 shrink-0">
          {!collapsed && (
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-7 h-7 rounded-lg bg-violet-600/20 flex items-center justify-center shrink-0">
                <Shield className="w-4 h-4 text-violet-400" />
              </div>
              <span className="font-semibold text-white text-sm truncate">Admin Panel</span>
            </div>
          )}
          {collapsed && (
            <div className="w-7 h-7 rounded-lg bg-violet-600/20 flex items-center justify-center mx-auto">
              <Shield className="w-4 h-4 text-violet-400" />
            </div>
          )}
          <button
            onClick={() => setCollapsed(v => !v)}
            className={cn(
              "text-gray-500 hover:text-gray-300 transition-colors shrink-0",
              collapsed && "mx-auto"
            )}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed
              ? <PanelLeftOpen className="w-4 h-4" />
              : <PanelLeftClose className="w-4 h-4" />
            }
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
          {NAV.map(({ href, label, icon: Icon, exact }) => {
            const isActive = exact ? pathname === href : (pathname === href || pathname.startsWith(href + "/"));
            return (
              <Link
                key={href}
                href={href}
                title={collapsed ? label : undefined}
                className={cn(
                  "flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm transition-colors",
                  collapsed ? "justify-center" : "",
                  isActive
                    ? "bg-violet-600/20 text-violet-300 font-medium"
                    : "text-gray-400 hover:bg-gray-800 hover:text-gray-200"
                )}
              >
                <Icon className="w-4 h-4 shrink-0" />
                {!collapsed && <span className="truncate">{label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Back to portal */}
        <div className="px-2 py-3 border-t border-gray-800">
          <Link
            href="/portal/dashboard"
            title={collapsed ? "Back to Portal" : undefined}
            className={cn(
              "flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm text-gray-500 hover:text-gray-300 hover:bg-gray-800 transition-colors",
              collapsed ? "justify-center" : ""
            )}
          >
            <ArrowLeft className="w-4 h-4 shrink-0" />
            {!collapsed && <span className="truncate">Back to Portal</span>}
          </Link>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto p-6">
        {children}
      </main>
    </div>
  );
}
