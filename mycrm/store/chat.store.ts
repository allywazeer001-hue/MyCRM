"use client";
import { create } from "zustand";
import { api } from "@/lib/api";
import { io, Socket } from "socket.io-client";

export interface ChatContact {
  id: string;
  firstName: string;
  lastName: string;
  avatar?: string;
  jobTitle?: string;
  status?: string;
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  createdAt: string;
  deletedAt?: string | null;
  sender: { id: string; firstName: string; lastName: string; avatar?: string };
}

export interface ConvParticipant {
  id: string;
  userId: string;
  lastReadAt: string | null;
  user: { id: string; firstName: string; lastName: string; avatar?: string };
}

export interface Conversation {
  id: string;
  name?: string;
  isGroup: boolean;
  createdById: string;
  participants: ConvParticipant[];
  lastMessage?: ChatMessage | null;
  updatedAt: string;
}

// readReceipts[conversationId][userId] = ISO lastReadAt string
type ReadReceipts = Record<string, Record<string, string | null>>;
// typingUsers[conversationId] = Set of userIds currently typing
type TypingUsers = Record<string, Set<string>>;

interface ChatState {
  isOpen: boolean;
  view: "list" | "conversation";
  conversations: Conversation[];
  activeConversationId: string | null;
  messages: Record<string, ChatMessage[]>;
  contacts: ChatContact[];
  loadingConversations: boolean;
  loadingMessages: boolean;
  newGroupOpen: boolean;
  readReceipts: ReadReceipts;
  typingUsers: TypingUsers;
  unreadCounts: Record<string, number>;

  toggleOpen: () => void;
  close: () => void;
  setView: (v: "list" | "conversation") => void;
  setNewGroupOpen: (v: boolean) => void;

  loadContacts: () => Promise<void>;
  loadConversations: (myUserId?: string) => Promise<void>;
  openDirectMessage: (targetUserId: string) => Promise<void>;
  createGroup: (name: string, participantIds: string[]) => Promise<void>;
  selectConversation: (id: string, myUserId: string) => void;
  loadMessages: (conversationId: string) => Promise<void>;
  sendMessage: (conversationId: string, content: string) => Promise<void>;
  pushMessage: (msg: ChatMessage) => void;
  markRead: (conversationId: string, myUserId: string) => Promise<void>;
  emitTyping: (conversationId: string, myUserId: string, isTyping: boolean) => void;
  setTyping: (conversationId: string, userId: string, isTyping: boolean) => void;
  updateReadReceipt: (conversationId: string, userId: string, lastReadAt: string) => void;
  connectSocket: (userId: string) => void;
  disconnectSocket: () => void;
}

let _socket: Socket | null = null;
// Typing-clear timers per user per conversation
const _typingTimers = new Map<string, ReturnType<typeof setTimeout>>();

function resolveSocketUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_WS_URL;
  if (explicit && !explicit.includes("localhost")) return explicit;
  if (typeof window !== "undefined") {
    return `${window.location.protocol}//${window.location.hostname}:4000`;
  }
  return explicit || "http://localhost:4000";
}

export const useChatStore = create<ChatState>((set, get) => ({
  isOpen: false,
  view: "list",
  conversations: [],
  activeConversationId: null,
  messages: {},
  contacts: [],
  loadingConversations: false,
  loadingMessages: false,
  newGroupOpen: false,
  readReceipts: {},
  typingUsers: {},
  unreadCounts: {},

  toggleOpen: () => set(s => ({ isOpen: !s.isOpen })),
  close: () => set({ isOpen: false }),
  setView: (view) => set({ view }),
  setNewGroupOpen: (v) => set({ newGroupOpen: v }),

  loadContacts: async () => {
    try {
      const { data } = await api.get("/messages/contacts");
      set({ contacts: Array.isArray(data) ? data : [] });
    } catch (err) {
      console.error("[chat] loadContacts failed:", err);
    }
  },

  loadConversations: async (myUserId?: string) => {
    set({ loadingConversations: true });
    try {
      const { data } = await api.get("/messages/conversations");
      const receipts: ReadReceipts = {};
      const unread: Record<string, number> = {};
      for (const conv of data as Conversation[]) {
        receipts[conv.id] = {};
        for (const p of conv.participants) {
          receipts[conv.id][p.userId] = p.lastReadAt ?? null;
        }
        // Seed initial unread: 1 if last message is after my lastReadAt
        if (myUserId && conv.lastMessage) {
          const myLastRead = conv.participants.find(p => p.userId === myUserId)?.lastReadAt ?? null;
          const lastMsgTime = new Date(conv.lastMessage.createdAt).getTime();
          const readTime = myLastRead ? new Date(myLastRead).getTime() : 0;
          if (lastMsgTime > readTime && conv.lastMessage.senderId !== myUserId) {
            unread[conv.id] = 1; // "has unread" on load; exact count grows via pushMessage
          }
        }
      }
      set(s => ({
        conversations: data,
        readReceipts: { ...s.readReceipts, ...receipts },
        unreadCounts: { ...s.unreadCounts, ...unread },
      }));
    } finally {
      set({ loadingConversations: false });
    }
  },

  openDirectMessage: async (targetUserId) => {
    const { data } = await api.post("/messages/conversations/direct", { targetUserId });
    set(s => {
      const exists = s.conversations.find(c => c.id === data.id);
      const updated = exists
        ? s.conversations.map(c => (c.id === data.id ? data : c))
        : [data, ...s.conversations];
      return {
        conversations: updated,
        activeConversationId: data.id,
        view: "conversation",
        isOpen: true,
        unreadCounts: { ...s.unreadCounts, [data.id]: 0 },
      };
    });
    await get().loadMessages(data.id);
  },

  createGroup: async (name, participantIds) => {
    const { data } = await api.post("/messages/conversations/group", { name, participantIds });
    set(s => ({
      conversations: [data, ...s.conversations],
      activeConversationId: data.id,
      view: "conversation",
      newGroupOpen: false,
      unreadCounts: { ...s.unreadCounts, [data.id]: 0 },
    }));
    await get().loadMessages(data.id);
  },

  selectConversation: (id, myUserId) => {
    set(s => ({
      activeConversationId: id,
      view: "conversation",
      unreadCounts: { ...s.unreadCounts, [id]: 0 },
    }));
    get().loadMessages(id);
    get().markRead(id, myUserId);
  },

  loadMessages: async (conversationId) => {
    set({ loadingMessages: true });
    try {
      const { data } = await api.get(`/messages/conversations/${conversationId}/messages`);
      set(s => ({ messages: { ...s.messages, [conversationId]: data.messages } }));
      _socket?.emit("chat:join", conversationId);
    } finally {
      set({ loadingMessages: false });
    }
  },

  sendMessage: async (conversationId, content) => {
    const { data } = await api.post(`/messages/conversations/${conversationId}/messages`, { content });
    // Dedup guard: only add if not already in state
    set(s => {
      const existing = s.messages[conversationId] ?? [];
      if (existing.some(m => m.id === data.id)) return s;
      return {
        messages: { ...s.messages, [conversationId]: [...existing, data] },
        conversations: s.conversations.map(c =>
          c.id === conversationId ? { ...c, lastMessage: data, updatedAt: data.createdAt } : c
        ),
      };
    });
  },

  pushMessage: (msg) => {
    set(s => {
      const existing = s.messages[msg.conversationId] ?? [];
      if (existing.some(m => m.id === msg.id)) return s;
      // Only count as unread when this conversation isn't currently open
      const isActiveAndOpen = s.isOpen && s.activeConversationId === msg.conversationId;
      return {
        messages: { ...s.messages, [msg.conversationId]: [...existing, msg] },
        conversations: s.conversations.map(c =>
          c.id === msg.conversationId ? { ...c, lastMessage: msg, updatedAt: msg.createdAt } : c
        ),
        unreadCounts: isActiveAndOpen
          ? s.unreadCounts
          : { ...s.unreadCounts, [msg.conversationId]: (s.unreadCounts[msg.conversationId] ?? 0) + 1 },
      };
    });
  },

  markRead: async (conversationId, myUserId) => {
    try {
      await api.patch(`/messages/conversations/${conversationId}/read`);
      const now = new Date().toISOString();
      get().updateReadReceipt(conversationId, myUserId, now);
      set(s => ({ unreadCounts: { ...s.unreadCounts, [conversationId]: 0 } }));
      _socket?.emit("chat:read", { conversationId, userId: myUserId, lastReadAt: now });
    } catch { /* noop */ }
  },

  emitTyping: (conversationId, myUserId, isTyping) => {
    _socket?.emit("chat:typing", { conversationId, userId: myUserId, isTyping });
  },

  setTyping: (conversationId, userId, isTyping) => {
    const key = `${conversationId}:${userId}`;
    // Clear existing timer
    const t = _typingTimers.get(key);
    if (t) clearTimeout(t);

    set(s => {
      const prev = new Set(s.typingUsers[conversationId] ?? []);
      if (isTyping) {
        prev.add(userId);
      } else {
        prev.delete(userId);
      }
      return { typingUsers: { ...s.typingUsers, [conversationId]: prev } };
    });

    // Auto-clear after 3s (in case stop event is lost)
    if (isTyping) {
      _typingTimers.set(key, setTimeout(() => {
        set(s => {
          const prev = new Set(s.typingUsers[conversationId] ?? []);
          prev.delete(userId);
          return { typingUsers: { ...s.typingUsers, [conversationId]: prev } };
        });
        _typingTimers.delete(key);
      }, 3000));
    }
  },

  updateReadReceipt: (conversationId, userId, lastReadAt) => {
    set(s => ({
      readReceipts: {
        ...s.readReceipts,
        [conversationId]: { ...(s.readReceipts[conversationId] ?? {}), [userId]: lastReadAt },
      },
    }));
  },

  connectSocket: (userId) => {
    if (_socket?.connected) return;
    _socket = io(resolveSocketUrl(), { transports: ["websocket"], reconnection: true });
    _socket.on("connect", () => {
      _socket!.emit("join-user", userId);
    });
    _socket.on("chat:message", (msg: ChatMessage) => {
      get().pushMessage(msg);
    });
    _socket.on("chat:typing", (data: { conversationId: string; userId: string; isTyping: boolean }) => {
      get().setTyping(data.conversationId, data.userId, data.isTyping);
    });
    _socket.on("chat:read", (data: { conversationId: string; userId: string; lastReadAt: string }) => {
      get().updateReadReceipt(data.conversationId, data.userId, data.lastReadAt);
    });
  },

  disconnectSocket: () => {
    _socket?.disconnect();
    _socket = null;
  },
}));
