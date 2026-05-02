'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Eye, EyeOff, Loader2, Mail, Lock, User } from 'lucide-react'
import { api } from '@/lib/api'
import { useAuthStore } from '@/store/auth.store'

const schema = z.object({
  name: z.string().min(2, 'Nome deve ter ao menos 2 caracteres'),
  email: z.string().email('E-mail inválido'),
  password: z
    .string()
    .min(8, 'Senha deve ter ao menos 8 caracteres')
    .regex(/[A-Z]/, 'Deve conter ao menos uma letra maiúscula')
    .regex(/[0-9]/, 'Deve conter ao menos um número'),
})

type FormData = z.infer<typeof schema>

export default function RegisterPage() {
  const router = useRouter()
  const { setTokens } = useAuthStore()
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const { register, handleSubmit, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const passwordValue = watch('password', '')

  const passwordStrength = (() => {
    if (!passwordValue) return 0
    let score = 0
    if (passwordValue.length >= 8) score++
    if (/[A-Z]/.test(passwordValue)) score++
    if (/[0-9]/.test(passwordValue)) score++
    if (/[^A-Za-z0-9]/.test(passwordValue)) score++
    return score
  })()

  const strengthLabel = ['', 'Fraca', 'Razoável', 'Boa', 'Forte'][passwordStrength]
  const strengthColor = ['', 'bg-red-400', 'bg-yellow-400', 'bg-blue-400', 'bg-green-500'][passwordStrength]

  const onSubmit = async (data: FormData) => {
    setLoading(true)
    try {
      const res = await api.post('/auth/register', data)
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
        <h2 className="text-2xl font-bold text-gray-900 mt-0.5">Crie sua conta grátis</h2>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Nome */}
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
            Seu nome
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
          {errors.name && (
            <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
              <span>⚠</span> {errors.name.message}
            </p>
          )}
        </div>

        {/* E-mail */}
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
            E-mail
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
          {errors.email && (
            <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
              <span>⚠</span> {errors.email.message}
            </p>
          )}
        </div>

        {/* Senha */}
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
            Senha
          </label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              {...register('password')}
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              placeholder="Mínimo 8 caracteres"
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

          {/* Barra de força da senha */}
          {passwordValue && (
            <div className="mt-2">
              <div className="flex gap-1 mb-1">
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className={`h-1 flex-1 rounded-full transition-all ${
                      i <= passwordStrength ? strengthColor : 'bg-gray-200'
                    }`}
                  />
                ))}
              </div>
              <p className="text-xs text-gray-400">
                Força da senha: <span className={`font-medium ${['', 'text-red-500', 'text-yellow-600', 'text-blue-600', 'text-green-600'][passwordStrength]}`}>{strengthLabel}</span>
              </p>
            </div>
          )}

          {errors.password && (
            <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
              <span>⚠</span> {errors.password.message}
            </p>
          )}
        </div>

        {/* Botão */}
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-violet-600 hover:bg-violet-700 active:bg-violet-800 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold py-3 px-4 rounded-xl transition-colors flex items-center justify-center gap-2 shadow-sm shadow-violet-200 mt-2"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Criando conta...
            </>
          ) : (
            'Criar conta grátis'
          )}
        </button>
      </form>

      <p className="text-xs text-gray-400 text-center mt-4 leading-relaxed">
        Ao criar conta, você concorda com os{' '}
        <span className="text-violet-500 cursor-pointer hover:underline">Termos de Uso</span>
        {' '}e a{' '}
        <span className="text-violet-500 cursor-pointer hover:underline">Política de Privacidade</span>.
      </p>

      {/* Rodapé */}
      <div className="mt-5 pt-5 border-t border-gray-100 text-center">
        <p className="text-sm text-gray-500">
          Já tem uma conta?{' '}
          <Link href="/login" className="text-violet-600 hover:text-violet-700 font-semibold hover:underline">
            Entrar agora
          </Link>
        </p>
      </div>
    </div>
  )
}
