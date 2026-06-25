"use client";
import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { usePortalAuthStore } from "@/store/portal-auth.store";
import {
  LayoutDashboard, FormInput, Layers, Users, ArrowLeft, Shield,
  Menu, FileText, PanelLeftClose, PanelLeftOpen, X,
  Newspaper, Images,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/portal/admin",                 label: "Overview",        icon: LayoutDashboard, exact: true },
  { href: "/portal/admin/publications",    label: "Publications",    icon: Newspaper },
  { href: "/portal/admin/gallery",         label: "Gallery",         icon: Images },
  { href: "/portal/admin/fields",          label: "Field Builder",   icon: FormInput },
  { href: "/portal/admin/sections",        label: "Section Builder", icon: Layers },
  { href: "/portal/admin/menu",            label: "Menu Builder",    icon: Menu },
  { href: "/portal/admin/pages",           label: "Pages",           icon: FileText },
  { href: "/portal/admin/users",           label: "Portal Users",    icon: Users },
];

export function PortalAdminShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, user } = usePortalAuthStore();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const handleResize = () => { if (window.innerWidth < 1024) setCollapsed(true); };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => { setMobileOpen(false); }, [pathname]);

  useEffect(() => {
    if (!isAuthenticated) { router.push("/portal/login"); return; }
    if (!user?.isPortalAdmin) { router.push("/portal/dashboard"); }
  }, [isAuthenticated, user?.isPortalAdmin, router]);

  if (!isAuthenticated || !user?.isPortalAdmin) return null;

  const SidebarNav = ({ onLinkClick }: { onLinkClick?: () => void }) => (
    <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
      {NAV.map(({ href, label, icon: Icon, exact }) => {
        const isActive = exact ? pathname === href : (pathname === href || pathname.startsWith(href + "/"));
        return (
          <Link key={href} href={href} onClick={onLinkClick}
            title={collapsed && !mobileOpen ? label : undefined}
            className={cn(
              "flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm transition-colors",
              collapsed && !mobileOpen ? "justify-center" : "",
              isActive ? "bg-violet-50 text-violet-700 font-medium" : "text-gray-500 hover:bg-gray-100 hover:text-gray-800"
            )}
          >
            <Icon className="w-4 h-4 shrink-0" />
            {(!collapsed || mobileOpen) && <span className="truncate">{label}</span>}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <div className="flex h-dvh bg-gray-50 overflow-hidden">

      {/* Mobile backdrop */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 bg-black/40 lg:hidden" onClick={() => setMobileOpen(false)} />
      )}

      {/* Mobile drawer */}
      <aside className={cn(
        "lg:hidden fixed inset-y-0 left-0 z-50 flex flex-col w-64 bg-white border-r border-gray-200 shadow-xl transition-transform duration-200",
        mobileOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="h-14 px-3 border-b border-gray-200 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-violet-100 flex items-center justify-center shrink-0">
              <Shield className="w-4 h-4 text-violet-600" />
            </div>
            <span className="font-semibold text-gray-900 text-sm">Admin Panel</span>
          </div>
          <button onClick={() => setMobileOpen(false)} className="text-gray-400 hover:text-gray-600">
            <X className="w-4 h-4" />
          </button>
        </div>
        <SidebarNav onLinkClick={() => setMobileOpen(false)} />
        <div className="px-2 py-3 border-t border-gray-200">
          <Link href="/portal/dashboard" onClick={() => setMobileOpen(false)}
            className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors">
            <ArrowLeft className="w-4 h-4 shrink-0" />
            <span>Back to Portal</span>
          </Link>
        </div>
      </aside>

      {/* Desktop sidebar */}
      <aside className={cn(
        "hidden lg:flex shrink-0 flex-col bg-white border-r border-gray-200 shadow-sm transition-all duration-200 overflow-hidden",
        collapsed ? "w-14" : "w-60"
      )}>
        <div className="h-14 px-3 border-b border-gray-200 flex items-center justify-between gap-2 shrink-0">
          {!collapsed && (
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-7 h-7 rounded-lg bg-violet-100 flex items-center justify-center shrink-0">
                <Shield className="w-4 h-4 text-violet-600" />
              </div>
              <span className="font-semibold text-gray-900 text-sm truncate">Admin Panel</span>
            </div>
          )}
          {collapsed && (
            <div className="w-7 h-7 rounded-lg bg-violet-100 flex items-center justify-center mx-auto">
              <Shield className="w-4 h-4 text-violet-600" />
            </div>
          )}
          <button onClick={() => setCollapsed(v => !v)}
            className={cn("text-gray-400 hover:text-gray-700 transition-colors shrink-0", collapsed && "mx-auto")}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <PanelLeftOpen className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
          </button>
        </div>
        <SidebarNav />
        <div className="px-2 py-3 border-t border-gray-200">
          <Link href="/portal/dashboard"
            title={collapsed ? "Back to Portal" : undefined}
            className={cn("flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors", collapsed ? "justify-center" : "")}
          >
            <ArrowLeft className="w-4 h-4 shrink-0" />
            {!collapsed && <span className="truncate">Back to Portal</span>}
          </Link>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Mobile topbar */}
        <header className="lg:hidden h-12 bg-white border-b border-gray-200 flex items-center gap-3 px-3 shrink-0">
          <button onClick={() => setMobileOpen(true)} className="text-gray-500 hover:text-gray-700 p-1.5 rounded-lg hover:bg-gray-100">
            <Menu className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-2">
            <Shield className="w-3.5 h-3.5 text-violet-600" />
            <span className="text-sm font-semibold text-gray-900">Admin Panel</span>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-3 sm:p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
