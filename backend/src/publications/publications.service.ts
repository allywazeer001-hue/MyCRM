import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePublicationDto } from './dto/create-publication.dto';
import { UpdatePublicationDto } from './dto/update-publication.dto';
import { PublicationStatus, EngagementType } from '@prisma/client';

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 80);
}

@Injectable()
export class PublicationsService {
  constructor(private prisma: PrismaService) {}

  private include = {
    author: { select: { id: true, firstName: true, lastName: true, avatar: true } },
    attachments: true,
    coverFile: { select: { id: true, fileUrl: true, name: true } },
    _count: { select: { engagements: true } },
  };

  async findAll(orgId: string, query: { status?: string; search?: string }) {
    const where: any = { organizationId: orgId };
    if (query.status) where.status = query.status as PublicationStatus;
    if (query.search) {
      where.OR = [
        { title: { contains: query.search } },
        { excerpt: { contains: query.search } },
      ];
    }
    return this.prisma.publication.findMany({
      where,
      include: this.include,
      orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async findOne(orgId: string, id: string) {
    const pub = await this.prisma.publication.findFirst({
      where: { id, organizationId: orgId },
      include: this.include,
    });
    if (!pub) throw new NotFoundException('Publication not found');
    return pub;
  }

  async create(orgId: string, authorId: string, dto: CreatePublicationDto) {
    const baseSlug = slugify(dto.title);
    let slug = baseSlug;
    let n = 1;
    while (await this.prisma.publication.findFirst({ where: { organizationId: orgId, slug } })) {
      slug = `${baseSlug}-${n++}`;
    }

    const { attachments, ...rest } = dto;
    const pub = await this.prisma.publication.create({
      data: {
        organizationId: orgId,
        authorId,
        slug,
        title: rest.title,
        excerpt: rest.excerpt,
        content: rest.content,
        coverImageUrl: rest.coverImageUrl,
        coverFileId: rest.coverFileId,
        externalLinks: rest.externalLinks ?? [],
        categories: rest.categories ?? [],
        tags: rest.tags ?? [],
        audienceType: rest.audienceType ?? 'ALL',
        audienceConfig: rest.audienceConfig ?? {},
        isEvent: rest.isEvent ?? false,
        eventDate: rest.eventDate ? new Date(rest.eventDate) : null,
        eventCtaLabel: rest.eventCtaLabel,
        eventCtaUrl: rest.eventCtaUrl,
      },
    });

    if (attachments?.length) {
      await this.prisma.publicationAttachment.createMany({
        data: attachments.map((a: any) => ({
          publicationId: pub.id,
          fileId: a.fileId,
          fileName: a.fileName,
          fileUrl: a.fileUrl,
          fileSize: a.fileSize ?? 0,
          mimeType: a.mimeType ?? 'application/octet-stream',
          label: a.label,
        })),
      });
    }

    return this.findOne(orgId, pub.id);
  }

  async update(orgId: string, id: string, dto: UpdatePublicationDto) {
    await this.findOne(orgId, id);
    const { attachments, ...rest } = dto;

    const data: any = { ...rest };
    if (rest.eventDate) data.eventDate = new Date(rest.eventDate);

    await this.prisma.publication.update({ where: { id }, data });

    if (attachments !== undefined) {
      await this.prisma.publicationAttachment.deleteMany({ where: { publicationId: id } });
      if (attachments.length) {
        await this.prisma.publicationAttachment.createMany({
          data: attachments.map((a: any) => ({
            publicationId: id,
            fileId: a.fileId,
            fileName: a.fileName,
            fileUrl: a.fileUrl,
            fileSize: a.fileSize ?? 0,
            mimeType: a.mimeType ?? 'application/octet-stream',
            label: a.label,
          })),
        });
      }
    }

    return this.findOne(orgId, id);
  }

  async publish(orgId: string, id: string) {
    await this.findOne(orgId, id);
    return this.prisma.publication.update({
      where: { id },
      data: { status: PublicationStatus.PUBLISHED, publishedAt: new Date() },
    });
  }

  async archive(orgId: string, id: string) {
    await this.findOne(orgId, id);
    return this.prisma.publication.update({
      where: { id },
      data: { status: PublicationStatus.ARCHIVED },
    });
  }

  async unpublish(orgId: string, id: string) {
    await this.findOne(orgId, id);
    return this.prisma.publication.update({
      where: { id },
      data: { status: PublicationStatus.DRAFT },
    });
  }

  async delete(orgId: string, id: string) {
    await this.findOne(orgId, id);
    return this.prisma.publication.delete({ where: { id } });
  }

  // ── Portal-facing feed ────────────────────────────────────────────────────

  async getPortalFeed(orgId: string) {
    const [upcomingEvent, publications] = await Promise.all([
      this.prisma.publication.findFirst({
        where: {
          organizationId: orgId,
          status: PublicationStatus.PUBLISHED,
          isEvent: true,
          eventDate: { gte: new Date() },
        },
        orderBy: { eventDate: 'asc' },
        include: { coverFile: { select: { fileUrl: true } } },
      }),
      this.prisma.publication.findMany({
        where: { organizationId: orgId, status: PublicationStatus.PUBLISHED },
        orderBy: { publishedAt: 'desc' },
        take: 20,
        include: {
          author: { select: { id: true, firstName: true, lastName: true } },
          coverFile: { select: { fileUrl: true } },
        },
      }),
    ]);
    return { upcomingEvent, publications };
  }

  async getPortalPublication(orgId: string, id: string, portalUserId?: string, userId?: string) {
    const pub = await this.prisma.publication.findFirst({
      where: { id, organizationId: orgId, status: PublicationStatus.PUBLISHED },
      include: { author: { select: { id: true, firstName: true, lastName: true } }, attachments: true },
    });
    if (!pub) throw new NotFoundException('Publication not found');

    // Record view engagement (deduplicate per user per day)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const existing = await this.prisma.publicationEngagement.findFirst({
      where: {
        publicationId: id,
        activityType: EngagementType.VIEWED,
        portalUserId: portalUserId ?? null,
        userId: userId ?? null,
        createdAt: { gte: today },
      },
    });
    if (!existing) {
      await this.prisma.publicationEngagement.create({
        data: {
          publicationId: id,
          portalUserId: portalUserId ?? null,
          userId: userId ?? null,
          activityType: EngagementType.VIEWED,
        },
      });
      await this.prisma.publication.update({
        where: { id },
        data: { viewCount: { increment: 1 } },
      });
    }

    return pub;
  }

  // ── Engagement tracking ───────────────────────────────────────────────────

  async trackEngagement(
    orgId: string,
    publicationId: string,
    activityType: EngagementType,
    portalUserId?: string,
    userId?: string,
    metadata?: any,
    deviceInfo?: string,
  ) {
    const pub = await this.prisma.publication.findFirst({
      where: { id: publicationId, organizationId: orgId },
    });
    if (!pub) throw new NotFoundException('Publication not found');

    await this.prisma.publicationEngagement.create({
      data: { publicationId, portalUserId, userId, activityType, metadata: metadata ?? {}, deviceInfo },
    });

    // Increment counters
    if (activityType === EngagementType.EXTERNAL_LINK_CLICKED || activityType === EngagementType.EVENT_LINK_CLICKED) {
      await this.prisma.publication.update({ where: { id: publicationId }, data: { clickCount: { increment: 1 } } });
    }
    if (activityType === EngagementType.ATTACHMENT_DOWNLOADED) {
      await this.prisma.publication.update({ where: { id: publicationId }, data: { downloadCount: { increment: 1 } } });
    }

    return { ok: true };
  }

  // ── Analytics ─────────────────────────────────────────────────────────────

  async getAnalytics(orgId: string, id: string, query: { from?: string; to?: string }) {
    const pub = await this.findOne(orgId, id);
    const dateFilter: any = {};
    if (query.from) dateFilter.gte = new Date(query.from);
    if (query.to) dateFilter.lte = new Date(query.to);
    const where: any = { publicationId: id };
    if (Object.keys(dateFilter).length) where.createdAt = dateFilter;

    const [byType, rawEngagements] = await Promise.all([
      this.prisma.publicationEngagement.groupBy({
        by: ['activityType'],
        where,
        _count: { id: true },
      }),
      this.prisma.publicationEngagement.findMany({
        where,
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    // Resolve display names for portal users and CRM users
    const portalIds = [...new Set(rawEngagements.map(e => e.portalUserId).filter(Boolean))] as string[];
    const userIds   = [...new Set(rawEngagements.map(e => e.userId).filter(Boolean))] as string[];

    const [portalUsers, crmUsers] = await Promise.all([
      portalIds.length
        ? this.prisma.portalUser.findMany({ where: { id: { in: portalIds } }, select: { id: true, firstName: true, lastName: true } })
        : [],
      userIds.length
        ? this.prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, firstName: true, lastName: true } })
        : [],
    ]);

    const portalNameMap = Object.fromEntries(portalUsers.map(u => [u.id, `${u.firstName} ${u.lastName}`]));
    const crmNameMap    = Object.fromEntries(crmUsers.map(u => [u.id, `${u.firstName} ${u.lastName}`]));

    const engagements = rawEngagements.map(e => ({
      ...e,
      userName: e.portalUserId
        ? (portalNameMap[e.portalUserId] ?? null)
        : e.userId
          ? (crmNameMap[e.userId] ?? null)
          : null,
    }));

    const uniqueViewers = new Set(
      engagements
        .filter(e => e.activityType === EngagementType.VIEWED)
        .map(e => e.portalUserId ?? e.userId ?? 'anon'),
    ).size;

    const typeCounts = Object.fromEntries(byType.map(b => [b.activityType, b._count.id]));

    // Build per-user summary (one entry per distinct user, sorted by latest activity)
    const userMap2 = new Map<string, {
      key: string; userName: string | null;
      views: number; clicks: number; downloads: number;
      lastActivity: Date; firstActivity: Date;
    }>();
    for (const e of engagements) {
      const key = e.portalUserId ?? e.userId ?? 'anon';
      if (!userMap2.has(key)) {
        userMap2.set(key, { key, userName: e.userName as string | null, views: 0, clicks: 0, downloads: 0, lastActivity: e.createdAt, firstActivity: e.createdAt });
      }
      const entry = userMap2.get(key)!;
      if (e.activityType === EngagementType.VIEWED) entry.views++;
      else if (e.activityType === EngagementType.EXTERNAL_LINK_CLICKED || e.activityType === EngagementType.EVENT_LINK_CLICKED) entry.clicks++;
      else if (e.activityType === EngagementType.ATTACHMENT_DOWNLOADED) entry.downloads++;
      if (e.createdAt > entry.lastActivity) entry.lastActivity = e.createdAt;
      if (e.createdAt < entry.firstActivity) entry.firstActivity = e.createdAt;
    }
    const userSummaries = [...userMap2.values()].sort((a, b) => b.lastActivity.getTime() - a.lastActivity.getTime());

    return {
      publication: { id: pub.id, title: pub.title, status: pub.status },
      views: typeCounts[EngagementType.VIEWED] ?? 0,
      uniqueViewers,
      clicks: (typeCounts[EngagementType.EXTERNAL_LINK_CLICKED] ?? 0) + (typeCounts[EngagementType.EVENT_LINK_CLICKED] ?? 0),
      downloads: typeCounts[EngagementType.ATTACHMENT_DOWNLOADED] ?? 0,
      byType: typeCounts,
      userSummaries,
      engagements,
    };
  }

  async getDashboardStats(orgId: string) {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [total, publishedThisMonth, mostViewed, mostEngaged] = await Promise.all([
      this.prisma.publication.count({ where: { organizationId: orgId } }),
      this.prisma.publication.count({
        where: {
          organizationId: orgId,
          status: PublicationStatus.PUBLISHED,
          publishedAt: { gte: startOfMonth },
        },
      }),
      this.prisma.publication.findMany({
        where: { organizationId: orgId, status: PublicationStatus.PUBLISHED },
        orderBy: { viewCount: 'desc' },
        take: 5,
        select: { id: true, title: true, viewCount: true, clickCount: true, downloadCount: true },
      }),
      this.prisma.publication.findMany({
        where: { organizationId: orgId },
        orderBy: { viewCount: 'desc' },
        take: 5,
        select: { id: true, title: true, viewCount: true, clickCount: true, downloadCount: true },
      }),
    ]);

    const totalClicks = await this.prisma.publication.aggregate({
      where: { organizationId: orgId },
      _sum: { clickCount: true, downloadCount: true },
    });

    return {
      total,
      publishedThisMonth,
      totalClicks: totalClicks._sum.clickCount ?? 0,
      totalDownloads: totalClicks._sum.downloadCount ?? 0,
      mostViewed,
      mostEngaged,
    };
  }

  async getUserEngagementSummary(orgId: string) {
    const portalUsers = await this.prisma.portalUser.findMany({
      where: { organizationId: orgId },
      select: { id: true, firstName: true, lastName: true, email: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    });

    if (!portalUsers.length) return { users: [] };

    const ids = portalUsers.map(u => u.id);

    const [groupedEngagements, lastActivities] = await Promise.all([
      this.prisma.publicationEngagement.groupBy({
        by: ['portalUserId', 'publicationId'],
        where: { portalUserId: { in: ids } },
        _count: { id: true },
      }),
      this.prisma.publicationEngagement.findMany({
        where: { portalUserId: { in: ids } },
        select: { portalUserId: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
        distinct: ['portalUserId'],
      }),
    ]);

    const lastActivityMap: Record<string, Date> = {};
    for (const e of lastActivities) {
      if (e.portalUserId) lastActivityMap[e.portalUserId] = e.createdAt;
    }

    const postsOpenedMap = new Map<string, number>();
    for (const e of groupedEngagements) {
      if (!e.portalUserId) continue;
      postsOpenedMap.set(e.portalUserId, (postsOpenedMap.get(e.portalUserId) ?? 0) + 1);
    }

    const users = portalUsers
      .map(u => ({
        id: u.id,
        name: `${u.firstName} ${u.lastName}`,
        email: u.email,
        postsOpened: postsOpenedMap.get(u.id) ?? 0,
        lastActivity: lastActivityMap[u.id] ?? null,
        joinedAt: u.createdAt,
      }))
      .sort((a, b) =>
        b.postsOpened - a.postsOpened ||
        (b.lastActivity?.getTime() ?? 0) - (a.lastActivity?.getTime() ?? 0),
      );

    return { users };
  }
}
