"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { BRAND } from "@/lib/core-brand";

// ── Cloud Forms splash screen ─────────────────────────────────────────────────
// Shown when the user launches Cloud Forms from the app switcher.
// Checks for an existing CRM auth token (shared login) and redirects
// to the forms builder. No separate login required — same session as CRM.

function FormsAppIcon() {
  return (
    <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
      {/* Document body */}
      <rect x="10" y="8" width="44" height="48" rx="8" fill="white" opacity="0.15" />
      <rect x="10" y="8" width="44" height="48" rx="8" stroke="white" strokeWidth="2" opacity="0.6" />
      {/* Lines */}
      <rect x="20" y="22" width="24" height="3.5" rx="1.75" fill="white" opacity="0.8" />
      <rect x="20" y="30" width="18" height="3" rx="1.5" fill="white" opacity="0.6" />
      <rect x="20" y="37" width="20" height="3" rx="1.5" fill="white" opacity="0.6" />
      <rect x="20" y="44" width="14" height="3" rx="1.5" fill="white" opacity="0.4" />
      {/* Checkbox accent */}
      <rect x="44" y="29" width="8" height="8" rx="2" fill="white" fillOpacity="0.25" stroke="white" strokeWidth="1.5" strokeOpacity="0.6" />
      <path d="M46 33l2 2 4-4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.9" />
    </svg>
  );
}

export default function CloudFormsSplash() {
  const router = useRouter();
  const [visible, setVisible] = useState(false);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    // Check shared CRM auth token
    const token = localStorage.getItem("access_token");
    if (!token) {
      router.replace("/login?redirect=/cloud-forms");
      return;
    }

    // Entrance animation (slight delay so CSS transition fires)
    const t0 = setTimeout(() => setVisible(true), 60);
    // Start exit after 1.6s
    const t1 = setTimeout(() => setLeaving(true), 1600);
    // Navigate to Cloud Forms app
    const t2 = setTimeout(() => router.replace("/cloudforms"), 2000);

    return () => { clearTimeout(t0); clearTimeout(t1); clearTimeout(t2); };
  }, [router]);

  return (
    <div
      className="fixed inset-0 flex items-center justify-center overflow-hidden"
      style={{ background: "linear-gradient(145deg, #1e1b4b 0%, #3730a3 45%, #4f46e5 75%, #6d28d9 100%)" }}
    >
      {/* Background orbs */}
      <div
        className="absolute rounded-full opacity-20 blur-3xl"
        style={{ width: 480, height: 480, top: "5%", left: "-10%",
          background: "radial-gradient(circle, #818cf8, transparent 70%)" }}
      />
      <div
        className="absolute rounded-full opacity-20 blur-3xl"
        style={{ width: 400, height: 400, bottom: "0%", right: "-5%",
          background: "radial-gradient(circle, #a78bfa, transparent 70%)" }}
      />

      {/* Content */}
      <div
        style={{
          transition: leaving
            ? "opacity 0.4s ease, transform 0.4s ease"
            : "opacity 0.6s cubic-bezier(0.16,1,0.3,1), transform 0.6s cubic-bezier(0.16,1,0.3,1)",
          opacity: visible && !leaving ? 1 : 0,
          transform: visible && !leaving ? "translateY(0) scale(1)" : "translateY(24px) scale(0.96)",
        }}
        className="flex flex-col items-center gap-8"
      >
        {/* App icon */}
        <div className="relative">
          {/* Icon container */}
          <div
            className="relative w-32 h-32 rounded-[28px] flex items-center justify-center"
            style={{
              background: "rgba(255,255,255,0.10)",
              backdropFilter: "blur(20px)",
              WebkitBackdropFilter: "blur(20px)",
              border: "1.5px solid rgba(255,255,255,0.25)",
              boxShadow: "0 20px 60px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.2)",
            }}
          >
            <FormsAppIcon />
          </div>
        </div>

        {/* Brand text */}
        <div className="text-center space-y-2">
          <h1
            className="text-white font-bold tracking-tight"
            style={{ fontSize: "2.2rem", letterSpacing: "-0.02em" }}
          >
            Cloud Forms
          </h1>
          <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.95rem" }}>
            by {BRAND.name}
          </p>
        </div>

        {/* Signal waves */}
        <div className="relative flex items-center justify-center" style={{ width: 72, height: 72 }}>
          {[0, 1, 2].map(i => (
            <div
              key={i}
              className="cf-splash-wave"
              style={{ animationDelay: `${i * 0.22}s` }}
            />
          ))}
          <div
            className="relative z-10 rounded-full"
            style={{ width: 13, height: 13, background: "rgba(255,255,255,0.95)", boxShadow: "0 0 12px rgba(255,255,255,0.6)" }}
          />
        </div>

        <style jsx global>{`
          @keyframes cf-splash-signal {
            0%   { width: 13px; height: 13px; opacity: 0.75; }
            100% { width: 72px; height: 72px; opacity: 0;    }
          }
          .cf-splash-wave {
            position: absolute;
            border: 2px solid rgba(255,255,255,0.65);
            border-radius: 50%;
            animation: cf-splash-signal 0.7s ease-out 2 forwards;
          }
        `}</style>
      </div>

      {/* Bottom "Cloudbox" credit */}
      <div
        className="absolute bottom-8 text-center"
        style={{
          color: "rgba(255,255,255,0.25)",
          fontSize: "0.75rem",
          letterSpacing: "0.05em",
          transition: "opacity 0.6s",
          opacity: visible && !leaving ? 1 : 0,
        }}
      >
        CLOUDBOX PLATFORM
      </div>
    </div>
  );
}
