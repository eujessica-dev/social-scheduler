'use client'

import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { toast } from 'sonner'
import { Check, Zap, Building2, Rocket, Loader2, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

// ── tipos ──────────────────────────────────────────────────────────────
interface SubscriptionData {
  plan: string
  trialEndsAt: string | null
  subscription: {
    status: string
    currentPeriodEnd: string | null
    gateway: string | null
  } | null
  limits: {
    socialAccounts: number
    scheduledPosts: number
    members: number
  }
  usage: {
    accountsUsed: number
    postsScheduled: number
    membersCount: number
  }
}

// ── planos ─────────────────────────────────────────────────────────────
const plans = [
  {
    key: 'starter',
    name: 'Starter',
    price: 'R$ 49',
    period: '/mês',
    icon: Zap,
    color: 'border-blue-200 hover:border-blue-400',
    highlight: false,
    features: [
      '5 contas sociais',
      '50 posts agendados',
      '3 membros',
      'Instagram + Facebook',
      'Métricas básicas',
      'Suporte por e-mail',
    ],
    limits: { socialAccounts: 5, scheduledPosts: 50, members: 3 },
  },
  {
    key: 'pro',
    name: 'Pro',
    price: 'R$ 119',
    period: '/mês',
    icon: Rocket,
    color: 'border-violet-400 hover:border-violet-500',
    highlight: true,
    features: [
      '15 contas sociais',
      '200 posts agendados',
      '10 membros',
      'Instagram + Facebook + TikTok',
      'Métricas avançadas',
      'Aprovação por cliente',
      'Relatórios exportáveis',
      'Suporte prioritário',
    ],
    limits: { socialAccounts: 15, scheduledPosts: 200, members: 10 },
  },
  {
    key: 'agency',
    name: 'Agency',
    price: 'R$ 299',
    period: '/mês',
    icon: Building2,
    color: 'border-gray-300 hover:border-gray-400',
    highlight: false,
    features: [
      '50 contas sociais',
      'Posts ilimitados',
      'Membros ilimitados',
      'Todas as plataformas',
      'White label (em breve)',
      'API pública (em breve)',
      'Gerente de conta dedicado',
    ],
    limits: { socialAccounts: 50, scheduledPosts: -1, members: -1 },
  },
]

// ── barra de uso ───────────────────────────────────────────────────────
function UsageBar({
  label, used, limit,
}: { label: string; used: number; limit: number }) {
  const pct = limit === -1 ? 0 : Math.min((used / limit) * 100, 100)
  const over = pct >= 90

  return (
    <div>
      <div className="flex justify-between text-xs text-gray-500 mb-1">
        <span>{label}</span>
        <span className={cn(over && 'text-red-500 font-medium')}>
          {used} / {limit === -1 ? '∞' : limit}
        </span>
      </div>
      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
        {limit !== -1 && (
          <div
            className={cn(
              'h-full rounded-full transition-all',
              over ? 'bg-red-500' : 'bg-violet-500',
            )}
            style={{ width: `${pct}%` }}
          />
        )}
      </div>
    </div>
  )
}

// ── componente principal ───────────────────────────────────────────────
export default function BillingPage() {
  const [data, setData]         = useState<SubscriptionData | null>(null)
  const [loading, setLoading]   = useState(true)
  const [upgrading, setUpgrading] = useState<string | null>(null)
  const [cancelling, setCancelling] = useState(false)

  useEffect(() => {
    api.get('/billing/subscription')
      .then((res) => setData(res.data))
      .finally(() => setLoading(false))
  }, [])

  const upgrade = async (planKey: string) => {
    setUpgrading(planKey)
    try {
      const res = await api.post('/billing/checkout', {
        plan: planKey,
        gateway: 'stripe',
      })
      window.location.href = res.data.checkoutUrl
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? 'Erro ao iniciar checkout')
    } finally {
      setUpgrading(null)
    }
  }

  const cancel = async () => {
    if (!confirm('Cancelar sua assinatura? O plano volta para Gratuito.')) return
    setCancelling(true)
    try {
      await api.post('/billing/cancel')
      toast.success('Assinatura cancelada')
      const res = await api.get('/billing/subscription')
      setData(res.data)
    } catch {
      toast.error('Erro ao cancelar assinatura')
    } finally {
      setCancelling(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-violet-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const currentPlan = data?.plan ?? 'free'
  const isTrialing  = data?.subscription?.status === 'trialing'
  const isPastDue   = data?.subscription?.status === 'past_due'

  return (
    <div className="max-w-4xl space-y-6">

      {/* Alerta de pagamento pendente */}
      {isPastDue && (
        <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
          <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
          <p className="text-sm text-red-700">
            Pagamento em atraso. Atualize sua forma de pagamento para evitar interrupção.
          </p>
        </div>
      )}

      {/* Plano atual + uso */}
      <div className="bg-white rounded-xl border border-gray-100 p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-500 mb-0.5">Plano atual</p>
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold text-gray-900 capitalize">{currentPlan}</span>
              {isTrialing && (
                <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full font-medium">
                  Trial
                </span>
              )}
              {data?.subscription?.status === 'active' && (
                <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">
                  Ativo
                </span>
              )}
            </div>
            {data?.subscription?.currentPeriodEnd && (
              <p className="text-xs text-gray-400 mt-1">
                Renova em{' '}
                {new Date(data.subscription.currentPeriodEnd).toLocaleDateString('pt-BR')}
              </p>
            )}
            {isTrialing && data?.trialEndsAt && (
              <p className="text-xs text-yellow-600 mt-1">
                Trial encerra em{' '}
                {new Date(data.trialEndsAt).toLocaleDateString('pt-BR')}
              </p>
            )}
          </div>

          {data?.subscription && data.subscription.status === 'active' && (
            <button
              onClick={cancel}
              disabled={cancelling}
              className="text-xs text-red-500 hover:text-red-600 hover:underline flex items-center gap-1"
            >
              {cancelling && <Loader2 className="w-3 h-3 animate-spin" />}
              Cancelar assinatura
            </button>
          )}
        </div>

        {data && (
          <div className="space-y-3 pt-2 border-t border-gray-50">
            <p className="text-xs font-medium text-gray-600">Uso atual</p>
            <UsageBar
              label="Contas sociais"
              used={data.usage.accountsUsed}
              limit={data.limits.socialAccounts}
            />
            <UsageBar
              label="Posts agendados"
              used={data.usage.postsScheduled}
              limit={data.limits.scheduledPosts}
            />
            <UsageBar
              label="Membros"
              used={data.usage.membersCount}
              limit={data.limits.members}
            />
          </div>
        )}
      </div>

      {/* Cards de planos */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {plans.map((plan) => {
          const isCurrentPlan = currentPlan === plan.key
          const PlanIcon = plan.icon

          return (
            <div
              key={plan.key}
              className={cn(
                'bg-white rounded-xl border-2 p-5 flex flex-col transition-all relative',
                plan.color,
                plan.highlight && 'shadow-lg',
              )}
            >
              {plan.highlight && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="bg-violet-600 text-white text-xs font-medium px-3 py-1 rounded-full">
                    Mais popular
                  </span>
                </div>
              )}

              <div className="flex items-center gap-2 mb-4">
                <div className={cn(
                  'w-8 h-8 rounded-lg flex items-center justify-center',
                  plan.highlight ? 'bg-violet-100 text-violet-600' : 'bg-gray-100 text-gray-600',
                )}>
                  <PlanIcon className="w-4 h-4" />
                </div>
                <span className="font-semibold text-gray-900">{plan.name}</span>
              </div>

              <div className="mb-5">
                <span className="text-3xl font-bold text-gray-900">{plan.price}</span>
                <span className="text-gray-400 text-sm">{plan.period}</span>
              </div>

              <ul className="space-y-2 flex-1 mb-5">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm text-gray-600">
                    <Check className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>

              {isCurrentPlan ? (
                <div className="w-full py-2 text-center text-sm font-medium text-gray-400 border border-gray-200 rounded-lg">
                  Plano atual
                </div>
              ) : (
                <button
                  onClick={() => upgrade(plan.key)}
                  disabled={!!upgrading}
                  className={cn(
                    'w-full py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2',
                    plan.highlight
                      ? 'bg-violet-600 hover:bg-violet-700 text-white disabled:opacity-60'
                      : 'border border-gray-300 hover:border-violet-400 hover:text-violet-600 text-gray-700 disabled:opacity-60',
                  )}
                >
                  {upgrading === plan.key && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  {upgrading === plan.key ? 'Aguarde...' : 'Assinar agora'}
                </button>
              )}
            </div>
          )
        })}
      </div>

      {/* Nota de segurança */}
      <p className="text-xs text-center text-gray-400">
        Pagamentos processados com segurança via Stripe. Cancele a qualquer momento.
        Não armazenamos dados de cartão.
      </p>
    </div>
  )
}
