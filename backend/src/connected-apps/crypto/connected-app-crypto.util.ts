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
