import { OrganizationsService } from './organizations.service';
export declare class OrganizationsController {
    private organizationsService;
    constructor(organizationsService: OrganizationsService);
    getMyOrg(user: any): Promise<{
        id: string;
        phone: string | null;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        slug: string;
        logo: string | null;
        website: string | null;
        address: string | null;
        settings: import("@prisma/client/runtime/library").JsonValue;
    }>;
    updateMyOrg(user: any, body: any): Promise<{
        id: string;
        phone: string | null;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        slug: string;
        logo: string | null;
        website: string | null;
        address: string | null;
        settings: import("@prisma/client/runtime/library").JsonValue;
    }>;
}
