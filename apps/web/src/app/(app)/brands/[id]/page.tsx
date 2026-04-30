'use client'

import { useEffect, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { api } from '@/lib/api'
import {
  ArrowLeft, PlusCircle, Upload, Globe, Pencil,
  CheckCircle2, Clock, XCircle, Archive, Send, Layers,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface Brand {
  id: string
  name: string
  color: string | null
  description: string | null
  website: string | null
  logoUrl: string | null
  logoStorageKey: string | null
  _count: { posts: number; mediaAssets: number; creatives: number }
  socialAccounts: { id: string; platform: string; accountName: string }[]
}

interface Creative {
  id: string
  title: string | null
  caption: string | null
  hashtags: string[]
  status: string
  createdAt: string
  media: { id: string; mediaAsset: { id: string; url: string; mimeType: string } }[]
  _count: { approvals: number }
}

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
  draft:            { label: 'Rascunho',          color: 'bg-gray-100 text-gray-600',   icon: Clock },
  pending_approval: { label: 'Aguard. aprovação', color: 'bg-yellow-100 text-yellow-700', icon: Send },
  approved:         { label: 'Aprovado',          color: 'bg-green-100 text-green-700', icon: CheckCircle2 },
  rejected:         { label: 'Rejeitado',         color: 'bg-red-100 text-red-700',     icon: XCircle },
  archived:         { label: 'Arquivado',         color: 'bg-gray-100 text-gray-500',   icon: Archive },
}

function CreativeCard({ creative, brandId }: { creative: Creative; brandId: string }) {
  const cfg = statusConfig[creative.status] ?? statusConfig.draft
  const Icon = cfg.icon
  const thumb = creative.media[0]?.mediaAsset

  return (
    <Link
      href={`/brands/${brandId}/creatives/${creative.id}`}
      className="bg-white rounded-xl border border-gray-100 overflow-hidden hover:shadow-md hover:border-violet-200 transition-all group"
    >
      {/* Thumbnail */}
      <div className="h-40 bg-gray-50 relative overflow-hidden">
        {thumb ? (
          thumb.mimeType.startsWith('video') ? (
            <video src={thumb.url} className="w-full h-full object-cover" muted />
          ) : (
            <img src={thumb.url} alt="" className="w-full h-full object-cover" />
          )
        ) : (
          <div className="flex items-center justify-center h-full">
            <Layers className="w-8 h-8 text-gray-200" />
          </div>
        )}
        <span className={cn('absolute top-2 right-2 flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium', cfg.color)}>
          <Icon className="w-3 h-3" />
          {cfg.label}
        </span>
      </div>

      {/* Info */}
      <div className="p-4">
        <p className="font-medium text-gray-900 text-sm truncate group-hover:text-violet-700 transition-colors">
          {creative.title ?? 'Sem título'}
        </p>
        {creative.caption && (
          <p className="text-xs text-gray-400 line-clamp-2 mt-1">{creative.caption}</p>
        )}
        {creative.hashtags.length > 0 && (
          <p className="text-xs text-violet-500 mt-2 truncate">
            {creative.hashtags.slice(0, 3).map((h) => `#${h}`).join(' ')}
            {creative.hashtags.length > 3 && ` +${creative.hashtags.length - 3}`}
          </p>
        )}
        <div className="flex items-center justify-between mt-3 text-xs text-gray-400">
          <span>{creative.media.length} mídia{creative.media.length !== 1 ? 's' : ''}</span>
          <span>{creative._count.approvals} link{creative._count.approvals !== 1 ? 's' : ''}</span>
        </div>
      </div>
    </Link>
  )
}

export default function BrandDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const logoInputRef = useRef<HTMLInputElement>(null)

  const [brand, setBrand] = useState<Brand | null>(null)
  const [creatives, setCreatives] = useState<Creative[]>([])
  const [loading, setLoading] = useState(true)
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [tab, setTab] = useState<'creatives' | 'info'>('creatives')
  const [statusFilter, setStatusFilter] = useState<string>('all')

  const [editForm, setEditForm] = useState({ name: '', description: '', website: '', color: '' })
  const [saving, setSaving] = useState(false)

  const load = async () => {
    try {
      const [brandRes, creativesRes] = await Promise.all([
        api.get(`/brands/${id}`),
        api.get(`/brands/${id}/creatives`),
      ])
      setBrand(brandRes.data)
      setEditForm({
        name: brandRes.data.name,
        description: brandRes.data.description ?? '',
        website: brandRes.data.website ?? '',
        color: brandRes.data.color ?? '#8b5cf6',
      })
      setCreatives(creativesRes.data)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [id])

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingLogo(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await api.post(`/brands/${id}/logo`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setBrand((prev) => prev ? { ...prev, logoUrl: res.data.logoUrl } : prev)
    } catch {
      alert('Erro ao enviar logo')
    } finally {
      setUploadingLogo(false)
    }
  }

  const handleSaveInfo = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      await api.patch(`/brands/${id}`, {
        name: editForm.name,
        description: editForm.description || undefined,
        website: editForm.website || undefined,
        color: editForm.color,
      })
      load()
    } finally {
      setSaving(false)
    }
  }

  const filteredCreatives = statusFilter === 'all'
    ? creatives
    : creatives.filter((c) => c.status === statusFilter)

  if (loading || !brand) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-violet-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Brand Header */}
      <div className="bg-white rounded-xl border border-gray-100 p-6">
        <div className="flex items-start gap-5">
          {/* Logo */}
          <div className="relative group flex-shrink-0">
            {brand.logoUrl ? (
              <img
                src={brand.logoUrl}
                alt={brand.name}
                className="w-20 h-20 rounded-2xl object-cover"
              />
            ) : (
              <div
                className="w-20 h-20 rounded-2xl flex items-center justify-center text-white font-bold text-3xl"
                style={{ background: brand.color ?? '#8b5cf6' }}
              >
                {brand.name.charAt(0).toUpperCase()}
              </div>
            )}
            <button
              onClick={() => logoInputRef.current?.click()}
              disabled={uploadingLogo}
              className="absolute inset-0 bg-black/50 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
            >
              {uploadingLogo
                ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                : <Upload className="w-5 h-5 text-white" />
              }
            </button>
            <input
              ref={logoInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleLogoUpload}
            />
          </div>

          {/* Info */}
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold text-gray-900">{brand.name}</h1>
              {brand.color && (
                <div className="w-4 h-4 rounded-full" style={{ background: brand.color }} />
              )}
            </div>
            {brand.description && <p className="text-sm text-gray-500 mt-1">{brand.description}</p>}
            {brand.website && (
              <a
                href={brand.website}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs text-violet-600 hover:underline mt-1"
              >
                <Globe className="w-3 h-3" />
                {brand.website}
              </a>
            )}
            <div className="flex items-center gap-4 mt-3 text-xs text-gray-400">
              <span>{brand._count.posts} posts</span>
              <span>{brand._count.creatives} criativos</span>
              <span>{brand._count.mediaAssets} mídias</span>
              <span>{brand.socialAccounts.length} contas</span>
            </div>
          </div>

          <Link href="/brands" className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700">
            <ArrowLeft className="w-4 h-4" />
            Voltar
          </Link>
        </div>

        {/* Tabs */}
        <div className="flex gap-4 mt-5 border-t border-gray-50 pt-4">
          {(['creatives', 'info'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                'text-sm font-medium pb-1 border-b-2 transition-colors',
                tab === t ? 'border-violet-600 text-violet-700' : 'border-transparent text-gray-400 hover:text-gray-700',
              )}
            >
              {t === 'creatives' ? 'Criativos' : 'Informações'}
            </button>
          ))}
        </div>
      </div>

      {/* Tab: Criativos */}
      {tab === 'creatives' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            {/* Filtros de status */}
            <div className="flex gap-2 flex-wrap">
              {(['all', 'draft', 'pending_approval', 'approved', 'rejected'] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={cn(
                    'text-xs px-3 py-1 rounded-full font-medium transition-colors',
                    statusFilter === s
                      ? 'bg-violet-600 text-white'
                      : 'bg-white border border-gray-200 text-gray-500 hover:border-violet-300',
                  )}
                >
                  {s === 'all' ? 'Todos' : statusConfig[s]?.label ?? s}
                  {s === 'all' ? ` (${creatives.length})` : ` (${creatives.filter((c) => c.status === s).length})`}
                </button>
              ))}
            </div>

            <Link
              href={`/brands/${id}/creatives/new`}
              className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium py-2 px-4 rounded-lg transition-colors"
            >
              <PlusCircle className="w-4 h-4" />
              Novo criativo
            </Link>
          </div>

          {filteredCreatives.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-100 flex flex-col items-center justify-center py-20 text-center">
              <Layers className="w-12 h-12 text-gray-200 mb-3" />
              <p className="text-gray-500 text-sm">
                {statusFilter === 'all' ? 'Nenhum criativo ainda.' : 'Nenhum criativo com este status.'}
              </p>
              {statusFilter === 'all' && (
                <Link href={`/brands/${id}/creatives/new`} className="mt-3 text-violet-600 text-sm hover:underline">
                  Criar primeiro criativo
                </Link>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredCreatives.map((c) => (
                <CreativeCard key={c.id} creative={c} brandId={id} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab: Informações */}
      {tab === 'info' && (
        <div className="bg-white rounded-xl border border-gray-100 p-6">
          <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Pencil className="w-4 h-4" />
            Editar informações
          </h2>
          <form onSubmit={handleSaveInfo} className="space-y-4 max-w-lg">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Nome *</label>
              <input
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                required
                minLength={2}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Cor da marca</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={editForm.color}
                  onChange={(e) => setEditForm({ ...editForm, color: e.target.value })}
                  className="w-10 h-10 rounded-lg border border-gray-200 cursor-pointer"
                />
                <span className="text-sm text-gray-500">{editForm.color}</span>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Descrição</label>
              <textarea
                value={editForm.description}
                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none"
                rows={3}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Site</label>
              <input
                value={editForm.website}
                onChange={(e) => setEditForm({ ...editForm, website: e.target.value })}
                type="url"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                placeholder="https://..."
              />
            </div>
            <div className="flex gap-2 pt-1">
              <button
                type="submit"
                disabled={saving}
                className="bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium py-2 px-6 rounded-lg disabled:opacity-50"
              >
                {saving ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
