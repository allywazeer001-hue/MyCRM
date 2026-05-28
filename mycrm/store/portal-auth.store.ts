"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { portalApi } from "@/lib/portal-api";

interface PortalUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  type: string;
  accountStatus: string;
  profilePicture?: string;
  organizationId: string;
  moduleId?: string;
  recordId?: string;
  isEmailVerified: boolean;
  lastLoginAt?: string;
  isPortalAdmin?: boolean;
  portalRole?: string;
}

interface PortalAuthState {
  user: PortalUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  // First-login activation state
  requiresPasswordChange: boolean;
  changeToken: string | null;
  pendingUser: PortalUser | null;
  login: (email: string, password: string, orgSlug?: string) => Promise<{ requiresPasswordChange?: boolean }>;
  activate: (changeToken: string, newPassword: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => void;
  setUser: (user: PortalUser) => void;
  refreshUser: () => Promise<void>;
  clearActivationState: () => void;
}

interface RegisterData {
  email: string; password: string; firstName: string; lastName: string;
  phone?: string; type?: string; orgSlug?: string;
}

export const usePortalAuthStore = create<PortalAuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      requiresPasswordChange: false,
      changeToken: null,
      pendingUser: null,

      login: async (email, password, orgSlug) => {
        set({ isLoading: true });
        try {
          const { data } = await portalApi.post("/portal/auth/login", { email, password, orgSlug });

          if (data.requiresPasswordChange) {
            // Store changeToken + pending user, do NOT grant full access yet
            set({
              requiresPasswordChange: true,
              changeToken: data.changeToken,
              pendingUser: data.user,
              isLoading: false,
            });
            return { requiresPasswordChange: true };
          }

          localStorage.setItem("portal-access-token", data.accessToken);
          localStorage.setItem("portal-refresh-token", data.refreshToken);
          set({
            user: data.user,
            isAuthenticated: true,
            isLoading: false,
            requiresPasswordChange: false,
            changeToken: null,
            pendingUser: null,
          });
          return {};
        } catch (err) {
          set({ isLoading: false });
          throw err;
        }
      },

      activate: async (changeToken, newPassword) => {
        set({ isLoading: true });
        try {
          const { data } = await portalApi.post("/portal/auth/activate", { changeToken, newPassword });
          localStorage.setItem("portal-access-token", data.accessToken);
          localStorage.setItem("portal-refresh-token", data.refreshToken);
          set({
            user: data.user,
            isAuthenticated: true,
            isLoading: false,
            requiresPasswordChange: false,
            changeToken: null,
            pendingUser: null,
          });
        } catch (err) {
          set({ isLoading: false });
          throw err;
        }
      },

      register: async (dto) => {
        set({ isLoading: true });
        try {
          const { data } = await portalApi.post("/portal/auth/register", dto);
          localStorage.setItem("portal-access-token", data.accessToken);
          localStorage.setItem("portal-refresh-token", data.refreshToken);
          set({ user: data.user, isAuthenticated: true, isLoading: false });
        } catch (err) {
          set({ isLoading: false });
          throw err;
        }
      },

      logout: () => {
        localStorage.removeItem("portal-access-token");
        localStorage.removeItem("portal-refresh-token");
        set({
          user: null, isAuthenticated: false,
          requiresPasswordChange: false, changeToken: null, pendingUser: null,
        });
        window.location.href = "/portal/login";
      },

      setUser: (user) => set({ user }),

      refreshUser: async () => {
        try {
          const { data } = await portalApi.get("/portal/me");
          set({ user: data });
        } catch {}
      },

      clearActivationState: () => {
        set({ requiresPasswordChange: false, changeToken: null, pendingUser: null });
      },
    }),
    {
      name: "portal-auth",
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        requiresPasswordChange: state.requiresPasswordChange,
        changeToken: state.changeToken,
        pendingUser: state.pendingUser,
      }),
    }
  )
);
