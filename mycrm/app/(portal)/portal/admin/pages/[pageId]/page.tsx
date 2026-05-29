"use client";
import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { portalApi } from "@/lib/portal-api";
import { PortalDragBuilder, BuilderSection } from "@/components/portal/portal-drag-builder";
import { PortalPageRenderer, RenderedPage } from "@/components/portal/portal-page-renderer";
import { PortalCrmMapper } from "@/components/portal/portal-crm-mapper";
import {
  Loader2, ArrowLeft, Globe, Lock, Save, Eye, LayoutGrid,
  Layers, Settings, Check, Database,
} from "lucide-react";

type Tab = "layout" | "builder" | "preview" | "crm" | "settings";

// ── Layout templates ──────────────────────────────────────────────────────────
const TEMPLATES = [
  {
    id: "single",
    name: "Single Column",
    description: "All sections stacked in one column",
    columns: 1,
    preview: "┌──────────┐\n│ Section  │\n├──────────┤\n│ Section  │\n└──────────┘",
  },
  {
    id: "two-column",
    name: "Two Columns",
    description: "Two equal columns side by side",
    columns: 2,
    preview: "┌────┬────┐\n│ S1 │ S2 │\n├────┤    │\n│ S3 │    │\n└────┴────┘",
  },
  {
    id: "three-column",
    name: "Three Columns",
    description: "Three equal columns",
    columns: 3,
    preview: "┌──┬──┬──┐\n│S1│S2│S3│\n│  │  │  │\n│  │  │  │\n└──┴──┴──┘",
  },
  {
    id: "sidebar",
    name: "Sidebar",
    description: "Narrow sidebar + wide main content",
    columns: 2,
    preview: "┌──┬──────┐\n│SB│ Main │\n│  │      │\n│  │      │\n└──┴──────┘",
  },
  {
    id: "tabs",
    name: "Tabs",
    description: "Each section becomes a tab",
    columns: 1,
    preview: "┌─┬─┬─┬──┐\n│A│B│C│  │\n├─┴─┴─┴──┤\n│Content  │\n└─────────┘",
  },
  {
    id: "accordion",
    name: "Accordion",
    description: "Collapsible sections, one open at a time",
    columns: 1,
    preview: "┌──────────┐\n│▶ Sec A   │\n├──────────┤\n│▼ Sec B   │\n│  content │\n└──────────┘",
  },
  {
    id: "cards",
    name: "Cards",
    description: "Sections as cards in a grid",
    columns: 1,
    preview: "┌────┬────┐\n│ S1 │ S2 │\n├────┼────┤\n│ S3 │ S4 │\n└────┴────┘",
  },
  {
    id: "dashboard",
    name: "Dashboard",
    description: "Responsive masonry-style grid",
    columns: 1,
    preview: "┌──┬──┬──┐\n│  │  │  │\n│S1│S2│S3│\n└──┴──┴──┘",
  },
];

export default function PageEditorPage() {
  const { pageId } = useParams<{ pageId: string }>();
  const router = useRouter();

  const [page, setPage] = useState<any>(null);
  const [sections, setSections] = useState<BuilderSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("builder");

  // Settings form
  const [settingsForm, setSettingsForm] = useState({ title: "", description: "" });
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [settingsSaved, setSettingsSaved] = useState(false);

  const [publishing, setPublishing] = useState(false);
  const [republishing, setRepublishing] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await portalApi.get(`/portal/padmin/pages/${pageId}`);
      const p = res.data;
      setPage(p);
      setSettingsForm({ title: p.title, description: p.description ?? "" });
      // Map sections from full page response
      const rawSections: BuilderSection[] = (p.sections ?? []).map((s: any) => ({
        id: s.id,
        label: s.label,
        columnIndex: s.columnIndex ?? 0,
        order: s.order ?? 0,
        isCollapsible: s.isCollapsible ?? false,
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
          isAdminOnly: f.isAdminOnly ?? false,
          options: f.options ?? [],
          order: f.order ?? 0,
          sectionId: s.id,
        })),
      }));
      setSections(rawSections);
    } catch {}
    setLoading(false);
  }, [pageId]);

  useEffect(() => { load(); }, [load]);

  const handlePublish = async () => {
    if (!page) return;
    setPublishing(true);
    const newStatus = page.status === "PUBLISHED" ? "DRAFT" : "PUBLISHED";
    try {
      const res = await portalApi.patch(`/portal/padmin/pages/${pageId}/publish`, { status: newStatus });
      setPage(res.data);
    } catch {}
    setPublishing(false);
  };

  const handleRepublish = async () => {
    if (!page) return;
    setRepublishing(true);
    try {
      const res = await portalApi.post(`/portal/padmin/pages/${pageId}/republish`);
      setPage(res.data);
      // Reload sections since their status changed to PUBLISHED
      await load();
    } catch {}
    setRepublishing(false);
  };

  const handleTemplateChange = async (templateId: string) => {
    try {
      const res = await portalApi.patch(`/portal/padmin/pages/${pageId}`, { layoutTemplate: templateId });
      setPage(res.data);
    } catch {}
  };

  const handleSaveSettings = async () => {
    setSettingsSaving(true);
    try {
      const res = await portalApi.patch(`/portal/padmin/pages/${pageId}`, settingsForm);
      setPage(res.data);
      setSettingsSaved(true);
      setTimeout(() => setSettingsSaved(false), 2000);
    } catch {}
    setSettingsSaving(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-blue-400" />
      </div>
    );
  }

  if (!page) {
    return (
      <div className="flex flex-col items-center gap-4 justify-center h-64">
        <p className="text-gray-400 text-sm">Page not found.</p>
        <button onClick={() => router.push("/portal/admin/pages")} className="text-sm text-blue-400 hover:underline">← Back to pages</button>
      </div>
    );
  }

  const currentTemplate = TEMPLATES.find(t => t.id === (page.layoutTemplate ?? "single")) ?? TEMPLATES[0];
  const templateColumns = currentTemplate.columns;
  const draftSectionCount = sections.filter(s => s.status !== "PUBLISHED").length;

  // Build a RenderedPage for preview
  const renderedPage: RenderedPage = {
    id: page.id,
    title: page.title,
    slug: page.slug,
    description: page.description,
    layoutTemplate: page.layoutTemplate ?? "single",
    blocks: page.blocks ?? [],
    sections: sections.map(s => ({
      id: s.id,
      label: s.label,
      columnIndex: s.columnIndex,
      order: s.order,
      isCollapsible: s.isCollapsible,
      isVisible: true,
      fields: s.fields as any,
    })),
  };

  const TABS = [
    { key: "layout" as Tab,   label: "Layout",      icon: LayoutGrid },
    { key: "builder" as Tab,  label: "Builder",     icon: Layers },
    { key: "preview" as Tab,  label: "Preview",     icon: Eye },
    { key: "crm" as Tab,      label: "CRM Mapping", icon: Database },
    { key: "settings" as Tab, label: "Settings",    icon: Settings },
  ];

  return (
    <div className="space-y-4 max-w-5xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.push("/portal/admin/pages")}
          className="p-1.5 text-gray-500 hover:text-gray-300 hover:bg-gray-800 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-bold text-white truncate">{page.title}</h1>
          <div className="flex items-center gap-2 mt-0.5">
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
              page.status === "PUBLISHED" ? "bg-emerald-900/30 text-emerald-400" : "bg-amber-900/30 text-amber-400"
            }`}>
              {page.status}
            </span>
            <span className="text-xs text-gray-600 font-mono">/{page.slug}</span>
            <span className="text-xs text-gray-600">·</span>
            <span className="text-xs text-gray-600">{currentTemplate.name}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {draftSectionCount > 0 && (
            <span className="text-xs text-amber-400 bg-amber-900/20 px-2 py-1 rounded-lg">
              {draftSectionCount} draft section{draftSectionCount !== 1 ? "s" : ""}
            </span>
          )}
          {page.status === "PUBLISHED" && (
            <button
              onClick={handleRepublish}
              disabled={republishing}
              className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors bg-blue-900/20 text-blue-400 hover:bg-blue-900/40"
            >
              {republishing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Globe className="w-4 h-4" />}
              Republish
            </button>
          )}
          <button
            onClick={handlePublish}
            disabled={publishing}
            className={`flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
              page.status === "PUBLISHED"
                ? "bg-amber-900/20 text-amber-400 hover:bg-amber-900/40"
                : "bg-emerald-900/20 text-emerald-400 hover:bg-emerald-900/40"
            }`}
          >
            {publishing ? <Loader2 className="w-4 h-4 animate-spin" /> : page.status === "PUBLISHED" ? <Lock className="w-4 h-4" /> : <Globe className="w-4 h-4" />}
            {page.status === "PUBLISHED" ? "Unpublish" : "Publish"}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-0 border-b border-gray-800">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
              tab === key ? "border-blue-500 text-white" : "border-transparent text-gray-500 hover:text-gray-300"
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
            {label}
          </button>
        ))}
      </div>

      {/* ── Layout tab ── */}
      {tab === "layout" && (
        <div className="space-y-4">
          <p className="text-sm text-gray-400">Choose the layout template for this page. This controls how sections and columns are arranged.</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {TEMPLATES.map(t => (
              <button
                key={t.id}
                onClick={() => handleTemplateChange(t.id)}
                className={`text-left border rounded-xl p-4 transition-all ${
                  (page.layoutTemplate ?? "single") === t.id
                    ? "border-blue-500 bg-blue-900/20"
                    : "border-gray-800 bg-gray-900 hover:border-gray-600"
                }`}
              >
                <pre className="text-[9px] font-mono text-gray-500 leading-tight mb-3 whitespace-pre">{t.preview}</pre>
                <p className={`text-xs font-semibold ${(page.layoutTemplate ?? "single") === t.id ? "text-blue-400" : "text-white"}`}>
                  {t.name}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">{t.description}</p>
                {(page.layoutTemplate ?? "single") === t.id && (
                  <div className="mt-2 flex items-center gap-1 text-xs text-blue-400">
                    <Check className="w-3 h-3" />Active
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Builder tab ── */}
      {tab === "builder" && (
        <PortalDragBuilder
          pageId={pageId}
          sections={sections}
          templateColumns={templateColumns}
          onSectionsChange={setSections}
        />
      )}

      {/* ── Preview tab ── */}
      {tab === "preview" && (
        <div className="bg-white rounded-2xl border border-gray-200 p-8">
          <div className="max-w-4xl mx-auto">
            <div className="mb-6">
              {page.icon && <div className="text-3xl mb-3">{page.icon}</div>}
              <h1 className="text-2xl font-bold text-gray-900">{page.title}</h1>
              {page.description && <p className="text-sm text-gray-500 mt-1">{page.description}</p>}
            </div>
            <PortalPageRenderer
              page={renderedPage}
              fieldValues={{}}
              readOnly
            />
            {sections.length === 0 && (
              <div className="text-center py-12 text-gray-400">
                <p className="text-sm">No sections yet. Add sections in the Builder tab.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── CRM Mapping tab ── */}
      {tab === "crm" && (
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <PortalCrmMapper pageId={pageId} />
        </div>
      )}

      {/* ── Settings tab ── */}
      {tab === "settings" && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-5 max-w-lg">
          <h2 className="text-sm font-semibold text-white">Page Settings</h2>
          <div>
            <label className="block text-xs text-gray-400 mb-1.5">Page Title</label>
            <input
              value={settingsForm.title}
              onChange={e => setSettingsForm(f => ({ ...f, title: e.target.value }))}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1.5">Description</label>
            <textarea
              value={settingsForm.description}
              onChange={e => setSettingsForm(f => ({ ...f, description: e.target.value }))}
              rows={3}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500 resize-none"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1.5">Slug (read-only)</label>
            <input
              value={page.slug}
              readOnly
              className="w-full bg-gray-800/50 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-500 font-mono"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1.5">Layout Template</label>
            <input
              value={currentTemplate.name}
              readOnly
              className="w-full bg-gray-800/50 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-500"
            />
            <p className="text-xs text-gray-600 mt-1">Change the template in the Layout tab.</p>
          </div>
          <div className="pt-1 flex items-center gap-3">
            <button
              onClick={handleSaveSettings}
              disabled={settingsSaving}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-medium rounded-lg"
            >
              {settingsSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save Settings
            </button>
            {settingsSaved && <span className="text-xs text-emerald-400">Saved</span>}
          </div>
        </div>
      )}
    </div>
  );
}
