import { SettingsPageShell } from "@/components/layout/settings-shell";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <SettingsPageShell>{children}</SettingsPageShell>;
}
