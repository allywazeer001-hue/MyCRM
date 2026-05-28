"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { portalApi } from "@/lib/portal-api";
import { Loader2, ChevronRight, FormInput } from "lucide-react";

export default function FieldBuilderModulePicker() {
  const router = useRouter();
  const [configs, setConfigs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Reuse existing portal admin endpoint to get module configs
    portalApi.get("/portal/padmin/fields?moduleConfigId=").then(r => {
      // Just get available module configs via announcements endpoint fallback
      // Actually we need to call the existing CRM endpoint — use padmin stats
      setConfigs([]);
    }).catch(() => {}).finally(() => setLoading(false));

    // Fetch enabled portal module configs via portal API
    portalApi.get("/portal/announcements").then(() => {}).catch(() => {});
    // We use the portal-admin controller which has access to org data
    fetch("/api/v1/portal/padmin/fields", {
      headers: { Authorization: `Bearer ${localStorage.getItem("portal-access-token")}` },
    })
      .then(r => r.json())
      .then(data => {
        // Group by portalModuleConfigId to get unique module configs
        const configIds = [...new Set((Array.isArray(data) ? data : []).map((f: any) => f.portalModuleConfigId).filter(Boolean))];
        // For now show a generic "All Modules" option plus any configured ones
        setConfigs([{ id: null, label: "All Portal Fields (No Module)" }]);
      })
      .catch(() => setConfigs([{ id: null, label: "All Portal Fields" }]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-5 max-w-2xl">
      <div>
        <h1 className="text-xl font-bold text-white">Field Builder</h1>
        <p className="text-sm text-gray-400 mt-1">Create and manage custom portal fields, map to CRM data, and control visibility.</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-32"><Loader2 className="w-5 h-5 animate-spin text-violet-400" /></div>
      ) : (
        <div className="space-y-3">
          <button
            onClick={() => router.push("/portal/admin/fields/global")}
            className="w-full border border-gray-800 bg-gray-900 hover:bg-gray-800 rounded-xl p-5 flex items-center gap-4 text-left transition-all group"
          >
            <div className="w-10 h-10 rounded-lg bg-violet-900/40 flex items-center justify-center shrink-0">
              <FormInput className="w-5 h-5 text-violet-400" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-white">Global Portal Fields</p>
              <p className="text-xs text-gray-400">Fields not tied to a specific module</p>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-600 group-hover:text-gray-400" />
          </button>
        </div>
      )}

      <div className="bg-gray-900 border border-gray-800 rounded-xl px-5 py-4 text-xs text-gray-500">
        <strong className="text-gray-400">Tip:</strong> To create fields for a specific CRM module, first enable it in{" "}
        <span className="text-violet-400">CRM → Settings → Portal Settings</span>, then return here to add fields.
      </div>
    </div>
  );
}
