import * as jwt from 'jsonwebtoken';

// Signs/verifies the short-lived token embedded in a personalized form link
// (e.g. "Send Form Link" from a record's detail page). The token itself
// carries the authorization: whoever generated it already proved they own
// the form and the source record, so a public form page can trust it without
// any further auth, and the backend re-verifies the signature + embedded
// formId/orgId at submit time rather than trusting client-supplied ids.
const SECRET = process.env.JWT_SECRET || 'enterprise-crm-secret-key-change-in-production';
const PURPOSE = 'integration-prefill';

export interface PrefillTokenPayload {
  purpose: typeof PURPOSE;
  formId: string;
  integrationFieldId: string;
  recordId: string;
  sourceModuleId: string;
  orgId: string;
}

export function signPrefillToken(
  payload: Omit<PrefillTokenPayload, 'purpose'>,
  expiresIn: string | number = '90d',
): string {
  return jwt.sign({ ...payload, purpose: PURPOSE }, SECRET, { expiresIn } as jwt.SignOptions);
}

export function verifyPrefillToken(token: string): PrefillTokenPayload {
  const decoded = jwt.verify(token, SECRET) as PrefillTokenPayload;
  if (decoded.purpose !== PURPOSE) throw new Error('Invalid token purpose');
  return decoded;
}
