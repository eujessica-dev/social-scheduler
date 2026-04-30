'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { api } from '@/lib/api'
import {
  CalendarClock, CheckCircle2, XCircle,
  Clock, Share2, PlusCircle, TrendingUp,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface Stats {
  scheduled: number
  published: number
  failed: number
  draft: number
  connectedAccounts: number
}

interface RecentPost {
  id: string
  title: string | null
  caption: string | null
  status: string
  scheduledAt: string | null
  platforms: { platform: string; status: string }[]
  brand: { name: string; color: string | null }
}

const statusConfig: Record<string, { label: string; color: string }> = {
  scheduled:  { label: 'Agendado',   color: 'bg-blue-100 text-blue-700' },
  published:  { label: 'Publicado',  color: 'bg-green-100 text-green-700' },
  failed:     { label: 'Falhou',     color: 'bg-red-100 text-red-700' },
  draft:      { label: 'Rascunho',   color: 'bg-gray-100 text-gray-600' },
  publishing: { label: 'Publicando', color: 'bg-yellow-100 text-yellow-700' },
  cancelled:  { label: 'Cancelado',  color: 'bg-gray-100 text-gray-500' },
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [posts, setPosts] = useState<RecentPost[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const [postsRes, accountsRes] = await Promise.all([
          api.get('/posts'),
          api.get('/social-accounts'),
        ])

        const allPosts: RecentPost[] = postsRes.data
        setStats({
          scheduled:        allPosts.filter((p) => p.status === 'scheduled').length,
          published:        allPosts.filter((p) => p.status === 'published').length,
          failed:           allPosts.filter((p) => p.status === 'failed').length,
          draft:            allPosts.filter((p) => p.status === 'draft').length,
          connectedAccounts: accountsRes.data.filter((a: any) => a.status === 'active').length,
        })

        setPosts(allPosts.slice(0, 8))
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-violet-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Cards de métricas */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          { label: 'Agendados',   value: stats?.scheduled,        icon: CalendarClock, color: 'text-blue-600 bg-blue-50' },
          { label: 'Publicados',  value: stats?.published,        icon: CheckCircle2,  color: 'text-green-600 bg-green-50' },
          { label: 'Falhas',      value: stats?.failed,           icon: XCircle,       color: 'text-red-600 bg-red-50' },
          { label: 'Rascunhos',   value: stats?.draft,            icon: Clock,         color: 'text-gray-500 bg-gray-50' },
          { label: 'Contas ativas', value: stats?.connectedAccounts, icon: Share2,     color: 'text-violet-600 bg-violet-50' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-white rounded-xl border border-gray-100 p-4 flex items-center gap-3">
            <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0', color)}>
              <Icon className="w-5 h-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{value ?? 0}</p>
              <p className="text-xs text-gray-500">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Posts recentes */}
      <div className="bg-white rounded-xl border border-gray-100">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50">
          <h2 className="font-semibold text-gray-900 text-sm">Posts recentes</h2>
          <Link
            href="/posts/new"
            className="flex items-center gap-1.5 text-violet-600 hover:text-violet-700 text-xs font-medium"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            Novo post
          </Link>
        </div>

        {posts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <TrendingUp className="w-10 h-10 text-gray-200 mb-3" />
            <p className="text-gray-500 text-sm">Nenhum post ainda.</p>
            <Link href="/posts/new" className="mt-3 text-violet-600 text-sm hover:underline">
              Criar primeiro post
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {posts.map((post) => {
              const cfg = statusConfig[post.status] ?? statusConfig.draft
              const date = post.scheduledAt
                ? new Date(post.scheduledAt).toLocaleString('pt-BR', {
                    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
                  })
                : '—'

              return (
                <div key={post.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-gray-50 transition-colors">
                  <div
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ background: post.brand.color ?? '#8b5cf6' }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-800 truncate">
                      {post.title ?? post.caption ?? 'Sem título'}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">{post.brand.name} · {date}</p>
                  </div>
                  <div className="flex gap-1.5">
                    {post.platforms.map((p) => (
                      <span key={p.platform} className="text-xs text-gray-400 capitalize">{p.platform}</span>
                    ))}
                  </div>
                  <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', cfg.color)}>
                    {cfg.label}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
