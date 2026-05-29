"use client";
import { ReactNode } from "react";
import { usePermissionsStore } from "@/store/permissions.store";
import { useAuthStore } from "@/store/auth.store";
type PermAction = "canView" | "canCreate" | "canEdit" | "canDelete" | "canExport" | "canImport" | "canPrint";

interface PermissionGateProps {
  slug: string;
  action: PermAction;
  children: ReactNode;
  disableOnly?: boolean;
  fallback?: ReactNode;
  tooltip?: string;
}

export function PermissionGate({
  slug,
  action,
  children,
  disableOnly = true,
  fallback,
  tooltip = "Access Restricted",
}: PermissionGateProps) {
  const { user } = useAuthStore();
  const isSuperAdmin = (user as any)?.role === 'SUPER_ADMIN';
  const store = usePermissionsStore();
  const allowed = store[action](slug);

  if (isSuperAdmin || allowed) return <>{children}</>;

  if (!disableOnly) {
    return fallback ? <>{fallback}</> : null;
  }

  return (
    <span
      className="inline-flex opacity-40 cursor-not-allowed select-none"
      aria-disabled="true"
      title={`🔒 ${tooltip}`}
      style={{ pointerEvents: "none" }}
    >
      {children}
    </span>
  );
}

/** Convenience hook for inline permission checks */
export function useModulePermission(slug: string) {
  const { user } = useAuthStore();
  const isSuperAdmin = (user as any)?.role === 'SUPER_ADMIN';
  const store = usePermissionsStore();

  if (isSuperAdmin) {
    return {
      canView:   true,
      canCreate: true,
      canEdit:   true,
      canDelete: true,
      canExport: true,
      canImport: true,
      canPrint:  true,
      isAdmin:   true,
    };
  }

  return {
    canView:   store.canView(slug),
    canCreate: store.canCreate(slug),
    canEdit:   store.canEdit(slug),
    canDelete: store.canDelete(slug),
    canExport: store.canExport(slug),
    canImport: store.canImport(slug),
    canPrint:  store.canPrint(slug),
    isAdmin:   store.isAdmin,
  };
}
