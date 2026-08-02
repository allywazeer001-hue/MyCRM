"use client";
import { useEffect, useRef, useState, ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight, Database, Workflow, FileText,
  Globe, BarChart3, FileBarChart2, GitBranch,
  TrendingUp, Users, Zap, Shield, BookOpen,
  Settings2, Layers, ShieldCheck, ListChecks, Table2,
} from "lucide-react";
import { Footer } from "@/components/marketing/footer";
import { BRAND } from "@/lib/core-brand";

// ── Landing config (editable via /land-admin) ────────────────────────────────

interface LandingConfig {
  heroTitle: string;
  heroSubtitle: string;
  heroCta1: string;
  heroCta2: string;
  sectionTitle: string;
  sectionSubtitle: string;
  ctaTitle: string;
  ctaSubtitle: string;
  image1Url: string;
  image2Url: string;
  badgeText: string;
  accentColor: string;
  bgColor: string;
  socialLinks?: Record<string, string>;
}

const DEFAULT_CONFIG: LandingConfig = {
  heroTitle: "One platform.\nEvery part of your business.",
  heroSubtitle: "One unified platform to grow your customer base, manage your people, track your finances, and run every operation — built from the gaps real teams actually hit.",
  heroCta1: "Start for free",
  heroCta2: "Sign in to your workspace",
  sectionTitle: "Everything your team needs",
  sectionSubtitle: "Pick the apps that fit your workflow. They all share the same data.",
  ctaTitle: "Ready to get started?",
  ctaSubtitle: "Register your organization in minutes. No setup fees. No contracts.",
  image1Url: "",
  image2Url: "",
  badgeText: "One platform. Every tool your organization needs.",
  accentColor: "#2563eb",
  bgColor: "#060d1f",
  socialLinks: {},
};

// ── Logo mark ─────────────────────────────────────────────────────────────────
function LogoMark({ size = 20, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" className={className}>
      <rect x="2"  y="2"  width="12" height="12" rx="3" fill="currentColor" opacity="0.9" />
      <rect x="18" y="2"  width="12" height="12" rx="3" fill="currentColor" opacity="0.7" />
      <rect x="2"  y="18" width="12" height="12" rx="3" fill="currentColor" opacity="0.7" />
      <rect x="18" y="18" width="12" height="12" rx="3" fill="currentColor" opacity="0.5" />
    </svg>
  );
}

// ── Scroll reveal ─────────────────────────────────────────────────────────────
function Reveal({ children, delay = 0, className = "" }: {
  children: ReactNode; delay?: number; className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); observer.disconnect(); } },
      { threshold: 0.12 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(28px)",
        transition: `opacity 0.65s ease ${delay}ms, transform 0.65s ease ${delay}ms`,
        willChange: "opacity, transform",
      }}
    >
      {children}
    </div>
  );
}

// ── CSS dashboard mockup ──────────────────────────────────────────────────────
function DashboardMockup() {
  return (
    <div className="rounded-2xl overflow-hidden border border-white/10 shadow-2xl shadow-blue-900/30 select-none"
      style={{ background: "rgba(11,20,45,0.95)" }}>

      {/* Window chrome */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-white/8"
        style={{ background: "rgba(255,255,255,0.04)" }}>
        <div className="flex gap-1.5">
          {["#ff5f57", "#febc2e", "#28c840"].map(c => (
            <div key={c} className="w-2.5 h-2.5 rounded-full" style={{ background: c }} />
          ))}
        </div>
        <div className="flex-1 mx-3">
          <div className="h-4 rounded bg-white/8 text-[10px] text-white/30 flex items-center px-2">
            {BRAND.name} · Analytics Dashboard
          </div>
        </div>
        <div className="w-4 h-4 rounded bg-white/5" />
      </div>

      {/* Content */}
      <div className="p-4 space-y-3">

        {/* KPI row */}
        <div className="grid grid-cols-4 gap-2">
          {[
            { label: "Contacts", val: "1,248", color: "#3b82f6", trend: "+12%" },
            { label: "Completed", val: "87%",  color: "#10b981", trend: "+5%"  },
            { label: "Active",    val: "34",   color: "#8b5cf6", trend: "+3"   },
            { label: "Revenue",   val: "$98k", color: "#f59e0b", trend: "+21%" },
          ].map(k => (
            <div key={k.label} className="rounded-xl p-2.5" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.07)" }}>
              <div className="text-[10px] text-white/40 mb-1">{k.label}</div>
              <div className="text-sm font-bold text-white">{k.val}</div>
              <div className="text-[9px] mt-0.5" style={{ color: k.color }}>{k.trend}</div>
            </div>
          ))}
        </div>

        {/* Charts row */}
        <div className="grid grid-cols-5 gap-2">
          {/* Bar chart */}
          <div className="col-span-3 rounded-xl p-3" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
            <div className="text-[10px] text-white/40 mb-2">Monthly Records</div>
            <div className="flex items-end gap-1 h-14">
              {[45, 72, 58, 83, 67, 91, 79, 88, 95, 71, 84, 100].map((h, i) => (
                <div key={i} className="flex-1 rounded-sm" style={{
                  height: `${h}%`,
                  background: i === 11 ? "#3b82f6" : `rgba(59,130,246,${0.25 + i * 0.05})`,
                }} />
              ))}
            </div>
          </div>

          {/* Pie chart */}
          <div className="col-span-2 rounded-xl p-3 flex flex-col items-center justify-center" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
            <div className="text-[10px] text-white/40 mb-2">Status Split</div>
            <svg width="52" height="52" viewBox="0 0 52 52">
              {/* Active — 60% */}
              <circle cx="26" cy="26" r="20" fill="none" stroke="#10b981" strokeWidth="10"
                strokeDasharray="75.4 125.6" strokeDashoffset="31.4" />
              {/* Pending — 25% */}
              <circle cx="26" cy="26" r="20" fill="none" stroke="#3b82f6" strokeWidth="10"
                strokeDasharray="31.4 125.6" strokeDashoffset="-44" />
              {/* Inactive — 15% */}
              <circle cx="26" cy="26" r="20" fill="none" stroke="#8b5cf6" strokeWidth="10"
                strokeDasharray="18.8 125.6" strokeDashoffset="-75.4" />
            </svg>
            <div className="flex gap-2 mt-1.5">
              {[["#10b981","60%"], ["#3b82f6","25%"], ["#8b5cf6","15%"]].map(([c, l]) => (
                <div key={l} className="flex items-center gap-0.5">
                  <div className="w-1.5 h-1.5 rounded-full" style={{ background: c }} />
                  <span className="text-[8px] text-white/40">{l}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="rounded-xl overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.06)" }}>
          <div className="grid grid-cols-3 px-3 py-1.5" style={{ background: "rgba(255,255,255,0.06)", fontSize: "9px", color: "rgba(255,255,255,0.4)" }}>
            <span>Name</span><span>Status</span><span>Updated</span>
          </div>
          {[
            ["Jane Doe",    "Active",  "2h ago",    "#10b981"],
            ["Ahmed Ali",  "Pending", "Yesterday", "#f59e0b"],
            ["Sara Mwangi","Active",  "3h ago",    "#10b981"],
          ].map(([name, status, time, c]) => (
            <div key={name as string} className="grid grid-cols-3 px-3 py-2 border-t" style={{ borderColor: "rgba(255,255,255,0.04)", fontSize: "9px" }}>
              <span className="text-white/80 font-medium">{name}</span>
              <span style={{ color: c as string }}>{status}</span>
              <span className="text-white/30">{time}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Workflow mockup ───────────────────────────────────────────────────────────
function WorkflowMockup() {
  return (
    <div className="rounded-2xl overflow-hidden border border-white/10 shadow-2xl shadow-violet-900/20 select-none"
      style={{ background: "rgba(11,20,45,0.95)" }}>

      <div className="flex items-center gap-2 px-4 py-3 border-b border-white/8"
        style={{ background: "rgba(255,255,255,0.04)" }}>
        <div className="flex gap-1.5">
          {["#ff5f57", "#febc2e", "#28c840"].map(c => (
            <div key={c} className="w-2.5 h-2.5 rounded-full" style={{ background: c }} />
          ))}
        </div>
        <span className="text-[10px] text-white/30 ml-3">{BRAND.name} · Module Studio</span>
      </div>

      <div className="p-4">
        {/* Module header */}
        <div className="flex items-center gap-2 mb-3">
          <div className="w-7 h-7 rounded-lg bg-blue-600/80 flex items-center justify-center text-xs">📦</div>
          <div>
            <div className="text-xs font-bold text-white">Contacts</div>
            <div className="text-[9px] text-white/30">847 records · 14 fields</div>
          </div>
          <div className="ml-auto flex gap-1">
            <div className="text-[9px] px-2 py-0.5 rounded bg-blue-500/20 text-blue-300">Fields</div>
            <div className="text-[9px] px-2 py-0.5 rounded bg-white/8 text-white/40">Views</div>
          </div>
        </div>

        {/* Field list */}
        <div className="space-y-1.5">
          {[
            { name: "Full Name",   type: "Text",     color: "#60a5fa" },
            { name: "Status",      type: "Select",   color: "#34d399" },
            { name: "Department",  type: "Lookup",   color: "#a78bfa" },
            { name: "Joined Date", type: "Date",     color: "#f87171" },
            { name: "Score",       type: "Number",   color: "#fbbf24" },
            { name: "Notes",       type: "Textarea", color: "#94a3b8" },
          ].map(f => (
            <div key={f.name} className="flex items-center gap-2 px-2 py-1.5 rounded-lg"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.05)" }}>
              <div className="w-1.5 h-1.5 rounded-full" style={{ background: f.color }} />
              <span className="text-[10px] text-white/80 flex-1">{f.name}</span>
              <span className="text-[9px] px-1.5 py-0.5 rounded" style={{ background: "rgba(255,255,255,0.06)", color: f.color }}>{f.type}</span>
            </div>
          ))}
        </div>

        {/* Add field button */}
        <div className="mt-2 flex items-center justify-center gap-1 py-2 rounded-lg text-[10px] text-white/25" style={{ border: "1px dashed rgba(255,255,255,0.12)" }}>
          + Add field
        </div>
      </div>
    </div>
  );
}

// ── App data ──────────────────────────────────────────────────────────────────
const APPS = [
  { key: "CRM",        name: "CRM & Data",    icon: Database,     gradient: "from-blue-500 to-blue-600",     desc: "Custom modules, records, fields, and relationships.", required: true },
  { key: "WORKFLOWS",  name: "Workflows",      icon: Workflow,     gradient: "from-violet-500 to-violet-600", desc: "Automate processes with triggers, conditions, and actions." },
  { key: "FORMS",      name: "Forms",          icon: FileText,     gradient: "from-orange-500 to-amber-500",  desc: "Public forms with conditional logic and auto-record creation." },
  { key: "PORTAL",     name: "Portal",         icon: Globe,        gradient: "from-teal-500 to-cyan-500",     desc: "External portal for clients, students, or beneficiaries." },
  { key: "ANALYTICS",  name: "Analytics",      icon: BarChart3,    gradient: "from-emerald-500 to-green-500", desc: "Real-time dashboards, KPIs, and live data visualization." },
  { key: "REPORTS",    name: "Reports",        icon: FileBarChart2,gradient: "from-cyan-500 to-sky-500",      desc: "Custom reports with advanced filtering and scheduling." },
  { key: "BLUEPRINTS", name: "Blueprints",     icon: GitBranch,    gradient: "from-pink-500 to-rose-500",     desc: "Multi-stage processes with approvals, SLAs, and conditions." },
];

const STATS = [
  { icon: Users,    value: "50k+",  label: "Records managed",    color: "#3b82f6" },
  { icon: Zap,      value: "200+",  label: "Workflow automations", color: "#8b5cf6" },
  { icon: TrendingUp, value: "99%", label: "Uptime guarantee",   color: "#10b981" },
  { icon: Shield,   value: "256-bit", label: "Encrypted data",   color: "#f59e0b" },
];

// ── Page ──────────────────────────────────────────────────────────────────────
export default function LandingPage() {
  const router = useRouter();
  const [config, setConfig] = useState<LandingConfig>(DEFAULT_CONFIG);

  // Load admin config
  useEffect(() => {
    try {
      const stored = localStorage.getItem("cloudbox-landing-config");
      if (stored) setConfig({ ...DEFAULT_CONFIG, ...JSON.parse(stored) });
    } catch { /* ignore */ }
  }, []);

  // Redirect if already authenticated
  useEffect(() => {
    try {
      const token = localStorage.getItem("access_token");
      if (!token) return;
      const parts = token.split(".");
      if (parts.length !== 3) return;
      const payload = JSON.parse(atob(parts[1].replace(/-/g, "+").replace(/_/g, "/")));
      if (!payload.exp || payload.exp * 1000 > Date.now()) router.replace("/dashboard");
    } catch { /* ignore */ }
  }, []); // eslint-disable-line

  const heroLines = config.heroTitle.split("\n");

  return (
    <div className="min-h-screen text-white overflow-x-hidden" style={{ background: config.bgColor || "#060d1f" }}>

      {/* ── Ambient blobs ── */}
      <div className="fixed top-[-10%] left-[15%]  w-[700px] h-[700px] rounded-full bg-blue-600/6   blur-[140px] pointer-events-none" />
      <div className="fixed top-[40%]  right-[-5%] w-[500px] h-[500px] rounded-full bg-cyan-500/5   blur-[100px] pointer-events-none" />
      <div className="fixed bottom-[0]  left-[-5%] w-[500px] h-[500px] rounded-full bg-indigo-700/7 blur-[100px] pointer-events-none" />

      {/* ── Dot grid ── */}
      <div className="fixed inset-0 pointer-events-none" style={{
        backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.032) 1px, transparent 1px)",
        backgroundSize: "36px 36px",
      }} />

      {/* ── Nav ── */}
      <nav className="relative z-10 flex items-center justify-between px-6 md:px-14 py-5 border-b border-white/[0.05]">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 bg-brand rounded-xl flex items-center justify-center shadow-xl shadow-brand-dark/60">
            <LogoMark size={18} className="text-white" />
          </div>
          <span className="font-bold text-lg tracking-tight">{BRAND.name}</span>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/contact" className="hidden sm:inline-block text-sm text-white/50 hover:text-white px-4 py-2 rounded-lg hover:bg-white/5 transition-all">
            Contact us
          </Link>
          <Link href="/login" className="text-sm text-white/50 hover:text-white px-4 py-2 rounded-lg hover:bg-white/5 transition-all">
            Sign in
          </Link>
          <Link href="/register" className="text-sm font-semibold bg-brand hover:bg-gradient-to-r hover:from-brand-dark hover:to-brand text-white px-5 py-2.5 rounded-xl transition-all shadow-lg shadow-brand-dark/50 flex items-center gap-1.5">
            Get Started <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </nav>

      {/* ── HERO: Split layout ── */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 md:px-14 pt-20 pb-16">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">

          {/* Left: Text */}
          <div>
            <div
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border text-sm mb-8"
              style={{
                background: "rgba(59,130,246,0.08)",
                borderColor: "rgba(59,130,246,0.2)",
                color: "#93c5fd",
                opacity: 0,
                animation: "fadeSlideIn 0.7s ease 0.1s forwards",
              }}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
              {config.badgeText}
            </div>

            <h1
              className="text-[48px] sm:text-[56px] lg:text-[64px] font-extrabold tracking-tight leading-[1.08] mb-6"
              style={{ opacity: 0, animation: "fadeSlideIn 0.7s ease 0.2s forwards" }}
            >
              {heroLines.map((line, i) => (
                <span key={i} className="block">
                  {i === heroLines.length - 1 ? (
                    <span style={{
                      background: "linear-gradient(135deg, #60a5fa 0%, #38bdf8 50%, #34d399 100%)",
                      WebkitBackgroundClip: "text",
                      WebkitTextFillColor: "transparent",
                    }}>{line}</span>
                  ) : (
                    <span className="text-white">{line}</span>
                  )}
                </span>
              ))}
            </h1>

            <p
              className="text-lg text-white/45 mb-10 leading-relaxed max-w-xl"
              style={{ opacity: 0, animation: "fadeSlideIn 0.7s ease 0.35s forwards" }}
            >
              {config.heroSubtitle}
            </p>

            <div
              className="flex flex-col sm:flex-row gap-4"
              style={{ opacity: 0, animation: "fadeSlideIn 0.7s ease 0.5s forwards" }}
            >
              <Link href="/register" className="inline-flex items-center gap-2.5 bg-brand hover:bg-gradient-to-r hover:from-brand-dark hover:to-brand text-white font-bold px-8 py-4 rounded-xl text-base transition-all shadow-2xl shadow-brand-dark/60 hover:-translate-y-0.5">
                {config.heroCta1} <ArrowRight className="w-4 h-4" />
              </Link>
              <Link href="/login" className="inline-flex items-center gap-2 bg-white/[0.05] hover:bg-white/[0.09] border border-white/[0.08] hover:border-white/[0.14] text-white/70 hover:text-white font-semibold px-8 py-4 rounded-xl text-base transition-all">
                {config.heroCta2}
              </Link>
            </div>

            <p
              className="mt-7 text-sm text-white/20"
              style={{ opacity: 0, animation: "fadeSlideIn 0.7s ease 0.65s forwards" }}
            >
              No credit card required · Setup in under 2 minutes
            </p>
          </div>

          {/* Right: Dashboard mockup */}
          <div
            className="relative"
            style={{ opacity: 0, animation: "fadeSlideIn 0.9s ease 0.4s forwards" }}
          >
            {config.image1Url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={config.image1Url} alt="Platform preview" className="rounded-2xl shadow-2xl shadow-blue-900/30 w-full object-cover" />
            ) : (
              <div className="relative">
                {/* Floating glow */}
                <div className="absolute -inset-4 bg-blue-500/10 rounded-3xl blur-2xl" />
                <DashboardMockup />
                {/* Floating badge */}
                <div className="absolute -top-3 -right-3 bg-brand text-white text-xs font-bold px-3 py-1.5 rounded-xl shadow-lg animate-bounce">
                  Live Data
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ── Stats strip ── */}
      <Reveal className="relative z-10 max-w-7xl mx-auto px-6 md:px-14 pb-16">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {STATS.map(s => {
            const Icon = s.icon;
            return (
              <div key={s.label} className="flex items-center gap-3 px-5 py-4 rounded-2xl"
                style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: `${s.color}18` }}>
                  <Icon className="w-4 h-4" style={{ color: s.color }} />
                </div>
                <div>
                  <div className="font-extrabold text-white text-base leading-tight">{s.value}</div>
                  <div className="text-[11px] text-white/35">{s.label}</div>
                </div>
              </div>
            );
          })}
        </div>
      </Reveal>

      {/* ── Apps grid ── */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 md:px-14 pb-24">
        <Reveal className="text-center mb-14">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-3">{config.sectionTitle}</h2>
          <p className="text-white/35 text-lg">{config.sectionSubtitle}</p>
        </Reveal>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {APPS.map((app, i) => {
            const Icon = app.icon;
            return (
              <Reveal key={app.key} delay={i * 60}>
                <div className="group bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.07] hover:border-white/[0.13] rounded-2xl p-5 transition-all duration-200 h-full">
                  <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${app.gradient} flex items-center justify-center mb-4 shadow-lg`}>
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <h3 className="font-bold text-white text-sm">{app.name}</h3>
                    {app.required && (
                      <span className="text-[10px] px-1.5 py-0.5 bg-blue-500/15 text-blue-300 rounded-md font-semibold">Core</span>
                    )}
                  </div>
                  <p className="text-xs text-white/35 leading-relaxed">{app.desc}</p>
                </div>
              </Reveal>
            );
          })}
          {/* "More" tile */}
          <Reveal delay={APPS.length * 60}>
            <div className="bg-white/[0.02] border border-dashed border-white/[0.07] rounded-2xl p-5 flex flex-col justify-center h-full">
              <p className="text-white/25 text-sm font-semibold mb-1">More coming</p>
              <p className="text-xs text-white/15 leading-relaxed">Email campaigns, e-signatures, HR, and more on the roadmap.</p>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── Feature showcase: two images side by side ── */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 md:px-14 pb-28">
        <Reveal className="text-center mb-14">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-violet-500/10 border border-violet-500/20 text-violet-300 mb-5">
            Platform Preview
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-3">See it in action</h2>
          <p className="text-white/35 text-lg">Real-time data, powerful automation, zero complexity.</p>
        </Reveal>

        <div className="grid lg:grid-cols-2 gap-6 items-start">
          {/* Left feature card */}
          <Reveal delay={100}>
            <div className="rounded-3xl overflow-hidden border border-white/[0.07] p-1"
              style={{ background: "linear-gradient(135deg, rgba(59,130,246,0.08) 0%, rgba(139,92,246,0.06) 100%)" }}>
              <div className="rounded-2xl p-6 space-y-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-9 h-9 bg-blue-500/20 border border-blue-500/30 rounded-xl flex items-center justify-center">
                    <BarChart3 className="w-4 h-4 text-blue-400" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-sm">Live Analytics</h3>
                    <p className="text-xs text-white/35">Real-time dashboards</p>
                  </div>
                </div>
                {config.image1Url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={config.image1Url} alt="Analytics" className="rounded-xl w-full object-cover" style={{ maxHeight: 200 }} />
                ) : (
                  <DashboardMockup />
                )}
                <ul className="space-y-2">
                  {["KPI cards with live data", "Bar, line, pie & area charts", "Per-dashboard access control"].map(f => (
                    <li key={f} className="flex items-center gap-2 text-sm text-white/50">
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </Reveal>

          {/* Right feature card */}
          <Reveal delay={200}>
            <div className="rounded-3xl overflow-hidden border border-white/[0.07] p-1"
              style={{ background: "linear-gradient(135deg, rgba(139,92,246,0.08) 0%, rgba(236,72,153,0.06) 100%)" }}>
              <div className="rounded-2xl p-6 space-y-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-9 h-9 bg-violet-500/20 border border-violet-500/30 rounded-xl flex items-center justify-center">
                    <Database className="w-4 h-4 text-violet-400" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-sm">Module Studio</h3>
                    <p className="text-xs text-white/35">Build your data structure</p>
                  </div>
                </div>
                {config.image2Url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={config.image2Url} alt="Module Studio" className="rounded-xl w-full object-cover" style={{ maxHeight: 200 }} />
                ) : (
                  <WorkflowMockup />
                )}
                <ul className="space-y-2">
                  {["Custom fields (text, select, lookup, date)", "Relationships between modules", "Role-based record access"].map(f => (
                    <li key={f} className="flex items-center gap-2 text-sm text-white/50">
                      <div className="w-1.5 h-1.5 rounded-full bg-violet-400 shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── How it Works ── */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 md:px-14 pb-28">
        <Reveal className="text-center mb-14">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 mb-5">
            Simple by design
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-3">How it works</h2>
          <p className="text-white/35 text-lg max-w-xl mx-auto">
            From setup to automation in four steps. No developers or IT team required.
          </p>
        </Reveal>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5 mb-14">
          {[
            {
              step: "01",
              icon: Settings2,
              color: "#3b82f6",
              bg: "rgba(59,130,246,0.1)",
              border: "rgba(59,130,246,0.2)",
              title: "Build your modules",
              desc: "Create custom data modules for your organization — contacts, projects, cases, or anything your team tracks.",
            },
            {
              step: "02",
              icon: Layers,
              color: "#8b5cf6",
              bg: "rgba(139,92,246,0.1)",
              border: "rgba(139,92,246,0.2)",
              title: "Design your forms",
              desc: "Drag and drop a public form in minutes. Share a link — submissions land directly as records in your module.",
            },
            {
              step: "03",
              icon: Workflow,
              color: "#10b981",
              bg: "rgba(16,185,129,0.1)",
              border: "rgba(16,185,129,0.2)",
              title: "Automate the process",
              desc: "Set triggers to send emails, assign tasks, update fields, or run approvals — automatically on every record change.",
            },
            {
              step: "04",
              icon: BarChart3,
              color: "#f59e0b",
              bg: "rgba(245,158,11,0.1)",
              border: "rgba(245,158,11,0.2)",
              title: "Track with analytics",
              desc: "Build dashboards with KPI cards, charts, and pivot tables. Share views with your team in seconds.",
            },
          ].map((item, i) => {
            const Icon = item.icon;
            return (
              <Reveal key={item.step} delay={i * 80}>
                <div
                  className="relative rounded-2xl p-6 h-full flex flex-col"
                  style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}
                >
                  {/* Step number */}
                  <div className="text-[11px] font-black tracking-widest mb-4" style={{ color: item.color, opacity: 0.5 }}>
                    STEP {item.step}
                  </div>
                  {/* Icon */}
                  <div
                    className="w-11 h-11 rounded-xl flex items-center justify-center mb-4"
                    style={{ background: item.bg, border: `1px solid ${item.border}` }}
                  >
                    <Icon className="w-5 h-5" style={{ color: item.color }} />
                  </div>
                  <h3 className="font-bold text-white text-sm mb-2">{item.title}</h3>
                  <p className="text-xs text-white/35 leading-relaxed flex-1">{item.desc}</p>
                  {/* Connector line — hidden on last */}
                  {i < 3 && (
                    <div className="hidden lg:block absolute -right-[11px] top-1/2 -translate-y-1/2 z-10">
                      <div className="w-5 h-px bg-white/10" />
                      <div className="w-1.5 h-1.5 rounded-full bg-white/15 absolute right-0 top-1/2 -translate-y-1/2" />
                    </div>
                  )}
                </div>
              </Reveal>
            );
          })}
        </div>

        {/* Docs CTA */}
        <Reveal delay={320}>
          <div
            className="rounded-2xl px-8 py-6 flex flex-col sm:flex-row items-center justify-between gap-5"
            style={{ background: "rgba(59,130,246,0.07)", border: "1px solid rgba(59,130,246,0.18)" }}
          >
            <div className="flex items-center gap-4">
              <div className="w-11 h-11 rounded-xl bg-blue-500/15 border border-blue-500/25 flex items-center justify-center shrink-0">
                <BookOpen className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <p className="font-bold text-white text-sm">Want the full picture?</p>
                <p className="text-xs text-white/40 mt-0.5">
                  Our interactive manual covers every feature — modules, workflows, OCR, permissions, and the full API.
                </p>
              </div>
            </div>
            <a
              href="https://claude.ai/code/artifact/2ef3933b-27cf-4447-9bba-1c9632bce995"
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 inline-flex items-center gap-2 font-bold text-sm px-6 py-3 rounded-xl transition-all hover:-translate-y-0.5"
              style={{
                background: "var(--color-brand)",
                boxShadow: "0 0 0 1px color-mix(in srgb, var(--color-brand) 40%, transparent)",
                color: "#fff",
              }}
            >
              Read the docs <ArrowRight className="w-3.5 h-3.5" />
            </a>
          </div>
        </Reveal>
      </section>

      {/* ── Unique features: built from real gaps ── */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 md:px-14 pb-28">
        <Reveal className="text-center mb-14">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 mb-5">
            Built from real gaps
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-3">Features you won&apos;t find bolted on</h2>
          <p className="text-white/35 text-lg max-w-2xl mx-auto">
            Every one of these came from a problem we hit running our own operations — not a feature-request backlog.
          </p>
        </Reveal>

        <div className="grid md:grid-cols-3 gap-5">
          {[
            {
              icon: ShieldCheck,
              color: "#10b981",
              bg: "rgba(16,185,129,0.1)",
              border: "rgba(16,185,129,0.2)",
              title: "Self-checking data quality",
              desc: "The platform continuously scans your records for duplicates and redundancy and flags them for cleanup automatically — no more three copies of the same contact scattered across your CRM.",
            },
            {
              icon: ListChecks,
              color: "#3b82f6",
              bg: "rgba(59,130,246,0.1)",
              border: "rgba(59,130,246,0.2)",
              title: "Global list packages",
              desc: "Define a picklist — statuses, departments, categories — once, and reuse it everywhere. Update it in one place and every module that depends on it stays in sync.",
            },
            {
              icon: Table2,
              color: "#8b5cf6",
              bg: "rgba(139,92,246,0.1)",
              border: "rgba(139,92,246,0.2)",
              title: "Built-in pivoting",
              desc: "Slice any dataset into a live pivot table — rows, columns, and measures you choose — without exporting to a spreadsheet or waiting on a report request.",
            },
          ].map((f, i) => {
            const Icon = f.icon;
            return (
              <Reveal key={f.title} delay={i * 90}>
                <div className="rounded-2xl p-6 h-full" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-4" style={{ background: f.bg, border: `1px solid ${f.border}` }}>
                    <Icon className="w-5 h-5" style={{ color: f.color }} />
                  </div>
                  <h3 className="font-bold text-white text-base mb-2">{f.title}</h3>
                  <p className="text-sm text-white/40 leading-relaxed">{f.desc}</p>
                </div>
              </Reveal>
            );
          })}
        </div>
      </section>

      {/* ── CTA band ── */}
      <Reveal className="relative z-10 mx-6 md:mx-14 mb-20">
        <div
          className="rounded-3xl p-14 text-center border border-blue-500/20 overflow-hidden relative"
          style={{ background: "linear-gradient(135deg, rgba(37,99,235,0.22) 0%, rgba(6,182,212,0.10) 100%)" }}
        >
          <div className="absolute inset-0 pointer-events-none" style={{
            backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.022) 1px, transparent 1px)",
            backgroundSize: "28px 28px",
          }} />
          {/* Glow */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-24 bg-blue-500/20 rounded-full blur-3xl pointer-events-none" />

          <div className="relative">
            <h2 className="text-3xl md:text-4xl font-extrabold text-white mb-4">{config.ctaTitle}</h2>
            <p className="text-white/45 text-lg mb-9 max-w-xl mx-auto">{config.ctaSubtitle}</p>
            <Link href="/register" className="inline-flex items-center gap-2.5 bg-white text-blue-900 font-bold px-10 py-4 rounded-xl text-base transition-all hover:bg-blue-50 shadow-2xl hover:-translate-y-0.5">
              Create your organization <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </Reveal>

      {/* ── Footer ── */}
      <Footer />

      {/* ── Keyframes ── */}
      <style>{`
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
