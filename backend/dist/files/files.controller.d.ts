import { FilesService } from './files.service';
export declare class FilesController {
    private svc;
    constructor(svc: FilesService);
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
