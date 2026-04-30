'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Loader2, Image as ImageIcon, CalendarClock, Layers, CheckCircle2 } from 'lucide-react'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'

const schema = z.object({
  brandId:          z.string().uuid('Selecione uma marca'),
  title:            z.string().max(255).optional(),
  caption:          z.string().max(2200).optional(),
  hashtags:         z.string().optional(),
  scheduledAt:      z.string().optional(),
  timezone:         z.string().default('America/Sao_Paulo'),
  notes:            z.string().max(1000).optional(),
  socialAccountIds: z.array(z.string()).min(1, 'Selecione ao menos uma conta'),
  mediaAssetIds:    z.array(z.string()).optional(),
})

type FormData = z.infer<typeof schema>

interface Brand    { id: string; name: string; color: string | null }
interface Account  { id: string; accountName: string; platform: string; status: string }
interface Media    { id: string; filename: string; url: string; mimeType: string }
interface Creative {
  id: string
  title: string | null
  caption: string | null
  hashtags: string[]
  status: string
  media: { id: string; order: number; mediaAsset: Media }[]
}

const platformIcon: Record<string, string> = {
  instagram: '📸',
  facebook:  '👥',
  tiktok:    '🎵',
}

export default function NewPostPage() {
  const router = useRouter()
  const [brands, setBrands]               = useState<Brand[]>([])
  const [accounts, setAccounts]           = useState<Account[]>([])
  const [mediaList, setMedia]             = useState<Media[]>([])
  const [selected, setSelected]           = useState<string[]>([])
  const [loading, setLoading]             = useState(false)
  const [approvedCreatives, setApproved]  = useState<Creative[]>([])
  const [selectedCreative, setSelectedCr] = useState<string | null>(null)
  const [loadingCreatives, setLoadingCr]  = useState(false)

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { socialAccountIds: [], mediaAssetIds: [], timezone: 'America/Sao_Paulo' },
  })

  const watchedBrandId = watch('brandId')

  useEffect(() => {
    Promise.all([
      api.get('/brands'),
      api.get('/social-accounts'),
      api.get('/media'),
    ]).then(([b, a, m]) => {
      setBrands(b.data)
      setAccounts(a.data.filter((a: Account) => a.status === 'active'))
      setMedia(m.data)
    })
  }, [])

  // Load approved creatives when brand changes
  useEffect(() => {
    if (!watchedBrandId) { setApproved([]); return }
    setLoadingCr(true)
    setSelectedCr(null)
    api.get(`/brands/${watchedBrandId}/creatives`)
      .then((res) => {
        setApproved(res.data.filter((c: Creative) => c.status === 'approved'))
      })
      .finally(() => setLoadingCr(false))
  }, [watchedBrandId])

  const applyCreative = (c: Creative) => {
    setSelectedCr(c.id)
    setValue('title', c.title ?? '')
    setValue('caption', c.caption ?? '')
    setValue('hashtags', c.hashtags.join(' '))
    const mediaIds = c.media
      .sort((a, b) => a.order - b.order)
      .map((m) => m.mediaAsset.id)
    setSelected(mediaIds)
    setValue('mediaAssetIds', mediaIds)
    // also add assets to media list if not present
    setMedia((prev) => {
      const existingIds = new Set(prev.map((m) => m.id))
      const newAssets = c.media
        .filter((m) => !existingIds.has(m.mediaAsset.id))
        .map((m) => m.mediaAsset)
      return [...newAssets, ...prev]
    })
  }

  const toggleAccount = (id: string) => {
    const cur = watch('socialAccountIds') ?? []
    const next = cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]
    setValue('socialAccountIds', next)
  }

  const toggleMedia = (id: string) => {
    const next = selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id]
    setSelected(next)
    setValue('mediaAssetIds', next)
  }

  const onSubmit = async (data: FormData) => {
    setLoading(true)
    try {
      const hashtags = data.hashtags
        ? data.hashtags.split(/[\s,]+/).filter(Boolean).map((h) => (h.startsWith('#') ? h : `#${h}`))
        : []

      await api.post('/posts', { ...data, hashtags, mediaAssetIds: selected })
      toast.success('Post criado com sucesso!')
      router.push('/calendar')
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? 'Erro ao criar post')
    } finally {
      setLoading(false)
    }
  }

  const selectedAccounts = watch('socialAccountIds') ?? []

  return (
    <div className="max-w-2xl mx-auto">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">

        {/* Marca */}
        <div className="bg-white rounded-xl border border-gray-100 p-5 space-y-3">
          <h3 className="font-medium text-gray-900 text-sm">Marca / Cliente</h3>
          <select
            {...register('brandId')}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
          >
            <option value="">Selecione uma marca</option>
            {brands.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
          {errors.brandId && <p className="text-red-500 text-xs">{errors.brandId.message}</p>}
        </div>

        {/* Criativos aprovados */}
        {watchedBrandId && (
          <div className="bg-white rounded-xl border border-gray-100 p-5 space-y-3">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-violet-500" />
              <h3 className="font-medium text-gray-900 text-sm">Usar criativo aprovado</h3>
              <span className="text-xs text-gray-400">(opcional)</span>
            </div>

            {loadingCreatives ? (
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <Loader2 className="w-4 h-4 animate-spin" />
                Carregando criativos...
              </div>
            ) : approvedCreatives.length === 0 ? (
              <p className="text-sm text-gray-400">
                Nenhum criativo aprovado para esta marca.{' '}
                <a href={`/brands/${watchedBrandId}`} className="text-violet-600 hover:underline">
                  Criar criativo
                </a>
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {approvedCreatives.map((c) => {
                  const thumb = c.media[0]?.mediaAsset
                  const isSelected = selectedCreative === c.id
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => applyCreative(c)}
                      className={cn(
                        'flex items-center gap-3 p-3 rounded-xl border text-left transition-all',
                        isSelected
                          ? 'border-violet-400 bg-violet-50 ring-1 ring-violet-400'
                          : 'border-gray-200 hover:border-violet-300 hover:bg-violet-50/30',
                      )}
                    >
                      {/* Thumb */}
                      <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                        {thumb ? (
                          thumb.mimeType.startsWith('video') ? (
                            <video src={thumb.url} className="w-full h-full object-cover" muted />
                          ) : (
                            <img src={thumb.url} alt="" className="w-full h-full object-cover" />
                          )
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Layers className="w-5 h-5 text-gray-300" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate">
                          {c.title ?? 'Sem título'}
                        </p>
                        {c.caption && (
                          <p className="text-xs text-gray-400 truncate">{c.caption}</p>
                        )}
                        <p className="text-xs text-green-600 flex items-center gap-1 mt-0.5">
                          <CheckCircle2 className="w-3 h-3" />
                          Aprovado
                        </p>
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* Conteúdo */}
        <div className="bg-white rounded-xl border border-gray-100 p-5 space-y-3">
          <h3 className="font-medium text-gray-900 text-sm">Conteúdo</h3>
          <input
            {...register('title')}
            type="text"
            placeholder="Título interno (opcional)"
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
          />
          <textarea
            {...register('caption')}
            rows={5}
            placeholder="Escreva a legenda do post..."
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none"
          />
          <input
            {...register('hashtags')}
            type="text"
            placeholder="hashtags separadas por espaço ou vírgula"
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
          />
        </div>

        {/* Mídia */}
        <div className="bg-white rounded-xl border border-gray-100 p-5 space-y-3">
          <h3 className="font-medium text-gray-900 text-sm">Mídia</h3>
          {mediaList.length === 0 ? (
            <p className="text-gray-400 text-sm">Nenhuma mídia na biblioteca.</p>
          ) : (
            <div className="grid grid-cols-4 gap-2">
              {mediaList.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => toggleMedia(m.id)}
                  className={cn(
                    'relative aspect-square rounded-lg overflow-hidden border-2 transition-all',
                    selected.includes(m.id) ? 'border-violet-600' : 'border-transparent',
                  )}
                >
                  {m.mimeType.startsWith('image/') ? (
                    <img src={m.url} alt={m.filename} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                      <ImageIcon className="w-5 h-5 text-gray-400" />
                    </div>
                  )}
                  {selected.includes(m.id) && (
                    <div className="absolute inset-0 bg-violet-600/20 flex items-center justify-center">
                      <div className="w-5 h-5 bg-violet-600 rounded-full flex items-center justify-center text-white text-xs font-bold">
                        {selected.indexOf(m.id) + 1}
                      </div>
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Contas sociais */}
        <div className="bg-white rounded-xl border border-gray-100 p-5 space-y-3">
          <h3 className="font-medium text-gray-900 text-sm">Publicar em</h3>
          {accounts.length === 0 ? (
            <p className="text-gray-400 text-sm">Nenhuma conta conectada.</p>
          ) : (
            <div className="space-y-2">
              {accounts.map((a) => (
                <label key={a.id} className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedAccounts.includes(a.id)}
                    onChange={() => toggleAccount(a.id)}
                    className="w-4 h-4 accent-violet-600"
                  />
                  <span className="text-sm">{platformIcon[a.platform]}</span>
                  <span className="text-sm text-gray-700">{a.accountName}</span>
                  <span className="text-xs text-gray-400 capitalize">{a.platform}</span>
                </label>
              ))}
            </div>
          )}
          {errors.socialAccountIds && (
            <p className="text-red-500 text-xs">{errors.socialAccountIds.message}</p>
          )}
        </div>

        {/* Agendamento */}
        <div className="bg-white rounded-xl border border-gray-100 p-5 space-y-3">
          <h3 className="font-medium text-gray-900 text-sm flex items-center gap-2">
            <CalendarClock className="w-4 h-4 text-gray-400" />
            Agendamento (opcional)
          </h3>
          <input
            {...register('scheduledAt')}
            type="datetime-local"
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
          />
          <textarea
            {...register('notes')}
            rows={2}
            placeholder="Observações internas (não aparecem no post)..."
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none"
          />
        </div>

        {/* Ações */}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="flex-1 border border-gray-200 text-gray-600 hover:bg-gray-50 text-sm font-medium py-2.5 rounded-lg transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 bg-violet-600 hover:bg-violet-700 disabled:opacity-60 text-white text-sm font-medium py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {loading ? 'Salvando...' : 'Salvar post'}
          </button>
        </div>
      </form>
    </div>
  )
}
