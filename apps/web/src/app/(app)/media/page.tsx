'use client'

import { useEffect, useRef, useState } from 'react'
import { api } from '@/lib/api'
import { toast } from 'sonner'
import { Upload, Trash2, Image as ImageIcon, Film, Loader2 } from 'lucide-react'
import { cn, formatBytes } from '@/lib/utils'

interface MediaAsset {
  id: string
  filename: string
  mimeType: string
  sizeBytes: number
  width: number | null
  height: number | null
  durationSeconds: number | null
  url: string
  createdAt: string
}

export default function MediaPage() {
  const [assets, setAssets]       = useState<MediaAsset[]>([])
  const [loading, setLoading]     = useState(true)
  const [uploading, setUploading] = useState(false)
  const [selected, setSelected]   = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const load = async () => {
    try {
      const res = await api.get('/media')
      setAssets(res.data)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const form = new FormData()
    form.append('file', file)

    setUploading(true)
    try {
      await api.post('/media/upload', form, { headers: { 'Content-Type': 'multipart/form-data' } })
      toast.success('Arquivo enviado com sucesso!')
      await load()
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? 'Erro no upload')
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Remover este arquivo da biblioteca?')) return
    try {
      await api.delete(`/media/${id}`)
      setAssets((prev) => prev.filter((a) => a.id !== id))
      if (selected === id) setSelected(null)
      toast.success('Arquivo removido')
    } catch {
      toast.error('Erro ao remover arquivo')
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
    <div className="space-y-4">
      {/* Barra de ações */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">{assets.length} arquivo{assets.length !== 1 ? 's' : ''}</p>
        <button
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 disabled:opacity-60 text-white text-sm font-medium py-2 px-4 rounded-lg transition-colors"
        >
          {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
          {uploading ? 'Enviando...' : 'Upload'}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*,video/*"
          className="hidden"
          onChange={handleUpload}
        />
      </div>

      {assets.length === 0 ? (
        <div
          onClick={() => fileRef.current?.click()}
          className="border-2 border-dashed border-gray-200 rounded-xl flex flex-col items-center justify-center py-20 cursor-pointer hover:border-violet-400 hover:bg-violet-50/30 transition-all"
        >
          <Upload className="w-10 h-10 text-gray-300 mb-3" />
          <p className="text-gray-500 text-sm font-medium">Clique para enviar arquivos</p>
          <p className="text-gray-400 text-xs mt-1">Imagens e vídeos até 1GB</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {assets.map((asset) => {
            const isVideo = asset.mimeType.startsWith('video/')
            const isActive = selected === asset.id

            return (
              <div
                key={asset.id}
                onClick={() => setSelected(isActive ? null : asset.id)}
                className={cn(
                  'group relative rounded-xl overflow-hidden border-2 cursor-pointer transition-all bg-gray-50',
                  isActive ? 'border-violet-600' : 'border-transparent hover:border-gray-200',
                )}
              >
                {/* Thumbnail */}
                <div className="aspect-square">
                  {isVideo ? (
                    <div className="w-full h-full flex items-center justify-center bg-gray-100">
                      <Film className="w-8 h-8 text-gray-400" />
                    </div>
                  ) : (
                    <img
                      src={asset.url}
                      alt={asset.filename}
                      className="w-full h-full object-cover"
                    />
                  )}
                </div>

                {/* Overlay com info */}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-end">
                  <div className="w-full p-2 translate-y-full group-hover:translate-y-0 transition-transform">
                    <p className="text-white text-xs font-medium truncate">{asset.filename}</p>
                    <p className="text-white/70 text-xs">{formatBytes(Number(asset.sizeBytes))}</p>
                  </div>
                </div>

                {/* Botão delete */}
                <button
                  onClick={(e) => { e.stopPropagation(); handleDelete(asset.id) }}
                  className="absolute top-2 right-2 w-7 h-7 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>

                {/* Badge tipo */}
                <div className="absolute top-2 left-2">
                  {isVideo
                    ? <Film className="w-4 h-4 text-white drop-shadow" />
                    : <ImageIcon className="w-4 h-4 text-white drop-shadow" />
                  }
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
