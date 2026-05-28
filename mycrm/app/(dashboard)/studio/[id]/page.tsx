"use client";
import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft, Plus, GripVertical, X, Settings, Eye, Save, Loader2,
  ChevronDown, ChevronUp, Search, Workflow, AlertCircle, Trash2,
  ChevronRight, ArrowRight,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useModulesStore, Field } from "@/store/modules.store";
import { api } from "@/lib/api";
import Link from "next/link";
import { cn } from "@/lib/utils";

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
      className={cn(
        "w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md hover:bg-blue-50 hover:text-blue-700",
        "text-left transition-colors group cursor-pointer select-none",
        isDragging ? "opacity-40" : ""
      )}
    >
      <span className="w-6 h-6 bg-gray-100 group-hover:bg-blue-100 rounded text-xs flex items-center justify-center font-mono text-gray-600 group-hover:text-blue-700 shrink-0">
        {ft.icon}
      </span>
      <div className="min-w-0">
        <p className="text-xs font-medium text-gray-700 group-hover:text-blue-700 truncate">{ft.label}</p>
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
        <p className="text-sm font-medium text-gray-900 truncate">{field.label}</p>
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

export default function StudioEditorPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { fetchModule, activeModule, updateModule } = useModulesStore();
  const [fields, setFields] = useState<Field[]>([]);
  const [selectedField, setSelectedField] = useState<Field | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [draggingPalette, setDraggingPalette] = useState<string | null>(null);
  const [canvasIsOver, setCanvasIsOver] = useState(false);
  const [filterText, setFilterText] = useState("");
  const [modules, setModules] = useState<any[]>([]);
  const [globalLists, setGlobalLists] = useState<any[]>([]);
  const [rightTab, setRightTab] = useState<"properties" | "blueprint">("properties");
  const dragActiveRef = useRef(false);

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
  }, [activeModule]);

  const addField = async (type: string) => {
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
      setFields(prev => [...prev, data]);
      setSelectedField(data);
    } catch {}
  };

  const updateSelectedField = async (changes: Partial<Field>) => {
    if (!selectedField) return;
    const updated = { ...selectedField, ...changes };
    setSelectedField(updated);
    setFields(prev => prev.map(f => f.id === selectedField.id ? updated : f));
    try {
      await api.patch(`/modules/${id}/fields/${selectedField.id}`, changes);
    } catch {}
  };

  const deleteField = async (fieldId: string) => {
    if (!confirm("Remove this field?")) return;
    try {
      await api.delete(`/modules/${id}/fields/${fieldId}`);
      setFields(prev => prev.filter(f => f.id !== fieldId));
      if (selectedField?.id === fieldId) setSelectedField(null);
    } catch {}
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
    setDraggingPalette(null);
    setCanvasIsOver(false);

    // Palette item dropped onto canvas
    if (active.data.current?.isPalette) {
      if (over) {
        await addField(active.data.current.fieldType);
      }
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

  const saveModule = async () => {
    if (!activeModule) return;
    setSaving(true);
    try {
      await updateModule(id, {
        name: activeModule.name,
        description: activeModule.description,
        icon: activeModule.icon,
      });
    } finally {
      setSaving(false);
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

  // Combine palette IDs and canvas IDs for DnD context
  const paletteIds = FIELD_TYPES.map(ft => `palette-${ft.type}`);
  const canvasIds = fields.map(f => f.id);

  return (
    <div className="flex flex-col h-full -m-6">
      {/* Studio Header */}
      <div className="flex items-center justify-between px-6 py-3 bg-white border-b border-gray-200 shrink-0">
        <div className="flex items-center gap-3">
          <Link href="/studio">
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div className="flex items-center gap-2">
            <span className="text-xl">{activeModule?.icon || "📦"}</span>
            <div>
              <h1 className="font-semibold text-gray-900">{activeModule?.name}</h1>
              <p className="text-xs text-gray-400">{fields.length} fields</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/m/${activeModule?.slug}`}>
            <Button variant="outline" size="sm" className="gap-2">
              <Eye className="w-4 h-4" />
              View Records
            </Button>
          </Link>
          <Button size="sm" onClick={saveModule} disabled={saving} className="gap-2">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save
          </Button>
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
            <div className="px-3 py-2 border-b border-gray-100 space-y-2">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Field Types</p>
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400" />
                <input
                  value={filterText}
                  onChange={e => setFilterText(e.target.value)}
                  placeholder="Search fields..."
                  className="w-full pl-6 pr-2 py-1 text-xs border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-400"
                />
              </div>
            </div>
            <ScrollArea className="flex-1">
              <SortableContext items={paletteIds} strategy={verticalListSortingStrategy}>
                <div className="p-2 space-y-3">
                  {groupedTypes.map(({ group, items }) => (
                    <div key={group}>
                      <p className="px-2 py-1 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">{group}</p>
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
          <div className="flex-1 bg-gray-50 overflow-y-auto p-6" id="canvas-area">
            <div className="max-w-lg mx-auto">
              <div className="mb-4 text-center">
                <h2 className="text-sm font-medium text-gray-500">
                  {fields.length === 0
                    ? "← Click or drag a field type to add it"
                    : "Drag fields to reorder • Click to edit"}
                </h2>
              </div>

              {fields.length === 0 ? (
                <SortableContext items={["canvas-drop-zone"]} strategy={verticalListSortingStrategy}>
                  <div
                    id="canvas-drop-zone"
                    className={cn(
                      "border-2 border-dashed rounded-xl p-12 text-center transition-all",
                      canvasIsOver ? "border-blue-400 bg-blue-50" : "border-gray-300"
                    )}
                  >
                    <div className="text-4xl mb-3">📋</div>
                    <p className="text-sm text-gray-500">
                      {canvasIsOver ? "Drop to add field" : "No fields yet. Click or drag from the left panel."}
                    </p>
                  </div>
                </SortableContext>
              ) : (
                <SortableContext items={canvasIds} strategy={verticalListSortingStrategy}>
                  <div className="space-y-2">
                    {fields.map((field) => (
                      <SortableFieldItem
                        key={field.id}
                        field={field}
                        isSelected={selectedField?.id === field.id}
                        onSelect={() => setSelectedField(field)}
                        onDelete={() => deleteField(field.id)}
                      />
                    ))}
                  </div>
                </SortableContext>
              )}

              <CanvasDropZone isOver={canvasIsOver && fields.length > 0} />

              <button
                onClick={() => addField("TEXT")}
                className="w-full mt-3 p-3 border-2 border-dashed border-gray-200 rounded-lg text-sm text-gray-400 hover:border-blue-300 hover:text-blue-600 hover:bg-blue-50/50 transition-all flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Add Text Field
              </button>
            </div>
          </div>

          {/* Right: Properties Panel */}
          <div className="w-80 bg-white border-l border-gray-200 flex flex-col shrink-0">
            {/* Tab header */}
            <div className="flex border-b border-gray-100 shrink-0">
              {(["properties", "blueprint"] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setRightTab(tab)}
                  className={cn(
                    "flex-1 py-2.5 text-xs font-medium transition-colors capitalize",
                    rightTab === tab
                      ? "text-blue-700 border-b-2 border-blue-600 bg-blue-50/50"
                      : "text-gray-500 hover:text-gray-700"
                  )}
                >
                  {tab === "blueprint" ? "Blueprint" : "Properties"}
                </button>
              ))}
            </div>

            {rightTab === "blueprint" ? (
              <BlueprintEditor moduleId={id} activeModule={activeModule} fields={fields} />
            ) : selectedField ? (
              <>
                <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between shrink-0">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Field Properties</p>
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
                        onChange={(e) => updateSelectedField({ label: e.target.value })}
                        placeholder="Enter field label"
                      />
                    </div>

                    {/* Name */}
                    <div className="space-y-1.5">
                      <Label className="text-xs">Field Key</Label>
                      <Input
                        value={selectedField.name}
                        onChange={(e) => updateSelectedField({ name: e.target.value })}
                        placeholder="field_key"
                        className="font-mono text-xs"
                      />
                      <p className="text-xs text-gray-400">Used in API and formulas</p>
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

                    {/* Placeholder */}
                    <div className="space-y-1.5">
                      <Label className="text-xs">Placeholder</Label>
                      <Input
                        value={selectedField.placeholder || ""}
                        onChange={(e) => updateSelectedField({ placeholder: e.target.value })}
                        placeholder="Enter placeholder text"
                      />
                    </div>

                    {/* Help Text */}
                    <div className="space-y-1.5">
                      <Label className="text-xs">Help Text</Label>
                      <Input
                        value={selectedField.helpText || ""}
                        onChange={(e) => updateSelectedField({ helpText: e.target.value })}
                        placeholder="Guide users on what to enter"
                      />
                    </div>

                    <Separator />

                    {/* Toggles */}
                    <div className="space-y-3">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Field Settings</p>
                      {[
                        { key: "isRequired", label: "Required", description: "Must be filled to save" },
                        { key: "isUnique",   label: "Unique",   description: "No duplicates allowed" },
                        { key: "isReadonly", label: "Read Only", description: "Cannot be edited" },
                        { key: "isHidden",   label: "Hidden",   description: "Not visible by default" },
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

                    {/* AUTO_NUMBER config */}
                    {selectedField.type === "AUTO_NUMBER" && (
                      <>
                        <Separator />
                        <AutoNumberConfig field={selectedField} onUpdate={updateSelectedField} />
                      </>
                    )}

                    {/* FORMULA config */}
                    {selectedField.type === "FORMULA" && (
                      <>
                        <Separator />
                        <FormulaConfig field={selectedField} fields={fields} onUpdate={updateSelectedField} />
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

                    {/* GLOBAL_RELATION config */}
                    {selectedField.type === "GLOBAL_RELATION" && (
                      <>
                        <Separator />
                        <GlobalRelationConfig
                          field={selectedField}
                          globalLists={globalLists}
                          onUpdate={updateSelectedField}
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

                    {/* Options for Dropdown/Multi-select/Status/Radio */}
                    {TYPES_WITH_OPTIONS.includes(selectedField.type) && (
                      <>
                        <Separator />
                        <FieldOptionsEditor field={selectedField} onUpdate={updateSelectedField} globalLists={globalLists} />
                      </>
                    )}

                    {/* Layout Rules / Conditional Display */}
                    <Separator />
                    <LayoutRulesEditor field={selectedField} fields={fields} onUpdate={updateSelectedField} />
                  </div>
                </ScrollArea>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center p-6">
                <Settings className="w-10 h-10 text-gray-300 mb-3" />
                <p className="text-sm font-medium text-gray-500">Select a field</p>
                <p className="text-xs text-gray-400 mt-1">Click on a field in the canvas to edit its properties</p>
              </div>
            )}
          </div>
        </div>

        {/* Drag overlay for palette dragging */}
        <DragOverlay>
          {draggingPalette ? (
            <div className="px-3 py-2 bg-white rounded-lg border border-blue-400 shadow-lg text-sm font-medium text-blue-700 flex items-center gap-2">
              <span className="font-mono text-xs">
                {FIELD_TYPES.find(ft => ft.type === draggingPalette)?.icon}
              </span>
              {FIELD_TYPES.find(ft => ft.type === draggingPalette)?.label}
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}

// ── AUTO NUMBER Config ────────────────────────────────────────────────────────

function AutoNumberConfig({ field, onUpdate }: { field: Field; onUpdate: (c: Partial<Field>) => void }) {
  const settings = (field as any).settings || {};

  const set = (key: string, value: any) => {
    onUpdate({ settings: { ...settings, [key]: value } } as any);
  };

  const preview = [
    settings.prefix,
    String(settings.startingNumber ?? 1).padStart(settings.paddingLength ?? 5, "0"),
    settings.suffix,
  ].filter(Boolean).join("-");

  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Auto Number Config</p>

      <div className="p-2 bg-gray-50 rounded-md text-center font-mono text-sm font-medium text-blue-700">
        {preview || "00001"}
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
      <p className="text-xs text-gray-400">Generated automatically. Users cannot edit this field.</p>
    </div>
  );
}

// ── Formula Editor ────────────────────────────────────────────────────────────

const FORMULA_COMPATIBLE_TYPES = ["NUMBER", "DECIMAL", "CURRENCY", "RATING", "PROGRESS", "FORMULA"];

function FormulaEditor({
  value,
  onChange,
  fields,
}: {
  value: string;
  onChange: (v: string) => void;
  fields: { name: string; label: string; type: string }[];
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIdx, setActiveIdx] = useState(0);

  const compatibleFields = fields.filter((f) => FORMULA_COMPATIBLE_TYPES.includes(f.type));

  const filteredFields = query
    ? compatibleFields.filter(
        (f) =>
          f.name.toLowerCase().includes(query.toLowerCase()) ||
          f.label.toLowerCase().includes(query.toLowerCase())
      )
    : compatibleFields;

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    onChange(text);
    const cursor = e.target.selectionStart;
    const before = text.slice(0, cursor);
    const match = before.match(/\$([A-Za-z0-9_]*)$/);
    if (match) {
      setQuery(match[1]);
      setShowDropdown(true);
      setActiveIdx(0);
    } else {
      setShowDropdown(false);
      setQuery("");
    }
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
    setShowDropdown(false);
    setQuery("");
    setTimeout(() => {
      ta.focus();
      const newPos = startPos + field.name.length + 1;
      ta.setSelectionRange(newPos, newPos);
    }, 0);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (!showDropdown || filteredFields.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((i) => (i + 1) % filteredFields.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((i) => (i - 1 + filteredFields.length) % filteredFields.length);
    } else if (e.key === "Enter" || e.key === "Tab") {
      if (filteredFields[activeIdx]) {
        e.preventDefault();
        insertField(filteredFields[activeIdx]);
      }
    } else if (e.key === "Escape") {
      setShowDropdown(false);
    }
  };

  const usedRefs = [...value.matchAll(/\$([A-Za-z_][A-Za-z0-9_]*)/g)].map((m) => m[1]);
  const unknownRefs = usedRefs.filter((name) => !compatibleFields.find((f) => f.name === name));

  const previewHtml = value
    ? value
        .replace(/\$([A-Za-z_][A-Za-z0-9_]*)/g, (m, name) => {
          const exists = compatibleFields.find((f) => f.name === name);
          return exists
            ? `<span style="color:#2563eb;font-weight:600">${m}</span>`
            : `<span style="color:#dc2626;text-decoration:underline">${m}</span>`;
        })
        .replace(/([+\-*/()])/g, `<span style="color:#7c3aed">$1</span>`)
        .replace(/\b(\d+(?:\.\d+)?)\b/g, `<span style="color:#16a34a">$1</span>`)
    : "";

  return (
    <div className="space-y-2">
      <div className="relative">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
          className="w-full font-mono text-sm border border-gray-200 rounded-md px-3 py-2.5 min-h-[72px] resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-800 leading-relaxed"
          placeholder="e.g. $price * $quantity"
          spellCheck={false}
        />

        {showDropdown && filteredFields.length > 0 && (
          <div className="absolute left-0 top-full z-50 mt-1 w-72 bg-white border border-gray-200 rounded-lg shadow-xl overflow-hidden">
            <div className="px-2.5 py-1.5 text-[10px] font-semibold text-gray-400 uppercase border-b border-gray-100 bg-gray-50 flex items-center justify-between">
              <span>Fields</span>
              {query && <span className="text-gray-300 normal-case font-normal">matching "{query}"</span>}
            </div>
            <div className="max-h-48 overflow-y-auto">
              {filteredFields.map((field, i) => (
                <button
                  key={field.name}
                  onMouseDown={(e) => { e.preventDefault(); insertField(field); }}
                  className={cn(
                    "w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors border-b border-gray-50 last:border-0",
                    i === activeIdx ? "bg-blue-50" : "hover:bg-gray-50"
                  )}
                >
                  <span className="text-xs font-mono text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded shrink-0">
                    ${field.name}
                  </span>
                  <span className="text-xs text-gray-700 truncate flex-1">{field.label}</span>
                  <span className="text-[10px] text-gray-300 shrink-0 uppercase font-mono">{field.type.toLowerCase()}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {showDropdown && query && filteredFields.length === 0 && (
          <div className="absolute left-0 top-full z-50 mt-1 w-72 bg-white border border-gray-200 rounded-lg shadow-xl overflow-hidden">
            <div className="px-3 py-3 text-xs text-gray-400 text-center">
              No numeric fields match "{query}"
            </div>
          </div>
        )}
      </div>

      {value && (
        <div
          className="px-3 py-2 bg-gray-50 border border-gray-200 rounded text-xs font-mono leading-relaxed break-all"
          dangerouslySetInnerHTML={{ __html: previewHtml }}
        />
      )}

      {unknownRefs.length > 0 && (
        <div className="flex items-start gap-1.5 px-2.5 py-2 bg-red-50 border border-red-200 rounded-md text-xs text-red-700">
          <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          <span>
            Unknown field{unknownRefs.length > 1 ? "s" : ""}:{" "}
            {unknownRefs.map((r) => `$${r}`).join(", ")}
          </span>
        </div>
      )}

      <p className="text-[11px] text-gray-400 leading-relaxed">
        Type{" "}
        <kbd className="px-1 py-0.5 bg-gray-100 border border-gray-200 rounded text-[10px] font-mono text-gray-600">$</kbd>{" "}
        to insert a field. Supports{" "}
        <code className="text-gray-600 text-[11px]">+ − * / ( )</code> and number literals.
        Only numeric fields appear.
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

  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Formula</p>
      <FormulaEditor
        value={localFormula}
        onChange={handleFormulaChange}
        fields={compatibleFields}
      />
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
                {m.icon} {m.name}
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

// ── GLOBAL RELATION Config ────────────────────────────────────────────────────

function GlobalRelationConfig({
  field,
  globalLists,
  onUpdate,
}: {
  field: Field;
  globalLists: any[];
  onUpdate: (c: Partial<Field>) => void;
}) {
  const settings = (field as any).settings || {};
  const [levels, setLevels] = useState<string[]>(settings.levels || []);
  const [newLevel, setNewLevel] = useState("");

  const set = (key: string, value: any) => {
    onUpdate({ settings: { ...settings, [key]: value } } as any);
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

function SortableOption({ opt, index, onUpdateLabel, onUpdateColor, onRemove }: {
  opt: any; index: number;
  onUpdateLabel: (label: string) => void;
  onUpdateColor: (color: string) => void;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: opt.id || `opt-${index}` });
  const [showColors, setShowColors] = useState(false);

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
        value={opt.label}
        onChange={(e) => onUpdateLabel(e.target.value)}
        className="h-7 text-xs flex-1"
      />
      <button
        type="button"
        onClick={onRemove}
        className="text-gray-300 hover:text-red-500 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

function FieldOptionsEditor({ field, onUpdate, globalLists }: {
  field: Field;
  onUpdate: (changes: Partial<Field>) => void;
  globalLists: any[];
}) {
  const [bulkInput, setBulkInput] = useState("");
  const [mode, setMode] = useState<"manual" | "bulk" | "import">("manual");
  const [replaceExisting, setReplaceExisting] = useState(true);
  const [searchText, setSearchText] = useState("");
  const [importListId, setImportListId] = useState("");
  const [importItems, setImportItems] = useState<any[]>([]);
  const [importLoading, setImportLoading] = useState(false);
  const [useGlobalSource, setUseGlobalSource] = useState(!!((field as any).settings?.globalListSource));
  const [sourceListId, setSourceListId] = useState((field as any).settings?.globalListSource?.listId || "");

  const options: any[] = (field as any).options || [];
  const settings = (field as any).settings || {};

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
    const label = "New Option";
    onUpdate({
      options: [...options, {
        id: `opt-${Date.now()}`,
        label,
        value: `option_${options.length + 1}`,
        color: "",
        order: options.length,
      }],
    } as any);
  };

  const updateLabel = (index: number, label: string) => {
    onUpdate({
      options: options.map((o: any, i: number) =>
        i === index ? { ...o, label, value: label.toLowerCase().replace(/\s+/g, "_") } : o
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

  const applyBulk = () => {
    const lines = bulkInput.split("\n").map((l: string) => l.trim()).filter(Boolean);
    const newOptions = lines.map((line: string, i: number) => ({
      id: `opt-${Date.now()}-${i}`,
      label: line,
      value: line.toLowerCase().replace(/\s+/g, "_"),
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
    const newOptions = importItems.map((item: any, i: number) => ({
      id: `opt-${Date.now()}-${i}`,
      label: item.label,
      value: item.value || item.label.toLowerCase().replace(/\s+/g, "_"),
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Options</p>
        <div className="flex items-center gap-2">
          {mode === "manual" && (
            <>
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

      {/* Dynamic source toggle */}
      <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-md border border-gray-200">
        <Switch
          checked={useGlobalSource}
          onCheckedChange={toggleGlobalSource}
          id="global-src-toggle"
        />
        <Label htmlFor="global-src-toggle" className="text-xs cursor-pointer">
          Load options from Global List at runtime
        </Label>
      </div>

      {useGlobalSource && (
        <div className="space-y-1.5">
          <Select value={sourceListId} onValueChange={applyGlobalSource}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="Select global list…" />
            </SelectTrigger>
            <SelectContent>
              {globalLists.map((gl: any) => (
                <SelectItem key={gl.id} value={gl.id} className="text-xs">{gl.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded p-2">
            Options will be fetched from this list dynamically when the form is rendered. Manual options below are ignored.
          </p>
        </div>
      )}

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
                      onUpdateLabel={(label) => updateLabel(realIndex, label)}
                      onUpdateColor={(color) => updateColor(realIndex, color)}
                      onRemove={() => removeOption(realIndex)}
                    />
                  );
                })}
              </div>
            </SortableContext>
          </DndContext>

          {options.length === 0 && (
            <p className="text-xs text-gray-400 text-center py-2">No options yet. Add one below or use Bulk add.</p>
          )}
          <Button variant="outline" size="sm" onClick={addOption} className="w-full gap-1.5 text-xs mt-1">
            <Plus className="w-3 h-3" /> Add Option
          </Button>
        </div>
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
}

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

function SubformConfig({
  field,
  modules,
  onUpdate,
}: {
  field: Field;
  modules: any[];
  onUpdate: (c: Partial<Field>) => void;
}) {
  const settings = (field as any).settings || {};
  const columns: SubformColumn[] = settings.columns || [];
  const [expandedCol, setExpandedCol] = useState<string | null>(null);

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

  const moveColumn = (id: string, dir: "up" | "down") => {
    const idx = columns.findIndex(c => c.id === id);
    if (dir === "up" && idx === 0) return;
    if (dir === "down" && idx === columns.length - 1) return;
    const next = [...columns];
    const swapIdx = dir === "up" ? idx - 1 : idx + 1;
    [next[idx], next[swapIdx]] = [next[swapIdx], next[idx]];
    saveColumns(next);
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
        <div className="space-y-1.5">
          {columns.map((col, idx) => (
            <div key={col.id} className="border border-gray-200 rounded-lg overflow-hidden">
              {/* Column header */}
              <div
                className="flex items-center gap-2 px-2.5 py-2 bg-gray-50 cursor-pointer hover:bg-gray-100 transition-colors select-none"
                onClick={() => setExpandedCol(expandedCol === col.id ? null : col.id)}
              >
                {/* Up/down arrows */}
                <div className="flex flex-col shrink-0">
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); moveColumn(col.id, "up"); }}
                    disabled={idx === 0}
                    className="text-[10px] leading-[10px] text-gray-300 hover:text-gray-500 disabled:opacity-30 disabled:cursor-default"
                  >▲</button>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); moveColumn(col.id, "down"); }}
                    disabled={idx === columns.length - 1}
                    className="text-[10px] leading-[10px] text-gray-300 hover:text-gray-500 disabled:opacity-30 disabled:cursor-default"
                  >▼</button>
                </div>

                <span className="font-mono text-[10px] bg-white border border-gray-200 rounded px-1 py-0.5 text-gray-500 shrink-0">
                  {SUBFORM_COL_TYPES.find(t => t.value === col.type)?.icon || "?"}
                </span>

                <span className="flex-1 text-xs font-medium text-gray-700 truncate">{col.label}</span>

                {col.required && <span className="text-[10px] text-blue-500 shrink-0">req</span>}

                <ChevronDown className={cn("w-3 h-3 text-gray-400 transition-transform shrink-0", expandedCol === col.id && "rotate-180")} />

                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); removeColumn(col.id); }}
                  className="text-gray-300 hover:text-red-500 transition-colors shrink-0 p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>

              {/* Expanded settings */}
              {expandedCol === col.id && (
                <div className="px-3 py-3 space-y-2.5 bg-white border-t border-gray-100">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-[10px] text-gray-500 uppercase tracking-wide">Label</Label>
                      <Input
                        value={col.label}
                        onChange={e => {
                          const lbl = e.target.value;
                          updateColumn(col.id, {
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
                      <Select value={col.type} onValueChange={v => updateColumn(col.id, { type: v })}>
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
                      onChange={e => updateColumn(col.id, { name: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "") })}
                      className="h-7 text-xs font-mono"
                      placeholder="column_key"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label className="text-xs">Required</Label>
                    <Switch
                      checked={col.required}
                      onCheckedChange={v => updateColumn(col.id, { required: v })}
                    />
                  </div>

                  {col.type === "FORMULA" && (
                    <div className="space-y-1.5">
                      <Label className="text-[10px] text-gray-500 uppercase tracking-wide">Formula</Label>
                      <FormulaEditor
                        value={col.formula || ""}
                        onChange={(v) => updateColumn(col.id, { formula: v })}
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
                          updateColumn(col.id, {
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
                          onValueChange={v => updateColumn(col.id, { lookupModuleId: v, lookupDisplayField: "" })}
                        >
                          <SelectTrigger className="h-7 text-xs"><SelectValue placeholder="Select module..." /></SelectTrigger>
                          <SelectContent>
                            {modules.map(m => (
                              <SelectItem key={m.id} value={m.id} className="text-xs">{m.icon} {m.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      {col.lookupModuleId && (
                        <div className="space-y-1">
                          <Label className="text-[10px] text-gray-500 uppercase tracking-wide">Display Field</Label>
                          <Input
                            value={col.lookupDisplayField || ""}
                            onChange={e => updateColumn(col.id, { lookupDisplayField: e.target.value })}
                            placeholder="e.g. name"
                            className="h-7 text-xs"
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
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

  const addRule = () => {
    const newRule: LayoutRule = {
      id: `rule-${Date.now()}`,
      whenField: otherFields[0]?.name || "",
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
                    {otherFields.map(f => (
                      <SelectItem key={f.id} value={f.name} className="text-xs">{f.label}</SelectItem>
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
