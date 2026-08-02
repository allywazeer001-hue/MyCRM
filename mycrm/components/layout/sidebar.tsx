"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Settings, ChevronRight, Database, Workflow, BarChart3,
  Users, Building2, Plus, ChevronLeft, FileBarChart2, X,
  Globe, Palette, LayoutGrid, Home,
  ChevronDown, ClipboardCheck, TableProperties, ShieldCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useModulesStore } from "@/store/modules.store";
import { useAuthStore } from "@/store/auth.store";
import { usePermissionsStore } from "@/store/permissions.store";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ModuleIcon } from "@/components/ui/module-icon";
import { BRAND } from "@/lib/core-brand";

// ── Nav definitions ───────────────────────────────────────────────────────────

const coreNavItems = [
  { href: "/workspace",          label: "Workspace", icon: LayoutGrid,    permKey: null },
  { href: "/dashboard",          label: "Dashboard", icon: Home,          permKey: "canDashboard" as const },
  { href: "/workflows",          label: "Workflows", icon: Workflow,      permKey: "canWorkflow"  as const },
  { href: "/apps/report-builder",label: "Reports",   icon: FileBarChart2, permKey: null },
];

const dataManagementItems = [
  { href: "/analytics",       label: "Data Visualization", icon: BarChart3,       permKey: "canAnalytics" as const },
  { href: "/analytics/pivot", label: "Pivoting",           icon: TableProperties, permKey: "canAnalytics" as const },
  { href: "/tracker",         label: "Tracker",            icon: ClipboardCheck,  permKey: null },
  { href: "/data-quality",    label: "Data Quality Check", icon: ShieldCheck,     permKey: null },
];

const adminNavItems = [
  { href: "/studio",            label: "Module Studio", icon: Database   },
  { href: "/users",             label: "Users",         icon: Users      },
  { href: "/admin/departments", label: "Units",         icon: Building2  },
  { href: "/settings",          label: "Settings",      icon: Settings   },
];

const platformNavItems = [
  { href: "/platform",   label: "Organizations", icon: Globe    },
  { href: "/land-admin", label: "Landing Page",  icon: Palette  },
];

// href → package key required to show this item
const ROUTE_PACKAGE: Record<string, string> = {
  "/analytics":           "ANALYTICS",
  "/analytics/pivot":     "ANALYTICS",
  "/workflows":           "WORKFLOWS",
  "/forms":               "FORMS",
  "/apps/report-builder": "REPORTS",
};

// ── Logo mark ─────────────────────────────────────────────────────────────────

function LogoMark({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      <rect x="2"  y="2"  width="12" height="12" rx="3" fill="currentColor" opacity="0.9" />
      <rect x="18" y="2"  width="12" height="12" rx="3" fill="currentColor" opacity="0.7" />
      <rect x="2"  y="18" width="12" height="12" rx="3" fill="currentColor" opacity="0.7" />
      <rect x="18" y="18" width="12" height="12" rx="3" fill="currentColor" opacity="0.5" />
    </svg>
  );
}

// ── Nav link ──────────────────────────────────────────────────────────────────

function NavLink({
  href, label, icon: Icon, active, collapsed, onClick,
}: {
  href: string; label: string; icon: React.ElementType;
  active: boolean; collapsed: boolean; onClick?: () => void;
}) {
  return (
    <Link href={href} onClick={onClick}>
      <div
        title={collapsed ? label : undefined}
        className={cn(
          "group relative flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-150 cursor-pointer select-none",
          active
            ? "bg-white/15 text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.25)]"
            : "text-blue-100/80 hover:bg-white/10 hover:text-white"
        )}
      >
        {active && (
          <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-white rounded-r-full shadow-[0_0_8px_rgba(255,255,255,0.7)]" />
        )}
        <span className="cb-nav-icon shrink-0">
          <Icon className={cn(
            "w-[18px] h-[18px] transition-colors duration-150",
            active ? "text-white" : "text-blue-200/70 group-hover:text-white"
          )} />
        </span>
        {!collapsed && <span className="truncate">{label}</span>}
      </div>
    </Link>
  );
}

// ── Nav group (collapsible section) ──────────────────────────────────────────

function NavGroup({
  label, children, collapsed, defaultOpen = true,
}: {
  label: string; children: React.ReactNode; collapsed: boolean; defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  if (collapsed) return <div className="pt-2">{children}</div>;

  return (
    <div className="pt-1">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center justify-between w-full px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-blue-200/70 hover:text-white rounded-lg hover:bg-white/10 transition-all duration-150"
      >
        <span>{label}</span>
        <ChevronDown className={cn("w-3 h-3 transition-transform duration-200", open && "rotate-180")} />
      </button>
      <div
        className={cn(
          "overflow-hidden transition-all duration-200 ease-in-out",
          open ? "max-h-[600px] opacity-100" : "max-h-0 opacity-0"
        )}
      >
        {children}
      </div>
    </div>
  );
}

// ── Nav dropdown (collapsible parent with child links) ────────────────────────

function NavDropdown({
  label, icon: Icon, children, collapsed, active,
}: {
  label: string; icon: React.ElementType; children: React.ReactNode;
  collapsed: boolean; active: boolean;
}) {
  const [open, setOpen] = useState(active);

  if (collapsed) {
    return <div className="space-y-0.5">{children}</div>;
  }

  return (
    <div>
      <button
        onClick={() => setOpen(o => !o)}
        className={cn(
          "group relative flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-150 cursor-pointer select-none w-full",
          active
            ? "bg-white/15 text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.25)]"
            : "text-blue-100/80 hover:bg-white/10 hover:text-white"
        )}
      >
        {active && (
          <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-white rounded-r-full shadow-[0_0_8px_rgba(255,255,255,0.7)]" />
        )}
        <Icon className={cn(
          "w-[18px] h-[18px] shrink-0 transition-colors",
          active ? "text-white" : "text-blue-200/70 group-hover:text-white"
        )} />
        <span className="flex-1 truncate text-left">{label}</span>
        <ChevronDown className={cn("w-3.5 h-3.5 transition-transform duration-200 text-blue-200/70", open && "rotate-180")} />
      </button>
      <div className={cn(
        "overflow-hidden transition-all duration-200 ease-in-out",
        open ? "max-h-[300px] opacity-100" : "max-h-0 opacity-0"
      )}>
        <div className="ml-3 pl-3 border-l border-white/10 mt-0.5 space-y-0.5">
          {children}
        </div>
      </div>
    </div>
  );
}

// ── Sidebar props ─────────────────────────────────────────────────────────────

export interface SidebarProps {
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

// ── Sidebar content ───────────────────────────────────────────────────────────

function SidebarContent({
  collapsed, setCollapsed, onLinkClick, showCloseButton, onClose,
}: {
  collapsed: boolean; setCollapsed: (v: boolean) => void;
  onLinkClick?: () => void; showCloseButton?: boolean; onClose?: () => void;
}) {
  const pathname         = usePathname();
  const { modules }      = useModulesStore();
  const { user }         = useAuthStore();
  const { system, canView } = usePermissionsStore();

  const isSuperAdmin = (user as any)?.role === "SUPER_ADMIN";
  const isAdmin      = isSuperAdmin || user?.role === "ADMIN";

  const orgPackages: string[] | null = (user?.organization as any)?.settings?.packages ?? null;
  const hasPackage = (href: string) =>
    isSuperAdmin || !orgPackages || !ROUTE_PACKAGE[href] || orgPackages.includes(ROUTE_PACKAGE[href]);

  const visibleCoreItems = (isSuperAdmin || isAdmin
    ? coreNavItems
    : coreNavItems.filter(item => !item.permKey || system[item.permKey])
  ).filter(item => hasPackage(item.href));

  const visibleDataMgmt = (isSuperAdmin || isAdmin
    ? dataManagementItems
    : dataManagementItems.filter(item => !item.permKey || system[item.permKey])
  ).filter(item => hasPackage(item.href));

  const visibleModules = isSuperAdmin || isAdmin
    ? modules
    : modules.filter(mod => canView(mod.slug));

  const isActive = (href: string) => {
    if (href === "/settings")
      return pathname === "/settings" || pathname.startsWith("/settings/") || pathname.startsWith("/admin/");
    if (href === "/workspace")
      return pathname === "/workspace";
    if (pathname === href) return true;
    if (!pathname.startsWith(href + "/")) return false;
    const allItems = [...coreNavItems, ...dataManagementItems];
    const childMatch = allItems.some(
      item => item.href !== href && item.href.startsWith(href + "/") && pathname.startsWith(item.href),
    );
    return !childMatch;
  };

  const dataManagementActive = dataManagementItems.some(item => isActive(item.href));

  return (
    <>
      {/* Header */}
      <div className={cn(
        "flex items-center h-12 px-3 border-b border-white/10 shrink-0",
        collapsed ? "justify-center" : "justify-between"
      )}>
        {!collapsed && (
          <Link href="/" className="flex items-center gap-2.5 hover:opacity-80 transition-opacity">
            <div className="w-7 h-7 bg-white rounded-lg flex items-center justify-center shrink-0 text-blue-700 shadow-md">
              <LogoMark size={14} />
            </div>
            <span className="font-bold text-white text-sm tracking-tight">{BRAND.name}</span>
          </Link>
        )}
        {collapsed && (
          <Link href="/" title="Home" className="hover:opacity-80 transition-opacity">
            <div className="w-7 h-7 bg-white rounded-lg flex items-center justify-center text-blue-700 shadow-md">
              <LogoMark size={14} />
            </div>
          </Link>
        )}

        {!showCloseButton && (
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="text-blue-200 hover:text-white p-1.5 rounded-lg hover:bg-white/15 transition-all duration-150 hidden lg:flex"
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed
              ? <ChevronRight className="w-3.5 h-3.5" />
              : <ChevronLeft  className="w-3.5 h-3.5" />}
          </button>
        )}
        {showCloseButton && (
          <button
            onClick={onClose}
            className="text-blue-200 hover:text-white p-1.5 rounded-lg hover:bg-white/15 transition-all"
            title="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1">
        <nav className="p-2 space-y-0.5">

          {/* Core nav — no group header */}
          {visibleCoreItems.map(item => (
            <NavLink
              key={item.href}
              href={item.href}
              label={item.label}
              icon={item.icon}
              active={isActive(item.href)}
              collapsed={collapsed}
              onClick={onLinkClick}
            />
          ))}

          {/* Data Management dropdown */}
          {visibleDataMgmt.length > 0 && (
            <NavDropdown
              label="Data Management"
              icon={Database}
              collapsed={collapsed}
              active={dataManagementActive}
            >
              {visibleDataMgmt.map(item => (
                <NavLink
                  key={item.href}
                  href={item.href}
                  label={item.label}
                  icon={item.icon}
                  active={isActive(item.href)}
                  collapsed={collapsed}
                  onClick={onLinkClick}
                />
              ))}
            </NavDropdown>
          )}

          {/* Modules */}
          <NavGroup label="Modules" collapsed={collapsed}>
            {visibleModules.map(mod => (
              <NavLink
                key={mod.id}
                href={`/m/${mod.slug}`}
                label={mod.name}
                icon={(props: any) => <ModuleIcon icon={mod.icon} slug={mod.slug} className={props?.className} />}
                active={isActive(`/m/${mod.slug}`)}
                collapsed={collapsed}
                onClick={onLinkClick}
              />
            ))}
            {!collapsed && (
              <Link href="/studio/new" onClick={onLinkClick}>
                <div className="group flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-blue-200/70 hover:text-white hover:bg-white/10 cursor-pointer transition-all duration-150">
                  <Plus className="w-[18px] h-[18px] shrink-0" />
                  <span>New Module</span>
                </div>
              </Link>
            )}
          </NavGroup>

          {/* Administration */}
          {isAdmin && (
            <NavGroup label="Administration" collapsed={collapsed} defaultOpen={false}>
              {adminNavItems.map(item => (
                <NavLink
                  key={item.href}
                  href={item.href}
                  label={item.label}
                  icon={item.icon}
                  active={isActive(item.href)}
                  collapsed={collapsed}
                  onClick={onLinkClick}
                />
              ))}
            </NavGroup>
          )}

          {/* Platform — Super Admin only */}
          {isSuperAdmin && (
            <NavGroup label="Platform" collapsed={collapsed} defaultOpen={false}>
              {platformNavItems.map(item => (
                <NavLink
                  key={item.href}
                  href={item.href}
                  label={item.label}
                  icon={item.icon}
                  active={isActive(item.href)}
                  collapsed={collapsed}
                  onClick={onLinkClick}
                />
              ))}
            </NavGroup>
          )}
        </nav>
      </ScrollArea>
    </>
  );
}

// ── Sidebar ───────────────────────────────────────────────────────────────────

export function Sidebar({ mobileOpen = false, onMobileClose }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <>
      {/* Desktop sidebar — always in flow, collapsible */}
      <aside
        className={cn(
          "hidden lg:flex flex-col bg-gradient-to-b from-blue-600 to-blue-800 border-r border-white/10 shrink-0",
          "shadow-xl",
          "transition-all duration-300 ease-in-out",
          collapsed ? "w-16" : "w-60"
        )}
      >
        <SidebarContent collapsed={collapsed} setCollapsed={setCollapsed} />
      </aside>

      {/* Mobile sidebar — fixed overlay, slides in/out */}
      <aside
        className={cn(
          "lg:hidden fixed inset-y-0 left-0 z-50 flex flex-col bg-gradient-to-b from-blue-600 to-blue-800 border-r border-white/10",
          "w-72 transition-transform duration-300 ease-in-out",
          mobileOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full"
        )}
      >
        <SidebarContent
          collapsed={false}
          setCollapsed={() => {}}
          showCloseButton
          onClose={onMobileClose}
          onLinkClick={onMobileClose}
        />
      </aside>
    </>
  );
}
