"use client";
import { useEffect, useState } from "react";
import { use } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Eye, MousePointerClick, Download, Users, Loader2 } from "lucide-react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface Props { params: Promise<{ id: string }> }

const TYPE_LABELS: Record<string, string> = {
  VIEWED: "View",
  EXTERNAL_LINK_CLICKED: "Link Click",
  ATTACHMENT_DOWNLOADED: "Download",
  EVENT_LINK_CLICKED: "Event Click",
};

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function timeAgo(d: string) {
  const ms = Date.now() - new Date(d).getTime();
  const s  = Math.floor(ms / 1000);
  if (s < 60)  return "just now";
  const m = Math.floor(s / 60);
  if (m < 60)  return `${m} min ago`;
  const h = Math.floor(m / 60);
  if (h < 24)  return `${h}h ago`;
  const days = Math.floor(h / 24);
  if (days < 7)  return `${days}d ago`;
  const wks = Math.floor(days / 7);
  if (wks < 4)   return `${wks} week${wks !== 1 ? "s" : ""} ago`;
  const mo = Math.floor(days / 30);
  if (mo < 12)   return `${mo} month${mo !== 1 ? "s" : ""} ago`;
  return `${Math.floor(mo / 12)}y ago`;
}

function StatCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: number; color: string }) {
  return (
    <div className={cn("rounded-xl border p-4 flex items-center gap-3 bg-white shadow-sm", color)}>
      <div className="w-9 h-9 rounded-full flex items-center justify-center bg-gray-100">{icon}</div>
      <div>
        <p className="text-2xl font-bold text-gray-900">{value.toLocaleString()}</p>
        <p className="text-xs text-gray-500">{label}</p>
      </div>
    </div>
  );
}

export default function AdminPublicationAnalyticsPage({ params }: Props) {
  const { id } = use(params);
  const router  = useRouter();
  const [data, setData]       = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [from, setFrom]       = useState("");
  const [to, setTo]           = useState("");

  const load = () => {
    setLoading(true);
    const p: any = {};
    if (from) p.from = from;
    if (to)   p.to   = to;
    api.get(`/publications/${id}/analytics`, { params: p })
      .then(r => setData(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []); // eslint-disable-line

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-3">
        <button onClick={() => router.push(`/portal/admin/publications/${id}`)} className="text-gray-400 hover:text-gray-700">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <h1 className="text-base font-semibold text-gray-900 flex-1 truncate">
          {data?.publication?.title ?? "Analytics"}
        </h1>
      </div>

      {/* Date filter */}
      <div className="flex items-center gap-3 bg-white border border-gray-200 rounded-xl p-3 flex-wrap shadow-sm">
        <span className="text-xs text-gray-500 font-medium">Date range:</span>
        <Input type="date" value={from} onChange={e => setFrom(e.target.value)} className="h-8 text-sm w-36 bg-white border-gray-200 text-gray-800" />
        <span className="text-gray-400 text-sm">→</span>
        <Input type="date" value={to} onChange={e => setTo(e.target.value)} className="h-8 text-sm w-36 bg-white border-gray-200 text-gray-800" />
        <Button size="sm" onClick={load} variant="outline" className="border-gray-200 text-gray-600 hover:bg-gray-50 h-8">Apply</Button>
        <Button size="sm" variant="ghost" className="h-8 text-gray-400 hover:text-gray-700" onClick={() => { setFrom(""); setTo(""); setTimeout(load, 0); }}>Clear</Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-rose-500" />
        </div>
      ) : data ? (
        <div className="space-y-5">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard icon={<Eye className="w-5 h-5 text-blue-500" />}             label="Total Views"     value={data.views}        color="border-gray-200" />
            <StatCard icon={<Users className="w-5 h-5 text-violet-500" />}          label="Unique Viewers"  value={data.uniqueViewers} color="border-gray-200" />
            <StatCard icon={<MousePointerClick className="w-5 h-5 text-green-500" />} label="Link Clicks"   value={data.clicks}       color="border-gray-200" />
            <StatCard icon={<Download className="w-5 h-5 text-orange-500" />}       label="Downloads"       value={data.downloads}    color="border-gray-200" />
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Engagement by Type</h3>
            <div className="space-y-2">
              {Object.entries(data.byType).map(([type, count]: [string, any]) => (
                <div key={type} className="flex items-center gap-2">
                  <span className="text-xs text-gray-500 w-44">{TYPE_LABELS[type] ?? type}</span>
                  <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-rose-500 rounded-full" style={{ width: `${Math.max(2, (count / (data.views || 1)) * 100)}%` }} />
                  </div>
                  <span className="text-xs font-medium text-gray-700 w-8 text-right">{count}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-900">Activity per User</h3>
              <span className="text-xs text-gray-400">{data.userSummaries?.length ?? 0} reader{(data.userSummaries?.length ?? 0) !== 1 ? "s" : ""}</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="text-left px-4 py-2.5 text-gray-500 font-medium">Reader</th>
                    <th className="text-center px-3 py-2.5 text-gray-500 font-medium">Views</th>
                    <th className="text-center px-3 py-2.5 text-gray-500 font-medium">Clicks</th>
                    <th className="text-center px-3 py-2.5 text-gray-500 font-medium">Downloads</th>
                    <th className="text-left px-4 py-2.5 text-gray-500 font-medium">Last Active</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {(data.userSummaries ?? []).map((u: any) => (
                    <tr key={u.key} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        {u.userName
                          ? <span className="text-gray-800 font-semibold">{u.userName}</span>
                          : <span className="text-gray-400 italic">Anonymous</span>}
                      </td>
                      <td className="px-3 py-3 text-center">
                        {u.views > 0
                          ? <span className="inline-block min-w-[28px] px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700 font-semibold">{u.views}</span>
                          : <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-3 py-3 text-center">
                        {u.clicks > 0
                          ? <span className="inline-block min-w-[28px] px-1.5 py-0.5 rounded-full bg-green-100 text-green-700 font-semibold">{u.clicks}</span>
                          : <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-3 py-3 text-center">
                        {u.downloads > 0
                          ? <span className="inline-block min-w-[28px] px-1.5 py-0.5 rounded-full bg-orange-100 text-orange-700 font-semibold">{u.downloads}</span>
                          : <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-gray-700 font-medium">{timeAgo(u.lastActivity)}</span>
                        <span className="block text-gray-400 text-[10px] mt-0.5">{formatDate(u.lastActivity)}</span>
                      </td>
                    </tr>
                  ))}
                  {(data.userSummaries ?? []).length === 0 && (
                    <tr><td colSpan={5} className="px-4 py-10 text-center text-gray-400">No engagement data yet</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
