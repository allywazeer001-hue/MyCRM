"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import {
  CheckCircle2, ArrowRight, Loader2, Sparkles,
  GraduationCap, Landmark, Shield, HeartPulse, Heart,
  Building, Scale, Home, Factory, Megaphone, Database, Layers,
  Package, Zap, ExternalLink,
} from "lucide-react";

// ── Auth check (no DashboardShell — manual token validation) ──────────────────
function hasValidToken(): boolean {
  try {
    const token = localStorage.getItem("access_token");
    if (!token) return false;
    const parts = token.split(".");
    if (parts.length !== 3) return false;
    const payload = JSON.parse(atob(parts[1].replace(/-/g, "+").replace(/_/g, "/")));
    if (payload.exp && payload.exp * 1000 < Date.now()) return false;
    return true;
  } catch {
    return false;
  }
}

// ── Industries ─────────────────────────────────────────────────────────────────
const INDUSTRIES = [
  { key: "education",     label: "Education",        icon: GraduationCap, color: "#6366f1", bg: "#eef2ff",
    tagline: "Students, courses, attendance, payments",     hasBlueprint: true  },
  { key: "banking",       label: "Banking",           icon: Landmark,      color: "#1d4ed8", bg: "#eff6ff",
    tagline: "Customers, accounts, loans, transactions",    hasBlueprint: true  },
  { key: "insurance",     label: "Insurance",         icon: Shield,        color: "#059669", bg: "#ecfdf5",
    tagline: "Policyholders, claims, premium tracking",     hasBlueprint: true  },
  { key: "hospital",      label: "Healthcare",        icon: HeartPulse,    color: "#ef4444", bg: "#fef2f2",
    tagline: "Patients, doctors, appointments, billing",    hasBlueprint: true  },
  { key: "ngo",           label: "NGO / Non-Profit",  icon: Heart,         color: "#ec4899", bg: "#fdf2f8",
    tagline: "Beneficiaries, donors, grants, programs",     hasBlueprint: true  },
  { key: "government",    label: "Government",        icon: Building,      color: "#64748b", bg: "#f8fafc",
    tagline: "Citizens, departments, public services",      hasBlueprint: false },
  { key: "legal",         label: "Legal",             icon: Scale,         color: "#7c3aed", bg: "#f5f3ff",
    tagline: "Cases, clients, contracts, billing",          hasBlueprint: false },
  { key: "real-estate",   label: "Real Estate",       icon: Home,          color: "#ea580c", bg: "#fff7ed",
    tagline: "Properties, tenants, deals, maintenance",     hasBlueprint: false },
  { key: "manufacturing", label: "Manufacturing",     icon: Factory,       color: "#0891b2", bg: "#ecfeff",
    tagline: "Production, inventory, quality, supply chain",hasBlueprint: false },
  { key: "media",         label: "Media & Marketing", icon: Megaphone,     color: "#db2777", bg: "#fdf4ff",
    tagline: "Campaigns, clients, assets, analytics",       hasBlueprint: false },
  { key: "hr",            label: "Human Resources",   icon: Package,       color: "#0ea5e9", bg: "#f0f9ff",
    tagline: "Employees, recruitment, payroll, training",   hasBlueprint: false },
  { key: "generic",       label: "Generic CRM",       icon: Database,      color: "#334155", bg: "#f8fafc",
    tagline: "Start clean, customize everything",           hasBlueprint: false },
];

function buildSteps(industryLabel: string) {
  return [
    { label: "Initializing workspace",                ms: 400 },
    { label: "Creating departments",                  ms: 500 },
    { label: "Building module structure",             ms: 600 },
    { label: `Installing ${industryLabel} modules`,   ms: 800 },
    { label: "Configuring fields & options",          ms: 900 },
    { label: "Setting up workflows",                  ms: 600 },
    { label: "Applying default permissions",          ms: 500 },
    { label: "Finalizing configuration",              ms: 700 },
  ];
}

interface Preview {
  moduleCount: number; fieldCount: number;
  workflowCount: number; departmentCount: number;
  modules: { name: string }[];
}

function delay(ms: number) {
  return new Promise(r => setTimeout(r, ms));
}

// ── Page ───────────────────────────────────────────────────────────────────────
export default function OnboardingPage() {
  const router = useRouter();

  // Auth guard — redirect to login if no valid token
  useEffect(() => {
    if (!hasValidToken()) {
      router.replace("/login");
      return;
    }
    // Redirect if already set up
    api.get("/industry-setup/status").then(r => {
      if (r.data?.setupCompleted) router.replace("/workspace");
    }).catch(() => {});
  }, []);

  const [industry,    setIndustry]    = useState<typeof INDUSTRIES[0] | null>(null);
  const [mode,        setMode]        = useState<"blueprint" | "scratch" | null>(null);
  const [preview,     setPreview]     = useState<Preview | null>(null);
  const [loadPreview, setLoadPreview] = useState(false);
  const [phase, setPhase] = useState<"configure" | "installing" | "done">("configure");

  const [logItems,  setLogItems]  = useState<{ label: string; ms: number }[]>([]);
  const [logDone,   setLogDone]   = useState(-1);
  const [apiResult, setApiResult] = useState<any>(null);
  const [apiError,  setApiError]  = useState("");
  const installing = useRef(false);

  // Stagger animation
  const [ready, setReady] = useState(false);
  useEffect(() => { const t = setTimeout(() => setReady(true), 60); return () => clearTimeout(t); }, []);

  // Fetch blueprint preview
  useEffect(() => {
    if (!industry || !industry.hasBlueprint || mode !== "blueprint") {
      setPreview(null);
      return;
    }
    setLoadPreview(true);
    api.get(`/industry-setup/blueprints/${industry.key}`)
      .then(r => setPreview(r.data))
      .catch(() => setPreview(null))
      .finally(() => setLoadPreview(false));
  }, [industry, mode]);

  // Force mode to scratch if industry has no blueprint
  useEffect(() => {
    if (industry && !industry.hasBlueprint && mode === "blueprint") setMode("scratch");
  }, [industry]);

  async function runInstall() {
    if (installing.current || !industry || !mode) return;
    installing.current = true;
    setPhase("installing");
    setLogDone(-1);
    setApiError("");

    const steps = buildSteps(industry.label);
    setLogItems(steps);

    let installError = "";
    let installResult: any = null;

    const apiPromise = api.post("/industry-setup/install", {
      industryKey: industry.key,
      mode,
    }).then(r => { installResult = r.data; })
      .catch(e => { installError = e?.response?.data?.message || "Installation failed. Please try again."; });

    for (let i = 0; i < steps.length; i++) {
      await delay(steps[i].ms);
      setLogDone(i);
    }

    await apiPromise;

    if (installError) {
      setApiError(installError);
      installing.current = false;
      return; // Do NOT advance to done — show error in log, let user retry
    }

    setApiResult(installResult);
    await delay(400);
    setPhase("done");
  }

  const progressPct = logItems.length === 0 ? 0
    : Math.round(((logDone + 1) / logItems.length) * 100);

  const canInstall = !!industry && !!mode;
  const accent = industry?.color ?? "#3b82f6";

  // ── Configure phase ───────────────────────────────────────────────────────────
  if (phase === "configure") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30 flex flex-col">

        {/* Topbar */}
        <div className="border-b border-gray-200 bg-white/80 backdrop-blur-sm px-6 py-3.5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center">
              <Layers className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-gray-900">Workspace Setup</span>
          </div>
          <button onClick={() => router.push("/workspace")}
            className="text-sm text-gray-400 hover:text-gray-600 transition-colors">
            Skip setup →
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-10">
          <div className="max-w-5xl mx-auto space-y-10">

            {/* Header */}
            <div className="text-center">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 border border-blue-100 text-xs font-semibold text-blue-600 mb-4">
                <Sparkles className="w-3.5 h-3.5" /> Industry Blueprint Engine
              </div>
              <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight">
                Configure your workspace
              </h1>
              <p className="text-gray-400 mt-3 text-base max-w-xl mx-auto">
                Choose your industry and setup method — we'll build the right modules, fields, and workflows from day one.
              </p>
            </div>

            {/* ── SECTION 1: Industry ── */}
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold shrink-0">1</div>
                <div>
                  <p className="text-sm font-bold text-gray-900">Select your industry</p>
                  <p className="text-xs text-gray-400">Choose the sector that best describes your organization</p>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {INDUSTRIES.map((ind, idx) => {
                  const Icon = ind.icon;
                  const sel = industry?.key === ind.key;
                  return (
                    <button
                      key={ind.key}
                      type="button"
                      onClick={() => setIndustry(ind)}
                      className={cn(
                        "relative group flex flex-col items-start gap-2.5 p-4 rounded-2xl border-2 text-left",
                        !sel && "bg-white hover:shadow-md",
                      )}
                      style={{
                        borderColor:     sel ? ind.color : "#e5e7eb",
                        backgroundColor: sel ? ind.bg : undefined,
                        boxShadow:       sel ? `0 4px 20px -4px ${ind.color}30` : undefined,
                        opacity:         ready ? 1 : 0,
                        transform:       ready ? "translateY(0)" : "translateY(12px)",
                        transition: [
                          `opacity 0.38s cubic-bezier(0.34,1.56,0.64,1) ${idx * 38}ms`,
                          `transform 0.38s cubic-bezier(0.34,1.56,0.64,1) ${idx * 38}ms`,
                          "border-color 0.15s", "box-shadow 0.15s",
                        ].join(", "),
                      }}
                    >
                      <div className={cn(
                        "absolute top-2.5 right-2.5 rounded-full flex items-center justify-center transition-all duration-200",
                        sel ? "opacity-100 scale-100" : "opacity-0 scale-50",
                      )} style={{ backgroundColor: ind.color, width: 18, height: 18 }}>
                        <CheckCircle2 className="w-3 h-3 text-white" />
                      </div>

                      <div className="w-9 h-9 rounded-xl flex items-center justify-center transition-transform duration-200 group-hover:scale-105"
                        style={{ backgroundColor: sel ? ind.color : ind.bg }}>
                        <Icon style={{ width: 18, height: 18, color: sel ? "#fff" : ind.color }} />
                      </div>

                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <p className="text-xs font-bold text-gray-900 leading-tight">{ind.label}</p>
                          {ind.hasBlueprint && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded-full font-bold"
                              style={{ backgroundColor: ind.bg, color: ind.color, border: `1px solid ${ind.color}40` }}>
                              Blueprint
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-gray-400 mt-0.5 leading-tight">{ind.tagline}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* ── SECTION 2: Setup mode ── */}
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className={cn(
                  "w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-colors duration-300",
                  industry ? "bg-brand text-white" : "bg-gray-200 text-gray-400"
                )}>2</div>
                <div>
                  <p className={cn("text-sm font-bold transition-colors duration-300", industry ? "text-gray-900" : "text-gray-400")}>
                    Choose setup method
                  </p>
                  <p className="text-xs text-gray-400">
                    {industry ? "How would you like to configure your workspace?" : "Select an industry above first"}
                  </p>
                </div>
              </div>

              <div className={cn(
                "grid grid-cols-1 sm:grid-cols-2 gap-4 transition-all duration-300",
                !industry && "opacity-40 pointer-events-none"
              )}>
                {/* Blueprint option */}
                <button
                  type="button"
                  onClick={() => industry?.hasBlueprint && setMode("blueprint")}
                  disabled={!industry?.hasBlueprint}
                  className={cn(
                    "relative flex flex-col items-start p-6 rounded-2xl border-2 text-left transition-all duration-200",
                    mode === "blueprint"
                      ? "border-brand bg-brand/5 shadow-md shadow-blue-100"
                      : industry?.hasBlueprint
                        ? "border-gray-200 bg-white hover:border-brand/50 hover:shadow-sm"
                        : "border-gray-200 bg-gray-50 opacity-50 cursor-not-allowed",
                  )}
                >
                  {mode === "blueprint" && (
                    <div className="absolute top-4 right-4 w-5 h-5 bg-brand rounded-full flex items-center justify-center">
                      <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                    </div>
                  )}

                  <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center mb-4 shadow-md shadow-blue-200">
                    <Sparkles className="w-5 h-5 text-white" />
                  </div>

                  <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                    <p className="text-sm font-bold text-gray-900">Use Industry Blueprint</p>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-600 font-bold">Recommended</span>
                  </div>

                  <p className="text-xs text-gray-500 leading-relaxed mb-4">
                    {industry?.hasBlueprint
                      ? `Auto-creates modules, fields, workflows, and departments designed for ${industry.label} operations.`
                      : "Not available for this industry yet. More blueprints coming soon."}
                  </p>

                  <ul className="space-y-1.5 text-xs text-gray-500 w-full">
                    {["Industry-specific modules & fields", "Pre-built workflows & automation", "Departments & permission roles", "Ready to use in minutes"].map(t => (
                      <li key={t} className="flex items-center gap-2">
                        <CheckCircle2 className="w-3 h-3 text-blue-400 shrink-0" /> {t}
                      </li>
                    ))}
                  </ul>

                  {/* Blueprint preview */}
                  {mode === "blueprint" && industry?.hasBlueprint && (
                    <div className="mt-4 pt-4 border-t border-blue-200 w-full">
                      {loadPreview ? (
                        <div className="flex items-center gap-2 text-xs text-blue-600">
                          <Loader2 className="w-3 h-3 animate-spin" /> Loading blueprint…
                        </div>
                      ) : preview ? (
                        <div>
                          <div className="grid grid-cols-4 gap-1.5 mb-2">
                            {[
                              { label: "Modules",     v: preview.moduleCount     },
                              { label: "Fields",      v: preview.fieldCount      },
                              { label: "Workflows",   v: preview.workflowCount   },
                              { label: "Departments", v: preview.departmentCount },
                            ].map(s => (
                              <div key={s.label} className="text-center bg-white rounded-lg p-1.5 border border-blue-100">
                                <p className="text-sm font-extrabold text-blue-600">{s.v}</p>
                                <p className="text-[9px] text-gray-400">{s.label}</p>
                              </div>
                            ))}
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {preview.modules.map((m: any) => (
                              <span key={m.name} className="text-[10px] px-2 py-0.5 rounded-full text-white font-medium"
                                style={{ backgroundColor: industry.color }}>{m.name}</span>
                            ))}
                          </div>
                        </div>
                      ) : null}
                    </div>
                  )}
                </button>

                {/* Scratch option */}
                <button
                  type="button"
                  onClick={() => setMode("scratch")}
                  className={cn(
                    "relative flex flex-col items-start p-6 rounded-2xl border-2 text-left transition-all duration-200",
                    mode === "scratch"
                      ? "border-slate-600 bg-slate-50 shadow-md shadow-slate-100"
                      : "border-gray-200 bg-white hover:border-slate-300 hover:shadow-sm",
                  )}
                >
                  {mode === "scratch" && (
                    <div className="absolute top-4 right-4 w-5 h-5 bg-slate-700 rounded-full flex items-center justify-center">
                      <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                    </div>
                  )}

                  <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-slate-600 to-slate-800 flex items-center justify-center mb-4 shadow-md shadow-slate-200">
                    <Zap className="w-5 h-5 text-white" />
                  </div>

                  <p className="text-sm font-bold text-gray-900 mb-1.5">Start From Scratch</p>
                  <p className="text-xs text-gray-500 leading-relaxed mb-4">
                    Get a completely empty workspace. Design every module, field, relationship, and workflow yourself.
                  </p>

                  <ul className="space-y-1.5 text-xs text-gray-500 w-full">
                    {["Empty workspace", "Full customization control", "Build your own modules & relations", "No pre-built structure"].map(t => (
                      <li key={t} className="flex items-center gap-2">
                        <CheckCircle2 className="w-3 h-3 text-slate-400 shrink-0" /> {t}
                      </li>
                    ))}
                  </ul>
                </button>
              </div>
            </div>

            {/* ── CTA ── */}
            <div className="flex items-center justify-between pb-6">
              <div className="text-xs text-gray-400">
                {industry && mode ? (
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                    Ready: <strong className="text-gray-600">{industry.label}</strong> · <strong className="text-gray-600">{mode === "blueprint" ? "Blueprint" : "From Scratch"}</strong>
                  </span>
                ) : "Select industry and setup method to continue"}
              </div>

              <button
                onClick={runInstall}
                disabled={!canInstall}
                className="flex items-center gap-2 px-8 py-3 rounded-xl text-sm font-bold text-white transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-40 disabled:pointer-events-none"
                style={{
                  background: canInstall
                    ? mode === "blueprint"
                      ? `linear-gradient(135deg,#3b82f6,#2563eb)`
                      : `linear-gradient(135deg,#475569,#1e293b)`
                    : "#94a3b8",
                  boxShadow: canInstall ? "0 4px 18px -2px rgba(37,99,235,0.35)" : "none",
                }}
              >
                {mode === "blueprint" ? "Install Blueprint" : mode === "scratch" ? "Create Workspace" : "Continue"}
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Installing phase ─────────────────────────────────────────────────────────
  if (phase === "installing" && industry) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30 flex items-center justify-center p-6">
        <div className="w-full max-w-md">

          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg"
              style={{ background: `linear-gradient(135deg,${accent}cc,${accent})` }}>
              {(() => { const Icon = industry.icon; return <Icon className="w-8 h-8 text-white" />; })()}
            </div>
            <h2 className="text-2xl font-extrabold text-gray-900">
              {mode === "blueprint" ? `Installing ${industry.label} Blueprint` : "Creating Your Workspace"}
            </h2>
            <p className="text-gray-400 mt-1.5 text-sm">Please wait while we configure your platform…</p>
          </div>

          {/* Progress bar */}
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden mb-1.5">
            <div className="h-full rounded-full transition-all duration-700"
              style={{ width: `${progressPct}%`, background: `linear-gradient(to right,${accent}80,${accent})` }} />
          </div>
          <div className="flex justify-between text-xs text-gray-400 mb-6">
            <span>Installing</span>
            <span className="font-semibold" style={{ color: accent }}>{progressPct}%</span>
          </div>

          {/* Log */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-4 py-2.5 border-b border-gray-100 bg-gray-50 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Installation Log</span>
            </div>
            <div className="p-4 space-y-2.5">
              {logItems.map((item, i) => {
                const done    = i <= logDone;
                const current = i === logDone + 1;
                return (
                  <div key={i} className="flex items-center gap-3 text-sm"
                    style={{
                      opacity:   done || current ? 1 : 0.3,
                      transform: done || current ? "translateX(0)" : "translateX(-6px)",
                      transition: `opacity 0.3s ease ${i*25}ms, transform 0.3s ease ${i*25}ms`,
                    }}>
                    {done
                      ? <CheckCircle2 className="w-4 h-4 shrink-0" style={{ color: accent }} />
                      : current
                        ? <Loader2 className="w-4 h-4 shrink-0 animate-spin text-gray-400" />
                        : <div className="w-4 h-4 rounded-full border-2 border-gray-200 shrink-0" />}
                    <span className={cn("transition-colors duration-300",
                      done ? "text-gray-800 font-medium" : current ? "text-gray-600" : "text-gray-400")}>
                      {item.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {apiError && (
            <div className="mt-4 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600 flex items-start gap-2">
              <span className="shrink-0 mt-0.5">⚠</span>
              <div>
                <p className="font-medium">Installation failed</p>
                <p className="text-red-500 mt-0.5">{apiError}</p>
                <button
                  onClick={() => {
                    installing.current = false;
                    setApiError("");
                    setPhase("configure");
                    setLogDone(-1);
                    setLogItems([]);
                  }}
                  className="mt-2 text-xs underline text-red-600 hover:text-red-800"
                >
                  Go back and try again
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Done phase ───────────────────────────────────────────────────────────────
  if (phase === "done" && industry) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30 flex items-center justify-center p-6">
        <div className="w-full max-w-lg text-center">

          <div className="relative inline-flex mb-6">
            <div className="w-20 h-20 rounded-2xl flex items-center justify-center shadow-xl"
              style={{ background: `linear-gradient(135deg,${accent}cc,${accent})` }}>
              {(() => { const Icon = industry.icon; return <Icon className="w-10 h-10 text-white" />; })()}
            </div>
            <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-green-500 rounded-full flex items-center justify-center shadow-md">
              <CheckCircle2 className="w-5 h-5 text-white" />
            </div>
          </div>

          <h2 className="text-3xl font-extrabold text-gray-900 mb-2">
            {mode === "blueprint" ? "Blueprint Installed!" : "Workspace Ready!"}
          </h2>
          <p className="text-gray-400 text-base mb-8">
            {mode === "blueprint"
              ? `Your ${industry.label} workspace is fully configured and ready to use.`
              : "Your clean workspace is ready. Start building your modules and workflows."}
          </p>

          {apiResult?.created && mode === "blueprint" && (
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 mb-8 text-left">
              <p className="text-sm font-bold text-gray-800 mb-3">What was created:</p>
              <div className="grid grid-cols-2 gap-2.5 mb-4">
                {[
                  { label: "Modules",     value: apiResult.created.modules?.length ?? 0     },
                  { label: "Workflows",   value: apiResult.created.workflows?.length ?? 0   },
                  { label: "Departments", value: apiResult.created.departments?.length ?? 0 },
                  { label: "Fields",      value: apiResult.created.fields ?? 0              },
                ].map(s => (
                  <div key={s.label} className="flex items-center gap-2 p-3 bg-gray-50 rounded-xl">
                    <div>
                      <p className="text-xl font-extrabold text-gray-900 leading-none">{s.value}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
                    </div>
                  </div>
                ))}
              </div>
              {apiResult.created.modules?.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {apiResult.created.modules.map((m: string) => (
                    <span key={m} className="text-xs px-2.5 py-1 rounded-full font-semibold text-white"
                      style={{ backgroundColor: accent }}>{m}</span>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={() => router.push("/workspace")}
              className="flex items-center justify-center gap-2 px-8 py-3 rounded-xl text-sm font-bold text-white transition-all hover:scale-[1.02]"
              style={{ background: `linear-gradient(135deg,${accent}cc,${accent})`, boxShadow: `0 4px 18px -2px ${accent}50` }}
            >
              Go to Workspace <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => router.push("/studio")}
              className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-all"
            >
              <ExternalLink className="w-4 h-4" /> View Modules
            </button>
          </div>

          <p className="text-xs text-gray-400 mt-6">
            All modules and workflows are fully customizable from Module Studio.
          </p>
        </div>
      </div>
    );
  }

  return null;
}
