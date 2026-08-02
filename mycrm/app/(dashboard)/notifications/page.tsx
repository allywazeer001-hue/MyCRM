"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, CheckCheck, ArrowRight, ExternalLink } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useNotificationsStore } from "@/store/notifications.store";
import { formatDateTime } from "@/lib/utils";
import { cn } from "@/lib/utils";

type Tab = "unread" | "all" | "system";

const TYPE_STYLES: Record<string, string> = {
  INFO:     "bg-blue-50 border-blue-200 text-blue-700",
  SUCCESS:  "bg-green-50 border-green-200 text-green-700",
  WARNING:  "bg-yellow-50 border-yellow-200 text-yellow-700",
  ERROR:    "bg-red-50 border-red-200 text-red-700",
  WORKFLOW: "bg-purple-50 border-purple-200 text-purple-700",
  SYSTEM:   "bg-gray-50 border-gray-200 text-gray-700",
};

const TYPE_DOT: Record<string, string> = {
  SUCCESS:  "bg-emerald-500",
  WARNING:  "bg-amber-500",
  ERROR:    "bg-red-500",
  WORKFLOW: "bg-purple-500",
};

const TABS: { id: Tab; label: string }[] = [
  { id: "all",    label: "All" },
  { id: "unread", label: "Unread" },
  { id: "system", label: "System" },
];

export default function NotificationsPage() {
  const router = useRouter();
  const { notifications, unreadCount, fetchNotifications, markRead, markAllRead } =
    useNotificationsStore();
  const [tab, setTab] = useState<Tab>("unread");

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const handleClick = async (notif: { id: string; isRead: boolean; link?: string }) => {
    if (!notif.isRead) await markRead(notif.id);
    if (notif.link) router.push(notif.link);
  };

  const filtered = notifications.filter((n) => {
    if (tab === "unread") return !n.isRead;
    if (tab === "system") return n.type === "SYSTEM" || n.type === "ERROR" || n.type === "WARNING";
    return true;
  });

  const tabUnread = notifications.filter((n) => !n.isRead).length;

  // Group consecutive notifications that have the SAME title, type AND link within 10 minutes.
  // Notifications with different links are never grouped (each is about a different record).
  type SingleNotif = typeof filtered[0];
  type GroupedItem =
    | { kind: "single"; notif: SingleNotif }
    | { kind: "group"; title: string; type: string; count: number; ids: string[]; isRead: boolean; createdAt: string; link?: string };

  const grouped: GroupedItem[] = [];
  for (const notif of filtered) {
    const prev = grouped[grouped.length - 1];
    const tenMin = 10 * 60 * 1000;
    const sameGroup = (a: { title: string; type: string; link?: string; createdAt: string }, b: SingleNotif) =>
      a.title === b.title && a.type === b.type && (a.link ?? "") === (b.link ?? "") &&
      Math.abs(new Date(b.createdAt).getTime() - new Date(a.createdAt ?? b.createdAt).getTime()) < tenMin;

    if (prev?.kind === "group" && sameGroup(prev, notif)) {
      prev.count += 1;
      prev.ids.push(notif.id);
      if (!notif.isRead) prev.isRead = false;
    } else if (prev?.kind === "single" && sameGroup({ title: prev.notif.title, type: prev.notif.type, link: prev.notif.link, createdAt: prev.notif.createdAt }, notif)) {
      grouped[grouped.length - 1] = {
        kind: "group",
        title: notif.title,
        type: notif.type,
        count: 2,
        ids: [prev.notif.id, notif.id],
        isRead: prev.notif.isRead && notif.isRead,
        createdAt: prev.notif.createdAt,
        link: notif.link,
      };
    } else {
      grouped.push({ kind: "single", notif });
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
          <p className="text-gray-500 mt-1">
            {unreadCount > 0
              ? `${unreadCount} unread notification${unreadCount !== 1 ? "s" : ""}`
              : "All caught up!"}
          </p>
        </div>
        {unreadCount > 0 && (
          <Button variant="outline" size="sm" onClick={markAllRead} className="gap-2">
            <CheckCheck className="w-4 h-4" />
            Mark all read
          </Button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              "px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors",
              tab === t.id
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            )}
          >
            {t.label}
            {t.id === "unread" && tabUnread > 0 && (
              <span className="ml-1.5 inline-flex items-center justify-center px-1.5 py-0.5 rounded-full text-xs bg-blue-100 text-blue-700">
                {tabUnread}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* List */}
      <Card>
        <CardContent className="p-0">
          {grouped.length === 0 ? (
            <div className="text-center py-16">
              <Bell className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-sm font-medium text-gray-900 mb-1">No notifications</h3>
              <p className="text-sm text-gray-500">
                {tab === "unread" ? "You're all caught up!" : "Nothing here yet."}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {grouped.map((item, idx) => {
                if (item.kind === "group") {
                  const handleGroupClick = async () => {
                    await Promise.all(item.ids.map(gid => markRead(gid).catch(() => {})));
                    if (item.link) router.push(item.link);
                  };
                  return (
                    <div
                      key={`g-${idx}`}
                      onClick={handleGroupClick}
                      className={cn(
                        "flex items-start gap-4 p-4 transition-colors",
                        item.link ? "cursor-pointer hover:bg-gray-50" : "cursor-default",
                        !item.isRead && "bg-blue-50/40"
                      )}
                    >
                      <div className={cn(
                        "w-2 h-2 rounded-full mt-2 shrink-0",
                        item.isRead ? "bg-gray-300" : (TYPE_DOT[item.type] ?? "bg-blue-500")
                      )} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className={cn("text-sm font-medium", item.isRead ? "text-gray-600" : "text-gray-900")}>
                            {item.count} notifications · {item.title}
                          </p>
                          <Badge variant="outline" className={cn("text-xs shrink-0 mt-0.5", TYPE_STYLES[item.type] ?? TYPE_STYLES.INFO)}>
                            {item.type}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-500 mt-0.5">{item.count} similar notifications</p>
                        <div className="flex items-center gap-3 mt-1.5">
                          <p className="text-xs text-gray-400">{formatDateTime(item.createdAt)}</p>
                          {item.link && (
                            <span className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-800">
                              <ExternalLink className="w-3 h-3" /> View record
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                }

                const notif = item.notif;
                return (
                  <div
                    key={notif.id}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => e.key === "Enter" && handleClick(notif)}
                    onClick={() => handleClick(notif)}
                    className={cn(
                      "flex items-start gap-4 p-4 transition-colors",
                      notif.link ? "cursor-pointer hover:bg-gray-50" : "cursor-default",
                      !notif.isRead && "bg-blue-50/40"
                    )}
                  >
                    <div className={cn(
                      "w-2 h-2 rounded-full mt-2 shrink-0",
                      notif.isRead ? "bg-gray-300" : (TYPE_DOT[notif.type] ?? "bg-blue-500")
                    )} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className={cn("text-sm font-semibold", notif.isRead ? "text-gray-600" : "text-gray-900")}>
                          {notif.title}
                        </p>
                        <Badge variant="outline" className={cn("text-xs shrink-0 mt-0.5", TYPE_STYLES[notif.type] ?? TYPE_STYLES.INFO)}>
                          {notif.type}
                        </Badge>
                      </div>

                      {notif.message && (
                        <p className="text-sm text-gray-600 mt-1 leading-relaxed">{notif.message}</p>
                      )}

                      <div className="flex items-center gap-3 mt-1.5">
                        <p className="text-xs text-gray-400">{formatDateTime(notif.createdAt)}</p>
                        {notif.link && (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 group-hover:text-blue-800">
                            <ArrowRight className="w-3 h-3" /> View record
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
