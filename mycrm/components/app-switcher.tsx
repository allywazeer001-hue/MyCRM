"use client";
import { useState, useRef, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { X, Database, ClipboardList, Globe, BarChart3, Zap, FileBarChart2, ClipboardCheck } from "lucide-react";
import { cn } from "@/lib/utils";

// ── App definitions ───────────────────────────────────────────────────────────

const APPS = [
  {
    id: "crm",
    label: "CRM",
    description: "Records & modules",
    href: "/dashboard",
    gradient: "from-blue-500 to-blue-600",
    icon: <Database className="w-7 h-7 text-white" />,
  },
  {
    id: "forms",
    label: "Cloud Forms",
    description: "Form builder & surveys",
    href: "/cloudforms",
    newTab: false,
    gradient: "from-violet-500 to-violet-600",
    icon: <ClipboardList className="w-7 h-7 text-white" />,
  },
  {
    id: "portal",
    label: "Portal",
    description: "Customer portal studio",
    href: "/portal/login?redirect=/apps/portal-builder",
    gradient: "from-indigo-500 to-indigo-600",
    icon: <Globe className="w-7 h-7 text-white" />,
  },
  {
    id: "analytics",
    label: "Analytics",
    description: "Charts & KPIs",
    href: "/analytics",
    gradient: "from-amber-500 to-orange-500",
    icon: <BarChart3 className="w-7 h-7 text-white" />,
  },
  {
    id: "automations",
    label: "Automations",
    description: "Triggers & actions",
    href: "/workflows",
    gradient: "from-teal-500 to-cyan-600",
    icon: <Zap className="w-7 h-7 text-white" />,
  },
  {
    id: "reports",
    label: "Reports",
    description: "Dynamic reports",
    href: "/apps/report-builder",
    gradient: "from-emerald-500 to-emerald-600",
    icon: <FileBarChart2 className="w-7 h-7 text-white" />,
  },
  {
    id: "tracker",
    label: "Tracker",
    description: "Evaluations & scoring",
    href: "/tracker",
    gradient: "from-rose-500 to-pink-600",
    icon: <ClipboardCheck className="w-7 h-7 text-white" />,
  },
];

const COMING = [
  { id: "hr",        label: "HR",         gradient: "from-rose-400 to-rose-500" },
  { id: "finance",   label: "Finance",    gradient: "from-green-400 to-green-500" },
  { id: "helpdesk",  label: "Helpdesk",   gradient: "from-orange-400 to-orange-500" },
];

// ── Waffle icon ───────────────────────────────────────────────────────────────

function WaffleIcon({ className }: { className?: string }) {
  return (
    <svg width="17" height="17" viewBox="0 0 17 17" fill="currentColor" className={className}>
      <rect x="0"   y="0"    width="5" height="5" rx="1.2" />
      <rect x="6.5" y="0"    width="5" height="5" rx="1.2" />
      <rect x="13"  y="0"    width="4" height="5" rx="1.2" />
      <rect x="0"   y="6.5"  width="5" height="5" rx="1.2" />
      <rect x="6.5" y="6.5"  width="5" height="5" rx="1.2" />
      <rect x="13"  y="6.5"  width="4" height="5" rx="1.2" />
      <rect x="0"   y="12.5" width="5" height="4.5" rx="1.2" />
      <rect x="6.5" y="12.5" width="5" height="4.5" rx="1.2" />
      <rect x="13"  y="12.5" width="4" height="4.5" rx="1.2" />
    </svg>
  );
}

// ── AppSwitcher ───────────────────────────────────────────────────────────────

export function AppSwitcher() {
  const router   = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const btnRef  = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  // Close when route changes
  useEffect(() => { setOpen(false); }, [pathname]);

  const handleClick = (app: { href: string; newTab?: boolean }) => {
    setOpen(false);
    if (app.newTab) {
      window.open(app.href, "_blank");
    } else {
      router.push(app.href);
    }
  };

  return (
    <>
      {/* Trigger button */}
      <button
        ref={btnRef}
        onClick={() => setOpen(o => !o)}
        aria-label="Open app launcher"
        title="Apps"
        className={cn(
          "relative group flex items-center justify-center w-9 h-9 rounded-xl transition-all duration-200",
          open
            ? "bg-blue-600 text-white shadow-md shadow-blue-200"
            : "text-slate-500 hover:bg-slate-100 hover:text-blue-600"
        )}
      >
        <WaffleIcon className={cn(
          "transition-transform duration-200",
          open ? "scale-90 text-white" : "group-hover:scale-110"
        )} />
        {open && (
          <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 bg-blue-600 rounded-full" />
        )}
      </button>

      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Dropdown panel */}
      {open && (
        <div
          className="fixed right-3 z-50 overflow-hidden"
          style={{
            top: "48px",
            width: "340px",
            borderRadius: "18px",
            boxShadow: "0 8px 40px rgba(0,0,0,0.14), 0 2px 8px rgba(0,0,0,0.06)",
            background: "#fff",
            border: "1px solid rgba(148,163,184,0.2)",
            animation: "switcher-drop 180ms cubic-bezier(0.16,1,0.3,1) both",
          }}
        >
          {/* Panel header */}
          <div className="flex items-center justify-between px-4 pt-4 pb-3">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg flex items-center justify-center shadow-sm">
                <WaffleIcon className="w-3.5 h-3.5 text-white" />
              </div>
              <span className="text-[13px] font-bold text-slate-800 tracking-tight">Cloudbox Apps</span>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="w-6 h-6 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Apps grid */}
          <div className="px-3 pb-3">
            <div className="grid grid-cols-3 gap-1">
              {APPS.map(app => {
                const isActive = pathname?.startsWith(app.href.split("?")[0]) &&
                  app.href.split("?")[0] !== "/";
                return (
                  <button
                    key={app.id}
                    onClick={() => handleClick(app)}
                    className={cn(
                      "group flex flex-col items-center gap-2 px-2 py-3 rounded-2xl transition-all duration-150",
                      isActive
                        ? "bg-slate-100"
                        : "hover:bg-slate-50"
                    )}
                  >
                    <div className={cn(
                      "w-14 h-14 bg-gradient-to-br rounded-2xl flex items-center justify-center shadow-md transition-all duration-150 group-hover:shadow-lg group-hover:scale-[1.06]",
                      app.gradient
                    )}>
                      {app.icon}
                    </div>
                    <div className="text-center">
                      <p className="text-[11.5px] font-semibold text-slate-700 leading-tight">{app.label}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Divider + Coming Soon */}
          <div className="mx-4 border-t border-slate-100 pt-2 pb-3">
            <p className="text-[9.5px] font-bold uppercase tracking-widest text-slate-400 mb-2 px-1">
              Coming Soon
            </p>
            <div className="grid grid-cols-3 gap-1">
              {COMING.map(app => (
                <div key={app.id}
                  className="flex flex-col items-center gap-1.5 px-2 py-2.5 rounded-2xl opacity-40 cursor-default">
                  <div className={`w-11 h-11 bg-gradient-to-br ${app.gradient} rounded-xl flex items-center justify-center`}>
                    <span className="text-lg">
                      {app.id === "hr" ? "👥" : app.id === "finance" ? "💰" : "🎯"}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 font-medium">{app.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div className="px-4 py-2.5 bg-slate-50/80 border-t border-slate-100 flex items-center justify-between">
            <span className="text-[11px] text-slate-400 font-medium">Cloudbox Platform</span>
            <Link
              href="/settings"
              onClick={() => setOpen(false)}
              className="text-[11px] text-blue-600 hover:text-blue-700 font-semibold transition-colors"
            >
              Settings →
            </Link>
          </div>
        </div>
      )}

      <style jsx global>{`
        @keyframes switcher-drop {
          from { opacity: 0; transform: translateY(-8px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0)   scale(1); }
        }
      `}</style>
    </>
  );
}
