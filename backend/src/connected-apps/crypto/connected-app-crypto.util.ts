import * as crypto from 'crypto';

// AES-256-GCM helper for the one secret this feature must read back in
// plaintext: the webhook signing secret (Phase 3). Everything else
// (client secret, authorization codes, refresh tokens) is bcrypt-hashed
// instead — see auth.service.ts's refreshToken pattern — since those are
// only ever compared, never displayed again.
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;

function getEncryptionKey(): Buffer {
  const key = process.env.CONNECTED_APPS_ENCRYPTION_KEY;
  if (!key) throw new Error('CONNECTED_APPS_ENCRYPTION_KEY is not set');
  const buf = Buffer.from(key, 'base64');
  if (buf.length !== 32) throw new Error('CONNECTED_APPS_ENCRYPTION_KEY must be a base64-encoded 32-byte key');
  return buf;
}

export function encrypt(plaintext: string): string {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return [iv.toString('base64'), authTag.toString('base64'), ciphertext.toString('base64')].join(':');
}

export function decrypt(payload: string): string {
  const [ivB64, authTagB64, ciphertextB64] = payload.split(':');
  if (!ivB64 || !authTagB64 || !ciphertextB64) throw new Error('Malformed encrypted payload');
  const key = getEncryptionKey();
  const decipher = crypto.createDecipheriv(ALGORITHM, key, Buffer.from(ivB64, 'base64'));
  decipher.setAuthTag(Buffer.from(authTagB64, 'base64'));
  const plaintext = Buffer.concat([decipher.update(Buffer.from(ciphertextB64, 'base64')), decipher.final()]);
  return plaintext.toString('utf8');
}

/** client_<32 hex chars> — public identifier, safe to log/display indefinitely. */
export function generateClientId(): string {
  return `client_${crypto.randomBytes(16).toString('hex')}`;
}

/**
 * Opaque secret generator for anything that gets bcrypt-hashed at rest
 * (client secret, authorization codes, refresh tokens). Returns the raw
 * token (shown once to the caller) alongside an 8-char prefix so the DB
 * row can be found by an indexed lookup before the expensive bcrypt.compare.
 */
export function generateOpaqueToken(): { token: string; prefix: string } {
  const token = crypto.randomBytes(32).toString('base64url');
  return { token, prefix: token.slice(0, 8) };
}

/**
 * Human-typeable 6-digit pairing code (e.g. "482-931") handed to a CRM admin
 * after approving a connection request, for them to relay to the external
 * app's own admin out of band — replaces copy/pasting raw client credentials.
 * `code` is the bare 6 digits (what gets bcrypt-hashed); `display` is the
 * dashed form shown in the UI; `prefix` is only the first 3 digits — a WEAK
 * pre-filter (not a security boundary the way the 8-char prefix on
 * generateOpaqueToken() is, since 3 digits is only 1-in-1000) used purely to
 * find candidate rows to bcrypt-compare and to attribute failed-attempt
 * lockout counts to a specific code. The real defense against guessing is
 * the short expiry + per-code attempt cap + per-IP throttle on the redeem
 * endpoint, not this prefix.
 */
export function generatePairingCode(): { code: string; display: string; prefix: string } {
  const code = crypto.randomInt(0, 1_000_000).toString().padStart(6, '0');
  return { code, display: `${code.slice(0, 3)}-${code.slice(3)}`, prefix: code.slice(0, 3) };
}
