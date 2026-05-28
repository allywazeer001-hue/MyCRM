"use client";
import { useEffect } from "react";
import { Bell, CheckCheck, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useNotificationsStore } from "@/store/notifications.store";
import { formatDateTime } from "@/lib/utils";
import { cn } from "@/lib/utils";

const TYPE_STYLES: Record<string, string> = {
  INFO: "bg-blue-50 border-blue-200 text-blue-700",
  SUCCESS: "bg-green-50 border-green-200 text-green-700",
  WARNING: "bg-yellow-50 border-yellow-200 text-yellow-700",
  ERROR: "bg-red-50 border-red-200 text-red-700",
};

export default function NotificationsPage() {
  const { notifications, unreadCount, fetchNotifications, markRead, markAllRead } = useNotificationsStore();

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
          <p className="text-gray-500 mt-1">
            {unreadCount > 0 ? `${unreadCount} unread notification${unreadCount > 1 ? "s" : ""}` : "All caught up!"}
          </p>
        </div>
        {unreadCount > 0 && (
          <Button variant="outline" size="sm" onClick={markAllRead} className="gap-2">
            <CheckCheck className="w-4 h-4" />
            Mark all read
          </Button>
        )}
      </div>

      <Card>
        <CardContent className="p-0">
          {notifications.length === 0 ? (
            <div className="text-center py-16">
              <Bell className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-sm font-medium text-gray-900 mb-1">No notifications</h3>
              <p className="text-sm text-gray-500">You&apos;re all caught up!</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {notifications.map((notif) => (
                <div
                  key={notif.id}
                  className={cn(
                    "flex items-start gap-4 p-4 hover:bg-gray-50 transition-colors",
                    !notif.isRead && "bg-blue-50/30"
                  )}
                  onClick={() => !notif.isRead && markRead(notif.id)}
                >
                  <div className={cn("w-2 h-2 rounded-full mt-2 shrink-0", notif.isRead ? "bg-gray-300" : "bg-blue-500")} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className={cn("text-sm font-medium", !notif.isRead ? "text-gray-900" : "text-gray-600")}>
                        {notif.title}
                      </p>
                      <Badge
                        variant="outline"
                        className={cn("text-xs shrink-0", TYPE_STYLES[notif.type] || TYPE_STYLES.INFO)}
                      >
                        {notif.type}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-500 mt-0.5">{notif.message}</p>
                    <p className="text-xs text-gray-400 mt-1">{formatDateTime(notif.createdAt)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
