"use client";
import { useEffect, useState } from "react";
import { PortalShell } from "@/components/portal/portal-shell";
import { portalApi } from "@/lib/portal-api";
import {
  Loader2, CheckCircle, Info, AlertTriangle, XCircle, BellOff, Check,
  Bell, Megaphone, AlertCircle,
} from "lucide-react";

type Tab = "unread" | "all" | "announcements";

function NotifIcon({ type }: { type: string }) {
  const cls = "w-5 h-5 shrink-0 mt-0.5";
  if (type === "success" || type === "announcement") return <CheckCircle className={`${cls} text-green-500`} />;
  if (type === "warning")  return <AlertTriangle className={`${cls} text-yellow-500`} />;
  if (type === "error")    return <XCircle className={`${cls} text-red-500`} />;
  if (type === "urgent")   return <AlertCircle className={`${cls} text-red-500`} />;
  return <Info className={`${cls} text-blue-500`} />;
}

const ANN_TYPE_COLORS: Record<string, string> = {
  general:     "bg-blue-50 text-blue-700",
  maintenance: "bg-amber-50 text-amber-700",
  update:      "bg-green-50 text-green-700",
  urgent:      "bg-red-50 text-red-700",
};

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function PortalNotificationsPage() {
  const [tab, setTab] = useState<Tab>("unread");
  const [notifications, setNotifications] = useState<any[]>([]);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingAnn, setLoadingAnn] = useState(false);
  const [markingAll, setMarkingAll] = useState(false);

  const fetchNotifs = async (p = 1) => {
    setLoading(true);
    try {
      const { data } = await portalApi.get(`/portal/notifications?page=${p}&limit=20`);
      setNotifications(p === 1 ? data.notifications : (prev: any[]) => [...prev, ...data.notifications]);
      setUnreadCount(data.unreadCount ?? 0);
      setTotal(data.total ?? 0);
      setPage(p);
    } catch {}
    setLoading(false);
  };

  const fetchAnnouncements = async () => {
    setLoadingAnn(true);
    try {
      const { data } = await portalApi.get("/portal/announcements");
      setAnnouncements(data);
    } catch {}
    setLoadingAnn(false);
  };

  useEffect(() => { fetchNotifs(1); }, []);
  useEffect(() => { if (tab === "announcements") fetchAnnouncements(); }, [tab]);

  const markRead = async (id: string) => {
    try {
      await portalApi.patch(`/portal/notifications/${id}/read`);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
      setUnreadCount(c => Math.max(0, c - 1));
    } catch {}
  };

  const markAllRead = async () => {
    setMarkingAll(true);
    try {
      await portalApi.patch("/portal/notifications/read-all");
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch {}
    setMarkingAll(false);
  };

  const displayed = tab === "unread"
    ? notifications.filter(n => !n.isRead)
    : notifications;

  const TABS: { key: Tab; label: string; count?: number }[] = [
    { key: "unread", label: "Unread", count: unreadCount },
    { key: "all",    label: "All" },
    { key: "announcements", label: "Announcements" },
  ];

  return (
    <PortalShell>
      <div className="max-w-2xl mx-auto space-y-5">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Notifications</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {unreadCount > 0 ? `${unreadCount} unread` : "All caught up"}
            </p>
          </div>
          {unreadCount > 0 && tab !== "announcements" && (
            <button onClick={markAllRead} disabled={markingAll} className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors font-medium">
              {markingAll ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              Mark all read
            </button>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
          {TABS.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)} className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-sm font-medium transition-colors ${tab === t.key ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
              {t.key === "announcements" ? <Megaphone className="w-3.5 h-3.5" /> : <Bell className="w-3.5 h-3.5" />}
              {t.label}
              {t.count !== undefined && t.count > 0 && (
                <span className="bg-red-500 text-white text-xs rounded-full px-1.5 leading-5">{t.count}</span>
              )}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          {tab === "announcements" ? (
            loadingAnn ? (
              <div className="flex items-center justify-center h-32"><Loader2 className="w-6 h-6 animate-spin text-indigo-500" /></div>
            ) : announcements.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <Megaphone className="w-8 h-8 text-gray-300" />
                <p className="text-sm text-gray-500">No announcements right now</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {announcements.map((ann: any) => (
                  <div key={ann.id} className="px-5 py-4">
                    <div className="flex items-start gap-3">
                      <Megaphone className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <p className="text-sm font-semibold text-gray-800">{ann.title}</p>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ANN_TYPE_COLORS[ann.type] ?? "bg-gray-100 text-gray-600"}`}>{ann.type}</span>
                        </div>
                        <p className="text-sm text-gray-600">{ann.body}</p>
                        <p className="text-xs text-gray-400 mt-1.5">{timeAgo(ann.publishedAt)}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : (
            loading && notifications.length === 0 ? (
              <div className="flex items-center justify-center h-32"><Loader2 className="w-6 h-6 animate-spin text-indigo-500" /></div>
            ) : displayed.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center">
                  <BellOff className="w-6 h-6 text-gray-400" />
                </div>
                <p className="text-sm text-gray-500">{tab === "unread" ? "No unread notifications" : "No notifications yet"}</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {displayed.map((n: any) => (
                  <div key={n.id} className={`flex items-start gap-3 px-5 py-4 transition-colors ${!n.isRead ? "bg-indigo-50/50" : "hover:bg-gray-50"}`}>
                    <NotifIcon type={n.type} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className={`text-sm font-medium truncate ${!n.isRead ? "text-gray-900" : "text-gray-700"}`}>{n.title}</p>
                        {!n.isRead && <span className="w-2 h-2 rounded-full bg-indigo-500 shrink-0" />}
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">{n.body}</p>
                      <p className="text-xs text-gray-400 mt-1">{timeAgo(n.createdAt)}</p>
                    </div>
                    {!n.isRead && (
                      <button onClick={() => markRead(n.id)} className="shrink-0 p-1.5 rounded-md text-gray-400 hover:text-indigo-600 hover:bg-indigo-100 transition-colors" title="Mark as read">
                        <Check className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
                {tab === "all" && notifications.length < total && (
                  <div className="px-5 py-4 text-center">
                    <button onClick={() => fetchNotifs(page + 1)} disabled={loading} className="text-sm text-indigo-600 hover:underline font-medium disabled:opacity-50">
                      {loading ? "Loading..." : "Load more"}
                    </button>
                  </div>
                )}
              </div>
            )
          )}
        </div>
      </div>
    </PortalShell>
  );
}
