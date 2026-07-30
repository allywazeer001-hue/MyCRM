"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";
import { useAuthStore } from "@/store/auth.store";
import { useModulesStore } from "@/store/modules.store";
import { ToastProvider } from "@/components/ui/toast";
import { SplashScreen } from "@/components/ui/splash-screen";
import { OnboardingTour } from "@/components/ui/onboarding-tour";
import { ChatPanel } from "@/components/chat/ChatPanel";

function hasValidToken(): boolean {
  try {
    const token = localStorage.getItem("access_token");
    if (!token) return false;
    const parts = token.split(".");
    if (parts.length !== 3) return false;
    const payload = JSON.parse(atob(parts[1].replace(/-/g, "+").replace(/_/g, "/")));
    if (payload.exp && payload.exp * 1000 < Date.now()) return false;
    return true;
  } catch {
    return false;
  }
}

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const router   = useRouter();
  const pathname = usePathname();
  const { user } = useAuthStore();
  const { fetchModules, clearForOrgChange } = useModulesStore();
  const [ready,          setReady]          = useState(false);
  const [authenticated,  setAuthenticated]  = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  // Tracks the org whose modules are currently cached — used to detect switches.
  const loadedOrgIdRef = useRef<string | null>(null);

  // 1. On mount: check if the stored token is still valid.
  useEffect(() => {
    const valid = hasValidToken();
    setAuthenticated(valid);
    setReady(true);
  }, []);

  // 2. Auth guard + password-change redirect.
  useEffect(() => {
    if (!ready) return;
    if (!authenticated) { router.push("/login"); return; }
    if ((user as any)?.mustChangePassword && pathname !== "/change-password") {
      router.push("/change-password");
    }
  }, [ready, authenticated, user, pathname, router]);

  // 3. Module fetch — triggered by org identity, NOT by route changes.
  //    If the org changes (new login, new registration), stale modules are
  //    cleared immediately so the sidebar never shows another org's data.
  useEffect(() => {
    if (!ready || !authenticated) return;
    const orgId = user?.organizationId ?? null;
    if (!orgId) return;

    if (orgId !== loadedOrgIdRef.current) {
      // Org changed — wipe the cache before fetching to prevent cross-org flash.
      clearForOrgChange();
      loadedOrgIdRef.current = orgId;
    }

    fetchModules();
  }, [ready, authenticated, user?.organizationId]);   // eslint-disable-line react-hooks/exhaustive-deps

  // 4. Close mobile menu on navigation.
  useEffect(() => { setMobileMenuOpen(false); }, [pathname]);

  if (!ready)         return <SplashScreen show />;
  if (!authenticated) return null;

  return (
    <ToastProvider>
      <OnboardingTour />
      <div className="flex h-full bg-gray-50 overflow-hidden">

        {/* Mobile backdrop — tap to close sidebar */}
        {mobileMenuOpen && (
          <div
            className="fixed inset-0 z-40 bg-black/50 lg:hidden backdrop-blur-[1px]"
            onClick={() => setMobileMenuOpen(false)}
          />
        )}

        <Sidebar
          mobileOpen={mobileMenuOpen}
          onMobileClose={() => setMobileMenuOpen(false)}
        />

        <div className="flex-1 flex flex-col overflow-hidden min-w-0">
          <Topbar onMenuToggle={() => setMobileMenuOpen(prev => !prev)} />
          {/* scrollbar-gutter: stable reserves the scrollbar's width on both
              scrollable and non-scrollable pages alike, so content padding
              stays visually symmetric instead of shifting when a page's
              content happens to overflow vertically. */}
          <main className="flex-1 overflow-y-auto p-3 sm:p-4 lg:p-6 flex flex-col min-h-0 [scrollbar-gutter:stable]">
            {children}
          </main>
        </div>

      </div>
      <ChatPanel />
    </ToastProvider>
  );
}
