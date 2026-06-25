"use client";
import { create } from "zustand";
import { api } from "@/lib/api";

export interface Field {
  id: string;
  name: string;
  label: string;
  type: string;
  order: number;
  isRequired: boolean;
  isUnique: boolean;
  isReadonly: boolean;
  isHidden: boolean;
  placeholder?: string;
  helpText?: string;
  defaultValue?: string;
  validation?: Record<string, any>;
  conditionalLogic?: Record<string, any>;
  settings?: Record<string, any>;
  options?: { id: string; label: string; value: string; color?: string; order: number }[];
}

export interface DynamicModule {
  id: string;
  name: string;
  slug: string;
  description?: string;
  icon?: string;
  color?: string;
  order: number;
  isActive: boolean;
  settings?: Record<string, any>;
  fields?: Field[];
}

interface ModulesState {
  modules: DynamicModule[];
  activeModule: DynamicModule | null;
  isLoading: boolean;
  currentOrgId: string | null;
  fetchModules: () => Promise<void>;
  fetchModule: (id: string) => Promise<void>;
  createModule: (data: Partial<DynamicModule>) => Promise<DynamicModule>;
  updateModule: (id: string, data: Partial<DynamicModule>) => Promise<void>;
  deleteModule: (id: string) => Promise<void>;
  setActiveModule: (module: DynamicModule | null) => void;
  clearForOrgChange: () => void;
}

export const useModulesStore = create<ModulesState>((set) => ({
  modules: [],
  activeModule: null,
  isLoading: false,
  currentOrgId: null,

  // Called immediately when the authenticated org changes — prevents stale
  // modules from a previous org appearing in the sidebar during the new fetch.
  clearForOrgChange: () => set({ modules: [], activeModule: null, isLoading: true, currentOrgId: null }),

  fetchModules: async () => {
    set({ isLoading: true });
    try {
      const { data } = await api.get("/modules");
      // Track which org this data belongs to (first module's organizationId or null)
      const fetchedOrgId = (data as any[])[0]?.organizationId ?? null;
      set({ modules: data, isLoading: false, currentOrgId: fetchedOrgId });
    } catch {
      set({ isLoading: false });
    }
  },

  fetchModule: async (id) => {
    set({ isLoading: true });
    try {
      const { data } = await api.get(`/modules/${id}`);
      set({ activeModule: data, isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },

  createModule: async (moduleData) => {
    const { data } = await api.post("/modules", moduleData);
    set((state) => ({ modules: [...state.modules, data] }));
    return data;
  },

  updateModule: async (id, moduleData) => {
    const { data } = await api.patch(`/modules/${id}`, moduleData);
    set((state) => ({
      modules: state.modules.map((m) => (m.id === id ? data : m)),
      activeModule: state.activeModule?.id === id ? data : state.activeModule,
    }));
  },

  deleteModule: async (id) => {
    await api.delete(`/modules/${id}`);
    set((state) => ({
      modules: state.modules.filter((m) => m.id !== id),
      activeModule: state.activeModule?.id === id ? null : state.activeModule,
    }));
  },

  setActiveModule: (module) => set({ activeModule: module }),
}));
