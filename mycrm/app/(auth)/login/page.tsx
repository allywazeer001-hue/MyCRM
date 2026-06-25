"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Eye, EyeOff, AlertCircle } from "lucide-react";
import { useAuthStore } from "@/store/auth.store";

// ── Validation (unchanged) ────────────────────────────────────────────────────
const loginSchema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
});
type LoginForm = z.infer<typeof loginSchema>;

// ── Cycling word hook ─────────────────────────────────────────────────────────
// The last word in the headline cycles through a list with a fade+slide transition.
const CYCLE_WORDS = ["smarter.", "professional.", "powerful.", "efficient.", "modern."];

function useCyclingWord(words: string[], interval = 2800) {
  const [idx,     setIdx]     = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setInterval(() => {
      setVisible(false);                        // fade out
      setTimeout(() => {
        setIdx(i => (i + 1) % words.length);
        setVisible(true);                       // fade in next word
      }, 380);
    }, interval);
    return () => clearInterval(timer);
  }, [words.length, interval]);

  return { word: words[idx], visible };
}

// ── CloudBox logo mark ────────────────────────────────────────────────────────
function LogoMark({ size = 32, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" className={className}>
      <rect x="2"  y="2"  width="12" height="12" rx="3" fill="currentColor" opacity="0.9" />
      <rect x="18" y="2"  width="12" height="12" rx="3" fill="currentColor" opacity="0.7" />
      <rect x="2"  y="18" width="12" height="12" rx="3" fill="currentColor" opacity="0.7" />
      <rect x="18" y="18" width="12" height="12" rx="3" fill="currentColor" opacity="0.5" />
    </svg>
  );
}

// ── Splash screen ─────────────────────────────────────────────────────────────
function SplashScreen({ fading }: { fading: boolean }) {
  return (
    <div
      className={`fixed inset-0 z-[100] flex items-center justify-center ${fading ? "cb-splash-out" : ""}`}
      style={{ background: "linear-gradient(135deg, #030712 0%, #0a0f1e 60%, #040d1f 100%)" }}
    >
      <style>{`
        @keyframes cb-arc-spin  { to { stroke-dashoffset: -283; } }
        @keyframes cb-logo-glow { 0%,100% { box-shadow: 0 0 22px 4px rgba(59,130,246,0.35); } 50% { box-shadow: 0 0 44px 12px rgba(59,130,246,0.55); } }
        @keyframes cb-letter-in { from { opacity:0; transform:translateY(9px); } to { opacity:1; transform:translateY(0); } }
        @keyframes cb-bar-grow  { from { transform:scaleX(0); } to { transform:scaleX(1); } }
      `}</style>

      <div className="flex flex-col items-center gap-7">

        {/* Orbital arc + logo */}
        <div className="relative w-32 h-32 flex items-center justify-center">
          <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 128 128">
            {/* Track */}
            <circle cx="64" cy="64" r="52" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="1.5" />
            {/* Animated arc */}
            <circle
              cx="64" cy="64" r="52"
              fill="none"
              stroke="url(#splashArc)"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeDasharray="120 207"
              style={{ animation: "cb-arc-spin 1.8s linear infinite", transformOrigin: "center" }}
            />
            <defs>
              <linearGradient id="splashArc" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#3b82f6" />
                <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.2" />
              </linearGradient>
            </defs>
          </svg>

          {/* Inner logo */}
          <div
            className="w-[68px] h-[68px] rounded-[18px] flex items-center justify-center"
            style={{
              background: "linear-gradient(145deg, #2563eb 0%, #1e40af 100%)",
              animation: "cb-logo-glow 2.2s ease-in-out infinite",
            }}
          >
            <LogoMark size={34} className="text-white" />
          </div>
        </div>

        {/* Brand name — staggered letter reveal */}
        <div className="flex items-end gap-[1px]">
          {"CLOUDBOX".split("").map((ch, i) => (
            <span
              key={i}
              className="text-white font-extrabold text-2xl"
              style={{
                letterSpacing: "0.18em",
                opacity: 0,
                display: "inline-block",
                animation: `cb-letter-in 0.4s cubic-bezier(0.22,1,0.36,1) forwards ${0.08 + i * 0.055}s`,
              }}
            >
              {ch}
            </span>
          ))}
        </div>

        {/* Tagline */}
        <p
          className="text-blue-300/45 text-[10px] tracking-[0.35em] uppercase font-medium"
          style={{ opacity: 0, animation: "cb-letter-in 0.5s ease forwards 0.65s" }}
        >
          Enterprise CRM Platform
        </p>

        {/* Progress bar */}
        <div className="w-28 h-[2px] rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
          <div
            className="h-full rounded-full origin-left"
            style={{
              background: "linear-gradient(90deg, #3b82f6, #06b6d4)",
              animation: "cb-bar-grow 1.1s cubic-bezier(0.4,0,0.2,1) forwards 0.15s",
              transform: "scaleX(0)",
            }}
          />
        </div>

      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function LoginPage() {
  const router   = useRouter();
  const { login, isLoading } = useAuthStore();
  const [error,        setError]        = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showSplash,   setShowSplash]   = useState(true);
  const [splashFading, setSplashFading] = useState(false);

  // Cycling word — starts after splash (delay matches splash hide time)
  const { word: cycleWord, visible: wordVisible } = useCyclingWord(CYCLE_WORDS, 2800);

  // ── Splash timing ────────────────────────────────────────────────────────
  useEffect(() => {
    const fadeTimer = setTimeout(() => setSplashFading(true), 850);
    const hideTimer = setTimeout(() => setShowSplash(false), 1350);
    return () => { clearTimeout(fadeTimer); clearTimeout(hideTimer); };
  }, []);

  // ── Redirect if already logged in ────────────────────────────────────────
  useEffect(() => {
    try {
      const token = localStorage.getItem("access_token");
      if (!token) return;
      const parts = token.split(".");
      if (parts.length !== 3) return;
      const payload = JSON.parse(atob(parts[1].replace(/-/g, "+").replace(/_/g, "/")));
      const expired = payload.exp && payload.exp * 1000 < Date.now();
      if (!expired) router.replace("/dashboard");
    } catch { /* ignore */ }
  }, []); // eslint-disable-line

  const { register, handleSubmit, formState: { errors } } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  const [errorType, setErrorType] = useState<"" | "no_account" | "wrong_password">("");

  const onSubmit = async (data: LoginForm) => {
    setError(""); setErrorType("");
    try {
      await login(data.email, data.password);
      router.push("/workspace");
    } catch (err: any) {
      const msg: string = err?.response?.data?.message || "Invalid credentials. Please try again.";
      setError(msg);
      if (msg.toLowerCase().includes("no account") || msg.toLowerCase().includes("not found")) {
        setErrorType("no_account");
      } else if (msg.toLowerCase().includes("incorrect password") || msg.toLowerCase().includes("wrong password")) {
        setErrorType("wrong_password");
      }
    }
  };

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <>
      {showSplash && <SplashScreen fading={splashFading} />}

      <div className="h-dvh flex overflow-hidden" style={{ fontFamily: "inherit" }}>

        {/* ── LEFT: Dark artistic panel ── */}
        <div className="hidden lg:flex lg:w-[46%] xl:w-[44%] relative overflow-hidden select-none">
          {/* Base dark gradient */}
          <div className="absolute inset-0 bg-gradient-to-br from-[#060d1f] via-[#0b1a35] to-[#071524]" />

          {/* Animated blobs */}
          <div className="absolute top-[15%] left-[10%] w-72 h-72 rounded-full bg-blue-600/20 blur-3xl cb-blob" />
          <div className="absolute bottom-[20%] right-[5%]  w-56 h-56 rounded-full bg-cyan-500/15  blur-3xl cb-blob" style={{ animationDelay: "3s" }} />
          <div className="absolute top-[55%] left-[35%]  w-48 h-48 rounded-full bg-indigo-700/20 blur-2xl cb-blob" style={{ animationDelay: "5s" }} />

          {/* Subtle dot-grid overlay */}
          <div
            className="absolute inset-0 opacity-[0.06]"
            style={{
              backgroundImage: "radial-gradient(circle, #ffffff 1px, transparent 1px)",
              backgroundSize: "36px 36px",
            }}
          />

          {/* Thin accent line at top */}
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-blue-500 to-transparent opacity-60" />

          {/* Content */}
          <div className="relative z-10 flex flex-col justify-between p-12 w-full">

            {/* Logo */}
            <div className="cb-slide-right flex items-center gap-3">
              <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-900/50">
                <LogoMark size={20} className="text-white" />
              </div>
              <span className="text-white font-bold text-lg tracking-tight">Cloudbox</span>
            </div>

            {/* Main headline — "Manage your business" is static; last word cycles */}
            <div className="space-y-5">
              <div className="cb-slide-right cb-d200">
                <h2 className="text-[38px] font-extrabold leading-[1.2] tracking-tight">
                  {/* Static white part */}
                  <span className="text-white">Manage your<br />business</span>
                  <br />
                  {/* Cycling colored word with fade + slide transition */}
                  <span
                    className="text-cyan-400"
                    style={{
                      display: "inline-block",
                      opacity:   wordVisible ? 1 : 0,
                      transform: wordVisible ? "translateY(0)" : "translateY(10px)",
                      transition: "opacity 0.35s ease, transform 0.35s ease",
                    }}
                  >
                    {cycleWord}
                  </span>
                </h2>
              </div>
              <p className="text-blue-200/60 text-[15px] leading-relaxed cb-slide-right cb-d300">
                One platform for CRM, workflows,<br />reports, and team collaboration.
              </p>

              {/* Feature pills */}
              <div className="flex flex-wrap gap-2 pt-1 cb-fade-in cb-d400">
                {["CRM Modules", "Live Analytics", "Workflows", "Smart Forms"].map(label => (
                  <span
                    key={label}
                    className="px-3 py-1 bg-white/8 border border-white/10 text-white/70 text-xs rounded-full"
                  >
                    {label}
                  </span>
                ))}
              </div>
            </div>

            {/* Footer */}
            <p className="text-white/20 text-xs cb-fade-in cb-d400">
              © 2025 Cloudbox · Enterprise Platform
            </p>
          </div>
        </div>

        {/* ── RIGHT: Form panel ── */}
        <div className="flex-1 bg-white flex flex-col items-center justify-center p-6 sm:p-10 relative overflow-y-auto">

          {/* Form card */}
          <div className="w-full max-w-[400px] cb-slide-up">

            {/* Mobile brand header */}
            <div className="flex items-center justify-center gap-2.5 mb-8 lg:hidden">
              <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center">
                <LogoMark size={18} className="text-white" />
              </div>
              <span className="font-bold text-gray-900 text-lg">Cloudbox</span>
            </div>

            {/* Heading */}
            <div className="mb-7">
              <h1 className="text-[26px] font-extrabold text-gray-900 tracking-tight leading-tight">
                Sign in
              </h1>
              <p className="text-gray-400 text-sm mt-1.5">
                Access your workspace
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit(onSubmit)} method="post" className="space-y-4">

              {/* Error */}
              {error && (
                <div className="flex flex-col gap-1.5 px-3.5 py-3 rounded-xl bg-red-50 border border-red-200 cb-scale-in">
                  <div className="flex items-start gap-2.5">
                    <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-red-500" />
                    <span className="text-sm text-red-700">{error}</span>
                  </div>
                  {errorType === "wrong_password" && (
                    <p className="text-xs text-red-500 pl-6">
                      <Link href="/forgot-password" className="underline hover:text-red-700 font-medium">Reset your password</Link> if you&apos;ve forgotten it.
                    </p>
                  )}
                  {errorType === "no_account" && (
                    <p className="text-xs text-red-500 pl-6">
                      Want to get started?{" "}
                      <Link href="/register" className="underline hover:text-red-700 font-medium">Create an account</Link>.
                    </p>
                  )}
                </div>
              )}

              {/* Email */}
              <div className="space-y-1.5">
                <label htmlFor="email" className="block text-sm font-semibold text-gray-800">
                  Email address
                </label>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@company.com"
                  {...register("email")}
                  className={[
                    "w-full h-11 px-4 rounded-xl border text-sm bg-white",
                    "placeholder:text-gray-300 outline-none",
                    "transition-all duration-150",
                    "focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500",
                    errors.email
                      ? "border-red-400 bg-red-50/30"
                      : "border-gray-200 hover:border-gray-300",
                  ].join(" ")}
                />
                {errors.email && (
                  <p className="text-xs text-red-500 mt-1">{errors.email.message}</p>
                )}
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <label htmlFor="password" className="block text-sm font-semibold text-gray-800">
                  Password
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    placeholder="••••••••••"
                    {...register("password")}
                    className={[
                      "w-full h-11 px-4 pr-11 rounded-xl border text-sm bg-white",
                      "placeholder:text-gray-300 outline-none",
                      "transition-all duration-150",
                      "focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500",
                      errors.password
                        ? "border-red-400 bg-red-50/30"
                        : "border-gray-200 hover:border-gray-300",
                    ].join(" ")}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(p => !p)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-xs text-red-500 mt-1">{errors.password.message}</p>
                )}
              </div>

              {/* Submit */}
              <div className="pt-1">
                <button
                  type="submit"
                  disabled={isLoading}
                  className={[
                    "w-full h-11 rounded-xl text-sm font-bold tracking-wide",
                    "flex items-center justify-center gap-2 transition-all duration-150",
                    "bg-[#111827] text-white",
                    "hover:bg-[#1f2937] hover:shadow-lg hover:shadow-gray-900/20",
                    "active:scale-[0.99] active:bg-black",
                    "disabled:opacity-50 disabled:cursor-not-allowed",
                  ].join(" ")}
                >
                  {isLoading ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Signing in…</>
                  ) : (
                    <>Join us <span className="ml-1">→</span></>
                  )}
                </button>
              </div>

              {/* Forgot password */}
              <div className="flex justify-end pt-0.5">
                <Link
                  href="/forgot-password"
                  className="text-xs text-blue-600 hover:text-blue-800 hover:underline transition-colors"
                >
                  Forgot password?
                </Link>
              </div>

            </form>

            {/* Divider */}
            <div className="flex items-center gap-3 my-5">
              <div className="flex-1 h-px bg-gray-100" />
              <span className="text-xs text-gray-400">or</span>
              <div className="flex-1 h-px bg-gray-100" />
            </div>

            {/* Register */}
            <p className="text-center text-sm text-gray-500">
              Don&apos;t have an account?{" "}
              <Link href="/register" className="font-semibold text-gray-900 hover:text-blue-600 transition-colors">
                Create one
              </Link>
            </p>

          </div>
        </div>

      </div>
    </>
  );
}
