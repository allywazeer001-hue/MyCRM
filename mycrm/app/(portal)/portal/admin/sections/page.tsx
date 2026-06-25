"use client";
import { useRouter } from "next/navigation";
import { Layers, ChevronRight } from "lucide-react";

export default function SectionBuilderIndexPage() {
  const router = useRouter();

  return (
    <div className="space-y-5 max-w-4xl mx-auto">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Section Builder</h1>
        <p className="text-sm text-gray-500 mt-1">Organise portal fields into sections, tabs, groups, and cards.</p>
      </div>

      <div className="space-y-3">
        <button
          onClick={() => router.push("/portal/admin/sections/global")}
          className="w-full border border-gray-200 bg-white hover:bg-gray-50 hover:border-gray-300 rounded-xl p-5 flex items-center gap-4 text-left transition-all group shadow-sm"
        >
          <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center shrink-0">
            <Layers className="w-5 h-5 text-blue-600" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-gray-900">Global Portal Sections</p>
            <p className="text-xs text-gray-500 mt-0.5">Sections not tied to a specific module</p>
          </div>
          <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-gray-600 transition-colors" />
        </button>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-xl px-5 py-4 text-xs text-blue-700">
        <strong className="text-blue-800">Tip:</strong> To create sections for a specific CRM module, first enable it in{" "}
        <span className="font-semibold">CRM → Settings → Portal Settings</span>, then return here to organise fields.
      </div>
    </div>
  );
}
