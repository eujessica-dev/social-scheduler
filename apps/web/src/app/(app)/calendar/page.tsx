'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { api } from '@/lib/api'
import {
  ChevronLeft, ChevronRight, PlusCircle, X,
  Calendar, Clock, Tag, AlignLeft, Pencil,
  CheckCircle2, XCircle, Send, Loader2, Image as ImageIcon, Film,
  MapPin, Hash,
} from 'lucide-react'
import { cn } from '@/lib/utils'

// ─── Types ───────────────────────────────────────────────────────────────────

interface MediaAsset { id: string; mimeType: string; url: string; storageKey: string }
interface Post {
  id: string
  title: string | null
  caption: string | null
  hashtags: string[]
  notes: string | null
  status: string
  scheduledAt: string | null
  timezone: string
  brand: { id: string; name: string; color: string | null }
  platforms: { platform: string; status: string; publishedAt: string | null }[]
  media: { id: string; order: number; mediaAsset: MediaAsset }[]
  createdBy: { name: string }
}

// ─── Constants ───────────────────────────────────────────────────────────────

const STATUS: Record<string, { label: string; dot: string; badge: string }> = {
  draft:            { label: 'Rascunho',          dot: 'bg-gray-400',   badge: 'bg-gray-100 text-gray-600' },
  scheduled:        { label: 'Agendado',          dot: 'bg-blue-500',   badge: 'bg-blue-100 text-blue-700' },
  published:        { label: 'Publicado',         dot: 'bg-green-500',  badge: 'bg-green-100 text-green-700' },
  failed:           { label: 'Falhou',            dot: 'bg-red-500',    badge: 'bg-red-100 text-red-700' },
  publishing:       { label: 'Publicando',        dot: 'bg-yellow-500', badge: 'bg-yellow-100 text-yellow-700' },
  cancelled:        { label: 'Cancelado',         dot: 'bg-gray-300',   badge: 'bg-gray-100 text-gray-400' },
  pending_approval: { label: 'Aguard. aprovação', dot: 'bg-orange-400', badge: 'bg-orange-100 text-orange-700' },
  approved:         { label: 'Aprovado',          dot: 'bg-teal-500',   badge: 'bg-teal-100 text-teal-700' },
}

const PLATFORM_ICON: Record<string, string> = {
  instagram: '📸',
  facebook: '👥',
  tiktok: '🎵',
}

const PLATFORM_STATUS: Record<string, { label: string; color: string }> = {
  pending:    { label: 'Pendente',    color: 'text-gray-400' },
  publishing: { label: 'Publicando', color: 'text-yellow-600' },
  published:  { label: 'Publicado',  color: 'text-green-600' },
  failed:     { label: 'Falhou',     color: 'text-red-500' },
}

// ─── Post thumbnail chip (shown inside calendar cell) ────────────────────────

function PostChip({ post, onClick }: { post: Post; onClick: () => void }) {
  const thumb = post.media[0]?.mediaAsset
  const st = STATUS[post.status] ?? STATUS.draft
  const isVideo = thumb?.mimeType.startsWith('video')

  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-center gap-1.5 group rounded-lg overflow-hidden hover:ring-1 hover:ring-violet-400 transition-all"
    >
      {/* Thumbnail */}
      <div className="w-7 h-7 flex-shrink-0 rounded-md overflow-hidden bg-gray-100 relative">
        {thumb ? (
          isVideo ? (
            <div className="w-full h-full bg-gray-900 flex items-center justify-center">
              <Film className="w-3 h-3 text-gray-400" />
            </div>
          ) : (
            <img src={thumb.url} alt="" className="w-full h-full object-cover" />
          )
        ) : (
          <div
            className="w-full h-full flex items-center justify-center"
            style={{ background: post.brand.color ?? '#8b5cf6' }}
          >
            <span className="text-white text-[8px] font-bold">
              {post.brand.name.charAt(0).toUpperCase()}
            </span>
          </div>
        )}
        {/* Status dot overlay */}
        <span className={cn('absolute bottom-0 right-0 w-2 h-2 rounded-full border border-white', st.dot)} />
      </div>

      {/* Label */}
      <span className="text-[11px] text-gray-700 group-hover:text-violet-700 truncate leading-tight text-left">
        {post.title ?? post.caption ?? 'Post'}
      </span>
    </button>
  )
}

// ─── Post detail modal ────────────────────────────────────────────────────────

function PostModal({ post, onClose }: { post: Post; onClose: () => void }) {
  const [activeMedia, setActiveMedia] = useState(0)
  const [cancelling, setCancelling] = useState(false)
  const st = STATUS[post.status] ?? STATUS.draft
  const media = post.media.sort((a, b) => a.order - b.order)
  const current = media[activeMedia]?.mediaAsset

  const scheduledDate = post.scheduledAt
    ? new Date(post.scheduledAt).toLocaleString('pt-BR', {
        weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
      })
    : null

  const handleCancel = async () => {
    if (!confirm('Cancelar o agendamento deste post?')) return
    setCancelling(true)
    try {
      await api.patch(`/posts/${post.id}/cancel`)
      onClose()
      window.location.reload()
    } catch { setCancelling(false) }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">

        {/* ── Header ───────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2.5">
            <div
              className="w-3 h-3 rounded-full flex-shrink-0"
              style={{ background: post.brand.color ?? '#8b5cf6' }}
            />
            <span className="text-sm font-semibold text-gray-900">{post.brand.name}</span>
            <span className={cn('text-xs px-2.5 py-0.5 rounded-full font-medium', st.badge)}>
              {st.label}
            </span>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-700 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ── Scrollable body ───────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto">

          {/* Media */}
          {media.length > 0 && (
            <div className="bg-gray-950">
              <div className="flex items-center justify-center min-h-[220px] max-h-[320px]">
                {current?.mimeType.startsWith('video') ? (
                  <video src={current.url} controls className="max-w-full max-h-[320px]" />
                ) : (
                  <img src={current?.url} alt="" className="max-w-full max-h-[320px] object-contain" />
                )}
              </div>
              {media.length > 1 && (
                <div className="flex gap-1.5 px-3 py-2 overflow-x-auto">
                  {media.map((m, i) => (
                    <button
                      key={m.id}
                      onClick={() => setActiveMedia(i)}
                      className={cn(
                        'flex-shrink-0 w-12 h-12 rounded-lg overflow-hidden transition-all',
                        activeMedia === i ? 'ring-2 ring-violet-500' : 'opacity-50 hover:opacity-80',
                      )}
                    >
                      {m.mediaAsset.mimeType.startsWith('video') ? (
                        <div className="w-full h-full bg-gray-800 flex items-center justify-center">
                          <Film className="w-4 h-4 text-gray-400" />
                        </div>
                      ) : (
                        <img src={m.mediaAsset.url} alt="" className="w-full h-full object-cover" />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* No media placeholder */}
          {media.length === 0 && (
            <div className="bg-gray-50 h-28 flex items-center justify-center">
              <div className="flex flex-col items-center gap-1 text-gray-300">
                <ImageIcon className="w-8 h-8" />
                <span className="text-xs">Sem mídia</span>
              </div>
            </div>
          )}

          {/* Content */}
          <div className="p-5 space-y-4">

            {/* Title */}
            {post.title && (
              <h2 className="font-semibold text-gray-900 text-base">{post.title}</h2>
            )}

            {/* Caption */}
            {post.caption && (
              <div className="space-y-1.5">
                <p className="flex items-center gap-1.5 text-xs font-medium text-gray-400 uppercase tracking-wide">
                  <AlignLeft className="w-3.5 h-3.5" />
                  Legenda
                </p>
                <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                  {post.caption}
                </p>
              </div>
            )}

            {/* Hashtags */}
            {post.hashtags?.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {post.hashtags.map((h) => (
                  <span
                    key={h}
                    className="text-xs bg-violet-50 text-violet-600 px-2 py-0.5 rounded-md font-medium"
                  >
                    #{h}
                  </span>
                ))}
              </div>
            )}

            {/* Schedule & Platforms row */}
            <div className="grid grid-cols-2 gap-3">

              {/* Schedule */}
              {scheduledDate && (
                <div className="bg-gray-50 rounded-xl p-3 space-y-1">
                  <p className="flex items-center gap-1.5 text-xs font-medium text-gray-400 uppercase tracking-wide">
                    <Calendar className="w-3.5 h-3.5" />
                    Agendado para
                  </p>
                  <p className="text-sm text-gray-800 font-medium capitalize leading-snug">
                    {scheduledDate}
                  </p>
                  <p className="text-xs text-gray-400 flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {post.timezone}
                  </p>
                </div>
              )}

              {/* Platforms */}
              <div className="bg-gray-50 rounded-xl p-3 space-y-1.5">
                <p className="flex items-center gap-1.5 text-xs font-medium text-gray-400 uppercase tracking-wide">
                  <Send className="w-3.5 h-3.5" />
                  Publicar em
                </p>
                {post.platforms.map((pl) => {
                  const plSt = PLATFORM_STATUS[pl.status] ?? PLATFORM_STATUS.pending
                  return (
                    <div key={pl.platform} className="flex items-center gap-1.5">
                      <span className="text-base leading-none">{PLATFORM_ICON[pl.platform]}</span>
                      <span className="text-xs text-gray-700 capitalize">{pl.platform}</span>
                      <span className={cn('text-[11px] ml-auto font-medium', plSt.color)}>
                        {plSt.label}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Notes */}
            {post.notes && (
              <div className="bg-yellow-50 border border-yellow-100 rounded-xl p-3 space-y-1">
                <p className="text-xs font-medium text-yellow-700 uppercase tracking-wide">Notas internas</p>
                <p className="text-sm text-yellow-800">{post.notes}</p>
              </div>
            )}

            {/* Created by */}
            <p className="text-xs text-gray-400">
              Criado por <span className="font-medium text-gray-600">{post.createdBy.name}</span>
            </p>
          </div>
        </div>

        {/* ── Footer actions ────────────────────────────────────────────── */}
        <div className="px-5 py-3 border-t border-gray-100 flex gap-2">
          {['scheduled', 'draft', 'approved'].includes(post.status) && (
            <button
              onClick={handleCancel}
              disabled={cancelling}
              className="flex items-center gap-1.5 text-xs text-red-500 hover:text-red-700 border border-red-200 hover:border-red-300 px-3 py-2 rounded-lg transition-colors disabled:opacity-50"
            >
              {cancelling ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <XCircle className="w-3.5 h-3.5" />}
              Cancelar post
            </button>
          )}
          <Link
            href={`/posts/${post.id}`}
            onClick={onClose}
            className="flex items-center gap-1.5 text-xs text-violet-700 border border-violet-200 bg-violet-50 hover:bg-violet-100 px-3 py-2 rounded-lg transition-colors ml-auto"
          >
            <Pencil className="w-3.5 h-3.5" />
            Editar post
          </Link>
        </div>
      </div>
    </div>
  )
}

// ─── Calendar page ────────────────────────────────────────────────────────────

export default function CalendarPage() {
  const [posts, setPosts]         = useState<Post[]>([])
  const [loading, setLoading]     = useState(true)
  const [date, setDate]           = useState(new Date())
  const [selected, setSelected]   = useState<Post | null>(null)

  const year  = date.getFullYear()
  const month = date.getMonth()

  const firstDay    = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const cells = Array.from({ length: firstDay + daysInMonth }, (_, i) =>
    i < firstDay ? null : i - firstDay + 1,
  )
  // pad to full weeks
  while (cells.length % 7 !== 0) cells.push(null)

  useEffect(() => {
    api.get('/posts').then((res) => setPosts(res.data)).catch(() => {}).finally(() => setLoading(false))
  }, [])

  const postsByDay = (day: number): Post[] =>
    posts.filter((p) => {
      if (!p.scheduledAt) return false
      const d = new Date(p.scheduledAt)
      return d.getFullYear() === year && d.getMonth() === month && d.getDate() === day
    })

  const monthName = date.toLocaleString('pt-BR', { month: 'long', year: 'numeric' })
  const today = new Date()

  const prev = () => setDate(new Date(year, month - 1, 1))
  const next = () => setDate(new Date(year, month + 1, 1))

  // count posts in current view
  const monthPosts = posts.filter((p) => {
    if (!p.scheduledAt) return false
    const d = new Date(p.scheduledAt)
    return d.getFullYear() === year && d.getMonth() === month
  })

  return (
    <div className="space-y-4">

      {/* ── Header ───────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={prev} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
            <ChevronLeft className="w-4 h-4 text-gray-600" />
          </button>
          <h2 className="text-base font-semibold text-gray-900 capitalize">{monthName}</h2>
          <button onClick={next} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
            <ChevronRight className="w-4 h-4 text-gray-600" />
          </button>
          {monthPosts.length > 0 && (
            <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
              {monthPosts.length} post{monthPosts.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>

        {/* Legend + new post */}
        <div className="flex items-center gap-4">
          <div className="hidden sm:flex items-center gap-3">
            {Object.entries(STATUS).filter(([k]) => ['scheduled','published','failed','draft'].includes(k)).map(([, v]) => (
              <span key={v.label} className="flex items-center gap-1 text-xs text-gray-500">
                <span className={cn('w-2 h-2 rounded-full', v.dot)} />
                {v.label}
              </span>
            ))}
          </div>
          <Link
            href="/posts/new"
            className="flex items-center gap-1.5 bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium py-2 px-3 rounded-lg transition-colors"
          >
            <PlusCircle className="w-4 h-4" />
            Novo post
          </Link>
        </div>
      </div>

      {/* ── Calendar grid ─────────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        {/* Weekday headers */}
        <div className="grid grid-cols-7 border-b border-gray-100 bg-gray-50">
          {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((d) => (
            <div key={d} className="py-2.5 text-center text-xs font-semibold text-gray-400 tracking-wide">
              {d}
            </div>
          ))}
        </div>

        {/* Cells */}
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-6 h-6 text-violet-500 animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-7">
            {cells.map((day, idx) => {
              const isToday =
                day !== null &&
                today.getFullYear() === year &&
                today.getMonth() === month &&
                today.getDate() === day

              const isWeekend = idx % 7 === 0 || idx % 7 === 6
              const dayPosts  = day ? postsByDay(day) : []

              return (
                <div
                  key={idx}
                  className={cn(
                    'min-h-[110px] p-2 border-b border-r border-gray-50 last:border-r-0',
                    !day && 'bg-gray-50/40',
                    isWeekend && day && 'bg-blue-50/20',
                  )}
                >
                  {day && (
                    <>
                      {/* Day number */}
                      <span
                        className={cn(
                          'text-xs font-semibold w-6 h-6 flex items-center justify-center rounded-full mb-1.5 ml-auto',
                          isToday
                            ? 'bg-violet-600 text-white'
                            : isWeekend
                            ? 'text-blue-400'
                            : 'text-gray-500',
                        )}
                      >
                        {day}
                      </span>

                      {/* Post chips */}
                      <div className="space-y-1">
                        {dayPosts.slice(0, 3).map((p) => (
                          <PostChip
                            key={p.id}
                            post={p}
                            onClick={() => setSelected(p)}
                          />
                        ))}
                        {dayPosts.length > 3 && (
                          <button
                            onClick={() => setSelected(dayPosts[3])}
                            className="w-full text-left text-[10px] text-violet-500 hover:text-violet-700 font-medium pl-1"
                          >
                            +{dayPosts.length - 3} mais
                          </button>
                        )}
                      </div>
                    </>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ── Post detail modal ─────────────────────────────────────────────── */}
      {selected && (
        <PostModal post={selected} onClose={() => setSelected(null)} />
      )}
    </div>
  )
}
