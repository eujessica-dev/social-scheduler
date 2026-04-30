'use client'

import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Loader2, Building2, Users, UserPlus, Trash2, Shield } from 'lucide-react'
import { api } from '@/lib/api'
import { useAuthStore } from '@/store/auth.store'
import { cn } from '@/lib/utils'

// ── tipos ──────────────────────────────────────────────────────────────
interface Organization {
  id: string
  name: string
  slug: string
  plan: string
}

interface Member {
  id: string
  role: string
  acceptedAt: string | null
  user: { id: string; name: string; email: string; avatarUrl: string | null }
}

// ── schemas ────────────────────────────────────────────────────────────
const orgSchema = z.object({ name: z.string().min(2).max(100) })
const inviteSchema = z.object({
  email: z.string().email('E-mail inválido'),
  role: z.enum(['admin', 'editor', 'client', 'finance', 'readonly']),
})

type OrgForm    = z.infer<typeof orgSchema>
type InviteForm = z.infer<typeof inviteSchema>

const roleLabels: Record<string, string> = {
  owner:    'Owner',
  admin:    'Admin',
  editor:   'Editor',
  client:   'Cliente',
  finance:  'Financeiro',
  readonly: 'Leitura',
}

const roleColors: Record<string, string> = {
  owner:    'bg-violet-100 text-violet-700',
  admin:    'bg-blue-100 text-blue-700',
  editor:   'bg-green-100 text-green-700',
  client:   'bg-yellow-100 text-yellow-700',
  finance:  'bg-orange-100 text-orange-700',
  readonly: 'bg-gray-100 text-gray-600',
}

// ── componente principal ───────────────────────────────────────────────
export default function SettingsPage() {
  const { user } = useAuthStore()
  const [org, setOrg]         = useState<Organization | null>(null)
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [savingOrg, setSavingOrg]     = useState(false)
  const [inviting, setInviting]       = useState(false)
  const [showInvite, setShowInvite]   = useState(false)

  const orgForm = useForm<OrgForm>({ resolver: zodResolver(orgSchema) })
  const inviteForm = useForm<InviteForm>({
    resolver: zodResolver(inviteSchema),
    defaultValues: { role: 'editor' },
  })

  const canManage = ['owner', 'admin'].includes(user?.role ?? '')

  const load = async () => {
    try {
      const [orgRes, membersRes] = await Promise.all([
        api.get('/organizations/me'),
        api.get('/organizations/me/members'),
      ])
      setOrg(orgRes.data)
      setMembers(membersRes.data)
      orgForm.reset({ name: orgRes.data.name })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  // salvar nome da organização
  const onSaveOrg = async (data: OrgForm) => {
    setSavingOrg(true)
    try {
      const res = await api.patch('/organizations/me', data)
      setOrg(res.data)
      toast.success('Organização atualizada')
    } catch {
      toast.error('Erro ao salvar')
    } finally {
      setSavingOrg(false)
    }
  }

  // convidar membro
  const onInvite = async (data: InviteForm) => {
    setInviting(true)
    try {
      await api.post('/organizations/me/invite', data)
      toast.success(`Convite enviado para ${data.email}`)
      inviteForm.reset()
      setShowInvite(false)
      await load()
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? 'Erro ao convidar membro')
    } finally {
      setInviting(false)
    }
  }

  // remover membro
  const removeMember = async (memberId: string, name: string) => {
    if (!confirm(`Remover ${name} da organização?`)) return
    try {
      await api.delete(`/organizations/me/members/${memberId}`)
      setMembers((prev) => prev.filter((m) => m.id !== memberId))
      toast.success('Membro removido')
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? 'Erro ao remover membro')
    }
  }

  // alterar papel
  const changeRole = async (memberId: string, role: string) => {
    try {
      await api.patch(`/organizations/me/members/${memberId}/role`, { role })
      setMembers((prev) => prev.map((m) => (m.id === memberId ? { ...m, role } : m)))
      toast.success('Papel atualizado')
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? 'Erro ao alterar papel')
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

      {/* Dados da organização */}
      <div className="bg-white rounded-xl border border-gray-100 p-5">
        <div className="flex items-center gap-2 mb-4">
          <Building2 className="w-4 h-4 text-gray-400" />
          <h3 className="font-semibold text-gray-900 text-sm">Organização</h3>
        </div>

        <form onSubmit={orgForm.handleSubmit(onSaveOrg)} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Nome</label>
            <input
              {...orgForm.register('name')}
              disabled={!canManage}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 disabled:bg-gray-50 disabled:text-gray-400"
            />
            {orgForm.formState.errors.name && (
              <p className="text-red-500 text-xs mt-1">{orgForm.formState.errors.name.message}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Slug</label>
            <input
              value={org?.slug ?? ''}
              disabled
              className="w-full px-3 py-2 border border-gray-100 rounded-lg text-sm bg-gray-50 text-gray-400 cursor-not-allowed"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Plano atual</label>
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-violet-100 text-violet-700 capitalize">
              {org?.plan}
            </span>
          </div>

          {canManage && (
            <button
              type="submit"
              disabled={savingOrg}
              className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 disabled:opacity-60 text-white text-sm font-medium py-2 px-4 rounded-lg transition-colors"
            >
              {savingOrg && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {savingOrg ? 'Salvando...' : 'Salvar alterações'}
            </button>
          )}
        </form>
      </div>

      {/* Membros */}
      <div className="bg-white rounded-xl border border-gray-100 p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-gray-400" />
            <h3 className="font-semibold text-gray-900 text-sm">
              Membros ({members.length})
            </h3>
          </div>
          {canManage && (
            <button
              onClick={() => setShowInvite((v) => !v)}
              className="flex items-center gap-1.5 text-xs text-violet-600 hover:text-violet-700 font-medium"
            >
              <UserPlus className="w-3.5 h-3.5" />
              Convidar
            </button>
          )}
        </div>

        {/* Formulário de convite */}
        {showInvite && (
          <form
            onSubmit={inviteForm.handleSubmit(onInvite)}
            className="mb-4 p-4 bg-gray-50 rounded-xl border border-gray-100 space-y-3"
          >
            <p className="text-xs font-medium text-gray-600">Novo convite</p>
            <div className="flex gap-2">
              <div className="flex-1">
                <input
                  {...inviteForm.register('email')}
                  type="email"
                  placeholder="email@exemplo.com"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
                {inviteForm.formState.errors.email && (
                  <p className="text-red-500 text-xs mt-1">{inviteForm.formState.errors.email.message}</p>
                )}
              </div>
              <select
                {...inviteForm.register('role')}
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
              >
                <option value="admin">Admin</option>
                <option value="editor">Editor</option>
                <option value="client">Cliente</option>
                <option value="finance">Financeiro</option>
                <option value="readonly">Leitura</option>
              </select>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowInvite(false)}
                className="flex-1 border border-gray-200 text-gray-600 hover:bg-gray-100 text-xs py-2 rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={inviting}
                className="flex-1 bg-violet-600 hover:bg-violet-700 disabled:opacity-60 text-white text-xs font-medium py-2 rounded-lg transition-colors flex items-center justify-center gap-1.5"
              >
                {inviting && <Loader2 className="w-3 h-3 animate-spin" />}
                {inviting ? 'Enviando...' : 'Enviar convite'}
              </button>
            </div>
          </form>
        )}

        {/* Lista de membros */}
        <div className="space-y-2">
          {members.map((member) => (
            <div
              key={member.id}
              className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors"
            >
              {/* Avatar */}
              <div className="w-8 h-8 rounded-full bg-violet-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                {member.user.name.charAt(0).toUpperCase()}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{member.user.name}</p>
                <p className="text-xs text-gray-400 truncate">{member.user.email}</p>
              </div>

              {/* Papel */}
              {canManage && member.role !== 'owner' ? (
                <select
                  value={member.role}
                  onChange={(e) => changeRole(member.id, e.target.value)}
                  className="text-xs border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-violet-500"
                >
                  {Object.entries(roleLabels)
                    .filter(([r]) => r !== 'owner')
                    .map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                </select>
              ) : (
                <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', roleColors[member.role] ?? roleColors.readonly)}>
                  {roleLabels[member.role] ?? member.role}
                </span>
              )}

              {/* Remover */}
              {canManage && member.role !== 'owner' && member.user.id !== user?.sub && (
                <button
                  onClick={() => removeMember(member.id, member.user.name)}
                  className="text-gray-300 hover:text-red-500 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Info de segurança */}
      <div className="bg-white rounded-xl border border-gray-100 p-5">
        <div className="flex items-center gap-2 mb-3">
          <Shield className="w-4 h-4 text-gray-400" />
          <h3 className="font-semibold text-gray-900 text-sm">Segurança</h3>
        </div>
        <p className="text-xs text-gray-500 leading-relaxed">
          Seus dados são protegidos com criptografia AES-256-GCM. Tokens das redes sociais
          nunca são armazenados em texto claro. Todas as ações são registradas em logs de auditoria.
        </p>
      </div>

    </div>
  )
}
