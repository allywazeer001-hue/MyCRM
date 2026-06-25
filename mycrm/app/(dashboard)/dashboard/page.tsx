"use client";
import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  X, Sparkles, ArrowRight, Layers, Activity,
  Users, Database, FileText, BarChart3, Workflow,
  ChevronRight, Loader2, Zap, Building2,
} from "lucide-react";
import { DashboardBuilder } from "@/components/ui/dashboard-builder";
import { useAuthStore } from "@/store/auth.store";
import { useModulesStore } from "@/store/modules.store";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

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

// ── Stat card ─────────────────────────────────────────────────────────────────

function StatCard({ icon: Icon, label, value, sub, color, href }: {
  icon: React.ElementType; label: string; value: string | number; sub?: string;
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
        <p className="text-xl font-bold text-gray-900 leading-tight">{typeof value === "number" ? value.toLocaleString() : value}</p>
        <p className="text-xs text-gray-500 truncate">{label}</p>
        {sub && <p className="text-[10px] text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
  return href ? <Link href={href}>{inner}</Link> : inner;
}



// ── Recent activity ───────────────────────────────────────────────────────────

function RecentActivity() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/audit?limit=8")
      .then(r => setLogs(r.data ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const ACTION_COLORS: Record<string, string> = {
    CREATE: "bg-green-100 text-green-600",
    UPDATE: "bg-blue-100 text-blue-600",
    DELETE: "bg-red-100 text-red-600",
    LOGIN:  "bg-violet-100 text-violet-600",
  };

  const formatAction = (action: string) =>
    action.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, c => c.toUpperCase());

  const timeAgo = (ts: string) => {
    const diff = Date.now() - new Date(ts).getTime();
    if (diff < 60000) return "just now";
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return `${Math.floor(diff / 86400000)}d ago`;
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
        <Activity className="w-4 h-4 text-gray-400" />
        <p className="text-sm font-semibold text-gray-800">Recent Activity</p>
      </div>
      <div className="divide-y divide-gray-50">
        {loading ? (
          <div className="flex items-center justify-center py-8"><Loader2 className="w-4 h-4 animate-spin text-gray-400" /></div>
        ) : logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-gray-400 gap-2">
            <Activity className="w-6 h-6 opacity-40" />
            <p className="text-xs">No activity yet</p>
          </div>
        ) : logs.map((log: any) => {
          const actionKey = log.action?.split("_")[0] ?? "UPDATE";
          const badge = ACTION_COLORS[actionKey] ?? "bg-gray-100 text-gray-500";
          return (
            <div key={log.id} className="flex items-start gap-3 px-4 py-3 hover:bg-gray-50/50 transition-colors">
              <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center shrink-0 mt-0.5">
                <span className="text-[10px] font-semibold text-gray-500">
                  {log.user?.firstName?.[0]}{log.user?.lastName?.[0]}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-700 truncate">
                  <span className="font-medium text-gray-900">{log.user?.firstName} {log.user?.lastName}</span>
                  {" "}
                  <span className={cn("inline-flex items-center text-[10px] font-medium px-1.5 py-0.5 rounded-full", badge)}>
                    {formatAction(log.action)}
                  </span>
                </p>
                {log.entity && <p className="text-[11px] text-gray-400 truncate mt-0.5">{log.entity}</p>}
              </div>
              <p className="text-[10px] text-gray-400 shrink-0 mt-0.5">{timeAgo(log.createdAt)}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
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
          <div className={cn("border rounded-xl p-3.5 hover:shadow-sm transition-all cursor-pointer group", a.color)}>
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

// ── Main overview section ─────────────────────────────────────────────────────

function DashboardOverview() {
  const { user }    = useAuthStore();
  const { modules } = useModulesStore();
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    api.get("/organizations/me/stats").then(r => setStats(r.data)).catch(() => {});
  }, []);

  const activeModules = modules.filter(m => m.isActive !== false);
  const hasModules    = activeModules.length > 0;

  const orgName = (user as any)?.organization?.name ?? "Your Organization";

  return (
    <div className="space-y-5">
      {/* Org header row */}
      <div>
        <h1 className="text-lg font-bold text-gray-900">{orgName}</h1>
        <p className="text-xs text-gray-500 mt-0.5">
          {new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
        </p>
      </div>

      {/* Stats row */}
      {stats && (
        <div className="grid grid-cols-3 gap-3">
          <StatCard icon={Database} label="Records"   value={stats.records   ?? "—"} color="bg-emerald-50 text-emerald-600" />
          <StatCard icon={Users}    label="Users"     value={stats.users     ?? "—"} color="bg-violet-50 text-violet-600"  href="/users" />
          <StatCard icon={Workflow} label="Workflows" value={stats.workflows ?? "—"} color="bg-orange-50 text-orange-600"  href="/settings/automation" />
        </div>
      )}

      {!hasModules ? (
        /* No modules — show onboarding checklist */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2">
            <GettingStarted />
          </div>
          <QuickActions />
        </div>
      ) : (
        /* Has modules — quick actions + activity */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2">
            <QuickActions />
          </div>
          <RecentActivity />
        </div>
      )}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <WelcomeBanner />
      <DashboardOverview />

      {/* Analytics widgets section */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 className="w-4 h-4 text-gray-400" />
          <p className="text-sm font-semibold text-gray-700">Analytics Dashboard</p>
          <div className="h-px flex-1 bg-gray-200" />
        </div>
        <DashboardBuilder />
      </div>
    </div>
  );
}
