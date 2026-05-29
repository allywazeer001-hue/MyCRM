import { create } from "zustand";
import { api } from "@/lib/api";
import { useAuthStore } from "./auth.store";

interface SystemPerms {
  canDashboard: boolean;
  canAnalytics: boolean;
  canWorkflow: boolean;
  canForms: boolean;
  canStudio: boolean;
}

interface ModulePerms {
  canView: boolean;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canExport: boolean;
  canImport: boolean;
  canPrint: boolean;
}

interface PermissionsState {
  loaded: boolean;
  isAdmin: boolean;
  system: SystemPerms;
  modules: Record<string, ModulePerms>;
  loadPermissions: () => Promise<void>;
  reset: () => void;
  canView:   (slug: string) => boolean;
  canCreate: (slug: string) => boolean;
  canEdit:   (slug: string) => boolean;
  canDelete: (slug: string) => boolean;
  canExport: (slug: string) => boolean;
  canImport: (slug: string) => boolean;
  canPrint:  (slug: string) => boolean;
}

const ALL_ON: SystemPerms = {
  canDashboard: true, canAnalytics: true, canWorkflow: true,
  canForms: true, canStudio: true,
};

function getIsSuperAdmin(): boolean {
  const user = useAuthStore.getState().user as any;
  return user?.role === 'SUPER_ADMIN';
}

export const usePermissionsStore = create<PermissionsState>((set, get) => ({
  loaded: false,
  isAdmin: false,
  system: ALL_ON,
  modules: {},

  loadPermissions: async () => {
    try {
      const { data } = await api.get("/users/me/permissions");
      set({
        loaded: true,
        isAdmin: data.isAdmin || getIsSuperAdmin(),
        system: data.system ?? ALL_ON,
        modules: data.modules ?? {},
      });
    } catch {
      // Fail open — don't block access on API error
      set({ loaded: true, isAdmin: true, system: ALL_ON, modules: {} });
    }
  },

  reset: () => set({ loaded: false, isAdmin: false, system: ALL_ON, modules: {} }),

  canView: (slug) => {
    if (getIsSuperAdmin()) return true;
    const { isAdmin, modules } = get();
    if (isAdmin) return true;
    return modules[slug]?.canView ?? true;
  },

  canCreate: (slug) => {
    if (getIsSuperAdmin()) return true;
    const { isAdmin, modules } = get();
    if (isAdmin) return true;
    return modules[slug]?.canCreate ?? false;
  },

  canEdit: (slug) => {
    if (getIsSuperAdmin()) return true;
    const { isAdmin, modules } = get();
    if (isAdmin) return true;
    return modules[slug]?.canEdit ?? false;
  },

  canDelete: (slug) => {
    if (getIsSuperAdmin()) return true;
    const { isAdmin, modules } = get();
    if (isAdmin) return true;
    return modules[slug]?.canDelete ?? false;
  },

  canExport: (slug) => {
    if (getIsSuperAdmin()) return true;
    const { isAdmin, modules } = get();
    if (isAdmin) return true;
    return modules[slug]?.canExport ?? false;
  },

  canImport: (slug) => {
    if (getIsSuperAdmin()) return true;
    const { isAdmin, modules } = get();
    if (isAdmin) return true;
    return modules[slug]?.canImport ?? false;
  },

  canPrint: (slug) => {
    if (getIsSuperAdmin()) return true;
    const { isAdmin, modules } = get();
    if (isAdmin) return true;
    return modules[slug]?.canPrint ?? true;
  },
}));
