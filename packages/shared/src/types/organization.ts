import { MemberRole } from './auth'

export type OrganizationPlan = 'free' | 'starter' | 'pro' | 'agency'

export interface Organization {
  id: string
  name: string
  slug: string
  plan: OrganizationPlan
  trialEndsAt: Date | null
  createdAt: Date
}

export interface OrganizationMember {
  id: string
  organizationId: string
  userId: string
  role: MemberRole
  acceptedAt: Date | null
  createdAt: Date
  user?: {
    id: string
    name: string
    email: string
    avatarUrl: string | null
  }
}

export interface Brand {
  id: string
  organizationId: string
  name: string
  avatarUrl: string | null
  color: string | null
  createdAt: Date
}

export interface CreateBrandDto {
  name: string
  color?: string
}

export interface InviteMemberDto {
  email: string
  role: MemberRole
}
