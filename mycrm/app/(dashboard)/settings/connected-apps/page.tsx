"use client";
import { useEffect, useState, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Plug, Loader2, Check, X, Eye, Ban, RotateCcw, KeyRound,
  Copy, AlertTriangle, ShieldCheck, Activity, Settings2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { api } from "@/lib/api";
import { useToast } from "@/components/ui/toast";
import {
  ScopeMatrix, scopesToGrants, grantsToMap,
  type ScopeOption, type ScopeAccess, type ScopeGrant,
} from "@/components/settings/connected-app-scope-matrix";

const TABS = [
  { value: "apps", label: "Connected Apps" },
  { value: "pending", label: "Pending Requests" },
  { value: "tokens", label: "API Tokens" },
  { value: "logs", label: "Activity Logs" },
  { value: "permissions", label: "Permissions" },
];

function formatDate(iso?: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

function StatusBadge({ status }: { status: string }) {
  const variant = status === "ACTIVE" ? "success" : status === "SUSPENDED" ? "warning" : "destructive";
  return <Badge variant={variant as any}>{status}</Badge>;
}

function AppLogo({ url, name }: { url?: string | null; name: string }) {
  if (url) return <img src={url} alt={name} className="w-8 h-8 rounded-lg object-cover border" />;
  return (
    <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 font-semibold text-sm shrink-0">
      {name.slice(0, 1).toUpperCase()}
    </div>
  );
}

function CopyField({ label, value }: { label: string; value: string }) {
  const toast = useToast();
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium text-gray-500">{label}</p>
      <div className="flex items-center gap-2">
        <code className="flex-1 text-xs bg-gray-50 border rounded px-2 py-1.5 break-all">{value}</code>
        <Button
          type="button" size="icon" variant="outline" className="shrink-0 h-8 w-8"
          onClick={() => { navigator.clipboard.writeText(value); toast.success("Copied"); }}
        >
          <Copy className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  );
}

// ── Pairing code modal, shown once right after approval ────────────────────
// No raw credentials appear here anymore — just a short code the CRM admin
// relays to the integration's own admin, who redeems it (POST /connected-apps/pair)
// inside their app to get everything it needs in one shot.
function PairingCodeDialog({ open, onClose, pairing }: {
  open: boolean; onClose: () => void;
  pairing: { pairingCode: string; expiresAt: string } | null;
}) {
  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><KeyRound className="w-4 h-4" /> Connection approved</DialogTitle>
          <DialogDescription>
            Share this code with your integration's administrator — they'll enter it in their own app to complete the connection.
          </DialogDescription>
        </DialogHeader>
        {pairing && (
          <div className="space-y-3">
            <CopyField label="Pairing code" value={pairing.pairingCode} />
            <div className="flex items-start gap-2 p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-800">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              Expires in 15 minutes ({formatDate(pairing.expiresAt)}). This dialog will not reappear — no other credentials are shown here; the receiving app gets everything it needs when it redeems this code.
            </div>
          </div>
        )}
        <DialogFooter>
          <Button onClick={onClose}>Done</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Approve dialog: admin sets the actual granted scopes before confirming ──
function ApproveDialog({ request, scopeOptions, onClose, onApproved }: {
  request: any; scopeOptions: ScopeOption[];
  onClose: () => void;
  onApproved: (pairing: { pairingCode: string; expiresAt: string }) => void;
}) {
  const toast = useToast();
  const [grants, setGrants] = useState<Record<string, ScopeAccess>>(() => {
    const initial: Record<string, ScopeAccess> = {};
    (request?.requestedScopes || []).forEach((key: string) => { initial[key] = "READ_ONLY"; });
    return initial;
  });
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    setSaving(true);
    try {
      const { data } = await api.post(`/connected-apps/requests/${request.id}/approve`, {
        scopes: scopesToGrants(grants),
      });
      onApproved(data);
    } catch (e: any) {
      toast.error("Approval failed", e?.response?.data?.message || "Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Approve {request.appName}</DialogTitle>
          <DialogDescription>
            Choose what this app can actually access — the app's own requested permissions are shown as a starting point, but you have final say.
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-[50vh] overflow-y-auto">
          <ScopeMatrix
            options={scopeOptions}
            value={grants}
            onChange={(key, access) => setGrants(prev => ({ ...prev, [key]: access }))}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={submit} disabled={saving}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            Approve & generate pairing code
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function RejectDialog({ request, onClose, onRejected }: { request: any; onClose: () => void; onRejected: () => void }) {
  const toast = useToast();
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    setSaving(true);
    try {
      await api.post(`/connected-apps/requests/${request.id}/reject`, { reason: reason || undefined });
      toast.success("Request rejected");
      onRejected();
    } catch (e: any) {
      toast.error("Failed to reject", e?.response?.data?.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={v => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reject {request.appName}?</DialogTitle>
          <DialogDescription>The submitter is not notified automatically — share the reason with them out of band if needed.</DialogDescription>
        </DialogHeader>
        <Textarea placeholder="Reason (optional)" value={reason} onChange={e => setReason(e.target.value)} rows={3} />
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button variant="destructive" onClick={submit} disabled={saving}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />} Reject
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ViewPermissionsDialog({ request, scopeOptions, onClose }: { request: any; scopeOptions: ScopeOption[]; onClose: () => void }) {
  const labelFor = (key: string) => scopeOptions.find(o => o.key === key)?.label || key;
  return (
    <Dialog open onOpenChange={v => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Requested permissions</DialogTitle>
          <DialogDescription>What {request.appName} asked for — approving lets you grant something different.</DialogDescription>
        </DialogHeader>
        <div className="flex flex-wrap gap-1.5">
          {(request.requestedScopes || []).length === 0 && <p className="text-sm text-gray-400">No specific permissions were requested.</p>}
          {(request.requestedScopes || []).map((key: string) => (
            <Badge key={key} variant="secondary">{labelFor(key)}</Badge>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function AppDetailDialog({ app, scopeOptions, onClose, onStatusChanged }: {
  app: any; scopeOptions: ScopeOption[]; onClose: () => void; onStatusChanged: () => void;
}) {
  const toast = useToast();
  const [detail, setDetail] = useState<any>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.get(`/connected-apps/${app.id}`).then(r => setDetail(r.data));
  }, [app.id]);

  const setStatus = async (action: "suspend" | "reactivate" | "revoke") => {
    setBusy(true);
    try {
      await api.post(`/connected-apps/${app.id}/${action}`);
      toast.success(`Connection ${action === "reactivate" ? "reactivated" : action + "d"}`);
      onStatusChanged();
      onClose();
    } catch (e: any) {
      toast.error("Action failed", e?.response?.data?.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AppLogo url={app.logoUrl} name={app.name} /> {app.name}
          </DialogTitle>
          <DialogDescription>Developer: {app.developerName}</DialogDescription>
        </DialogHeader>
        {!detail ? (
          <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-gray-400" /></div>
        ) : (
          <div className="space-y-3 text-sm">
            <div className="grid grid-cols-2 gap-3">
              <div><p className="text-xs text-gray-500">Status</p><StatusBadge status={detail.status} /></div>
              <div><p className="text-xs text-gray-500">Connected</p><p>{formatDate(detail.connectedAt)}</p></div>
              <div><p className="text-xs text-gray-500">Last sync</p><p>{formatDate(detail.lastSyncAt)}</p></div>
              <div><p className="text-xs text-gray-500">Last API call</p><p>{formatDate(detail.lastApiCallAt)}</p></div>
              <div><p className="text-xs text-gray-500">Last token refresh</p><p>{formatDate(detail.lastTokenRefreshAt)}</p></div>
              <div><p className="text-xs text-gray-500">Client ID</p><p className="font-mono text-xs break-all">{detail.clientId}</p></div>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Granted permissions</p>
              <div className="flex flex-wrap gap-1.5">
                {(detail.scopes || []).filter((s: any) => s.access !== "DENY").length === 0 && (
                  <p className="text-xs text-gray-400">No permissions granted.</p>
                )}
                {(detail.scopes || []).filter((s: any) => s.access !== "DENY").map((s: any) => (
                  <Badge key={s.scopeKey} variant="secondary">
                    {scopeOptions.find(o => o.key === s.scopeKey)?.label || s.scopeKey} · {s.access === "READ_WRITE" ? "Read & Write" : "Read Only"}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        )}
        <DialogFooter className="gap-2">
          {detail?.status === "ACTIVE" && (
            <Button variant="outline" onClick={() => setStatus("suspend")} disabled={busy}>
              <Ban className="w-4 h-4" /> Suspend
            </Button>
          )}
          {detail?.status === "SUSPENDED" && (
            <Button variant="outline" onClick={() => setStatus("reactivate")} disabled={busy}>
              <RotateCcw className="w-4 h-4" /> Reactivate
            </Button>
          )}
          {detail?.status !== "REVOKED" && (
            <Button variant="destructive" onClick={() => setStatus("revoke")} disabled={busy}>
              Revoke access
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Tabs ─────────────────────────────────────────────────────────────────

function ConnectedAppsTab({ scopeOptions }: { scopeOptions: ScopeOption[] }) {
  const [apps, setApps] = useState<any[] | null>(null);
  const [selected, setSelected] = useState<any | null>(null);

  const load = useCallback(() => { api.get("/connected-apps").then(r => setApps(r.data)); }, []);
  useEffect(() => { load(); }, [load]);

  if (!apps) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>;

  return (
    <div className="bg-white rounded-xl border overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-gray-50 text-left text-gray-600">
              <th className="px-4 py-3 font-semibold">Application</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3 font-semibold">Connected</th>
              <th className="px-4 py-3 font-semibold">Last sync</th>
              <th className="px-4 py-3 font-semibold">Last API call</th>
              <th className="px-4 py-3 font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {apps.map(app => (
              <tr key={app.id} className="border-b last:border-0 hover:bg-gray-50">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2.5">
                    <AppLogo url={app.logoUrl} name={app.name} />
                    <div>
                      <p className="font-medium text-gray-900">{app.name}</p>
                      <p className="text-xs text-gray-500">{app.developerName}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3"><StatusBadge status={app.status} /></td>
                <td className="px-4 py-3 text-gray-600">{formatDate(app.connectedAt)}</td>
                <td className="px-4 py-3 text-gray-600">{formatDate(app.lastSyncAt)}</td>
                <td className="px-4 py-3 text-gray-600">{formatDate(app.lastApiCallAt)}</td>
                <td className="px-4 py-3 text-right">
                  <Button size="sm" variant="outline" onClick={() => setSelected(app)}>
                    <Eye className="w-3.5 h-3.5" /> Details
                  </Button>
                </td>
              </tr>
            ))}
            {apps.length === 0 && (
              <tr><td colSpan={6} className="text-center py-10 text-gray-400 text-sm">No applications have connected yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
      {selected && (
        <AppDetailDialog app={selected} scopeOptions={scopeOptions} onClose={() => setSelected(null)} onStatusChanged={load} />
      )}
    </div>
  );
}

function PendingRequestsTab({ scopeOptions, onApproved }: { scopeOptions: ScopeOption[]; onApproved: (pairing: { pairingCode: string; expiresAt: string }) => void }) {
  const [requests, setRequests] = useState<any[] | null>(null);
  const [viewing, setViewing] = useState<any | null>(null);
  const [approving, setApproving] = useState<any | null>(null);
  const [rejecting, setRejecting] = useState<any | null>(null);

  const load = useCallback(() => {
    api.get("/connected-apps/requests", { params: { status: "PENDING" } }).then(r => setRequests(r.data));
  }, []);
  useEffect(() => { load(); }, [load]);

  if (!requests) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>;

  return (
    <div className="bg-white rounded-xl border overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-gray-50 text-left text-gray-600">
              <th className="px-4 py-3 font-semibold">Application</th>
              <th className="px-4 py-3 font-semibold">URL</th>
              <th className="px-4 py-3 font-semibold">Developer</th>
              <th className="px-4 py-3 font-semibold">Requested</th>
              <th className="px-4 py-3 font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {requests.map(req => (
              <tr key={req.id} className="border-b last:border-0 hover:bg-gray-50">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2.5">
                    <AppLogo url={req.appLogoUrl} name={req.appName} />
                    <p className="font-medium text-gray-900">{req.appName}</p>
                  </div>
                </td>
                <td className="px-4 py-3 text-gray-600 max-w-[220px] truncate">{req.appUrl}</td>
                <td className="px-4 py-3 text-gray-600">{req.developerName}</td>
                <td className="px-4 py-3 text-gray-600">{formatDate(req.createdAt)}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1.5">
                    <Button size="sm" variant="outline" onClick={() => setViewing(req)}>View</Button>
                    <Button size="sm" variant="destructive" onClick={() => setRejecting(req)}>Reject</Button>
                    <Button size="sm" onClick={() => setApproving(req)}>Approve</Button>
                  </div>
                </td>
              </tr>
            ))}
            {requests.length === 0 && (
              <tr><td colSpan={5} className="text-center py-10 text-gray-400 text-sm">No pending connection requests.</td></tr>
            )}
          </tbody>
        </table>
      </div>
      {viewing && <ViewPermissionsDialog request={viewing} scopeOptions={scopeOptions} onClose={() => setViewing(null)} />}
      {rejecting && <RejectDialog request={rejecting} onClose={() => setRejecting(null)} onRejected={() => { setRejecting(null); load(); }} />}
      {approving && (
        <ApproveDialog
          request={approving} scopeOptions={scopeOptions}
          onClose={() => setApproving(null)}
          onApproved={pairing => { setApproving(null); load(); onApproved(pairing); }}
        />
      )}
    </div>
  );
}

function AppPicker({ apps, value, onChange }: { apps: any[]; value: string; onChange: (id: string) => void }) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-64"><SelectValue placeholder="Select a connected app" /></SelectTrigger>
      <SelectContent>
        {apps.map(app => <SelectItem key={app.id} value={app.id}>{app.name}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}

function ApiTokensTab() {
  const [apps, setApps] = useState<any[]>([]);
  const [appId, setAppId] = useState("");
  const [tokens, setTokens] = useState<any[] | null>(null);
  const toast = useToast();

  useEffect(() => { api.get("/connected-apps").then(r => { setApps(r.data); if (r.data[0]) setAppId(r.data[0].id); }); }, []);
  useEffect(() => {
    if (!appId) { setTokens(null); return; }
    api.get(`/connected-apps/${appId}/tokens`).then(r => setTokens(r.data));
  }, [appId]);

  const revoke = async (tokenId: string) => {
    await api.post(`/connected-apps/${appId}/tokens/${tokenId}/revoke`);
    toast.success("Token revoked");
    api.get(`/connected-apps/${appId}/tokens`).then(r => setTokens(r.data));
  };

  if (apps.length === 0) {
    return <div className="bg-white rounded-xl border py-10 text-center text-sm text-gray-400">Connect an application first to manage its tokens.</div>;
  }

  return (
    <div className="space-y-3">
      <AppPicker apps={apps} value={appId} onChange={setAppId} />
      <div className="bg-white rounded-xl border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50 text-left text-gray-600">
                <th className="px-4 py-3 font-semibold">Issued</th>
                <th className="px-4 py-3 font-semibold">Access expires</th>
                <th className="px-4 py-3 font-semibold">Refresh expires</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {(tokens || []).map(t => (
                <tr key={t.id} className="border-b last:border-0 hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-600">{formatDate(t.createdAt)}</td>
                  <td className="px-4 py-3 text-gray-600">{formatDate(t.accessExpiresAt)}</td>
                  <td className="px-4 py-3 text-gray-600">{formatDate(t.refreshExpiresAt)}</td>
                  <td className="px-4 py-3">
                    {t.revokedAt ? <Badge variant="destructive">Revoked</Badge> : <Badge variant="success">Active</Badge>}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {!t.revokedAt && (
                      <Button size="sm" variant="outline" onClick={() => revoke(t.id)}>Revoke</Button>
                    )}
                  </td>
                </tr>
              ))}
              {tokens && tokens.length === 0 && (
                <tr><td colSpan={5} className="text-center py-10 text-gray-400 text-sm">No sessions issued yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

const LOG_COLUMNS = ["Date", "Application", "Endpoint", "Method", "Response Code", "Duration", "IP", "User"];

function ActivityLogsTab() {
  return (
    <div className="bg-white rounded-xl border overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-gray-50 text-left text-gray-600">
              {LOG_COLUMNS.map(col => <th key={col} className="px-4 py-3 font-semibold whitespace-nowrap">{col}</th>)}
            </tr>
          </thead>
          <tbody>
            <tr>
              <td colSpan={LOG_COLUMNS.length} className="text-center py-12 text-gray-400 text-sm">
                <Activity className="w-6 h-6 mx-auto mb-2 text-gray-300" />
                API activity will appear here once external apps start making calls to the public API.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

function PermissionsTab({ scopeOptions }: { scopeOptions: ScopeOption[] }) {
  const [apps, setApps] = useState<any[]>([]);
  const [appId, setAppId] = useState("");
  const [grants, setGrants] = useState<Record<string, ScopeAccess>>({});
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  useEffect(() => { api.get("/connected-apps").then(r => { setApps(r.data); if (r.data[0]) setAppId(r.data[0].id); }); }, []);
  useEffect(() => {
    if (!appId) return;
    api.get(`/connected-apps/${appId}`).then(r => {
      const scopes: ScopeGrant[] = (r.data.scopes || []).map((s: any) => ({ scopeKey: s.scopeKey, access: s.access }));
      setGrants(grantsToMap(scopes));
    });
  }, [appId]);

  const save = async () => {
    setSaving(true);
    try {
      await api.patch(`/connected-apps/${appId}/scopes`, { scopes: scopesToGrants(grants) });
      toast.success("Permissions updated");
    } catch (e: any) {
      toast.error("Failed to save", e?.response?.data?.message);
    } finally {
      setSaving(false);
    }
  };

  if (apps.length === 0) {
    return <div className="bg-white rounded-xl border py-10 text-center text-sm text-gray-400">Connect an application first to manage its permissions.</div>;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <AppPicker apps={apps} value={appId} onChange={setAppId} />
        <Button onClick={save} disabled={saving}>
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />} Save changes
        </Button>
      </div>
      <ScopeMatrix
        options={scopeOptions}
        value={grants}
        onChange={(key, access) => setGrants(prev => ({ ...prev, [key]: access }))}
      />
    </div>
  );
}

function ConnectedAppsPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tab = searchParams.get("tab") || "apps";
  const [scopeOptions, setScopeOptions] = useState<ScopeOption[]>([]);
  const [pairingResult, setPairingResult] = useState<{ pairingCode: string; expiresAt: string } | null>(null);

  useEffect(() => { api.get("/connected-apps/scope-options").then(r => setScopeOptions(r.data)); }, []);

  const setTab = (v: string) => router.replace(`/settings/connected-apps?tab=${v}`);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Plug className="w-5 h-5 text-blue-600" /> Connected Applications
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Manage every external application connected to your CRM — review requests, issue credentials, and control what each app can access.
        </p>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          {TABS.map(t => <TabsTrigger key={t.value} value={t.value}>{t.label}</TabsTrigger>)}
        </TabsList>

        <TabsContent value="apps" className="mt-4">
          <ConnectedAppsTab scopeOptions={scopeOptions} />
        </TabsContent>
        <TabsContent value="pending" className="mt-4">
          <PendingRequestsTab scopeOptions={scopeOptions} onApproved={setPairingResult} />
        </TabsContent>
        <TabsContent value="tokens" className="mt-4">
          <ApiTokensTab />
        </TabsContent>
        <TabsContent value="logs" className="mt-4">
          <ActivityLogsTab />
        </TabsContent>
        <TabsContent value="permissions" className="mt-4">
          <PermissionsTab scopeOptions={scopeOptions} />
        </TabsContent>
      </Tabs>

      <PairingCodeDialog open={!!pairingResult} onClose={() => setPairingResult(null)} pairing={pairingResult} />
    </div>
  );
}

export default function ConnectedAppsPage() {
  return (
    <Suspense fallback={<div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>}>
      <ConnectedAppsPageInner />
    </Suspense>
  );
}
