export interface JwtPayload {
  sub: string
  email: string
  organizationId: string
  role: MemberRole
  iat?: number
  exp?: number
}

export type MemberRole = 'owner' | 'admin' | 'editor' | 'client' | 'finance' | 'readonly'

export interface LoginDto {
  email: string
  password: string
}

export interface RegisterDto {
  name: string
  email: string
  password: string
}

export interface AuthTokens {
  accessToken: string
}

export interface UserProfile {
  id: string
  name: string
  email: string
  avatarUrl: string | null
  emailVerifiedAt: Date | null
  twoFactorEnabled: boolean
  onboardingCompletedAt: Date | null
  createdAt: Date
}
