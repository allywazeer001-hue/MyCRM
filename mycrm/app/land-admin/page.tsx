"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { SOCIAL_PLATFORMS } from "@/lib/social-platforms";
import { BRAND } from "@/lib/core-brand";

// ── Types ─────────────────────────────────────────────────────────────────────
interface LandingConfig {
  // Content
  heroTitle: string;
  heroSubtitle: string;
  badgeText: string;
  heroCta1: string;
  heroCta2: string;
  sectionTitle: string;
  sectionSubtitle: string;
  ctaTitle: string;
  ctaSubtitle: string;
  // Images
  image1Url: string;
  image2Url: string;
  // Theme
  accentColor: string;
  bgColor: string;
  // Style
  heroAlign: "left" | "center";
  showStats: boolean;
  showMockup: boolean;
  heroBadgeVisible: boolean;
  // Contact
  socialLinks: Record<string, string>;
}

const DEFAULTS: LandingConfig = {
  heroTitle: "One platform.\nEvery part of your business.",
  heroSubtitle: "One unified platform to grow your customer base, manage your people, track your finances, and run every operation — built from the gaps real teams actually hit.",
  badgeText: "One platform for your entire organization",
  heroCta1: "Start for free",
  heroCta2: "Sign in to your workspace",
  sectionTitle: "Everything your team needs",
  sectionSubtitle: "Pick the apps that fit your workflow. They all share the same data.",
  ctaTitle: "Ready to get started?",
  ctaSubtitle: "Register your organization in minutes. No setup fees. No contracts.",
  image1Url: "",
  image2Url: "",
  accentColor: "#2563eb",
  bgColor: "#060d1f",
  heroAlign: "left",
  showStats: true,
  showMockup: true,
  heroBadgeVisible: true,
  socialLinks: {},
};

const STORAGE_KEY = "cloudbox-landing-config";

function loadConfig(): LandingConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULTS };
    return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULTS };
  }
}

// ── Logo ──────────────────────────────────────────────────────────────────────
function LogoMark({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      <rect x="2"  y="2"  width="12" height="12" rx="3" fill="currentColor" opacity="0.9" />
      <rect x="18" y="2"  width="12" height="12" rx="3" fill="currentColor" opacity="0.7" />
      <rect x="2"  y="18" width="12" height="12" rx="3" fill="currentColor" opacity="0.7" />
      <rect x="18" y="18" width="12" height="12" rx="3" fill="currentColor" opacity="0.5" />
    </svg>
  );
}

// ── Shared field wrapper ───────────────────────────────────────────────────────
function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-semibold text-white/60 uppercase tracking-wider block">{label}</label>
      {hint && <p className="text-xs text-white/25 -mt-0.5">{hint}</p>}
      {children}
    </div>
  );
}

const INPUT = "w-full bg-[#111827] border border-white/[0.08] text-white text-sm rounded-xl px-3.5 py-2.5 placeholder:text-white/20 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/15 transition-colors";
const TEXTAREA = INPUT + " resize-none";

// ── Toggle ────────────────────────────────────────────────────────────────────
function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="flex items-center justify-between gap-3 cursor-pointer group">
      <span className="text-sm text-white/55 group-hover:text-white/80 transition-colors">{label}</span>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={[
          "relative w-10 h-5.5 rounded-full transition-all duration-200 flex-shrink-0",
          checked ? "bg-blue-600" : "bg-white/10",
        ].join(" ")}
        style={{ height: 22, width: 40 }}
      >
        <span
          className="absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all duration-200"
          style={{ left: checked ? 20 : 2 }}
        />
      </button>
    </label>
  );
}

// ── Image uploader ─────────────────────────────────────────────────────────────
function ImageUploader({ label, hint, value, onChange }: {
  label: string; hint?: string; value: string; onChange: (url: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [dragging, setDragging] = useState(false);

  const upload = async (file: File) => {
    if (!file.type.startsWith("image/")) { setError("Images only."); return; }
    setUploading(true); setError("");
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed");
      onChange(data.url);
    } catch (e: any) {
      setError(e.message || "Upload failed");
    } finally { setUploading(false); }
  };

  return (
    <Field label={label} hint={hint}>
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files?.[0]; if (f) upload(f); }}
        onClick={() => !uploading && inputRef.current?.click()}
        className={[
          "relative cursor-pointer rounded-xl border-2 border-dashed transition-all overflow-hidden",
          dragging ? "border-blue-500 bg-blue-500/5" : "border-white/[0.08] hover:border-white/20 hover:bg-white/[0.02]",
        ].join(" ")}
      >
        {value ? (
          <div className="relative h-28">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={value} alt="" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-black/50 opacity-0 hover:opacity-100 flex items-center justify-center transition-opacity">
              <span className="text-white text-xs font-semibold">Click to replace</span>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center gap-2 py-7 px-4 text-center">
            <svg className="w-7 h-7 text-white/20" fill="none" viewBox="0 0 24 24">
              <path d="M4 16l4-4 4 4 4-6 4 6M4 20h16M12 4v8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <p className="text-white/25 text-xs">{uploading ? "Uploading…" : "Click or drag & drop"}</p>
          </div>
        )}
        {uploading && (
          <div className="absolute inset-0 bg-[#0e1527]/80 flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </div>
      {value && !uploading && (
        <button onClick={(e) => { e.stopPropagation(); onChange(""); }} className="text-xs text-white/25 hover:text-red-400 transition-colors mt-1.5">
          Remove
        </button>
      )}
      {error && <p className="text-xs text-red-400 mt-1">{error}</p>}
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f); e.target.value = ""; }} />
    </Field>
  );
}

// ── Accent presets ────────────────────────────────────────────────────────────
const ACCENT_PRESETS = [
  { label: "Blue",    value: "#2563eb" },
  { label: "Violet",  value: "#7c3aed" },
  { label: "Indigo",  value: "#4f46e5" },
  { label: "Emerald", value: "#059669" },
  { label: "Rose",    value: "#e11d48" },
  { label: "Amber",   value: "#d97706" },
  { label: "Cyan",    value: "#0891b2" },
];

const BG_PRESETS = [
  { label: "Deep Navy",  value: "#060d1f" },
  { label: "Midnight",   value: "#0a0a0f" },
  { label: "Dark Slate", value: "#0f172a" },
  { label: "Charcoal",   value: "#111214" },
  { label: "Forest",     value: "#071510" },
  { label: "Deep Wine",  value: "#120810" },
];

// ── Sections ──────────────────────────────────────────────────────────────────
const SECTIONS = [
  { id: "content", label: "Content",
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24">
        <path d="M4 6h16M4 12h10M4 18h12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
      </svg>
    ),
  },
  { id: "images", label: "Images",
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24">
        <rect x="3" y="3" width="18" height="18" rx="3" stroke="currentColor" strokeWidth="1.8"/>
        <circle cx="8.5" cy="8.5" r="1.5" stroke="currentColor" strokeWidth="1.5"/>
        <path d="M21 15l-5-5L5 21" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
  },
  { id: "theme", label: "Theme",
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8"/>
        <path d="M12 3v18M3 12h18M5.6 5.6l12.8 12.8M18.4 5.6L5.6 18.4" stroke="currentColor" strokeWidth="1.3" strokeOpacity="0.5"/>
      </svg>
    ),
  },
  { id: "style", label: "Style",
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24">
        <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6L12 2z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/>
      </svg>
    ),
  },
  { id: "announcement", label: "Announcement",
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24">
        <path d="M3 11v2a2 2 0 002 2h1l3 5v-5h6l4-3V6l-4-3H9L6 6H5a2 2 0 00-2 2v3z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/>
      </svg>
    ),
  },
] as const;

type SectionId = typeof SECTIONS[number]["id"];

// ── Live Preview ──────────────────────────────────────────────────────────────
function LivePreview({ config }: { config: LandingConfig }) {
  const accent = config.accentColor || DEFAULTS.accentColor;
  const bg = config.bgColor || DEFAULTS.bgColor;

  return (
    <div className="rounded-2xl overflow-hidden border border-white/[0.06] h-full flex flex-col" style={{ background: bg, minHeight: 520 }}>
      {/* Preview label */}
      <div className="px-4 py-2.5 border-b border-white/[0.06] flex items-center justify-between shrink-0">
        <span className="text-[10px] font-bold uppercase tracking-widest text-white/25">Live Preview</span>
        <div className="flex gap-1">
          <span className="w-2 h-2 rounded-full bg-white/10" />
          <span className="w-2 h-2 rounded-full bg-white/10" />
          <span className="w-2 h-2 rounded-full bg-white/10" />
        </div>
      </div>

      <div className="flex-1 overflow-auto p-5 space-y-5">
        {/* Nav */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <div className="w-5 h-5 rounded-md flex items-center justify-center text-white" style={{ background: accent }}>
              <LogoMark size={10} />
            </div>
            <span className="text-white font-bold text-[11px]">{BRAND.name}</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="px-2 py-0.5 rounded text-[9px] text-white/40 border border-white/10">Sign in</div>
            <div className="px-2 py-0.5 rounded text-[9px] text-white font-semibold" style={{ background: accent }}>Get Started</div>
          </div>
        </div>

        {/* Badge */}
        {config.heroBadgeVisible && (
          <div className="flex justify-center">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-semibold" style={{ background: `${accent}1a`, border: `1px solid ${accent}33`, color: accent }}>
              <span className="w-1 h-1 rounded-full animate-pulse" style={{ background: accent }} />
              <span className="line-clamp-1 max-w-[140px]">{config.badgeText}</span>
            </div>
          </div>
        )}

        {/* Hero */}
        <div className={config.heroAlign === "center" ? "text-center" : "text-left"}>
          <h1 className="text-white font-extrabold text-sm leading-snug whitespace-pre-line mb-2">
            {config.heroTitle}
          </h1>
          <p className="text-white/40 text-[10px] leading-relaxed mb-4 max-w-[220px]" style={{ margin: config.heroAlign === "center" ? "0 auto 16px" : undefined }}>
            {config.heroSubtitle}
          </p>
          <div className={["flex gap-1.5 flex-wrap", config.heroAlign === "center" ? "justify-center" : ""].join(" ")}>
            <div className="px-3 py-1 rounded-lg text-white text-[9px] font-bold" style={{ background: accent }}>{config.heroCta1}</div>
            <div className="px-3 py-1 rounded-lg text-white/50 text-[9px] font-semibold border border-white/10">{config.heroCta2}</div>
          </div>
        </div>

        {/* Images strip */}
        {(config.image1Url || config.image2Url) && (
          <div className="flex gap-2">
            {config.image1Url && (
              <div className="flex-1 h-14 rounded-lg overflow-hidden border border-white/10">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={config.image1Url} alt="" className="w-full h-full object-cover" />
              </div>
            )}
            {config.image2Url && (
              <div className="flex-1 h-14 rounded-lg overflow-hidden border border-white/10">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={config.image2Url} alt="" className="w-full h-full object-cover" />
              </div>
            )}
          </div>
        )}

        {/* Stats strip */}
        {config.showStats && (
          <div className="grid grid-cols-3 gap-1.5 border-t border-b border-white/[0.06] py-3">
            {["1 000+", "50+", "99.9%"].map((v, i) => (
              <div key={i} className="text-center">
                <div className="text-white font-bold text-xs">{v}</div>
                <div className="text-white/25 text-[8px]">{["Organizations", "Countries", "Uptime"][i]}</div>
              </div>
            ))}
          </div>
        )}

        {/* Apps section */}
        <div>
          <p className="text-white/50 text-[10px] font-semibold mb-2">{config.sectionTitle}</p>
          <div className="grid grid-cols-4 gap-1.5">
            {["CRM", "Analytics", "Forms", "Studio"].map((a) => (
              <div key={a} className="bg-white/[0.04] border border-white/[0.06] rounded-lg p-1.5 text-center">
                <div className="w-4 h-4 rounded mx-auto mb-0.5" style={{ background: `${accent}25` }} />
                <div className="text-white/40 text-[8px]">{a}</div>
              </div>
            ))}
          </div>
        </div>

        {/* CTA band */}
        <div className="rounded-xl p-4 text-center" style={{ background: `linear-gradient(135deg, ${accent}30, ${accent}15)`, border: `1px solid ${accent}25` }}>
          <p className="text-white font-bold text-[11px] mb-1">{config.ctaTitle}</p>
          <p className="text-white/35 text-[9px] mb-3">{config.ctaSubtitle}</p>
          <div className="inline-block px-3 py-1 bg-white text-[9px] font-bold rounded-lg" style={{ color: bg }}>
            Create your organization
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Auth states ───────────────────────────────────────────────────────────────
type AuthStatus = "loading" | "need-login" | "forbidden" | "ok";

// The daily start/end time picker shows this admin's own local wall-clock
// time, but the backend (and every viewer, regardless of their own
// timezone) compares against the server's clock in UTC — so the value must
// be converted at the boundary, not stored/compared as a bare "HH:MM".
function localTimeToUtc(hhmm: string): string {
  if (!hhmm) return "";
  const [h, m] = hhmm.split(":").map(Number);
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return `${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}`;
}
function utcTimeToLocal(hhmm: string): string {
  if (!hhmm) return "";
  const [h, m] = hhmm.split(":").map(Number);
  const d = new Date();
  d.setUTCHours(h, m, 0, 0);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function LandAdminPage() {
  const [config, setConfig] = useState<LandingConfig>({ ...DEFAULTS });
  const [authStatus, setAuthStatus] = useState<AuthStatus>("loading");
  const [activeSection, setActiveSection] = useState<SectionId>("content");
  const [savedToast, setSavedToast] = useState(false);
  const [hasUnsaved, setHasUnsaved] = useState(false);

  // Announcement banner — persisted server-side (unlike the rest of this page,
  // which is localStorage-only) since it must be visible to every visitor, not
  // just this browser.
  const [announcement, setAnnouncement] = useState({
    message: "", isActive: false,
    startDate: "", endDate: "", dailyStartTime: "", dailyEndTime: "",
  });
  const [schedulingEnabled, setSchedulingEnabled] = useState(false);
  const [announcementLoading, setAnnouncementLoading] = useState(true);
  const [announcementSaving, setAnnouncementSaving] = useState(false);
  const [announcementSaved, setAnnouncementSaved] = useState(false);
  const [unpublishing, setUnpublishing] = useState(false);

  useEffect(() => {
    try {
      const token = localStorage.getItem("access_token");
      if (!token) { setAuthStatus("need-login"); return; }
      const parts = token.split(".");
      if (parts.length !== 3) { setAuthStatus("need-login"); return; }
      const payload = JSON.parse(atob(parts[1].replace(/-/g, "+").replace(/_/g, "/")));
      if (payload.exp && payload.exp * 1000 < Date.now()) { setAuthStatus("need-login"); return; }
      if (payload.role !== "SUPER_ADMIN") { setAuthStatus("forbidden"); return; }
    } catch { setAuthStatus("need-login"); return; }
    setConfig(loadConfig());
    setAuthStatus("ok");
    api.get("/announcements")
      .then(({ data }) => {
        setAnnouncement({
          message: data.message ?? "",
          isActive: !!data.isActive,
          startDate: data.startDate ? String(data.startDate).slice(0, 10) : "",
          endDate: data.endDate ? String(data.endDate).slice(0, 10) : "",
          dailyStartTime: utcTimeToLocal(data.dailyStartTime ?? ""),
          dailyEndTime: utcTimeToLocal(data.dailyEndTime ?? ""),
        });
        setSchedulingEnabled(!!(data.startDate || data.endDate || data.dailyStartTime || data.dailyEndTime));
      })
      .catch(() => {})
      .finally(() => setAnnouncementLoading(false));
  }, []); // eslint-disable-line

  const saveAnnouncement = async () => {
    setAnnouncementSaving(true);
    try {
      await api.patch("/announcements", schedulingEnabled ? {
        ...announcement,
        dailyStartTime: localTimeToUtc(announcement.dailyStartTime),
        dailyEndTime: localTimeToUtc(announcement.dailyEndTime),
      } : {
        ...announcement,
        startDate: "", endDate: "", dailyStartTime: "", dailyEndTime: "",
      });
      setAnnouncementSaved(true);
      setTimeout(() => setAnnouncementSaved(false), 2500);
    } catch { /* noop */ } finally { setAnnouncementSaving(false); }
  };

  const unpublishAnnouncement = async () => {
    setUnpublishing(true);
    try {
      await api.post("/announcements/unpublish");
      setAnnouncement((prev) => ({ ...prev, isActive: false }));
    } catch { /* noop */ } finally { setUnpublishing(false); }
  };

  const set = useCallback((key: keyof LandingConfig, value: string | boolean) => {
    setConfig((prev) => ({ ...prev, [key]: value }));
    setHasUnsaved(true);
  }, []);

  const toggleSocial = useCallback((key: string) => {
    setConfig((prev) => {
      const next = { ...prev.socialLinks };
      if (key in next) delete next[key]; else next[key] = "";
      return { ...prev, socialLinks: next };
    });
    setHasUnsaved(true);
  }, []);

  const setSocialUrl = useCallback((key: string, url: string) => {
    setConfig((prev) => ({ ...prev, socialLinks: { ...prev.socialLinks, [key]: url } }));
    setHasUnsaved(true);
  }, []);

  const handleSave = () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    setSavedToast(true);
    setHasUnsaved(false);
    setTimeout(() => setSavedToast(false), 2500);
  };

  const handleReset = () => {
    if (!confirm("Reset all settings to defaults?")) return;
    const fresh = { ...DEFAULTS };
    setConfig(fresh);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(fresh));
    setHasUnsaved(false);
  };

  // ── Loading ───────────────────────────────────────────────────────────────
  if (authStatus === "loading") {
    return (
      <div className="min-h-screen bg-[#080e1d] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
            <LogoMark size={20} />
          </div>
          <p className="text-white/30 text-sm">Verifying access…</p>
        </div>
      </div>
    );
  }

  // ── Gate ──────────────────────────────────────────────────────────────────
  if (authStatus !== "ok") {
    return (
      <div className="min-h-screen bg-[#060d1f] flex items-center justify-center px-4">
        <div className="w-full max-w-sm bg-[#0e1527] border border-white/[0.08] rounded-2xl p-8 text-center shadow-2xl">
          <div className="flex justify-center mb-5">
            <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center">
              <LogoMark size={24} />
            </div>
          </div>
          <h1 className="text-white font-bold text-lg mb-2">Platform Admin</h1>
          <p className="text-white/40 text-sm mb-6 leading-relaxed">
            {authStatus === "forbidden"
              ? "Super Admin account required."
              : "Sign in with your platform administrator account to access landing page settings."}
          </p>
          <div className="space-y-2.5">
            <Link href="/login?redirect=/land-admin" className="flex items-center justify-center w-full px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold rounded-xl transition-all">
              Sign in as Platform Admin
            </Link>
            <Link href="/" className="flex items-center justify-center w-full px-5 py-2.5 border border-white/10 hover:border-white/20 text-white/50 hover:text-white text-sm font-semibold rounded-xl transition-all">
              Back to homepage
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ── Main editor ───────────────────────────────────────────────────────────
  return (
    <div className="h-full bg-[#080e1d] text-white flex flex-col overflow-hidden">

      {/* ── Top bar ── */}
      <header className="h-12 border-b border-white/[0.06] flex items-center justify-between px-5 shrink-0 bg-[#080e1d]/95 backdrop-blur-sm z-20">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center">
            <LogoMark size={14} />
          </div>
          <div className="flex items-center gap-2">
            <Link href="/dashboard" className="text-white/40 hover:text-white text-sm font-medium transition-colors">{BRAND.name}</Link>
            <span className="text-white/15 text-sm">/</span>
            <span className="text-white/70 text-sm font-semibold">Landing Page</span>
          </div>
          {hasUnsaved && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/25 text-amber-400 font-semibold">
              Unsaved
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <a href="/" target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-xs text-white/40 hover:text-white px-3 py-1.5 rounded-lg hover:bg-white/[0.05] transition-all">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 16 16">
              <path d="M10 3h3v3m0-3L7 9M4 4H3a1 1 0 00-1 1v8a1 1 0 001 1h8a1 1 0 001-1v-1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Preview site
          </a>
          <button onClick={handleReset}
            className="text-xs text-white/30 hover:text-white/60 px-3 py-1.5 rounded-lg hover:bg-white/[0.04] transition-all">
            Reset
          </button>
          <button onClick={handleSave}
            className="flex items-center gap-1.5 text-xs font-bold text-white px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 transition-all shadow-lg shadow-blue-900/40">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 16 16">
              <path d="M3 8l3 3 7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Save
          </button>
        </div>
      </header>

      {/* ── Body ── */}
      <div className="flex-1 flex overflow-hidden">

        {/* ── Section sidebar ── */}
        <aside className="w-44 border-r border-white/[0.06] flex flex-col shrink-0 py-3 gap-0.5 px-2">
          {SECTIONS.map((s) => (
            <button
              key={s.id}
              onClick={() => setActiveSection(s.id)}
              className={[
                "flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-all text-left w-full",
                activeSection === s.id
                  ? "bg-blue-600/15 text-blue-300"
                  : "text-white/40 hover:text-white/70 hover:bg-white/[0.04]",
              ].join(" ")}
            >
              {s.icon}
              {s.label}
            </button>
          ))}

          <div className="mt-auto pt-3 border-t border-white/[0.05] px-1">
            <p className="text-[10px] text-white/15 leading-relaxed">Changes are saved to local storage and applied to the public landing page.</p>
          </div>
        </aside>

        {/* ── Settings panel ── */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-lg mx-auto space-y-6">

            {/* ══ CONTENT ══ */}
            {activeSection === "content" && (
              <>
                <SectionHeading title="Content" subtitle="Edit all text displayed on the landing page." />

                <Group title="Hero">
                  <Field label="Main Title" hint="Use a newline to split onto two lines">
                    <textarea rows={3} value={config.heroTitle} onChange={(e) => set("heroTitle", e.target.value)}
                      className={TEXTAREA} placeholder={DEFAULTS.heroTitle} />
                  </Field>
                  <Field label="Subtitle">
                    <textarea rows={2} value={config.heroSubtitle} onChange={(e) => set("heroSubtitle", e.target.value)}
                      className={TEXTAREA} placeholder={DEFAULTS.heroSubtitle} />
                  </Field>
                  <Field label="Badge Text">
                    <input type="text" value={config.badgeText} onChange={(e) => set("badgeText", e.target.value)}
                      className={INPUT} placeholder={DEFAULTS.badgeText} />
                  </Field>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Primary Button">
                      <input type="text" value={config.heroCta1} onChange={(e) => set("heroCta1", e.target.value)}
                        className={INPUT} placeholder={DEFAULTS.heroCta1} />
                    </Field>
                    <Field label="Secondary Button">
                      <input type="text" value={config.heroCta2} onChange={(e) => set("heroCta2", e.target.value)}
                        className={INPUT} placeholder={DEFAULTS.heroCta2} />
                    </Field>
                  </div>
                </Group>

                <Group title="Apps Section">
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Section Title">
                      <input type="text" value={config.sectionTitle} onChange={(e) => set("sectionTitle", e.target.value)}
                        className={INPUT} placeholder={DEFAULTS.sectionTitle} />
                    </Field>
                    <Field label="Section Subtitle">
                      <input type="text" value={config.sectionSubtitle} onChange={(e) => set("sectionSubtitle", e.target.value)}
                        className={INPUT} placeholder={DEFAULTS.sectionSubtitle} />
                    </Field>
                  </div>
                </Group>

                <Group title="Call to Action Band">
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="CTA Title">
                      <input type="text" value={config.ctaTitle} onChange={(e) => set("ctaTitle", e.target.value)}
                        className={INPUT} placeholder={DEFAULTS.ctaTitle} />
                    </Field>
                    <Field label="CTA Subtitle">
                      <input type="text" value={config.ctaSubtitle} onChange={(e) => set("ctaSubtitle", e.target.value)}
                        className={INPUT} placeholder={DEFAULTS.ctaSubtitle} />
                    </Field>
                  </div>
                </Group>

                <Group title="Social Media">
                  <Field label="Platforms" hint="Select every platform you want linked, then paste its URL below. Shown as icons in the footer and Contact page.">
                    <div className="grid grid-cols-4 gap-2">
                      {SOCIAL_PLATFORMS.map((p) => {
                        const active = p.key in (config.socialLinks ?? {});
                        const Icon = p.icon;
                        return (
                          <button
                            key={p.key}
                            type="button"
                            onClick={() => toggleSocial(p.key)}
                            title={p.label}
                            className={[
                              "flex flex-col items-center gap-1.5 py-2.5 rounded-xl border text-[10px] font-semibold transition-all",
                              active
                                ? "bg-blue-600/15 border-blue-500/40 text-blue-300"
                                : "border-white/[0.08] text-white/40 hover:border-white/20 hover:text-white/70",
                            ].join(" ")}
                          >
                            <Icon className="w-4 h-4" />
                            {p.label}
                          </button>
                        );
                      })}
                    </div>
                  </Field>

                  {SOCIAL_PLATFORMS.filter((p) => p.key in (config.socialLinks ?? {})).map((p) => (
                    <Field key={p.key} label={`${p.label} URL`}>
                      <input type="url" value={config.socialLinks?.[p.key] ?? ""}
                        onChange={(e) => setSocialUrl(p.key, e.target.value)}
                        className={INPUT} placeholder={p.placeholder} />
                    </Field>
                  ))}
                </Group>
              </>
            )}

            {/* ══ IMAGES ══ */}
            {activeSection === "images" && (
              <>
                <SectionHeading title="Images" subtitle="Upload photos displayed in the hero section. Drag & drop or click to select." />
                <Group title="Hero Photos">
                  <ImageUploader label="Hero Image" hint="Shown on the right side of the hero" value={config.image1Url} onChange={(url) => set("image1Url", url)} />
                  <ImageUploader label="Secondary Image" hint="Shown alongside the hero image" value={config.image2Url} onChange={(url) => set("image2Url", url)} />
                </Group>
              </>
            )}

            {/* ══ THEME ══ */}
            {activeSection === "theme" && (
              <>
                <SectionHeading title="Theme" subtitle="Set the accent and background colors for the landing page." />

                <Group title="Accent Color">
                  <div className="flex flex-wrap gap-2.5 mb-4">
                    {ACCENT_PRESETS.map((p) => (
                      <button key={p.value} onClick={() => set("accentColor", p.value)} title={p.label}
                        className="flex flex-col items-center gap-1 group">
                        <div className="w-8 h-8 rounded-xl transition-transform group-hover:scale-110"
                          style={{ background: p.value, boxShadow: config.accentColor === p.value ? `0 0 0 2px #080e1d, 0 0 0 4px ${p.value}` : "none" }} />
                        <span className="text-[9px] text-white/25 group-hover:text-white/50 transition-colors">{p.label}</span>
                      </button>
                    ))}
                  </div>
                  <Field label="Custom Color">
                    <div className="flex items-center gap-2.5">
                      <input type="color" value={config.accentColor} onChange={(e) => set("accentColor", e.target.value)}
                        className="w-10 h-10 rounded-xl border border-white/10 bg-transparent cursor-pointer p-0.5 flex-shrink-0" />
                      <input type="text" value={config.accentColor} onChange={(e) => set("accentColor", e.target.value)}
                        className={INPUT + " font-mono"} placeholder="#2563eb" maxLength={7} />
                    </div>
                  </Field>
                </Group>

                <Group title="Background Color">
                  <div className="flex flex-wrap gap-2.5 mb-4">
                    {BG_PRESETS.map((p) => (
                      <button key={p.value} onClick={() => set("bgColor", p.value)} title={p.label}
                        className="flex flex-col items-center gap-1 group">
                        <div className="w-8 h-8 rounded-xl border border-white/15 transition-transform group-hover:scale-110"
                          style={{ background: p.value, boxShadow: config.bgColor === p.value ? `0 0 0 2px #080e1d, 0 0 0 4px rgba(255,255,255,0.3)` : "none" }} />
                        <span className="text-[9px] text-white/25 group-hover:text-white/50 transition-colors">{p.label}</span>
                      </button>
                    ))}
                  </div>
                  <Field label="Custom Background">
                    <div className="flex items-center gap-2.5">
                      <input type="color" value={config.bgColor} onChange={(e) => set("bgColor", e.target.value)}
                        className="w-10 h-10 rounded-xl border border-white/10 bg-transparent cursor-pointer p-0.5 flex-shrink-0" />
                      <input type="text" value={config.bgColor} onChange={(e) => set("bgColor", e.target.value)}
                        className={INPUT + " font-mono"} placeholder="#060d1f" maxLength={7} />
                    </div>
                  </Field>
                </Group>
              </>
            )}

            {/* ══ STYLE ══ */}
            {activeSection === "style" && (
              <>
                <SectionHeading title="Style" subtitle="Control the layout and visibility of landing page sections." />

                <Group title="Hero Layout">
                  <Field label="Text Alignment">
                    <div className="grid grid-cols-2 gap-2">
                      {(["left", "center"] as const).map((v) => (
                        <button key={v} onClick={() => set("heroAlign", v)}
                          className={[
                            "py-2.5 rounded-xl border text-sm font-semibold capitalize transition-all",
                            config.heroAlign === v
                              ? "bg-blue-600/15 border-blue-500/40 text-blue-300"
                              : "border-white/[0.08] text-white/40 hover:border-white/20 hover:text-white/70",
                          ].join(" ")}>
                          {v}
                        </button>
                      ))}
                    </div>
                  </Field>
                </Group>

                <Group title="Sections Visibility">
                  <div className="space-y-4">
                    <Toggle checked={config.heroBadgeVisible} onChange={(v) => set("heroBadgeVisible", v)} label="Show hero badge" />
                    <Toggle checked={config.showStats} onChange={(v) => set("showStats", v)} label="Show stats strip" />
                    <Toggle checked={config.showMockup} onChange={(v) => set("showMockup", v)} label="Show dashboard mockup" />
                  </div>
                </Group>
              </>
            )}

            {/* ══ ANNOUNCEMENT ══ */}
            {activeSection === "announcement" && (
              <>
                <SectionHeading title="Announcement" subtitle="A banner shown at the top of every page — landing site, CRM, and portal — until you turn it off." />

                {announcementLoading ? (
                  <p className="text-sm text-white/30">Loading…</p>
                ) : (
                  <Group title="Banner">
                    <Field label="Message" hint="The main text shown in the banner.">
                      <textarea rows={2} value={announcement.message}
                        onChange={(e) => setAnnouncement((p) => ({ ...p, message: e.target.value }))}
                        className={TEXTAREA} placeholder="We're rolling out a new Analytics dashboard this week." />
                    </Field>
                    <Toggle
                      checked={schedulingEnabled}
                      onChange={setSchedulingEnabled}
                      label="Limit to a schedule (off = shown at all times once published)"
                    />
                    {schedulingEnabled && (
                      <>
                        <Field label="Active date range" hint="Leave either side blank for no limit on that side.">
                          <div className="grid grid-cols-2 gap-3">
                            <input type="date" value={announcement.startDate}
                              onChange={(e) => setAnnouncement((p) => ({ ...p, startDate: e.target.value }))}
                              className={INPUT} />
                            <input type="date" value={announcement.endDate}
                              onChange={(e) => setAnnouncement((p) => ({ ...p, endDate: e.target.value }))}
                              className={INPUT} />
                          </div>
                        </Field>
                        <Field label="Daily time window" hint="The banner only shows during this time of day (your own local time), every day within the date range above. Leave both blank to show all day.">
                          <div className="grid grid-cols-2 gap-3">
                            <input type="time" value={announcement.dailyStartTime}
                              onChange={(e) => setAnnouncement((p) => ({ ...p, dailyStartTime: e.target.value }))}
                              className={INPUT} />
                            <input type="time" value={announcement.dailyEndTime}
                              onChange={(e) => setAnnouncement((p) => ({ ...p, dailyEndTime: e.target.value }))}
                              className={INPUT} />
                          </div>
                        </Field>
                      </>
                    )}
                    <Toggle
                      checked={announcement.isActive}
                      onChange={(v) => setAnnouncement((p) => ({ ...p, isActive: v }))}
                      label="Show this banner to everyone"
                    />

                    {announcement.isActive && announcement.message && (
                      <div className="rounded-xl overflow-hidden border border-white/[0.08]">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-white/25 px-3 pt-2.5 pb-1.5">Preview</p>
                        <div className="px-4 py-2.5 text-sm text-center text-white font-semibold"
                          style={{ background: "linear-gradient(90deg, #1e1b4b 0%, #3730a3 55%, #2563eb 100%)" }}>
                          {announcement.message}
                        </div>
                      </div>
                    )}

                    <div className="flex gap-2.5">
                      <button onClick={saveAnnouncement} disabled={announcementSaving}
                        className="flex-1 flex items-center justify-center gap-1.5 text-sm font-bold text-white px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 transition-all shadow-lg shadow-blue-900/40">
                        {announcementSaving ? "Publishing…" : announcementSaved ? "Published ✓" : "Publish banner"}
                      </button>
                      <button onClick={unpublishAnnouncement} disabled={unpublishing || !announcement.isActive}
                        className="px-4 py-2.5 rounded-xl text-sm font-semibold border border-white/[0.1] text-white/50 hover:text-white hover:border-white/25 disabled:opacity-40 transition-all">
                        {unpublishing ? "Unpublishing…" : "Unpublish"}
                      </button>
                    </div>
                  </Group>
                )}
              </>
            )}

          </div>
        </div>

        {/* ── Live preview ── */}
        <div className="w-[360px] border-l border-white/[0.06] p-4 shrink-0 overflow-y-auto">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-widest text-white/25">Preview</span>
            <a href="/" target="_blank" rel="noopener noreferrer" className="text-[10px] text-white/25 hover:text-white/60 transition-colors flex items-center gap-1">
              Open full
              <svg className="w-3 h-3" fill="none" viewBox="0 0 12 12">
                <path d="M7 2h3v3m0-3L5 7M2 3H1a1 1 0 00-1 1v6a1 1 0 001 1h6a1 1 0 001-1V9" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
              </svg>
            </a>
          </div>
          <LivePreview config={config} />
        </div>

      </div>

      {/* ── Saved toast ── */}
      <div className={[
        "fixed bottom-5 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2.5 px-5 py-2.5",
        "bg-emerald-500 text-white text-sm font-semibold rounded-xl shadow-2xl",
        "transition-all duration-300",
        savedToast ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2 pointer-events-none",
      ].join(" ")}>
        <svg className="w-4 h-4" fill="none" viewBox="0 0 16 16">
          <path d="M3 8l3 3 7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        Changes saved
      </div>
    </div>
  );
}

// ── Section heading ────────────────────────────────────────────────────────────
function SectionHeading({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="pb-2 border-b border-white/[0.06]">
      <h2 className="text-base font-bold text-white">{title}</h2>
      <p className="text-sm text-white/35 mt-0.5">{subtitle}</p>
    </div>
  );
}

// ── Group ──────────────────────────────────────────────────────────────────────
function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-4">
      <p className="text-[10px] font-bold uppercase tracking-widest text-white/25">{title}</p>
      {children}
    </div>
  );
}
