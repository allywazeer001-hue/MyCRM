export interface NamedUser {
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  name?: string | null;
}

export function getDisplayName(user: NamedUser | null | undefined): string {
  if (!user) return "Unknown";
  const full = [user.firstName, user.lastName].filter(Boolean).join(" ");
  return full || user.name || user.email || "Unknown";
}

export function getInitials(user: NamedUser | null | undefined): string {
  if (!user) return "?";
  if (user.firstName) {
    return (user.firstName[0] + (user.lastName?.[0] ?? "")).toUpperCase();
  }
  if (user.email) return user.email[0].toUpperCase();
  return "?";
}
