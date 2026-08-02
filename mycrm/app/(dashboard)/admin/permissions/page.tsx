"use client";
import { useEffect, useState } from "react";
import { Shield, Loader2, Save, Check, X, SlidersHorizontal, Eye, EyeOff, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { ModuleIcon } from "@/components/ui/module-icon";

type FieldLevel = "edit" | "readonly" | "hidden";

interface ModuleField {
  id: string;
  name: string;
  label: string;
}

const FIELD_LEVELS: { value: FieldLevel; label: string; icon: any }[] = [
  { value: "edit",     label: "Edit",      icon: Pencil },
  { value: "readonly", label: "Read-only", icon: Eye },
  { value: "hidden",   label: "Hidden",    icon: EyeOff },
];

const ROLES = ["SUPER_ADMIN", "ADMIN", "MANAGER", "USER", "VIEWER"];
const ROLE_COLORS: Record<string, string> = {
  SUPER_ADMIN: "bg-red-100 text-red-700 border-red-200",
  ADMIN: "bg-orange-100 text-orange-700 border-orange-200",
  MANAGER: "bg-blue-100 text-blue-700 border-blue-200",
  USER: "bg-green-100 text-green-700 border-green-200",
  VIEWER: "bg-gray-100 text-gray-700 border-gray-200",
};

const PERMISSION_COLS = [
  { key: "canRead",        label: "View" },
  { key: "canCreate",      label: "Create" },
  { key: "canUpdate",      label: "Edit" },
  { key: "canDelete",      label: "Delete" },
  { key: "canExport",      label: "Export" },
  { key: "canPrint",       label: "Print" },
  { key: "canApprove",     label: "Approve" },
  { key: "canFormBuilder", label: "Form Builder" },
  { key: "canDashboard",   label: "Dashboard" },
  { key: "canAnalytics",   label: "Analytics" },
  { key: "canSettings",    label: "Settings" },
  { key: "canManage",      label: "Manage" },
];

export default function PermissionsPage() {
  const [matrix, setMatrix] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [activeRole, setActiveRole] = useState("ADMIN");
  const [fieldModal, setFieldModal] = useState<{ role: string; moduleId: string; moduleName: string } | null>(null);
  const [fieldsByModule, setFieldsByModule] = useState<Record<string, ModuleField[]>>({});
  const [fieldsLoading, setFieldsLoading] = useState(false);

  useEffect(() => {
    api.get("/permissions/matrix")
      .then(r => setMatrix(r.data))
      .finally(() => setLoading(false));
  }, []);

  const openFieldModal = async (role: string, moduleId: string, moduleName: string) => {
    setFieldModal({ role, moduleId, moduleName });
    if (!fieldsByModule[moduleId]) {
      setFieldsLoading(true);
      try {
        const { data } = await api.get(`/modules/${moduleId}/fields`);
        setFieldsByModule(prev => ({ ...prev, [moduleId]: data }));
      } finally {
        setFieldsLoading(false);
      }
    }
  };

  const setFieldLevel = async (role: string, moduleId: string, fieldId: string, level: FieldLevel) => {
    const current = matrix.matrix[role][moduleId] || {};
    const overrides = { ...(current.fieldOverrides || {}) };
    if (level === "edit") delete overrides[fieldId];
    else overrides[fieldId] = level;

    const updated = { ...current, fieldOverrides: overrides, moduleId };
    setMatrix((prev: any) => ({
      ...prev,
      matrix: { ...prev.matrix, [role]: { ...prev.matrix[role], [moduleId]: updated } },
    }));
    await api.post("/permissions", { role, moduleId, fieldOverrides: overrides });
  };

  const toggle = async (role: string, moduleId: string, key: string, value: boolean) => {
    const current = matrix.matrix[role][moduleId] || {};
    const updated = { ...current, [key]: value, moduleId };
    setMatrix((prev: any) => ({
      ...prev,
      matrix: {
        ...prev.matrix,
        [role]: { ...prev.matrix[role], [moduleId]: updated },
      },
    }));
    const saveKey = `${role}-${moduleId}-${key}`;
    setSaving(saveKey);
    try {
      await api.post("/permissions", { role, moduleId, ...updated });
    } finally {
      setSaving(null);
    }
  };

  const grantAll = async (role: string, moduleId: string) => {
    const allTrue = PERMISSION_COLS.reduce((acc, col) => ({ ...acc, [col.key]: true }), {});
    const updated = { ...allTrue, moduleId };
    setMatrix((prev: any) => ({
      ...prev,
      matrix: { ...prev.matrix, [role]: { ...prev.matrix[role], [moduleId]: updated } },
    }));
    await api.post("/permissions", { role, moduleId, ...allTrue });
  };

  const revokeAll = async (role: string, moduleId: string) => {
    const allFalse = PERMISSION_COLS.reduce((acc, col) => ({ ...acc, [col.key]: false }), {});
    const updated = { ...allFalse, moduleId };
    setMatrix((prev: any) => ({
      ...prev,
      matrix: { ...prev.matrix, [role]: { ...prev.matrix[role], [moduleId]: updated } },
    }));
    await api.post("/permissions", { role, moduleId, ...allFalse });
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 text-blue-600 animate-spin" /></div>;
  }

  if (!matrix) return null;

  const { modules, roles } = matrix;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Access Control</h1>
        <p className="text-sm text-gray-500 mt-1">
          Configure what each role can do in every module
        </p>
      </div>

      <Tabs value={activeRole} onValueChange={setActiveRole}>
        <TabsList>
          {ROLES.map(role => (
            <TabsTrigger key={role} value={role}>
              <span className={cn("text-xs font-semibold px-2 py-0.5 rounded-full border", ROLE_COLORS[role])}>
                {role.replace("_", " ")}
              </span>
            </TabsTrigger>
          ))}
        </TabsList>

        {ROLES.map(role => (
          <TabsContent key={role} value={role} className="mt-4">
            <div className="bg-white rounded-xl border overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[900px]">
                  <thead>
                    <tr className="border-b bg-gray-50">
                      <th className="text-left px-4 py-3 font-semibold text-gray-600 w-40 sticky left-0 bg-gray-50">
                        Module
                      </th>
                      {PERMISSION_COLS.map(col => (
                        <th key={col.key} className="text-center px-2 py-3 text-xs font-medium text-gray-600 whitespace-nowrap">
                          {col.label}
                        </th>
                      ))}
                      <th className="px-4 py-3 text-xs font-medium text-gray-600 whitespace-nowrap">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {modules.map((mod: any) => {
                      const perm = matrix.matrix[role]?.[mod.id] || {};
                      return (
                        <tr key={mod.id} className="border-b last:border-0 hover:bg-gray-50">
                          <td className="px-4 py-3 font-medium text-gray-700 sticky left-0 bg-white">
                            <div className="flex items-center gap-2">
                              <ModuleIcon icon={mod.icon} slug={mod.slug} className="w-4 h-4" />
                              <span className="truncate max-w-[100px]">{mod.name}</span>
                            </div>
                          </td>
                          {PERMISSION_COLS.map(col => {
                            const saveKey = `${role}-${mod.id}-${col.key}`;
                            return (
                              <td key={col.key} className="px-2 py-3 text-center">
                                <div className="flex justify-center">
                                  <Switch
                                    checked={perm[col.key] || false}
                                    onCheckedChange={v => toggle(role, mod.id, col.key, v)}
                                    disabled={saving === saveKey}
                                    className="scale-75"
                                  />
                                </div>
                              </td>
                            );
                          })}
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => grantAll(role, mod.id)}
                                className="text-xs px-2 py-1 bg-green-50 text-green-700 rounded hover:bg-green-100"
                              >
                                All
                              </button>
                              <button
                                onClick={() => revokeAll(role, mod.id)}
                                className="text-xs px-2 py-1 bg-red-50 text-red-700 rounded hover:bg-red-100"
                              >
                                None
                              </button>
                              <button
                                onClick={() => openFieldModal(role, mod.id, mod.name)}
                                title="Field-level access"
                                className={cn(
                                  "flex items-center gap-1 text-xs px-2 py-1 rounded",
                                  Object.keys(perm.fieldOverrides || {}).length > 0
                                    ? "bg-indigo-50 text-indigo-700 hover:bg-indigo-100"
                                    : "bg-gray-50 text-gray-500 hover:bg-gray-100"
                                )}
                              >
                                <SlidersHorizontal className="w-3 h-3" />
                                Fields
                                {Object.keys(perm.fieldOverrides || {}).length > 0 && (
                                  <span className="ml-0.5">({Object.keys(perm.fieldOverrides).length})</span>
                                )}
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {modules.length === 0 && (
                      <tr>
                        <td colSpan={PERMISSION_COLS.length + 2} className="text-center py-8 text-gray-400 text-sm">
                          No modules found. Create modules first.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </TabsContent>
        ))}
      </Tabs>

      <Dialog open={!!fieldModal} onOpenChange={(open) => { if (!open) setFieldModal(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Field access — {fieldModal?.moduleName}</DialogTitle>
            <DialogDescription>
              Optional, on top of the module-level toggles above. Fields left on
              "Edit" follow the module's normal View/Edit permissions for{" "}
              <span className={cn("text-xs font-semibold px-1.5 py-0.5 rounded-full border", fieldModal && ROLE_COLORS[fieldModal.role])}>
                {fieldModal?.role.replace("_", " ")}
              </span>.
            </DialogDescription>
          </DialogHeader>

          {fieldsLoading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
            </div>
          ) : (
            <ScrollArea className="max-h-96">
              <div className="divide-y divide-gray-100">
                {(fieldModal ? fieldsByModule[fieldModal.moduleId] : [])?.map(field => {
                  const perm = fieldModal ? matrix.matrix[fieldModal.role]?.[fieldModal.moduleId] : null;
                  const overrides = perm?.fieldOverrides || {};
                  const level: FieldLevel = overrides[field.id] || "edit";
                  return (
                    <div key={field.id} className="flex items-center justify-between gap-3 py-2.5">
                      <span className="text-sm text-gray-700 truncate">{field.label || field.name}</span>
                      <div className="flex items-center bg-gray-100 rounded-lg p-0.5 gap-0.5 shrink-0">
                        {FIELD_LEVELS.map(l => (
                          <button
                            key={l.value}
                            onClick={() => fieldModal && setFieldLevel(fieldModal.role, fieldModal.moduleId, field.id, l.value)}
                            title={l.label}
                            className={cn(
                              "flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium transition-all",
                              level === l.value ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700"
                            )}
                          >
                            <l.icon className="w-3 h-3" />
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
                {fieldModal && (fieldsByModule[fieldModal.moduleId]?.length ?? 0) === 0 && (
                  <p className="text-center text-sm text-gray-400 py-8">No fields in this module.</p>
                )}
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
