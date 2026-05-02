import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { ConfigService } from '@nestjs/config'
import * as argon2 from 'argon2'
import { randomBytes, createHash } from 'crypto'
import { PrismaService } from '../../config/prisma.service'
import { RegisterDto } from './dto/register.dto'
import { LoginDto } from './dto/login.dto'
import { JwtPayload } from '@social-scheduler/shared'

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } })
    if (existing) throw new ConflictException('E-mail já cadastrado')

    const passwordHash = await argon2.hash(dto.password)
    const slug = this.generateSlug(dto.name)

    const user = await this.prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          name: dto.name,
          email: dto.email,
          passwordHash,
          phone: dto.phone ?? null,
          whatsappOptIn: dto.whatsappOptIn ?? false,
        },
      })

      const org = await tx.organization.create({
        data: {
          name: `${dto.name}'s Workspace`,
          slug: `${slug}-${randomBytes(4).toString('hex')}`,
          members: {
            create: {
              userId: newUser.id,
              role: 'owner',
              acceptedAt: new Date(),
            },
          },
        },
      })

      return { user: newUser, org }
    })

    return this.issueTokens(user.user, user.org.id, 'owner')
  }

  async login(dto: LoginDto, ipAddress?: string, deviceInfo?: string) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } })
    if (!user) throw new UnauthorizedException('Credenciais inválidas')

    const valid = await argon2.verify(user.passwordHash, dto.password)
    if (!valid) throw new UnauthorizedException('Credenciais inválidas')

    const member = await this.prisma.organizationMember.findFirst({
      where: { userId: user.id },
      orderBy: { createdAt: 'asc' },
    })

    if (!member) throw new BadRequestException('Usuário sem organização')

    return this.issueTokens(user, member.organizationId, member.role, ipAddress, deviceInfo)
  }

  async refresh(token: string) {
    const tokenHash = this.hashToken(token)

    const stored = await this.prisma.refreshToken.findFirst({
      where: { tokenHash, revokedAt: null },
      include: { user: true },
    })

    if (!stored || stored.expiresAt < new Date()) {
      if (stored) {
        await this.prisma.refreshToken.updateMany({
          where: { familyId: stored.familyId },
          data: { revokedAt: new Date() },
        })
      }
      throw new UnauthorizedException('Sessão expirada')
    }

    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },
    })

    const member = await this.prisma.organizationMember.findFirst({
      where: { userId: stored.userId },
      orderBy: { createdAt: 'asc' },
    })

    return this.issueTokens(stored.user, member!.organizationId, member!.role)
  }

  async logout(token: string) {
    const tokenHash = this.hashToken(token)
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash },
      data: { revokedAt: new Date() },
    })
  }

  private async issueTokens(
    user: { id: string; email: string },
    organizationId: string,
    role: string,
    ipAddress?: string,
    deviceInfo?: string,
  ) {
    const member = await this.prisma.organizationMember.findFirst({
      where: { userId: user.id, organizationId },
    })

    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      organizationId,
      role: member!.role as JwtPayload['role'],
    }

    const accessToken = this.jwt.sign(payload)

    const rawRefreshToken = randomBytes(64).toString('hex')
    const tokenHash = this.hashToken(rawRefreshToken)
    const familyId = randomBytes(16).toString('hex')

    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash,
        familyId,
        ipAddress,
        deviceInfo,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    })

    return { accessToken, refreshToken: rawRefreshToken }
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex')
  }

  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 40)
  }
}
