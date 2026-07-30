import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { FieldUsageService } from './field-usage.service';

@Injectable()
export class FieldsService {
  constructor(
    private prisma: PrismaService,
    private fieldUsage: FieldUsageService,
  ) {}

  // Defense-in-depth against duplicate option values reaching the DB — the Studio UI
  // already dedupes on generation, but this guards direct API calls too. A duplicate
  // `value` crashes every `<SelectItem key={o.value}>`-style renderer across the app.
  private dedupeOptionValues(options: any[], existingValues: Set<string> = new Set()): any[] {
    const taken = new Set(existingValues);
    return options.map((opt) => {
      const base = String(opt.value ?? '').trim() || 'option';
      let candidate = base;
      let n = 2;
      while (taken.has(candidate)) candidate = `${base}_${n++}`;
      taken.add(candidate);
      return candidate === opt.value ? opt : { ...opt, value: candidate };
    });
  }

  async create(moduleId: string, orgId: string, data: any) {
    const mod = await this.prisma.dynamicModule.findFirst({ where: { id: moduleId, organizationId: orgId } });
    if (!mod) throw new NotFoundException('Module not found');

    const maxOrder = await this.prisma.field.aggregate({ where: { moduleId }, _max: { order: true } });
    const order = (maxOrder._max.order ?? -1) + 1;

    const { options, ...fieldData } = data;
    const field = await this.prisma.field.create({
      data: { ...fieldData, moduleId, order },
    });

    if (options?.length) {
      const deduped = this.dedupeOptionValues(options);
      await this.prisma.fieldOption.createMany({
        data: deduped.map((opt: any, i: number) => ({ ...opt, fieldId: field.id, order: i })),
      });
    }

    return this.prisma.field.findUnique({ where: { id: field.id }, include: { options: true } });
  }

  async findByModule(moduleId: string, orgId: string) {
    const mod = await this.prisma.dynamicModule.findFirst({ where: { id: moduleId, organizationId: orgId } });
    if (!mod) throw new NotFoundException('Module not found');
    return this.prisma.field.findMany({
      where: { moduleId, isActive: true },
      include: { options: true },
      orderBy: { order: 'asc' },
    });
  }

  async update(id: string, orgId: string, data: any) {
    const field = await this.prisma.field.findFirst({
      where: { id },
      include: { module: true },
    });
    if (!field || field.module.organizationId !== orgId) throw new NotFoundException('Field not found');

    // options handling: replaceExisting controls whether to replace or append
    const { options, replaceExisting, ...fieldData } = data;

    // If the field name (JSON key) is being renamed, migrate existing record data so
    // old records don't produce false-positive "missing field" issues in scans.
    if (fieldData.name && fieldData.name !== field.name) {
      const oldKey = field.name;
      const newKey = fieldData.name as string;
      const records = await this.prisma.record.findMany({
        where: { moduleId: field.moduleId, isDeleted: false },
        select: { id: true, data: true },
      });
      const toMigrate = records.filter(r => {
        const d = r.data as Record<string, unknown>;
        return d && oldKey in d;
      });
      for (let i = 0; i < toMigrate.length; i += 200) {
        await Promise.all(
          toMigrate.slice(i, i + 200).map(r => {
            const d = { ...(r.data as Record<string, unknown>) };
            d[newKey] = d[oldKey];
            delete d[oldKey];
            return this.prisma.record.update({ where: { id: r.id }, data: { data: d as any } });
          })
        );
      }
    }

    if (options !== undefined) {
      if (replaceExisting !== false) {
        // Default: replace all options
        await this.prisma.fieldOption.deleteMany({ where: { fieldId: id } });
        if (options?.length) {
          const deduped = this.dedupeOptionValues(options);
          await this.prisma.fieldOption.createMany({
            data: deduped.map((opt: any, i: number) => ({ ...opt, fieldId: id, order: i })),
          });
        }
      } else {
        // Append mode: preserve existing, add new ones after
        const maxOrder = await this.prisma.fieldOption.aggregate({ where: { fieldId: id }, _max: { order: true } });
        const startOrder = (maxOrder._max.order ?? -1) + 1;
        if (options?.length) {
          const existing = await this.prisma.fieldOption.findMany({ where: { fieldId: id }, select: { value: true } });
          const deduped = this.dedupeOptionValues(options, new Set(existing.map((o) => o.value)));
          await this.prisma.fieldOption.createMany({
            data: deduped.map((opt: any, i: number) => ({ ...opt, fieldId: id, order: startOrder + i })),
          });
        }
      }
    }

    return this.prisma.field.update({ where: { id }, data: fieldData, include: { options: true } });
  }

  // Restarts an AUTO_NUMBER field's persisted counter (see
  // RecordsService.generateAutoNumber) so the NEXT generated value is exactly
  // `startFrom` — used when numbering needs to restart for a new batch/camp/year.
  async resetAutoNumber(id: string, orgId: string, startFrom: number) {
    const field = await this.prisma.field.findFirst({ where: { id }, include: { module: true } });
    if (!field || field.module.organizationId !== orgId) throw new NotFoundException('Field not found');
    if (field.type !== 'AUTO_NUMBER') throw new BadRequestException('Only Auto Number fields can be reset');
    if (!Number.isFinite(startFrom) || startFrom < 1) throw new BadRequestException('Start value must be a positive number');

    const settings = (field.settings as any) || {};
    return this.prisma.field.update({
      where: { id },
      data: { settings: { ...settings, startingNumber: startFrom, currentValue: startFrom - 1 } },
    });
  }

  async reorder(moduleId: string, orgId: string, fieldIds: string[]) {
    const mod = await this.prisma.dynamicModule.findFirst({ where: { id: moduleId, organizationId: orgId } });
    if (!mod) throw new NotFoundException('Module not found');

    await Promise.all(
      fieldIds.map((fId, index) => this.prisma.field.update({ where: { id: fId }, data: { order: index } }))
    );
    return { success: true };
  }

  /** Every Blueprint/Workflow referencing this field, active or not — used by the
   *  Studio UI to warn before deleting, and re-checked server-side in remove() below. */
  async checkUsage(id: string, orgId: string) {
    const field = await this.prisma.field.findFirst({ where: { id }, include: { module: true } });
    if (!field || field.module.organizationId !== orgId) throw new NotFoundException('Field not found');
    return this.fieldUsage.findUsages(field.moduleId, field.name);
  }

  async remove(id: string, orgId: string) {
    const field = await this.prisma.field.findFirst({ where: { id }, include: { module: true } });
    if (!field || field.module.organizationId !== orgId) throw new NotFoundException('Field not found');

    // A field still driving an active Blueprint or Workflow can't be deleted — deleting it
    // renames it out from under those references (see the record-migration below), silently
    // breaking their conditions/locks/actions. Turning the blueprint/workflow off first is
    // required; adding new fields is always allowed, only removal of an in-use one is blocked.
    const usages = await this.fieldUsage.findUsages(field.moduleId, field.name);
    const blocking = usages.filter((u) => u.isActive);
    if (blocking.length) {
      const list = blocking.map((u) => `${u.type} "${u.name}"`).join(', ');
      throw new BadRequestException(
        `Cannot delete "${field.label}" — it is used by active ${list}. Turn ${blocking.length > 1 ? 'those' : 'it'} off first, or remove the reference there.`,
      );
    }

    // Free up the field's name immediately so a newly-created field can reuse it
    // without inheriting this field's leftover values from existing records' data.
    const deletedName = `${field.name}__deleted_${Date.now()}`;
    const records = await this.prisma.record.findMany({
      where: { moduleId: field.moduleId, isDeleted: false },
      select: { id: true, data: true },
    });
    const toMigrate = records.filter(r => {
      const d = r.data as Record<string, unknown>;
      return d && field.name in d;
    });
    for (let i = 0; i < toMigrate.length; i += 200) {
      await Promise.all(
        toMigrate.slice(i, i + 200).map(r => {
          const d = { ...(r.data as Record<string, unknown>) };
          d[deletedName] = d[field.name];
          delete d[field.name];
          return this.prisma.record.update({ where: { id: r.id }, data: { data: d as any } });
        })
      );
    }

    return this.prisma.field.update({ where: { id }, data: { isActive: false, name: deletedName } });
  }
}
