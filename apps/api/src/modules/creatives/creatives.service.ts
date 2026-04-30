import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  GoneException,
} from '@nestjs/common'
import { PrismaService } from '../../config/prisma.service'
import { StorageService } from '../media/storage.service'
import { JwtPayload } from '@social-scheduler/shared'
import { CreateCreativeDto } from './dto/create-creative.dto'
import { UpdateCreativeDto } from './dto/update-creative.dto'
import { SubmitApprovalDto } from './dto/submit-approval.dto'
import { AddCommentDto } from './dto/add-comment.dto'
import { ResolveApprovalDto } from './dto/resolve-approval.dto'

@Injectable()
export class CreativesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  // ─── helpers ───────────────────────────────────────────────────────────────

  private requireRole(userRole: string, allowed: string[]) {
    if (!allowed.includes(userRole)) {
      throw new ForbiddenException('Sem permissão para esta ação')
    }
  }

  private async hydrateCreative(creative: any) {
    const media = await Promise.all(
      (creative.media ?? []).map(async (cm: any) => ({
        ...cm,
        mediaAsset: {
          ...cm.mediaAsset,
          url: cm.mediaAsset?.storageKey
            ? await this.storage.getSignedUrl(cm.mediaAsset.storageKey)
            : null,
        },
      })),
    )
    return { ...creative, media }
  }

  // ─── Creatives CRUD ────────────────────────────────────────────────────────

  async findAllByBrand(user: JwtPayload, brandId: string) {
    await this.assertBrandAccess(user, brandId)

    const creatives = await this.prisma.creative.findMany({
      where: { brandId, organizationId: user.organizationId },
      include: {
        media: {
          include: { mediaAsset: true },
          orderBy: { order: 'asc' },
        },
        _count: { select: { approvals: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    return Promise.all(creatives.map((c) => this.hydrateCreative(c)))
  }

  async findOne(user: JwtPayload, id: string) {
    const creative = await this.prisma.creative.findFirst({
      where: { id, organizationId: user.organizationId },
      include: {
        media: {
          include: { mediaAsset: true },
          orderBy: { order: 'asc' },
        },
        approvals: {
          orderBy: { createdAt: 'desc' },
          include: { comments: { orderBy: { createdAt: 'asc' } } },
        },
        brand: { select: { id: true, name: true, logoStorageKey: true } },
        createdBy: { select: { id: true, name: true } },
      },
    })

    if (!creative) throw new NotFoundException('Criativo não encontrado')
    return this.hydrateCreative(creative)
  }

  async create(user: JwtPayload, brandId: string, dto: CreateCreativeDto) {
    this.requireRole(user.role, ['owner', 'admin', 'editor'])
    await this.assertBrandAccess(user, brandId)

    const creative = await this.prisma.creative.create({
      data: {
        organizationId: user.organizationId,
        brandId,
        title: dto.title ?? null,
        caption: dto.caption ?? null,
        hashtags: dto.hashtags ?? [],
        notes: dto.notes ?? null,
        createdById: user.sub,
      },
    })

    if (dto.mediaAssetIds?.length) {
      await this.syncMedia(creative.id, dto.mediaAssetIds, user.organizationId)
    }

    return this.findOne(user, creative.id)
  }

  async update(user: JwtPayload, id: string, dto: UpdateCreativeDto) {
    this.requireRole(user.role, ['owner', 'admin', 'editor'])
    const existing = await this.findOne(user, id)

    if (['approved', 'archived'].includes(existing.status)) {
      throw new BadRequestException('Não é possível editar um criativo aprovado ou arquivado')
    }

    await this.prisma.creative.update({
      where: { id },
      data: {
        title: dto.title,
        caption: dto.caption,
        hashtags: dto.hashtags,
        notes: dto.notes,
        // editing resets rejection
        ...(existing.status === 'rejected' ? { status: 'draft', rejectedAt: null } : {}),
      },
    })

    if (dto.mediaAssetIds !== undefined) {
      await this.syncMedia(id, dto.mediaAssetIds, user.organizationId)
    }

    return this.findOne(user, id)
  }

  async remove(user: JwtPayload, id: string) {
    this.requireRole(user.role, ['owner', 'admin'])
    await this.findOne(user, id)
    await this.prisma.creative.delete({ where: { id } })
  }

  // ─── AI enhance (stub) ──────────────────────────────────────────────────────

  async aiEnhance(user: JwtPayload, id: string, prompt: string) {
    this.requireRole(user.role, ['owner', 'admin', 'editor'])
    const creative = await this.findOne(user, id)

    // TODO: integrate with OpenAI / Claude API
    // For now return a stubbed enhanced caption
    const stubCaption = `✨ ${creative.caption ?? ''}\n\n[IA: "${prompt}" — integração OpenAI pendente]`

    return { caption: stubCaption }
  }

  // ─── Approvals ──────────────────────────────────────────────────────────────

  async submitForApproval(user: JwtPayload, id: string, dto: SubmitApprovalDto) {
    this.requireRole(user.role, ['owner', 'admin', 'editor'])
    const creative = await this.findOne(user, id)

    if (creative.status === 'approved') {
      throw new BadRequestException('Criativo já aprovado')
    }

    const expiresAt = dto.expiresAt
      ? new Date(dto.expiresAt)
      : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days default

    const approval = await this.prisma.creativeApproval.create({
      data: {
        creativeId: id,
        clientName: dto.clientName ?? null,
        clientEmail: dto.clientEmail ?? null,
        expiresAt,
      },
    })

    await this.prisma.creative.update({
      where: { id },
      data: { status: 'pending_approval' },
    })

    const baseUrl = process.env.FRONTEND_URL ?? 'http://localhost:3000'
    return {
      ...approval,
      approvalUrl: `${baseUrl}/approval/${approval.token}`,
    }
  }

  // ─── Public approval endpoints (no auth) ────────────────────────────────────

  async getApprovalByToken(token: string) {
    const approval = await this.prisma.creativeApproval.findUnique({
      where: { token },
      include: {
        creative: {
          include: {
            media: {
              include: { mediaAsset: true },
              orderBy: { order: 'asc' },
            },
            brand: { select: { id: true, name: true, logoStorageKey: true } },
          },
        },
        comments: { orderBy: { createdAt: 'asc' } },
      },
    })

    if (!approval) throw new NotFoundException('Link de aprovação não encontrado')
    if (new Date() > approval.expiresAt) throw new GoneException('Link de aprovação expirado')

    const hydratedMedia = await Promise.all(
      (approval.creative.media ?? []).map(async (cm: any) => ({
        ...cm,
        mediaAsset: {
          ...cm.mediaAsset,
          url: cm.mediaAsset?.storageKey
            ? await this.storage.getSignedUrl(cm.mediaAsset.storageKey)
            : null,
        },
      })),
    )

    return {
      ...approval,
      creative: { ...approval.creative, media: hydratedMedia },
    }
  }

  async addComment(token: string, dto: AddCommentDto) {
    const approval = await this.assertApprovalToken(token)

    const comment = await this.prisma.creativeComment.create({
      data: {
        approvalId: approval.id,
        authorName: dto.authorName,
        text: dto.text,
        isInternal: dto.isInternal ?? false,
      },
    })

    return comment
  }

  async approveByToken(token: string, dto: ResolveApprovalDto) {
    const approval = await this.assertApprovalToken(token)

    await this.prisma.creativeApproval.update({
      where: { id: approval.id },
      data: {
        approvedAt: new Date(),
        feedback: dto.feedback ?? null,
        ...(dto.clientName ? { clientName: dto.clientName } : {}),
      },
    })

    await this.prisma.creative.update({
      where: { id: approval.creativeId },
      data: { status: 'approved', approvedAt: new Date() },
    })

    return { success: true, message: 'Criativo aprovado com sucesso' }
  }

  async rejectByToken(token: string, dto: ResolveApprovalDto) {
    const approval = await this.assertApprovalToken(token)

    await this.prisma.creativeApproval.update({
      where: { id: approval.id },
      data: {
        rejectedAt: new Date(),
        feedback: dto.feedback ?? null,
        ...(dto.clientName ? { clientName: dto.clientName } : {}),
      },
    })

    await this.prisma.creative.update({
      where: { id: approval.creativeId },
      data: { status: 'rejected', rejectedAt: new Date() },
    })

    return { success: true, message: 'Criativo rejeitado' }
  }

  // ─── Private helpers ────────────────────────────────────────────────────────

  private async assertBrandAccess(user: JwtPayload, brandId: string) {
    const brand = await this.prisma.brand.findFirst({
      where: { id: brandId, organizationId: user.organizationId },
    })
    if (!brand) throw new NotFoundException('Marca não encontrada')
    return brand
  }

  private async assertApprovalToken(token: string) {
    const approval = await this.prisma.creativeApproval.findUnique({ where: { token } })
    if (!approval) throw new NotFoundException('Link de aprovação não encontrado')
    if (new Date() > approval.expiresAt) throw new GoneException('Link de aprovação expirado')
    if (approval.approvedAt || approval.rejectedAt) {
      throw new BadRequestException('Este criativo já foi avaliado')
    }
    return approval
  }

  private async syncMedia(creativeId: string, mediaAssetIds: string[], organizationId: string) {
    // validate that all assets belong to the org
    const assets = await this.prisma.mediaAsset.findMany({
      where: { id: { in: mediaAssetIds }, organizationId, status: 'ready' },
    })

    if (assets.length !== mediaAssetIds.length) {
      throw new BadRequestException('Um ou mais arquivos de mídia não foram encontrados')
    }

    await this.prisma.creativeMedia.deleteMany({ where: { creativeId } })

    await this.prisma.creativeMedia.createMany({
      data: mediaAssetIds.map((mediaAssetId, order) => ({
        creativeId,
        mediaAssetId,
        order,
      })),
    })
  }
}
