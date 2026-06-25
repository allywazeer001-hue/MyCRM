/**
 * auth-guard.ts — Client-side token validation utilities.
 *
 * The auth guard does NOT trust the Zustand isAuthenticated flag.
 * It reads the actual JWT from localStorage and checks its expiry.
 * This prevents stale sessions from bypassing route protection.
 */

const TOKEN_KEYS = [
  "access_token",
  "refresh_token",
  "crm-auth",
  "portal-access-token",
  "portal-refresh-token",
] as const;

/** Remove all auth-related keys from localStorage. */
export function clearAuthStorage(): void {
  if (typeof window === "undefined") return;
  TOKEN_KEYS.forEach((key) => localStorage.removeItem(key));
}

/**
 * Decode a JWT payload without verifying the signature.
 * Used only for client-side expiry checks — the server always re-validates.
 */
function decodeJwtPayload(token: string): { exp?: number; sub?: string } | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const payload = JSON.parse(atob(parts[1].replace(/-/g, "+").replace(/_/g, "/")));
    return payload;
  } catch {
    return null;
  }
}

/**
 * Returns true if there is a non-expired access token in localStorage.
 * Also cleans up stale auth state when the token is missing or expired.
 */
export function isAuthenticatedSession(): boolean {
  if (typeof window === "undefined") return false;

  const token = localStorage.getItem("access_token");
  if (!token) {
    // No token — ensure Zustand flag is also cleared
    clearAuthStorage();
    return false;
  }

  const payload = decodeJwtPayload(token);
  if (!payload) {
    clearAuthStorage();
    return false;
  }

  if (payload.exp && payload.exp * 1000 < Date.now()) {
    // Token expired — clean up everything
    clearAuthStorage();
    return false;
  }

  return true;
}

/** Returns the decoded payload of the current access token, or null. */
export function getTokenPayload(): { sub?: string; email?: string; role?: string; orgId?: string; exp?: number } | null {
  if (typeof window === "undefined") return null;
  const token = localStorage.getItem("access_token");
  if (!token) return null;
  return decodeJwtPayload(token);
}
