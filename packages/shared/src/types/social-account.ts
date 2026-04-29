export type Platform = 'instagram' | 'facebook' | 'tiktok'

export type SocialAccountStatus = 'active' | 'disconnected' | 'expired' | 'error'

export interface SocialAccount {
  id: string
  organizationId: string
  brandId: string | null
  platform: Platform
  platformUserId: string
  accountName: string
  accountAvatar: string | null
  status: SocialAccountStatus
  connectedAt: Date
  disconnectedAt: Date | null
}
