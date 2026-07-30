import { Injectable, NotFoundException, ForbiddenException, BadRequestException, Optional } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { WorkflowsService } from '../workflows/workflows.service';
import { GoogleSheetsService } from '../calendar-sync/google-sheets.service';
import { BlueprintsService } from '../blueprints/blueprints.service';
import { RecordsService } from '../records/records.service';
import { signPrefillToken, verifyPrefillToken, PrefillTokenPayload } from '../records/prefill-link';
import { randomBytes } from 'crypto';
import Anthropic from '@anthropic-ai/sdk';

@Injectable()
export class FormsService {
  constructor(
    private prisma: PrismaService,
    private workflows: WorkflowsService,
    private blueprints: BlueprintsService,
    private records: RecordsService,
    @Optional() private googleSheets: GoogleSheetsService,
  ) {}

  // ── Forms CRUD ──────────────────────────────────────────────────────────────

  async findAll(orgId: string, userId: string, userRole: string) {
    return this.prisma.form.findMany({
      where: {
        organizationId: orgId,
        isActive: true,
        createdById: userId,
      },
      include: {
        module: { select: { id: true, name: true, slug: true, icon: true } },
        createdBy: { select: { id: true, firstName: true, lastName: true } },
        _count: { select: { fields: true, sections: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async findOne(id: string, orgId: string) {
    const form = await this.prisma.form.findFirst({
      where: { id, organizationId: orgId, isActive: true },
      include: {
        module: { select: { id: true, name: true, slug: true, icon: true } },
        createdBy: { select: { id: true, firstName: true, lastName: true } },
        sections: { orderBy: { order: 'asc' } },
        fields: {
          orderBy: { order: 'asc' },
          include: { section: true },
        },
        permissions: true,
      },
    });
    if (!form) throw new NotFoundException('Form not found');
    return form;
  }

  async create(orgId: string, userId: string, data: any) {
    let slug = data.slug
      || data.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
      || 'form';
    // Ensure slug is unique within org
    const slugExists = await this.prisma.form.findFirst({ where: { slug, organizationId: orgId, isActive: true } });
    if (slugExists) slug = `${slug}-${Date.now().toString(36)}`;
    // Strip empty-string FK fields — Prisma expects null, not ""
    const moduleId = data.moduleId || null;
    const folderId = data.folderId || null;
    return this.prisma.form.create({
      data: { ...data, moduleId, folderId, slug, organizationId: orgId, createdById: userId },
      include: {
        module: { select: { id: true, name: true, slug: true, icon: true } },
        createdBy: { select: { id: true, firstName: true, lastName: true } },
      },
    });
  }

  async update(id: string, orgId: string, data: any) {
    const form = await this.prisma.form.findFirst({ where: { id, organizationId: orgId } });
    if (!form) throw new NotFoundException('Form not found');
    return this.prisma.form.update({ where: { id }, data });
  }

  async remove(id: string, orgId: string) {
    const form = await this.prisma.form.findFirst({ where: { id, organizationId: orgId } });
    if (!form) throw new NotFoundException('Form not found');
    return this.prisma.form.update({ where: { id }, data: { isActive: false } });
  }

  // ── Sections ────────────────────────────────────────────────────────────────

  async addSection(formId: string, orgId: string, data: any) {
    const form = await this.prisma.form.findFirst({ where: { id: formId, organizationId: orgId } });
    if (!form) throw new NotFoundException('Form not found');
    const maxOrder = await this.prisma.formSection.aggregate({ where: { formId }, _max: { order: true } });
    const order = (maxOrder._max.order ?? -1) + 1;
    return this.prisma.formSection.create({ data: { ...data, formId, order } });
  }

  async updateSection(formId: string, orgId: string, sectionId: string, data: any) {
    const form = await this.prisma.form.findFirst({ where: { id: formId, organizationId: orgId } });
    if (!form) throw new NotFoundException('Form not found');
    return this.prisma.formSection.update({ where: { id: sectionId }, data });
  }

  async removeSection(formId: string, orgId: string, sectionId: string) {
    const form = await this.prisma.form.findFirst({ where: { id: formId, organizationId: orgId } });
    if (!form) throw new NotFoundException('Form not found');
    // Unassign form fields from this section
    await this.prisma.formField.updateMany({ where: { formId, sectionId }, data: { sectionId: null } });
    return this.prisma.formSection.delete({ where: { id: sectionId } });
  }

  // ── Form Fields ─────────────────────────────────────────────────────────────

  async addField(formId: string, orgId: string, data: any) {
    const form = await this.prisma.form.findFirst({ where: { id: formId, organizationId: orgId } });
    if (!form) throw new NotFoundException('Form not found');
    const maxOrder = await this.prisma.formField.aggregate({ where: { formId }, _max: { order: true } });
    const order = (maxOrder._max.order ?? -1) + 1;
    return this.prisma.formField.create({ data: { ...data, formId, order } });
  }

  async updateField(formId: string, orgId: string, formFieldId: string, data: any) {
    const form = await this.prisma.form.findFirst({ where: { id: formId, organizationId: orgId } });
    if (!form) throw new NotFoundException('Form not found');
    return this.prisma.formField.update({ where: { id: formFieldId }, data });
  }

  async removeField(formId: string, orgId: string, formFieldId: string) {
    const form = await this.prisma.form.findFirst({ where: { id: formId, organizationId: orgId } });
    if (!form) throw new NotFoundException('Form not found');
    return this.prisma.formField.delete({ where: { id: formFieldId } });
  }

  async reorderFields(formId: string, orgId: string, formFieldIds: string[]) {
    const form = await this.prisma.form.findFirst({ where: { id: formId, organizationId: orgId } });
    if (!form) throw new NotFoundException('Form not found');
    await Promise.all(
      formFieldIds.map((fId, index) => this.prisma.formField.update({ where: { id: fId }, data: { order: index } }))
    );
    return { success: true };
  }

  // ── Permissions ──────────────────────────────────────────────────────────────

  async getPermissions(formId: string, orgId: string) {
    const form = await this.prisma.form.findFirst({ where: { id: formId, organizationId: orgId } });
    if (!form) throw new NotFoundException('Form not found');
    return this.prisma.formPermission.findMany({ where: { formId, organizationId: orgId } });
  }

  async setPermission(formId: string, orgId: string, data: any) {
    const form = await this.prisma.form.findFirst({ where: { id: formId, organizationId: orgId } });
    if (!form) throw new NotFoundException('Form not found');
    return this.prisma.formPermission.upsert({
      where: { formId_role_organizationId: { formId, role: data.role, organizationId: orgId } },
      create: { ...data, formId, organizationId: orgId },
      update: data,
    });
  }

  // ── Module field picker (get available module fields not yet in form) ────────

  async getModuleFields(formId: string, orgId: string) {
    const form = await this.prisma.form.findFirst({
      where: { id: formId, organizationId: orgId },
      include: { fields: true },
    });
    if (!form) throw new NotFoundException('Form not found');
    if (!form.moduleId) return [];

    const usedFieldIds = form.fields.map(f => f.fieldId);
    return this.prisma.field.findMany({
      where: {
        moduleId: form.moduleId,
        isActive: true,
        id: { notIn: usedFieldIds },
      },
      include: { options: true },
      orderBy: { order: 'asc' },
    });
  }

  // ── Public Token ──────────────────────────────────────────────────────────────

  async generateToken(formId: string, orgId: string) {
    const form = await this.prisma.form.findFirst({ where: { id: formId, organizationId: orgId } });
    if (!form) throw new NotFoundException('Form not found');
    const token = randomBytes(20).toString('hex');
    return this.prisma.form.update({ where: { id: formId }, data: { token, type: 'PUBLIC' } });
  }

  async revokeToken(formId: string, orgId: string) {
    const form = await this.prisma.form.findFirst({ where: { id: formId, organizationId: orgId } });
    if (!form) throw new NotFoundException('Form not found');
    return this.prisma.form.update({ where: { id: formId }, data: { token: null } });
  }

  // ── Public form access (no auth) ─────────────────────────────────────────────

  async getPublicForm(token: string) {
    const form = await this.prisma.form.findFirst({
      where: { token, isActive: true },
      include: {
        module: { select: { id: true, name: true, slug: true, icon: true } },
        sections: { orderBy: { order: 'asc' } },
        fields: {
          orderBy: { order: 'asc' },
          include: { section: true },
        },
      },
    });
    if (!form) throw new NotFoundException('Form not found or no longer available');

    const settings = form.settings as any;

    // Availability checks
    const unavailableMessage = settings.unavailableMessage || '';
    if (settings.isEnabled === false) throw new BadRequestException({ code: 'FORM_CLOSED', unavailableMessage });
    const now = new Date();
    if (settings.startDate && new Date(settings.startDate) > now) {
      throw new BadRequestException({ code: 'FORM_NOT_STARTED', unavailableMessage });
    }
    if (settings.endDate && new Date(settings.endDate) < now) {
      throw new BadRequestException({ code: 'FORM_EXPIRED', unavailableMessage });
    }
    if (settings.submissionLimit) {
      const count = await this.prisma.formSubmission.count({ where: { formId: form.id } });
      if (count >= settings.submissionLimit) {
        throw new BadRequestException({ code: 'FORM_LIMIT_REACHED', unavailableMessage });
      }
    }

    // Resolve module fields for form fields
    if (form.moduleId) {
      const moduleFields = await this.prisma.field.findMany({
        where: { moduleId: form.moduleId, isActive: true },
        include: { options: true },
        orderBy: { order: 'asc' },
      });
      const fieldMap = Object.fromEntries(moduleFields.map(f => [f.id, f]));
      return {
        ...form,
        resolvedFields: form.fields.map(ff => ({
          ...ff,
          moduleField: fieldMap[ff.fieldId],
        })),
      };
    }

    return form;
  }

  // Integration Field search for a public (unauthenticated) form — the field's
  // presence on this specific published form IS the authorization boundary: a
  // visitor can only search whatever the form builder actually placed here,
  // never an arbitrary fieldId for some other module.
  //
  // Two shapes of form carry an Integration Field differently: module-backed
  // forms have a real FormField -> Field row (checked via form.fields); a
  // standalone form has no Field row at all — its config lives inline as a
  // CustomFieldDef inside Form.settings.customFields, matched by id instead.
  async publicIntegrationSearch(token: string, fieldId: string, search: string, page = 1, pageSize = 20, searchFieldName?: string) {
    const form = await this.prisma.form.findFirst({
      where: { token, isActive: true },
      include: { fields: true },
    });
    if (!form) throw new NotFoundException('Form not found or no longer available');

    const belongsToForm = form.fields.some(ff => ff.fieldId === fieldId);
    if (belongsToForm) {
      return this.records.integrationSearch(form.organizationId, fieldId, search, page, pageSize, searchFieldName);
    }

    const customFields: any[] = (form.settings as any)?.customFields ?? [];
    const cf = customFields.find(c => c.id === fieldId && c.type === 'INTEGRATION');
    if (!cf) throw new ForbiddenException('This field is not available on this form');

    return this.records.integrationSearchWithConfig(form.organizationId, cf.settings ?? {}, search, page, pageSize, searchFieldName);
  }

  // ── Prefilled form links ("Send Form Link" from a record's detail page) ─────
  // Generates a signed link that, when opened, prefills the form's Integration
  // Field mapping from a specific record — and, unlike a manual search-select,
  // marks the submission to UPDATE that record instead of creating a new one.

  async getPrefillCandidateForms(orgId: string, moduleId: string) {
    const forms = await this.prisma.form.findMany({
      where: { organizationId: orgId, isActive: true },
      include: { fields: true },
    });

    const allFieldIds = Array.from(new Set(forms.flatMap(f => f.fields.map(ff => ff.fieldId))));
    const integrationFields = allFieldIds.length
      ? await this.prisma.field.findMany({ where: { id: { in: allFieldIds }, type: 'INTEGRATION' } })
      : [];
    const integrationFieldById = new Map(integrationFields.map(f => [f.id, f]));

    const candidates: { formId: string; formName: string; integrationFieldId: string }[] = [];
    for (const form of forms) {
      const moduleBackedMatch = form.fields
        .map(ff => integrationFieldById.get(ff.fieldId))
        .find(f => f && (f.settings as any)?.sourceModuleId === moduleId);
      if (moduleBackedMatch) {
        candidates.push({ formId: form.id, formName: form.name, integrationFieldId: moduleBackedMatch.id });
        continue;
      }

      const customFields: any[] = (form.settings as any)?.customFields ?? [];
      const cf = customFields.find(c => c.type === 'INTEGRATION' && c.settings?.sourceModuleId === moduleId);
      if (cf) candidates.push({ formId: form.id, formName: form.name, integrationFieldId: cf.id });
    }
    return candidates;
  }

  async generatePrefillLink(orgId: string, formId: string, integrationFieldId: string, recordId: string) {
    const form = await this.prisma.form.findFirst({ where: { id: formId, organizationId: orgId }, include: { fields: true } });
    if (!form) throw new NotFoundException('Form not found');

    const belongsToForm = form.fields.some(ff => ff.fieldId === integrationFieldId);
    const cfg = belongsToForm
      ? await this.records.resolveIntegrationField(integrationFieldId, orgId)
      : await (async () => {
          const customFields: any[] = (form.settings as any)?.customFields ?? [];
          const cf = customFields.find(c => c.id === integrationFieldId && c.type === 'INTEGRATION');
          if (!cf) throw new NotFoundException('Integration field not found on this form');
          return this.records.resolveIntegrationSettings(cf.settings ?? {}, orgId);
        })();

    const record = await this.prisma.record.findFirst({
      where: { id: recordId, moduleId: cfg.sourceModuleId, organizationId: orgId, isDeleted: false },
    });
    if (!record) throw new NotFoundException('Record not found in the source module');

    let token = form.token;
    if (!token) {
      const updated = await this.generateToken(form.id, orgId);
      token = updated.token;
    }

    const prefillToken = signPrefillToken({
      formId: form.id,
      integrationFieldId,
      recordId,
      sourceModuleId: cfg.sourceModuleId,
      orgId,
    });

    const base = (process.env.FRONTEND_URL || 'http://localhost:3000').split(',')[0];
    return { url: `${base}/f/${token}?prefillToken=${prefillToken}` };
  }

  async resolvePrefillToken(formToken: string, prefillToken: string) {
    let payload: PrefillTokenPayload;
    try {
      payload = verifyPrefillToken(prefillToken);
    } catch {
      throw new BadRequestException('This link has expired or is invalid');
    }

    const form = await this.prisma.form.findFirst({ where: { token: formToken, isActive: true } });
    if (!form || form.id !== payload.formId || form.organizationId !== payload.orgId) {
      throw new NotFoundException('Form not found or no longer available');
    }

    const record = await this.prisma.record.findFirst({
      where: { id: payload.recordId, moduleId: payload.sourceModuleId, organizationId: form.organizationId, isDeleted: false },
    });
    if (!record) throw new NotFoundException('The linked record is no longer available');

    const sourceFields = await this.prisma.field.findMany({
      where: { moduleId: payload.sourceModuleId },
      select: { id: true, name: true, label: true },
    });

    return {
      integrationFieldId: payload.integrationFieldId,
      recordId: record.id,
      recordData: record.data,
      sourceFields,
    };
  }

  // Validates a client-claimed "I picked this record via manual search,
  // update it too" signal (data.__integrationManualUpdate = {fieldId,
  // recordId}). Never trusted at face value — the field must actually
  // belong to this form AND have allowManualUpdate explicitly enabled in its
  // own settings (an admin's conscious choice, since this is a much bigger
  // authorization surface than a prefill link: any visitor on a public form
  // could otherwise search for and silently overwrite an arbitrary record).
  private async resolveManualUpdateTarget(
    form: { id: string; organizationId: string; settings: any },
    data: any,
  ): Promise<{ integrationFieldId: string; recordId: string; sourceModuleId: string } | null> {
    const manual = data.__integrationManualUpdate;
    if (!manual?.fieldId || !manual?.recordId) return null;

    try {
      const formField = await this.prisma.formField.findFirst({ where: { formId: form.id, fieldId: manual.fieldId } });
      const cfg = formField
        ? await this.records.resolveIntegrationField(manual.fieldId, form.organizationId)
        : await (async () => {
            const customFields: any[] = (form.settings as any)?.customFields ?? [];
            const cf = customFields.find((c: any) => c.id === manual.fieldId && c.type === 'INTEGRATION');
            if (!cf) return null;
            return this.records.resolveIntegrationSettings(cf.settings ?? {}, form.organizationId);
          })();
      if (!cfg?.allowManualUpdate) return null;

      const record = await this.prisma.record.findFirst({
        where: { id: manual.recordId, moduleId: cfg.sourceModuleId, organizationId: form.organizationId, isDeleted: false },
      });
      if (!record) return null;

      return { integrationFieldId: manual.fieldId, recordId: manual.recordId, sourceModuleId: cfg.sourceModuleId };
    } catch {
      return null;
    }
  }

  // Resolves an Integration field's mapping list to source/destination field
  // NAMES for the write-back step at submit time — mirrors the read of the
  // same mappings the builder's IntegrationMappingEditor writes, just from
  // the opposite side (submission -> source record instead of source record
  // -> form fields).
  private async resolveIntegrationWriteback(form: { id: string; settings: any }, integrationFieldId: string, sourceModuleId: string) {
    const sourceModuleFields = await this.prisma.field.findMany({
      where: { moduleId: sourceModuleId },
      select: { id: true, name: true },
    });
    const sourceNameById = new Map(sourceModuleFields.map(f => [f.id, f.name]));

    let mappings: { sourceFieldId: string; destinationFormFieldId: string; behavior: string }[] = [];
    let destNameById = new Map<string, string>();

    const formField = await this.prisma.formField.findFirst({ where: { formId: form.id, fieldId: integrationFieldId } });
    if (formField) {
      mappings = (formField.conditionalLogic as any)?.integrationMappings || [];
      const allFormFields = await this.prisma.formField.findMany({ where: { formId: form.id } });
      const fieldIds = allFormFields.map(f => f.fieldId).filter(Boolean);
      const fields = await this.prisma.field.findMany({ where: { id: { in: fieldIds } }, select: { id: true, name: true } });
      const nameByFieldId = new Map(fields.map(f => [f.id, f.name]));
      destNameById = new Map(allFormFields.map(ff => [ff.id, nameByFieldId.get(ff.fieldId) || ''] as [string, string]));
    } else {
      const customFields: any[] = (form.settings as any)?.customFields || [];
      const cf = customFields.find((c: any) => c.id === integrationFieldId);
      mappings = cf?.integrationMappings || [];
      destNameById = new Map(customFields.map((c: any) => [c.id, c.name] as [string, string]));
    }

    return mappings
      .map(m => ({
        sourceFieldName: sourceNameById.get(m.sourceFieldId) || '',
        destinationFieldName: destNameById.get(m.destinationFormFieldId) || '',
        behavior: m.behavior,
      }))
      .filter(m => m.sourceFieldName && m.destinationFieldName);
  }

  async submitPublicForm(token: string, data: any, ipAddress?: string, userAgent?: string) {
    const form = await this.prisma.form.findFirst({ where: { token, isActive: true } });
    if (!form) throw new NotFoundException('Form not found');

    const settings = form.settings as any;
    if (settings.isEnabled === false) throw new BadRequestException('FORM_CLOSED');
    const now = new Date();
    if (settings.startDate && new Date(settings.startDate) > now) throw new BadRequestException('FORM_NOT_STARTED');
    if (settings.endDate && new Date(settings.endDate) < now) throw new BadRequestException('FORM_EXPIRED');
    if (settings.submissionLimit) {
      const count = await this.prisma.formSubmission.count({ where: { formId: form.id } });
      if (count >= settings.submissionLimit) throw new BadRequestException('FORM_LIMIT_REACHED');
    }

    const submission = await this.prisma.formSubmission.create({
      data: { formId: form.id, data, ipAddress, userAgent },
    });

    // Resolve what (if anything) ties this submission to a specific CRM
    // record via an Integration Field — decides further down whether to
    // update that record instead of (or in addition to) the form's normal
    // create/update behavior. Two ways this can happen:
    //  1. A signed prefill-link token — always honored; the link itself
    //     proves an internal user chose this record ahead of time.
    //  2. A manual search-and-select made during THIS submission — only
    //     honored when the field's own config explicitly opts in
    //     (allowManualUpdate), since otherwise any visitor on a public form
    //     could search for and silently overwrite an arbitrary record.
    let integrationPrefill: PrefillTokenPayload | null = null;
    if (data.__integrationPrefillToken) {
      try {
        const decoded = verifyPrefillToken(data.__integrationPrefillToken);
        if (decoded.formId === form.id && decoded.orgId === form.organizationId) integrationPrefill = decoded;
      } catch {
        // Expired/invalid/tampered token — ignore and submit normally.
      }
    }
    const manualUpdateTarget = integrationPrefill ? null : await this.resolveManualUpdateTarget(form, data);
    const writebackTarget: { integrationFieldId: string; recordId: string; sourceModuleId: string } | null =
      integrationPrefill
        ? { integrationFieldId: integrationPrefill.integrationFieldId, recordId: integrationPrefill.recordId, sourceModuleId: integrationPrefill.sourceModuleId }
        : manualUpdateTarget;

    // Touch a module Record when either: createRecord is allowed to create
    // one, or "update if found" is configured — the latter must still run
    // (and update a match) even when createRecord is off, since "only
    // update, never create" is a legitimate configuration on its own.
    const postSubmitCfg = settings.postSubmit || {};
    if (form.moduleId && (postSubmitCfg.createRecord !== false || postSubmitCfg.mode === 'update')) {
      try {
        // Find a system user (first SUPER_ADMIN or ADMIN in the org) to attribute the record to
        const systemUser = await this.prisma.user.findFirst({
          where: { organizationId: form.organizationId, role: { in: ['SUPER_ADMIN', 'ADMIN'] }, isActive: true },
          orderBy: { createdAt: 'asc' },
          select: { id: true },
        });

        if (systemUser) {
          // Resolve formField.fieldId → field.name mapping
          const formFields = await this.prisma.formField.findMany({ where: { formId: form.id } });
          const fieldIds = formFields.map(ff => ff.fieldId).filter(Boolean);
          const moduleFields = await this.prisma.field.findMany({
            where: { id: { in: fieldIds } },
            select: { id: true, name: true },
          });
          const fieldNameMap = Object.fromEntries(moduleFields.map(f => [f.id, f.name]));

          // Build field-name-keyed record data
          const recordData: Record<string, any> = {};
          for (const ff of formFields) {
            const fieldName = fieldNameMap[ff.fieldId];
            if (!fieldName) continue;
            if (data[fieldName] !== undefined) {
              recordData[fieldName] = data[fieldName];
            }
          }

          // Determine whether this submission should update an existing record
          // instead of creating a duplicate. Two ways to match, checked in order:
          //  1. The form auto-filled from a lookup the visitor selected — an
          //     explicit, user-confirmed match, always honored if present.
          //  2. An admin-configured "update if found" match field (e.g. email).
          const postSubmit = settings.postSubmit || {};
          let existingRecord: { id: string; data: any } | null = null;

          // Also honor a prefill-link/manual-update record when it targets
          // this same form's own module — same code path as an explicit
          // lookup-selected match, avoiding a second, separate write to the
          // same record below.
          const matchedRecordId: string | undefined = data.__matchedRecordId ||
            (writebackTarget && writebackTarget.sourceModuleId === form.moduleId ? writebackTarget.recordId : undefined);
          if (matchedRecordId) {
            existingRecord = await this.prisma.record.findFirst({
              where: { id: matchedRecordId, moduleId: form.moduleId, organizationId: form.organizationId, isDeleted: false },
              select: { id: true, data: true },
            });
          } else if (postSubmit.mode === 'update' && postSubmit.matchField) {
            const matchValue = recordData[postSubmit.matchField];
            if (matchValue !== undefined && matchValue !== null && matchValue !== '') {
              const candidates = await this.prisma.record.findMany({
                where: { moduleId: form.moduleId, organizationId: form.organizationId, isDeleted: false },
                select: { id: true, data: true },
              });
              existingRecord = candidates.find(
                r => String((r.data as any)?.[postSubmit.matchField]) === String(matchValue),
              ) ?? null;
            }
          }

          let recordId: string | undefined;
          if (existingRecord) {
            const mergedData = { ...(existingRecord.data as any), ...recordData };
            const updated = await this.prisma.record.update({
              where: { id: existingRecord.id },
              data: { data: mergedData, updatedById: systemUser.id },
            });
            recordId = updated.id;
            this.workflows
              .executeForRecord('RECORD_UPDATED', form.moduleId, form.organizationId, updated, existingRecord.data)
              .catch(() => {});
            this.workflows
              .executeForRecord('FIELD_CHANGED', form.moduleId, form.organizationId, updated, existingRecord.data)
              .catch(() => {});
          } else if (postSubmit.createRecord !== false) {
            // Fill AUTO_NUMBER fields that were not submitted
            const allModuleFields = await this.prisma.field.findMany({
              where: { moduleId: form.moduleId, isActive: true, type: 'AUTO_NUMBER' },
            });
            for (const autoField of allModuleFields) {
              if (!recordData[autoField.name]) {
                recordData[autoField.name] = await this.records.generateAutoNumber(autoField, form.moduleId, form.organizationId);
              }
            }

            const newRecord = await this.prisma.record.create({
              data: {
                moduleId: form.moduleId,
                organizationId: form.organizationId,
                createdById: systemUser.id,
                data: recordData,
              },
            });
            recordId = newRecord.id;
            this.workflows
              .executeForRecord('RECORD_CREATED', form.moduleId, form.organizationId, newRecord)
              .catch(() => {});
          }
          // else: "update if found" is on, createRecord is off, and no match
          // was found — nothing to do. The submission itself was still saved
          // above; we just don't touch the module's Record table.

          if (recordId) {
            this.blueprints
              .evaluateAutomaticTransitions(
                recordId, form.organizationId, systemUser.id, 'on_form_submit',
                [], existingRecord ? (existingRecord.data as any) : undefined,
              )
              .catch(() => {});
          }
        }
      } catch (err) {
        // Don't fail the submission if record creation fails — log and continue
        console.error('Failed to create module record from form submission:', err);
      }
    }

    // Write-back — pushes the (possibly edited) mapped values back into the
    // record a prefill-link or opt-in manual selection pointed at. Skipped
    // when that record's module IS this form's own module: the block above
    // already updated it via matchedRecordId, so writing again here would be
    // redundant.
    if (writebackTarget && writebackTarget.sourceModuleId !== form.moduleId) {
      try {
        const resolvedMappings = await this.resolveIntegrationWriteback(
          form, writebackTarget.integrationFieldId, writebackTarget.sourceModuleId,
        );
        if (resolvedMappings.length > 0) {
          const sourceRecord = await this.prisma.record.findFirst({
            where: {
              id: writebackTarget.recordId,
              moduleId: writebackTarget.sourceModuleId,
              organizationId: form.organizationId,
              isDeleted: false,
            },
          });
          if (sourceRecord) {
            const updatedData: Record<string, any> = { ...(sourceRecord.data as any) };
            for (const m of resolvedMappings) {
              const submittedValue = data[m.destinationFieldName];
              if (submittedValue === undefined) continue;
              if (m.behavior === 'UPDATE_EXISTING') {
                updatedData[m.sourceFieldName] = submittedValue;
              } else {
                const current = updatedData[m.sourceFieldName];
                if (current === null || current === undefined || current === '') {
                  updatedData[m.sourceFieldName] = submittedValue;
                }
              }
            }

            const systemUser = await this.prisma.user.findFirst({
              where: { organizationId: form.organizationId, role: { in: ['SUPER_ADMIN', 'ADMIN'] }, isActive: true },
              orderBy: { createdAt: 'asc' },
              select: { id: true },
            });

            const updatedRecord = await this.prisma.record.update({
              where: { id: sourceRecord.id },
              data: { data: updatedData, updatedById: systemUser?.id },
            });
            this.workflows
              .executeForRecord('RECORD_UPDATED', writebackTarget.sourceModuleId, form.organizationId, updatedRecord, sourceRecord.data)
              .catch(() => {});
            this.workflows
              .executeForRecord('FIELD_CHANGED', writebackTarget.sourceModuleId, form.organizationId, updatedRecord, sourceRecord.data)
              .catch(() => {});
          }
        }
      } catch (err) {
        console.error('Failed to write back integration mapping:', err);
      }
    }

    // Ticketing — generate ticket number if enabled
    const ticketingSettings = (form.settings as any)?.ticketing;
    let ticketNumber: string | undefined;
    if (ticketingSettings?.enabled) {
      const prefix = (ticketingSettings.prefix || 'TKT').toUpperCase();
      const count = await this.prisma.formSubmission.count({ where: { formId: form.id } });
      const start = Number(ticketingSettings.startNumber || 1);
      const padded = String(start + count).padStart(4, '0');
      ticketNumber = `${prefix}-${padded}`;
      await this.prisma.$executeRaw`UPDATE form_submissions SET ticketNumber = ${ticketNumber} WHERE id = ${submission.id}`;
    }

    // Google Sheets sync (fire-and-forget)
    const gsSettings = (form.settings as any)?.googleSheet;
    if (this.googleSheets && gsSettings?.syncEnabled && gsSettings?.spreadsheetId) {
      this.syncToGoogleSheets(form, gsSettings, data, submission.createdAt).catch(() => {});
    }

    return { ...submission, ticketNumber };
  }

  private async syncToGoogleSheets(form: any, gsSettings: any, data: any, submittedAt: Date) {
    const formFields = await this.prisma.formField.findMany({
      where: { formId: form.id },
      orderBy: { order: 'asc' },
    });

    const fieldIds = formFields.map(ff => ff.fieldId).filter(Boolean);
    const fields   = await this.prisma.field.findMany({
      where: { id: { in: fieldIds } },
      select: { id: true, name: true, label: true },
    });
    const fieldMap = new Map(fields.map(f => [f.id, f]));

    const mappedFields = formFields.map(ff => {
      const field = fieldMap.get(ff.fieldId);
      return {
        label: ff.customLabel || field?.label || field?.name || ff.fieldId,
        name:  field?.name   || ff.fieldId,
      };
    });

    await this.googleSheets.appendSubmission(
      form.createdById,
      gsSettings.spreadsheetId,
      gsSettings.tabName || 'Form Responses',
      mappedFields,
      data,
      submittedAt,
    );
  }

  async extractDocument(token: string, fileBase64: string, mediaType: string) {
    const form = await this.prisma.form.findFirst({
      where: { token, isActive: true },
      include: {
        fields: { orderBy: { order: 'asc' } },
      },
    });
    if (!form) throw new NotFoundException('Form not found');

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new BadRequestException('Document extraction is not configured');

    // Resolve module fields WITH options so we can embed them in the prompt
    const fieldIds = (form.fields as any[]).map(ff => ff.fieldId).filter(Boolean);
    const moduleFields = fieldIds.length
      ? await this.prisma.field.findMany({
          where: { id: { in: fieldIds } },
          select: { id: true, name: true, label: true, type: true, options: { select: { value: true, label: true } } },
        })
      : [];
    const fieldMap = Object.fromEntries(moduleFields.map(f => [f.id, f]));

    const OPTION_TYPES = new Set(['RADIO', 'SELECT', 'DROPDOWN', 'STATUS', 'MULTI_SELECT']);

    const fieldDescriptions = (form.fields as any[])
      .map((ff: any) => {
        const f = fieldMap[ff.fieldId];
        const label = ff.customLabel || f?.label || f?.name || ff.fieldId;
        const key = f?.name || ff.fieldId;
        if (f && OPTION_TYPES.has(f.type) && f.options?.length) {
          const optList = f.options.map((o: any) => `"${o.value}"`).join(', ');
          return `- "${key}" (${label}) [MUST be one of: ${optList}]`;
        }
        return `- "${key}" (${label})`;
      })
      .join('\n');

    const anthropic = new Anthropic({ apiKey });

    const isImage = mediaType.startsWith('image/');
    const contentBlocks: any[] = [
      {
        type: isImage ? 'image' : 'document',
        source: {
          type: 'base64',
          media_type: mediaType,
          data: fileBase64,
        },
      },
      {
        type: 'text',
        text: `Extract values for the following form fields from the document above. Return ONLY a JSON object where keys are the field names and values are the extracted text. Rules:\n- If a field value cannot be found, omit it entirely.\n- For fields marked [MUST be one of: ...], return ONLY one of the listed values exactly as written — do not paraphrase.\n- Do not add any explanation, just the JSON.\n\nFields:\n${fieldDescriptions}`,
      },
    ];

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      messages: [{ role: 'user', content: contentBlocks }],
    });

    const raw = (response.content[0] as any)?.text || '{}';
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    let fieldValues: Record<string, any> = {};
    if (jsonMatch) {
      try { fieldValues = JSON.parse(jsonMatch[0]); } catch { /* ignore */ }
    }

    return { fieldValues };
  }

  async getSubmissions(formId: string, orgId: string) {
    const form = await this.prisma.form.findFirst({ where: { id: formId, organizationId: orgId } });
    if (!form) throw new NotFoundException('Form not found');
    return this.prisma.formSubmission.findMany({
      where: { formId },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ── Folders ──────────────────────────────────────────────────────────────────

  async getFolders(orgId: string, userId: string, userRole: string, deptId: string | null) {
    const all = await this.prisma.formFolder.findMany({
      where: { organizationId: orgId, isActive: true },
      include: { _count: { select: { forms: true } } },
      orderBy: { createdAt: 'desc' },
    });
    return all.filter(f => {
      if (f.createdById === userId) return true;
      const users: string[] = f.sharedUsers as any;
      const depts: string[] = f.sharedDepts as any;
      return (
        users.includes(userId) ||
        (deptId && depts.includes(deptId))
      );
    });
  }

  async createFolder(orgId: string, userId: string, data: any) {
    return this.prisma.formFolder.create({
      data: { ...data, organizationId: orgId, createdById: userId },
      include: { _count: { select: { forms: true } } },
    });
  }

  async updateFolder(id: string, orgId: string, userId: string, userRole: string, data: any) {
    const folder = await this.prisma.formFolder.findFirst({ where: { id, organizationId: orgId } });
    if (!folder) throw new NotFoundException('Folder not found');
    const isAdmin = ['SUPER_ADMIN', 'ADMIN'].includes(userRole);
    if (!isAdmin && folder.createdById !== userId) throw new ForbiddenException();
    return this.prisma.formFolder.update({
      where: { id },
      data,
      include: { _count: { select: { forms: true } } },
    });
  }

  async deleteFolder(id: string, orgId: string, userId: string, userRole: string) {
    const folder = await this.prisma.formFolder.findFirst({ where: { id, organizationId: orgId } });
    if (!folder) throw new NotFoundException('Folder not found');
    const isAdmin = ['SUPER_ADMIN', 'ADMIN'].includes(userRole);
    if (!isAdmin && folder.createdById !== userId) throw new ForbiddenException();
    // Unassign forms from this folder
    await this.prisma.form.updateMany({ where: { folderId: id }, data: { folderId: null } });
    return this.prisma.formFolder.update({ where: { id }, data: { isActive: false } });
  }

  async getFolderForms(folderId: string, orgId: string) {
    return this.prisma.form.findMany({
      where: { folderId, organizationId: orgId, isActive: true },
      include: { createdBy: { select: { id: true, firstName: true, lastName: true } }, _count: { select: { submissions: true } } },
      orderBy: { updatedAt: 'desc' },
    });
  }

  // ── Shared forms (forms shared with this user but not owned by them) ──────────

  async getSharedForms(orgId: string, userId: string, userRole: string, deptId: string | null) {
    const all = await this.prisma.form.findMany({
      where: { organizationId: orgId, isActive: true, NOT: { createdById: userId } },
      include: {
        createdBy: { select: { id: true, firstName: true, lastName: true } },
        _count: { select: { submissions: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });
    return all.filter(f => {
      const su: string[] = (f.sharedUsers as any) || [];
      const sd: string[] = (f.sharedDepts as any) || [];
      return (
        su.includes(userId) ||
        (deptId && sd.includes(deptId))
      );
    });
  }

  // ── Shared folders (folders shared with this user but not owned by them) ──────

  async getSharedFolders(orgId: string, userId: string, userRole: string, deptId: string | null) {
    const all = await this.prisma.formFolder.findMany({
      where: { organizationId: orgId, isActive: true, NOT: { createdById: userId } },
      include: {
        createdBy: { select: { id: true, firstName: true, lastName: true } },
        _count: { select: { forms: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    return all.filter(f => {
      const su: string[] = (f.sharedUsers as any) || [];
      const sd: string[] = (f.sharedDepts as any) || [];
      return (
        su.includes(userId) ||
        (deptId && sd.includes(deptId))
      );
    });
  }

  // ── Form sharing settings ─────────────────────────────────────────────────────

  async updateFormSharing(formId: string, orgId: string, userId: string, userRole: string, data: {
    sharedUsers?: string[]; sharedDepts?: string[]; sharedRoles?: string[];
    editableByUsers?: string[]; editableByDepts?: string[]; editableByRoles?: string[];
  }) {
    const form = await this.prisma.form.findFirst({ where: { id: formId, organizationId: orgId } });
    if (!form) throw new NotFoundException('Form not found');
    const isAdmin = ['SUPER_ADMIN', 'ADMIN'].includes(userRole);
    if (!isAdmin && form.createdById !== userId) throw new ForbiddenException();
    // Merge into settings JSON for edit permissions, direct fields for view sharing
    const currentSettings = (form.settings as any) || {};
    const newSettings = {
      ...currentSettings,
      editableByUsers: data.editableByUsers ?? currentSettings.editableByUsers ?? [],
      editableByDepts: data.editableByDepts ?? currentSettings.editableByDepts ?? [],
      editableByRoles: data.editableByRoles ?? currentSettings.editableByRoles ?? [],
    };
    return this.prisma.form.update({
      where: { id: formId },
      data: {
        sharedUsers: data.sharedUsers !== undefined ? data.sharedUsers : (form.sharedUsers as any),
        sharedDepts: data.sharedDepts !== undefined ? data.sharedDepts : (form.sharedDepts as any),
        sharedRoles: data.sharedRoles !== undefined ? data.sharedRoles : (form.sharedRoles as any),
        settings: newSettings,
      },
    });
  }

  async getFormSharing(formId: string, orgId: string) {
    const form = await this.prisma.form.findFirst({
      where: { id: formId, organizationId: orgId },
      select: { id: true, sharedUsers: true, sharedDepts: true, sharedRoles: true, settings: true, createdById: true },
    });
    if (!form) throw new NotFoundException('Form not found');
    const settings = (form.settings as any) || {};
    return {
      sharedUsers: (form.sharedUsers as any) || [],
      sharedDepts: (form.sharedDepts as any) || [],
      sharedRoles: (form.sharedRoles as any) || [],
      editableByUsers: settings.editableByUsers || [],
      editableByDepts: settings.editableByDepts || [],
      editableByRoles: settings.editableByRoles || [],
    };
  }

}
