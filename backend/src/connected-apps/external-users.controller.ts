import { Controller, ForbiddenException, Get, NotFoundException, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { PrismaService } from '../prisma/prisma.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ConnectedAppJwtGuard } from './guards/connected-app-jwt.guard';

const EXTERNAL_USER_SELECT = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  jobTitle: true,
  phone: true,
  avatar: true,
  organizationId: true,
  department: { select: { name: true } },
};

/**
 * Read-only staff directory for approved Connected Apps (e.g. the Inventory system's
 * People sync). Requires the 'users:read' scope granted by the CRM admin on approval.
 */
@ApiTags('connected-apps')
@ApiBearerAuth()
@UseGuards(ConnectedAppJwtGuard, ThrottlerGuard)
@Controller('external/users')
export class ExternalUsersController {
  constructor(private prisma: PrismaService) {}

  private assertScope(scopes: string[]) {
    if (!scopes.includes('users:read')) {
      throw new ForbiddenException('This connection does not have permission to read staff data');
    }
  }

  @Throttle({ default: { limit: 60, ttl: 60000 } })
  @Get()
  async search(@CurrentUser() app: { connectedAppId: string; organizationId: string; scopes: string[] }, @Query('q') q?: string) {
    this.assertScope(app.scopes);
    await this.touchLastApiCall(app.connectedAppId);

    const where = q
      ? {
          organizationId: app.organizationId,
          OR: [{ firstName: { contains: q } }, { lastName: { contains: q } }, { email: { contains: q } }],
        }
      : { organizationId: app.organizationId };

    return this.prisma.user.findMany({ where, select: EXTERNAL_USER_SELECT, orderBy: { firstName: 'asc' }, take: 25 });
  }

  @Throttle({ default: { limit: 60, ttl: 60000 } })
  @Get(':id')
  async getOne(@CurrentUser() app: { connectedAppId: string; organizationId: string; scopes: string[] }, @Param('id') id: string) {
    this.assertScope(app.scopes);
    await this.touchLastApiCall(app.connectedAppId);

    const user = await this.prisma.user.findFirst({ where: { id, organizationId: app.organizationId }, select: EXTERNAL_USER_SELECT });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  private async touchLastApiCall(connectedAppId: string) {
    await this.prisma.connectedApp.update({ where: { id: connectedAppId }, data: { lastApiCallAt: new Date() } }).catch(() => {});
  }
}
