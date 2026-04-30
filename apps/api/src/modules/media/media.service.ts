import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common'
import { PrismaService } from '../../config/prisma.service'
import { StorageService } from './storage.service'
import { JwtPayload } from '@social-scheduler/shared'
import {
  ALLOWED_IMAGE_TYPES,
  ALLOWED_VIDEO_TYPES,
  MAX_IMAGE_SIZE_BYTES,
  MAX_VIDEO_SIZE_BYTES,
} from '@social-scheduler/shared'

const ALLOWED_TYPES = [...ALLOWED_IMAGE_TYPES, ...ALLOWED_VIDEO_TYPES]

@Injectable()
export class MediaService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  async findAll(user: JwtPayload, brandId?: string) {
    const assets = await this.prisma.mediaAsset.findMany({
      where: {
        organizationId: user.organizationId,
        status: 'ready',
        ...(brandId ? { brandId } : {}),
      },
      orderBy: { createdAt: 'desc' },
    })

    return Promise.all(
      assets.map(async (a) => ({
        ...a,
        url: await this.storage.getSignedUrl(a.storageKey),
      })),
    )
  }

  async findOne(user: JwtPayload, id: string) {
    const asset = await this.prisma.mediaAsset.findFirst({
      where: { id, organizationId: user.organizationId },
    })
    if (!asset) throw new NotFoundException('Arquivo não encontrado')

    return { ...asset, url: await this.storage.getSignedUrl(asset.storageKey) }
  }

  async upload(user: JwtPayload, file: Express.Multer.File, brandId?: string) {
    if (!file) throw new BadRequestException('Nenhum arquivo enviado')
    this.validateFile(file)

    const isVideo = ALLOWED_VIDEO_TYPES.includes(file.mimetype)
    let width: number | undefined
    let height: number | undefined

    const record = await this.prisma.mediaAsset.create({
      data: {
        organizationId: user.organizationId,
        brandId: brandId ?? null,
        uploadedById: user.sub,
        filename: file.originalname,
        storageKey: 'pending',
        mimeType: file.mimetype,
        sizeBytes: file.size,
        width: width ?? null,
        height: height ?? null,
        status: 'uploading',
      },
    })

    try {
      const { key } = await this.storage.upload(file, user.organizationId)

      await this.prisma.mediaAsset.update({
        where: { id: record.id },
        data: { storageKey: key, status: 'ready' },
      })

      return this.findOne(user, record.id)
    } catch {
      await this.prisma.mediaAsset.update({
        where: { id: record.id },
        data: { status: 'error' },
      })
      throw new BadRequestException('Falha ao fazer upload do arquivo')
    }
  }

  async remove(user: JwtPayload, id: string) {
    this.requireRole(user.role, ['owner', 'admin', 'editor'])
    const asset = await this.findOne(user, id)

    await this.storage.delete(asset.storageKey)
    await this.prisma.mediaAsset.update({
      where: { id },
      data: { status: 'deleted' },
    })
  }

  private validateFile(file: Express.Multer.File) {
    if (!ALLOWED_TYPES.includes(file.mimetype)) {
      throw new BadRequestException(`Tipo de arquivo não permitido: ${file.mimetype}`)
    }

    const isVideo = ALLOWED_VIDEO_TYPES.includes(file.mimetype)
    const maxSize = isVideo ? MAX_VIDEO_SIZE_BYTES : MAX_IMAGE_SIZE_BYTES

    if (file.size > maxSize) {
      throw new BadRequestException(
        `Arquivo muito grande. Máximo: ${isVideo ? '1GB' : '50MB'}`,
      )
    }
  }

  private requireRole(userRole: string, allowed: string[]) {
    if (!allowed.includes(userRole)) {
      throw new ForbiddenException('Sem permissão para esta ação')
    }
  }
}
