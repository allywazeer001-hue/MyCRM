import { PrismaService } from '../prisma/prisma.service';
export declare class PortalDocumentService {
    private prisma;
    constructor(prisma: PrismaService);
    uploadDocument(portalUserId: string, orgId: string, file: {
        buffer: Buffer;
        originalname: string;
        mimetype: string;
        size: number;
    }, dto: {
        recordId?: string;
        moduleId?: string;
        fieldKey?: string;
    }): Promise<{
        id: string;
        status: string;
        organizationId: string;
        createdAt: Date;
        updatedAt: Date;
        moduleId: string | null;
        recordId: string | null;
        originalName: string;
        mimeType: string;
        portalUserId: string;
        fieldKey: string | null;
        fileName: string;
        fileSize: number;
        filePath: string;
    }>;
    listDocuments(portalUserId: string): Promise<{
        id: string;
        createdAt: Date;
        originalName: string;
        mimeType: string;
        fieldKey: string;
        fileName: string;
        fileSize: number;
        filePath: string;
    }[]>;
    deleteDocument(portalUserId: string, docId: string): Promise<{
        success: boolean;
    }>;
    listOrgDocuments(orgId: string, portalUserId?: string): Promise<({
        portalUser: {
            email: string;
            firstName: string;
            lastName: string;
            id: string;
        };
    } & {
        id: string;
        status: string;
        organizationId: string;
        createdAt: Date;
        updatedAt: Date;
        moduleId: string | null;
        recordId: string | null;
        originalName: string;
        mimeType: string;
        portalUserId: string;
        fieldKey: string | null;
        fileName: string;
        fileSize: number;
        filePath: string;
    })[]>;
}
