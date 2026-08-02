"use client";
import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { ThemeProvider as NextThemesProvider, useTheme } from "next-themes";
import { useAuthStore } from "@/store/auth.store";
import { THEME_STORAGE_KEY, resolveAutoTheme, type ThemeChoice } from "@/lib/themes";

const AUTO_RECHECK_MS = 15 * 60 * 1000; // re-resolve day/night every 15 min for "Auto"

// The public marketing page and auth screens always render in the Light
// theme, regardless of the logged-in user's personal workspace preference —
// they're public-facing surfaces an anonymous visitor sees, not part of the
// themed app shell. /land-admin (the landing page editor) is NOT included
// here — as an admin tool it should follow the real selected theme like the
// rest of the app.
function isBrandRoute(pathname: string): boolean {
  return pathname === "/" ||
    pathname.startsWith("/login") || pathname.startsWith("/register") ||
    pathname.startsWith("/forgot-password");
}

// Applies the user's stored preference on load/login, and — only when that
// preference is "auto" — keeps re-resolving it against the local clock so a
// session left open across the day/night boundary switches on its own.
// Concrete theme picks (light/dark/green-apple/ocean-glass) are applied
// once here and then left alone; the Settings → Appearance page handles
// the instant-preview + persistence path when the user actively changes it.
function ThemeSync() {
  const { setTheme } = useTheme();
  const user = useAuthStore(s => s.user);
  const pathname = usePathname();

  useEffect(() => {
    if (isBrandRoute(pathname)) { setTheme("light"); return; }

    const stored = typeof window !== "undefined"
      ? (localStorage.getItem(THEME_STORAGE_KEY) as ThemeChoice | null)
      : null;
    const preference: ThemeChoice = (user?.theme as ThemeChoice) || stored || "light";

    const apply = () => setTheme(preference === "auto" ? resolveAutoTheme() : preference);
    apply();

    if (preference !== "auto") return;
    const id = setInterval(apply, AUTO_RECHECK_MS);
    return () => clearInterval(id);
  }, [user?.theme, setTheme, pathname]);

  return null;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="light"
      themes={["light", "dark", "green-apple", "ocean-glass"]}
      enableSystem={false}
      disableTransitionOnChange
    >
      <ThemeSync />
      {children}
    </NextThemesProvider>
  );
}
