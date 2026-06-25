import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { google } from 'googleapis';

export interface SheetFile {
  id:           string;
  name:         string;
  modifiedTime: string;
}

@Injectable()
export class GoogleSheetsService {
  private readonly logger = new Logger(GoogleSheetsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  private get clientId()     { return this.config.get<string>('GOOGLE_CLIENT_ID')     ?? ''; }
  private get clientSecret() { return this.config.get<string>('GOOGLE_CLIENT_SECRET') ?? ''; }
  private get redirectUri()  { return this.config.get<string>('GOOGLE_REDIRECT_URI')  ?? ''; }

  // ── Build authenticated OAuth2 client ───────────────────────────────────────

  private async buildAuth(userId: string) {
    const conn = await this.prisma.userCalendarConnection.findFirst({
      where: { userId, provider: 'google', isActive: true },
    });
    if (!conn) return null;

    const auth = new google.auth.OAuth2(this.clientId, this.clientSecret, this.redirectUri);
    auth.setCredentials({
      access_token:  conn.accessToken,
      refresh_token: conn.refreshToken ?? undefined,
    });
    auth.on('tokens', async (tokens) => {
      if (tokens.access_token) {
        await this.prisma.userCalendarConnection.update({
          where: { id: conn.id },
          data: { accessToken: tokens.access_token, tokenExpiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : undefined },
        });
      }
    });
    return auth;
  }

  // ── List user's spreadsheets via Drive API ───────────────────────────────────

  async listSheets(userId: string): Promise<SheetFile[]> {
    const auth = await this.buildAuth(userId);
    if (!auth) throw new BadRequestException('Google account not connected. Use the Integrations tab to connect.');

    try {
      const drive = google.drive({ version: 'v3', auth });
      const res = await drive.files.list({
        q: "mimeType='application/vnd.google-apps.spreadsheet' and trashed=false",
        fields: 'files(id,name,modifiedTime)',
        orderBy: 'modifiedTime desc',
        pageSize: 100,
      });
      return (res.data.files ?? []).map((f: any) => ({
        id:           f.id,
        name:         f.name ?? 'Untitled',
        modifiedTime: f.modifiedTime ?? '',
      }));
    } catch (err: any) {
      const status = err?.response?.status ?? err?.code;
      if (status === 401 || status === 403) {
        throw new BadRequestException('Google Drive access not granted. Please reconnect your Google account from the Integrations tab.');
      }
      throw new BadRequestException(err?.message ?? 'Failed to list sheets');
    }
  }

  // ── Create a new blank spreadsheet ──────────────────────────────────────────

  async createSheet(userId: string, title: string): Promise<{ id: string; name: string }> {
    const auth = await this.buildAuth(userId);
    if (!auth) throw new BadRequestException('Google account not connected. Use the Integrations tab to connect.');

    try {
      const sheets = google.sheets({ version: 'v4', auth });
      const res = await sheets.spreadsheets.create({
        requestBody: {
          properties: { title },
          sheets: [{ properties: { title: 'Form Responses' } }],
        },
      });
      return {
        id:   res.data.spreadsheetId ?? '',
        name: res.data.properties?.title ?? title,
      };
    } catch (err: any) {
      const status = err?.response?.status ?? err?.code;
      if (status === 401 || status === 403) {
        throw new BadRequestException('Google Sheets access not granted. Please reconnect from the Integrations tab.');
      }
      throw new BadRequestException(err?.message ?? 'Failed to create sheet');
    }
  }

  // ── Get tabs for a spreadsheet ───────────────────────────────────────────────

  async getSheetTabs(userId: string, spreadsheetId: string): Promise<string[]> {
    const auth = await this.buildAuth(userId);
    if (!auth) throw new BadRequestException('Google account not connected.');

    try {
      const sheets = google.sheets({ version: 'v4', auth });
      const res = await sheets.spreadsheets.get({
        spreadsheetId,
        fields: 'sheets.properties.title',
      });
      return (res.data.sheets ?? []).map((s: any) => s.properties?.title ?? 'Sheet1');
    } catch (err: any) {
      const status = err?.response?.status ?? err?.code;
      if (status === 403 || status === 401) throw new BadRequestException('Cannot access this spreadsheet. Make sure you are connected and the sheet is in your Google Drive.');
      if (status === 404) throw new BadRequestException('Spreadsheet not found.');
      throw new BadRequestException(err?.message ?? 'Failed to load sheet tabs');
    }
  }

  // ── Write a form submission row ──────────────────────────────────────────────

  async appendSubmission(
    userId: string,
    spreadsheetId: string,
    tabName: string,
    formFields: { label: string; name: string }[],
    data: Record<string, any>,
    submittedAt: Date,
  ): Promise<void> {
    const auth = await this.buildAuth(userId);
    if (!auth) {
      this.logger.warn(`Sheets: no connection for user ${userId} — skipping`);
      return;
    }
    const sheets = google.sheets({ version: 'v4', auth });

    let hasHeader = false;
    try {
      const existing = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: `'${tabName}'!A1:Z1`,
      });
      hasHeader = (existing.data.values?.[0]?.length ?? 0) > 0;
    } catch { hasHeader = false; }

    const headers = ['Submitted At', ...formFields.map(f => f.label)];
    const row     = [submittedAt.toISOString(), ...formFields.map(f => {
      const val = data[f.name];
      if (val === null || val === undefined) return '';
      if (Array.isArray(val)) return val.join(', ');
      return String(val);
    })];

    if (!hasHeader) {
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `'${tabName}'!A1`,
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: [headers] },
      });
    }

    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: `'${tabName}'!A1`,
      valueInputOption: 'USER_ENTERED',
      insertDataOption: 'INSERT_ROWS',
      requestBody: { values: [row] },
    });

    this.logger.log(`Sheets: appended row to ${spreadsheetId}/${tabName}`);
  }
}
