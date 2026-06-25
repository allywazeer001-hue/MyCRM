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
    portalApi.get("/portal/padmin/fields?moduleConfigId=").then(() => {
      setConfigs([]);
    }).catch(() => {}).finally(() => setLoading(false));

    fetch("/api/v1/portal/padmin/fields", {
      headers: { Authorization: `Bearer ${localStorage.getItem("portal-access-token")}` },
    })
      .then(r => r.json())
      .then(data => {
        const configIds = [...new Set((Array.isArray(data) ? data : []).map((f: any) => f.portalModuleConfigId).filter(Boolean))];
        setConfigs([{ id: null, label: "All Portal Fields (No Module)" }]);
      })
      .catch(() => setConfigs([{ id: null, label: "All Portal Fields" }]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-5 max-w-4xl mx-auto">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Field Builder</h1>
        <p className="text-sm text-gray-500 mt-1">Create and manage custom portal fields, map to CRM data, and control visibility.</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-32"><Loader2 className="w-5 h-5 animate-spin text-violet-500" /></div>
      ) : (
        <div className="space-y-3">
          <button
            onClick={() => router.push("/portal/admin/fields/global")}
            className="w-full border border-gray-200 bg-white hover:bg-gray-50 hover:border-gray-300 rounded-xl p-5 flex items-center gap-4 text-left transition-all group shadow-sm"
          >
            <div className="w-10 h-10 rounded-lg bg-violet-100 flex items-center justify-center shrink-0">
              <FormInput className="w-5 h-5 text-violet-600" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-gray-900">Global Portal Fields</p>
              <p className="text-xs text-gray-500 mt-0.5">Fields not tied to a specific module</p>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-gray-600 transition-colors" />
          </button>
        </div>
      )}

      <div className="bg-blue-50 border border-blue-200 rounded-xl px-5 py-4 text-xs text-blue-700">
        <strong className="text-blue-800">Tip:</strong> To create fields for a specific CRM module, first enable it in{" "}
        <span className="font-semibold">CRM → Settings → Portal Settings</span>, then return here to add fields.
      </div>
    </div>
  );
}
