import { StreamableFile } from '@nestjs/common';
import { Response } from 'express';
import { FilesService } from './files.service';
export declare class FilesController {
    private svc;
    constructor(svc: FilesService);
    uploadFile(file: any, user: any): Promise<{
        url: string;
        filename: string;
        originalName: string;
        size: number;
        mimeType: string;
    }>;
    serveFile(orgId: string, filename: string, res: Response): StreamableFile;
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
