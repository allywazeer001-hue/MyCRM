"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Zap, ChevronRight, Loader2 } from "lucide-react";
import { useModulesStore } from "@/store/modules.store";
import { ModuleIcon } from "@/components/ui/module-icon";

export default function FieldRulesIndexPage() {
  const { modules, fetchModules } = useModulesStore();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    fetchModules().then(() => setReady(true));
  }, [fetchModules]);

  return (
    <div className="max-w-2xl mx-auto py-8 px-4">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center">
          <Zap className="w-4 h-4 text-amber-600" />
        </div>
        <div>
          <h1 className="text-lg font-semibold text-gray-900">Field Rules</h1>
          <p className="text-sm text-gray-500">Auto-populate and control fields based on conditions</p>
        </div>
      </div>

      {!ready ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-5 h-5 animate-spin text-gray-300" />
        </div>
      ) : (
        <div className="divide-y divide-gray-100 border border-gray-200 rounded-xl overflow-hidden bg-white">
          {(modules ?? []).map((mod: any) => (
            <Link
              key={mod.id}
              href={`/settings/field-rules/${mod.id}`}
              className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors"
            >
              <span className="w-7 flex items-center justify-center"><ModuleIcon icon={mod.icon} slug={mod.slug} className="w-4 h-4" /></span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900">{mod.name}</p>
                <p className="text-xs text-gray-400">{mod.slug}</p>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-300" />
            </Link>
          ))}
          {!modules?.length && (
            <p className="text-sm text-gray-400 text-center py-12">No modules found</p>
          )}
        </div>
      )}
    </div>
  );
}
