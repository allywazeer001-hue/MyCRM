/**
 * Dashboard store — server-backed.
 * Dashboards are persisted on the backend so access-control rules work across
 * users. Only `activeDashboardId` is kept in localStorage as a UI preference.
 */
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { api } from "@/lib/api";
import { getWidgetDims, GRID_COLS } from "@/components/analytics/analytics-widget";

// ── Widget types ───────────────────────────────────────────────────────────────

export type WidgetType =
  | "analytics_widget" // a SINGLE chart/graph picked from an analytics view (primary type)
  | "analytics_view"   // legacy: entire saved analytics view as mini-preview
  | "activity_feed"    // built-in: recent audit log
  | "module_grid"      // built-in: module launcher
  | "section";         // collapsible section header

/**
 * For type="analytics_widget", config holds the full chart parameters:
 *   { moduleId, chartType, aggregation, groupByField?, aggregateField?,
 *     filterGroup?, targetId?, barMode?, secondaryGroupByField?,
 *     analyticsViewId (source), analyticsWidgetId (original ID in view) }
 * All other types use config for their own settings.
 */
export interface WidgetDef {
  id: string;
  type: WidgetType;
  title: string;
  // react-grid-layout position (12-column grid)
  x: number;
  y: number;
  w: number;   // column span 1-12
  h: number;   // row span (each unit = GRID_ROW_HEIGHT px)
  /** legacy — only used for type="analytics_view" */
  analyticsViewId?: string;
  /** type-specific config; analytics_widget stores { analyticsViewId, analyticsWidgetId } */
  config: Record<string, unknown>;
  // legacy fields kept for DB compat
  colSpan?: number;
  rowSpan?: number;
}

export interface Dashboard {
  id: string;
  name: string;
  description?: string;
  isDefault: boolean;
  isPublic: boolean;
  createdById: string;
  // access rules — who can see this dashboard (beyond admins and the creator)
  sharedRoles: string[];
  sharedDepartments: string[];
  sharedUsers: string[];
  // widget layout (config.widgets) + optional global context filter (Dynamic Analytics Context Engine)
  config: { widgets: WidgetDef[]; contextField?: string | null; contextValue?: string | null };
  createdAt: string;
  updatedAt: string;
}

// ── Widget catalogue ───────────────────────────────────────────────────────────

// "module_grid" is intentionally not offered here — the Organisation Summary
// view already covers modules, so Analytics Dashboard is for analytics widgets.
export const BUILTIN_WIDGETS: {
  type: WidgetType; label: string; icon: string; description: string;
  defaultColSpan: 1|2|3|4; defaultRowSpan: 1|2;
}[] = [
  { type: "activity_feed", label: "Activity Feed", icon: "🔔", description: "Recent audit log entries",           defaultColSpan: 2, defaultRowSpan: 2 },
  { type: "section",       label: "Section",       icon: "📂", description: "Collapsible section that groups widgets below it", defaultColSpan: 4, defaultRowSpan: 1 },
];

function newId(): string { return Math.random().toString(36).slice(2, 10); }

/** Find the first free (x, y) position that fits a widget of given w×h, filling horizontally first */
function findFreePosition(widgets: WidgetDef[], w: number, h: number): { x: number; y: number } {
  const maxY = widgets.reduce((m, ww) => Math.max(m, (ww.y ?? 0) + (ww.h ?? h)), 0);
  for (let y = 0; y <= maxY; y++) {
    for (let x = 0; x <= GRID_COLS - w; x++) {
      const overlaps = widgets.some(ww => {
        const wx = ww.x ?? 0, wy = ww.y ?? 0, ww2 = ww.w ?? 4, wh = ww.h ?? 4;
        return x < wx + ww2 && x + w > wx && y < wy + wh && y + h > wy;
      });
      if (!overlaps) return { x, y };
    }
  }
  return { x: 0, y: maxY };
}

/** Default grid dimensions for a dashboard widget type */
function dashDims(type: string, chartType?: string): { w: number; h: number } {
  if (type === "analytics_widget") return getWidgetDims(chartType ?? "bar");
  if (type === "section")          return { w: GRID_COLS, h: 1 };
  if (type === "module_grid")      return { w: 4, h: 3 };   // 3 per row (was 6 = 2 per row)
  if (type === "activity_feed")    return { w: 3, h: 5 };   // 4 per row (was 4 = 3 per row)
  return getWidgetDims(type);
}

// ── Store ──────────────────────────────────────────────────────────────────────

interface DashboardStore {
  dashboards: Dashboard[];
  activeDashboardId: string | null;
  loading: boolean;

  // Getters
  activeDashboard: () => Dashboard | undefined;

  // Lifecycle
  loadDashboards: () => Promise<void>;

  // Dashboard CRUD
  createDashboard: (name: string, description?: string) => Promise<Dashboard>;
  updateDashboard: (id: string, patch: Partial<Pick<Dashboard,
    "name" | "description" | "config" | "isDefault" | "isPublic" |
    "sharedRoles" | "sharedDepartments" | "sharedUsers">>) => Promise<void>;
  deleteDashboard: (id: string) => Promise<void>;
  setActiveDashboard: (id: string) => void;
  setDefaultDashboard: (id: string) => Promise<void>;

  // Widget CRUD (all mutate config.widgets then PATCH the dashboard)
  addWidget: (dashboardId: string, type: WidgetType, config?: Record<string, unknown>) => Promise<void>;
  /** Add a single chart picked from an analytics view (stores reference only — config fetched live) */
  addAnalyticsChartWidget: (dashboardId: string, chart: {
    title: string;
    viewId: string;
    widgetId: string;
    chartType: string; // used only to pick a sensible default colSpan
  }) => Promise<void>;
  /** Legacy: add whole view as preview block */
  addAnalyticsWidget: (dashboardId: string, viewId: string, viewName: string) => Promise<void>;
  addSection: (dashboardId: string, title?: string) => Promise<void>;
  updateWidget: (dashboardId: string, widgetId: string, patch: Partial<Omit<WidgetDef, "id">>) => Promise<void>;
  removeWidget: (dashboardId: string, widgetId: string) => Promise<void>;
  reorderWidgets: (dashboardId: string, newOrder: string[]) => Promise<void>;
  /** Save grid position/size changes for multiple widgets in a single API call */
  bulkUpdateLayout: (dashboardId: string, changes: { id: string; x: number; y: number; w: number; h: number }[]) => Promise<void>;
  /** Set/clear the dashboard's global context filter (Dynamic Analytics Context Engine) */
  setDashboardContext: (dashboardId: string, contextField: string | null, contextValue: string | null) => Promise<void>;
}

/**
 * PATCH helper — sends the updated widget list to the backend, always alongside the
 * dashboard's current contextField/contextValue. DashboardsService.update() replaces
 * config wholesale (no deep merge), so any caller that PATCHed only { widgets } would
 * silently wipe out an active context filter — every mutator below must go through this.
 */
async function saveWidgets(dashboard: Dashboard, widgets: WidgetDef[]): Promise<Dashboard> {
  const { data } = await api.patch(`/dashboards/${dashboard.id}`, {
    config: { ...dashboard.config, widgets },
  });
  return data;
}

export const useDashboardStore = create<DashboardStore>()(
  persist(
    (set, get) => ({
      dashboards: [],
      activeDashboardId: null,
      loading: false,

      activeDashboard() {
        const { dashboards, activeDashboardId } = get();
        return dashboards.find(d => d.id === activeDashboardId) ?? dashboards[0];
      },

      async loadDashboards() {
        set({ loading: true });
        try {
          const { data } = await api.get("/dashboards");
          let list: Dashboard[] = data ?? [];

          // Seed a default "Home" dashboard if the user has none
          if (list.length === 0) {
            const { data: created } = await api.post("/dashboards", {
              name: "Home",
              description: "Your main workspace overview",
              isDefault: true,
              config: {
                widgets: [],
              },
            });
            list = [created];
          }

          const { activeDashboardId } = get();
          const activeExists = list.some(d => d.id === activeDashboardId);
          set({
            dashboards: list,
            activeDashboardId: activeExists ? activeDashboardId : (list.find(d => d.isDefault)?.id ?? list[0]?.id ?? null),
            loading: false,
          });
        } catch {
          set({ loading: false });
        }
      },

      async createDashboard(name, description) {
        const { data } = await api.post("/dashboards", {
          name, description, config: { widgets: [] },
        });
        set(s => ({ dashboards: [...s.dashboards, data] }));
        return data;
      },

      async updateDashboard(id, patch) {
        const { data } = await api.patch(`/dashboards/${id}`, patch);
        set(s => ({ dashboards: s.dashboards.map(d => d.id === id ? { ...d, ...data } : d) }));
      },

      async deleteDashboard(id) {
        const { dashboards, activeDashboardId } = get();
        if (dashboards.length <= 1) return;
        await api.delete(`/dashboards/${id}`);
        const next = dashboards.filter(d => d.id !== id);
        set({
          dashboards: next,
          activeDashboardId: activeDashboardId === id ? next[0].id : activeDashboardId,
        });
      },

      setActiveDashboard(id) {
        set({ activeDashboardId: id });
      },

      async setDefaultDashboard(id) {
        await get().updateDashboard(id, { isDefault: true });
        // Reflect the toggle locally for other dashboards
        set(s => ({
          dashboards: s.dashboards.map(d => ({ ...d, isDefault: d.id === id })),
        }));
      },

      async addWidget(dashboardId, type, config = {}) {
        const d = get().dashboards.find(x => x.id === dashboardId);
        if (!d) return;
        const builtin = BUILTIN_WIDGETS.find(w => w.type === type);
        const existing = d.config?.widgets ?? [];
        const { w, h } = dashDims(type);
        const widget: WidgetDef = {
          id: newId(), type,
          title: builtin?.label ?? type,
          ...findFreePosition(existing, w, h), w, h,
          config,
        };
        const updated = await saveWidgets(d, [...existing, widget]);
        set(s => ({ dashboards: s.dashboards.map(x => x.id === dashboardId ? { ...x, ...updated } : x) }));
      },

      async addAnalyticsChartWidget(dashboardId, chart) {
        const d = get().dashboards.find(x => x.id === dashboardId);
        if (!d) return;
        const existing = d.config?.widgets ?? [];
        const { w, h } = dashDims("analytics_widget", chart.chartType);
        const widget: WidgetDef = {
          id: newId(), type: "analytics_widget",
          title: chart.title,
          ...findFreePosition(existing, w, h), w, h,
          config: {
            analyticsViewId:   chart.viewId,
            analyticsWidgetId: chart.widgetId,
          },
        };
        const updated = await saveWidgets(d, [...existing, widget]);
        set(s => ({ dashboards: s.dashboards.map(x => x.id === dashboardId ? { ...x, ...updated } : x) }));
      },

      async addSection(dashboardId, title = "New Section") {
        const d = get().dashboards.find(x => x.id === dashboardId);
        if (!d) return;
        const existing = d.config?.widgets ?? [];
        const widget: WidgetDef = {
          id: newId(), type: "section",
          title, x: 0, y: findFreePosition(existing, GRID_COLS, 1).y, w: GRID_COLS, h: 1,
          config: { collapsed: false },
        };
        const updated = await saveWidgets(d, [...existing, widget]);
        set(s => ({ dashboards: s.dashboards.map(x => x.id === dashboardId ? { ...x, ...updated } : x) }));
      },

      async addAnalyticsWidget(dashboardId, viewId, viewName) {
        const d = get().dashboards.find(x => x.id === dashboardId);
        if (!d) return;
        const existing = d.config?.widgets ?? [];
        const widget: WidgetDef = {
          id: newId(), type: "analytics_view",
          title: viewName, ...findFreePosition(existing, 6, 4), w: 6, h: 4,
          analyticsViewId: viewId, config: {},
        };
        const updated = await saveWidgets(d, [...existing, widget]);
        set(s => ({ dashboards: s.dashboards.map(x => x.id === dashboardId ? { ...x, ...updated } : x) }));
      },

      async updateWidget(dashboardId, widgetId, patch) {
        const d = get().dashboards.find(x => x.id === dashboardId);
        if (!d) return;
        const widgets = (d.config?.widgets ?? []).map(w => w.id === widgetId ? { ...w, ...patch } : w);
        const updated = await saveWidgets(d, widgets);
        set(s => ({ dashboards: s.dashboards.map(x => x.id === dashboardId ? { ...x, ...updated } : x) }));
      },

      async removeWidget(dashboardId, widgetId) {
        const d = get().dashboards.find(x => x.id === dashboardId);
        if (!d) return;
        const widgets = (d.config?.widgets ?? []).filter(w => w.id !== widgetId);
        const updated = await saveWidgets(d, widgets);
        set(s => ({ dashboards: s.dashboards.map(x => x.id === dashboardId ? { ...x, ...updated } : x) }));
      },

      async reorderWidgets(dashboardId, newOrder) {
        const d = get().dashboards.find(x => x.id === dashboardId);
        if (!d) return;
        const byId = Object.fromEntries((d.config?.widgets ?? []).map(w => [w.id, w]));
        const widgets = newOrder.map(id => byId[id]).filter(Boolean) as WidgetDef[];
        const updated = await saveWidgets(d, widgets);
        set(s => ({ dashboards: s.dashboards.map(x => x.id === dashboardId ? { ...x, ...updated } : x) }));
      },

      async bulkUpdateLayout(dashboardId, changes) {
        const d = get().dashboards.find(x => x.id === dashboardId);
        if (!d) return;
        const widgets = (d.config?.widgets ?? []).map(w => {
          const c = changes.find(ch => ch.id === w.id);
          return c ? { ...w, x: c.x, y: c.y, w: c.w, h: c.h } : w;
        });
        const updated = await saveWidgets(d, widgets);
        set(s => ({ dashboards: s.dashboards.map(x => x.id === dashboardId ? { ...x, ...updated } : x) }));
      },

      async setDashboardContext(dashboardId, contextField, contextValue) {
        const d = get().dashboards.find(x => x.id === dashboardId);
        if (!d) return;
        const { data } = await api.patch(`/dashboards/${dashboardId}`, {
          config: { ...d.config, contextField, contextValue },
        });
        set(s => ({ dashboards: s.dashboards.map(x => x.id === dashboardId ? { ...x, ...data } : x) }));
      },
    }),
    {
      name: "crm-dashboard-ui",
      // Only persist the active-tab preference; actual dashboard data comes from the server
      partialize: (s) => ({ activeDashboardId: s.activeDashboardId }),
    }
  )
);
