'use client'

import { useEffect, useState, useCallback } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Search, Check, Loader2, X, RefreshCw, CalendarDays, BarChart2, ArrowRight, AlertCircle } from 'lucide-react'
import { api } from '@/lib/api'
import { toast } from 'sonner'

const PLATFORM_META: Record<string, { label: string; gradient: string; emoji: string }> = {
  instagram: { label: 'Instagram', gradient: 'from-purple-500 via-pink-500 to-orange-400', emoji: '📸' },
  facebook:  { label: 'Facebook',  gradient: 'from-blue-600 to-blue-500',                  emoji: '👥' },
}

interface Account {
  platformUserId: string
  accountName: string
  accountAvatar: string | null
  platform: string
}

type Screen = 'loading' | 'error' | 'select' | 'connecting' | 'success'

export default function ConnectSelectPage() {
  const searchParams = useSearchParams()
  const router       = useRouter()
  const token        = searchParams.get('token') ?? ''
  const errorParam   = searchParams.get('error')

  const [screen, setScreen]     = useState<Screen>(errorParam ? 'error' : 'loading')
  const [accounts, setAccounts] = useState<Account[]>([])
  const [selected, setSelected] = useState<string>('')
  const [query, setQuery]       = useState('')
  const [errorMsg, setErrorMsg] = useState(errorParam ?? '')
  const [connected, setConnected] = useState<Account | null>(null)

  const load = useCallback(async () => {
    if (!token) { setErrorMsg('Token inválido'); setScreen('error'); return }
    try {
      const { data } = await api.get(`/social-accounts/meta/pending/${token}`, { skipAuth: true } as any)
      setAccounts(data.accounts)
      setScreen('select')
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message ?? 'Sessão expirada ou inválida')
      setScreen('error')
    }
  }, [token])

  useEffect(() => { if (!errorParam) load() }, [load, errorParam])

  const filtered = accounts.filter((a) =>
    a.accountName.toLowerCase().includes(query.toLowerCase()),
  )

  const handleNext = async () => {
    if (!selected) return
    setScreen('connecting')
    try {
      const { data } = await api.post('/social-accounts/meta/finalize', { token, platformUserId: selected })
      setConnected(data)
      setScreen('success')
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? 'Erro ao conectar conta')
      setScreen('select')
    }
  }

  const goSchedule  = () => router.push('/posts/new')
  const goMetrics   = () => router.push('/metrics')
  const goConnect   = () => router.push('/settings/social-accounts')
  const goDashboard = () => router.push('/dashboard')

  // ── LOADING ──────────────────────────────────────────────────────
  if (screen === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-violet-600 animate-spin" />
          <p className="text-sm text-gray-500">Carregando contas disponíveis...</p>
        </div>
      </div>
    )
  }

  // ── ERROR ────────────────────────────────────────────────────────
  if (screen === 'error') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 max-w-md w-full text-center">
          <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-7 h-7 text-red-500" />
          </div>
          <h2 className="text-lg font-bold text-gray-900 mb-2">Algo deu errado</h2>
          <p className="text-sm text-gray-500 mb-6">{errorMsg}</p>
          <button onClick={goDashboard} className="px-6 py-2.5 bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold rounded-xl transition-colors">
            Ir para o dashboard
          </button>
        </div>
      </div>
    )
  }

  // ── CONNECTING ───────────────────────────────────────────────────
  if (screen === 'connecting') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-violet-600 animate-spin" />
          <p className="text-sm text-gray-500">Conectando sua conta...</p>
        </div>
      </div>
    )
  }

  // ── SUCCESS ──────────────────────────────────────────────────────
  if (screen === 'success' && connected) {
    const meta = PLATFORM_META[connected.platform] ?? { label: connected.platform, gradient: 'from-gray-500 to-gray-400', emoji: '🔗' }
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        {/* Fundo desfocado */}
        <div className="fixed inset-0 bg-white/60 backdrop-blur-sm" />

        <div className="relative bg-white rounded-3xl shadow-xl border border-gray-100 w-full max-w-md p-8 text-center z-10">
          {/* Botão fechar */}
          <button onClick={goDashboard} className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 transition-colors">
            <X className="w-4 h-4 text-gray-600" />
          </button>

          {/* Ícone de sucesso */}
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-5">
            <Check className="w-8 h-8 text-green-600" strokeWidth={2.5} />
          </div>

          <h2 className="text-xl font-bold text-gray-900 mb-1">
            Sua conta foi conectada com sucesso!
          </h2>

          {/* Avatar + nome da conta conectada */}
          <div className="flex items-center justify-center gap-2 mt-3 mb-6">
            <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${meta.gradient} flex items-center justify-center text-sm`}>
              {connected.accountAvatar
                ? <img src={connected.accountAvatar} alt="" className="w-full h-full rounded-full object-cover" />
                : meta.emoji
              }
            </div>
            <span className="text-sm font-medium text-gray-700">{connected.accountName}</span>
            <span className="text-xs text-gray-400">· {meta.label}</span>
          </div>

          <p className="text-sm text-gray-500 mb-6">Agora você já pode:</p>

          <div className="flex gap-3">
            <button
              onClick={goMetrics}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 border border-violet-200 text-violet-700 rounded-xl text-sm font-medium hover:bg-violet-50 transition-colors"
            >
              <BarChart2 className="w-4 h-4" />
              Gerar relatórios
            </button>
            <button
              onClick={goSchedule}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-sm font-semibold transition-colors"
            >
              <CalendarDays className="w-4 h-4" />
              Agendar posts
            </button>
          </div>

          <button onClick={goConnect} className="mt-4 text-sm text-gray-400 hover:text-gray-600 underline transition-colors">
            ou continuar conectando contas
          </button>
        </div>
      </div>
    )
  }

  // ── SELECT ───────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-white/60 backdrop-blur-sm" />

      <div className="relative bg-white rounded-3xl shadow-xl border border-gray-100 w-full max-w-lg z-10">
        {/* Header */}
        <div className="flex items-center gap-3 px-6 py-5 border-b border-gray-100">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400 flex items-center justify-center text-lg">
            📸
          </div>
          <div>
            <h2 className="font-bold text-gray-900">Selecione a conta que deseja gerenciar</h2>
            <p className="text-xs text-gray-400 mt-0.5">{accounts.length} conta{accounts.length !== 1 ? 's' : ''} disponível{accounts.length !== 1 ? 'is' : ''}</p>
          </div>
          <button onClick={goDashboard} className="ml-auto w-7 h-7 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 transition-colors">
            <X className="w-3.5 h-3.5 text-gray-500" />
          </button>
        </div>

        {/* Busca */}
        <div className="px-6 py-3 border-b border-gray-100">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Filtrar pelo nome do perfil"
              className="w-full pl-9 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Lista de contas */}
        <div className="max-h-64 overflow-y-auto divide-y divide-gray-50">
          {filtered.length === 0 ? (
            <p className="text-center text-sm text-gray-400 py-8">Nenhuma conta encontrada</p>
          ) : (
            filtered.map((acc) => {
              const meta = PLATFORM_META[acc.platform] ?? { label: acc.platform, gradient: 'from-gray-500 to-gray-400', emoji: '🔗' }
              const isSel = selected === acc.platformUserId
              return (
                <button
                  key={acc.platformUserId}
                  onClick={() => setSelected(acc.platformUserId)}
                  className={`w-full flex items-center gap-3 px-6 py-3.5 hover:bg-gray-50 transition-colors text-left ${isSel ? 'bg-violet-50' : ''}`}
                >
                  {/* Radio */}
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${isSel ? 'border-violet-600 bg-violet-600' : 'border-gray-300'}`}>
                    {isSel && <div className="w-2 h-2 rounded-full bg-white" />}
                  </div>

                  {/* Avatar */}
                  <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${meta.gradient} flex items-center justify-center text-base flex-shrink-0`}>
                    {acc.accountAvatar
                      ? <img src={acc.accountAvatar} alt="" className="w-full h-full rounded-full object-cover" />
                      : meta.emoji
                    }
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{acc.accountName}</p>
                    <p className="text-xs text-gray-400">{meta.label}</p>
                  </div>
                </button>
              )
            })
          )}
        </div>

        {/* Rodapé */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100">
          <button onClick={goDashboard} className="text-sm text-gray-500 hover:text-gray-700 underline transition-colors">
            Cancelar
          </button>
          <div className="flex items-center gap-3">
            <button onClick={load} className="flex items-center gap-1.5 text-sm text-violet-600 hover:text-violet-700 border border-violet-200 rounded-xl px-3 py-2 transition-colors">
              <RefreshCw className="w-3.5 h-3.5" />
              Atualizar lista
            </button>
            <button
              onClick={handleNext}
              disabled={!selected}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                selected
                  ? 'bg-violet-600 hover:bg-violet-700 text-white shadow-sm'
                  : 'bg-gray-100 text-gray-400 cursor-not-allowed'
              }`}
            >
              Próximo
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
