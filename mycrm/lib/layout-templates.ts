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
  // When set, this section renders inside the named tab (see LayoutConfig.tabs)
  // instead of the flat, always-visible section list. Absent = today's behavior,
  // unchanged — tabs are strictly additive, nothing needs migrating.
  tabId?: string;
}

// A named tab that one or more sections can be assigned to via LayoutSection.tabId.
// Tabs render as a single <Tabs> block, ordered by `order`, placed after any
// untabbed sections — grouping is per-section, not a separate nesting level, so a
// module that has never touched tabs has an empty `tabs` array and renders exactly
// as it always has.
export interface LayoutTab {
  id: string;
  label: string;
  order: number;
}

// ── Module-level layout rules ─────────────────────────────────────────────────
// A rule fires when a field condition is met and runs one or more actions
// (show/hide/require/readonly a field OR a section).

export type ModuleRuleOperator   = "equals" | "not_equals" | "is_empty" | "not_empty" | "in" | "not_in";
export type ModuleRuleActionType = "show" | "hide" | "require" | "unrequire" | "readonly";
export type ModuleRuleTarget     = "field" | "section";
export type ModuleRuleLogic      = "AND" | "OR";

export interface ModuleRuleCondition {
  id:        string;
  whenField: string;
  operator:  ModuleRuleOperator;
  whenValue: string;
  // Used only by "in" / "not_in" — the field's value must match one of these.
  // whenValue is left unused for those two operators.
  whenValues?: string[];
}

// A nested AND/OR group — sits alongside plain conditions inside a rule's `conditions[]`
// array (or inside another group's `children[]`), so old flat rules (every item is a plain
// ModuleRuleCondition, no `type` field) keep evaluating exactly as before with zero migration.
export interface ModuleRuleConditionGroup {
  id:       string;
  type:     "group";
  operator: ModuleRuleLogic;
  children: ModuleRuleConditionNode[];
}

export type ModuleRuleConditionNode = ModuleRuleCondition | ModuleRuleConditionGroup;

export interface ModuleRuleAction {
  id:       string;
  type:     ModuleRuleActionType;
  target:   ModuleRuleTarget;
  targetId: string;      // deprecated single-target — kept so rules saved before multi-target existed still evaluate
  targetIds?: string[];  // field.name(s) for fields, section.id(s) for sections — the action applies to all of them
}

export interface ModuleLayoutRule {
  id:             string;
  conditionLogic: ModuleRuleLogic;   // how multiple top-level conditions/groups are combined
  conditions:     ModuleRuleConditionNode[];
  actions:        ModuleRuleAction[];
}

export interface LayoutConfig {
  templateId: string;
  columns: 1 | 2 | 3;
  sections: LayoutSection[];
  tabs?: LayoutTab[];
  // Column count for the record DETAIL/SHOW page specifically — independent of
  // `columns` above, which governs the create/edit form. Defaults to 3 (matching
  // the show page's previous hardcoded xl:grid-cols-3) so existing modules don't
  // visually change until someone deliberately picks 2.
  detailColumns?: 2 | 3;
  sidebarEnabled?: boolean;
  headerType?: "minimal" | "banner" | "none";
  density?: "compact" | "normal" | "spacious";
  rules?: ModuleLayoutRule[];
  // Record detail page style — undefined/"standard" renders exactly as
  // before (the tab-bar + Details/Activity/Emails/related-tabs layout).
  // "split-panel" renders a narrow left info panel + a wide right panel
  // with its own internal tab bar (Gallery/Documents/Custom Fields/Timeline/
  // QR Code/related modules). Purely additive — opt-in per module.
  recordDetailStyle?: "standard" | "split-panel";
  // Split Panel's "Main Tab" selection — radio-exclusive: exactly one section
  // id, or undefined (defaults to the first section). Every OTHER section is
  // automatically a tab on the right (see LayoutSection.tabId).
  mainSectionId?: string;
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
  columns: 3,
  sections: [],
  headerType: "minimal",
  density: "normal",
};
