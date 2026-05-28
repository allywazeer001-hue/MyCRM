"use client";
import { useEffect, useState } from "react";
import { Shield, Loader2, Save, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

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

  useEffect(() => {
    api.get("/permissions/matrix")
      .then(r => setMatrix(r.data))
      .finally(() => setLoading(false));
  }, []);

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
                              <span className="text-base">{mod.icon || "📦"}</span>
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
    </div>
  );
}
