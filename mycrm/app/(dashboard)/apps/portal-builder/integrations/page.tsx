"use client";
import { useEffect, useState } from "react";
import { portalApi } from "@/lib/portal-api";
import { useRouter } from "next/navigation";
import {
  Loader2, Plug, Database, ChevronRight, ArrowRight,
  Check, CheckCircle, Plus, AlertCircle, X, EyeOff,
  Lock, Unlock, Star, RefreshCw, Link2, ChevronDown,
} from "lucide-react";

// ── Types ──────────────────────────────────────────────────────────────────────
interface CrmModule { id: string; name: string; slug: string; description?: string; }
interface CrmField  { id: string; name: string; label: string; fieldType: string; }
interface PortalPage { id: string; title: string; slug: string; status: string; }
interface PortalSection {
  id: string; label: string;
  fields: Array<{
    id: string; label: string; fieldKey: string; fieldType: string;
    isEditable: boolean; isReadOnly: boolean; isVisible: boolean; isRequired: boolean;
    mappedCrmFieldName?: string; mappedCrmModuleSlug?: string;
  }>;
}
interface SectionSuggestion {
  label: string; type: "primary" | "document" | "related";
  crmModuleSlug: string; crmRelationField?: string;
  fieldIds: string[]; fieldLabels: string[];
}

// ── Permissions badge ──────────────────────────────────────────────────────────
type Permission = "editable" | "readonly" | "hidden";

const PERM_OPTS: Array<{ id: Permission; label: string; icon: any; cls: string }> = [
  { id: "editable", label: "Editable",  icon: Unlock, cls: "bg-emerald-900/40 text-emerald-400 border-emerald-800/60 hover:bg-emerald-900/60" },
  { id: "readonly", label: "Read-only", icon: Lock,   cls: "bg-amber-900/40 text-amber-400 border-amber-800/60 hover:bg-amber-900/60" },
  { id: "hidden",   label: "Hidden",    icon: EyeOff, cls: "bg-gray-800 text-gray-500 border-gray-700 hover:bg-gray-700" },
];

function permissionOf(f: PortalSection["fields"][0]): Permission {
  if (!f.isVisible) return "hidden";
  if (f.isReadOnly || !f.isEditable) return "readonly";
  return "editable";
}

function PermissionPicker({ value, onChange }: { value: Permission; onChange: (p: Permission) => void }) {
  const [open, setOpen] = useState(false);
  const cur = PERM_OPTS.find(o => o.id === value)!;
  return (
    <div className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-medium transition-colors ${cur.cls}`}
      >
        <cur.icon className="w-3 h-3" />
        {cur.label}
        <ChevronDown className="w-3 h-3 opacity-60" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 mt-1 z-20 bg-gray-900 border border-gray-700 rounded-xl shadow-2xl py-1 min-w-[130px]">
            {PERM_OPTS.map(opt => (
              <button
                key={opt.id}
                onClick={() => { onChange(opt.id); setOpen(false); }}
                className={`w-full flex items-center gap-2 px-3 py-2 text-xs font-medium transition-colors ${
                  value === opt.id ? "text-indigo-300 bg-indigo-900/40" : "text-gray-400 hover:bg-gray-800 hover:text-white"
                }`}
              >
                <opt.icon className="w-3 h-3" />
                {opt.label}
                {value === opt.id && <Check className="w-3 h-3 ml-auto text-indigo-400" />}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ── CRM field selector ─────────────────────────────────────────────────────────
function CrmFieldSelector({
  crmFields, value, onChange,
}: { crmFields: CrmField[]; value?: string; onChange: (name: string) => void }) {
  const [open, setOpen] = useState(false);
  const selected = crmFields.find(f => f.name === value);
  return (
    <div className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs transition-colors min-w-[140px] ${
          selected
            ? "border-indigo-600 bg-indigo-900/30 text-indigo-300 font-medium"
            : "border-gray-700 bg-gray-800/50 text-gray-500 hover:border-gray-600 hover:text-gray-300"
        }`}
      >
        <Database className="w-3 h-3 shrink-0" />
        <span className="flex-1 truncate text-left">{selected?.label ?? "Map to CRM field"}</span>
        <ChevronDown className="w-3 h-3 opacity-50 shrink-0" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 mt-1 z-20 bg-gray-900 border border-gray-700 rounded-xl shadow-2xl py-1 w-56 max-h-52 overflow-y-auto">
            <button
              onClick={() => { onChange(""); setOpen(false); }}
              className="w-full flex items-center gap-2 px-3 py-2 text-xs text-gray-500 hover:bg-gray-800 hover:text-gray-300 transition-colors"
            >
              <X className="w-3 h-3" />No mapping
            </button>
            {crmFields.map(f => (
              <button
                key={f.id}
                onClick={() => { onChange(f.name); setOpen(false); }}
                className={`w-full flex items-center gap-2 px-3 py-2 text-xs transition-colors ${
                  value === f.name ? "text-indigo-300 bg-indigo-900/40 font-medium" : "text-gray-400 hover:bg-gray-800 hover:text-white"
                }`}
              >
                <span className="flex-1 text-left truncate">{f.label}</span>
                <span className="text-[9px] text-gray-600 font-mono shrink-0">{f.fieldType}</span>
                {value === f.name && <Check className="w-3 h-3 shrink-0 text-indigo-400" />}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
type UIStep = "module" | "mapping";

export default function IntegrationsPage() {
  const router = useRouter();

  // Step 1 — module + page selection
  const [modules, setModules] = useState<CrmModule[]>([]);
  const [pages, setPages] = useState<PortalPage[]>([]);
  const [loadingModules, setLoadingModules] = useState(true);
  const [moduleError, setModuleError] = useState("");
  const [selectedModule, setSelectedModule] = useState<CrmModule | null>(null);
  const [selectedPageId, setSelectedPageId] = useState("");
  const [uiStep, setUiStep] = useState<UIStep>("module");

  // Step 2 — field mapping
  const [pageSections, setPageSections] = useState<PortalSection[]>([]);
  const [crmFields, setCrmFields] = useState<CrmField[]>([]);
  const [loadingMapping, setLoadingMapping] = useState(false);
  const [fieldMappings, setFieldMappings] = useState<Record<string, { crmField: string; permission: Permission; required: boolean }>>({});
  const [saving, setSaving] = useState(false);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [saveBanner, setSaveBanner] = useState<{ type: "success" | "error"; msg: string } | null>(null);
  const [saveProgress, setSaveProgress] = useState({ done: 0, total: 0 });

  // Suggestions (secondary)
  const [suggestions, setSuggestions] = useState<SectionSuggestion[]>([]);
  const [addedSuggestions, setAddedSuggestions] = useState<Set<number>>(new Set());
  const [addingIdx, setAddingIdx] = useState<string | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Load modules + pages on mount
  useEffect(() => {
    Promise.all([
      portalApi.get("/portal/padmin/pages").catch(() => ({ data: [] })),
      portalApi.get("/portal/padmin/crm-modules").catch(() => null),
    ]).then(([pRes, mRes]) => {
      const pagesData = pRes.data ?? [];
      setPages(pagesData);
      if (pagesData.length > 0) setSelectedPageId(pagesData[0].id);
      if (mRes) {
        setModules(mRes.data ?? []);
      } else {
        setModuleError("Could not load CRM modules. Make sure your CRM has modules configured.");
      }
    }).finally(() => setLoadingModules(false));
  }, []);

  // Load page sections + CRM fields when entering Step 2
  const enterMapping = async () => {
    if (!selectedModule || !selectedPageId) return;
    setLoadingMapping(true);
    setUiStep("mapping");
    try {
      const [pageRes, fieldsRes, sugRes] = await Promise.all([
        portalApi.get(`/portal/padmin/pages/${selectedPageId}`),
        portalApi.get(`/portal/padmin/crm-modules/${selectedModule.id}/fields`).catch(() => ({ data: [] })),
        portalApi.get(`/portal/padmin/crm-modules/${selectedModule.id}/suggest-sections`).catch(() => ({ data: [] })),
      ]);

      const sections: PortalSection[] = (pageRes.data.sections ?? []).map((s: any) => ({
        id: s.id,
        label: s.label,
        fields: (s.fields ?? []).map((f: any) => ({
          id: f.id,
          label: f.label,
          fieldKey: f.fieldKey,
          fieldType: f.fieldType,
          isEditable: f.isEditable ?? true,
          isReadOnly: f.isReadOnly ?? false,
          isVisible: f.isVisible ?? true,
          isRequired: f.isRequired ?? false,
          mappedCrmFieldName: f.mappedCrmFieldName ?? "",
          mappedCrmModuleSlug: f.mappedCrmModuleSlug ?? "",
        })),
      }));

      setPageSections(sections);
      setCrmFields(fieldsRes.data ?? []);
      setSuggestions(sugRes.data ?? []);

      // Pre-populate existing mappings
      const init: typeof fieldMappings = {};
      sections.forEach(s => s.fields.forEach(f => {
        init[f.id] = {
          crmField: f.mappedCrmFieldName ?? "",
          permission: permissionOf(f),
          required: f.isRequired,
        };
      }));
      setFieldMappings(init);
    } catch {}
    setLoadingMapping(false);
  };

  const updateFieldMapping = (
    fieldId: string,
    patch: Partial<{ crmField: string; permission: Permission; required: boolean }>
  ) => {
    setFieldMappings(prev => ({ ...prev, [fieldId]: { ...prev[fieldId], ...patch } }));
  };

  const saveFieldMappings = async () => {
    setSaving(true);
    setSaveBanner(null);
    const fieldCount = pageSections.reduce((n, s) => n + s.fields.length, 0);
    setSaveProgress({ done: 0, total: fieldCount });
    const updates: string[] = [];
    const errors: string[] = [];

    for (const section of pageSections) {
      for (const field of section.fields) {
        const m = fieldMappings[field.id];
        if (!m) continue;
        const perm = m.permission;
        try {
          await portalApi.patch(`/portal/padmin/sections/${section.id}/fields/${field.id}`, {
            mappedCrmFieldName: m.crmField || null,
            mappedCrmModuleSlug: m.crmField ? selectedModule?.slug : null,
            isEditable: perm === "editable",
            isReadOnly: perm === "readonly",
            isVisible: perm !== "hidden",
            isRequired: m.required,
          });
          updates.push(field.id);
        } catch {
          errors.push(field.label);
        }
        setSaveProgress(p => ({ ...p, done: p.done + 1 }));
      }
    }

    setSaving(false);
    setSaveProgress({ done: 0, total: 0 });

    if (errors.length === 0) {
      setSavedIds(new Set(updates));
      setSaveBanner({ type: "success", msg: `Field mappings saved successfully — ${updates.length} field${updates.length !== 1 ? "s" : ""} updated.` });
      setTimeout(() => { setSavedIds(new Set()); setSaveBanner(null); }, 4000);
    } else {
      setSavedIds(new Set(updates));
      setSaveBanner({
        type: "error",
        msg: `${updates.length} saved, ${errors.length} failed: ${errors.slice(0, 3).join(", ")}${errors.length > 3 ? "…" : ""}`,
      });
      setTimeout(() => setSavedIds(new Set()), 4000);
    }
  };

  const addSuggestionToPage = async (s: SectionSuggestion, idx: number) => {
    setAddingIdx(`${idx}`);
    try {
      await portalApi.post(`/portal/padmin/pages/${selectedPageId}/sections/from-module`, {
        crmModuleSlug: s.crmModuleSlug,
        crmRelationField: s.crmRelationField ?? null,
        crmSectionType: s.type,
        label: s.label,
        fieldIds: s.fieldIds,
      });
      setAddedSuggestions(prev => new Set(prev).add(idx));
    } catch {}
    setAddingIdx(null);
  };

  const allFields = pageSections.flatMap(s => s.fields);
  const mappedCount = Object.values(fieldMappings).filter(m => m.crmField).length;
  const selectedPage = pages.find(p => p.id === selectedPageId);

  // ── STEP 1: Module + Page selection ───────────────────────────────────────
  if (uiStep === "module") {
    return (
      <div className="max-w-3xl space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Plug className="w-5 h-5 text-indigo-400" />
            CRM Integration
          </h1>
          <p className="text-sm text-gray-400 mt-1">
            Connect a CRM module to a portal page and map fields with view/edit permissions.
          </p>
        </div>

        {/* Step indicators */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 bg-indigo-600 text-white text-xs font-semibold px-3 py-1.5 rounded-full">
            <span className="w-4 h-4 rounded-full bg-white/20 flex items-center justify-center text-[10px] font-bold">1</span>
            Select Sources
          </div>
          <div className="w-6 h-px bg-gray-700" />
          <div className="flex items-center gap-2 bg-gray-800 text-gray-500 text-xs font-semibold px-3 py-1.5 rounded-full">
            <span className="w-4 h-4 rounded-full bg-gray-700 flex items-center justify-center text-[10px] font-bold">2</span>
            Map Fields
          </div>
        </div>

        <div className="grid grid-cols-2 gap-5">
          {/* Left: Select Module */}
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">
              CRM Module
            </p>
            {loadingModules ? (
              <div className="flex items-center gap-2 text-sm text-gray-500 py-6">
                <Loader2 className="w-4 h-4 animate-spin" />Loading modules...
              </div>
            ) : moduleError ? (
              <div className="bg-red-950/30 border border-red-900/50 rounded-xl p-4">
                <p className="text-xs text-red-400 flex items-start gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />{moduleError}
                </p>
              </div>
            ) : modules.length === 0 ? (
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 text-center">
                <Database className="w-7 h-7 text-gray-700 mx-auto mb-2" />
                <p className="text-xs text-gray-500">No CRM modules found.</p>
              </div>
            ) : (
              <div className="space-y-1.5">
                {modules.map(mod => (
                  <button
                    key={mod.id}
                    onClick={() => setSelectedModule(selectedModule?.id === mod.id ? null : mod)}
                    className={`w-full text-left flex items-center justify-between gap-2 px-3.5 py-3 rounded-xl text-sm transition-all border ${
                      selectedModule?.id === mod.id
                        ? "border-indigo-500 bg-indigo-900/20 text-white"
                        : "border-gray-800 bg-gray-900 text-gray-400 hover:border-gray-700 hover:text-white"
                    }`}
                  >
                    <span className="flex items-center gap-2.5">
                      <Database className="w-3.5 h-3.5 shrink-0" />
                      <span className="font-medium truncate">{mod.name}</span>
                    </span>
                    {selectedModule?.id === mod.id
                      ? <Check className="w-3.5 h-3.5 shrink-0 text-indigo-400" />
                      : <ChevronRight className="w-3 h-3 shrink-0 opacity-40" />
                    }
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Right: Select Page */}
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">
              Portal Page
            </p>
            {pages.length === 0 ? (
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 text-center">
                <p className="text-xs text-gray-500 mb-2">No pages yet.</p>
                <button
                  onClick={() => router.push("/apps/portal-builder/portals/new")}
                  className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
                >
                  Create a portal first →
                </button>
              </div>
            ) : (
              <div className="space-y-1.5">
                {pages.map(p => (
                  <button
                    key={p.id}
                    onClick={() => setSelectedPageId(p.id)}
                    className={`w-full text-left flex items-center gap-3 px-3.5 py-3 rounded-xl text-sm transition-all border ${
                      selectedPageId === p.id
                        ? "border-indigo-500 bg-indigo-900/20 text-white"
                        : "border-gray-800 bg-gray-900 text-gray-400 hover:border-gray-700 hover:text-white"
                    }`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${p.status === "PUBLISHED" ? "bg-green-400" : "bg-gray-600"}`} />
                    <span className="font-medium flex-1 truncate">{p.title}</span>
                    {selectedPageId === p.id && <Check className="w-3.5 h-3.5 shrink-0 text-indigo-400" />}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* CTA */}
        <div className="pt-2">
          <button
            onClick={enterMapping}
            disabled={!selectedModule || !selectedPageId}
            className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-xl transition-colors"
          >
            Map Fields <ArrowRight className="w-4 h-4" />
          </button>
          {selectedModule && selectedPageId && (
            <p className="text-xs text-gray-500 mt-2">
              You'll map <strong className="text-gray-300">{selectedPage?.title}</strong> fields
              → <strong className="text-gray-300">{selectedModule.name}</strong> CRM fields
            </p>
          )}
        </div>
      </div>
    );
  }

  // ── STEP 2: Field mapping ──────────────────────────────────────────────────
  return (
    <div className="max-w-5xl space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => { setUiStep("module"); setPageSections([]); setCrmFields([]); }}
          className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-white transition-colors"
        >
          <ArrowRight className="w-4 h-4 rotate-180" />Back
        </button>
        <div className="flex-1">
          <h1 className="text-base font-bold text-white flex items-center gap-2">
            <Link2 className="w-4 h-4 text-indigo-400" />
            {selectedPage?.title}
            <span className="text-gray-600">→</span>
            {selectedModule?.name}
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Map portal fields to CRM fields and set view/edit permissions per field.
          </p>
        </div>
        <button
          onClick={saveFieldMappings}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-colors"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
          {saving ? "Saving..." : "Save Mappings"}
        </button>
      </div>

      {/* Save banner */}
      {saving && saveProgress.total > 0 && (
        <div className="flex items-center gap-3 bg-indigo-950/40 border border-indigo-800/50 rounded-xl px-4 py-2.5">
          <Loader2 className="w-4 h-4 text-indigo-400 animate-spin shrink-0" />
          <p className="text-sm text-indigo-300">
            Saving… {saveProgress.done} / {saveProgress.total} fields
          </p>
        </div>
      )}
      {!saving && saveBanner && (
        <div className={`flex items-center gap-2 rounded-xl px-4 py-2.5 border ${
          saveBanner.type === "success"
            ? "bg-emerald-950/40 border-emerald-800/50"
            : "bg-red-950/40 border-red-800/50"
        }`}>
          {saveBanner.type === "success"
            ? <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
            : <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
          }
          <p className={`text-sm ${saveBanner.type === "success" ? "text-emerald-300" : "text-red-300"}`}>
            {saveBanner.msg}
          </p>
        </div>
      )}

      {loadingMapping ? (
        <div className="flex items-center justify-center py-20 gap-3">
          <Loader2 className="w-5 h-5 animate-spin text-indigo-400" />
          <p className="text-sm text-gray-400">Loading field data...</p>
        </div>
      ) : allFields.length === 0 ? (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-10 text-center">
          <RefreshCw className="w-8 h-8 text-gray-700 mx-auto mb-3" />
          <p className="text-sm font-semibold text-gray-400">No fields on this page yet</p>
          <p className="text-xs text-gray-600 mt-1 mb-4">Add fields in the page builder first, then come back to map them.</p>
          <button
            onClick={() => router.push(`/apps/portal-builder/portals/${selectedPageId}`)}
            className="text-sm text-indigo-400 hover:text-indigo-300"
          >
            Open Page Builder →
          </button>
        </div>
      ) : (
        <>
          {/* Summary row */}
          <div className="flex items-center gap-4 bg-gray-900 border border-gray-800 rounded-xl px-4 py-3">
            <div className="text-center">
              <p className="text-xl font-bold text-white">{allFields.length}</p>
              <p className="text-[10px] text-gray-500 uppercase tracking-wide">Total Fields</p>
            </div>
            <div className="w-px h-8 bg-gray-800" />
            <div className="text-center">
              <p className="text-xl font-bold text-indigo-400">{mappedCount}</p>
              <p className="text-[10px] text-gray-500 uppercase tracking-wide">Mapped</p>
            </div>
            <div className="w-px h-8 bg-gray-800" />
            <div className="text-center">
              <p className="text-xl font-bold text-emerald-400">
                {Object.values(fieldMappings).filter(m => m.permission === "editable").length}
              </p>
              <p className="text-[10px] text-gray-500 uppercase tracking-wide">Editable</p>
            </div>
            <div className="w-px h-8 bg-gray-800" />
            <div className="text-center">
              <p className="text-xl font-bold text-amber-400">
                {Object.values(fieldMappings).filter(m => m.permission === "readonly").length}
              </p>
              <p className="text-[10px] text-gray-500 uppercase tracking-wide">Read-only</p>
            </div>
            <div className="flex-1" />
            <div className="text-xs text-gray-500 text-right">
              <p className="font-semibold text-gray-400">{selectedModule?.name}</p>
              <p>{crmFields.length} CRM fields available</p>
            </div>
          </div>

          {/* Field mapping table — per section */}
          {pageSections.map(section => (
            <div key={section.id} className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
              <div className="px-5 py-3 border-b border-gray-800 bg-gray-800/40">
                <p className="text-sm font-bold text-white">{section.label}</p>
                <p className="text-xs text-gray-500">{section.fields.length} field{section.fields.length !== 1 ? "s" : ""}</p>
              </div>

              {/* Table header */}
              <div className="grid grid-cols-[1fr_160px_130px_80px] gap-3 px-5 py-2.5 border-b border-gray-800 bg-gray-800/20">
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Portal Field</p>
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">CRM Field Mapping</p>
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Permission</p>
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Required</p>
              </div>

              {section.fields.map(field => {
                const m = fieldMappings[field.id] ?? { crmField: "", permission: "editable" as Permission, required: false };
                const wasSaved = savedIds.has(field.id);
                return (
                  <div
                    key={field.id}
                    className={`grid grid-cols-[1fr_160px_130px_80px] gap-3 items-center px-5 py-3 border-b border-gray-800 last:border-0 transition-colors ${
                      wasSaved ? "bg-emerald-950/10" : "hover:bg-gray-800/20"
                    }`}
                  >
                    {/* Portal field info */}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-white truncate">{field.label}</p>
                        {wasSaved && <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />}
                      </div>
                      <p className="text-[10px] text-gray-600 font-mono truncate">{field.fieldKey}</p>
                    </div>

                    {/* CRM field selector */}
                    <CrmFieldSelector
                      crmFields={crmFields}
                      value={m.crmField}
                      onChange={v => updateFieldMapping(field.id, { crmField: v })}
                    />

                    {/* Permission picker */}
                    <PermissionPicker
                      value={m.permission}
                      onChange={p => updateFieldMapping(field.id, { permission: p })}
                    />

                    {/* Required toggle */}
                    <button
                      onClick={() => updateFieldMapping(field.id, { required: !m.required })}
                      className={`flex items-center gap-1.5 text-xs font-medium transition-colors ${
                        m.required ? "text-red-400" : "text-gray-600 hover:text-gray-400"
                      }`}
                    >
                      <Star className={`w-3.5 h-3.5 ${m.required ? "fill-red-400" : ""}`} />
                      {m.required ? "Required" : "Optional"}
                    </button>
                  </div>
                );
              })}
            </div>
          ))}

          {/* Auto-generate sections from CRM (secondary, collapsible) */}
          {suggestions.length > 0 && (
            <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
              <button
                onClick={() => setShowSuggestions(s => !s)}
                className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-800/30 transition-colors"
              >
                <div>
                  <p className="text-sm font-bold text-white text-left">Auto-generate Sections from CRM</p>
                  <p className="text-xs text-gray-500 text-left">
                    Add pre-built sections based on {selectedModule?.name} fields
                  </p>
                </div>
                <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${showSuggestions ? "rotate-180" : ""}`} />
              </button>
              {showSuggestions && (
                <div className="px-5 pb-5 space-y-3 border-t border-gray-800 pt-4">
                  {suggestions.map((s, i) => {
                    const added = addedSuggestions.has(i);
                    return (
                      <div key={i} className="flex items-center gap-4 bg-gray-800/40 border border-gray-700 rounded-xl p-4">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-white mb-1">{s.label}</p>
                          <div className="flex flex-wrap gap-1.5">
                            {s.fieldLabels.slice(0, 5).map((fl, fi) => (
                              <span key={fi} className="text-[10px] bg-gray-700 text-gray-400 px-2 py-0.5 rounded">{fl}</span>
                            ))}
                            {s.fieldLabels.length > 5 && (
                              <span className="text-[10px] text-gray-600">+{s.fieldLabels.length - 5} more</span>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={() => addSuggestionToPage(s, i)}
                          disabled={addingIdx === `${i}` || added}
                          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors shrink-0 ${
                            added
                              ? "bg-green-900/40 text-green-400 cursor-default"
                              : "bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-50"
                          }`}
                        >
                          {addingIdx === `${i}` ? <Loader2 className="w-3 h-3 animate-spin" />
                            : added ? <><CheckCircle className="w-3 h-3" />Added</>
                            : <><Plus className="w-3 h-3" />Add to Page</>
                          }
                        </button>
                      </div>
                    );
                  })}
                  {addedSuggestions.size > 0 && (
                    <button
                      onClick={() => router.push(`/apps/portal-builder/portals/${selectedPageId}`)}
                      className="text-xs text-indigo-400 hover:text-indigo-300"
                    >
                      Open Page Builder to see added sections →
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Bottom save */}
          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={saveFieldMappings}
              disabled={saving}
              className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-colors"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              {saving ? "Saving..." : "Save All Mappings"}
            </button>
            <button
              onClick={() => router.push(`/apps/portal-builder/portals/${selectedPageId}`)}
              className="text-sm text-gray-500 hover:text-gray-300 transition-colors"
            >
              Open Builder →
            </button>
          </div>
        </>
      )}
    </div>
  );
}
