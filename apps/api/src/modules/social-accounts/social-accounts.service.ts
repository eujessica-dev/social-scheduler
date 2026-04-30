import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto'
import { PrismaService } from '../../config/prisma.service'
import { JwtPayload } from '@social-scheduler/shared'

@Injectable()
export class SocialAccountsService {
  private readonly encKey: Buffer

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    const key = this.config.get<string>('ENCRYPTION_KEY')!
    this.encKey = Buffer.from(key, 'hex')
  }

  // ── listagem ─────────────────────────────────────────────────────────────

  async findAll(user: JwtPayload) {
    return this.prisma.socialAccount.findMany({
      where: { organizationId: user.organizationId },
      select: {
        id: true,
        platform: true,
        accountName: true,
        accountAvatar: true,
        status: true,
        connectedAt: true,
        disconnectedAt: true,
        brandId: true,
        oauthToken: { select: { expiresAt: true, scopes: true } },
      },
      orderBy: { connectedAt: 'desc' },
    })
  }

  async findOne(user: JwtPayload, id: string) {
    const account = await this.prisma.socialAccount.findFirst({
      where: { id, organizationId: user.organizationId },
    })
    if (!account) throw new NotFoundException('Conta não encontrada')
    return account
  }

  // ── OAuth Meta (Facebook + Instagram) ────────────────────────────────────

  buildMetaOAuthUrl(organizationId: string): string {
    const appId = this.config.get<string>('META_APP_ID')
    const redirectUri = this.config.get<string>('META_REDIRECT_URI')
    const scopes = [
      'pages_show_list',
      'pages_read_engagement',
      'pages_manage_posts',
      'instagram_basic',
      'instagram_content_publish',
      'instagram_manage_insights',
    ].join(',')

    const state = Buffer.from(JSON.stringify({ organizationId })).toString('base64url')

    return (
      `https://www.facebook.com/v19.0/dialog/oauth` +
      `?client_id=${appId}` +
      `&redirect_uri=${encodeURIComponent(redirectUri!)}` +
      `&scope=${scopes}` +
      `&state=${state}` +
      `&response_type=code`
    )
  }

  async handleMetaCallback(code: string, state: string, organizationId: string) {
    const decoded = JSON.parse(Buffer.from(state, 'base64url').toString())
    if (decoded.organizationId !== organizationId) {
      throw new BadRequestException('State inválido')
    }

    const shortLived = await this.exchangeCodeForToken(code)
    const longLived = await this.exchangeForLongLivedToken(shortLived.access_token)

    const pages = await this.fetchFacebookPages(longLived.access_token)
    const saved: string[] = []

    for (const page of pages) {
      const account = await this.upsertSocialAccount({
        organizationId,
        platform: 'facebook',
        platformUserId: page.id,
        accountName: page.name,
        accountAvatar: page.picture?.data?.url ?? null,
        accessToken: page.access_token,
        scopes: ['pages_show_list', 'pages_manage_posts', 'pages_read_engagement'],
        expiresAt: null,
      })
      saved.push(account.id)

      const igAccount = await this.fetchInstagramAccount(page.id, page.access_token)
      if (igAccount) {
        const ig = await this.upsertSocialAccount({
          organizationId,
          platform: 'instagram',
          platformUserId: igAccount.id,
          accountName: igAccount.name,
          accountAvatar: igAccount.profile_picture_url ?? null,
          accessToken: page.access_token,
          scopes: ['instagram_basic', 'instagram_content_publish', 'instagram_manage_insights'],
          expiresAt: null,
        })
        saved.push(ig.id)
      }
    }

    return { connected: saved.length, accountIds: saved }
  }

  async disconnect(user: JwtPayload, id: string) {
    this.requireRole(user.role, ['owner', 'admin'])
    const account = await this.findOne(user, id)

    await this.prisma.socialAccount.update({
      where: { id: account.id },
      data: { status: 'disconnected', disconnectedAt: new Date() },
    })

    await this.prisma.oAuthToken.deleteMany({
      where: { socialAccountId: account.id },
    })
  }

  // ── helpers privados ─────────────────────────────────────────────────────

  private async upsertSocialAccount(data: {
    organizationId: string
    platform: 'facebook' | 'instagram' | 'tiktok'
    platformUserId: string
    accountName: string
    accountAvatar: string | null
    accessToken: string
    scopes: string[]
    expiresAt: Date | null
  }) {
    const encrypted = this.encrypt(data.accessToken)

    const account = await this.prisma.socialAccount.upsert({
      where: {
        organizationId_platform_platformUserId: {
          organizationId: data.organizationId,
          platform: data.platform,
          platformUserId: data.platformUserId,
        },
      },
      update: {
        accountName: data.accountName,
        accountAvatar: data.accountAvatar,
        status: 'active',
        disconnectedAt: null,
        connectedAt: new Date(),
      },
      create: {
        organizationId: data.organizationId,
        platform: data.platform,
        platformUserId: data.platformUserId,
        accountName: data.accountName,
        accountAvatar: data.accountAvatar,
        status: 'active',
      },
    })

    await this.prisma.oAuthToken.upsert({
      where: { socialAccountId: account.id },
      update: {
        accessTokenEncrypted: encrypted,
        scopes: data.scopes,
        expiresAt: data.expiresAt,
      },
      create: {
        socialAccountId: account.id,
        accessTokenEncrypted: encrypted,
        scopes: data.scopes,
        expiresAt: data.expiresAt,
      },
    })

    return account
  }

  private async exchangeCodeForToken(code: string) {
    const appId = this.config.get('META_APP_ID')
    const appSecret = this.config.get('META_APP_SECRET')
    const redirectUri = this.config.get('META_REDIRECT_URI')

    const url =
      `https://graph.facebook.com/v19.0/oauth/access_token` +
      `?client_id=${appId}&client_secret=${appSecret}` +
      `&code=${code}&redirect_uri=${encodeURIComponent(redirectUri!)}`

    const res = await fetch(url)
    if (!res.ok) throw new BadRequestException('Falha ao trocar code por token')
    return res.json() as Promise<{ access_token: string }>
  }

  private async exchangeForLongLivedToken(shortLived: string) {
    const appId = this.config.get('META_APP_ID')
    const appSecret = this.config.get('META_APP_SECRET')

    const url =
      `https://graph.facebook.com/v19.0/oauth/access_token` +
      `?grant_type=fb_exchange_token&client_id=${appId}` +
      `&client_secret=${appSecret}&fb_exchange_token=${shortLived}`

    const res = await fetch(url)
    if (!res.ok) throw new BadRequestException('Falha ao obter long-lived token')
    return res.json() as Promise<{ access_token: string; expires_in: number }>
  }

  private async fetchFacebookPages(userToken: string) {
    const res = await fetch(
      `https://graph.facebook.com/v19.0/me/accounts?fields=id,name,access_token,picture&access_token=${userToken}`,
    )
    if (!res.ok) throw new BadRequestException('Falha ao listar páginas do Facebook')
    const data = (await res.json()) as { data: any[] }
    return data.data
  }

  private async fetchInstagramAccount(pageId: string, pageToken: string) {
    const res = await fetch(
      `https://graph.facebook.com/v19.0/${pageId}?fields=instagram_business_account{id,name,profile_picture_url}&access_token=${pageToken}`,
    )
    if (!res.ok) return null
    const data = (await res.json()) as { instagram_business_account?: any }
    return data.instagram_business_account ?? null
  }

  // ── criptografia AES-256-GCM ─────────────────────────────────────────────

  encrypt(text: string): string {
    const iv = randomBytes(16)
    const cipher = createCipheriv('aes-256-gcm', this.encKey, iv)
    const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()])
    const tag = cipher.getAuthTag()
    return Buffer.concat([iv, tag, encrypted]).toString('base64')
  }

  decrypt(data: string): string {
    const buf = Buffer.from(data, 'base64')
    const iv = buf.subarray(0, 16)
    const tag = buf.subarray(16, 32)
    const encrypted = buf.subarray(32)
    const decipher = createDecipheriv('aes-256-gcm', this.encKey, iv)
    decipher.setAuthTag(tag)
    return decipher.update(encrypted) + decipher.final('utf8')
  }

  private requireRole(userRole: string, allowed: string[]) {
    if (!allowed.includes(userRole)) {
      throw new ForbiddenException('Sem permissão para esta ação')
    }
  }
}
