import { Injectable, NotFoundException, InternalServerErrorException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateModuleDto } from './dto/create-module.dto';
import { UpdateModuleDto } from './dto/update-module.dto';

@Injectable()
export class ModulesService {
  private readonly logger = new Logger(ModulesService.name);

  constructor(private prisma: PrismaService) {}

  async create(orgId: string, dto: CreateModuleDto) {
    return this.prisma.dynamicModule.create({
      data: { ...dto, organizationId: orgId },
      include: { fields: { orderBy: { order: 'asc' } } },
    });
  }

  async findAllPlatform() {
    try {
      return await this.prisma.dynamicModule.findMany({
        where: { isActive: true },
        include: {
          fields: {
            where: { isActive: true },
            orderBy: { order: 'asc' },
            include: { options: { orderBy: { order: 'asc' } } },
          },
          _count: { select: { fields: true, forms: true, records: true } },
        },
        orderBy: { order: 'asc' },
      });
    } catch (err) {
      this.logger.error('findAllPlatform modules error:', err);
      return [];
    }
  }

  async findAll(orgId: string) {
    try {
      return await this.prisma.dynamicModule.findMany({
        where: { organizationId: orgId, isActive: true },
        include: {
          fields: {
            where: { isActive: true },
            orderBy: { order: 'asc' },
            include: { options: { orderBy: { order: 'asc' } } },
          },
          _count: { select: { fields: true, forms: true, records: true } },
        },
        orderBy: { order: 'asc' },
      });
    } catch (err) {
      this.logger.error('findAll modules error:', err);
      return [];
    }
  }

  async findOne(id: string, orgId: string) {
    try {
      const mod = await this.prisma.dynamicModule.findFirst({
        where: { id, organizationId: orgId },
        include: {
          fields: {
            where: { isActive: true },
            orderBy: { order: 'asc' },
            include: { options: { orderBy: { order: 'asc' } } },
          },
        },
      });
      if (!mod) throw new NotFoundException('Module not found');
      return mod;
    } catch (err) {
      if (err instanceof NotFoundException) throw err;
      this.logger.error(`findOne module ${id} error:`, err);
      throw new InternalServerErrorException(
        'Failed to load module. Please try again or contact your administrator.'
      );
    }
  }

  async findBySlug(slug: string, orgId: string) {
    try {
      const mod = await this.prisma.dynamicModule.findFirst({
        where: { slug, organizationId: orgId, isActive: true },
        include: {
          fields: {
            where: { isActive: true },
            orderBy: { order: 'asc' },
            include: { options: { orderBy: { order: 'asc' } } },
          },
        },
      });
      if (!mod) throw new NotFoundException('Module not found');
      return mod;
    } catch (err) {
      if (err instanceof NotFoundException) throw err;
      this.logger.error(`findBySlug module ${slug} error:`, err);
      throw new InternalServerErrorException('Failed to load module');
    }
  }

  async update(id: string, orgId: string, dto: UpdateModuleDto) {
    try {
      await this.findOne(id, orgId);
      return await this.prisma.dynamicModule.update({
        where: { id },
        data: dto,
        include: {
          fields: {
            where: { isActive: true },
            orderBy: { order: 'asc' },
            include: { options: { orderBy: { order: 'asc' } } },
          },
        },
      });
    } catch (err) {
      if (err instanceof NotFoundException || err instanceof InternalServerErrorException) throw err;
      this.logger.error(`update module ${id} error:`, err);
      throw new InternalServerErrorException('Failed to update module');
    }
  }

  async remove(id: string, orgId: string) {
    await this.findOne(id, orgId);
    return this.prisma.dynamicModule.update({ where: { id }, data: { isActive: false } });
  }
}
