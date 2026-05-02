'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, ArrowRight, Check, X, Info } from 'lucide-react'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import { useAuthStore } from '@/store/auth.store'

// ── Passos do quiz ──────────────────────────────────────────────────
const STEPS = [
  {
    id: 'brands',
    icon: '📋',
    question: 'Quantas marcas você gerencia nas redes sociais?',
    subtitle: 'Selecione uma opção:',
    options: [
      { value: '1',   label: '1',     sub: 'Marca' },
      { value: '2-5', label: '2 a 5', sub: 'Marcas' },
      { value: '6-9', label: '6 a 9', sub: 'Marcas' },
      { value: '10+', label: '10+',   sub: 'Marcas' },
    ],
  },
  {
    id: 'role',
    icon: '👤',
    question: 'Qual é o seu perfil de uso?',
    subtitle: 'Isso nos ajuda a personalizar sua experiência:',
    options: [
      { value: 'agency',     label: '🏢', sub: 'Agência' },
      { value: 'freelancer', label: '💼', sub: 'Freelancer' },
      { value: 'company',    label: '🏬', sub: 'Empresa' },
      { value: 'creator',    label: '🎨', sub: 'Criador' },
    ],
  },
  {
    id: 'goal',
    icon: '🎯',
    question: 'Qual é seu principal objetivo aqui?',
    subtitle: 'Pode escolher o que mais se encaixa:',
    options: [
      { value: 'schedule',  label: '🗓️', sub: 'Agendar posts' },
      { value: 'team',      label: '👥', sub: 'Gerenciar equipe' },
      { value: 'approval',  label: '✅', sub: 'Aprovação de clientes' },
      { value: 'analytics', label: '📊', sub: 'Ver métricas' },
    ],
  },
]

const STEP_COLORS = [
  { bg: 'bg-violet-50',  border: 'border-violet-200', selected: 'bg-violet-600 border-violet-600 text-white', dot: 'bg-violet-600', icon: 'bg-violet-100 text-violet-600' },
  { bg: 'bg-indigo-50',  border: 'border-indigo-200', selected: 'bg-indigo-600 border-indigo-600 text-white',  dot: 'bg-indigo-600', icon: 'bg-indigo-100 text-indigo-600' },
  { bg: 'bg-emerald-50', border: 'border-emerald-200', selected: 'bg-emerald-600 border-emerald-600 text-white', dot: 'bg-emerald-600', icon: 'bg-emerald-100 text-emerald-600' },
]

// ── Plataformas disponíveis para conectar ───────────────────────────
const PLATFORMS = [
  // ativas
  { id: 'instagram', label: 'Instagram',      emoji: '📸',  gradient: 'from-purple-500 via-pink-500 to-orange-400', available: true  },
  { id: 'facebook',  label: 'Facebook',       emoji: '👥',  gradient: 'from-blue-600 to-blue-500',                  available: true  },
  { id: 'tiktok',    label: 'TikTok',         emoji: '🎵',  gradient: 'from-gray-900 to-gray-800',                  available: true  },
  // em breve
  { id: 'youtube',   label: 'YouTube',        emoji: '▶️',  gradient: 'from-red-600 to-red-500',                    available: false },
  { id: 'linkedin',  label: 'LinkedIn',       emoji: '🔗',  gradient: 'from-blue-700 to-sky-600',                   available: false },
  { id: 'pinterest', label: 'Pinterest',      emoji: '📌',  gradient: 'from-red-500 to-pink-500',                   available: false },
  { id: 'threads',   label: 'Threads',        emoji: '🧵',  gradient: 'from-gray-900 to-gray-700',                  available: false },
  { id: 'twitter',   label: 'X (Twitter)',    emoji: '✖',   gradient: 'from-gray-900 to-gray-800',                  available: false },
  { id: 'google',    label: 'Google Meu Neg.', emoji: '🏬', gradient: 'from-blue-500 to-green-500',                 available: false },
]

// Ícones flutuantes para a tela de boas-vindas
const FLOAT_ICONS = [
  { emoji: '📸', style: 'top-[8%]  left-[20%]  bg-gradient-to-br from-purple-500 to-pink-500' },
  { emoji: '▶️', style: 'top-[5%]  right-[18%] bg-red-500' },
  { emoji: '🔗', style: 'top-[42%] left-[5%]   bg-blue-700' },
  { emoji: '🎵', style: 'bottom-[12%] left-[22%] bg-gray-900' },
  { emoji: '👥', style: 'bottom-[8%]  right-[22%] bg-blue-600' },
  { emoji: '📊', style: 'top-[42%] right-[5%]  bg-orange-500' },
  { emoji: '📌', style: 'bottom-[30%] right-[14%] bg-red-500' },
]

// ── Tipos de modal ───────────────────────────────────────────────────
type ModalView = 'welcome' | 'platforms'

export default function OnboardingPage() {
  const router = useRouter()
  const { user, setUser } = useAuthStore()

  const [step, setStep]         = useState(0)
  const [answers, setAnswers]   = useState<Record<string, string>>({})
  const [loading, setLoading]   = useState(false)
  const [modal, setModal]       = useState<ModalView | null>(null)

  // Só redireciona se o modal NÃO estiver aberto — evita fechar o modal
  // imediatamente após setar onboardingCompletedAt no store
  useEffect(() => {
    if (user?.onboardingCompletedAt && modal === null) {
      router.replace('/dashboard')
    }
  }, [user, router, modal])

  const current  = STEPS[step]
  const colors   = STEP_COLORS[step]
  const selected = answers[current.id]
  const isLast   = step === STEPS.length - 1

  const handleSelect = (value: string) => setAnswers((p) => ({ ...p, [current.id]: value }))

  const handleNext = async () => {
    if (!selected) return
    if (!isLast) { setStep((s) => s + 1); return }

    // Último passo — salva preferências e abre modal
    // NÃO atualiza o store aqui para não disparar o useEffect acima
    setLoading(true)
    try {
      await api.post('/auth/onboarding', { ...answers, [current.id]: selected })
      setModal('welcome')
    } catch {
      toast.error('Não foi possível salvar suas preferências. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  // Atualiza store e navega — só chamado pelo usuário, não pelo useEffect
  const goToDashboard = () => {
    if (user) setUser({ ...user, onboardingCompletedAt: new Date().toISOString() })
    router.push('/dashboard')
  }

  const connectMeta = () => {
    window.location.href = `${process.env.NEXT_PUBLIC_API_URL}/social-accounts/meta/connect`
  }

  // ── Modal de conexão ─────────────────────────────────────────────
  if (modal) {
    return (
      <div className="min-h-screen bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 fixed inset-0 z-50">

        {/* ── VIEW 1: Boas-vindas / convite para conectar ── */}
        {modal === 'welcome' && (
          <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden">
            {/* Botão fechar */}
            <button
              onClick={goToDashboard}
              className="absolute top-4 right-4 z-10 w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
            >
              <X className="w-4 h-4 text-gray-600" />
            </button>

            {/* Área gráfica com ícones flutuantes */}
            <div className="relative h-64 bg-gradient-to-br from-violet-50 to-indigo-100 flex items-center justify-center overflow-hidden">
              {/* Círculos decorativos */}
              <div className="absolute w-48 h-48 rounded-full border-2 border-dashed border-violet-200 opacity-60" />
              <div className="absolute w-72 h-72 rounded-full border border-violet-100 opacity-40" />

              {/* Ícones flutuando */}
              {FLOAT_ICONS.map((ic, i) => (
                <div
                  key={i}
                  className={`absolute w-11 h-11 rounded-full flex items-center justify-center text-xl shadow-lg text-white ${ic.style}`}
                  style={{ animation: `float ${2.5 + i * 0.4}s ease-in-out infinite alternate` }}
                >
                  {ic.emoji}
                </div>
              ))}

              {/* Card central */}
              <div className="relative z-10 bg-white rounded-2xl shadow-md px-6 py-4 flex flex-col items-center gap-2 border border-gray-100">
                <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center text-xl">🔗</div>
                <span className="text-sm font-semibold text-gray-800">Rede Social</span>
                <button className="mt-0.5 px-4 py-1.5 bg-violet-600 hover:bg-violet-700 text-white text-xs font-medium rounded-lg transition-colors">
                  Conectar
                </button>
              </div>
            </div>

            {/* Texto e ações */}
            <div className="p-8 text-center">
              <h2 className="text-xl font-bold text-gray-900 leading-snug mb-2">
                Conecte uma rede social para utilizar{' '}
                <span className="text-violet-600">TODAS as funcionalidades</span>
                {' '}do Social Scheduler!
              </h2>
              <p className="text-sm text-gray-500 mb-6">
                Clique em Conectar rede social e faça sua primeira conexão. Vamos lá?
              </p>

              <div className="flex items-center justify-center gap-3">
                <button
                  onClick={goToDashboard}
                  className="px-5 py-2.5 text-sm text-violet-600 font-medium hover:underline transition-colors"
                >
                  Fazer isso depois
                </button>
                <button
                  onClick={() => setModal('platforms')}
                  className="px-6 py-2.5 bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold rounded-xl transition-colors shadow-sm shadow-violet-200"
                >
                  Conectar rede social →
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── VIEW 2: Grid de plataformas ── */}
        {modal === 'platforms' && (
          <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between rounded-t-3xl z-10">
              <div>
                <h2 className="font-bold text-gray-900 text-lg">Conectar rede social</h2>
                <p className="text-xs text-gray-400 mt-0.5">Escolha a plataforma que deseja conectar</p>
              </div>
              <button
                onClick={goToDashboard}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
              >
                <X className="w-4 h-4 text-gray-600" />
              </button>
            </div>

            {/* Grid de plataformas */}
            <div className="p-6">
              {/* Disponíveis */}
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Disponíveis</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
                {PLATFORMS.filter((p) => p.available).map((platform) => (
                  <div
                    key={platform.id}
                    className="border border-gray-200 rounded-2xl p-4 flex flex-col items-center gap-3 hover:border-violet-300 hover:shadow-sm transition-all"
                  >
                    <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${platform.gradient} flex items-center justify-center text-2xl shadow`}>
                      {platform.emoji}
                    </div>
                    <span className="text-sm font-semibold text-gray-800">{platform.label}</span>
                    <button
                      onClick={platform.id === 'instagram' || platform.id === 'facebook' ? connectMeta : undefined}
                      disabled={platform.id === 'tiktok'}
                      className={`w-full py-2 rounded-xl text-xs font-semibold transition-colors ${
                        platform.id === 'tiktok'
                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                          : 'bg-violet-600 hover:bg-violet-700 text-white'
                      }`}
                    >
                      {platform.id === 'tiktok' ? 'Em breve' : 'Conectar'}
                    </button>
                  </div>
                ))}
              </div>

              {/* Em breve */}
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Em breve</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {PLATFORMS.filter((p) => !p.available).map((platform) => (
                  <div
                    key={platform.id}
                    className="border border-gray-100 rounded-2xl p-4 flex flex-col items-center gap-3 opacity-60"
                  >
                    <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${platform.gradient} flex items-center justify-center text-2xl shadow`}>
                      {platform.emoji}
                    </div>
                    <span className="text-sm font-semibold text-gray-700">{platform.label}</span>
                    <div className="w-full flex items-center justify-center gap-1 py-1.5 rounded-xl bg-amber-50 border border-amber-200">
                      <span className="text-xs text-amber-600 font-semibold">Em breve</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Rodapé */}
            <div className="sticky bottom-0 bg-white border-t border-gray-100 px-6 py-3 rounded-b-3xl flex items-center justify-between">
              <p className="text-xs text-gray-400 flex items-center gap-1">
                <Info className="w-3.5 h-3.5" />
                Você pode conectar mais contas depois em Configurações
              </p>
              <button
                onClick={goToDashboard}
                className="text-xs text-gray-500 hover:text-gray-700 font-medium transition-colors"
              >
                Ir para o dashboard →
              </button>
            </div>
          </div>
        )}
      </div>
    )
  }

  // ── Quiz ──────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6">
      {/* Logo */}
      <div className="flex items-center gap-2 mb-10">
        <div className="w-9 h-9 rounded-xl bg-violet-600 flex items-center justify-center shadow">
          <span className="text-white font-black text-base">S</span>
        </div>
        <span className="text-gray-800 font-bold text-lg">Social Scheduler</span>
      </div>

      {/* Barra de progresso */}
      <div className="w-full max-w-lg mb-6">
        <div className="flex gap-2">
          {STEPS.map((s, i) => (
            <div key={s.id} className={`h-1.5 flex-1 rounded-full transition-all duration-500 ${i <= step ? STEP_COLORS[i].dot : 'bg-gray-200'}`} />
          ))}
        </div>
        <p className="text-xs text-gray-400 mt-1.5 text-right">Passo {step + 1} de {STEPS.length}</p>
      </div>

      {/* Card da pergunta */}
      <div className={`w-full max-w-lg rounded-2xl border-2 ${colors.bg} ${colors.border} p-8 shadow-sm`}>
        <div className={`inline-flex items-center justify-center w-14 h-14 rounded-2xl text-2xl ${colors.icon} mb-5`}>
          {current.icon}
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-1">{current.question}</h2>
        <p className="text-sm text-gray-500 mb-6">{current.subtitle}</p>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {current.options.map((opt) => {
            const isSel = selected === opt.value
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => handleSelect(opt.value)}
                className={`flex flex-col items-center justify-center gap-1.5 py-4 px-3 rounded-xl border-2 font-medium transition-all text-center ${
                  isSel ? `${colors.selected} shadow-md scale-105` : 'bg-white border-gray-200 text-gray-700 hover:border-gray-300 hover:shadow-sm'
                }`}
              >
                <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center mb-0.5 ${isSel ? 'border-white' : 'border-gray-300'}`}>
                  {isSel && <div className="w-2 h-2 rounded-full bg-white" />}
                </div>
                <span className="text-xl leading-none">{opt.label}</span>
                <span className={`text-xs ${isSel ? 'text-white/80' : 'text-gray-500'}`}>{opt.sub}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Botões */}
      <div className="w-full max-w-lg mt-6">
        <button
          type="button"
          onClick={handleNext}
          disabled={!selected || loading}
          className={`w-full flex items-center justify-center gap-2 py-3.5 px-6 rounded-xl font-semibold text-sm transition-all ${
            selected && !loading ? 'bg-violet-600 hover:bg-violet-700 text-white shadow-sm shadow-violet-200' : 'bg-gray-200 text-gray-400 cursor-not-allowed'
          }`}
        >
          {loading ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Salvando...</>
          ) : (
            <>{isLast ? 'Iniciar período de teste' : 'Continuar'} <ArrowRight className="w-4 h-4" /></>
          )}
        </button>

        {step > 0 && (
          <button type="button" onClick={() => setStep((s) => s - 1)} className="w-full mt-2 py-2 text-sm text-gray-400 hover:text-gray-600 transition-colors">
            ← Voltar
          </button>
        )}
      </div>

      {/* CSS animation para ícones flutuantes (inline fallback) */}
      <style>{`
        @keyframes float {
          from { transform: translateY(0px) rotate(-3deg); }
          to   { transform: translateY(-12px) rotate(3deg); }
        }
      `}</style>
    </div>
  )
}
