"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { usePortalAuthStore } from "@/store/portal-auth.store";
import { portalApi } from "@/lib/portal-api";
import {
  LayoutDashboard, User, FileText, Bell, LogOut, Menu, X,
  ChevronRight, ChevronDown, ExternalLink, Shield, Plus,
} from "lucide-react";
import { PortalQuickAddMenu } from "./portal-quick-add-menu";

// Built-in icon map for menu items returned by API
const ICON_MAP: Record<string, any> = {
  dashboard:     LayoutDashboard,
  records:       FileText,
  profile:       User,
  notifications: Bell,
};

// Default nav used only when API returns empty
const DEFAULT_NAV = [
  { id: "_dash", label: "Dashboard",     icon: "dashboard",     type: "dashboard",     target: "/portal/dashboard",     isVisible: true, children: [] },
  { id: "_rec",  label: "My Record",     icon: "records",       type: "records",       target: "/portal/records",        isVisible: true, children: [] },
  { id: "_bell", label: "Notifications", icon: "notifications", type: "notifications", target: "/portal/notifications",  isVisible: true, children: [] },
  { id: "_prof", label: "Profile",       icon: "profile",       type: "profile",       target: "/portal/profile",        isVisible: true, children: [] },
];

interface MenuChild {
  id: string; label: string; icon?: string; type: string; target?: string; isVisible: boolean;
}

interface MenuItem {
  id: string; label: string; icon?: string; type: string; target?: string; isVisible: boolean;
  children: MenuChild[];
}

function resolveTarget(item: MenuItem | MenuChild): string {
  const builtIn: Record<string, string> = {
    dashboard:     "/portal/dashboard",
    records:       "/portal/records",
    profile:       "/portal/profile",
    notifications: "/portal/notifications",
  };
  if (builtIn[item.type]) return builtIn[item.type];
  const t = item.target ?? "#";
  if (item.type === "page" && t !== "#" && !t.startsWith("http") && !t.startsWith("/portal/")) {
    return `/portal/pages/${t.replace(/^\//, "")}`;
  }
  return t;
}

function NavIcon({ name, className }: { name?: string; className?: string }) {
  const Icon = name ? (ICON_MAP[name] ?? null) : null;
  if (Icon) return <Icon className={className} />;
  return <span className="text-base leading-none">{name && name.length <= 2 ? name : "•"}</span>;
}

function NavItem({ item, pathname, onNavigate, unreadCount }: {
  item: MenuItem; pathname: string; onNavigate: () => void; unreadCount: number;
}) {
  const [open, setOpen] = useState(false);
  const isNotifications = item.type === "notifications";
  const target = resolveTarget(item);
  const active = pathname === target || (item.children.length > 0 && item.children.some(c => pathname === resolveTarget(c)));
  const hasChildren = item.children.length > 0;

  if (item.type === "divider") {
    return <div className="my-1 border-t border-indigo-700/30" />;
  }

  if (item.type === "external") {
    return (
      <a href={target} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-indigo-200 hover:bg-white/10 hover:text-white transition-colors">
        <NavIcon name={item.icon} className="w-4 h-4 shrink-0" />
        <span className="flex-1">{item.label}</span>
        <ExternalLink className="w-3 h-3 opacity-50" />
      </a>
    );
  }

  if (hasChildren) {
    return (
      <div>
        <button onClick={() => setOpen(o => !o)} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${active ? "bg-white/20 text-white font-medium" : "text-indigo-200 hover:bg-white/10 hover:text-white"}`}>
          <NavIcon name={item.icon} className="w-4 h-4 shrink-0" />
          <span className="flex-1 text-left">{item.label}</span>
          {open ? <ChevronDown className="w-3.5 h-3.5 opacity-60" /> : <ChevronRight className="w-3.5 h-3.5 opacity-60" />}
        </button>
        {open && (
          <div className="ml-4 pl-3 border-l border-indigo-700/40 space-y-0.5 mt-0.5">
            {item.children.filter(c => c.isVisible).map(child => {
              const ct = resolveTarget(child);
              const ca = pathname === ct;
              return (
                <Link key={child.id} href={ct} onClick={onNavigate} className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs transition-colors ${ca ? "bg-white/20 text-white font-medium" : "text-indigo-300 hover:bg-white/10 hover:text-white"}`}>
                  <NavIcon name={child.icon} className="w-3.5 h-3.5 shrink-0" />
                  {child.label}
                </Link>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  return (
    <Link href={target} onClick={onNavigate} className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${active ? "bg-white/20 text-white font-medium" : "text-indigo-200 hover:bg-white/10 hover:text-white"}`}>
      <NavIcon name={item.icon} className="w-4 h-4 shrink-0" />
      <span className="flex-1">{item.label}</span>
      {isNotifications && unreadCount > 0 && (
        <span className="bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
          {unreadCount > 9 ? "9+" : unreadCount}
        </span>
      )}
      {active && !isNotifications && <ChevronRight className="w-4 h-4 ml-auto opacity-60" />}
    </Link>
  );
}

export function PortalShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, user, logout } = usePortalAuthStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showQuickAdd, setShowQuickAdd] = useState(false);

  const isAdmin = user?.isPortalAdmin || user?.portalRole === "admin" || user?.portalRole === "super_admin";

  // Current page slug from pathname (e.g. /portal/pages/my-page → my-page)
  const pageSlugMatch = pathname.match(/^\/portal\/pages\/([^/]+)/);
  const currentPageSlug = pageSlugMatch?.[1] ?? null;

  useEffect(() => {
    if (!isAuthenticated) { router.push("/portal/login"); return; }
    if (user?.accountStatus === "PENDING_ACTIVATION") { router.push("/portal/activate"); return; }
    if (user?.accountStatus === "SUSPENDED" || user?.accountStatus === "DISABLED") { router.push("/portal/login"); return; }
  }, [isAuthenticated, user?.accountStatus, router]);

  // Load dynamic menu
  useEffect(() => {
    if (!isAuthenticated) return;
    portalApi.get("/portal/menu")
      .then(r => {
        const items: MenuItem[] = r.data;
        setMenuItems(items.length > 0 ? items.filter((i: MenuItem) => i.isVisible) : DEFAULT_NAV as any);
      })
      .catch(() => setMenuItems(DEFAULT_NAV as any));
  }, [isAuthenticated]);

  // Poll unread notification count
  const fetchUnread = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const r = await portalApi.get("/portal/notifications?limit=1");
      setUnreadCount(r.data?.unreadCount ?? 0);
    } catch {}
  }, [isAuthenticated]);

  useEffect(() => {
    fetchUnread();
    const iv = setInterval(fetchUnread, 30000);
    return () => clearInterval(iv);
  }, [fetchUnread]);

  // Refresh unread when landing on notifications page
  useEffect(() => {
    if (pathname === "/portal/notifications") fetchUnread();
  }, [pathname, fetchUnread]);

  if (!isAuthenticated) return null;

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {sidebarOpen && <div className="fixed inset-0 z-20 bg-black/40 lg:hidden" onClick={() => setSidebarOpen(false)} />}

      <aside className={`fixed lg:static inset-y-0 left-0 z-30 flex flex-col w-64 bg-gradient-to-b from-indigo-900 to-indigo-800 text-white transition-transform duration-300 ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}>
        {/* Logo */}
        <div className="flex items-center justify-between h-16 px-5 border-b border-indigo-700/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
              <span className="text-sm font-bold text-white">P</span>
            </div>
            <span className="font-semibold text-white">My Portal</span>
          </div>
          <button className="lg:hidden text-white/70 hover:text-white" onClick={() => setSidebarOpen(false)}>
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* User summary */}
        <div className="px-4 py-4 border-b border-indigo-700/50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-indigo-600 flex items-center justify-center text-sm font-semibold">
              {user?.firstName?.[0]}{user?.lastName?.[0]}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-white truncate">{user?.firstName} {user?.lastName}</p>
              <p className="text-xs text-indigo-300 truncate capitalize">{user?.type}</p>
            </div>
            {user?.accountStatus === "ACTIVE" && <span className="shrink-0 w-2 h-2 rounded-full bg-green-400" title="Active" />}
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {menuItems.map(item => (
            <NavItem
              key={item.id}
              item={item}
              pathname={pathname}
              onNavigate={() => setSidebarOpen(false)}
              unreadCount={unreadCount}
            />
          ))}
        </nav>

        {/* Admin Panel link */}
        {user?.isPortalAdmin && (
          <div className="px-3 pb-2">
            <Link href="/portal/admin" className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${pathname.startsWith("/portal/admin") ? "bg-white/20 text-white font-medium" : "text-indigo-200 hover:bg-white/10 hover:text-white"}`}>
              <Shield className="w-4 h-4 shrink-0" />
              <span className="flex-1">Admin Panel</span>
            </Link>
          </div>
        )}

        {/* Logout */}
        <div className="px-3 py-4 border-t border-indigo-700/50">
          <button onClick={logout} className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm text-indigo-200 hover:bg-white/10 hover:text-white transition-colors">
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 bg-white border-b border-gray-100 flex items-center justify-between px-4 lg:px-6 shrink-0">
          <button className="lg:hidden text-gray-500 hover:text-gray-700" onClick={() => setSidebarOpen(true)}>
            <Menu className="w-5 h-5" />
          </button>
          <div className="hidden lg:block" />
          <div className="flex items-center gap-3">
            <Link href="/portal/notifications" className="relative p-2 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors">
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </Link>
            <Link href="/portal/profile" className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-gray-100 transition-colors">
              <div className="w-7 h-7 rounded-full bg-indigo-600 flex items-center justify-center text-xs font-semibold text-white">
                {user?.firstName?.[0]}{user?.lastName?.[0]}
              </div>
              <span className="text-sm text-gray-700 hidden sm:block">{user?.firstName}</span>
            </Link>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          {children}
        </main>
      </div>

      {/* Floating admin quick-add — only when admin is outside admin pages */}
      {isAdmin && !pathname.startsWith("/portal/admin") && (
        <div className="fixed bottom-6 right-6 z-40 flex items-center gap-1 bg-gray-900/95 backdrop-blur-sm text-white rounded-2xl shadow-2xl px-2 py-1.5 border border-white/10">
          <span className="text-xs font-semibold text-indigo-300 px-1.5 flex items-center gap-1">
            <Shield className="w-3 h-3" />Admin
          </span>
          <div className="w-px h-4 bg-white/15" />
          <button
            onClick={() => setShowQuickAdd(true)}
            title="Add menu item"
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-xl hover:bg-white/10 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Menu
          </button>
        </div>
      )}

      {showQuickAdd && (
        <PortalQuickAddMenu
          onClose={() => setShowQuickAdd(false)}
          onCreated={() => {
            setShowQuickAdd(false);
            // Refresh menu items
            portalApi.get("/portal/menu")
              .then(r => {
                const items: MenuItem[] = r.data;
                setMenuItems(items.length > 0 ? items.filter((i: MenuItem) => i.isVisible) : DEFAULT_NAV as any);
              })
              .catch(() => {});
          }}
        />
      )}
    </div>
  );
}
