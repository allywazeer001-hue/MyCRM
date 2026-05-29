"use client";
import { useState, useCallback, useEffect } from "react";
import {
  DndContext, DragEndEvent, DragOverEvent, DragStartEvent,
  PointerSensor, useSensor, useSensors, closestCenter, DragOverlay,
} from "@dnd-kit/core";
import {
  SortableContext, arrayMove, useSortable, verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { portalApi } from "@/lib/portal-api";
import {
  GripVertical, Plus, Trash2, Pencil, Check, X, Loader2,
  ChevronLeft, ChevronRight, Settings, Type, AlignLeft, Hash,
  Calendar, ToggleLeft, List, Upload, Minus, Heading,
  SeparatorHorizontal, Tag, Phone, Mail, DollarSign, Star,
  Table2, Link2, Database, Sparkles,
} from "lucide-react";

// ── Types ──────────────────────────────────────────────────────────────────────
export interface BuilderField {
  id: string;
  label: string;
  fieldKey: string;
  fieldType: string;
  placeholder?: string;
  helpText?: string;
  isRequired: boolean;
  isEditable: boolean;
  isReadOnly: boolean;
  isVisible: boolean;
  options: any[];
  order: number;
  sectionId?: string;
  mappedCrmFieldName?: string;
  mappedCrmModuleSlug?: string;
}

export interface BuilderSection {
  id: string;
  label: string;
  columnIndex: number;
  order: number;
  isCollapsible: boolean;
  status?: string;
  fields: BuilderField[];
  crmModuleSlug?: string;
  crmRelationField?: string;
  crmSectionType?: string;
}

interface Props {
  pageId: string;
  sections: BuilderSection[];
  templateColumns: number;
  onSectionsChange?: (sections: BuilderSection[]) => void;
}

// ── Field palette: all supported types ────────────────────────────────────────
const FIELD_GROUPS = [
  {
    label: "Text & Numbers",
    fields: [
      { type: "text",       label: "Text",       icon: Type },
      { type: "textarea",   label: "Long Text",  icon: AlignLeft },
      { type: "number",     label: "Number",     icon: Hash },
      { type: "currency",   label: "Currency",   icon: DollarSign },
      { type: "phone",      label: "Phone",      icon: Phone },
      { type: "email",      label: "Email",      icon: Mail },
    ],
  },
  {
    label: "Date & Boolean",
    fields: [
      { type: "date",       label: "Date",       icon: Calendar },
      { type: "datetime",   label: "Date & Time", icon: Calendar },
      { type: "boolean",    label: "Yes/No",     icon: ToggleLeft },
      { type: "rating",     label: "Rating",     icon: Star },
    ],
  },
  {
    label: "Selection",
    fields: [
      { type: "dropdown",   label: "Dropdown",   icon: List },
      { type: "multiselect", label: "Multi-select", icon: List },
      { type: "lookup",     label: "Lookup",     icon: Link2 },
    ],
  },
  {
    label: "Files & Data",
    fields: [
      { type: "upload",     label: "File Upload", icon: Upload },
      { type: "table",      label: "Data Table",  icon: Table2 },
      { type: "formula",    label: "Formula",     icon: Sparkles },
    ],
  },
  {
    label: "Layout",
    fields: [
      { type: "header",     label: "Header",     icon: Heading },
      { type: "label",      label: "Label",      icon: Tag },
      { type: "separator",  label: "Divider",    icon: SeparatorHorizontal },
      { type: "spacer",     label: "Spacer",     icon: Minus },
    ],
  },
];

const FIELD_PALETTE_FLAT = FIELD_GROUPS.flatMap(g => g.fields);

// ── Sortable field row ─────────────────────────────────────────────────────────
function SortableField({ field, onEdit, onDelete }: {
  field: BuilderField;
  onEdit: (field: BuilderField) => void;
  onDelete: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: field.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 };
  const pal = FIELD_PALETTE_FLAT.find(p => p.type === field.fieldType);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-2.5 group hover:border-indigo-300 hover:shadow-sm transition-all"
    >
      <button {...listeners} {...attributes} className="text-gray-300 hover:text-gray-500 cursor-grab active:cursor-grabbing shrink-0 touch-none">
        <GripVertical className="w-3.5 h-3.5" />
      </button>
      <span className="text-xs text-gray-400 font-mono bg-gray-50 px-1.5 py-0.5 rounded shrink-0">
        {pal?.label ?? field.fieldType}
      </span>
      <span className="flex-1 text-sm text-gray-700 truncate min-w-0">{field.label}</span>
      {field.mappedCrmFieldName && (
        <span className="text-xs text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded shrink-0 flex items-center gap-1">
          <Database className="w-2.5 h-2.5" />CRM
        </span>
      )}
      {field.isRequired && <span className="text-xs text-red-400 shrink-0">Req</span>}
      {field.isReadOnly && <span className="text-xs text-gray-400 shrink-0">RO</span>}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
        <button onClick={() => onEdit(field)} className="p-1 text-gray-400 hover:text-indigo-500 rounded">
          <Pencil className="w-3 h-3" />
        </button>
        <button onClick={() => onDelete(field.id)} className="p-1 text-gray-400 hover:text-red-400 rounded">
          <Trash2 className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}

// ── Field palette panel ────────────────────────────────────────────────────────
function FieldPalette({ onSelect, onClose }: {
  onSelect: (type: string) => void;
  onClose: () => void;
}) {
  const [activeGroup, setActiveGroup] = useState(0);

  return (
    <div className="border border-gray-200 rounded-lg bg-white shadow-md overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-100 bg-gray-50">
        <span className="text-xs font-semibold text-gray-600">Add Field</span>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-3.5 h-3.5" /></button>
      </div>
      <div className="flex">
        {/* Group tabs */}
        <div className="w-24 border-r border-gray-100 bg-gray-50/50">
          {FIELD_GROUPS.map((g, i) => (
            <button
              key={i}
              onClick={() => setActiveGroup(i)}
              className={`w-full text-left px-2 py-1.5 text-[10px] font-medium transition-colors ${
                activeGroup === i ? "bg-indigo-50 text-indigo-600" : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {g.label}
            </button>
          ))}
        </div>
        {/* Fields */}
        <div className="flex-1 p-1.5 grid grid-cols-2 gap-1 content-start">
          {FIELD_GROUPS[activeGroup].fields.map(({ type, label, icon: Icon }) => (
            <button
              key={type}
              onClick={() => { onSelect(type); onClose(); }}
              className="flex items-center gap-1.5 p-2 text-left hover:bg-indigo-50 hover:text-indigo-600 rounded-lg transition-colors text-gray-600"
            >
              <Icon className="w-3.5 h-3.5 shrink-0" />
              <span className="text-xs truncate">{label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Add-from-CRM modal ─────────────────────────────────────────────────────────
function AddFromCrmModal({ pageId, onCreated, onClose }: {
  pageId: string;
  onCreated: (section: BuilderSection) => void;
  onClose: () => void;
}) {
  const [modules, setModules] = useState<any[]>([]);
  const [selectedModule, setSelectedModule] = useState<any>(null);
  const [moduleFields, setModuleFields] = useState<any[]>([]);
  const [selectedFields, setSelectedFields] = useState<string[]>([]);
  const [sectionLabel, setSectionLabel] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [step, setStep] = useState<"module" | "fields">("module");

  useEffect(() => {
    portalApi.get("/portal/padmin/crm-modules")
      .then(r => setModules(r.data ?? []))
      .catch(() => {});
  }, []);

  const selectModule = async (mod: any) => {
    setSelectedModule(mod);
    setSectionLabel(mod.name);
    setLoading(true);
    try {
      const r = await portalApi.get(`/portal/padmin/crm-modules/${mod.id}/fields`);
      setModuleFields(r.data ?? []);
      setSelectedFields((r.data ?? []).slice(0, 6).map((f: any) => f.id));
    } catch {}
    setLoading(false);
    setStep("fields");
  };

  const toggleField = (id: string) => {
    setSelectedFields(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleCreate = async () => {
    if (!selectedModule) return;
    setSaving(true);
    try {
      const res = await portalApi.post(`/portal/padmin/pages/${pageId}/sections/from-module`, {
        label: sectionLabel,
        moduleSlug: selectedModule.slug,
        moduleId: selectedModule.id,
        fieldIds: selectedFields,
        sectionType: "primary",
      });
      onCreated({
        ...res.data,
        fields: (res.data.fields ?? []).map((f: any) => ({
          ...f,
          options: f.options ?? [],
        })),
      });
      onClose();
    } catch {}
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b shrink-0">
          <div>
            <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
              <Database className="w-4 h-4 text-indigo-500" />
              Add CRM Module Section
            </h3>
            {step === "fields" && selectedModule && (
              <p className="text-xs text-gray-500 mt-0.5">{selectedModule.name} · select fields to expose</p>
            )}
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {step === "module" && (
            <div className="p-4 space-y-1">
              <p className="text-xs text-gray-500 mb-3">Select a CRM module to create a portal section from its fields</p>
              {modules.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-6">No CRM modules found</p>
              ) : (
                modules.map(mod => (
                  <button
                    key={mod.id}
                    onClick={() => selectModule(mod)}
                    className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-indigo-50 border border-transparent hover:border-indigo-200 transition-all text-left"
                  >
                    <span className="text-xl">{mod.icon ?? "📋"}</span>
                    <div>
                      <p className="text-sm font-medium text-gray-800">{mod.name}</p>
                      <p className="text-xs text-gray-400 font-mono">{mod.slug}</p>
                    </div>
                  </button>
                ))
              )}
            </div>
          )}

          {step === "fields" && (
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Section Label</label>
                <input
                  value={sectionLabel}
                  onChange={e => setSectionLabel(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              {loading ? (
                <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-indigo-400" /></div>
              ) : (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-medium text-gray-600">Fields to include</label>
                    <div className="flex gap-2">
                      <button onClick={() => setSelectedFields(moduleFields.map(f => f.id))} className="text-xs text-indigo-500 hover:text-indigo-700">All</button>
                      <button onClick={() => setSelectedFields([])} className="text-xs text-gray-400 hover:text-gray-600">None</button>
                    </div>
                  </div>
                  <div className="space-y-1 max-h-48 overflow-y-auto">
                    {moduleFields.map(f => (
                      <label key={f.id} className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-gray-50 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedFields.includes(f.id)}
                          onChange={() => toggleField(f.id)}
                          className="rounded accent-indigo-500"
                        />
                        <span className="text-sm text-gray-700 flex-1">{f.label}</span>
                        <span className="text-xs text-gray-400 font-mono">{f.type?.toLowerCase()}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {step === "fields" && (
          <div className="px-6 pb-5 pt-3 border-t flex gap-2 shrink-0">
            <button
              onClick={handleCreate}
              disabled={saving || !sectionLabel.trim() || selectedFields.length === 0}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-medium rounded-lg"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              Create Section
            </button>
            <button onClick={() => setStep("module")} className="px-3 py-2 text-gray-500 text-sm rounded-lg hover:text-gray-700">
              ← Back
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Section card ───────────────────────────────────────────────────────────────
function SectionCard({
  section, templateColumns, onEdit, onDelete, onMoveColumn, onAddField, onEditField, onDeleteField,
}: {
  section: BuilderSection;
  templateColumns: number;
  onEdit: (s: BuilderSection) => void;
  onDelete: (id: string) => void;
  onMoveColumn: (id: string, dir: -1 | 1) => void;
  onAddField: (sectionId: string, type: string) => void;
  onEditField: (field: BuilderField) => void;
  onDeleteField: (sectionId: string, fieldId: string) => void;
}) {
  const [showPalette, setShowPalette] = useState(false);
  const fieldIds = section.fields.map(f => f.id);
  const isCrmSection = !!section.crmModuleSlug;
  const isDraft = section.status !== 'PUBLISHED';

  return (
    <div className={`border rounded-xl overflow-hidden ${isDraft ? "border-amber-300" : isCrmSection ? "bg-emerald-50/30 border-emerald-200" : "bg-gray-50 border-gray-200"}`}>
      {/* Section header */}
      <div className={`flex items-center gap-2 px-4 py-3 border-b ${isDraft ? "bg-amber-50 border-amber-200" : isCrmSection ? "bg-emerald-50 border-emerald-200" : "bg-white border-gray-200"}`}>
        {isCrmSection && !isDraft && <Database className="w-3.5 h-3.5 text-emerald-500 shrink-0" />}
        <span className="flex-1 text-sm font-semibold text-gray-700 truncate">{section.label}</span>
        {isDraft && (
          <span className="text-xs text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded font-medium shrink-0">DRAFT</span>
        )}
        {isCrmSection && !isDraft && (
          <span className="text-xs text-emerald-600 bg-emerald-100 px-1.5 py-0.5 rounded font-mono shrink-0">
            {section.crmModuleSlug}
          </span>
        )}
        {templateColumns > 1 && (
          <div className="flex items-center gap-0.5 shrink-0">
            <button disabled={section.columnIndex === 0} onClick={() => onMoveColumn(section.id, -1)}
              className="p-1 text-gray-400 hover:text-gray-700 disabled:opacity-30 rounded" title="Move left">
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <span className="text-xs text-gray-400 px-1">Col {section.columnIndex + 1}</span>
            <button disabled={section.columnIndex >= templateColumns - 1} onClick={() => onMoveColumn(section.id, 1)}
              className="p-1 text-gray-400 hover:text-gray-700 disabled:opacity-30 rounded" title="Move right">
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
        <button onClick={() => onEdit(section)} className="p-1 text-gray-400 hover:text-indigo-500 rounded">
          <Settings className="w-3.5 h-3.5" />
        </button>
        <button onClick={() => onDelete(section.id)} className="p-1 text-gray-400 hover:text-red-400 rounded">
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Fields */}
      <div className="p-3 space-y-2 min-h-[60px]">
        <SortableContext items={fieldIds} strategy={verticalListSortingStrategy}>
          {section.fields.map(field => (
            <SortableField
              key={field.id}
              field={field}
              onEdit={onEditField}
              onDelete={id => onDeleteField(section.id, id)}
            />
          ))}
        </SortableContext>
        {section.fields.length === 0 && (
          <p className="text-xs text-gray-400 italic text-center py-2">No fields yet — add below</p>
        )}
      </div>

      {/* Add field */}
      <div className="px-3 pb-3">
        {showPalette ? (
          <FieldPalette
            onSelect={type => onAddField(section.id, type)}
            onClose={() => setShowPalette(false)}
          />
        ) : (
          <button
            onClick={() => setShowPalette(true)}
            className="w-full flex items-center justify-center gap-1.5 py-2 border border-dashed border-gray-300 rounded-lg text-xs text-gray-400 hover:border-indigo-400 hover:text-indigo-500 hover:bg-indigo-50 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Add field
          </button>
        )}
      </div>
    </div>
  );
}

// ── Field edit modal ───────────────────────────────────────────────────────────
function FieldEditModal({ field, onSave, onClose }: {
  field: BuilderField;
  onSave: (updated: Partial<BuilderField>) => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState({
    label: field.label,
    placeholder: field.placeholder ?? "",
    helpText: field.helpText ?? "",
    isRequired: field.isRequired,
    isEditable: field.isEditable,
    isReadOnly: field.isReadOnly,
  });
  const [optionsText, setOptionsText] = useState(
    (field.options ?? []).map((o: any) => `${o.label}:${o.value}`).join("\n")
  );
  const needsOptions = ["dropdown", "multiselect"].includes(field.fieldType);

  const handleSave = () => {
    const updates: any = { ...form };
    if (needsOptions) {
      updates.options = optionsText
        .split("\n")
        .map(line => line.trim())
        .filter(Boolean)
        .map(line => {
          const [label, value] = line.includes(":") ? line.split(":") : [line, line];
          return { label: label.trim(), value: (value ?? label).trim() };
        });
    }
    onSave(updates);
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b shrink-0">
          <h3 className="text-sm font-semibold text-gray-800">Configure Field</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
        </div>
        <div className="px-6 py-5 space-y-4 overflow-y-auto flex-1">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Label</label>
            <input value={form.label} onChange={e => setForm(f => ({ ...f, label: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Placeholder</label>
            <input value={form.placeholder} onChange={e => setForm(f => ({ ...f, placeholder: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Help text</label>
            <input value={form.helpText} onChange={e => setForm(f => ({ ...f, helpText: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
          {needsOptions && (
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Options (one per line, Label:value)</label>
              <textarea
                value={optionsText}
                onChange={e => setOptionsText(e.target.value)}
                rows={5}
                placeholder={"Option 1:opt1\nOption 2:opt2"}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
              />
            </div>
          )}
          <div className="flex gap-4 pt-1 flex-wrap">
            {[
              { key: "isRequired" as const, label: "Required" },
              { key: "isEditable" as const, label: "Editable" },
              { key: "isReadOnly" as const, label: "Read-only" },
            ].map(({ key, label }) => (
              <label key={key} className="flex items-center gap-2 cursor-pointer text-sm text-gray-700">
                <input type="checkbox" checked={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.checked }))}
                  className="rounded accent-indigo-500" />
                {label}
              </label>
            ))}
          </div>
          {field.mappedCrmFieldName && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-xs text-emerald-700">
              <span className="font-medium">CRM Mapped:</span> {field.mappedCrmModuleSlug}.{field.mappedCrmFieldName}
            </div>
          )}
        </div>
        <div className="px-6 pb-5 flex gap-2 shrink-0">
          <button onClick={handleSave}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg">
            <Check className="w-4 h-4" />Save
          </button>
          <button onClick={onClose} className="px-4 py-2 text-gray-500 hover:text-gray-700 text-sm rounded-lg">Cancel</button>
        </div>
      </div>
    </div>
  );
}

// ── Section edit modal ─────────────────────────────────────────────────────────
function SectionEditModal({ section, onSave, onClose }: {
  section: BuilderSection;
  onSave: (updated: Partial<BuilderSection>) => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState({
    label: section.label,
    isCollapsible: section.isCollapsible,
  });

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h3 className="text-sm font-semibold text-gray-800">Section Settings</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Section Label</label>
            <input value={form.label} onChange={e => setForm(f => ({ ...f, label: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
          {section.crmModuleSlug && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-xs text-emerald-700">
              <p className="font-medium mb-1">CRM Module Section</p>
              <p>Module: <span className="font-mono">{section.crmModuleSlug}</span></p>
              {section.crmRelationField && <p>Relation via: <span className="font-mono">{section.crmRelationField}</span></p>}
            </div>
          )}
          <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-700">
            <input type="checkbox" checked={form.isCollapsible}
              onChange={e => setForm(f => ({ ...f, isCollapsible: e.target.checked }))}
              className="rounded accent-indigo-500" />
            Collapsible section
          </label>
        </div>
        <div className="px-6 pb-5 flex gap-2">
          <button onClick={() => onSave(form)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg">
            <Check className="w-4 h-4" />Save
          </button>
          <button onClick={onClose} className="px-4 py-2 text-gray-500 text-sm rounded-lg">Cancel</button>
        </div>
      </div>
    </div>
  );
}

// ── Main builder ───────────────────────────────────────────────────────────────
export function PortalDragBuilder({ pageId, sections: initialSections, templateColumns, onSectionsChange }: Props) {
  const [sections, setSections] = useState<BuilderSection[]>(initialSections);
  const [editingField, setEditingField] = useState<BuilderField | null>(null);
  const [editingSection, setEditingSection] = useState<BuilderSection | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState("");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [showCrmModal, setShowCrmModal] = useState(false);

  useEffect(() => { setSections(initialSections); }, [initialSections]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const findSectionOfField = useCallback((fieldId: string) =>
    sections.find(s => s.fields.some(f => f.id === fieldId)), [sections]);

  const handleDragStart = ({ active }: DragStartEvent) => setActiveId(String(active.id));

  const handleDragOver = ({ active, over }: DragOverEvent) => {
    if (!over) return;
    const activeSection = findSectionOfField(String(active.id));
    const overSection = findSectionOfField(String(over.id)) ?? sections.find(s => s.id === String(over.id));
    if (!activeSection || !overSection || activeSection.id === overSection.id) return;

    setSections(prev => {
      const copy = prev.map(s => ({ ...s, fields: [...s.fields] }));
      const fromIdx = copy.findIndex(s => s.id === activeSection.id);
      const toIdx = copy.findIndex(s => s.id === overSection.id);
      if (fromIdx < 0 || toIdx < 0) return prev;
      const fieldObj = copy[fromIdx].fields.find(f => f.id === String(active.id))!;
      copy[fromIdx].fields = copy[fromIdx].fields.filter(f => f.id !== String(active.id));
      copy[toIdx].fields = [...copy[toIdx].fields, { ...fieldObj, sectionId: overSection.id }];
      return copy;
    });
  };

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    setActiveId(null);
    if (!over || active.id === over.id) return;
    const activeId = String(active.id);
    const overId = String(over.id);

    setSections(prev => {
      const copy = prev.map(s => ({ ...s, fields: [...s.fields] }));
      const sec = copy.find(s => s.fields.some(f => f.id === activeId));
      if (!sec) return prev;
      const fieldIds = sec.fields.map(f => f.id);
      const oldIdx = fieldIds.indexOf(activeId);
      const newIdx = fieldIds.indexOf(overId);
      if (oldIdx >= 0 && newIdx >= 0) {
        sec.fields = arrayMove(sec.fields, oldIdx, newIdx).map((f, i) => ({ ...f, order: i }));
      }
      return copy;
    });
  };

  const saveToBackend = useCallback(async (updatedSections: BuilderSection[]) => {
    setSaving(true);
    try {
      for (const section of updatedSections) {
        await portalApi.patch(`/portal/padmin/sections/${section.id}`, {
          label: section.label, columnIndex: section.columnIndex,
          isCollapsible: section.isCollapsible, order: section.order,
        });
        // Update each field's sectionId and order — persists cross-section drags
        for (let i = 0; i < section.fields.length; i++) {
          await portalApi.patch(`/portal/padmin/fields/${section.fields[i].id}`, {
            sectionId: section.id,
            order: i,
          });
        }
      }
      setSavedMsg("Saved");
      setTimeout(() => setSavedMsg(""), 2000);
    } catch {}
    setSaving(false);
  }, []);

  const handleAddSection = async () => {
    try {
      const res = await portalApi.post('/portal/padmin/sections', {
        label: 'New Section', portalPageId: pageId, columnIndex: 0, order: sections.length,
      });
      const newSection: BuilderSection = { ...res.data, fields: [], status: res.data.status ?? 'DRAFT' };
      const updated = [...sections, newSection];
      setSections(updated);
      onSectionsChange?.(updated);
    } catch {}
  };

  const handleCrmSectionCreated = (section: BuilderSection) => {
    const updated = [...sections, section];
    setSections(updated);
    onSectionsChange?.(updated);
  };

  const handleDeleteSection = async (id: string) => {
    if (!confirm('Delete this section and all its fields?')) return;
    try {
      await portalApi.delete(`/portal/padmin/sections/${id}`);
      const updated = sections.filter(s => s.id !== id);
      setSections(updated);
      onSectionsChange?.(updated);
    } catch {}
  };

  const handleMoveColumn = async (sectionId: string, dir: -1 | 1) => {
    const updated = sections.map(s => {
      if (s.id !== sectionId) return s;
      return { ...s, columnIndex: Math.max(0, Math.min(templateColumns - 1, s.columnIndex + dir)) };
    });
    setSections(updated);
    onSectionsChange?.(updated);
    const section = updated.find(s => s.id === sectionId);
    if (section) await portalApi.patch(`/portal/padmin/sections/${sectionId}`, { columnIndex: section.columnIndex });
  };

  const handleSaveSection = async (updated: Partial<BuilderSection>) => {
    if (!editingSection) return;
    const { status: _status, ...patch } = updated as any;
    try {
      await portalApi.patch(`/portal/padmin/sections/${editingSection.id}`, patch);
      const updatedSections = sections.map(s => s.id === editingSection.id ? { ...s, ...patch } : s);
      setSections(updatedSections);
      onSectionsChange?.(updatedSections);
    } catch {}
    setEditingSection(null);
  };

  const handleAddField = async (sectionId: string, fieldType: string) => {
    const section = sections.find(s => s.id === sectionId);
    if (!section) return;
    const label = FIELD_PALETTE_FLAT.find(p => p.type === fieldType)?.label ?? fieldType;
    try {
      const res = await portalApi.post('/portal/padmin/fields', {
        label, fieldKey: `${fieldType}_${Date.now()}`, fieldType,
        portalPageId: pageId, sectionId, order: section.fields.length, isEditable: true,
      });
      const newField: BuilderField = { ...res.data, options: res.data.options ?? [], sectionId };
      const updated = sections.map(s => s.id === sectionId ? { ...s, fields: [...s.fields, newField] } : s);
      setSections(updated);
      onSectionsChange?.(updated);
    } catch {}
  };

  const handleDeleteField = async (sectionId: string, fieldId: string) => {
    try {
      await portalApi.delete(`/portal/padmin/fields/${fieldId}`);
      const updated = sections.map(s =>
        s.id === sectionId ? { ...s, fields: s.fields.filter(f => f.id !== fieldId) } : s
      );
      setSections(updated);
      onSectionsChange?.(updated);
    } catch {}
  };

  const handleSaveField = async (updated: Partial<BuilderField>) => {
    if (!editingField) return;
    try {
      await portalApi.patch(`/portal/padmin/fields/${editingField.id}`, updated);
      const updatedSections = sections.map(s => ({
        ...s, fields: s.fields.map(f => f.id === editingField.id ? { ...f, ...updated } : f),
      }));
      setSections(updatedSections);
      onSectionsChange?.(updatedSections);
    } catch {}
    setEditingField(null);
  };

  const gridClass = templateColumns === 3 ? "grid-cols-1 lg:grid-cols-3"
    : templateColumns === 2 ? "grid-cols-1 lg:grid-cols-2"
    : "grid-cols-1";

  const columns = Array.from({ length: Math.max(templateColumns, 1) }, (_, i) =>
    sections.filter(s => (s.columnIndex ?? 0) === i).sort((a, b) => a.order - b.order)
  );

  const activeField = activeId ? findSectionOfField(activeId)?.fields.find(f => f.id === activeId) : null;
  const totalFields = sections.reduce((acc, s) => acc + s.fields.length, 0);

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-gray-500">
          {sections.length} section{sections.length !== 1 ? "s" : ""} · {totalFields} field{totalFields !== 1 ? "s" : ""}
        </p>
        <div className="flex items-center gap-2">
          {savedMsg && <span className="text-xs text-emerald-500">{savedMsg}</span>}
          {saving && <Loader2 className="w-4 h-4 animate-spin text-gray-400" />}
          <button onClick={() => saveToBackend(sections)} disabled={saving}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-medium rounded-lg transition-colors">
            <Check className="w-3.5 h-3.5" />Save layout
          </button>
          <button onClick={() => setShowCrmModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-medium rounded-lg transition-colors">
            <Database className="w-3.5 h-3.5" />From CRM
          </button>
          <button onClick={handleAddSection}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-900 hover:bg-gray-700 text-white text-xs font-medium rounded-lg transition-colors">
            <Plus className="w-3.5 h-3.5" />Add section
          </button>
        </div>
      </div>

      {/* Canvas */}
      <DndContext sensors={sensors} collisionDetection={closestCenter}
        onDragStart={handleDragStart} onDragOver={handleDragOver} onDragEnd={handleDragEnd}>
        {sections.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 border-2 border-dashed border-gray-200 rounded-2xl gap-4">
            <p className="text-sm text-gray-400">No sections yet. Add a blank section or pull one from CRM.</p>
            <div className="flex gap-2">
              <button onClick={handleAddSection}
                className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg">
                <Plus className="w-4 h-4" />Blank section
              </button>
              <button onClick={() => setShowCrmModal(true)}
                className="flex items-center gap-1.5 px-4 py-2 bg-emerald-700 hover:bg-emerald-600 text-white text-sm font-medium rounded-lg">
                <Database className="w-4 h-4" />From CRM module
              </button>
            </div>
          </div>
        ) : (
          <div className={`grid ${gridClass} gap-4`}>
            {columns.map((colSections, colIdx) => (
              <div key={colIdx} className="space-y-4">
                {templateColumns > 1 && (
                  <div className="text-xs font-medium text-gray-400 px-1">Column {colIdx + 1}</div>
                )}
                {colSections.map(section => (
                  <SectionCard
                    key={section.id}
                    section={section}
                    templateColumns={templateColumns}
                    onEdit={setEditingSection}
                    onDelete={handleDeleteSection}
                    onMoveColumn={handleMoveColumn}
                    onAddField={handleAddField}
                    onEditField={setEditingField}
                    onDeleteField={handleDeleteField}
                  />
                ))}
                {colSections.length === 0 && templateColumns > 1 && (
                  <div className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center">
                    <p className="text-xs text-gray-400">Empty column — move a section here</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
        <DragOverlay>
          {activeField && (
            <div className="flex items-center gap-2 bg-white border border-indigo-300 shadow-lg rounded-lg px-3 py-2.5 opacity-90">
              <GripVertical className="w-3.5 h-3.5 text-indigo-400" />
              <span className="text-sm text-gray-700">{activeField.label}</span>
            </div>
          )}
        </DragOverlay>
      </DndContext>

      {/* Modals */}
      {editingField && (
        <FieldEditModal field={editingField} onSave={handleSaveField} onClose={() => setEditingField(null)} />
      )}
      {editingSection && (
        <SectionEditModal section={editingSection} onSave={handleSaveSection} onClose={() => setEditingSection(null)} />
      )}
      {showCrmModal && (
        <AddFromCrmModal pageId={pageId} onCreated={handleCrmSectionCreated} onClose={() => setShowCrmModal(false)} />
      )}
    </div>
  );
}
