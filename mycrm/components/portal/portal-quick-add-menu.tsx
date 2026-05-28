"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { portalApi } from "@/lib/portal-api";
import { X, ChevronRight, Loader2, Check, Sparkles } from "lucide-react";

const ICON_PRESETS = [
  "📋", "📄", "📁", "📊", "📈", "🗂️", "📝", "🔗",
  "⭐", "🏠", "👤", "💼", "🎓", "🏥", "⚙️", "🔔",
];

interface Props {
  onClose: () => void;
  onCreated?: () => void;
}

type Step = "name" | "confirm" | "done";

export function PortalQuickAddMenu({ onClose, onCreated }: Props) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("name");
  const [form, setForm] = useState({
    label: "",
    icon: "📋",
    autoCreatePage: true,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<any>(null);

  const handleCreate = async () => {
    if (!form.label.trim()) { setError("Menu name is required"); return; }
    setSaving(true);
    setError("");
    try {
      const res = await portalApi.post("/portal/padmin/menu", {
        label: form.label.trim(),
        icon: form.icon,
        type: "page",
        isVisible: true,
        autoCreatePage: form.autoCreatePage,
      });
      setResult(res.data);
      setStep("done");
      onCreated?.();
    } catch (e: any) {
      setError(e?.response?.data?.message ?? "Failed to create menu item");
    }
    setSaving(false);
  };

  const handleOpenBuilder = () => {
    onClose();
    if (result?.target) {
      // Navigate to the linked page in portal
      router.push(result.target);
    } else {
      router.push("/portal/admin/pages");
    }
  };

  const handleOpenAdminBuilder = async () => {
    onClose();
    // Find the page that was auto-created and open its builder
    try {
      const pages = await portalApi.get("/portal/padmin/pages");
      const linked = pages.data?.find((p: any) =>
        result?.target?.includes(p.slug)
      );
      if (linked) {
        router.push(`/portal/admin/pages/${linked.id}`);
      } else {
        router.push("/portal/admin/pages");
      }
    } catch {
      router.push("/portal/admin/pages");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-indigo-500" />
            <span className="text-sm font-semibold text-gray-900">
              {step === "done" ? "Menu Created!" : "Add Menu Item"}
            </span>
          </div>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Step: Name */}
        {step === "name" && (
          <div className="px-6 py-5 space-y-5">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Menu Name</label>
              <input
                autoFocus
                value={form.label}
                onChange={e => setForm(f => ({ ...f, label: e.target.value }))}
                onKeyDown={e => e.key === "Enter" && form.label.trim() && setStep("confirm")}
                placeholder="e.g. Academic Results, My Documents..."
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Icon</label>
              <div className="grid grid-cols-8 gap-1.5">
                {ICON_PRESETS.map(icon => (
                  <button
                    key={icon}
                    onClick={() => setForm(f => ({ ...f, icon }))}
                    className={`w-9 h-9 rounded-lg text-lg flex items-center justify-center transition-all ${
                      form.icon === icon
                        ? "bg-indigo-100 ring-2 ring-indigo-400 scale-110"
                        : "hover:bg-gray-100"
                    }`}
                  >
                    {icon}
                  </button>
                ))}
              </div>
            </div>

            <label className="flex items-center gap-3 p-3 bg-indigo-50 rounded-xl cursor-pointer border border-indigo-100">
              <div
                onClick={() => setForm(f => ({ ...f, autoCreatePage: !f.autoCreatePage }))}
                className={`w-10 h-6 rounded-full transition-colors flex items-center px-0.5 ${form.autoCreatePage ? "bg-indigo-500" : "bg-gray-300"}`}
              >
                <div className={`w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${form.autoCreatePage ? "translate-x-4" : "translate-x-0"}`} />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-800">Auto-create page</p>
                <p className="text-xs text-gray-500">Instantly generates a linked page for this menu item</p>
              </div>
            </label>

            {error && <p className="text-xs text-red-500">{error}</p>}

            <div className="flex gap-2 pt-1">
              <button
                onClick={() => { if (form.label.trim()) setStep("confirm"); else setError("Menu name is required"); }}
                className="flex-1 flex items-center justify-center gap-2 py-3 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold rounded-xl transition-colors"
              >
                Continue <ChevronRight className="w-4 h-4" />
              </button>
              <button onClick={onClose} className="px-4 py-3 text-gray-500 hover:bg-gray-100 text-sm rounded-xl transition-colors">Cancel</button>
            </div>
          </div>
        )}

        {/* Step: Confirm */}
        {step === "confirm" && (
          <div className="px-6 py-5 space-y-5">
            <div className="bg-gray-50 rounded-2xl p-5 space-y-3">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">This will create:</p>
              <div className="flex items-center gap-3 bg-white rounded-xl border border-gray-200 p-4">
                <span className="text-2xl">{form.icon}</span>
                <div>
                  <p className="text-sm font-semibold text-gray-900">{form.label}</p>
                  <p className="text-xs text-gray-500">Menu item → sidebar navigation</p>
                </div>
              </div>
              {form.autoCreatePage && (
                <div className="flex items-center gap-3 bg-white rounded-xl border border-indigo-200 p-4">
                  <span className="text-2xl">📄</span>
                  <div>
                    <p className="text-sm font-semibold text-indigo-700">"{form.label}" page</p>
                    <p className="text-xs text-gray-500">Blank page linked to this menu</p>
                  </div>
                </div>
              )}
            </div>

            {error && <p className="text-xs text-red-500">{error}</p>}

            <div className="flex gap-2">
              <button
                onClick={handleCreate}
                disabled={saving}
                className="flex-1 flex items-center justify-center gap-2 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-colors"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                {saving ? "Creating..." : "Create Menu"}
              </button>
              <button onClick={() => setStep("name")} className="px-4 py-3 text-gray-500 hover:bg-gray-100 text-sm rounded-xl transition-colors">Back</button>
            </div>
          </div>
        )}

        {/* Step: Done */}
        {step === "done" && (
          <div className="px-6 py-5 space-y-5 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
              <Check className="w-8 h-8 text-green-500" />
            </div>
            <div>
              <p className="text-base font-bold text-gray-900">{form.icon} {form.label}</p>
              <p className="text-sm text-gray-500 mt-1">
                {form.autoCreatePage
                  ? "Menu item and page created. Open the builder to design it."
                  : "Menu item added to your portal."}
              </p>
            </div>
            <div className="flex flex-col gap-2">
              {form.autoCreatePage && (
                <button
                  onClick={handleOpenAdminBuilder}
                  className="w-full flex items-center justify-center gap-2 py-3 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold rounded-xl transition-colors"
                >
                  <Sparkles className="w-4 h-4" />
                  Open Page Builder
                </button>
              )}
              <button
                onClick={onClose}
                className="w-full py-2.5 text-gray-500 hover:bg-gray-100 text-sm rounded-xl transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
