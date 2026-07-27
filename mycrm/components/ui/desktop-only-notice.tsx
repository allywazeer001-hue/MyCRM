"use client";

import { useEffect, useState, ReactNode } from "react";
import { MonitorSmartphone } from "lucide-react";

/** True while the viewport is narrower than `breakpoint` px. SSR-safe (defaults to false until mounted). */
function useIsNarrowViewport(breakpoint = 768) {
  const [narrow, setNarrow] = useState(false);

  useEffect(() => {
    const check = () => setNarrow(window.innerWidth < breakpoint);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, [breakpoint]);

  return narrow;
}

/**
 * Gate for canvas-style builder tools (drag & drop, freeform stages) that aren't
 * practical to use on a phone. Shows a friendly notice instead of a broken layout
 * below `breakpoint`, and renders `children` normally at larger sizes.
 */
export function DesktopOnlyGate({
  title = "Best viewed on a larger screen",
  message = "This builder is designed for tablet and desktop screens. Switch to a bigger screen to build here — your work is safe either way.",
  breakpoint = 768,
  children,
}: {
  title?: string;
  message?: string;
  breakpoint?: number;
  children: ReactNode;
}) {
  const narrow = useIsNarrowViewport(breakpoint);

  if (!narrow) return <>{children}</>;

  return (
    <div className="flex flex-col items-center justify-center text-center px-6 py-20 min-h-[60vh]">
      <div className="w-14 h-14 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center mb-4">
        <MonitorSmartphone className="w-6 h-6 text-blue-500" />
      </div>
      <h2 className="text-base font-bold text-gray-900 mb-2">{title}</h2>
      <p className="text-sm text-gray-500 max-w-xs leading-relaxed">{message}</p>
    </div>
  );
}
