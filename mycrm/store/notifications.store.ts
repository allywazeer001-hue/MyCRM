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

const SOCKET_URL =
  (process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1")
    .replace(/\/api\/v1\/?$/, "");

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
