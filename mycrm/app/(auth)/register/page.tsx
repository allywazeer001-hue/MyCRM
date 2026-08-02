"use client";
import { useState, useEffect, useCallback, useRef, CSSProperties } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Building2, User, Package, ArrowRight, ArrowLeft,
  CheckCircle2, Loader2, Eye, EyeOff, AlertCircle,
  Database, Workflow, FileText, Globe, BarChart3, FileBarChart2, GitBranch,
  Hash, MapPin, Mail, Upload, ImageIcon, X,
  GraduationCap, Activity, Heart, Landmark, Code2, ShoppingBag,
  Building, Scale, Home, Factory, Megaphone, Sparkles, Link2,
  AtSign, Zap, Shield,
} from "lucide-react";
import { useAuthStore } from "@/store/auth.store";
import { api } from "@/lib/api";
import { slugify, cn } from "@/lib/utils";
import { BRAND } from "@/lib/core-brand";
import { DomainEmailInput } from "@/components/ui/domain-email-input";

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

// ── Steps metadata ─────────────────────────────────────────────────────────────
const STEPS = [
  { num: 1, label: "Organization", icon: Building2, hint: "Name, code & contact details", accent: "#2563eb" },
  { num: 2, label: "Focus",        icon: Sparkles,  hint: "Industry & setup method",      accent: "#7c3aed" },
  { num: 3, label: "Brand",        icon: ImageIcon, hint: "Logo, website & domain",       accent: "#db2779" },
  { num: 4, label: "Your Account", icon: User,      hint: "Admin login credentials",      accent: "#059669" },
  { num: 5, label: "Choose Apps",  icon: Package,   hint: "Activate platform modules",    accent: "#d97706" },
];

// ── Industries ─────────────────────────────────────────────────────────────────
// Keys MUST match backend blueprint keys exactly
const INDUSTRIES = [
  { key: "education",     label: "Education",         icon: GraduationCap, color: "#6366f1", bg: "#eef2ff", desc: "Schools, universities & training",   hasBlueprint: true  },
  { key: "hospital",      label: "Healthcare",         icon: Activity,      color: "#ef4444", bg: "#fef2f2", desc: "Hospitals, clinics & health",         hasBlueprint: true  },
  { key: "ngo",           label: "NGO / Non-profit",  icon: Heart,         color: "#ec4899", bg: "#fdf2f8", desc: "Charities & social impact",           hasBlueprint: true  },
  { key: "banking",       label: "Finance & Banking", icon: Landmark,      color: "#f59e0b", bg: "#fffbeb", desc: "Banking, insurance & investments",    hasBlueprint: true  },
  { key: "insurance",     label: "Insurance",          icon: Shield,        color: "#059669", bg: "#ecfdf5", desc: "Policyholders, claims & premiums",    hasBlueprint: true  },
  { key: "technology",    label: "Technology",         icon: Code2,         color: "#0ea5e9", bg: "#f0f9ff", desc: "Software, IT & digital services",    hasBlueprint: false },
  { key: "retail",        label: "Retail & Commerce", icon: ShoppingBag,   color: "#10b981", bg: "#ecfdf5", desc: "Products & e-commerce",               hasBlueprint: false },
  { key: "government",    label: "Government",         icon: Building,      color: "#64748b", bg: "#f8fafc", desc: "Public sector & agencies",           hasBlueprint: false },
  { key: "legal",         label: "Legal",              icon: Scale,         color: "#7c3aed", bg: "#f5f3ff", desc: "Law firms & compliance",              hasBlueprint: false },
  { key: "real-estate",   label: "Real Estate",        icon: Home,          color: "#ea580c", bg: "#fff7ed", desc: "Property & construction",            hasBlueprint: false },
  { key: "manufacturing", label: "Manufacturing",      icon: Factory,       color: "#0891b2", bg: "#ecfeff", desc: "Production & supply chain",          hasBlueprint: false },
  { key: "media",         label: "Media & Marketing",  icon: Megaphone,     color: "#db2779", bg: "#fdf4ff", desc: "Agencies & communications",          hasBlueprint: false },
  { key: "other",         label: "Other",              icon: Sparkles,      color: "#84cc16", bg: "#f7fee7", desc: "Something unique",                   hasBlueprint: false },
];

// ── Packages ──────────────────────────────────────────────────────────────────
const PACKAGES = [
  { key: "CRM",        name: "CRM & Data",   icon: Database,      gradient: "from-blue-500 to-blue-600",    border: "border-blue-500/40",   bg: "bg-blue-500/10",    desc: "Custom modules, records, fields, and relationships.", required: true },
  { key: "WORKFLOWS",  name: "Workflows",     icon: Workflow,      gradient: "from-violet-500 to-violet-600",border: "border-violet-500/40", bg: "bg-violet-500/10",  desc: "Automate processes with triggers and actions.",       required: true },
  { key: "FORMS",      name: "Forms",         icon: FileText,      gradient: "from-orange-500 to-amber-500", border: "border-orange-500/40", bg: "bg-orange-500/10",  desc: "Public-facing forms with conditional logic."                         },
  { key: "PORTAL",     name: "Portal",        icon: Globe,         gradient: "from-teal-500 to-cyan-500",    border: "border-teal-500/40",   bg: "bg-teal-500/10",    desc: "External portal for clients or beneficiaries."                        },
  { key: "ANALYTICS",  name: "Analytics",     icon: BarChart3,     gradient: "from-emerald-500 to-green-500",border: "border-emerald-500/40",bg: "bg-emerald-500/10", desc: "Real-time dashboards, KPIs, and charts.",             required: true },
  { key: "REPORTS",    name: "Reports",       icon: FileBarChart2, gradient: "from-cyan-500 to-sky-500",     border: "border-cyan-500/40",   bg: "bg-cyan-500/10",    desc: "Custom reports with advanced filtering."                              },
  { key: "BLUEPRINTS", name: "Blueprints",    icon: GitBranch,     gradient: "from-pink-500 to-rose-500",    border: "border-pink-500/40",   bg: "bg-pink-500/10",    desc: "Multi-stage business process management.",            required: true },
];

// ── Field wrapper ─────────────────────────────────────────────────────────────
function Field({ label, error, hint, children }: { label: string; error?: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-semibold text-gray-800">{label}</label>
      {children}
      {hint && !error && <p className="text-xs text-gray-400 mt-1">{hint}</p>}
      {error && (
        <p className="text-xs text-red-500 flex items-center gap-1 mt-1">
          <AlertCircle className="w-3 h-3 shrink-0" />{error}
        </p>
      )}
    </div>
  );
}

// ── Text input ────────────────────────────────────────────────────────────────
function TextInput({ error, prefix: pre, suffix: suf, ...props }:
  Omit<React.InputHTMLAttributes<HTMLInputElement>, "prefix"> & { error?: string; prefix?: React.ReactNode; suffix?: React.ReactNode }) {
  return (
    <div className="relative">
      {pre && <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">{pre}</div>}
      <input
        {...props}
        className={cn(
          "w-full h-11 rounded-xl border text-sm bg-white placeholder:text-gray-300 outline-none transition-all duration-150",
          "focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:shadow-sm",
          pre ? "pl-10" : "px-4",
          suf ? "pr-10" : "pr-4",
          error ? "border-red-300 bg-red-50/30" : "border-gray-200 hover:border-gray-300",
          props.className,
        )}
      />
      {suf && <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400">{suf}</div>}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function RegisterPage() {
  const router      = useRouter();
  const { register: registerUser } = useAuthStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // No auto-redirect: allow users to register a new organization even if already logged in.
  // Registering creates a brand-new org and replaces the current session.

  // ── Core step state ────────────────────────────────────────────────────────
  const [step, setStep] = useState(1);
  const [anim, setAnim] = useState<{ phase: "idle" | "exit" | "enter"; dir: 1 | -1 }>({ phase: "idle", dir: 1 });

  const navigateStep = useCallback((next: number) => {
    if (anim.phase !== "idle") return;
    const dir: 1 | -1 = next > step ? 1 : -1;
    setErrors({});
    setGlobalError("");
    setAnim({ phase: "exit", dir });
    setTimeout(() => {
      setStep(next);
      setAnim({ phase: "enter", dir });
      requestAnimationFrame(() => requestAnimationFrame(() => setAnim({ phase: "idle", dir })));
    }, 230);
  }, [anim.phase, step]);

  const contentStyle: CSSProperties = (() => {
    if (anim.phase === "exit") return {
      opacity: 0,
      transform: `translateX(${anim.dir * -60}px) translateY(-3px)`,
      transition: "opacity 0.22s ease, transform 0.24s cubic-bezier(0.4,0,0.6,1)",
      pointerEvents: "none",
    };
    if (anim.phase === "enter") return {
      opacity: 0,
      transform: `translateX(${anim.dir * 60}px) translateY(3px)`,
      transition: "none",
      pointerEvents: "none",
    };
    return {
      opacity: 1,
      transform: "translateX(0) translateY(0)",
      transition: "opacity 0.38s ease, transform 0.48s cubic-bezier(0.22,1,0.36,1)",
    };
  })();

  // ── Form state — Step 1 ────────────────────────────────────────────────────
  const [orgName,    setOrgName]    = useState("");
  const [orgCode,    setOrgCode]    = useState("");
  const [orgAddress, setOrgAddress] = useState("");
  const [orgEmail,   setOrgEmail]   = useState("");

  // ── Form state — Step 2 ────────────────────────────────────────────────────
  const [orgIndustries, setOrgIndustries] = useState<string[]>([]);
  const [setupMode,     setSetupMode]     = useState<"blueprint" | "scratch" | null>(null);
  const [focusReady,    setFocusReady]    = useState(false);

  // Primary selected industry (first one chosen)
  const primaryIndustry = INDUSTRIES.find(i => orgIndustries.includes(i.key));
  const anyHasBlueprint = orgIndustries.some(k => INDUSTRIES.find(i => i.key === k)?.hasBlueprint);

  useEffect(() => {
    if (step === 2) {
      setFocusReady(false);
      const t = setTimeout(() => setFocusReady(true), 320);
      return () => clearTimeout(t);
    }
  }, [step]);

  // If selected industry changes and mode is blueprint but no blueprint available, reset
  useEffect(() => {
    if (setupMode === "blueprint" && !anyHasBlueprint) setSetupMode(null);
  }, [orgIndustries]);

  // ── Form state — Step 3 ────────────────────────────────────────────────────
  const [orgDomain,    setOrgDomain]    = useState("");
  const [orgLogo,      setOrgLogo]      = useState("");
  const [orgWebsite,   setOrgWebsite]   = useState("");
  const [logoMode,     setLogoMode]     = useState<"upload" | "url">("upload");
  const [logoDragging, setLogoDragging] = useState(false);
  const [logoError,    setLogoError]    = useState("");

  // ── Form state — Step 4 ────────────────────────────────────────────────────
  const [firstName, setFirstName] = useState("");
  const [lastName,  setLastName]  = useState("");
  const [email,     setEmail]     = useState("");
  const [password,  setPassword]  = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [showPw,    setShowPw]    = useState(false);
  const [showCPw,   setShowCPw]   = useState(false);

  // ── Form state — Step 5 ────────────────────────────────────────────────────
  const [packages, setPackages] = useState<string[]>(["CRM", "ANALYTICS", "WORKFLOWS", "BLUEPRINTS"]);

  // ── Shared state ───────────────────────────────────────────────────────────
  const [errors,        setErrors]        = useState<Record<string, string>>({});
  const [globalError,   setGlobalError]   = useState("");
  const [submitting,    setSubmitting]    = useState(false);
  const [emailChecking, setEmailChecking] = useState(false);
  const [installing,    setInstalling]    = useState(false);
  const [installStep,   setInstallStep]   = useState("");

  const slug = slugify(orgName);

  // ── File handling ──────────────────────────────────────────────────────────
  const handleFile = (file: File) => {
    setLogoError("");
    if (!file.type.startsWith("image/")) { setLogoError("Please select an image file."); return; }
    if (file.size > 3 * 1024 * 1024) { setLogoError("Image must be under 3 MB."); return; }
    const reader = new FileReader();
    reader.onload = e => setOrgLogo(e.target?.result as string);
    reader.readAsDataURL(file);
  };

  // ── Validation ─────────────────────────────────────────────────────────────
  const validateStep1 = () => {
    const e: Record<string, string> = {};
    if (!orgName.trim() || orgName.trim().length < 2) e.orgName = "At least 2 characters required";
    setErrors(e);
    return !Object.keys(e).length;
  };

  const validateStep4 = async () => {
    const e: Record<string, string> = {};
    if (!firstName.trim()) e.firstName = "Required";
    if (!lastName.trim())  e.lastName  = "Required";
    if (!/^[^@]+@[^@]+\.[^@]+$/.test(email)) e.email = "Enter a valid email address";
    if (password.length < 8) e.password = "At least 8 characters";
    if (password !== confirmPw) e.confirmPw = "Passwords do not match";
    if (!e.email) {
      try {
        setEmailChecking(true);
        const { data } = await api.post("/auth/check-email", { email });
        if (data.exists) e.email = `Already registered${data.organizationName ? ` under ${data.organizationName}` : ""}. Sign in instead.`;
      } catch { /* ignore */ } finally { setEmailChecking(false); }
    }
    setErrors(e);
    return !Object.keys(e).length;
  };

  // ── Navigation ─────────────────────────────────────────────────────────────
  const goNext = async () => {
    if (anim.phase !== "idle") return;
    setGlobalError("");
    if (step === 1 && !validateStep1()) return;
    if (step === 4) { const ok = await validateStep4(); if (!ok) return; }
    navigateStep(step + 1);
  };

  const goBack = () => navigateStep(step - 1);

  const toggleIndustry = useCallback((key: string) => {
    setOrgIndustries(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);
  }, []);

  const togglePackage = useCallback((key: string) => {
    if (key === "CRM") return;
    setPackages(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);
  }, []);

  // ── Submit ─────────────────────────────────────────────────────────────────
  const onSubmit = async () => {
    setSubmitting(true);
    setGlobalError("");
    try {
      // Step 1: Create account
      await registerUser({
        email,
        password,
        firstName:            firstName.trim(),
        lastName:             lastName.trim(),
        organizationName:     orgName.trim(),
        organizationSlug:     slug,
        organizationCode:     orgCode.trim() || undefined,
        organizationAddress:  orgAddress.trim() || undefined,
        organizationEmail:    orgEmail.trim() || undefined,
        organizationWebsite:  orgWebsite.trim() || undefined,
        organizationIndustry: orgIndustries.join(", ") || undefined,
        organizationLogo:     orgLogo || undefined,
        packages,
      } as any);

      // Step 2: Save email domain (non-blocking)
      if (orgDomain.trim()) {
        api.patch("/organizations/me", {
          settings: { emailDomain: orgDomain.trim().toLowerCase() },
        }).catch(() => {});
      }

      // Step 3: Install blueprint immediately if chosen
      const blueprintIndustry = primaryIndustry && primaryIndustry.hasBlueprint ? primaryIndustry : null;
      if (setupMode === "blueprint" && blueprintIndustry) {
        setSubmitting(false);
        setInstalling(true);
        setInstallStep("Initializing workspace…");
        try {
          setInstallStep("Creating departments & structure…");
          await api.post("/industry-setup/install", {
            industryKey: blueprintIndustry.key,
            mode: "blueprint",
          });
          setInstallStep("Configuring fields & workflows…");
          await new Promise(r => setTimeout(r, 600));
          setInstallStep("Done! Opening your workspace…");
          await new Promise(r => setTimeout(r, 500));
        } catch (installErr: any) {
          // Install failed — still go to workspace, user can retry via /onboarding
          setInstallStep("Setup skipped — you can configure later from Settings.");
          await new Promise(r => setTimeout(r, 1200));
        }
        setInstalling(false);
      } else if (setupMode === "scratch") {
        await api.post("/industry-setup/install", {
          industryKey: orgIndustries[0] || "other",
          mode: "scratch",
        }).catch(() => {});
      }

      router.push("/workspace");
    } catch (err: any) {
      setGlobalError(err?.response?.data?.message || "Registration failed. Please try again.");
      setSubmitting(false);
    } finally {
      setInstalling(false);
    }
  };

  const currentAccent = STEPS[step - 1].accent;
  const progressPct   = ((step - 1) / (STEPS.length - 1)) * 100;

  // Domain to use for autocomplete in Step 4
  const emailDomain = orgDomain.trim() || null;

  // ── Blueprint installing overlay ───────────────────────────────────────────
  if (installing) {
    const ind = primaryIndustry;
    const Icon = ind?.icon ?? Sparkles;
    const color = ind?.color ?? "#3b82f6";
    return (
      <div className="h-full flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-blue-50/30">
        <div className="w-full max-w-sm text-center px-6">
          <div className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-xl"
            style={{ background: `linear-gradient(135deg,${color}cc,${color})` }}>
            <Icon className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-2xl font-extrabold text-gray-900 mb-1">Setting up your workspace</h2>
          <p className="text-sm text-gray-400 mb-8">
            Installing {ind?.label ?? "industry"} modules, fields & workflows…
          </p>

          {/* Animated dots */}
          <div className="flex items-center justify-center gap-2 mb-6">
            {[0, 1, 2].map(i => (
              <div key={i} className="w-2.5 h-2.5 rounded-full"
                style={{
                  backgroundColor: color,
                  animation: `bounce 1.2s ease-in-out ${i * 0.2}s infinite`,
                  opacity: 0.8,
                }} />
            ))}
          </div>

          <p className="text-xs text-gray-400 min-h-[1.25rem] transition-all duration-300">{installStep}</p>
        </div>
        <style>{`@keyframes bounce { 0%,80%,100%{transform:scale(0.6);opacity:0.4} 40%{transform:scale(1.1);opacity:1} }`}</style>
      </div>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <>
      <style>{`
        @keyframes dotPulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(37,99,235,0.55); }
          60%       { box-shadow: 0 0 0 9px rgba(37,99,235,0); }
        }
        @keyframes blobFloat {
          0%, 100% { transform: translate(0,0) scale(1); }
          50%       { transform: translate(18px,-14px) scale(1.08); }
        }
        @keyframes blobFloat2 {
          0%, 100% { transform: translate(0,0) scale(1); }
          50%       { transform: translate(-14px,10px) scale(1.06); }
        }
        .dot-pulse { animation: dotPulse 2.4s ease infinite; }
        .blob1     { animation: blobFloat  9s ease-in-out infinite; }
        .blob2     { animation: blobFloat2 11s ease-in-out infinite; }
      `}</style>

      <div className="h-full flex overflow-hidden">

        {/* ── LEFT: dark panel ── */}
        <div className="hidden lg:flex lg:w-[38%] xl:w-[34%] relative overflow-hidden select-none flex-col">
          <div className="absolute inset-0 bg-gradient-to-br from-[#050d1e] via-[#091628] to-[#040f1e]" />
          <div className="blob1 absolute top-[12%] left-[2%]  w-80 h-80 rounded-full bg-blue-600/18 blur-3xl" />
          <div className="blob2 absolute bottom-[8%]  right-0  w-64 h-64 rounded-full bg-indigo-500/12 blur-3xl" />
          <div className="absolute inset-0 opacity-[0.035]"
            style={{ backgroundImage: "radial-gradient(circle, #ffffff 1px, transparent 1px)", backgroundSize: "34px 34px" }} />
          <div className="absolute top-0 left-0 right-0 h-[2px]"
            style={{ background: `linear-gradient(to right, transparent, ${currentAccent}, transparent)`, transition: "background 0.6s ease" }} />

          <div className="relative z-10 flex flex-col h-full p-10">
            <Link href="/" className="flex items-center gap-2.5">
              <div className="w-9 h-9 bg-brand rounded-xl flex items-center justify-center shadow-lg shadow-brand-dark/50">
                <LogoMark size={18} className="text-white" />
              </div>
              <span className="text-white font-bold text-lg tracking-tight">{BRAND.name}</span>
            </Link>

            <div className="my-auto">
              <p className="text-white/25 text-[10px] font-bold tracking-[0.15em] uppercase mb-7">Registration</p>
              <div className="space-y-0">
                {STEPS.map((s, i) => {
                  const done    = step > s.num;
                  const current = step === s.num;
                  const Icon    = s.icon;
                  return (
                    <div key={s.num} className="flex items-start gap-4">
                      <div className="flex flex-col items-center shrink-0">
                        <div
                          className={cn(
                            "w-8 h-8 rounded-full flex items-center justify-center transition-all duration-500",
                            done    ? "bg-emerald-500 text-white shadow-lg"
                            : current ? "text-white"
                                      : "bg-white/5 text-white/25 border border-white/10",
                          )}
                          style={current ? { backgroundColor: currentAccent } : {}}
                        >
                          {current && <div className="dot-pulse absolute w-8 h-8 rounded-full" style={{ background: "transparent" }} />}
                          {done ? <CheckCircle2 className="w-4 h-4" /> : <Icon className="w-3.5 h-3.5" />}
                        </div>
                        {i < STEPS.length - 1 && (
                          <div className="w-px flex-1 min-h-[26px] mt-1 transition-colors duration-700"
                            style={{ backgroundColor: done ? "#10b98155" : "rgba(255,255,255,0.07)" }} />
                        )}
                      </div>
                      <div className="pb-5 pt-1 min-w-0">
                        <p className={cn("text-sm font-semibold leading-none transition-colors duration-300",
                          done ? "text-emerald-400" : current ? "text-white" : "text-white/22")}>
                          {s.label}
                        </p>
                        {current && <p className="text-[11px] text-white/30 mt-1 leading-relaxed">{s.hint}</p>}
                        {done && s.num === 1 && orgName && (
                          <p className="text-[11px] text-emerald-400/50 mt-0.5 truncate">{orgName}{orgCode ? ` (${orgCode})` : ""}</p>
                        )}
                        {done && s.num === 2 && (
                          <p className="text-[11px] text-emerald-400/50 mt-0.5 truncate">
                            {orgIndustries.slice(0, 2).map(k => INDUSTRIES.find(i => i.key === k)?.label).join(", ")}
                            {orgIndustries.length > 2 ? ` +${orgIndustries.length - 2}` : ""}
                            {setupMode ? ` · ${setupMode === "blueprint" ? "Blueprint" : "From Scratch"}` : ""}
                          </p>
                        )}
                        {done && s.num === 3 && (
                          <p className="text-[11px] text-emerald-400/50 mt-0.5 truncate">
                            {orgLogo ? "Logo set" : "No logo"}
                            {orgWebsite ? ` · ${orgWebsite.replace(/^https?:\/\//, "")}` : ""}
                            {orgDomain ? ` · @${orgDomain}` : ""}
                          </p>
                        )}
                        {done && s.num === 4 && email && (
                          <p className="text-[11px] text-emerald-400/50 mt-0.5 truncate">{firstName} {lastName}</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <p className="text-white/12 text-xs">© 2026 {BRAND.name} · Enterprise Platform</p>
          </div>
        </div>

        {/* ── RIGHT: form panel ── */}
        <div className="flex-1 relative bg-white flex flex-col overflow-hidden">
          <div className="absolute top-[-80px] right-[-60px] w-72 h-72 rounded-full opacity-[0.045] blur-3xl pointer-events-none"
            style={{ backgroundColor: currentAccent, transition: "background-color 0.7s ease" }} />
          <div className="absolute bottom-[-60px] left-[-40px] w-56 h-56 rounded-full bg-slate-200/60 blur-3xl pointer-events-none" />

          {/* Top progress strip */}
          <div className="relative z-10 h-1 w-full bg-gray-100">
            <div className="absolute inset-y-0 left-0 rounded-r-full"
              style={{
                width: `${progressPct}%`,
                background: `linear-gradient(to right, ${currentAccent}cc, ${currentAccent})`,
                transition: "width 0.6s cubic-bezier(0.22,1,0.36,1), background 0.6s ease",
              }} />
          </div>

          <div className="flex-1 overflow-y-auto flex flex-col items-center justify-center p-6 sm:p-10">
            <div className="w-full max-w-[520px]">

              {/* Mobile brand */}
              <div className="flex items-center gap-2.5 mb-8 lg:hidden">
                <div className="w-8 h-8 bg-brand rounded-xl flex items-center justify-center">
                  <LogoMark size={16} className="text-white" />
                </div>
                <span className="font-bold text-gray-900">{BRAND.name}</span>
              </div>

              {/* Step dots */}
              <div className="flex items-center justify-between mb-7">
                <div className="flex items-center gap-2">
                  {STEPS.map(s => (
                    <div key={s.num} className="rounded-full transition-all duration-500"
                      style={{
                        width:           step === s.num ? 24 : step > s.num ? 8 : 6,
                        height:          step === s.num ? 8 : step > s.num ? 8 : 6,
                        backgroundColor: step >= s.num ? currentAccent : "#e5e7eb",
                        transition:      "all 0.45s cubic-bezier(0.22,1,0.36,1)",
                      }} />
                  ))}
                </div>
                <span className="text-xs text-gray-400 font-semibold tabular-nums">
                  {step} <span className="text-gray-300">/ {STEPS.length}</span>
                </span>
              </div>

              {/* ── ANIMATED CONTENT ── */}
              <div style={contentStyle}>

                {/* Heading */}
                <div className="mb-7">
                  <h1 className="text-[27px] font-extrabold text-gray-900 tracking-tight leading-tight">
                    {step === 1 && "Register organization"}
                    {step === 2 && "What is your organization's focus?"}
                    {step === 3 && "Set up your brand identity"}
                    {step === 4 && "Create your admin account"}
                    {step === 5 && "Choose your apps"}
                  </h1>
                  <p className="text-gray-400 text-sm mt-1.5 leading-relaxed">
                    {step === 1 && "Basic details — everything can be updated from settings later."}
                    {step === 2 && "Select your sector, then choose how to set up your workspace."}
                    {step === 3 && "Your logo, website, and email domain — all optional."}
                    {step === 4 && "Your email is your permanent login — it cannot be changed."}
                    {step === 5 && `Select the ${BRAND.name} apps to activate. CRM is always included.`}
                  </p>
                </div>

                {globalError && (
                  <div className="flex items-start gap-2.5 px-3.5 py-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700 mb-5">
                    <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-red-500" />
                    {globalError}
                  </div>
                )}

                {/* ── STEP 1: Organization ── */}
                {step === 1 && (
                  <div className="space-y-4">
                    <Field label="Organization name *" error={errors.orgName}>
                      <TextInput
                        placeholder="Mo Dewji Foundation"
                        value={orgName}
                        onChange={e => setOrgName(e.target.value)}
                        error={errors.orgName}
                        autoFocus
                      />
                    </Field>
                    {orgName.trim().length >= 2 && (
                      <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-blue-50 border border-blue-100 text-sm">
                        <span className="text-gray-400 text-xs">Platform URL:</span>
                        <span className="font-mono font-semibold text-xs" style={{ color: currentAccent }}>{slug}</span>
                      </div>
                    )}
                    <Field label="Short name / Code">
                      <div className="flex gap-2">
                        <TextInput
                          placeholder="MDF"
                          value={orgCode}
                          onChange={e => setOrgCode(e.target.value.toUpperCase())}
                          maxLength={10}
                          prefix={<Hash className="w-4 h-4" />}
                        />
                        {orgCode && (
                          <div className="h-11 px-4 rounded-xl border border-gray-200 bg-slate-50 flex items-center text-sm font-bold text-slate-600 shrink-0">
                            ({orgCode})
                          </div>
                        )}
                      </div>
                      <p className="text-xs text-gray-400 mt-1">Short acronym, e.g. MDF. Optional.</p>
                    </Field>
                    <Field label="Address / Location">
                      <TextInput
                        placeholder="Dar es Salaam, Tanzania"
                        value={orgAddress}
                        onChange={e => setOrgAddress(e.target.value)}
                        prefix={<MapPin className="w-4 h-4" />}
                      />
                    </Field>
                    <Field label="Contact email (optional)">
                      <TextInput
                        type="email"
                        placeholder="info@example.org"
                        value={orgEmail}
                        onChange={e => setOrgEmail(e.target.value)}
                        prefix={<Mail className="w-4 h-4" />}
                      />
                    </Field>
                  </div>
                )}

                {/* ── STEP 2: Focus + Setup Mode ── */}
                {step === 2 && (
                  <div className="space-y-6">
                    {/* Industry grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {INDUSTRIES.map((ind, idx) => {
                        const selected = orgIndustries.includes(ind.key);
                        const Icon = ind.icon;
                        return (
                          <button
                            key={ind.key}
                            type="button"
                            onClick={() => toggleIndustry(ind.key)}
                            className={cn("relative group flex flex-col items-start gap-2.5 p-4 rounded-2xl border-2 text-left",
                              !selected && "bg-white hover:shadow-md")}
                            style={{
                              opacity:         focusReady ? 1 : 0,
                              transform:       focusReady ? "translateY(0) scale(1)" : "translateY(18px) scale(0.96)",
                              transition: [
                                `opacity 0.44s cubic-bezier(0.34,1.56,0.64,1) ${idx * 46}ms`,
                                `transform 0.44s cubic-bezier(0.34,1.56,0.64,1) ${idx * 46}ms`,
                                "border-color 0.18s ease", "box-shadow 0.18s ease", "background-color 0.18s ease",
                              ].join(", "),
                              borderColor:     selected ? ind.color : "#e5e7eb",
                              backgroundColor: selected ? ind.bg : undefined,
                              boxShadow:       selected ? `0 4px 20px -2px ${ind.color}30` : undefined,
                            }}
                          >
                            <div className="absolute top-2.5 right-2.5 w-5 h-5 rounded-full flex items-center justify-center transition-all duration-200"
                              style={{
                                backgroundColor: selected ? ind.color : "transparent",
                                transform:       selected ? "scale(1)" : "scale(0.4)",
                                opacity:         selected ? 1 : 0,
                              }}>
                              <CheckCircle2 className="w-3 h-3 text-white" />
                            </div>
                            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-all duration-200 group-hover:scale-105"
                              style={{ backgroundColor: selected ? ind.color : ind.bg }}>
                              <Icon style={{ width: 17, height: 17, color: selected ? "#fff" : ind.color }} />
                            </div>
                            <div className="min-w-0 pr-4">
                              <div className="flex items-center gap-1 flex-wrap">
                                <p className="text-xs font-bold leading-tight text-gray-900">{ind.label}</p>
                                {ind.hasBlueprint && (
                                  <span className="text-[8px] px-1 py-0.5 rounded font-bold"
                                    style={{ backgroundColor: ind.bg, color: ind.color }}>BP</span>
                                )}
                              </div>
                              <p className="text-[10px] text-gray-400 mt-0.5 leading-tight">{ind.desc}</p>
                            </div>
                          </button>
                        );
                      })}
                    </div>

                    {/* Selected chips */}
                    {orgIndustries.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {orgIndustries.map(k => {
                          const ind = INDUSTRIES.find(i => i.key === k)!;
                          const Icon = ind.icon;
                          return (
                            <span key={k} className="flex items-center gap-1.5 pl-2.5 pr-1.5 py-1 rounded-full text-white text-xs font-semibold"
                              style={{ backgroundColor: ind.color }}>
                              <Icon style={{ width: 10, height: 10 }} />
                              {ind.label}
                              <button type="button" onClick={() => toggleIndustry(k)}
                                className="w-4 h-4 rounded-full bg-white/20 hover:bg-white/40 flex items-center justify-center transition-colors">
                                <X className="w-2.5 h-2.5" />
                              </button>
                            </span>
                          );
                        })}
                      </div>
                    )}

                    {/* ── Setup mode selection ── */}
                    {orgIndustries.length > 0 && (
                      <div>
                        <div className="flex items-center gap-3 mb-3">
                          <div className="flex-1 h-px bg-gray-100" />
                          <p className="text-xs font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">How would you like to set up?</p>
                          <div className="flex-1 h-px bg-gray-100" />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {/* Blueprint */}
                          <button
                            type="button"
                            onClick={() => anyHasBlueprint && setSetupMode("blueprint")}
                            disabled={!anyHasBlueprint}
                            className={cn(
                              "relative flex flex-col items-start p-4 rounded-2xl border-2 text-left transition-all duration-200",
                              setupMode === "blueprint"
                                ? "border-violet-500 bg-violet-50 shadow-md shadow-violet-100"
                                : anyHasBlueprint
                                  ? "border-gray-200 bg-white hover:border-violet-200 hover:shadow-sm"
                                  : "border-gray-200 bg-gray-50 opacity-50 cursor-not-allowed",
                            )}
                          >
                            {setupMode === "blueprint" && (
                              <div className="absolute top-3 right-3 w-5 h-5 bg-violet-500 rounded-full flex items-center justify-center">
                                <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                              </div>
                            )}
                            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-violet-600 flex items-center justify-center mb-3 shadow-sm">
                              <Sparkles className="w-4.5 h-4.5 text-white" style={{ width: 18, height: 18 }} />
                            </div>
                            <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                              <p className="text-xs font-bold text-gray-900">Build with Blueprint</p>
                              <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-violet-100 text-violet-600 font-bold">Recommended</span>
                            </div>
                            <p className="text-[10px] text-gray-500 leading-relaxed">
                              {anyHasBlueprint
                                ? "Auto-creates modules, fields, workflows & departments tailored to your industry."
                                : "Not yet available for your selected industry."}
                            </p>
                          </button>

                          {/* Scratch */}
                          <button
                            type="button"
                            onClick={() => setSetupMode("scratch")}
                            className={cn(
                              "relative flex flex-col items-start p-4 rounded-2xl border-2 text-left transition-all duration-200",
                              setupMode === "scratch"
                                ? "border-slate-600 bg-slate-50 shadow-md shadow-slate-100"
                                : "border-gray-200 bg-white hover:border-slate-300 hover:shadow-sm",
                            )}
                          >
                            {setupMode === "scratch" && (
                              <div className="absolute top-3 right-3 w-5 h-5 bg-slate-700 rounded-full flex items-center justify-center">
                                <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                              </div>
                            )}
                            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-slate-600 to-slate-800 flex items-center justify-center mb-3 shadow-sm">
                              <Zap className="w-4.5 h-4.5 text-white" style={{ width: 18, height: 18 }} />
                            </div>
                            <p className="text-xs font-bold text-gray-900 mb-1">Start from Scratch</p>
                            <p className="text-[10px] text-gray-500 leading-relaxed">
                              Clean workspace — build every module, field, and workflow yourself.
                            </p>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* ── STEP 3: Brand ── */}
                {step === 3 && (
                  <div className="space-y-5">
                    <Field label="Website URL" hint="Your logo will link to this URL across the platform.">
                      <TextInput
                        type="url"
                        placeholder="https://yourorganization.com"
                        value={orgWebsite}
                        onChange={e => setOrgWebsite(e.target.value)}
                        prefix={<Globe className="w-4 h-4" />}
                      />
                    </Field>

                    <Field label="Email domain"
                      hint="Used for @ autocomplete when adding team members. E.g. modewjifoundation.org">
                      <div className="relative">
                        <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                          <AtSign className="w-4 h-4" />
                        </div>
                        <input
                          type="text"
                          placeholder="modewjifoundation.org"
                          value={orgDomain}
                          onChange={e => setOrgDomain(e.target.value.toLowerCase().replace(/\s/g, ""))}
                          className="w-full h-11 rounded-xl border text-sm bg-white placeholder:text-gray-300 outline-none transition-all duration-150 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 pl-10 pr-4 border-gray-200 hover:border-gray-300"
                        />
                      </div>
                      {orgDomain && (
                        <p className="text-xs text-gray-500 mt-1.5 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-green-500 shrink-0" />
                          When adding users, typing <code className="px-1 bg-gray-100 rounded text-xs">@</code> will suggest <strong>@{orgDomain}</strong>
                        </p>
                      )}
                    </Field>

                    <div className="flex items-center gap-3">
                      <div className="flex-1 h-px bg-gray-100" />
                      <span className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Logo</span>
                      <div className="flex-1 h-px bg-gray-100" />
                    </div>

                    <div className="flex gap-1.5 p-1 bg-gray-100 rounded-xl">
                      {(["upload", "url"] as const).map(mode => (
                        <button key={mode} type="button"
                          onClick={() => { setLogoMode(mode); setLogoError(""); }}
                          className={cn("flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all",
                            logoMode === mode ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700")}>
                          {mode === "upload" ? <><Upload className="w-4 h-4" /> Upload</> : <><Link2 className="w-4 h-4" /> Paste URL</>}
                        </button>
                      ))}
                    </div>

                    {logoMode === "upload" && (
                      <div
                        onDragOver={e => { e.preventDefault(); setLogoDragging(true); }}
                        onDragLeave={() => setLogoDragging(false)}
                        onDrop={e => { e.preventDefault(); setLogoDragging(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
                        onClick={() => fileInputRef.current?.click()}
                        className={cn(
                          "group relative border-2 border-dashed rounded-2xl cursor-pointer transition-all duration-200",
                          "flex flex-col items-center justify-center gap-3 py-10",
                          logoDragging ? "border-blue-400 bg-blue-50" : "border-gray-200 bg-gray-50/50 hover:border-gray-300 hover:bg-gray-50",
                        )}
                      >
                        <input ref={fileInputRef} type="file" accept="image/*" className="hidden"
                          onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
                        <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center transition-colors border",
                          logoDragging ? "bg-blue-100 border-blue-200" : "bg-white border-gray-100 shadow-sm group-hover:border-gray-200")}>
                          <Upload className={cn("w-5 h-5 transition-colors",
                            logoDragging ? "text-blue-500" : "text-gray-400 group-hover:text-gray-600")} />
                        </div>
                        <div className="text-center">
                          <p className="text-sm font-semibold text-gray-700">{logoDragging ? "Drop your logo here" : "Drag & drop your logo"}</p>
                          <p className="text-xs text-gray-400 mt-1">
                            or <span className="text-blue-600 font-semibold underline underline-offset-2">browse files</span>
                            {" · PNG, SVG, JPG · max 3 MB"}
                          </p>
                        </div>
                      </div>
                    )}

                    {logoMode === "url" && (
                      <Field label="Logo image URL" hint="Must be a publicly accessible image (PNG, SVG, or JPG).">
                        <TextInput type="url" placeholder="https://yourorganization.com/logo.png"
                          value={orgLogo} onChange={e => setOrgLogo(e.target.value)}
                          prefix={<ImageIcon className="w-4 h-4" />} autoFocus />
                      </Field>
                    )}

                    {logoError && <p className="text-xs text-red-500 flex items-center gap-1.5"><AlertCircle className="w-3.5 h-3.5" />{logoError}</p>}

                    {orgLogo && (
                      <div className="flex items-center gap-4 p-4 bg-white rounded-2xl border border-gray-200 shadow-sm">
                        {orgWebsite ? (
                          <a href={orgWebsite} target="_blank" rel="noopener noreferrer"
                            className="shrink-0 w-16 h-16 rounded-xl flex items-center justify-center border border-gray-100 bg-gray-50 overflow-hidden hover:ring-2 hover:ring-blue-400 hover:ring-offset-2 transition-all">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={orgLogo} alt="Logo" className="w-full h-full object-contain" onError={() => setLogoError("Could not load that image.")} />
                          </a>
                        ) : (
                          <div className="shrink-0 w-16 h-16 rounded-xl border border-gray-100 bg-gray-50 overflow-hidden">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={orgLogo} alt="Logo" className="w-full h-full object-contain" onError={() => setLogoError("Could not load that image.")} />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-gray-900">{orgName || "Your Organization"}</p>
                          {orgWebsite
                            ? <a href={orgWebsite} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-500 hover:underline mt-0.5 block truncate">{orgWebsite.replace(/^https?:\/\//, "")}</a>
                            : <p className="text-xs text-gray-400 mt-0.5">Add a website above to link the logo</p>}
                        </div>
                        <button type="button" onClick={() => { setOrgLogo(""); setLogoError(""); }}
                          className="shrink-0 w-8 h-8 rounded-full bg-gray-100 hover:bg-red-100 hover:text-red-500 flex items-center justify-center text-gray-400 transition-colors">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    )}

                    {!orgLogo && <p className="text-center text-xs text-gray-400">Logo is optional — add or change it anytime from Organization Settings.</p>}
                  </div>
                )}

                {/* ── STEP 4: Account ── */}
                {step === 4 && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <Field label="First name *" error={errors.firstName}>
                        <TextInput placeholder="Jane" value={firstName}
                          onChange={e => setFirstName(e.target.value)} error={errors.firstName} autoFocus />
                      </Field>
                      <Field label="Last name *" error={errors.lastName}>
                        <TextInput placeholder="Doe" value={lastName}
                          onChange={e => setLastName(e.target.value)} error={errors.lastName} />
                      </Field>
                    </div>

                    <Field label="Email address *" error={errors.email}
                      hint={!emailDomain ? "Permanent login — cannot be changed later." : undefined}>
                      <DomainEmailInput
                        value={email}
                        onChange={setEmail}
                        domain={emailDomain}
                        placeholder={emailDomain ? `jane@${emailDomain}` : "jane@organization.org"}
                        error={errors.email}
                        suffix={emailChecking ? <Loader2 className="w-4 h-4 animate-spin" /> : undefined}
                      />
                    </Field>

                    <Field label="Password *" error={errors.password}>
                      <TextInput type={showPw ? "text" : "password"} placeholder="Min. 8 characters"
                        value={password} onChange={e => setPassword(e.target.value)}
                        error={errors.password} autoComplete="new-password"
                        suffix={
                          <button type="button" onClick={() => setShowPw(p => !p)} className="cursor-pointer hover:text-gray-600">
                            {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        } />
                    </Field>
                    <Field label="Confirm password *" error={errors.confirmPw}>
                      <TextInput type={showCPw ? "text" : "password"} placeholder="Repeat password"
                        value={confirmPw} onChange={e => setConfirmPw(e.target.value)}
                        error={errors.confirmPw} autoComplete="new-password"
                        suffix={
                          <button type="button" onClick={() => setShowCPw(p => !p)} className="cursor-pointer hover:text-gray-600">
                            {showCPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        } />
                    </Field>
                  </div>
                )}

                {/* ── STEP 5: Apps ── */}
                {step === 5 && (
                  <div className="space-y-2.5">
                    {PACKAGES.map(pkg => {
                      const Icon = pkg.icon;
                      const sel  = packages.includes(pkg.key);
                      return (
                        <button key={pkg.key} type="button" onClick={() => togglePackage(pkg.key)}
                          disabled={pkg.required}
                          className={cn(
                            "w-full flex items-center gap-4 p-3.5 rounded-xl border text-left transition-all duration-150",
                            sel ? cn("border-2", pkg.border, pkg.bg) : "border border-gray-150 bg-gray-50/50 hover:bg-gray-50 hover:border-gray-200",
                            pkg.required && "cursor-default",
                          )}>
                          <div className={cn("w-9 h-9 rounded-xl bg-gradient-to-br flex items-center justify-center shrink-0 shadow-sm", pkg.gradient)}>
                            <Icon className="w-4.5 h-4.5 text-white" style={{ width: 18, height: 18 }} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-bold text-gray-900">{pkg.name}</span>
                              {pkg.required && <span className="text-[10px] px-1.5 py-0.5 bg-blue-100 text-blue-600 rounded-md font-semibold">Required</span>}
                            </div>
                            <p className="text-xs text-gray-400 mt-0.5">{pkg.desc}</p>
                          </div>
                          <div className={cn("w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all",
                            sel ? "bg-brand border-brand" : "border-gray-300")}>
                            {sel && <CheckCircle2 className="w-3.5 h-3.5 text-white fill-white" />}
                          </div>
                        </button>
                      );
                    })}
                    <p className="text-xs text-gray-400 pt-2 text-center">Apps can be added or removed from organization settings.</p>
                  </div>
                )}

                {/* ── Navigation ── */}
                <div className={cn("flex mt-8 gap-3 items-center", step > 1 ? "justify-between" : "justify-end")}>
                  {step > 1 && (
                    <button type="button" onClick={goBack}
                      className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 hover:border-gray-300 active:scale-95 transition-all">
                      <ArrowLeft className="w-4 h-4" /> Back
                    </button>
                  )}

                  <div className="flex items-center gap-2">
                    {(step === 2 || step === 3) && (
                      <button type="button" onClick={() => navigateStep(step + 1)}
                        className="px-4 py-2.5 text-sm font-medium text-gray-400 hover:text-gray-600 transition-colors">
                        Skip
                      </button>
                    )}

                    {step < 5 ? (
                      <button type="button" onClick={goNext} disabled={emailChecking}
                        className="group relative flex items-center gap-2 px-7 py-2.5 rounded-xl text-sm font-bold text-white transition-all hover:scale-[1.03] active:scale-[0.97] disabled:opacity-50 disabled:pointer-events-none overflow-hidden"
                        style={{ background: `linear-gradient(135deg, ${currentAccent}dd, ${currentAccent})`, boxShadow: `0 4px 18px -2px ${currentAccent}55` }}>
                        <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/15 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                        {emailChecking
                          ? <><Loader2 className="w-4 h-4 animate-spin" /> Checking…</>
                          : <>Continue <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" /></>}
                      </button>
                    ) : (
                      <button type="button" onClick={onSubmit} disabled={submitting}
                        className="group relative flex items-center gap-2 px-8 py-2.5 rounded-xl text-sm font-bold text-white overflow-hidden transition-all hover:scale-[1.03] active:scale-[0.97] disabled:opacity-50 disabled:pointer-events-none"
                        style={{ background: "linear-gradient(135deg, #1d4ed8, #2563eb)", boxShadow: "0 4px 20px -2px rgba(37,99,235,0.5)" }}>
                        <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/15 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                        {submitting
                          ? <><Loader2 className="w-4 h-4 animate-spin" /> Creating platform…</>
                          : <>Launch {BRAND.name} <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" /></>}
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <p className="text-center text-sm text-gray-400 mt-7">
                Already have an account?{" "}
                <Link href="/login" className="font-semibold text-gray-900 hover:text-blue-600 transition-colors">Sign in</Link>
              </p>
            </div>
          </div>
        </div>

      </div>
    </>
  );
}
