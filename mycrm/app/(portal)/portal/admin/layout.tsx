"use client";
import { PortalAdminShell } from "@/components/portal/portal-admin-shell";

export default function PortalAdminLayout({ children }: { children: React.ReactNode }) {
  return <PortalAdminShell>{children}</PortalAdminShell>;
}
