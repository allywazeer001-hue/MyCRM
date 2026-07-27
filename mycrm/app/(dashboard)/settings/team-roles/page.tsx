"use client";
import { useState, useEffect, useCallback } from "react";
import {
  Users, Plus, Pencil, Trash2, X, RefreshCw, Tag,
  AlertCircle, CheckCircle2, Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle,
  AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/auth.store";

// ── Types ─────────────────────────────────────────────────────────────────────

type TeamRole = {
  id: string;
  name: string;
  description?: string;
  color: string;
  organizationId: string;
  createdAt: string;
  _count?: { users: number };
};

// ── Suggested roles ────────────────────────────────────────────────────────────

const SUGGESTED_ROLES = [
  { name: "Finance Officer",       description: "Manages budgets, payments, and financial records.",        color: "#22c55e" },
  { name: "Education Officer",     description: "Oversees educational programs and learning activities.",    color: "#0ea5e9" },
  { name: "HR Director",           description: "Leads human resources, hiring, and staff welfare.",        color: "#8b5cf6" },
  { name: "Teller",                description: "Handles cash transactions and customer payments.",          color: "#f97316" },
  { name: "Teacher",               description: "Delivers instruction and supports student learning.",       color: "#14b8a6" },
  { name: "Operations Manager",    description: "Oversees daily operations and process efficiency.",         color: "#6366f1" },
  { name: "IT Officer",            description: "Maintains systems, networks, and technical support.",       color: "#3b82f6" },
  { name: "Marketing Officer",     description: "Manages campaigns, branding, and communications.",          color: "#ec4899" },
  { name: "Customer Service",      description: "Supports clients and resolves inquiries.",                  color: "#eab308" },
  { name: "Legal Officer",         description: "Handles compliance, contracts, and legal matters.",         color: "#64748b" },
  { name: "Procurement Officer",   description: "Manages purchasing, vendors, and supply chain.",            color: "#78716c" },
  { name: "Field Officer",         description: "Works on-site for field operations and data collection.",   color: "#ef4444" },
  { name: "Programme Manager",     description: "Plans and coordinates organizational programmes.",          color: "#a855f7" },
  { name: "Communications Officer",description: "Handles internal and external communications.",             color: "#06b6d4" },
  { name: "M&E Officer",           description: "Monitoring and evaluation of projects and outcomes.",       color: "#84cc16" },
  { name: "Admin Officer",         description: "Provides administrative and secretarial support.",          color: "#f59e0b" },
];

// ── Preset colors ──────────────────────────────────────────────────────────────

const PRESET_COLORS = [
  "#6366f1", "#8b5cf6", "#ec4899", "#ef4444", "#f97316",
  "#eab308", "#22c55e", "#14b8a6", "#0ea5e9", "#3b82f6",
  "#64748b", "#78716c",
];

// ── Toast ─────────────────────────────────────────────────────────────────────

function Toast({ msg, type }: { msg: string; type: "success" | "error" }) {
  return (
    <div className={cn(
      "flex items-center gap-2 p-3 rounded-lg border text-sm",
      type === "success"
        ? "bg-green-50 border-green-200 text-green-700"
        : "bg-red-50 border-red-200 text-red-700"
    )}>
      {type === "success"
        ? <CheckCircle2 className="w-4 h-4 shrink-0" />
        : <AlertCircle className="w-4 h-4 shrink-0" />}
      {msg}
    </div>
  );
}

// ── Form Dialog ───────────────────────────────────────────────────────────────

function TeamRoleFormDialog({
  open, onClose, onSaved, editRole,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: (role: TeamRole) => void;
  editRole: TeamRole | null;
}) {
  const isEdit = !!editRole;
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState(PRESET_COLORS[0]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setName(editRole?.name ?? "");
      setDescription(editRole?.description ?? "");
      setColor(editRole?.color ?? PRESET_COLORS[0]);
      setError(null);
    }
  }, [open, editRole]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { setError("Name is required"); return; }
    setSaving(true);
    setError(null);
    try {
      const payload = { name: name.trim(), description: description.trim() || null, color };
      const { data } = isEdit
        ? await api.patch(`/team-roles/${editRole!.id}`, payload)
        : await api.post("/team-roles", payload);
      onSaved(data);
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.message || "Failed to save team role");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Team Role" : "Add Custom Role"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {error && <Toast msg={error} type="error" />}

          <div className="space-y-1.5">
            <Label>Role name <span className="text-red-500">*</span></Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Grants Officer, Librarian, Nurse"
              required
              autoFocus
            />
          </div>

          <div className="space-y-1.5">
            <Label>Description <span className="text-gray-400 font-normal">(optional)</span></Label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of responsibilities"
            />
          </div>

          <div className="space-y-2">
            <Label>Color</Label>
            <div className="flex items-center gap-3">
              <div
                className="w-8 h-8 rounded-full border-2 border-white ring-2 ring-gray-200 shrink-0"
                style={{ backgroundColor: color }}
              />
              <div className="flex flex-wrap gap-2">
                {PRESET_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    className={cn(
                      "w-6 h-6 rounded-full border-2 transition-all",
                      color === c ? "border-gray-800 scale-110" : "border-transparent hover:border-gray-300"
                    )}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? <><RefreshCw className="w-4 h-4 mr-1.5 animate-spin" />Saving…</> : isEdit ? "Save Changes" : "Create Role"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function TeamRolesPage() {
  const { user } = useAuthStore();
  const isAdmin = user?.role === "SUPER_ADMIN" || user?.role === "ADMIN";

  const [roles, setRoles] = useState<TeamRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);
  const [addingId, setAddingId] = useState<string | null>(null);

  const [formOpen, setFormOpen] = useState(false);
  const [editRole, setEditRole] = useState<TeamRole | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<TeamRole | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [search, setSearch] = useState("");

  const showToast = (msg: string, type: "success" | "error") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/team-roles");
      setRoles(data);
    } catch {
      showToast("Failed to load team roles", "error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  function handleSaved(role: TeamRole) {
    setRoles((prev) => {
      const idx = prev.findIndex((r) => r.id === role.id);
      if (idx >= 0) { const next = [...prev]; next[idx] = role; return next; }
      return [...prev, role];
    });
    showToast(editRole ? "Team role updated" : "Team role created", "success");
  }

  async function addSuggested(s: typeof SUGGESTED_ROLES[0]) {
    if (!isAdmin) return;
    setAddingId(s.name);
    try {
      const { data } = await api.post("/team-roles", { name: s.name, description: s.description, color: s.color });
      setRoles((prev) => [...prev, data]);
      showToast(`"${s.name}" added`, "success");
    } catch (err: any) {
      showToast(err?.response?.data?.message || "Failed to add role", "error");
    } finally {
      setAddingId(null);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.delete(`/team-roles/${deleteTarget.id}`);
      setRoles((prev) => prev.filter((r) => r.id !== deleteTarget.id));
      showToast("Team role deleted", "success");
    } catch (err: any) {
      showToast(err?.response?.data?.message || "Failed to delete", "error");
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  }

  const existingNames = new Set(roles.map((r) => r.name.toLowerCase()));
  const availableSuggestions = SUGGESTED_ROLES.filter((s) => !existingNames.has(s.name.toLowerCase()));

  const filtered = roles.filter((r) =>
    !search.trim() || r.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Team Roles</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Assign job roles to staff to organise responsibilities across your team.
          </p>
        </div>
        {isAdmin && (
          <Button onClick={() => { setEditRole(null); setFormOpen(true); }} className="gap-1.5">
            <Plus className="w-4 h-4" /> Add Custom Role
          </Button>
        )}
      </div>

      {toast && <Toast msg={toast.msg} type={toast.type} />}

      {/* ── Suggested roles ─────────────────────────────────────────────── */}
      {isAdmin && availableSuggestions.length > 0 && (
        <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-5">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-4 h-4 text-blue-500" />
            <p className="text-sm font-semibold text-blue-800">Suggested Roles</p>
            <span className="text-xs text-blue-500 ml-1">— click any to add instantly</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {availableSuggestions.map((s) => (
              <button
                key={s.name}
                type="button"
                disabled={addingId === s.name}
                onClick={() => addSuggested(s)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border bg-white hover:shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ borderColor: `${s.color}50`, color: s.color }}
              >
                {addingId === s.name
                  ? <RefreshCw className="w-3 h-3 animate-spin" />
                  : <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: s.color }} />}
                {s.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Active roles ─────────────────────────────────────────────────── */}
      {roles.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-gray-700">Active Roles ({roles.length})</p>
            <div className="relative">
              <Tag className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search…"
                className="pl-8 h-8 text-xs w-44"
              />
              {search && (
                <button onClick={() => setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>

          {loading ? (
            <div className="py-8 text-center text-sm text-gray-400">
              <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-gray-300" />
              Loading…
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {filtered.map((role) => (
                <div
                  key={role.id}
                  className="group relative flex items-start gap-3 p-4 rounded-xl border border-gray-200 bg-white hover:shadow-sm transition-all"
                >
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 text-white font-semibold text-sm"
                    style={{ backgroundColor: role.color }}
                  >
                    {role.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 text-sm truncate">{role.name}</p>
                    {role.description && (
                      <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{role.description}</p>
                    )}
                    <div className="flex items-center gap-1.5 mt-2">
                      <Badge variant="secondary" className="text-xs px-1.5 py-0 gap-1">
                        <Users className="w-3 h-3" />
                        {role._count?.users ?? 0} {role._count?.users === 1 ? "user" : "users"}
                      </Badge>
                    </div>
                  </div>
                  {isAdmin && (
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity absolute top-3 right-3">
                      <button
                        onClick={() => { setEditRole(role); setFormOpen(true); }}
                        className="p-1.5 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setDeleteTarget(role)}
                        className="p-1.5 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Empty state (no roles at all) */}
      {!loading && roles.length === 0 && (
        <div className="py-10 text-center">
          <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
            <Users className="w-6 h-6 text-gray-400" />
          </div>
          <p className="text-sm font-medium text-gray-600">No team roles yet</p>
          <p className="text-xs text-gray-400 mt-1">
            Click a suggested role above to add it, or use "Add Custom Role" for something specific.
          </p>
        </div>
      )}

      {/* Form dialog */}
      <TeamRoleFormDialog
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSaved={handleSaved}
        editRole={editRole}
      />

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(v: boolean) => { if (!v) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{deleteTarget?.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the team role from all assigned users
              {deleteTarget?._count?.users ? ` (${deleteTarget._count.users} ${deleteTarget._count.users === 1 ? "user" : "users"})` : ""}.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleting ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
