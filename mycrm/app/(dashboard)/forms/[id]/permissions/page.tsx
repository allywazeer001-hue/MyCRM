"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { ArrowLeft, Save, Loader2, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api";
import Link from "next/link";

const ROLES = ["SUPER_ADMIN", "ADMIN", "MANAGER", "USER", "VIEWER"];
const FORM_PERMISSIONS = [
  { key: "canView",          label: "View Form" },
  { key: "canSubmit",        label: "Submit" },
  { key: "canEdit",          label: "Edit Form" },
  { key: "canDelete",        label: "Delete Form" },
  { key: "canShare",         label: "Share" },
  { key: "canManageBuilder", label: "Manage Builder" },
];

export default function FormPermissionsPage() {
  const { id } = useParams<{ id: string }>();
  const [form, setForm] = useState<any>(null);
  const [permissions, setPermissions] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      api.get(`/forms/${id}`),
      api.get(`/forms/${id}/permissions`),
    ]).then(([f, p]) => {
      setForm(f.data);
      const map: Record<string, any> = {};
      for (const perm of (p.data || [])) map[perm.role] = perm;
      setPermissions(map);
    }).finally(() => setLoading(false));
  }, [id]);

  const getPermission = (role: string) => permissions[role] || getDefaults(role);

  const getDefaults = (role: string) => {
    if (role === "SUPER_ADMIN" || role === "ADMIN") {
      return { canView: true, canSubmit: true, canEdit: true, canDelete: true, canShare: true, canManageBuilder: true };
    }
    if (role === "MANAGER") {
      return { canView: true, canSubmit: true, canEdit: true, canDelete: false, canShare: true, canManageBuilder: false };
    }
    if (role === "USER") {
      return { canView: true, canSubmit: true, canEdit: false, canDelete: false, canShare: false, canManageBuilder: false };
    }
    return { canView: true, canSubmit: false, canEdit: false, canDelete: false, canShare: false, canManageBuilder: false };
  };

  const toggle = async (role: string, key: string, value: boolean) => {
    const current = getPermission(role);
    const updated = { ...current, [key]: value };
    setPermissions(prev => ({ ...prev, [role]: updated }));
    setSaving(role);
    try {
      await api.post(`/forms/${id}/permissions`, { role, ...updated });
    } finally {
      setSaving(null);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 text-blue-600 animate-spin" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href={`/forms/${id}/builder`}>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Form Permissions</h1>
          <p className="text-sm text-gray-500">{form?.name}</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="text-left px-4 py-3 font-semibold text-gray-600 w-36">Permission</th>
                {ROLES.map(role => (
                  <th key={role} className="text-center px-4 py-3">
                    <Badge variant="outline" className="text-xs">{role}</Badge>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {FORM_PERMISSIONS.map(({ key, label }) => (
                <tr key={key} className="border-b last:border-0 hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-700">{label}</td>
                  {ROLES.map(role => {
                    const perm = getPermission(role);
                    return (
                      <td key={role} className="px-4 py-3 text-center">
                        <div className="flex justify-center">
                          <Switch
                            checked={perm[key] || false}
                            onCheckedChange={v => toggle(role, key, v)}
                            disabled={saving === role}
                          />
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
