"use client";
import { useState, useEffect, useRef } from "react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Mail, Plus, Send, FileText, Clock, CheckCircle2, XCircle,
  Trash2, Edit2, Save, X, ChevronRight, Users, Link2, Eye, EyeOff,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/auth.store";

// ── Types ─────────────────────────────────────────────────────────────────────
interface EmailTemplate { id: string; name: string; subject: string; body: string; updatedAt: string; }
interface EmailLog { id: string; toEmail: string; toName?: string; subject: string; status: string; sentAt: string; sentBy?: { firstName: string; lastName: string }; }
interface Recipient { email: string; name?: string; mergeData?: Record<string, string>; }

type Tab = "compose" | "sent" | "templates";

// ── Merge tag helper ──────────────────────────────────────────────────────────
const MERGE_TAGS = [
  { tag: "{{name}}",       label: "Full name" },
  { tag: "{{email}}",      label: "Email" },
  { tag: "{{firstName}}",  label: "First name" },
  { tag: "{{lastName}}",   label: "Last name" },
  { tag: "{{customLink}}", label: "Custom link" },
  { tag: "{{orgName}}",    label: "Organisation" },
];

function insertAtCursor(el: HTMLTextAreaElement | null, text: string, setter: (v: string) => void, current: string) {
  if (!el) { setter(current + text); return; }
  const start = el.selectionStart ?? current.length;
  const end   = el.selectionEnd   ?? current.length;
  setter(current.slice(0, start) + text + current.slice(end));
  setTimeout(() => { el.selectionStart = el.selectionEnd = start + text.length; el.focus(); }, 0);
}

// ── Recipient row ─────────────────────────────────────────────────────────────
function RecipientRow({ r, idx, onChange, onRemove }: {
  r: Recipient; idx: number;
  onChange: (idx: number, r: Recipient) => void;
  onRemove: (idx: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const md = r.mergeData ?? {};
  return (
    <div className="border border-slate-200 rounded-lg p-2 space-y-2 bg-white">
      <div className="flex gap-2 items-center">
        <Input value={r.email} onChange={e => onChange(idx, { ...r, email: e.target.value })}
          placeholder="recipient@email.com" className="h-8 text-sm flex-1" />
        <Input value={r.name ?? ""} onChange={e => onChange(idx, { ...r, name: e.target.value })}
          placeholder="Name (optional)" className="h-8 text-sm w-40" />
        <button onClick={() => setOpen(p => !p)} title="Merge data"
          className="p-1.5 rounded hover:bg-slate-100 text-slate-500">
          {open ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
        </button>
        <button onClick={() => onRemove(idx)} className="p-1.5 rounded hover:bg-red-50 text-slate-400 hover:text-red-500">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
      {open && (
        <div className="grid grid-cols-2 gap-1.5 pl-1">
          {["firstName","lastName","customLink","orgName"].map(k => (
            <div key={k} className="flex gap-1 items-center">
              <span className="text-[10px] text-slate-400 w-20 shrink-0">{`{{${k}}}`}</span>
              <Input value={md[k] ?? ""} onChange={e => onChange(idx, { ...r, mergeData: { ...md, [k]: e.target.value } })}
                placeholder={k} className="h-6 text-xs" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Template editor ───────────────────────────────────────────────────────────
function TemplateEditor({ tpl, onSave, onCancel }: {
  tpl?: EmailTemplate;
  onSave: (data: { name: string; subject: string; body: string }) => void;
  onCancel: () => void;
}) {
  const [name,    setName]    = useState(tpl?.name    ?? "");
  const [subject, setSubject] = useState(tpl?.subject ?? "");
  const [body,    setBody]    = useState(tpl?.body    ?? "");
  const bodyRef = useRef<HTMLTextAreaElement>(null);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <h3 className="text-sm font-semibold text-slate-800 flex-1">
          {tpl ? "Edit Template" : "New Template"}
        </h3>
        <Button size="sm" variant="ghost" onClick={onCancel}><X className="w-4 h-4" /></Button>
      </div>
      <Input value={name} onChange={e => setName(e.target.value)} placeholder="Template name" className="h-8 text-sm" />
      <Input value={subject} onChange={e => setSubject(e.target.value)} placeholder="Subject line" className="h-8 text-sm" />

      {/* Merge tag toolbar */}
      <div className="flex flex-wrap gap-1">
        {MERGE_TAGS.map(m => (
          <button key={m.tag} onClick={() => insertAtCursor(bodyRef.current, m.tag, setBody, body)}
            className="text-[10px] px-2 py-0.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-full font-mono">
            {m.tag}
          </button>
        ))}
      </div>

      <Textarea ref={bodyRef} value={body} onChange={e => setBody(e.target.value)}
        placeholder="Email body… use {{name}}, {{customLink}}, etc. for personalisation"
        className="text-sm min-h-[200px] font-mono" />

      <div className="flex justify-end gap-2">
        <Button size="sm" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button size="sm" onClick={() => onSave({ name, subject, body })}
          disabled={!name || !subject || !body}>
          <Save className="w-3.5 h-3.5 mr-1" /> Save Template
        </Button>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function EmailsPage() {
  const { user } = useAuthStore();
  const [tab, setTab] = useState<Tab>("compose");

  // compose state
  const [recipients, setRecipients] = useState<Recipient[]>([{ email: "", name: "" }]);
  const [subject, setSubject]       = useState("");
  const [body, setBody]             = useState("");
  const [selectedTpl, setSelectedTpl] = useState<string>("");
  const [sending, setSending]       = useState(false);
  const [sendResult, setSendResult] = useState<{ sent: number; failed: number } | null>(null);
  const bodyRef = useRef<HTMLTextAreaElement>(null);

  // templates state
  const [templates, setTemplates]     = useState<EmailTemplate[]>([]);
  const [editingTpl, setEditingTpl]   = useState<EmailTemplate | "new" | null>(null);
  const [tplLoading, setTplLoading]   = useState(false);

  // sent log state
  const [logs, setLogs]       = useState<EmailLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [previewLog, setPreviewLog]   = useState<EmailLog & { body?: string } | null>(null);

  // ── load templates ──────────────────────────────────────────────────────────
  useEffect(() => {
    setTplLoading(true);
    api.get("/email-templates").then(r => setTemplates(r.data)).catch(() => {}).finally(() => setTplLoading(false));
  }, []);

  // ── load logs when tab is sent ──────────────────────────────────────────────
  useEffect(() => {
    if (tab !== "sent") return;
    setLogsLoading(true);
    api.get("/emails").then(r => setLogs(r.data)).catch(() => {}).finally(() => setLogsLoading(false));
  }, [tab]);

  // ── apply template to compose ───────────────────────────────────────────────
  useEffect(() => {
    if (!selectedTpl) return;
    const t = templates.find(x => x.id === selectedTpl);
    if (t) { setSubject(t.subject); setBody(t.body); }
  }, [selectedTpl]);

  // ── recipient helpers ───────────────────────────────────────────────────────
  const addRecipient = () => setRecipients(p => [...p, { email: "", name: "" }]);
  const updateRecipient = (idx: number, r: Recipient) => setRecipients(p => p.map((x, i) => i === idx ? r : x));
  const removeRecipient = (idx: number) => setRecipients(p => p.filter((_, i) => i !== idx));

  // ── send ────────────────────────────────────────────────────────────────────
  const handleSend = async () => {
    const valid = recipients.filter(r => r.email.trim());
    if (!valid.length || !subject || !body) return;
    setSending(true); setSendResult(null);
    try {
      const { data } = await api.post("/emails/send", {
        recipients: valid,
        subject,
        body,
        templateId: selectedTpl || undefined,
      });
      setSendResult(data);
      // reset
      setRecipients([{ email: "", name: "" }]);
      setSubject(""); setBody(""); setSelectedTpl("");
    } catch { setSendResult({ sent: 0, failed: valid.length }); }
    finally { setSending(false); }
  };

  // ── template save ───────────────────────────────────────────────────────────
  const handleSaveTpl = async (data: { name: string; subject: string; body: string }) => {
    try {
      if (editingTpl === "new") {
        const r = await api.post("/email-templates", data);
        setTemplates(p => [r.data, ...p]);
      } else if (editingTpl) {
        const r = await api.patch(`/email-templates/${editingTpl.id}`, data);
        setTemplates(p => p.map(t => t.id === editingTpl.id ? r.data : t));
      }
      setEditingTpl(null);
    } catch {}
  };

  const handleDeleteTpl = async (id: string) => {
    await api.delete(`/email-templates/${id}`);
    setTemplates(p => p.filter(t => t.id !== id));
  };

  // ── preview sent email ──────────────────────────────────────────────────────
  const handlePreviewLog = async (log: EmailLog) => {
    const { data } = await api.get(`/emails/${log.id}`);
    setPreviewLog(data);
  };

  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <div className="h-full flex flex-col bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center gap-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
            <Mail className="w-4 h-4 text-white" />
          </div>
          <div>
            <h1 className="text-base font-semibold text-slate-900">Emails</h1>
            <p className="text-xs text-slate-500">Compose, templates &amp; sent history</p>
          </div>
        </div>
        <div className="ml-auto flex gap-2">
          {tab === "templates" && (
            <Button size="sm" onClick={() => setEditingTpl("new")}>
              <Plus className="w-3.5 h-3.5 mr-1" /> New Template
            </Button>
          )}
          {tab === "compose" && (
            <Button size="sm" onClick={handleSend} disabled={sending ||
              !recipients.some(r => r.email.trim()) || !subject || !body}>
              {sending ? "Sending…" : <><Send className="w-3.5 h-3.5 mr-1" /> Send Email</>}
            </Button>
          )}
        </div>
      </div>

      {/* Tab bar */}
      <div className="bg-white border-b border-slate-200 px-6 flex gap-1">
        {(["compose","sent","templates"] as Tab[]).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={cn("px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors capitalize",
              tab === t ? "border-indigo-600 text-indigo-700" : "border-transparent text-slate-500 hover:text-slate-800")}>
            {t === "compose" && <Send className="w-3.5 h-3.5 inline mr-1.5" />}
            {t === "sent"    && <Clock className="w-3.5 h-3.5 inline mr-1.5" />}
            {t === "templates" && <FileText className="w-3.5 h-3.5 inline mr-1.5" />}
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-hidden">
        <ScrollArea className="h-full">
          <div className="p-6 max-w-4xl mx-auto space-y-5">

            {/* ── COMPOSE TAB ─────────────────────────────────────────────── */}
            {tab === "compose" && (
              <>
                {sendResult && (
                  <div className={cn("flex items-center gap-2 p-3 rounded-lg text-sm",
                    sendResult.failed ? "bg-red-50 text-red-700 border border-red-200"
                                      : "bg-green-50 text-green-700 border border-green-200")}>
                    {sendResult.failed
                      ? <XCircle className="w-4 h-4" />
                      : <CheckCircle2 className="w-4 h-4" />}
                    {sendResult.sent} sent{sendResult.failed ? `, ${sendResult.failed} failed` : " successfully"}
                  </div>
                )}

                {/* Template picker */}
                <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Template (optional)</p>
                  <div className="flex flex-wrap gap-2">
                    <button onClick={() => setSelectedTpl("")}
                      className={cn("px-3 py-1.5 rounded-lg text-xs border transition-colors",
                        !selectedTpl ? "bg-indigo-600 text-white border-indigo-600"
                                     : "bg-white text-slate-600 border-slate-200 hover:border-slate-300")}>
                      Blank
                    </button>
                    {templates.map(t => (
                      <button key={t.id} onClick={() => setSelectedTpl(t.id)}
                        className={cn("px-3 py-1.5 rounded-lg text-xs border transition-colors",
                          selectedTpl === t.id ? "bg-indigo-600 text-white border-indigo-600"
                                               : "bg-white text-slate-600 border-slate-200 hover:border-slate-300")}>
                        {t.name}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Recipients */}
                <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5" /> Recipients
                    </p>
                    <Button size="sm" variant="outline" onClick={addRecipient} className="h-7 text-xs">
                      <Plus className="w-3 h-3 mr-1" /> Add
                    </Button>
                  </div>
                  {recipients.map((r, i) => (
                    <RecipientRow key={i} r={r} idx={i} onChange={updateRecipient} onRemove={removeRecipient} />
                  ))}
                  <p className="text-[10px] text-slate-400 flex items-center gap-1">
                    <Link2 className="w-3 h-3" />
                    Click the eye icon on each recipient to set merge data (e.g. custom link per person)
                  </p>
                </div>

                {/* Subject */}
                <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-2">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Subject</p>
                  <Input value={subject} onChange={e => setSubject(e.target.value)}
                    placeholder="Email subject… use {{name}} to personalise" className="h-9 text-sm" />
                </div>

                {/* Body */}
                <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Body</p>

                  {/* Merge tag toolbar */}
                  <div className="flex flex-wrap gap-1.5">
                    {MERGE_TAGS.map(m => (
                      <button key={m.tag} onClick={() => insertAtCursor(bodyRef.current, m.tag, setBody, body)}
                        title={m.label}
                        className="text-[10px] px-2 py-0.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-full font-mono transition-colors">
                        {m.tag}
                      </button>
                    ))}
                  </div>

                  <Textarea ref={bodyRef} value={body} onChange={e => setBody(e.target.value)}
                    placeholder={`Hi {{firstName}},\n\nYour application link: {{customLink}}\n\nBest regards`}
                    className="text-sm min-h-[240px] font-mono" />

                  <p className="text-[10px] text-slate-400">
                    Click a merge tag to insert at cursor. Each recipient receives their own personalised version.
                  </p>
                </div>
              </>
            )}

            {/* ── SENT TAB ────────────────────────────────────────────────── */}
            {tab === "sent" && (
              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                {logsLoading ? (
                  <div className="p-10 text-center text-sm text-slate-400">Loading…</div>
                ) : logs.length === 0 ? (
                  <div className="p-10 text-center">
                    <Clock className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="text-sm text-slate-400">No emails sent yet</p>
                  </div>
                ) : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-100 bg-slate-50">
                        <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500">To</th>
                        <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500">Subject</th>
                        <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500">Status</th>
                        <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500">Sent</th>
                        <th className="px-4 py-2.5" />
                      </tr>
                    </thead>
                    <tbody>
                      {logs.map(log => (
                        <tr key={log.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                          <td className="px-4 py-2.5">
                            <p className="font-medium text-slate-800">{log.toName || log.toEmail}</p>
                            {log.toName && <p className="text-[11px] text-slate-400">{log.toEmail}</p>}
                          </td>
                          <td className="px-4 py-2.5 text-slate-600 max-w-xs truncate">{log.subject}</td>
                          <td className="px-4 py-2.5">
                            <Badge variant="outline"
                              className={cn("text-[10px]",
                                log.status === "sent" ? "bg-green-50 text-green-700 border-green-200"
                                                       : "bg-red-50 text-red-700 border-red-200")}>
                              {log.status === "sent"
                                ? <CheckCircle2 className="w-3 h-3 mr-1" />
                                : <XCircle className="w-3 h-3 mr-1" />}
                              {log.status}
                            </Badge>
                          </td>
                          <td className="px-4 py-2.5 text-slate-400 text-xs">
                            {new Date(log.sentAt).toLocaleString()}
                          </td>
                          <td className="px-4 py-2.5">
                            <button onClick={() => handlePreviewLog(log)}
                              className="p-1 rounded hover:bg-slate-200 text-slate-400">
                              <ChevronRight className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            {/* ── TEMPLATES TAB ───────────────────────────────────────────── */}
            {tab === "templates" && (
              <>
                {editingTpl && (
                  <div className="bg-white border border-slate-200 rounded-xl p-5">
                    <TemplateEditor
                      tpl={editingTpl === "new" ? undefined : editingTpl}
                      onSave={handleSaveTpl}
                      onCancel={() => setEditingTpl(null)}
                    />
                  </div>
                )}

                {!editingTpl && tplLoading && (
                  <div className="p-10 text-center text-sm text-slate-400">Loading…</div>
                )}

                {!editingTpl && !tplLoading && templates.length === 0 && (
                  <div className="bg-white border border-slate-200 rounded-xl p-12 text-center">
                    <FileText className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                    <p className="text-sm font-medium text-slate-600 mb-1">No templates yet</p>
                    <p className="text-xs text-slate-400 mb-4">Create reusable email templates with merge tags</p>
                    <Button size="sm" onClick={() => setEditingTpl("new")}>
                      <Plus className="w-3.5 h-3.5 mr-1" /> Create Template
                    </Button>
                  </div>
                )}

                {!editingTpl && templates.map(t => (
                  <div key={t.id} className="bg-white border border-slate-200 rounded-xl p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-slate-800 text-sm">{t.name}</p>
                        <p className="text-xs text-slate-500 mt-0.5 truncate">Subject: {t.subject}</p>
                        <p className="text-xs text-slate-400 mt-1 line-clamp-2 font-mono">{t.body}</p>
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <Button size="sm" variant="outline" className="h-7 px-2"
                          onClick={() => { setSelectedTpl(t.id); setTab("compose"); }}>
                          <Send className="w-3 h-3 mr-1" /> Use
                        </Button>
                        <Button size="sm" variant="outline" className="h-7 px-2"
                          onClick={() => setEditingTpl(t)}>
                          <Edit2 className="w-3 h-3" />
                        </Button>
                        <Button size="sm" variant="outline" className="h-7 px-2 text-red-500 hover:text-red-600 hover:border-red-300"
                          onClick={() => handleDeleteTpl(t.id)}>
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {(t.body.match(/\{\{(\w+)\}\}/g) ?? []).filter((v, i, a) => a.indexOf(v) === i).map(tag => (
                        <span key={tag} className="text-[10px] px-1.5 py-0.5 bg-indigo-50 text-indigo-600 border border-indigo-100 rounded font-mono">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </>
            )}

          </div>
        </ScrollArea>
      </div>

      {/* ── Email preview modal ────────────────────────────────────────────────── */}
      {previewLog && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-slate-200">
              <div>
                <p className="font-semibold text-slate-800">{previewLog.subject}</p>
                <p className="text-xs text-slate-400 mt-0.5">
                  To: {previewLog.toName ? `${previewLog.toName} <${previewLog.toEmail}>` : previewLog.toEmail}
                  &nbsp;·&nbsp;{new Date(previewLog.sentAt).toLocaleString()}
                </p>
              </div>
              <button onClick={() => setPreviewLog(null)} className="p-1.5 rounded hover:bg-slate-100">
                <X className="w-4 h-4 text-slate-500" />
              </button>
            </div>
            <ScrollArea className="flex-1 p-5">
              <pre className="text-sm text-slate-700 whitespace-pre-wrap font-sans leading-relaxed">
                {previewLog.body}
              </pre>
            </ScrollArea>
          </div>
        </div>
      )}
    </div>
  );
}
