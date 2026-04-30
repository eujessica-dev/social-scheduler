'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import {
  Loader2, Trash2, CheckCircle2, XCircle,
  CalendarClock, ArrowLeft, Send,
} from 'lucide-react'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'

// ── schema ─────────────────────────────────────────────────────────────
const schema = z.object({
  title:       z.string().max(255).optional(),
  caption:     z.string().max(2200).optional(),
  hashtags:    z.string().optional(),
  scheduledAt: z.string().optional(),
  notes:       z.string().max(1000).optional(),
})
type FormData = z.infer<typeof schema>

// ── tipos ───────────────────────────────────────────────────────────────
interface Post {
  id: string
  title: string | null
  caption: string | null
  hashtags: string[]
  scheduledAt: string | null
  notes: string | null
  status: string
  brand: { name: string; color: string | null }
  platforms: { id: string; platform: string; status: string; publishedAt: string | null }[]
  media: { mediaAsset: { id: string; filename: string; url: string } }[]
}

const statusConfig: Record<string, { label: string; color: string }> = {
  draft:      { label: 'Rascunho',   color: 'bg-gray-100 text-gray-600' },
  scheduled:  { label: 'Agendado',   color: 'bg-blue-100 text-blue-700' },
  publishing: { label: 'Publicando', color: 'bg-yellow-100 text-yellow-700' },
  published:  { label: 'Publicado',  color: 'bg-green-100 text-green-700' },
  failed:     { label: 'Falhou',     color: 'bg-red-100 text-red-700' },
  cancelled:  { label: 'Cancelado',  color: 'bg-gray-100 text-gray-500' },
}

const platformIcon: Record<string, string> = {
  instagram: '📸', facebook: '👥', tiktok: '🎵',
}

// ── página ──────────────────────────────────────────────────────────────
export default function PostDetailPage() {
  const { id }   = useParams<{ id: string }>()
  const router   = useRouter()
  const [post, setPost]       = useState<Post | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving]   = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [cancelling, setCancelling] = useState(false)

  const { register, handleSubmit, reset, formState: { errors, isDirty } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  useEffect(() => {
    api.get(`/posts/${id}`)
      .then((res) => {
        setPost(res.data)
        reset({
          title:       res.data.title ?? '',
          caption:     res.data.caption ?? '',
          hashtags:    res.data.hashtags?.join(' ') ?? '',
          scheduledAt: res.data.scheduledAt
            ? new Date(res.data.scheduledAt).toISOString().slice(0, 16)
            : '',
          notes: res.data.notes ?? '',
        })
      })
      .catch(() => { toast.error('Post não encontrado'); router.push('/calendar') })
      .finally(() => setLoading(false))
  }, [id])

  const onSubmit = async (data: FormData) => {
    setSaving(true)
    try {
      const hashtags = data.hashtags
        ? data.hashtags.split(/[\s,]+/).filter(Boolean).map((h) => (h.startsWith('#') ? h : `#${h}`))
        : []
      const res = await api.patch(`/posts/${id}`, { ...data, hashtags })
      setPost(res.data)
      reset(data)
      toast.success('Post atualizado')
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? 'Erro ao salvar')
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = async () => {
    if (!confirm('Cancelar agendamento deste post?')) return
    setCancelling(true)
    try {
      const res = await api.patch(`/posts/${id}/cancel`)
      setPost(res.data)
      toast.success('Agendamento cancelado')
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? 'Erro ao cancelar')
    } finally {
      setCancelling(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('Excluir este post permanentemente?')) return
    setDeleting(true)
    try {
      await api.delete(`/posts/${id}`)
      toast.success('Post excluído')
      router.push('/calendar')
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? 'Erro ao excluir')
    } finally {
      setDeleting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-violet-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!post) return null

  const cfg      = statusConfig[post.status] ?? statusConfig.draft
  const editable = ['draft', 'scheduled'].includes(post.status)

  return (
    <div className="max-w-2xl mx-auto space-y-5">

      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar
        </button>

        <div className="flex items-center gap-2">
          <span className={cn('text-xs px-2.5 py-1 rounded-full font-medium', cfg.color)}>
            {cfg.label}
          </span>

          {post.status === 'scheduled' && (
            <button
              onClick={handleCancel}
              disabled={cancelling}
              className="flex items-center gap-1.5 text-xs text-yellow-600 hover:text-yellow-700 border border-yellow-200 hover:border-yellow-300 px-2.5 py-1 rounded-lg transition-colors"
            >
              {cancelling ? <Loader2 className="w-3 h-3 animate-spin" /> : <XCircle className="w-3 h-3" />}
              Cancelar agendamento
            </button>
          )}

          <button
            onClick={handleDelete}
            disabled={deleting}
            className="flex items-center gap-1.5 text-xs text-red-500 hover:text-red-600 border border-red-100 hover:border-red-200 px-2.5 py-1 rounded-lg transition-colors"
          >
            {deleting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
            Excluir
          </button>
        </div>
      </div>

      {/* Info da brand e plataformas */}
      <div className="bg-white rounded-xl border border-gray-100 p-4 flex items-center gap-4">
        <div
          className="w-2 h-10 rounded-full flex-shrink-0"
          style={{ background: post.brand.color ?? '#8b5cf6' }}
        />
        <div className="flex-1">
          <p className="text-xs text-gray-400">Marca</p>
          <p className="text-sm font-medium text-gray-900">{post.brand.name}</p>
        </div>
        <div className="flex gap-2">
          {post.platforms.map((p) => {
            const pCfg = statusConfig[p.status] ?? statusConfig.draft
            return (
              <div key={p.id} className="flex flex-col items-center gap-0.5">
                <span className="text-lg">{platformIcon[p.platform] ?? '🔗'}</span>
                <span className={cn('text-xs px-1.5 py-0.5 rounded-full font-medium', pCfg.color)}>
                  {pCfg.label}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Formulário de edição */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">

        <div className="bg-white rounded-xl border border-gray-100 p-5 space-y-3">
          <h3 className="font-medium text-gray-900 text-sm">Conteúdo</h3>

          <div>
            <label className="block text-xs text-gray-500 mb-1">Título interno</label>
            <input
              {...register('title')}
              disabled={!editable}
              placeholder="Título opcional"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 disabled:bg-gray-50 disabled:text-gray-400"
            />
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-1">Legenda</label>
            <textarea
              {...register('caption')}
              disabled={!editable}
              rows={5}
              placeholder="Legenda do post..."
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none disabled:bg-gray-50 disabled:text-gray-400"
            />
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-1">Hashtags</label>
            <input
              {...register('hashtags')}
              disabled={!editable}
              placeholder="hashtags separadas por espaço"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 disabled:bg-gray-50 disabled:text-gray-400"
            />
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 p-5 space-y-3">
          <h3 className="font-medium text-gray-900 text-sm flex items-center gap-2">
            <CalendarClock className="w-4 h-4 text-gray-400" />
            Agendamento
          </h3>
          <input
            {...register('scheduledAt')}
            type="datetime-local"
            disabled={!editable}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 disabled:bg-gray-50 disabled:text-gray-400"
          />
          <textarea
            {...register('notes')}
            disabled={!editable}
            rows={2}
            placeholder="Observações internas..."
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none disabled:bg-gray-50 disabled:text-gray-400"
          />
        </div>

        {/* Mídia associada */}
        {post.media.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-100 p-5">
            <h3 className="font-medium text-gray-900 text-sm mb-3">Mídia</h3>
            <div className="grid grid-cols-4 gap-2">
              {post.media.map((m) => (
                <div key={m.mediaAsset.id} className="aspect-square rounded-lg overflow-hidden border border-gray-100">
                  <img
                    src={m.mediaAsset.url}
                    alt={m.mediaAsset.filename}
                    className="w-full h-full object-cover"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {editable && (
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving || !isDirty}
              className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white text-sm font-medium py-2.5 px-5 rounded-lg transition-colors"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              {saving ? 'Salvando...' : 'Salvar alterações'}
            </button>
          </div>
        )}

        {!editable && (
          <p className="text-xs text-center text-gray-400">
            Posts com status "{cfg.label}" não podem ser editados.
          </p>
        )}
      </form>
    </div>
  )
}
