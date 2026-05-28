"use client";
import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { PortalShell } from "@/components/portal/portal-shell";
import { portalApi } from "@/lib/portal-api";
import { PortalPageRenderer, RenderedPage } from "@/components/portal/portal-page-renderer";
import { Loader2, AlertCircle, Save, Check, Database, RefreshCw } from "lucide-react";

interface SaveResult {
  success: boolean;
  crmUpdated: number;
  portalUpdated: number;
}

export default function PortalPageView() {
  const { slug } = useParams<{ slug: string }>();
  const [page, setPage] = useState<RenderedPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  // Field values: loaded from CRM-aware endpoint, edited locally
  const [fieldValues, setFieldValues] = useState<Record<string, any>>({});
  const [dirtyFields, setDirtyFields] = useState<Record<string, any>>({});
  const [saving, setSaving] = useState(false);
  const [saveResult, setSaveResult] = useState<SaveResult | null>(null);
  const [syncError, setSyncError] = useState(false);

  // Load page config + initial field values
  useEffect(() => {
    let cancelled = false;

    Promise.all([
      portalApi.get(`/portal/pages/${slug}`),
      portalApi.get(`/portal/pages/${slug}/data`).catch(() => ({ data: {} })),
    ])
      .then(([pageRes, dataRes]) => {
        if (cancelled) return;
        const p = pageRes.data;
        const sections = (p.sections ?? []).map((s: any) => ({
          id: s.id,
          label: s.label,
          columnIndex: s.columnIndex ?? 0,
          order: s.order ?? 0,
          isCollapsible: s.isCollapsible ?? false,
          isVisible: s.isVisible ?? true,
          fields: (s.fields ?? []).map((f: any) => ({
            id: f.id,
            label: f.label,
            fieldKey: f.fieldKey,
            fieldType: f.fieldType,
            placeholder: f.placeholder,
            helpText: f.helpText,
            isRequired: f.isRequired ?? false,
            isEditable: f.isEditable ?? true,
            isReadOnly: f.isReadOnly ?? false,
            isVisible: f.isVisible ?? true,
            isAdminOnly: false,
            options: f.options ?? [],
          })),
        }));
        const rendered: RenderedPage = {
          id: p.id,
          title: p.title,
          slug: p.slug,
          description: p.description,
          icon: p.icon,
          layoutTemplate: p.layoutTemplate ?? "single",
          blocks: p.blocks ?? [],
          sections,
        };
        setPage(rendered);
        setFieldValues(dataRes.data ?? {});
      })
      .catch(() => {
        if (!cancelled) setError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [slug]);

  const handleChange = useCallback((fieldKey: string, value: any) => {
    setFieldValues(prev => ({ ...prev, [fieldKey]: value }));
    setDirtyFields(prev => ({ ...prev, [fieldKey]: value }));
    setSaveResult(null);
  }, []);

  const handleSave = async () => {
    if (Object.keys(dirtyFields).length === 0) return;
    setSaving(true);
    setSyncError(false);
    try {
      const res = await portalApi.patch(`/portal/pages/${slug}/data`, {
        updates: Object.entries(dirtyFields).map(([fieldKey, value]) => ({ fieldKey, value })),
      });
      setDirtyFields({});
      setSaveResult(res.data);
      setTimeout(() => setSaveResult(null), 4000);
    } catch {
      setSyncError(true);
    }
    setSaving(false);
  };

  const hasEditable = page?.sections.some(s => s.fields.some(f => f.isEditable && !f.isReadOnly)) ?? false;
  const hasDirty = Object.keys(dirtyFields).length > 0;

  return (
    <PortalShell>
      <div className="max-w-5xl mx-auto">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
          </div>
        ) : error || !page ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400 gap-3">
            <AlertCircle className="w-10 h-10 opacity-40" />
            <p className="text-sm font-medium">Page not found or unavailable.</p>
          </div>
        ) : (
          <div className="space-y-5">
            {/* Page header */}
            <div className="mb-2">
              {page.icon && <div className="text-4xl mb-3">{page.icon}</div>}
              <h1 className="text-2xl font-bold text-gray-900">{page.title}</h1>
              {page.description && <p className="text-sm text-gray-500 mt-1">{page.description}</p>}
            </div>

            {/* Save bar */}
            {hasEditable && hasDirty && (
              <div className="flex items-center justify-between bg-indigo-50 border border-indigo-200 rounded-xl px-5 py-3">
                <p className="text-sm text-indigo-700">You have unsaved changes.</p>
                <div className="flex items-center gap-3">
                  {syncError && (
                    <span className="text-xs text-red-500 flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5" />Failed to save
                    </span>
                  )}
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-medium rounded-lg"
                  >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    Save changes
                  </button>
                </div>
              </div>
            )}

            {/* CRM sync confirmation toast */}
            {saveResult && (
              <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-xl px-5 py-3">
                <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                <p className="text-sm text-emerald-700 flex-1">Changes saved successfully.</p>
                {saveResult.crmUpdated > 0 && (
                  <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-600 bg-emerald-100 px-2.5 py-1 rounded-full">
                    <Database className="w-3 h-3" />
                    {saveResult.crmUpdated} field{saveResult.crmUpdated !== 1 ? "s" : ""} synced to CRM
                  </span>
                )}
                {saveResult.portalUpdated > 0 && (
                  <span className="flex items-center gap-1.5 text-xs font-medium text-indigo-600 bg-indigo-100 px-2.5 py-1 rounded-full">
                    <RefreshCw className="w-3 h-3" />
                    {saveResult.portalUpdated} portal field{saveResult.portalUpdated !== 1 ? "s" : ""} updated
                  </span>
                )}
              </div>
            )}

            {/* Dynamic page content */}
            <PortalPageRenderer
              page={page}
              fieldValues={fieldValues}
              onChange={handleChange}
              readOnly={false}
            />

            {/* Floating save button for mobile */}
            {hasEditable && hasDirty && (
              <div className="fixed bottom-6 right-6 sm:hidden">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex items-center gap-2 px-5 py-3 bg-indigo-600 text-white text-sm font-medium rounded-full shadow-xl"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Save
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </PortalShell>
  );
}
