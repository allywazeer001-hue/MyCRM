"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { usePortalAuthStore } from "@/store/portal-auth.store";

export default function PortalSplashPage() {
  const router = useRouter();
  const { isAuthenticated } = usePortalAuthStore();

  useEffect(() => {
    const timer = setTimeout(() => {
      router.replace(isAuthenticated ? "/portal/dashboard" : "/portal/login");
    }, 2200);
    return () => clearTimeout(timer);
  }, [isAuthenticated, router]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-950 via-indigo-900 to-purple-900 flex flex-col items-center justify-center">
      {/* Animated orb background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-purple-500/20 rounded-full blur-3xl animate-pulse delay-700" />
      </div>

      <div className="relative flex flex-col items-center gap-6 animate-[fadeIn_0.8s_ease-out]">
        {/* Logo mark */}
        <div className="w-20 h-20 rounded-2xl bg-white/15 backdrop-blur-sm border border-white/20 flex items-center justify-center shadow-2xl">
          <span className="text-4xl font-bold text-white">P</span>
        </div>

        <div className="text-center">
          <h1 className="text-3xl font-bold text-white tracking-tight">My Portal</h1>
          <p className="mt-2 text-indigo-300 text-sm">Secure access to your information</p>
        </div>

        {/* Loading dots */}
        <div className="flex items-center gap-1.5 mt-4">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="w-2 h-2 rounded-full bg-indigo-400"
              style={{ animation: `bounce 1.2s ease-in-out ${i * 0.2}s infinite` }}
            />
          ))}
        </div>
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes bounce {
          0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
          40% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
