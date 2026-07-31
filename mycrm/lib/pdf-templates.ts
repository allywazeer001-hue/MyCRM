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

Welcome to #org_name.

This document is normally provided to new staff and marks the beginning of your access to organization data. Please keep the following account credentials confidential:

Username: #email
Password: #last_name (Default)

Note:
After your first login, you will be required to change your password immediately.

Important:
We deal with valuable data. Please make sure any action you take is authorized, and report any unusual experience to your supervisor or head of department immediately.

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

export function renderTemplate(key: TemplateKey, user: WelcomeUser, orgName?: string): string {
  const displayName = user.displayName || [user.firstName, user.lastName].filter(Boolean).join(' ');
  let text = TEMPLATES[key];
  text = text.replace(/#first_name/g, displayName);
  text = text.replace(/#last_name/g,  user.lastName);
  text = text.replace(/#email/g,      user.email);
  text = text.replace(/#org_name/g,   orgName || BRAND.name);
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
    .footer-brand { margin-top: 6px; font-size: 10px; font-weight: 600; letter-spacing: 0.03em; color: #cbd5e1; }
    @media print { body { background: white; } .card { box-shadow: none; } }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      ${logoHtml}
      <div>
        <div class="org-name">${escapeHtml(orgName)}</div>
        <div class="org-sub">Staff Account Credentials</div>
      </div>
    </div>
    <div class="body">${content}</div>
    <div class="footer">
      <div>Confidential — generated ${new Date().toLocaleDateString()}. Keep secure and destroy after use.</div>
      <div class="footer-brand">${escapeHtml(BRAND.name)}</div>
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
  const content  = renderTemplate("welcome", user, org?.name);
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

// ── Access Report (audit document) ─────────────────────────────────────────
// Printable record of exactly what a staff member can access — module by
// module, action by action — plus any manual overrides and why they were
// granted. Opens the same clean, chrome-free print window as the welcome
// letter (so the sidebar/topbar never end up in the printout), just with a
// table-based body instead of a paragraph of text.

export interface AccessReportUser {
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  department?: string;
}

export interface AccessReportSystemAccess {
  canDashboard: boolean;
  canAnalytics: boolean;
  canWorkflow: boolean;
  canForms: boolean;
  canStudio: boolean;
}

export interface AccessReportModuleRow {
  moduleId: string;
  moduleName: string;
  canView: boolean;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canExport: boolean;
  canImport: boolean;
  canPrint: boolean;
}

export interface AccessReportOverride {
  scope: string;
  reason?: string;
  expiresAt?: string | null;
}

const SYSTEM_ACCESS_LABELS: Array<{ key: keyof AccessReportSystemAccess; label: string }> = [
  { key: "canDashboard", label: "Dashboard" },
  { key: "canAnalytics", label: "Analytics" },
  { key: "canWorkflow", label: "Workflows" },
  { key: "canForms", label: "Forms" },
  { key: "canStudio", label: "Module Studio" },
];

const MODULE_ACCESS_LABELS: Array<{ key: keyof Omit<AccessReportModuleRow, "moduleId" | "moduleName">; label: string }> = [
  { key: "canView", label: "View" },
  { key: "canCreate", label: "Create" },
  { key: "canEdit", label: "Edit" },
  { key: "canDelete", label: "Delete" },
  { key: "canExport", label: "Export" },
  { key: "canImport", label: "Import" },
  { key: "canPrint", label: "Print" },
];

function accessMark(granted: boolean): string {
  return granted
    ? `<span style="color:#16a34a;font-weight:700;">✓</span>`
    : `<span style="color:#cbd5e1;">–</span>`;
}

function buildAccessReportHTML(
  user: AccessReportUser,
  system: AccessReportSystemAccess,
  modules: AccessReportModuleRow[],
  overrides: AccessReportOverride[],
  org: WelcomeOrg | undefined,
  filename: string,
): string {
  const orgName = (org?.name || BRAND.name).trim();
  const logoLetter = escapeHtml((orgName.charAt(0) || BRAND.logoLetter).toUpperCase());
  const logoHtml = org?.logo
    ? `<img src="${escapeHtml(org.logo)}" alt="${escapeHtml(orgName)}" style="width:44px;height:44px;border-radius:9px;object-fit:cover;flex-shrink:0;" />`
    : `<div class="logo">${logoLetter}</div>`;
  const displayName = [user.firstName, user.lastName].filter(Boolean).join(' ');

  const moduleRowsHtml = modules.length
    ? modules.map(m => `
      <tr>
        <td class="mod-name">${escapeHtml(m.moduleName)}</td>
        ${MODULE_ACCESS_LABELS.map(({ key }) => `<td class="mark">${accessMark(!!m[key])}</td>`).join('')}
      </tr>`).join('')
    : `<tr><td colspan="${MODULE_ACCESS_LABELS.length + 1}" class="empty">No modules configured for this organization.</td></tr>`;

  const overridesSection = overrides.length ? `
    <h2>Active Manual Overrides</h2>
    <table>
      <thead><tr><th>Scope</th><th>Reason</th><th>Expires</th></tr></thead>
      <tbody>
        ${overrides.map(o => `
          <tr>
            <td>${escapeHtml(o.scope)}</td>
            <td>${escapeHtml(o.reason || '—')}</td>
            <td>${o.expiresAt ? escapeHtml(new Date(o.expiresAt).toLocaleDateString()) : 'No expiry'}</td>
          </tr>`).join('')}
      </tbody>
    </table>` : '';

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
      justify-content: center;
      padding: 48px 24px;
    }
    .card {
      background: white;
      border-radius: 10px;
      padding: 48px 56px;
      max-width: 720px;
      width: 100%;
      box-shadow: 0 4px 24px rgba(0,0,0,.10);
    }
    .header {
      border-bottom: 2px solid #3b82f6;
      padding-bottom: 20px;
      margin-bottom: 28px;
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
    .generated { margin-left: auto; font-size: 11px; color: #94a3b8; text-align: right; }
    .summary { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 28px; }
    .summary-item .k { font-size: 10px; text-transform: uppercase; letter-spacing: .04em; color: #94a3b8; margin-bottom: 2px; }
    .summary-item .v { font-size: 13.5px; font-weight: 600; color: #1e293b; }
    h2 { font-size: 13px; font-weight: 700; color: #334155; margin: 26px 0 10px; }
    table { width: 100%; border-collapse: collapse; font-size: 12.5px; }
    th { text-align: left; background: #f8fafc; color: #64748b; font-weight: 600; padding: 8px 10px; border-bottom: 1px solid #e2e8f0; }
    td { padding: 7px 10px; border-bottom: 1px solid #f1f5f9; color: #334155; }
    tr:last-child td { border-bottom: none; }
    .mod-name { font-weight: 600; }
    .mark { text-align: center; }
    .empty { text-align: center; color: #94a3b8; padding: 20px; }
    .footer {
      margin-top: 36px;
      padding-top: 16px;
      border-top: 1px solid #f1f5f9;
      font-size: 11px; color: #94a3b8;
      display: flex; align-items: center; justify-content: space-between; gap: 16px;
    }
    .footer-brand { font-weight: 700; letter-spacing: 0.03em; color: #cbd5e1; white-space: nowrap; }
    @media print { body { background: white; } .card { box-shadow: none; } }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      ${logoHtml}
      <div>
        <div class="org-name">${escapeHtml(orgName)}</div>
        <div class="org-sub">Access Report</div>
      </div>
      <div class="generated">Generated ${escapeHtml(new Date().toLocaleDateString())}</div>
    </div>

    <div class="summary">
      <div class="summary-item"><div class="k">Name</div><div class="v">${escapeHtml(displayName)}</div></div>
      <div class="summary-item"><div class="k">Role</div><div class="v">${escapeHtml(user.role.replace(/_/g, ' '))}</div></div>
      <div class="summary-item"><div class="k">Email</div><div class="v">${escapeHtml(user.email)}</div></div>
      <div class="summary-item"><div class="k">Department</div><div class="v">${escapeHtml(user.department || '—')}</div></div>
    </div>

    <h2>System-Level Access</h2>
    <table>
      <tbody>
        ${SYSTEM_ACCESS_LABELS.map(({ key, label }) => `
          <tr><td>${escapeHtml(label)}</td><td class="mark" style="width:60px;">${accessMark(!!system[key])}</td></tr>`).join('')}
      </tbody>
    </table>

    <h2>Module-Level Access</h2>
    <table>
      <thead>
        <tr>
          <th>Module</th>
          ${MODULE_ACCESS_LABELS.map(({ label }) => `<th class="mark">${escapeHtml(label)}</th>`).join('')}
        </tr>
      </thead>
      <tbody>${moduleRowsHtml}</tbody>
    </table>

    ${overridesSection}

    <div class="footer">
      <span>Confidential — reflects access level at time of generation and may change. Report any discrepancy to your supervisor or head of department.</span>
      <span class="footer-brand">${escapeHtml(BRAND.name)}</span>
    </div>
  </div>
</body>
</html>`;
}

/**
 * Generate and auto-print a full Access Report for one staff member — every
 * module they can reach and exactly what actions they're allowed (view,
 * create, edit, delete, export, import, print), plus any active manual
 * overrides and why they were granted. Intended for audit/review, e.g.
 * before a compliance check or when investigating unusual activity.
 */
export function generateAccessReport(
  user: AccessReportUser,
  system: AccessReportSystemAccess,
  modules: AccessReportModuleRow[],
  overrides: AccessReportOverride[],
  org?: WelcomeOrg,
): void {
  const displayName = [user.firstName, user.lastName].filter(Boolean).join(' ');
  const filename = `access_report_${displayName.toLowerCase().replace(/\s+/g, '_')}`;
  const html = buildAccessReportHTML(user, system, modules, overrides, org, filename);

  const win = window.open("", "_blank", "width=820,height=920");
  if (!win) return; // popup blocked — silent fail
  win.document.write(html);
  win.document.close();
  win.focus();
  setTimeout(() => win.print(), 600);
}
