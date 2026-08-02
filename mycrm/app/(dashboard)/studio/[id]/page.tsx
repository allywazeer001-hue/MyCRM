"use client";
import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft, Plus, Minus, GripVertical, X, Settings, Eye, Save, Loader2,
  ChevronDown, ChevronUp, Search, Workflow, AlertCircle, Trash2,
  ChevronRight, ArrowRight, CheckCircle2, Info, Globe, LayoutGrid, LayoutTemplate,
} from "lucide-react";
import {
  DndContext, DragEndEvent, DragStartEvent, DragOverEvent,
  PointerSensor, useSensor, useSensors, closestCenter, DragOverlay,
} from "@dnd-kit/core";
import {
  SortableContext, useSortable, verticalListSortingStrategy, arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { DesktopOnlyGate } from "@/components/ui/desktop-only-notice";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useModulesStore, Field } from "@/store/modules.store";
import { IconPicker } from "@/components/ui/icon-picker";
import { MultiCombobox } from "@/components/ui/combobox";
import { api } from "@/lib/api";
import Link from "next/link";
import { cn, parseFieldSettings, generateId } from "@/lib/utils";
import { useToast } from "@/components/ui/toast";
import { type SummaryStatConfig, type SummaryCondition } from "@/components/modules/module-summary-bar";
import {
  DEFAULT_MODULE_LAYOUT, LayoutConfig, LayoutTab,
  ModuleLayoutRule, ModuleRuleCondition, ModuleRuleAction,
  ModuleRuleConditionGroup, ModuleRuleConditionNode,
  ModuleRuleOperator, ModuleRuleActionType, ModuleRuleTarget, ModuleRuleLogic,
} from "@/lib/layout-templates";
import { ModuleLayoutCanvas, TabChip } from "@/components/studio/layout-canvas";
import { CollapsibleSection } from "@/components/ui/collapsible-section";
import { ModuleIcon } from "@/components/ui/module-icon";
import { ConditionTreeBuilder } from "@/components/workflows/ConditionTreeBuilder";
import { normalizeConditionTree, type ConditionGroup } from "@/lib/condition-tree";
import { INTEGRATION_FILTER_OPERATORS, INTEGRATION_FILTER_NO_VALUE_OPS } from "@/components/records/integration-filter-operators";
import { FORMULA_FUNCTION_DOCS, validateFormula, type FormulaFunctionDoc } from "@/lib/formula-engine";

const FIELD_TYPES = [
  { type: "TEXT",          label: "Single Line Text",  icon: "T",   group: "Text",     description: "Short text input" },
  { type: "TEXTAREA",      label: "Multi Line Text",   icon: "¶",   group: "Text",     description: "Long text area" },
  { type: "RICH_TEXT",     label: "Rich Text",         icon: "R",   group: "Text",     description: "Formatted content" },
  { type: "NUMBER",        label: "Number",            icon: "#",   group: "Number",   description: "Integer number" },
  { type: "DECIMAL",       label: "Decimal",           icon: "0.0", group: "Number",   description: "Decimal / float" },
  { type: "CURRENCY",      label: "Currency",          icon: "$",   group: "Number",   description: "Money field" },
  { type: "EMAIL",         label: "Email",             icon: "@",   group: "Contact",  description: "Email address" },
  { type: "PHONE",         label: "Phone",             icon: "☎",   group: "Contact",  description: "Phone number" },
  { type: "URL",           label: "URL / Link",        icon: "🔗",  group: "Contact",  description: "Web URL" },
  { type: "DATE",          label: "Date",              icon: "📅",  group: "DateTime", description: "Date picker" },
  { type: "DATETIME",      label: "Date & Time",       icon: "🕐",  group: "DateTime", description: "Date and time" },
  { type: "BOOLEAN",       label: "Yes / No",          icon: "✓",   group: "Choice",   description: "True or false" },
  { type: "DROPDOWN",      label: "Dropdown",          icon: "▼",   group: "Choice",   description: "Single select" },
  { type: "MULTI_SELECT",  label: "Multi Select",      icon: "☑",   group: "Choice",   description: "Multiple choices" },
  { type: "STATUS",        label: "Status",            icon: "●",   group: "Choice",   description: "Status with colors" },
  { type: "RADIO",         label: "Radio",             icon: "◉",   group: "Choice",   description: "Radio buttons" },
  { type: "FILE",          label: "File Upload",       icon: "📎",  group: "Media",    description: "Attach files" },
  { type: "IMAGE",         label: "Image Upload",      icon: "🖼",  group: "Media",    description: "Image upload" },
  { type: "SIGNATURE",     label: "Signature",         icon: "✍",   group: "Media",    description: "Digital signature" },
  { type: "USER_SELECT",   label: "User Select",       icon: "👤",  group: "Relation", description: "Select a user" },
  { type: "LOOKUP",        label: "Lookup",            icon: "🔍",  group: "Relation", description: "Link to another module" },
  { type: "MIRROR",        label: "Mirror Field",      icon: "↔",   group: "Relation", description: "Pull a field from a linked record" },
  { type: "INTEGRATION",   label: "Integration Field", icon: "🔗",  group: "Relation", description: "Search another module and prefill mapped fields" },
  { type: "GLOBAL_RELATION",label:"Global List",       icon: "🌐",  group: "Relation", description: "Hierarchical global dataset" },
  { type: "TAGS",          label: "Tags",              icon: "🏷",  group: "Advanced", description: "Tag list" },
  { type: "RATING",        label: "Rating",            icon: "⭐",  group: "Advanced", description: "Star rating 1-5" },
  { type: "PROGRESS",      label: "Progress",          icon: "%",   group: "Advanced", description: "Progress 0-100%" },
  { type: "FORMULA",       label: "Formula",           icon: "fx",  group: "Advanced", description: "Calculated field" },
  { type: "AUTO_NUMBER",   label: "Auto Number",       icon: "🔢",  group: "Advanced", description: "Auto-generated unique ID" },
  { type: "COLOR_PICKER",   label: "Color",             icon: "🎨",  group: "Advanced",   description: "Color picker" },
  { type: "INLINE_SUBFORM", label: "Inline Subform",   icon: "⊞",  group: "Structure",  description: "Editable rows table (e.g. line items)" },
];

const GROUPS = ["Text", "Number", "Contact", "DateTime", "Choice", "Media", "Relation", "Advanced", "Structure"];
const TYPES_WITH_OPTIONS = ["DROPDOWN", "MULTI_SELECT", "STATUS", "RADIO"];

// Smart width: given the existing fields in a section, compute the ideal width for the next dropped field.
// Respects row occupancy so fields pair up naturally (first = full, second beside it = both 1/2, etc.).
function smartWidth(widths: Record<string, string>, fieldIds: string[], columns: number): string {
  if (columns <= 1) return "full";
  // Walk field list to compute how many grid spans remain in the current row
  let spansUsed = 0;
  for (const fid of fieldIds) {
    const w = widths[fid] ?? "full";
    const span = w === "full" ? columns : 1;
    spansUsed = (spansUsed + span) % columns;
  }
  const remaining = (columns - spansUsed) % columns;
  // If the current row is empty, start with full-width so the layout looks intentional.
  // If there's already a partial row (≥1 span used), fill the gap with a matching narrow width.
  return remaining === 0 ? "full" : (columns === 4 ? "1/4" : columns === 3 ? "1/3" : "1/2");
}

// Converts a display label to a valid field key: lowercase, spaces→underscores, strip specials
function generateFieldKey(label: string): string {
  return (
    label
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, "")
      .trim()
      .replace(/\s+/g, "_")
      .replace(/_+/g, "_")
      .replace(/^_|_$/g, "") || "field"
  );
}

// Draggable palette item (drag from palette onto canvas)
function PaletteItem({ ft, onAdd, dragActiveRef }: {
  ft: typeof FIELD_TYPES[0];
  onAdd: () => void;
  dragActiveRef: React.MutableRefObject<boolean>;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useSortable({
    id: `palette-${ft.type}`,
    data: { isPalette: true, fieldType: ft.type },
  });

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      onClick={() => { if (!dragActiveRef.current) onAdd(); }}
      style={{ touchAction: 'none' }}
      className={cn(
        "w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg",
        "hover:bg-blue-50 hover:text-blue-700",
        "text-left transition-colors group cursor-pointer select-none",
        isDragging ? "opacity-40" : ""
      )}
    >
      <span className="w-6 h-6 bg-gray-100 group-hover:bg-blue-100 rounded text-xs flex items-center justify-center font-mono text-gray-500 group-hover:text-blue-600 shrink-0 transition-colors">
        {ft.icon}
      </span>
      <div className="min-w-0">
        <p className="text-xs font-medium text-gray-600 group-hover:text-blue-700 truncate transition-colors">{ft.label}</p>
      </div>
    </div>
  );
}

function SortableFieldItem({
  field,
  isSelected,
  onSelect,
  onDelete,
}: {
  field: Field;
  isSelected: boolean;
  onSelect: () => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: field.id,
    data: { isCanvas: true },
  });
  const style = { transform: CSS.Transform.toString(transform), transition };
  const fieldDef = FIELD_TYPES.find(f => f.type === field.type);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-center gap-3 p-3 rounded-lg border transition-all cursor-pointer",
        isDragging ? "opacity-50 shadow-lg bg-white" : "",
        isSelected ? "border-blue-400 bg-blue-50" : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50"
      )}
      onClick={onSelect}
    >
      <button
        {...attributes}
        {...listeners}
        className="text-gray-400 hover:text-gray-600 cursor-grab active:cursor-grabbing"
        onClick={(e) => e.stopPropagation()}
      >
        <GripVertical className="w-4 h-4" />
      </button>

      <div className="w-7 h-7 rounded-md bg-gray-100 flex items-center justify-center text-xs font-mono text-gray-600 shrink-0">
        {fieldDef?.icon || "T"}
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate" title={field.label}>{field.label}</p>
        <p className="text-xs text-gray-400">{fieldDef?.label || field.type}</p>
      </div>

      <div className="flex items-center gap-1">
        {field.isRequired && <Badge variant="secondary" className="text-xs px-1.5">Required</Badge>}
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          className="text-gray-400 hover:text-red-500 p-1 rounded transition-colors"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

// Drop zone overlay on canvas
function CanvasDropZone({ isOver }: { isOver: boolean }) {
  return (
    <div className={cn(
      "mt-3 p-4 border-2 border-dashed rounded-lg text-center text-sm transition-all",
      isOver ? "border-blue-400 bg-blue-50 text-blue-600" : "border-gray-200 text-gray-400"
    )}>
      {isOver ? "Release to add field" : "Drag a field type here to add it"}
    </div>
  );
}

// ── Module Properties Panel ────────────────────────────────────────────────
// Shown in the right panel when no field is selected.
// Allows editing module name, icon, description, and portal enable toggle.


function ModulePropertiesPanel({
  activeModule, moduleId, saving, onSave, onUpdate, layoutConfig, onLayoutChange, fields,
}: {
  activeModule: any;
  moduleId: string;
  saving: boolean;
  onSave: () => void;
  onUpdate: (patch: any) => void;
  layoutConfig: LayoutConfig;
  onLayoutChange: (cfg: LayoutConfig) => void;
  fields: Field[];
}) {
  const [portalEnabled, setPortalEnabled] = useState<boolean | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [kanbanFieldId, setKanbanFieldId] = useState<string>(activeModule?.settings?.kanbanGroupByFieldId || "");
  const [kanbanSaving, setKanbanSaving] = useState(false);

  useEffect(() => {
    setKanbanFieldId(activeModule?.settings?.kanbanGroupByFieldId || "");
  }, [activeModule?.id, activeModule?.settings?.kanbanGroupByFieldId]);

  const kanbanEligibleFields = fields.filter(f => ["STATUS", "DROPDOWN"].includes(f.type));

  const handleKanbanFieldChange = async (value: string) => {
    const fieldId = value === "__auto__" ? "" : value;
    setKanbanFieldId(fieldId);
    setKanbanSaving(true);
    try {
      const currentSettings = activeModule?.settings || {};
      await api.patch(`/modules/${moduleId}`, {
        settings: { ...currentSettings, kanbanGroupByFieldId: fieldId || null },
      });
      const { setActiveModule } = useModulesStore.getState();
      if (activeModule) {
        setActiveModule({ ...activeModule, settings: { ...currentSettings, kanbanGroupByFieldId: fieldId || null } } as any);
      }
    } catch {}
    setKanbanSaving(false);
  };

  // Load current portal status for this module
  useEffect(() => {
    if (!moduleId) return;
    api.get(`/portal/admin/module-configs/${moduleId}`)
      .then(r => setPortalEnabled(r.data?.config?.isEnabled ?? false))
      .catch(() => setPortalEnabled(false));
  }, [moduleId]);

  const handlePortalToggle = async (val: boolean) => {
    setPortalLoading(true);
    try {
      await api.patch(`/portal/admin/module-configs/${moduleId}`, { isEnabled: val });
      setPortalEnabled(val);
    } catch {}
    setPortalLoading(false);
  };

  const handleSave = async () => {
    await onSave();
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  if (!activeModule) return null;

  return (
    <ScrollArea className="flex-1">
      <div className="p-4 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Module Settings</p>
          {saved && <span className="text-xs text-green-600 font-medium">Saved ✓</span>}
        </div>

        {/* General */}
        <CollapsibleSection icon={Info} iconClassName="bg-slate-100 text-slate-500" title="General">
          <div className="space-y-1.5">
            <Label className="text-xs">Module Icon</Label>
            <div className="flex items-center gap-3">
              <IconPicker
                value={activeModule.icon}
                onChange={ic => onUpdate({ icon: ic })}
                color={activeModule.color}
              />
              <p className="text-xs text-gray-400">Click to change</p>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Module Name *</Label>
            <Input
              value={activeModule.name}
              onChange={e => onUpdate({ name: e.target.value })}
              placeholder="e.g. Students, Contacts, Inventory"
              className="h-9"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Description</Label>
            <Input
              value={activeModule.description || ""}
              onChange={e => onUpdate({ description: e.target.value })}
              placeholder="Brief description of this module"
              className="h-9"
            />
          </div>
        </CollapsibleSection>

        {/* Portal toggle */}
        <CollapsibleSection
          icon={Globe}
          iconClassName="bg-blue-100 text-blue-600"
          title="Portal Access"
          summary={portalEnabled === null ? undefined : portalEnabled ? "Enabled" : "Disabled"}
        >
          <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-3 py-3">
            <div>
              <p className="text-sm font-medium text-gray-700">Enable Portal</p>
              <p className="text-xs text-gray-400 mt-0.5">Allow creating portal accounts for records in this module</p>
            </div>
            <Switch
              checked={!!portalEnabled}
              onCheckedChange={handlePortalToggle}
              disabled={portalLoading || portalEnabled === null}
            />
          </div>
          {portalEnabled && (
            <div className="rounded-lg bg-blue-50 border border-blue-200 px-3 py-2 text-xs text-blue-700">
              Portal is active for this module. Configure field mappings in{" "}
              <a href="/settings/portal" className="underline font-medium">Settings → Portal Settings</a>.
            </div>
          )}
        </CollapsibleSection>

        {/* Kanban grouping field */}
        <CollapsibleSection
          icon={LayoutGrid}
          iconClassName="bg-violet-100 text-violet-600"
          title="Kanban View"
          summary={
            kanbanSaving ? "Saving…"
            : kanbanEligibleFields.length === 0 ? "No eligible fields"
            : kanbanFieldId ? (kanbanEligibleFields.find(f => f.id === kanbanFieldId)?.label ?? "Auto-detect")
            : "Auto-detect"
          }
        >
          <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-3 space-y-2">
            <p className="text-sm font-medium text-gray-700">Group columns by</p>
            {kanbanEligibleFields.length === 0 ? (
              <p className="text-xs text-gray-400">Add a Status or Dropdown field to enable Kanban view.</p>
            ) : (
              <>
                <Select value={kanbanFieldId || "__auto__"} onValueChange={handleKanbanFieldChange}>
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__auto__">Auto-detect (first Status/Dropdown field)</SelectItem>
                    {kanbanEligibleFields.map(f => (
                      <SelectItem key={f.id} value={f.id}>{f.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-400">Which field's values become the Kanban board's columns.</p>
              </>
            )}
          </div>
        </CollapsibleSection>

        {/* Record Layout — Tabs (shared by Standard's custom tabs and Split
            Panel's section tabs), style, and Main Tab (Split Panel only) */}
        <CollapsibleSection
          icon={LayoutTemplate}
          iconClassName="bg-amber-100 text-amber-600"
          title="Record Layout"
          summary={((layoutConfig as any).recordDetailStyle ?? "standard") === "split-panel" ? "Split Panel" : "Standard"}
        >
          <div className="space-y-1.5 rounded-lg border border-gray-200 bg-gray-50 px-3 py-3">
            <p className="text-sm font-medium text-gray-700">Tabs</p>
            <div className="flex items-center gap-1.5 flex-wrap">
              {((layoutConfig as any).tabs ?? []).map((t: LayoutTab) => (
                <TabChip
                  key={t.id}
                  tab={t}
                  onRename={label => onLayoutChange({
                    ...layoutConfig,
                    tabs: ((layoutConfig as any).tabs ?? []).map((tab: LayoutTab) => tab.id === t.id ? { ...tab, label } : tab),
                  } as any)}
                  onDelete={() => onLayoutChange({
                    ...layoutConfig,
                    tabs: ((layoutConfig as any).tabs ?? []).filter((tab: LayoutTab) => tab.id !== t.id),
                    sections: (layoutConfig.sections ?? []).map(s => s.tabId === t.id ? { ...s, tabId: undefined } : s),
                  } as any)}
                />
              ))}
              <button
                type="button"
                onClick={() => {
                  const tabs = (layoutConfig as any).tabs ?? [];
                  const t: LayoutTab = { id: `t-${generateId().slice(0, 8)}`, label: "New Tab", order: tabs.length };
                  onLayoutChange({ ...layoutConfig, tabs: [...tabs, t] } as any);
                }}
                className="flex items-center gap-1 px-2 py-1 rounded-full border border-dashed border-gray-300 text-xs text-gray-400 hover:border-blue-300 hover:text-blue-500 transition-colors"
              >
                <Plus className="h-3 w-3" /> Add Tab
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-3 py-3">
            <div>
              <p className="text-sm font-medium text-gray-700">Detail Style</p>
              <p className="text-xs text-gray-400 mt-0.5">How an individual record of this module is displayed</p>
            </div>
            <div className="flex rounded-lg border border-gray-200 overflow-hidden shrink-0 bg-white">
              {([
                { value: "standard", label: "Standard" },
                { value: "split-panel", label: "Split Panel" },
              ] as const).map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    const sections = layoutConfig.sections ?? [];
                    const tabs = (layoutConfig as any).tabs ?? [];
                    // First time switching to Split Panel: if no Main Tab has
                    // been chosen yet, seed the default — section 1 is Main,
                    // every other existing section becomes its own tab.
                    const noMainChosenYet = !(layoutConfig as any).mainSectionId && sections.every(s => !s.tabId);
                    if (opt.value === "split-panel" && noMainChosenYet && sections.length > 1) {
                      let nextOrder = tabs.length;
                      const newTabs = [...tabs];
                      const newSections = sections.map((s, idx) => {
                        if (idx === 0) return s;
                        const tabId = generateId();
                        newTabs.push({ id: tabId, label: s.title || `Section ${idx + 1}`, order: nextOrder++ });
                        return { ...s, tabId };
                      });
                      onLayoutChange({
                        ...layoutConfig, recordDetailStyle: opt.value,
                        sections: newSections, tabs: newTabs, mainSectionId: sections[0].id,
                      } as any);
                    } else {
                      onLayoutChange({ ...layoutConfig, recordDetailStyle: opt.value } as any);
                    }
                  }}
                  className={cn(
                    "px-2.5 py-1 text-[11px] font-medium transition-colors",
                    ((layoutConfig as any).recordDetailStyle ?? "standard") === opt.value
                      ? "bg-blue-600 text-white"
                      : "bg-white text-gray-600 hover:bg-gray-50",
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Main Tab — radio-exclusive (a Select is a natural single-choice
              control): the one section shown in the left panel. Every other
              section automatically becomes its own tab — no need to spell
              that out here beyond the one-line hint below. */}
          {((layoutConfig as any).recordDetailStyle) === "split-panel" && (layoutConfig.sections ?? []).length > 0 && (() => {
            const sections = layoutConfig.sections ?? [];
            const effectiveMainId = (layoutConfig as any).mainSectionId || sections[0]?.id;
            const selectMainSection = (sectionId: string) => {
              const tabs = (layoutConfig as any).tabs ?? [];
              let nextOrder = tabs.length;
              const newTabs = [...tabs];
              const newSections = sections.map((sec, idx) => {
                if (sec.id === sectionId) return { ...sec, tabId: undefined };
                if (sec.tabId) return sec; // already has a tab — leave it alone
                const tabId = generateId();
                newTabs.push({ id: tabId, label: sec.title || `Section ${idx + 1}`, order: nextOrder++ });
                return { ...sec, tabId };
              });
              onLayoutChange({ ...layoutConfig, mainSectionId: sectionId, sections: newSections, tabs: newTabs } as any);
            };
            return (
              <div className="space-y-1.5 pt-1">
                <Label className="text-xs">Main Tab</Label>
                <Select value={effectiveMainId} onValueChange={selectMainSection}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Select a section…" /></SelectTrigger>
                  <SelectContent>
                    {sections.map((s, idx) => (
                      <SelectItem key={s.id} value={s.id}>{s.title || `Section ${idx + 1}`}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-[11px] text-gray-400">Shown in the left panel. Every other section becomes its own tab.</p>
              </div>
            );
          })()}
        </CollapsibleSection>

        <Separator />

        {/* Save button */}
        <Button
          size="sm"
          className="w-full gap-2"
          onClick={handleSave}
          disabled={saving}
        >
          {saving
            ? <><Loader2 className="w-4 h-4 animate-spin" />Saving…</>
            : <><Save className="w-4 h-4" />Save Module Settings</>}
        </Button>

        <div className="rounded-lg bg-gray-50 border border-gray-200 px-3 py-2 text-xs text-gray-500 space-y-1">
          <p className="font-medium text-gray-600">Module ID</p>
          <p className="font-mono text-[10px] break-all text-gray-400">{moduleId}</p>
        </div>
      </div>
    </ScrollArea>
  );
}

// ── Module Layout Rules Panel ─────────────────────────────────────────────────
// Single centralized rule builder for the whole module.
// Rules: "When [field] [operator] [value]" → one or more actions on fields / sections.

const OP_OPTS: { value: ModuleRuleOperator; label: string }[] = [
  { value: "equals",     label: "equals" },
  { value: "not_equals", label: "does not equal" },
  { value: "in",         label: "is any of" },
  { value: "not_in",     label: "is none of" },
  { value: "is_empty",   label: "is empty" },
  { value: "not_empty",  label: "is not empty" },
];

const ACTION_TYPE_OPTS: { value: ModuleRuleActionType; label: string }[] = [
  { value: "show",      label: "Show" },
  { value: "hide",      label: "Hide" },
  { value: "require",   label: "Make required" },
  { value: "unrequire", label: "Make optional" },
  { value: "readonly",  label: "Make read-only" },
];

function newCondition(fields: Field[], defaultFieldName?: string | null): ModuleRuleCondition {
  return {
    id:        `cond-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    whenField: defaultFieldName ?? fields[0]?.name ?? "",
    operator:  "equals",
    whenValue: "",
  };
}

// ── Nested condition-group tree helpers ─────────────────────────────────────
// A rule's `conditions[]` array holds a mix of plain leaves (ModuleRuleCondition) and
// nested groups (ModuleRuleConditionGroup, `type: "group"`) at any depth — these helpers
// immutably locate/update/remove/insert a node anywhere in that tree by id.

function isConditionGroup(n: ModuleRuleConditionNode): n is ModuleRuleConditionGroup {
  return (n as any).type === "group";
}

// Total leaf-condition count across a whole tree — used for the collapsed rule summary.
function countConditionLeaves(nodes: ModuleRuleConditionNode[]): number {
  return nodes.reduce((sum, n) => sum + (isConditionGroup(n) ? countConditionLeaves(n.children) : 1), 0);
}

function newConditionGroup(): ModuleRuleConditionGroup {
  return {
    id:       `grp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    type:     "group",
    operator: "AND",
    children: [],
  };
}

function updateConditionNodeInTree(
  nodes: ModuleRuleConditionNode[], id: string, patch: Record<string, any>,
): ModuleRuleConditionNode[] {
  return nodes.map(n => {
    if (n.id === id) return { ...n, ...patch } as ModuleRuleConditionNode;
    if (isConditionGroup(n)) return { ...n, children: updateConditionNodeInTree(n.children, id, patch) };
    return n;
  });
}

function removeConditionNodeFromTree(nodes: ModuleRuleConditionNode[], id: string): ModuleRuleConditionNode[] {
  return nodes
    .filter(n => n.id !== id)
    .map(n => isConditionGroup(n) ? { ...n, children: removeConditionNodeFromTree(n.children, id) } : n);
}

function addConditionNodeToGroup(
  nodes: ModuleRuleConditionNode[], groupId: string | null, newNode: ModuleRuleConditionNode,
): ModuleRuleConditionNode[] {
  if (groupId === null) return [...nodes, newNode];
  return nodes.map(n => {
    if (isConditionGroup(n) && n.id === groupId) return { ...n, children: [...n.children, newNode] };
    if (isConditionGroup(n)) return { ...n, children: addConditionNodeToGroup(n.children, groupId, newNode) };
    return n;
  });
}

// Recursive renderer for a rule's condition tree — a sibling list combined by `logic`,
// where each item is either a leaf (ConditionRow) or a nested AND/OR group (itself a
// recursive ConditionNodeList). `groupId` is this list's own group id (null = the rule's
// top-level conditions array) — used to target "Add condition"/"Add group" correctly.
function ConditionNodeList({
  ruleId, groupId, nodes, logic, fields, depth,
  onUpdateLogic, onAddCondition, onAddGroup, onUpdateNode, onRemoveNode,
}: {
  ruleId: string;
  groupId: string | null;
  nodes: ModuleRuleConditionNode[];
  logic: ModuleRuleLogic;
  fields: Field[];
  depth: number;
  onUpdateLogic: (groupId: string | null, logic: ModuleRuleLogic) => void;
  onAddCondition: (ruleId: string, groupId: string | null) => void;
  onAddGroup: (ruleId: string, groupId: string | null) => void;
  onUpdateNode: (ruleId: string, nodeId: string, patch: Record<string, any>) => void;
  onRemoveNode: (ruleId: string, nodeId: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      {nodes.length > 1 && (
        <div className="flex items-center gap-0.5 bg-gray-100 rounded-md p-0.5 w-fit">
          {(["AND", "OR"] as ModuleRuleLogic[]).map(l => (
            <button
              key={l}
              onClick={() => onUpdateLogic(groupId, l)}
              className={cn(
                "px-2 py-0.5 rounded text-[10px] font-bold transition-colors",
                logic === l ? "bg-white text-blue-700 shadow-sm" : "text-gray-400 hover:text-gray-600"
              )}
            >
              {l}
            </button>
          ))}
        </div>
      )}

      {nodes.map((node, idx) => (
        <div key={node.id}>
          {idx > 0 && (
            <div className="flex items-center gap-2 my-1">
              <div className="flex-1 h-px bg-gray-100" />
              <span className="text-[10px] font-bold text-gray-400 uppercase">{logic}</span>
              <div className="flex-1 h-px bg-gray-100" />
            </div>
          )}
          {isConditionGroup(node) ? (
            <div className="rounded-lg border border-dashed border-indigo-200 bg-indigo-50/40 p-2 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wide">Group</span>
                <button onClick={() => onRemoveNode(ruleId, node.id)} className="text-gray-300 hover:text-red-500 transition-colors" title="Remove group">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <ConditionNodeList
                ruleId={ruleId}
                groupId={node.id}
                nodes={node.children}
                logic={node.operator}
                fields={fields}
                depth={depth + 1}
                onUpdateLogic={onUpdateLogic}
                onAddCondition={onAddCondition}
                onAddGroup={onAddGroup}
                onUpdateNode={onUpdateNode}
                onRemoveNode={onRemoveNode}
              />
            </div>
          ) : (
            <ConditionRow
              cond={node}
              fields={fields}
              onChange={patch => onUpdateNode(ruleId, node.id, patch)}
              onRemove={() => onRemoveNode(ruleId, node.id)}
              canRemove={depth > 0 || nodes.length > 1}
            />
          )}
        </div>
      ))}

      <div className="flex items-center gap-3">
        <button onClick={() => onAddCondition(ruleId, groupId)} className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 transition-colors">
          <Plus className="w-3 h-3" /> Add condition
        </button>
        <button onClick={() => onAddGroup(ruleId, groupId)} className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 transition-colors">
          <Plus className="w-3 h-3" /> Add group
        </button>
      </div>
    </div>
  );
}

function ConditionRow({ cond, fields, onChange, onRemove, canRemove }: {
  cond: ModuleRuleCondition;
  fields: Field[];
  onChange: (patch: Partial<ModuleRuleCondition>) => void;
  onRemove: () => void;
  canRemove: boolean;
}) {
  const triggerField = fields.find(f => f.name === cond.whenField);
  const isMulti = cond.operator === "in" || cond.operator === "not_in";
  const hasValue = cond.operator === "equals" || cond.operator === "not_equals" || isMulti;
  const optionValues: any[] =
    triggerField && ["DROPDOWN","STATUS","RADIO","MULTI_SELECT"].includes(triggerField.type)
      ? (triggerField as any).options ?? []
      : [];
  const selectedValues = cond.whenValues ?? [];

  const toggleMultiValue = (val: string) => {
    const next = selectedValues.includes(val)
      ? selectedValues.filter(v => v !== val)
      : [...selectedValues, val];
    onChange({ whenValues: next });
  };

  const addFreeTextValue = (val: string) => {
    const trimmed = val.trim();
    if (!trimmed || selectedValues.includes(trimmed)) return;
    onChange({ whenValues: [...selectedValues, trimmed] });
  };

  return (
    <div className="grid gap-1 p-2 bg-gray-50 rounded-lg border border-gray-200">
      {/* Field selector */}
      <Select value={cond.whenField} onValueChange={v => onChange({ whenField: v, whenValue: "", whenValues: [] })}>
        <SelectTrigger className="h-7 text-xs">
          <SelectValue placeholder="Select field…" />
        </SelectTrigger>
        <SelectContent>
          {fields.map(f => (
            <SelectItem key={f.id} value={f.name} className="text-xs">{f.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Operator + single-value row */}
      <div className="flex gap-1 items-center">
        <Select value={cond.operator} onValueChange={v => onChange({ operator: v as ModuleRuleOperator, whenValue: "", whenValues: [] })}>
          <SelectTrigger className="h-7 text-xs flex-1">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {OP_OPTS.map(o => (
              <SelectItem key={o.value} value={o.value} className="text-xs">{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {hasValue && !isMulti && (
          optionValues.length > 0 ? (
            <Select value={cond.whenValue} onValueChange={v => onChange({ whenValue: v })}>
              <SelectTrigger className="h-7 text-xs flex-1">
                <SelectValue placeholder="Value…" />
              </SelectTrigger>
              <SelectContent>
                {optionValues.map((opt: any) => (
                  <SelectItem key={opt.id || opt.value} value={opt.value || opt.label} className="text-xs">
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <Input
              value={cond.whenValue}
              onChange={e => onChange({ whenValue: e.target.value })}
              placeholder="Value…"
              className="h-7 text-xs flex-1"
            />
          )
        )}

        {!isMulti && canRemove && (
          <button onClick={onRemove} className="text-gray-300 hover:text-red-500 shrink-0 transition-colors" title="Remove condition">
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Multi-value picker — its own row, since it needs more room than fits inline */}
      {isMulti && (
        <div className="flex items-start gap-1">
          <div className="flex-1 space-y-1">
            {optionValues.length > 0 ? (
              <MultiCombobox
                options={optionValues.map((opt: any) => ({ value: opt.value || opt.label, label: opt.label }))}
                values={selectedValues}
                onChange={vals => onChange({ whenValues: vals })}
                placeholder="Select values…"
                searchPlaceholder="Search options…"
              />
            ) : (
              <>
                {selectedValues.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {selectedValues.map(val => (
                      <span key={val} className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-blue-50 text-blue-700 border border-blue-200">
                        {val}
                        <button type="button" onClick={() => toggleMultiValue(val)} className="hover:text-red-500">
                          <X className="w-2.5 h-2.5" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
                <Input
                  placeholder="Type a value, press Enter…"
                  className="h-7 text-xs"
                  onKeyDown={e => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addFreeTextValue((e.target as HTMLInputElement).value);
                      (e.target as HTMLInputElement).value = "";
                    }
                  }}
                />
              </>
            )}
          </div>
          {canRemove && (
            <button onClick={onRemove} className="text-gray-300 hover:text-red-500 shrink-0 transition-colors mt-1" title="Remove condition">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function ModuleLayoutRulesPanel({ fields, layoutConfig, onLayoutChange, defaultFieldName }: {
  fields: Field[];
  layoutConfig: LayoutConfig;
  onLayoutChange: (cfg: LayoutConfig) => void;
  defaultFieldName?: string | null;
}) {
  // Migrate old single-condition rules (whenField/operator/whenValue) to the
  // new conditions[] shape so existing saved rules don't crash on .length.
  const rules: ModuleLayoutRule[] = ((layoutConfig as any).rules ?? []).map((r: any): ModuleLayoutRule => {
    if (Array.isArray(r.conditions)) return r as ModuleLayoutRule;
    return {
      id:             r.id,
      conditionLogic: r.conditionLogic ?? "AND",
      conditions: r.whenField
        ? [{ id: `cond-migrated-${r.id}`, whenField: r.whenField, operator: r.operator ?? "equals", whenValue: r.whenValue ?? "" }]
        : [newCondition(fields)],
      actions: Array.isArray(r.actions) ? r.actions : [],
    };
  });
  const sections = layoutConfig.sections ?? [];
  const [collapsedRuleIds, setCollapsedRuleIds] = useState<Set<string>>(new Set());
  const toggleRuleCollapsed = (ruleId: string) =>
    setCollapsedRuleIds(prev => {
      const next = new Set(prev);
      next.has(ruleId) ? next.delete(ruleId) : next.add(ruleId);
      return next;
    });

  const save = (newRules: ModuleLayoutRule[]) =>
    onLayoutChange({ ...layoutConfig, rules: newRules } as any);

  const addRule = () => {
    save([...rules, {
      id:             `rule-${generateId().slice(0, 8)}`,
      conditionLogic: "AND",
      conditions:     [newCondition(fields, defaultFieldName)],
      actions:        [],
    }]);
  };

  const updateRule = (ruleId: string, patch: Partial<ModuleLayoutRule>) =>
    save(rules.map(r => r.id === ruleId ? { ...r, ...patch } : r));

  const removeRule = (ruleId: string) =>
    save(rules.filter(r => r.id !== ruleId));

  // ── Condition helpers — groupId is null for a rule's top-level conditions array,
  //    or a group's id to add/target a node nested inside that group ─────────────

  const addCondition = (ruleId: string, groupId: string | null = null) =>
    save(rules.map(r => r.id !== ruleId ? r : {
      ...r,
      conditions: addConditionNodeToGroup(r.conditions, groupId, newCondition(fields, defaultFieldName)),
    }));

  const addConditionGroup = (ruleId: string, groupId: string | null = null) =>
    save(rules.map(r => r.id !== ruleId ? r : {
      ...r,
      conditions: addConditionNodeToGroup(r.conditions, groupId, newConditionGroup()),
    }));

  const updateConditionNode = (ruleId: string, nodeId: string, patch: Record<string, any>) =>
    save(rules.map(r => r.id !== ruleId ? r : {
      ...r,
      conditions: updateConditionNodeInTree(r.conditions, nodeId, patch),
    }));

  const removeConditionNode = (ruleId: string, nodeId: string) =>
    save(rules.map(r => r.id !== ruleId ? r : {
      ...r,
      conditions: removeConditionNodeFromTree(r.conditions, nodeId),
    }));

  // The AND/OR toggle for the rule's top-level conditions lives on `rule.conditionLogic`
  // itself (unchanged, pre-existing field); for a nested group it's that group's own
  // `operator`, updated like any other node patch.
  const updateGroupLogic = (ruleId: string, groupId: string | null, logic: ModuleRuleLogic) =>
    groupId === null
      ? updateRule(ruleId, { conditionLogic: logic })
      : updateConditionNode(ruleId, groupId, { operator: logic });

  // ── Action helpers ─────────────────────────────────────────────────────────

  const addAction = (ruleId: string) =>
    save(rules.map(r => r.id !== ruleId ? r : {
      ...r,
      actions: [...(r.actions ?? []), {
        id:        `act-${Date.now()}`,
        type:      "show" as ModuleRuleActionType,
        target:    "field" as ModuleRuleTarget,
        targetId:  "",
        targetIds: [] as string[],
      }],
    }));

  const updateAction = (ruleId: string, actId: string, patch: Partial<ModuleRuleAction>) =>
    save(rules.map(r => r.id !== ruleId ? r : {
      ...r,
      actions: r.actions.map(a => a.id === actId ? { ...a, ...patch } : a),
    }));

  const removeAction = (ruleId: string, actId: string) =>
    save(rules.map(r => r.id !== ruleId ? r : {
      ...r,
      actions: r.actions.filter(a => a.id !== actId),
    }));

  if (fields.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 p-6 text-center text-gray-400">
        <Workflow className="w-8 h-8 mb-2 opacity-30" />
        <p className="text-xs font-medium text-gray-500 mb-1">No fields yet</p>
        <p className="text-[11px] text-gray-400">Add fields to the module before creating rules.</p>
      </div>
    );
  }

  return (
    <ScrollArea className="flex-1 min-h-0">
      <div className="p-3 space-y-3">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-gray-700">Layout Rules</p>
            <p className="text-[11px] text-gray-400 mt-0.5">
              Control field and section visibility based on field values.
            </p>
          </div>
          <Button size="sm" variant="outline" onClick={addRule} className="gap-1.5 text-xs h-7 px-2.5">
            <Plus className="w-3 h-3" /> Add Rule
          </Button>
        </div>

        {rules.length === 0 && (
          <div className="flex flex-col items-center justify-center py-10 rounded-xl border-2 border-dashed border-gray-200 text-gray-400 gap-2">
            <Workflow className="w-6 h-6 opacity-30" />
            <p className="text-xs">No rules yet — click Add Rule to start.</p>
          </div>
        )}

        {rules.map((rule, rIdx) => {
          const collapsed = collapsedRuleIds.has(rule.id);
          const condCount = countConditionLeaves(rule.conditions);
          return (
          <div key={rule.id} className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">

            {/* Rule header bar — click to collapse/expand */}
            <button
              onClick={() => toggleRuleCollapsed(rule.id)}
              className="w-full flex items-center justify-between px-3 py-2 bg-gray-50 border-b border-gray-100 text-left"
            >
              <div className="flex items-center gap-1.5 min-w-0">
                <ChevronDown className={cn("w-3.5 h-3.5 text-gray-400 shrink-0 transition-transform", collapsed && "-rotate-90")} />
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest shrink-0">
                  Rule {rIdx + 1}
                </p>
                {collapsed && (
                  <p className="text-[11px] text-gray-400 truncate">
                    — {condCount} condition{condCount === 1 ? "" : "s"} → {rule.actions.length} action{rule.actions.length === 1 ? "" : "s"}
                  </p>
                )}
              </div>
              <span
                role="button"
                onClick={e => { e.stopPropagation(); removeRule(rule.id); }}
                className="text-gray-300 hover:text-red-500 transition-colors shrink-0"
                title="Delete rule"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </span>
            </button>

            {!collapsed && (
            <div className="p-3 space-y-3">

              {/* ── WHEN (conditions) ── */}
              <div className="space-y-1.5">
                <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">When</p>

                <ConditionNodeList
                  ruleId={rule.id}
                  groupId={null}
                  nodes={rule.conditions}
                  logic={rule.conditionLogic}
                  fields={fields}
                  depth={0}
                  onUpdateLogic={(groupId, logic) => updateGroupLogic(rule.id, groupId, logic)}
                  onAddCondition={addCondition}
                  onAddGroup={addConditionGroup}
                  onUpdateNode={updateConditionNode}
                  onRemoveNode={removeConditionNode}
                />
              </div>

              {/* ── THEN (actions) ── */}
              <div className="space-y-1.5 pt-2 border-t border-gray-100">
                <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">Then</p>

                {rule.actions.length === 0 && (
                  <p className="text-[11px] text-gray-400 italic">No actions yet — add one below.</p>
                )}

                {rule.actions.map((act) => {
                  const selectedTargetIds = act.targetIds?.length ? act.targetIds : (act.targetId ? [act.targetId] : []);
                  // value is what gets stored on the rule (field.name for fields, to match how
                  // conditions reference fields; section.id for sections).
                  const targetOptions = act.target === "field"
                    ? fields.map(f => ({ value: f.name, label: f.label }))
                    : sections.map(s => ({ value: s.id, label: s.title || "Untitled Section" }));

                  return (
                    <div key={act.id} className="rounded-lg border border-gray-100 bg-gray-50/60 p-2 space-y-1.5">
                      {/* Row 1: action type + target type + remove */}
                      <div className="flex items-center gap-1.5">
                        <Select
                          value={act.type}
                          onValueChange={v => updateAction(rule.id, act.id, { type: v as ModuleRuleActionType })}
                        >
                          <SelectTrigger className="h-7 text-xs flex-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {ACTION_TYPE_OPTS.map(o => (
                              <SelectItem key={o.value} value={o.value} className="text-xs">{o.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>

                        <Select
                          value={act.target}
                          onValueChange={v => {
                            updateAction(rule.id, act.id, {
                              target:    v as ModuleRuleTarget,
                              targetId:  "",
                              targetIds: [],
                            });
                          }}
                        >
                          <SelectTrigger className="h-7 text-xs w-[72px] shrink-0">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="field" className="text-xs">Field</SelectItem>
                            {sections.length > 0 && (
                              <SelectItem value="section" className="text-xs">Section</SelectItem>
                            )}
                          </SelectContent>
                        </Select>

                        <button
                          onClick={() => removeAction(rule.id, act.id)}
                          className="text-gray-300 hover:text-red-500 shrink-0 transition-colors"
                          title="Remove action"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Row 2: multi-target chip picker — this action applies to every field/section toggled on */}
                      {targetOptions.length === 0 ? (
                        <p className="text-[11px] text-gray-400 italic">
                          {act.target === "field" ? "No fields yet" : "No sections yet"}
                        </p>
                      ) : (
                        <MultiCombobox
                          options={targetOptions}
                          values={selectedTargetIds}
                          onChange={vals => updateAction(rule.id, act.id, { targetIds: vals, targetId: vals[0] ?? "" })}
                          placeholder={act.target === "field" ? "Select fields…" : "Select sections…"}
                          searchPlaceholder={act.target === "field" ? "Search fields…" : "Search sections…"}
                        />
                      )}
                    </div>
                  );
                })}

                <button
                  onClick={() => addAction(rule.id)}
                  className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 transition-colors"
                >
                  <Plus className="w-3 h-3" /> Add action
                </button>
              </div>
            </div>
            )}
          </div>
          );
        })}
      </div>
    </ScrollArea>
  );
}

export default function StudioEditorPage() {
  return (
    <DesktopOnlyGate
      title="The Blueprint Studio needs more room"
      message="This stage canvas is designed for tablet and desktop screens. Switch to a bigger screen to keep building — nothing here is lost."
    >
      <StudioEditorPageInner />
    </DesktopOnlyGate>
  );
}

function StudioEditorPageInner() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { fetchModule, activeModule, updateModule } = useModulesStore();
  const toast = useToast();
  const [fields, setFields] = useState<Field[]>([]);
  const [selectedField, setSelectedField] = useState<Field | null>(null);
  // Remembers the last field actually clicked, even after it's deselected (toggled off,
  // Properties panel closed, etc.) — the Rules tab's default should stay pinned to "the
  // field I was just dealing with", not disappear the moment selectedField clears.
  const [lastSelectedFieldName, setLastSelectedFieldName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [draggingPalette, setDraggingPalette] = useState<string | null>(null);
  const [canvasIsOver, setCanvasIsOver] = useState(false);
  const [filterText, setFilterText] = useState("");
  const [modules, setModules] = useState<any[]>([]);
  const [globalLists, setGlobalLists] = useState<any[]>([]);
  const [rightTab, setRightTab] = useState<"properties" | "summary" | "rules">("properties");
  const [layoutConfig, setLayoutConfig] = useState<LayoutConfig>(DEFAULT_MODULE_LAYOUT);
  const [summaryStats, setSummaryStats] = useState<SummaryStatConfig[]>([]);
  const [summaryEnabled, setSummaryEnabled] = useState(true);
  const [savingSummary, setSavingSummary] = useState(false);
  const [editingStatId, setEditingStatId] = useState<string | null>(null);
  const [previewMode, setPreviewMode] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const dragActiveRef = useRef(false);
  // Tracks which section the palette item is hovering over during a drag
  const paletteHoverSectionRef = useRef<string | null>(null);
  // Tracks which specific field within that section the pointer is over, so the
  // new field can be inserted exactly there instead of always at the end
  const paletteHoverFieldRef = useRef<string | null>(null);
  // Prevents auto-assign effect from running when we manually placed the field
  const skipAutoAssignRef = useRef(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  useEffect(() => {
    const load = async () => {
      setLoadError(null);
      try {
        await fetchModule(id);
        const [modsRes, listsRes] = await Promise.all([
          api.get("/modules").catch(() => ({ data: [] })),
          api.get("/global-lists").catch(() => ({ data: [] })),
        ]);
        setModules(modsRes.data || []);
        setGlobalLists(listsRes.data || []);
      } catch (err: any) {
        const msg = err?.response?.data?.message || err?.message || "Failed to load module";
        setLoadError(msg);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id, fetchModule]);

  useEffect(() => {
    if (activeModule?.fields) {
      setFields([...activeModule.fields]);
    }
    if ((activeModule as any)?.settings?.layout) {
      setLayoutConfig((activeModule as any).settings.layout as LayoutConfig);
    }
    const s = (activeModule as any)?.settings ?? {};
    setSummaryStats(Array.isArray(s.summaryStats) ? s.summaryStats : []);
    setSummaryEnabled(s.summaryEnabled !== false);
  }, [activeModule]);

  // Mark layout as dirty whenever it changes (except on initial load from server)
  const layoutInitialized = useRef(false);
  // Reset flag each time a fresh module loads, so the server-loaded layout doesn't trigger dirty
  useEffect(() => { layoutInitialized.current = false; }, [activeModule?.id]);
  useEffect(() => {
    if (!layoutInitialized.current) { layoutInitialized.current = true; return; }
    setIsDirty(true);
  }, [layoutConfig]);

  // targetSectionOverride, when passed, is used instead of re-reading paletteHoverSectionRef —
  // that ref gets reset to null by the canvas's own cleanup effect as soon as the drag ends
  // (draggingFromPalette flips to false), which loses the race against this function's own
  // `await` below almost every time. Callers that already know the drop target (drag-and-drop)
  // must capture the ref synchronously at drop time and pass it in here explicitly.
  const addField = async (type: string, targetSectionOverride?: string | null, targetFieldOverride?: string | null) => {
    const fieldDef = FIELD_TYPES.find(f => f.type === type)!;
    const existing = fields.filter(f => f.type === type).length;
    const label = existing === 0 ? fieldDef.label : `${fieldDef.label} ${existing + 1}`;
    const baseName = fieldDef.label.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "");
    const usedNames = new Set(fields.map(f => f.name));
    let name = baseName;
    let c = 2;
    while (usedNames.has(name)) name = `${baseName}_${c++}`;
    try {
      const { data } = await api.post(`/modules/${id}/fields`, {
        name,
        label,
        type,
        isRequired: false,
        isUnique: false,
        isReadonly: false,
        isHidden: false,
      });

      // If palette was hovering over a specific section, place there directly
      const targetSect = targetSectionOverride !== undefined ? targetSectionOverride : paletteHoverSectionRef.current;
      const targetField = targetFieldOverride !== undefined ? targetFieldOverride : paletteHoverFieldRef.current;
      if (targetSect) {
        skipAutoAssignRef.current = true;
        setFields(prev => [...prev, data]);
        setSelectedField(data);
        setLayoutConfig(prev => {
          const sections = prev.sections ?? [];
          const target = sections.find(s => s.id === targetSect);
          const cols = target?.columns ?? 2;
          const autoWidth = cols >= 2 ? smartWidth(target?.fieldWidths ?? {}, target?.fieldIds ?? [], cols) : "full";
          // Insert exactly at the hovered field's position when one was detected;
          // otherwise fall back to appending at the end of the section.
          const existingIds = target?.fieldIds ?? [];
          const insertAt = targetField ? existingIds.indexOf(targetField) : -1;
          const newFieldIds = insertAt !== -1
            ? [...existingIds.slice(0, insertAt), data.id, ...existingIds.slice(insertAt)]
            : [...existingIds, data.id];
          return {
            ...prev,
            sections: sections.map(s =>
              s.id === targetSect
                ? { ...s, fieldIds: newFieldIds, fieldWidths: { ...(s.fieldWidths ?? {}), [data.id]: autoWidth } }
                : s
            ),
          };
        });
        paletteHoverSectionRef.current = null;
        paletteHoverFieldRef.current = null;
        return;
      }

      setFields(prev => [...prev, data]);
      setSelectedField(data);
    } catch {}
  };

  // Releases the auto-assign guard only after the fields-changed effect (which reads it) has
  // had a chance to run — ordering here is deterministic because child effects (the canvas's
  // auto-assign effect) flush before parent effects for the same commit, unlike the previous
  // requestAnimationFrame-based reset which raced React's own effect scheduling.
  useEffect(() => {
    skipAutoAssignRef.current = false;
  }, [fields.length]);

  const [fieldSaved, setFieldSaved] = useState("");
  // Chains field-save PATCH requests so they always reach the server in the
  // order they were made — the endpoint does a blind full-column replace of
  // `settings` (no merge, no version check), so two overlapping in-flight
  // requests could otherwise let an earlier one "win" over a newer edit if
  // its response happens to arrive last (e.g. rapid successive changes to
  // Search Fields/Result Columns). Same fix as the form builder's
  // saveSettingsPatch (mycrm/app/(dashboard)/forms/[id]/builder/page.tsx).
  const fieldSaveQueue = useRef<Promise<any>>(Promise.resolve());
  const updateSelectedField = async (changes: Partial<Field>) => {
    if (!selectedField) return;
    const updated = { ...selectedField, ...changes };
    setSelectedField(updated);
    setFields(prev => prev.map(f => f.id === selectedField.id ? updated : f));
    const fieldId = selectedField.id;
    fieldSaveQueue.current = fieldSaveQueue.current
      .catch(() => {})
      .then(() => api.patch(`/modules/${id}/fields/${fieldId}`, changes))
      .then(() => {
        setFieldSaved("Saved");
        setTimeout(() => setFieldSaved(""), 2000);
      })
      .catch(() => {
        setFieldSaved("Save failed");
        setTimeout(() => setFieldSaved(""), 2000);
      });
    await fieldSaveQueue.current;
  };

  const deleteField = async (fieldId: string) => {
    // A field still driving an active Blueprint/Workflow can't be deleted — check first so
    // we can name exactly which one(s), rather than let the delete round-trip fail blind.
    try {
      const { data: usages } = await api.get(`/modules/${id}/fields/${fieldId}/usage`);
      const blocking = (usages ?? []).filter((u: any) => u.isActive);
      if (blocking.length) {
        alert(
          `Can't delete this field — it's used by active ${blocking.map((u: any) => `${u.type} "${u.name}"`).join(", ")}. ` +
          `Turn ${blocking.length > 1 ? "those" : "it"} off first, or remove the reference there.`
        );
        return;
      }
      const inactive = usages ?? [];
      const warning = inactive.length
        ? ` It's also referenced by inactive ${inactive.map((u: any) => `${u.type} "${u.name}"`).join(", ")} — deleting it may break ${inactive.length > 1 ? "those" : "that"} if switched on again.`
        : "";
      if (!confirm(`Remove this field?${warning}`)) return;
    } catch {
      if (!confirm("Remove this field?")) return;
    }
    try {
      await api.delete(`/modules/${id}/fields/${fieldId}`);
      const deleted = fields.find(f => f.id === fieldId);
      setFields(prev => prev.filter(f => f.id !== fieldId));
      if (selectedField?.id === fieldId) setSelectedField(null);
      if (deleted && lastSelectedFieldName === deleted.name) setLastSelectedFieldName(null);
    } catch (err: any) {
      alert(err?.response?.data?.message || "Couldn't delete this field.");
    }
  };

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    if (active.data.current?.isPalette) {
      dragActiveRef.current = true;
      setDraggingPalette(active.data.current.fieldType);
    }
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { over } = event;
    // If dragging from palette and hovering over canvas area
    if (draggingPalette && over?.id === "canvas-drop-zone") {
      setCanvasIsOver(true);
    } else {
      setCanvasIsOver(false);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    // Capture the hovered section/field synchronously, before anything below can trigger a
    // re-render — setDraggingPalette(null) flips draggingFromPalette to false, which makes
    // the canvas's cleanup effect null out these exact refs out from under us.
    const capturedSection = paletteHoverSectionRef.current;
    const capturedField = paletteHoverFieldRef.current;

    setDraggingPalette(null);
    setCanvasIsOver(false);

    // Palette item dropped onto canvas
    if (active.data.current?.isPalette) {
      if (over) {
        await addField(active.data.current.fieldType, capturedSection, capturedField);
      }
      paletteHoverSectionRef.current = null;
      paletteHoverFieldRef.current = null;
      requestAnimationFrame(() => { dragActiveRef.current = false; });
      return;
    }

    // Canvas reorder
    if (!over || active.id === over.id) return;
    const oldIndex = fields.findIndex(f => f.id === active.id);
    const newIndex = fields.findIndex(f => f.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    const reordered = arrayMove(fields, oldIndex, newIndex);
    setFields(reordered);
    try {
      await api.post(`/modules/${id}/fields/reorder`, { fieldIds: reordered.map(f => f.id) });
    } catch {}
  };

  // Unified save: module metadata + layout config in one action
  const handleSave = async () => {
    if (!activeModule) return;
    setSaving(true);
    try {
      const currentSettings = (activeModule as any)?.settings || {};
      // Save both metadata and layout in parallel
      await Promise.all([
        updateModule(id, {
          name: activeModule.name,
          description: activeModule.description,
          icon: activeModule.icon,
        }),
        api.patch(`/modules/${id}`, {
          settings: { ...currentSettings, layout: layoutConfig },
        }),
      ]);
      await fetchModule(id);
      const now = new Date();
      setLastSaved(now);
      setIsDirty(false);
      toast.success(`Changes saved · ${now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`);
    } catch {
      toast.error("Failed to save — please try again");
    } finally {
      setSaving(false);
    }
  };


  const saveSummaryStats = async () => {
    setSavingSummary(true);
    try {
      const currentSettings = (activeModule as any)?.settings || {};
      await api.patch(`/modules/${id}`, {
        settings: { ...currentSettings, summaryStats, summaryEnabled },
      });
      toast.success("Summary saved");
    } catch {
      toast.error("Failed to save summary");
    } finally {
      setSavingSummary(false);
    }
  };

  const filteredFieldTypes = filterText
    ? FIELD_TYPES.filter(ft =>
        ft.label.toLowerCase().includes(filterText.toLowerCase()) ||
        ft.group.toLowerCase().includes(filterText.toLowerCase())
      )
    : FIELD_TYPES;

  const groupedTypes = GROUPS.map(g => ({
    group: g,
    items: filteredFieldTypes.filter(ft => ft.group === g),
  })).filter(g => g.items.length > 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
          <X className="w-6 h-6 text-red-600" />
        </div>
        <div className="text-center">
          <h3 className="text-base font-semibold text-gray-900 mb-1">Module Studio failed to load</h3>
          <p className="text-sm text-gray-500 max-w-sm">{loadError}</p>
        </div>
        <div className="flex gap-3">
          <Button onClick={() => { setLoading(true); setLoadError(null); fetchModule(id).then(() => setLoading(false)).catch(e => { setLoadError(e?.message || "Failed"); setLoading(false); }); }}>
            Retry
          </Button>
          <Link href="/studio"><Button variant="outline">Back to Studio</Button></Link>
        </div>
      </div>
    );
  }

  // Palette IDs for DnD context
  const paletteIds = FIELD_TYPES.map(ft => `palette-${ft.type}`);

  return (
    <div className="flex flex-col h-full -m-6">
      {/* Studio Header */}
      <div className="flex items-center justify-between px-4 sm:px-6 py-2.5 bg-white border-b border-gray-200 shrink-0">
        <div className="flex items-center gap-3">
          <Link href="/studio">
            <button className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors">
              <ArrowLeft className="w-4 h-4" />
            </button>
          </Link>
          <div className="h-5 w-px bg-gray-200" />
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center text-sm">
              <ModuleIcon icon={activeModule?.icon} slug={activeModule?.slug} size={16} />
            </div>
            <div>
              <h1 className="font-semibold text-gray-800 text-sm leading-tight">{activeModule?.name}</h1>
              <p className="text-[11px] text-gray-400">{fields.length} field{fields.length !== 1 ? "s" : ""}</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Unsaved / last-saved indicator */}
          {isDirty ? (
            <span className="text-[10px] font-medium text-amber-600 bg-amber-50 border border-amber-200 px-2 py-1 rounded-lg">
              Unsaved changes
            </span>
          ) : lastSaved ? (
            <span className="text-[10px] text-gray-400">
              Saved {lastSaved.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </span>
          ) : null}
          <button
            onClick={() => setPreviewMode((v) => !v)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border",
              previewMode
                ? "bg-blue-600 text-white border-blue-600"
                : "text-gray-600 border-gray-200 hover:bg-gray-50 hover:border-gray-300"
            )}
          >
            <Eye className="w-3.5 h-3.5" />
            {previewMode ? "Edit" : "Preview"}
          </button>
          <Link href={`/m/${activeModule?.slug}`}>
            <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-gray-600 border border-gray-200 hover:bg-gray-50 hover:border-gray-300 transition-colors">
              <ChevronRight className="w-3.5 h-3.5" />
              Records
            </button>
          </Link>
          <button
            onClick={handleSave}
            disabled={saving}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50",
              isDirty
                ? "bg-blue-600 hover:bg-blue-500 text-white ring-2 ring-blue-300 ring-offset-1"
                : "bg-blue-600 hover:bg-blue-500 text-white"
            )}
          >
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            Save Changes
          </button>
        </div>
      </div>

      {/* Studio Body */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="flex flex-1 overflow-hidden">
          {/* Left: Field Types Panel */}
          <div className="w-52 bg-white border-r border-gray-200 flex flex-col shrink-0">
            <div className="px-3 py-3 border-b border-gray-100 space-y-2">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Components</p>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400" />
                <input
                  value={filterText}
                  onChange={e => setFilterText(e.target.value)}
                  placeholder="Search…"
                  className="w-full pl-7 pr-2 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-lg text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-400 focus:border-blue-400 transition"
                />
              </div>
            </div>
            <ScrollArea className="flex-1">
              <SortableContext items={paletteIds} strategy={verticalListSortingStrategy}>
                <div className="p-2 space-y-3">
                  {groupedTypes.map(({ group, items }) => (
                    <div key={group}>
                      <p className="px-2 py-1 text-[10px] font-semibold text-gray-400 uppercase tracking-widest">{group}</p>
                      <div className="space-y-0.5">
                        {items.map((ft) => (
                          <PaletteItem
                            key={ft.type}
                            ft={ft}
                            onAdd={() => addField(ft.type)}
                            dragActiveRef={dragActiveRef}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </SortableContext>
            </ScrollArea>
          </div>

          {/* Center: Canvas */}
          <div className="flex-1 bg-[#f1f5f9] overflow-y-auto" id="canvas-area">
            <div className="max-w-3xl mx-auto p-5 space-y-4">

              {/* Module card header — mimics real record form */}
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm px-5 py-3.5 flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-blue-600/10 border border-blue-200 flex items-center justify-center text-lg">
                  <ModuleIcon icon={activeModule?.icon} slug={activeModule?.slug} size={20} />
                </div>
                <div>
                  <p className="font-bold text-gray-900 text-sm">{activeModule?.name || "Module"}</p>
                  <p className="text-[11px] text-gray-400">
                    {previewMode ? "Preview — exactly how users will see this form" : "Drag fields to arrange · Click to configure"}
                  </p>
                </div>
                {previewMode && (
                  <span className="ml-auto text-[10px] font-bold px-2.5 py-1 rounded-full bg-blue-600 text-white uppercase tracking-wider">
                    Preview
                  </span>
                )}
              </div>

              {/* Canvas card */}
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                <ModuleLayoutCanvas
                  fields={fields}
                  layoutConfig={layoutConfig}
                  onLayoutChange={(cfg) => { setLayoutConfig(cfg); }}
                  selectedFieldId={selectedField?.id ?? null}
                  onFieldSelect={(field) => {
                    setSelectedField(field);
                    if (field) setLastSelectedFieldName(field.name);
                    setRightTab("properties");
                  }}
                  onDeleteField={deleteField}
                  previewMode={previewMode}
                  draggingFromPalette={!!draggingPalette}
                  skipAutoAssignRef={skipAutoAssignRef}
                  onPaletteHoverSection={(sectionId) => { paletteHoverSectionRef.current = sectionId; }}
                  onPaletteHoverField={(fieldId) => { paletteHoverFieldRef.current = fieldId; }}
                />

                {fields.length === 0 && !previewMode && (
                  <div className="border-2 border-dashed rounded-xl p-12 text-center border-gray-200 bg-gray-50/50 mt-2">
                    <div className="text-4xl mb-3">🧩</div>
                    <p className="text-sm font-semibold text-gray-500 mb-1">No fields yet</p>
                    <p className="text-xs text-gray-400">Click or drag a component from the left panel to begin.</p>
                  </div>
                )}
              </div>

            </div>
          </div>

          {/* Right: Properties Panel */}
          <div className="w-[30rem] bg-white border-l border-gray-200 flex flex-col shrink-0">
            {/* Tab header */}
            <div className="flex border-b border-gray-100 shrink-0">
              {(["properties", "summary", "rules"] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setRightTab(tab)}
                  className={cn(
                    "flex-1 py-2.5 text-xs font-medium transition-colors relative",
                    rightTab === tab
                      ? "text-blue-700 border-b-2 border-blue-600 bg-blue-50/50"
                      : "text-gray-500 hover:text-gray-700"
                  )}
                >
                  {tab === "summary" ? "Summary" : tab === "rules" ? (
                    <span className="flex items-center justify-center gap-1">
                      <Workflow className="w-3 h-3" />
                      Rules
                      {((layoutConfig as any).rules?.length ?? 0) > 0 && (
                        <span className="ml-0.5 bg-indigo-500 text-white rounded-full px-1 text-[9px] font-bold leading-none py-0.5">
                          {(layoutConfig as any).rules.length}
                        </span>
                      )}
                    </span>
                  ) : "Properties"}
                </button>
              ))}
            </div>

            {rightTab === "rules" ? (
              <div className="flex flex-col flex-1 overflow-hidden">
                <ModuleLayoutRulesPanel
                  fields={fields}
                  layoutConfig={layoutConfig}
                  onLayoutChange={cfg => setLayoutConfig(cfg)}
                  defaultFieldName={lastSelectedFieldName}
                />
              </div>
            ) : rightTab === "summary" ? (
              <div className="flex flex-col flex-1 overflow-hidden">
                <ScrollArea className="flex-1">
                  <div className="p-4 space-y-2.5">

                    {/* Enable toggle */}
                    <div className="flex items-center justify-between py-2.5 px-3 bg-gray-50 rounded-xl">
                      <div>
                        <p className="text-xs font-medium text-gray-700">Show summary bar</p>
                        <p className="text-[11px] text-gray-400">Display stats above the record list</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSummaryEnabled(v => !v)}
                        className={cn(
                          "relative inline-flex h-5 w-9 shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none cursor-pointer",
                          summaryEnabled ? "bg-blue-600" : "bg-gray-200"
                        )}
                      >
                        <span className={cn(
                          "pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow-sm ring-0 transition-transform duration-200",
                          summaryEnabled ? "translate-x-4" : "translate-x-0"
                        )} />
                      </button>
                    </div>

                    {summaryStats.length === 0 && summaryEnabled && (
                      <div className="text-center py-8 text-gray-400">
                        <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center mx-auto mb-2.5">
                          <Plus className="w-5 h-5 text-gray-400" />
                        </div>
                        <p className="text-xs font-medium text-gray-500 mb-0.5">No stats yet</p>
                        <p className="text-[11px] text-gray-400">Add a stat to show in the summary bar</p>
                      </div>
                    )}

                    {summaryEnabled && summaryStats.map((stat, idx) => {
                      const isEditing = editingStatId === stat.id;
                      const needsField = ["SUM","AVG","MIN","MAX"].includes(stat.aggregation);
                      const AGG_COLORS: Record<string, string> = {
                        COUNT: "bg-blue-50 text-blue-600 ring-blue-100",
                        SUM: "bg-emerald-50 text-emerald-600 ring-emerald-100",
                        AVG: "bg-violet-50 text-violet-600 ring-violet-100",
                        PERCENTAGE: "bg-amber-50 text-amber-600 ring-amber-100",
                        MIN: "bg-sky-50 text-sky-600 ring-sky-100",
                        MAX: "bg-rose-50 text-rose-600 ring-rose-100",
                      };
                      return (
                        <div key={stat.id} className={cn(
                          "rounded-xl border transition-all duration-150",
                          isEditing ? "border-blue-200 shadow-sm" : "border-gray-150 hover:border-gray-300"
                        )}>
                          {/* Collapsed row */}
                          <div
                            className={cn("flex items-center gap-2.5 px-3 py-2.5 cursor-pointer rounded-xl", isEditing && "rounded-b-none")}
                            onClick={() => setEditingStatId(isEditing ? null : stat.id)}
                          >
                            <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded-md ring-1 ring-inset shrink-0", AGG_COLORS[stat.aggregation] ?? "bg-gray-100 text-gray-500 ring-gray-200")}>
                              {stat.aggregation}
                            </span>
                            <span className="flex-1 text-xs font-medium text-gray-700 truncate min-w-0">
                              {stat.label || <span className="text-gray-400 italic font-normal">Untitled</span>}
                            </span>
                            {stat.conditions?.length ? (
                              <span className="text-[10px] text-gray-400 shrink-0">{stat.conditions.length} filter{stat.conditions.length !== 1 ? "s" : ""}</span>
                            ) : null}
                            <button
                              onClick={e => { e.stopPropagation(); setSummaryStats(prev => prev.filter((_, i) => i !== idx)); if (isEditing) setEditingStatId(null); }}
                              className="p-1 rounded-md text-gray-300 hover:text-red-400 hover:bg-red-50 transition shrink-0"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>

                          {/* Expanded editor */}
                          {isEditing && (
                            <div className="px-3 pb-3 space-y-3 border-t border-gray-100 pt-3">

                              {/* Label */}
                              <div className="space-y-1">
                                <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Label</label>
                                <input
                                  className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm text-gray-800 placeholder:text-gray-300 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition bg-white"
                                  value={stat.label}
                                  placeholder="e.g. Total Scholars"
                                  autoFocus
                                  onChange={e => setSummaryStats(prev => prev.map((s, i) => i === idx ? { ...s, label: e.target.value } : s))}
                                />
                              </div>

                              {/* Aggregation */}
                              <div className="space-y-1.5">
                                <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Aggregation</label>
                                <div className="grid grid-cols-3 gap-1">
                                  {(["COUNT","SUM","AVG","PERCENTAGE","MIN","MAX"] as const).map(agg => (
                                    <button key={agg}
                                      onClick={() => setSummaryStats(prev => prev.map((s, i) => i === idx ? { ...s, aggregation: agg } : s))}
                                      className={cn(
                                        "py-1.5 rounded-lg text-[11px] font-semibold border transition-all",
                                        stat.aggregation === agg
                                          ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                                          : "bg-white text-gray-500 border-gray-200 hover:border-blue-300 hover:text-blue-600"
                                      )}
                                    >{agg}</button>
                                  ))}
                                </div>
                              </div>

                              {/* Field */}
                              {needsField && (
                                <div className="space-y-1">
                                  <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Field to aggregate</label>
                                  <select
                                    className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm text-gray-700 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 bg-white transition"
                                    value={stat.field ?? ""}
                                    onChange={e => setSummaryStats(prev => prev.map((s, i) => i === idx ? { ...s, field: e.target.value } : s))}
                                  >
                                    <option value="">Choose field…</option>
                                    {fields.map(f => <option key={f.id ?? f.name} value={f.name}>{f.label || f.name}</option>)}
                                  </select>
                                </div>
                              )}

                              {/* Conditions */}
                              <div className="space-y-1.5">
                                <div className="flex items-center justify-between">
                                  <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Filter conditions</label>
                                  <button
                                    onClick={() => setSummaryStats(prev => prev.map((s, i) => i === idx ? {
                                      ...s,
                                      conditions: [...(s.conditions ?? []), { id: generateId(), field: fields[0]?.name ?? "", op: "is" as const, value: "" }]
                                    } : s))}
                                    className="flex items-center gap-0.5 text-[11px] font-medium text-blue-600 hover:text-blue-700 transition"
                                  >
                                    <Plus className="w-3 h-3" /> Add filter
                                  </button>
                                </div>
                                {!(stat.conditions?.length) && (
                                  <p className="text-[11px] text-gray-400 bg-gray-50 rounded-lg px-2.5 py-2">All records included</p>
                                )}
                                <div className="space-y-1.5">
                                  {(stat.conditions ?? []).map((cond, ci) => {
                                    const condField = fields.find(f => f.name === cond.field);
                                    const hasOptions = condField && ["SELECT","STATUS","RADIO","DROPDOWN"].includes(condField.type) && condField.options?.length;
                                    return (
                                      <div key={cond.id} className="flex gap-1.5 items-center bg-gray-50 rounded-lg px-2 py-1.5">
                                        <select
                                          className="flex-1 min-w-0 bg-white border border-gray-200 rounded-md px-1.5 py-1 text-[11px] text-gray-700 focus:outline-none focus:border-blue-400"
                                          value={cond.field}
                                          onChange={e => setSummaryStats(prev => prev.map((s, i) => i === idx ? {
                                            ...s, conditions: s.conditions!.map((c, j) => j === ci ? { ...c, field: e.target.value, value: "" } : c)
                                          } : s))}
                                        >
                                          {fields.map(f => <option key={f.id ?? f.name} value={f.name}>{f.label || f.name}</option>)}
                                        </select>
                                        <select
                                          className="bg-white border border-gray-200 rounded-md px-1.5 py-1 text-[11px] text-gray-700 focus:outline-none focus:border-blue-400"
                                          value={cond.op}
                                          onChange={e => setSummaryStats(prev => prev.map((s, i) => i === idx ? {
                                            ...s, conditions: s.conditions!.map((c, j) => j === ci ? { ...c, op: e.target.value as any } : c)
                                          } : s))}
                                        >
                                          <option value="is">is</option>
                                          <option value="is_not">is not</option>
                                          <option value="contains">contains</option>
                                          <option value="gt">&gt;</option>
                                          <option value="lt">&lt;</option>
                                          <option value="gte">≥</option>
                                          <option value="lte">≤</option>
                                          <option value="empty">empty</option>
                                          <option value="not_empty">not empty</option>
                                        </select>
                                        {!["empty","not_empty"].includes(cond.op) && (
                                          hasOptions ? (
                                            <select
                                              className="flex-1 min-w-0 bg-white border border-gray-200 rounded-md px-1.5 py-1 text-[11px] text-gray-700 focus:outline-none focus:border-blue-400"
                                              value={cond.value ?? ""}
                                              onChange={e => setSummaryStats(prev => prev.map((s, i) => i === idx ? {
                                                ...s, conditions: s.conditions!.map((c, j) => j === ci ? { ...c, value: e.target.value } : c)
                                              } : s))}
                                            >
                                              <option value="">Any</option>
                                              {condField!.options!.map((o, i) => <option key={o.id ?? `${o.value}-${i}`} value={o.value}>{o.label}</option>)}
                                            </select>
                                          ) : (
                                            <input
                                              className="flex-1 min-w-0 bg-white border border-gray-200 rounded-md px-1.5 py-1 text-[11px] text-gray-700 placeholder:text-gray-300 focus:outline-none focus:border-blue-400"
                                              value={cond.value ?? ""}
                                              placeholder="value"
                                              onChange={e => setSummaryStats(prev => prev.map((s, i) => i === idx ? {
                                                ...s, conditions: s.conditions!.map((c, j) => j === ci ? { ...c, value: e.target.value } : c)
                                              } : s))}
                                            />
                                          )
                                        )}
                                        <button
                                          onClick={() => setSummaryStats(prev => prev.map((s, i) => i === idx ? {
                                            ...s, conditions: s.conditions!.filter((_, j) => j !== ci)
                                          } : s))}
                                          className="p-0.5 rounded text-gray-300 hover:text-red-400 transition shrink-0"
                                        ><X className="w-3 h-3" /></button>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}

                    {summaryEnabled && (
                      <button
                        onClick={() => {
                          const newStat: SummaryStatConfig = { id: generateId(), label: "", aggregation: "COUNT", conditions: [] };
                          setSummaryStats(prev => [...prev, newStat]);
                          setEditingStatId(newStat.id);
                        }}
                        className="w-full flex items-center justify-center gap-1.5 py-2.5 border border-dashed border-gray-200 rounded-xl text-xs font-medium text-gray-400 hover:border-blue-300 hover:text-blue-600 hover:bg-blue-50/50 transition"
                      >
                        <Plus className="w-3.5 h-3.5" /> Add stat
                      </button>
                    )}
                  </div>
                </ScrollArea>

                <div className="p-3 border-t border-gray-100 shrink-0">
                  <button
                    onClick={saveSummaryStats}
                    disabled={savingSummary}
                    className="w-full flex items-center justify-center gap-2 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-60 text-white text-xs font-semibold transition"
                  >
                    {savingSummary ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />Saving…</> : <><Save className="w-3.5 h-3.5" />Save Summary</>}
                  </button>
                </div>
              </div>
            ) : selectedField ? (
              <>
                <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between shrink-0">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Field Properties</p>
                  {fieldSaved && <span className={`text-xs ${fieldSaved === "Saved" ? "text-green-600" : "text-red-500"}`}>{fieldSaved}</span>}
                  <button onClick={() => setSelectedField(null)} className="text-gray-400 hover:text-gray-600">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <ScrollArea className="flex-1">
                  <div className="p-4 space-y-5">
                    {/* Label */}
                    <div className="space-y-1.5">
                      <Label className="text-xs">Field Label *</Label>
                      <Input
                        value={selectedField.label}
                        onChange={(e) => {
                          const label = e.target.value;
                          updateSelectedField({ label, name: generateFieldKey(label) });
                        }}
                        placeholder="Enter field label"
                      />
                    </div>

                    {/* Type */}
                    <div className="space-y-1.5">
                      <Label className="text-xs">Field Type</Label>
                      <Select
                        value={selectedField.type}
                        onValueChange={(v) => updateSelectedField({ type: v as any })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {GROUPS.map(g => (
                            <div key={g}>
                              <div className="px-2 py-1 text-[10px] font-semibold text-gray-400 uppercase">{g}</div>
                              {FIELD_TYPES.filter(ft => ft.group === g).map(ft => (
                                <SelectItem key={ft.type} value={ft.type}>
                                  <span className="flex items-center gap-2">
                                    <span className="font-mono text-xs">{ft.icon}</span>
                                    {ft.label}
                                  </span>
                                </SelectItem>
                              ))}
                            </div>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Options / Data Source for Dropdown/Multi-select/Status/Radio — placed
                        right after Field Type since they directly define what this field's
                        values are, rather than buried below unrelated settings. */}
                    {TYPES_WITH_OPTIONS.includes(selectedField.type) && (
                      <>
                        <Separator />
                        <FieldOptionsEditor key={(selectedField as any).id} field={selectedField} onUpdate={updateSelectedField} globalLists={globalLists} allFields={fields} />
                        <Separator />
                      </>
                    )}

                    {/* FORMULA config — placed right after Field Type for the same reason:
                        the formula IS what defines this field's value. */}
                    {selectedField.type === "FORMULA" && (
                      <>
                        <Separator />
                        <FormulaConfig field={selectedField} fields={fields} onUpdate={updateSelectedField} />
                        <Separator />
                      </>
                    )}

                    {/* Placeholder */}
                    <div className="space-y-1.5">
                      <Label className="text-xs">Placeholder</Label>
                      <Input
                        value={selectedField.placeholder || ""}
                        onChange={(e) => updateSelectedField({ placeholder: e.target.value })}
                        placeholder="Enter placeholder text"
                      />
                    </div>

                    <Separator />

                    {/* Toggles */}
                    <div className="space-y-3">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Field Settings</p>
                      {[
                        { key: "isRequired", label: "Required", description: "Must be filled to save" },
                        { key: "isUnique",   label: "Unique",   description: "No duplicates allowed" },
                        { key: "isConfidential", label: "Confidential", description: "Value hidden from everyone except admins, everywhere this record is shown, exported, or read via the API" },
                      ].map(({ key, label, description }) => (
                        <div key={key} className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-gray-700">{label}</p>
                            <p className="text-xs text-gray-400">{description}</p>
                          </div>
                          <Switch
                            checked={(selectedField as any)[key]}
                            onCheckedChange={(checked) => updateSelectedField({ [key]: checked } as any)}
                          />
                        </div>
                      ))}
                    </div>

                    <Separator />

                    {/* Display & Behaviour */}
                    <div className="space-y-3">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Display &amp; Behaviour</p>

                      <div className="space-y-1.5">
                        <Label className="text-xs">Visibility</Label>
                        <div className="grid grid-cols-2 gap-1.5">
                          {[
                            { value: false, label: "Visible" },
                            { value: true,  label: "Hidden" },
                          ].map(({ value, label }) => (
                            <button
                              key={label}
                              type="button"
                              onClick={() => updateSelectedField({ isHidden: value } as any)}
                              className={cn(
                                "h-8 rounded-md border text-xs font-medium transition-colors",
                                (selectedField as any).isHidden === value
                                  ? "bg-blue-600 border-blue-600 text-white"
                                  : "bg-white border-gray-200 text-gray-600 hover:border-gray-300"
                              )}
                            >
                              {label}
                            </button>
                          ))}
                        </div>
                        <p className="text-xs text-gray-400">
                          {(selectedField as any).isHidden
                            ? "Not shown on the form. Still stores its value (default, auto-populated, workflow, etc.) on submit."
                            : "Shown on the form."}
                        </p>
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-xs">Editability</Label>
                        <div className="grid grid-cols-2 gap-1.5">
                          {[
                            { value: false, label: "Editable" },
                            { value: true,  label: "Read Only" },
                          ].map(({ value, label }) => (
                            <button
                              key={label}
                              type="button"
                              onClick={() => updateSelectedField({ isReadonly: value } as any)}
                              className={cn(
                                "h-8 rounded-md border text-xs font-medium transition-colors",
                                (selectedField as any).isReadonly === value
                                  ? "bg-blue-600 border-blue-600 text-white"
                                  : "bg-white border-gray-200 text-gray-600 hover:border-gray-300"
                              )}
                            >
                              {label}
                            </button>
                          ))}
                        </div>
                        <p className="text-xs text-gray-400">
                          {(selectedField as any).isReadonly
                            ? "Displayed to the user but cannot be edited. Still submitted with the form."
                            : "The user can edit this field normally."}
                        </p>
                      </div>
                    </div>

                    {/* DATE / DATETIME config */}
                    {(selectedField.type === "DATE" || selectedField.type === "DATETIME") && (
                      <>
                        <Separator />
                        <DateTimeConfig field={selectedField} onUpdate={updateSelectedField} />
                      </>
                    )}

                    {/* AUTO_NUMBER config */}
                    {selectedField.type === "AUTO_NUMBER" && (
                      <>
                        <Separator />
                        <AutoNumberConfig field={selectedField} moduleId={id} onUpdate={updateSelectedField} />
                      </>
                    )}

                    {/* LOOKUP config */}
                    {selectedField.type === "LOOKUP" && (
                      <>
                        <Separator />
                        <LookupConfig
                          field={selectedField}
                          modules={modules}
                          onUpdate={updateSelectedField}
                        />
                      </>
                    )}

                    {/* INTEGRATION config */}
                    {selectedField.type === "INTEGRATION" && (
                      <>
                        <Separator />
                        <IntegrationConfig
                          field={selectedField}
                          modules={modules}
                          currentModuleFields={fields}
                          onUpdate={updateSelectedField}
                        />
                      </>
                    )}

                    {/* MIRROR config */}
                    {selectedField.type === "MIRROR" && (
                      <>
                        <Separator />
                        <MirrorConfig
                          field={selectedField}
                          allFields={fields}
                          onUpdate={updateSelectedField}
                        />
                      </>
                    )}

                    {/* GLOBAL_RELATION config */}
                    {selectedField.type === "GLOBAL_RELATION" && (
                      <>
                        <Separator />
                        <GlobalRelationConfig
                          key={(selectedField as any).id}
                          field={selectedField}
                          globalLists={globalLists}
                          onUpdate={updateSelectedField}
                          allFields={fields}
                        />
                      </>
                    )}

                    {/* INLINE_SUBFORM config */}
                    {selectedField.type === "INLINE_SUBFORM" && (
                      <>
                        <Separator />
                        <SubformConfig
                          field={selectedField}
                          modules={modules}
                          onUpdate={updateSelectedField}
                        />
                      </>
                    )}


                    {/* Layout Rules / Conditional Display */}
                    <Separator />
                    <LayoutRulesEditor field={selectedField} fields={fields} onUpdate={updateSelectedField} />
                  </div>
                </ScrollArea>
              </>
            ) : (
              <ModulePropertiesPanel
                activeModule={activeModule}
                moduleId={id}
                saving={saving}
                onSave={handleSave}
                onUpdate={(patch) => {
                  if (activeModule) {
                    // Optimistic local update so UI reflects immediately
                    const { setActiveModule } = useModulesStore.getState();
                    setActiveModule({ ...activeModule, ...patch } as any);
                  }
                }}
                layoutConfig={layoutConfig}
                onLayoutChange={cfg => setLayoutConfig(cfg)}
                fields={fields}
              />
            )}
          </div>
        </div>

        {/* Drag overlay for palette dragging */}
        <DragOverlay dropAnimation={null}>
          {draggingPalette ? (() => {
            const ft = FIELD_TYPES.find(f => f.type === draggingPalette);
            return (
              <div className="flex items-center gap-2.5 px-4 py-2.5 bg-white rounded-xl border-2 border-blue-400 shadow-2xl ring-4 ring-blue-100 text-sm font-semibold text-gray-700 cursor-grabbing pointer-events-none whitespace-nowrap">
                <span className="w-7 h-7 bg-blue-100 rounded-md text-sm flex items-center justify-center font-mono text-blue-600 shrink-0">
                  {ft?.icon}
                </span>
                {ft?.label}
              </div>
            );
          })() : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}

// ── AUTO NUMBER Config ────────────────────────────────────────────────────────

function AutoNumberConfig({ field, moduleId, onUpdate }: { field: Field; moduleId: string; onUpdate: (c: Partial<Field>) => void }) {
  const settings = (field as any).settings || {};
  const [resetOpen, setResetOpen] = useState(false);
  const [resetValue, setResetValue] = useState(String(settings.startingNumber ?? 1));
  const [resetting, setResetting] = useState(false);
  const [resetError, setResetError] = useState("");

  const set = (key: string, value: any) => {
    onUpdate({ settings: { ...settings, [key]: value } } as any);
  };

  // Once numbers have actually been generated, `currentValue` (not
  // `startingNumber`) drives the next one — editing Starting Number below no
  // longer moves it, only "Reset Counter" does (see records.service.ts's
  // generateAutoNumber).
  const hasStarted = typeof settings.currentValue === "number";
  const nextRaw = hasStarted ? settings.currentValue + 1 : (settings.startingNumber ?? 1);
  const preview = [
    settings.prefix,
    String(nextRaw).padStart(settings.paddingLength ?? 5, "0"),
    settings.suffix,
  ].filter(Boolean).join("-");

  const openReset = () => {
    setResetValue(String(settings.startingNumber ?? 1));
    setResetError("");
    setResetOpen(true);
  };

  const confirmReset = async () => {
    const startFrom = Number(resetValue);
    if (!Number.isFinite(startFrom) || startFrom < 1) { setResetError("Enter a positive number"); return; }
    setResetting(true);
    setResetError("");
    try {
      const { data } = await api.post(`/modules/${moduleId}/fields/${field.id}/reset-auto-number`, { startFrom });
      onUpdate({ settings: data.settings } as any);
      setResetOpen(false);
    } catch (err: any) {
      setResetError(err?.response?.data?.message || "Failed to reset counter");
    } finally {
      setResetting(false);
    }
  };

  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Auto Number Config</p>

      <div className="p-2 bg-gray-50 rounded-md text-center">
        <p className="font-mono text-sm font-medium text-blue-700">{preview || "00001"}</p>
        <p className="text-[11px] text-gray-400 mt-0.5">
          {hasStarted ? "Next value to be generated" : "Not started yet — this is the first value"}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label className="text-xs">Prefix</Label>
          <Input
            value={settings.prefix || ""}
            onChange={e => set("prefix", e.target.value)}
            placeholder="e.g. CUS"
            className="h-8 text-xs"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Suffix</Label>
          <Input
            value={settings.suffix || ""}
            onChange={e => set("suffix", e.target.value)}
            placeholder="e.g. TZ"
            className="h-8 text-xs"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Starting Number</Label>
          <Input
            type="number"
            value={settings.startingNumber ?? 1}
            onChange={e => set("startingNumber", Number(e.target.value))}
            min={1}
            className="h-8 text-xs"
            disabled={hasStarted}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Padding Length</Label>
          <Input
            type="number"
            value={settings.paddingLength ?? 5}
            onChange={e => set("paddingLength", Number(e.target.value))}
            min={1}
            max={10}
            className="h-8 text-xs"
          />
        </div>
      </div>
      {hasStarted && (
        <p className="text-xs text-gray-400">
          Numbering has already started, so Starting Number is locked — use "Reset Counter" below to restart it.
        </p>
      )}

      {!resetOpen ? (
        <button
          type="button"
          onClick={openReset}
          className="w-full h-8 rounded-md border border-gray-200 text-xs text-gray-600 hover:bg-gray-50 transition-colors"
        >
          Reset Counter
        </button>
      ) : (
        <div className="p-2 rounded-md border border-gray-200 bg-gray-50/50 space-y-2">
          <Label className="text-xs">Restart numbering from</Label>
          <Input
            type="number"
            value={resetValue}
            onChange={e => setResetValue(e.target.value)}
            min={1}
            className="h-8 text-xs"
          />
          {resetError && <p className="text-xs text-red-600">{resetError}</p>}
          <div className="flex gap-2">
            <Button size="sm" className="h-7 text-xs flex-1" onClick={confirmReset} disabled={resetting}>
              {resetting ? "Resetting..." : "Confirm Reset"}
            </Button>
            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setResetOpen(false)}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      <p className="text-xs text-gray-400">Generated automatically. Users cannot edit this field.</p>
    </div>
  );
}

function DateTimeConfig({ field, onUpdate }: { field: Field; onUpdate: (c: Partial<Field>) => void }) {
  const settings = parseFieldSettings((field as any).settings);
  const isDateTime = field.type === "DATETIME";
  const autoPopulate = settings.autoPopulate || "manual";
  const datePrecision = settings.datePrecision === "month" || settings.datePrecision === "year" ? settings.datePrecision : "full";
  const timeFormat = settings.timeFormat === "12h" ? "12h" : "24h";

  const set = (value: string) => {
    onUpdate({ settings: { ...settings, autoPopulate: value } } as any);
  };
  const setPrecision = (value: string) => {
    onUpdate({ settings: { ...settings, datePrecision: value } } as any);
  };
  const setTimeFormat = (value: string) => {
    onUpdate({ settings: { ...settings, timeFormat: value } } as any);
  };

  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Date &amp; Time Config</p>

      <div className="space-y-1.5">
        <Label className="text-xs">Date precision</Label>
        <Select value={datePrecision} onValueChange={setPrecision}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="full">Full date</SelectItem>
            <SelectItem value="month">Month &amp; year</SelectItem>
            <SelectItem value="year">Year only</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-xs text-gray-400">
          {datePrecision === "year"
            ? "Shows a year dropdown instead of a full date picker — for things like \"expected graduation year\" where the exact day/month isn't meaningful."
            : datePrecision === "month"
            ? "Only month and year are captured (e.g. \"Jan 2027\")."
            : "The full day, month, and year are captured."}
        </p>
      </div>

      {isDateTime && (
        <div className="space-y-1.5">
          <Label className="text-xs">Time display format</Label>
          <Select value={timeFormat} onValueChange={setTimeFormat}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="24h">24-hour (14:30)</SelectItem>
              <SelectItem value="12h">12-hour (2:30 PM)</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-gray-400">
            Applies wherever the time is displayed read-only (record view, tables). The entry field itself follows the browser's own time picker, which can't be forced to a specific format.
          </p>
        </div>
      )}

      <div className="space-y-1.5">
        <Label className="text-xs">Value entry</Label>
        <Select value={autoPopulate} onValueChange={set}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="manual">Manual Entry</SelectItem>
            {isDateTime
              ? <SelectItem value="currentDateTime">Auto-populate current date &amp; time</SelectItem>
              : <SelectItem value="currentDate">Auto-populate current date</SelectItem>}
          </SelectContent>
        </Select>
      </div>
      {autoPopulate !== "manual" && (
        <p className="text-xs text-gray-400">
          Automatically set to {isDateTime ? "the current date and time" : "today's date"} when a record is created. Combine with the Hidden toggle above to keep it out of view (e.g. a "Created Date" field).
        </p>
      )}
    </div>
  );
}

// ── Formula Editor ────────────────────────────────────────────────────────────

const FORMULA_COMPATIBLE_TYPES = ["NUMBER", "DECIMAL", "CURRENCY", "RATING", "PROGRESS", "FORMULA", "DATE", "DATETIME"];

// Walks backward from the cursor to find the function call the cursor is currently
// "inside" (tracking paren depth so nested calls resolve to the innermost one), and
// returns the identifier right before that call's opening paren — used to show
// signature help for whatever function the user is in the middle of typing arguments for.
function findEnclosingFunctionName(text: string, cursor: number): string | null {
  let depth = 0;
  for (let i = cursor - 1; i >= 0; i--) {
    const ch = text[i];
    if (ch === ")") depth++;
    else if (ch === "(") {
      if (depth === 0) {
        let j = i - 1;
        while (j >= 0 && /[A-Za-z0-9_]/.test(text[j])) j--;
        const name = text.slice(j + 1, i);
        return name || null;
      }
      depth--;
    }
  }
  return null;
}

const FORMULA_TOKEN_RE = /(\$[A-Za-z_][A-Za-z0-9_]*)|([A-Za-z_][A-Za-z0-9_]*)|(\d+(?:\.\d+)?)|([+\-*/(),.])|(\s+)/g;

function FormulaEditor({
  value,
  onChange,
  fields,
}: {
  value: string;
  onChange: (v: string) => void;
  fields: { id?: string; name: string; label: string; type: string }[];
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [showFieldDropdown, setShowFieldDropdown] = useState(false);
  const [fieldQuery, setFieldQuery] = useState("");
  const [fieldActiveIdx, setFieldActiveIdx] = useState(0);
  const [showFnDropdown, setShowFnDropdown] = useState(false);
  const [fnQuery, setFnQuery] = useState("");
  const [fnActiveIdx, setFnActiveIdx] = useState(0);
  const [cursorPos, setCursorPos] = useState(0);

  const compatibleFields = fields.filter((f) => FORMULA_COMPATIBLE_TYPES.includes(f.type));

  const filteredFields = fieldQuery
    ? compatibleFields.filter(
        (f) =>
          f.name.toLowerCase().includes(fieldQuery.toLowerCase()) ||
          f.label.toLowerCase().includes(fieldQuery.toLowerCase())
      )
    : compatibleFields;

  const filteredFns = fnQuery
    ? FORMULA_FUNCTION_DOCS.filter((f) => f.name.toLowerCase().startsWith(fnQuery.toLowerCase()))
    : [];

  const detectTriggers = (text: string, cursor: number) => {
    const before = text.slice(0, cursor);
    const fieldMatch = before.match(/\$([A-Za-z0-9_]*)$/);
    if (fieldMatch) {
      setFieldQuery(fieldMatch[1]);
      setShowFieldDropdown(true);
      setFieldActiveIdx(0);
      setShowFnDropdown(false);
      return;
    }
    setShowFieldDropdown(false);
    // A bare identifier not immediately preceded by $ or another word char — candidate function name.
    const fnMatch = before.match(/(?:^|[^$\w])([A-Za-z_][A-Za-z0-9_]*)$/);
    if (fnMatch && fnMatch[1].length > 0) {
      setFnQuery(fnMatch[1]);
      setFnActiveIdx(0);
      setShowFnDropdown(true);
    } else {
      setShowFnDropdown(false);
      setFnQuery("");
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    onChange(text);
    setCursorPos(e.target.selectionStart);
    detectTriggers(text, e.target.selectionStart);
  };

  const handleSelect = (e: React.SyntheticEvent<HTMLTextAreaElement>) => {
    setCursorPos((e.target as HTMLTextAreaElement).selectionStart);
  };

  const insertField = (field: { name: string }) => {
    const ta = textareaRef.current;
    if (!ta) return;
    const cursor = ta.selectionStart;
    const before = value.slice(0, cursor);
    const match = before.match(/\$([A-Za-z0-9_]*)$/);
    if (!match) return;
    const startPos = cursor - match[0].length;
    const newText = value.slice(0, startPos) + `$${field.name}` + value.slice(cursor);
    onChange(newText);
    setShowFieldDropdown(false);
    setFieldQuery("");
    setTimeout(() => {
      ta.focus();
      const newPos = startPos + field.name.length + 1;
      ta.setSelectionRange(newPos, newPos);
      setCursorPos(newPos);
    }, 0);
  };

  const insertFunction = (fn: FormulaFunctionDoc) => {
    const ta = textareaRef.current;
    if (!ta) return;
    const cursor = ta.selectionStart;
    const before = value.slice(0, cursor);
    const match = before.match(/(?:^|[^$\w])([A-Za-z_][A-Za-z0-9_]*)$/);
    const matchedLen = match ? match[1].length : 0;
    const startPos = cursor - matchedLen;
    const insertText = `${fn.name}()`;
    const newText = value.slice(0, startPos) + insertText + value.slice(cursor);
    onChange(newText);
    setShowFnDropdown(false);
    setFnQuery("");
    setTimeout(() => {
      ta.focus();
      const newPos = startPos + fn.name.length + 1; // land inside the parens
      ta.setSelectionRange(newPos, newPos);
      setCursorPos(newPos);
    }, 0);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (showFieldDropdown && filteredFields.length > 0) {
      if (e.key === "ArrowDown") { e.preventDefault(); setFieldActiveIdx((i) => (i + 1) % filteredFields.length); return; }
      if (e.key === "ArrowUp") { e.preventDefault(); setFieldActiveIdx((i) => (i - 1 + filteredFields.length) % filteredFields.length); return; }
      if (e.key === "Enter" || e.key === "Tab") { e.preventDefault(); insertField(filteredFields[fieldActiveIdx]); return; }
      if (e.key === "Escape") { setShowFieldDropdown(false); return; }
    }
    if (showFnDropdown && filteredFns.length > 0) {
      if (e.key === "ArrowDown") { e.preventDefault(); setFnActiveIdx((i) => (i + 1) % filteredFns.length); return; }
      if (e.key === "ArrowUp") { e.preventDefault(); setFnActiveIdx((i) => (i - 1 + filteredFns.length) % filteredFns.length); return; }
      if (e.key === "Enter" || e.key === "Tab") { e.preventDefault(); insertFunction(filteredFns[fnActiveIdx]); return; }
      if (e.key === "Escape") { setShowFnDropdown(false); return; }
    }
  };

  const fieldsMeta = compatibleFields.map((f) => ({ name: f.name, type: f.type }));
  const validation = validateFormula(value, fieldsMeta);
  const activeFnName = findEnclosingFunctionName(value, cursorPos);
  const activeFnDoc = activeFnName ? FORMULA_FUNCTION_DOCS.find((f) => f.name === activeFnName.toUpperCase()) : null;

  const knownFnNames = new Set(FORMULA_FUNCTION_DOCS.map((f) => f.name));
  const tokens = [...value.matchAll(FORMULA_TOKEN_RE)];

  return (
    <div className="space-y-2">
      <div className="relative">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onSelect={handleSelect}
          onClick={handleSelect}
          onBlur={() => setTimeout(() => { setShowFieldDropdown(false); setShowFnDropdown(false); }, 150)}
          className="w-full font-mono text-sm border border-gray-200 rounded-md px-3 py-2.5 min-h-[72px] resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-800 leading-relaxed"
          placeholder="e.g. ADDYEARS($start_date, $course_duration)"
          spellCheck={false}
        />

        {showFieldDropdown && filteredFields.length > 0 && (
          <div className="absolute left-0 top-full z-50 mt-1 w-72 bg-white border border-gray-200 rounded-lg shadow-xl overflow-hidden">
            <div className="px-2.5 py-1.5 text-[10px] font-semibold text-gray-400 uppercase border-b border-gray-100 bg-gray-50 flex items-center justify-between">
              <span>Fields</span>
              {fieldQuery && <span className="text-gray-300 normal-case font-normal">matching "{fieldQuery}"</span>}
            </div>
            <div className="max-h-48 overflow-y-auto">
              {filteredFields.map((field, i) => (
                <button
                  key={field.id ?? field.name}
                  onMouseDown={(e) => { e.preventDefault(); insertField(field); }}
                  className={cn(
                    "w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors border-b border-gray-50 last:border-0",
                    i === fieldActiveIdx ? "bg-blue-50" : "hover:bg-gray-50"
                  )}
                >
                  <span className="text-xs font-mono text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded shrink-0">
                    ${field.name}
                  </span>
                  <span className="text-xs text-gray-700 truncate flex-1" title={field.label}>{field.label}</span>
                  <span className="text-[10px] text-gray-300 shrink-0 uppercase font-mono">{field.type.toLowerCase()}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {showFieldDropdown && fieldQuery && filteredFields.length === 0 && (
          <div className="absolute left-0 top-full z-50 mt-1 w-72 bg-white border border-gray-200 rounded-lg shadow-xl overflow-hidden">
            <div className="px-3 py-3 text-xs text-gray-400 text-center">
              No compatible fields match "{fieldQuery}"
            </div>
          </div>
        )}

        {/* Function-name autocomplete — triggers on bare letters, shows syntax + description inline */}
        {showFnDropdown && filteredFns.length > 0 && (
          <div className="absolute left-0 top-full z-50 mt-1 w-96 bg-white border border-gray-200 rounded-lg shadow-xl overflow-hidden">
            <div className="px-2.5 py-1.5 text-[10px] font-semibold text-gray-400 uppercase border-b border-gray-100 bg-gray-50">
              Functions matching "{fnQuery}"
            </div>
            <div className="max-h-56 overflow-y-auto">
              {filteredFns.map((fn, i) => (
                <button
                  key={fn.name}
                  onMouseDown={(e) => { e.preventDefault(); insertFunction(fn); }}
                  className={cn(
                    "w-full text-left px-3 py-2 transition-colors border-b border-gray-50 last:border-0",
                    i === fnActiveIdx ? "bg-blue-50" : "hover:bg-gray-50"
                  )}
                >
                  <div className="text-xs font-mono font-semibold text-orange-700">{fn.syntax}</div>
                  <div className="text-[11px] text-gray-500 mt-0.5">{fn.description}</div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Signature help for whichever function call the cursor is currently inside */}
      {activeFnDoc && (
        <div className="flex items-start gap-2 px-2.5 py-2 bg-orange-50 border border-orange-200 rounded-md">
          <span className="text-[10px] font-mono font-bold text-orange-500 shrink-0 mt-0.5">ƒ</span>
          <div className="min-w-0">
            <div className="text-xs font-mono font-semibold text-orange-800">{activeFnDoc.syntax}</div>
            <div className="text-[11px] text-orange-700 mt-0.5">{activeFnDoc.description}</div>
            <div className="text-[11px] text-orange-400 font-mono mt-0.5">e.g. {activeFnDoc.example}</div>
          </div>
        </div>
      )}

      {value && (
        <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded text-xs font-mono leading-relaxed break-all whitespace-pre-wrap">
          {tokens.map((m, i) => {
            if (m[1]) {
              const name = m[1].slice(1);
              const known = compatibleFields.some((f) => f.name === name);
              return <span key={i} className={known ? "text-blue-600 font-semibold" : "text-red-600 underline"}>{m[1]}</span>;
            }
            if (m[2]) {
              const known = knownFnNames.has(m[2].toUpperCase());
              return <span key={i} className={known ? "text-orange-600 font-semibold" : "text-red-600 underline"}>{m[2]}</span>;
            }
            if (m[3]) return <span key={i} className="text-green-600">{m[3]}</span>;
            if (m[4]) return <span key={i} className="text-violet-600">{m[4]}</span>;
            return <span key={i}>{m[0]}</span>;
          })}
        </div>
      )}

      {!validation.valid && value && (
        <div className="flex items-start gap-1.5 px-2.5 py-2 bg-red-50 border border-red-200 rounded-md text-xs text-red-700">
          <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          <span>{validation.error}</span>
        </div>
      )}
      {validation.valid && value && (
        <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-green-50 border border-green-200 rounded-md text-xs text-green-700">
          <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
          <span>Looks valid</span>
        </div>
      )}

      <p className="text-[11px] text-gray-400 leading-relaxed">
        Type <kbd className="px-1 py-0.5 bg-gray-100 border border-gray-200 rounded text-[10px] font-mono text-gray-600">$</kbd> to insert a field,
        or start typing a function name (e.g. <code className="text-gray-600">SUM</code>, <code className="text-gray-600">ADDYEARS</code>) for suggestions and syntax help.
        Supports <code className="text-gray-600 text-[11px]">+ − * / ( )</code>, number literals, and date/aggregate functions.
      </p>
    </div>
  );
}

// ── Formula Config (top-level FORMULA field) ──────────────────────────────────

function FormulaConfig({
  field,
  fields,
  onUpdate,
}: {
  field: Field;
  fields: Field[];
  onUpdate: (c: Partial<Field>) => void;
}) {
  const settings = (field as any).settings || {};
  const [localFormula, setLocalFormula] = useState((settings.formula as string) || "");
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync local state when a different field is selected
  useEffect(() => {
    setLocalFormula((settings.formula as string) || "");
  }, [field.id]);

  const handleFormulaChange = (v: string) => {
    setLocalFormula(v);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      onUpdate({ settings: { ...settings, formula: v } } as any);
    }, 600);
  };

  const compatibleFields = fields.filter(
    (f) => f.id !== field.id && FORMULA_COMPATIBLE_TYPES.includes(f.type)
  );

  // Subform fields with at least one column flagged for aggregation — offered
  // as clickable SUM(field.column) tokens, since subform rows aren't plain
  // top-level values the $field autocomplete above can reach.
  const subformAggregates = fields
    .filter((f) => f.type === "INLINE_SUBFORM")
    .flatMap((f) => {
      const cols: SubformColumn[] = (f as any).settings?.columns || [];
      return cols
        .filter((c) => c.aggregate)
        .map((c) => ({ token: `SUM(${f.name}.${c.name})`, label: `${f.label} — ${c.label}` }));
    });

  const insertToken = (token: string) => {
    const next = localFormula ? `${localFormula} + ${token}` : token;
    handleFormulaChange(next);
  };

  // Defaults to on (existing formula fields keep showing "2,026" exactly as before);
  // only fields that explicitly opt out — e.g. a year, a count — skip the comma.
  const thousandsSeparator = settings.thousandsSeparator !== false;

  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Formula</p>
      <FormulaEditor
        value={localFormula}
        onChange={handleFormulaChange}
        fields={compatibleFields}
      />

      <label className="flex items-center justify-between gap-3 py-1.5 cursor-pointer select-none">
        <div className="min-w-0">
          <p className="text-xs font-medium text-gray-700">Use thousands separator</p>
          <p className="text-[11px] text-gray-400">Show numeric results as 2,026 instead of 2026 — turn off for years, IDs, or codes.</p>
        </div>
        <Switch
          checked={thousandsSeparator}
          onCheckedChange={(v) => onUpdate({ settings: { ...settings, thousandsSeparator: v } } as any)}
        />
      </label>
      {subformAggregates.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">Subform totals</p>
          <div className="flex flex-wrap gap-1.5">
            {subformAggregates.map((sa) => (
              <button
                key={sa.token}
                type="button"
                onClick={() => insertToken(sa.token)}
                className="px-2 py-1 rounded-md border border-gray-200 bg-gray-50 text-[11px] font-mono text-gray-600 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 transition-colors"
                title={`Insert ${sa.token}`}
              >
                {sa.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <p className="text-xs text-gray-400">
        No need to declare a result type — whatever the formula computes decides it. Functions like
        <span className="font-mono text-orange-700"> ADDYEARS</span>/<span className="font-mono text-orange-700">ADDMONTHS</span>/<span className="font-mono text-orange-700">ADDDAYS</span>/<span className="font-mono text-orange-700">DATE</span>/<span className="font-mono text-orange-700">TODAY</span> produce a date automatically;
        everything else (arithmetic, <span className="font-mono text-orange-700">DATEDIFF_*</span>, <span className="font-mono text-orange-700">YEAR</span>/<span className="font-mono text-orange-700">MONTH</span>/<span className="font-mono text-orange-700">DAY</span>) produces a number.
        Start typing a function name above for its exact syntax.
      </p>
    </div>
  );
}

// ── LOOKUP Config ─────────────────────────────────────────────────────────────

function LookupConfig({
  field,
  modules,
  onUpdate,
}: {
  field: Field;
  modules: any[];
  onUpdate: (c: Partial<Field>) => void;
}) {
  const settings = (field as any).settings || {};
  const [targetFields, setTargetFields] = useState<any[]>([]);

  const targetModuleId = settings.lookupModuleId || (field as any).lookupModuleId || "";

  useEffect(() => {
    if (!targetModuleId) { setTargetFields([]); return; }
    api.get(`/modules/${targetModuleId}/fields`)
      .then(r => setTargetFields(r.data || []))
      .catch(() => setTargetFields([]));
  }, [targetModuleId]);

  const set = (key: string, value: any) => {
    onUpdate({ settings: { ...settings, [key]: value } } as any);
  };

  const setModule = (modId: string) => {
    onUpdate({
      lookupModuleId: modId,
      settings: { ...settings, lookupModuleId: modId, displayField: "", uniqueKeyField: "" },
    } as any);
  };

  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Lookup Configuration</p>

      <div className="space-y-1.5">
        <Label className="text-xs">Target Module *</Label>
        <Select value={targetModuleId} onValueChange={setModule}>
          <SelectTrigger className="h-8 text-xs">
            <SelectValue placeholder="Select module..." />
          </SelectTrigger>
          <SelectContent>
            {modules.map(m => (
              <SelectItem key={m.id} value={m.id}>
                <ModuleIcon icon={m.icon} slug={m.slug} className="w-4 h-4 inline-block mr-1 -mt-0.5" /> {m.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {targetFields.length > 0 && (
        <>
          <div className="space-y-1.5">
            <Label className="text-xs">Display Field</Label>
            <Select value={settings.displayField || ""} onValueChange={v => set("displayField", v)}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Field to show..." />
              </SelectTrigger>
              <SelectContent>
                {targetFields.map(f => (
                  <SelectItem key={f.id} value={f.name}>{f.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-gray-400">Shown in autocomplete dropdown</p>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Unique Key Field</Label>
            <Select value={settings.uniqueKeyField || ""} onValueChange={v => set("uniqueKeyField", v)}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Unique identifier..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="id">Record ID (default)</SelectItem>
                {targetFields.map(f => (
                  <SelectItem key={f.id} value={f.name}>{f.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-gray-400">Value stored when selected</p>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Search Autocomplete</Label>
            <Select
              value={settings.searchEnabled !== false ? "yes" : "no"}
              onValueChange={v => set("searchEnabled", v === "yes")}
            >
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="yes">Enabled</SelectItem>
                <SelectItem value="no">Disabled (fixed list)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </>
      )}
    </div>
  );
}

// ── INTEGRATION Config ────────────────────────────────────────────────────────
// Zoho-style "Integration Field": search another module, pick a record, and
// (configured separately, per-form, in the Auto-Fill/Mappings tab) prefill
// other fields from it. This panel only configures WHAT can be searched —
// the actual field-to-field mappings live on the form that uses this field.

function IntegrationConfig({
  field,
  modules,
  currentModuleFields,
  onUpdate,
}: {
  field: Field;
  modules: any[];
  currentModuleFields: Field[];
  onUpdate: (c: Partial<Field>) => void;
}) {
  const settings = (field as any).settings || {};
  const [targetFields, setTargetFields] = useState<any[]>([]);

  const sourceModuleId = settings.sourceModuleId || "";

  useEffect(() => {
    if (!sourceModuleId) { setTargetFields([]); return; }
    api.get(`/modules/${sourceModuleId}/fields`)
      .then(r => setTargetFields(r.data || []))
      .catch(() => setTargetFields([]));
  }, [sourceModuleId]);

  const set = (key: string, value: any) => {
    onUpdate({ settings: { ...settings, [key]: value } } as any);
  };

  const setModule = (modId: string) => {
    onUpdate({
      settings: { ...settings, sourceModuleId: modId, searchFieldIds: [], displayFieldId: "", resultColumnFieldIds: [] },
    } as any);
  };

  // Auto-default Display Field to the first search field — leaving it unset
  // used to silently show the raw record id as the search result label.
  const setSearchFields = (ids: string[]) => {
    onUpdate({
      settings: { ...settings, searchFieldIds: ids, displayFieldId: settings.displayFieldId || ids[0] || "" },
    } as any);
  };

  const fieldOptions = targetFields.map(f => ({ value: f.id, label: f.label }));

  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Integration Configuration</p>

      <div className="space-y-1.5">
        <Label className="text-xs">Source Module *</Label>
        <Select value={sourceModuleId} onValueChange={setModule}>
          <SelectTrigger className="h-8 text-xs">
            <SelectValue placeholder="Select module..." />
          </SelectTrigger>
          <SelectContent>
            {modules.map(m => (
              <SelectItem key={m.id} value={m.id}>
                <ModuleIcon icon={m.icon} slug={m.slug} className="w-4 h-4 inline-block mr-1 -mt-0.5" /> {m.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {targetFields.length > 0 && (
        <>
          <div className="space-y-1.5">
            <Label className="text-xs">Search Fields</Label>
            <MultiCombobox
              options={fieldOptions}
              values={settings.searchFieldIds || []}
              onChange={setSearchFields}
              placeholder="Fields users can search by..."
            />
            <p className="text-xs text-gray-400">e.g. Email, Phone, ID — matched against whatever the user types</p>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Display Field</Label>
            <Select value={settings.displayFieldId || ""} onValueChange={v => set("displayFieldId", v)}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Field to show as the result label..." />
              </SelectTrigger>
              <SelectContent>
                {targetFields.map(f => (
                  <SelectItem key={f.id} value={f.id}>{f.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-gray-400">The main label shown for each search result</p>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Result Columns</Label>
            <MultiCombobox
              options={fieldOptions}
              values={settings.resultColumnFieldIds || []}
              onChange={v => set("resultColumnFieldIds", v)}
              placeholder="Extra columns shown while searching..."
            />
            <p className="text-xs text-gray-400">Shown alongside the display field in the search results list</p>
          </div>

          <div className="space-y-1.5 pt-2 border-t border-gray-100">
            <Label className="text-xs">Filter Criteria</Label>
            <p className="text-xs text-gray-400">
              Only records matching these conditions are searchable — narrows results before Search Fields are even applied (e.g. Camp = Camp A, when the module has millions of records).
            </p>
            <ConditionTreeBuilder
              root={normalizeConditionTree(settings.filterCriteria) as ConditionGroup}
              group={normalizeConditionTree(settings.filterCriteria) as ConditionGroup}
              fields={targetFields}
              isRoot
              operators={INTEGRATION_FILTER_OPERATORS}
              noValueOperators={INTEGRATION_FILTER_NO_VALUE_OPS}
              loadDynamicOptions={() => {}}
              dynamicOptions={{}}
              onChange={tree => set("filterCriteria", tree)}
            />
          </div>

          <div className="flex items-center justify-between gap-3 pt-2 border-t border-gray-100">
            <div>
              <Label className="text-xs">Allow manual selection to update the CRM record</Label>
              <p className="text-xs text-gray-400 mt-0.5">
                Off by default. When on, submitting a form with this field also pushes the mapped values back into whatever record the visitor searched for and picked — not just other fields on that form. Only enable this if you're comfortable with any submitter being able to search for and update a record this way.
              </p>
            </div>
            <Switch checked={!!settings.allowManualUpdate} onCheckedChange={v => set("allowManualUpdate", v)} />
          </div>
        </>
      )}

      {targetFields.length > 0 && (
        <div className="space-y-2 pt-2 border-t border-gray-100">
          <Label className="text-xs">Internal Record Mappings</Label>
          <p className="text-xs text-gray-400">Used when this field appears on the internal Create/Edit record page (forms configure their own mappings separately, in the form builder).</p>
          {(settings.internalMappings || []).map((m: any, idx: number) => {
            const mappings = settings.internalMappings || [];
            const otherCurrentFields = currentModuleFields.filter(f => f.id !== field.id);
            return (
              <div key={idx} className="p-2 rounded-lg border border-gray-100 bg-gray-50/50 space-y-1.5">
                <div className="flex items-center gap-1.5">
                  <Select value={m.sourceFieldId || "_none"} onValueChange={v => set("internalMappings", mappings.map((x: any, i: number) => i === idx ? { ...x, sourceFieldId: v === "_none" ? "" : v } : x))}>
                    <SelectTrigger className="h-7 text-xs flex-1"><SelectValue placeholder="Source field…" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_none" className="text-xs italic text-gray-400">Select field…</SelectItem>
                      {targetFields.map(f => <SelectItem key={f.id} value={f.id} className="text-xs">{f.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <span className="text-xs text-gray-400 shrink-0">→</span>
                  <Select value={m.destinationFieldId || "_none"} onValueChange={v => set("internalMappings", mappings.map((x: any, i: number) => i === idx ? { ...x, destinationFieldId: v === "_none" ? "" : v } : x))}>
                    <SelectTrigger className="h-7 text-xs flex-1"><SelectValue placeholder="Fill into…" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_none" className="text-xs italic text-gray-400">Select field…</SelectItem>
                      {otherCurrentFields.map(f => <SelectItem key={f.id} value={f.id} className="text-xs">{f.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <button onClick={() => set("internalMappings", mappings.filter((_: any, i: number) => i !== idx))} className="text-gray-300 hover:text-red-500 shrink-0"><X className="w-3.5 h-3.5" /></button>
                </div>
                <div className="flex items-center gap-3 pl-0.5">
                  <label className="flex items-center gap-1 text-[10px] text-gray-500 cursor-pointer">
                    <input type="radio" checked={(m.behavior || "FILL_IF_EMPTY") === "FILL_IF_EMPTY"}
                      onChange={() => set("internalMappings", mappings.map((x: any, i: number) => i === idx ? { ...x, behavior: "FILL_IF_EMPTY" } : x))} />
                    Fill only if empty
                  </label>
                  <label className="flex items-center gap-1 text-[10px] text-gray-500 cursor-pointer">
                    <input type="radio" checked={m.behavior === "UPDATE_EXISTING"}
                      onChange={() => set("internalMappings", mappings.map((x: any, i: number) => i === idx ? { ...x, behavior: "UPDATE_EXISTING" } : x))} />
                    Always overwrite
                  </label>
                </div>
              </div>
            );
          })}
          <Button size="sm" variant="outline" onClick={() => set("internalMappings", [...(settings.internalMappings || []), { sourceFieldId: "", destinationFieldId: "", behavior: "FILL_IF_EMPTY" }])} className="w-full gap-1.5 text-xs">
            <Plus className="w-3 h-3" /> Add Mapping
          </Button>
        </div>
      )}

      <p className="text-xs text-gray-400 pt-1 border-t border-gray-100">
        Field-to-field mappings for forms are configured per-form, in the Auto-Fill tab when this field is placed on a form.
      </p>
    </div>
  );
}

// ── MIRROR Config ─────────────────────────────────────────────────────────────

function MirrorConfig({
  field,
  allFields,
  onUpdate,
}: {
  field: Field;
  allFields: Field[];
  onUpdate: (c: Partial<Field>) => void;
}) {
  const settings = (field as any).settings || {};
  const [targetFields, setTargetFields] = useState<any[]>([]);

  const lookupFields = allFields.filter(f => f.type === "LOOKUP");

  const sourceLookupField = lookupFields.find(f => f.name === settings.sourceLookupFieldName);
  const targetModuleId = sourceLookupField
    ? ((sourceLookupField as any).settings?.lookupModuleId || (sourceLookupField as any).lookupModuleId || "")
    : "";

  useEffect(() => {
    if (!targetModuleId) { setTargetFields([]); return; }
    api.get(`/modules/${targetModuleId}/fields`)
      .then(r => setTargetFields(r.data || []))
      .catch(() => setTargetFields([]));
  }, [targetModuleId]);

  const setSource = (lookupFieldName: string) => {
    onUpdate({ settings: { ...settings, sourceLookupFieldName: lookupFieldName, mirrorFieldName: "" }, isReadonly: true } as any);
  };

  const setMirrorField = (fieldName: string) => {
    onUpdate({ settings: { ...settings, mirrorFieldName: fieldName }, isReadonly: true } as any);
  };

  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Mirror Configuration</p>
      <p className="text-xs text-gray-400">Automatically pulls a field value from a linked record. Always read-only.</p>

      {lookupFields.length === 0 ? (
        <div className="p-2 bg-amber-50 border border-amber-200 rounded text-xs text-amber-700">
          Add a Lookup field to this module first, then you can mirror fields from linked records.
        </div>
      ) : (
        <>
          <div className="space-y-1.5">
            <Label className="text-xs">Source Lookup Field *</Label>
            <Select value={settings.sourceLookupFieldName || ""} onValueChange={setSource}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Select a lookup field..." />
              </SelectTrigger>
              <SelectContent>
                {lookupFields.map(f => (
                  <SelectItem key={f.id} value={f.name}>{f.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-gray-400">Which lookup in this module to follow</p>
          </div>

          {sourceLookupField && targetFields.length === 0 && (
            <p className="text-xs text-amber-500">Loading fields from target module...</p>
          )}

          {targetFields.length > 0 && (
            <div className="space-y-1.5">
              <Label className="text-xs">Field to Mirror *</Label>
              <Select value={settings.mirrorFieldName || ""} onValueChange={setMirrorField}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Select field to pull..." />
                </SelectTrigger>
                <SelectContent>
                  {targetFields.map(f => (
                    <SelectItem key={f.id} value={f.name}>{f.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-400">The field from the linked record to display</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ── GLOBAL RELATION Config ────────────────────────────────────────────────────

function GlobalRelationConfig({
  field,
  globalLists,
  onUpdate,
  allFields,
}: {
  field: Field;
  globalLists: any[];
  allFields: any[];
  onUpdate: (c: Partial<Field>) => void;
}) {
  const settings = parseFieldSettings((field as any).settings);
  const [levels, setLevels] = useState<string[]>(settings.levels || []);
  const [newLevel, setNewLevel] = useState("");
  const [role, setRole] = useState<"independent" | "primary" | "dependent">(settings.fieldRole ?? "independent");

  const set = (key: string, value: any) => {
    onUpdate({ settings: { ...settings, [key]: value } } as any);
  };

  const handleRoleChange = (newRole: "independent" | "primary" | "dependent") => {
    setRole(newRole);
    set("fieldRole", newRole);
  };

  const addLevel = () => {
    if (!newLevel.trim()) return;
    const updated = [...levels, newLevel.trim()];
    setLevels(updated);
    set("levels", updated);
    setNewLevel("");
  };

  const removeLevel = (i: number) => {
    const updated = levels.filter((_, idx) => idx !== i);
    setLevels(updated);
    set("levels", updated);
  };

  const siblingGlobalRelationFields = allFields.filter(
    (f: any) => f.type === "GLOBAL_RELATION" && f.id !== field.id
  );

  const roleOptions: { value: "independent" | "primary" | "dependent"; label: string; desc: string }[] = [
    { value: "independent", label: "Independent", desc: "Standalone cascading within this field" },
    { value: "primary", label: "Primary", desc: "Root-level source field (loads root items)" },
    { value: "dependent", label: "Dependent", desc: "Depends on another field's selection" },
  ];

  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Global List Config</p>

      <div className="space-y-1.5">
        <Label className="text-xs">Dataset *</Label>
        <Select value={settings.globalListId || ""} onValueChange={v => set("globalListId", v)}>
          <SelectTrigger className="h-8 text-xs">
            <SelectValue placeholder="Select dataset..." />
          </SelectTrigger>
          <SelectContent>
            {globalLists.map(l => (
              <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs">Hierarchy Level</Label>
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={0}
            max={10}
            value={settings.hierarchyLevel ?? 0}
            onChange={e => set("hierarchyLevel", Number(e.target.value))}
            className="w-16 h-8 px-2 border border-gray-200 rounded text-xs text-center focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <span className="text-xs text-gray-400">0 = root level, 1 = children, etc.</span>
        </div>
      </div>

      <div className="space-y-2">
        <Label className="text-xs">Field Role</Label>
        <div className="space-y-1">
          {roleOptions.map(opt => (
            <button
              key={opt.value}
              type="button"
              onClick={() => handleRoleChange(opt.value)}
              className={`w-full text-left px-2.5 py-2 rounded border text-xs transition-colors ${
                role === opt.value
                  ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                  : "border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50"
              }`}
            >
              <span className="font-medium">{opt.label}</span>
              <span className={`ml-1.5 ${role === opt.value ? "text-indigo-500" : "text-gray-400"}`}>
                — {opt.desc}
              </span>
            </button>
          ))}
        </div>
      </div>

      {role === "dependent" && (
        <div className="space-y-1.5">
          <Label className="text-xs">Depends On</Label>
          <Select
            value={settings.dependsOnFieldId || ""}
            onValueChange={v => set("dependsOnFieldId", v)}
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="Select a primary field..." />
            </SelectTrigger>
            <SelectContent>
              {siblingGlobalRelationFields.length === 0 ? (
                <div className="px-2 py-1.5 text-xs text-gray-400">No other Global Relation fields found</div>
              ) : (
                siblingGlobalRelationFields.map((f: any) => (
                  <SelectItem key={f.id} value={f.id}>{f.label || f.name || f.id}</SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
          <p className="text-xs text-gray-400">This field will filter based on the selected primary field's value.</p>
        </div>
      )}

      <div className="space-y-2">
        <Label className="text-xs">Hierarchy Levels to Show</Label>
        <div className="space-y-1">
          {levels.map((level, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="flex-1 text-xs bg-gray-50 border border-gray-200 rounded px-2 py-1">{level}</span>
              <button onClick={() => removeLevel(i)} className="text-gray-400 hover:text-red-500">
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <Input
            value={newLevel}
            onChange={e => setNewLevel(e.target.value)}
            onKeyDown={e => e.key === "Enter" && addLevel()}
            placeholder="e.g. Region"
            className="h-7 text-xs flex-1"
          />
          <Button size="sm" variant="outline" onClick={addLevel} className="h-7 px-2 text-xs">Add</Button>
        </div>
        <p className="text-xs text-gray-400">Defines cascading levels. Users select top → bottom.</p>
      </div>
    </div>
  );
}

// ── Options Editor (Dropdown / Multi-select / Status / Radio) ─────────────────

const OPTION_COLORS = [
  "#6366f1", "#8b5cf6", "#ec4899", "#ef4444",
  "#f97316", "#eab308", "#22c55e", "#14b8a6",
  "#3b82f6", "#64748b",
];

function SortableOption({ opt, index, totalCount, onUpdateLabel, onUpdateColor, onAdd, onRemove, shouldFocus, onFocused }: {
  opt: any; index: number; totalCount: number;
  onUpdateLabel: (label: string) => void;
  onUpdateColor: (color: string) => void;
  onAdd: () => void;
  onRemove: () => void;
  shouldFocus?: boolean;
  onFocused?: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: opt.id || `opt-${index}` });
  const [showColors, setShowColors] = useState(false);
  const labelInputRef = useRef<HTMLInputElement>(null);

  // After a new option is created, focus lands here and its default label is
  // pre-selected so typing immediately replaces "New Option" — no manual select-all needed.
  useEffect(() => {
    if (shouldFocus && labelInputRef.current) {
      labelInputRef.current.focus();
      labelInputRef.current.select();
      onFocused?.();
    }
  }, [shouldFocus, onFocused]);

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }}
      className="flex items-center gap-2 group"
    >
      <button
        {...attributes}
        {...listeners}
        className="text-gray-300 hover:text-gray-500 cursor-grab active:cursor-grabbing shrink-0"
        tabIndex={-1}
      >
        <GripVertical className="w-3.5 h-3.5" />
      </button>

      <div className="relative shrink-0">
        <button
          type="button"
          onClick={() => setShowColors(v => !v)}
          className="w-4 h-4 rounded-full border-2 border-white ring-1 ring-gray-200 hover:ring-blue-400 transition-all"
          style={{ backgroundColor: opt.color || "#94a3b8" }}
        />
        {showColors && (
          <div className="absolute left-0 top-6 z-50 bg-white rounded-lg border border-gray-200 shadow-lg p-2 grid grid-cols-5 gap-1">
            {OPTION_COLORS.map(c => (
              <button
                key={c}
                type="button"
                className="w-4 h-4 rounded-full hover:scale-125 transition-transform ring-offset-1 hover:ring-2 ring-blue-400"
                style={{ backgroundColor: c }}
                onClick={() => { onUpdateColor(c); setShowColors(false); }}
              />
            ))}
            <button
              type="button"
              className="w-4 h-4 rounded-full bg-gray-200 flex items-center justify-center hover:scale-125 transition-transform text-gray-500 text-xs"
              title="Remove color"
              onClick={() => { onUpdateColor(""); setShowColors(false); }}
            >×</button>
          </div>
        )}
      </div>

      <Input
        ref={labelInputRef}
        value={opt.label}
        onChange={(e) => onUpdateLabel(e.target.value)}
        onFocus={(e) => e.target.select()}
        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); onAdd(); } }}
        className="h-7 text-xs flex-1"
      />
      <div className="flex items-center gap-1 shrink-0">
        <button type="button" onClick={onAdd} title="Add option"
          className="w-6 h-6 rounded-full bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center transition-colors">
          <Plus className="w-3.5 h-3.5" />
        </button>
        {totalCount > 1 && (
          <button type="button" onClick={onRemove} title="Remove option"
            className="w-6 h-6 rounded-full bg-red-50 hover:bg-red-100 text-red-500 flex items-center justify-center transition-colors">
            <Minus className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}

// Turns a label into an option `value` slug, guaranteed unique against `taken` — collisions
// (either two labels normalizing to the same slug, e.g. "UDSM (Dar)" vs "udsm dar", or the
// same label entered twice) get a numeric suffix instead of silently duplicating. Duplicate
// values crash every `<SelectItem key={o.value}>`-style renderer across the app with a React
// "two children with the same key" error and make the later duplicate invisible.
function slugifyOptionValue(label: string, taken: Set<string>): string {
  const base = label.toLowerCase().trim().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "") || "option";
  let candidate = base;
  let n = 2;
  while (taken.has(candidate)) candidate = `${base}_${n++}`;
  taken.add(candidate);
  return candidate;
}

function FieldOptionsEditor({ field, onUpdate, globalLists, allFields = [] }: {
  field: Field;
  onUpdate: (changes: Partial<Field>) => void;
  globalLists: any[];
  allFields?: any[];
}) {
  const [bulkInput, setBulkInput] = useState("");
  const [mode, setMode] = useState<"manual" | "bulk" | "import">("manual");
  const [replaceExisting, setReplaceExisting] = useState(true);
  const [searchText, setSearchText] = useState("");
  const [importListId, setImportListId] = useState("");
  const [importItems, setImportItems] = useState<any[]>([]);
  const [importLoading, setImportLoading] = useState(false);
  const parsedSettings = parseFieldSettings((field as any).settings);
  const [useGlobalSource, setUseGlobalSource] = useState(!!(parsedSettings?.globalListSource));
  const [sourceListId, setSourceListId] = useState(parsedSettings?.globalListSource?.listId || "");
  // Id of the option that should grab focus on the next render — set right after
  // creating a new one, cleared once SortableOption has actually focused it.
  const [pendingFocusId, setPendingFocusId] = useState<string | null>(null);

  const options: any[] = (field as any).options || [];
  const settings = parseFieldSettings((field as any).settings);

  const filteredOptions = searchText
    ? options.filter((o: any) => o.label.toLowerCase().includes(searchText.toLowerCase()))
    : options;

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = options.findIndex((o: any) => (o.id || `opt-${options.indexOf(o)}`) === active.id);
    const newIndex = options.findIndex((o: any) => (o.id || `opt-${options.indexOf(o)}`) === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    onUpdate({ options: arrayMove(options, oldIndex, newIndex) } as any);
  };

  const addOption = () => {
    const id = `opt-${Date.now()}`;
    const label = "New Option";
    setPendingFocusId(id);
    onUpdate({
      options: [...options, {
        id,
        label,
        value: `option_${options.length + 1}`,
        color: "",
        order: options.length,
      }],
    } as any);
  };

  const updateLabel = (index: number, label: string) => {
    const taken = new Set(options.filter((_: any, i: number) => i !== index).map((o: any) => o.value));
    onUpdate({
      options: options.map((o: any, i: number) =>
        i === index ? { ...o, label, value: slugifyOptionValue(label, taken) } : o
      ),
    } as any);
  };

  const updateColor = (index: number, color: string) => {
    onUpdate({
      options: options.map((o: any, i: number) => i === index ? { ...o, color } : o),
    } as any);
  };

  const removeOption = (index: number) => {
    onUpdate({ options: options.filter((_: any, i: number) => i !== index) } as any);
  };

  const [copied, setCopied] = useState(false);

  const copyList = () => {
    const text = options.map((o: any) => o.label).join("\n");
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    });
  };

  const applyBulk = () => {
    const lines = bulkInput.split("\n").map((l: string) => l.trim()).filter(Boolean);
    // Dedup against pre-existing options too when appending (not replacing), so a pasted
    // line that collides with an option already on the field still gets a unique suffix.
    const taken = new Set(replaceExisting ? [] : options.map((o: any) => o.value));
    const newOptions = lines.map((line: string, i: number) => ({
      id: `opt-${Date.now()}-${i}`,
      label: line,
      value: slugifyOptionValue(line, taken),
      color: "",
      order: i,
    }));
    const merged = replaceExisting
      ? newOptions
      : [...options, ...newOptions.map((o: any, i: number) => ({ ...o, order: options.length + i }))];
    onUpdate({ options: merged } as any);
    setBulkInput("");
    setMode("manual");
  };

  const loadImportItems = async (listId: string) => {
    if (!listId) return;
    setImportLoading(true);
    try {
      const { data } = await api.get(`/global-lists/${listId}/items`);
      setImportItems(Array.isArray(data) ? data : []);
    } catch {
      setImportItems([]);
    } finally {
      setImportLoading(false);
    }
  };

  const applyImport = () => {
    const taken = new Set(replaceExisting ? [] : options.map((o: any) => o.value));
    const newOptions = importItems.map((item: any, i: number) => ({
      id: `opt-${Date.now()}-${i}`,
      label: item.label,
      value: item.value ? slugifyOptionValue(item.value, taken) : slugifyOptionValue(item.label, taken),
      color: item.color || "",
      order: i,
    }));
    const merged = replaceExisting ? newOptions : [...options, ...newOptions];
    onUpdate({ options: merged } as any);
    setMode("manual");
  };

  const toggleGlobalSource = (enabled: boolean) => {
    setUseGlobalSource(enabled);
    if (!enabled) {
      onUpdate({ settings: { ...settings, globalListSource: null } } as any);
      setSourceListId("");
    }
  };

  const applyGlobalSource = (listId: string) => {
    setSourceListId(listId);
    onUpdate({ settings: { ...settings, globalListSource: listId ? { listId } : null } } as any);
  };

  return (
    <div className="space-y-3">
      {/* Data Source selector */}
      <div className="space-y-2 pb-3 border-b border-gray-100">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Data Source</p>
        <div className="flex gap-1.5">
          {[
            { value: false, label: "Static Values" },
            { value: true,  label: "Global List" },
          ].map(({ value, label }) => (
            <button
              key={String(value)}
              type="button"
              onClick={() => toggleGlobalSource(value)}
              className={`flex-1 py-1.5 text-xs font-medium rounded border transition-colors ${
                useGlobalSource === value
                  ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                  : "border-gray-200 text-gray-600 hover:border-gray-300"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {useGlobalSource && (
        <div className="space-y-3 pb-3 border-b border-gray-100">
          {/* Global List selector */}
          <div className="space-y-1.5">
            <p className="text-xs text-gray-500 font-medium">Select Global List</p>
            <Select value={sourceListId} onValueChange={v => { setSourceListId(v); applyGlobalSource(v); }}>
              <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Choose a list..." /></SelectTrigger>
              <SelectContent>
                {globalLists.map((l: any) => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* Field Role — Primary or Dependent */}
          <div className="space-y-1.5">
            <p className="text-xs text-gray-500 font-medium">Field Role</p>
            <div className="space-y-1">
              {([
                { v: "independent", label: "Independent",  desc: "Standalone — loads all root items" },
                { v: "primary",     label: "Primary Field", desc: "Parent — others depend on this" },
                { v: "dependent",   label: "Depends On…",   desc: "Child — filters by parent value" },
              ] as const).map(opt => (
                <button key={opt.v} type="button"
                  onClick={() => onUpdate({ settings: { ...settings, globalListSource: sourceListId ? { listId: sourceListId } : null, fieldRole: opt.v } } as any)}
                  className={`w-full text-left px-2 py-1.5 rounded border text-xs transition-colors ${
                    (settings.fieldRole ?? "independent") === opt.v
                      ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                      : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
                  }`}>
                  <span className="font-medium">{opt.label}</span>
                  <span className="ml-1 opacity-60">— {opt.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Depends On selector */}
          {(settings.fieldRole === "dependent") && (
            <div className="space-y-1.5">
              <p className="text-xs text-gray-500 font-medium">Depends On (parent field)</p>
              <Select
                value={settings.dependsOnFieldId || ""}
                onValueChange={v => onUpdate({ settings: { ...settings, dependsOnFieldId: v } } as any)}
              >
                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select parent field..." /></SelectTrigger>
                <SelectContent>
                  {allFields
                    .filter((f: any) => f.id !== (field as any).id && ["DROPDOWN","STATUS","GLOBAL_RELATION"].includes(f.type))
                    .map((f: any) => <SelectItem key={f.id} value={f.id}>{f.label || f.name}</SelectItem>)
                  }
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-400">When the parent changes, this field reloads its options automatically.</p>
            </div>
          )}

          {sourceListId && (
            <p className="text-xs text-indigo-600 bg-indigo-50 px-2 py-1 rounded">
              Options fetched at runtime from the selected list.
            </p>
          )}
        </div>
      )}

      {!useGlobalSource && (
        <>
          {/* Header */}
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Options</p>
            <div className="flex items-center gap-2">
              {mode === "manual" && (
                <>
                  {options.length > 0 && (
                    <>
                      <button
                        type="button"
                        onClick={copyList}
                        className="text-xs text-green-600 hover:underline"
                      >{copied ? "Copied!" : "Copy list"}</button>
                      <span className="text-gray-300">|</span>
                    </>
                  )}
                  <button
                    type="button"
                    onClick={() => setMode("import")}
                    className="text-xs text-purple-600 hover:underline"
                  >Import list</button>
                  <span className="text-gray-300">|</span>
                  <button
                    type="button"
                    onClick={() => setMode("bulk")}
                    className="text-xs text-blue-600 hover:underline"
                  >Bulk add</button>
                </>
              )}
              {mode !== "manual" && (
                <button type="button" onClick={() => setMode("manual")} className="text-xs text-gray-500 hover:underline">Cancel</button>
              )}
            </div>
          </div>

          {/* Bulk entry mode */}
          {mode === "bulk" && (
            <div className="space-y-2">
              <textarea
                value={bulkInput}
                onChange={(e) => setBulkInput(e.target.value)}
                placeholder={"Option 1\nOption 2\nOption 3"}
                rows={5}
                className="w-full text-xs border border-gray-200 rounded-md p-2 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <label className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer">
                <input type="checkbox" checked={replaceExisting} onChange={e => setReplaceExisting(e.target.checked)} className="rounded" />
                Replace existing options
              </label>
              <Button size="sm" onClick={applyBulk} className="w-full">Apply Options</Button>
            </div>
          )}

          {/* Import from global list */}
          {mode === "import" && (
            <div className="space-y-2">
              <Select value={importListId} onValueChange={(v) => { setImportListId(v); loadImportItems(v); }}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Select global list to import…" />
                </SelectTrigger>
                <SelectContent>
                  {globalLists.map((gl: any) => (
                    <SelectItem key={gl.id} value={gl.id} className="text-xs">{gl.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {importLoading && <p className="text-xs text-gray-400">Loading items…</p>}
              {!importLoading && importItems.length > 0 && (
                <>
                  <div className="max-h-32 overflow-y-auto space-y-1 border border-gray-200 rounded-md p-2">
                    {importItems.map((item: any) => (
                      <div key={item.id} className="flex items-center gap-2 text-xs text-gray-700">
                        <div className="w-2 h-2 rounded-full bg-gray-300 shrink-0" style={item.color ? { backgroundColor: item.color } : {}} />
                        {item.label}
                      </div>
                    ))}
                  </div>
                  <label className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer">
                    <input type="checkbox" checked={replaceExisting} onChange={e => setReplaceExisting(e.target.checked)} className="rounded" />
                    Replace existing options
                  </label>
                  <Button size="sm" onClick={applyImport} className="w-full">Import {importItems.length} Options</Button>
                </>
              )}
            </div>
          )}

          {/* Manual options list with drag/drop */}
          {mode === "manual" && (
            <div className="space-y-1.5">
              {options.length > 4 && (
                <div className="relative">
                  <Search className="w-3 h-3 absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    value={searchText}
                    onChange={e => setSearchText(e.target.value)}
                    placeholder="Search options…"
                    className="w-full pl-6 pr-2 h-7 text-xs border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              )}

              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext
                  items={options.map((o: any, i: number) => o.id || `opt-${i}`)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-1">
                    {(searchText ? filteredOptions : options).map((opt: any, i: number) => {
                      const realIndex = options.indexOf(opt);
                      return (
                        <SortableOption
                          key={opt.id || i}
                          opt={opt}
                          index={realIndex}
                          totalCount={options.length}
                          onUpdateLabel={(label) => updateLabel(realIndex, label)}
                          onUpdateColor={(color) => updateColor(realIndex, color)}
                          onAdd={addOption}
                          onRemove={() => removeOption(realIndex)}
                          shouldFocus={!!opt.id && opt.id === pendingFocusId}
                          onFocused={() => setPendingFocusId(null)}
                        />
                      );
                    })}
                  </div>
                </SortableContext>
              </DndContext>

              {options.length === 0 && (
                <div className="text-center py-2 space-y-2">
                  <p className="text-xs text-gray-400">No options yet. Add one below or use Bulk add.</p>
                  <Button variant="outline" size="sm" onClick={addOption} className="w-full gap-1.5 text-xs">
                    <Plus className="w-3 h-3" /> Add Option
                  </Button>
                </div>
              )}

              {/* Default value picker */}
              {options.length > 0 && (() => {
                const isMulti = field.type === "MULTI_SELECT";
                const defs: string[] = isMulti
                  ? (settings?.defaultValues ?? [])
                  : (settings?.defaultValue ? [settings.defaultValue] : []);
                const toggle = (val: string) => {
                  if (isMulti) {
                    const curr: string[] = settings?.defaultValues ?? [];
                    const next = curr.includes(val) ? curr.filter((v: string) => v !== val) : [...curr, val];
                    onUpdate({ settings: { ...settings, defaultValues: next } } as any);
                  } else {
                    const next = settings?.defaultValue === val ? null : val;
                    onUpdate({ settings: { ...settings, defaultValue: next } } as any);
                  }
                };
                return (
                  <div className="pt-3 mt-1 border-t border-gray-100 space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Default Value</p>
                      {defs.length > 0 && (
                        <button
                          type="button"
                          onClick={() => onUpdate({ settings: { ...settings, defaultValue: null, defaultValues: [] } } as any)}
                          className="text-[11px] text-gray-400 hover:text-red-500 transition-colors"
                        >
                          Clear
                        </button>
                      )}
                    </div>
                    <p className="text-[11px] text-gray-400">Click to pre-select when creating new records.</p>
                    <div className="flex flex-wrap gap-1.5">
                      {options.map((opt: any) => {
                        const v = opt.value || opt.label;
                        const active = defs.includes(v);
                        return (
                          <button
                            key={opt.id || v}
                            type="button"
                            onClick={() => toggle(v)}
                            className={cn(
                              "px-2.5 py-1 text-xs rounded-full border transition-all",
                              active
                                ? "border-blue-400 bg-blue-50 text-blue-700 font-semibold ring-1 ring-blue-200"
                                : "border-gray-200 text-gray-600 hover:border-gray-300"
                            )}
                            style={opt.color && !active ? { borderColor: opt.color + "88", color: opt.color } : {}}
                          >
                            {active && <span className="mr-1">✓</span>}
                            {opt.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ── INLINE SUBFORM Config ─────────────────────────────────────────────────────

interface SubformColumn {
  id: string;
  name: string;
  label: string;
  type: string;
  required: boolean;
  width?: number;
  options?: { label: string; value: string }[];
  formula?: string;
  lookupModuleId?: string;
  lookupDisplayField?: string;
  aggregate?: boolean; // show a column total in the subform footer + expose as a SUM() formula token
}

const AGGREGATABLE_SUBFORM_COL_TYPES = ["NUMBER", "DECIMAL", "CURRENCY"];

const SUBFORM_COL_TYPES = [
  { value: "TEXT",     label: "Text",     icon: "Aa" },
  { value: "NUMBER",   label: "Number",   icon: "#" },
  { value: "DECIMAL",  label: "Decimal",  icon: "0.0" },
  { value: "CURRENCY", label: "Currency", icon: "$" },
  { value: "DATE",     label: "Date",     icon: "📅" },
  { value: "DROPDOWN", label: "Dropdown", icon: "▼" },
  { value: "BOOLEAN",  label: "Yes/No",   icon: "✓" },
  { value: "LOOKUP",   label: "Lookup",   icon: "🔍" },
  { value: "FORMULA",  label: "Formula",  icon: "fx" },
];

function SortableSubformColumn({
  col,
  columns,
  modules,
  expanded,
  onToggle,
  onUpdateColumn,
  onRemoveColumn,
}: {
  col: SubformColumn;
  columns: SubformColumn[];
  modules: any[];
  expanded: boolean;
  onToggle: () => void;
  onUpdateColumn: (changes: Partial<SubformColumn>) => void;
  onRemoveColumn: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: col.id });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }}
      className="border border-gray-200 rounded-lg overflow-hidden bg-white"
    >
      {/* Column header */}
      <div
        className="flex items-center gap-2 px-2.5 py-2 bg-gray-50 cursor-pointer hover:bg-gray-100 transition-colors select-none"
        onClick={onToggle}
      >
        <button
          type="button"
          {...attributes}
          {...listeners}
          onClick={(e) => e.stopPropagation()}
          className="text-gray-300 hover:text-gray-500 cursor-grab active:cursor-grabbing shrink-0"
          title="Drag to reorder"
        >
          <GripVertical className="w-3.5 h-3.5" />
        </button>

        <span className="font-mono text-[10px] bg-white border border-gray-200 rounded px-1 py-0.5 text-gray-500 shrink-0">
          {SUBFORM_COL_TYPES.find(t => t.value === col.type)?.icon || "?"}
        </span>

        <span className="flex-1 text-xs font-medium text-gray-700 truncate" title={col.label}>{col.label}</span>

        {col.required && <span className="text-[10px] text-blue-500 shrink-0">req</span>}

        <ChevronDown className={cn("w-3 h-3 text-gray-400 transition-transform shrink-0", expanded && "rotate-180")} />

        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onRemoveColumn(); }}
          title="Remove column"
          className="text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors shrink-0 p-0.5 rounded"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Expanded settings */}
      {expanded && (
        <div className="px-3 py-3 space-y-2.5 bg-white border-t border-gray-100">
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-[10px] text-gray-500 uppercase tracking-wide">Label</Label>
              <Input
                value={col.label}
                onChange={e => {
                  const lbl = e.target.value;
                  onUpdateColumn({
                    label: lbl,
                    name: lbl.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "") || col.name,
                  });
                }}
                className="h-7 text-xs"
                placeholder="Column label"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] text-gray-500 uppercase tracking-wide">Type</Label>
              <Select value={col.type} onValueChange={v => onUpdateColumn({ type: v })}>
                <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SUBFORM_COL_TYPES.map(t => (
                    <SelectItem key={t.value} value={t.value} className="text-xs">
                      <span className="font-mono text-[10px] mr-1">{t.icon}</span>{t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-[10px] text-gray-500 uppercase tracking-wide">Field Key</Label>
            <Input
              value={col.name}
              onChange={e => onUpdateColumn({ name: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "") })}
              className="h-7 text-xs font-mono"
              placeholder="column_key"
            />
          </div>

          <div className="flex items-center justify-between">
            <Label className="text-xs">Required</Label>
            <Switch
              checked={col.required}
              onCheckedChange={v => onUpdateColumn({ required: v })}
            />
          </div>

          {AGGREGATABLE_SUBFORM_COL_TYPES.includes(col.type) && (
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-xs">Show column total</Label>
                <p className="text-[10px] text-gray-400">Sums this column across all rows in the subform footer</p>
              </div>
              <Switch
                checked={!!col.aggregate}
                onCheckedChange={v => onUpdateColumn({ aggregate: v })}
              />
            </div>
          )}

          {col.type === "FORMULA" && (
            <div className="space-y-1.5">
              <Label className="text-[10px] text-gray-500 uppercase tracking-wide">Formula</Label>
              <FormulaEditor
                value={col.formula || ""}
                onChange={(v) => onUpdateColumn({ formula: v })}
                fields={columns
                  .filter((c) => c.id !== col.id && FORMULA_COMPATIBLE_TYPES.includes(c.type))
                  .map((c) => ({ name: c.name, label: c.label, type: c.type }))}
              />
            </div>
          )}

          {col.type === "DROPDOWN" && (
            <div className="space-y-1">
              <Label className="text-[10px] text-gray-500 uppercase tracking-wide">Options (one per line)</Label>
              <textarea
                value={(col.options || []).map(o => o.label).join("\n")}
                onChange={e => {
                  const lines = e.target.value.split("\n");
                  onUpdateColumn({
                    options: lines
                      .map((l, i) => ({ label: l.trim(), value: l.trim().toLowerCase().replace(/\s+/g, "_") || `opt_${i}` }))
                      .filter(o => o.label),
                  });
                }}
                placeholder={"Option A\nOption B\nOption C"}
                rows={3}
                className="w-full text-xs border border-gray-200 rounded p-2 resize-none focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          )}

          {col.type === "LOOKUP" && (
            <div className="space-y-2">
              <div className="space-y-1">
                <Label className="text-[10px] text-gray-500 uppercase tracking-wide">Lookup Module</Label>
                <Select
                  value={col.lookupModuleId || ""}
                  onValueChange={v => onUpdateColumn({ lookupModuleId: v, lookupDisplayField: "" })}
                >
                  <SelectTrigger className="h-7 text-xs"><SelectValue placeholder="Select module..." /></SelectTrigger>
                  <SelectContent>
                    {modules.map(m => (
                      <SelectItem key={m.id} value={m.id} className="text-xs"><ModuleIcon icon={m.icon} slug={m.slug} className="w-3.5 h-3.5 inline-block mr-1 -mt-0.5" /> {m.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {col.lookupModuleId && (
                <div className="space-y-1">
                  <Label className="text-[10px] text-gray-500 uppercase tracking-wide">Display Field</Label>
                  <Input
                    value={col.lookupDisplayField || ""}
                    onChange={e => onUpdateColumn({ lookupDisplayField: e.target.value })}
                    placeholder="e.g. name"
                    className="h-7 text-xs"
                  />
                </div>
              )}
            </div>
          )}

          <button
            type="button"
            onClick={onRemoveColumn}
            className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg border border-red-100 text-xs font-medium text-red-500 hover:bg-red-50 transition-colors"
          >
            <X className="w-3 h-3" /> Remove Column
          </button>
        </div>
      )}
    </div>
  );
}

function SubformConfig({
  field,
  modules,
  onUpdate,
}: {
  field: Field;
  modules: any[];
  onUpdate: (c: Partial<Field>) => void;
}) {
  const settings = parseFieldSettings((field as any).settings);
  const columns: SubformColumn[] = settings.columns || [];
  const [expandedCol, setExpandedCol] = useState<string | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const saveColumns = (cols: SubformColumn[]) => {
    onUpdate({ settings: { ...settings, columns: cols } } as any);
  };

  const addColumn = () => {
    const idx = columns.length;
    const col: SubformColumn = {
      id: `col-${Date.now()}`,
      name: `column_${idx + 1}`,
      label: `Column ${idx + 1}`,
      type: "TEXT",
      required: false,
    };
    saveColumns([...columns, col]);
    setExpandedCol(col.id);
  };

  const updateColumn = (id: string, changes: Partial<SubformColumn>) => {
    saveColumns(columns.map(c => c.id === id ? { ...c, ...changes } : c));
  };

  const removeColumn = (id: string) => {
    saveColumns(columns.filter(c => c.id !== id));
    if (expandedCol === id) setExpandedCol(null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = columns.findIndex(c => c.id === active.id);
    const newIndex = columns.findIndex(c => c.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    saveColumns(arrayMove(columns, oldIndex, newIndex));
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Subform Columns</p>
        <span className="text-xs text-gray-400">{columns.length} col{columns.length !== 1 ? "s" : ""}</span>
      </div>

      {columns.length === 0 ? (
        <div className="text-center py-5 border-2 border-dashed border-gray-200 rounded-lg">
          <p className="text-xs font-medium text-gray-400">No columns yet</p>
          <p className="text-[10px] text-gray-300 mt-0.5">Add columns to define the row structure</p>
        </div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={columns.map(c => c.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-1.5">
              {columns.map((col) => (
                <SortableSubformColumn
                  key={col.id}
                  col={col}
                  columns={columns}
                  modules={modules}
                  expanded={expandedCol === col.id}
                  onToggle={() => setExpandedCol(expandedCol === col.id ? null : col.id)}
                  onUpdateColumn={(changes) => updateColumn(col.id, changes)}
                  onRemoveColumn={() => removeColumn(col.id)}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      <Button variant="outline" size="sm" onClick={addColumn} className="w-full gap-1.5 text-xs">
        <Plus className="w-3 h-3" /> Add Column
      </Button>

      {columns.length > 0 && (
        <div className="p-2.5 bg-blue-50 border border-blue-100 rounded-lg space-y-1">
          <p className="text-[10px] font-semibold text-blue-700">Preview</p>
          <div className="flex gap-1 flex-wrap">
            {columns.map(col => (
              <span key={col.id} className="text-[10px] bg-white border border-blue-200 rounded px-2 py-0.5 text-blue-700 font-medium">
                {col.label}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Layout Rules / Conditional Display ────────────────────────────────────────

type RuleAction = "show" | "hide" | "require" | "unrequire" | "readonly";
type RuleOperator = "equals" | "not_equals" | "is_empty" | "not_empty";

interface LayoutRule {
  id: string;
  whenField: string;
  operator: RuleOperator;
  whenValue: string;
  action: RuleAction;
}

const ACTION_LABELS: Record<RuleAction, string> = {
  show: "Show this field",
  hide: "Hide this field",
  require: "Make required",
  unrequire: "Make optional",
  readonly: "Make read-only",
};

const OP_LABELS: Record<RuleOperator, string> = {
  equals: "equals",
  not_equals: "does not equal",
  is_empty: "is empty",
  not_empty: "is not empty",
};

function LayoutRulesEditor({ field, fields, onUpdate }: {
  field: Field;
  fields: Field[];
  onUpdate: (changes: Partial<Field>) => void;
}) {
  const [collapsed, setCollapsed] = useState(true);
  const settings = (field as any).settings || {};
  const rules: LayoutRule[] = settings.conditions || [];

  const otherFields = fields.filter(f => f.id !== field.id);
  // The field being edited is the sensible starting point for its own rules — list it
  // first and pre-select it, rather than defaulting to an unrelated field.
  const conditionFieldOptions = [field, ...otherFields];

  const addRule = () => {
    const newRule: LayoutRule = {
      id: `rule-${Date.now()}`,
      whenField: field.name,
      operator: "equals",
      whenValue: "",
      action: "show",
    };
    onUpdate({ settings: { ...settings, conditions: [...rules, newRule] } } as any);
  };

  const updateRule = (index: number, changes: Partial<LayoutRule>) => {
    const updated = rules.map((r, i) => i === index ? { ...r, ...changes } : r);
    onUpdate({ settings: { ...settings, conditions: updated } } as any);
  };

  const removeRule = (index: number) => {
    onUpdate({ settings: { ...settings, conditions: rules.filter((_, i) => i !== index) } } as any);
  };

  const needsValue = (op: RuleOperator) => op === "equals" || op === "not_equals";

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={() => setCollapsed(v => !v)}
        className="flex items-center justify-between w-full text-xs font-semibold text-gray-500 uppercase tracking-wide"
      >
        <span className="flex items-center gap-1.5">
          Visibility Rules
          {rules.length > 0 && (
            <span className="bg-blue-100 text-blue-700 rounded-full px-1.5 py-0.5 text-[10px] normal-case font-medium">
              {rules.length}
            </span>
          )}
        </span>
        <ChevronRight className={cn("w-3 h-3 transition-transform", !collapsed && "rotate-90")} />
      </button>

      {!collapsed && (
        <div className="space-y-2">
          <p className="text-xs text-gray-400">
            Define when this field is shown, hidden, or required based on other field values.
          </p>

          {rules.map((rule, i) => (
            <div key={rule.id} className="p-2.5 bg-gray-50 rounded-lg border border-gray-200 space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-semibold text-gray-400 uppercase">Rule {i + 1}</p>
                <button type="button" onClick={() => removeRule(i)} className="text-gray-300 hover:text-red-500">
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>

              {/* WHEN field */}
              <div className="space-y-1">
                <p className="text-[10px] text-gray-500">When field</p>
                <Select value={rule.whenField} onValueChange={(v) => updateRule(i, { whenField: v })}>
                  <SelectTrigger className="h-7 text-xs">
                    <SelectValue placeholder="Select field…" />
                  </SelectTrigger>
                  <SelectContent>
                    {conditionFieldOptions.map(f => (
                      <SelectItem key={f.id} value={f.name} className="text-xs">
                        {f.id === field.id ? `${f.label} (this field)` : f.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Operator */}
              <Select value={rule.operator} onValueChange={(v) => updateRule(i, { operator: v as RuleOperator })}>
                <SelectTrigger className="h-7 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(OP_LABELS) as RuleOperator[]).map(op => (
                    <SelectItem key={op} value={op} className="text-xs">{OP_LABELS[op]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Value (only for equals/not_equals) */}
              {needsValue(rule.operator) && (
                <Input
                  value={rule.whenValue}
                  onChange={e => updateRule(i, { whenValue: e.target.value })}
                  placeholder="Value…"
                  className="h-7 text-xs"
                />
              )}

              {/* Action */}
              <div className="space-y-1">
                <p className="text-[10px] text-gray-500">Then</p>
                <Select value={rule.action} onValueChange={(v) => updateRule(i, { action: v as RuleAction })}>
                  <SelectTrigger className="h-7 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(ACTION_LABELS) as RuleAction[]).map(a => (
                      <SelectItem key={a} value={a} className="text-xs">{ACTION_LABELS[a]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          ))}

          <Button variant="outline" size="sm" onClick={addRule} className="w-full gap-1.5 text-xs">
            <Plus className="w-3 h-3" /> Add Rule
          </Button>
        </div>
      )}
    </div>
  );
}

// ── Blueprint / Stage Flow Editor ─────────────────────────────────────────────

const STAGE_COLORS = [
  "#6366f1", "#8b5cf6", "#ec4899", "#ef4444",
  "#f97316", "#eab308", "#22c55e", "#14b8a6",
  "#3b82f6", "#64748b",
];

interface Stage {
  id: string;
  name: string;
  color: string;
  order: number;
  transitions: string[];
  requiredFields: string[];
}

function BlueprintEditor({ moduleId, activeModule, fields }: {
  moduleId: string;
  activeModule: any;
  fields: Field[];
}) {
  const modSettings = activeModule?.settings || {};
  const [stages, setStages] = useState<Stage[]>(modSettings.stages || []);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [expandedStage, setExpandedStage] = useState<string | null>(null);

  const saveStages = async (newStages: Stage[]) => {
    setStages(newStages);
    setSaving(true);
    try {
      await api.patch(`/modules/${moduleId}`, {
        settings: { ...modSettings, stages: newStages },
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {}
    finally { setSaving(false); }
  };

  const addStage = () => {
    const stage: Stage = {
      id: `stage-${Date.now()}`,
      name: `Stage ${stages.length + 1}`,
      color: STAGE_COLORS[stages.length % STAGE_COLORS.length],
      order: stages.length,
      transitions: [],
      requiredFields: [],
    };
    saveStages([...stages, stage]);
    setExpandedStage(stage.id);
  };

  const updateStage = (id: string, changes: Partial<Stage>) => {
    const updated = stages.map(s => s.id === id ? { ...s, ...changes } : s);
    saveStages(updated);
  };

  const removeStage = (id: string) => {
    saveStages(stages.filter(s => s.id !== id));
  };

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIdx = stages.findIndex(s => s.id === active.id);
    const newIdx = stages.findIndex(s => s.id === over.id);
    if (oldIdx === -1 || newIdx === -1) return;
    const reordered = arrayMove(stages, oldIdx, newIdx).map((s, i) => ({ ...s, order: i }));
    saveStages(reordered);
  };

  return (
    <ScrollArea className="flex-1">
      <div className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-1.5">
              <Workflow className="w-4 h-4 text-blue-600" />
              Process Flow
            </h3>
            <p className="text-xs text-gray-400 mt-0.5">Define stages and transitions for records in this module.</p>
          </div>
          {saving && <span className="text-xs text-gray-400">Saving…</span>}
          {saved && !saving && <span className="text-xs text-green-600">Saved</span>}
        </div>

        {/* Visual flow preview */}
        {stages.length > 0 && (
          <div className="flex items-center gap-1 flex-wrap">
            {stages.map((stage, i) => (
              <div key={stage.id} className="flex items-center gap-1">
                <div
                  className="px-2.5 py-1 rounded-full text-white text-xs font-medium whitespace-nowrap"
                  style={{ backgroundColor: stage.color }}
                >
                  {stage.name}
                </div>
                {i < stages.length - 1 && <ArrowRight className="w-3 h-3 text-gray-300 shrink-0" />}
              </div>
            ))}
          </div>
        )}

        {stages.length === 0 && (
          <div className="text-center py-8 text-gray-400">
            <Workflow className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p className="text-xs">No stages defined. Add stages to create a process flow for this module.</p>
          </div>
        )}

        {/* Stage list */}
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={stages.map(s => s.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-2">
              {stages.map((stage) => (
                <SortableStageCard
                  key={stage.id}
                  stage={stage}
                  stages={stages}
                  fields={fields}
                  expanded={expandedStage === stage.id}
                  onToggle={() => setExpandedStage(v => v === stage.id ? null : stage.id)}
                  onChange={(changes) => updateStage(stage.id, changes)}
                  onRemove={() => removeStage(stage.id)}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>

        <Button variant="outline" size="sm" onClick={addStage} className="w-full gap-1.5 text-xs">
          <Plus className="w-3 h-3" /> Add Stage
        </Button>

        {stages.length > 0 && (
          <div className="p-3 bg-blue-50 border border-blue-100 rounded-lg">
            <p className="text-xs font-medium text-blue-700 mb-1">How it works</p>
            <p className="text-xs text-blue-600">
              Records move through stages in this module. Each stage can require specific fields to be filled before moving forward.
              Use transitions to control which stage a record can move to.
            </p>
          </div>
        )}
      </div>
    </ScrollArea>
  );
}

function SortableStageCard({ stage, stages, fields, expanded, onToggle, onChange, onRemove }: {
  stage: Stage;
  stages: Stage[];
  fields: Field[];
  expanded: boolean;
  onToggle: () => void;
  onChange: (changes: Partial<Stage>) => void;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: stage.id });
  const [showColorPicker, setShowColorPicker] = useState(false);

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }}
      className="border border-gray-200 rounded-lg bg-white overflow-hidden"
    >
      {/* Stage header */}
      <div className="flex items-center gap-2 px-3 py-2.5">
        <button
          {...attributes}
          {...listeners}
          className="text-gray-300 hover:text-gray-500 cursor-grab active:cursor-grabbing shrink-0"
          tabIndex={-1}
        >
          <GripVertical className="w-3.5 h-3.5" />
        </button>

        {/* Color dot */}
        <div className="relative shrink-0">
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setShowColorPicker(v => !v); }}
            className="w-4 h-4 rounded-full border-2 border-white ring-1 ring-gray-200 hover:ring-blue-400 transition-all shrink-0"
            style={{ backgroundColor: stage.color }}
          />
          {showColorPicker && (
            <div className="absolute left-0 top-6 z-50 bg-white rounded-lg border border-gray-200 shadow-lg p-2 grid grid-cols-5 gap-1">
              {STAGE_COLORS.map(c => (
                <button
                  key={c}
                  type="button"
                  className="w-4 h-4 rounded-full hover:scale-125 transition-transform"
                  style={{ backgroundColor: c }}
                  onClick={() => { onChange({ color: c }); setShowColorPicker(false); }}
                />
              ))}
            </div>
          )}
        </div>

        <input
          value={stage.name}
          onChange={e => onChange({ name: e.target.value })}
          className="flex-1 text-sm font-medium text-gray-900 bg-transparent outline-none border-none focus:outline-none min-w-0"
          onClick={e => e.stopPropagation()}
        />

        <button type="button" onClick={onToggle} className="text-gray-400 hover:text-gray-600 shrink-0">
          <ChevronDown className={cn("w-3.5 h-3.5 transition-transform", expanded && "rotate-180")} />
        </button>
        <button type="button" onClick={onRemove} className="text-gray-300 hover:text-red-500 shrink-0">
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div className="border-t border-gray-100 px-3 py-3 space-y-3 bg-gray-50/50">
          {/* Allowed transitions */}
          <div className="space-y-1.5">
            <p className="text-[10px] font-semibold text-gray-500 uppercase">Can transition to</p>
            <div className="flex flex-wrap gap-1.5">
              {stages.filter(s => s.id !== stage.id).map(s => {
                const active = stage.transitions.includes(s.id);
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => {
                      const next = active
                        ? stage.transitions.filter(t => t !== s.id)
                        : [...stage.transitions, s.id];
                      onChange({ transitions: next });
                    }}
                    className={cn(
                      "px-2 py-0.5 rounded-full text-xs border transition-all",
                      active
                        ? "text-white border-transparent"
                        : "text-gray-500 border-gray-200 hover:border-gray-400"
                    )}
                    style={active ? { backgroundColor: s.color, borderColor: s.color } : {}}
                  >
                    {s.name}
                  </button>
                );
              })}
              {stages.filter(s => s.id !== stage.id).length === 0 && (
                <p className="text-xs text-gray-400 italic">Add more stages to define transitions.</p>
              )}
            </div>
          </div>

          {/* Required fields to ENTER this stage */}
          <div className="space-y-1.5">
            <p className="text-[10px] font-semibold text-gray-500 uppercase">Required fields to enter</p>
            <div className="flex flex-wrap gap-1.5">
              {fields.filter(f => !["AUTO_NUMBER", "FORMULA"].includes(f.type)).map(f => {
                const active = stage.requiredFields.includes(f.name);
                return (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => {
                      const next = active
                        ? stage.requiredFields.filter(n => n !== f.name)
                        : [...stage.requiredFields, f.name];
                      onChange({ requiredFields: next });
                    }}
                    className={cn(
                      "px-2 py-0.5 rounded-full text-xs border transition-all",
                      active
                        ? "bg-blue-600 text-white border-blue-600"
                        : "text-gray-500 border-gray-200 hover:border-gray-400"
                    )}
                  >
                    {f.label}
                  </button>
                );
              })}
              {fields.length === 0 && (
                <p className="text-xs text-gray-400 italic">No fields defined yet.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
