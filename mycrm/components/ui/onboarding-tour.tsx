"use client";
import { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { X, ArrowRight, ArrowLeft, Lightbulb } from "lucide-react";
import { useAuthStore } from "@/store/auth.store";
import { BRAND } from "@/lib/core-brand";

// ─── Types ────────────────────────────────────────────────────────────────────

interface SpotlightRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

interface TourStep {
  selector: string;
  title: string;
  description: string;
}

// ─── Step definitions ─────────────────────────────────────────────────────────

const STEPS: TourStep[] = [
  {
    selector: 'a[href="/dashboard"]',
    title: "Your Dashboard",
    description:
      "Customize your workspace with widgets — KPI charts, record counts, analytics, and more.",
  },
  {
    selector: 'a[href="/analytics"]',
    title: "Data Visualization",
    description:
      "Create real-time dashboards with bar charts, pie charts, KPIs, and custom targets connected directly to your data.",
  },
  {
    selector: 'a[href="/workflows"]',
    title: "Workflows",
    description:
      "Automate your processes. Set triggers on record events and define multi-step actions like notifications, field updates, or approvals.",
  },
  {
    selector: 'a[href="/forms"]',
    title: "Forms",
    description:
      "Build public-facing forms with conditional logic. Share a link and responses automatically create records in your modules.",
  },
  {
    selector: 'a[href="/studio"]',
    title: "Module Studio",
    description:
      "Design your data structure. Create custom modules, fields, and relationships — no code needed.",
  },
  {
    selector: 'a[href="/settings"]',
    title: "Settings & Admin",
    description:
      `Manage your team, configure roles, set up units, and customize your ${BRAND.name} workspace.`,
  },
];

const SPOTLIGHT_PADDING = 6; // px around the target element
const TOOLTIP_WIDTH = 300;   // px
const TOOLTIP_GAP = 16;      // gap between spotlight edge and tooltip

// ─── Main component ───────────────────────────────────────────────────────────

export function OnboardingTour() {
  const user = useAuthStore((s) => s.user);

  const [mounted, setMounted] = useState(false);
  const [active, setActive] = useState(false);
  const [step, setStep] = useState(0);
  const [rect, setRect] = useState<SpotlightRect | null>(null);

  // ── Compute spotlight rect for a given step index ──
  const updateRect = useCallback((stepIdx: number) => {
    const { selector } = STEPS[stepIdx];
    const el = document.querySelector<HTMLElement>(selector);
    if (!el) {
      setRect(null);
      return;
    }
    const r = el.getBoundingClientRect();
    setRect({
      top: r.top - SPOTLIGHT_PADDING,
      left: r.left - SPOTLIGHT_PADDING,
      width: r.width + SPOTLIGHT_PADDING * 2,
      height: r.height + SPOTLIGHT_PADDING * 2,
    });
  }, []);

  // ── On mount: SSR guard + decide whether to show tour ──
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || !user?.id) return;

    const doneKey    = `tour_done_${user.id}`;
    const loginKey   = `tour_logins_${user.id}`;

    // Never show again once dismissed/finished
    if (localStorage.getItem(doneKey)) return;

    // Count total logins for this user
    const logins = parseInt(localStorage.getItem(loginKey) ?? "0", 10) + 1;
    localStorage.setItem(loginKey, String(logins));

    // Only show on the very first login — frequent users don't need guidance
    if (logins > 1) {
      localStorage.setItem(doneKey, "1");
      return;
    }

    // Delay so the sidebar has time to render before we measure elements
    const timer = setTimeout(() => {
      setActive(true);
      updateRect(0);
    }, 1400);

    return () => clearTimeout(timer);
  }, [mounted, user?.id, updateRect]);

  // ── Recalculate on window resize while tour is active ──
  useEffect(() => {
    if (!active) return;

    const handleResize = () => updateRect(step);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [active, step, updateRect]);

  // ── Finish: mark done in localStorage, hide tour ──
  const finish = useCallback(() => {
    if (user?.id) {
      localStorage.setItem(`tour_done_${user.id}`, "1");
    }
    setActive(false);
  }, [user?.id]);

  // ── Navigate to next step ──
  const goNext = useCallback(() => {
    if (step === STEPS.length - 1) {
      finish();
      return;
    }
    const next = step + 1;
    setStep(next);
    updateRect(next);
  }, [step, finish, updateRect]);

  // ── Navigate to previous step ──
  const goBack = useCallback(() => {
    if (step === 0) return;
    const prev = step - 1;
    setStep(prev);
    updateRect(prev);
  }, [step, updateRect]);

  // ── Don't render on server or when inactive ──
  if (!mounted || !active) return null;

  return createPortal(
    <TourOverlay
      step={step}
      rect={rect}
      onSkip={finish}
      onNext={goNext}
      onBack={goBack}
      isLast={step === STEPS.length - 1}
    />,
    document.body
  );
}

// ─── Overlay (backdrop + spotlight + tooltip) ─────────────────────────────────

interface TourOverlayProps {
  step: number;
  rect: SpotlightRect | null;
  onSkip: () => void;
  onNext: () => void;
  onBack: () => void;
  isLast: boolean;
}

function TourOverlay({ step, rect, onSkip, onNext, onBack, isLast }: TourOverlayProps) {
  const currentStep = STEPS[step];
  const tooltipPos = rect ? computeTooltipPosition(rect) : null;

  return (
    <>
      {/* ── Dark backdrop — clicking skips the tour ── */}
      <div
        className="fixed inset-0 z-[9990] pointer-events-auto"
        style={{ background: "transparent" }}
        onClick={onSkip}
        aria-label="Skip tour"
      />

      {/* ── Spotlight cutout ── */}
      {rect && (
        <div
          className="fixed z-[9991] rounded-xl pointer-events-none"
          style={{
            top: rect.top,
            left: rect.left,
            width: rect.width,
            height: rect.height,
            boxShadow: "0 0 0 9999px rgba(4,8,20,0.72), 0 0 0 2px rgba(59,130,246,0.7), 0 0 24px rgba(59,130,246,0.35)",
            transition: "top 300ms ease, left 300ms ease, width 300ms ease, height 300ms ease",
          }}
        />
      )}

      {/* ── Tooltip card ── */}
      {tooltipPos && (
        <div
          className="fixed z-[9992] pointer-events-auto"
          style={{
            top: tooltipPos.top,
            left: tooltipPos.left,
            width: TOOLTIP_WIDTH,
            transition: "top 300ms ease, left 300ms ease",
          }}
          // Stop clicks inside the tooltip from bubbling to the backdrop
          onClick={(e) => e.stopPropagation()}
        >
          <TooltipCard
            step={step}
            title={currentStep.title}
            description={currentStep.description}
            onSkip={onSkip}
            onNext={onNext}
            onBack={onBack}
            isLast={isLast}
          />
        </div>
      )}
    </>
  );
}

// ─── Tooltip card ─────────────────────────────────────────────────────────────

interface TooltipCardProps {
  step: number;
  title: string;
  description: string;
  onSkip: () => void;
  onNext: () => void;
  onBack: () => void;
  isLast: boolean;
}

function TooltipCard({
  step,
  title,
  description,
  onSkip,
  onNext,
  onBack,
  isLast,
}: TooltipCardProps) {
  return (
    /* ── Gradient border wrapper ─────────────────────────────────────── */
    <div style={{
      background: "linear-gradient(135deg, rgba(59,130,246,0.55) 0%, rgba(139,92,246,0.45) 50%, rgba(6,182,212,0.45) 100%)",
      padding: "1px",
      borderRadius: "20px",
      boxShadow: "0 0 48px rgba(59,130,246,0.14), 0 24px 72px rgba(0,0,0,0.7)",
    }}>
      {/* ── Glass inner surface ─────────────────────────────────────────── */}
      <div style={{
        background: "rgba(7, 11, 26, 0.82)",
        backdropFilter: "blur(32px) saturate(180%)",
        WebkitBackdropFilter: "blur(32px) saturate(180%)",
        borderRadius: "19px",
        overflow: "hidden",
      }}>

        {/* Top shimmer line */}
        <div style={{
          height: "1px",
          background: "linear-gradient(90deg, transparent 0%, rgba(59,130,246,0.8) 30%, rgba(139,92,246,0.8) 70%, transparent 100%)",
        }} />

        <div style={{ padding: "20px" }}>

          {/* Header row */}
          <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 12 }}>

            {/* Glowing icon */}
            <div style={{
              width: 34, height: 34, borderRadius: 10, flexShrink: 0,
              background: "rgba(59,130,246,0.15)",
              border: "1px solid rgba(59,130,246,0.3)",
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "0 0 16px rgba(59,130,246,0.2)",
            }}>
              <Lightbulb style={{ width: 16, height: 16, color: "#60a5fa" }} />
            </div>

            {/* Step label + title */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{
                fontSize: 10, fontWeight: 700, letterSpacing: "0.1em",
                textTransform: "uppercase", marginBottom: 3,
                background: "linear-gradient(90deg, #38bdf8, #818cf8)",
                WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
              }}>
                Step {step + 1} of {STEPS.length}
              </p>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: "rgba(255,255,255,0.95)", lineHeight: 1.3, margin: 0 }}>
                {title}
              </h3>
            </div>

            {/* Close button */}
            <button
              onClick={onSkip}
              aria-label="Close tour"
              style={{
                flexShrink: 0, width: 26, height: 26, borderRadius: 8, cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.09)",
                color: "rgba(255,255,255,0.35)",
                transition: "all 0.15s",
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.12)";
                (e.currentTarget as HTMLButtonElement).style.color = "rgba(255,255,255,0.7)";
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.05)";
                (e.currentTarget as HTMLButtonElement).style.color = "rgba(255,255,255,0.35)";
              }}
            >
              <X style={{ width: 12, height: 12 }} />
            </button>
          </div>

          {/* Description */}
          <p style={{
            fontSize: 13, lineHeight: 1.65, margin: "0 0 18px 0",
            color: "rgba(255,255,255,0.5)",
          }}>
            {description}
          </p>

          {/* Progress bar dots */}
          <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 18 }}>
            {STEPS.map((_, i) => (
              <div
                key={i}
                style={{
                  height: 3, borderRadius: 9999,
                  width: i === step ? 22 : 6,
                  background: i === step
                    ? "linear-gradient(90deg, #3b82f6, #8b5cf6)"
                    : i < step
                    ? "rgba(59,130,246,0.45)"
                    : "rgba(255,255,255,0.1)",
                  transition: "all 0.3s ease",
                }}
              />
            ))}
          </div>

          {/* Navigation */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>

            {/* Skip */}
            <button
              onClick={onSkip}
              style={{
                fontSize: 11, background: "none", border: "none", cursor: "pointer",
                color: "rgba(255,255,255,0.28)", padding: "4px 0", transition: "color 0.15s",
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = "rgba(255,255,255,0.55)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = "rgba(255,255,255,0.28)"; }}
            >
              Skip tour
            </button>

            <div style={{ display: "flex", gap: 8 }}>
              {step > 0 && (
                <button
                  onClick={onBack}
                  style={{
                    display: "flex", alignItems: "center", gap: 5,
                    padding: "7px 13px", borderRadius: 10,
                    fontSize: 12, fontWeight: 600, cursor: "pointer",
                    color: "rgba(255,255,255,0.55)",
                    background: "rgba(255,255,255,0.06)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    transition: "all 0.15s",
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.1)"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.06)"; }}
                >
                  <ArrowLeft style={{ width: 11, height: 11 }} />
                  Back
                </button>
              )}

              <button
                onClick={onNext}
                style={{
                  display: "flex", alignItems: "center", gap: 5,
                  padding: "7px 16px", borderRadius: 10,
                  fontSize: 12, fontWeight: 700, cursor: "pointer", border: "none",
                  color: "#fff",
                  background: "linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)",
                  boxShadow: "0 4px 18px rgba(37,99,235,0.45), inset 0 1px 0 rgba(255,255,255,0.12)",
                  transition: "all 0.15s",
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 6px 24px rgba(37,99,235,0.6), inset 0 1px 0 rgba(255,255,255,0.15)"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 4px 18px rgba(37,99,235,0.45), inset 0 1px 0 rgba(255,255,255,0.12)"; }}
              >
                {isLast ? "Finish ✓" : "Next"}
                {!isLast && <ArrowRight style={{ width: 11, height: 11 }} />}
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Compute the { top, left } position for the tooltip card.
 * Prefers placing the tooltip to the right of the spotlight; falls back to
 * left if the right side would overflow the viewport. Uses Math.min to clamp
 * the vertical position within the viewport.
 */
function computeTooltipPosition(r: SpotlightRect): { top: number; left: number } {
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  const TOOLTIP_ESTIMATED_HEIGHT = 220; // approximate — used only for clamping

  // Try right of the spotlight first
  const rightLeft = r.left + r.width + TOOLTIP_GAP;
  const fitsRight = rightLeft + TOOLTIP_WIDTH <= vw - 8;

  // Fall back to left if near right edge
  const leftLeft = r.left - TOOLTIP_WIDTH - TOOLTIP_GAP;
  const fitsLeft = leftLeft >= 8;

  const resolvedLeft = fitsRight
    ? rightLeft
    : fitsLeft
    ? leftLeft
    : Math.max(8, vw - TOOLTIP_WIDTH - 8); // last resort: flush right with margin

  // Vertical: align tooltip top with spotlight top, clamped inside viewport
  const rawTop = r.top;
  const resolvedTop = Math.min(
    Math.max(8, rawTop),
    vh - TOOLTIP_ESTIMATED_HEIGHT - 8
  );

  return { top: resolvedTop, left: resolvedLeft };
}
