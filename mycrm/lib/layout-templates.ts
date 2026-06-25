/**
 * Predefined layout templates for modules, dashboards, portals, and forms.
 * Pure data — no side effects. Inspired by Zoho, Notion, Linear, Airtable.
 */

export type LayoutCategory =
  | "crm"
  | "analytics"
  | "admin"
  | "portal"
  | "workspace"
  | "form";

export type SectionRuleOperator = "equals" | "not_equals" | "is_empty" | "not_empty";
export type SectionRuleAction   = "show" | "hide";

export interface SectionRule {
  id:        string;
  whenField: string;
  operator:  SectionRuleOperator;
  whenValue: string;
  action:    SectionRuleAction;
}

export interface LayoutSection {
  id: string;
  title: string;
  collapsible?: boolean;
  collapsed?: boolean;
  columns: 1 | 2 | 3 | 4;
  fieldIds: string[];
  fieldWidths?: Record<string, string>;
  conditions?: SectionRule[];
}

// ── Module-level layout rules ─────────────────────────────────────────────────
// A rule fires when a field condition is met and runs one or more actions
// (show/hide/require/readonly a field OR a section).

export type ModuleRuleOperator   = "equals" | "not_equals" | "is_empty" | "not_empty";
export type ModuleRuleActionType = "show" | "hide" | "require" | "unrequire" | "readonly";
export type ModuleRuleTarget     = "field" | "section";
export type ModuleRuleLogic      = "AND" | "OR";

export interface ModuleRuleCondition {
  id:        string;
  whenField: string;
  operator:  ModuleRuleOperator;
  whenValue: string;
}

export interface ModuleRuleAction {
  id:       string;
  type:     ModuleRuleActionType;
  target:   ModuleRuleTarget;
  targetId: string;   // field.name for fields, section.id for sections
}

export interface ModuleLayoutRule {
  id:             string;
  conditionLogic: ModuleRuleLogic;   // how multiple conditions are combined
  conditions:     ModuleRuleCondition[];
  actions:        ModuleRuleAction[];
}

export interface LayoutConfig {
  templateId: string;
  columns: 1 | 2 | 3;
  sections: LayoutSection[];
  sidebarEnabled?: boolean;
  headerType?: "minimal" | "banner" | "none";
  density?: "compact" | "normal" | "spacious";
  rules?: ModuleLayoutRule[];
}

export interface LayoutTemplate {
  id: string;
  name: string;
  description: string;
  category: LayoutCategory;
  /** SVG path data for preview thumbnail */
  preview: "single" | "double" | "triple" | "sidebar-left" | "sidebar-right" | "kanban" | "fullwidth";
  defaultConfig: Omit<LayoutConfig, "sections"> & { sections?: LayoutSection[] };
}

export const LAYOUT_TEMPLATES: LayoutTemplate[] = [
  // ── CRM ──────────────────────────────────────────────────────────────────
  {
    id: "crm-standard",
    name: "CRM Standard",
    description: "Two-column layout for contact, lead, and deal records",
    category: "crm",
    preview: "double",
    defaultConfig: { templateId: "crm-standard", columns: 2, sections: [], headerType: "minimal", density: "normal" },
  },
  {
    id: "crm-detailed",
    name: "CRM Detailed",
    description: "Sectioned layout with Personal, Contact, and Notes sections",
    category: "crm",
    preview: "double",
    defaultConfig: {
      templateId: "crm-detailed", columns: 2,
      sections: [
        { id: "s1", title: "Personal Information", columns: 2, fieldIds: [], collapsible: false },
        { id: "s2", title: "Contact Details",      columns: 2, fieldIds: [], collapsible: false },
        { id: "s3", title: "Additional Info",      columns: 1, fieldIds: [], collapsible: true  },
      ],
      headerType: "minimal", density: "normal",
    },
  },
  // ── Analytics ────────────────────────────────────────────────────────────
  {
    id: "analytics-dashboard",
    name: "Analytics Dashboard",
    description: "Full-width dashboard layout for charts and KPIs",
    category: "analytics",
    preview: "fullwidth",
    defaultConfig: { templateId: "analytics-dashboard", columns: 1, sections: [], headerType: "banner", density: "compact" },
  },
  {
    id: "analytics-split",
    name: "Analytics Split",
    description: "Left sidebar navigation + main chart area",
    category: "analytics",
    preview: "sidebar-left",
    defaultConfig: { templateId: "analytics-split", columns: 2, sections: [], sidebarEnabled: true, headerType: "minimal", density: "compact" },
  },
  // ── Admin ─────────────────────────────────────────────────────────────────
  {
    id: "admin-settings",
    name: "Admin Settings",
    description: "Settings-style layout with left nav and content area",
    category: "admin",
    preview: "sidebar-left",
    defaultConfig: { templateId: "admin-settings", columns: 1, sections: [], sidebarEnabled: true, headerType: "minimal", density: "normal" },
  },
  {
    id: "admin-management",
    name: "Management Panel",
    description: "Three-column management layout for user/role/permission panels",
    category: "admin",
    preview: "triple",
    defaultConfig: { templateId: "admin-management", columns: 3, sections: [], headerType: "minimal", density: "compact" },
  },
  // ── Portal ────────────────────────────────────────────────────────────────
  {
    id: "portal-public",
    name: "Portal Public",
    description: "Clean public-facing portal layout with top navigation",
    category: "portal",
    preview: "fullwidth",
    defaultConfig: { templateId: "portal-public", columns: 1, sections: [], headerType: "banner", density: "spacious" },
  },
  {
    id: "portal-app",
    name: "Portal App",
    description: "App-style portal with left sidebar and content area",
    category: "portal",
    preview: "sidebar-left",
    defaultConfig: { templateId: "portal-app", columns: 2, sections: [], sidebarEnabled: true, headerType: "minimal", density: "normal" },
  },
  // ── Workspace ─────────────────────────────────────────────────────────────
  {
    id: "kanban-workspace",
    name: "Kanban Workspace",
    description: "Horizontal scroll kanban board, Trello-style",
    category: "workspace",
    preview: "kanban",
    defaultConfig: { templateId: "kanban-workspace", columns: 1, sections: [], headerType: "minimal", density: "compact" },
  },
  {
    id: "workspace-split",
    name: "Split Workspace",
    description: "Two-panel workspace: list on left, detail on right",
    category: "workspace",
    preview: "sidebar-right",
    defaultConfig: { templateId: "workspace-split", columns: 2, sections: [], sidebarEnabled: true, headerType: "minimal", density: "normal" },
  },
  // ── Form ──────────────────────────────────────────────────────────────────
  {
    id: "form-single",
    name: "Single Column Form",
    description: "Traditional single-column form, best for simple data entry",
    category: "form",
    preview: "single",
    defaultConfig: { templateId: "form-single", columns: 1, sections: [], headerType: "none", density: "normal" },
  },
  {
    id: "form-wizard",
    name: "Multi-step Wizard",
    description: "Step-by-step form with tabs — ideal for long forms",
    category: "form",
    preview: "double",
    defaultConfig: {
      templateId: "form-wizard", columns: 2,
      sections: [
        { id: "step1", title: "Basic Info",    columns: 2, fieldIds: [], collapsible: false },
        { id: "step2", title: "Details",       columns: 2, fieldIds: [], collapsible: false },
        { id: "step3", title: "Review",        columns: 1, fieldIds: [], collapsible: false },
      ],
      headerType: "minimal", density: "normal",
    },
  },
];

export function getTemplate(id: string): LayoutTemplate | undefined {
  return LAYOUT_TEMPLATES.find((t) => t.id === id);
}

export function getTemplatesByCategory(cat: LayoutCategory): LayoutTemplate[] {
  return LAYOUT_TEMPLATES.filter((t) => t.category === cat);
}

export const DEFAULT_MODULE_LAYOUT: LayoutConfig = {
  templateId: "crm-standard",
  columns: 2,
  sections: [],
  headerType: "minimal",
  density: "normal",
};
