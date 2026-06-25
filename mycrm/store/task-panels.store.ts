import { create } from "zustand";
import { api } from "@/lib/api";

export interface TaskPanel {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  color: string;
  moduleId: string;
  assigneeRoles: string[];
  highlightNew: boolean;
  newThresholdHours: number;
  isActive: boolean;
  order: number;
  displayLimit: number;
}

export interface PanelRecord {
  id: string;
  data: Record<string, any>;
  createdAt: string;
  isNew: boolean;
  createdBy?: {
    firstName: string;
    lastName: string;
    email: string;
  };
}

export interface PanelResult {
  panel: TaskPanel;
  module: {
    id: string;
    name: string;
    slug: string;
    icon?: string;
  };
  records: PanelRecord[];
  total: number;
  newCount: number;
}

interface TaskPanelsState {
  panels: TaskPanel[];
  results: Record<string, PanelResult>;
  isLoadingPanels: boolean;
  loadingPanelId: string | null;
  isOpen: boolean;
}

interface TaskPanelsActions {
  fetchPanels: () => Promise<void>;
  fetchPanelRecords: (panelId: string) => Promise<void>;
  openDrawer: () => Promise<void>;
  closeDrawer: () => void;
  toggleDrawer: () => void;
  getTotalNewCount: () => number;
}

type TaskPanelsStore = TaskPanelsState & TaskPanelsActions;

export const useTaskPanelsStore = create<TaskPanelsStore>((set, get) => ({
  panels: [],
  results: {},
  isLoadingPanels: false,
  loadingPanelId: null,
  isOpen: false,

  fetchPanels: async () => {
    set({ isLoadingPanels: true });
    try {
      const response = await api.get("/task-panels");
      set({ panels: response.data });
    } finally {
      set({ isLoadingPanels: false });
    }
  },

  fetchPanelRecords: async (panelId: string) => {
    set({ loadingPanelId: panelId });
    try {
      const response = await api.get(`/task-panels/${panelId}/records`);
      set((state) => ({
        results: {
          ...state.results,
          [panelId]: response.data,
        },
      }));
    } finally {
      set({ loadingPanelId: null });
    }
  },

  openDrawer: async () => {
    set({ isOpen: true });
    await get().fetchPanels();
    const panels = get().panels;
    await Promise.all(panels.map((panel) => get().fetchPanelRecords(panel.id)));
  },

  closeDrawer: () => {
    set({ isOpen: false });
  },

  toggleDrawer: () => {
    const { isOpen, openDrawer, closeDrawer } = get();
    if (isOpen) {
      closeDrawer();
    } else {
      openDrawer();
    }
  },

  getTotalNewCount: () => {
    const { results } = get();
    return Object.values(results).reduce(
      (sum, panelResult) => sum + panelResult.newCount,
      0
    );
  },
}));
