"use client";
import { useState, useEffect, useMemo } from "react";
import { api } from "@/lib/api";
import { renderEmailToHtml, type EmailDesign } from "./email-canvas";
import { buildVarMap } from "./send-email-modal";
import { Send, X, ChevronDown, Users, RefreshCcw, CheckCircle2, XCircle, Reply, Clock, CalendarClock, Building2, User, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface Template {
  id: string;
  name: string;
  subject: string;
  body: string;
  design: EmailDesign | null;
}

interface AudienceUser { id: string; email: string; name: string; }
interface Audience { organizationName: string; organizationEmail: string | null; users: AudienceUser[]; }

export interface BulkRecipient {
  recordId: string;
  email: string;
  name: string;
  recordData: Record<string, string | number | boolean | null | undefined>;
}

interface BulkSendEmailModalProps {
  open: boolean;
  onClose: () => void;
  /** Record-derived recipients (from the records list bulk-select flow) */
  recipients?: BulkRecipient[];
  /** "audience" fetches the organization's own email + every active user's email instead */
  mode?: "records" | "audience";
}

export function BulkSendEmailModal({ open, onClose, recipients = [], mode = "records" }: BulkSendEmailModalProps) {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loadingTpl, setLoadingTpl] = useState(false);
  const [selectedTpl, setSelectedTpl] = useState<Template | null>(null);
  const [showTplPicker, setShowTplPicker] = useState(false);
  const [subject, setSubject] = useState("");
  const [customBody, setCustomBody] = useState("");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ sent: number; bounced: number; failed: number } | null>(null);
  const [scheduled, setScheduled] = useState(false);
  const [error, setError] = useState("");
  const [replyTo, setReplyTo] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [sendMode, setSendMode] = useState<"now" | "schedule">("now");
  const [scheduleAt, setScheduleAt] = useState("");

  // Audience mode state
  const [audience, setAudience] = useState<Audience | null>(null);
  const [loadingAudience, setLoadingAudience] = useState(false);
  const [includeOrg, setIncludeOrg] = useState(true);
  const [includedUserIds, setIncludedUserIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!open) return;
    setResult(null); setScheduled(false); setError(""); setSelectedTpl(null); setSubject(""); setCustomBody("");
    setReplyTo(""); setShowAdvanced(false); setSendMode("now"); setScheduleAt("");
    setLoadingTpl(true);
    api.get("/email-templates").then(r => setTemplates(r.data ?? [])).catch(() => setTemplates([])).finally(() => setLoadingTpl(false));

    if (mode === "audience") {
      setLoadingAudience(true);
      api.get("/emails/audience").then(r => {
        setAudience(r.data);
        setIncludeOrg(!!r.data.organizationEmail);
        setIncludedUserIds(new Set((r.data.users ?? []).map((u: AudienceUser) => u.id)));
      }).catch(() => setAudience(null)).finally(() => setLoadingAudience(false));
    }
  }, [open, mode]);

  useEffect(() => {
    if (selectedTpl) setSubject(selectedTpl.subject ?? "");
  }, [selectedTpl]);

  const audienceRecipients: BulkRecipient[] = useMemo(() => {
    if (mode !== "audience" || !audience) return [];
    const list: BulkRecipient[] = [];
    if (includeOrg && audience.organizationEmail) {
      list.push({ recordId: "", email: audience.organizationEmail, name: audience.organizationName, recordData: {} });
    }
    for (const u of audience.users) {
      if (includedUserIds.has(u.id)) list.push({ recordId: "", email: u.email, name: u.name, recordData: {} });
    }
    return list;
  }, [mode, audience, includeOrg, includedUserIds]);

  const activeRecipients = mode === "audience" ? audienceRecipients : recipients;

  const toggleUser = (id: string) => {
    setIncludedUserIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleSend = async () => {
    if (!subject.trim()) { setError("Subject is required."); return; }
    if (activeRecipients.length === 0) { setError("No recipients selected."); return; }
    if (sendMode === "schedule" && !scheduleAt) { setError("Pick a date and time to send."); return; }
    const bodyTemplate = selectedTpl ? (selectedTpl.design ? null : selectedTpl.body) : customBody;
    if (!selectedTpl?.design && !bodyTemplate?.trim()) { setError("Choose a template or write a message."); return; }

    setSending(true); setError("");
    try {
      const payload = {
        recipients: activeRecipients.map(r => {
          const varMap = buildVarMap(r.recordData, r.email, r.name);
          return { email: r.email, name: r.name, mergeData: varMap, recordId: r.recordId || undefined };
        }),
        subject,
        body: selectedTpl?.design ? renderEmailToHtml(selectedTpl.design) : (bodyTemplate ?? ""),
        templateId: selectedTpl?.id ?? undefined,
        replyTo: replyTo.trim() || undefined,
      };
      if (sendMode === "schedule") {
        await api.post("/emails/schedule", { ...payload, sendAt: new Date(scheduleAt).toISOString() });
        setScheduled(true);
      } else {
        const { data } = await api.post("/emails/send", payload);
        setResult({ sent: data?.sent ?? 0, bounced: data?.bounced ?? 0, failed: data?.failed ?? 0 });
      }
    } catch (e: any) {
      setError(e?.response?.data?.message ?? e?.message ?? "Failed to send emails.");
    } finally {
      setSending(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-xl mx-4 bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden" style={{ maxHeight: "90vh" }}>
        <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-100 shrink-0">
          <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
            <Users className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-slate-800">
              {mode === "audience" ? "Send to your organization" : `Send Email to ${recipients.length} record${recipients.length === 1 ? "" : "s"}`}
            </p>
            <p className="text-xs text-slate-400">Each recipient gets their own merge-tag values</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {result || scheduled ? (
          <div className="flex flex-col items-center justify-center py-16 px-8 gap-4">
            <div className={cn("w-14 h-14 rounded-full flex items-center justify-center",
              scheduled || (result && result.sent > 0) ? "bg-emerald-100" : "bg-red-100")}>
              {scheduled
                ? <CalendarClock className="w-7 h-7 text-emerald-600" />
                : result && result.sent > 0
                  ? <CheckCircle2 className="w-7 h-7 text-emerald-600" />
                  : <XCircle className="w-7 h-7 text-red-600" />}
            </div>
            <p className="text-lg font-semibold text-slate-800">
              {scheduled ? "Emails scheduled!" : result && result.sent > 0 ? "Emails sent!" : "Sending failed"}
            </p>
            <p className="text-sm text-slate-500 text-center">
              {scheduled
                ? <>Will be sent to {activeRecipients.length} recipient{activeRecipients.length === 1 ? "" : "s"} on {new Date(scheduleAt).toLocaleString()}.</>
                : result && result.failed + result.bounced === 0
                  ? <>Sent to {result.sent} recipient{result.sent === 1 ? "" : "s"}.</>
                  : <>
                      {result?.sent ?? 0} sent
                      {(result?.bounced ?? 0) > 0 && <>, {result?.bounced} bounced</>}
                      {(result?.failed ?? 0) > 0 && <>, {result?.failed} failed</>}
                      {" — check the Emails tab or report for details."}
                    </>}
            </p>
            <button onClick={onClose} className="mt-2 px-6 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition-colors">Done</button>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {mode === "audience" ? (
                <div className="rounded-lg bg-slate-50 border border-slate-200 p-3 space-y-2 max-h-48 overflow-y-auto">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">Recipients ({activeRecipients.length})</p>
                  {loadingAudience ? (
                    <p className="text-xs text-slate-400 py-2">Loading your organization…</p>
                  ) : !audience ? (
                    <p className="text-xs text-red-400 py-2">Could not load organization/users.</p>
                  ) : (
                    <>
                      {audience.organizationEmail && (
                        <button type="button" onClick={() => setIncludeOrg(v => !v)}
                          className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-white transition-colors text-left">
                          <span className={cn("w-4 h-4 rounded border flex items-center justify-center shrink-0", includeOrg ? "bg-indigo-600 border-indigo-600" : "border-slate-300")}>
                            {includeOrg && <Check className="w-3 h-3 text-white" />}
                          </span>
                          <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="text-xs text-slate-700 truncate">{audience.organizationName} (organization) — {audience.organizationEmail}</span>
                        </button>
                      )}
                      {audience.users.map(u => (
                        <button key={u.id} type="button" onClick={() => toggleUser(u.id)}
                          className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-white transition-colors text-left">
                          <span className={cn("w-4 h-4 rounded border flex items-center justify-center shrink-0", includedUserIds.has(u.id) ? "bg-indigo-600 border-indigo-600" : "border-slate-300")}>
                            {includedUserIds.has(u.id) && <Check className="w-3 h-3 text-white" />}
                          </span>
                          <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="text-xs text-slate-700 truncate">{u.name} — {u.email}</span>
                        </button>
                      ))}
                    </>
                  )}
                </div>
              ) : (
                <div className="rounded-lg bg-slate-50 border border-slate-200 px-3 py-2.5 max-h-24 overflow-y-auto">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">Recipients ({recipients.length})</p>
                  <p className="text-xs text-slate-500 break-words">{recipients.map(r => r.email).join(", ")}</p>
                </div>
              )}

              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5 block">Template (optional)</label>
                <div className="relative">
                  <button onClick={() => setShowTplPicker(v => !v)}
                    className="w-full h-10 border border-slate-200 rounded-lg px-3 flex items-center gap-2 text-sm text-left hover:border-indigo-400 transition-colors bg-white">
                    <span className="flex-1 truncate text-slate-700">{selectedTpl ? selectedTpl.name : <span className="text-slate-400">Choose a saved template…</span>}</span>
                    {loadingTpl ? <RefreshCcw className="w-4 h-4 text-slate-300 animate-spin shrink-0" /> : <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />}
                  </button>
                  {showTplPicker && (
                    <div className="absolute z-20 left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden" style={{ maxHeight: 220 }}>
                      <div className="overflow-y-auto" style={{ maxHeight: 220 }}>
                        <button onClick={() => { setSelectedTpl(null); setShowTplPicker(false); }}
                          className="w-full px-4 py-3 text-sm text-left text-slate-400 hover:bg-slate-50 border-b border-slate-100">
                          No template (write custom message)
                        </button>
                        {templates.map(t => (
                          <button key={t.id} onClick={() => { setSelectedTpl(t); setShowTplPicker(false); }}
                            className={cn("w-full px-4 py-3 text-sm text-left flex items-center gap-2 hover:bg-indigo-50 transition-colors border-b border-slate-50 last:border-0", selectedTpl?.id === t.id && "bg-indigo-50")}>
                            <span className="flex-1 min-w-0 truncate font-medium text-slate-700">{t.name}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5 block">Subject *</label>
                <input type="text" value={subject} onChange={e => setSubject(e.target.value)} placeholder="Email subject…"
                  className="w-full h-10 border border-slate-200 rounded-lg px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
              </div>

              {/* Advanced: reply-to + send now/schedule */}
              <div>
                <button onClick={() => setShowAdvanced(v => !v)} type="button"
                  className="flex items-center gap-2 text-xs font-medium text-slate-500 hover:text-slate-700 transition-colors">
                  <ChevronDown className={cn("w-3.5 h-3.5 transition-transform", showAdvanced && "rotate-180")} />
                  Reply-to &amp; scheduling
                </button>
                {showAdvanced && (
                  <div className="mt-2.5 space-y-3 rounded-lg border border-slate-200 p-3">
                    <div>
                      <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5 block">Reply-To (optional)</label>
                      <div className="relative">
                        <Reply className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-300 pointer-events-none" />
                        <input type="email" value={replyTo} onChange={e => setReplyTo(e.target.value)} placeholder="Replies go to this address instead"
                          className="w-full h-9 border border-slate-200 rounded-lg pl-8 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                      </div>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5 block">When to send</label>
                      <div className="grid grid-cols-2 gap-2">
                        <button type="button" onClick={() => setSendMode("now")}
                          className={cn("h-9 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors",
                            sendMode === "now" ? "bg-indigo-600 border-indigo-600 text-white" : "border-slate-200 text-slate-600 hover:border-indigo-300")}>
                          <Send className="w-3.5 h-3.5" /> Send now
                        </button>
                        <button type="button" onClick={() => setSendMode("schedule")}
                          className={cn("h-9 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors",
                            sendMode === "schedule" ? "bg-indigo-600 border-indigo-600 text-white" : "border-slate-200 text-slate-600 hover:border-indigo-300")}>
                          <Clock className="w-3.5 h-3.5" /> Schedule
                        </button>
                      </div>
                      {sendMode === "schedule" && (
                        <input type="datetime-local" value={scheduleAt} onChange={e => setScheduleAt(e.target.value)}
                          min={new Date(Date.now() + 60000).toISOString().slice(0, 16)}
                          className="mt-2 w-full h-9 border border-slate-200 rounded-lg px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                      )}
                    </div>
                  </div>
                )}
              </div>

              {!selectedTpl && (
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5 block">Message</label>
                  <textarea value={customBody} onChange={e => setCustomBody(e.target.value)} rows={7}
                    placeholder={`Write your message here...\n\nUse {{name}}, {{email}} and other CRM field variables — each recipient gets their own values.`}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                </div>
              )}

              {error && (
                <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2.5 flex items-start gap-2">
                  <X className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between gap-3 shrink-0 bg-white">
              <button onClick={onClose} className="px-4 py-2 rounded-lg border border-slate-200 text-sm text-slate-600 hover:bg-slate-50 transition-colors">Cancel</button>
              <button onClick={handleSend} disabled={sending || !subject.trim() || activeRecipients.length === 0 || (sendMode === "schedule" && !scheduleAt)}
                className="flex items-center gap-2 px-6 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                {sending
                  ? <><RefreshCcw className="w-4 h-4 animate-spin" />{sendMode === "schedule" ? "Scheduling…" : "Sending…"}</>
                  : sendMode === "schedule" ? <><Clock className="w-4 h-4" />Schedule for {activeRecipients.length}</> : <><Send className="w-4 h-4" />Send to {activeRecipients.length}</>}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
