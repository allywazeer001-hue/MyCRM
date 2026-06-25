"use client";
import { useEffect, useState } from "react";

// ── CRM splash: dynamic data-flow simulation ─────────────────────────────────

const GRID_ROWS = 9;
const GRID_COLS = 14;

// A handful of "live" data stats that increment during loading
const COUNTERS = [
  { label: "Records",   from: 0, to: 2841  },
  { label: "Modules",   from: 0, to: 14    },
  { label: "Workflows", from: 0, to: 38    },
];

function pickTileColor(r: number, c: number): string {
  const COLORS = [
    "bg-blue-600","bg-blue-500","bg-indigo-600","bg-indigo-500",
    "bg-blue-700","bg-sky-500","bg-violet-600","bg-cyan-600",
    "bg-blue-400","bg-indigo-400",
  ];
  return COLORS[(r * 7 + c * 13) % COLORS.length];
}

function tileOpacity(r: number, c: number): number {
  return [0.07, 0.10, 0.12, 0.09, 0.06][(r * 3 + c * 5) % 5];
}

function tileDelay(r: number, c: number): number {
  const cx = GRID_COLS / 2;
  const cy = GRID_ROWS / 2;
  return Math.sqrt((c - cx) ** 2 + (r - cy) ** 2) * 55;
}

// Random node positions for the "circuit board" dots
const NODE_POSITIONS = Array.from({ length: 18 }, (_, i) => ({
  top:  `${8 + (i * 17 + 5) % 84}%`,
  left: `${5 + (i * 23 + 3) % 90}%`,
  delay: `${(i * 0.18).toFixed(2)}s`,
  size: [4, 5, 6, 4, 5][i % 5],
}));

interface SplashScreenProps {
  show: boolean;
  variant?: "crm" | "cf";
}

export function SplashScreen({ show, variant = "crm" }: SplashScreenProps) {
  const [mounted, setMounted] = useState(false);
  const [hiding,  setHiding]  = useState(false);
  const [progress, setProgress] = useState(0);
  const [counters, setCounters] = useState(COUNTERS.map(c => c.from));

  useEffect(() => {
    if (show) {
      setMounted(true);
      setHiding(false);
      setProgress(0);
      setCounters(COUNTERS.map(c => c.from));
    } else if (mounted) {
      setHiding(true);
      const t = setTimeout(() => setMounted(false), 650);
      return () => clearTimeout(t);
    }
  }, [show, mounted]);

  // Animate progress bar
  useEffect(() => {
    if (!mounted || hiding) return;
    const STEPS = [
      { target: 22,  delay: 100  },
      { target: 55,  delay: 600  },
      { target: 80,  delay: 1100 },
      { target: 100, delay: 1700 },
    ];
    const timers: ReturnType<typeof setTimeout>[] = [];
    STEPS.forEach(({ target, delay }) => {
      timers.push(setTimeout(() => setProgress(target), delay));
    });
    return () => timers.forEach(clearTimeout);
  }, [mounted, hiding]);

  // Animate counters
  useEffect(() => {
    if (!mounted || hiding) return;
    const timers: ReturnType<typeof setTimeout>[] = [];
    COUNTERS.forEach((c, idx) => {
      const steps = 30;
      for (let s = 1; s <= steps; s++) {
        timers.push(setTimeout(() => {
          setCounters(prev => {
            const next = [...prev];
            next[idx] = Math.round((c.to * s) / steps);
            return next;
          });
        }, 400 + s * 44 + idx * 80));
      }
    });
    return () => timers.forEach(clearTimeout);
  }, [mounted, hiding]);

  if (!mounted) return null;

  // ── CRM / default variant ────────────────────────────────────────────────────
  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center overflow-hidden"
      style={{
        background: "linear-gradient(135deg, #080e1e 0%, #0d1f3c 40%, #0a122b 100%)",
        opacity: hiding ? 0 : 1,
        transition: "opacity 0.65s cubic-bezier(0.4,0,0.2,1)",
      }}
    >
      {/* ── Tile grid ── */}
      <div
        className="absolute inset-0 grid"
        style={{
          gridTemplateRows: `repeat(${GRID_ROWS}, 1fr)`,
          gridTemplateColumns: `repeat(${GRID_COLS}, 1fr)`,
        }}
      >
        {Array.from({ length: GRID_ROWS }, (_, r) =>
          Array.from({ length: GRID_COLS }, (_, c) => (
            <div
              key={`${r}-${c}`}
              className={`${pickTileColor(r, c)} border border-white/[0.025]`}
              style={{
                opacity: 0,
                animation: `splashTile 0.5s ease forwards`,
                animationDelay: `${tileDelay(r, c)}ms`,
                "--tile-op": tileOpacity(r, c),
              } as React.CSSProperties}
            />
          ))
        )}
      </div>

      {/* ── Fine grid lines overlay ── */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ opacity: 0.045 }}>
        <defs>
          <pattern id="sp-grid" width="52" height="52" patternUnits="userSpaceOnUse">
            <path d="M 52 0 L 0 0 0 52" fill="none" stroke="white" strokeWidth="0.8" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#sp-grid)" />
      </svg>

      {/* ── Circuit node dots ── */}
      <div className="absolute inset-0 pointer-events-none">
        {NODE_POSITIONS.map((n, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-blue-400"
            style={{
              top: n.top, left: n.left,
              width: n.size, height: n.size,
              opacity: 0,
              animation: `nodeAppear 0.4s ease forwards`,
              animationDelay: n.delay,
              boxShadow: `0 0 ${n.size * 2}px rgba(96,165,250,0.5)`,
            }}
          />
        ))}
      </div>

      {/* ── Floating glow orbs ── */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute rounded-full" style={{ width: 480, height: 480, top: "5%", left: "-5%", background: "radial-gradient(circle, rgba(59,130,246,0.12) 0%, transparent 70%)", animation: "orbDrift 7s ease-in-out infinite" }} />
        <div className="absolute rounded-full" style={{ width: 360, height: 360, bottom: "10%", right: "2%",  background: "radial-gradient(circle, rgba(99,102,241,0.10) 0%, transparent 70%)", animation: "orbDrift 9s ease-in-out infinite reverse" }} />
        <div className="absolute rounded-full" style={{ width: 220, height: 220, top: "52%", left: "48%",  background: "radial-gradient(circle, rgba(6,182,212,0.08) 0%, transparent 70%)", animation: "orbDrift 5s ease-in-out infinite 1.5s" }} />
      </div>

      {/* ── Scan line ── */}
      <div
        className="absolute left-0 right-0 pointer-events-none"
        style={{
          height: "2px",
          background: "linear-gradient(90deg, transparent 0%, rgba(59,130,246,0.25) 20%, rgba(99,102,241,0.4) 50%, rgba(59,130,246,0.25) 80%, transparent 100%)",
          animation: "scanLine 2.8s linear infinite",
          top: 0,
        }}
      />

      {/* ── Center content ── */}
      <div
        className="relative z-10 flex flex-col items-center gap-5"
        style={{ animation: "splashCenter 0.85s cubic-bezier(0.16,1,0.3,1) 0.3s both" }}
      >
        {/* Logo */}
        <div className="relative">
          <div
            className="w-[72px] h-[72px] rounded-[20px] flex items-center justify-center"
            style={{
              background: "linear-gradient(135deg, #2563eb 0%, #4f46e5 50%, #7c3aed 100%)",
              boxShadow: "0 0 70px rgba(79,70,229,0.5), 0 20px 60px rgba(0,0,0,0.55)",
            }}
          >
            <svg width="38" height="38" viewBox="0 0 40 40" fill="none">
              <rect x="4"  y="4"  width="14" height="14" rx="3" fill="white" fillOpacity="0.95" />
              <rect x="22" y="4"  width="14" height="14" rx="3" fill="white" fillOpacity="0.6"  />
              <rect x="4"  y="22" width="14" height="14" rx="3" fill="white" fillOpacity="0.6"  />
              <rect x="22" y="22" width="14" height="14" rx="3" fill="white" fillOpacity="0.28" />
            </svg>
          </div>
          {/* Pulse rings */}
          <div className="absolute inset-0 rounded-[20px] border-2 border-blue-400/50"   style={{ animation: "ringPulse 2s ease-out infinite" }} />
          <div className="absolute inset-0 rounded-[20px] border border-violet-400/35"  style={{ animation: "ringPulse 2s ease-out infinite 0.65s" }} />
        </div>

        {/* Brand */}
        <div className="text-center space-y-0.5">
          <h1 className="text-[28px] font-bold text-white tracking-tight"
              style={{ textShadow: "0 2px 24px rgba(79,70,229,0.55)" }}>
            Cloudbox
          </h1>
          <p className="text-blue-300/70 text-[11px] font-semibold tracking-[0.22em] uppercase">
            Enterprise CRM Platform
          </p>
        </div>

        {/* Live counters */}
        <div className="flex items-center gap-6">
          {COUNTERS.map((c, i) => (
            <div key={i} className="text-center">
              <p className="text-[18px] font-bold tabular-nums"
                 style={{ background: "linear-gradient(90deg,#38bdf8,#818cf8)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                {counters[i].toLocaleString()}
              </p>
              <p className="text-[9px] font-bold uppercase tracking-widest text-blue-300/50 mt-0.5">{c.label}</p>
            </div>
          ))}
        </div>

        {/* Progress bar */}
        <div className="w-52 h-[3px] rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.08)" }}>
          <div
            className="h-full rounded-full"
            style={{
              width: `${progress}%`,
              background: "linear-gradient(90deg, #38bdf8, #4f46e5, #7c3aed)",
              transition: "width 0.55s cubic-bezier(0.4,0,0.2,1)",
              boxShadow: "0 0 12px rgba(99,102,241,0.5)",
            }}
          />
        </div>

        {/* Pulsing dots */}
        <div className="flex gap-1.5">
          {[0, 1, 2, 3].map(i => (
            <div key={i} className="w-1.5 h-1.5 rounded-full"
              style={{
                background: i % 2 === 0 ? "#60a5fa" : "#818cf8",
                opacity: 0.7,
                animation: "dotPop 1.6s ease-in-out infinite",
                animationDelay: `${i * 0.18}s`,
              }}
            />
          ))}
        </div>
      </div>

      {/* ── Keyframes ── */}
      <style>{`
        @keyframes splashTile {
          from { opacity: 0; transform: scale(0.82); }
          to   { opacity: var(--tile-op, 0.08); transform: scale(1); }
        }
        @keyframes nodeAppear {
          from { opacity: 0; transform: scale(0); }
          to   { opacity: 0.55; transform: scale(1); }
        }
        @keyframes orbDrift {
          0%,100% { transform: translateY(0) scale(1); }
          50%     { transform: translateY(-28px) scale(1.05); }
        }
        @keyframes scanLine {
          from { top: 0%; }
          to   { top: 100%; }
        }
        @keyframes splashCenter {
          from { opacity: 0; transform: translateY(22px) scale(0.95); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes ringPulse {
          0%   { transform: scale(1);   opacity: 0.75; }
          100% { transform: scale(1.7); opacity: 0;    }
        }
        @keyframes dotPop {
          0%,80%,100% { transform: scale(0.55); opacity: 0.35; }
          40%          { transform: scale(1);    opacity: 1;    }
        }
      `}</style>
    </div>
  );
}
