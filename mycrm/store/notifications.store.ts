"use client";
import { create } from "zustand";
import { api } from "@/lib/api";
import { io, Socket } from "socket.io-client";

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  link?: string;
  isRead: boolean;
  createdAt: string;
  unreadCount?: number;
}

interface NotificationsState {
  notifications: Notification[];
  unreadCount: number;
  fetchNotifications: () => Promise<void>;
  fetchUnreadCount: () => Promise<void>;
  markRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
  pushNotification: (notif: Notification) => void;
  connectSocket: (userId: string, orgId: string) => void;
  disconnectSocket: () => void;
}

// Module-level singleton — sockets are not serializable and must live outside Zustand state
let _socket: Socket | null = null;

// WebSocket URL: use NEXT_PUBLIC_WS_URL if set (production), otherwise derive
// dynamically from the browser's hostname so LAN access works automatically.
// e.g. browser at 192.168.1.55:3000 → WebSocket to 192.168.1.55:4000
function resolveSocketUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_WS_URL;
  // If explicitly set to something other than localhost, use it (production)
  if (explicit && !explicit.includes("localhost")) return explicit;
  // In browser: derive from current hostname + backend port
  if (typeof window !== "undefined") {
    return `${window.location.protocol}//${window.location.hostname}:4000`;
  }
  return explicit || "http://localhost:4000";
}
const SOCKET_URL = resolveSocketUrl();

export const useNotificationsStore = create<NotificationsState>((set, get) => ({
  notifications: [],
  unreadCount: 0,

  fetchNotifications: async () => {
    const { data } = await api.get("/notifications");
    set({ notifications: data });
  },

  fetchUnreadCount: async () => {
    const { data } = await api.get("/notifications/unread-count");
    set({ unreadCount: data });
  },

  markRead: async (id) => {
    await api.patch(`/notifications/${id}/read`);
    set((state) => ({
      notifications: state.notifications.map((n) =>
        n.id === id ? { ...n, isRead: true } : n
      ),
      unreadCount: Math.max(0, state.unreadCount - 1),
    }));
  },

  markAllRead: async () => {
    await api.patch("/notifications/read-all");
    set((state) => ({
      notifications: state.notifications.map((n) => ({ ...n, isRead: true })),
      unreadCount: 0,
    }));
  },

  pushNotification: (notif) => {
    set((state) => ({
      notifications: [{ ...notif, isRead: false }, ...state.notifications],
      unreadCount: notif.unreadCount ?? state.unreadCount + 1,
    }));
  },

  connectSocket: (userId, orgId) => {
    if (_socket?.connected) return;

    _socket = io(SOCKET_URL, { transports: ["websocket"], reconnection: true });

    _socket.on("connect", () => {
      _socket!.emit("join-user", userId);
      _socket!.emit("join-org", orgId);
    });

    _socket.on("notification:new", (notif: Notification) => {
      get().pushNotification(notif);
    });
  },

  disconnectSocket: () => {
    _socket?.disconnect();
    _socket = null;
  },
}));

// Shared access to the underlying socket for other real-time listeners
// (e.g. blueprint stage-change events) — sockets can't live in Zustand state.
export function getSocket(): Socket | null {
  return _socket;
}
