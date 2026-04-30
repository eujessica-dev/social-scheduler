import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { PrismaService } from '../../config/prisma.service'
import { JwtPayload, PLAN_LIMITS } from '@social-scheduler/shared'

// Abstração de gateway — suporta Stripe, Asaas e Mercado Pago
// A implementação real de cada gateway fica em providers separados
@Injectable()
export class BillingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  // ── plano e limites ───────────────────────────────────────────────────

  async getSubscription(user: JwtPayload) {
    const subscription = await this.prisma.subscription.findUnique({
      where: { organizationId: user.organizationId },
    })

    const org = await this.prisma.organization.findUnique({
      where: { id: user.organizationId },
      select: { plan: true, trialEndsAt: true },
    })

    const plan = org?.plan ?? 'free'
    const limits = PLAN_LIMITS[plan as keyof typeof PLAN_LIMITS]

    const [accountsUsed, postsScheduled, membersCount] = await Promise.all([
      this.prisma.socialAccount.count({
        where: { organizationId: user.organizationId, status: 'active' },
      }),
      this.prisma.post.count({
        where: { organizationId: user.organizationId, status: 'scheduled' },
      }),
      this.prisma.organizationMember.count({
        where: { organizationId: user.organizationId },
      }),
    ])

    return {
      subscription,
      plan,
      trialEndsAt: org?.trialEndsAt,
      limits,
      usage: { accountsUsed, postsScheduled, membersCount },
    }
  }

  // ── criação de checkout (abstração multi-gateway) ─────────────────────

  async createCheckout(user: JwtPayload, plan: string, gateway: string) {
    const validPlans = ['starter', 'pro', 'agency']
    if (!validPlans.includes(plan)) {
      throw new BadRequestException('Plano inválido')
    }

    const validGateways = ['stripe', 'asaas', 'mercadopago']
    if (!validGateways.includes(gateway)) {
      throw new BadRequestException('Gateway inválido')
    }

    // Redirecionar para o gateway correto
    if (gateway === 'stripe') return this.createStripeCheckout(user, plan)
    if (gateway === 'asaas') return this.createAsaasCheckout(user, plan)

    throw new BadRequestException('Gateway não implementado')
  }

  // ── webhook do gateway ────────────────────────────────────────────────

  async handleWebhook(gateway: string, payload: any, signature?: string) {
    if (gateway === 'stripe') return this.handleStripeWebhook(payload, signature)
    if (gateway === 'asaas') return this.handleAsaasWebhook(payload)
  }

  // ── cancelamento ──────────────────────────────────────────────────────

  async cancelSubscription(user: JwtPayload) {
    const sub = await this.prisma.subscription.findUnique({
      where: { organizationId: user.organizationId },
    })

    if (!sub) throw new NotFoundException('Assinatura não encontrada')

    // Cancelamento real no gateway (implementar por provider)
    await this.prisma.subscription.update({
      where: { organizationId: user.organizationId },
      data: { status: 'cancelled', cancelledAt: new Date() },
    })

    await this.prisma.organization.update({
      where: { id: user.organizationId },
      data: { plan: 'free' },
    })

    return { message: 'Assinatura cancelada' }
  }

  // ── verificação de limite ─────────────────────────────────────────────

  async checkLimit(organizationId: string, resource: 'socialAccounts' | 'posts' | 'members') {
    const org = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      select: { plan: true },
    })

    const plan = org?.plan ?? 'free'
    const limits = PLAN_LIMITS[plan as keyof typeof PLAN_LIMITS]
    const limit = limits[resource === 'posts' ? 'scheduledPosts' : resource]

    if (limit === -1) return true // ilimitado

    let current = 0
    if (resource === 'socialAccounts') {
      current = await this.prisma.socialAccount.count({
        where: { organizationId, status: 'active' },
      })
    } else if (resource === 'posts') {
      current = await this.prisma.post.count({
        where: { organizationId, status: 'scheduled' },
      })
    } else if (resource === 'members') {
      current = await this.prisma.organizationMember.count({
        where: { organizationId },
      })
    }

    if (current >= limit) {
      throw new BadRequestException(
        `Limite do plano atingido. Faça upgrade para continuar.`,
      )
    }

    return true
  }

  // ── providers privados ────────────────────────────────────────────────

  private async createStripeCheckout(user: JwtPayload, plan: string) {
    const priceIds: Record<string, string> = {
      starter: this.config.get('STRIPE_PRICE_STARTER') ?? '',
      pro:     this.config.get('STRIPE_PRICE_PRO') ?? '',
      agency:  this.config.get('STRIPE_PRICE_AGENCY') ?? '',
    }

    // Stripe Checkout Session via API REST (sem SDK para manter leveza)
    const res = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.config.get('STRIPE_SECRET_KEY')}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        'payment_method_types[]':     'card',
        'line_items[0][price]':       priceIds[plan],
        'line_items[0][quantity]':    '1',
        mode:                         'subscription',
        success_url:                  `${this.config.get('FRONTEND_URL')}/settings?subscribed=true`,
        cancel_url:                   `${this.config.get('FRONTEND_URL')}/settings`,
        'metadata[organizationId]':   user.organizationId,
        'metadata[plan]':             plan,
      }).toString(),
    })

    if (!res.ok) throw new BadRequestException('Erro ao criar checkout Stripe')
    const session = (await res.json()) as { url: string }
    return { checkoutUrl: session.url }
  }

  private async createAsaasCheckout(user: JwtPayload, plan: string) {
    // Implementação Asaas — estrutura preparada para integração futura
    return {
      checkoutUrl: `${this.config.get('FRONTEND_URL')}/billing/asaas-pending`,
      message: 'Integração Asaas em implementação',
    }
  }

  private async handleStripeWebhook(payload: any, signature?: string) {
    // Verificar assinatura e processar evento
    const event = payload
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object
      const { organizationId, plan } = session.metadata

      await this.prisma.subscription.upsert({
        where: { organizationId },
        update: {
          plan,
          status: 'active',
          gateway: 'stripe',
          gatewaySubscriptionId: session.subscription,
          gatewayCustomerId: session.customer,
        },
        create: {
          organizationId,
          plan: plan as any,
          status: 'active',
          gateway: 'stripe',
          gatewaySubscriptionId: session.subscription,
          gatewayCustomerId: session.customer,
        },
      })

      await this.prisma.organization.update({
        where: { id: organizationId },
        data: { plan: plan as any },
      })
    }

    if (event.type === 'customer.subscription.deleted') {
      const sub = event.data.object
      await this.prisma.subscription.updateMany({
        where: { gatewaySubscriptionId: sub.id },
        data: { status: 'cancelled', cancelledAt: new Date() },
      })
    }
  }

  private async handleAsaasWebhook(payload: any) {
    // Implementação futura
  }
}
