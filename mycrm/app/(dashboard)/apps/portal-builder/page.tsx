"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { portalApi } from "@/lib/portal-api";
import {
  Sparkles, Globe, Layers, Plug, Rocket, Plus, ArrowRight,
} from "lucide-react";

interface PortalPage {
  id: string;
  title: string;
  slug: string;
  status: string;
  createdAt: string;
}

function StatCard({ label, value, loading, accent }: { label: string; value: number; loading: boolean; accent?: string }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 flex flex-col gap-1">
      {loading ? (
        <div className="h-8 w-12 bg-gray-800 rounded animate-pulse" />
      ) : (
        <p className={`text-3xl font-bold ${accent ?? "text-white"}`}>{value}</p>
      )}
      <p className="text-xs text-gray-500 font-medium">{label}</p>
    </div>
  );
}

export default function PortalBuilderHome() {
  const router = useRouter();
  const [pages, setPages] = useState<PortalPage[]>([]);
  const [templateCount, setTemplateCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      portalApi.get("/portal/padmin/pages").catch(() => ({ data: [] })),
      portalApi.get("/portal/padmin/templates").catch(() => ({ data: [] })),
    ]).then(([pRes, tRes]) => {
      setPages(pRes.data ?? []);
      const tData = tRes.data ?? [];
      setTemplateCount(Array.isArray(tData) ? tData.length : 0);
    }).finally(() => setLoading(false));
  }, []);

  const published = pages.filter(p => p.status === "PUBLISHED").length;
  const draft = pages.filter(p => p.status !== "PUBLISHED").length;

  const QUICK_ACTIONS = [
    {
      label: "Create New Portal",
      desc: "Start building a new portal from scratch or a template",
      icon: Plus,
      color: "from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600",
      action: () => router.push("/apps/portal-builder/portals/new"),
    },
    {
      label: "Browse Templates",
      desc: "Explore pre-built portal templates",
      icon: Layers,
      color: "from-violet-700/60 to-violet-800/60 hover:from-violet-700/80 hover:to-violet-800/80 border border-violet-700/50",
      action: () => router.push("/apps/portal-builder/templates"),
    },
    {
      label: "CRM Integration",
      desc: "Map portal fields to your CRM modules",
      icon: Plug,
      color: "from-emerald-700/60 to-emerald-800/60 hover:from-emerald-700/80 hover:to-emerald-800/80 border border-emerald-700/50",
      action: () => router.push("/apps/portal-builder/integrations"),
    },
    {
      label: "Publish Portal",
      desc: "Go live and share your portal with customers",
      icon: Rocket,
      color: "from-amber-700/60 to-amber-800/60 hover:from-amber-700/80 hover:to-amber-800/80 border border-amber-700/50",
      action: () => router.push("/apps/portal-builder/publish"),
    },
  ];

  const recentPortals = [...pages]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Sparkles className="w-5 h-5 text-indigo-400" />
          <h1 className="text-2xl font-bold text-white">Portal Builder Studio</h1>
        </div>
        <p className="text-gray-400 text-sm">Design, build and publish your customer portals</p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard label="Total Portals" value={pages.length} loading={loading} />
        <StatCard label="Published" value={published} loading={loading} accent="text-green-400" />
        <StatCard label="Draft" value={draft} loading={loading} accent="text-amber-400" />
        <StatCard label="Templates" value={templateCount} loading={loading} accent="text-indigo-400" />
      </div>

      {/* Two-column body */}
      <div className="flex gap-6">
        {/* Quick Actions */}
        <div className="flex-1 space-y-3">
          <h2 className="text-sm font-bold text-gray-300 uppercase tracking-wider">Quick Actions</h2>
          <div className="grid grid-cols-2 gap-3">
            {QUICK_ACTIONS.map(action => (
              <button
                key={action.label}
                onClick={action.action}
                className={`bg-gradient-to-br ${action.color} rounded-2xl p-5 text-left transition-all group`}
              >
                <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center mb-3">
                  <action.icon className="w-5 h-5 text-white" />
                </div>
                <p className="text-sm font-bold text-white mb-1">{action.label}</p>
                <p className="text-xs text-white/60">{action.desc}</p>
                <div className="flex items-center gap-1 mt-3 text-white/60 group-hover:text-white/90 transition-colors">
                  <span className="text-xs">Get started</span>
                  <ArrowRight className="w-3 h-3" />
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Recent Portals */}
        <div className="w-80 shrink-0 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-gray-300 uppercase tracking-wider">Recent Portals</h2>
            <Link href="/apps/portal-builder/portals" className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors">
              View all
            </Link>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
            {loading ? (
              <div className="p-4 space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="h-4 flex-1 bg-gray-800 rounded animate-pulse" />
                    <div className="h-4 w-16 bg-gray-800 rounded animate-pulse" />
                  </div>
                ))}
              </div>
            ) : recentPortals.length === 0 ? (
              <div className="p-8 text-center">
                <Globe className="w-8 h-8 text-gray-700 mx-auto mb-2" />
                <p className="text-sm text-gray-500 mb-3">No portals yet</p>
                <button
                  onClick={() => router.push("/apps/portal-builder/portals/new")}
                  className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
                >
                  Create your first portal →
                </button>
              </div>
            ) : (
              <div className="divide-y divide-gray-800">
                {recentPortals.map(p => (
                  <button
                    key={p.id}
                    onClick={() => router.push(`/apps/portal-builder/portals/${p.id}`)}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-800/40 transition-colors text-left"
                  >
                    <span className={`w-2 h-2 rounded-full shrink-0 ${p.status === "PUBLISHED" ? "bg-green-400" : "bg-gray-600"}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">{p.title}</p>
                      <p className="text-[10px] text-gray-500">
                        {new Date(p.createdAt).toLocaleDateString("en-US", { month: "short", year: "numeric" })}
                      </p>
                    </div>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${
                      p.status === "PUBLISHED"
                        ? "bg-green-900/50 text-green-400"
                        : "bg-gray-800 text-gray-500"
                    }`}>
                      {p.status}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
