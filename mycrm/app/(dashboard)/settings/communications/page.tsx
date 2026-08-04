"use client";
import { useEffect, useState } from "react";
import {
  Phone, MessageSquare, Mail, FileText, Plus, CheckCircle2, XCircle,
  Loader2, Trash2, Star, Send,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

type TabKey = "sms" | "whatsapp" | "email" | "templates";
const TABS: { key: TabKey; label: string; icon: any }[] = [
  { key: "sms", label: "SMS", icon: Phone },
  { key: "whatsapp", label: "WhatsApp", icon: MessageSquare },
  { key: "email", label: "Email", icon: Mail },
  { key: "templates", label: "Templates", icon: FileText },
];

function StatusPill({ provider }: { provider: any }) {
  if (!provider.hasCredentials) return <span className="text-xs text-gray-400">No credentials</span>;
  if (provider.lastTestStatus === "success") return <span className="text-xs text-green-600 flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> Connected</span>;
  if (provider.lastTestStatus === "failed") return <span className="text-xs text-red-500 flex items-center gap-1"><XCircle className="w-3.5 h-3.5" /> Failed</span>;
  return <span className="text-xs text-gray-400">Not tested</span>;
}

function ProviderCard({ provider, onTest, onSendTest, onDelete, testing }: {
  provider: any; onTest: () => void; onSendTest: (dest: string) => void; onDelete: () => void; testing: boolean;
}) {
  const [dest, setDest] = useState("");
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-gray-900 flex items-center gap-2">
            {provider.label}
            {provider.isDefault && <span className="text-[10px] px-1.5 py-0.5 bg-brand/10 text-brand rounded-full font-medium flex items-center gap-0.5"><Star className="w-2.5 h-2.5" /> Default</span>}
          </p>
          <p className="text-xs text-gray-400">{provider.provider}</p>
        </div>
        <StatusPill provider={provider} />
      </div>
      {provider.lastTestError && <p className="text-xs text-red-500">{provider.lastTestError}</p>}
      <div className="flex items-center gap-2">
        <Button size="sm" variant="outline" disabled={testing} onClick={onTest} className="gap-1.5 text-xs h-8">
          {testing ? <Loader2 className="w-3 h-3 animate-spin" /> : null} Test Connection
        </Button>
        <Button size="sm" variant="outline" onClick={onDelete} className="text-red-500 hover:text-red-600 h-8 w-8 p-0"><Trash2 className="w-3.5 h-3.5" /></Button>
      </div>
      {provider.channel === "SMS" && (
        <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
          <input value={dest} onChange={e => setDest(e.target.value)} placeholder="Phone number for test SMS…" className="h-8 px-2.5 text-xs border border-gray-200 rounded-lg flex-1" />
          <Button size="sm" onClick={() => onSendTest(dest)} className="h-8 text-xs gap-1"><Send className="w-3 h-3" /> Send Test</Button>
        </div>
      )}
    </div>
  );
}

function AddProviderDialog({ open, onClose, channel, onCreated }: { open: boolean; onClose: () => void; channel: "SMS" | "WHATSAPP"; onCreated: () => void }) {
  const [label, setLabel] = useState("");
  const [senderId, setSenderId] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [secretKey, setSecretKey] = useState("");
  const [phoneNumberId, setPhoneNumberId] = useState("");
  const [businessAccountId, setBusinessAccountId] = useState("");
  const [accessToken, setAccessToken] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    setSaving(true);
    try {
      if (channel === "SMS") {
        await api.post("/communication-providers", {
          channel: "SMS", provider: "BEEM", label: label || "Beem Africa",
          config: { senderId }, secret: { apiKey, secretKey }, isDefault: true, isActive: true,
        });
      } else {
        await api.post("/communication-providers", {
          channel: "WHATSAPP", provider: "META_WHATSAPP", label: label || "Meta WhatsApp",
          config: { phoneNumberId, businessAccountId }, secret: { accessToken }, isDefault: true, isActive: true,
        });
      }
      onCreated();
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Add {channel === "SMS" ? "SMS" : "WhatsApp"} Provider</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <Input value={label} onChange={e => setLabel(e.target.value)} placeholder="Label, e.g. Beem Africa" />
          {channel === "SMS" ? (
            <>
              <Input value={senderId} onChange={e => setSenderId(e.target.value)} placeholder="Approved Sender ID" />
              <Input value={apiKey} onChange={e => setApiKey(e.target.value)} placeholder="Beem API Key" />
              <Input value={secretKey} onChange={e => setSecretKey(e.target.value)} type="password" placeholder="Beem Secret Key" />
            </>
          ) : (
            <>
              <Input value={phoneNumberId} onChange={e => setPhoneNumberId(e.target.value)} placeholder="Phone Number ID" />
              <Input value={businessAccountId} onChange={e => setBusinessAccountId(e.target.value)} placeholder="Business Account ID (optional)" />
              <Input value={accessToken} onChange={e => setAccessToken(e.target.value)} type="password" placeholder="Access Token" />
            </>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} disabled={saving}>{saving ? "Saving…" : "Add Provider"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function TemplatesTab() {
  const [templates, setTemplates] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [channel, setChannel] = useState("SMS");
  const [body, setBody] = useState("");
  const [subject, setSubject] = useState("");

  const load = () => api.get("/message-templates").then(r => setTemplates(r.data ?? []));
  useEffect(() => { load(); }, []);

  const submit = async () => {
    await api.post("/message-templates", { name, channel, body, subject: channel === "EMAIL" ? subject : undefined });
    setOpen(false); setName(""); setBody(""); setSubject("");
    load();
  };

  return (
    <div className="space-y-4">
      <Button size="sm" className="gap-1.5" onClick={() => setOpen(true)}><Plus className="w-3.5 h-3.5" /> New Template</Button>
      <div className="bg-white border border-gray-200 rounded-xl divide-y divide-gray-50">
        {templates.length === 0 ? (
          <p className="text-center text-sm text-gray-400 py-10">No templates yet</p>
        ) : templates.map(t => (
          <div key={t.id} className="flex items-center gap-3 px-4 py-3">
            <span className="text-sm font-medium text-gray-800 flex-1">{t.name}</span>
            <span className="text-xs text-gray-400">{t.channel}</span>
            <button onClick={async () => { await api.delete(`/message-templates/${t.id}`); load(); }} className="text-gray-400 hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
          </div>
        ))}
      </div>

      <Dialog open={open} onOpenChange={(v) => { if (!v) setOpen(false); }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>New Template</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="Template name" />
            <Select value={channel} onValueChange={setChannel}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="SMS">SMS</SelectItem>
                <SelectItem value="WHATSAPP">WhatsApp</SelectItem>
                <SelectItem value="EMAIL">Email</SelectItem>
              </SelectContent>
            </Select>
            {channel === "EMAIL" && <Input value={subject} onChange={e => setSubject(e.target.value)} placeholder="Subject" />}
            <Textarea value={body} onChange={e => setBody(e.target.value)} rows={5} placeholder="Message body — use {{First_Name}} etc." />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={submit}>Save Template</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function CommunicationsSettingsPage() {
  const [tab, setTab] = useState<TabKey>("sms");
  const [providers, setProviders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [testingId, setTestingId] = useState<string | null>(null);

  const load = () => api.get("/communication-providers").then(r => setProviders(r.data ?? [])).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);

  const testConnection = async (id: string) => {
    setTestingId(id);
    try { await api.post(`/communication-providers/${id}/test`); } finally { setTestingId(null); load(); }
  };

  const sendTest = async (id: string, destination: string) => {
    if (!destination) return;
    await api.post(`/communication-providers/${id}/send-test`, { destination });
  };

  const remove = async (id: string) => { await api.delete(`/communication-providers/${id}`); load(); };

  const channelKey = tab === "sms" ? "SMS" : tab === "whatsapp" ? "WHATSAPP" : null;
  const channelProviders = providers.filter(p => p.channel === channelKey);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Communications</h1>
        <p className="text-sm text-gray-500 mt-0.5">Configure SMS, WhatsApp, and Email providers used by Campaigns.</p>
      </div>

      <div className="flex items-center bg-gray-100 rounded-xl p-1 gap-0.5 w-fit">
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={cn("flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-medium transition-all",
              tab === t.key ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700")}>
            <t.icon className="w-4 h-4" /> {t.label}
          </button>
        ))}
      </div>

      {(tab === "sms" || tab === "whatsapp") && (
        <div className="space-y-3">
          <Button size="sm" className="gap-1.5" onClick={() => setAddOpen(true)}><Plus className="w-3.5 h-3.5" /> Add Provider</Button>
          {loading ? (
            <div className="flex justify-center py-10"><Loader2 className="w-5 h-5 animate-spin text-gray-400" /></div>
          ) : channelProviders.length === 0 ? (
            <p className="text-sm text-gray-400 py-6 text-center border border-dashed border-gray-200 rounded-xl">
              No {tab === "sms" ? "SMS" : "WhatsApp"} provider configured yet.
            </p>
          ) : channelProviders.map(p => (
            <ProviderCard key={p.id} provider={p} testing={testingId === p.id}
              onTest={() => testConnection(p.id)} onSendTest={(d) => sendTest(p.id, d)} onDelete={() => remove(p.id)} />
          ))}
        </div>
      )}

      {tab === "email" && (
        <div className="bg-blue-50 border border-blue-100 rounded-xl px-5 py-4 text-sm text-blue-800">
          <p className="font-semibold mb-1">Email is already configured</p>
          <p className="text-xs text-blue-700">
            Email sends through Resend, configured via server environment variables (this is the same provider your existing Email feature already uses). There's nothing to set up here — campaign emails will send as soon as a campaign with an Email channel is scheduled or sent.
          </p>
        </div>
      )}

      {tab === "templates" && <TemplatesTab />}

      <AddProviderDialog open={addOpen} onClose={() => setAddOpen(false)} channel={tab === "whatsapp" ? "WHATSAPP" : "SMS"} onCreated={load} />
    </div>
  );
}
