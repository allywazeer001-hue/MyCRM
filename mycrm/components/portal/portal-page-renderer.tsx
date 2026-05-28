"use client";
import { useState } from "react";
import { PortalFieldRenderer, PortalFieldDef } from "./portal-field-renderer";
import { ChevronDown, ChevronRight } from "lucide-react";

export interface PageSection {
  id: string;
  label: string;
  columnIndex: number;
  order: number;
  isCollapsible: boolean;
  isVisible: boolean;
  fields: PortalFieldDef[];
}

export interface RenderedPage {
  id: string;
  title: string;
  slug: string;
  description?: string;
  icon?: string;
  layoutTemplate: string;
  blocks: any[];
  sections: PageSection[];
}

interface Props {
  page: RenderedPage;
  fieldValues: Record<string, any>;
  onChange?: (fieldKey: string, value: any) => void;
  onSave?: (updates: Record<string, any>) => Promise<void>;
  readOnly?: boolean;
}

// ── Block Renderer (for raw content blocks) ───────────────────────────────────
function BlockRenderer({ block }: { block: any }) {
  const CALLOUT: Record<string, { bg: string; border: string; text: string }> = {
    info:    { bg: "bg-blue-50",   border: "border-blue-200",  text: "text-blue-800" },
    warning: { bg: "bg-amber-50",  border: "border-amber-200", text: "text-amber-800" },
    success: { bg: "bg-green-50",  border: "border-green-200", text: "text-green-800" },
    error:   { bg: "bg-red-50",    border: "border-red-200",   text: "text-red-800" },
  };

  switch (block.type) {
    case "heading": {
      const { text, level = 2 } = block.content ?? {};
      const Tag = `h${level}` as "h1" | "h2" | "h3";
      const cls = level === 1 ? "text-2xl" : level === 2 ? "text-xl" : "text-lg";
      return <Tag className={`${cls} font-bold text-gray-900 mt-4 mb-2`}>{text}</Tag>;
    }
    case "text":
      return <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{block.content?.text}</p>;
    case "callout": {
      const s = CALLOUT[block.content?.variant ?? "info"] ?? CALLOUT.info;
      return (
        <div className={`${s.bg} border ${s.border} rounded-xl px-5 py-4`}>
          <p className={`text-sm ${s.text}`}>{block.content?.text}</p>
        </div>
      );
    }
    case "divider":
      return <hr className="border-gray-200 my-2" />;
    default:
      return null;
  }
}

// ── Section Renderer ──────────────────────────────────────────────────────────
function SectionRenderer({
  section, fieldValues, onChange, readOnly,
}: {
  section: PageSection;
  fieldValues: Record<string, any>;
  onChange?: (k: string, v: any) => void;
  readOnly?: boolean;
}) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden">
      <div
        className={`flex items-center justify-between px-5 py-3.5 ${section.isCollapsible ? "cursor-pointer hover:bg-gray-50" : ""} border-b border-gray-100`}
        onClick={() => section.isCollapsible && setCollapsed(c => !c)}
      >
        <h3 className="text-sm font-semibold text-gray-800">{section.label}</h3>
        {section.isCollapsible && (
          collapsed ? <ChevronRight className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />
        )}
      </div>

      {!collapsed && (
        <div className="px-5 py-4 space-y-4">
          {section.fields.map(field => (
            <div key={field.id}>
              {!["header", "separator", "divider", "spacer"].includes(field.fieldType) && (
                <label className="block text-xs font-medium text-gray-600 mb-1.5">
                  {field.label}
                  {field.isRequired && <span className="text-red-500 ml-0.5">*</span>}
                </label>
              )}
              <PortalFieldRenderer
                field={field}
                value={fieldValues[field.fieldKey]}
                onChange={v => onChange?.(field.fieldKey, v)}
                readOnly={readOnly}
              />
              {field.helpText && !["header", "separator", "divider", "spacer", "label"].includes(field.fieldType) && (
                <p className="text-xs text-gray-400 mt-1">{field.helpText}</p>
              )}
            </div>
          ))}
          {section.fields.length === 0 && (
            <p className="text-xs text-gray-400 italic">No fields in this section.</p>
          )}
        </div>
      )}
    </div>
  );
}

// ── Layout Engines ────────────────────────────────────────────────────────────

function SingleLayout({ sections, fieldValues, onChange, readOnly }: {
  sections: PageSection[]; fieldValues: Record<string, any>;
  onChange?: (k: string, v: any) => void; readOnly?: boolean;
}) {
  return (
    <div className="space-y-4">
      {sections.map(s => (
        <SectionRenderer key={s.id} section={s} fieldValues={fieldValues} onChange={onChange} readOnly={readOnly} />
      ))}
    </div>
  );
}

function ColumnLayout({ sections, columns, fieldValues, onChange, readOnly, gridClass }: {
  sections: PageSection[]; columns: number; gridClass: string;
  fieldValues: Record<string, any>; onChange?: (k: string, v: any) => void; readOnly?: boolean;
}) {
  const cols = Array.from({ length: columns }, (_, i) =>
    sections.filter(s => (s.columnIndex ?? 0) === i)
  );
  return (
    <div className={`grid ${gridClass} gap-5`}>
      {cols.map((colSections, colIdx) => (
        <div key={colIdx} className="space-y-4">
          {colSections.map(s => (
            <SectionRenderer key={s.id} section={s} fieldValues={fieldValues} onChange={onChange} readOnly={readOnly} />
          ))}
        </div>
      ))}
    </div>
  );
}

function TabsLayout({ sections, fieldValues, onChange, readOnly }: {
  sections: PageSection[]; fieldValues: Record<string, any>;
  onChange?: (k: string, v: any) => void; readOnly?: boolean;
}) {
  const [activeTab, setActiveTab] = useState(0);
  const section = sections[activeTab];
  return (
    <div>
      <div className="flex gap-0 border-b border-gray-200 mb-5 overflow-x-auto">
        {sections.map((s, i) => (
          <button
            key={s.id}
            onClick={() => setActiveTab(i)}
            className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors -mb-px ${
              activeTab === i ? "border-indigo-500 text-indigo-600" : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>
      {section && <SectionRenderer section={section} fieldValues={fieldValues} onChange={onChange} readOnly={readOnly} />}
    </div>
  );
}

function AccordionLayout({ sections, fieldValues, onChange, readOnly }: {
  sections: PageSection[]; fieldValues: Record<string, any>;
  onChange?: (k: string, v: any) => void; readOnly?: boolean;
}) {
  const [open, setOpen] = useState<number>(0);
  return (
    <div className="space-y-2">
      {sections.map((section, i) => (
        <div key={section.id} className="bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden">
          <button
            className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-gray-50 transition-colors"
            onClick={() => setOpen(open === i ? -1 : i)}
          >
            <span className="text-sm font-semibold text-gray-800">{section.label}</span>
            {open === i ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
          </button>
          {open === i && (
            <div className="px-5 pb-4 space-y-4 border-t border-gray-100 pt-4">
              {section.fields.map(field => (
                <div key={field.id}>
                  {!["header", "separator", "divider", "spacer"].includes(field.fieldType) && (
                    <label className="block text-xs font-medium text-gray-600 mb-1.5">
                      {field.label}{field.isRequired && <span className="text-red-500 ml-0.5">*</span>}
                    </label>
                  )}
                  <PortalFieldRenderer
                    field={field}
                    value={fieldValues[field.fieldKey]}
                    onChange={v => onChange?.(field.fieldKey, v)}
                    readOnly={readOnly}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function CardLayout({ sections, fieldValues, onChange, readOnly }: {
  sections: PageSection[]; fieldValues: Record<string, any>;
  onChange?: (k: string, v: any) => void; readOnly?: boolean;
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
      {sections.map(s => (
        <SectionRenderer key={s.id} section={s} fieldValues={fieldValues} onChange={onChange} readOnly={readOnly} />
      ))}
    </div>
  );
}

function SidebarLayout({ sections, fieldValues, onChange, readOnly }: {
  sections: PageSection[]; fieldValues: Record<string, any>;
  onChange?: (k: string, v: any) => void; readOnly?: boolean;
}) {
  const sidebar = sections.filter(s => (s.columnIndex ?? 0) === 0);
  const main = sections.filter(s => (s.columnIndex ?? 0) === 1);
  return (
    <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-5">
      <div className="space-y-4">
        {sidebar.map(s => <SectionRenderer key={s.id} section={s} fieldValues={fieldValues} onChange={onChange} readOnly={readOnly} />)}
      </div>
      <div className="space-y-4">
        {main.map(s => <SectionRenderer key={s.id} section={s} fieldValues={fieldValues} onChange={onChange} readOnly={readOnly} />)}
      </div>
    </div>
  );
}

function DashboardLayout({ sections, fieldValues, onChange, readOnly }: {
  sections: PageSection[]; fieldValues: Record<string, any>;
  onChange?: (k: string, v: any) => void; readOnly?: boolean;
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
      {sections.map(s => (
        <SectionRenderer key={s.id} section={s} fieldValues={fieldValues} onChange={onChange} readOnly={readOnly} />
      ))}
    </div>
  );
}

// ── Main Renderer ─────────────────────────────────────────────────────────────
export function PortalPageRenderer({ page, fieldValues, onChange, readOnly = false }: Props) {
  const visibleSections = page.sections.filter(s => s.isVisible);
  const blocks: any[] = Array.isArray(page.blocks) ? page.blocks : [];

  const sectionProps = { sections: visibleSections, fieldValues, onChange, readOnly };

  function renderLayout() {
    switch (page.layoutTemplate) {
      case "two-column":    return <ColumnLayout {...sectionProps} columns={2} gridClass="grid-cols-1 lg:grid-cols-2" />;
      case "three-column":  return <ColumnLayout {...sectionProps} columns={3} gridClass="grid-cols-1 lg:grid-cols-3" />;
      case "tabs":          return <TabsLayout {...sectionProps} />;
      case "accordion":     return <AccordionLayout {...sectionProps} />;
      case "cards":         return <CardLayout {...sectionProps} />;
      case "sidebar":       return <SidebarLayout {...sectionProps} />;
      case "dashboard":     return <DashboardLayout {...sectionProps} />;
      default:              return <SingleLayout {...sectionProps} />;
    }
  }

  return (
    <div className="space-y-5">
      {/* Raw content blocks (headings, text, callouts etc.) */}
      {blocks.length > 0 && (
        <div className="space-y-3">
          {blocks.map((block: any) => <BlockRenderer key={block.id} block={block} />)}
        </div>
      )}
      {/* Dynamic sections */}
      {renderLayout()}
    </div>
  );
}
