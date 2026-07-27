"use client";
import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";
import {
  FileText, Users, FolderOpen, FolderInput, Clock,
  Plus, ChevronDown, Menu, X, Settings, Palette,
} from "lucide-react";

// ── Nav items ─────────────────────────────────────────────────────────────────

const NAV = [
  { href: "/cloudforms",                label: "My Forms",       Icon: FileText,    key: "forms",   desc: "Forms you created"     },
  { href: "/cloudforms/shared",         label: "Shared Forms",   Icon: Users,       key: "users",   desc: "Shared with you"       },
  { href: "/cloudforms/folders",        label: "My Folders",     Icon: FolderOpen,  key: "folder",  desc: "Organize your forms"   },
  { href: "/cloudforms/shared-folders", label: "Shared Folders", Icon: FolderInput, key: "sfolder", desc: "Shared collections"    },
  { href: "/cloudforms/scheduled",      label: "Scheduled",      Icon: Clock,       key: "sched",   desc: "Scheduled configurations" },
];

// ── CF logo SVG ───────────────────────────────────────────────────────────────

function CFLogoMark({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <rect x="3" y="2" width="18" height="20" rx="4" fill="white" opacity="0.95" />
      <rect x="7"    y="7"    width="10"  height="2.5" rx="1.25" fill="#4c1d95" opacity="0.7"  />
      <rect x="7"    y="11.5" width="7"   height="2"   rx="1"    fill="#4c1d95" opacity="0.55" />
      <rect x="7"    y="15.5" width="8.5" height="2"   rx="1"    fill="#4c1d95" opacity="0.55" />
    </svg>
  );
}

// ── Left panel — nav only ─────────────────────────────────────────────────────

function LeftPanel({ pathname }: { pathname: string | null }) {
  return (
    <aside
      className="hidden lg:flex flex-col rounded-2xl bg-white shrink-0 overflow-hidden"
      style={{
        minWidth: "56px", maxWidth: "150px",
        boxShadow: "0 2px 10px rgba(0,0,0,0.07)",
        border: "1px solid rgba(255,255,255,0.8)",
      }}
    >
      <div className="px-3 pt-3 pb-2 shrink-0 hidden xl:block" style={{ borderBottom: "1px solid #f1f5f9" }}>
        <p className="text-[10.5px] font-bold text-slate-700">Navigation</p>
        <p className="text-[9px] text-slate-400 mt-0.5">Select a section</p>
      </div>
      <div className="lg:block xl:hidden h-2 shrink-0" />
      <div className="p-1.5 flex-1 content-start grid gap-1.5 grid-cols-1 xl:grid-cols-2">
        {NAV.map(({ href, label, Icon, key }) => {
          const isActive = pathname === href || (href !== "/cloudforms" && pathname?.startsWith(href));
          return (
            <Link key={href} href={href} title={label}>
              <div className={cn("cf-nav-card flex flex-col items-center justify-center rounded-xl cursor-pointer transition-all duration-200 select-none py-2.5", isActive ? "text-white" : "text-slate-500")}
                style={isActive ? { background: "linear-gradient(135deg,#7c3aed,#4f46e5)", boxShadow: "0 3px 10px rgba(124,58,237,0.3)" } : {}}>
                <Icon className={cn("w-[17px] h-[17px]", `cf-icon cf-icon-${key}`)} />
                <span className="hidden xl:block text-[9px] font-semibold text-center leading-tight px-0.5 mt-1.5">{label}</span>
              </div>
            </Link>
          );
        })}
      </div>
      <div className="p-1.5 shrink-0" style={{ borderTop: "1px solid #f1f5f9" }}>
        <Link href="/cloudforms?new=1">
          <button className="cf-new-form-btn w-full flex items-center justify-center gap-1.5 py-2 rounded-xl text-white text-[11px] font-bold transition-all"
            style={{ background: "linear-gradient(135deg,#7c3aed,#4f46e5)", boxShadow: "0 2px 8px rgba(124,58,237,0.25)" }}>
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden xl:inline">New Form</span>
          </button>
        </Link>
      </div>
    </aside>
  );
}

// ── Layout ────────────────────────────────────────────────────────────────────

export default function CloudFormsLayout({ children }: { children: React.ReactNode }) {
  const pathname        = usePathname();
  const router          = useRouter();
  const [mobileNav, setMobileNav] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const token = localStorage.getItem("access_token");
      if (!token) { router.push(`/login?redirect=${encodeURIComponent(pathname || "/cloudforms")}`); return; }
      const parts = token.split(".");
      if (parts.length === 3) {
        const payload = JSON.parse(atob(parts[1].replace(/-/g, "+").replace(/_/g, "/")));
        if (payload.exp && payload.exp * 1000 < Date.now()) { router.push(`/login?redirect=${encodeURIComponent(pathname || "/cloudforms")}`); return; }
      }
    } catch {}
    setReady(true);
  }, [router]);

  if (!ready) return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "#f5f3ff" }}>
      <div className="w-8 h-8 rounded-full border-[3px] border-violet-200 border-t-violet-600 animate-spin" />
    </div>
  );

  const isFullscreen = pathname?.includes("/builder");

  // ── Builder → full-screen + floating CF badge ─────────────────────────────
  if (isFullscreen) {
    return (
      <>
        {children}

        {/* Floating Cloud Forms badge — top-left corner of canvas, below builder header */}
        <div
          className="fixed z-[60] group"
          style={{ top: "54px", left: "12px" }}
        >
          {/* Badge pill */}
          <div
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl cursor-pointer select-none transition-all duration-200 group-hover:shadow-lg"
            style={{
              background: "linear-gradient(135deg, #4c1d95, #3730a3)",
              boxShadow: "0 2px 10px rgba(76,29,149,0.4)",
              border: "1px solid rgba(255,255,255,0.15)",
            }}
          >
            <CFLogoMark size={13} />
            <span className="text-white text-[10px] font-bold tracking-tight leading-none">
              Cloud Forms
            </span>
          </div>

          {/* Dropdown on hover */}
          <div
            className="absolute left-0 top-[calc(100%+6px)] hidden group-hover:flex flex-col rounded-xl overflow-hidden"
            style={{
              minWidth: 196,
              background: "linear-gradient(145deg, #1e1b4b, #2d2a5e)",
              boxShadow: "0 12px 32px rgba(0,0,0,0.4)",
              border: "1px solid rgba(255,255,255,0.12)",
            }}
          >
            <Link href="/cloudforms">
              <div className="flex items-center gap-2.5 px-3.5 py-2.5 hover:bg-white/10 transition-colors cursor-pointer"
                style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                <FileText className="w-3.5 h-3.5 text-violet-400" />
                <div>
                  <p className="text-[12px] font-semibold text-white">My Forms</p>
                  <p className="text-[10px] text-white/40">Back to forms list</p>
                </div>
              </div>
            </Link>
            <div>
              <div className="flex items-center gap-2.5 px-3.5 py-2.5 hover:bg-white/10 transition-colors cursor-pointer"
                style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                <Settings className="w-3.5 h-3.5 text-white/50" />
                <span className="text-[12px] font-semibold text-white/80">Form Settings</span>
              </div>
              <div className="flex items-center gap-2.5 px-3.5 py-2.5 hover:bg-white/10 transition-colors cursor-pointer">
                <Palette className="w-3.5 h-3.5 text-white/50" />
                <span className="text-[12px] font-semibold text-white/80">Themes &amp; Style</span>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  // ── Main CF app shell ─────────────────────────────────────────────────────
  return (
    <div className="h-full flex flex-col overflow-hidden" style={{ background: "#eef0f5" }}>

      {/* ══ Header ══════════════════════════════════════════════════════════ */}
      <header
        className="flex items-center px-3 sm:px-4 gap-3 shrink-0"
        style={{
          height: "44px",
          background: "linear-gradient(90deg, #1e1b4b 0%, #3730a3 55%, #4c1d95 100%)",
          boxShadow: "0 2px 12px rgba(30,27,75,0.4)",
        }}
      >
        {/* Hamburger — visible on < lg */}
        <button
          className="lg:hidden flex items-center justify-center w-7 h-7 rounded-lg transition-all"
          style={{ color: "rgba(196,181,253,0.8)", background: "rgba(255,255,255,0.08)" }}
          onClick={() => setMobileNav(true)}
        >
          <Menu className="w-4 h-4" />
        </button>

        {/* Logo */}
        <div className="flex items-center gap-2 shrink-0">
          <div
            className="w-6 h-6 rounded-lg flex items-center justify-center"
            style={{ background: "rgba(255,255,255,0.14)", border: "1px solid rgba(255,255,255,0.18)" }}
          >
            <CFLogoMark size={14} />
          </div>
          <div className="leading-none hidden sm:block">
            <div className="text-white font-bold text-[12.5px] tracking-tight">Cloud Forms</div>
            <div className="text-[8px] font-bold tracking-widest uppercase" style={{ color: "rgba(196,181,253,0.6)" }}>
              BUILDER
            </div>
          </div>
        </div>

        {/* Center links */}
        <nav className="hidden md:flex items-center gap-0.5 flex-1">
          <button
            onClick={() => router.push("/dashboard")}
            className="px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all hover:bg-white/10 hover:text-white"
            style={{ color: "rgba(196,181,253,0.7)" }}
          >
            Dashboard
          </button>
          <button
            className="px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all hover:bg-white/10 hover:text-white"
            style={{ color: "rgba(196,181,253,0.7)" }}
          >
            Upgrade
          </button>
        </nav>

        {/* User */}
        <div className="flex items-center gap-2 ml-auto shrink-0">
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-bold"
            style={{
              background: "linear-gradient(135deg, #7c3aed, #4f46e5)",
              boxShadow: "0 2px 6px rgba(124,58,237,0.45)",
            }}
          >
            CF
          </div>
          <div className="hidden lg:block leading-none">
            <div className="text-white text-[11px] font-semibold">Admin</div>
            <div className="text-[9px]" style={{ color: "rgba(196,181,253,0.6)" }}>Cloud Forms</div>
          </div>
          <ChevronDown className="w-3 h-3 hidden lg:block" style={{ color: "rgba(196,181,253,0.45)" }} />
        </div>
      </header>

      {/* ══ Three-panel body ════════════════════════════════════════════════ */}
      <div className="flex flex-1 overflow-hidden gap-2 p-2 lg:gap-3 lg:p-3">

        {/* ── Left nav panel ─────────────────────────────────────────────── */}
        <LeftPanel pathname={pathname} />

        {/* ── Center content ──────────────────────────────────────────────── */}
        <main
          className="flex-1 rounded-2xl bg-white overflow-hidden min-w-0"
          style={{ boxShadow: "0 2px 10px rgba(0,0,0,0.07)", border: "1px solid rgba(255,255,255,0.8)" }}
        >
          {children}
        </main>

      </div>

      {/* ══ Mobile nav overlay (< lg) ═══════════════════════════════════════ */}
      {mobileNav && (
        <>
          <div
            className="fixed inset-0 z-40 lg:hidden"
            style={{ background: "rgba(30,27,75,0.5)", backdropFilter: "blur(3px)" }}
            onClick={() => setMobileNav(false)}
          />
          <div
            className="fixed left-0 top-0 bottom-0 z-50 flex flex-col bg-white lg:hidden"
            style={{ width: "min(260px, 80vw)", boxShadow: "4px 0 24px rgba(0,0,0,0.15)" }}
          >
            {/* Mobile header */}
            <div
              className="flex items-center justify-between px-4 shrink-0"
              style={{
                height: "52px",
                background: "linear-gradient(90deg, #1e1b4b, #3730a3)",
              }}
            >
              <div className="flex items-center gap-2">
                <CFLogoMark size={16} />
                <span className="text-white font-bold text-[13px]">Cloud Forms</span>
              </div>
              <button
                onClick={() => setMobileNav(false)}
                className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-white/10 transition-all"
                style={{ color: "rgba(196,181,253,0.8)" }}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Mobile nav list */}
            <nav className="flex-1 overflow-auto p-3 space-y-1">
              {NAV.map(({ href, label, Icon, desc }) => {
                const isActive =
                  pathname === href || (href !== "/cloudforms" && pathname?.startsWith(href));
                return (
                  <Link key={href} href={href} onClick={() => setMobileNav(false)}>
                    <div
                      className={cn(
                        "flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all",
                        isActive ? "text-white" : "text-slate-600 hover:bg-violet-50 hover:text-violet-700"
                      )}
                      style={
                        isActive
                          ? { background: "linear-gradient(135deg, #7c3aed, #4f46e5)" }
                          : {}
                      }
                    >
                      <Icon className="w-[17px] h-[17px] shrink-0" />
                      <div>
                        <p className="text-[13px] font-semibold leading-tight">{label}</p>
                        <p className={cn("text-[10px] mt-0.5", isActive ? "text-white/60" : "text-slate-400")}>
                          {desc}
                        </p>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </nav>

            <div className="p-3 shrink-0" style={{ borderTop: "1px solid #f1f5f9" }}>
              <Link href="/cloudforms?new=1" onClick={() => setMobileNav(false)}>
                <button
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-white text-[12px] font-bold"
                  style={{ background: "linear-gradient(135deg, #7c3aed, #4f46e5)" }}
                >
                  <Plus className="w-4 h-4" />
                  New Form
                </button>
              </Link>
            </div>
          </div>
        </>
      )}

      {/* ══ Icon hover animations ═══════════════════════════════════════════ */}
      <style jsx global>{`
        .cf-nav-card:not([style*="linear-gradient"]):hover {
          background: rgba(124,58,237,0.09) !important;
          color: #7c3aed !important;
        }

        .cf-nav-card:hover .cf-icon-forms   { animation: cfi-wobble 0.45s ease; }
        .cf-nav-card:hover .cf-icon-users   { animation: cfi-pulse  0.4s  ease; }
        .cf-nav-card:hover .cf-icon-folder  { animation: cfi-flip   0.4s  ease; }
        .cf-nav-card:hover .cf-icon-sfolder { animation: cfi-zap    0.4s  ease; }

        .cf-new-form-btn:hover  { transform: translateY(-1px); box-shadow: 0 5px 16px rgba(124,58,237,0.42) !important; }
        .cf-quick-action:hover  { background: rgba(124,58,237,0.06); }
        .cf-template-opt:hover  { border-color: #c4b5fd !important; background: #f5f3ff !important; transform: translateY(-1px); }

        @keyframes cfi-wobble {
          0%,100% { transform: rotate(0deg)    scale(1);    }
          25%     { transform: rotate(-14deg)  scale(1.15); }
          55%     { transform: rotate(10deg)   scale(1.08); }
          80%     { transform: rotate(-6deg)   scale(1.02); }
        }
        @keyframes cfi-pulse {
          0%,100% { transform: scale(1);    }
          50%     { transform: scale(1.4);  }
        }
        @keyframes cfi-flip {
          0%   { transform: scaleX(1);  }
          50%  { transform: scaleX(-1); }
          100% { transform: scaleX(1);  }
        }
        @keyframes cfi-zap {
          0%   { transform: translateY(0)    scale(1);    }
          28%  { transform: translateY(-5px) scale(1.25); }
          55%  { transform: translateY(2px)  scale(0.93); }
          80%  { transform: translateY(-1px) scale(1.02); }
          100% { transform: translateY(0)    scale(1);    }
        }
      `}</style>
    </div>
  );
}
