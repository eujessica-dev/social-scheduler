import { Platform } from './social-account'

export type PostStatus =
  | 'draft'
  | 'pending_approval'
  | 'approved'
  | 'scheduled'
  | 'publishing'
  | 'published'
  | 'failed'
  | 'cancelled'

export type PostPlatformStatus = 'pending' | 'publishing' | 'published' | 'failed'

export interface Post {
  id: string
  organizationId: string
  brandId: string
  title: string | null
  caption: string | null
  hashtags: string[]
  status: PostStatus
  scheduledAt: Date | null
  timezone: string
  notes: string | null
  createdAt: Date
  updatedAt: Date
  createdBy?: { id: string; name: string }
  approvedBy?: { id: string; name: string } | null
  platforms?: PostPlatform[]
  media?: PostMedia[]
}

export interface PostPlatform {
  id: string
  postId: string
  socialAccountId: string
  platform: Platform
  platformPostId: string | null
  status: PostPlatformStatus
  errorMessage: string | null
  publishedAt: Date | null
}

export interface PostMedia {
  id: string
  postId: string
  mediaAssetId: string
  order: number
}

export interface CreatePostDto {
  brandId: string
  title?: string
  caption?: string
  hashtags?: string[]
  scheduledAt?: string
  timezone?: string
  notes?: string
  mediaAssetIds?: string[]
  socialAccountIds: string[]
}

export interface UpdatePostDto {
  title?: string
  caption?: string
  hashtags?: string[]
  scheduledAt?: string
  timezone?: string
  notes?: string
  mediaAssetIds?: string[]
  socialAccountIds?: string[]
}
