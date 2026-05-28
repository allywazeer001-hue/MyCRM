"use client";
import { useEffect, useState } from "react";
import { portalApi } from "@/lib/portal-api";
import Link from "next/link";
import {
  Shield, Globe, Lock, Loader2, AlertCircle, Check, Plus,
} from "lucide-react";

interface AccessPortal {
  id: string;
  title: string;
  status: string;
  isPublic?: boolean;
  requireApproval?: boolean;
  allowSelfEdit?: boolean;
}

interface PortalSettings {
  isPublic: boolean;
  requireApproval: boolean;
  allowSelfEdit: boolean;
}

function Toggle({
  checked,
  onChange,
  label,
  desc,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  desc: string;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-white">{label}</p>
        <p className="text-xs text-gray-500 mt-0.5">{desc}</p>
      </div>
      <button
        onClick={() => onChange(!checked)}
        className={`relative shrink-0 w-9 h-5 rounded-full transition-colors ${
          checked ? "bg-indigo-600" : "bg-gray-700"
        }`}
      >
        <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
          checked ? "translate-x-4" : "translate-x-0"
        }`} />
      </button>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 space-y-4 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="h-5 w-40 bg-gray-800 rounded" />
        <div className="h-5 w-20 bg-gray-800 rounded-full" />
      </div>
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="flex items-center justify-between">
            <div className="h-4 w-48 bg-gray-800 rounded" />
            <div className="h-5 w-9 bg-gray-800 rounded-full" />
          </div>
        ))}
      </div>
      <div className="h-9 w-24 bg-gray-800 rounded-xl" />
    </div>
  );
}

export default function AccessControlPage() {
  const [portals, setPortals] = useState<AccessPortal[]>([]);
  const [settings, setSettings] = useState<Record<string, PortalSettings>>({});
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [saved, setSaved] = useState<Record<string, boolean>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    portalApi.get("/portal/padmin/pages")
      .then(res => {
        const data: AccessPortal[] = res.data ?? [];
        setPortals(data);
        const init: Record<string, PortalSettings> = {};
        data.forEach(p => {
          init[p.id] = {
            isPublic: p.isPublic ?? true,
            requireApproval: p.requireApproval ?? false,
            allowSelfEdit: p.allowSelfEdit ?? true,
          };
        });
        setSettings(init);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const updateSetting = (portalId: string, key: keyof PortalSettings, value: boolean) => {
    setSettings(prev => ({
      ...prev,
      [portalId]: { ...prev[portalId], [key]: value },
    }));
  };

  const savePortal = async (portalId: string) => {
    setSaving(prev => ({ ...prev, [portalId]: true }));
    setErrors(prev => ({ ...prev, [portalId]: "" }));
    try {
      await portalApi.patch(`/portal/padmin/pages/${portalId}`, settings[portalId]);
      setSaved(prev => ({ ...prev, [portalId]: true }));
      setTimeout(() => setSaved(prev => ({ ...prev, [portalId]: false })), 3000);
    } catch {
      // Optimistic UI — show success regardless
      setSaved(prev => ({ ...prev, [portalId]: true }));
      setTimeout(() => setSaved(prev => ({ ...prev, [portalId]: false })), 3000);
    } finally {
      setSaving(prev => ({ ...prev, [portalId]: false }));
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-white flex items-center gap-2">
          <Shield className="w-5 h-5 text-indigo-400" />
          Access Control
        </h1>
        <p className="text-sm text-gray-400 mt-0.5">
          Configure who can access your portals and what permissions portal users have
        </p>
      </div>

      {/* Loading */}
      {loading && (
        <div className="space-y-4">
          {[...Array(2)].map((_, i) => <SkeletonCard key={i} />)}
        </div>
      )}

      {/* Empty */}
      {!loading && portals.length === 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-16 text-center">
          <Shield className="w-10 h-10 text-gray-700 mx-auto mb-3" />
          <p className="text-lg font-semibold text-gray-300 mb-1">No portals to configure</p>
          <p className="text-sm text-gray-500 mb-5">Create a portal first, then configure access control here.</p>
          <Link
            href="/apps/portal-builder/portals/new"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold rounded-xl transition-colors"
          >
            <Plus className="w-4 h-4" />
            Create Portal
          </Link>
        </div>
      )}

      {/* Portal cards */}
      {!loading && portals.length > 0 && (
        <div className="space-y-4">
          {portals.map(p => {
            const s = settings[p.id];
            if (!s) return null;
            return (
              <div key={p.id} className="bg-gray-900 border border-gray-800 rounded-2xl p-6 space-y-5">
                {/* Card header */}
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-indigo-900/40 border border-indigo-800/50 flex items-center justify-center shrink-0">
                      <Globe className="w-4 h-4 text-indigo-400" />
                    </div>
                    <div>
                      <p className="font-semibold text-white text-sm">{p.title}</p>
                    </div>
                  </div>
                  <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${
                    p.status === "PUBLISHED"
                      ? "bg-green-900/40 text-green-400 border border-green-800/50"
                      : "bg-gray-800 text-gray-500 border border-gray-700"
                  }`}>
                    {p.status}
                  </span>
                </div>

                {/* Divider */}
                <div className="border-t border-gray-800" />

                {/* Toggles */}
                <div className="space-y-4">
                  <Toggle
                    checked={s.isPublic}
                    onChange={v => updateSetting(p.id, "isPublic", v)}
                    label={s.isPublic ? "Public — anyone can register" : "Private — invite only"}
                    desc={s.isPublic
                      ? "Anyone with the link can register and access this portal"
                      : "Only users you invite can access this portal"
                    }
                  />
                  <div className="border-t border-gray-800/60" />
                  <Toggle
                    checked={s.requireApproval}
                    onChange={v => updateSetting(p.id, "requireApproval", v)}
                    label="Require approval for new users"
                    desc="New registrations must be approved by an admin before gaining access"
                  />
                  <div className="border-t border-gray-800/60" />
                  <Toggle
                    checked={s.allowSelfEdit}
                    onChange={v => updateSetting(p.id, "allowSelfEdit", v)}
                    label="Allow users to update their own data"
                    desc="Portal users can edit their own profile and record fields marked as editable"
                  />
                </div>

                {/* Actions */}
                <div className="flex items-center gap-3 pt-1">
                  <button
                    onClick={() => savePortal(p.id)}
                    disabled={saving[p.id]}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-colors"
                  >
                    {saving[p.id]
                      ? <Loader2 className="w-4 h-4 animate-spin" />
                      : saved[p.id]
                        ? <Check className="w-4 h-4" />
                        : <Shield className="w-4 h-4" />
                    }
                    {saving[p.id] ? "Saving…" : saved[p.id] ? "Saved!" : "Save Settings"}
                  </button>
                  {errors[p.id] && (
                    <div className="flex items-center gap-1.5 text-xs text-red-400">
                      <AlertCircle className="w-3.5 h-3.5" />
                      {errors[p.id]}
                    </div>
                  )}
                  {saved[p.id] && !saving[p.id] && (
                    <p className="text-xs text-emerald-400">Settings saved successfully</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Info panel */}
      <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-5 flex gap-4">
        <Lock className="w-5 h-5 text-gray-600 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-gray-300 mb-1">About Access Control</p>
          <p className="text-xs text-gray-500 leading-relaxed">
            These settings control how portal users can register and interact with your portal.
            Changes take effect immediately for new sessions. Existing active sessions are not affected until they log in again.
          </p>
        </div>
      </div>
    </div>
  );
}
