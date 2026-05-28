import { AuditService } from './audit.service';
export declare class AuditController {
    private svc;
    constructor(svc: AuditService);
    findAll(query: any, user: any): Promise<({
        user: {
            id: string;
            email: string;
            firstName: string;
            lastName: string;
        };
    } & {
        id: string;
        organizationId: string;
        createdAt: Date;
        action: string;
        entityType: string;
        entityId: string;
        metadata: import("@prisma/client/runtime/library").JsonValue;
        ipAddress: string | null;
        userAgent: string | null;
        userId: string;
    })[]>;
}
