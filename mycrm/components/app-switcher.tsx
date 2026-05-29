"use client";
import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Grid3X3, Search, X, ArrowRight, Zap } from "lucide-react";

const APPS = [
  { id: "crm",       label: "CRM",           description: "Records & modules",         href: "/dashboard",           color: "from-blue-500 to-blue-600",      emoji: "📊", soon: false },
  { id: "forms",     label: "Forms",         description: "Form builder",              href: "/forms",               color: "from-violet-500 to-violet-600",  emoji: "📝", soon: false },
  { id: "portal",    label: "Portal",        description: "Customer portal studio",    href: "/apps/portal-builder", color: "from-indigo-500 to-indigo-600",  emoji: "🌐", soon: false },
  { id: "reports",   label: "Reports",       description: "Dynamic reports",           href: "/apps/report-builder", color: "from-emerald-500 to-emerald-600",emoji: "📈", soon: false },
  { id: "analytics", label: "Analytics",     description: "Charts & KPIs",             href: "/analytics",           color: "from-amber-500 to-orange-500",   emoji: "📉", soon: false },
  { id: "automations", label: "Automations", description: "Triggers & actions",        href: "/workflows",           color: "from-teal-500 to-cyan-600",      emoji: "⚡", soon: false },
];

const COMING = [
  { id: "hr",        label: "HR",         emoji: "👥", color: "from-rose-400 to-rose-500" },
  { id: "finance",   label: "Finance",    emoji: "💰", color: "from-green-400 to-green-500" },
  { id: "projects",  label: "Projects",   emoji: "🗂️", color: "from-sky-400 to-sky-500" },
  { id: "helpdesk",  label: "Helpdesk",   emoji: "🎯", color: "from-orange-400 to-orange-500" },
  { id: "inventory", label: "Inventory",  emoji: "📦", color: "from-purple-400 to-purple-500" },
  { id: "learning",  label: "Learning",   emoji: "🎓", color: "from-pink-400 to-pink-500" },
];

export function AppSwitcher() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (open) {
      setSearch("");
      setTimeout(() => inputRef.current?.focus(), 60);
    }
  }, [open]);

  const query = search.trim().toLowerCase();
  const filtered = query
    ? APPS.filter(a => a.label.toLowerCase().includes(query) || a.description.toLowerCase().includes(query))
    : APPS;

  const handleClick = (href: string) => {
    setOpen(false);
    router.push(href);
  };

  return (
    <>
      <button
        onClick={() => setOpen(o => !o)}
        className={`p-2 rounded-lg transition-colors ${open ? "bg-gray-100 text-blue-600" : "text-gray-500 hover:bg-gray-100 hover:text-gray-700"}`}
        title="App Launcher"
        aria-label="Open app launcher"
      >
        <Grid3X3 className="w-5 h-5" />
      </button>

      {open && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
            onClick={() => setOpen(false)}
          />

          {/* Centered launcher */}
          <div
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[680px] max-w-[calc(100vw-2rem)] bg-white rounded-2xl shadow-2xl z-50 overflow-hidden"
            style={{ animation: "launcher-in 150ms cubic-bezier(0.16,1,0.3,1) both" }}
          >
            {/* Search bar */}
            <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                <input
                  ref={inputRef}
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search apps…"
                  className="w-full pl-9 pr-4 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-colors"
                />
              </div>
              <button
                onClick={() => setOpen(false)}
                className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="p-5 space-y-6 max-h-[60vh] overflow-y-auto">
              {/* Active apps */}
              <div>
                <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest mb-3">
                  {query ? `${filtered.length} result${filtered.length !== 1 ? "s" : ""}` : "Apps"}
                </p>
                {filtered.length === 0 ? (
                  <p className="text-sm text-gray-400 py-6 text-center">No apps match "{search}"</p>
                ) : (
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                    {filtered.map(app => (
                      <button
                        key={app.id}
                        onClick={() => handleClick(app.href)}
                        className="flex flex-col items-center gap-2 p-3 rounded-xl hover:bg-gray-50 hover:shadow-sm transition-all group"
                      >
                        <div className={`w-14 h-14 bg-gradient-to-br ${app.color} rounded-2xl flex items-center justify-center shadow-md group-hover:scale-105 transition-transform`}>
                          <span className="text-2xl">{app.emoji}</span>
                        </div>
                        <p className="text-xs font-semibold text-gray-800 leading-tight text-center">{app.label}</p>
                        <p className="text-[10px] text-gray-400 leading-tight text-center -mt-1">{app.description}</p>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Coming soon — only show when not searching */}
              {!query && (
                <div>
                  <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest mb-3">Coming Soon</p>
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                    {COMING.map(app => (
                      <div
                        key={app.id}
                        className="flex flex-col items-center gap-2 p-3 rounded-xl opacity-45"
                      >
                        <div className={`w-14 h-14 bg-gradient-to-br ${app.color} rounded-2xl flex items-center justify-center shadow-sm`}>
                          <span className="text-2xl">{app.emoji}</span>
                        </div>
                        <p className="text-xs font-medium text-gray-500 text-center leading-tight">{app.label}</p>
                        <span className="text-[9px] px-1.5 py-0.5 bg-gray-100 text-gray-400 rounded-full font-medium -mt-1">Soon</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-5 py-3 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs text-gray-400">
                <Zap className="w-3 h-3" />
                Enterprise CRM Platform
              </div>
              <Link
                href="/settings"
                onClick={() => setOpen(false)}
                className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 transition-colors"
              >
                Manage integrations <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          </div>
        </>
      )}

      <style jsx global>{`
        @keyframes launcher-in {
          from { opacity: 0; transform: translate(-50%, -50%) scale(0.95); }
          to   { opacity: 1; transform: translate(-50%, -50%) scale(1); }
        }
      `}</style>
    </>
  );
}
