"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { usePortalAuthStore } from "@/store/portal-auth.store";
import {
  Layers, Plug, Rocket, ArrowLeft, LayoutGrid, Sparkles,
  Eye, PanelLeftClose, PanelLeftOpen, Globe, Shield,
  Monitor, Tablet, Smartphone, X, RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ── Device Preview Modal ───────────────────────────────────────────────────────

type DeviceId = "mobile" | "tablet" | "laptop" | "desktop" | "wide";

const DEVICES: { id: DeviceId; label: string; width: number; icon: React.ElementType }[] = [
  { id: "mobile",  label: "Mobile",  width: 390,  icon: Smartphone },
  { id: "tablet",  label: "Tablet",  width: 768,  icon: Tablet     },
  { id: "laptop",  label: "Laptop",  width: 1280, icon: Monitor    },
  { id: "desktop", label: "Desktop", width: 1440, icon: Monitor    },
];

function DevicePreviewModal({ onClose }: { onClose: () => void }) {
  const [device, setDevice] = useState<DeviceId>("laptop");
  const [iframeKey, setIframeKey] = useState(0);
  const current = DEVICES.find(d => d.id === device)!;
  const iframeWidth = current.width;

  return (
    <div className="fixed inset-0 z-[200] flex flex-col" style={{ background: "rgba(3,6,18,0.93)", backdropFilter: "blur(6px)" }}>
      {/* Toolbar */}
      <div className="h-12 shrink-0 flex items-center gap-3 px-4 border-b border-white/[0.08]" style={{ background: "rgba(10,14,28,0.9)" }}>
        <div className="flex items-center gap-2 text-white/70">
          <Eye className="w-4 h-4 text-indigo-400" />
          <span className="text-sm font-semibold">Device Preview</span>
        </div>

        {/* Device switcher */}
        <div className="flex items-center gap-1 ml-4 p-0.5 rounded-lg" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}>
          {DEVICES.map(d => (
            <button
              key={d.id}
              onClick={() => setDevice(d.id)}
              title={`${d.label} (${d.width}px)`}
              className={cn(
                "flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all",
                device === d.id
                  ? "bg-indigo-600 text-white"
                  : "text-gray-400 hover:text-white hover:bg-white/10"
              )}
            >
              <d.icon className="w-3.5 h-3.5" />
              <span className="hidden lg:inline">{d.label}</span>
              <span className="text-[9px] opacity-60 hidden xl:inline">({d.width}px)</span>
            </button>
          ))}
        </div>

        <span className="ml-2 text-[11px] text-gray-500 hidden xl:block">
          Viewport: {iframeWidth} × viewport-height
        </span>

        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={() => setIframeKey(k => k + 1)}
            title="Reload preview"
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Preview canvas */}
      <div className="flex-1 overflow-auto flex items-start justify-center py-6 px-4">
        {/* Device chrome */}
        <div
          className="relative flex flex-col rounded-2xl overflow-hidden shadow-2xl"
          style={{
            width: iframeWidth,
            maxWidth: "100%",
            minHeight: 520,
            border: "1.5px solid rgba(99,102,241,0.35)",
            boxShadow: "0 0 60px rgba(79,70,229,0.2), 0 24px 80px rgba(0,0,0,0.6)",
          }}
        >
          {/* Address bar */}
          <div className="h-8 shrink-0 flex items-center gap-2 px-3" style={{ background: "#1a1f35", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
            <div className="flex gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-red-500/70" />
              <div className="w-2.5 h-2.5 rounded-full bg-amber-400/70" />
              <div className="w-2.5 h-2.5 rounded-full bg-green-500/70" />
            </div>
            <div className="flex-1 mx-2 h-4 rounded-sm flex items-center px-2" style={{ background: "rgba(255,255,255,0.06)" }}>
              <span className="text-[9px] text-gray-500">{typeof window !== "undefined" ? window.location.origin : ""}/portal/dashboard</span>
            </div>
          </div>

          {/* iFrame */}
          <iframe
            key={iframeKey}
            src="/portal/dashboard"
            title="Portal preview"
            className="flex-1 w-full bg-white"
            style={{ minHeight: 540, border: "none" }}
          />
        </div>
      </div>

      {/* Footer hint */}
      <div className="h-9 shrink-0 flex items-center justify-center border-t border-white/[0.05]" style={{ background: "rgba(10,14,28,0.9)" }}>
        <p className="text-[10px] text-gray-600">
          Preview reflects the live portal — changes save automatically to the builder before previewing.
        </p>
      </div>
    </div>
  );
}

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
  const { isAuthenticated, user } = usePortalAuthStore();
  const [collapsed, setCollapsed] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace("/portal/login?redirect=/apps/portal-builder");
      return;
    }
    if (!(user as any)?.isPortalAdmin) {
      router.replace("/portal/dashboard");
    }
  }, [isAuthenticated, user, router]);

  if (!isAuthenticated || !(user as any)?.isPortalAdmin) return null;

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
                <p className="text-xs font-medium text-white truncate">{user ? `${(user as any).firstName} ${(user as any).lastName}`.trim() || (user as any).email : "Portal Admin"}</p>
                <p className="text-[10px] text-gray-500 truncate">{(user as any)?.email ?? ""}</p>
              </div>
              <Link
                href="/portal/dashboard"
                className="flex items-center gap-2 px-2.5 py-2 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
              >
                <ArrowLeft className="w-4 h-4 shrink-0" />
                <span>Portal Dashboard</span>
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
        <header className="h-12 px-4 lg:px-6 border-b border-gray-800 bg-gray-900 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-indigo-400" />
            <span className="text-sm font-semibold text-white">Portal Builder Studio</span>
          </div>

          {/* Device Preview — only shown on laptop+ screens */}
          <button
            onClick={() => setPreviewOpen(true)}
            className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-all"
            style={{
              background: "linear-gradient(135deg, #4338ca, #6d28d9)",
              color: "white",
              boxShadow: "0 2px 10px rgba(67,56,202,0.35)",
              border: "1px solid rgba(255,255,255,0.1)",
            }}
            title="Preview portal at different screen sizes"
          >
            <Monitor className="w-3.5 h-3.5" />
            <span>Device Preview</span>
          </button>
        </header>
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          {children}
        </main>
      </div>

      {/* Device preview modal */}
      {previewOpen && <DevicePreviewModal onClose={() => setPreviewOpen(false)} />}
    </div>
  );
}
