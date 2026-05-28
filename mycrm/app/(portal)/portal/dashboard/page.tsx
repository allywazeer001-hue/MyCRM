"use client";
import { useEffect, useState } from "react";
import { PortalShell } from "@/components/portal/portal-shell";
import { portalApi } from "@/lib/portal-api";
import { Bell, FileText, Megaphone, TrendingUp, Loader2, CheckCircle, Info, AlertTriangle, XCircle } from "lucide-react";
import Link from "next/link";

interface DashboardData {
  user: any;
  unreadCount: number;
  latestNotifications: any[];
  announcements: any[];
  recordSummary: Record<string, any> | null;
}

function NotifIcon({ type }: { type: string }) {
  if (type === "success") return <CheckCircle className="w-4 h-4 text-green-400" />;
  if (type === "warning") return <AlertTriangle className="w-4 h-4 text-yellow-400" />;
  if (type === "error") return <XCircle className="w-4 h-4 text-red-400" />;
  return <Info className="w-4 h-4 text-blue-400" />;
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function PortalDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    portalApi.get("/portal/dashboard")
      .then((r) => setData(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <PortalShell>
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-7 h-7 animate-spin text-indigo-500" />
        </div>
      ) : !data ? (
        <div className="text-center text-gray-500 py-16">Failed to load dashboard</div>
      ) : (
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Welcome banner */}
          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-6 text-white shadow-lg">
            <p className="text-indigo-200 text-sm font-medium uppercase tracking-wide">Welcome back</p>
            <h1 className="text-2xl font-bold mt-1">
              {data.user.firstName} {data.user.lastName}
            </h1>
            <p className="text-indigo-200 text-sm mt-1 capitalize">{data.user.type} account</p>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center">
                <Bell className="w-5 h-5 text-indigo-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{data.unreadCount}</p>
                <p className="text-xs text-gray-500">Unread notifications</p>
              </div>
            </div>
            <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center">
                <Megaphone className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{data.announcements.length}</p>
                <p className="text-xs text-gray-500">Announcements</p>
              </div>
            </div>
            <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm flex items-center gap-3 col-span-2 sm:col-span-1">
              <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center">
                <FileText className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-bold text-gray-900">{data.recordSummary ? "Linked" : "None"}</p>
                <p className="text-xs text-gray-500">Record status</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Notifications */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-50">
                <h2 className="font-semibold text-gray-800 text-sm">Recent Notifications</h2>
                <Link href="/portal/notifications" className="text-xs text-indigo-600 hover:underline">View all</Link>
              </div>
              <div className="divide-y divide-gray-50">
                {data.latestNotifications.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-8">No notifications yet</p>
                ) : data.latestNotifications.map((n: any) => (
                  <div key={n.id} className="flex items-start gap-3 px-5 py-3">
                    <NotifIcon type={n.type} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{n.title}</p>
                      <p className="text-xs text-gray-500 truncate">{n.body}</p>
                    </div>
                    <span className="text-xs text-gray-400 shrink-0">{timeAgo(n.createdAt)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Announcements */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-50">
                <h2 className="font-semibold text-gray-800 text-sm">Announcements</h2>
                <TrendingUp className="w-4 h-4 text-gray-400" />
              </div>
              <div className="divide-y divide-gray-50">
                {data.announcements.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-8">No announcements</p>
                ) : data.announcements.map((a: any) => (
                  <div key={a.id} className="px-5 py-3">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                        a.type === "urgent" ? "bg-red-100 text-red-600" :
                        a.type === "event" ? "bg-blue-100 text-blue-600" :
                        "bg-gray-100 text-gray-600"
                      }`}>
                        {a.type}
                      </span>
                      <span className="text-xs text-gray-400">{timeAgo(a.publishedAt)}</span>
                    </div>
                    <p className="text-sm font-medium text-gray-800">{a.title}</p>
                    <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{a.body}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Record summary */}
          {data.recordSummary && (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-50">
                <h2 className="font-semibold text-gray-800 text-sm">My Record</h2>
                <Link href="/portal/records" className="text-xs text-indigo-600 hover:underline">View full record</Link>
              </div>
              <div className="px-5 py-4 grid grid-cols-2 sm:grid-cols-3 gap-3">
                {Object.entries(data.recordSummary).slice(0, 6).map(([key, value]) => (
                  <div key={key}>
                    <p className="text-xs text-gray-500 capitalize">{key.replace(/_/g, " ")}</p>
                    <p className="text-sm font-medium text-gray-800 truncate">{String(value ?? "—")}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </PortalShell>
  );
}
