import {
  Injectable, NotFoundException, ForbiddenException, BadRequestException,
} from '@nestjs/common'
import { InjectQueue } from '@nestjs/bull'
import { Queue } from 'bull'
import { PrismaService } from '../../config/prisma.service'
import { StorageService } from '../media/storage.service'
import { JwtPayload } from '@social-scheduler/shared'
import { QUEUE_NAMES } from '@social-scheduler/shared'
import { CreatePostDto } from './dto/create-post.dto'
import { UpdatePostDto } from './dto/update-post.dto'

@Injectable()
export class PostsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    @InjectQueue(QUEUE_NAMES.PUBLISHING) private readonly publishingQueue: Queue,
  ) {}

  private async hydratePostMedia(post: any) {
    const media = await Promise.all(
      (post.media ?? []).map(async (m: any) => ({
        ...m,
        mediaAsset: m.mediaAsset
          ? { ...m.mediaAsset, url: await this.storage.getSignedUrl(m.mediaAsset.storageKey) }
          : null,
      })),
    )
    return { ...post, media }
  }

  async findAll(user: JwtPayload, filters?: { brandId?: string; status?: string }) {
    const posts = await this.prisma.post.findMany({
      where: {
        organizationId: user.organizationId,
        ...(filters?.brandId ? { brandId: filters.brandId } : {}),
        ...(filters?.status ? { status: filters.status as any } : {}),
      },
      include: {
        brand: { select: { id: true, name: true, color: true } },
        createdBy: { select: { id: true, name: true } },
        platforms: { select: { platform: true, status: true, publishedAt: true } },
        media: {
          include: { mediaAsset: { select: { id: true, mimeType: true, storageKey: true } } },
          orderBy: { order: 'asc' },
        },
      },
      orderBy: { scheduledAt: 'asc' },
    })

    return Promise.all(posts.map((p) => this.hydratePostMedia(p)))
  }

  async findOne(user: JwtPayload, id: string) {
    const post = await this.prisma.post.findFirst({
      where: { id, organizationId: user.organizationId },
      include: {
        brand: true,
        createdBy: { select: { id: true, name: true } },
        approvedBy: { select: { id: true, name: true } },
        platforms: { include: { socialAccount: true } },
        media: { include: { mediaAsset: true }, orderBy: { order: 'asc' } },
        scheduledJob: true,
      },
    })

    if (!post) throw new NotFoundException('Post não encontrado')
    return post
  }

  async create(user: JwtPayload, dto: CreatePostDto) {
    this.requireRole(user.role, ['owner', 'admin', 'editor'])

    await this.validateSocialAccounts(user.organizationId, dto.socialAccountIds)

    // fetch real platforms for each selected account
    const socialAccounts = await this.prisma.socialAccount.findMany({
      where: { id: { in: dto.socialAccountIds } },
      select: { id: true, platform: true },
    })
    const platformByAccount = new Map(socialAccounts.map((a) => [a.id, a.platform]))

    const post = await this.prisma.post.create({
      data: {
        organizationId: user.organizationId,
        brandId: dto.brandId,
        title: dto.title,
        caption: dto.caption,
        hashtags: dto.hashtags ?? [],
        scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : null,
        timezone: dto.timezone ?? 'America/Sao_Paulo',
        notes: dto.notes,
        status: dto.scheduledAt ? 'scheduled' : 'draft',
        createdById: user.sub,
        platforms: {
          create: dto.socialAccountIds.map((socialAccountId) => ({
            socialAccountId,
            platform: platformByAccount.get(socialAccountId) ?? 'instagram',
            status: 'pending',
          })),
        },
        media: dto.mediaAssetIds
          ? {
              create: dto.mediaAssetIds.map((mediaAssetId, order) => ({
                mediaAssetId,
                order,
              })),
            }
          : undefined,
      },
    })

    if (dto.scheduledAt) {
      await this.scheduleJob(post.id, new Date(dto.scheduledAt))
    }

    return this.findOne(user, post.id)
  }

  async update(user: JwtPayload, id: string, dto: UpdatePostDto) {
    this.requireRole(user.role, ['owner', 'admin', 'editor'])
    const post = await this.findOne(user, id)

    if (['published', 'publishing'].includes(post.status)) {
      throw new BadRequestException('Não é possível editar um post já publicado')
    }

    await this.prisma.post.update({
      where: { id },
      data: {
        title: dto.title,
        caption: dto.caption,
        hashtags: dto.hashtags,
        scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : undefined,
        timezone: dto.timezone,
        notes: dto.notes,
        status: dto.scheduledAt ? 'scheduled' : 'draft',
      },
    })

    if (dto.mediaAssetIds) {
      await this.prisma.postMedia.deleteMany({ where: { postId: id } })
      await this.prisma.postMedia.createMany({
        data: dto.mediaAssetIds.map((mediaAssetId, order) => ({ postId: id, mediaAssetId, order })),
      })
    }

    if (dto.scheduledAt) {
      const job = await this.prisma.scheduledJob.findFirst({ where: { postId: id } })
      if (job?.queueJobId) {
        const existing = await this.publishingQueue.getJob(job.queueJobId)
        await existing?.remove()
      }
      await this.scheduleJob(id, new Date(dto.scheduledAt))
    }

    return this.findOne(user, id)
  }

  async approve(user: JwtPayload, id: string) {
    this.requireRole(user.role, ['owner', 'admin', 'client'])
    const post = await this.findOne(user, id)

    if (post.status !== 'pending_approval') {
      throw new BadRequestException('Post não está aguardando aprovação')
    }

    return this.prisma.post.update({
      where: { id },
      data: { status: 'approved', approvedById: user.sub, approvedAt: new Date() },
    })
  }

  async cancel(user: JwtPayload, id: string) {
    this.requireRole(user.role, ['owner', 'admin', 'editor'])
    const post = await this.findOne(user, id)

    if (['published', 'publishing'].includes(post.status)) {
      throw new BadRequestException('Não é possível cancelar um post já publicado')
    }

    const job = await this.prisma.scheduledJob.findFirst({ where: { postId: id } })
    if (job?.queueJobId) {
      const existing = await this.publishingQueue.getJob(job.queueJobId)
      await existing?.remove()
    }

    return this.prisma.post.update({
      where: { id },
      data: { status: 'cancelled' },
    })
  }

  async remove(user: JwtPayload, id: string) {
    this.requireRole(user.role, ['owner', 'admin'])
    await this.cancel(user, id)
    await this.prisma.post.delete({ where: { id } })
  }

  private async scheduleJob(postId: string, scheduledAt: Date) {
    const delay = scheduledAt.getTime() - Date.now()
    if (delay < 0) throw new BadRequestException('A data de agendamento deve ser no futuro')

    const job = await this.publishingQueue.add(
      'publish',
      { postId },
      { delay, attempts: 3, backoff: { type: 'exponential', delay: 60000 } },
    )

    await this.prisma.scheduledJob.upsert({
      where: { postId },
      update: { queueJobId: String(job.id), status: 'queued', attempts: 0 },
      create: { postId, queueJobId: String(job.id), status: 'queued' },
    })
  }

  private async validateSocialAccounts(organizationId: string, ids: string[]) {
    const accounts = await this.prisma.socialAccount.findMany({
      where: { id: { in: ids }, organizationId, status: 'active' },
    })

    if (accounts.length !== ids.length) {
      throw new BadRequestException('Uma ou mais contas sociais são inválidas ou inativas')
    }
  }

  private requireRole(userRole: string, allowed: string[]) {
    if (!allowed.includes(userRole)) {
      throw new ForbiddenException('Sem permissão para esta ação')
    }
  }
}
