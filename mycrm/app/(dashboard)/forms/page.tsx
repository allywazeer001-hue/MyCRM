"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Plus, FileText, Trash2, Settings, ExternalLink, Loader2,
  LayoutTemplate, Globe, Lock, Link2, Copy, CheckCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { api } from "@/lib/api";
import Link from "next/link";

export default function FormsPage() {
  const router = useRouter();
  const [forms, setForms] = useState<any[]>([]);
  const [modules, setModules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", moduleId: "", type: "INTERNAL" });
  const [shareForm, setShareForm] = useState<any>(null);
  const [shareUrl, setShareUrl] = useState("");
  const [shareLoading, setShareLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    Promise.all([
      api.get("/forms"),
      api.get("/modules"),
    ]).then(([f, m]) => {
      setForms(f.data || []);
      setModules(m.data || []);
    }).finally(() => setLoading(false));
  }, []);

  const createForm = async () => {
    if (!form.name.trim()) return;
    setCreating(true);
    try {
      const { data } = await api.post("/forms", form);
      router.push(`/forms/${data.id}/builder`);
    } catch {
      setCreating(false);
    }
  };

  const deleteForm = async (id: string) => {
    if (!confirm("Delete this form?")) return;
    await api.delete(`/forms/${id}`);
    setForms(prev => prev.filter(f => f.id !== id));
  };

  const openShare = async (f: any) => {
    setShareForm(f);
    setShareUrl("");
    setCopied(false);
    if (f.token) {
      setShareUrl(`${window.location.origin}/f/${f.token}`);
      return;
    }
    setShareLoading(true);
    try {
      const { data } = await api.post(`/forms/${f.id}/generate-token`);
      const token = data.token;
      setForms(prev => prev.map(x => x.id === f.id ? { ...x, token } : x));
      setShareUrl(`${window.location.origin}/f/${token}`);
    } catch {
      setShareUrl("Failed to generate link. Try again.");
    } finally {
      setShareLoading(false);
    }
  };

  const copyUrl = () => {
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Forms</h1>
          <p className="text-sm text-gray-500 mt-1">Build and manage custom forms for your modules</p>
        </div>
        <Button onClick={() => setShowCreate(true)} className="gap-2">
          <Plus className="w-4 h-4" />
          New Form
        </Button>
      </div>

      {forms.length === 0 ? (
        <div className="border-2 border-dashed border-gray-200 rounded-xl p-16 text-center">
          <LayoutTemplate className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-700 mb-2">No forms yet</h3>
          <p className="text-sm text-gray-400 mb-6">Create your first form to collect and manage data</p>
          <Button onClick={() => setShowCreate(true)} className="gap-2">
            <Plus className="w-4 h-4" />
            Create Form
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {forms.map(f => (
            <Card key={f.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                      <FileText className="w-4 h-4 text-blue-600" />
                    </div>
                    <div>
                      <CardTitle className="text-sm font-semibold">{f.name}</CardTitle>
                      {f.module && (
                        <p className="text-xs text-gray-400">{f.module.icon} {f.module.name}</p>
                      )}
                    </div>
                  </div>
                  <Badge variant={f.type === "PUBLIC" ? "default" : "secondary"} className="text-xs shrink-0">
                    {f.type === "PUBLIC" ? <Globe className="w-3 h-3 mr-1" /> : <Lock className="w-3 h-3 mr-1" />}
                    {f.type}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                {f.description && (
                  <p className="text-xs text-gray-500 mb-3 line-clamp-2">{f.description}</p>
                )}
                <div className="flex items-center gap-2 text-xs text-gray-400 mb-3">
                  <span>{f._count?.fields ?? 0} fields</span>
                  <span>·</span>
                  <span>{f._count?.sections ?? 0} sections</span>
                </div>
                <div className="flex items-center gap-2">
                  <Link href={`/forms/${f.id}/builder`} className="flex-1">
                    <Button variant="outline" size="sm" className="w-full gap-1.5 text-xs">
                      <Settings className="w-3 h-3" />
                      Builder
                    </Button>
                  </Link>
                  <Button variant="outline" size="sm" className="px-2 gap-1 text-xs" onClick={() => openShare(f)}>
                    <Link2 className="w-3.5 h-3.5" />
                    Share
                  </Button>
                  <Link href={`/forms/${f.id}/permissions`}>
                    <Button variant="ghost" size="sm" className="px-2">
                      <Lock className="w-3.5 h-3.5 text-gray-500" />
                    </Button>
                  </Link>
                  <Button variant="ghost" size="sm" className="px-2" onClick={() => deleteForm(f.id)}>
                    <Trash2 className="w-3.5 h-3.5 text-red-400" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Share Form Dialog */}
      <Dialog open={!!shareForm} onOpenChange={open => !open && setShareForm(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Link2 className="w-4 h-4" />
              Share Form
            </DialogTitle>
            <DialogDescription>
              Anyone with this link can fill in <strong>{shareForm?.name}</strong>.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {shareLoading ? (
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Loader2 className="w-4 h-4 animate-spin" />
                Generating link…
              </div>
            ) : shareUrl ? (
              <>
                <div className="flex items-center gap-2">
                  <Input value={shareUrl} readOnly className="text-xs font-mono flex-1" />
                  <Button size="sm" variant="outline" onClick={copyUrl} className="shrink-0 gap-1.5">
                    {copied ? <CheckCheck className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
                    {copied ? "Copied!" : "Copy"}
                  </Button>
                </div>
                <div className="flex gap-2">
                  <a href={shareUrl} target="_blank" rel="noopener noreferrer" className="flex-1">
                    <Button variant="outline" size="sm" className="w-full gap-1.5 text-xs">
                      <ExternalLink className="w-3.5 h-3.5" />
                      Open Form
                    </Button>
                  </a>
                </div>
                <p className="text-xs text-gray-400">
                  Share this link via email, WhatsApp, or embed it in your website.
                  Responses are saved under <strong>Forms → Submissions</strong>.
                </p>
              </>
            ) : null}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShareForm(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Form Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Form</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Form Name *</Label>
              <Input
                value={form.name}
                onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                placeholder="e.g. Beneficiary Registration Form"
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Input
                value={form.description}
                onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                placeholder="Optional description"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Linked Module</Label>
              <Select value={form.moduleId} onValueChange={v => setForm(p => ({ ...p, moduleId: v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select module (optional)..." />
                </SelectTrigger>
                <SelectContent>
                  {modules.map(m => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.icon} {m.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-400">Link to a module to use its fields in this form</p>
            </div>
            <div className="space-y-1.5">
              <Label>Form Type</Label>
              <Select value={form.type} onValueChange={v => setForm(p => ({ ...p, type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="INTERNAL">Internal (logged-in users only)</SelectItem>
                  <SelectItem value="PUBLIC">Public (shareable link)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button onClick={createForm} disabled={creating || !form.name.trim()}>
              {creating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Create & Open Builder
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
