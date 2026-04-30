import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { api } from '@/lib/api'

interface AuthUser {
  sub: string
  email: string
  organizationId: string
  role: string
}

interface AuthState {
  user: AuthUser | null
  accessToken: string | null
  isLoading: boolean
  setTokens: (accessToken: string, user: AuthUser) => void
  logout: () => Promise<void>
  initialize: () => Promise<void>
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      isLoading: true,

      setTokens: (accessToken, user) => {
        localStorage.setItem('access_token', accessToken)
        set({ user, accessToken })
      },

      logout: async () => {
        try {
          await api.post('/auth/logout')
        } catch {}
        localStorage.removeItem('access_token')
        set({ user: null, accessToken: null })
        window.location.href = '/login'
      },

      initialize: async () => {
        const token = localStorage.getItem('access_token')
        if (!token) {
          set({ isLoading: false })
          return
        }
        try {
          const { data } = await api.get('/auth/me')
          set({ user: data, accessToken: token, isLoading: false })
        } catch {
          localStorage.removeItem('access_token')
          set({ user: null, accessToken: null, isLoading: false })
        }
      },
    }),
    {
      name: 'auth-store',
      partialize: (state) => ({ user: state.user, accessToken: state.accessToken }),
    },
  ),
)
