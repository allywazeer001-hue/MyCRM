"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ChevronLeft, Pause, Play, Ban, RefreshCw, Send, Loader2, Phone, MessageSquare, Mail,
  CheckCircle2, XCircle, Clock, Eye, MousePointerClick,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

const CHANNEL_ICON: Record<string, any> = { SMS: Phone, WHATSAPP: MessageSquare, EMAIL: Mail };
const STATUS_STYLES: Record<string, string> = {
  PENDING: "bg-gray-100 text-gray-600", QUEUED: "bg-indigo-50 text-indigo-700", SENDING: "bg-blue-50 text-blue-700",
  SENT: "bg-blue-50 text-blue-700", DELIVERED: "bg-green-50 text-green-700", FAILED: "bg-red-50 text-red-700",
  BOUNCED: "bg-red-50 text-red-700", OPENED: "bg-cyan-50 text-cyan-700", CLICKED: "bg-violet-50 text-violet-700",
  CANCELLED: "bg-gray-100 text-gray-500",
};

function StatBlock({ label, value, color }: { label: string; value: number; color?: string }) {
  return (
    <div className="text-center">
      <p className={cn("text-2xl font-bold", color ?? "text-gray-900")}>{value.toLocaleString()}</p>
      <p className="text-xs text-gray-500 mt-0.5">{label}</p>
    </div>
  );
}

export default function CampaignDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [campaign, setCampaign] = useState<any>(null);
  const [analytics, setAnalytics] = useState<any>(null);
  const [recipients, setRecipients] = useState<any[]>([]);
  const [recipientFilter, setRecipientFilter] = useState({ channel: "", status: "" });
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [testChannel, setTestChannel] = useState("");
  const [testDestination, setTestDestination] = useState("");
  const [testResult, setTestResult] = useState<string>("");

  const load = () => {
    Promise.all([
      api.get(`/campaigns/${id}`),
      api.get(`/campaigns/${id}/analytics`),
    ]).then(([c, a]) => { setCampaign(c.data); setAnalytics(a.data); }).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [id]); // eslint-disable-line

  useEffect(() => {
    const params: any = {};
    if (recipientFilter.channel) params.channel = recipientFilter.channel;
    if (recipientFilter.status) params.status = recipientFilter.status;
    api.get(`/campaigns/${id}/recipients`, { params }).then(r => setRecipients(r.data?.data ?? [])).catch(() => {});
  }, [id, recipientFilter]);

  const runAction = async (action: string) => {
    setActionLoading(true);
    try {
      await api.post(`/campaigns/${id}/${action}`);
      load();
    } finally {
      setActionLoading(false);
    }
  };

  const sendTest = async () => {
    if (!testChannel || !testDestination) return;
    setTestResult("Sending…");
    try {
      const { data } = await api.post(`/campaigns/${id}/send-test`, { channel: testChannel, destination: testDestination });
      setTestResult(data.success ? "Test sent ✓" : `Failed: ${data.error}`);
    } catch (e: any) {
      setTestResult(`Failed: ${e?.response?.data?.message ?? "Unknown error"}`);
    }
  };

  if (loading || !campaign) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Link href="/campaigns" className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 w-fit">
        <ChevronLeft className="w-4 h-4" /> Campaigns
      </Link>

      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-gray-900">{campaign.name}</h1>
            <span className={cn("text-xs font-semibold px-2 py-0.5 rounded-full", STATUS_STYLES[campaign.status] ?? "bg-gray-100 text-gray-600")}>
              {campaign.status.replace(/_/g, " ")}
            </span>
          </div>
          <p className="text-sm text-gray-500 mt-0.5">{campaign.description}</p>
        </div>
        <div className="flex items-center gap-2">
          {campaign.status === "RUNNING" && <Button size="sm" variant="outline" disabled={actionLoading} onClick={() => runAction("pause")} className="gap-1.5"><Pause className="w-3.5 h-3.5" /> Pause</Button>}
          {campaign.status === "PAUSED" && <Button size="sm" variant="outline" disabled={actionLoading} onClick={() => runAction("resume")} className="gap-1.5"><Play className="w-3.5 h-3.5" /> Resume</Button>}
          {["FAILED", "PARTIALLY_FAILED"].includes(campaign.status) && <Button size="sm" variant="outline" disabled={actionLoading} onClick={() => runAction("retry-failed")} className="gap-1.5"><RefreshCw className="w-3.5 h-3.5" /> Retry Failed</Button>}
          {!["COMPLETED", "CANCELLED"].includes(campaign.status) && <Button size="sm" variant="outline" disabled={actionLoading} onClick={() => runAction("cancel")} className="gap-1.5 text-red-600 hover:text-red-700"><Ban className="w-3.5 h-3.5" /> Cancel</Button>}
        </div>
      </div>

      {/* Send Test (draft only) */}
      {campaign.status === "DRAFT" && (
        <div className="bg-white border border-gray-200 rounded-xl p-4 flex items-center gap-2 flex-wrap">
          <Select value={testChannel} onValueChange={setTestChannel}>
            <SelectTrigger className="h-9 w-32"><SelectValue placeholder="Channel" /></SelectTrigger>
            <SelectContent>
              {campaign.channels.map((c: any) => <SelectItem key={c.id} value={c.channel}>{c.channel}</SelectItem>)}
            </SelectContent>
          </Select>
          <input value={testDestination} onChange={e => setTestDestination(e.target.value)} placeholder="Phone or email…"
            className="h-9 px-3 text-sm border border-gray-200 rounded-lg flex-1 min-w-[180px]" />
          <Button size="sm" onClick={sendTest} className="gap-1.5"><Send className="w-3.5 h-3.5" /> Send Test</Button>
          {testResult && <span className="text-xs text-gray-500">{testResult}</span>}
          <div className="w-full flex gap-2 pt-2 border-t border-gray-100 mt-2">
            <Button size="sm" onClick={() => api.post(`/campaigns/${id}/send-now`).then(load)} className="gap-1.5"><Send className="w-3.5 h-3.5" /> Send Now</Button>
          </div>
        </div>
      )}

      {/* Analytics */}
      {analytics && (
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-4">
            <StatBlock label="Total Recipients" value={analytics.total} />
            <StatBlock label="Sent" value={analytics.sent} color="text-blue-600" />
            <StatBlock label="Delivered" value={analytics.delivered} color="text-green-600" />
            <StatBlock label="Failed" value={analytics.failed} color="text-red-500" />
            <StatBlock label="Opened" value={analytics.opened} color="text-cyan-600" />
            <StatBlock label="Clicked" value={analytics.clicked} color="text-violet-600" />
          </div>
          <p className="text-center text-xs text-gray-400 mt-3">Delivery rate: {analytics.deliveryRate}%</p>

          {Object.keys(analytics.byChannel).length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-5 pt-5 border-t border-gray-100">
              {Object.entries(analytics.byChannel).map(([channel, counts]: any) => {
                const Icon = CHANNEL_ICON[channel];
                return (
                  <div key={channel} className="border border-gray-100 rounded-xl p-3">
                    <p className="text-xs font-semibold text-gray-700 flex items-center gap-1.5 mb-2"><Icon className="w-3.5 h-3.5" /> {channel}</p>
                    <div className="space-y-1">
                      {Object.entries(counts).map(([status, count]: any) => (
                        <div key={status} className="flex justify-between text-xs">
                          <span className="text-gray-500">{status}</span>
                          <span className="font-medium text-gray-800">{count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Recipients */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between gap-2 flex-wrap">
          <p className="text-sm font-semibold text-gray-800">Recipients</p>
          <div className="flex items-center gap-2">
            <Select value={recipientFilter.channel || "__all__"} onValueChange={v => setRecipientFilter(f => ({ ...f, channel: v === "__all__" ? "" : v }))}>
              <SelectTrigger className="h-8 w-28 text-xs"><SelectValue placeholder="Channel" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All channels</SelectItem>
                <SelectItem value="SMS">SMS</SelectItem>
                <SelectItem value="WHATSAPP">WhatsApp</SelectItem>
                <SelectItem value="EMAIL">Email</SelectItem>
              </SelectContent>
            </Select>
            <Select value={recipientFilter.status || "__all__"} onValueChange={v => setRecipientFilter(f => ({ ...f, status: v === "__all__" ? "" : v }))}>
              <SelectTrigger className="h-8 w-32 text-xs"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All statuses</SelectItem>
                {Object.keys(STATUS_STYLES).map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="divide-y divide-gray-50 max-h-96 overflow-y-auto">
          {recipients.length === 0 ? (
            <p className="text-center text-sm text-gray-400 py-10">No recipients yet</p>
          ) : recipients.map((r: any) => {
            const Icon = CHANNEL_ICON[r.channel];
            return (
              <div key={r.id} className="flex items-center gap-3 px-4 py-2.5">
                <Icon className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                <span className="text-sm text-gray-700 flex-1 min-w-0 truncate">{r.destination}</span>
                {r.failureReason && <span className="text-xs text-red-500 truncate max-w-[160px]" title={r.failureReason}>{r.failureReason}</span>}
                <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0", STATUS_STYLES[r.status])}>{r.status}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
