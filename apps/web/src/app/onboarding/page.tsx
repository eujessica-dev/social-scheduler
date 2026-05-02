'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, ArrowRight, Check } from 'lucide-react'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import { useAuthStore } from '@/store/auth.store'

// ── Dados dos passos ─────────────────────────────────────────────────
const STEPS = [
  {
    id: 'brands',
    icon: '📋',
    question: 'Quantas marcas você gerencia nas redes sociais?',
    subtitle: 'Selecione uma opção:',
    options: [
      { value: '1',    label: '1',    sub: 'Marca' },
      { value: '2-5',  label: '2 a 5',  sub: 'Marcas' },
      { value: '6-9',  label: '6 a 9',  sub: 'Marcas' },
      { value: '10+',  label: '10+',    sub: 'Marcas' },
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
      { value: 'creator',    label: '🎨', sub: 'Criador de conteúdo' },
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
      { value: 'analytics', label: '📊', sub: 'Analisar métricas' },
    ],
  },
]

// ── Cores por passo ──────────────────────────────────────────────────
const STEP_COLORS = [
  { bg: 'bg-violet-50',  border: 'border-violet-200', ring: 'ring-violet-500',  selected: 'bg-violet-600 border-violet-600 text-white', dot: 'bg-violet-600', icon: 'bg-violet-100 text-violet-600' },
  { bg: 'bg-indigo-50',  border: 'border-indigo-200', ring: 'ring-indigo-500',  selected: 'bg-indigo-600 border-indigo-600 text-white',  dot: 'bg-indigo-600', icon: 'bg-indigo-100 text-indigo-600' },
  { bg: 'bg-emerald-50', border: 'border-emerald-200', ring: 'ring-emerald-500', selected: 'bg-emerald-600 border-emerald-600 text-white', dot: 'bg-emerald-600', icon: 'bg-emerald-100 text-emerald-600' },
]

export default function OnboardingPage() {
  const router = useRouter()
  const { user, setUser } = useAuthStore()
  const [step, setStep]       = useState(0)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const [done, setDone]       = useState(false)

  // Se já completou onboarding, vai direto para dashboard
  useEffect(() => {
    if (user?.onboardingCompletedAt) {
      router.replace('/dashboard')
    }
  }, [user, router])

  const current = STEPS[step]
  const colors  = STEP_COLORS[step]
  const selected = answers[current.id]
  const isLast   = step === STEPS.length - 1

  const handleSelect = (value: string) => {
    setAnswers((prev) => ({ ...prev, [current.id]: value }))
  }

  const handleNext = async () => {
    if (!selected) return

    if (!isLast) {
      setStep((s) => s + 1)
      return
    }

    // Último passo — salva e finaliza
    setLoading(true)
    try {
      await api.post('/auth/onboarding', { ...answers, [current.id]: selected })
      // Atualiza o store local para não redirecionar ao onboarding de volta
      if (user) {
        setUser({ ...user, onboardingCompletedAt: new Date().toISOString() })
      }
      setDone(true)
      // Pequeno delay para mostrar tela de sucesso antes de redirecionar
      setTimeout(() => router.push('/dashboard'), 2200)
    } catch {
      toast.error('Não foi possível salvar suas preferências. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  // ── Tela de sucesso ──────────────────────────────────────────────
  if (done) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-emerald-100 mb-6 animate-bounce">
            <Check className="w-10 h-10 text-emerald-600" strokeWidth={2.5} />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Tudo pronto! 🎉</h2>
          <p className="text-gray-500">Preparando seu workspace personalizado...</p>
          <div className="mt-6 flex justify-center">
            <Loader2 className="w-5 h-5 text-violet-500 animate-spin" />
          </div>
        </div>
      </div>
    )
  }

  // ── Tela principal ───────────────────────────────────────────────
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
            <div
              key={s.id}
              className={`h-1.5 flex-1 rounded-full transition-all duration-500 ${
                i <= step ? STEP_COLORS[i].dot : 'bg-gray-200'
              }`}
            />
          ))}
        </div>
        <p className="text-xs text-gray-400 mt-1.5 text-right">
          Passo {step + 1} de {STEPS.length}
        </p>
      </div>

      {/* Card de pergunta */}
      <div className={`w-full max-w-lg rounded-2xl border-2 ${colors.bg} ${colors.border} p-8 shadow-sm`}>
        {/* Ícone */}
        <div className={`inline-flex items-center justify-center w-14 h-14 rounded-2xl text-2xl ${colors.icon} mb-5`}>
          {current.icon}
        </div>

        <h2 className="text-xl font-bold text-gray-900 mb-1">{current.question}</h2>
        <p className="text-sm text-gray-500 mb-6">{current.subtitle}</p>

        {/* Opções */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {current.options.map((opt) => {
            const isSelected = selected === opt.value
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => handleSelect(opt.value)}
                className={`flex flex-col items-center justify-center gap-1.5 py-4 px-3 rounded-xl border-2 font-medium transition-all text-center ${
                  isSelected
                    ? `${colors.selected} shadow-md scale-105`
                    : 'bg-white border-gray-200 text-gray-700 hover:border-gray-300 hover:shadow-sm'
                }`}
              >
                {/* Radio visual */}
                <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center mb-0.5 ${
                  isSelected ? 'border-white' : 'border-gray-300'
                }`}>
                  {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
                </div>
                <span className="text-xl leading-none">{opt.label}</span>
                <span className={`text-xs ${isSelected ? 'text-white/80' : 'text-gray-500'}`}>{opt.sub}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Botão avançar */}
      <div className="w-full max-w-lg mt-6">
        <button
          type="button"
          onClick={handleNext}
          disabled={!selected || loading}
          className={`w-full flex items-center justify-center gap-2 py-3.5 px-6 rounded-xl font-semibold text-sm transition-all ${
            selected && !loading
              ? 'bg-violet-600 hover:bg-violet-700 text-white shadow-sm shadow-violet-200 cursor-pointer'
              : 'bg-gray-200 text-gray-400 cursor-not-allowed'
          }`}
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Salvando...
            </>
          ) : (
            <>
              {isLast ? 'Iniciar período de teste' : 'Continuar'}
              <ArrowRight className="w-4 h-4" />
            </>
          )}
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
