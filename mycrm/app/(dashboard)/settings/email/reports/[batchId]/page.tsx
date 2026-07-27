"use client";
import { useState, useEffect, useRef, useLayoutEffect, Children } from "react";
import type { ReactNode } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Eye, ChevronRight, Loader2, X, MessageSquarePlus, Check, RefreshCcw } from "lucide-react";
import { cn } from "@/lib/utils";

interface CampaignSummary {
  batchId: string; subject: string; sentAt: string; total: number;
  delivered: number; failed: number; bounced: number;
  opened: number; notOpened: number; clicked: number; notClicked: number;
  templateId: string | null; templateName: string | null; sentByName: string | null;
  replyTo: string | null; fromEmail: string | null; firstRecipient: string;
}
interface BatchRecipient {
  id: string; toEmail: string; toName?: string; status: string;
  openedAt?: string | null; clickedAt?: string | null; errorMsg?: string | null; remark?: string | null;
}
interface EmailLog {
  id: string; toEmail: string; toName?: string; subject: string;
  status: string; sentAt: string; body?: string;
}
type Stage = "all" | "delivered" | "bounced" | "failed" | "opened" | "not_opened" | "clicked" | "not_clicked";

// ── Org-chart connector — a vertical stub down from the parent, a horizontal
// bus spanning first-to-last child, then a vertical stub down into each child.
function TreeChildren({ children }: { children: ReactNode }) {
  const items = Children.toArray(children);
  const n = items.length;
  if (n === 0) return null;
  return (
    <div style={{ position: "relative", paddingTop: 24, display: "flex", justifyContent: "center" }}>
      <div style={{ position: "absolute", top: 0, left: "50%", width: 1, height: 24, background: "#cbd5e1" }} />
      <div style={{ display: "flex", alignItems: "flex-start" }}>
        {items.map((child, i) => (
          <div key={i} style={{ position: "relative", display: "flex", flexDirection: "column", alignItems: "center", padding: "0 16px" }}>
            {n > 1 && (
              <div style={{
                position: "absolute", top: 0, height: 1, background: "#cbd5e1",
                left: i === 0 ? "50%" : 0,
                right: i === n - 1 ? "50%" : 0,
              }} />
            )}
            <div style={{ width: 1, height: 16, background: "#cbd5e1" }} />
            <div style={{ paddingTop: 8 }}>{child}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

const NODE_COLOR: Record<string, string> = {
  slate:  "bg-white border-slate-300 text-slate-700 hover:border-slate-400",
  green:  "bg-white border-green-300 text-slate-700 hover:border-green-400",
  orange: "bg-white border-orange-300 text-slate-700 hover:border-orange-400",
  red:    "bg-white border-red-300 text-slate-700 hover:border-red-400",
  blue:   "bg-white border-blue-300 text-slate-700 hover:border-blue-400",
  purple: "bg-white border-purple-300 text-slate-700 hover:border-purple-400",
};

function Node({ label, count, pct, color, active, disabled, onClick }: {
  label: string; count: number; pct: number; color: string; active: boolean; disabled?: boolean; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "px-4 py-2 rounded-lg border-2 text-center transition-all shrink-0 shadow-sm disabled:opacity-40 disabled:cursor-not-allowed",
        NODE_COLOR[color],
        active && "ring-2 ring-offset-1 ring-indigo-400 border-indigo-400",
      )}
      style={{ minWidth: 110 }}
    >
      <p className="text-xs font-bold text-slate-800 leading-tight">{label}</p>
      <p className="text-[11px] text-slate-500 mt-0.5">{count} ({pct}%)</p>
    </button>
  );
}

function pct(count: number, of: number) {
  return of > 0 ? Math.round((count / of) * 100) : 0;
}

// Shrinks the tree just enough to fit the available width — never scrolls,
// never grows past 100%. Re-measures on resize and whenever the tree's own
// shape changes (e.g. a "Failed" branch appearing/disappearing).
function useScaleToFit<T>(dep: T) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState({ scale: 1, height: undefined as number | undefined });

  useLayoutEffect(() => {
    const wrap = wrapRef.current, inner = innerRef.current;
    if (!wrap || !inner) return;
    const recompute = () => {
      const naturalWidth = inner.scrollWidth;
      const naturalHeight = inner.scrollHeight;
      const availableWidth = wrap.clientWidth;
      if (!naturalWidth || !availableWidth) return;
      const scale = Math.min(1, availableWidth / naturalWidth);
      setBox({ scale, height: naturalHeight * scale });
    };
    recompute();
    const ro = new ResizeObserver(recompute);
    ro.observe(wrap);
    window.addEventListener("resize", recompute);
    return () => { ro.disconnect(); window.removeEventListener("resize", recompute); };
  }, [dep]);

  return { wrapRef, innerRef, box };
}

export default function CampaignReportPage() {
  const { batchId } = useParams<{ batchId: string }>();
  const router = useRouter();

  const [summary, setSummary] = useState<CampaignSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [stage, setStage] = useState<Stage | null>(null);
  const [recipients, setRecipients] = useState<BatchRecipient[] | null>(null);
  const [loadingStage, setLoadingStage] = useState(false);

  const [remarkText, setRemarkText] = useState("");
  const [savingRemark, setSavingRemark] = useState(false);
  const [remarkSaved, setRemarkSaved] = useState(false);

  const [previewLog, setPreviewLog] = useState<EmailLog | null>(null);

  const [resendingId, setResendingId] = useState<string | null>(null);
  const [resentIds, setResentIds] = useState<Set<string>>(new Set());

  const { wrapRef, innerRef, box } = useScaleToFit((summary?.batchId ?? "") + (summary?.failed ?? 0));

  useEffect(() => {
    api.get(`/emails/reports/${batchId}/summary`)
      .then(({ data }) => { if (!data) setNotFound(true); else setSummary(data); })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [batchId]);

  const selectStage = async (s: Stage) => {
    if (stage === s) { setStage(null); setRecipients(null); return; }
    setStage(s);
    setRemarkText(""); setRemarkSaved(false);
    setLoadingStage(true);
    setRecipients(null);
    try {
      const params = s === "all" ? "" : `?stage=${s}`;
      const { data } = await api.get(`/emails/reports/${batchId}/recipients${params}`);
      setRecipients(data ?? []);
    } catch { setRecipients([]); } finally { setLoadingStage(false); }
  };

  const saveRemark = async () => {
    if (!recipients || recipients.length === 0 || !remarkText.trim()) return;
    setSavingRemark(true);
    try {
      await api.post("/emails/remark", { ids: recipients.map(r => r.id), remark: remarkText.trim() });
      setRecipients(prev => prev?.map(r => ({ ...r, remark: remarkText.trim() })) ?? prev);
      setRemarkSaved(true);
      setTimeout(() => setRemarkSaved(false), 2500);
    } catch { /* noop */ } finally { setSavingRemark(false); }
  };

  const handlePreview = async (id: string) => {
    const { data } = await api.get(`/emails/${id}`);
    setPreviewLog(data);
  };

  const handleResend = async (id: string) => {
    setResendingId(id);
    try {
      await api.post(`/emails/${id}/resend`);
      setResentIds(prev => new Set(prev).add(id));
    } catch { /* the row itself doesn't reflect failure here — resend result isn't in this list until refreshed */ }
    finally { setResendingId(null); }
  };

  if (loading) {
    return <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-indigo-500" /></div>;
  }
  if (notFound || !summary) {
    return (
      <div className="p-6 text-center">
        <p className="text-sm text-slate-500">This campaign report could not be found.</p>
        <Button size="sm" variant="outline" className="mt-3" onClick={() => router.push("/settings/email")}>
          <ArrowLeft className="w-3.5 h-3.5 mr-1" /> Back to Reports
        </Button>
      </div>
    );
  }

  const s = summary;
  const STAGE_LABEL: Record<Stage, string> = {
    all: "Sent", delivered: "Delivered", bounced: "Bounced", failed: "Failed",
    opened: "Opened", not_opened: "Unopened", clicked: "Clicked", not_clicked: "Not clicked",
  };

  return (
    <div className="h-full flex flex-col bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center gap-3 shrink-0">
        <Button size="sm" variant="ghost" onClick={() => router.push("/settings/email")}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <h1 className="text-base font-semibold text-slate-900">Email Details</h1>
      </div>

      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-6xl mx-auto space-y-6">

          {/* Email Details card */}
          <div className="max-w-2xl mx-auto bg-white border border-slate-200 rounded-xl p-5">
            <dl className="grid gap-2.5" style={{ gridTemplateColumns: "100px 1fr" }}>
              <dt className="text-xs text-slate-400">To</dt>
              <dd className="text-sm">
                <button onClick={() => selectStage("all")} className="text-indigo-600 hover:underline font-medium text-left">
                  {s.firstRecipient}{s.total > 1 ? ` & ${s.total - 1} more` : ""}
                </button>
              </dd>

              <dt className="text-xs text-slate-400">Template</dt>
              <dd className="text-sm">
                {s.templateId
                  ? <Link href="/settings/email" className="text-indigo-600 hover:underline font-medium">{s.templateName ?? "Untitled template"}</Link>
                  : <span className="text-slate-500">Custom message</span>}
              </dd>

              <dt className="text-xs text-slate-400">When</dt>
              <dd className="text-sm text-slate-700">{new Date(s.sentAt).toLocaleString(undefined, { hour: "numeric", minute: "2-digit", hour12: true, month: "short", day: "numeric", year: "numeric" })}</dd>

              <dt className="text-xs text-slate-400">From</dt>
              <dd className="text-sm text-slate-700 break-all">{s.fromEmail ?? "—"}</dd>

              <dt className="text-xs text-slate-400">Reply To</dt>
              <dd className="text-sm text-slate-700 break-all">{s.replyTo ?? s.fromEmail ?? "—"}</dd>

              <dt className="text-xs text-slate-400">Sent By</dt>
              <dd className="text-sm text-slate-700">{s.sentByName ?? "—"}</dd>
            </dl>
          </div>

          {/* Sent Email Statistics — hierarchical funnel, auto-scaled to always fit without scrolling */}
          <div className="bg-white border border-slate-200 rounded-xl p-6">
            <div className="flex items-baseline justify-between flex-wrap gap-2 mb-6">
              <p className="text-sm font-bold text-slate-800">Sent Email Statistics</p>
              <p className="text-sm text-slate-500">Total emails sent: <span className="text-base font-bold text-slate-800">{s.total}</span></p>
            </div>
            <div ref={wrapRef} style={{ width: "100%", height: box.height, overflow: "hidden", display: "flex", justifyContent: "center" }}>
              <div
                ref={innerRef}
                className="flex flex-col items-center py-2"
                style={{ transform: `scale(${box.scale})`, transformOrigin: "top center" }}
              >
                <Node label="Sent Email" count={s.total} pct={100} color="slate" active={stage === "all"} onClick={() => selectStage("all")} />

                <TreeChildren>
                  <Node label="Bounced" count={s.bounced} pct={pct(s.bounced, s.total)} color="orange"
                    active={stage === "bounced"} disabled={s.bounced === 0} onClick={() => selectStage("bounced")} />

                  <div className="flex flex-col items-center">
                    <Node label="Delivered" count={s.delivered} pct={pct(s.delivered, s.total)} color="green"
                      active={stage === "delivered"} onClick={() => selectStage("delivered")} />

                    <TreeChildren>
                      <div className="flex flex-col items-center">
                        <Node label="Opened" count={s.opened} pct={pct(s.opened, s.delivered)} color="blue"
                          active={stage === "opened"} disabled={s.delivered === 0} onClick={() => selectStage("opened")} />

                        <TreeChildren>
                          <Node label="Clicked" count={s.clicked} pct={pct(s.clicked, s.opened)} color="purple"
                            active={stage === "clicked"} disabled={s.opened === 0} onClick={() => selectStage("clicked")} />
                          <Node label="Not clicked" count={s.notClicked} pct={pct(s.notClicked, s.opened)} color="slate"
                            active={stage === "not_clicked"} disabled={s.opened === 0} onClick={() => selectStage("not_clicked")} />
                        </TreeChildren>
                      </div>

                      <Node label="Unopened" count={s.notOpened} pct={pct(s.notOpened, s.delivered)} color="slate"
                        active={stage === "not_opened"} disabled={s.delivered === 0} onClick={() => selectStage("not_opened")} />
                    </TreeChildren>
                  </div>

                  {s.failed > 0 && (
                    <Node label="Failed" count={s.failed} pct={pct(s.failed, s.total)} color="red"
                      active={stage === "failed"} onClick={() => selectStage("failed")} />
                  )}
                </TreeChildren>
              </div>
            </div>
          </div>

          {/* Recipients for the selected stage */}
            {stage && (
              <div className="max-w-2xl mx-auto bg-white border border-slate-200 rounded-xl overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{STAGE_LABEL[stage]} ({recipients?.length ?? 0})</p>
                    <p className="text-xs text-slate-400">Click an email to preview it</p>
                  </div>
                  <button onClick={() => { setStage(null); setRecipients(null); }} className="p-1.5 rounded hover:bg-slate-100 text-slate-400">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Push a remark to every email currently shown in this stage */}
                {recipients && recipients.length > 0 && (
                  <div className="px-5 py-4 border-b border-slate-100 bg-slate-50">
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5 block">
                      Add a remark to all {recipients.length} shown here
                    </label>
                    <div className="flex items-start gap-2">
                      <textarea value={remarkText} onChange={e => setRemarkText(e.target.value)} rows={2}
                        placeholder="e.g. Follow up by phone — did not open reminder…"
                        className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white" />
                      <Button size="sm" onClick={saveRemark} disabled={savingRemark || !remarkText.trim()} className="shrink-0 gap-1.5">
                        {remarkSaved ? <><Check className="w-3.5 h-3.5" />Saved</> : <><MessageSquarePlus className="w-3.5 h-3.5" />{savingRemark ? "Saving…" : "Save remark"}</>}
                      </Button>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1.5">Shows on each record's own Emails tab — helps track who still needs a follow-up.</p>
                  </div>
                )}

                <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto">
                  {loadingStage ? (
                    <div className="p-8 text-center"><Loader2 className="w-5 h-5 animate-spin text-slate-300 mx-auto" /></div>
                  ) : !recipients || recipients.length === 0 ? (
                    <div className="p-8 text-center text-sm text-slate-400">No emails in this stage.</div>
                  ) : recipients.map(rec => (
                    <div key={rec.id} className="flex items-center gap-3 px-5 py-2.5 hover:bg-slate-50 transition-colors">
                      <button onClick={() => handlePreview(rec.id)} className="flex-1 min-w-0 text-left">
                        <p className="text-sm font-medium text-slate-700 truncate">{rec.toName || rec.toEmail}</p>
                        {rec.toName && <p className="text-[11px] text-slate-400 truncate">{rec.toEmail}</p>}
                        {rec.errorMsg && <p className="text-[11px] text-red-400 truncate" title={rec.errorMsg}>{rec.errorMsg}</p>}
                        {rec.remark && <p className="text-[11px] text-amber-600 truncate mt-0.5" title={rec.remark}>📝 {rec.remark}</p>}
                      </button>
                      {rec.clickedAt && <span className="text-[11px] text-purple-500 shrink-0">clicked</span>}
                      {rec.openedAt && <span className="text-[11px] text-blue-500 flex items-center gap-1 shrink-0"><Eye className="w-3 h-3" /> opened</span>}
                      {(rec.status === "failed" || rec.status === "bounced") && (
                        resentIds.has(rec.id) ? (
                          <span className="text-[11px] text-emerald-600 flex items-center gap-1 shrink-0"><Check className="w-3 h-3" /> Resent</span>
                        ) : (
                          <button
                            onClick={() => handleResend(rec.id)}
                            disabled={resendingId === rec.id}
                            className="text-[11px] px-2 py-1 rounded border border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition-colors flex items-center gap-1 shrink-0 disabled:opacity-40"
                          >
                            {resendingId === rec.id
                              ? <Loader2 className="w-3 h-3 animate-spin" />
                              : <RefreshCcw className="w-3 h-3" />}
                            Resend
                          </button>
                        )
                      )}
                      <ChevronRight className="w-3.5 h-3.5 text-slate-300 shrink-0" />
                    </div>
                  ))}
                </div>
              </div>
            )}
        </div>
      </div>

      {/* Email preview modal */}
      {previewLog && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-slate-200">
              <div className="min-w-0">
                <p className="font-semibold text-slate-800 truncate">{previewLog.subject}</p>
                <p className="text-xs text-slate-400 mt-0.5 truncate">
                  To: {previewLog.toName ? `${previewLog.toName} <${previewLog.toEmail}>` : previewLog.toEmail}
                  &nbsp;·&nbsp;{new Date(previewLog.sentAt).toLocaleString()}
                </p>
              </div>
              <button onClick={() => setPreviewLog(null)} className="p-1.5 rounded hover:bg-slate-100 shrink-0">
                <X className="w-4 h-4 text-slate-500" />
              </button>
            </div>
            <div className="flex-1 overflow-auto">
              <iframe
                srcDoc={previewLog.body ?? ""}
                className="w-full"
                style={{ minHeight: 400, border: "none" }}
                onLoad={e => {
                  const iframe = e.target as HTMLIFrameElement;
                  if (iframe.contentDocument?.body) {
                    iframe.style.height = iframe.contentDocument.body.scrollHeight + "px";
                  }
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
