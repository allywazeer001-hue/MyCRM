"use client";
import { useEffect, useState, useCallback } from "react";
import {
  Building2, Plus, Trash2, Pencil, Users, Shield,
  Loader2, Check, Settings, MoreHorizontal, UserPlus, UserMinus, Crown, X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/toast";

// ── Types ──────────────────────────────────────────────────────────────────

interface UnitHead {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

interface Unit {
  id: string;
  name: string;
  slug: string;
  description?: string;
  color: string;
  headUserId?: string | null;
  head?: UnitHead | null;
  _count?: { users: number };
  permissions?: Permission[];
  users?: any[];
}

interface Permission {
  id: string | null;
  moduleId: string | null;
  departmentId: string;
  module?: { id: string; name: string; slug: string; icon: string };
  canView: boolean; canCreate: boolean; canEdit: boolean; canDelete: boolean;
  canExport: boolean; canImport: boolean; canPrint: boolean;
  canStudio: boolean; canAnalytics: boolean; canWorkflow: boolean;
  canForms: boolean; canDashboard: boolean;
}

const UNIT_COLORS = [
  "#3b82f6", "#8b5cf6", "#10b981", "#f59e0b",
  "#ef4444", "#06b6d4", "#ec4899", "#f97316",
];

const MODULE_PERM_KEYS: { key: keyof Permission; label: string }[] = [
  { key: "canView", label: "View" },
  { key: "canCreate", label: "Create" },
  { key: "canEdit", label: "Edit" },
  { key: "canDelete", label: "Delete" },
  { key: "canExport", label: "Export" },
  { key: "canImport", label: "Import" },
  { key: "canPrint", label: "Print" },
];

const SYSTEM_PERM_KEYS: { key: keyof Permission; label: string; desc: string }[] = [
  { key: "canDashboard", label: "Dashboard", desc: "Access dashboard & widgets" },
  { key: "canAnalytics", label: "Analytics", desc: "View and build analytics" },
  { key: "canWorkflow", label: "Workflows", desc: "View and run workflows" },
  { key: "canForms", label: "Forms", desc: "Access form builder" },
  { key: "canStudio", label: "Studio", desc: "Access module studio" },
];

// ── Unit Form Dialog ───────────────────────────────────────────────────────

function UnitFormDialog({
  unit, open, onClose, onSave,
}: {
  unit?: Unit | null;
  open: boolean;
  onClose: () => void;
  onSave: (d: Unit) => void;
}) {
  const [name, setName] = useState(unit?.name || "");
  const [description, setDescription] = useState(unit?.description || "");
  const [color, setColor] = useState(unit?.color || UNIT_COLORS[0]);
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  useEffect(() => {
    setName(unit?.name || "");
    setDescription(unit?.description || "");
    setColor(unit?.color || UNIT_COLORS[0]);
  }, [unit]);

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      const payload = { name, description, color };
      const { data } = unit
        ? await api.patch(`/departments/${unit.id}`, payload)
        : await api.post("/departments", payload);
      toast.success(unit ? "Unit updated" : "Unit created");
      onSave(data);
      onClose();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to save unit");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{unit ? "Edit Unit" : "Create Unit"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Name *</Label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Finance, HR, Operations" autoFocus />
          </div>
          <div className="space-y-1.5">
            <Label>Description</Label>
            <Input value={description} onChange={e => setDescription(e.target.value)} placeholder="Optional description" />
          </div>
          <div className="space-y-1.5">
            <Label>Color</Label>
            <div className="flex gap-2">
              {UNIT_COLORS.map(c => (
                <button key={c} onClick={() => setColor(c)}
                  className={cn("w-7 h-7 rounded-full border-2 transition-transform hover:scale-110",
                    color === c ? "border-gray-900 scale-110" : "border-transparent")}
                  style={{ backgroundColor: c }} />
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={!name.trim() || saving}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            {unit ? "Save Changes" : "Create Unit"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Set Unit Head Dialog ───────────────────────────────────────────────────

function SetUnitHeadDialog({
  unit, open, onClose, onHeadSet,
}: {
  unit: Unit;
  open: boolean;
  onClose: () => void;
  onHeadSet: (head: UnitHead | null) => void;
}) {
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [selectedUserId, setSelectedUserId] = useState<string | null>(unit.headUserId || null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  useEffect(() => {
    if (!open) return;
    setSearch("");
    setSelectedUserId(unit.headUserId || null);
    setLoading(true);
    api.get("/users")
      .then(r => setAllUsers(r.data ?? []))
      .catch(() => toast.error("Failed to load users"))
      .finally(() => setLoading(false));
  }, [open, unit.headUserId]);

  const filtered = allUsers.filter(u =>
    u.isActive &&
    `${u.firstName} ${u.lastName} ${u.email}`.toLowerCase().includes(search.toLowerCase())
  );

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.patch(`/departments/${unit.id}/head`, { headUserId: selectedUserId });
      if (selectedUserId) {
        const user = allUsers.find(u => u.id === selectedUserId);
        onHeadSet(user ? { id: user.id, firstName: user.firstName, lastName: user.lastName, email: user.email } : null);
        toast.success(`Unit head set to ${user?.firstName} ${user?.lastName}`);
      } else {
        onHeadSet(null);
        toast.success("Unit head cleared");
      }
      onClose();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to set unit head");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Crown className="w-5 h-5 text-amber-500" /> Set Unit Head
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          {unit.head && (
            <div className="flex items-center gap-2 p-2 rounded-lg bg-amber-50 border border-amber-100 text-sm">
              <Crown className="w-4 h-4 text-amber-500 shrink-0" />
              <span className="text-amber-800 font-medium">Current head:</span>
              <span className="text-amber-700">{unit.head.firstName} {unit.head.lastName}</span>
              <button
                className="ml-auto p-0.5 rounded hover:bg-amber-200 text-amber-600"
                title="Clear unit head"
                onClick={() => setSelectedUserId(null)}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
          <Input
            placeholder="Search users…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            autoFocus
          />
          <div className="max-h-72 overflow-y-auto divide-y divide-gray-50 rounded-lg border border-gray-100">
            {loading ? (
              <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-blue-500" /></div>
            ) : filtered.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-6">No users match your search.</p>
            ) : (
              filtered.map(u => (
                <button
                  key={u.id}
                  onClick={() => setSelectedUserId(selectedUserId === u.id ? null : u.id)}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 text-left transition-colors",
                    selectedUserId === u.id && "bg-blue-50 hover:bg-blue-50"
                  )}
                >
                  <div className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0",
                    selectedUserId === u.id ? "bg-blue-600 text-white" : "bg-blue-100 text-blue-700"
                  )}>
                    {u.firstName?.[0]}{u.lastName?.[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{u.firstName} {u.lastName}</p>
                    <p className="text-xs text-gray-500 truncate">{u.email}</p>
                  </div>
                  <Badge variant="secondary" className="text-xs shrink-0">{u.role?.replace(/_/g, " ")}</Badge>
                  {selectedUserId === u.id && <Check className="w-4 h-4 text-blue-600 shrink-0" />}
                </button>
              ))
            )}
          </div>
          {!unit.head && !selectedUserId && (
            <p className="text-xs text-gray-400 text-center">Select a user to assign as unit head, or leave unselected to clear.</p>
          )}
        </div>
        <DialogFooter className="gap-2">
          {(unit.headUserId || selectedUserId) && (
            <Button variant="ghost" className="text-red-500 hover:text-red-600 hover:bg-red-50 mr-auto"
              onClick={() => setSelectedUserId(null)} disabled={saving}>
              Clear Head
            </Button>
          )}
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Crown className="w-4 h-4 mr-2" />}
            Confirm
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Permissions Editor ─────────────────────────────────────────────────────

function PermissionsEditor({ unitId }: { unitId: string }) {
  const [data, setData] = useState<{
    systemPermission: Permission;
    modulePermissions: { module: any; permission: Permission }[];
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const toast = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data: d } = await api.get(`/departments/${unitId}/permissions`);
      setData(d);
    } catch {
      toast.error("Failed to load permissions");
    } finally {
      setLoading(false);
    }
  }, [unitId]);

  useEffect(() => { load(); }, [load]);

  const updateSysPerm = (key: keyof Permission, val: boolean) => {
    if (!data) return;
    setData({ ...data, systemPermission: { ...data.systemPermission, [key]: val } });
    setDirty(true);
  };

  const updateModPerm = (moduleId: string | null, key: keyof Permission, val: boolean) => {
    if (!data) return;
    setData({
      ...data,
      modulePermissions: data.modulePermissions.map(mp =>
        mp.module.id === moduleId
          ? { ...mp, permission: { ...mp.permission, [key]: val } }
          : mp
      ),
    });
    setDirty(true);
  };

  const saveAll = async () => {
    if (!data) return;
    setSaving(true);
    try {
      const permissions = [
        { ...data.systemPermission, moduleId: null },
        ...data.modulePermissions.map(mp => ({ ...mp.permission, moduleId: mp.module.id })),
      ];
      await api.patch(`/departments/${unitId}/permissions`, { permissions });
      toast.success("Permissions saved");
      setDirty(false);
    } catch {
      toast.error("Failed to save permissions");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-blue-600" /></div>;
  if (!data) return null;

  return (
    <div className="space-y-4">
      {dirty && (
        <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-lg px-4 py-2">
          <p className="text-sm text-blue-700">You have unsaved permission changes.</p>
          <Button size="sm" onClick={saveAll} disabled={saving}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Check className="w-4 h-4 mr-2" />}
            Save Permissions
          </Button>
        </div>
      )}

      {/* System Permissions */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-gray-700 flex items-center gap-2">
            <Shield className="w-4 h-4 text-purple-500" /> System Features
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div>
            {SYSTEM_PERM_KEYS.map(({ key, label, desc }) => (
              <div key={key} className="flex items-center justify-between py-2.5 border-b border-gray-50 last:border-0">
                <div>
                  <p className="text-sm font-medium text-gray-800">{label}</p>
                  <p className="text-xs text-gray-500">{desc}</p>
                </div>
                <Checkbox
                  checked={!!(data.systemPermission as any)[key]}
                  onCheckedChange={v => updateSysPerm(key, !!v)}
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Module Permissions */}
      <Card>
        <CardContent className="p-0">
          {data.modulePermissions.length === 0 ? (
            <p className="text-sm text-gray-400 py-8 text-center">No modules found. Create modules in Studio first.</p>
          ) : (
            <div className="overflow-x-auto">
            <div>
              {/* Header row */}
              <div className="flex items-center px-6 py-2 bg-gray-50 border-b border-gray-100 rounded-t-xl">
                <div className="flex items-center gap-2 w-48 shrink-0">
                  <Settings className="w-4 h-4 text-blue-500" />
                  <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Module</span>
                </div>
                <div className="flex gap-0 flex-1">
                  {MODULE_PERM_KEYS.map(k => (
                    <div key={String(k.key)} className="w-16 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      {k.label}
                    </div>
                  ))}
                </div>
              </div>
              {data.modulePermissions.map(({ module, permission }) => (
                <div key={module.id} className="flex items-center px-6 py-3 border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition-colors">
                  <div className="flex items-center gap-2 w-48 shrink-0">
                    <span className="text-base">{module.icon || "📦"}</span>
                    <span className="text-sm font-medium text-gray-800 truncate">{module.name}</span>
                  </div>
                  <div className="flex gap-0 flex-1">
                    {MODULE_PERM_KEYS.map(({ key }) => (
                      <div key={String(key)} className="w-16 flex justify-center">
                        <Checkbox
                          checked={!!(permission as any)[key]}
                          onCheckedChange={v => updateModPerm(module.id, key, !!v)}
                          className="data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            </div>
          )}
        </CardContent>
      </Card>

      {!dirty && (
        <div className="flex justify-end">
          <Button onClick={saveAll} disabled={saving}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Check className="w-4 h-4 mr-2" />}
            Save All Permissions
          </Button>
        </div>
      )}
    </div>
  );
}

// ── Add Member Dialog ──────────────────────────────────────────────────────

function AddMemberDialog({
  unitId, currentMemberIds, open, onClose, onAdded,
}: {
  unitId: string;
  currentMemberIds: string[];
  open: boolean;
  onClose: () => void;
  onAdded: (user: any) => void;
}) {
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [adding, setAdding] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const toast = useToast();

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    api.get("/users")
      .then(r => setAllUsers(r.data ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [open]);

  const available = allUsers.filter(u =>
    u.isActive &&
    !currentMemberIds.includes(u.id) &&
    (`${u.firstName} ${u.lastName} ${u.email}`.toLowerCase().includes(search.toLowerCase()))
  );

  const handleAdd = async (user: any) => {
    setAdding(user.id);
    try {
      await api.post(`/departments/${unitId}/members/${user.id}`);
      onAdded(user);
      toast.success(`${user.firstName} ${user.lastName} added`);
    } catch {
      toast.error("Failed to add member");
    } finally {
      setAdding(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-blue-600" /> Add Members
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <Input
            placeholder="Search users…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            autoFocus
          />
          <div className="max-h-72 overflow-y-auto divide-y divide-gray-50 rounded-lg border border-gray-100">
            {loading ? (
              <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-blue-500" /></div>
            ) : available.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-6">
                {search ? "No users match your search." : "All active users are already in this unit."}
              </p>
            ) : (
              available.map(u => (
                <div key={u.id} className="flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50">
                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 text-xs font-bold shrink-0">
                    {u.firstName?.[0]}{u.lastName?.[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{u.firstName} {u.lastName}</p>
                    <p className="text-xs text-gray-500 truncate">{u.email}</p>
                  </div>
                  <Badge variant="secondary" className="text-xs shrink-0">{u.role?.replace(/_/g, " ")}</Badge>
                  <Button
                    size="sm"
                    variant="outline"
                    className="shrink-0"
                    disabled={adding === u.id}
                    onClick={() => handleAdd(u)}
                  >
                    {adding === u.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                  </Button>
                </div>
              ))
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Done</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Members Panel ──────────────────────────────────────────────────────────

function MembersPanel({ unit, onMembersChange }: { unit: Unit; onMembersChange: (members: any[]) => void }) {
  const [members, setMembers] = useState<any[]>(unit.users || []);
  const [addOpen, setAddOpen] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);
  const toast = useToast();

  useEffect(() => { setMembers(unit.users || []); }, [unit]);

  const handleRemove = async (user: any) => {
    if (!confirm(`Remove ${user.firstName} ${user.lastName} from this unit?`)) return;
    setRemoving(user.id);
    try {
      await api.delete(`/departments/${unit.id}/members/${user.id}`);
      const updated = members.filter(m => m.id !== user.id);
      setMembers(updated);
      onMembersChange(updated);
      toast.success(`${user.firstName} ${user.lastName} removed`);
    } catch {
      toast.error("Failed to remove member");
    } finally {
      setRemoving(null);
    }
  };

  const handleAdded = (user: any) => {
    const updated = [...members, user];
    setMembers(updated);
    onMembersChange(updated);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">{members.length} member{members.length !== 1 ? "s" : ""}</p>
        <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setAddOpen(true)}>
          <UserPlus className="w-4 h-4" /> Add Member
        </Button>
      </div>

      {members.length === 0 ? (
        <div className="text-center py-10 text-gray-400 border-2 border-dashed border-gray-100 rounded-xl">
          <Users className="w-10 h-10 mx-auto mb-2 opacity-40" />
          <p className="text-sm font-medium">No members yet</p>
          <p className="text-xs mt-1">Click "Add Member" to assign users to this unit.</p>
        </div>
      ) : (
        <div className="divide-y divide-gray-50">
          {members.map((u: any) => (
            <div key={u.id} className="flex items-center gap-3 py-2.5">
              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 text-xs font-bold shrink-0">
                {u.firstName?.[0]}{u.lastName?.[0]}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800">{u.firstName} {u.lastName}</p>
                <p className="text-xs text-gray-500">{u.email}</p>
              </div>
              <Badge variant="secondary" className="text-xs shrink-0">{u.role?.replace(/_/g, " ")}</Badge>
              <button
                onClick={() => handleRemove(u)}
                disabled={removing === u.id}
                className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-40 shrink-0"
                title="Remove from unit"
              >
                {removing === u.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserMinus className="w-4 h-4" />}
              </button>
            </div>
          ))}
        </div>
      )}

      <AddMemberDialog
        unitId={unit.id}
        currentMemberIds={members.map(m => m.id)}
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onAdded={handleAdded}
      />
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────

export default function UnitsManagementPage() {
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Unit | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Unit | null>(null);
  const [setHeadTarget, setSetHeadTarget] = useState<Unit | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const toast = useToast();

  const loadList = useCallback(async () => {
    try {
      const { data } = await api.get("/departments");
      setUnits(data);
      if (data.length > 0 && !selected) loadDetail(data[0]);
    } catch {
      toast.error("Failed to load units");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadDetail = async (unit: Unit) => {
    setDetailLoading(true);
    try {
      const { data } = await api.get(`/departments/${unit.id}`);
      setSelected(data);
    } catch {
      setSelected(unit);
    } finally {
      setDetailLoading(false);
    }
  };

  useEffect(() => { loadList(); }, [loadList]);

  const handleDelete = async (unit: Unit) => {
    if (!confirm(`Delete "${unit.name}"? Users will be unassigned.`)) return;
    try {
      await api.delete(`/departments/${unit.id}`);
      toast.success("Unit deleted");
      setUnits(prev => prev.filter(d => d.id !== unit.id));
      if (selected?.id === unit.id) setSelected(null);
    } catch {
      toast.error("Failed to delete unit");
    }
  };

  const handleSaved = (saved: Unit) => {
    setUnits(prev => {
      const idx = prev.findIndex(d => d.id === saved.id);
      if (idx >= 0) { const n = [...prev]; n[idx] = { ...prev[idx], ...saved }; return n; }
      return [...prev, saved];
    });
    loadDetail(saved);
  };

  const handleHeadSet = (unit: Unit, head: UnitHead | null) => {
    const updated = { ...unit, head, headUserId: head?.id ?? null };
    setUnits(prev => prev.map(u => u.id === unit.id ? { ...u, head, headUserId: head?.id ?? null } : u));
    if (selected?.id === unit.id) setSelected(updated);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Units Management</h1>
          <p className="text-gray-500 text-sm mt-1">
            Manage organizational units, assign unit heads, and configure access permissions
          </p>
        </div>
        <Button className="gap-2" onClick={() => { setEditTarget(null); setFormOpen(true); }}>
          <Plus className="w-4 h-4" /> New Unit
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sidebar — unit list */}
        <div className="space-y-2">
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-blue-600" /></div>
          ) : units.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center">
                <Building2 className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                <p className="text-sm text-gray-500">No units yet.</p>
                <Button size="sm" className="mt-4" onClick={() => setFormOpen(true)}>Create First Unit</Button>
              </CardContent>
            </Card>
          ) : (
            units.map(unit => (
              <button
                key={unit.id}
                onClick={() => loadDetail(unit)}
                className={cn(
                  "w-full text-left p-3 rounded-xl border transition-all group",
                  selected?.id === unit.id
                    ? "border-blue-300 bg-blue-50 shadow-sm"
                    : "border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm"
                )}
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center text-white text-sm font-bold shrink-0"
                    style={{ backgroundColor: unit.color || "#3b82f6" }}>
                    {unit.name[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800 truncate">{unit.name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <p className="text-xs text-gray-500">{unit._count?.users || 0} members</p>
                      {unit.head ? (
                        <p className="text-xs text-amber-600 flex items-center gap-0.5">
                          <Crown className="w-3 h-3" />
                          {unit.head.firstName} {unit.head.lastName}
                        </p>
                      ) : (
                        <p className="text-xs text-gray-400">No head</p>
                      )}
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={e => e.stopPropagation()}>
                      <div className="p-1 rounded hover:bg-gray-200 opacity-0 group-hover:opacity-100">
                        <MoreHorizontal className="w-4 h-4 text-gray-500" />
                      </div>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={e => { e.stopPropagation(); setEditTarget(unit); setFormOpen(true); }}>
                        <Pencil className="w-4 h-4 mr-2" /> Edit Unit
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={e => { e.stopPropagation(); setSetHeadTarget(unit); }}>
                        <Crown className="w-4 h-4 mr-2" /> Set Unit Head
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="text-red-600 focus:text-red-600 focus:bg-red-50"
                        onClick={e => { e.stopPropagation(); handleDelete(unit); }}>
                        <Trash2 className="w-4 h-4 mr-2" /> Delete Unit
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </button>
            ))
          )}
        </div>

        {/* Detail panel */}
        <div className="lg:col-span-2">
          {detailLoading ? (
            <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-blue-600" /></div>
          ) : !selected ? (
            <Card>
              <CardContent className="py-16 text-center text-gray-400">
                <Building2 className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>Select a unit to view details</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {/* Unit header */}
              <div className="flex items-start gap-3 p-4 rounded-xl border border-gray-200 bg-white">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold shrink-0"
                  style={{ backgroundColor: selected.color || "#3b82f6" }}>
                  {selected.name[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-lg font-bold text-gray-900">{selected.name}</h2>
                  {selected.description && <p className="text-sm text-gray-500">{selected.description}</p>}
                  {/* Unit Head info */}
                  <div className="mt-2 flex items-center gap-2">
                    <Crown className="w-4 h-4 text-amber-500 shrink-0" />
                    {selected.head ? (
                      <div>
                        <span className="text-sm font-medium text-gray-700">
                          {selected.head.firstName} {selected.head.lastName}
                        </span>
                        <span className="text-xs text-gray-400 ml-1">— Unit Head</span>
                        <p className="text-xs text-gray-400">{selected.head.email}</p>
                      </div>
                    ) : (
                      <span className="text-sm text-gray-400 italic">No Unit Head assigned</span>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      className="ml-1 h-7 px-2 text-xs text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                      onClick={() => setSetHeadTarget(selected)}
                    >
                      {selected.head ? "Change" : "Set Unit Head"}
                    </Button>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge variant="secondary" className="gap-1">
                    <Users className="w-3 h-3" /> {selected.users?.length || 0} members
                  </Badge>
                  <Button variant="outline" size="sm" onClick={() => { setEditTarget(selected); setFormOpen(true); }}>
                    <Pencil className="w-4 h-4 mr-2" /> Edit
                  </Button>
                </div>
              </div>

              <Tabs defaultValue="permissions">
                <TabsList>
                  <TabsTrigger value="permissions" className="gap-1.5">
                    <Shield className="w-4 h-4" /> Permissions
                  </TabsTrigger>
                  <TabsTrigger value="members" className="gap-1.5">
                    <Users className="w-4 h-4" /> Members ({selected.users?.length || 0})
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="permissions" className="mt-4">
                  <PermissionsEditor unitId={selected.id} />
                </TabsContent>
                <TabsContent value="members" className="mt-4">
                  <Card>
                    <CardContent className="pt-4">
                      <MembersPanel
                        unit={selected}
                        onMembersChange={members => setSelected(s => s ? { ...s, users: members } : s)}
                      />
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>
          )}
        </div>
      </div>

      <UnitFormDialog
        unit={editTarget}
        open={formOpen}
        onClose={() => { setFormOpen(false); setEditTarget(null); }}
        onSave={handleSaved}
      />

      {setHeadTarget && (
        <SetUnitHeadDialog
          unit={setHeadTarget}
          open={!!setHeadTarget}
          onClose={() => setSetHeadTarget(null)}
          onHeadSet={head => handleHeadSet(setHeadTarget, head)}
        />
      )}
    </div>
  );
}
