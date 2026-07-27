"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Layers, Settings, Plus, Loader2, ChevronRight,
  BarChart3, GitBranch, FileText, ToggleLeft, ToggleRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { ModuleIcon } from "@/components/ui/module-icon";

function ModuleStatusBadge({ isActive }: { isActive: boolean }) {
  return (
    <span className={cn(
      "inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium",
      isActive
        ? "bg-green-100 text-green-700"
        : "bg-gray-100 text-gray-500"
    )}>
      {isActive
        ? <ToggleRight className="w-3 h-3" />
        : <ToggleLeft className="w-3 h-3" />}
      {isActive ? "Active" : "Inactive"}
    </span>
  );
}

export default function ModulesConfigPage() {
  const router = useRouter();
  const [modules, setModules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/modules?includeStats=true")
      .then(r => setModules(r.data || []))
      .catch(() => setModules([]))
      .finally(() => setLoading(false));
  }, []);

  const toggleActive = async (mod: any) => {
    try {
      await api.patch(`/modules/${mod.id}`, { isActive: !mod.isActive });
      setModules(prev => prev.map(m => m.id === mod.id ? { ...m, isActive: !m.isActive } : m));
    } catch {
      // silently fail
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Module Configuration</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Manage your modules — fields, blueprints, forms, and visibility.
          </p>
        </div>
        <Button onClick={() => router.push("/studio")} className="gap-2">
          <Plus className="w-4 h-4" />
          New Module
        </Button>
      </div>

      {modules.length === 0 ? (
        <div className="border-2 border-dashed border-gray-200 rounded-xl p-16 text-center">
          <Layers className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-700 mb-2">No modules yet</h3>
          <p className="text-sm text-gray-400 mb-6">Create your first module in the Studio</p>
          <Button onClick={() => router.push("/studio")} className="gap-2">
            <Plus className="w-4 h-4" />
            Open Studio
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {modules.map(mod => {
            const stages: any[] = (mod.settings as any)?.stages || [];
            const fieldCount = mod._count?.fields ?? mod.fields?.length ?? 0;
            const formCount = mod._count?.forms ?? 0;
            const recordCount = mod._count?.records ?? 0;

            return (
              <div key={mod.id} className="bg-white rounded-xl border border-gray-200 p-4 hover:border-gray-300 hover:shadow-sm transition-all">
                <div className="flex items-start gap-4">
                  {/* Icon */}
                  <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-lg shrink-0">
                    {mod.icon ? <ModuleIcon icon={mod.icon} slug={mod.slug} className="w-5 h-5" /> : <Layers className="w-5 h-5 text-blue-600" />}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-sm font-semibold text-gray-900">{mod.name}</h3>
                      <ModuleStatusBadge isActive={mod.isActive !== false} />
                      {stages.length > 0 && (
                        <Badge variant="secondary" className="text-xs gap-1 px-1.5 py-0">
                          <GitBranch className="w-3 h-3" />
                          {stages.length} stages
                        </Badge>
                      )}
                    </div>
                    {mod.description && (
                      <p className="text-xs text-gray-400 mt-0.5 truncate">{mod.description}</p>
                    )}
                    <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                      <span className="flex items-center gap-1">
                        <BarChart3 className="w-3 h-3" />
                        {fieldCount} fields
                      </span>
                      {formCount > 0 && (
                        <span className="flex items-center gap-1">
                          <FileText className="w-3 h-3" />
                          {formCount} forms
                        </span>
                      )}
                      {recordCount > 0 && (
                        <span className="flex items-center gap-1">
                          {recordCount.toLocaleString()} records
                        </span>
                      )}
                      <span className="text-gray-300">/{mod.slug}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => toggleActive(mod)}
                      className="text-xs text-gray-400 hover:text-gray-600 transition-colors px-2 py-1 rounded border border-gray-200 hover:border-gray-300"
                    >
                      {mod.isActive !== false ? "Disable" : "Enable"}
                    </button>
                    <Link href={`/studio/${mod.id}`}>
                      <Button variant="outline" size="sm" className="gap-1.5 text-xs">
                        <Settings className="w-3.5 h-3.5" />
                        Studio
                      </Button>
                    </Link>
                    <Link href={`/m/${mod.slug}`}>
                      <Button variant="ghost" size="sm" className="px-2">
                        <ChevronRight className="w-4 h-4 text-gray-400" />
                      </Button>
                    </Link>
                  </div>
                </div>

                {/* Blueprint stages preview */}
                {stages.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <p className="text-xs text-gray-400 mb-2 flex items-center gap-1">
                      <GitBranch className="w-3 h-3" /> Blueprint stages
                    </p>
                    <div className="flex items-center gap-1 flex-wrap">
                      {stages.map((stage: any, idx: number) => (
                        <div key={stage.id || idx} className="flex items-center gap-1">
                          <span
                            className="inline-flex items-center text-xs px-2 py-0.5 rounded-full border font-medium"
                            style={{ backgroundColor: stage.color ? `${stage.color}20` : undefined, borderColor: stage.color || undefined, color: stage.color || undefined }}
                          >
                            {stage.name}
                          </span>
                          {idx < stages.length - 1 && (
                            <ChevronRight className="w-3 h-3 text-gray-300 shrink-0" />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
