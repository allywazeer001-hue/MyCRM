import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class RelationResolverService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Parse field settings — stored as a JSON string by the fields service,
   * but may also arrive as a plain object.
   */
  private parseSettings(field: any): Record<string, any> {
    const raw = field.settings;
    if (!raw) return {};
    if (typeof raw === 'object') return raw as Record<string, any>;
    try {
      return JSON.parse(raw as string);
    } catch {
      return {};
    }
  }

  /**
   * Given a value that may be a string, array, or {0: id, 1: id} numeric-keyed object,
   * extract the single "leaf" ID string.
   *
   * - string  -> return as-is
   * - array   -> return last non-empty element
   * - object with numeric keys -> return value at highest numeric key
   * - otherwise -> return null
   */
  private extractLeafId(value: any): string | null {
    if (value === null || value === undefined || value === '') return null;

    if (typeof value === 'string') return value;

    if (Array.isArray(value)) {
      for (let i = value.length - 1; i >= 0; i--) {
        const el = value[i];
        if (el !== null && el !== undefined && el !== '') return String(el);
      }
      return null;
    }

    if (typeof value === 'object') {
      // Numeric-keyed object like { 0: "id1", 1: "id2" }
      const numericKeys = Object.keys(value)
        .map((k) => parseInt(k, 10))
        .filter((k) => !isNaN(k));
      if (numericKeys.length > 0) {
        const maxKey = Math.max(...numericKeys);
        const leaf = value[String(maxKey)];
        if (leaf !== null && leaf !== undefined && leaf !== '') return String(leaf);
      }
    }

    return null;
  }

  /**
   * Collect all unique non-empty leaf IDs from all records for a given field name.
   */
  private collectLeafIds(records: any[], fieldName: string): string[] {
    const ids = new Set<string>();
    for (const record of records) {
      const value = record.data?.[fieldName];
      const leafId = this.extractLeafId(value);
      if (leafId !== null) ids.add(leafId);
    }
    return [...ids];
  }

  async resolveRecords(records: any[], fields: any[]): Promise<any[]> {
    if (!records || records.length === 0) return records;

    // -----------------------------------------------------------------------
    // 1. Categorise fields by resolution type
    // -----------------------------------------------------------------------

    // Category 1: LOOKUP — settings.lookupModuleId or field.lookupModuleId
    const lookupFields = fields.filter((f) => {
      const s = this.parseSettings(f);
      return f.type === 'LOOKUP' && (s.lookupModuleId || f.lookupModuleId);
    });

    // Category 6: MIRROR — read a field from a linked record via a LOOKUP field
    const mirrorFields = fields.filter((f) => {
      const s = this.parseSettings(f);
      return f.type === 'MIRROR' && s.sourceLookupFieldName && s.mirrorFieldName;
    });

    // Category 2: USER_SELECT — value is a userId
    const userFields = fields.filter((f) => f.type === 'USER_SELECT');

    // Category 3: GLOBAL_LIST and DEPENDENT_GLOBAL_LIST — value is a single item ID
    const globalListFields = fields.filter((f) => {
      const s = this.parseSettings(f);
      return (
        (f.type === 'GLOBAL_LIST' || f.type === 'DEPENDENT_GLOBAL_LIST') &&
        (s.globalListId || s.globalListSource?.listId)
      );
    });

    // Category 4: GLOBAL_RELATION — value may be a selections object {0: "id1", 1: "id2"}
    const globalRelationFields = fields.filter((f) => {
      const s = this.parseSettings(f);
      return f.type === 'GLOBAL_RELATION' && (s.globalListId || s.globalListSource?.listId);
    });

    // Category 5: DROPDOWN / STATUS backed by global lists
    const dropdownGlobalFields = fields.filter((f) => {
      const s = this.parseSettings(f);
      const hasGlobalSource = !!(s.globalListSource?.listId || s.globalListId);
      return (f.type === 'DROPDOWN' || f.type === 'STATUS') && hasGlobalSource;
    });

    // -----------------------------------------------------------------------
    // 2. Collect all unique IDs per category
    // -----------------------------------------------------------------------

    // Lookup IDs (simple string values)
    const allLookupIds: string[] = [];
    for (const field of lookupFields) {
      allLookupIds.push(...this.collectLeafIds(records, field.name));
    }
    // Mirror fields also need the linked records — collect their source IDs too
    for (const field of mirrorFields) {
      const s = this.parseSettings(field);
      allLookupIds.push(...this.collectLeafIds(records, s.sourceLookupFieldName));
    }
    const uniqueLookupIds = [...new Set(allLookupIds)];

    // User IDs (simple string values)
    const allUserIds: string[] = [];
    for (const field of userFields) {
      allUserIds.push(...this.collectLeafIds(records, field.name));
    }
    const uniqueUserIds = [...new Set(allUserIds)];

    // GlobalList IDs (categories 3, 4, 5 all resolve via globalListItem)
    const allGlobalIds: string[] = [];
    for (const field of [...globalListFields, ...globalRelationFields, ...dropdownGlobalFields]) {
      allGlobalIds.push(...this.collectLeafIds(records, field.name));
    }
    const uniqueGlobalIds = [...new Set(allGlobalIds)];

    // -----------------------------------------------------------------------
    // 3. Batch-fetch all referenced entities
    // -----------------------------------------------------------------------

    // Lookup records
    const lookupRecordMap = new Map<string, any>();
    if (uniqueLookupIds.length > 0) {
      const fetchedRecords = await this.prisma.record.findMany({
        where: { id: { in: uniqueLookupIds } },
      });
      for (const rec of fetchedRecords) {
        lookupRecordMap.set(rec.id, rec);
      }
    }

    // Users
    const userMap = new Map<string, string>();
    if (uniqueUserIds.length > 0) {
      const users = await this.prisma.user.findMany({
        where: { id: { in: uniqueUserIds } },
        select: { id: true, firstName: true, lastName: true, email: true },
      });
      for (const user of users) {
        const displayName =
          user.firstName || user.lastName
            ? `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim()
            : (user.email ?? user.id);
        userMap.set(user.id, displayName);
      }
    }

    // GlobalListItems (covers categories 3, 4, 5)
    const globalListItemMap = new Map<string, string>();
    if (uniqueGlobalIds.length > 0) {
      const items = await this.prisma.globalListItem.findMany({
        where: { id: { in: uniqueGlobalIds } },
      });
      for (const item of items) {
        globalListItemMap.set(item.id, item.label);
      }
    }

    // -----------------------------------------------------------------------
    // 4. Enrich each record — SHADOW LABELS only, raw values untouched
    // -----------------------------------------------------------------------
    const enriched = records.map((record) => {
      const data = { ...(record.data ?? {}) };

      // --- Category 1: LOOKUP ---
      for (const field of lookupFields) {
        const rawValue = data[field.name];
        if (rawValue === null || rawValue === undefined || rawValue === '') continue;

        const id = String(rawValue);
        const fetchedRecord = lookupRecordMap.get(id);
        if (fetchedRecord) {
          const s = this.parseSettings(field);
          const displayField: string = s.displayField ?? 'name';
          const label = (fetchedRecord.data as any)?.[displayField] ?? id;
          data[field.name + '__label'] = label;
        }
      }

      // --- Category 2: USER_SELECT ---
      for (const field of userFields) {
        const rawValue = data[field.name];
        if (rawValue === null || rawValue === undefined || rawValue === '') continue;

        const id = String(rawValue);
        const label = userMap.get(id);
        if (label !== undefined) {
          data[field.name + '__label'] = label;
        }
      }

      // --- Category 3: GLOBAL_LIST / DEPENDENT_GLOBAL_LIST ---
      for (const field of globalListFields) {
        const rawValue = data[field.name];
        const leafId = this.extractLeafId(rawValue);
        if (leafId === null) continue;

        const label = globalListItemMap.get(leafId);
        if (label !== undefined) {
          data[field.name + '__label'] = label;
        }
      }

      // --- Category 4: GLOBAL_RELATION ---
      for (const field of globalRelationFields) {
        const rawValue = data[field.name];
        const leafId = this.extractLeafId(rawValue);
        if (leafId === null) continue;

        const label = globalListItemMap.get(leafId);
        if (label !== undefined) {
          data[field.name + '__label'] = label;
        }
      }

      // --- Category 6: MIRROR ---
      for (const field of mirrorFields) {
        const s = this.parseSettings(field);
        const sourceValue = data[s.sourceLookupFieldName];
        if (sourceValue === null || sourceValue === undefined || sourceValue === '') continue;

        const id = String(sourceValue);
        const linkedRecord = lookupRecordMap.get(id);
        if (linkedRecord) {
          data[field.name] = (linkedRecord.data as any)?.[s.mirrorFieldName] ?? null;
        }
      }

      // --- Category 5: DROPDOWN / STATUS backed by global lists ---
      for (const field of dropdownGlobalFields) {
        const rawValue = data[field.name];
        const leafId = this.extractLeafId(rawValue);
        if (leafId === null) continue;

        const label = globalListItemMap.get(leafId);
        if (label !== undefined) {
          data[field.name + '__label'] = label;
        }
      }

      return { ...record, data };
    });

    return enriched;
  }

  /**
   * Convenience wrapper for a single record.
   */
  async resolveRecord(record: any, fields: any[]): Promise<any> {
    const result = await this.resolveRecords([record], fields);
    return result[0];
  }
}
