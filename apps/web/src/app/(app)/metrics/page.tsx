'use client'

import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'
import {
  TrendingUp, Eye, Heart, MessageCircle,
  Share2, Bookmark, Play, MousePointerClick,
  ChevronDown, ChevronUp, BarChart2,
} from 'lucide-react'

// ── tipos ──────────────────────────────────────────────────────────────
interface Account {
  id: string
  platform: string
  accountName: string
  accountAvatar: string | null
  status: string
}

interface Snapshot {
  id: string
  collectedAt: string
  reach: number | null
  impressions: number | null
  likes: number | null
  comments: number | null
  shares: number | null
  saves: number | null
  views: number | null
  clicks: number | null
  engagementRate: number | null
}

interface PostMetric {
  id: string
  title: string | null
  caption: string | null
  scheduledAt: string | null
  brand: { name: string; color: string | null }
  platforms: { platform: string; status: string; publishedAt: string | null }[]
  totals: Record<string, number>
}

// ── helpers ────────────────────────────────────────────────────────────
const platformIcon: Record<string, string> = {
  instagram: '📸',
  facebook: '👥',
  tiktok: '🎵',
}

const metricCards = [
  { key: 'reach',       label: 'Alcance',      icon: Eye,             color: 'text-blue-600   bg-blue-50' },
  { key: 'impressions', label: 'Impressões',   icon: TrendingUp,      color: 'text-violet-600 bg-violet-50' },
  { key: 'likes',       label: 'Curtidas',     icon: Heart,           color: 'text-pink-600   bg-pink-50' },
  { key: 'comments',    label: 'Comentários',  icon: MessageCircle,   color: 'text-yellow-600 bg-yellow-50' },
  { key: 'shares',      label: 'Compartilh.',  icon: Share2,          color: 'text-green-600  bg-green-50' },
  { key: 'saves',       label: 'Salvamentos',  icon: Bookmark,        color: 'text-orange-600 bg-orange-50' },
  { key: 'views',       label: 'Visualizações',icon: Play,            color: 'text-cyan-600   bg-cyan-50' },
  { key: 'clicks',      label: 'Cliques',      icon: MousePointerClick,color:'text-indigo-600 bg-indigo-50' },
]

function MetricCard({
  label, value, icon: Icon, color,
}: { label: string; value: number | null; icon: any; color: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4 flex items-center gap-3">
      <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0', color)}>
        <Icon className="w-4 h-4" />
      </div>
      <div>
        <p className="text-xl font-bold text-gray-900">{value ?? '—'}</p>
        <p className="text-xs text-gray-500">{label}</p>
      </div>
    </div>
  )
}

// ── componente principal ───────────────────────────────────────────────
export default function MetricsPage() {
  const [accounts, setAccounts]       = useState<Account[]>([])
  const [selectedId, setSelectedId]   = useState<string | null>(null)
  const [snapshots, setSnapshots]     = useState<Snapshot[]>([])
  const [posts, setPosts]             = useState<PostMetric[]>([])
  const [loadingAcc, setLoadingAcc]   = useState(true)
  const [loadingSnap, setLoadingSnap] = useState(false)
  const [tab, setTab]                 = useState<'account' | 'posts'>('account')

  // carregar contas ativas
  useEffect(() => {
    api.get('/social-accounts').then((res) => {
      const active = res.data.filter((a: Account) => a.status === 'active')
      setAccounts(active)
      if (active.length > 0) setSelectedId(active[0].id)
    }).finally(() => setLoadingAcc(false))
  }, [])

  // carregar snapshots da conta selecionada
  useEffect(() => {
    if (!selectedId) return
    setLoadingSnap(true)
    api.get(`/metrics/accounts/${selectedId}`)
      .then((res) => setSnapshots(res.data.snapshots ?? []))
      .finally(() => setLoadingSnap(false))
  }, [selectedId])

  // carregar posts publicados com métricas
  useEffect(() => {
    api.get('/posts?status=published').then((res) => {
      const enriched = res.data.map((p: any) => ({
        ...p,
        totals: {},
      }))
      setPosts(enriched)
    })
  }, [])

  // somar snapshot mais recente
  const latest = snapshots[0] ?? null
  const totalEngagement =
    (latest?.likes ?? 0) +
    (latest?.comments ?? 0) +
    (latest?.shares ?? 0) +
    (latest?.saves ?? 0)

  if (loadingAcc) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-violet-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (accounts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <BarChart2 className="w-12 h-12 text-gray-200 mb-3" />
        <p className="text-gray-500 text-sm">Nenhuma conta conectada.</p>
        <a href="/settings/social-accounts" className="text-violet-600 text-sm hover:underline mt-2">
          Conectar conta
        </a>
      </div>
    )
  }

  return (
    <div className="space-y-5">

      {/* Seletor de conta */}
      <div className="flex items-center gap-2 flex-wrap">
        {accounts.map((acc) => (
          <button
            key={acc.id}
            onClick={() => setSelectedId(acc.id)}
            className={cn(
              'flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-all border',
              selectedId === acc.id
                ? 'bg-violet-600 text-white border-violet-600'
                : 'bg-white text-gray-600 border-gray-200 hover:border-violet-400',
            )}
          >
            <span>{platformIcon[acc.platform]}</span>
            <span>{acc.accountName}</span>
          </button>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        {(['account', 'posts'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              'px-4 py-1.5 rounded-lg text-sm font-medium transition-all',
              tab === t ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700',
            )}
          >
            {t === 'account' ? 'Visão geral' : 'Por post'}
          </button>
        ))}
      </div>

      {/* Tab: visão geral da conta */}
      {tab === 'account' && (
        <div className="space-y-5">
          {loadingSnap ? (
            <div className="flex items-center justify-center h-32">
              <div className="w-5 h-5 border-2 border-violet-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : latest ? (
            <>
              {/* Cards de métricas */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {metricCards.map(({ key, label, icon, color }) => (
                  <MetricCard
                    key={key}
                    label={label}
                    value={latest[key as keyof Snapshot] as number | null}
                    icon={icon}
                    color={color}
                  />
                ))}
              </div>

              {/* Engajamento total */}
              <div className="bg-white rounded-xl border border-gray-100 p-5">
                <p className="text-xs text-gray-500 mb-1">Engajamento total (último snapshot)</p>
                <p className="text-3xl font-bold text-gray-900">{totalEngagement.toLocaleString('pt-BR')}</p>
                {latest.engagementRate && (
                  <p className="text-sm text-gray-400 mt-1">
                    Taxa: {(Number(latest.engagementRate) * 100).toFixed(2)}%
                  </p>
                )}
              </div>

              {/* Histórico */}
              <div className="bg-white rounded-xl border border-gray-100">
                <div className="px-5 py-3.5 border-b border-gray-50">
                  <h3 className="text-sm font-semibold text-gray-900">Histórico de snapshots</h3>
                </div>
                <div className="divide-y divide-gray-50">
                  {snapshots.slice(0, 10).map((s) => (
                    <div key={s.id} className="flex items-center gap-4 px-5 py-3 text-sm">
                      <span className="text-gray-400 text-xs w-32 flex-shrink-0">
                        {new Date(s.collectedAt).toLocaleString('pt-BR', {
                          day: '2-digit', month: 'short',
                          hour: '2-digit', minute: '2-digit',
                        })}
                      </span>
                      <div className="flex gap-4 flex-wrap">
                        {s.reach      != null && <span className="text-gray-600">👁 {s.reach.toLocaleString()}</span>}
                        {s.likes      != null && <span className="text-gray-600">❤️ {s.likes.toLocaleString()}</span>}
                        {s.comments   != null && <span className="text-gray-600">💬 {s.comments.toLocaleString()}</span>}
                        {s.shares     != null && <span className="text-gray-600">🔁 {s.shares.toLocaleString()}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 bg-white rounded-xl border border-gray-100">
              <BarChart2 className="w-10 h-10 text-gray-200 mb-3" />
              <p className="text-gray-500 text-sm">Nenhum dado coletado ainda.</p>
              <p className="text-gray-400 text-xs mt-1">As métricas são coletadas após publicações.</p>
            </div>
          )}
        </div>
      )}

      {/* Tab: por post */}
      {tab === 'posts' && (
        <div className="bg-white rounded-xl border border-gray-100">
          {posts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <BarChart2 className="w-10 h-10 text-gray-200 mb-3" />
              <p className="text-gray-500 text-sm">Nenhum post publicado ainda.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {posts.map((post) => (
                <PostMetricRow key={post.id} post={post} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── linha de post com expand ───────────────────────────────────────────
function PostMetricRow({ post }: { post: PostMetric }) {
  const [open, setOpen]         = useState(false)
  const [data, setData]         = useState<any>(null)
  const [loading, setLoading]   = useState(false)

  const toggle = async () => {
    if (!open && !data) {
      setLoading(true)
      try {
        const res = await api.get(`/metrics/posts/${post.id}`)
        setData(res.data)
      } finally {
        setLoading(false)
      }
    }
    setOpen((v) => !v)
  }

  return (
    <div>
      <button
        onClick={toggle}
        className="w-full flex items-center gap-4 px-5 py-3.5 hover:bg-gray-50 transition-colors text-left"
      >
        <div
          className="w-2 h-2 rounded-full flex-shrink-0"
          style={{ background: post.brand.color ?? '#8b5cf6' }}
        />
        <div className="flex-1 min-w-0">
          <p className="text-sm text-gray-800 truncate">
            {post.title ?? post.caption ?? 'Post sem título'}
          </p>
          <p className="text-xs text-gray-400 mt-0.5">
            {post.brand.name}
            {post.scheduledAt && (
              <> · {new Date(post.scheduledAt).toLocaleDateString('pt-BR')}</>
            )}
          </p>
        </div>
        <div className="flex gap-1.5 mr-2">
          {post.platforms.map((p) => (
            <span key={p.platform} className="text-xs">{platformIcon[p.platform]}</span>
          ))}
        </div>
        {open
          ? <ChevronUp className="w-4 h-4 text-gray-400 flex-shrink-0" />
          : <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
        }
      </button>

      {open && (
        <div className="px-5 pb-4 bg-gray-50/50">
          {loading ? (
            <div className="flex justify-center py-4">
              <div className="w-4 h-4 border-2 border-violet-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : data ? (
            <div className="grid grid-cols-4 gap-3 pt-2">
              {metricCards.slice(0, 4).map(({ key, label, icon: Icon, color }) => (
                <div key={key} className="bg-white rounded-lg border border-gray-100 p-3 flex items-center gap-2">
                  <div className={cn('w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0', color)}>
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-900">{data.totals?.[key] ?? '—'}</p>
                    <p className="text-xs text-gray-400">{label}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-gray-400 pt-2">Nenhuma métrica disponível.</p>
          )}
        </div>
      )}
    </div>
  )
}
