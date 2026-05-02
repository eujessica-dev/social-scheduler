'use client'

import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { toast } from 'sonner'
import { Settings, Unplug, CheckCircle2, AlertCircle, Clock, Info } from 'lucide-react'
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

// ── Configuração visual de cada plataforma ────────────────────────────────────
const PLATFORM_CONFIG: Record<string, {
  label: string
  gradient: string         // gradiente do card conectado
  iconBg: string           // fundo do ícone quando não conectado
  emoji: string
  available: boolean
  tag?: string
}> = {
  instagram:  { label: 'Instagram',        gradient: 'from-purple-600 via-pink-500 to-orange-400', iconBg: 'bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400', emoji: '📸', available: true  },
  facebook:   { label: 'Facebook',         gradient: 'from-blue-700 to-blue-500',                  iconBg: 'bg-blue-600',                                                  emoji: '👥', available: true  },
  tiktok:     { label: 'TikTok',           gradient: 'from-gray-900 via-gray-800 to-black',         iconBg: 'bg-black',                                                     emoji: '🎵', available: false },
  youtube:    { label: 'YouTube',          gradient: 'from-red-600 to-red-500',                     iconBg: 'bg-red-600',                                                   emoji: '▶️', available: false },
  linkedin:   { label: 'LinkedIn Pages',   gradient: 'from-blue-800 to-sky-600',                    iconBg: 'bg-blue-700',                                                  emoji: '🔗', available: false },
  pinterest:  { label: 'Pinterest',        gradient: 'from-red-600 to-pink-500',                    iconBg: 'bg-red-500',                                                   emoji: '📌', available: false },
  threads:    { label: 'Threads',          gradient: 'from-gray-900 to-gray-700',                   iconBg: 'bg-gray-900',                                                  emoji: '🧵', available: false },
  twitter:    { label: 'X (Twitter)',      gradient: 'from-gray-900 to-gray-800',                   iconBg: 'bg-black',                                                     emoji: '✖',  available: false },
  google:     { label: 'Google Meu Neg.',  gradient: 'from-blue-500 to-green-500',                  iconBg: 'bg-gradient-to-br from-blue-500 to-green-500',                 emoji: '🏬', available: false },
  analytics:  { label: 'Google Analytics', gradient: 'from-orange-500 to-yellow-400',               iconBg: 'bg-orange-500',                                                emoji: '📊', available: false },
}

// Ordem de exibição
const PLATFORM_ORDER = ['instagram','facebook','tiktok','youtube','linkedin','pinterest','threads','twitter','google','analytics']

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

  const connectMeta = async () => {
    try {
      const { data } = await api.get('/social-accounts/meta/connect')
      window.location.href = data.url
    } catch {
      toast.error('Erro ao iniciar conexão. Tente novamente.')
    }
  }

  const disconnect = async (id: string, name: string) => {
    if (!confirm(`Desconectar a conta "${name}"?`)) return
    try {
      await api.delete(`/social-accounts/${id}`)
      toast.success('Conta desconectada')
      setAccounts((prev) => prev.filter((a) => a.id !== id))
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

  // Mapeia plataformas → conta ativa
  const accountByPlatform = new Map<string, SocialAccount>()
  for (const acc of accounts) {
    if (acc.status === 'active') accountByPlatform.set(acc.platform, acc)
  }

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h2 className="text-lg font-bold text-gray-900">Contas Sociais</h2>
        <p className="text-sm text-gray-500 mt-0.5">Conecte suas redes sociais para agendar e publicar posts.</p>
      </div>

      {/* Grid de plataformas */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {PLATFORM_ORDER.map((platformId) => {
          const cfg     = PLATFORM_CONFIG[platformId]
          if (!cfg) return null
          const account = accountByPlatform.get(platformId)
          const isConnected = !!account

          // ── Card CONECTADO ──────────────────────────────────────────────
          if (isConnected && account) {
            return (
              <div
                key={platformId}
                className={cn(
                  'relative rounded-2xl overflow-hidden shadow-md',
                  `bg-gradient-to-br ${cfg.gradient}`,
                )}
                style={{ minHeight: 160 }}
              >
                {/* Botão de configurações */}
                <button
                  onClick={() => disconnect(account.id, account.accountName)}
                  title="Desconectar"
                  className="absolute top-2.5 right-2.5 w-7 h-7 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors backdrop-blur-sm"
                >
                  <Settings className="w-3.5 h-3.5 text-white" />
                </button>

                {/* Avatar + nome */}
                <div className="p-4 pt-5 flex flex-col h-full">
                  <div className="flex items-center gap-2 mb-auto">
                    {account.accountAvatar ? (
                      <img src={account.accountAvatar} alt="" className="w-8 h-8 rounded-full object-cover border-2 border-white/40 flex-shrink-0" />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white text-base flex-shrink-0">
                        {cfg.emoji}
                      </div>
                    )}
                    <p className="text-white text-xs font-semibold leading-tight line-clamp-2 flex-1 min-w-0">
                      {account.accountName}
                    </p>
                  </div>

                  {/* Badge CONECTADO */}
                  <div className="mt-3">
                    <span className="inline-flex items-center gap-1 bg-white/20 backdrop-blur-sm text-white text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full">
                      <CheckCircle2 className="w-2.5 h-2.5" />
                      Conectado
                    </span>
                  </div>
                </div>
              </div>
            )
          }

          // ── Card NÃO conectado ──────────────────────────────────────────
          return (
            <div
              key={platformId}
              className="relative rounded-2xl border border-gray-200 bg-white p-4 flex flex-col items-center gap-3 hover:border-gray-300 hover:shadow-sm transition-all"
              style={{ minHeight: 160 }}
            >
              {/* Info icon */}
              <button className="absolute top-2.5 right-2.5 text-gray-300 hover:text-gray-400 transition-colors">
                <Info className="w-4 h-4" />
              </button>

              {/* Ícone da plataforma */}
              <div className={cn('w-14 h-14 rounded-full flex items-center justify-center text-2xl text-white shadow-sm mt-1', cfg.iconBg)}>
                {cfg.emoji}
              </div>

              <p className="text-sm font-medium text-gray-700 text-center leading-tight">{cfg.label}</p>

              {cfg.available ? (
                <button
                  onClick={platformId === 'instagram' || platformId === 'facebook' ? connectMeta : undefined}
                  className="mt-auto w-full py-1.5 bg-violet-600 hover:bg-violet-700 text-white text-xs font-semibold rounded-lg transition-colors"
                >
                  Conectar
                </button>
              ) : (
                <div className="mt-auto w-full py-1.5 bg-amber-50 border border-amber-200 rounded-lg text-center">
                  <span className="text-xs text-amber-600 font-semibold">Em breve</span>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Contas com problema (expiradas/erro) */}
      {accounts.filter((a) => a.status !== 'active').length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <h3 className="font-semibold text-gray-900 text-sm mb-3 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-yellow-500" />
            Contas com atenção necessária
          </h3>
          <div className="space-y-2">
            {accounts.filter((a) => a.status !== 'active').map((account) => {
              const cfg = PLATFORM_CONFIG[account.platform]
              return (
                <div key={account.id} className="flex items-center gap-3 p-3 rounded-xl border border-yellow-100 bg-yellow-50">
                  <div className={cn('w-9 h-9 rounded-full flex items-center justify-center text-white text-base', cfg?.iconBg ?? 'bg-gray-400')}>
                    {account.accountAvatar
                      ? <img src={account.accountAvatar} alt="" className="w-full h-full rounded-full object-cover" />
                      : cfg?.emoji
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{account.accountName}</p>
                    <p className="text-xs text-yellow-600 capitalize flex items-center gap-1">
                      {account.status === 'expired' ? <Clock className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                      {account.status === 'expired' ? 'Token expirado' : 'Erro na conexão'}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {(account.platform === 'instagram' || account.platform === 'facebook') && (
                      <button
                        onClick={connectMeta}
                        className="text-xs text-violet-600 hover:underline font-medium"
                      >
                        Reconectar
                      </button>
                    )}
                    <button
                      onClick={() => disconnect(account.id, account.accountName)}
                      className="text-xs text-red-400 hover:text-red-600 transition-colors"
                    >
                      <Unplug className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
