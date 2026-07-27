"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { portalApi } from "@/lib/portal-api";
import {
  Loader2, Plus, Trash2, Pencil, ChevronDown, ChevronRight,
  Check, X, Eye, EyeOff, GripVertical, FileText, Globe, Menu,
  LayoutGrid, ArrowRight, ExternalLink, Minus, AlertCircle, Rocket,
} from "lucide-react";

// ── Types ──────────────────────────────────────────────────────────────────────
interface PortalPage { id: string; title: string; slug: string; status: string; layoutTemplate?: string; }
interface MenuItem {
  id: string; label: string; icon?: string; type: string; target?: string;
  isVisible: boolean; order: number; parentId?: string; children?: MenuItem[];
}

// ── Constants ─────────────────────────────────────────────────────────────────
const ICONS = [
  "📋","📄","📁","📊","📈","🗂️","📝","🔗","⭐","🏠","👤","💼",
  "🎓","🏥","⚙️","🔔","📌","🌐","💳","📅","🏭","🤝","📦","🔑",
];

const PAGE_LAYOUTS = [
  { id: "single",       name: "Single Column",   desc: "One-column stacked layout",     preview: "▬\n▬\n▬" },
  { id: "two-column",   name: "Two Columns",      desc: "Side-by-side sections",         preview: "▬▬\n▬▬" },
  { id: "sidebar",      name: "Sidebar",          desc: "Nav sidebar + main content",    preview: "▌▬▬\n▌▬▬" },
  { id: "three-column", name: "Three Columns",    desc: "Wide triple-column grid",       preview: "▬▬▬\n▬▬▬" },
  { id: "dashboard",    name: "Dashboard",        desc: "Stat cards + content area",     preview: "□□□\n▬▬▬" },
  { id: "cards",        name: "Cards",            desc: "Card-based sections",           preview: "□□\n□□" },
];

const EMPTY_FORM = { label: "", icon: "📋", isVisible: true, parentId: "" };

function flatItems(items: MenuItem[]): MenuItem[] {
  return items.flatMap(i => [i, ...(i.children ? flatItems(i.children) : [])]);
}

// ── ItemRow ──────────────────────────────────────────────────────────────────
function ItemRow({ item, depth, onEdit, onDelete, onToggleVisibility }: {
  item: MenuItem; depth: number;
  onEdit: (item: MenuItem) => void;
  onDelete: (id: string) => void;
  onToggleVisibility: (item: MenuItem) => void;
}) {
  const [open, setOpen] = useState(true);
  const hasChildren = (item.children?.length ?? 0) > 0;
  const typeColors: Record<string, string> = {
    page: "bg-indigo-900/40 text-indigo-300",
    link: "bg-blue-900/40 text-blue-300",
    section: "bg-violet-900/40 text-violet-300",
    divider: "bg-gray-800 text-gray-500",
  };

  return (
    <>
      <div
        className="flex items-center gap-3 px-4 py-3 border-b border-gray-800 hover:bg-gray-800/40 transition-colors"
        style={{ paddingLeft: `${16 + depth * 24}px` }}
      >
        <GripVertical className="w-4 h-4 text-gray-700 shrink-0 cursor-grab" />
        {hasChildren ? (
          <button onClick={() => setOpen(o => !o)} className="text-gray-600 hover:text-gray-400 shrink-0">
            {open ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
          </button>
        ) : <span className="w-3.5 shrink-0" />}
        <span className="text-base leading-none shrink-0">{item.icon ?? "•"}</span>
        <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold shrink-0 ${typeColors[item.type] ?? "bg-gray-800 text-gray-500"}`}>
          {item.type}
        </span>
        <span className="flex-1 text-sm text-white truncate font-medium">{item.label}</span>
        {item.target && (
          <span className="text-[10px] text-gray-600 truncate max-w-[160px] hidden md:block font-mono">
            {item.target}
          </span>
        )}
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => onToggleVisibility(item)}
            title={item.isVisible ? "Visible — click to hide" : "Hidden — click to show"}
            className={`p-1.5 rounded-lg transition-colors ${item.isVisible ? "text-gray-400 hover:text-white" : "text-gray-700 hover:text-gray-400"}`}
          >
            {item.isVisible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={() => onEdit(item)}
            className="p-1.5 text-gray-600 hover:text-indigo-400 hover:bg-indigo-900/20 rounded-lg transition-colors"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onDelete(item.id)}
            className="p-1.5 text-gray-600 hover:text-red-400 hover:bg-red-900/20 rounded-lg transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
      {open && hasChildren && item.children?.map(child => (
        <ItemRow key={child.id} item={child} depth={depth + 1}
          onEdit={onEdit} onDelete={onDelete} onToggleVisibility={onToggleVisibility} />
      ))}
    </>
  );
}

// ── Add Menu Wizard ────────────────────────────────────────────────────────────
type WizardStep = "type" | "page-choice" | "select-page" | "create-page" | "link" | "finalize";
type MenuType = "page" | "link" | "divider" | "section";
type PageChoice = "existing" | "new";

function AddMenuWizard({
  pages,
  allFlat,
  onClose,
  onSaved,
  editingItem,
}: {
  pages: PortalPage[];
  allFlat: MenuItem[];
  onClose: () => void;
  onSaved: () => void;
  editingItem?: MenuItem | null;
}) {
  const router = useRouter();

  // Wizard state
  const [step, setStep] = useState<WizardStep>(editingItem ? "finalize" : "type");
  const [menuType, setMenuType] = useState<MenuType>(editingItem ? (editingItem.type as MenuType) : "page");
  const [pageChoice, setPageChoice] = useState<PageChoice>("existing");
  const [selectedPageId, setSelectedPageId] = useState<string>(
    editingItem?.target
      ? (pages.find(p => editingItem.target?.includes(p.slug))?.id ?? "")
      : ""
  );
  const [newPageTitle, setNewPageTitle] = useState("");
  const [newPageLayout, setNewPageLayout] = useState("single");
  const [linkUrl, setLinkUrl] = useState(editingItem?.type === "link" ? (editingItem.target ?? "") : "");
  const [label, setLabel] = useState(editingItem?.label ?? "");
  const [icon, setIcon] = useState(editingItem?.icon ?? "📋");
  const [isVisible, setIsVisible] = useState(editingItem?.isVisible ?? true);
  const [parentId, setParentId] = useState(editingItem?.parentId ?? "");
  const [saving, setSaving] = useState(false);
  const [creatingPage, setCreatingPage] = useState(false);
  const [error, setError] = useState("");

  const TYPE_OPTIONS: { type: MenuType; icon: any; label: string; desc: string }[] = [
    { type: "page", icon: FileText, label: "Page Link", desc: "Link to a portal page (existing or new)" },
    { type: "link", icon: Globe, label: "External Link", desc: "Any URL — internal or external" },
    { type: "section", icon: Minus, label: "Section Label", desc: "Non-clickable section heading" },
    { type: "divider", icon: Minus, label: "Divider", desc: "Visual separator line in the menu" },
  ];

  const selectedPage = pages.find(p => p.id === selectedPageId);

  const goFinalize = () => setStep("finalize");

  const handleTypeSelect = (t: MenuType) => {
    setMenuType(t);
    setError("");
    if (t === "page") setStep("page-choice");
    else if (t === "link") setStep("link");
    else goFinalize();
  };

  const handlePageChoice = (choice: PageChoice) => {
    setPageChoice(choice);
    setStep(choice === "existing" ? "select-page" : "create-page");
  };

  const handleSelectPage = (page: PortalPage) => {
    setSelectedPageId(page.id);
    if (!label) setLabel(page.title);
    goFinalize();
  };

  const handleCreatePageAndContinue = async () => {
    if (!newPageTitle.trim()) { setError("Page title is required"); return; }
    setCreatingPage(true);
    setError("");
    try {
      const res = await portalApi.post("/portal/padmin/pages", {
        title: newPageTitle.trim(),
        layoutTemplate: newPageLayout,
      });
      const newPage: PortalPage = res.data;
      setSelectedPageId(newPage.id);
      if (!label) setLabel(newPage.title);
      goFinalize();
    } catch (e: any) {
      setError(e?.response?.data?.message ?? "Failed to create page");
    }
    setCreatingPage(false);
  };

  const handleSave = async () => {
    if (!label.trim()) { setError("Menu label is required"); return; }
    setSaving(true);
    setError("");

    let target: string | undefined;
    if (menuType === "page" && selectedPage) {
      target = `/portal/pages/${selectedPage.slug}`;
    } else if (menuType === "link") {
      target = linkUrl || undefined;
    }

    const payload = {
      label: label.trim(),
      type: menuType,
      target,
      icon: icon || undefined,
      isVisible,
      parentId: parentId || undefined,
    };

    try {
      if (editingItem) {
        await portalApi.patch(`/portal/padmin/menu/${editingItem.id}`, payload);
      } else {
        await portalApi.post("/portal/padmin/menu", payload);
      }
      onSaved();

      // If a new page was created (not from existing), open the builder
      if (!editingItem && menuType === "page" && selectedPageId && pageChoice === "new") {
        router.push(`/apps/portal-builder/pages/${selectedPageId}`);
      }
    } catch (e: any) {
      setError(e?.response?.data?.message ?? "Failed to save");
      setSaving(false);
    }
  };

  const canGoBack: Partial<Record<WizardStep, WizardStep>> = {
    "page-choice": "type",
    "select-page": "page-choice",
    "create-page": "page-choice",
    "link": "type",
    "finalize": menuType === "page" ? (pageChoice === "existing" ? "select-page" : "create-page") : menuType === "link" ? "link" : "type",
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700 shrink-0">
          <div className="flex items-center gap-3">
            {canGoBack[step] && !editingItem && (
              <button
                onClick={() => setStep(canGoBack[step]!)}
                className="p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-gray-800 transition-colors"
              >
                <ArrowRight className="w-4 h-4 rotate-180" />
              </button>
            )}
            <div>
              <h2 className="text-sm font-bold text-white">
                {editingItem ? "Edit Menu Item" : "Add Menu Item"}
              </h2>
              {!editingItem && (
                <p className="text-[10px] text-gray-500 mt-0.5">
                  {step === "type" && "What type of menu item?"}
                  {step === "page-choice" && "How to associate a page?"}
                  {step === "select-page" && "Pick a page"}
                  {step === "create-page" && "Create a new page"}
                  {step === "link" && "Enter the link URL"}
                  {step === "finalize" && "Name & finalize"}
                </p>
              )}
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-gray-500 hover:text-white rounded-lg transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Wizard body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">

          {/* ── Step: Type selection ── */}
          {step === "type" && (
            <div className="space-y-3">
              <p className="text-xs text-gray-400 mb-4">Choose what this menu item will do:</p>
              <div className="grid grid-cols-2 gap-3">
                {TYPE_OPTIONS.map(opt => (
                  <button
                    key={opt.type}
                    onClick={() => handleTypeSelect(opt.type)}
                    className="flex flex-col items-start p-4 bg-gray-800 border border-gray-700 hover:border-indigo-500 hover:bg-indigo-900/10 rounded-xl text-left transition-all group"
                  >
                    <opt.icon className="w-5 h-5 text-gray-500 group-hover:text-indigo-400 mb-2.5 transition-colors" />
                    <p className="text-sm font-semibold text-white mb-0.5">{opt.label}</p>
                    <p className="text-xs text-gray-500">{opt.desc}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── Step: Page choice ── */}
          {step === "page-choice" && (
            <div className="space-y-3">
              <p className="text-xs text-gray-400 mb-4">Associate this menu item with a page:</p>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => handlePageChoice("existing")}
                  className="flex flex-col items-start p-5 bg-gray-800 border border-gray-700 hover:border-indigo-500 hover:bg-indigo-900/10 rounded-xl text-left transition-all group"
                >
                  <div className="w-9 h-9 rounded-xl bg-indigo-900/40 flex items-center justify-center mb-3">
                    <FileText className="w-4.5 h-4.5 text-indigo-400" />
                  </div>
                  <p className="text-sm font-bold text-white mb-1">Select Existing Page</p>
                  <p className="text-xs text-gray-500">Pick from {pages.length} existing page{pages.length !== 1 ? "s" : ""}</p>
                </button>
                <button
                  onClick={() => handlePageChoice("new")}
                  className="flex flex-col items-start p-5 bg-gray-800 border border-gray-700 hover:border-emerald-500 hover:bg-emerald-900/10 rounded-xl text-left transition-all group"
                >
                  <div className="w-9 h-9 rounded-xl bg-emerald-900/40 flex items-center justify-center mb-3">
                    <Plus className="w-4.5 h-4.5 text-emerald-400" />
                  </div>
                  <p className="text-sm font-bold text-white mb-1">Create New Page</p>
                  <p className="text-xs text-gray-500">Design a brand new page from scratch</p>
                </button>
              </div>
              {pages.length === 0 && (
                <p className="text-xs text-amber-400 mt-2">
                  No pages yet — select "Create New Page" to make one.
                </p>
              )}
            </div>
          )}

          {/* ── Step: Select existing page ── */}
          {step === "select-page" && (
            <div className="space-y-3">
              {pages.length === 0 ? (
                <div className="text-center py-10">
                  <LayoutGrid className="w-8 h-8 text-gray-700 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">No pages available.</p>
                  <button
                    onClick={() => setStep("create-page")}
                    className="mt-3 text-sm text-indigo-400 hover:text-indigo-300"
                  >
                    Create a new page instead →
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-2 max-h-80 overflow-y-auto pr-1">
                  {pages.map(p => (
                    <button
                      key={p.id}
                      onClick={() => handleSelectPage(p)}
                      className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition-all ${
                        selectedPageId === p.id
                          ? "border-indigo-500 bg-indigo-900/20"
                          : "border-gray-700 bg-gray-800 hover:border-gray-600"
                      }`}
                    >
                      <div className="w-8 h-8 rounded-lg bg-gray-700 flex items-center justify-center shrink-0">
                        <FileText className="w-3.5 h-3.5 text-gray-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-white truncate">{p.title}</p>
                        <p className="text-xs text-gray-500 font-mono">/{p.slug}</p>
                      </div>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold shrink-0 ${
                        p.status === "PUBLISHED" ? "bg-green-900/50 text-green-400" : "bg-gray-800 text-gray-500"
                      }`}>
                        {p.status === "PUBLISHED" ? "Live" : "Draft"}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── Step: Create new page ── */}
          {step === "create-page" && (
            <div className="space-y-5">
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1.5">Page Title *</label>
                <input
                  autoFocus
                  value={newPageTitle}
                  onChange={e => { setNewPageTitle(e.target.value); setError(""); }}
                  onKeyDown={e => { if (e.key === "Enter") handleCreatePageAndContinue(); }}
                  placeholder="e.g. My Profile, Dashboard, Documents..."
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-3">Choose Layout</label>
                <div className="grid grid-cols-3 gap-2">
                  {PAGE_LAYOUTS.map(layout => (
                    <button
                      key={layout.id}
                      onClick={() => setNewPageLayout(layout.id)}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        newPageLayout === layout.id
                          ? "border-indigo-500 bg-indigo-900/20"
                          : "border-gray-700 bg-gray-800 hover:border-gray-600"
                      }`}
                    >
                      <pre className={`text-[10px] font-mono leading-tight mb-2 whitespace-pre ${
                        newPageLayout === layout.id ? "text-indigo-400" : "text-gray-600"
                      }`}>{layout.preview}</pre>
                      <p className={`text-xs font-semibold leading-tight ${
                        newPageLayout === layout.id ? "text-white" : "text-gray-400"
                      }`}>{layout.name}</p>
                      <p className="text-[9px] text-gray-600 mt-0.5 leading-tight">{layout.desc}</p>
                    </button>
                  ))}
                </div>
              </div>
              {error && (
                <p className="text-xs text-red-400 flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />{error}
                </p>
              )}
              <button
                onClick={handleCreatePageAndContinue}
                disabled={creatingPage || !newPageTitle.trim()}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-colors"
              >
                {creatingPage
                  ? <><Loader2 className="w-4 h-4 animate-spin" />Creating page...</>
                  : <><Check className="w-4 h-4" />Create Page & Continue</>
                }
              </button>
            </div>
          )}

          {/* ── Step: External link ── */}
          {step === "link" && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1.5">URL</label>
                <input
                  autoFocus
                  value={linkUrl}
                  onChange={e => { setLinkUrl(e.target.value); setError(""); }}
                  onKeyDown={e => { if (e.key === "Enter" && linkUrl.trim()) goFinalize(); }}
                  placeholder="https://example.com or /portal/some-path"
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white text-sm font-mono placeholder-gray-600 focus:outline-none focus:border-indigo-500"
                />
                <p className="text-xs text-gray-500 mt-1.5">External URLs open in a new tab. Internal paths starting with / stay in the portal.</p>
              </div>
              <button
                onClick={() => { if (linkUrl.trim()) goFinalize(); else setError("URL is required"); }}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-colors"
              >
                Continue <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* ── Step: Finalize ── */}
          {step === "finalize" && (
            <div className="space-y-5">
              {/* Summary of what will be linked */}
              {menuType === "page" && selectedPage && (
                <div className="flex items-center gap-3 bg-indigo-950/40 border border-indigo-800/50 rounded-xl px-4 py-3">
                  <FileText className="w-4 h-4 text-indigo-400 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-white truncate">{selectedPage.title}</p>
                    <p className="text-[10px] text-indigo-400 font-mono">/portal/pages/{selectedPage.slug}</p>
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                    selectedPage.status === "PUBLISHED" ? "bg-green-900/50 text-green-400" : "bg-gray-800 text-gray-500"
                  }`}>{selectedPage.status === "PUBLISHED" ? "Live" : "Draft"}</span>
                </div>
              )}
              {menuType === "link" && linkUrl && (
                <div className="flex items-center gap-3 bg-blue-950/30 border border-blue-800/40 rounded-xl px-4 py-3">
                  <ExternalLink className="w-4 h-4 text-blue-400 shrink-0" />
                  <p className="text-xs text-blue-300 font-mono truncate flex-1">{linkUrl}</p>
                </div>
              )}

              {/* Label */}
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1.5">Menu Label *</label>
                <input
                  autoFocus={!editingItem}
                  value={label}
                  onChange={e => { setLabel(e.target.value); setError(""); }}
                  onKeyDown={e => { if (e.key === "Enter") handleSave(); }}
                  placeholder="e.g. My Profile, Documents, Dashboard..."
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Icon */}
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-2">Icon</label>
                <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                  {ICONS.map(ic => (
                    <button
                      key={ic}
                      onClick={() => setIcon(ic)}
                      className={`w-9 h-9 rounded-lg text-lg flex items-center justify-center transition-all ${
                        icon === ic ? "bg-indigo-600 ring-2 ring-indigo-400 scale-110" : "bg-gray-800 hover:bg-gray-700"
                      }`}
                    >
                      {ic}
                    </button>
                  ))}
                </div>
              </div>

              {/* Parent */}
              {allFlat.length > 0 && (
                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1.5">Parent (optional)</label>
                  <select
                    value={parentId}
                    onChange={e => setParentId(e.target.value)}
                    className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="">— Top level —</option>
                    {allFlat.filter(i => !i.parentId && i.id !== editingItem?.id).map(i => (
                      <option key={i.id} value={i.id}>{i.label}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Visibility */}
              <label className="flex items-center gap-3 cursor-pointer select-none">
                <div
                  onClick={() => setIsVisible(v => !v)}
                  className={`w-10 h-5.5 rounded-full transition-colors flex items-center px-0.5 ${isVisible ? "bg-indigo-600" : "bg-gray-700"}`}
                  style={{ height: "22px" }}
                >
                  <div className={`w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${isVisible ? "translate-x-5" : "translate-x-0"}`} />
                </div>
                <span className="text-sm text-gray-300">Visible in portal navigation</span>
              </label>

              {error && (
                <p className="text-xs text-red-400 flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />{error}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Footer actions */}
        {step === "finalize" && (
          <div className="px-6 py-4 border-t border-gray-700 flex gap-3 shrink-0">
            <button
              onClick={handleSave}
              disabled={saving || !label.trim()}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-colors"
            >
              {saving
                ? <><Loader2 className="w-4 h-4 animate-spin" />Saving...</>
                : editingItem
                  ? <><Check className="w-4 h-4" />Save Changes</>
                  : menuType === "page" && pageChoice === "new"
                    ? <><Rocket className="w-4 h-4" />Save & Open Builder</>
                    : <><Check className="w-4 h-4" />Add to Menu</>
              }
            </button>
            <button onClick={onClose} className="px-4 text-gray-500 hover:text-white text-sm rounded-xl transition-colors">
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function StudioMenuPage() {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [pages, setPages] = useState<PortalPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [showWizard, setShowWizard] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);

  const load = () => {
    setLoading(true);
    Promise.all([
      portalApi.get("/portal/padmin/menu"),
      portalApi.get("/portal/padmin/pages"),
    ])
      .then(([menuRes, pagesRes]) => {
        setItems(menuRes.data ?? []);
        setPages(pagesRes.data ?? []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this menu item?")) return;
    try { await portalApi.delete(`/portal/padmin/menu/${id}`); load(); } catch {}
  };

  const handleToggleVisibility = async (item: MenuItem) => {
    try {
      await portalApi.patch(`/portal/padmin/menu/${item.id}`, { isVisible: !item.isVisible });
      load();
    } catch {}
  };

  const handleWizardSaved = () => {
    setShowWizard(false);
    setEditingItem(null);
    load();
  };

  const allFlat = flatItems(items);

  return (
    <div className="space-y-5 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-white">Menu Builder</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            Configure your portal navigation. {allFlat.length} item{allFlat.length !== 1 ? "s" : ""} total.
          </p>
        </div>
        <button
          onClick={() => { setEditingItem(null); setShowWizard(true); }}
          className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold rounded-xl transition-colors shadow-lg shadow-indigo-900/30"
        >
          <Plus className="w-4 h-4" />
          Add Menu Item
        </button>
      </div>

      {/* Menu items list */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 className="w-5 h-5 animate-spin text-indigo-400" />
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4 text-center px-6">
            <div className="w-14 h-14 rounded-2xl bg-gray-800 flex items-center justify-center">
              <Menu className="w-6 h-6 text-gray-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white mb-1">No menu items yet</p>
              <p className="text-xs text-gray-500">Start by adding a menu item. You can create a new page at the same time.</p>
            </div>
            <button
              onClick={() => setShowWizard(true)}
              className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold rounded-xl"
            >
              <Plus className="w-4 h-4" />
              Add Your First Menu Item
            </button>
          </div>
        ) : (
          <div>
            <div className="px-4 py-2.5 border-b border-gray-800 bg-gray-800/50 flex items-center justify-between">
              <p className="text-[10px] text-gray-600 font-semibold uppercase tracking-wider">
                {allFlat.length} item{allFlat.length !== 1 ? "s" : ""}
              </p>
              <p className="text-[10px] text-gray-600">Drag rows to reorder · click eye to hide</p>
            </div>
            {items.map(item => (
              <ItemRow
                key={item.id}
                item={item}
                depth={0}
                onEdit={item => { setEditingItem(item); setShowWizard(true); }}
                onDelete={handleDelete}
                onToggleVisibility={handleToggleVisibility}
              />
            ))}
          </div>
        )}
      </div>

      {/* Tips */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 text-xs text-gray-500 space-y-1">
        <p className="font-semibold text-gray-400">How menu items work</p>
        <p>• <strong className="text-gray-300">Page Link</strong> — links to a portal page. Create a new one or pick existing.</p>
        <p>• <strong className="text-gray-300">External Link</strong> — any URL; links open in a new tab if external.</p>
        <p>• <strong className="text-gray-300">Section Label</strong> — non-clickable group heading in the sidebar.</p>
        <p>• <strong className="text-gray-300">Divider</strong> — thin visual separator line.</p>
        <p>• Nest items by selecting a parent — creates collapsible sub-menus.</p>
      </div>

      {/* Wizard modal */}
      {showWizard && (
        <AddMenuWizard
          pages={pages}
          allFlat={allFlat}
          editingItem={editingItem}
          onClose={() => { setShowWizard(false); setEditingItem(null); }}
          onSaved={handleWizardSaved}
        />
      )}
    </div>
  );
}
