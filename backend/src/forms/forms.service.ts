import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { WorkflowsService } from '../workflows/workflows.service';
import { randomBytes } from 'crypto';

@Injectable()
export class FormsService {
  constructor(
    private prisma: PrismaService,
    private workflows: WorkflowsService,
  ) {}

  // ── Forms CRUD ──────────────────────────────────────────────────────────────

  async findAll(orgId: string) {
    return this.prisma.form.findMany({
      where: { organizationId: orgId, isActive: true },
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
    const slug = data.slug
      || data.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    return this.prisma.form.create({
      data: { ...data, slug, organizationId: orgId, createdById: userId },
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
    if (settings.isEnabled === false) throw new BadRequestException('FORM_CLOSED');
    const now = new Date();
    if (settings.startDate && new Date(settings.startDate) > now) {
      throw new BadRequestException('FORM_NOT_STARTED');
    }
    if (settings.endDate && new Date(settings.endDate) < now) {
      throw new BadRequestException('FORM_EXPIRED');
    }
    if (settings.submissionLimit) {
      const count = await this.prisma.formSubmission.count({ where: { formId: form.id } });
      if (count >= settings.submissionLimit) {
        throw new BadRequestException('FORM_LIMIT_REACHED');
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

    // If linked to a module and createRecord not explicitly disabled, create a module Record
    if (form.moduleId && settings.postSubmit?.createRecord !== false) {
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

          // Fill AUTO_NUMBER fields that were not submitted
          const allModuleFields = await this.prisma.field.findMany({
            where: { moduleId: form.moduleId, isActive: true, type: 'AUTO_NUMBER' },
          });
          for (const autoField of allModuleFields) {
            if (!recordData[autoField.name]) {
              recordData[autoField.name] = await this.generateAutoNumber(autoField, form.moduleId, form.organizationId);
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
          this.workflows
            .executeForRecord('RECORD_CREATED', form.moduleId, form.organizationId, newRecord)
            .catch(() => {});
        }
      } catch (err) {
        // Don't fail the submission if record creation fails — log and continue
        console.error('Failed to create module record from form submission:', err);
      }
    }

    return submission;
  }

  async getSubmissions(formId: string, orgId: string) {
    const form = await this.prisma.form.findFirst({ where: { id: formId, organizationId: orgId } });
    if (!form) throw new NotFoundException('Form not found');
    return this.prisma.formSubmission.findMany({
      where: { formId },
      orderBy: { createdAt: 'desc' },
    });
  }

  private async generateAutoNumber(field: any, moduleId: string, orgId: string): Promise<string> {
    const settings = (field.settings as any) || {};
    const prefix = settings.prefix || '';
    const suffix = settings.suffix || '';
    const startingNumber = settings.startingNumber ?? 1;
    const paddingLength = settings.paddingLength ?? 5;
    const count = await this.prisma.record.count({ where: { moduleId, organizationId: orgId } });
    const nextNum = count + startingNumber;
    const padded = String(nextNum).padStart(paddingLength, '0');
    return [prefix, padded, suffix].filter(Boolean).join('-');
  }
}
