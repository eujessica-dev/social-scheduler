'use client'

import { useEffect, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { api } from '@/lib/api'
import {
  ArrowLeft, Upload, X, Sparkles, Image as ImageIcon, Plus,
  Send, CheckCircle2, Clock, XCircle, Archive, Copy, Loader2,
  MessageSquare, Trash2,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface MediaAsset { id: string; filename: string; mimeType: string; url: string }
interface Comment { id: string; authorName: string; text: string; isInternal: boolean; createdAt: string }
interface Approval {
  id: string
  token: string
  clientName: string | null
  clientEmail: string | null
  expiresAt: string
  approvedAt: string | null
  rejectedAt: string | null
  feedback: string | null
  comments: Comment[]
}
interface Creative {
  id: string
  title: string | null
  caption: string | null
  hashtags: string[]
  notes: string | null
  status: string
  createdAt: string
  updatedAt: string
  media: { id: string; order: number; mediaAsset: MediaAsset }[]
  approvals: Approval[]
  brand: { id: string; name: string }
  createdBy: { id: string; name: string }
}

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
  draft:            { label: 'Rascunho',           color: 'bg-gray-100 text-gray-600',    icon: Clock },
  pending_approval: { label: 'Aguard. aprovação',  color: 'bg-yellow-100 text-yellow-700', icon: Send },
  approved:         { label: 'Aprovado',           color: 'bg-green-100 text-green-700',  icon: CheckCircle2 },
  rejected:         { label: 'Rejeitado',          color: 'bg-red-100 text-red-700',      icon: XCircle },
  archived:         { label: 'Arquivado',          color: 'bg-gray-100 text-gray-500',    icon: Archive },
}

export default function CreativeDetailPage() {
  const { id: brandId, cid } = useParams<{ id: string; cid: string }>()
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [creative, setCreative] = useState<Creative | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedMedia, setSelectedMedia] = useState<MediaAsset[]>([])
  const [libraryMedia, setLibraryMedia] = useState<MediaAsset[]>([])
  const [showLibrary, setShowLibrary] = useState(false)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [showSubmit, setShowSubmit] = useState(false)
  const [showAi, setShowAi] = useState(false)
  const [aiPrompt, setAiPrompt] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [copiedToken, setCopiedToken] = useState<string | null>(null)

  const [form, setForm] = useState({ title: '', caption: '', hashtags: '', notes: '' })
  const [submitForm, setSubmitForm] = useState({ clientName: '', clientEmail: '', expiresAt: '' })

  const load = async () => {
    try {
      const [cRes, libRes] = await Promise.all([
        api.get(`/creatives/${cid}`),
        api.get('/media', { params: { brandId } }),
      ])
      const c: Creative = cRes.data
      setCreative(c)
      setForm({
        title: c.title ?? '',
        caption: c.caption ?? '',
        hashtags: c.hashtags.join(' '),
        notes: c.notes ?? '',
      })
      setSelectedMedia(c.media.sort((a, b) => a.order - b.order).map((m) => m.mediaAsset))
      setLibraryMedia(libRes.data)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [cid])

  const editable = creative && !['approved', 'archived'].includes(creative.status)

  const handleSave = async () => {
    if (!editable) return
    setSaving(true)
    try {
      const hashtags = form.hashtags
        .split(/[\s,#]+/)
        .map((h) => h.replace(/^#/, '').trim())
        .filter(Boolean)

      await api.patch(`/creatives/${cid}`, {
        title: form.title || undefined,
        caption: form.caption || undefined,
        hashtags,
        notes: form.notes || undefined,
        mediaAssetIds: selectedMedia.map((m) => m.id),
      })
      load()
    } finally {
      setSaving(false)
    }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    if (!files.length) return
    setUploading(true)
    try {
      for (const file of files) {
        const fd = new FormData()
        fd.append('file', file)
        const res = await api.post(`/media/upload?brandId=${brandId}`, fd, {
          headers: { 'Content-Type': 'multipart/form-data' },
        })
        const asset = res.data
        setSelectedMedia((prev) => [...prev, { id: asset.id, url: asset.url, mimeType: asset.mimeType, filename: asset.filename }])
        setLibraryMedia((prev) => [asset, ...prev])
      }
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  const addFromLibrary = (asset: MediaAsset) => {
    if (selectedMedia.find((m) => m.id === asset.id)) return
    setSelectedMedia((prev) => [...prev, asset])
  }

  const removeMedia = (id: string) => setSelectedMedia((prev) => prev.filter((m) => m.id !== id))

  const handleSubmitForApproval = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const defaultExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      await api.post(`/creatives/${cid}/submit`, {
        clientName: submitForm.clientName || undefined,
        clientEmail: submitForm.clientEmail || undefined,
        expiresAt: submitForm.expiresAt || defaultExpiry,
      })
      setShowSubmit(false)
      load()
    } catch (err: any) {
      alert(err.response?.data?.message ?? 'Erro ao enviar para aprovação')
    }
  }

  const handleAiEnhance = async () => {
    if (!aiPrompt.trim()) return
    setAiLoading(true)
    try {
      const res = await api.post(`/creatives/${cid}/ai-enhance`, { prompt: aiPrompt })
      setForm((prev) => ({ ...prev, caption: res.data.caption }))
      setShowAi(false)
      setAiPrompt('')
    } finally {
      setAiLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('Excluir este criativo? Esta ação não pode ser desfeita.')) return
    setDeleting(true)
    try {
      await api.delete(`/creatives/${cid}`)
      router.push(`/brands/${brandId}`)
    } catch {
      setDeleting(false)
    }
  }

  const copyApprovalLink = (token: string) => {
    const url = `${window.location.origin}/approval/${token}`
    navigator.clipboard.writeText(url)
    setCopiedToken(token)
    setTimeout(() => setCopiedToken(null), 2000)
  }

  if (loading || !creative) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-violet-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const cfg = statusConfig[creative.status] ?? statusConfig.draft
  const StatusIcon = cfg.icon

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Link
          href={`/brands/${brandId}`}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700"
        >
          <ArrowLeft className="w-4 h-4" />
          {creative.brand.name}
        </Link>
        <div className="flex items-center gap-2">
          <span className={cn('flex items-center gap-1.5 text-xs px-3 py-1 rounded-full font-medium', cfg.color)}>
            <StatusIcon className="w-3.5 h-3.5" />
            {cfg.label}
          </span>
          {editable && (
            <button
              onClick={() => setShowSubmit(true)}
              className="flex items-center gap-1.5 text-xs bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-1.5 rounded-lg font-medium transition-colors"
            >
              <Send className="w-3.5 h-3.5" />
              Enviar para aprovação
            </button>
          )}
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="text-gray-400 hover:text-red-500 p-1.5 rounded-lg hover:bg-red-50 transition-colors"
            title="Excluir"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Submit modal */}
      {showSubmit && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 space-y-4">
            <h2 className="font-semibold text-gray-900">Enviar para aprovação</h2>
            <p className="text-sm text-gray-500">
              Será gerado um link único para o cliente revisar e aprovar o criativo.
            </p>
            <form onSubmit={handleSubmitForApproval} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Nome do cliente</label>
                <input
                  value={submitForm.clientName}
                  onChange={(e) => setSubmitForm({ ...submitForm, clientName: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                  placeholder="Ex: João Silva"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">E-mail do cliente</label>
                <input
                  type="email"
                  value={submitForm.clientEmail}
                  onChange={(e) => setSubmitForm({ ...submitForm, clientEmail: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                  placeholder="cliente@email.com"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Expirar em</label>
                <input
                  type="datetime-local"
                  value={submitForm.expiresAt}
                  onChange={(e) => setSubmitForm({ ...submitForm, expiresAt: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
                <p className="text-xs text-gray-400 mt-1">Padrão: 7 dias</p>
              </div>
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowSubmit(false)}
                  className="flex-1 border border-gray-200 text-gray-700 text-sm py-2 rounded-lg hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-yellow-500 hover:bg-yellow-600 text-white text-sm font-medium py-2 rounded-lg"
                >
                  Gerar link
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Approval links history */}
      {creative.approvals.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 p-5 space-y-3">
          <h2 className="font-semibold text-gray-900 text-sm flex items-center gap-2">
            <MessageSquare className="w-4 h-4" />
            Links de aprovação ({creative.approvals.length})
          </h2>
          {creative.approvals.map((approval) => {
            const expired = new Date() > new Date(approval.expiresAt)
            const status = approval.approvedAt ? 'aprovado' : approval.rejectedAt ? 'rejeitado' : expired ? 'expirado' : 'aguardando'
            const statusColor = {
              aprovado: 'text-green-600', rejeitado: 'text-red-600',
              expirado: 'text-gray-400', aguardando: 'text-yellow-600',
            }[status]
            const approvalUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/approval/${approval.token}`

            return (
              <div key={approval.id} className="border border-gray-100 rounded-xl p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    {approval.clientName && <p className="text-sm font-medium text-gray-800">{approval.clientName}</p>}
                    {approval.clientEmail && <p className="text-xs text-gray-400">{approval.clientEmail}</p>}
                    <p className={cn('text-xs font-medium mt-0.5 capitalize', statusColor)}>{status}</p>
                  </div>
                  <button
                    onClick={() => copyApprovalLink(approval.token)}
                    className="flex items-center gap-1.5 text-xs text-violet-600 border border-violet-200 px-2.5 py-1.5 rounded-lg hover:bg-violet-50 transition-colors"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    {copiedToken === approval.token ? 'Copiado!' : 'Copiar link'}
                  </button>
                </div>

                {approval.feedback && (
                  <p className="text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2 italic">
                    "{approval.feedback}"
                  </p>
                )}

                {approval.comments.length > 0 && (
                  <div className="space-y-1.5 pt-1">
                    <p className="text-xs text-gray-400 font-medium">Comentários ({approval.comments.length})</p>
                    {approval.comments.map((c) => (
                      <div key={c.id} className={cn('rounded-lg px-3 py-2 text-xs', c.isInternal ? 'bg-yellow-50 border border-yellow-100' : 'bg-gray-50')}>
                        <span className="font-medium text-gray-700">{c.authorName}: </span>
                        <span className="text-gray-600">{c.text}</span>
                        {c.isInternal && <span className="ml-1 text-yellow-600 font-medium">(interno)</span>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Mídia */}
      <div className="bg-white rounded-xl border border-gray-100 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">Mídia</h2>
          {editable && (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowLibrary(!showLibrary)}
                className="flex items-center gap-1.5 text-xs text-gray-600 border border-gray-200 px-3 py-1.5 rounded-lg hover:border-violet-300"
              >
                <ImageIcon className="w-3.5 h-3.5" />
                Biblioteca
              </button>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="flex items-center gap-1.5 text-xs text-white bg-violet-600 hover:bg-violet-700 px-3 py-1.5 rounded-lg disabled:opacity-50"
              >
                {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                Upload
              </button>
              <input ref={fileInputRef} type="file" multiple accept="image/*,video/*" className="hidden" onChange={handleFileUpload} />
            </div>
          )}
        </div>

        {selectedMedia.length > 0 ? (
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
            {selectedMedia.map((m) => (
              <div key={m.id} className="relative group rounded-lg overflow-hidden bg-gray-50 aspect-square">
                {m.mimeType.startsWith('video') ? (
                  <video src={m.url} className="w-full h-full object-cover" muted />
                ) : (
                  <img src={m.url} alt={m.filename} className="w-full h-full object-cover" />
                )}
                {editable && (
                  <button
                    type="button"
                    onClick={() => removeMedia(m.id)}
                    className="absolute top-1 right-1 bg-black/60 rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="w-3 h-3 text-white" />
                  </button>
                )}
              </div>
            ))}
            {editable && (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="aspect-square rounded-lg border-2 border-dashed border-gray-200 flex items-center justify-center hover:border-violet-400 transition-colors"
              >
                <Plus className="w-5 h-5 text-gray-300" />
              </button>
            )}
          </div>
        ) : (
          editable ? (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-gray-200 rounded-xl p-8 flex flex-col items-center justify-center text-center cursor-pointer hover:border-violet-400 hover:bg-violet-50/30 transition-colors"
            >
              <Upload className="w-8 h-8 text-gray-300 mb-2" />
              <p className="text-sm text-gray-500">Adicionar mídia</p>
            </div>
          ) : (
            <p className="text-sm text-gray-400 text-center py-6">Nenhuma mídia</p>
          )
        )}

        {showLibrary && editable && (
          <div className="border border-gray-100 rounded-xl p-4 bg-gray-50">
            <p className="text-xs font-medium text-gray-600 mb-3">Selecionar da biblioteca</p>
            <div className="grid grid-cols-5 sm:grid-cols-7 gap-2 max-h-48 overflow-y-auto">
              {libraryMedia.map((asset) => {
                const selected = selectedMedia.some((m) => m.id === asset.id)
                return (
                  <button
                    key={asset.id}
                    type="button"
                    onClick={() => addFromLibrary(asset)}
                    className={cn(
                      'relative aspect-square rounded-lg overflow-hidden transition-all',
                      selected ? 'ring-2 ring-violet-600 opacity-70' : 'hover:ring-2 hover:ring-violet-400',
                    )}
                  >
                    {asset.mimeType.startsWith('video') ? (
                      <video src={asset.url} className="w-full h-full object-cover" muted />
                    ) : (
                      <img src={asset.url} alt={asset.filename} className="w-full h-full object-cover" />
                    )}
                    {selected && (
                      <div className="absolute inset-0 bg-violet-600/20 flex items-center justify-center">
                        <div className="w-4 h-4 rounded-full bg-violet-600 flex items-center justify-center">
                          <span className="text-white text-[10px]">✓</span>
                        </div>
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* Copy */}
      <div className="bg-white rounded-xl border border-gray-100 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">Copy</h2>
          {editable && (
            <button
              type="button"
              onClick={() => setShowAi(!showAi)}
              className="flex items-center gap-1.5 text-xs text-violet-700 border border-violet-200 bg-violet-50 px-3 py-1.5 rounded-lg hover:bg-violet-100"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Melhorar com IA
            </button>
          )}
        </div>

        {showAi && editable && (
          <div className="bg-violet-50 rounded-xl p-4 space-y-3 border border-violet-100">
            <p className="text-xs font-medium text-violet-800">
              <Sparkles className="inline w-3.5 h-3.5 mr-1" />
              Assistente de copy (IA)
            </p>
            <textarea
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              className="w-full bg-white border border-violet-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none"
              rows={2}
              placeholder="Ex: Deixe mais chamativo e use tom descontraído..."
            />
            <div className="flex gap-2">
              <button type="button" onClick={() => { setShowAi(false); setAiPrompt('') }} className="text-xs text-violet-600 hover:underline">Cancelar</button>
              <button
                type="button"
                onClick={handleAiEnhance}
                disabled={aiLoading || !aiPrompt.trim()}
                className="flex items-center gap-1.5 text-xs bg-violet-600 text-white px-3 py-1.5 rounded-lg disabled:opacity-50"
              >
                {aiLoading && <Loader2 className="w-3 h-3 animate-spin" />}
                Gerar
              </button>
            </div>
          </div>
        )}

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Título</label>
          <input
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            disabled={!editable}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 disabled:bg-gray-50 disabled:text-gray-500"
            placeholder="Título do criativo"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Legenda / Caption</label>
          <textarea
            value={form.caption}
            onChange={(e) => setForm({ ...form, caption: e.target.value })}
            disabled={!editable}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none disabled:bg-gray-50 disabled:text-gray-500"
            rows={5}
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Hashtags</label>
          <input
            value={form.hashtags}
            onChange={(e) => setForm({ ...form, hashtags: e.target.value })}
            disabled={!editable}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 disabled:bg-gray-50"
            placeholder="#marketing #minhaMarca"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Notas internas</label>
          <textarea
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            disabled={!editable}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none disabled:bg-gray-50"
            rows={2}
          />
        </div>
      </div>

      {/* Actions */}
      {editable && (
        <div className="flex gap-3">
          <Link
            href={`/brands/${brandId}`}
            className="flex-1 border border-gray-200 text-gray-700 text-sm font-medium py-2.5 rounded-xl text-center hover:bg-gray-50"
          >
            Cancelar
          </Link>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium py-2.5 rounded-xl disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            Salvar alterações
          </button>
        </div>
      )}
    </div>
  )
}
