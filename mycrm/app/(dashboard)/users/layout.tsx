import { SettingsPageShell } from "@/components/layout/settings-shell";

export default function UsersLayout({ children }: { children: React.ReactNode }) {
  return <SettingsPageShell>{children}</SettingsPageShell>;
}
