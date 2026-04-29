export const PLATFORMS = ['instagram', 'facebook', 'tiktok'] as const

export const MEMBER_ROLES = ['owner', 'admin', 'editor', 'client', 'finance', 'readonly'] as const

export const POST_STATUSES = [
  'draft',
  'pending_approval',
  'approved',
  'scheduled',
  'publishing',
  'published',
  'failed',
  'cancelled',
] as const

export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']

export const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/quicktime', 'video/mpeg', 'video/avi']

export const MAX_IMAGE_SIZE_BYTES = 50 * 1024 * 1024  // 50MB
export const MAX_VIDEO_SIZE_BYTES = 1024 * 1024 * 1024 // 1GB

export const QUEUE_NAMES = {
  PUBLISHING: 'publishing',
  METRICS: 'metrics',
  NOTIFICATIONS: 'notifications',
  TOKEN_REFRESH: 'token-refresh',
} as const

export const PLAN_LIMITS = {
  free:    { socialAccounts: 2,  scheduledPosts: 10,  members: 1 },
  starter: { socialAccounts: 5,  scheduledPosts: 50,  members: 3 },
  pro:     { socialAccounts: 15, scheduledPosts: 200, members: 10 },
  agency:  { socialAccounts: 50, scheduledPosts: -1,  members: -1 },
} as const
