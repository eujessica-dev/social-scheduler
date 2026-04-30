'use client'

import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { toast } from 'sonner'
import { Plug, Unplug, RefreshCw, CheckCircle2, AlertCircle, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SocialAccount {
  id: string
  platform: string
  accountName: string
  accountAvatar: string | null
  status: string
  connectedAt: string
  oauthToken: { expiresAt: string | null; scopes: string[] } | null
}

const platformConfig: Record<string, { label: string; color: string; icon: string }> = {
  instagram: { label: 'Instagram', color: 'bg-gradient-to-br from-purple-500 to-pink-500', icon: '📸' },
  facebook:  { label: 'Facebook',  color: 'bg-blue-600', icon: '👥' },
  tiktok:    { label: 'TikTok',    color: 'bg-black', icon: '🎵' },
}

const statusConfig: Record<string, { label: string; icon: typeof CheckCircle2; color: string }> = {
  active:       { label: 'Conectada',    icon: CheckCircle2, color: 'text-green-600' },
  disconnected: { label: 'Desconectada', icon: Unplug,       color: 'text-gray-400' },
  expired:      { label: 'Expirada',     icon: Clock,        color: 'text-yellow-600' },
  error:        { label: 'Erro',         icon: AlertCircle,  color: 'text-red-500' },
}

export default function SocialAccountsPage() {
  const [accounts, setAccounts] = useState<SocialAccount[]>([])
  const [loading, setLoading]   = useState(true)

  const load = async () => {
    try {
      const res = await api.get('/social-accounts')
      setAccounts(res.data)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const connectMeta = () => {
    window.location.href = `${process.env.NEXT_PUBLIC_API_URL}/social-accounts/meta/connect`
  }

  const disconnect = async (id: string, name: string) => {
    if (!confirm(`Desconectar a conta "${name}"?`)) return
    try {
      await api.delete(`/social-accounts/${id}`)
      toast.success('Conta desconectada')
      setAccounts((prev) =>
        prev.map((a) => (a.id === id ? { ...a, status: 'disconnected' } : a)),
      )
    } catch {
      toast.error('Erro ao desconectar conta')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-violet-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="max-w-2xl space-y-6">
      {/* Conectar nova conta */}
      <div className="bg-white rounded-xl border border-gray-100 p-5">
        <h3 className="font-semibold text-gray-900 text-sm mb-4">Conectar conta</h3>
        <div className="grid grid-cols-3 gap-3">
          <button
            onClick={connectMeta}
            className="flex flex-col items-center gap-2 p-4 border border-gray-200 rounded-xl hover:border-violet-400 hover:bg-violet-50/30 transition-all"
          >
            <span className="text-2xl">📸</span>
            <span className="text-xs font-medium text-gray-700">Instagram</span>
          </button>
          <button
            onClick={connectMeta}
            className="flex flex-col items-center gap-2 p-4 border border-gray-200 rounded-xl hover:border-violet-400 hover:bg-violet-50/30 transition-all"
          >
            <span className="text-2xl">👥</span>
            <span className="text-xs font-medium text-gray-700">Facebook</span>
          </button>
          <button
            disabled
            className="flex flex-col items-center gap-2 p-4 border border-gray-100 rounded-xl opacity-40 cursor-not-allowed"
          >
            <span className="text-2xl">🎵</span>
            <span className="text-xs font-medium text-gray-700">TikTok</span>
            <span className="text-xs text-gray-400">Em breve</span>
          </button>
        </div>
      </div>

      {/* Contas conectadas */}
      <div className="bg-white rounded-xl border border-gray-100 p-5">
        <h3 className="font-semibold text-gray-900 text-sm mb-4">
          Contas conectadas ({accounts.length})
        </h3>

        {accounts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <Plug className="w-10 h-10 text-gray-200 mb-3" />
            <p className="text-gray-500 text-sm">Nenhuma conta conectada ainda.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {accounts.map((account) => {
              const platform = platformConfig[account.platform]
              const status   = statusConfig[account.status] ?? statusConfig.error
              const StatusIcon = status.icon

              return (
                <div
                  key={account.id}
                  className="flex items-center gap-4 p-3 rounded-xl border border-gray-100 hover:bg-gray-50 transition-colors"
                >
                  {/* Avatar */}
                  <div className={cn('w-10 h-10 rounded-full flex items-center justify-center text-white text-base flex-shrink-0', platform?.color ?? 'bg-gray-400')}>
                    {account.accountAvatar ? (
                      <img src={account.accountAvatar} alt="" className="w-full h-full rounded-full object-cover" />
                    ) : (
                      platform?.icon
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{account.accountName}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <StatusIcon className={cn('w-3 h-3', status.color)} />
                      <span className={cn('text-xs', status.color)}>{status.label}</span>
                      <span className="text-xs text-gray-300">·</span>
                      <span className="text-xs text-gray-400 capitalize">{platform?.label}</span>
                    </div>
                  </div>

                  {/* Ações */}
                  <button
                    onClick={() => disconnect(account.id, account.accountName)}
                    className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-red-500 transition-colors"
                  >
                    <Unplug className="w-3.5 h-3.5" />
                    Desconectar
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
