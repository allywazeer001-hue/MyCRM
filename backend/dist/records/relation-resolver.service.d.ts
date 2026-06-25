import { PrismaService } from '../prisma/prisma.service';
export declare class RelationResolverService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    private parseSettings;
    private extractLeafId;
    private collectLeafIds;
    resolveRecords(records: any[], fields: any[]): Promise<any[]>;
    resolveRecord(record: any, fields: any[]): Promise<any>;
}
