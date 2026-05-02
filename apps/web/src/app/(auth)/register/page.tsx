'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Eye, EyeOff, Loader2, Mail, Lock, User, Phone, ChevronDown, Check, X } from 'lucide-react'
import { api } from '@/lib/api'
import { useAuthStore } from '@/store/auth.store'

// ── Países mais usados + Brasil fixado no topo ──────────────────────────
const COUNTRIES = [
  { code: 'BR', dial: '+55',  flag: '🇧🇷', name: 'Brasil' },
  { code: 'US', dial: '+1',   flag: '🇺🇸', name: 'Estados Unidos' },
  { code: 'PT', dial: '+351', flag: '🇵🇹', name: 'Portugal' },
  { code: 'AR', dial: '+54',  flag: '🇦🇷', name: 'Argentina' },
  { code: 'CL', dial: '+56',  flag: '🇨🇱', name: 'Chile' },
  { code: 'CO', dial: '+57',  flag: '🇨🇴', name: 'Colômbia' },
  { code: 'MX', dial: '+52',  flag: '🇲🇽', name: 'México' },
  { code: 'UY', dial: '+598', flag: '🇺🇾', name: 'Uruguai' },
  { code: 'PY', dial: '+595', flag: '🇵🇾', name: 'Paraguai' },
  { code: 'BO', dial: '+591', flag: '🇧🇴', name: 'Bolívia' },
  { code: 'PE', dial: '+51',  flag: '🇵🇪', name: 'Peru' },
  { code: 'EC', dial: '+593', flag: '🇪🇨', name: 'Equador' },
  { code: 'GB', dial: '+44',  flag: '🇬🇧', name: 'Reino Unido' },
  { code: 'DE', dial: '+49',  flag: '🇩🇪', name: 'Alemanha' },
  { code: 'FR', dial: '+33',  flag: '🇫🇷', name: 'França' },
  { code: 'ES', dial: '+34',  flag: '🇪🇸', name: 'Espanha' },
  { code: 'IT', dial: '+39',  flag: '🇮🇹', name: 'Itália' },
  { code: 'JP', dial: '+81',  flag: '🇯🇵', name: 'Japão' },
  { code: 'AU', dial: '+61',  flag: '🇦🇺', name: 'Austrália' },
  { code: 'CA', dial: '+1',   flag: '🇨🇦', name: 'Canadá' },
]

// ── Regras de validação da senha ──────────────────────────────────────
const PASSWORD_RULES = [
  { id: 'len',     label: 'Pelo menos 8 caracteres',       test: (v: string) => v.length >= 8 },
  { id: 'upper',   label: 'Pelo menos 1 letra maiúscula',  test: (v: string) => /[A-Z]/.test(v) },
  { id: 'number',  label: 'Pelo menos 1 número',           test: (v: string) => /[0-9]/.test(v) },
  { id: 'special', label: 'Pelo menos 1 caractere especial', test: (v: string) => /[^A-Za-z0-9]/.test(v) },
]

const schema = z.object({
  name: z.string().min(2, 'Nome deve ter ao menos 2 caracteres'),
  email: z.string().email('E-mail inválido'),
  password: z
    .string()
    .min(8, 'Senha deve ter ao menos 8 caracteres')
    .regex(/[A-Z]/, 'Deve conter ao menos uma letra maiúscula')
    .regex(/[0-9]/, 'Deve conter ao menos um número'),
  phoneNumber: z
    .string()
    .min(8, 'Número de telefone incompleto')
    .regex(/^\d+$/, 'Apenas números'),
  whatsappOptIn: z.boolean().optional(),
})

type FormData = z.infer<typeof schema>

export default function RegisterPage() {
  const router = useRouter()
  const { setTokens } = useAuthStore()
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [dialCountry, setDialCountry] = useState(COUNTRIES[0]) // Brasil
  const [dialOpen, setDialOpen] = useState(false)

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { whatsappOptIn: false },
  })

  const passwordValue  = watch('password', '')
  const phoneValue     = watch('phoneNumber', '')

  // Valida se o número tem pelo menos 8 dígitos
  const phoneInvalid = phoneValue.length > 0 && (phoneValue.length < 8 || !/^\d+$/.test(phoneValue))

  const onSubmit = async (data: FormData) => {
    setLoading(true)
    try {
      const phone = `${dialCountry.dial}${data.phoneNumber}`
      const res = await api.post('/auth/register', {
        name: data.name,
        email: data.email,
        password: data.password,
        phone,
        whatsappOptIn: data.whatsappOptIn ?? false,
      })
      const meRes = await api.get('/auth/me', {
        headers: { Authorization: `Bearer ${res.data.accessToken}` },
      })
      setTokens(res.data.accessToken, meRes.data)
      toast.success('Conta criada! Bem-vinda ao Social Scheduler.')
      router.push('/dashboard')
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? 'Erro ao criar conta')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 px-8 py-9">
      {/* Cabeçalho */}
      <div className="mb-7">
        <p className="text-gray-400 text-sm">Vamos começar! 🚀</p>
        <h2 className="text-2xl font-bold text-gray-900 mt-0.5">Teste Grátis</h2>
        <p className="text-sm text-gray-400 mt-1">Não pedimos cartão de crédito. Não fazemos spam. 😉</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">

        {/* Nome */}
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
            Nome <span className="text-red-400">*</span>
          </label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              {...register('name')}
              type="text"
              autoComplete="name"
              placeholder="Como podemos te chamar?"
              className={`w-full pl-10 pr-4 py-3 border rounded-xl text-sm bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all ${
                errors.name ? 'border-red-400 bg-red-50' : 'border-gray-200'
              }`}
            />
          </div>
          {errors.name && <p className="text-red-500 text-xs mt-1">⚠ {errors.name.message}</p>}
        </div>

        {/* E-mail */}
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
            E-mail <span className="text-red-400">*</span>
          </label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              {...register('email')}
              type="email"
              autoComplete="email"
              placeholder="voce@empresa.com"
              className={`w-full pl-10 pr-4 py-3 border rounded-xl text-sm bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all ${
                errors.email ? 'border-red-400 bg-red-50' : 'border-gray-200'
              }`}
            />
          </div>
          {errors.email && <p className="text-red-500 text-xs mt-1">⚠ {errors.email.message}</p>}
        </div>

        {/* Senha */}
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
            Senha <span className="text-red-400">*</span>
          </label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              {...register('password')}
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              placeholder="Crie uma senha segura"
              className={`w-full pl-10 pr-11 py-3 border rounded-xl text-sm bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all ${
                errors.password ? 'border-red-400 bg-red-50' : 'border-gray-200'
              }`}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          {/* Dicas de senha — aparecem assim que o usuário começa a digitar */}
          {passwordValue.length > 0 && (
            <div className="mt-2 space-y-1">
              {PASSWORD_RULES.map((rule) => {
                const ok = rule.test(passwordValue)
                return (
                  <div key={rule.id} className="flex items-center gap-1.5">
                    {ok
                      ? <Check className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
                      : <X    className="w-3.5 h-3.5 text-red-400   flex-shrink-0" />
                    }
                    <span className={`text-xs ${ok ? 'text-green-600' : 'text-red-400'}`}>
                      {rule.label}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Telefone com DDI */}
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
            Telefone / WhatsApp <span className="text-red-400">*</span>
          </label>
          <div className="flex gap-2">
            {/* Seletor de DDI */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setDialOpen(!dialOpen)}
                className="flex items-center gap-1.5 h-full px-3 py-3 border border-gray-200 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors text-sm font-medium text-gray-700 whitespace-nowrap"
              >
                <span className="text-base">{dialCountry.flag}</span>
                <span>{dialCountry.dial}</span>
                <ChevronDown className="w-3 h-3 text-gray-400" />
              </button>

              {/* Dropdown países */}
              {dialOpen && (
                <div className="absolute top-full left-0 mt-1 w-52 bg-white border border-gray-200 rounded-xl shadow-lg z-50 max-h-52 overflow-y-auto">
                  {COUNTRIES.map((c) => (
                    <button
                      key={c.code}
                      type="button"
                      onClick={() => { setDialCountry(c); setDialOpen(false) }}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-violet-50 transition-colors text-left ${
                        dialCountry.code === c.code ? 'bg-violet-50 text-violet-700 font-medium' : 'text-gray-700'
                      }`}
                    >
                      <span className="text-base">{c.flag}</span>
                      <span className="flex-1 truncate">{c.name}</span>
                      <span className="text-gray-400 text-xs">{c.dial}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Número */}
            <div className="relative flex-1">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                {...register('phoneNumber')}
                type="tel"
                placeholder="DDD + Número"
                inputMode="numeric"
                className={`w-full pl-10 pr-4 py-3 border rounded-xl text-sm bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 transition-all ${
                  errors.phoneNumber || phoneInvalid
                    ? 'border-red-400 bg-red-50 focus:ring-red-400'
                    : 'border-gray-200 focus:ring-violet-500 focus:border-transparent'
                }`}
              />
            </div>
          </div>

          {(errors.phoneNumber || phoneInvalid) && (
            <p className="text-red-500 text-xs mt-1">
              ⚠ {errors.phoneNumber?.message ?? 'Número de telefone inválido ou incompleto'}
            </p>
          )}
        </div>

        {/* WhatsApp opt-in */}
        <label className="flex items-start gap-2.5 cursor-pointer select-none">
          <input
            {...register('whatsappOptIn')}
            type="checkbox"
            className="mt-0.5 w-4 h-4 rounded border-gray-300 text-violet-600 focus:ring-violet-500 cursor-pointer flex-shrink-0"
          />
          <span className="text-sm text-gray-600 leading-tight">
            Aceito receber mensagens e novidades pelo WhatsApp
          </span>
        </label>

        {/* Botão */}
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-violet-600 hover:bg-violet-700 active:bg-violet-800 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold py-3 px-4 rounded-xl transition-colors flex items-center justify-center gap-2 shadow-sm shadow-violet-200 mt-1"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Criando conta...
            </>
          ) : (
            'Começar agora'
          )}
        </button>
      </form>

      <p className="text-xs text-gray-400 text-center mt-4 leading-relaxed">
        Ao criar conta, você concorda com nossa{' '}
        <span className="text-violet-500 cursor-pointer hover:underline">Política de Privacidade</span>
        {' '}e os{' '}
        <span className="text-violet-500 cursor-pointer hover:underline">Termos de Serviço</span>.
      </p>

      <div className="mt-5 pt-5 border-t border-gray-100 text-center">
        <p className="text-sm text-gray-500">
          Já possui uma conta?{' '}
          <Link href="/login" className="text-violet-600 hover:text-violet-700 font-semibold hover:underline">
            Clique aqui
          </Link>
        </p>
      </div>
    </div>
  )
}
