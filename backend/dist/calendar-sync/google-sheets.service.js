"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var GoogleSheetsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.GoogleSheetsService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const prisma_service_1 = require("../prisma/prisma.service");
const googleapis_1 = require("googleapis");
let GoogleSheetsService = GoogleSheetsService_1 = class GoogleSheetsService {
    constructor(prisma, config) {
        this.prisma = prisma;
        this.config = config;
        this.logger = new common_1.Logger(GoogleSheetsService_1.name);
    }
    get clientId() { return this.config.get('GOOGLE_CLIENT_ID') ?? ''; }
    get clientSecret() { return this.config.get('GOOGLE_CLIENT_SECRET') ?? ''; }
    get redirectUri() { return this.config.get('GOOGLE_REDIRECT_URI') ?? ''; }
    async buildAuth(userId) {
        const conn = await this.prisma.userCalendarConnection.findFirst({
            where: { userId, provider: 'google', isActive: true },
        });
        if (!conn)
            return null;
        const auth = new googleapis_1.google.auth.OAuth2(this.clientId, this.clientSecret, this.redirectUri);
        auth.setCredentials({
            access_token: conn.accessToken,
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
    async listSheets(userId) {
        const auth = await this.buildAuth(userId);
        if (!auth)
            throw new common_1.BadRequestException('Google account not connected. Use the Integrations tab to connect.');
        try {
            const drive = googleapis_1.google.drive({ version: 'v3', auth });
            const res = await drive.files.list({
                q: "mimeType='application/vnd.google-apps.spreadsheet' and trashed=false",
                fields: 'files(id,name,modifiedTime)',
                orderBy: 'modifiedTime desc',
                pageSize: 100,
            });
            return (res.data.files ?? []).map((f) => ({
                id: f.id,
                name: f.name ?? 'Untitled',
                modifiedTime: f.modifiedTime ?? '',
            }));
        }
        catch (err) {
            const status = err?.response?.status ?? err?.code;
            if (status === 401 || status === 403) {
                throw new common_1.BadRequestException('Google Drive access not granted. Please reconnect your Google account from the Integrations tab.');
            }
            throw new common_1.BadRequestException(err?.message ?? 'Failed to list sheets');
        }
    }
    async createSheet(userId, title) {
        const auth = await this.buildAuth(userId);
        if (!auth)
            throw new common_1.BadRequestException('Google account not connected. Use the Integrations tab to connect.');
        try {
            const sheets = googleapis_1.google.sheets({ version: 'v4', auth });
            const res = await sheets.spreadsheets.create({
                requestBody: {
                    properties: { title },
                    sheets: [{ properties: { title: 'Form Responses' } }],
                },
            });
            return {
                id: res.data.spreadsheetId ?? '',
                name: res.data.properties?.title ?? title,
            };
        }
        catch (err) {
            const status = err?.response?.status ?? err?.code;
            if (status === 401 || status === 403) {
                throw new common_1.BadRequestException('Google Sheets access not granted. Please reconnect from the Integrations tab.');
            }
            throw new common_1.BadRequestException(err?.message ?? 'Failed to create sheet');
        }
    }
    async getSheetTabs(userId, spreadsheetId) {
        const auth = await this.buildAuth(userId);
        if (!auth)
            throw new common_1.BadRequestException('Google account not connected.');
        try {
            const sheets = googleapis_1.google.sheets({ version: 'v4', auth });
            const res = await sheets.spreadsheets.get({
                spreadsheetId,
                fields: 'sheets.properties.title',
            });
            return (res.data.sheets ?? []).map((s) => s.properties?.title ?? 'Sheet1');
        }
        catch (err) {
            const status = err?.response?.status ?? err?.code;
            if (status === 403 || status === 401)
                throw new common_1.BadRequestException('Cannot access this spreadsheet. Make sure you are connected and the sheet is in your Google Drive.');
            if (status === 404)
                throw new common_1.BadRequestException('Spreadsheet not found.');
            throw new common_1.BadRequestException(err?.message ?? 'Failed to load sheet tabs');
        }
    }
    async appendSubmission(userId, spreadsheetId, tabName, formFields, data, submittedAt) {
        const auth = await this.buildAuth(userId);
        if (!auth) {
            this.logger.warn(`Sheets: no connection for user ${userId} — skipping`);
            return;
        }
        const sheets = googleapis_1.google.sheets({ version: 'v4', auth });
        let hasHeader = false;
        try {
            const existing = await sheets.spreadsheets.values.get({
                spreadsheetId,
                range: `'${tabName}'!A1:Z1`,
            });
            hasHeader = (existing.data.values?.[0]?.length ?? 0) > 0;
        }
        catch {
            hasHeader = false;
        }
        const headers = ['Submitted At', ...formFields.map(f => f.label)];
        const row = [submittedAt.toISOString(), ...formFields.map(f => {
                const val = data[f.name];
                if (val === null || val === undefined)
                    return '';
                if (Array.isArray(val))
                    return val.join(', ');
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
};
exports.GoogleSheetsService = GoogleSheetsService;
exports.GoogleSheetsService = GoogleSheetsService = GoogleSheetsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        config_1.ConfigService])
], GoogleSheetsService);
//# sourceMappingURL=google-sheets.service.js.map