"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, Mail, Phone, Building2, Shield, Calendar,
  Clock, FileText, MessageSquare, Activity, CheckCircle2, XCircle,
  Eye, PenLine, Trash2, Download, Upload, Printer, BarChart2,
  Workflow, Layout, FormInput, Settings2
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api";
import { formatDate } from "@/lib/utils";

const ROLE_COLORS: Record<string, string> = {
  SUPER_ADMIN: "bg-red-100 text-red-700 border-red-200",
  ADMIN: "bg-blue-100 text-blue-700 border-blue-200",
  MANAGER: "bg-amber-100 text-amber-700 border-amber-200",
  USER: "bg-gray-100 text-gray-700 border-gray-200",
  VIEWER: "bg-purple-100 text-purple-700 border-purple-200",
};

const ACTION_LABELS: Record<string, { label: string; color: string }> = {
  USER_CREATED: { label: "User Created", color: "text-blue-600" },
  RECORD_CREATED: { label: "Record Created", color: "text-green-600" },
  RECORD_UPDATED: { label: "Record Updated", color: "text-amber-600" },
  RECORD_DELETED: { label: "Record Deleted", color: "text-red-600" },
  MODULE_CREATED: { label: "Module Created", color: "text-purple-600" },
  FIELD_CREATED: { label: "Field Added", color: "text-indigo-600" },
  IMPORT: { label: "Imported Records", color: "text-teal-600" },
  EXPORT: { label: "Exported Records", color: "text-cyan-600" },
};

const MODULE_PERMS = [
  { key: "canView", label: "View", icon: Eye },
  { key: "canCreate", label: "Create", icon: PenLine },
  { key: "canEdit", label: "Edit", icon: Settings2 },
  { key: "canDelete", label: "Delete", icon: Trash2 },
  { key: "canExport", label: "Export", icon: Download },
  { key: "canImport", label: "Import", icon: Upload },
  { key: "canPrint", label: "Print", icon: Printer },
  { key: "canAnalytics", label: "Analytics", icon: BarChart2 },
  { key: "canStudio", label: "Studio", icon: Layout },
  { key: "canWorkflow", label: "Workflow", icon: Workflow },
  { key: "canForms", label: "Forms", icon: FormInput },
] as const;

type ProfileData = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  isActive: boolean;
  jobTitle?: string;
  phone?: string;
  avatar?: string;
  createdAt: string;
  updatedAt?: string;
  lastLoginAt?: string;
  departmentId?: string;
  department?: { id: string; name: string; color: string };
  _count?: { createdRecords: number; comments: number };
  recentActivity?: Array<{
    id: string;
    action: string;
    entityType: string;
    entityId?: string;
    createdAt: string;
    metadata?: any;
  }>;
  departmentPermissions?: Array<{
    id: string;
    moduleId?: string;
    canView: boolean;
    canCreate: boolean;
    canEdit: boolean;
    canDelete: boolean;
    canExport: boolean;
    canImport: boolean;
    canPrint: boolean;
    canAnalytics: boolean;
    canStudio: boolean;
    canWorkflow: boolean;
    canForms: boolean;
    canDashboard: boolean;
    module?: { id: string; name: string; slug: string; icon?: string };
  }>;
};

export default function UserProfilePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    api.get(`/users/${id}/profile`)
      .then(({ data }) => setProfile(data))
      .catch((err) => setError(err?.response?.data?.message || "Failed to load profile"))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3 text-gray-500">
        <XCircle className="w-10 h-10 text-red-400" />
        <p>{error || "User not found"}</p>
        <Button variant="outline" onClick={() => router.back()}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Go Back
        </Button>
      </div>
    );
  }

  const systemPerm = profile.departmentPermissions?.find((p) => !p.moduleId);
  const modulePems = profile.departmentPermissions?.filter((p) => !!p.moduleId) || [];

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Back navigation */}
      <div className="flex items-center gap-3">
        <Link href="/users">
          <Button variant="ghost" size="sm" className="gap-1.5 text-gray-500">
            <ArrowLeft className="w-4 h-4" /> Team Members
          </Button>
        </Link>
      </div>

      {/* Profile header */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
            <Avatar className="w-16 h-16 flex-shrink-0">
              {profile.avatar && <AvatarImage src={profile.avatar} alt={`${profile.firstName[0]}${profile.lastName[0]}`} className="object-cover" />}
              <AvatarFallback className="bg-blue-100 text-blue-700 font-bold text-xl">
                {profile.firstName[0]}{profile.lastName[0]}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-bold text-gray-900">
                  {profile.firstName} {profile.lastName}
                </h1>
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${ROLE_COLORS[profile.role] || "bg-gray-100 text-gray-700 border-gray-200"}`}
                >
                  <Shield className="w-2.5 h-2.5" />
                  {profile.role.replace(/_/g, " ")}
                </span>
                {profile.isActive ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700 border border-green-200">
                    <CheckCircle2 className="w-2.5 h-2.5" /> Active
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500 border border-gray-200">
                    <XCircle className="w-2.5 h-2.5" /> Inactive
                  </span>
                )}
              </div>
              {profile.jobTitle && (
                <p className="text-sm text-gray-500 mt-0.5">{profile.jobTitle}</p>
              )}
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-sm text-gray-500">
                <span className="flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5" /> {profile.email}
                </span>
                {profile.phone && (
                  <span className="flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5" /> {profile.phone}
                  </span>
                )}
                {profile.department && (
                  <span
                    className="flex items-center gap-1.5 font-medium"
                    style={{ color: profile.department.color }}
                  >
                    <Building2 className="w-3.5 h-3.5" /> {profile.department.name}
                  </span>
                )}
              </div>
            </div>
            <div className="flex flex-col items-end gap-1 text-xs text-gray-400 flex-shrink-0">
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3" /> Joined {formatDate(profile.createdAt)}
              </span>
              {profile.lastLoginAt && (
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" /> Last login {formatDate(profile.lastLoginAt)}
                </span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column: stats + activity */}
        <div className="lg:col-span-2 space-y-6">
          {/* Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{profile._count?.createdRecords ?? 0}</p>
                  <p className="text-xs text-gray-500">Records Created</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center">
                  <MessageSquare className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{profile._count?.comments ?? 0}</p>
                  <p className="text-xs text-gray-500">Comments</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent activity */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <Activity className="w-4 h-4" /> Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {!profile.recentActivity?.length ? (
                <p className="text-sm text-gray-400 text-center py-8">No activity yet</p>
              ) : (
                <div className="divide-y divide-gray-50">
                  {profile.recentActivity.map((log) => {
                    const info = ACTION_LABELS[log.action] || { label: log.action.replace(/_/g, " "), color: "text-gray-600" };
                    return (
                      <div key={log.id} className="flex items-start gap-3 px-4 py-3">
                        <div className="w-1.5 h-1.5 rounded-full bg-gray-300 mt-2 flex-shrink-0" />
                        <div className="min-w-0 flex-1">
                          <p className={`text-sm font-medium ${info.color}`}>{info.label}</p>
                          <p className="text-xs text-gray-400">{log.entityType}</p>
                        </div>
                        <p className="text-xs text-gray-400 flex-shrink-0">{formatDate(log.createdAt)}</p>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right column: permissions */}
        <div className="space-y-6">
          {/* Department info */}
          {profile.department ? (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <Building2 className="w-4 h-4" /> Department
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div
                  className="flex items-center gap-2 p-3 rounded-lg border"
                  style={{
                    backgroundColor: `${profile.department.color}12`,
                    borderColor: `${profile.department.color}30`,
                  }}
                >
                  <div
                    className="w-4 h-4 rounded-full flex-shrink-0"
                    style={{ backgroundColor: profile.department.color }}
                  />
                  <span className="font-medium text-sm text-gray-800">{profile.department.name}</span>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-4 text-sm text-gray-400 text-center">
                Not assigned to any department
              </CardContent>
            </Card>
          )}

          {/* System permissions */}
          {systemPerm && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <Shield className="w-4 h-4" /> System Access
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0 space-y-2">
                {[
                  { key: "canDashboard", label: "Dashboard" },
                  { key: "canAnalytics", label: "Analytics" },
                  { key: "canWorkflow", label: "Workflows" },
                  { key: "canForms", label: "Forms" },
                  { key: "canStudio", label: "Module Studio" },
                ].map(({ key, label }) => (
                  <div key={key} className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">{label}</span>
                    {(systemPerm as any)[key] ? (
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                    ) : (
                      <XCircle className="w-4 h-4 text-gray-300" />
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Module permissions */}
          {modulePems.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <Layout className="w-4 h-4" /> Module Access
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0 space-y-4">
                {modulePems.map((perm) => (
                  <div key={perm.id}>
                    <p className="text-xs font-semibold text-gray-700 mb-1.5">
                      {perm.module?.name || "Unknown module"}
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {MODULE_PERMS.map(({ key, label }) =>
                        (perm as any)[key] ? (
                          <span
                            key={key}
                            className="px-1.5 py-0.5 rounded text-xs bg-blue-50 text-blue-700 border border-blue-100"
                          >
                            {label}
                          </span>
                        ) : null
                      )}
                      {MODULE_PERMS.every(({ key }) => !(perm as any)[key]) && (
                        <span className="text-xs text-gray-400">No permissions</span>
                      )}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
