import { Injectable, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ALL_BLUEPRINTS, BLUEPRINT_LIST } from './blueprints/index';
import { BlueprintModule, BlueprintField, BlueprintWorkflow } from './blueprints/types';

@Injectable()
export class IndustrySetupService {
  constructor(private prisma: PrismaService) {}

  // ── Public API ───────────────────────────────────────────────────────────────

  getBlueprintList() {
    return BLUEPRINT_LIST;
  }

  getBlueprintPreview(key: string) {
    const bp = ALL_BLUEPRINTS[key];
    if (!bp) throw new BadRequestException(`Blueprint "${key}" not found`);
    return {
      key:          bp.key,
      industry:     bp.industry,
      description:  bp.description,
      icon:         bp.icon,
      color:        bp.color,
      moduleCount:  bp.modules.length,
      fieldCount:   bp.modules.reduce((s, m) => s + m.fields.length, 0),
      workflowCount: bp.workflows.length,
      departmentCount: bp.departments.length,
      modules: bp.modules.map(m => ({
        name: m.name, icon: m.icon, color: m.color,
        fieldCount: m.fields.length,
      })),
      workflows: bp.workflows.map(w => ({ name: w.name, trigger: w.trigger })),
      departments: bp.departments.map(d => ({ name: d.name, color: d.color })),
    };
  }

  async getSetupStatus(orgId: string) {
    const org = await this.prisma.organization.findUnique({ where: { id: orgId } });
    const settings = (org?.settings as any) ?? {};
    return {
      setupCompleted: !!settings.setupCompleted,
      industry:       settings.industry ?? null,
      mode:           settings.setupMode ?? null,
    };
  }

  async install(orgId: string, industryKey: string, mode: 'blueprint' | 'scratch') {
    // Check not already set up
    const org = await this.prisma.organization.findUnique({ where: { id: orgId } });
    const settings = (org?.settings as any) ?? {};
    if (settings.setupCompleted) {
      throw new ConflictException('Industry setup has already been completed for this organization');
    }

    if (mode === 'scratch') {
      await this.markSetupComplete(orgId, 'scratch', null);
      return { success: true, mode: 'scratch', created: {} };
    }

    const blueprint = ALL_BLUEPRINTS[industryKey];
    if (!blueprint) throw new BadRequestException(`Blueprint "${industryKey}" not found`);

    const log: string[] = [];
    const created = {
      modules:     [] as string[],
      fields:      0,
      workflows:   [] as string[],
      departments: [] as string[],
    };

    // 1. Create departments
    for (const dept of blueprint.departments) {
      try {
        await this.prisma.department.upsert({
          where:  { slug_organizationId: { slug: dept.slug, organizationId: orgId } },
          update: {},
          create: {
            name:           dept.name,
            slug:           dept.slug,
            color:          dept.color,
            description:    dept.description ?? null,
            organizationId: orgId,
          },
        });
        created.departments.push(dept.name);
        log.push(`✓ Department: ${dept.name}`);
      } catch { log.push(`  Skipped (exists): ${dept.name}`); }
    }

    // 2. Create modules and their fields
    const moduleIdMap: Record<string, string> = {};

    for (let mi = 0; mi < blueprint.modules.length; mi++) {
      const mod = blueprint.modules[mi];

      const slug = mod.slug.toLowerCase().replace(/[^a-z0-9_]/g, '_');

      // Check for existing module with same slug
      const existing = await this.prisma.dynamicModule.findFirst({
        where: { organizationId: orgId, slug },
      });

      let moduleId: string;

      if (existing) {
        moduleId = existing.id;
        log.push(`  Module exists, using: ${mod.name}`);
      } else {
        const created_mod = await this.prisma.dynamicModule.create({
          data: {
            name:           mod.name,
            slug,
            description:    mod.description ?? null,
            icon:           mod.icon,
            color:          mod.color,
            order:          mi,
            isActive:       true,
            settings:       {},
            organizationId: orgId,
          },
        });
        moduleId = created_mod.id;
        created.modules.push(mod.name);
        log.push(`✓ Module: ${mod.name}`);
      }

      moduleIdMap[mod.slug] = moduleId;

      // Create fields (pass moduleIdMap so LOOKUP fields can resolve slugs → IDs)
      const fieldCount = await this.createFields(moduleId, orgId, mod.fields, moduleIdMap);
      created.fields += fieldCount;
      log.push(`  → ${fieldCount} fields configured`);
    }

    // 3. Create workflows
    for (const wf of blueprint.workflows) {
      const moduleId = moduleIdMap[wf.moduleSlug];
      if (!moduleId) { log.push(`  Skipped workflow (module not found): ${wf.name}`); continue; }

      try {
        await this.prisma.workflow.create({
          data: {
            name:           wf.name,
            description:    wf.description ?? null,
            trigger:        wf.trigger as any,
            triggerConfig:  {},
            conditions:     [],
            isActive:       wf.isActive ?? true,
            tags:           [],
            moduleId,
            organizationId: orgId,
            actions: {
              create: wf.actions.map(a => ({
                type:            a.type as any,
                config:          a.config,
                order:           a.order,
                recipientUsers:  [],
                recipientDepts:  [],
              })),
            },
          },
        });
        created.workflows.push(wf.name);
        log.push(`✓ Workflow: ${wf.name}`);
      } catch (e) {
        log.push(`  Skipped workflow: ${wf.name}`);
      }
    }

    // 4. Create explicit Relationship records from LOOKUP fields (enables relationship UI & reporting)
    const moduleIds = Object.values(moduleIdMap);
    const lookupFields = await this.prisma.field.findMany({
      where: { type: 'LOOKUP', moduleId: { in: moduleIds } },
      include: { module: { select: { name: true } } },
    });

    for (const field of lookupFields) {
      const toModuleId = (field.settings as any)?.lookupModuleId;
      if (!toModuleId) continue;
      const toMod = await this.prisma.dynamicModule.findUnique({
        where: { id: toModuleId }, select: { name: true },
      });
      if (!toMod) continue;
      try {
        await this.prisma.relationship.create({
          data: {
            name:           `${field.module.name} → ${toMod.name}`,
            type:           'MANY_TO_ONE',
            fromModuleId:   field.moduleId,
            toModuleId,
            fromFieldId:    field.id,
            organizationId: orgId,
          },
        });
        log.push(`✓ Relationship: ${field.module.name} → ${toMod.name}`);
      } catch { log.push(`  Skipped relationship (exists): ${field.label}`); }
    }

    // 5. Mark setup as complete
    await this.markSetupComplete(orgId, 'blueprint', industryKey);
    log.push(`✓ Setup complete`);

    return { success: true, mode: 'blueprint', industry: industryKey, created, log };
  }

  /**
   * Safely adds any blueprint fields that are missing from already-installed modules.
   * Safe to call multiple times — skips existing fields, only adds new ones.
   * Also (re-)creates Relationship records from all LOOKUP fields.
   */
  async syncBlueprintFields(orgId: string) {
    const org = await this.prisma.organization.findUnique({ where: { id: orgId } });
    const settings = (org?.settings as any) ?? {};
    const industryKey = settings.industry;
    if (!industryKey) throw new BadRequestException('No blueprint installed for this organization');

    const blueprint = ALL_BLUEPRINTS[industryKey];
    if (!blueprint) throw new BadRequestException(`Blueprint "${industryKey}" not found`);

    const log: string[] = [];
    let totalAdded = 0;

    // Build moduleIdMap from existing modules in DB
    const moduleIdMap: Record<string, string> = {};
    for (const mod of blueprint.modules) {
      const slug = mod.slug.toLowerCase().replace(/[^a-z0-9_]/g, '_');
      const existing = await this.prisma.dynamicModule.findFirst({
        where: { organizationId: orgId, slug },
      });
      if (existing) moduleIdMap[mod.slug] = existing.id;
    }

    // Add missing fields to each module
    for (const mod of blueprint.modules) {
      const moduleId = moduleIdMap[mod.slug];
      if (!moduleId) { log.push(`  Module not found: ${mod.name}`); continue; }
      const added = await this.createFields(moduleId, orgId, mod.fields, moduleIdMap);
      totalAdded += added;
      if (added > 0) log.push(`✓ Added ${added} field(s) to: ${mod.name}`);
      else log.push(`  No new fields for: ${mod.name}`);
    }

    // Rebuild Relationship records from all LOOKUP fields
    const moduleIds = Object.values(moduleIdMap);
    const lookupFields = await this.prisma.field.findMany({
      where: { type: 'LOOKUP', moduleId: { in: moduleIds } },
      include: { module: { select: { name: true } } },
    });

    let relationshipsAdded = 0;
    for (const field of lookupFields) {
      const toModuleId = (field.settings as any)?.lookupModuleId;
      if (!toModuleId) continue;
      const toMod = await this.prisma.dynamicModule.findUnique({
        where: { id: toModuleId }, select: { name: true },
      });
      if (!toMod) continue;
      const exists = await this.prisma.relationship.findFirst({
        where: { fromModuleId: field.moduleId, toModuleId, fromFieldId: field.id, organizationId: orgId },
      });
      if (exists) continue;
      try {
        await this.prisma.relationship.create({
          data: {
            name:           `${field.module.name} → ${toMod.name}`,
            type:           'MANY_TO_ONE',
            fromModuleId:   field.moduleId,
            toModuleId,
            fromFieldId:    field.id,
            organizationId: orgId,
          },
        });
        relationshipsAdded++;
        log.push(`✓ Relationship: ${field.module.name} → ${toMod.name}`);
      } catch { /* already exists */ }
    }

    return {
      success: true,
      industry: industryKey,
      fieldsAdded: totalAdded,
      relationshipsAdded,
      log,
    };
  }

  // ── Private helpers ──────────────────────────────────────────────────────────

  private async createFields(
    moduleId: string,
    orgId: string,
    fields: BlueprintField[],
    moduleIdMap: Record<string, string> = {},
  ): Promise<number> {
    let count = 0;

    // Get current field count for ordering
    const existingCount = await this.prisma.field.count({ where: { moduleId } });

    for (let i = 0; i < fields.length; i++) {
      const f = fields[i];
      const fieldName = f.name.toLowerCase().replace(/[^a-z0-9_]/g, '_');

      // Skip if field already exists on this module
      const exists = await this.prisma.field.findFirst({
        where: { moduleId, name: fieldName },
      });
      if (exists) continue;

      try {
        // Resolve lookupModuleSlug → lookupModuleId for LOOKUP fields
        const resolvedSettings: Record<string, any> = { ...(f.settings ?? {}) };
        if (f.type === 'LOOKUP' && resolvedSettings.lookupModuleSlug) {
          const targetId = moduleIdMap[resolvedSettings.lookupModuleSlug];
          if (targetId) resolvedSettings.lookupModuleId = targetId;
          delete resolvedSettings.lookupModuleSlug;
        }

        const createdField = await this.prisma.field.create({
          data: {
            name:          fieldName,
            label:         f.label,
            type:          f.type as any,
            order:         existingCount + i,
            isRequired:    f.isRequired ?? false,
            isUnique:      f.isUnique ?? false,
            isReadonly:    false,
            isHidden:      false,
            isActive:      true,
            placeholder:   f.placeholder ?? null,
            helpText:      f.helpText ?? null,
            defaultValue:  f.defaultValue ?? null,
            settings:      resolvedSettings as any,
            moduleId,
          },
        });

        // Create options for dropdown/select fields
        if (f.options?.length) {
          await this.prisma.fieldOption.createMany({
            data: f.options.map((opt, oi) => ({
              fieldId: createdField.id,
              label:   opt.label,
              value:   opt.value,
              color:   opt.color ?? '#64748b',
              order:   oi,
            })),
            skipDuplicates: true,
          });
        }

        count++;
      } catch { /* field creation error — skip */ }
    }

    return count;
  }

  private async markSetupComplete(orgId: string, mode: string, industry: string | null) {
    const org = await this.prisma.organization.findUnique({ where: { id: orgId } });
    const settings = ((org?.settings ?? {}) as any);
    await this.prisma.organization.update({
      where: { id: orgId },
      data:  {
        settings: {
          ...settings,
          setupCompleted: true,
          setupMode:      mode,
          industry:       industry,
        } as any,
      },
    });
  }
}
