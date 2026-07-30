"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  User, Building2, Shield, Globe, Users, Mail, Zap,
  FileText, Layers, ChevronRight, LayoutGrid, Blocks, UserCog, LayoutList,
  Calendar, SlidersHorizontal, Plug,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/auth.store";

// Shared left sub-nav + page shell for every admin/settings-style page —
// Settings, Users, Units, Access Control, Global Lists, Connected Apps, etc.
// all render the SAME nav here so navigating between them never loses the
// menu, regardless of which top-level route segment (/settings, /users,
// /admin/*) actually owns the page.

const ACCOUNT_NAV = [
  { href: "/settings",              label: "Profile & Security", icon: User, exact: true },
  { href: "/settings/calendar-sync", label: "Calendar Sync",     icon: Calendar },
];

const ADMIN_NAV = [
  { href: "/users",                label: "Users",          icon: Users },
  { href: "/admin/departments",    label: "Units",          icon: Building2 },
  { href: "/admin/permissions",    label: "Access Control", icon: Shield },
  { href: "/admin/global-lists",   label: "Global Lists",   icon: Globe },
  { href: "/settings/connected-apps", label: "Connected Apps", icon: Plug },
];

const CONFIG_NAV = [
  { href: "/forms",                label: "Forms",          icon: FileText },
  { href: "/settings/email",       label: "Email",          icon: Mail },
  { href: "/settings/automation",  label: "Automation",     icon: Zap },
  { href: "/settings/modules",     label: "Module Config",  icon: Layers },
  { href: "/settings/portal",      label: "Portal Settings", icon: LayoutGrid },
  { href: "/settings/portal/users", label: "Portal Users",    icon: UserCog },
  { href: "/apps/portal-builder",   label: "Portal Builder",  icon: Blocks },
  { href: "/settings/task-panels",  label: "Task Panels",     icon: LayoutList },
  { href: "/settings/field-rules",  label: "Field Rules",     icon: SlidersHorizontal },
];

function NavSection({ title, items, pathname }: {
  title: string;
  items: { href: string; label: string; icon: any; exact?: boolean }[];
  pathname: string;
}) {
  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname === href || pathname.startsWith(href + "/");

  return (
    <div className="space-y-0.5">
      <p className="px-3 mb-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wider">{title}</p>
      {items.map(item => (
        <Link key={item.href} href={item.href}>
          <div className={cn(
            "flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors",
            isActive(item.href, (item as any).exact)
              ? "bg-blue-50 text-blue-700 font-medium"
              : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
          )}>
            <item.icon className="w-4 h-4 shrink-0" />
            <span className="flex-1">{item.label}</span>
            {isActive(item.href, (item as any).exact) && (
              <ChevronRight className="w-3 h-3 opacity-50" />
            )}
          </div>
        </Link>
      ))}
    </div>
  );
}

export function SettingsSideNav() {
  const pathname = usePathname();
  const { user } = useAuthStore();
  const isAdmin = user?.role === "SUPER_ADMIN" || user?.role === "ADMIN";

  return (
    // sticky + shrink-0 + max-h-screen: see settings/layout.tsx history — without
    // shrink-0 on this element's flex-row parent, <main>'s flex-column layout
    // compresses that row below its true content height, which shrinks this
    // sidebar's sticky containing block and makes it drift mid-scroll instead
    // of staying pinned the whole way down.
    <aside className="w-52 shrink-0 border-r border-gray-200 bg-gray-50/50 sticky top-0 max-h-screen overflow-y-auto">
      <div className="px-4 pt-6 pb-3 border-b border-gray-200">
        <h2 className="font-semibold text-gray-900 text-sm">CRM Settings</h2>
        <p className="text-xs text-gray-500 mt-0.5">Account & configuration</p>
      </div>
      <nav className="p-2 space-y-4 pb-6">
        <NavSection title="Account" items={ACCOUNT_NAV} pathname={pathname} />
        {isAdmin && <NavSection title="Admin" items={ADMIN_NAV} pathname={pathname} />}
        {isAdmin && <NavSection title="Configuration" items={CONFIG_NAV} pathname={pathname} />}
      </nav>
    </aside>
  );
}

/** Standard (non-full-width) page shell: sidenav + centered, max-w-6xl content. */
export function SettingsPageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-6 -m-6 min-h-full items-start shrink-0">
      <SettingsSideNav />
      <div className="flex-1 py-6">
        <div className="max-w-6xl mx-auto space-y-6">
          {children}
        </div>
      </div>
    </div>
  );
}
