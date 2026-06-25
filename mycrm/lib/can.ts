/**
 * Lightweight permission helper — can(user, action, resource)
 *
 * CHANGE_003: Added usertype-based access control layer.
 * Rollback: delete this file and remove can() usages from consumers.
 *
 * Rules:
 *   super_admin → unrestricted access to everything
 *   user        → restricted; expand PERMISSIONS.user as needed
 */

export type UserLike = {
  usertype?: string;
  role?: string;
} | null | undefined;

// Foundation permissions map — expand per resource as requirements grow
const PERMISSIONS: Record<string, any> = {
  super_admin: "*",
  user: {
    view:   ["dashboard", "records", "kanban", "modules", "notifications"],
    create: ["records"],
    edit:   ["records"],
    delete: [],
  },
};

/**
 * Derive effective usertype from a user object.
 * Falls back to role-based derivation so existing accounts work
 * even before the usertype field is explicitly set.
 */
function effectiveUsertype(user: UserLike): string {
  if (!user) return "user";
  if (user.usertype) return user.usertype;
  // Fallback: derive from existing role field
  const role = (user.role ?? "").toUpperCase();
  if (role === "SUPER_ADMIN" || role === "ADMIN") return "super_admin";
  return "user";
}

/**
 * Check whether a user can perform `action` on `resource`.
 *
 * @param user     - user object from auth store (must have usertype or role)
 * @param action   - "view" | "create" | "edit" | "delete" | "manage"
 * @param resource - e.g. "kanban", "settings", "users", "admin", "studio"
 */
export function can(user: UserLike, action: string, resource: string): boolean {
  const usertype = effectiveUsertype(user);

  const perms = PERMISSIONS[usertype];
  if (!perms) return false;

  // super_admin wildcard
  if (perms === "*") return true;

  const allowed: string[] = perms[action] ?? [];
  return allowed.includes("*") || allowed.includes(resource);
}

/**
 * Returns true if the user is a super_admin (full platform access).
 */
export function isSuperAdmin(user: UserLike): boolean {
  return effectiveUsertype(user) === "super_admin";
}
