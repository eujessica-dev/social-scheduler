import { Processor, Process, OnQueueFailed, OnQueueCompleted } from '@nestjs/bull'
import { Logger } from '@nestjs/common'
import { Job } from 'bull'
import { PrismaService } from '../../config/prisma.service'
import { SocialAccountsService } from '../social-accounts/social-accounts.service'
import { QUEUE_NAMES } from '@social-scheduler/shared'

interface PublishJobData {
  postId: string
}

@Processor(QUEUE_NAMES.PUBLISHING)
export class PublishingProcessor {
  private readonly logger = new Logger(PublishingProcessor.name)

  constructor(
    private readonly prisma: PrismaService,
    private readonly socialAccounts: SocialAccountsService,
  ) {}

  @Process('publish')
  async handlePublish(job: Job<PublishJobData>) {
    const { postId } = job.data
    this.logger.log(`Iniciando publicação do post ${postId}`)

    await this.prisma.scheduledJob.updateMany({
      where: { postId },
      data: { status: 'processing', lastAttemptAt: new Date(), attempts: job.attemptsMade + 1 },
    })

    await this.prisma.post.update({
      where: { id: postId },
      data: { status: 'publishing' },
    })

    const post = await this.prisma.post.findUnique({
      where: { id: postId },
      include: {
        platforms: { include: { socialAccount: { include: { oauthToken: true } } } },
        media: { include: { mediaAsset: true }, orderBy: { order: 'asc' } },
      },
    })

    if (!post) throw new Error(`Post ${postId} não encontrado`)

    const results = await Promise.allSettled(
      post.platforms.map((platform) => this.publishToPlatform(platform, post)),
    )

    const allSuccess = results.every((r) => r.status === 'fulfilled')
    const anySuccess = results.some((r) => r.status === 'fulfilled')

    // Post is "published" if at least one platform succeeded; "failed" only if all failed
    await this.prisma.post.update({
      where: { id: postId },
      data: { status: anySuccess ? 'published' : 'failed' },
    })

    // Job is "completed" only if every platform succeeded
    await this.prisma.scheduledJob.updateMany({
      where: { postId },
      data: { status: allSuccess ? 'completed' : 'failed' },
    })

    this.logger.log(`Post ${postId} finalizado. Sucesso: ${allSuccess}`)
  }

  private async publishToPlatform(platform: any, post: any) {
    const startedAt = Date.now()

    await this.prisma.postPlatform.update({
      where: { id: platform.id },
      data: { status: 'publishing' },
    })

    try {
      const token = platform.socialAccount.oauthToken
      if (!token) throw new Error('Token OAuth não encontrado')

      const accessToken = this.socialAccounts.decrypt(token.accessTokenEncrypted)

      let platformPostId: string

      if (platform.platform === 'instagram') {
        platformPostId = await this.publishToInstagram(post, accessToken, platform.socialAccount.platformUserId)
      } else if (platform.platform === 'facebook') {
        platformPostId = await this.publishToFacebook(post, accessToken, platform.socialAccount.platformUserId)
      } else {
        throw new Error(`Plataforma ${platform.platform} ainda não suportada`)
      }

      await this.prisma.postPlatform.update({
        where: { id: platform.id },
        data: { status: 'published', platformPostId, publishedAt: new Date() },
      })

      await this.prisma.publishingLog.create({
        data: {
          postPlatformId: platform.id,
          attemptNumber: 1,
          success: true,
          durationMs: Date.now() - startedAt,
          responsePayload: { platformPostId },
          httpStatus: 200,
        },
      })
    } catch (error: any) {
      await this.prisma.postPlatform.update({
        where: { id: platform.id },
        data: { status: 'failed', errorMessage: error.message },
      })

      await this.prisma.publishingLog.create({
        data: {
          postPlatformId: platform.id,
          attemptNumber: 1,
          success: false,
          durationMs: Date.now() - startedAt,
          responsePayload: { error: error.message },
        },
      })

      throw error
    }
  }

  private async publishToInstagram(post: any, accessToken: string, igUserId: string): Promise<string> {
    const mediaAsset = post.media[0]?.mediaAsset

    const containerBody: Record<string, string> = {
      caption: this.buildCaption(post),
      access_token: accessToken,
    }

    if (mediaAsset?.mimeType?.startsWith('video/')) {
      containerBody.media_type = 'REELS'
      containerBody.video_url = mediaAsset.storageKey
    } else if (mediaAsset) {
      containerBody.image_url = mediaAsset.storageKey
    }

    const containerRes = await fetch(
      `https://graph.facebook.com/v19.0/${igUserId}/media`,
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(containerBody) },
    )

    if (!containerRes.ok) {
      const err = await containerRes.json()
      throw new Error(`Instagram container error: ${JSON.stringify(err)}`)
    }

    const { id: containerId } = (await containerRes.json()) as { id: string }

    const publishRes = await fetch(
      `https://graph.facebook.com/v19.0/${igUserId}/media_publish`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ creation_id: containerId, access_token: accessToken }),
      },
    )

    if (!publishRes.ok) {
      const err = await publishRes.json()
      throw new Error(`Instagram publish error: ${JSON.stringify(err)}`)
    }

    const { id } = (await publishRes.json()) as { id: string }
    return id
  }

  private async publishToFacebook(post: any, accessToken: string, pageId: string): Promise<string> {
    const mediaAsset = post.media[0]?.mediaAsset
    const caption = this.buildCaption(post)

    let endpoint = `https://graph.facebook.com/v19.0/${pageId}/feed`
    const body: Record<string, string> = { message: caption, access_token: accessToken }

    if (mediaAsset?.mimeType?.startsWith('image/')) {
      endpoint = `https://graph.facebook.com/v19.0/${pageId}/photos`
      body.url = mediaAsset.storageKey
      body.caption = caption
    }

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    if (!res.ok) {
      const err = await res.json()
      throw new Error(`Facebook publish error: ${JSON.stringify(err)}`)
    }

    const data = (await res.json()) as { id: string; post_id?: string }
    return data.post_id ?? data.id
  }

  private buildCaption(post: any): string {
    const parts = [post.caption ?? '']
    if (post.hashtags?.length) parts.push(post.hashtags.join(' '))
    return parts.filter(Boolean).join('\n\n')
  }

  @OnQueueFailed()
  async onFailed(job: Job<PublishJobData>, error: Error) {
    this.logger.error(`Post ${job.data.postId} falhou na tentativa ${job.attemptsMade}: ${error.message}`)

    if (job.attemptsMade >= (job.opts.attempts ?? 3)) {
      await this.prisma.post.update({
        where: { id: job.data.postId },
        data: { status: 'failed' },
      })
      await this.prisma.scheduledJob.updateMany({
        where: { postId: job.data.postId },
        data: { status: 'failed' },
      })
    }
  }

  @OnQueueCompleted()
  onCompleted(job: Job<PublishJobData>) {
    this.logger.log(`Post ${job.data.postId} publicado com sucesso`)
  }
}
