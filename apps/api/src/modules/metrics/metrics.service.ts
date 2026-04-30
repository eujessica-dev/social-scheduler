import { Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../../config/prisma.service'
import { SocialAccountsService } from '../social-accounts/social-accounts.service'
import { JwtPayload } from '@social-scheduler/shared'

@Injectable()
export class MetricsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly socialAccounts: SocialAccountsService,
  ) {}

  // ── dashboard geral ───────────────────────────────────────────────────

  async getDashboard(user: JwtPayload) {
    const [scheduled, published, failed, draft, accounts] = await Promise.all([
      this.prisma.post.count({ where: { organizationId: user.organizationId, status: 'scheduled' } }),
      this.prisma.post.count({ where: { organizationId: user.organizationId, status: 'published' } }),
      this.prisma.post.count({ where: { organizationId: user.organizationId, status: 'failed' } }),
      this.prisma.post.count({ where: { organizationId: user.organizationId, status: 'draft' } }),
      this.prisma.socialAccount.count({ where: { organizationId: user.organizationId, status: 'active' } }),
    ])

    return { scheduled, published, failed, draft, connectedAccounts: accounts }
  }

  // ── métricas por conta ────────────────────────────────────────────────

  async getAccountMetrics(user: JwtPayload, accountId: string): Promise<any> {
    const account = await this.prisma.socialAccount.findFirst({
      where: { id: accountId, organizationId: user.organizationId },
    })
    if (!account) throw new NotFoundException('Conta não encontrada')

    const snapshots = await this.prisma.metricsSnapshot.findMany({
      where: { socialAccountId: accountId },
      orderBy: { collectedAt: 'desc' },
      take: 30,
    })

    return { account, snapshots }
  }

  // ── métricas por post ─────────────────────────────────────────────────

  async getPostMetrics(user: JwtPayload, postId: string): Promise<any> {
    const post = await this.prisma.post.findFirst({
      where: { id: postId, organizationId: user.organizationId },
      include: { platforms: true },
    })
    if (!post) throw new NotFoundException('Post não encontrado')

    const snapshots = await this.prisma.metricsSnapshot.findMany({
      where: { postPlatformId: { in: post.platforms.map((p) => p.id) } },
      orderBy: { collectedAt: 'desc' },
    })

    const totals = snapshots.reduce(
      (acc, s) => ({
        reach:       (acc.reach ?? 0)       + (s.reach ?? 0),
        impressions: (acc.impressions ?? 0) + (s.impressions ?? 0),
        likes:       (acc.likes ?? 0)       + (s.likes ?? 0),
        comments:    (acc.comments ?? 0)    + (s.comments ?? 0),
        shares:      (acc.shares ?? 0)      + (s.shares ?? 0),
        saves:       (acc.saves ?? 0)       + (s.saves ?? 0),
        views:       (acc.views ?? 0)       + (s.views ?? 0),
      }),
      {} as Record<string, number>,
    )

    return { post, snapshots, totals }
  }

  // ── coleta de métricas da Meta Graph API ──────────────────────────────

  async collectMetrics(postPlatformId: string): Promise<any> {
    const platform = await this.prisma.postPlatform.findUnique({
      where: { id: postPlatformId },
      include: {
        socialAccount: { include: { oauthToken: true } },
      },
    })

    if (!platform?.platformPostId || !platform.socialAccount.oauthToken) return null

    const token = this.socialAccounts.decrypt(
      platform.socialAccount.oauthToken.accessTokenEncrypted,
    )

    const fields = 'reach,impressions,like_count,comments_count,shares,saved'
    const url =
      `https://graph.facebook.com/v19.0/${platform.platformPostId}` +
      `?fields=${fields}&access_token=${token}`

    const res = await fetch(url)
    if (!res.ok) return null

    const data = (await res.json()) as Record<string, any>

    const snapshot = await this.prisma.metricsSnapshot.create({
      data: {
        postPlatformId,
        socialAccountId: platform.socialAccountId,
        reach:       data.reach        ?? null,
        impressions: data.impressions   ?? null,
        likes:       data.like_count    ?? null,
        comments:    data.comments_count ?? null,
        shares:      data.shares        ?? null,
        saves:       data.saved         ?? null,
        rawData:     data,
      },
    })

    return snapshot
  }

  // ── histórico de publicações ──────────────────────────────────────────

  async getPublishingHistory(user: JwtPayload, limit = 20): Promise<any> {
    return this.prisma.post.findMany({
      where: {
        organizationId: user.organizationId,
        status: { in: ['published', 'failed'] },
      },
      include: {
        brand: { select: { name: true, color: true } },
        platforms: {
          include: {
            publishingLogs: { orderBy: { createdAt: 'desc' }, take: 1 },
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
      take: limit,
    })
  }
}
