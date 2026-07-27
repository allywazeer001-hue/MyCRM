"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { ModuleIcon } from "@/components/ui/module-icon";
import { Loader2, Settings2, CheckCircle, XCircle, AlertCircle, ChevronRight, ToggleLeft, ToggleRight } from "lucide-react";

interface ModuleRow {
  module: { id: string; name: string; slug: string; icon?: string; color?: string };
  config: {
    id: string; portalLabel: string; portalType: string; isEnabled: boolean;
    fieldMappings?: any[];
  } | null;
  isEnabled: boolean;
  mappingCount: number;
}

const PORTAL_TYPES = [
  { value: "standard", label: "Standard" },
  { value: "academic", label: "Academic" },
  { value: "medical",  label: "Medical / Healthcare" },
  { value: "hr",       label: "HR / Employees" },
  { value: "crm",      label: "CRM / Clients" },
  { value: "vendor",   label: "Vendors" },
  { value: "member",   label: "Members" },
];

export default function PortalSettingsPage() {
  const router = useRouter();
  const [rows, setRows] = useState<ModuleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<string | null>(null);

  useEffect(() => {
    api.get("/portal/admin/module-configs")
      .then(r => setRows(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const toggle = async (moduleId: string, current: boolean) => {
    setToggling(moduleId);
    try {
      const { data } = await api.patch(`/portal/admin/module-configs/${moduleId}`, {
        isEnabled: !current,
      });
      setRows(prev => prev.map(r =>
        r.module.id === moduleId
          ? { ...r, isEnabled: data.isEnabled, config: data }
          : r
      ));
    } catch {}
    setToggling(null);
  };

  const enabledCount = rows.filter(r => r.isEnabled).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-gray-900">Portal Settings</h1>
        <p className="text-sm text-gray-500 mt-1">
          Connect CRM modules to the portal system. Enabled modules allow you to create portal accounts for their records.
        </p>
      </div>

      {/* Summary bar */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-indigo-50 flex items-center justify-center">
            <Settings2 className="w-4.5 h-4.5 text-indigo-600" />
          </div>
          <div>
            <p className="text-xl font-bold text-gray-900">{rows.length}</p>
            <p className="text-xs text-gray-500">Total modules</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-green-50 flex items-center justify-center">
            <CheckCircle className="w-4.5 h-4.5 text-green-600" />
          </div>
          <div>
            <p className="text-xl font-bold text-gray-900">{enabledCount}</p>
            <p className="text-xs text-gray-500">Portal enabled</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-amber-50 flex items-center justify-center">
            <AlertCircle className="w-4.5 h-4.5 text-amber-600" />
          </div>
          <div>
            <p className="text-xl font-bold text-gray-900">
              {rows.filter(r => r.isEnabled && r.mappingCount === 0).length}
            </p>
            <p className="text-xs text-gray-500">Need field mapping</p>
          </div>
        </div>
      </div>

      {/* Module list */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 border-b border-gray-50 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-800">Associated Portal Modules</h2>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-40">
            <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
          </div>
        ) : rows.length === 0 ? (
          <div className="text-center text-gray-400 py-12 text-sm">No modules found</div>
        ) : (
          <div className="divide-y divide-gray-50">
            {rows.map(({ module, config, isEnabled, mappingCount }) => {
              const portalTypeLabel = PORTAL_TYPES.find(t => t.value === config?.portalType)?.label ?? "Standard";
              const isTogglingThis = toggling === module.id;

              return (
                <div
                  key={module.id}
                  className={`flex items-center gap-4 px-5 py-4 transition-colors ${isEnabled ? "bg-white" : "bg-gray-50/50"}`}
                >
                  {/* Module icon + name */}
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0"
                      style={{ backgroundColor: module.color ? module.color + "20" : "#f3f4f6" }}
                    >
                      <ModuleIcon icon={module.icon} slug={module.slug} className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-800 truncate">{module.name}</p>
                      <p className="text-xs text-gray-400 truncate">
                        {isEnabled ? (config?.portalLabel || `${module.name} Portal`) : "Portal disabled"}
                        {isEnabled && config?.portalType && ` · ${portalTypeLabel}`}
                      </p>
                    </div>
                  </div>

                  {/* Mapping status */}
                  <div className="shrink-0 hidden sm:block">
                    {!isEnabled ? (
                      <span className="text-xs text-gray-400">—</span>
                    ) : mappingCount === 0 ? (
                      <span className="inline-flex items-center gap-1 text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                        <AlertCircle className="w-3 h-3" /> No mappings
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                        <CheckCircle className="w-3 h-3" /> {mappingCount} field{mappingCount !== 1 ? "s" : ""} mapped
                      </span>
                    )}
                  </div>

                  {/* Toggle */}
                  <button
                    onClick={() => toggle(module.id, isEnabled)}
                    disabled={!!toggling}
                    className="shrink-0 transition-opacity disabled:opacity-50"
                    title={isEnabled ? "Disable portal" : "Enable portal"}
                  >
                    {isTogglingThis ? (
                      <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
                    ) : isEnabled ? (
                      <ToggleRight className="w-8 h-8 text-indigo-600" />
                    ) : (
                      <ToggleLeft className="w-8 h-8 text-gray-300" />
                    )}
                  </button>

                  {/* Configure button */}
                  <button
                    onClick={() => router.push(`/settings/portal/${module.id}`)}
                    className="shrink-0 flex items-center gap-1 px-3 py-1.5 text-sm text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors font-medium"
                  >
                    Configure
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Info box */}
      <div className="bg-blue-50 border border-blue-100 rounded-xl px-5 py-4 text-sm text-blue-800">
        <p className="font-semibold mb-1">How Portal Association works</p>
        <ol className="list-decimal list-inside space-y-1 text-blue-700 text-xs">
          <li>Enable a module for portal access using the toggle above</li>
          <li>Click <strong>Configure</strong> to set the portal label, type, and map CRM fields to portal identity fields</li>
          <li>Open any record in that module and use <strong>Create Portal User</strong> from the actions menu</li>
          <li>The portal user can log in and view their linked record data</li>
        </ol>
      </div>
    </div>
  );
}
