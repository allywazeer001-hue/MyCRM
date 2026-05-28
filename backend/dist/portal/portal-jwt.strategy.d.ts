import { Strategy } from 'passport-jwt';
import { PrismaService } from '../prisma/prisma.service';
declare const PortalJwtStrategy_base: new (...args: any[]) => Strategy;
export declare class PortalJwtStrategy extends PortalJwtStrategy_base {
    private prisma;
    constructor(prisma: PrismaService);
    validate(payload: any): Promise<{
        portalUserId: string;
        organizationId: string;
        isPortalAdmin: boolean;
        portalRole: any;
        type: string;
    }>;
}
export {};
