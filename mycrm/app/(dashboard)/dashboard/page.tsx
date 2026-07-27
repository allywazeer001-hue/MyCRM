"use client";
import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  X, Sparkles, ArrowRight, Layers, Activity,
  Users, Database, FileText, BarChart3, Workflow,
  ChevronRight, Loader2, Zap, Building2, ChevronDown,
  Check, Package, Hash,
} from "lucide-react";
import { DashboardBuilder } from "@/components/ui/dashboard-builder";
import { useAuthStore } from "@/store/auth.store";
import { useModulesStore } from "@/store/modules.store";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { ModuleIcon } from "@/components/ui/module-icon";

// ── Welcome banner ────────────────────────────────────────────────────────────

function WelcomeBanner() {
  const { user } = useAuthStore();
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    const dismissed = localStorage.getItem(`welcome_dismissed_${user.id}`);
    if (!dismissed) setShow(true);
  }, [user?.id]);

  const dismiss = () => {
    if (user?.id) localStorage.setItem(`welcome_dismissed_${user.id}`, "1");
    setShow(false);
  };

  if (!show) return null;

  return (
    <div className="mb-5 relative rounded-2xl overflow-hidden">
      <div className="absolute inset-0" style={{ background: "linear-gradient(135deg, #1d4ed8 0%, #1e40af 40%, #4338ca 100%)" }} />
      <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.8) 1px, transparent 1px)", backgroundSize: "28px 28px" }} />
      <div className="absolute top-0 right-16 w-48 h-48 bg-blue-400/20 rounded-full blur-2xl pointer-events-none" />
      <div className="relative flex items-start gap-4 p-5 pr-12">
        <div className="w-11 h-11 bg-white/15 border border-white/20 rounded-xl flex items-center justify-center shrink-0 mt-0.5">
          <Sparkles className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="font-extrabold text-white text-lg mb-1">
            Welcome, {user?.firstName}! 🎉
          </h2>
          <p className="text-blue-100/75 text-sm leading-relaxed mb-4">
            <span className="font-semibold text-white">{user?.organization?.name}</span> is all set up.
            Build your data modules in Studio, automate with Workflows, and visualize everything in Analytics.
          </p>
          <div className="flex flex-wrap gap-2">
            <Link href="/studio" className="inline-flex items-center gap-1.5 text-xs font-bold bg-white text-blue-700 px-3.5 py-2 rounded-xl hover:bg-blue-50 transition-colors shadow-sm">
              Module Studio <ArrowRight className="w-3 h-3" />
            </Link>
            <Link href="/analytics" className="inline-flex items-center gap-1.5 text-xs font-semibold bg-white/10 hover:bg-white/20 border border-white/20 text-white px-3.5 py-2 rounded-xl transition-colors">
              Analytics
            </Link>
            <Link href="/settings/automation" className="inline-flex items-center gap-1.5 text-xs font-semibold bg-white/10 hover:bg-white/20 border border-white/20 text-white px-3.5 py-2 rounded-xl transition-colors">
              Automation
            </Link>
            <Link href="/forms" className="inline-flex items-center gap-1.5 text-xs font-semibold bg-white/10 hover:bg-white/20 border border-white/20 text-white px-3.5 py-2 rounded-xl transition-colors">
              Forms
            </Link>
          </div>
        </div>
        <button onClick={dismiss} className="absolute top-3.5 right-3.5 text-white/50 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/10">
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// ── View selector dropdown ─────────────────────────────────────────────────────

type DashView = "analytics" | "org_summary";

const VIEW_OPTIONS: { value: DashView; label: string; icon: React.ElementType }[] = [
  { value: "analytics",   label: "Analytics Dashboard",   icon: BarChart3  },
  { value: "org_summary", label: "Organisation Summary",  icon: Building2  },
];

function ViewSelector({ view, onChange }: { view: DashView; onChange: (v: DashView) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const current = VIEW_OPTIONS.find(o => o.value === view)!;

  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    if (open) document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);

  return (
    <div ref={ref} className="relative inline-block">
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-gray-200 bg-white hover:border-gray-300 text-sm font-semibold text-gray-700 transition-colors shadow-sm"
      >
        <current.icon className="w-3.5 h-3.5 text-gray-500" />
        {current.label}
        <ChevronDown className={cn("w-3.5 h-3.5 text-gray-400 transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1 z-30 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden min-w-[200px]">
          {VIEW_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => { onChange(opt.value); setOpen(false); }}
              className={cn(
                "w-full flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors text-left",
                view === opt.value
                  ? "bg-blue-50 text-blue-700 font-semibold"
                  : "text-gray-700 hover:bg-gray-50",
              )}
            >
              <opt.icon className="w-4 h-4 shrink-0" />
              {opt.label}
              {view === opt.value && <Check className="w-3.5 h-3.5 ml-auto" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Stat card ─────────────────────────────────────────────────────────────────

function StatCard({ icon: Icon, label, value, color, href }: {
  icon: React.ElementType; label: string; value: string | number;
  color: string; href?: string;
}) {
  const inner = (
    <div className={cn(
      "bg-white border border-gray-200 rounded-xl p-4 flex items-center gap-3 transition-all",
      href && "hover:border-gray-300 hover:shadow-sm cursor-pointer"
    )}>
      <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0", color)}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xl font-bold text-gray-900 leading-tight">
          {typeof value === "number" ? value.toLocaleString() : value}
        </p>
        <p className="text-xs text-gray-500 truncate">{label}</p>
      </div>
    </div>
  );
  return href ? <Link href={href}>{inner}</Link> : inner;
}

// ── Quick actions ─────────────────────────────────────────────────────────────

function QuickActions() {
  const actions = [
    { href: "/forms",               icon: FileText,  label: "Create Form",  desc: "Capture data externally",  color: "text-green-600 bg-green-50 border-green-100" },
    { href: "/settings/automation", icon: Zap,       label: "Automation",   desc: "Workflows & blueprints",   color: "text-violet-600 bg-violet-50 border-violet-100" },
    { href: "/analytics",           icon: BarChart3, label: "Analytics",    desc: "Charts & dashboards",      color: "text-orange-600 bg-orange-50 border-orange-100" },
  ];
  return (
    <div className="grid grid-cols-3 gap-3">
      {actions.map(a => (
        <Link key={a.href} href={a.href}>
          <div className={cn("border rounded-xl p-3.5 hover:shadow-sm transition-all cursor-pointer", a.color)}>
            <a.icon className="w-5 h-5 mb-2" />
            <p className="text-sm font-semibold text-gray-900">{a.label}</p>
            <p className="text-xs text-gray-500 mt-0.5">{a.desc}</p>
          </div>
        </Link>
      ))}
    </div>
  );
}

// ── No-modules onboarding ─────────────────────────────────────────────────────

function GettingStarted() {
  const steps = [
    { step: 1, icon: Building2, title: "Set up your organization", desc: "Add your org details, departments, and invite team members.", href: "/settings/organization", cta: "Organization Settings" },
    { step: 2, icon: Layers,    title: "Create your first module", desc: "Use the Studio to define your data model — fields, layouts, views.", href: "/studio",                 cta: "Open Studio" },
    { step: 3, icon: FileText,  title: "Build a form",             desc: "Design forms to capture data and share with stakeholders.",       href: "/forms",                  cta: "Create Form" },
    { step: 4, icon: BarChart3, title: "Set up Analytics",         desc: "Configure charts, KPIs and dashboards to track performance.",    href: "/analytics",              cta: "Go to Analytics" },
  ];
  return (
    <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100">
        <p className="text-sm font-semibold text-gray-900">Getting Started</p>
        <p className="text-xs text-gray-500 mt-0.5">Complete these steps to set up your workspace</p>
      </div>
      <div className="divide-y divide-gray-50">
        {steps.map(s => (
          <div key={s.step} className="flex items-start gap-4 px-5 py-4 hover:bg-gray-50/50 transition-colors">
            <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
              {s.step}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900">{s.title}</p>
              <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{s.desc}</p>
            </div>
            <Link href={s.href} className="shrink-0">
              <span className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors border border-blue-100">
                {s.cta} <ChevronRight className="w-3 h-3" />
              </span>
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Organisation Summary view (admin only) ────────────────────────────────────

function OrgSummaryView() {
  const { modules } = useModulesStore();
  const { user }    = useAuthStore();
  const [stats, setStats]   = useState<any>(null);
  const [depts, setDepts]   = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get("/organizations/me/stats").then(r => setStats(r.data)).catch(() => {}),
      api.get("/departments").then(r => setDepts(Array.isArray(r.data) ? r.data : [])).catch(() => {}),
    ]).finally(() => setLoading(false));
  }, []);

  const activeModules = modules.filter(m => m.isActive !== false);
  const orgName = (user as any)?.organization?.name ?? "Organisation";

  return (
    <div className="space-y-6">
      {/* Org name */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white font-extrabold text-sm shrink-0">
          {orgName[0]?.toUpperCase()}
        </div>
        <div>
          <h2 className="text-base font-bold text-gray-900">{orgName}</h2>
          <p className="text-xs text-gray-400">
            {new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
          </p>
        </div>
      </div>

      {/* Stat cards */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-20 bg-gray-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <StatCard icon={Database}  label="Total Records"  value={stats?.records   ?? 0} color="bg-emerald-50 text-emerald-600" />
          <StatCard icon={Users}     label="Staff Members"  value={stats?.users     ?? 0} color="bg-violet-50 text-violet-600"   href="/users" />
          <StatCard icon={Building2} label="Departments"    value={depts.length}          color="bg-blue-50 text-blue-600"       href="/admin/departments" />
          <StatCard icon={Layers}    label="Modules"        value={activeModules.length}  color="bg-indigo-50 text-indigo-600"   href="/studio" />
          <StatCard icon={Workflow}  label="Workflows"      value={stats?.workflows ?? 0} color="bg-orange-50 text-orange-600"   href="/settings/automation" />
        </div>
      )}

      {/* Departments + Modules grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* Departments */}
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-gray-400" />
              <p className="text-sm font-semibold text-gray-800">Departments</p>
              <span className="text-xs text-gray-400">({depts.length})</span>
            </div>
            <Link href="/admin/departments" className="text-xs text-blue-600 hover:underline font-medium">
              Manage →
            </Link>
          </div>
          {loading ? (
            <div className="p-4 space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-8 bg-gray-100 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : depts.length === 0 ? (
            <div className="flex items-center justify-center py-8 text-gray-400">
              <p className="text-sm">No departments yet</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50 max-h-64 overflow-y-auto">
              {depts.map((d: any) => (
                <div key={d.id} className="flex items-center gap-3 px-4 py-2.5">
                  <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: d.color || "#6366f1" }} />
                  <span className="flex-1 text-sm text-gray-700 font-medium truncate">{d.name}</span>
                  {d._count?.users !== undefined && (
                    <span className="text-xs text-gray-400 flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      {d._count.users}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Modules */}
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Package className="w-4 h-4 text-gray-400" />
              <p className="text-sm font-semibold text-gray-800">Active Modules</p>
              <span className="text-xs text-gray-400">({activeModules.length})</span>
            </div>
            <Link href="/studio" className="text-xs text-blue-600 hover:underline font-medium">
              Studio →
            </Link>
          </div>
          {activeModules.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 gap-2">
              <Layers className="w-6 h-6 text-gray-300" />
              <p className="text-sm text-gray-400">No modules yet</p>
              <Link href="/studio/new" className="text-xs text-blue-600 hover:underline">Create one →</Link>
            </div>
          ) : (
            <div className="divide-y divide-gray-50 max-h-64 overflow-y-auto">
              {activeModules.map((mod: any) => (
                <Link key={mod.id} href={`/m/${mod.slug}`}>
                  <div className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 transition-colors cursor-pointer">
                    <ModuleIcon icon={mod.icon} slug={mod.slug} className="w-4 h-4 shrink-0" />
                    <span className="flex-1 text-sm text-gray-700 font-medium truncate">{mod.name}</span>
                    <Hash className="w-3.5 h-3.5 text-gray-300 shrink-0" />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Quick actions */}
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Quick Actions</p>
        <QuickActions />
      </div>
    </div>
  );
}

// ── Analytics view ─────────────────────────────────────────────────────────────

function AnalyticsView() {
  const { modules } = useModulesStore();
  const hasModules = modules.filter(m => m.isActive !== false).length > 0;

  if (!hasModules) {
    return (
      <div className="space-y-5">
        <GettingStarted />
        <QuickActions />
      </div>
    );
  }

  return <DashboardBuilder />;
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { user } = useAuthStore();
  const isAdmin  = user?.role === "ADMIN" || user?.role === "SUPER_ADMIN";
  const [view, setView] = useState<DashView>("analytics");

  return (
    <div className="space-y-5">
      <WelcomeBanner />

      {/* Page header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-lg font-bold text-gray-900">Dashboard</h1>
          <p className="text-xs text-gray-400 mt-0.5">
            {new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
          </p>
        </div>
        {isAdmin && (
          <ViewSelector view={view} onChange={setView} />
        )}
      </div>

      {/* Content */}
      {!isAdmin || view === "analytics" ? (
        <AnalyticsView />
      ) : (
        <OrgSummaryView />
      )}
    </div>
  );
}
