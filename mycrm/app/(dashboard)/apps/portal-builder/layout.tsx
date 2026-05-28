"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth.store";
import {
  Layers, Plug, Rocket, ArrowLeft, LayoutGrid, Sparkles,
  Eye, PanelLeftClose, PanelLeftOpen, Globe, Shield,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/apps/portal-builder",                  label: "Home",           icon: Sparkles, exact: true },
  { href: "/apps/portal-builder/portals",           label: "My Portals",     icon: Globe },
  { href: "/apps/portal-builder/templates",         label: "Templates",      icon: Layers },
  { href: "/apps/portal-builder/integrations",      label: "Integrations",   icon: Plug },
  { href: "/apps/portal-builder/access-control",    label: "Access Control", icon: Shield },
  { href: "/apps/portal-builder/publish",           label: "Publish",        icon: Rocket },
];

export default function PortalBuilderLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { isAuthenticated, user } = useAuthStore();
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) router.push("/login");
  }, [isAuthenticated, router]);

  if (!isAuthenticated) return null;

  // Full-screen builder pages — no sidebar
  const isBuilderPage = /\/apps\/portal-builder\/portals\/[^/]+/.test(pathname);
  if (isBuilderPage) {
    return (
      <div className="fixed inset-0 z-40 bg-gray-100">
        {children}
      </div>
    );
  }

  const isActive = (item: (typeof NAV)[0]) =>
    item.exact ? pathname === item.href : pathname.startsWith(item.href);

  return (
    <div className="fixed inset-0 z-40 flex bg-gray-950 text-white">
      {/* Sidebar */}
      <aside className={cn(
        "shrink-0 flex flex-col border-r border-gray-800 bg-gray-900 transition-all duration-200 overflow-hidden",
        collapsed ? "w-14" : "w-52"
      )}>
        {/* App header */}
        <div className="h-12 px-3 border-b border-gray-800 flex items-center justify-between gap-2 shrink-0">
          {!collapsed && (
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-indigo-700 flex items-center justify-center shrink-0">
                <LayoutGrid className="w-3.5 h-3.5 text-white" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-white leading-tight truncate">Portal Builder</p>
                <p className="text-[10px] text-gray-500 leading-tight">Visual Studio</p>
              </div>
            </div>
          )}
          {collapsed && (
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-indigo-700 flex items-center justify-center mx-auto">
              <LayoutGrid className="w-3.5 h-3.5 text-white" />
            </div>
          )}
          {!collapsed && (
            <button
              onClick={() => setCollapsed(true)}
              className="p-1 rounded-md text-gray-500 hover:text-white hover:bg-gray-800 transition-colors shrink-0"
            >
              <PanelLeftClose className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-2 px-1.5 space-y-0.5">
          {NAV.map(item => {
            const active = isActive(item);
            return (
              <Link
                key={item.href}
                href={item.href}
                title={collapsed ? item.label : undefined}
                className={cn(
                  "flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm font-medium transition-colors",
                  collapsed ? "justify-center" : "",
                  active
                    ? "bg-indigo-600 text-white"
                    : "text-gray-400 hover:text-white hover:bg-gray-800"
                )}
              >
                <item.icon className="w-4 h-4 shrink-0" />
                {!collapsed && <span className="truncate">{item.label}</span>}
              </Link>
            );
          })}

          <div className="my-2 border-t border-gray-800" />

          {/* Preview portal */}
          <a
            href="/portal/dashboard"
            target="_blank"
            rel="noopener noreferrer"
            title={collapsed ? "Preview Portal" : undefined}
            className={cn(
              "flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm font-medium transition-colors text-gray-500 hover:text-white hover:bg-gray-800",
              collapsed ? "justify-center" : ""
            )}
          >
            <Eye className="w-4 h-4 shrink-0" />
            {!collapsed && <span className="truncate">Preview Portal</span>}
          </a>
        </nav>

        {/* Footer */}
        <div className="border-t border-gray-800 p-2 shrink-0">
          {!collapsed ? (
            <div className="space-y-2">
              <div className="px-2">
                <p className="text-xs font-medium text-white truncate">{user ? `${user.firstName} ${user.lastName}`.trim() || user.email : "User"}</p>
                <p className="text-[10px] text-gray-500 truncate">{user?.email ?? ""}</p>
              </div>
              <Link
                href="/dashboard"
                className="flex items-center gap-2 px-2.5 py-2 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
              >
                <ArrowLeft className="w-4 h-4 shrink-0" />
                <span>Back to CRM</span>
              </Link>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-1">
              <button
                onClick={() => setCollapsed(false)}
                className="p-1.5 rounded-md text-gray-500 hover:text-white hover:bg-gray-800 transition-colors"
              >
                <PanelLeftOpen className="w-4 h-4" />
              </button>
              <Link
                href="/dashboard"
                title="Back to CRM"
                className="p-1.5 rounded-md text-gray-500 hover:text-white hover:bg-gray-800 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
              </Link>
            </div>
          )}
        </div>
      </aside>

      {/* Collapse toggle for collapsed state */}
      {collapsed && (
        <button
          onClick={() => setCollapsed(false)}
          className="absolute left-14 top-3 z-50 p-1 rounded-r-md bg-gray-800 border border-l-0 border-gray-700 text-gray-400 hover:text-white transition-colors"
        >
          <PanelLeftOpen className="w-3.5 h-3.5" />
        </button>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-12 px-6 border-b border-gray-800 bg-gray-900 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-indigo-400" />
            <span className="text-sm font-semibold text-white">Portal Builder Studio</span>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
