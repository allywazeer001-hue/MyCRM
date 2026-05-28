"use client";
import { useEffect, useState, useCallback } from "react";
import {
  Building2, Plus, Trash2, Pencil, Users, Shield, ChevronRight,
  Loader2, Check, X, Settings, AlertCircle, MoreHorizontal
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

interface Department {
  id: string;
  name: string;
  slug: string;
  description?: string;
  color: string;
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

const DEPT_COLORS = [
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

// ── Department Form Dialog ─────────────────────────────────────────────────

function DeptFormDialog({
  dept, open, onClose, onSave,
}: {
  dept?: Department | null;
  open: boolean;
  onClose: () => void;
  onSave: (d: Department) => void;
}) {
  const [name, setName] = useState(dept?.name || "");
  const [description, setDescription] = useState(dept?.description || "");
  const [color, setColor] = useState(dept?.color || DEPT_COLORS[0]);
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  useEffect(() => {
    setName(dept?.name || "");
    setDescription(dept?.description || "");
    setColor(dept?.color || DEPT_COLORS[0]);
  }, [dept]);

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      const payload = { name, description, color };
      const { data } = dept
        ? await api.patch(`/departments/${dept.id}`, payload)
        : await api.post("/departments", payload);
      toast.success(dept ? "Department updated" : "Department created");
      onSave(data);
      onClose();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to save department");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{dept ? "Edit Department" : "Create Department"}</DialogTitle>
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
              {DEPT_COLORS.map(c => (
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
            {dept ? "Save Changes" : "Create Department"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Permission Row ─────────────────────────────────────────────────────────

function PermissionRow({
  label, permission, isSystem = false, onChange,
}: {
  label: string;
  permission: Permission;
  isSystem?: boolean;
  onChange: (key: keyof Permission, val: boolean) => void;
}) {
  const keys = isSystem ? SYSTEM_PERM_KEYS : MODULE_PERM_KEYS;

  return (
    <div className="flex items-center py-3 border-b border-gray-50 last:border-0">
      <div className="w-36 shrink-0">
        <p className="text-sm font-medium text-gray-800">{label}</p>
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1">
        {keys.map(({ key, label: kLabel }) => (
          <label key={key} className="flex items-center gap-1.5 cursor-pointer group">
            <Checkbox
              checked={!!(permission as any)[key]}
              onCheckedChange={v => onChange(key, !!v)}
              className="data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
            />
            <span className="text-xs text-gray-600 group-hover:text-gray-900">{kLabel}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

// ── Permissions Editor ─────────────────────────────────────────────────────

function PermissionsEditor({ deptId }: { deptId: string }) {
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
      const { data: d } = await api.get(`/departments/${deptId}/permissions`);
      setData(d);
    } catch {
      toast.error("Failed to load permissions");
    } finally {
      setLoading(false);
    }
  }, [deptId]);

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
      await api.post(`/departments/${deptId}/permissions`, { permissions });
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
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <Settings className="w-4 h-4 text-blue-500" /> Module Access
            </CardTitle>
            <div className="flex gap-3 text-xs text-gray-400">
              {MODULE_PERM_KEYS.map(k => (
                <span key={k.key} className="w-12 text-center">{k.label}</span>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {data.modulePermissions.length === 0 ? (
            <p className="text-sm text-gray-400 py-4 text-center">No modules found. Create modules in Studio first.</p>
          ) : (
            <div>
              {data.modulePermissions.map(({ module, permission }) => (
                <div key={module.id} className="flex items-center py-3 border-b border-gray-50 last:border-0">
                  <div className="flex items-center gap-2 w-48 shrink-0">
                    <span className="text-base">{module.icon || "📦"}</span>
                    <span className="text-sm font-medium text-gray-800 truncate">{module.name}</span>
                  </div>
                  <div className="flex gap-3">
                    {MODULE_PERM_KEYS.map(({ key }) => (
                      <div key={key} className="w-12 flex justify-center">
                        <Checkbox
                          checked={!!(permission as any)[key]}
                          onCheckedChange={v => updateModPerm(module.id, key, !!v)}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
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

// ── Members Panel ──────────────────────────────────────────────────────────

function MembersPanel({ dept }: { dept: Department }) {
  const members = dept.users || [];
  return (
    <div className="space-y-3">
      {members.length === 0 ? (
        <div className="text-center py-8 text-gray-400">
          <Users className="w-10 h-10 mx-auto mb-2 opacity-40" />
          <p className="text-sm">No members in this department yet.</p>
          <p className="text-xs mt-1">Assign users to this department from the Users page.</p>
        </div>
      ) : (
        <div className="divide-y divide-gray-50">
          {members.map((u: any) => (
            <div key={u.id} className="flex items-center gap-3 py-3">
              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 text-xs font-bold shrink-0">
                {u.firstName?.[0]}{u.lastName?.[0]}
              </div>
              <div>
                <p className="text-sm font-medium text-gray-800">{u.firstName} {u.lastName}</p>
                <p className="text-xs text-gray-500">{u.email}</p>
              </div>
              <Badge variant="secondary" className="ml-auto text-xs">{u.role?.replace(/_/g, " ")}</Badge>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────

export default function DepartmentsPage() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Department | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Department | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const toast = useToast();

  const loadList = useCallback(async () => {
    try {
      const { data } = await api.get("/departments");
      setDepartments(data);
      if (data.length > 0 && !selected) loadDetail(data[0]);
    } catch {
      toast.error("Failed to load departments");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadDetail = async (dept: Department) => {
    setDetailLoading(true);
    try {
      const { data } = await api.get(`/departments/${dept.id}`);
      setSelected(data);
    } catch {
      setSelected(dept);
    } finally {
      setDetailLoading(false);
    }
  };

  useEffect(() => { loadList(); }, [loadList]);

  const handleDelete = async (dept: Department) => {
    if (!confirm(`Delete "${dept.name}"? Users will be unassigned.`)) return;
    try {
      await api.delete(`/departments/${dept.id}`);
      toast.success("Department deleted");
      setDepartments(prev => prev.filter(d => d.id !== dept.id));
      if (selected?.id === dept.id) setSelected(null);
    } catch {
      toast.error("Failed to delete department");
    }
  };

  const handleSaved = (saved: Department) => {
    setDepartments(prev => {
      const idx = prev.findIndex(d => d.id === saved.id);
      if (idx >= 0) { const n = [...prev]; n[idx] = { ...prev[idx], ...saved }; return n; }
      return [...prev, saved];
    });
    loadDetail(saved);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Departments</h1>
          <p className="text-gray-500 text-sm mt-1">Manage departments and their access permissions</p>
        </div>
        <Button className="gap-2" onClick={() => { setEditTarget(null); setFormOpen(true); }}>
          <Plus className="w-4 h-4" /> New Department
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sidebar — department list */}
        <div className="space-y-2">
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-blue-600" /></div>
          ) : departments.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center">
                <Building2 className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                <p className="text-sm text-gray-500">No departments yet.</p>
                <Button size="sm" className="mt-4" onClick={() => setFormOpen(true)}>Create First Department</Button>
              </CardContent>
            </Card>
          ) : (
            departments.map(dept => (
              <button
                key={dept.id}
                onClick={() => loadDetail(dept)}
                className={cn(
                  "w-full text-left p-3 rounded-xl border transition-all group",
                  selected?.id === dept.id
                    ? "border-blue-300 bg-blue-50 shadow-sm"
                    : "border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm"
                )}
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center text-white text-sm font-bold shrink-0"
                    style={{ backgroundColor: dept.color || "#3b82f6" }}>
                    {dept.name[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800 truncate">{dept.name}</p>
                    <p className="text-xs text-gray-500">{dept._count?.users || 0} members</p>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={e => e.stopPropagation()}>
                      <div className="p-1 rounded hover:bg-gray-200 opacity-0 group-hover:opacity-100">
                        <MoreHorizontal className="w-4 h-4 text-gray-500" />
                      </div>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={e => { e.stopPropagation(); setEditTarget(dept); setFormOpen(true); }}>
                        <Pencil className="w-4 h-4 mr-2" /> Edit
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="text-red-600 focus:text-red-600 focus:bg-red-50"
                        onClick={e => { e.stopPropagation(); handleDelete(dept); }}>
                        <Trash2 className="w-4 h-4 mr-2" /> Delete
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
                <p>Select a department to view details</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {/* Department header */}
              <div className="flex items-center gap-3 p-4 rounded-xl border border-gray-200 bg-white">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold"
                  style={{ backgroundColor: selected.color || "#3b82f6" }}>
                  {selected.name[0]}
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900">{selected.name}</h2>
                  {selected.description && <p className="text-sm text-gray-500">{selected.description}</p>}
                </div>
                <div className="ml-auto flex items-center gap-3">
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
                  <PermissionsEditor deptId={selected.id} />
                </TabsContent>
                <TabsContent value="members" className="mt-4">
                  <Card>
                    <CardContent className="pt-4">
                      <MembersPanel dept={selected} />
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>
          )}
        </div>
      </div>

      <DeptFormDialog
        dept={editTarget}
        open={formOpen}
        onClose={() => { setFormOpen(false); setEditTarget(null); }}
        onSave={handleSaved}
      />
    </div>
  );
}
