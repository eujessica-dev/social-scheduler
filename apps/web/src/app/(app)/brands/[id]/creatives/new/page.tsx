'use client'

import { useEffect, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { api } from '@/lib/api'
import {
  ArrowLeft, Upload, X, Sparkles, Image as ImageIcon, Plus,
  GripVertical, Loader2,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface MediaAsset {
  id: string
  filename: string
  mimeType: string
  url: string
}

interface SelectedMedia {
  id: string
  url: string
  mimeType: string
  filename: string
}

export default function NewCreativePage() {
  const { id: brandId } = useParams<{ id: string }>()
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [form, setForm] = useState({
    title: '',
    caption: '',
    hashtags: '',
    notes: '',
  })
  const [selectedMedia, setSelectedMedia] = useState<SelectedMedia[]>([])
  const [libraryMedia, setLibraryMedia] = useState<MediaAsset[]>([])
  const [showLibrary, setShowLibrary] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiPrompt, setAiPrompt] = useState('')
  const [showAi, setShowAi] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    api.get('/media', { params: { brandId } }).then((res) => setLibraryMedia(res.data))
  }, [brandId])

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
        setSelectedMedia((prev) => [
          ...prev,
          { id: asset.id, url: asset.url, mimeType: asset.mimeType, filename: asset.filename },
        ])
        setLibraryMedia((prev) => [asset, ...prev])
      }
    } catch {
      setError('Falha ao fazer upload do arquivo')
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  const addFromLibrary = (asset: MediaAsset) => {
    if (selectedMedia.find((m) => m.id === asset.id)) return
    setSelectedMedia((prev) => [...prev, { id: asset.id, url: asset.url, mimeType: asset.mimeType, filename: asset.filename }])
  }

  const removeMedia = (id: string) => {
    setSelectedMedia((prev) => prev.filter((m) => m.id !== id))
  }

  const handleAiEnhance = async () => {
    if (!aiPrompt.trim()) return
    setAiLoading(true)
    try {
      // Need to save first if no id, or just call enhance on fresh caption
      const res = await api.post(`/creatives/temp/ai-enhance`, { prompt: aiPrompt })
        .catch(() => ({ data: { caption: '' } }))
      // Stub: just prepend the prompt as enhancement indicator
      setForm((prev) => ({
        ...prev,
        caption: `${prev.caption}\n\n✨ ${aiPrompt}`,
      }))
      setShowAi(false)
      setAiPrompt('')
    } finally {
      setAiLoading(false)
    }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      const hashtags = form.hashtags
        .split(/[\s,#]+/)
        .map((h) => h.replace(/^#/, '').trim())
        .filter(Boolean)

      const res = await api.post(`/brands/${brandId}/creatives`, {
        title: form.title || undefined,
        caption: form.caption || undefined,
        hashtags,
        notes: form.notes || undefined,
        mediaAssetIds: selectedMedia.map((m) => m.id),
      })

      router.push(`/brands/${brandId}/creatives/${res.data.id}`)
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'Erro ao criar criativo')
      setSaving(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Back */}
      <Link
        href={`/brands/${brandId}`}
        className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700"
      >
        <ArrowLeft className="w-4 h-4" />
        Voltar para a marca
      </Link>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Mídia */}
        <div className="bg-white rounded-xl border border-gray-100 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">Mídia</h2>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowLibrary(!showLibrary)}
                className="flex items-center gap-1.5 text-xs text-gray-600 border border-gray-200 px-3 py-1.5 rounded-lg hover:border-violet-300 hover:text-violet-700 transition-colors"
              >
                <ImageIcon className="w-3.5 h-3.5" />
                Biblioteca
              </button>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="flex items-center gap-1.5 text-xs text-white bg-violet-600 hover:bg-violet-700 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
              >
                {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                Upload
              </button>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*,video/*"
                className="hidden"
                onChange={handleFileUpload}
              />
            </div>
          </div>

          {/* Selected media grid */}
          {selectedMedia.length > 0 ? (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
              {selectedMedia.map((m) => (
                <div key={m.id} className="relative group rounded-lg overflow-hidden bg-gray-50 aspect-square">
                  {m.mimeType.startsWith('video') ? (
                    <video src={m.url} className="w-full h-full object-cover" muted />
                  ) : (
                    <img src={m.url} alt={m.filename} className="w-full h-full object-cover" />
                  )}
                  <button
                    type="button"
                    onClick={() => removeMedia(m.id)}
                    className="absolute top-1 right-1 bg-black/60 rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="w-3 h-3 text-white" />
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="aspect-square rounded-lg border-2 border-dashed border-gray-200 flex items-center justify-center hover:border-violet-400 transition-colors"
              >
                <Plus className="w-5 h-5 text-gray-300" />
              </button>
            </div>
          ) : (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-gray-200 rounded-xl p-8 flex flex-col items-center justify-center text-center cursor-pointer hover:border-violet-400 hover:bg-violet-50/30 transition-colors"
            >
              <Upload className="w-8 h-8 text-gray-300 mb-2" />
              <p className="text-sm text-gray-500">Clique para fazer upload ou arraste arquivos</p>
              <p className="text-xs text-gray-400 mt-1">Imagens e vídeos suportados</p>
            </div>
          )}

          {/* Library picker */}
          {showLibrary && (
            <div className="border border-gray-100 rounded-xl p-4 bg-gray-50">
              <p className="text-xs font-medium text-gray-600 mb-3">Selecionar da biblioteca</p>
              {libraryMedia.length === 0 ? (
                <p className="text-xs text-gray-400">Nenhuma mídia na biblioteca.</p>
              ) : (
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
              )}
            </div>
          )}
        </div>

        {/* Copy */}
        <div className="bg-white rounded-xl border border-gray-100 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">Copy</h2>
            <button
              type="button"
              onClick={() => setShowAi(!showAi)}
              className="flex items-center gap-1.5 text-xs text-violet-700 border border-violet-200 bg-violet-50 px-3 py-1.5 rounded-lg hover:bg-violet-100 transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Melhorar com IA
            </button>
          </div>

          {/* AI panel */}
          {showAi && (
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
                placeholder="Ex: Crie um texto chamativo para Instagram sobre promoção de verão..."
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => { setShowAi(false); setAiPrompt('') }}
                  className="text-xs text-violet-600 hover:underline"
                >
                  Cancelar
                </button>
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
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
              placeholder="Título do criativo"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Legenda / Caption</label>
            <textarea
              value={form.caption}
              onChange={(e) => setForm({ ...form, caption: e.target.value })}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none"
              rows={5}
              placeholder="Escreva a legenda aqui..."
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Hashtags</label>
            <input
              value={form.hashtags}
              onChange={(e) => setForm({ ...form, hashtags: e.target.value })}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
              placeholder="#marketing #minhaMarca #promoção"
            />
            <p className="text-xs text-gray-400 mt-1">Separe com espaços ou vírgulas</p>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Notas internas</label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none"
              rows={2}
              placeholder="Observações que só você vê..."
            />
          </div>
        </div>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 px-4 py-2 rounded-lg">{error}</p>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <Link
            href={`/brands/${brandId}`}
            className="flex-1 border border-gray-200 text-gray-700 text-sm font-medium py-2.5 rounded-xl text-center hover:bg-gray-50"
          >
            Cancelar
          </Link>
          <button
            type="submit"
            disabled={saving}
            className="flex-1 bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium py-2.5 rounded-xl disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            Salvar criativo
          </button>
        </div>
      </form>
    </div>
  )
}
