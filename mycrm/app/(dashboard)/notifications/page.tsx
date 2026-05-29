"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, CheckCheck } from "lucide-react";
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

const TABS: { id: Tab; label: string }[] = [
  { id: "all",    label: "All" },
  { id: "unread", label: "Unread" },
  { id: "system", label: "System" },
];

export default function NotificationsPage() {
  const router = useRouter();
  const { notifications, unreadCount, fetchNotifications, markRead, markAllRead } =
    useNotificationsStore();
  const [tab, setTab] = useState<Tab>("all");

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

  // Group consecutive notifications with same title+type within 10 minutes
  type GroupedItem =
    | { kind: "single"; notif: typeof filtered[0] }
    | { kind: "group"; title: string; type: string; count: number; ids: string[]; isRead: boolean; createdAt: string };

  const grouped: GroupedItem[] = [];
  for (const notif of filtered) {
    const prev = grouped[grouped.length - 1];
    const tenMin = 10 * 60 * 1000;
    if (
      prev?.kind === "group" &&
      prev.title === notif.title &&
      prev.type === notif.type &&
      Math.abs(new Date(notif.createdAt).getTime() - new Date(prev.createdAt).getTime()) < tenMin
    ) {
      prev.count += 1;
      prev.ids.push(notif.id);
      if (!notif.isRead) prev.isRead = false;
    } else if (
      prev?.kind === "single" &&
      prev.notif.title === notif.title &&
      prev.notif.type === notif.type &&
      Math.abs(new Date(notif.createdAt).getTime() - new Date(prev.notif.createdAt).getTime()) < tenMin
    ) {
      // Promote single → group
      grouped[grouped.length - 1] = {
        kind: "group",
        title: notif.title,
        type: notif.type,
        count: 2,
        ids: [prev.notif.id, notif.id],
        isRead: prev.notif.isRead && notif.isRead,
        createdAt: prev.notif.createdAt,
      };
    } else {
      grouped.push({ kind: "single", notif });
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
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
                    for (const gid of item.ids) {
                      if (!item.isRead) await markRead(gid).catch(() => {});
                    }
                  };
                  return (
                    <div
                      key={`g-${idx}`}
                      className={cn(
                        "flex items-start gap-4 p-4 transition-colors cursor-pointer hover:bg-gray-50",
                        !item.isRead && "bg-blue-50/40"
                      )}
                      onClick={handleGroupClick}
                    >
                      <div className={cn("w-2 h-2 rounded-full mt-2 shrink-0", item.isRead ? "bg-gray-300" : "bg-blue-500")} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className={cn("text-sm font-medium", item.isRead ? "text-gray-600" : "text-gray-900")}>
                            {item.count} new · {item.title}
                          </p>
                          <Badge variant="outline" className={cn("text-xs shrink-0", TYPE_STYLES[item.type] ?? TYPE_STYLES.INFO)}>
                            {item.type}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-500 mt-0.5">{item.count} notifications grouped</p>
                        <p className="text-xs text-gray-400 mt-1">{formatDateTime(item.createdAt)}</p>
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
                    className={cn(
                      "flex items-start gap-4 p-4 transition-colors",
                      notif.link ? "cursor-pointer hover:bg-gray-50" : "cursor-default",
                      !notif.isRead && "bg-blue-50/40"
                    )}
                    onClick={() => handleClick(notif)}
                  >
                    <div className={cn("w-2 h-2 rounded-full mt-2 shrink-0", notif.isRead ? "bg-gray-300" : "bg-blue-500")} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className={cn("text-sm font-medium", notif.isRead ? "text-gray-600" : "text-gray-900")}>
                          {notif.title}
                        </p>
                        <Badge variant="outline" className={cn("text-xs shrink-0", TYPE_STYLES[notif.type] ?? TYPE_STYLES.INFO)}>
                          {notif.type}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-500 mt-0.5">{notif.message}</p>
                      <p className="text-xs text-gray-400 mt-1">{formatDateTime(notif.createdAt)}</p>
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
