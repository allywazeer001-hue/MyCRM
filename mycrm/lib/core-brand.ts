/**
 * Cloudbox Brand System
 * Single source of truth for application name, icons, and appearance.
 * Changing the platform's display name should only ever require editing
 * BRAND.name/shortName below — every other file imports from here instead
 * of hardcoding the name as a literal string.
 *
 * Usage:
 *   import { BRAND, ICONS, getAppearance } from "@/lib/core-brand";
 *   <span>{BRAND.name}</span>
 *   <ICONS.dashboard className="w-4 h-4" />
 */

// ── Brand Identity ─────────────────────────────────────────────────────────

export const BRAND = {
  name:        "Cloudbox",
  tagline:     "Professional Business Platform",
  shortName:   "Cloudbox",
  logoLetter:  "C",
  logoColor:   "#2563eb",   // blue-600
} as const;

// ── Centralized Icon Map (all Lucide) ─────────────────────────────────────
// Import the icons you need from lucide-react and map them here so every
// module always uses the same icon for the same concept.

export const ICON_NAMES = {
  // Navigation
  dashboard:    "LayoutDashboard",
  analytics:    "BarChart3",
  reports:      "FileBarChart2",
  workflows:    "Workflow",
  forms:        "FileText",
  notifications:"Bell",
  search:       "Search",

  // Admin
  users:        "Users",
  settings:     "Settings",
  studio:       "Database",
  security:     "Shield",
  permissions:  "Lock",
  units:        "Building2",
  administration:"ShieldCheck",

  // Portal
  portal:       "Globe",
  portalUsers:  "UserCheck",

  // Records / modules
  records:      "FileText",
  contacts:     "ContactRound",
  tasks:        "CheckSquare",
  projects:     "Briefcase",
  calendar:     "Calendar",
  files:        "FolderOpen",
  knowledgeBase:"BookOpen",
  kanban:       "LayoutGrid",

  // Actions
  add:          "Plus",
  edit:         "Pencil",
  delete:       "Trash2",
  save:         "Save",
  cancel:       "X",
  back:         "ArrowLeft",
  more:         "MoreHorizontal",
  print:        "Printer",
  export:       "Download",
  import:       "Upload",
  refresh:      "RefreshCw",
  copy:         "Copy",
  link:         "Link",

  // Status
  success:      "CheckCircle",
  error:        "AlertCircle",
  warning:      "AlertTriangle",
  info:         "Info",
  loading:      "Loader2",
} as const;

// ── Portal Appearances ─────────────────────────────────────────────────────

export type AppearanceId = "professional-web" | "workspace-portal";

export interface PortalAppearance {
  id:          AppearanceId;
  name:        string;
  description: string;
  navStyle:    "top" | "sidebar";
  layout:      "full-width" | "contained" | "split";
  cardStyle:   "flat" | "elevated" | "bordered";
  density:     "compact" | "normal" | "spacious";
}

export const PORTAL_APPEARANCES: PortalAppearance[] = [
  {
    id:          "professional-web",
    name:        "Professional Web App",
    description: "Clean top navigation with full-width content areas. Inspired by Stripe and Linear.",
    navStyle:    "top",
    layout:      "contained",
    cardStyle:   "elevated",
    density:     "normal",
  },
  {
    id:          "workspace-portal",
    name:        "Workspace Portal",
    description: "Left sidebar navigation with dense workspace layout. Inspired by Notion and Airtable.",
    navStyle:    "sidebar",
    layout:      "split",
    cardStyle:   "bordered",
    density:     "compact",
  },
];

export const DEFAULT_APPEARANCE: AppearanceId = "professional-web";

// ── Appearance persistence (localStorage) ─────────────────────────────────

const APPEARANCE_KEY = "core_portal_appearance";

export function getStoredAppearance(): AppearanceId {
  if (typeof window === "undefined") return DEFAULT_APPEARANCE;
  return (localStorage.getItem(APPEARANCE_KEY) as AppearanceId) ?? DEFAULT_APPEARANCE;
}

export function setStoredAppearance(id: AppearanceId): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(APPEARANCE_KEY, id);
}

export function getAppearance(id?: AppearanceId): PortalAppearance {
  return PORTAL_APPEARANCES.find(a => a.id === (id ?? DEFAULT_APPEARANCE)) ?? PORTAL_APPEARANCES[0];
}
