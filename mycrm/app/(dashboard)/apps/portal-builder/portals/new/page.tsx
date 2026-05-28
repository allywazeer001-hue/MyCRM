"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { portalApi } from "@/lib/portal-api";
import {
  LayoutGrid, Layers, ArrowRight, ArrowLeft, Loader2, CheckCircle, Sparkles,
} from "lucide-react";

interface Template {
  id: string;
  name: string;
  category?: string;
  description?: string;
  previewImage?: string;
}

const LAYOUT_OPTIONS = [
  {
    id: "single",
    label: "1 Column",
    sub: "Single",
    art: (
      <div className="w-full h-10 flex gap-1.5 items-stretch">
        <div className="flex-1 bg-indigo-500/30 rounded" />
      </div>
    ),
  },
  {
    id: "two-column",
    label: "2 Columns",
    sub: "Side by side",
    art: (
      <div className="w-full h-10 flex gap-1.5 items-stretch">
        <div className="flex-1 bg-indigo-500/30 rounded" />
        <div className="flex-1 bg-indigo-500/30 rounded" />
      </div>
    ),
  },
  {
    id: "three-column",
    label: "3 Columns",
    sub: "Three panel",
    art: (
      <div className="w-full h-10 flex gap-1.5 items-stretch">
        <div className="flex-1 bg-indigo-500/30 rounded" />
        <div className="flex-1 bg-indigo-500/30 rounded" />
        <div className="flex-1 bg-indigo-500/30 rounded" />
      </div>
    ),
  },
];

export default function NewPortalPage() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(true);
  const [selectedTemplate, setSelectedTemplate] = useState<string | "scratch" | null>(null);
  const [name, setName] = useState("");
  const [layoutType, setLayoutType] = useState("single");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  useEffect(() => {
    portalApi.get("/portal/padmin/templates")
      .then(res => setTemplates((res.data ?? []).slice(0, 6)))
      .catch(() => setTemplates([]))
      .finally(() => setLoadingTemplates(false));
  }, []);

  const handleCreate = async () => {
    if (!name.trim()) return;
    setSubmitting(true);
    setSubmitError("");
    try {
      const res = await portalApi.post("/portal/padmin/pages", {
        title: name.trim(),
        layoutTemplate: layoutType,
      });
      if (selectedTemplate && selectedTemplate !== "scratch") {
        await portalApi.post(`/portal/padmin/templates/${selectedTemplate}/apply`).catch(() => {});
      }
      router.push(`/apps/portal-builder/portals/${res.data.id}`);
    } catch {
      setSubmitError("Failed to create portal. Please try again.");
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => step === 2 ? setStep(1) : router.push("/apps/portal-builder/portals")}
          className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          {step === 2 ? "Back" : "My Portals"}
        </button>
        <div className="flex-1" />
        {/* Step indicator */}
        <div className="flex items-center gap-2">
          <div className={`flex items-center gap-1.5 text-xs font-medium ${step === 1 ? "text-indigo-400" : "text-gray-500"}`}>
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
              step === 1 ? "bg-indigo-600 text-white" : "bg-gray-700 text-gray-400"
            }`}>
              {step > 1 ? <CheckCircle className="w-3 h-3" /> : "1"}
            </span>
            Choose Template
          </div>
          <div className="w-8 h-px bg-gray-700" />
          <div className={`flex items-center gap-1.5 text-xs font-medium ${step === 2 ? "text-indigo-400" : "text-gray-500"}`}>
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
              step === 2 ? "bg-indigo-600 text-white" : "bg-gray-700 text-gray-400"
            }`}>
              2
            </span>
            Configure
          </div>
        </div>
      </div>

      {step === 1 && (
        <>
          <div>
            <h1 className="text-xl font-bold text-white">Choose a starting point</h1>
            <p className="text-sm text-gray-400 mt-1">Start from scratch or use a template to get going faster</p>
          </div>

          <div className="grid grid-cols-1 gap-3">
            {/* Scratch option */}
            <button
              onClick={() => setSelectedTemplate("scratch")}
              className={`flex items-center gap-4 p-5 rounded-2xl border-2 text-left transition-all ${
                selectedTemplate === "scratch"
                  ? "border-indigo-500 bg-indigo-900/20"
                  : "border-gray-800 bg-gray-900 hover:border-gray-700"
              }`}
            >
              <div className="w-12 h-12 rounded-xl bg-gray-800 flex items-center justify-center shrink-0">
                <LayoutGrid className="w-6 h-6 text-gray-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-white">Start from Scratch</p>
                <p className="text-xs text-gray-400 mt-0.5">Build your portal from a blank canvas with full control</p>
              </div>
              {selectedTemplate === "scratch" && (
                <CheckCircle className="w-5 h-5 text-indigo-400 shrink-0" />
              )}
            </button>

            {/* Template options */}
            {loadingTemplates && (
              <div className="grid grid-cols-2 gap-3">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-20 bg-gray-900 border border-gray-800 rounded-2xl animate-pulse" />
                ))}
              </div>
            )}

            {!loadingTemplates && templates.length > 0 && (
              <>
                <div className="flex items-center gap-3 my-1">
                  <div className="flex-1 h-px bg-gray-800" />
                  <span className="text-xs text-gray-600 font-medium">or use a template</span>
                  <div className="flex-1 h-px bg-gray-800" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {templates.map(t => (
                    <button
                      key={t.id}
                      onClick={() => setSelectedTemplate(t.id)}
                      className={`flex items-start gap-3 p-4 rounded-2xl border-2 text-left transition-all ${
                        selectedTemplate === t.id
                          ? "border-indigo-500 bg-indigo-900/20 ring-2 ring-indigo-500/30"
                          : "border-gray-800 bg-gray-900 hover:border-gray-700"
                      }`}
                    >
                      <div className="w-8 h-8 rounded-lg bg-indigo-900/40 flex items-center justify-center shrink-0 mt-0.5">
                        <Layers className="w-4 h-4 text-indigo-400" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-white truncate">{t.name}</p>
                        {t.category && (
                          <p className="text-[10px] text-indigo-400 font-medium">{t.category}</p>
                        )}
                        {t.description && (
                          <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{t.description}</p>
                        )}
                      </div>
                      {selectedTemplate === t.id && (
                        <CheckCircle className="w-4 h-4 text-indigo-400 shrink-0" />
                      )}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          <div className="flex justify-end pt-2">
            <button
              onClick={() => setStep(2)}
              disabled={!selectedTemplate}
              className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-xl transition-colors"
            >
              Next <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </>
      )}

      {step === 2 && (
        <>
          <div>
            <h1 className="text-xl font-bold text-white">Configure your portal</h1>
            <p className="text-sm text-gray-400 mt-1">Give it a name and choose a layout</p>
          </div>

          <div className="space-y-6">
            {/* Name input */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Portal Name</label>
              <input
                type="text"
                placeholder="e.g. Customer Portal, Vendor Portal..."
                value={name}
                onChange={e => setName(e.target.value)}
                onKeyDown={e => e.key === "Enter" && name.trim() && handleCreate()}
                autoFocus
                className="w-full px-4 py-3 bg-gray-900 border border-gray-700 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl text-sm text-white placeholder-gray-600 outline-none transition-colors"
              />
            </div>

            {/* Layout selector */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Layout Type</label>
              <div className="grid grid-cols-3 gap-3">
                {LAYOUT_OPTIONS.map(opt => (
                  <button
                    key={opt.id}
                    onClick={() => setLayoutType(opt.id)}
                    className={`flex flex-col gap-3 p-4 rounded-xl border-2 text-left transition-all ${
                      layoutType === opt.id
                        ? "border-indigo-500 bg-indigo-900/20"
                        : "border-gray-800 bg-gray-900 hover:border-gray-700"
                    }`}
                  >
                    {opt.art}
                    <div>
                      <p className="text-xs font-bold text-white">{opt.label}</p>
                      <p className="text-[10px] text-gray-500">{opt.sub}</p>
                    </div>
                    {layoutType === opt.id && (
                      <CheckCircle className="w-4 h-4 text-indigo-400 mt-auto" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Selected template note */}
            {selectedTemplate && selectedTemplate !== "scratch" && (
              <div className="flex items-center gap-2 bg-indigo-950/30 border border-indigo-800/50 rounded-xl px-4 py-2.5">
                <Sparkles className="w-4 h-4 text-indigo-400 shrink-0" />
                <p className="text-xs text-indigo-300">
                  Template will be applied after creation
                </p>
              </div>
            )}

            {submitError && (
              <p className="text-sm text-red-400">{submitError}</p>
            )}

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={handleCreate}
                disabled={!name.trim() || submitting}
                className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-xl transition-colors"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                {submitting ? "Creating..." : "Create Portal"}
              </button>
              <button
                onClick={() => setStep(1)}
                className="text-sm text-gray-500 hover:text-gray-300 transition-colors"
              >
                Back
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
