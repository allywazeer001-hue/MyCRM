"use client";
import { useEffect } from "react";
import { ThemeProvider as NextThemesProvider, useTheme } from "next-themes";
import { useAuthStore } from "@/store/auth.store";
import { THEME_STORAGE_KEY, resolveAutoTheme, type ThemeChoice } from "@/lib/themes";

const AUTO_RECHECK_MS = 15 * 60 * 1000; // re-resolve day/night every 15 min for "Auto"

// Applies the user's stored preference on load/login, and — only when that
// preference is "auto" — keeps re-resolving it against the local clock so a
// session left open across the day/night boundary switches on its own.
// Concrete theme picks (light/dark/green-apple/ocean-glass) are applied
// once here and then left alone; the Settings → Appearance page handles
// the instant-preview + persistence path when the user actively changes it.
function ThemeSync() {
  const { setTheme } = useTheme();
  const user = useAuthStore(s => s.user);

  useEffect(() => {
    const stored = typeof window !== "undefined"
      ? (localStorage.getItem(THEME_STORAGE_KEY) as ThemeChoice | null)
      : null;
    const preference: ThemeChoice = (user?.theme as ThemeChoice) || stored || "light";

    const apply = () => setTheme(preference === "auto" ? resolveAutoTheme() : preference);
    apply();

    if (preference !== "auto") return;
    const id = setInterval(apply, AUTO_RECHECK_MS);
    return () => clearInterval(id);
  }, [user?.theme, setTheme]);

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
