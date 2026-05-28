"use client";
import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { Grid3X3, ChevronRight } from "lucide-react";

const APPS = [
  { id: "crm",     label: "CRM",            description: "Records & workflows",    href: "/dashboard",                color: "from-blue-500 to-blue-600",    emoji: "📊" },
  { id: "forms",   label: "Forms",           description: "Form builder",           href: "/forms",                    color: "from-violet-500 to-violet-600", emoji: "📝" },
  { id: "portal",  label: "Portal Builder",  description: "Customer portal studio", href: "/apps/portal-builder",      color: "from-indigo-500 to-indigo-600", emoji: "🌐" },
  { id: "reports", label: "Reports",         description: "Dynamic data reports",   href: "/apps/report-builder",      color: "from-emerald-500 to-emerald-600", emoji: "📈" },
];

const COMING_SOON = ["HR", "Finance", "Projects", "Helpdesk", "Inventory", "Learning"];

export function AppSwitcher() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(o => !o)}
        className={`p-2 rounded-lg transition-colors ${open ? "bg-gray-100 text-gray-700" : "text-gray-500 hover:bg-gray-100 hover:text-gray-700"}`}
        title="App Launcher"
      >
        <Grid3X3 className="w-5 h-5" />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-white border border-gray-200 rounded-2xl shadow-2xl z-50 overflow-hidden">
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-100">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">App Launcher</p>
          </div>

          <div className="p-3 grid grid-cols-3 gap-2">
            {APPS.map(app => (
              <Link
                key={app.id}
                href={app.href}
                onClick={() => setOpen(false)}
                className="flex flex-col items-center gap-2 p-3 rounded-xl hover:bg-gray-50 transition-all text-center group"
              >
                <div className={`w-12 h-12 bg-gradient-to-br ${app.color} rounded-xl flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform`}>
                  <span className="text-2xl">{app.emoji}</span>
                </div>
                <p className="text-xs font-semibold text-gray-800">{app.label}</p>
                <p className="text-[10px] text-gray-400 leading-tight -mt-1">{app.description}</p>
              </Link>
            ))}
          </div>

          <div className="px-4 pb-3 pt-1">
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Coming Soon</p>
            <div className="flex flex-wrap gap-1.5">
              {COMING_SOON.map(app => (
                <span key={app} className="text-[10px] px-2 py-1 bg-gray-100 text-gray-400 rounded-lg font-medium">{app}</span>
              ))}
            </div>
          </div>

          <div className="px-4 py-2.5 bg-gray-50 border-t border-gray-100">
            <Link href="/settings" onClick={() => setOpen(false)} className="flex items-center justify-between text-xs text-gray-500 hover:text-gray-700">
              <span>Manage apps &amp; integrations</span>
              <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
