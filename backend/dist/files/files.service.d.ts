import { PrismaService } from '../prisma/prisma.service';
export declare class FilesService {
    private prisma;
    constructor(prisma: PrismaService);
    uploadFile(orgId: string, userId: string, file: {
        buffer: Buffer;
        originalname: string;
        mimetype: string;
        size: number;
    }): Promise<{
        url: string;
        filename: string;
        originalName: string;
        size: number;
        mimeType: string;
    }>;
    serveFile(orgId: string, filename: string): {
        filePath: string;
        filename: string;
    };
    create(orgId: string, userId: string, data: any): Promise<{
        id: string;
        organizationId: string;
        createdAt: Date;
        name: string;
        recordId: string | null;
        url: string;
        path: string | null;
        originalName: string;
        mimeType: string;
        size: number;
        uploadedById: string;
    }>;
    findByRecord(recordId: string): Promise<{
        id: string;
        organizationId: string;
        createdAt: Date;
        name: string;
        recordId: string | null;
        url: string;
        path: string | null;
        originalName: string;
        mimeType: string;
        size: number;
        uploadedById: string;
    }[]>;
}
