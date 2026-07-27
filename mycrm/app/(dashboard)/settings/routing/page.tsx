"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Plus, Settings2, ToggleLeft, ToggleRight, Trash2, Loader2,
  GitFork, CheckCircle2, AlertCircle, ChevronRight, Users, Building2,
  Shield, Zap, Circle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useModulesStore } from "@/store/modules.store";
import { ModuleIcon } from "@/components/ui/module-icon";

function Toast({ msg, type }: { msg: string; type: "success" | "error" }) {
  return (
    <div className={cn(
      "fixed bottom-6 right-6 z-[200] flex items-center gap-2 px-4 py-3 rounded-xl border shadow-lg text-sm font-medium",
      type === "success" ? "bg-green-50 border-green-200 text-green-700" : "bg-red-50 border-red-200 text-red-700",
    )}>
      {type === "success" ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
      {msg}
    </div>
  );
}

const ASSIGNMENT_ICONS: Record<string, any> = {
  USER: Users,
  DEPARTMENT: Building2,
  ROLE: Shield,
  DYNAMIC_FIELD: Zap,
};
const ASSIGNMENT_LABELS: Record<string, string> = {
  USER: "Specific User",
  DEPARTMENT: "Department",
  ROLE: "Role",
  DYNAMIC_FIELD: "Dynamic Field",
};

export default function RoutingConfigsPage() {
  const { modules, fetchModules } = useModulesStore();
  const [configs, setConfigs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  const showToast = (msg: string, type: "success" | "error" = "success") => {
    setToast({ msg, type }); setTimeout(() => setToast(null), 3000);
  };

  const load = async () => {
    try {
      const { data } = await api.get("/record-routing/configs");
      setConfigs(data ?? []);
    } catch {
      showToast("Failed to load routing rules", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); fetchModules(); }, []); // eslint-disable-line

  const toggleConfig = async (cfg: any, e: React.MouseEvent) => {
    e.preventDefault();
    try {
      const { data } = await api.patch(`/record-routing/configs/${cfg.id}/toggle`);
      setConfigs(prev => prev.map(c => c.id === cfg.id ? { ...c, isEnabled: data.isEnabled } : c));
      showToast(data.isEnabled ? "Rule enabled" : "Rule disabled");
    } catch {
      showToast("Failed to toggle rule", "error");
    }
  };

  const deleteConfig = async (cfg: any, e: React.MouseEvent) => {
    e.preventDefault();
    if (!confirm(`Delete routing rule "${cfg.name}"? All queue items will be removed.`)) return;
    try {
      await api.delete(`/record-routing/configs/${cfg.id}`);
      setConfigs(prev => prev.filter(c => c.id !== cfg.id));
      showToast("Rule deleted");
    } catch {
      showToast("Failed to delete rule", "error");
    }
  };

  const getModuleName = (moduleId: string) => modules.find(m => m.id === moduleId)?.name ?? moduleId;
  const getModuleIcon = (moduleId: string) => modules.find(m => m.id === moduleId)?.icon ?? "📦";
  const getModuleSlug = (moduleId: string) => modules.find(m => m.id === moduleId)?.slug ?? "";

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-5 h-5 animate-spin text-violet-500" />
      </div>
    );
  }

  return (
    <div className="p-8 max-w-5xl mx-auto">
      {toast && <Toast msg={toast.msg} type={toast.type} />}

      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center">
            <GitFork className="w-5 h-5 text-violet-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Request Routing</h1>
            <p className="text-sm text-gray-500 mt-0.5">Route CRM records to users, departments, or roles based on conditions</p>
          </div>
        </div>
        <Link href="/settings/routing/new">
          <Button className="gap-2 bg-violet-600 hover:bg-violet-700">
            <Plus className="w-4 h-4" />
            New Routing Rule
          </Button>
        </Link>
      </div>

      {/* Empty state */}
      {configs.length === 0 ? (
        <div className="border-2 border-dashed border-gray-200 rounded-2xl p-16 text-center">
          <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
            <GitFork className="w-7 h-7 text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-700 mb-1">No routing rules yet</h3>
          <p className="text-sm text-gray-400 mb-6 max-w-sm mx-auto">
            Create rules that automatically route records from any module to the right person based on conditions.
          </p>
          <Link href="/settings/routing/new">
            <Button className="bg-violet-600 hover:bg-violet-700 gap-2">
              <Plus className="w-4 h-4" /> Create First Rule
            </Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {configs.map(cfg => {
            const AssignIcon = ASSIGNMENT_ICONS[cfg.assignmentType] ?? Users;
            const modName    = getModuleName(cfg.moduleId);
            const modIcon    = getModuleIcon(cfg.moduleId);
            const modSlug    = getModuleSlug(cfg.moduleId);
            const conditions = (cfg.filterConditions as any[]) ?? [];
            const actions    = (cfg.actions as any[]) ?? [];

            return (
              <Link
                key={cfg.id}
                href={`/settings/routing/${cfg.id}`}
                className={cn(
                  "group flex items-center gap-4 p-4 bg-white rounded-xl border transition-all hover:border-violet-200 hover:shadow-sm",
                  cfg.isEnabled ? "border-gray-200" : "border-gray-100 opacity-60",
                )}
              >
                {/* Status dot */}
                <div className={cn(
                  "w-2 h-2 rounded-full shrink-0 mt-0.5",
                  cfg.isEnabled ? "bg-green-400" : "bg-gray-300",
                )} />

                {/* Main info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-gray-900 text-sm">{cfg.name}</span>
                    {cfg.priority > 0 && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                        P{cfg.priority}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                      <ModuleIcon icon={modIcon} slug={modSlug} className="w-3.5 h-3.5" /> {modName}
                    </span>
                    <span className="text-gray-300">•</span>
                    <span>{conditions.length} condition{conditions.length !== 1 ? "s" : ""}</span>
                    <span className="text-gray-300">•</span>
                    <span className="flex items-center gap-1">
                      <AssignIcon className="w-3 h-3" />
                      {ASSIGNMENT_LABELS[cfg.assignmentType]} → {cfg.assignmentValue || "—"}
                    </span>
                    <span className="text-gray-300">•</span>
                    <span>{actions.length} action{actions.length !== 1 ? "s" : ""}</span>
                  </div>
                </div>

                {/* Queue count badge */}
                {(cfg._counts?.pending ?? 0) > 0 && (
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-violet-50 border border-violet-200">
                    <Circle className="w-2 h-2 text-violet-500 fill-violet-500" />
                    <span className="text-xs font-bold text-violet-700">{cfg._counts.pending} pending</span>
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={e => toggleConfig(cfg, e)}
                    className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600"
                    title={cfg.isEnabled ? "Disable" : "Enable"}
                  >
                    {cfg.isEnabled
                      ? <ToggleRight className="w-4 h-4 text-green-500" />
                      : <ToggleLeft className="w-4 h-4" />
                    }
                  </button>
                  <button
                    onClick={e => deleteConfig(cfg, e)}
                    className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <ChevronRight className="w-4 h-4 text-gray-300 shrink-0 group-hover:text-gray-400" />
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
