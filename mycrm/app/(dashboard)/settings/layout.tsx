"use client";
import { usePathname } from "next/navigation";
import { SettingsSideNav } from "@/components/layout/settings-shell";

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isFullWidth = pathname === "/settings/automation" || pathname === "/settings/email"
    || pathname.startsWith("/settings/field-rules") || pathname === "/settings/blueprints";

  return (
    <div className="flex gap-6 -m-6 min-h-full items-start shrink-0">
      <SettingsSideNav />

      {/* automation/email/field-rules get full width + height instead of the
          centered max-w-6xl column every other settings page uses. */}
      {isFullWidth ? (
        <div className="flex-1 overflow-auto">
          {children}
        </div>
      ) : (
        <div className="flex-1 py-6">
          <div className="max-w-6xl mx-auto space-y-6">
            {children}
          </div>
        </div>
      )}
    </div>
  );
}
