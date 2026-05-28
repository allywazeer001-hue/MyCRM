"use client";
import { useEffect, useState, FormEvent } from "react";
import { PortalShell } from "@/components/portal/portal-shell";
import { usePortalAuthStore } from "@/store/portal-auth.store";
import { portalApi } from "@/lib/portal-api";
import { PortalFieldRenderer, PortalFieldDef } from "@/components/portal/portal-field-renderer";
import { Loader2, Camera, CheckCircle, Save, Edit2, X } from "lucide-react";

interface PortalFieldWithValue extends PortalFieldDef { value: any }
interface PortalSection { id: string; label: string; type: string; icon?: string; isCollapsible: boolean; fields: PortalFieldWithValue[] }

export default function PortalProfilePage() {
  const { user, setUser } = usePortalAuthStore();
  const [form, setForm] = useState({
    firstName: "", lastName: "", phone: "",
    currentPassword: "", newPassword: "", confirmPassword: "",
  });
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  // Portal custom fields
  const [portalSections, setPortalSections] = useState<PortalSection[]>([]);
  const [orphanFields, setOrphanFields] = useState<PortalFieldWithValue[]>([]);
  const [editingCustom, setEditingCustom] = useState(false);
  const [customValues, setCustomValues] = useState<Record<string, any>>({});
  const [savingCustom, setSavingCustom] = useState(false);

  useEffect(() => {
    if (user) {
      setForm((f) => ({
        ...f,
        firstName: user.firstName || "",
        lastName: user.lastName || "",
        phone: user.phone || "",
      }));
    }
  }, [user]);

  useEffect(() => {
    portalApi.get("/portal/fields").then(r => {
      const data = r.data;
      const sections: PortalSection[] = data.sections ?? [];
      const orphans: PortalFieldWithValue[] = data.orphanFields ?? [];
      setPortalSections(sections);
      setOrphanFields(orphans);
      const allFields = [...sections.flatMap((s: PortalSection) => s.fields), ...orphans];
      setCustomValues(Object.fromEntries(allFields.map((f: PortalFieldWithValue) => [f.fieldKey, f.value])));
    }).catch(() => {});
  }, []);

  const set = (field: string, value: string) => setForm((f) => ({ ...f, [field]: value }));

  const saveCustomFields = async () => {
    setSavingCustom(true);
    try {
      const updates = Object.entries(customValues).map(([fieldKey, value]) => ({ fieldKey, value }));
      await portalApi.patch("/portal/fields", { updates });
      setEditingCustom(false);
    } catch {}
    setSavingCustom(false);
  };

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    setError(""); setSuccess("");
    if (form.newPassword && form.newPassword !== form.confirmPassword) {
      setError("New passwords do not match"); return;
    }
    setSaving(true);
    try {
      const dto: any = {
        firstName: form.firstName,
        lastName: form.lastName,
        phone: form.phone,
      };
      if (form.newPassword) {
        dto.currentPassword = form.currentPassword;
        dto.newPassword = form.newPassword;
      }
      const { data } = await portalApi.patch("/portal/me", dto);
      setUser(data);
      setSuccess("Profile updated successfully");
      setForm((f) => ({ ...f, currentPassword: "", newPassword: "", confirmPassword: "" }));
    } catch (err: any) {
      setError(err?.response?.data?.message || "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  return (
    <PortalShell>
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">My Profile</h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage your personal information and password</p>
        </div>

        {/* Avatar */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center gap-5">
            <div className="relative">
              <div className="w-20 h-20 rounded-full bg-indigo-600 flex items-center justify-center text-2xl font-bold text-white">
                {user?.firstName?.[0]}{user?.lastName?.[0]}
              </div>
              <button className="absolute bottom-0 right-0 w-6 h-6 rounded-full bg-white border border-gray-200 shadow-sm flex items-center justify-center hover:bg-gray-50">
                <Camera className="w-3 h-3 text-gray-500" />
              </button>
            </div>
            <div>
              <p className="font-semibold text-gray-900">{user?.firstName} {user?.lastName}</p>
              <p className="text-sm text-gray-500">{user?.email}</p>
              <span className="inline-block mt-1 text-xs px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-full capitalize font-medium">
                {user?.type}
              </span>
            </div>
          </div>
        </div>

        {/* Profile form */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <h2 className="text-sm font-semibold text-gray-800 mb-4">Personal Information</h2>

          {success && (
            <div className="flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 text-sm px-4 py-3 rounded-lg mb-4">
              <CheckCircle className="w-4 h-4" /> {success}
            </div>
          )}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg mb-4">
              {error}
            </div>
          )}

          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-700">First name</label>
                <input
                  type="text"
                  value={form.firstName}
                  onChange={(e) => set("firstName", e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-700">Last name</label>
                <input
                  type="text"
                  value={form.lastName}
                  onChange={(e) => set("lastName", e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700">Email</label>
              <input
                type="email"
                value={user?.email || ""}
                disabled
                className="w-full px-3 py-2 border border-gray-100 rounded-lg text-sm bg-gray-50 text-gray-400 cursor-not-allowed"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700">Phone number</label>
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => set("phone", e.target.value)}
                placeholder="Optional"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="border-t border-gray-100 pt-4 mt-2">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Change Password</h3>
              <div className="space-y-3">
                <input
                  type="password"
                  value={form.currentPassword}
                  onChange={(e) => set("currentPassword", e.target.value)}
                  placeholder="Current password"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <input
                  type="password"
                  value={form.newPassword}
                  onChange={(e) => set("newPassword", e.target.value)}
                  placeholder="New password (min. 8 characters)"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <input
                  type="password"
                  value={form.confirmPassword}
                  onChange={(e) => set("confirmPassword", e.target.value)}
                  placeholder="Confirm new password"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-2 px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-medium rounded-lg text-sm transition-colors"
              >
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                Save Changes
              </button>
            </div>
          </form>
        </div>

        {/* Portal custom fields */}
        {(portalSections.length > 0 || orphanFields.length > 0) && (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-3.5 border-b border-gray-50 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-800">Custom Fields</h2>
              {!editingCustom ? (
                <button onClick={() => setEditingCustom(true)} className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 px-2 py-1 rounded hover:bg-indigo-50">
                  <Edit2 className="w-3 h-3" />Edit
                </button>
              ) : (
                <div className="flex items-center gap-1">
                  <button onClick={() => setEditingCustom(false)} className="p-1.5 text-gray-400 hover:text-gray-600 rounded hover:bg-gray-100"><X className="w-3.5 h-3.5" /></button>
                  <button onClick={saveCustomFields} disabled={savingCustom} className="flex items-center gap-1 px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-medium hover:bg-indigo-700 disabled:opacity-50">
                    {savingCustom ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}Save
                  </button>
                </div>
              )}
            </div>
            <div className="divide-y divide-gray-50">
              {[...portalSections.flatMap(s => s.fields), ...orphanFields].map(field => (
                <div key={field.id} className="px-5 py-3.5 flex items-start gap-4">
                  <div className="w-44 shrink-0">
                    <p className="text-sm font-medium text-gray-600">{field.label}</p>
                    {field.isReadOnly && <span className="text-xs text-amber-500">read-only</span>}
                  </div>
                  <div className="flex-1">
                    {field.helpText && <p className="text-xs text-gray-400 mb-1">{field.helpText}</p>}
                    <PortalFieldRenderer
                      field={field}
                      value={editingCustom ? customValues[field.fieldKey] : field.value}
                      onChange={v => setCustomValues(prev => ({ ...prev, [field.fieldKey]: v }))}
                      readOnly={!editingCustom}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </PortalShell>
  );
}
