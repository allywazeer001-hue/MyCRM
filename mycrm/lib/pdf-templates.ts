/**
 * CHANGE_004: PDF template engine for onboarding documents.
 *
 * Architecture:
 *   - Templates are plain HTML strings with #placeholder syntax
 *   - renderTemplate() replaces placeholders with user data
 *   - generateWelcomePDF() opens a print window and auto-triggers print
 *
 * Rollback: delete this file and remove the import + call in users/page.tsx
 *
 * Future extension points:
 *   - Add new templates to TEMPLATES map
 *   - Add email/WhatsApp delivery via sendDocument(template, channel, user)
 *   - Add per-usertype template selection via getTemplateForUsertype()
 */

import { BRAND } from "@/lib/core-brand";

// ── Types ────────────────────────────────────────────────────────────────────

export interface WelcomeUser {
  firstName: string;
  lastName: string;
  displayName?: string;
  email: string;
  role?: string;
}

export interface WelcomeOrg {
  name?: string;
  logo?: string;
}

export type TemplateKey = "welcome" | "password_reset";

// ── Template definitions ──────────────────────────────────────────────────────

const TEMPLATES: Record<TemplateKey, string> = {
  welcome: `
Dear #first_name,

Welcome to ${BRAND.name}.

Use the following details to access your account:

Username: #email
Password: #last_name (Default)

Note:
After your first login, you will be required to change your password immediately.

Regards,
System Administrator
`.trim(),

  password_reset: `
Dear #first_name,

Your password has been reset by the system administrator.

Use the following temporary password to log in:

Username: #email
Temporary Password: #last_name

Please change your password immediately after login.

Regards,
System Administrator
`.trim(),
};

// ── Core renderer ─────────────────────────────────────────────────────────────

export function renderTemplate(key: TemplateKey, user: WelcomeUser): string {
  const displayName = user.displayName || [user.firstName, user.lastName].filter(Boolean).join(' ');
  let text = TEMPLATES[key];
  text = text.replace(/#first_name/g, displayName);
  text = text.replace(/#last_name/g,  user.lastName);
  text = text.replace(/#email/g,      user.email);
  return text;
}

// ── HTML wrapper for print/PDF ────────────────────────────────────────────────

// Org name/logo come from live database fields (admin-editable), unlike the
// hardcoded BRAND constant — escape before splicing into the print window's
// HTML so an org name/logo URL containing markup can't inject into the
// generating admin's own browser.
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function buildPrintHTML(content: string, filename: string, org?: WelcomeOrg): string {
  const orgName = (org?.name || BRAND.name).trim();
  const logoLetter = escapeHtml((orgName.charAt(0) || BRAND.logoLetter).toUpperCase());
  const logoHtml = org?.logo
    ? `<img src="${escapeHtml(org.logo)}" alt="${escapeHtml(orgName)}" style="width:44px;height:44px;border-radius:9px;object-fit:cover;flex-shrink:0;" />`
    : `<div class="logo">${logoLetter}</div>`;
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${filename}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Segoe UI', Arial, sans-serif;
      background: #f8fafc;
      display: flex;
      align-items: flex-start;
      justify-content: center;
      padding: 48px 24px;
      min-height: 100vh;
    }
    .card {
      background: white;
      border-radius: 10px;
      padding: 48px 56px;
      max-width: 560px;
      width: 100%;
      box-shadow: 0 4px 24px rgba(0,0,0,.10);
    }
    .header {
      border-bottom: 2px solid #3b82f6;
      padding-bottom: 20px;
      margin-bottom: 32px;
      display: flex;
      align-items: center;
      gap: 14px;
    }
    .logo {
      width: 44px; height: 44px;
      background: #3b82f6;
      border-radius: 9px;
      display: flex; align-items: center; justify-content: center;
      color: white; font-size: 20px; font-weight: 800;
      flex-shrink: 0;
    }
    .org-name { font-size: 17px; font-weight: 700; color: #1e293b; }
    .org-sub  { font-size: 12px; color: #64748b; margin-top: 2px; }
    .body { white-space: pre-wrap; line-height: 1.9; font-size: 14.5px; color: #334155; }
    .footer {
      margin-top: 40px;
      padding-top: 16px;
      border-top: 1px solid #f1f5f9;
      font-size: 11px; color: #94a3b8; text-align: center;
    }
    @media print { body { background: white; } .card { box-shadow: none; } }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      ${logoHtml}
      <div>
        <div class="org-name">${BRAND.name}</div>
        <div class="org-sub">${escapeHtml(orgName)}</div>
      </div>
    </div>
    <div class="body">${content}</div>
    <div class="footer">
      Confidential — generated ${new Date().toLocaleDateString()}. Keep secure and destroy after use.
    </div>
  </div>
</body>
</html>`;
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Generate and auto-print the welcome PDF for a newly created user.
 * Opens a styled print window; the browser's "Save as PDF" sets the filename.
 *
 * @param user        - newly created user object
 * @param org         - the creating admin's organization (logo + name shown in the letterhead)
 * @param _password   - reserved for future use (email/WhatsApp delivery)
 */
export function generateWelcomePDF(user: WelcomeUser, org?: WelcomeOrg, _password?: string): void {
  const content  = renderTemplate("welcome", user);
  const displayName = user.displayName || [user.firstName, user.lastName].filter(Boolean).join(' ');
  const filename = `welcome_${displayName.toLowerCase().replace(/\s+/g, '_')}`;
  const html     = buildPrintHTML(content, filename, org);

  const win = window.open("", "_blank", "width=680,height=820");
  if (!win) return; // popup blocked — silent fail, existing CredentialDialog still shows
  win.document.write(html);
  win.document.close();
  win.focus();
  setTimeout(() => win.print(), 600);
}
