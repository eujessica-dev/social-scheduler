'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import {
  Loader2, CalendarClock, Layers, CheckCircle2,
  Upload, Image as ImageIcon, Film, Plus, Plug,
  ChevronDown, X, Check,
} from 'lucide-react'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'
import { SchedulePicker } from '@/components/SchedulePicker'

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

interface Brand   { id: string; name: string; color: string | null; logoUrl?: string | null }
interface Account { id: string; accountName: string; platform: string; status: string }
interface Media   { id: string; filename: string; url: string; mimeType: string }
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
  facebook: '👥',
  tiktok: '🎵',
}

const platformLabel: Record<string, string> = {
  instagram: 'Instagram',
  facebook: 'Facebook',
  tiktok: 'TikTok',
}

// ─── Media thumb ─────────────────────────────────────────────────────────────
function MediaThumb({
  asset, selected, index, onClick, onRemove,
}: {
  asset: Media
  selected: boolean
  index: number
  onClick: () => void
  onRemove?: () => void
}) {
  const isVideo = asset.mimeType.startsWith('video')
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'relative aspect-square rounded-xl overflow-hidden border-2 transition-all group',
        selected ? 'border-violet-600 shadow-md shadow-violet-100' : 'border-transparent hover:border-violet-300',
      )}
    >
      {isVideo ? (
        <div className="w-full h-full bg-gray-900 flex items-center justify-center">
          <Film className="w-6 h-6 text-gray-400" />
          <video src={asset.url} className="absolute inset-0 w-full h-full object-cover opacity-60" muted />
        </div>
      ) : (
        <img src={asset.url} alt={asset.filename} className="w-full h-full object-cover" />
      )}

      {/* Selection badge */}
      {selected && (
        <div className="absolute inset-0 bg-violet-600/20 flex items-center justify-center">
          <div className="w-6 h-6 bg-violet-600 rounded-full flex items-center justify-center text-white text-xs font-bold shadow">
            {index + 1}
          </div>
        </div>
      )}

      {/* Video indicator */}
      {isVideo && !selected && (
        <div className="absolute bottom-1 left-1 bg-black/60 rounded px-1 py-0.5">
          <Film className="w-2.5 h-2.5 text-white" />
        </div>
      )}
    </button>
  )
}

// ─── Brand Avatar ─────────────────────────────────────────────────────────────
function BrandAvatar({ brand, size = 'sm' }: { brand: Brand; size?: 'sm' | 'md' }) {
  const dim = size === 'md' ? 'w-8 h-8 text-sm' : 'w-6 h-6 text-xs'
  if (brand.logoUrl) {
    return (
      <img
        src={brand.logoUrl}
        alt={brand.name}
        className={cn(dim, 'rounded-full object-cover flex-shrink-0')}
      />
    )
  }
  return (
    <div
      className={cn(dim, 'rounded-full flex items-center justify-center font-bold text-white flex-shrink-0')}
      style={{ backgroundColor: brand.color ?? '#7c3aed' }}
    >
      {brand.name.charAt(0).toUpperCase()}
    </div>
  )
}

// ─── Brand Select (chip-style) ────────────────────────────────────────────────
function BrandSelect({
  brands,
  value,
  onChange,
  error,
}: {
  brands: Brand[]
  value: string
  onChange: (id: string) => void
  error?: string
}) {
  const [open, setOpen]       = useState(false)
  const [search, setSearch]   = useState('')
  const ref                   = useRef<HTMLDivElement>(null)
  const selected              = brands.find((b) => b.id === value) ?? null
  const filtered              = brands.filter((b) =>
    b.name.toLowerCase().includes(search.toLowerCase()),
  )

  // Fecha ao clicar fora
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div ref={ref} className="relative">
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          'w-full flex items-center gap-2 px-3 py-2.5 border rounded-xl text-sm transition-all text-left',
          open
            ? 'border-violet-500 ring-2 ring-violet-200'
            : error
              ? 'border-red-400'
              : 'border-gray-200 hover:border-violet-300',
        )}
      >
        {selected ? (
          /* Chip da marca selecionada */
          <div className="flex items-center gap-2 bg-gray-100 rounded-lg pl-2 pr-1.5 py-1 min-w-0">
            {/* × para limpar */}
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onChange(''); setSearch('') }}
              className="text-gray-400 hover:text-gray-600 flex-shrink-0 transition-colors"
            >
              <X className="w-3 h-3" />
            </button>
            <BrandAvatar brand={selected} size="sm" />
            <span className="text-sm font-medium text-gray-800 truncate">{selected.name}</span>
          </div>
        ) : (
          <span className="text-gray-400 flex-1">Selecione uma marca</span>
        )}
        <ChevronDown className={cn('w-4 h-4 text-gray-400 ml-auto flex-shrink-0 transition-transform', open && 'rotate-180')} />
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute top-full left-0 right-0 mt-1.5 bg-white border border-gray-200 rounded-xl shadow-lg z-50 overflow-hidden">
          {/* Search */}
          {brands.length > 5 && (
            <div className="p-2 border-b border-gray-100">
              <input
                autoFocus
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar marca..."
                className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-400"
              />
            </div>
          )}

          <div className="max-h-52 overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-4">Nenhuma marca encontrada</p>
            ) : (
              filtered.map((b) => (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => { onChange(b.id); setOpen(false); setSearch('') }}
                  className={cn(
                    'w-full flex items-center gap-2.5 px-3 py-2 hover:bg-violet-50 transition-colors text-left',
                    value === b.id && 'bg-violet-50',
                  )}
                >
                  <BrandAvatar brand={b} size="md" />
                  <span className="flex-1 text-sm text-gray-800 font-medium truncate">{b.name}</span>
                  {value === b.id && <Check className="w-4 h-4 text-violet-600 flex-shrink-0" />}
                </button>
              ))
            )}
          </div>
        </div>
      )}

      {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function NewPostPage() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const dropRef = useRef<HTMLDivElement>(null)

  const [brands, setBrands]               = useState<Brand[]>([])
  const [accounts, setAccounts]           = useState<Account[]>([])
  const [mediaList, setMedia]             = useState<Media[]>([])
  const [selectedIds, setSelectedIds]     = useState<string[]>([])
  const [uploading, setUploading]         = useState(false)
  const [isDragging, setIsDragging]       = useState(false)
  const [loading, setLoading]             = useState(false)
  const [approvedCreatives, setApproved]  = useState<Creative[]>([])
  const [selectedCreative, setSelectedCr] = useState<string | null>(null)
  const [loadingCreatives, setLoadingCr]  = useState(false)
  const [scheduledAt, setScheduledAt]     = useState('')

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { socialAccountIds: [], mediaAssetIds: [], timezone: 'America/Sao_Paulo' },
  })

  const watchedBrandId   = watch('brandId')
  const selectedAccounts = watch('socialAccountIds') ?? []

  // Initial data load
  useEffect(() => {
    Promise.all([
      api.get('/brands'),
      api.get('/social-accounts'),
      api.get('/media'),
    ]).then(([b, a, m]) => {
      setBrands(b.data)
      setAccounts(a.data.filter((acc: Account) => acc.status === 'active'))
      setMedia(m.data)
    })
  }, [])

  // Load approved creatives when brand changes
  useEffect(() => {
    if (!watchedBrandId) { setApproved([]); return }
    setLoadingCr(true)
    setSelectedCr(null)
    api.get(`/brands/${watchedBrandId}/creatives`)
      .then((res) => setApproved(res.data.filter((c: Creative) => c.status === 'approved')))
      .finally(() => setLoadingCr(false))
  }, [watchedBrandId])

  // ─── File upload handler ─────────────────────────────────────────────────
  const uploadFiles = useCallback(async (files: File[]) => {
    if (!files.length) return
    setUploading(true)
    try {
      for (const file of files) {
        const fd = new FormData()
        fd.append('file', file)
        const params = watchedBrandId ? `?brandId=${watchedBrandId}` : ''
        const res = await api.post(`/media/upload${params}`, fd, {
          headers: { 'Content-Type': 'multipart/form-data' },
        })
        const asset: Media = res.data
        setMedia((prev) => [asset, ...prev])
        setSelectedIds((prev) => {
          const next = [...prev, asset.id]
          setValue('mediaAssetIds', next)
          return next
        })
      }
      toast.success('Mídia adicionada')
    } catch {
      toast.error('Erro ao fazer upload da mídia')
    } finally {
      setUploading(false)
    }
  }, [watchedBrandId, setValue])

  // ─── Drag and drop ───────────────────────────────────────────────────────
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }
  const handleDragLeave = (e: React.DragEvent) => {
    if (!dropRef.current?.contains(e.relatedTarget as Node)) setIsDragging(false)
  }
  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const files = Array.from(e.dataTransfer.files).filter(
      (f) => f.type.startsWith('image/') || f.type.startsWith('video/'),
    )
    await uploadFiles(files)
  }
  const handleFileInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    await uploadFiles(files)
    e.target.value = ''
  }

  // ─── Toggle media selection ──────────────────────────────────────────────
  const toggleMedia = (id: string) => {
    const next = selectedIds.includes(id)
      ? selectedIds.filter((x) => x !== id)
      : [...selectedIds, id]
    setSelectedIds(next)
    setValue('mediaAssetIds', next)
  }

  // ─── Apply creative ──────────────────────────────────────────────────────
  const applyCreative = (c: Creative) => {
    setSelectedCr(c.id)
    setValue('title', c.title ?? '')
    setValue('caption', c.caption ?? '')
    setValue('hashtags', c.hashtags.join(' '))
    const ids = c.media.sort((a, b) => a.order - b.order).map((m) => m.mediaAsset.id)
    setSelectedIds(ids)
    setValue('mediaAssetIds', ids)
    setMedia((prev) => {
      const existing = new Set(prev.map((m) => m.id))
      const newAssets = c.media.filter((m) => !existing.has(m.mediaAsset.id)).map((m) => m.mediaAsset)
      return [...newAssets, ...prev]
    })
  }

  // ─── Toggle social account ───────────────────────────────────────────────
  const toggleAccount = (id: string) => {
    const cur = selectedAccounts
    const next = cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]
    setValue('socialAccountIds', next)
  }

  // ─── Submit ──────────────────────────────────────────────────────────────
  const onSubmit = async (data: FormData) => {
    setLoading(true)
    try {
      const hashtags = data.hashtags
        ? data.hashtags.split(/[\s,]+/).filter(Boolean).map((h) => (h.startsWith('#') ? h : `#${h}`))
        : []
      await api.post('/posts', {
        ...data,
        hashtags,
        mediaAssetIds: selectedIds,
        scheduledAt: scheduledAt || undefined,
      })
      toast.success('Post criado com sucesso!')
      router.push('/calendar')
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? 'Erro ao criar post')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">

        {/* ── Marca ─────────────────────────────────────────────────────── */}
        <div className="bg-white rounded-xl border border-gray-100 p-5 space-y-3">
          <h3 className="font-medium text-gray-900 text-sm">Marca / Cliente</h3>
          <BrandSelect
            brands={brands}
            value={watchedBrandId ?? ''}
            onChange={(id) => setValue('brandId', id, { shouldValidate: true })}
            error={errors.brandId?.message}
          />
        </div>

        {/* ── Criativos aprovados ───────────────────────────────────────── */}
        {watchedBrandId && (
          <div className="bg-white rounded-xl border border-gray-100 p-5 space-y-3">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-violet-500" />
              <h3 className="font-medium text-gray-900 text-sm">Usar criativo aprovado</h3>
              <span className="text-xs text-gray-400">(opcional)</span>
            </div>

            {loadingCreatives ? (
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <Loader2 className="w-4 h-4 animate-spin" /> Carregando...
              </div>
            ) : approvedCreatives.length === 0 ? (
              <p className="text-sm text-gray-400">
                Nenhum criativo aprovado.{' '}
                <Link href={`/brands/${watchedBrandId}`} className="text-violet-600 hover:underline">
                  Criar criativo
                </Link>
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {approvedCreatives.map((c) => {
                  const thumb = c.media[0]?.mediaAsset
                  const isChosen = selectedCreative === c.id
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => applyCreative(c)}
                      className={cn(
                        'flex items-center gap-3 p-3 rounded-xl border text-left transition-all',
                        isChosen
                          ? 'border-violet-400 bg-violet-50 ring-1 ring-violet-400'
                          : 'border-gray-200 hover:border-violet-300 hover:bg-violet-50/30',
                      )}
                    >
                      <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                        {thumb ? (
                          thumb.mimeType.startsWith('video') ? (
                            <video src={thumb.url} className="w-full h-full object-cover" muted />
                          ) : (
                            <img src={thumb.url} alt="" className="w-full h-full object-cover" />
                          )
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Layers className="w-4 h-4 text-gray-300" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate">{c.title ?? 'Sem título'}</p>
                        {c.caption && <p className="text-xs text-gray-400 truncate">{c.caption}</p>}
                        <p className="text-xs text-green-600 flex items-center gap-1 mt-0.5">
                          <CheckCircle2 className="w-3 h-3" /> Aprovado
                        </p>
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* ── Conteúdo ──────────────────────────────────────────────────── */}
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

        {/* ── Mídia ─────────────────────────────────────────────────────── */}
        <div className="bg-white rounded-xl border border-gray-100 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-medium text-gray-900 text-sm">
              Mídia
              {selectedIds.length > 0 && (
                <span className="ml-2 text-xs text-violet-600 font-normal">
                  {selectedIds.length} selecionada{selectedIds.length > 1 ? 's' : ''}
                </span>
              )}
            </h3>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="flex items-center gap-1.5 text-xs text-violet-700 border border-violet-200 bg-violet-50 hover:bg-violet-100 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
            >
              {uploading
                ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                : <Upload className="w-3.5 h-3.5" />
              }
              Upload
            </button>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*,video/*"
            className="hidden"
            onChange={handleFileInput}
          />

          {/* Drop zone */}
          <div
            ref={dropRef}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => mediaList.length === 0 && fileInputRef.current?.click()}
            className={cn(
              'border-2 border-dashed rounded-xl transition-colors',
              isDragging
                ? 'border-violet-500 bg-violet-50'
                : 'border-gray-200 hover:border-violet-300',
              mediaList.length === 0 ? 'cursor-pointer p-10 flex flex-col items-center justify-center text-center' : 'p-3',
            )}
          >
            {mediaList.length === 0 ? (
              <>
                {uploading ? (
                  <Loader2 className="w-8 h-8 text-violet-500 animate-spin mb-2" />
                ) : (
                  <div className="flex gap-2 mb-3">
                    <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center">
                      <ImageIcon className="w-5 h-5 text-violet-500" />
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center">
                      <Film className="w-5 h-5 text-violet-500" />
                    </div>
                  </div>
                )}
                <p className="text-sm font-medium text-gray-600">
                  {isDragging ? 'Solte para adicionar' : 'Arraste fotos e vídeos aqui'}
                </p>
                <p className="text-xs text-gray-400 mt-1">ou clique para selecionar</p>
              </>
            ) : (
              <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
                {mediaList.map((m) => (
                  <MediaThumb
                    key={m.id}
                    asset={m}
                    selected={selectedIds.includes(m.id)}
                    index={selectedIds.indexOf(m.id)}
                    onClick={() => toggleMedia(m.id)}
                  />
                ))}

                {/* Add more button */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className={cn(
                    'aspect-square rounded-xl border-2 border-dashed border-gray-200',
                    'flex flex-col items-center justify-center gap-1',
                    'hover:border-violet-400 hover:bg-violet-50/40 transition-colors',
                    'disabled:opacity-50',
                  )}
                >
                  {uploading
                    ? <Loader2 className="w-4 h-4 text-violet-500 animate-spin" />
                    : <>
                        <Plus className="w-4 h-4 text-gray-400" />
                        <span className="text-[10px] text-gray-400">Adicionar</span>
                      </>
                  }
                </button>
              </div>
            )}
          </div>

          {/* Drop hint when there's already media */}
          {mediaList.length > 0 && (
            <p className="text-xs text-gray-400 flex items-center gap-1.5">
              <Upload className="w-3 h-3" />
              Arraste arquivos sobre a área para adicionar mais · Clique numa mídia para selecioná-la
            </p>
          )}
        </div>

        {/* ── Publicar em ───────────────────────────────────────────────── */}
        <div className="bg-white rounded-xl border border-gray-100 p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-medium text-gray-900 text-sm">Publicar em</h3>
            <Link
              href="/settings/social-accounts"
              className="flex items-center gap-1 text-xs text-violet-600 hover:text-violet-700 hover:underline"
            >
              <Plug className="w-3 h-3" />
              Conectar conta
            </Link>
          </div>

          {accounts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center border-2 border-dashed border-gray-200 rounded-xl">
              <Plug className="w-8 h-8 text-gray-300 mb-2" />
              <p className="text-sm text-gray-500 mb-3">Nenhuma conta de rede social conectada.</p>
              <div className="flex gap-2">
                {['instagram', 'facebook', 'tiktok'].map((p) => (
                  <div
                    key={p}
                    className="flex flex-col items-center gap-1 px-4 py-3 border border-gray-100 rounded-xl text-gray-400"
                  >
                    <span className="text-xl">{platformIcon[p]}</span>
                    <span className="text-xs">{platformLabel[p]}</span>
                  </div>
                ))}
              </div>
              <Link
                href="/settings/social-accounts"
                className="mt-4 inline-flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium px-5 py-2 rounded-lg transition-colors"
              >
                <Plug className="w-3.5 h-3.5" />
                Conectar rede social
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              {accounts.map((a) => {
                const checked = selectedAccounts.includes(a.id)
                return (
                  <label
                    key={a.id}
                    className={cn(
                      'flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all',
                      checked
                        ? 'border-violet-300 bg-violet-50'
                        : 'border-gray-100 hover:border-violet-200 hover:bg-gray-50',
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleAccount(a.id)}
                      className="w-4 h-4 accent-violet-600 flex-shrink-0"
                    />
                    <span className="text-base leading-none">{platformIcon[a.platform]}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-800 font-medium truncate">{a.accountName}</p>
                      <p className="text-xs text-gray-400 capitalize">{platformLabel[a.platform]}</p>
                    </div>
                    {checked && <CheckCircle2 className="w-4 h-4 text-violet-500 flex-shrink-0" />}
                  </label>
                )
              })}
            </div>
          )}

          {errors.socialAccountIds && (
            <p className="text-red-500 text-xs">{errors.socialAccountIds.message}</p>
          )}
        </div>

        {/* ── Agendamento ───────────────────────────────────────────────── */}
        <div className="bg-white rounded-xl border border-gray-100 p-5 space-y-3">
          <h3 className="font-medium text-gray-900 text-sm flex items-center gap-2">
            <CalendarClock className="w-4 h-4 text-gray-400" />
            Agendamento (opcional)
          </h3>
          <SchedulePicker
            value={scheduledAt}
            onChange={(v) => {
              setScheduledAt(v)
              setValue('scheduledAt', v)
            }}
          />
          <textarea
            {...register('notes')}
            rows={2}
            placeholder="Observações internas (não aparecem no post)..."
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none"
          />
        </div>

        {/* ── Ações ─────────────────────────────────────────────────────── */}
        <div className="flex gap-3 pb-8">
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
