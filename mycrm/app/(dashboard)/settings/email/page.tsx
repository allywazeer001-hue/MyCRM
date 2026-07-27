"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Mail, Plus, FileText, Clock,
  Trash2, Edit2, Save, ChevronRight,
  Palette, ArrowLeft, Search, CalendarClock, Ban, Send,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { EmailCanvas, renderEmailToHtml, DEFAULT_DESIGN } from "@/components/email/email-canvas";
import type { EmailDesign } from "@/components/email/email-canvas";
import { BulkSendEmailModal } from "@/components/email/bulk-send-email-modal";

// ── Types ─────────────────────────────────────────────────────────────────────
interface EmailTemplate {
  id: string; name: string; subject: string; body: string;
  design?: EmailDesign; updatedAt: string;
}
interface CampaignReport {
  batchId: string; subject: string; sentAt: string; total: number;
  delivered: number; failed: number; bounced: number;
  opened: number; notOpened: number; clicked: number; notClicked: number;
}
interface ScheduledEmailItem {
  id: string; subject: string; sendAt: string; status: string;
  recipients: { email: string; name?: string }[];
}
type Tab = "templates" | "sent" | "scheduled";

// ── Template Canvas Editor (full screen) ──────────────────────────────────────
function TemplateCanvasEditor({ tpl, onSave, onCancel }: {
  tpl?: EmailTemplate;
  onSave: (d: { name: string; subject: string; body: string; design: EmailDesign }) => Promise<void>;
  onCancel: () => void;
}) {
  const [name,          setName]          = useState(tpl?.name    ?? "");
  const [subject,       setSubject]       = useState(tpl?.subject ?? "");
  const [design,        setDesign]        = useState<EmailDesign>(tpl?.design ?? DEFAULT_DESIGN);
  const [saving,        setSaving]        = useState(false);
  const [imageUploading, setImageUploading] = useState(false);
  const [error,         setError]         = useState("");

  const handleSave = async () => {
    if (!name.trim())    { setError("Template name is required."); return; }
    if (!subject.trim()) { setError("Subject line is required."); return; }
    setSaving(true); setError("");
    try {
      const body = renderEmailToHtml(design);
      await onSave({ name: name.trim(), subject: subject.trim(), body, design });
    } catch (e: any) {
      const msg = e?.response?.data?.message ?? e?.message ?? "Failed to save. Check your connection.";
      setError(Array.isArray(msg) ? msg.join(", ") : String(msg));
    } finally {
      setSaving(false);
    }
  };

  const isBusy = saving || imageUploading;
  const saveLabel = imageUploading ? "Uploading image…" : saving ? "Saving…" : null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-100 flex flex-col">
      {/* Top bar — two rows */}
      <div className="bg-white border-b border-slate-200 shrink-0">
        {/* Row 1: nav + actions */}
        <div className="h-12 flex items-center gap-3 px-4">
          <button onClick={onCancel} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 transition-colors shrink-0">
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
          <div className="w-px h-5 bg-slate-200" />
          <Palette className="w-4 h-4 text-indigo-600 shrink-0" />
          <span className="text-sm font-semibold text-slate-800 shrink-0">
            {tpl ? "Edit Template" : "New Template"}
          </span>
          <div className="flex-1" />
          {imageUploading && (
            <span className="text-xs text-indigo-600 bg-indigo-50 border border-indigo-200 rounded px-2 py-1 flex items-center gap-1.5 shrink-0">
              <span className="w-3 h-3 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin inline-block" />
              Uploading image…
            </span>
          )}
          {error && !imageUploading && (
            <span className="text-xs text-red-600 bg-red-50 border border-red-200 rounded px-2 py-1 max-w-sm truncate shrink-0" title={error}>
              ⚠ {error}
            </span>
          )}
          <Button size="sm" variant="outline" onClick={onCancel} disabled={isBusy} className="shrink-0">Cancel</Button>
          <Button size="sm" onClick={handleSave} disabled={isBusy} className="shrink-0">
            {isBusy
              ? <><span className="w-3.5 h-3.5 mr-1 border-2 border-white border-t-transparent rounded-full animate-spin inline-block" />{saveLabel}</>
              : <><Save className="w-3.5 h-3.5 mr-1" />Save Template</>
            }
          </Button>
        </div>
        {/* Row 2: name + subject fields */}
        <div className="h-11 flex items-center gap-2 px-4 border-t border-slate-100 bg-slate-50">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide shrink-0 w-12">Name</span>
          <Input value={name} onChange={e => { setName(e.target.value); setError(""); }}
            placeholder="Template name…"
            className={cn("h-8 text-sm w-52 shrink-0", !name && error ? "border-red-400 ring-1 ring-red-400" : "")} />
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide shrink-0 w-16 text-right">Subject</span>
          <Input value={subject} onChange={e => { setSubject(e.target.value); setError(""); }}
            placeholder="Email subject line…"
            className={cn("h-8 text-sm flex-1", !subject && error ? "border-red-400 ring-1 ring-red-400" : "")} />
          <div className="flex gap-1 shrink-0">
            {["{{name}}","{{firstName}}","{{email}}"].map(tag => (
              <button key={tag} onClick={() => { setSubject(s => s + tag); setError(""); }}
                className="text-[10px] px-1.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 rounded font-mono transition-colors">
                {tag}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Canvas */}
      <div className="flex-1 overflow-hidden">
        <EmailCanvas design={design} onChange={setDesign} onUploadingChange={setImageUploading} />
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function EmailSettingsPage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("templates");

  // templates
  const [templates,  setTemplates]  = useState<EmailTemplate[]>([]);
  const [editingTpl, setEditingTpl] = useState<EmailTemplate | "new" | null>(null);
  const [tplLoading, setTplLoading] = useState(false);

  // reports (grouped campaigns)
  const [reports,        setReports]        = useState<CampaignReport[]>([]);
  const [reportsLoading, setReportsLoading] = useState(false);
  const [subjectFilter,  setSubjectFilter]  = useState("");
  const [dateFrom,       setDateFrom]       = useState("");
  const [dateTo,         setDateTo]         = useState("");
  const [composeOpen,    setComposeOpen]    = useState(false);

  // scheduled sends
  const [scheduled,        setScheduled]        = useState<ScheduledEmailItem[]>([]);
  const [scheduledLoading, setScheduledLoading] = useState(false);

  useEffect(() => {
    setTplLoading(true);
    api.get("/email-templates").then(r => setTemplates(r.data ?? [])).catch(() => {}).finally(() => setTplLoading(false));
  }, []);

  const loadReports = () => {
    setReportsLoading(true);
    const params = new URLSearchParams();
    if (subjectFilter.trim()) params.set("subject", subjectFilter.trim());
    if (dateFrom) params.set("from", new Date(dateFrom).toISOString());
    if (dateTo) params.set("to", new Date(dateTo).toISOString());
    api.get(`/emails/reports?${params}`).then(r => setReports(r.data ?? [])).catch(() => {}).finally(() => setReportsLoading(false));
  };

  useEffect(() => {
    if (tab !== "sent") return;
    loadReports();
  }, [tab]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (tab !== "scheduled") return;
    setScheduledLoading(true);
    api.get("/emails/scheduled").then(r => setScheduled(r.data ?? [])).catch(() => {}).finally(() => setScheduledLoading(false));
  }, [tab]);


  const handleCancelScheduled = async (id: string) => {
    await api.post(`/emails/scheduled/${id}/cancel`);
    setScheduled(prev => prev.filter(s => s.id !== id));
  };

  const handleSaveTpl = async (data: { name: string; subject: string; body: string; design: EmailDesign }) => {
    if (editingTpl === "new") {
      const r = await api.post("/email-templates", data);
      setTemplates(p => [r.data, ...p]);
    } else if (editingTpl) {
      const r = await api.patch(`/email-templates/${(editingTpl as EmailTemplate).id}`, data);
      setTemplates(p => p.map(t => t.id === (editingTpl as EmailTemplate).id ? r.data : t));
    }
    setEditingTpl(null);
  };

  const handleDeleteTpl = async (id: string) => {
    await api.delete(`/email-templates/${id}`);
    setTemplates(p => p.filter(t => t.id !== id));
  };

  // Full-screen canvas editor
  if (editingTpl !== null) {
    return (
      <TemplateCanvasEditor
        tpl={editingTpl === "new" ? undefined : editingTpl as EmailTemplate}
        onSave={handleSaveTpl}
        onCancel={() => setEditingTpl(null)}
      />
    );
  }

  return (
    <div className="h-full flex flex-col bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center gap-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
            <Mail className="w-4 h-4 text-white" />
          </div>
          <div>
            <h1 className="text-base font-semibold text-slate-900">Email</h1>
            <p className="text-xs text-slate-500">Send emails, manage templates, view history</p>
          </div>
        </div>
        <div className="ml-auto flex gap-2">
          {tab === "templates" && (
            <Button size="sm" onClick={() => setEditingTpl("new")}>
              <Plus className="w-3.5 h-3.5 mr-1" /> New Template
            </Button>
          )}
          {(tab === "sent" || tab === "scheduled") && (
            <Button size="sm" onClick={() => setComposeOpen(true)}>
              <Send className="w-3.5 h-3.5 mr-1" /> Compose
            </Button>
          )}
        </div>
      </div>

      {/* Tab bar */}
      <div className="bg-white border-b border-slate-200 px-6 flex gap-1">
        {(["templates","sent","scheduled"] as Tab[]).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={cn("px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors",
              tab === t ? "border-indigo-600 text-indigo-700" : "border-transparent text-slate-500 hover:text-slate-800")}>
            {t === "sent"      && <Clock        className="w-3.5 h-3.5 inline mr-1.5" />}
            {t === "templates" && <FileText     className="w-3.5 h-3.5 inline mr-1.5" />}
            {t === "scheduled" && <CalendarClock className="w-3.5 h-3.5 inline mr-1.5" />}
            {t === "templates" ? "Templates" : t === "sent" ? "Reports" : "Scheduled"}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-hidden">
        <ScrollArea className="h-full">
          <div className="p-6 max-w-6xl mx-auto space-y-4">

            {/* ── SENT / REPORTS ──────────────────────────────────────────── */}
            {tab === "sent" && (
              <>
              {/* Filters */}
              <div className="bg-white border border-slate-200 rounded-xl p-3 flex flex-wrap items-center gap-2">
                <div className="relative flex-1 min-w-[180px]">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-300" />
                  <input value={subjectFilter} onChange={e => setSubjectFilter(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && loadReports()}
                    placeholder="Filter by subject…"
                    className="w-full h-9 pl-8 pr-3 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                </div>
                <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
                  className="h-9 px-2.5 text-sm border border-slate-200 rounded-lg" />
                <span className="text-xs text-slate-400">to</span>
                <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
                  className="h-9 px-2.5 text-sm border border-slate-200 rounded-lg" />
                <Button size="sm" variant="outline" onClick={loadReports}>Apply</Button>
                {(subjectFilter || dateFrom || dateTo) && (
                  <Button size="sm" variant="ghost" onClick={() => { setSubjectFilter(""); setDateFrom(""); setDateTo(""); setTimeout(loadReports, 0); }}>
                    Clear
                  </Button>
                )}
              </div>

              {/* Campaign reports — one row per send batch; click through to its hierarchical funnel page */}
              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100">
                {reportsLoading ? (
                  <div className="p-10 text-center text-sm text-slate-400">Loading…</div>
                ) : reports.length === 0 ? (
                  <div className="p-10 text-center">
                    <Clock className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="text-sm text-slate-400">No emails sent yet</p>
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
              </>
            )}

            {/* ── SCHEDULED ───────────────────────────────────────────────── */}
            {tab === "scheduled" && (
              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100">
                {scheduledLoading ? (
                  <div className="p-10 text-center text-sm text-slate-400">Loading…</div>
                ) : scheduled.length === 0 ? (
                  <div className="p-10 text-center">
                    <CalendarClock className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="text-sm text-slate-400">Nothing scheduled</p>
                  </div>
                ) : scheduled.map(s => (
                  <div key={s.id} className="flex items-center gap-3 px-4 py-3">
                    <CalendarClock className="w-4 h-4 text-indigo-500 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-slate-800 text-sm truncate">{s.subject}</p>
                      <p className="text-[11px] text-slate-400">
                        Sends {new Date(s.sendAt).toLocaleString()} · {s.recipients.length} recipient{s.recipients.length === 1 ? "" : "s"}
                      </p>
                    </div>
                    <Button size="sm" variant="outline" className="text-red-500 hover:text-red-600 hover:border-red-300 shrink-0"
                      onClick={() => handleCancelScheduled(s.id)}>
                      <Ban className="w-3.5 h-3.5 mr-1" /> Cancel
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {/* ── TEMPLATES ───────────────────────────────────────────────── */}
            {tab === "templates" && (
              <>
                {!tplLoading && templates.length === 0 && (
                  <div className="bg-white border border-slate-200 rounded-xl p-12 text-center">
                    <Palette className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                    <p className="text-sm font-medium text-slate-600 mb-1">No email templates yet</p>
                    <p className="text-xs text-slate-400 mb-4">
                      Design beautiful emails with the visual canvas builder — images, buttons, colours, fonts and more
                    </p>
                    <Button size="sm" onClick={() => setEditingTpl("new")}>
                      <Plus className="w-3.5 h-3.5 mr-1" /> Design First Template
                    </Button>
                  </div>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                  {templates.map(t => (
                    <div key={t.id} className="bg-white border border-slate-200 rounded-xl overflow-hidden hover:shadow-md transition-shadow">
                      {/* Mini preview */}
                      {t.design && (
                        <div className="relative h-36 overflow-hidden border-b border-slate-100 bg-slate-50">
                          <iframe
                            srcDoc={renderEmailToHtml(t.design)}
                            className="absolute inset-0 w-full pointer-events-none"
                            style={{ height: 600, transform: "scale(0.24)", transformOrigin: "top left", width: "417%", marginBottom: -460 }}
                          />
                          <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-white/80" />
                        </div>
                      )}
                      <div className="p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-slate-800 text-sm">{t.name}</p>
                            <p className="text-xs text-slate-500 mt-0.5 truncate">Subject: {t.subject}</p>
                          </div>
                          <div className="flex gap-1 shrink-0">
                            <Button size="sm" variant="outline" className="h-7 px-2"
                              onClick={() => setEditingTpl(t)}>
                              <Edit2 className="w-3 h-3" />
                            </Button>
                            <Button size="sm" variant="outline"
                              className="h-7 px-2 text-red-500 hover:text-red-600 hover:border-red-300"
                              onClick={() => handleDeleteTpl(t.id)}>
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

          </div>
        </ScrollArea>
      </div>

      {/* Compose — audience mode (organization + all users) */}
      <BulkSendEmailModal
        open={composeOpen}
        onClose={() => {
          setComposeOpen(false);
          if (tab === "sent") loadReports();
          if (tab === "scheduled") api.get("/emails/scheduled").then(r => setScheduled(r.data ?? [])).catch(() => {});
        }}
        mode="audience"
      />
    </div>
  );
}
