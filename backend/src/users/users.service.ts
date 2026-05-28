import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findAll(orgId: string) {
    return this.prisma.user.findMany({
      where: { organizationId: orgId },
      select: {
        id: true, email: true, firstName: true, lastName: true,
        role: true, isActive: true, createdAt: true, avatar: true,
        phone: true, jobTitle: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, orgId: string) {
    const user = await this.prisma.user.findFirst({
      where: { id, organizationId: orgId },
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async update(id: string, orgId: string, data: any) {
    await this.findOne(id, orgId);
    if (data.password) data.password = await bcrypt.hash(data.password, 12);
    return this.prisma.user.update({ where: { id }, data });
  }

  async remove(id: string, orgId: string) {
    await this.findOne(id, orgId);
    return this.prisma.user.update({ where: { id }, data: { isActive: false } });
  }
}
