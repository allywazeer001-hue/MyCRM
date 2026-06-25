"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import {
  MessageCircle, X, ChevronLeft, Search, Send, Plus,
  Users, Check, Loader2,
} from "lucide-react";
import { useChatStore, Conversation, ChatMessage, ConvParticipant } from "@/store/chat.store";
import { useAuthStore } from "@/store/auth.store";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

// ── Small helpers ──────────────────────────────────────────────────────────────

function UserAvatar({
  src, name, size = "sm",
}: { src?: string; name: string; size?: "xs" | "sm" | "md" }) {
  const initials = name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
  const cls = size === "xs" ? "w-6 h-6 text-[10px]" : size === "md" ? "w-9 h-9 text-sm" : "w-8 h-8 text-xs";
  if (src)
    return <img src={src} alt={name} className={cn("rounded-full object-cover shrink-0", cls)} />;
  return (
    <div className={cn("rounded-full bg-blue-100 text-blue-700 font-semibold flex items-center justify-center shrink-0 select-none", cls)}>
      {initials}
    </div>
  );
}

function convDisplayName(conv: Conversation, myId: string): string {
  if (conv.isGroup && conv.name) return conv.name;
  const other = conv.participants.find(p => p.userId !== myId);
  return other ? `${other.user.firstName} ${other.user.lastName}` : "Conversation";
}

function convAvatar(conv: Conversation, myId: string) {
  if (conv.isGroup) return undefined;
  return conv.participants.find(p => p.userId !== myId)?.user.avatar;
}

// ── WhatsApp-style tick marks ──────────────────────────────────────────────────

type TickStatus = "sent" | "delivered" | "read";

function MessageTicks({ status }: { status: TickStatus }) {
  const isRead = status === "read";
  const color = isRead ? "#3b82f6" : "#9ca3af";
  if (status === "sent") {
    return (
      <svg width="11" height="10" viewBox="0 0 11 10" fill="none" className="inline-block ml-1 shrink-0">
        <path d="M1 5l3 3.5L10 1" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  return (
    <svg width="17" height="10" viewBox="0 0 17 10" fill="none" className="inline-block ml-1 shrink-0">
      <path d="M1 5l3 3.5 6-7.5" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M7 5l3 3.5 6-7.5"  stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function getMsgTickStatus(
  msg: ChatMessage,
  myId: string,
  conv: Conversation,
  readReceipts: Record<string, string | null>,
): TickStatus {
  const others = conv.participants.filter(p => p.userId !== myId);
  if (others.length === 0) return "sent";
  const allRead = others.every(p => {
    const r = readReceipts[p.userId] ?? null;
    return r && new Date(r) >= new Date(msg.createdAt);
  });
  return allRead ? "read" : "delivered";
}

// ── Typing dots indicator ──────────────────────────────────────────────────────

function TypingDots({ names }: { names: string[] }) {
  if (!names.length) return null;
  const label = names.length === 1 ? `${names[0]} is typing` : `${names[0]} and others are typing`;
  return (
    <div className="flex items-center gap-2 px-3 py-1">
      <div className="flex items-center gap-0.5">
        {[0, 1, 2].map(i => (
          <span key={i} className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"
            style={{ animationDelay: `${i * 0.18}s`, animationDuration: "0.8s" }} />
        ))}
      </div>
      <span className="text-[11px] text-gray-400 italic">{label}…</span>
    </div>
  );
}

// ── New Group Modal ────────────────────────────────────────────────────────────

function NewGroupModal({ onClose }: { onClose: () => void }) {
  const { contacts, createGroup } = useChatStore();
  const [name, setName] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);

  const filtered = contacts.filter(c =>
    `${c.firstName} ${c.lastName}`.toLowerCase().includes(search.toLowerCase()),
  );

  async function submit() {
    if (!name.trim() || selected.length < 1) return;
    setSaving(true);
    try { await createGroup(name.trim(), selected); onClose(); }
    finally { setSaving(false); }
  }

  return (
    <div className="absolute inset-0 bg-white z-10 flex flex-col rounded-2xl overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2.5 border-b border-gray-100">
        <button onClick={onClose} className="p-1 rounded hover:bg-gray-100">
          <ChevronLeft className="w-4 h-4 text-gray-500" />
        </button>
        <span className="text-sm font-semibold text-gray-800 flex-1">New Group</span>
        <button
          onClick={submit}
          disabled={!name.trim() || selected.length < 1 || saving}
          className="px-3 py-1 text-xs font-semibold bg-blue-600 text-white rounded-lg disabled:opacity-40 hover:bg-blue-700 transition-colors"
        >
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Create"}
        </button>
      </div>

      <div className="px-3 pt-2 pb-1 border-b border-gray-50">
        <input className="w-full text-sm border border-gray-200 rounded-lg px-3 py-1.5 outline-none focus:border-blue-400 placeholder-gray-400"
          placeholder="Group name…" value={name} onChange={e => setName(e.target.value)} />
      </div>

      <div className="px-3 pt-2 pb-1">
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input className="w-full text-xs border border-gray-200 rounded-lg pl-7 pr-3 py-1.5 outline-none focus:border-blue-400 placeholder-gray-400"
            placeholder="Search people…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1 px-3 py-1">
          {selected.map(id => {
            const c = contacts.find(x => x.id === id);
            if (!c) return null;
            return (
              <span key={id} className="flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full text-xs font-medium">
                {c.firstName}
                <button onClick={() => setSelected(s => s.filter(x => x !== id))}><X className="w-3 h-3" /></button>
              </span>
            );
          })}
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        {filtered.map(c => (
          <button key={c.id}
            onClick={() => setSelected(s => s.includes(c.id) ? s.filter(x => x !== c.id) : [...s, c.id])}
            className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-gray-50 transition-colors">
            <UserAvatar src={c.avatar} name={`${c.firstName} ${c.lastName}`} size="sm" />
            <span className="flex-1 text-sm text-gray-800 text-left">{c.firstName} {c.lastName}</span>
            {selected.includes(c.id) && <Check className="w-4 h-4 text-blue-600" />}
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Conversation view ──────────────────────────────────────────────────────────

function ConversationView() {
  const { user } = useAuthStore();
  const {
    conversations, activeConversationId, messages, loadingMessages,
    readReceipts, typingUsers, sendMessage, setView, emitTyping, markRead,
  } = useChatStore();
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef  = useRef<HTMLTextAreaElement>(null);
  const typingRef = useRef(false);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const myId = user?.id ?? "";
  const conv  = conversations.find(c => c.id === activeConversationId);
  const msgs  = activeConversationId ? (messages[activeConversationId] ?? []) : [];
  const name  = conv ? convDisplayName(conv, myId) : "";
  const src   = conv ? convAvatar(conv, myId) : undefined;
  const convReceipts = activeConversationId ? (readReceipts[activeConversationId] ?? {}) : {};
  const typingSet = activeConversationId ? (typingUsers[activeConversationId] ?? new Set<string>()) : new Set<string>();

  // Typing names (exclude self)
  const typingNames = conv
    ? Array.from(typingSet)
        .filter(uid => uid !== myId)
        .map(uid => {
          const p = conv.participants.find(p => p.userId === uid);
          return p ? p.user.firstName : "";
        })
        .filter(Boolean)
    : [];

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs.length, typingNames.length]);

  // Mark read when conversation opens
  useEffect(() => {
    if (activeConversationId && myId) markRead(activeConversationId, myId);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeConversationId]);

  const handleTyping = useCallback(() => {
    if (!activeConversationId || !myId) return;
    if (!typingRef.current) {
      typingRef.current = true;
      emitTyping(activeConversationId, myId, true);
    }
    if (typingTimer.current) clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => {
      typingRef.current = false;
      emitTyping(activeConversationId, myId, false);
    }, 1500);
  }, [activeConversationId, myId, emitTyping]);

  async function handleSend() {
    if (!text.trim() || !activeConversationId || sending) return;
    const content = text.trim();
    setText("");
    // Stop typing indicator immediately
    if (typingRef.current && myId) {
      typingRef.current = false;
      emitTyping(activeConversationId, myId, false);
    }
    setSending(true);
    try { await sendMessage(activeConversationId, content); }
    finally { setSending(false); }
    inputRef.current?.focus();
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-2.5 px-3 py-2.5 border-b border-gray-100 bg-white shrink-0">
        <button onClick={() => setView("list")} className="p-1 rounded hover:bg-gray-100 transition-colors shrink-0">
          <ChevronLeft className="w-4 h-4 text-gray-500" />
        </button>
        {conv?.isGroup
          ? <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
              <Users className="w-4 h-4 text-indigo-600" />
            </div>
          : <UserAvatar src={src} name={name} size="sm" />}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-800 truncate">{name}</p>
          {typingNames.length > 0 && (
            <p className="text-[10px] text-blue-500 leading-none">typing…</p>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-1 bg-gray-50">
        {loadingMessages ? (
          <div className="flex justify-center pt-8">
            <Loader2 className="w-5 h-5 text-gray-300 animate-spin" />
          </div>
        ) : msgs.length === 0 ? (
          <p className="text-center text-xs text-gray-400 pt-8">No messages yet. Say hello!</p>
        ) : (
          msgs.map((msg, i) => {
            const isMe = msg.senderId === myId;
            const showSenderAvatar = !isMe && (i === 0 || msgs[i - 1]?.senderId !== msg.senderId);
            const showTime = i === msgs.length - 1 || msgs[i + 1]?.senderId !== msg.senderId;
            const tickStatus = isMe && conv
              ? getMsgTickStatus(msg, myId, conv, convReceipts)
              : "sent";

            return (
              <div key={msg.id} className={cn("flex gap-1.5 items-end", isMe ? "justify-end" : "justify-start")}>
                {/* Other user avatar */}
                {!isMe && (
                  <div className="w-5 shrink-0 flex items-end pb-0.5">
                    {showSenderAvatar && (
                      <UserAvatar src={msg.sender.avatar} name={`${msg.sender.firstName} ${msg.sender.lastName}`} size="xs" />
                    )}
                  </div>
                )}

                <div className={cn("flex flex-col gap-0.5", isMe ? "items-end" : "items-start")}>
                  {/* Sender name (group chats) */}
                  {!isMe && conv?.isGroup && showSenderAvatar && (
                    <span className="text-[10px] text-gray-400 px-1">{msg.sender.firstName}</span>
                  )}

                  {/* Bubble */}
                  <div className={cn(
                    "max-w-[220px] px-3 py-1.5 rounded-2xl text-sm leading-snug",
                    isMe
                      ? "bg-blue-600 text-white rounded-br-sm"
                      : "bg-white text-gray-800 border border-gray-100 rounded-bl-sm shadow-sm",
                  )}>
                    {msg.content}
                  </div>

                  {/* Timestamp + ticks (only on last bubble of a run) */}
                  {showTime && (
                    <div className={cn("flex items-center gap-0.5 px-1", isMe ? "flex-row-reverse" : "flex-row")}>
                      <span className="text-[10px] text-gray-400">
                        {new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                      {isMe && <MessageTicks status={tickStatus} />}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}

        {/* Typing dots (below messages) */}
        {typingNames.length > 0 && (
          <div className="flex gap-1.5 items-end justify-start">
            <div className="w-5 shrink-0" />
            <div className="bg-white border border-gray-100 rounded-2xl rounded-bl-sm shadow-sm px-3 py-2">
              <TypingDots names={typingNames} />
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="border-t border-gray-100 bg-white px-2 py-2 flex items-end gap-1.5 shrink-0">
        <textarea
          ref={inputRef}
          rows={1}
          value={text}
          onChange={e => { setText(e.target.value); handleTyping(); }}
          onKeyDown={handleKey}
          placeholder="Type a message…"
          className="flex-1 resize-none text-sm px-3 py-2 border border-gray-200 rounded-xl outline-none focus:border-blue-400 placeholder-gray-400 max-h-24 overflow-y-auto"
          style={{ lineHeight: "1.4" }}
        />
        <button
          onClick={handleSend}
          disabled={!text.trim() || sending}
          className="p-2 bg-blue-600 rounded-xl text-white hover:bg-blue-700 disabled:opacity-40 transition-colors shrink-0"
        >
          {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
}

// ── Conversations list ─────────────────────────────────────────────────────────

function ConversationsList() {
  const { user } = useAuthStore();
  const {
    conversations, contacts, loadingConversations,
    selectConversation, openDirectMessage, loadContacts,
    setNewGroupOpen, newGroupOpen, unreadCounts,
  } = useChatStore();
  const [tab, setTab]           = useState<"chats" | "contacts">("chats");
  const [search, setSearch]     = useState("");
  const [loadingContacts, setLoadingContacts] = useState(false);
  const myId = user?.id ?? "";

  async function switchToContacts() {
    setTab("contacts");
    if (contacts.length === 0) {
      setLoadingContacts(true);
      try { await loadContacts(); } finally { setLoadingContacts(false); }
    }
  }

  const filteredConvs = conversations.filter(c =>
    convDisplayName(c, myId).toLowerCase().includes(search.toLowerCase()),
  );

  const filteredContacts = contacts.filter(c =>
    `${c.firstName} ${c.lastName}`.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="flex flex-col h-full relative">
      {newGroupOpen && <NewGroupModal onClose={() => setNewGroupOpen(false)} />}

      {/* Header */}
      <div className="flex items-center justify-between px-3 pt-3 pb-2">
        <span className="text-sm font-bold text-gray-800">Messages</span>
        <button onClick={() => setNewGroupOpen(true)} title="New group chat"
          className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors">
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {/* Search */}
      <div className="px-3 pb-2">
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input className="w-full text-xs border border-gray-200 rounded-xl pl-7 pr-3 py-1.5 outline-none focus:border-blue-400 placeholder-gray-400"
            placeholder="Search…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex px-3 border-b border-gray-100 mb-0.5">
        <button onClick={() => setTab("chats")}
          className={cn("flex-1 pb-1.5 text-xs font-semibold capitalize transition-colors border-b-2",
            tab === "chats" ? "text-blue-600 border-blue-600" : "text-gray-400 border-transparent hover:text-gray-600")}>
          Chats
        </button>
        <button onClick={switchToContacts}
          className={cn("flex-1 pb-1.5 text-xs font-semibold capitalize transition-colors border-b-2",
            tab === "contacts" ? "text-blue-600 border-blue-600" : "text-gray-400 border-transparent hover:text-gray-600")}>
          Contacts {contacts.length > 0 && <span className="ml-1 text-[10px] text-gray-400">({contacts.length})</span>}
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {tab === "chats" ? (
          loadingConversations ? (
            <div className="flex justify-center pt-8"><Loader2 className="w-5 h-5 text-gray-300 animate-spin" /></div>
          ) : filteredConvs.length === 0 ? (
            <div className="flex flex-col items-center justify-center pt-10 text-gray-400 gap-2">
              <MessageCircle className="w-8 h-8 opacity-30" />
              <p className="text-xs">No conversations yet</p>
              <button onClick={switchToContacts} className="text-xs text-blue-500 hover:underline">
                Start one from Contacts
              </button>
            </div>
          ) : (
            filteredConvs.map(conv => {
              const name    = convDisplayName(conv, myId);
              const src     = convAvatar(conv, myId);
              const last    = conv.lastMessage;
              const unread  = unreadCounts[conv.id] ?? 0;
              return (
                <button key={conv.id} onClick={() => selectConversation(conv.id, myId)}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 hover:bg-gray-50 transition-colors text-left">
                  {conv.isGroup
                    ? <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
                        <Users className="w-4 h-4 text-indigo-600" />
                      </div>
                    : <UserAvatar src={src} name={name} size="md" />}
                  <div className="flex-1 min-w-0">
                    <p className={cn("text-sm truncate", unread > 0 ? "font-semibold text-gray-900" : "font-medium text-gray-800")}>
                      {name}
                    </p>
                    {last && (
                      <p className={cn("text-xs truncate", unread > 0 ? "text-gray-600 font-medium" : "text-gray-400")}>
                        {last.senderId === myId ? "You: " : ""}{last.content}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    {last && (
                      <span className={cn("text-[10px]", unread > 0 ? "text-blue-500" : "text-gray-400")}>
                        {formatDistanceToNow(new Date(last.createdAt), { addSuffix: false })}
                      </span>
                    )}
                    {unread > 0 && (
                      <span className="min-w-[18px] h-[18px] bg-blue-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 leading-none">
                        {unread > 99 ? "99+" : unread}
                      </span>
                    )}
                  </div>
                </button>
              );
            })
          )
        ) : (
          loadingContacts ? (
            <div className="flex justify-center pt-8"><Loader2 className="w-5 h-5 text-gray-300 animate-spin" /></div>
          ) : filteredContacts.length === 0 ? (
            <div className="flex flex-col items-center justify-center pt-8 gap-2 text-gray-400">
              <p className="text-xs">No contacts found</p>
              <button onClick={switchToContacts} className="text-xs text-blue-500 hover:underline">Retry</button>
            </div>
          ) : (
            filteredContacts.map(c => (
              <button key={c.id} onClick={() => openDirectMessage(c.id)}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 hover:bg-gray-50 transition-colors text-left">
                <UserAvatar src={c.avatar} name={`${c.firstName} ${c.lastName}`} size="md" />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{c.firstName} {c.lastName}</p>
                  {c.jobTitle && <p className="text-xs text-gray-400 truncate">{c.jobTitle}</p>}
                </div>
              </button>
            ))
          )
        )}
      </div>
    </div>
  );
}

// ── ChatPanel (floating entry point) ──────────────────────────────────────────

export function ChatPanel() {
  const { user } = useAuthStore();
  const {
    isOpen, view, toggleOpen, close,
    loadConversations, loadContacts, connectSocket, disconnectSocket,
    contacts, unreadCounts,
  } = useChatStore();

  const totalUnread = Object.values(unreadCounts).reduce((sum, n) => sum + n, 0);

  useEffect(() => {
    if (!user) return;
    connectSocket(user.id);
    loadConversations(user.id);
    loadContacts();
    return () => { disconnectSocket(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // Reload contacts if panel is opened and contacts haven't loaded yet
  useEffect(() => {
    if (isOpen && user && contacts.length === 0) {
      loadContacts();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  if (!user) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col items-end gap-2">
      {/* Panel */}
      {isOpen && (
        <div className="relative w-80 h-[480px] bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden">
          <button onClick={close}
            className="absolute top-2.5 right-3 z-20 p-1 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
            <X className="w-4 h-4" />
          </button>
          {view === "list" ? <ConversationsList /> : <ConversationView />}
        </div>
      )}

      {/* Floating button */}
      <button onClick={toggleOpen}
        className={cn(
          "relative w-12 h-12 rounded-full shadow-lg flex items-center justify-center transition-all",
          isOpen ? "bg-gray-700 hover:bg-gray-800" : "bg-blue-600 hover:bg-blue-700",
        )}>
        {isOpen ? <X className="w-5 h-5 text-white" /> : <MessageCircle className="w-5 h-5 text-white" />}
        {!isOpen && totalUnread > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 leading-none shadow-sm">
            {totalUnread > 99 ? "99+" : totalUnread}
          </span>
        )}
      </button>
    </div>
  );
}
