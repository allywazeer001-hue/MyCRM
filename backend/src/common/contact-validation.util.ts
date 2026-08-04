// Loose E.164-ish check — accepts an optional leading "+", 7-15 digits total,
// not starting with 0 after normalization. Good enough to catch obviously
// broken values (letters, too short) before ever calling a provider; the
// provider itself is the real source of truth on deliverability.
const PHONE_RE = /^\+?[1-9]\d{6,14}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizePhone(raw: string): string | null {
  if (!raw) return null;
  const digits = String(raw).replace(/[^\d+]/g, '');
  return digits || null;
}

export function isValidPhone(raw: string | undefined | null): boolean {
  if (!raw) return false;
  const normalized = normalizePhone(String(raw));
  return !!normalized && PHONE_RE.test(normalized);
}

export function isValidEmail(raw: string | undefined | null): boolean {
  if (!raw) return false;
  return EMAIL_RE.test(String(raw).trim());
}
