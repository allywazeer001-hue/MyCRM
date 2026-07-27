"use client";
import { useState, useEffect, useRef } from "react";
import { api } from "@/lib/api";
import { renderEmailToHtml, type EmailDesign } from "./email-canvas";
import { Send, X, ChevronDown, Eye, EyeOff, Mail, User, RefreshCcw, Reply, Clock, CalendarClock } from "lucide-react";
import { cn } from "@/lib/utils";

interface Template {
  id: string;
  name: string;
  subject: string;
  body: string;
  design: EmailDesign | null;
}

interface SendEmailModalProps {
  open: boolean;
  onClose: () => void;
  /** Pre-filled recipient email (from the record's email field) */
  defaultEmail?: string;
  /** Pre-filled recipient name (from the record's name field) */
  defaultName?: string;
  /** The full record data — used to substitute {{fieldName}} variables */
  recordData?: Record<string, string | number | boolean | null | undefined>;
  /** Extra label shown in the modal header (e.g. module record name) */
  recordLabel?: string;
  /** The record this email is about — tags the send so it shows in that record's email history */
  recordId?: string;
}

// Substitute {{var}} with record values; leave unmatched tags as-is
export function substituteVars(html: string, vars: Record<string, string>): string {
  return html.replace(/\{\{(\w+)\}\}/g, (_, k) => (vars[k] != null ? String(vars[k]) : `{{${k}}}`));
}

// Build a flat string-map from record data, plus standard email aliases.
// The `name` param is the modal's "Recipient Name" field (may be full name or empty).
export function buildVarMap(
  recordData: Record<string, string | number | boolean | null | undefined>,
  email: string,
  name: string,
): Record<string, string> {
  const base: Record<string, string> = {};
  Object.entries(recordData ?? {}).forEach(([k, v]) => {
    if (v != null && typeof v !== "object") base[k] = String(v);
  });

  // email alias
  if (email) base["email"] = email;

  // Resolve the best "full name" from: modal name field → common record field names → any record field
  const fullName =
    name.trim() ||
    base["name"] || base["fullName"] || base["full_name"] ||
    base["firstName"] || base["first_name"] ||
    base["contactName"] || base["clientName"] || base["studentName"] || base["scholarName"] ||
    // Last resort: first short text value that looks like a name (not an ID or number)
    Object.values(base).find(v => v.length > 1 && v.length < 80 && /[a-zA-Z]/.test(v) && !/^[0-9-]+$/.test(v)) ||
    "";

  if (fullName) {
    base["name"] = fullName;
    const parts = fullName.trim().split(/\s+/);
    base["firstName"] = parts[0] ?? "";
    base["lastName"]  = parts.slice(1).join(" ");
  }

  return base;
}

export function SendEmailModal({ open, onClose, defaultEmail = "", defaultName = "", recordData = {}, recordLabel, recordId }: SendEmailModalProps) {
  const [templates, setTemplates]   = useState<Template[]>([]);
  const [loadingTpl, setLoadingTpl] = useState(false);
  const [selectedTpl, setSelectedTpl] = useState<Template | null>(null);
  const [showTplPicker, setShowTplPicker] = useState(false);
  const [showPreview, setShowPreview]   = useState(false);
  const [sending, setSending]           = useState(false);
  const [sent, setSent]                 = useState(false);
  const [error, setError]               = useState("");

  const [toEmail,  setToEmail]  = useState(defaultEmail);
  const [toName,   setToName]   = useState(defaultName);
  const [subject,  setSubject]  = useState("");
  const [customBody, setCustomBody] = useState("");
  const [replyTo, setReplyTo] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [sendMode, setSendMode] = useState<"now" | "schedule">("now");
  const [scheduleAt, setScheduleAt] = useState("");
  const [scheduled, setScheduled] = useState(false);

  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (!open) return;
    setToEmail(defaultEmail);
    setToName(defaultName);
    setSent(false); setScheduled(false); setError(""); setSelectedTpl(null); setSubject(""); setCustomBody(""); setShowPreview(false);
    setReplyTo(""); setShowAdvanced(false); setSendMode("now"); setScheduleAt("");
    setLoadingTpl(true);
    api.get("/email-templates").then(r => setTemplates(r.data ?? [])).catch(() => setTemplates([])).finally(() => setLoadingTpl(false));
  }, [open, defaultEmail, defaultName]);

  useEffect(() => {
    if (selectedTpl) setSubject(selectedTpl.subject ?? "");
  }, [selectedTpl]);

  const varMap = buildVarMap(recordData, toEmail, toName);

  // Resolved HTML: use template if chosen, else fall back to customBody
  function resolvedHtml(): string {
    if (selectedTpl) {
      const raw = selectedTpl.design
        ? renderEmailToHtml(selectedTpl.design, varMap)
        : selectedTpl.body;
      return substituteVars(raw, varMap);
    }
    return substituteVars(customBody, varMap);
  }

  const scaledPreview = selectedTpl?.design
    ? renderEmailToHtml(selectedTpl.design, varMap)
    : null;

  const handleSend = async () => {
    if (!toEmail.trim()) { setError("Recipient email is required."); return; }
    if (!subject.trim()) { setError("Subject is required."); return; }
    if (sendMode === "schedule" && !scheduleAt) { setError("Pick a date and time to send."); return; }

    // Resolve all {{tags}} on the frontend with the current varMap.
    // Backend will also resolve with mergeData (belt-and-suspenders).
    const resolvedBody = resolvedHtml();
    if (!resolvedBody.trim()) { setError("Email body cannot be empty. Choose a template or write a message."); return; }
    const resolvedSubject = substituteVars(subject.trim(), varMap);

    setSending(true); setError("");
    try {
      const payload = {
        recipients: [{
          email: toEmail.trim(),
          name: toName.trim(),
          mergeData: varMap,
          recordId,
        }],
        subject: resolvedSubject,
        body: resolvedBody,
        templateId: selectedTpl?.id ?? undefined,
        recordId,
        replyTo: replyTo.trim() || undefined,
      };
      if (sendMode === "schedule") {
        await api.post("/emails/schedule", { ...payload, sendAt: new Date(scheduleAt).toISOString() });
        setScheduled(true);
      } else {
        await api.post("/emails/send", payload);
        setSent(true);
      }
    } catch (e: any) {
      setError(e?.response?.data?.message ?? e?.message ?? "Failed to send email.");
    } finally {
      setSending(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      <div className="relative z-10 w-full max-w-2xl mx-4 bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden" style={{ maxHeight: "90vh" }}>
        {/* Header */}
        <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-100 shrink-0">
          <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
            <Mail className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-slate-800">Send Email</p>
            {recordLabel && <p className="text-xs text-slate-400 truncate">to: {recordLabel}</p>}
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {sent || scheduled ? (
          <div className="flex flex-col items-center justify-center py-16 px-8 gap-4">
            <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center">
              {scheduled ? <CalendarClock className="w-7 h-7 text-emerald-600" /> : <Send className="w-7 h-7 text-emerald-600" />}
            </div>
            <p className="text-lg font-semibold text-slate-800">{scheduled ? "Email scheduled!" : "Email sent!"}</p>
            <p className="text-sm text-slate-500 text-center">
              {scheduled
                ? <>Will be sent to <strong>{toEmail}</strong> on {new Date(scheduleAt).toLocaleString()}.</>
                : <>Your email was sent to <strong>{toEmail}</strong>.</>}
            </p>
            <button onClick={onClose} className="mt-2 px-6 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition-colors">Done</button>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {/* To */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5 block">Recipient Email *</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 pointer-events-none" />
                    <input type="email" value={toEmail} onChange={e => setToEmail(e.target.value)} placeholder="email@example.com"
                      className="w-full h-10 border border-slate-200 rounded-lg pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5 block">Recipient Name</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 pointer-events-none" />
                    <input type="text" value={toName} onChange={e => setToName(e.target.value)} placeholder="John Smith"
                      className="w-full h-10 border border-slate-200 rounded-lg pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                  </div>
                </div>
              </div>

              {/* Template picker */}
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5 block">Template (optional)</label>
                <div className="relative">
                  <button onClick={() => setShowTplPicker(v => !v)}
                    className="w-full h-10 border border-slate-200 rounded-lg px-3 flex items-center gap-2 text-sm text-left hover:border-indigo-400 transition-colors bg-white">
                    <span className="flex-1 truncate text-slate-700">{selectedTpl ? selectedTpl.name : <span className="text-slate-400">Choose a saved template…</span>}</span>
                    {loadingTpl ? <RefreshCcw className="w-4 h-4 text-slate-300 animate-spin shrink-0" /> : <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />}
                  </button>

                  {showTplPicker && (
                    <div className="absolute z-20 left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden" style={{ maxHeight: 260 }}>
                      <div className="overflow-y-auto" style={{ maxHeight: 260 }}>
                        <button onClick={() => { setSelectedTpl(null); setShowTplPicker(false); }}
                          className="w-full px-4 py-3 text-sm text-left text-slate-400 hover:bg-slate-50 border-b border-slate-100">
                          No template (write custom message)
                        </button>
                        {templates.length === 0 && !loadingTpl && (
                          <p className="px-4 py-3 text-sm text-slate-400">No templates saved yet.</p>
                        )}
                        {templates.map(t => (
                          <button key={t.id} onClick={() => { setSelectedTpl(t); setShowTplPicker(false); setShowPreview(true); }}
                            className={cn("w-full px-4 py-3 text-sm text-left flex items-center gap-3 hover:bg-indigo-50 transition-colors border-b border-slate-50 last:border-0", selectedTpl?.id === t.id && "bg-indigo-50")}>
                            {t.design && (
                              <div className="shrink-0 w-12 h-10 border border-slate-200 rounded overflow-hidden bg-slate-50 relative">
                                <iframe srcDoc={renderEmailToHtml(t.design)} className="absolute inset-0" style={{ width: 500, height: 700, transform: "scale(0.096)", transformOrigin: "top left", border: "none", pointerEvents: "none" }} />
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-slate-700 truncate">{t.name}</p>
                              <p className="text-xs text-slate-400 truncate">Subj: {t.subject}</p>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Subject */}
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

              {/* Custom body if no template */}
              {!selectedTpl && (
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5 block">Message</label>
                  <textarea value={customBody} onChange={e => setCustomBody(e.target.value)} rows={6}
                    placeholder={`Write your message here...\n\nYou can use {{name}}, {{email}}, {{orgName}} and other CRM field variables.`}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                  <p className="text-[10px] text-slate-400 mt-1">Plain text or HTML accepted. Use <span className="font-mono bg-slate-100 px-0.5 rounded">{"{{fieldName}}"}</span> for variable substitution.</p>
                </div>
              )}

              {/* Preview toggle */}
              {(selectedTpl || customBody) && (
                <div>
                  <button onClick={() => setShowPreview(p => !p)}
                    className="flex items-center gap-2 text-xs font-medium text-indigo-600 hover:text-indigo-800 transition-colors">
                    {showPreview ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    {showPreview ? "Hide preview" : "Preview with field data"}
                  </button>

                  {showPreview && (
                    <div className="mt-3 border border-slate-200 rounded-xl overflow-hidden bg-slate-50" style={{ height: 360 }}>
                      <div className="bg-slate-100 px-3 py-2 border-b border-slate-200 flex items-center gap-2">
                        <span className="text-xs text-slate-500 font-medium">Preview</span>
                        <span className="text-[10px] text-slate-400">Variables substituted with record data</span>
                      </div>
                      <iframe ref={iframeRef} srcDoc={resolvedHtml()} style={{ width: "100%", height: "100%", border: "none", background: "#fff" }} />
                    </div>
                  )}
                </div>
              )}

              {/* Variable map — shows every {{tag}} that will be substituted */}
              {Object.keys(varMap).length > 0 && (
                <div className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2.5">
                  <p className="text-[10px] font-bold text-amber-700 uppercase tracking-wide mb-2">
                    Available merge fields — use these in your template
                  </p>
                  <div className="grid grid-cols-2 gap-x-6 gap-y-1 max-h-32 overflow-y-auto">
                    {Object.entries(varMap).map(([k, v]) => (
                      <div key={k} className="flex items-center gap-1.5 min-w-0">
                        <span className="font-mono text-[10px] text-amber-700 bg-amber-100 border border-amber-200 px-1 py-0.5 rounded shrink-0 whitespace-nowrap">{`{{${k}}}`}</span>
                        <span className="text-[10px] text-amber-900 font-semibold truncate">{v || <em className="font-normal text-amber-400">empty</em>}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {error && (
                <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2.5 flex items-start gap-2">
                  <X className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between gap-3 shrink-0 bg-white">
              <button onClick={onClose} className="px-4 py-2 rounded-lg border border-slate-200 text-sm text-slate-600 hover:bg-slate-50 transition-colors">Cancel</button>
              <button onClick={handleSend} disabled={sending || !toEmail.trim() || !subject.trim() || (sendMode === "schedule" && !scheduleAt)}
                className="flex items-center gap-2 px-6 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                {sending
                  ? <><RefreshCcw className="w-4 h-4 animate-spin" />{sendMode === "schedule" ? "Scheduling…" : "Sending…"}</>
                  : sendMode === "schedule" ? <><Clock className="w-4 h-4" />Schedule Send</> : <><Send className="w-4 h-4" />Send Email</>}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
