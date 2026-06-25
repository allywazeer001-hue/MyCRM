"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";

type ViewType = "table" | "kanban" | "gallery" | "list" | "calendar";

interface ViewState {
  moduleViews: Record<string, ViewType>;
  setModuleView: (slug: string, view: ViewType) => void;
  getModuleView: (slug: string) => ViewType;
}

export const useViewStore = create<ViewState>()(
  persist(
    (set, get) => ({
      moduleViews: {},

      setModuleView: (slug, view) =>
        set((state) => ({
          moduleViews: { ...state.moduleViews, [slug]: view },
        })),

      getModuleView: (slug) => get().moduleViews[slug] ?? "table",
    }),
    {
      name: "crm-view-prefs",
      partialize: (state) => ({ moduleViews: state.moduleViews }),
    }
  )
);
