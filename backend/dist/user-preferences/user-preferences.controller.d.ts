import { UserPreferencesService } from './user-preferences.service';
export declare class UserPreferencesController {
    private svc;
    constructor(svc: UserPreferencesService);
    get(key: string, user: any): Promise<{
        key: string;
        value: import("@prisma/client/runtime/library").JsonValue;
    }>;
    set(key: string, body: {
        value: any;
    }, user: any): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        value: import("@prisma/client/runtime/library").JsonValue;
        key: string;
    }>;
    remove(key: string, user: any): Promise<{
        success: boolean;
    }>;
}
