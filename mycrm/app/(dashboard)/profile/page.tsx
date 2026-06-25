"use client";
import { useEffect, useRef, useState } from "react";
import {
  Mail, Phone, Building2, Shield, Calendar, Clock,
  FileText, MessageSquare, Activity, CheckCircle2, XCircle,
  Pencil, Save, X, Eye, Trash2, Download, Upload,
  Printer, BarChart2, Workflow, Layout, FormInput, Settings2, Key,
  Camera, Loader2, Globe, Users, Lock, BadgeCheck, ZoomIn,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { api } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import { useAuthStore } from "@/store/auth.store";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";

// ── Types ──────────────────────────────────────────────────────────────────────

type ProfileData = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  usertype?: string;
  isActive: boolean;
  status?: string;
  jobTitle?: string;
  phone?: string;
  avatar?: string;
  createdAt: string;
  updatedAt?: string;
  lastLoginAt?: string;
  departmentId?: string;
  department?: { id: string; name: string; color: string };
  organization?: { id: string; name: string; slug: string; logo?: string; website?: string; description?: string };
  _count?: { createdRecords: number; comments: number };
  recentActivity?: Array<{ id: string; action: string; entityType: string; createdAt: string }>;
  departmentPermissions?: {
    isAdmin?: boolean;
    isSuperAdmin?: boolean;
    system?: {
      canDashboard?: boolean; canAnalytics?: boolean; canWorkflow?: boolean;
      canForms?: boolean; canStudio?: boolean; canExport?: boolean;
      canImport?: boolean; canPrint?: boolean;
    };
    modules?: Record<string, {
      canView?: boolean; canCreate?: boolean; canEdit?: boolean; canDelete?: boolean;
      canExport?: boolean; canImport?: boolean; canPrint?: boolean;
    }>;
  };
};

// ── Constants ──────────────────────────────────────────────────────────────────

const ROLE_META: Record<string, { label: string; desc: string; color: string; badge: string }> = {
  SUPER_ADMIN: { label: "Super Admin",    desc: "Full system control",          color: "text-red-700",    badge: "bg-red-100 text-red-700 border-red-200" },
  ADMIN:       { label: "Administrator",  desc: "Manage org settings & users",  color: "text-blue-700",   badge: "bg-blue-100 text-blue-700 border-blue-200" },
  MANAGER:     { label: "Manager",        desc: "Manage teams & workflows",     color: "text-amber-700",  badge: "bg-amber-100 text-amber-700 border-amber-200" },
  USER:        { label: "Member",         desc: "Standard access",              color: "text-gray-700",   badge: "bg-gray-100 text-gray-700 border-gray-200" },
  VIEWER:      { label: "Viewer",         desc: "Read-only access",             color: "text-purple-700", badge: "bg-purple-100 text-purple-700 border-purple-200" },
};

const ACTION_LABELS: Record<string, { label: string; color: string }> = {
  USER_CREATED:   { label: "Account created",   color: "text-blue-600"   },
  RECORD_CREATED: { label: "Record created",    color: "text-green-600"  },
  RECORD_UPDATED: { label: "Record updated",    color: "text-amber-600"  },
  RECORD_DELETED: { label: "Record deleted",    color: "text-red-600"    },
  MODULE_CREATED: { label: "Module created",    color: "text-purple-600" },
  FIELD_CREATED:  { label: "Field added",       color: "text-indigo-600" },
  IMPORT:         { label: "Records imported",  color: "text-teal-600"   },
  EXPORT:         { label: "Records exported",  color: "text-cyan-600"   },
};

const SYS_PERMS = [
  { key: "canDashboard", label: "Dashboard",    icon: Layout    },
  { key: "canAnalytics", label: "Analytics",    icon: BarChart2 },
  { key: "canWorkflow",  label: "Workflow",     icon: Workflow  },
  { key: "canForms",     label: "Forms",        icon: FormInput },
  { key: "canStudio",    label: "Studio",       icon: Settings2 },
  { key: "canExport",    label: "Export",       icon: Download  },
  { key: "canImport",    label: "Import",       icon: Upload    },
  { key: "canPrint",     label: "Print",        icon: Printer   },
] as const;

// ── EyeOff ─────────────────────────────────────────────────────────────────────

function EyeOff({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24M1 1l22 22" />
    </svg>
  );
}

// ── Avatar Crop Modal ──────────────────────────────────────────────────────────

const CONTAINER = 280;
const CROP_SIZE  = 200;
const CROP_OFF   = (CONTAINER - CROP_SIZE) / 2; // 40

function AvatarCropModal({
  src, onConfirm, onClose,
}: { src: string; onConfirm: (blob: Blob) => void; onClose: () => void }) {
  const [pos, setPos]           = useState({ x: 0, y: 0 });
  const [scale, setScale]       = useState(1);
  const [minScale, setMinScale] = useState(1);
  const [imgSize, setImgSize]   = useState({ w: 0, h: 0 });
  const [dragging, setDragging] = useState(false);
  const dragRef  = useRef({ sx: 0, sy: 0, ix: 0, iy: 0 });
  const imgElRef = useRef<HTMLImageElement | null>(null);

  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      const ms = Math.max(CROP_SIZE / img.width, CROP_SIZE / img.height) * 1.05;
      setMinScale(ms);
      setScale(ms);
      setImgSize({ w: img.width, h: img.height });
      imgElRef.current = img;
      setPos({ x: (CONTAINER - img.width * ms) / 2, y: (CONTAINER - img.height * ms) / 2 });
    };
    img.src = src;
  }, [src]);

  function startDrag(clientX: number, clientY: number) {
    setDragging(true);
    dragRef.current = { sx: clientX, sy: clientY, ix: pos.x, iy: pos.y };
  }
  function moveDrag(clientX: number, clientY: number) {
    if (!dragging) return;
    setPos({ x: dragRef.current.ix + (clientX - dragRef.current.sx), y: dragRef.current.iy + (clientY - dragRef.current.sy) });
  }

  function handleScaleChange(v: number) {
    setScale(v);
    setPos({ x: (CONTAINER - imgSize.w * v) / 2, y: (CONTAINER - imgSize.h * v) / 2 });
  }

  function handleConfirm() {
    const img = imgElRef.current;
    if (!img) return;
    const canvas = document.createElement("canvas");
    canvas.width = CROP_SIZE; canvas.height = CROP_SIZE;
    const ctx = canvas.getContext("2d")!;
    ctx.beginPath();
    ctx.arc(CROP_SIZE / 2, CROP_SIZE / 2, CROP_SIZE / 2, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(img, 0, 0, img.width, img.height, pos.x - CROP_OFF, pos.y - CROP_OFF, img.width * scale, img.height * scale);
    canvas.toBlob(blob => { if (blob) onConfirm(blob); }, "image/jpeg", 0.92);
  }

  return (
    <Dialog open onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent className="max-w-xs">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Camera className="w-4 h-4" /> Crop Photo</DialogTitle>
          <DialogDescription>Drag to reposition your photo within the circle.</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center gap-3 py-1">
          {/* Crop container */}
          <div
            className="relative overflow-hidden rounded-lg bg-gray-900 cursor-grab active:cursor-grabbing select-none"
            style={{ width: CONTAINER, height: CONTAINER }}
            onMouseDown={e => startDrag(e.clientX, e.clientY)}
            onMouseMove={e => moveDrag(e.clientX, e.clientY)}
            onMouseUp={() => setDragging(false)}
            onMouseLeave={() => setDragging(false)}
            onTouchStart={e => { const t = e.touches[0]; startDrag(t.clientX, t.clientY); }}
            onTouchMove={e => { const t = e.touches[0]; moveDrag(t.clientX, t.clientY); }}
            onTouchEnd={() => setDragging(false)}
          >
            {imgSize.w > 0 && (
              <img src={src} alt="crop" draggable={false}
                style={{ position: "absolute", left: pos.x, top: pos.y,
                  width: imgSize.w * scale, height: imgSize.h * scale,
                  pointerEvents: "none", userSelect: "none" }}
              />
            )}
            {/* Circular overlay */}
            <div style={{
              position: "absolute", width: CROP_SIZE, height: CROP_SIZE,
              left: CROP_OFF, top: CROP_OFF, borderRadius: "50%",
              boxShadow: "0 0 0 600px rgba(0,0,0,0.55)",
              border: "2px solid rgba(255,255,255,0.7)", pointerEvents: "none",
            }} />
          </div>

          {/* Zoom */}
          <div className="flex items-center gap-2 w-full px-1">
            <ZoomIn className="w-3.5 h-3.5 text-gray-400 shrink-0" />
            <input type="range" min={minScale} max={minScale * 4} step={0.01} value={scale}
              onChange={e => handleScaleChange(parseFloat(e.target.value))}
              className="flex-1 accent-blue-600" />
          </div>
        </div>

        <DialogFooter>
          <button type="button" onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 border rounded-lg hover:bg-gray-50">Cancel</button>
          <button type="button" onClick={handleConfirm}
            className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5" /> Apply Crop
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Profile Preview Modal ──────────────────────────────────────────────────────

function ProfilePreviewModal({ profile, onClose }: { profile: ProfileData; onClose: () => void }) {
  const roleMeta = ROLE_META[profile.role] ?? ROLE_META.USER;
  const initials = `${profile.firstName[0] ?? ""}${profile.lastName[0] ?? ""}`.toUpperCase();
  return (
    <Dialog open onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent className="max-w-sm p-0 overflow-hidden">
        <DialogHeader className="sr-only">
          <DialogTitle>Profile Preview</DialogTitle>
        </DialogHeader>
        <div className="h-20 bg-gradient-to-r from-slate-700 to-slate-900 relative">
          <span className="absolute top-2 right-3 text-[10px] text-white/50 font-medium tracking-wide uppercase">How others see you</span>
        </div>
        <div className="px-5 pb-5">
          <div className="flex items-end gap-4 -mt-8 mb-3">
            <div className="w-16 h-16 rounded-full overflow-hidden border-4 border-white shadow-md bg-gray-100 shrink-0">
              {profile.avatar
                ? <img src={profile.avatar} alt="avatar" className="w-full h-full object-cover" />
                : <div className="w-full h-full flex items-center justify-center bg-blue-600 text-white font-bold text-xl">{initials}</div>}
            </div>
            <div className="pb-1">
              <h2 className="text-base font-bold text-gray-900">{profile.firstName} {profile.lastName}</h2>
              {profile.jobTitle && <p className="text-xs text-gray-500">{profile.jobTitle}</p>}
            </div>
          </div>
          <div className="space-y-2.5">
            <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border", roleMeta.badge)}>
              <BadgeCheck className="w-3 h-3" />{roleMeta.label}
            </span>
            <div className="space-y-1.5 text-sm text-gray-600">
              <p className="flex items-center gap-2"><Mail className="w-3.5 h-3.5 text-gray-400" />{profile.email}</p>
              {profile.phone && <p className="flex items-center gap-2"><Phone className="w-3.5 h-3.5 text-gray-400" />{profile.phone}</p>}
            </div>
            {profile.department && (
              <div className="flex items-center gap-2 p-2.5 rounded-lg border text-sm"
                style={{ backgroundColor: `${profile.department.color}10`, borderColor: `${profile.department.color}30` }}>
                <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: profile.department.color }} />
                <span className="font-medium text-gray-700">{profile.department.name}</span>
                <span className="text-gray-400 text-xs ml-auto">Department</span>
              </div>
            )}
            {profile.organization && (
              <div className="flex items-center gap-3 p-2.5 rounded-lg bg-gray-50 border border-gray-100">
                {profile.organization.logo
                  ? <img src={profile.organization.logo} alt="" className="w-6 h-6 rounded object-cover" />
                  : <Globe className="w-4 h-4 text-gray-400" />}
                <span className="text-sm font-medium text-gray-700">{profile.organization.name}</span>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Change Password Dialog ──────────────────────────────────────────────────────

function ChangePasswordDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const toast = useToast();
  const [form, setForm] = useState({ current: "", next: "", confirm: "" });
  const [saving, setSaving] = useState(false);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNext, setShowNext] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (form.next !== form.confirm) { toast.error("Passwords do not match"); return; }
    if (form.next.length < 8) { toast.error("Password must be at least 8 characters"); return; }
    setSaving(true);
    try {
      await api.post("/auth/change-password", { currentPassword: form.current, newPassword: form.next });
      toast.success("Password changed successfully");
      setForm({ current: "", next: "", confirm: "" });
      onClose();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to change password");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lock className="w-4 h-4" /> Change Password
          </DialogTitle>
          <DialogDescription>Enter your current password and choose a new one.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3 py-2">
          {[
            { label: "Current Password", field: "current" as const, show: showCurrent, toggle: () => setShowCurrent(v => !v) },
            { label: "New Password",     field: "next"    as const, show: showNext,    toggle: () => setShowNext(v => !v)    },
          ].map(({ label, field, show, toggle }) => (
            <div key={field} className="space-y-1.5">
              <Label className="text-xs">{label}</Label>
              <div className="relative">
                <Input
                  type={show ? "text" : "password"}
                  value={form[field]}
                  onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))}
                  required minLength={field === "next" ? 8 : undefined}
                  className="pr-10"
                />
                <button type="button" onClick={toggle}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          ))}
          <div className="space-y-1.5">
            <Label className="text-xs">Confirm New Password</Label>
            <Input type="password" value={form.confirm}
              onChange={e => setForm(f => ({ ...f, confirm: e.target.value }))} required />
          </div>
          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
            <Button type="submit" disabled={saving}>
              {saving ? <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />Saving…</> : "Change Password"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────

export default function ProfilePage() {
  const toast = useToast();
  const { user: authUser, setUser } = useAuthStore();
  const [profile, setProfile]           = useState<ProfileData | null>(null);
  const [loading, setLoading]           = useState(true);
  const [editing, setEditing]           = useState(false);
  const [saving, setSaving]             = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [uploadingAvatar, setUploading] = useState(false);
  const avatarInputRef                  = useRef<HTMLInputElement>(null);

  const [editForm, setEditForm]         = useState({ firstName: "", lastName: "", jobTitle: "", phone: "" });
  const [clearingActivity, setClearingActivity] = useState(false);
  const [cropSrc, setCropSrc]           = useState<string | null>(null);
  const [previewOpen, setPreviewOpen]   = useState(false);

  useEffect(() => {
    api.get("/users/me/profile")
      .then(({ data }) => {
        setProfile(data);
        setEditForm({
          firstName: data.firstName,
          lastName:  data.lastName,
          jobTitle:  data.jobTitle  || "",
          phone:     data.phone     || "",
        });
      })
      .catch(() => toast.error("Failed to load profile"))
      .finally(() => setLoading(false));
  }, []);

  async function handleSave() {
    setSaving(true);
    try {
      const { data } = await api.patch(`/users/${profile!.id}`, editForm);
      setProfile(p => p ? { ...p, ...data } : p);
      setUser({ ...authUser!, firstName: data.firstName, lastName: data.lastName });
      setEditing(false);
      toast.success("Profile updated");
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to update profile");
    } finally {
      setSaving(false);
    }
  }

  function cancelEdit() {
    if (profile) setEditForm({ firstName: profile.firstName, lastName: profile.lastName, jobTitle: profile.jobTitle || "", phone: profile.phone || "" });
    setEditing(false);
  }

  function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => { if (ev.target?.result) setCropSrc(ev.target.result as string); };
    reader.readAsDataURL(file);
    if (avatarInputRef.current) avatarInputRef.current.value = "";
  }

  async function handleCropConfirm(blob: Blob) {
    if (!profile) return;
    setCropSrc(null);
    setUploading(true);
    try {
      const croppedFile = new File([blob], "avatar.jpg", { type: "image/jpeg" });
      const form = new FormData();
      form.append("file", croppedFile);
      const { data: fd } = await api.post("/files/upload", form, { headers: { "Content-Type": "multipart/form-data" } });
      const { data: updated } = await api.patch("/users/me", { avatar: fd.url });
      setProfile(p => p ? { ...p, avatar: updated.avatar } : p);
      setUser({ ...authUser!, avatar: updated.avatar });
      toast.success("Profile photo updated");
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to upload photo");
    } finally {
      setUploading(false);
    }
  }

  async function clearActivity() {
    setClearingActivity(true);
    try {
      await api.delete("/users/me/activity");
      setProfile(p => p ? { ...p, recentActivity: [] } : p);
      toast.success("Activity cleared");
    } catch {
      toast.error("Failed to clear activity");
    } finally {
      setClearingActivity(false);
    }
  }

  // ── Loading / error states ──────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 gap-3 text-gray-400">
        <Loader2 className="w-6 h-6 animate-spin" />
        <span className="text-sm">Loading profile…</span>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3 text-gray-400">
        <XCircle className="w-8 h-8" />
        <p className="text-sm">Failed to load profile. Please refresh.</p>
      </div>
    );
  }

  // ── Derived ─────────────────────────────────────────────────────────────────

  const roleMeta    = ROLE_META[profile.role] ?? ROLE_META.USER;
  const initials    = `${profile.firstName[0] ?? ""}${profile.lastName[0] ?? ""}`.toUpperCase();
  const sysPerm     = profile.departmentPermissions?.system;
  const modEntries  = Object.entries(profile.departmentPermissions?.modules ?? {});
  const displayName = editing
    ? `${editForm.firstName} ${editForm.lastName}`.trim()
    : `${profile.firstName} ${profile.lastName}`;

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="max-w-5xl space-y-6 pb-10">

      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">My Profile</h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage your information and account settings</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setPasswordOpen(true)} className="gap-1.5">
            <Lock className="w-3.5 h-3.5" /> Change Password
          </Button>
          {editing ? (
            <>
              <Button variant="outline" size="sm" onClick={cancelEdit} disabled={saving}>
                <X className="w-3.5 h-3.5 mr-1" /> Cancel
              </Button>
              <Button size="sm" onClick={handleSave} disabled={saving} className="gap-1.5">
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                {saving ? "Saving…" : "Save changes"}
              </Button>
            </>
          ) : (
            <Button size="sm" onClick={() => setEditing(true)} className="gap-1.5">
              <Pencil className="w-3.5 h-3.5" /> Edit Profile
            </Button>
          )}
        </div>
      </div>

      {/* ── Profile card ── */}
      <Card className="overflow-hidden">
        {/* Top gradient band */}
        <div className="h-24 bg-gradient-to-r from-slate-700 to-slate-900 relative">
          {!editing && (
            <button
              onClick={() => setPreviewOpen(true)}
              className="absolute top-2 right-3 flex items-center gap-1 text-xs text-white/60 hover:text-white bg-white/10 hover:bg-white/20 px-2.5 py-1 rounded-lg transition-colors"
            >
              <Eye className="w-3 h-3" /> Preview
            </button>
          )}
        </div>
        <CardContent className="px-6 pb-6">
          <div className="flex flex-col sm:flex-row items-start gap-5 -mt-10">

            {/* Avatar */}
            <div className="relative group/av shrink-0">
              <div className="w-20 h-20 rounded-full overflow-hidden border-4 border-white shadow-lg bg-gray-100">
                {profile.avatar ? (
                  <img src={profile.avatar} alt="avatar" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-blue-600 text-white font-bold text-2xl select-none">
                    {initials}
                  </div>
                )}
              </div>
              <button
                onClick={() => avatarInputRef.current?.click()}
                disabled={uploadingAvatar}
                title="Change photo"
                className="absolute inset-0 rounded-full bg-black/0 group-hover/av:bg-black/45 transition-all flex items-center justify-center cursor-pointer"
              >
                <span className="opacity-0 group-hover/av:opacity-100 transition-opacity">
                  {uploadingAvatar
                    ? <Loader2 className="w-5 h-5 text-white animate-spin" />
                    : <Camera className="w-5 h-5 text-white" />}
                </span>
              </button>
              <div className="absolute -bottom-0.5 -right-0.5 w-6 h-6 rounded-full bg-white shadow border border-gray-200 flex items-center justify-center pointer-events-none">
                <Camera className="w-3 h-3 text-gray-500" />
              </div>
              <input ref={avatarInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif"
                className="hidden" onChange={handleAvatarUpload} />
            </div>

            {/* Info / edit form */}
            <div className="flex-1 pt-3 sm:pt-12 min-w-0">
              {editing ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
                  <div className="space-y-1">
                    <Label className="text-xs">First Name</Label>
                    <Input value={editForm.firstName} onChange={e => setEditForm(f => ({ ...f, firstName: e.target.value }))} className="h-8 text-sm" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Last Name</Label>
                    <Input value={editForm.lastName}  onChange={e => setEditForm(f => ({ ...f, lastName: e.target.value }))}  className="h-8 text-sm" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Job Title</Label>
                    <Input value={editForm.jobTitle}  onChange={e => setEditForm(f => ({ ...f, jobTitle: e.target.value }))}  placeholder="e.g. Sales Manager" className="h-8 text-sm" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Phone</Label>
                    <Input value={editForm.phone}     onChange={e => setEditForm(f => ({ ...f, phone: e.target.value }))}     placeholder="+1 555 0100"     className="h-8 text-sm" />
                  </div>
                </div>
              ) : (
                <div>
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <h2 className="text-xl font-bold text-gray-900">{displayName}</h2>
                    <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border", roleMeta.badge)}>
                      <BadgeCheck className="w-3 h-3" />{roleMeta.label}
                    </span>
                    {!profile.isActive && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700 border border-red-200">
                        Inactive
                      </span>
                    )}
                  </div>
                  {profile.jobTitle && <p className="text-sm text-gray-500 mb-2">{profile.jobTitle}</p>}
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-500">
                    <span className="flex items-center gap-1.5"><Mail className="w-3.5 h-3.5 text-gray-400" />{profile.email}</span>
                    {profile.phone && <span className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5 text-gray-400" />{profile.phone}</span>}
                    <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5 text-gray-400" />Joined {formatDate(profile.createdAt)}</span>
                    {profile.lastLoginAt && (
                      <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5 text-gray-400" />Last login {formatDate(profile.lastLoginAt)}</span>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Stats */}
            {!editing && (
              <div className="flex gap-4 shrink-0 mt-3">
                <div className="text-center">
                  <p className="text-xl font-bold text-gray-900">{profile._count?.createdRecords ?? 0}</p>
                  <p className="text-[11px] text-gray-400 mt-0.5">Records</p>
                </div>
                <div className="w-px bg-gray-100" />
                <div className="text-center">
                  <p className="text-xl font-bold text-gray-900">{profile._count?.comments ?? 0}</p>
                  <p className="text-[11px] text-gray-400 mt-0.5">Comments</p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ── Two-column body ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* LEFT: org + access */}
        <div className="lg:col-span-1 space-y-5">

          {/* Organization */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <Globe className="w-4 h-4 text-gray-400" /> Organization
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0 space-y-3">
              {profile.organization ? (
                <>
                  <div className="flex items-center gap-3">
                    {profile.organization.logo ? (
                      <img src={profile.organization.logo} alt="" className="w-10 h-10 rounded-lg object-cover border border-gray-100" />
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                        <Globe className="w-5 h-5 text-slate-400" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">{profile.organization.name}</p>
                      {profile.organization.website && (
                        <a href={profile.organization.website} target="_blank" rel="noreferrer"
                          className="text-xs text-blue-500 hover:underline truncate block">{profile.organization.website}</a>
                      )}
                    </div>
                  </div>
                  {profile.organization.description && (
                    <p className="text-xs text-gray-500 leading-relaxed">{profile.organization.description}</p>
                  )}
                </>
              ) : (
                <p className="text-xs text-gray-400">No organization info available</p>
              )}
            </CardContent>
          </Card>

          {/* Department / Group */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <Users className="w-4 h-4 text-gray-400" /> Department / Group
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {profile.department ? (
                <div className="flex items-center gap-3 p-3 rounded-xl border"
                  style={{ backgroundColor: `${profile.department.color}12`, borderColor: `${profile.department.color}35` }}>
                  <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: profile.department.color }} />
                  <div>
                    <p className="text-sm font-semibold text-gray-800">{profile.department.name}</p>
                    <p className="text-[11px] text-gray-500 mt-0.5">Your assigned unit</p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2 p-3 rounded-xl border border-dashed border-gray-200 text-gray-400">
                  <Building2 className="w-4 h-4 shrink-0" />
                  <p className="text-xs">Not assigned to a department</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Access Type */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <Shield className="w-4 h-4 text-gray-400" /> Account Access
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0 space-y-3">
              <div className="flex items-start gap-3 p-3 rounded-xl bg-gray-50 border border-gray-100">
                <BadgeCheck className={cn("w-5 h-5 mt-0.5 shrink-0", roleMeta.color)} />
                <div>
                  <p className={cn("text-sm font-bold", roleMeta.color)}>{roleMeta.label}</p>
                  <p className="text-[11px] text-gray-500 mt-0.5">{roleMeta.desc}</p>
                </div>
              </div>

              {sysPerm && (
                <div className="space-y-1.5 pt-1">
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Permissions</p>
                  <div className="grid grid-cols-2 gap-1">
                    {SYS_PERMS.map(({ key, label }) => {
                      const granted = (sysPerm as any)[key];
                      return (
                        <div key={key} className={cn(
                          "flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-[11px] font-medium",
                          granted ? "bg-green-50 text-green-700 border border-green-100" : "bg-gray-50 text-gray-400 border border-gray-100"
                        )}>
                          {granted
                            ? <CheckCircle2 className="w-3 h-3 shrink-0" />
                            : <XCircle      className="w-3 h-3 shrink-0" />}
                          {label}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* RIGHT: activity + module access */}
        <div className="lg:col-span-2 space-y-5">

          {/* Recent Activity */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <Activity className="w-4 h-4 text-gray-400" /> Recent Activity
                  {!!profile.recentActivity?.length && (
                    <span className="text-[11px] font-normal text-gray-400">({profile.recentActivity.length})</span>
                  )}
                </CardTitle>
                {!!profile.recentActivity?.length && (
                  <button
                    onClick={clearActivity}
                    disabled={clearingActivity}
                    className="flex items-center gap-1 text-xs text-gray-400 hover:text-red-500 transition-colors disabled:opacity-50"
                  >
                    {clearingActivity
                      ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      : <Trash2 className="w-3.5 h-3.5" />}
                    Clear all
                  </button>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {!profile.recentActivity?.length ? (
                <div className="flex flex-col items-center justify-center py-10 text-gray-400">
                  <Activity className="w-8 h-8 mb-2 opacity-30" />
                  <p className="text-sm">No activity yet</p>
                </div>
              ) : (
                <div className="max-h-72 overflow-y-auto divide-y divide-gray-50">
                  {profile.recentActivity.map(log => {
                    const info = ACTION_LABELS[log.action] ?? { label: log.action.replace(/_/g, " "), color: "text-gray-600" };
                    return (
                      <div key={log.id} className="flex items-center gap-3 px-5 py-3">
                        <div className="w-1.5 h-1.5 rounded-full bg-gray-200 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className={cn("text-sm font-medium", info.color)}>{info.label}</p>
                          <p className="text-xs text-gray-400 capitalize">{log.entityType.replace(/_/g, " ").toLowerCase()}</p>
                        </div>
                        <p className="text-xs text-gray-400 shrink-0">{formatDate(log.createdAt)}</p>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Module access */}
          {modEntries.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-gray-400" /> Module Access
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0 space-y-4">
                {modEntries.map(([slug, perms]) => {
                  const MOD_KEYS = ["canView","canCreate","canEdit","canDelete","canExport","canImport","canPrint"] as const;
                  const granted = MOD_KEYS.filter(k => (perms as any)[k]);
                  const moduleName = slug.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase());
                  return (
                    <div key={slug}>
                      <p className="text-xs font-semibold text-gray-700 mb-2">{moduleName}</p>
                      <div className="flex flex-wrap gap-1.5">
                        {granted.length === 0 ? (
                          <span className="text-xs text-gray-400">No permissions</span>
                        ) : granted.map(k => (
                          <span key={k} className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-blue-50 text-blue-700 border border-blue-100">
                            {k.replace("can", "")}
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          )}

        </div>
      </div>

      {/* ── Dialogs ── */}
      <ChangePasswordDialog open={passwordOpen} onClose={() => setPasswordOpen(false)} />
      {cropSrc && (
        <AvatarCropModal src={cropSrc} onConfirm={handleCropConfirm} onClose={() => setCropSrc(null)} />
      )}
      {previewOpen && (
        <ProfilePreviewModal profile={profile} onClose={() => setPreviewOpen(false)} />
      )}
    </div>
  );
}
