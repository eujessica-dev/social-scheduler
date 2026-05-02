'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, ArrowRight, X, Info } from 'lucide-react'
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

// ── Plataformas ──────────────────────────────────────────────────────
const PLATFORMS = [
  { id: 'instagram', label: 'Instagram',       emoji: '📸', gradient: 'from-purple-500 via-pink-500 to-orange-400', available: true  },
  { id: 'facebook',  label: 'Facebook',        emoji: '👥', gradient: 'from-blue-600 to-blue-500',                  available: true  },
  { id: 'tiktok',    label: 'TikTok',          emoji: '🎵', gradient: 'from-gray-900 to-gray-800',                  available: false },
  { id: 'youtube',   label: 'YouTube',         emoji: '▶️', gradient: 'from-red-600 to-red-500',                    available: false },
  { id: 'linkedin',  label: 'LinkedIn',        emoji: '🔗', gradient: 'from-blue-700 to-sky-600',                   available: false },
  { id: 'pinterest', label: 'Pinterest',       emoji: '📌', gradient: 'from-red-500 to-pink-500',                   available: false },
  { id: 'threads',   label: 'Threads',         emoji: '🧵', gradient: 'from-gray-900 to-gray-700',                  available: false },
  { id: 'twitter',   label: 'X (Twitter)',     emoji: '✖',  gradient: 'from-gray-900 to-gray-800',                  available: false },
  { id: 'google',    label: 'Google Meu Neg.', emoji: '🏬', gradient: 'from-blue-500 to-green-500',                 available: false },
]

const FLOAT_ICONS = [
  { emoji: '📸', cls: 'top-[8%]    left-[18%]   bg-gradient-to-br from-purple-500 to-pink-500' },
  { emoji: '▶️', cls: 'top-[6%]    right-[16%]  bg-red-500' },
  { emoji: '🔗', cls: 'top-[44%]   left-[4%]    bg-blue-700' },
  { emoji: '🎵', cls: 'bottom-[10%] left-[20%]  bg-gray-900' },
  { emoji: '👥', cls: 'bottom-[8%]  right-[20%] bg-blue-600' },
  { emoji: '📊', cls: 'top-[44%]   right-[4%]   bg-orange-500' },
  { emoji: '📌', cls: 'bottom-[28%] right-[12%] bg-red-500' },
]

// ── Tela exibida ─────────────────────────────────────────────────────
type Screen = 'quiz' | 'welcome' | 'platforms'

export default function OnboardingPage() {
  const router             = useRouter()
  const { user, setUser }  = useAuthStore()

  // Controla qual tela está visível
  const [screen, setScreen]     = useState<Screen>('quiz')
  const [step, setStep]         = useState(0)
  const [answers, setAnswers]   = useState<Record<string, string>>({})
  const [loading, setLoading]   = useState(false)

  // Ref: marca se estamos no meio do fluxo que o usuário acabou de concluir.
  // Enquanto true, NUNCA redirecionamos automaticamente.
  const inFlow = useRef(false)

  // Redireciona apenas no carregamento inicial, se onboarding já foi feito
  // e o usuário não está no meio do fluxo agora
  useEffect(() => {
    if (inFlow.current) return
    if (user?.onboardingCompletedAt) {
      router.replace('/dashboard')
    }
  }) // sem deps = roda a cada render, mas o ref bloqueia após iniciar o fluxo

  const current  = STEPS[step]
  const colors   = STEP_COLORS[step]
  const selected = answers[current?.id ?? '']
  const isLast   = step === STEPS.length - 1

  const handleSelect = (value: string) =>
    setAnswers((p) => ({ ...p, [current.id]: value }))

  const handleNext = async () => {
    if (!selected) return

    if (!isLast) {
      setStep((s) => s + 1)
      return
    }

    // Último passo — salva e exibe o modal
    setLoading(true)
    try {
      await api.post('/auth/onboarding', { ...answers, [current.id]: selected })
      // A partir daqui estamos "em fluxo": o ref bloqueia qualquer redirect automático
      inFlow.current = true
      setScreen('welcome')
    } catch {
      toast.error('Não foi possível salvar suas preferências. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  const goToDashboard = () => {
    // Atualiza store e navega explicitamente
    if (user) setUser({ ...user, onboardingCompletedAt: new Date().toISOString() })
    router.push('/dashboard')
  }

  const connectMeta = () => {
    window.location.href = `${process.env.NEXT_PUBLIC_API_URL}/social-accounts/meta/connect`
  }

  // ══════════════════════════════════════════════════════════════════
  // MODAL de boas-vindas / plataformas
  // ══════════════════════════════════════════════════════════════════
  if (screen === 'welcome' || screen === 'platforms') {
    return (
      // Fundo escurecido que NÃO pode ser clicado para fechar
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">

        {/* ── WELCOME ── */}
        {screen === 'welcome' && (
          <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-300">
            {/* Botão fechar */}
            <button
              onClick={goToDashboard}
              className="absolute top-4 right-4 z-20 w-8 h-8 flex items-center justify-center rounded-full bg-white/80 hover:bg-gray-100 shadow transition-colors"
              aria-label="Fechar"
            >
              <X className="w-4 h-4 text-gray-600" />
            </button>

            {/* Área gráfica com ícones flutuantes */}
            <div className="relative h-60 bg-gradient-to-br from-violet-50 via-indigo-50 to-purple-100 flex items-center justify-center overflow-hidden">
              <div className="absolute w-44 h-44 rounded-full border-2 border-dashed border-violet-200/70" />
              <div className="absolute w-68 h-68 rounded-full border border-violet-100/50" style={{ width: 272, height: 272 }} />

              {FLOAT_ICONS.map((ic, i) => (
                <div
                  key={i}
                  className={`absolute w-11 h-11 rounded-full flex items-center justify-center text-xl shadow-lg text-white ${ic.cls}`}
                  style={{ animation: `floatIcon ${2.4 + i * 0.35}s ease-in-out infinite alternate` }}
                >
                  {ic.emoji}
                </div>
              ))}

              {/* Card central */}
              <div className="relative z-10 bg-white rounded-2xl shadow-lg px-6 py-4 flex flex-col items-center gap-2 border border-violet-100">
                <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center text-xl">🔗</div>
                <span className="text-sm font-semibold text-gray-800">Rede Social</span>
                <div className="mt-0.5 px-4 py-1.5 bg-violet-600 text-white text-xs font-medium rounded-lg">
                  Conectar
                </div>
              </div>
            </div>

            {/* Texto */}
            <div className="px-8 py-7 text-center">
              <h2 className="text-xl font-bold text-gray-900 leading-snug mb-2">
                Conecte uma rede social para utilizar{' '}
                <span className="text-violet-600">TODAS as funcionalidades</span>{' '}
                do Social Scheduler!
              </h2>
              <p className="text-sm text-gray-500 mb-7">
                Clique em Conectar rede social e faça sua primeira conexão. Vamos lá?
              </p>

              <div className="flex items-center justify-center gap-3">
                <button
                  onClick={goToDashboard}
                  className="px-5 py-2.5 text-sm text-violet-600 font-medium hover:underline"
                >
                  Fazer isso depois
                </button>
                <button
                  onClick={() => setScreen('platforms')}
                  className="px-6 py-2.5 bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold rounded-xl transition-colors shadow-sm shadow-violet-200"
                >
                  Conectar rede social →
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── PLATFORMS ── */}
        {screen === 'platforms' && (
          <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[88vh] flex flex-col animate-in fade-in zoom-in-95 duration-300">
            {/* Header fixo */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
              <div>
                <h2 className="font-bold text-gray-900 text-lg">Conectar rede social</h2>
                <p className="text-xs text-gray-400 mt-0.5">Escolha a plataforma que deseja conectar</p>
              </div>
              <button
                onClick={goToDashboard}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
                aria-label="Fechar"
              >
                <X className="w-4 h-4 text-gray-600" />
              </button>
            </div>

            {/* Conteúdo com scroll */}
            <div className="overflow-y-auto flex-1 p-6 space-y-6">
              {/* Disponíveis */}
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
                  Disponíveis para conectar
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {PLATFORMS.filter((p) => p.available).map((platform) => (
                    <div key={platform.id} className="border border-gray-200 rounded-2xl p-4 flex flex-col items-center gap-3 hover:border-violet-300 hover:shadow-sm transition-all">
                      <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${platform.gradient} flex items-center justify-center text-2xl shadow`}>
                        {platform.emoji}
                      </div>
                      <span className="text-sm font-semibold text-gray-800">{platform.label}</span>
                      <button
                        onClick={connectMeta}
                        className="w-full py-2 rounded-xl text-xs font-semibold bg-violet-600 hover:bg-violet-700 text-white transition-colors"
                      >
                        Conectar
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Em breve */}
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
                  Em breve
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {PLATFORMS.filter((p) => !p.available).map((platform) => (
                    <div key={platform.id} className="border border-gray-100 rounded-2xl p-4 flex flex-col items-center gap-3 opacity-55">
                      <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${platform.gradient} flex items-center justify-center text-2xl shadow`}>
                        {platform.emoji}
                      </div>
                      <span className="text-sm font-semibold text-gray-700">{platform.label}</span>
                      <div className="w-full flex items-center justify-center py-1.5 rounded-xl bg-amber-50 border border-amber-200">
                        <span className="text-xs text-amber-600 font-semibold">Em breve</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Rodapé fixo */}
            <div className="shrink-0 border-t border-gray-100 px-6 py-3 flex items-center justify-between bg-white rounded-b-3xl">
              <p className="text-xs text-gray-400 flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5" />
                Você pode conectar mais contas depois em Configurações
              </p>
              <button onClick={goToDashboard} className="text-xs text-violet-600 hover:underline font-medium">
                Ir para o dashboard →
              </button>
            </div>
          </div>
        )}

        {/* Animação dos ícones flutuantes */}
        <style>{`
          @keyframes floatIcon {
            from { transform: translateY(0px)   rotate(-4deg); }
            to   { transform: translateY(-14px) rotate(4deg);  }
          }
        `}</style>
      </div>
    )
  }

  // ══════════════════════════════════════════════════════════════════
  // QUIZ
  // ══════════════════════════════════════════════════════════════════
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
            selected && !loading
              ? 'bg-violet-600 hover:bg-violet-700 text-white shadow-sm shadow-violet-200'
              : 'bg-gray-200 text-gray-400 cursor-not-allowed'
          }`}
        >
          {loading
            ? <><Loader2 className="w-4 h-4 animate-spin" /> Salvando...</>
            : <>{isLast ? 'Iniciar período de teste' : 'Continuar'} <ArrowRight className="w-4 h-4" /></>
          }
        </button>

        {step > 0 && (
          <button
            type="button"
            onClick={() => setStep((s) => s - 1)}
            className="w-full mt-2 py-2 text-sm text-gray-400 hover:text-gray-600 transition-colors"
          >
            ← Voltar
          </button>
        )}
      </div>
    </div>
  )
}
