"use client";
import { useRouter } from "next/navigation";
import { Layers, ChevronRight } from "lucide-react";

export default function SectionBuilderIndexPage() {
  const router = useRouter();

  return (
    <div className="space-y-5 max-w-2xl">
      <div>
        <h1 className="text-xl font-bold text-white">Section Builder</h1>
        <p className="text-sm text-gray-400 mt-1">Organise portal fields into sections, tabs, groups, and cards.</p>
      </div>

      <div className="space-y-3">
        <button
          onClick={() => router.push("/portal/admin/sections/global")}
          className="w-full border border-gray-800 bg-gray-900 hover:bg-gray-800 rounded-xl p-5 flex items-center gap-4 text-left transition-all group"
        >
          <div className="w-10 h-10 rounded-lg bg-blue-900/40 flex items-center justify-center shrink-0">
            <Layers className="w-5 h-5 text-blue-400" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-white">Global Portal Sections</p>
            <p className="text-xs text-gray-400">Sections not tied to a specific module</p>
          </div>
          <ChevronRight className="w-4 h-4 text-gray-600 group-hover:text-gray-400" />
        </button>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-xl px-5 py-4 text-xs text-gray-500">
        <strong className="text-gray-400">Tip:</strong> To create sections for a specific CRM module, first enable it in{" "}
        <span className="text-blue-400">CRM → Settings → Portal Settings</span>, then return here to organise fields.
      </div>
    </div>
  );
}
