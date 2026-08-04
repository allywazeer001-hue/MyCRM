"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Megaphone, Plus, Search, Users, Send, CheckCircle2, XCircle,
  Clock, Loader2, MessageSquare, Mail, Phone,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

const STATUS_STYLES: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-600",
  SCHEDULED: "bg-blue-50 text-blue-700",
  QUEUED: "bg-indigo-50 text-indigo-700",
  RUNNING: "bg-amber-50 text-amber-700",
  PAUSED: "bg-orange-50 text-orange-700",
  COMPLETED: "bg-green-50 text-green-700",
  PARTIALLY_FAILED: "bg-orange-50 text-orange-700",
  FAILED: "bg-red-50 text-red-700",
  CANCELLED: "bg-gray-100 text-gray-500",
};

const CHANNEL_ICON: Record<string, any> = { SMS: Phone, WHATSAPP: MessageSquare, EMAIL: Mail };

function StatCard({ icon: Icon, label, value, color }: { icon: any; label: string; value: number | string; color: string }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 flex items-center gap-3">
      <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0", color)}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="min-w-0">
        <p className="text-xl font-bold text-gray-900 leading-tight">{typeof value === "number" ? value.toLocaleString() : value}</p>
        <p className="text-xs text-gray-500 truncate">{label}</p>
      </div>
    </div>
  );
}

export default function CampaignsPage() {
  const [stats, setStats] = useState<any>(null);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [channel, setChannel] = useState("");

  useEffect(() => {
    api.get("/campaigns/dashboard-stats").then(r => setStats(r.data)).catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    const params: any = {};
    if (search) params.search = search;
    if (status) params.status = status;
    if (channel) params.channel = channel;
    api.get("/campaigns", { params })
      .then(r => setCampaigns(r.data?.data ?? []))
      .catch(() => setCampaigns([]))
      .finally(() => setLoading(false));
  }, [search, status, channel]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Megaphone className="w-5 h-5 text-brand" /> Campaigns
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">Reach your CRM records over SMS, WhatsApp, and Email.</p>
        </div>
        <Link href="/campaigns/new">
          <Button className="gap-1.5"><Plus className="w-4 h-4" /> New Campaign</Button>
        </Link>
      </div>

      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <StatCard icon={Megaphone} label="Total Campaigns" value={stats.totalCampaigns} color="bg-indigo-50 text-indigo-600" />
          <StatCard icon={Clock} label="Scheduled" value={stats.scheduled} color="bg-blue-50 text-blue-600" />
          <StatCard icon={Loader2} label="Running" value={stats.running} color="bg-amber-50 text-amber-600" />
          <StatCard icon={CheckCircle2} label="Completed" value={stats.completed} color="bg-green-50 text-green-600" />
          <StatCard icon={XCircle} label="Failed" value={stats.failed} color="bg-red-50 text-red-600" />
          <StatCard icon={Users} label="Total Recipients" value={stats.totalRecipients} color="bg-violet-50 text-violet-600" />
          <StatCard icon={Send} label="Messages Sent" value={stats.messagesSent} color="bg-cyan-50 text-cyan-600" />
          <StatCard icon={CheckCircle2} label="Delivered" value={stats.delivered} color="bg-green-50 text-green-600" />
          <StatCard icon={XCircle} label="Failed Messages" value={stats.failedMessages} color="bg-red-50 text-red-600" />
          <StatCard icon={Clock} label="Pending" value={stats.pending} color="bg-gray-100 text-gray-600" />
          <StatCard icon={Mail} label="Opened" value={stats.opened} color="bg-blue-50 text-blue-600" />
          <StatCard icon={Mail} label="Clicked" value={stats.clicked} color="bg-indigo-50 text-indigo-600" />
        </div>
      )}

      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search campaigns…" className="pl-9 h-9" />
        </div>
        <Select value={status || "__all__"} onValueChange={v => setStatus(v === "__all__" ? "" : v)}>
          <SelectTrigger className="h-9 w-40"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">All statuses</SelectItem>
            {Object.keys(STATUS_STYLES).map(s => <SelectItem key={s} value={s}>{s.replace(/_/g, " ")}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={channel || "__all__"} onValueChange={v => setChannel(v === "__all__" ? "" : v)}>
          <SelectTrigger className="h-9 w-36"><SelectValue placeholder="Channel" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">All channels</SelectItem>
            <SelectItem value="SMS">SMS</SelectItem>
            <SelectItem value="WHATSAPP">WhatsApp</SelectItem>
            <SelectItem value="EMAIL">Email</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden divide-y divide-gray-50">
        {loading ? (
          <div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
        ) : campaigns.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <Megaphone className="w-8 h-8 text-gray-300" />
            <p className="text-sm text-gray-500">No campaigns yet</p>
            <Link href="/campaigns/new"><Button size="sm" className="gap-1.5"><Plus className="w-3.5 h-3.5" /> Create your first campaign</Button></Link>
          </div>
        ) : campaigns.map((c: any) => (
          <Link key={c.id} href={`/campaigns/${c.id}`}>
            <div className="flex items-center gap-4 px-4 py-3.5 hover:bg-gray-50 transition-colors">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-gray-900 truncate">{c.name}</p>
                  <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0", STATUS_STYLES[c.status])}>
                    {c.status.replace(/_/g, " ")}
                  </span>
                </div>
                <p className="text-xs text-gray-400 mt-0.5">
                  {c.type?.replace(/_/g, " ")} · by {c.createdBy?.firstName} {c.createdBy?.lastName} · {new Date(c.createdAt).toLocaleDateString()}
                </p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                {c.channels?.map((ch: any) => {
                  const Icon = CHANNEL_ICON[ch.channel];
                  return (
                    <div key={ch.id} title={ch.channel} className="w-7 h-7 rounded-lg bg-gray-50 border border-gray-100 flex items-center justify-center">
                      <Icon className="w-3.5 h-3.5 text-gray-500" />
                    </div>
                  );
                })}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
