import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common'
import { PrismaService } from '../../config/prisma.service'
import { JwtPayload } from '@social-scheduler/shared'
import { CreateBrandDto } from './dto/create-brand.dto'
import { UpdateBrandDto } from './dto/update-brand.dto'

@Injectable()
export class BrandsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(user: JwtPayload) {
    return this.prisma.brand.findMany({
      where: { organizationId: user.organizationId },
      include: {
        _count: { select: { socialAccounts: true, posts: true } },
      },
      orderBy: { createdAt: 'desc' },
    })
  }

  async findOne(user: JwtPayload, id: string) {
    const brand = await this.prisma.brand.findFirst({
      where: { id, organizationId: user.organizationId },
      include: {
        socialAccounts: true,
        _count: { select: { posts: true, mediaAssets: true } },
      },
    })

    if (!brand) throw new NotFoundException('Marca não encontrada')
    return brand
  }

  async create(user: JwtPayload, dto: CreateBrandDto) {
    this.requireRole(user.role, ['owner', 'admin', 'editor'])

    return this.prisma.brand.create({
      data: {
        name: dto.name,
        color: dto.color,
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
