import { PrismaService } from '../prisma/prisma.service';
export declare class FilesService {
    private prisma;
    constructor(prisma: PrismaService);
    create(orgId: string, userId: string, data: any): Promise<{
        id: string;
        organizationId: string;
        createdAt: Date;
        name: string;
        recordId: string | null;
        originalName: string;
        mimeType: string;
        size: number;
        url: string;
        path: string | null;
        uploadedById: string;
    }>;
    findByRecord(recordId: string): Promise<{
        id: string;
        organizationId: string;
        createdAt: Date;
        name: string;
        recordId: string | null;
        originalName: string;
        mimeType: string;
        size: number;
        url: string;
        path: string | null;
        uploadedById: string;
    }[]>;
}
