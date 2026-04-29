import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common'
import { PrismaService } from '../../config/prisma.service'
import { JwtPayload } from '@social-scheduler/shared'

@Injectable()
export class OrganizationsService {
  constructor(private readonly prisma: PrismaService) {}

  async getMyOrganization(user: JwtPayload) {
    const org = await this.prisma.organization.findUnique({
      where: { id: user.organizationId },
      include: {
        members: {
          include: { user: { select: { id: true, name: true, email: true, avatarUrl: true } } },
        },
        _count: { select: { brands: true, socialAccounts: true, posts: true } },
      },
    })

    if (!org) throw new NotFoundException()
    return org
  }

  async updateOrganization(user: JwtPayload, data: { name?: string }) {
    this.requireRole(user.role, ['owner', 'admin'])

    return this.prisma.organization.update({
      where: { id: user.organizationId },
      data,
    })
  }

  async getMembers(user: JwtPayload) {
    return this.prisma.organizationMember.findMany({
      where: { organizationId: user.organizationId },
      include: {
        user: { select: { id: true, name: true, email: true, avatarUrl: true } },
      },
    })
  }

  async updateMemberRole(user: JwtPayload, memberId: string, role: string) {
    this.requireRole(user.role, ['owner', 'admin'])

    const member = await this.prisma.organizationMember.findFirst({
      where: { id: memberId, organizationId: user.organizationId },
    })

    if (!member) throw new NotFoundException()
    if (member.role === 'owner') throw new ForbiddenException('Não é possível alterar o owner')

    return this.prisma.organizationMember.update({
      where: { id: memberId },
      data: { role: role as any },
    })
  }

  async removeMember(user: JwtPayload, memberId: string) {
    this.requireRole(user.role, ['owner', 'admin'])

    const member = await this.prisma.organizationMember.findFirst({
      where: { id: memberId, organizationId: user.organizationId },
    })

    if (!member) throw new NotFoundException()
    if (member.role === 'owner') throw new ForbiddenException('Não é possível remover o owner')
    if (member.userId === user.sub) throw new ForbiddenException('Não é possível remover a si mesmo')

    await this.prisma.organizationMember.delete({ where: { id: memberId } })
  }

  private requireRole(userRole: string, allowed: string[]) {
    if (!allowed.includes(userRole)) {
      throw new ForbiddenException('Sem permissão para esta ação')
    }
  }
}
