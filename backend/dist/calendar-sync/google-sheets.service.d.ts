import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
export interface SheetFile {
    id: string;
    name: string;
    modifiedTime: string;
}
export declare class GoogleSheetsService {
    private readonly prisma;
    private readonly config;
    private readonly logger;
    constructor(prisma: PrismaService, config: ConfigService);
    private get clientId();
    private get clientSecret();
    private get redirectUri();
    private buildAuth;
    listSheets(userId: string): Promise<SheetFile[]>;
    createSheet(userId: string, title: string): Promise<{
        id: string;
        name: string;
    }>;
    getSheetTabs(userId: string, spreadsheetId: string): Promise<string[]>;
    appendSubmission(userId: string, spreadsheetId: string, tabName: string, formFields: {
        label: string;
        name: string;
    }[], data: Record<string, any>, submittedAt: Date): Promise<void>;
}
