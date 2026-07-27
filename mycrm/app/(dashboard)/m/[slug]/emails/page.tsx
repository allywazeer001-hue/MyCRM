"use client";
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Mail, Clock, ChevronRight, Search, Loader2 } from "lucide-react";

interface CampaignReport {
  batchId: string; subject: string; sentAt: string; total: number;
  delivered: number; failed: number; bounced: number;
  opened: number; notOpened: number; clicked: number; notClicked: number;
}

export default function ModuleMassEmailsPage() {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();

  const [moduleId, setModuleId] = useState<string | null>(null);
  const [moduleName, setModuleName] = useState("");
  const [reports, setReports] = useState<CampaignReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [subjectFilter, setSubjectFilter] = useState("");

  useEffect(() => {
    api.get(`/modules/by-slug/${slug}`).then(({ data }) => {
      setModuleId(data.id);
      setModuleName(data.name);
    }).catch(() => {});
  }, [slug]);

  const load = (id: string) => {
    setLoading(true);
    const params = new URLSearchParams({ moduleId: id });
    if (subjectFilter.trim()) params.set("subject", subjectFilter.trim());
    api.get(`/emails/reports?${params}`).then(r => setReports(r.data ?? [])).catch(() => {}).finally(() => setLoading(false));
  };

  useEffect(() => {
    if (moduleId) load(moduleId);
  }, [moduleId]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="h-full flex flex-col bg-slate-50">
      <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center gap-3 shrink-0">
        <Button size="sm" variant="ghost" onClick={() => router.push(`/m/${slug}`)}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
          <Mail className="w-4 h-4 text-white" />
        </div>
        <div>
          <h1 className="text-base font-semibold text-slate-900">Mass Email</h1>
          <p className="text-xs text-slate-500">{moduleName ? `Sent from ${moduleName}` : "Loading…"}</p>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-6xl mx-auto space-y-4">
          <div className="bg-white border border-slate-200 rounded-xl p-3 flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-300" />
              <input value={subjectFilter} onChange={e => setSubjectFilter(e.target.value)}
                onKeyDown={e => e.key === "Enter" && moduleId && load(moduleId)}
                placeholder="Filter by subject…"
                className="w-full h-9 pl-8 pr-3 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400" />
            </div>
            <Button size="sm" variant="outline" onClick={() => moduleId && load(moduleId)}>Apply</Button>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100">
            {loading ? (
              <div className="p-10 text-center text-sm text-slate-400"><Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" />Loading…</div>
            ) : reports.length === 0 ? (
              <div className="p-10 text-center">
                <Clock className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-sm text-slate-400">No mass emails sent from this module yet</p>
              </div>
            ) : reports.map(r => (
              <button key={r.batchId} onClick={() => router.push(`/settings/email/reports/${r.batchId}`)}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors text-left">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-slate-800 text-sm truncate">{r.subject}</p>
                  <p className="text-[11px] text-slate-400">{new Date(r.sentAt).toLocaleString()} · {r.total} recipient{r.total === 1 ? "" : "s"}</p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <Badge variant="outline" className="text-[10px] bg-green-50 text-green-700 border-green-200">{r.delivered} delivered</Badge>
                  {r.bounced > 0 && <Badge variant="outline" className="text-[10px] bg-orange-50 text-orange-700 border-orange-200">{r.bounced} bounced</Badge>}
                  {r.failed > 0 && <Badge variant="outline" className="text-[10px] bg-red-50 text-red-700 border-red-200">{r.failed} failed</Badge>}
                  <Badge variant="outline" className="text-[10px] bg-blue-50 text-blue-700 border-blue-200">{r.opened} opened</Badge>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-300 shrink-0" />
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
