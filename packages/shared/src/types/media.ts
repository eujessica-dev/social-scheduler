export type MediaStatus = 'uploading' | 'ready' | 'error' | 'deleted'

export interface MediaAsset {
  id: string
  organizationId: string
  brandId: string | null
  filename: string
  mimeType: string
  sizeBytes: number
  width: number | null
  height: number | null
  durationSeconds: number | null
  status: MediaStatus
  createdAt: Date
  url?: string
}
