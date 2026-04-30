'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { api } from '@/lib/api'
import { Briefcase, PlusCircle, Layers, Image, FileText } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Brand {
  id: string
  name: string
  color: string | null
  description: string | null
  website: string | null
  logoUrl: string | null
  _count: { socialAccounts: number; posts: number; creatives: number }
}

function BrandAvatar({ brand }: { brand: Brand }) {
  if (brand.logoUrl) {
    return (
      <img
        src={brand.logoUrl}
        alt={brand.name}
        className="w-12 h-12 rounded-xl object-cover"
      />
    )
  }
  return (
    <div
      className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-lg flex-shrink-0"
      style={{ background: brand.color ?? '#8b5cf6' }}
    >
      {brand.name.charAt(0).toUpperCase()}
    </div>
  )
}

export default function BrandsPage() {
  const [brands, setBrands] = useState<Brand[]>([])
  const [loading, setLoading] = useState(true)
  const [showNew, setShowNew] = useState(false)
  const [form, setForm] = useState({ name: '', color: '#8b5cf6', description: '', website: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const load = async () => {
    try {
      const res = await api.get('/brands')
      setBrands(res.data)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      await api.post('/brands', {
        name: form.name,
        color: form.color,
        description: form.description || undefined,
        website: form.website || undefined,
      })
      setShowNew(false)
      setForm({ name: '', color: '#8b5cf6', description: '', website: '' })
      load()
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'Erro ao criar marca')
    } finally {
      setSaving(false)
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">{brands.length} marca{brands.length !== 1 ? 's' : ''}</p>
        <button
          onClick={() => setShowNew(true)}
          className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium py-2 px-4 rounded-lg transition-colors"
        >
          <PlusCircle className="w-4 h-4" />
          Nova marca
        </button>
      </div>

      {/* Modal nova marca */}
      {showNew && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 space-y-4">
            <h2 className="font-semibold text-gray-900 text-lg">Nova marca</h2>
            <form onSubmit={handleCreate} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Nome *</label>
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                  placeholder="Ex: Empresa ABC"
                  required
                  minLength={2}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Cor da marca</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={form.color}
                    onChange={(e) => setForm({ ...form, color: e.target.value })}
                    className="w-10 h-10 rounded-lg border border-gray-200 cursor-pointer"
                  />
                  <span className="text-sm text-gray-500">{form.color}</span>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Descrição</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none"
                  rows={2}
                  placeholder="Descreva a marca..."
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Site</label>
                <input
                  value={form.website}
                  onChange={(e) => setForm({ ...form, website: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                  placeholder="https://..."
                  type="url"
                />
              </div>

              {error && <p className="text-red-600 text-xs">{error}</p>}

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => { setShowNew(false); setError('') }}
                  className="flex-1 border border-gray-200 text-gray-700 text-sm font-medium py-2 rounded-lg hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium py-2 rounded-lg disabled:opacity-50"
                >
                  {saving ? 'Salvando...' : 'Criar marca'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Grid de marcas */}
      {brands.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 flex flex-col items-center justify-center py-20 text-center">
          <Briefcase className="w-12 h-12 text-gray-200 mb-3" />
          <p className="text-gray-500 text-sm">Nenhuma marca cadastrada.</p>
          <button
            onClick={() => setShowNew(true)}
            className="mt-3 text-violet-600 text-sm hover:underline"
          >
            Criar primeira marca
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {brands.map((brand) => (
            <Link
              key={brand.id}
              href={`/brands/${brand.id}`}
              className="bg-white rounded-xl border border-gray-100 p-5 hover:shadow-md hover:border-violet-200 transition-all group"
            >
              <div className="flex items-center gap-3 mb-4">
                <BrandAvatar brand={brand} />
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900 text-sm truncate group-hover:text-violet-700 transition-colors">
                    {brand.name}
                  </h3>
                  {brand.website && (
                    <p className="text-xs text-gray-400 truncate">{brand.website}</p>
                  )}
                </div>
                {brand.color && (
                  <div
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ background: brand.color }}
                  />
                )}
              </div>

              {brand.description && (
                <p className="text-xs text-gray-500 line-clamp-2 mb-4">{brand.description}</p>
              )}

              <div className="flex items-center gap-4 pt-3 border-t border-gray-50 text-xs text-gray-400">
                <span className="flex items-center gap-1">
                  <FileText className="w-3.5 h-3.5" />
                  {brand._count.posts} posts
                </span>
                <span className="flex items-center gap-1">
                  <Layers className="w-3.5 h-3.5" />
                  {brand._count.creatives} criativos
                </span>
                <span className="flex items-center gap-1">
                  <Image className="w-3.5 h-3.5" />
                  {brand._count.socialAccounts} contas
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
