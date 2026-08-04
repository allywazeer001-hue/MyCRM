"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronLeft, ChevronRight, Check, Users, MessageSquare, Mail, Phone,
  Loader2, Filter as FilterIcon, ListChecks, AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useModulesStore } from "@/store/modules.store";
import {
  AudienceFilterBuilder, emptyFilterGroup, FilterGroupValue, AudienceField,
} from "@/components/campaigns/audience-filter-builder";
import { RecordPickerModal } from "@/components/campaigns/record-picker-modal";
import { countSmsSegments } from "@/components/campaigns/sms-segments";

const CAMPAIGN_TYPES = [
  "GENERAL_ANNOUNCEMENT", "EVENT", "REMINDER", "SCHOLARSHIP", "HEALTH_CAMP",
  "REGISTRATION", "MARKETING", "NOTIFICATION", "CUSTOM",
];

const STEPS = ["Details", "Audience", "Channels & Message", "Review & Send"];
type Channel = "SMS" | "WHATSAPP" | "EMAIL";
type AudienceMode = "filter" | "manual";

export default function NewCampaignPage() {
  const router = useRouter();
  const { modules, fetchModules } = useModulesStore();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Step 1 — Details
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState("GENERAL_ANNOUNCEMENT");

  // Step 2 — Audience
  const [moduleId, setModuleId] = useState("");
  const [moduleFields, setModuleFields] = useState<AudienceField[]>([]);
  const [audienceMode, setAudienceMode] = useState<AudienceMode>("filter");
  const [filterGroup, setFilterGroup] = useState<FilterGroupValue>(emptyFilterGroup());
  const [manualRecordIds, setManualRecordIds] = useState<string[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [preview, setPreview] = useState<any>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  // Step 3 — Channels
  const [channels, setChannels] = useState<Set<Channel>>(new Set());
  const [providers, setProviders] = useState<any[]>([]);
  const [smsMessage, setSmsMessage] = useState("");
  const [smsProviderId, setSmsProviderId] = useState("");
  const [waTemplateName, setWaTemplateName] = useState("");
  const [waLanguage, setWaLanguage] = useState("en_US");
  const [waVars, setWaVars] = useState<string[]>(["", "", ""]);
  const [waProviderId, setWaProviderId] = useState("");
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");

  // Step 4 — Review
  const [sendMode, setSendMode] = useState<"now" | "schedule" | "draft">("draft");
  const [scheduledAt, setScheduledAt] = useState("");
  const [confirmed, setConfirmed] = useState(false);

  useEffect(() => { fetchModules(); }, [fetchModules]);
  useEffect(() => {
    api.get("/communication-providers").then(r => setProviders(r.data ?? [])).catch(() => {});
  }, []);

  useEffect(() => {
    if (!moduleId) { setModuleFields([]); return; }
    api.get(`/modules/${moduleId}/fields`).then(r => setModuleFields(r.data ?? [])).catch(() => setModuleFields([]));
  }, [moduleId]);

  const audienceConfig = useMemo(() => ({
    mode: audienceMode,
    moduleId,
    ...(audienceMode === "filter" ? { filterGroup } : { recordIds: manualRecordIds }),
  }), [audienceMode, moduleId, filterGroup, manualRecordIds]);

  useEffect(() => {
    if (!moduleId) { setPreview(null); return; }
    if (audienceMode === "manual" && manualRecordIds.length === 0) { setPreview(null); return; }
    setPreviewLoading(true);
    api.post("/campaigns/preview-audience", audienceConfig)
      .then(r => setPreview(r.data))
      .catch(() => setPreview(null))
      .finally(() => setPreviewLoading(false));
  }, [audienceConfig]); // eslint-disable-line

  const smsStats = useMemo(() => countSmsSegments(smsMessage), [smsMessage]);
  const smsProviders = providers.filter(p => p.channel === "SMS");
  const waProviders = providers.filter(p => p.channel === "WHATSAPP");

  const toggleChannel = (c: Channel) => {
    setChannels(prev => {
      const next = new Set(prev);
      if (next.has(c)) next.delete(c); else next.add(c);
      return next;
    });
  };

  const canProceed = () => {
    if (step === 0) return name.trim().length > 0;
    if (step === 1) return !!moduleId && (audienceMode === "filter" || manualRecordIds.length > 0);
    if (step === 2) {
      if (channels.size === 0) return false;
      if (channels.has("SMS") && !smsMessage.trim()) return false;
      if (channels.has("WHATSAPP") && !waTemplateName.trim()) return false;
      if (channels.has("EMAIL") && (!emailSubject.trim() || !emailBody.trim())) return false;
      return true;
    }
    return true;
  };

  const buildChannelPayloads = () => {
    const payloads: any[] = [];
    if (channels.has("SMS")) payloads.push({ channel: "SMS", providerId: smsProviderId || undefined, content: { message: smsMessage } });
    if (channels.has("WHATSAPP")) payloads.push({
      channel: "WHATSAPP", providerId: waProviderId || undefined,
      content: { templateName: waTemplateName, languageCode: waLanguage, variableMapping: waVars.filter(Boolean).map(v => ({ value: v })) },
    });
    if (channels.has("EMAIL")) payloads.push({ channel: "EMAIL", content: { subject: emailSubject, body: emailBody } });
    return payloads;
  };

  const handleSubmit = async () => {
    setSaving(true);
    setError("");
    try {
      const { data: campaign } = await api.post("/campaigns", {
        name, description, type, audienceConfig, channels: buildChannelPayloads(),
      });

      if (sendMode === "now") await api.post(`/campaigns/${campaign.id}/send-now`);
      else if (sendMode === "schedule") await api.post(`/campaigns/${campaign.id}/schedule`, { scheduledAt, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone });

      router.push(`/campaigns/${campaign.id}`);
    } catch (e: any) {
      setError(e?.response?.data?.message ?? "Failed to create campaign");
      setSaving(false);
    }
  };

  const needsConfirmation = sendMode !== "draft" && (preview?.total ?? 0) >= 100;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">New Campaign</h1>
        <p className="text-sm text-gray-500 mt-0.5">Reach your CRM records over SMS, WhatsApp, and Email.</p>
      </div>

      {/* Stepper */}
      <div className="flex items-center gap-1">
        {STEPS.map((label, i) => (
          <div key={label} className="flex items-center flex-1 last:flex-initial">
            <div className={cn(
              "flex items-center gap-2 shrink-0",
              i === step ? "text-brand font-semibold" : i < step ? "text-gray-500" : "text-gray-300"
            )}>
              <div className={cn(
                "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0",
                i === step ? "bg-brand text-white" : i < step ? "bg-gray-200 text-gray-600" : "bg-gray-100 text-gray-400"
              )}>
                {i < step ? <Check className="w-3.5 h-3.5" /> : i + 1}
              </div>
              <span className="text-xs whitespace-nowrap hidden sm:inline">{label}</span>
            </div>
            {i < STEPS.length - 1 && <div className="flex-1 h-px bg-gray-200 mx-2" />}
          </div>
        ))}
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl p-6 space-y-5">
        {/* ── STEP 1: Details ── */}
        {step === 0 && (
          <>
            <div className="space-y-1.5">
              <Label>Campaign Name</Label>
              <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. 2026 Scholar Registration" />
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} placeholder="Optional" />
            </div>
            <div className="space-y-1.5">
              <Label>Campaign Type</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CAMPAIGN_TYPES.map(t => <SelectItem key={t} value={t}>{t.replace(/_/g, " ")}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </>
        )}

        {/* ── STEP 2: Audience ── */}
        {step === 1 && (
          <>
            <div className="space-y-1.5">
              <Label>CRM Module</Label>
              <Select value={moduleId} onValueChange={(v) => { setModuleId(v); setManualRecordIds([]); setFilterGroup(emptyFilterGroup()); }}>
                <SelectTrigger className="h-9"><SelectValue placeholder="Select a module…" /></SelectTrigger>
                <SelectContent>
                  {modules.map(m => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {moduleId && (
              <>
                <div className="flex items-center bg-gray-100 rounded-xl p-1 gap-0.5 w-fit">
                  <button onClick={() => setAudienceMode("filter")}
                    className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all", audienceMode === "filter" ? "bg-white shadow-sm text-gray-900" : "text-gray-500")}>
                    <FilterIcon className="w-3.5 h-3.5" /> Filter
                  </button>
                  <button onClick={() => setAudienceMode("manual")}
                    className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all", audienceMode === "manual" ? "bg-white shadow-sm text-gray-900" : "text-gray-500")}>
                    <ListChecks className="w-3.5 h-3.5" /> Individual records
                  </button>
                </div>

                {audienceMode === "filter" ? (
                  <AudienceFilterBuilder fields={moduleFields} value={filterGroup} onChange={setFilterGroup} />
                ) : (
                  <div className="flex items-center gap-3">
                    <Button variant="outline" size="sm" onClick={() => setPickerOpen(true)}>
                      {manualRecordIds.length > 0 ? `${manualRecordIds.length} record(s) selected` : "Select records…"}
                    </Button>
                  </div>
                )}

                {/* Audience preview */}
                <div className="bg-gray-50 border border-gray-100 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Users className="w-4 h-4 text-gray-400" />
                    <span className="text-sm font-semibold text-gray-800">Audience Preview</span>
                    {previewLoading && <Loader2 className="w-3.5 h-3.5 animate-spin text-gray-400" />}
                  </div>
                  {preview ? (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                      <div><p className="text-lg font-bold text-gray-900">{preview.total}</p><p className="text-gray-500">Total records</p></div>
                      <div><p className="text-lg font-bold text-green-600">{preview.smsReady}</p><p className="text-gray-500">SMS/WhatsApp-ready</p></div>
                      <div><p className="text-lg font-bold text-green-600">{preview.emailReady}</p><p className="text-gray-500">Email-ready</p></div>
                      <div><p className="text-lg font-bold text-amber-600">{preview.missingPhone}</p><p className="text-gray-500">Missing phone</p></div>
                      <div><p className="text-lg font-bold text-amber-600">{preview.missingEmail}</p><p className="text-gray-500">Missing email</p></div>
                      <div><p className="text-lg font-bold text-red-500">{preview.invalidPhone}</p><p className="text-gray-500">Invalid phone</p></div>
                      <div><p className="text-lg font-bold text-red-500">{preview.invalidEmail}</p><p className="text-gray-500">Invalid email</p></div>
                    </div>
                  ) : (
                    <p className="text-xs text-gray-400">Select a filter or records to see a preview</p>
                  )}
                </div>
              </>
            )}
          </>
        )}

        {/* ── STEP 3: Channels & Message ── */}
        {step === 2 && (
          <>
            <div className="flex items-center gap-2">
              {([
                { key: "SMS" as Channel, icon: Phone, label: "SMS" },
                { key: "WHATSAPP" as Channel, icon: MessageSquare, label: "WhatsApp" },
                { key: "EMAIL" as Channel, icon: Mail, label: "Email" },
              ]).map(c => (
                <button key={c.key} onClick={() => toggleChannel(c.key)}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-xl border-2 text-sm font-medium transition-all",
                    channels.has(c.key) ? "bg-brand/10 border-brand/40 text-brand" : "border-gray-200 text-gray-500 hover:border-gray-300"
                  )}>
                  <c.icon className="w-4 h-4" /> {c.label}
                </button>
              ))}
            </div>

            {channels.has("SMS") && (
              <div className="border border-gray-200 rounded-xl p-4 space-y-3">
                <p className="text-sm font-semibold text-gray-800 flex items-center gap-2"><Phone className="w-4 h-4" /> SMS</p>
                <Select value={smsProviderId || "__default__"} onValueChange={v => setSmsProviderId(v === "__default__" ? "" : v)}>
                  <SelectTrigger className="h-9"><SelectValue placeholder="Default SMS provider" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__default__">Default provider</SelectItem>
                    {smsProviders.map(p => <SelectItem key={p.id} value={p.id}>{p.label}</SelectItem>)}
                  </SelectContent>
                </Select>
                {smsProviders.length === 0 && (
                  <p className="text-xs text-amber-600">No SMS provider configured yet — set one up in Settings → Communications → SMS before sending.</p>
                )}
                <Textarea value={smsMessage} onChange={e => setSmsMessage(e.target.value)} rows={4}
                  placeholder="Dear {{First_Name}}, your registration for {{Event_Name}} has been confirmed." />
                <p className="text-xs text-gray-400">
                  Characters: {smsStats.characters} ({smsStats.encoding}) · SMS segments: {smsStats.segments}
                </p>
                <p className="text-[11px] text-gray-400">Merge fields: {"{{First_Name}} {{Last_Name}} {{Full_Name}} {{Phone}} {{Email}}"} plus any field name on the module</p>
              </div>
            )}

            {channels.has("WHATSAPP") && (
              <div className="border border-gray-200 rounded-xl p-4 space-y-3">
                <p className="text-sm font-semibold text-gray-800 flex items-center gap-2"><MessageSquare className="w-4 h-4" /> WhatsApp</p>
                <Select value={waProviderId || "__default__"} onValueChange={v => setWaProviderId(v === "__default__" ? "" : v)}>
                  <SelectTrigger className="h-9"><SelectValue placeholder="Default WhatsApp provider" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__default__">Default provider</SelectItem>
                    {waProviders.map(p => <SelectItem key={p.id} value={p.id}>{p.label}</SelectItem>)}
                  </SelectContent>
                </Select>
                {waProviders.length === 0 && (
                  <p className="text-xs text-amber-600">No WhatsApp provider configured yet — set one up in Settings → Communications → WhatsApp before sending.</p>
                )}
                <Input value={waTemplateName} onChange={e => setWaTemplateName(e.target.value)} placeholder="Approved template name, e.g. scholar_registration_confirmation" />
                <Input value={waLanguage} onChange={e => setWaLanguage(e.target.value)} placeholder="Language code, e.g. en_US" className="w-40" />
                <div className="space-y-1.5">
                  <Label className="text-xs">Template variables ({"{{1}}"}, {"{{2}}"}, {"{{3}}"}…) — merge fields allowed</Label>
                  {waVars.map((v, i) => (
                    <Input key={i} value={v} onChange={e => setWaVars(prev => prev.map((p, pi) => pi === i ? e.target.value : p))}
                      placeholder={`{{${i + 1}}} e.g. {{First_Name}}`} className="h-8 text-xs" />
                  ))}
                </div>
              </div>
            )}

            {channels.has("EMAIL") && (
              <div className="border border-gray-200 rounded-xl p-4 space-y-3">
                <p className="text-sm font-semibold text-gray-800 flex items-center gap-2"><Mail className="w-4 h-4" /> Email</p>
                <Input value={emailSubject} onChange={e => setEmailSubject(e.target.value)} placeholder="Subject — e.g. Congratulations {{First_Name}}!" />
                <Textarea value={emailBody} onChange={e => setEmailBody(e.target.value)} rows={8}
                  placeholder="Dear {{First_Name}},&#10;&#10;We are pleased to inform you that…" />
                <p className="text-[11px] text-gray-400">HTML is supported. An unsubscribe link is added automatically.</p>
              </div>
            )}
          </>
        )}

        {/* ── STEP 4: Review & Send ── */}
        {step === 3 && (
          <>
            <div className="space-y-3">
              <div className="flex justify-between text-sm"><span className="text-gray-500">Campaign</span><span className="font-medium text-gray-900">{name}</span></div>
              <div className="flex justify-between text-sm"><span className="text-gray-500">Recipients</span><span className="font-medium text-gray-900">{preview?.total ?? 0}</span></div>
              <div className="flex justify-between text-sm"><span className="text-gray-500">Channels</span><span className="font-medium text-gray-900">{[...channels].join(", ")}</span></div>
              {channels.has("SMS") && <div className="flex justify-between text-sm"><span className="text-gray-500">Estimated SMS units</span><span className="font-medium text-gray-900">{(preview?.smsReady ?? 0) * smsStats.segments}</span></div>}
            </div>

            <div className="flex items-center bg-gray-100 rounded-xl p-1 gap-0.5 w-fit">
              {([{ k: "draft", l: "Save Draft" }, { k: "now", l: "Send Now" }, { k: "schedule", l: "Schedule" }] as const).map(o => (
                <button key={o.k} onClick={() => setSendMode(o.k)}
                  className={cn("px-3 py-1.5 rounded-lg text-xs font-medium transition-all", sendMode === o.k ? "bg-white shadow-sm text-gray-900" : "text-gray-500")}>
                  {o.l}
                </button>
              ))}
            </div>

            {sendMode === "schedule" && (
              <Input type="datetime-local" value={scheduledAt} onChange={e => setScheduledAt(e.target.value)} className="w-64" />
            )}

            {needsConfirmation && (
              <label className="flex items-start gap-2 text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-xl p-3">
                <input type="checkbox" checked={confirmed} onChange={e => setConfirmed(e.target.checked)} className="mt-0.5" />
                <span>I understand this campaign will send messages to {preview?.total ?? 0} recipients.</span>
              </label>
            )}

            {error && (
              <div className="flex items-start gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl p-3">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" /> {error}
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Nav buttons ── */}
      <div className="flex items-center justify-between">
        <Button variant="outline" disabled={step === 0} onClick={() => setStep(s => s - 1)} className="gap-1.5">
          <ChevronLeft className="w-4 h-4" /> Back
        </Button>
        {step < STEPS.length - 1 ? (
          <Button disabled={!canProceed()} onClick={() => setStep(s => s + 1)} className="gap-1.5">
            Next <ChevronRight className="w-4 h-4" />
          </Button>
        ) : (
          <Button
            disabled={saving || (sendMode === "schedule" && !scheduledAt) || (needsConfirmation && !confirmed)}
            onClick={handleSubmit}
            className="gap-1.5"
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            {sendMode === "draft" ? "Save Draft" : sendMode === "now" ? "Send Campaign" : "Schedule Campaign"}
          </Button>
        )}
      </div>

      <RecordPickerModal
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        moduleId={moduleId}
        initialSelected={manualRecordIds}
        onConfirm={setManualRecordIds}
      />
    </div>
  );
}
