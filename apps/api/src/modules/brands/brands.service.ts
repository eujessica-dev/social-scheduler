import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common'
import { PrismaService } from '../../config/prisma.service'
import { StorageService } from '../media/storage.service'
import { JwtPayload } from '@social-scheduler/shared'
import { CreateBrandDto } from './dto/create-brand.dto'
import { UpdateBrandDto } from './dto/update-brand.dto'

@Injectable()
export class BrandsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  async findAll(user: JwtPayload) {
    const brands = await this.prisma.brand.findMany({
      where: { organizationId: user.organizationId },
      include: {
        _count: { select: { socialAccounts: true, posts: true, creatives: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    return Promise.all(
      brands.map(async (b) => ({
        ...b,
        logoUrl: b.logoStorageKey ? await this.storage.getSignedUrl(b.logoStorageKey) : null,
      })),
    )
  }

  async findOne(user: JwtPayload, id: string) {
    const brand = await this.prisma.brand.findFirst({
      where: { id, organizationId: user.organizationId },
      include: {
        socialAccounts: true,
        _count: { select: { posts: true, mediaAssets: true, creatives: true } },
      },
    })

    if (!brand) throw new NotFoundException('Marca não encontrada')

    return {
      ...brand,
      logoUrl: brand.logoStorageKey ? await this.storage.getSignedUrl(brand.logoStorageKey) : null,
    }
  }

  async create(user: JwtPayload, dto: CreateBrandDto) {
    this.requireRole(user.role, ['owner', 'admin', 'editor'])

    return this.prisma.brand.create({
      data: {
        name: dto.name,
        color: dto.color ?? null,
        description: dto.description ?? null,
        website: dto.website ?? null,
        organizationId: user.organizationId,
        createdById: user.sub,
      },
    })
  }

  async update(user: JwtPayload, id: string, dto: UpdateBrandDto) {
    this.requireRole(user.role, ['owner', 'admin', 'editor'])
    await this.findOne(user, id)

    return this.prisma.brand.update({
      where: { id },
      data: dto,
    })
  }

  async uploadLogo(user: JwtPayload, id: string, file: Express.Multer.File) {
    this.requireRole(user.role, ['owner', 'admin', 'editor'])
    const brand = await this.findOne(user, id)

    // delete old logo if exists
    if (brand.logoStorageKey) {
      await this.storage.delete(brand.logoStorageKey).catch(() => null)
    }

    const { key } = await this.storage.upload(file, user.organizationId)

    const updated = await this.prisma.brand.update({
      where: { id },
      data: { logoStorageKey: key },
    })

    return {
      ...updated,
      logoUrl: await this.storage.getSignedUrl(key),
    }
  }

  async remove(user: JwtPayload, id: string) {
    this.requireRole(user.role, ['owner', 'admin'])
    await this.findOne(user, id)

    await this.prisma.brand.delete({ where: { id } })
  }

  private requireRole(userRole: string, allowed: string[]) {
    if (!allowed.includes(userRole)) {
      throw new ForbiddenException('Sem permissão para esta ação')
    }
  }
}
