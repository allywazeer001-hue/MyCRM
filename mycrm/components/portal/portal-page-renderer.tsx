"use client";
import { useState } from "react";
import { PortalFieldRenderer, PortalFieldDef } from "./portal-field-renderer";
import { ChevronDown, ChevronRight } from "lucide-react";

// ── Extended types ──────────────────────────────────────────────────────────

export interface PageSection {
  id: string;
  label: string;
  columnIndex: number;
  order: number;
  isCollapsible: boolean;
  isVisible: boolean;
  fieldColumns?: number; // 1, 2, or 3 columns within this section
  fields: (PortalFieldDef & {
    colSpan?: number;  // 1 = normal, 2 = full-width in multi-col
    content?: string;  // for h1/h2/h3/paragraph with {{variables}}
  })[];
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
  portalUser?: any; // portal auth user — used for {{variable}} replacement
  onChange?: (fieldKey: string, value: any) => void;
  onSave?: (updates: Record<string, any>) => Promise<void>;
  readOnly?: boolean;
}

// ── Variable replacement ────────────────────────────────────────────────────

function resolveVariables(text: string, user?: any): string {
  if (!text || !user) return text ?? "";
  const orgName = user.organization?.name ?? "";
  const now = new Date();
  return text
    .replace(/\{\{user\.firstName\}\}/g,   user.firstName  ?? "")
    .replace(/\{\{user\.lastName\}\}/g,    user.lastName   ?? "")
    .replace(/\{\{user\.fullName\}\}/g,    `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim())
    .replace(/\{\{user\.email\}\}/g,       user.email      ?? "")
    .replace(/\{\{user\.portalRole\}\}/g,  user.portalRole ?? "")
    .replace(/\{\{organization\.name\}\}/g, orgName)
    .replace(/\{\{currentDate\}\}/g,       now.toLocaleDateString())
    .replace(/\{\{currentTime\}\}/g,       now.toLocaleTimeString());
}

// ── Content element renderer ────────────────────────────────────────────────

const CONTENT_TYPES = ["h1", "h2", "h3", "paragraph", "header", "label"];

function ContentElement({ field, portalUser }: { field: PageSection["fields"][0]; portalUser?: any }) {
  const text = resolveVariables(field.content || field.label, portalUser);

  switch (field.fieldType) {
    case "h1":
      return <h1 className="text-2xl font-bold text-gray-900 leading-tight">{text}</h1>;
    case "h2":
      return <h2 className="text-lg font-semibold text-gray-800">{text}</h2>;
    case "h3":
      return <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest">{text}</h3>;
    case "paragraph":
      return <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">{text}</p>;
    case "header":
      return <h3 className="text-sm font-semibold text-gray-700 border-b border-gray-200 pb-2">{text}</h3>;
    case "label":
      return <p className="text-xs font-medium text-gray-500">{text}</p>;
    case "separator":
      return <hr className="border-gray-200" />;
    case "spacer":
      return <div className="h-3" />;
    default:
      return null;
  }
}

// ── Block Renderer ─────────────────────────────────────────────────────────

function BlockRenderer({ block }: { block: any }) {
  const CALLOUT: Record<string, { bg: string; border: string; text: string }> = {
    info:    { bg: "bg-blue-50",   border: "border-blue-200",   text: "text-blue-800" },
    warning: { bg: "bg-amber-50",  border: "border-amber-200",  text: "text-amber-800" },
    success: { bg: "bg-green-50",  border: "border-green-200",  text: "text-green-800" },
    error:   { bg: "bg-red-50",    border: "border-red-200",    text: "text-red-800" },
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
      return <div className={`${s.bg} border ${s.border} rounded-xl px-5 py-4`}><p className={`text-sm ${s.text}`}>{block.content?.text}</p></div>;
    }
    case "divider": return <hr className="border-gray-200 my-2" />;
    default: return null;
  }
}

// ── Field row inside a section ──────────────────────────────────────────────

function FieldRow({ field, fieldValues, onChange, readOnly, portalUser }: {
  field: PageSection["fields"][0];
  fieldValues: Record<string, any>;
  onChange?: (k: string, v: any) => void;
  readOnly?: boolean;
  portalUser?: any;
}) {
  const isContent = CONTENT_TYPES.includes(field.fieldType);
  if (isContent) {
    return <ContentElement field={field} portalUser={portalUser} />;
  }
  return (
    <div>
      {!["separator", "spacer"].includes(field.fieldType) && (
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
      {field.helpText && !["separator", "spacer"].includes(field.fieldType) && (
        <p className="text-xs text-gray-400 mt-1">{field.helpText}</p>
      )}
    </div>
  );
}

// ── Section Renderer — respects fieldColumns and colSpan ───────────────────

function SectionRenderer({
  section, fieldValues, onChange, readOnly, portalUser,
}: {
  section: PageSection;
  fieldValues: Record<string, any>;
  onChange?: (k: string, v: any) => void;
  readOnly?: boolean;
  portalUser?: any;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const cols = section.fieldColumns ?? 1;

  const gridClass = cols === 3 ? "grid-cols-3"
    : cols === 2             ? "grid-cols-2"
    :                          "grid-cols-1";

  return (
    <div className="bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden">
      {/* Section header */}
      <div
        className={`flex items-center justify-between px-5 py-3.5 border-b border-gray-100 ${
          section.isCollapsible ? "cursor-pointer hover:bg-gray-50 select-none" : ""
        }`}
        onClick={() => section.isCollapsible && setCollapsed(c => !c)}
      >
        <h3 className="text-sm font-semibold text-gray-800">{section.label}</h3>
        {section.isCollapsible && (
          collapsed
            ? <ChevronRight className="w-4 h-4 text-gray-400" />
            : <ChevronDown  className="w-4 h-4 text-gray-400" />
        )}
      </div>

      {/* Fields — multi-column grid */}
      {!collapsed && (
        <div className={`px-5 py-4 grid ${gridClass} gap-4`}>
          {section.fields.map(field => {
            const wide = (field.colSpan ?? 1) >= 2 && cols >= 2;
            const spanClass = wide && cols === 2 ? "col-span-2"
              : wide && cols === 3              ? "col-span-3"
              :                                   "";
            return (
              <div key={field.id} className={spanClass}>
                <FieldRow
                  field={field}
                  fieldValues={fieldValues}
                  onChange={onChange}
                  readOnly={readOnly}
                  portalUser={portalUser}
                />
              </div>
            );
          })}
          {section.fields.length === 0 && (
            <p className="text-xs text-gray-400 italic col-span-full">No fields in this section.</p>
          )}
        </div>
      )}
    </div>
  );
}

// ── Layout engines ─────────────────────────────────────────────────────────

type LayoutProps = {
  sections: PageSection[];
  fieldValues: Record<string, any>;
  onChange?: (k: string, v: any) => void;
  readOnly?: boolean;
  portalUser?: any;
};

function SingleLayout({ sections, fieldValues, onChange, readOnly, portalUser }: LayoutProps) {
  return (
    <div className="space-y-4">
      {sections.map(s => <SectionRenderer key={s.id} section={s} fieldValues={fieldValues} onChange={onChange} readOnly={readOnly} portalUser={portalUser} />)}
    </div>
  );
}

function ColumnLayout({ sections, columns, fieldValues, onChange, readOnly, portalUser, gridClass }: LayoutProps & { columns: number; gridClass: string }) {
  const cols = Array.from({ length: columns }, (_, i) => sections.filter(s => (s.columnIndex ?? 0) === i));
  return (
    <div className={`grid ${gridClass} gap-5`}>
      {cols.map((colSections, colIdx) => (
        <div key={colIdx} className="space-y-4">
          {colSections.map(s => <SectionRenderer key={s.id} section={s} fieldValues={fieldValues} onChange={onChange} readOnly={readOnly} portalUser={portalUser} />)}
        </div>
      ))}
    </div>
  );
}

function TabsLayout({ sections, fieldValues, onChange, readOnly, portalUser }: LayoutProps) {
  const [activeTab, setActiveTab] = useState(0);
  const section = sections[activeTab];
  return (
    <div>
      <div className="flex gap-0 border-b border-gray-200 mb-5 overflow-x-auto">
        {sections.map((s, i) => (
          <button key={s.id} onClick={() => setActiveTab(i)}
            className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors -mb-px ${
              activeTab === i ? "border-indigo-500 text-indigo-600" : "border-transparent text-gray-500 hover:text-gray-700"
            }`}>{s.label}</button>
        ))}
      </div>
      {section && <SectionRenderer section={section} fieldValues={fieldValues} onChange={onChange} readOnly={readOnly} portalUser={portalUser} />}
    </div>
  );
}

function AccordionLayout({ sections, fieldValues, onChange, readOnly, portalUser }: LayoutProps) {
  const [open, setOpen] = useState<number>(0);
  return (
    <div className="space-y-2">
      {sections.map((section, i) => (
        <div key={section.id} className="bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden">
          <button className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-gray-50 transition-colors"
            onClick={() => setOpen(open === i ? -1 : i)}>
            <span className="text-sm font-semibold text-gray-800">{section.label}</span>
            {open === i ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
          </button>
          {open === i && (
            <div className="px-5 pb-4 border-t border-gray-100 pt-4">
              <SectionRenderer section={section} fieldValues={fieldValues} onChange={onChange} readOnly={readOnly} portalUser={portalUser} />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function CardLayout({ sections, fieldValues, onChange, readOnly, portalUser }: LayoutProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
      {sections.map(s => <SectionRenderer key={s.id} section={s} fieldValues={fieldValues} onChange={onChange} readOnly={readOnly} portalUser={portalUser} />)}
    </div>
  );
}

function SidebarLayout({ sections, fieldValues, onChange, readOnly, portalUser }: LayoutProps) {
  const sidebar = sections.filter(s => (s.columnIndex ?? 0) === 0);
  const main    = sections.filter(s => (s.columnIndex ?? 0) === 1);
  return (
    <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-5">
      <div className="space-y-4">{sidebar.map(s => <SectionRenderer key={s.id} section={s} fieldValues={fieldValues} onChange={onChange} readOnly={readOnly} portalUser={portalUser} />)}</div>
      <div className="space-y-4">{main.map(s => <SectionRenderer key={s.id} section={s} fieldValues={fieldValues} onChange={onChange} readOnly={readOnly} portalUser={portalUser} />)}</div>
    </div>
  );
}

function DashboardLayout({ sections, fieldValues, onChange, readOnly, portalUser }: LayoutProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
      {sections.map(s => <SectionRenderer key={s.id} section={s} fieldValues={fieldValues} onChange={onChange} readOnly={readOnly} portalUser={portalUser} />)}
    </div>
  );
}

// ── Main Renderer ──────────────────────────────────────────────────────────

export function PortalPageRenderer({ page, fieldValues, portalUser, onChange, readOnly = false }: Props) {
  const visibleSections = page.sections.filter(s => s.isVisible);
  const blocks: any[] = Array.isArray(page.blocks) ? page.blocks : [];
  const layoutProps: LayoutProps = { sections: visibleSections, fieldValues, onChange, readOnly, portalUser };

  function renderLayout() {
    switch (page.layoutTemplate) {
      case "two-column":   return <ColumnLayout {...layoutProps} columns={2} gridClass="grid-cols-1 lg:grid-cols-2" />;
      case "three-column": return <ColumnLayout {...layoutProps} columns={3} gridClass="grid-cols-1 lg:grid-cols-3" />;
      case "tabs":         return <TabsLayout {...layoutProps} />;
      case "accordion":    return <AccordionLayout {...layoutProps} />;
      case "cards":        return <CardLayout {...layoutProps} />;
      case "sidebar":      return <SidebarLayout {...layoutProps} />;
      case "dashboard":    return <DashboardLayout {...layoutProps} />;
      default:             return <SingleLayout {...layoutProps} />;
    }
  }

  return (
    <div className="space-y-5">
      {blocks.length > 0 && (
        <div className="space-y-3">{blocks.map((b: any) => <BlockRenderer key={b.id} block={b} />)}</div>
      )}
      {renderLayout()}
    </div>
  );
}
