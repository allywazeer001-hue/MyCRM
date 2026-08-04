/**
 * Shared {{tag}} personalization engine — used identically by SMS, WhatsApp,
 * and Email sends (Campaigns) so the same `{{First_Name}}` syntax behaves the
 * same way everywhere. Originally lived only in EmailsService.resolve();
 * extracted here so Campaigns doesn't duplicate it.
 *
 * Missing values never produce "Dear ," — an unresolved tag is left as the
 * literal `{{tag}}` text so a sender notices it, rather than silently
 * blanking it out.
 */
export function resolveMergeFields(text: string, data: Record<string, string> = {}): string {
  return text.replace(/\{\{(\w+)\}\}/g, (_, key) => data[key] ?? `{{${key}}}`);
}

/**
 * Builds the merge-data map for one CRM record given its module's fields —
 * the well-known tags (First_Name, Last_Name, Full_Name, Phone, Email) are
 * derived from whichever field on the module has that role (by name or by
 * Field.type, e.g. type === "EMAIL"), everything else is exposed under its
 * own field name so a template can reference any field on the module.
 */
export interface MergeFieldSource {
  name: string;
  label: string;
  type: string;
}

export function buildRecordMergeData(
  data: Record<string, any>,
  fields: MergeFieldSource[],
): Record<string, string> {
  const merge: Record<string, string> = {};

  for (const f of fields) {
    const value = data?.[f.name];
    if (value === null || value === undefined) continue;
    merge[f.name] = Array.isArray(value) ? value.join(', ') : String(value);
  }

  const firstNameField = fields.find(f => /^(first.?name)$/i.test(f.name) || /^(first.?name)$/i.test(f.label));
  const lastNameField  = fields.find(f => /^(last.?name)$/i.test(f.name)  || /^(last.?name)$/i.test(f.label));
  const emailField     = fields.find(f => f.type === 'EMAIL');
  const phoneField     = fields.find(f => f.type === 'PHONE');

  if (firstNameField) merge['First_Name'] = merge[firstNameField.name] ?? '';
  if (lastNameField)  merge['Last_Name']  = merge[lastNameField.name] ?? '';
  if (firstNameField || lastNameField) {
    merge['Full_Name'] = [merge['First_Name'], merge['Last_Name']].filter(Boolean).join(' ');
  }
  if (emailField) merge['Email'] = merge[emailField.name] ?? '';
  if (phoneField) merge['Phone'] = merge[phoneField.name] ?? '';

  return merge;
}
