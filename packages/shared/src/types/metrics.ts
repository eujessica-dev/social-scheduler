export interface MetricsSnapshot {
  id: string
  postPlatformId: string | null
  socialAccountId: string
  collectedAt: Date
  reach: number | null
  impressions: number | null
  likes: number | null
  comments: number | null
  shares: number | null
  saves: number | null
  views: number | null
  clicks: number | null
  engagementRate: number | null
}
