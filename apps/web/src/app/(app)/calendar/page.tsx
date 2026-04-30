'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { api } from '@/lib/api'
import { ChevronLeft, ChevronRight, PlusCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Post {
  id: string
  title: string | null
  caption: string | null
  status: string
  scheduledAt: string | null
  brand: { name: string; color: string | null }
  platforms: { platform: string }[]
}

const statusDot: Record<string, string> = {
  scheduled:  'bg-blue-500',
  published:  'bg-green-500',
  failed:     'bg-red-500',
  draft:      'bg-gray-400',
  publishing: 'bg-yellow-500',
}

export default function CalendarPage() {
  const [posts, setPosts] = useState<Post[]>([])
  const [date, setDate] = useState(new Date())

  const year  = date.getFullYear()
  const month = date.getMonth()

  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const cells = Array.from({ length: firstDay + daysInMonth }, (_, i) =>
    i < firstDay ? null : i - firstDay + 1,
  )

  useEffect(() => {
    api.get('/posts').then((res) => setPosts(res.data)).catch(() => {})
  }, [])

  const postsByDay = (day: number) =>
    posts.filter((p) => {
      if (!p.scheduledAt) return false
      const d = new Date(p.scheduledAt)
      return d.getFullYear() === year && d.getMonth() === month && d.getDate() === day
    })

  const monthName = date.toLocaleString('pt-BR', { month: 'long', year: 'numeric' })

  const prev = () => setDate(new Date(year, month - 1, 1))
  const next = () => setDate(new Date(year, month + 1, 1))

  return (
    <div className="space-y-4">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={prev} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
            <ChevronLeft className="w-4 h-4 text-gray-600" />
          </button>
          <h2 className="text-base font-semibold text-gray-900 capitalize">{monthName}</h2>
          <button onClick={next} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
            <ChevronRight className="w-4 h-4 text-gray-600" />
          </button>
        </div>
        <Link
          href="/posts/new"
          className="flex items-center gap-1.5 bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium py-2 px-3 rounded-lg transition-colors"
        >
          <PlusCircle className="w-4 h-4" />
          Novo post
        </Link>
      </div>

      {/* Grid do calendário */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        {/* Dias da semana */}
        <div className="grid grid-cols-7 border-b border-gray-100">
          {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((d) => (
            <div key={d} className="py-2.5 text-center text-xs font-medium text-gray-400">
              {d}
            </div>
          ))}
        </div>

        {/* Células */}
        <div className="grid grid-cols-7 divide-x divide-y divide-gray-50">
          {cells.map((day, idx) => {
            const today = new Date()
            const isToday =
              day !== null &&
              today.getFullYear() === year &&
              today.getMonth() === month &&
              today.getDate() === day

            const dayPosts = day ? postsByDay(day) : []

            return (
              <div
                key={idx}
                className={cn(
                  'min-h-[90px] p-2',
                  !day && 'bg-gray-50/60',
                )}
              >
                {day && (
                  <>
                    <span
                      className={cn(
                        'text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full mb-1',
                        isToday
                          ? 'bg-violet-600 text-white'
                          : 'text-gray-500',
                      )}
                    >
                      {day}
                    </span>
                    <div className="space-y-0.5">
                      {dayPosts.slice(0, 3).map((p) => (
                        <Link
                          key={p.id}
                          href={`/posts/${p.id}`}
                          className="flex items-center gap-1 text-xs text-gray-700 hover:text-violet-600 truncate"
                        >
                          <span
                            className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0', statusDot[p.status] ?? 'bg-gray-400')}
                          />
                          <span className="truncate">{p.title ?? p.caption ?? 'Post'}</span>
                        </Link>
                      ))}
                      {dayPosts.length > 3 && (
                        <p className="text-xs text-gray-400 pl-2.5">+{dayPosts.length - 3} mais</p>
                      )}
                    </div>
                  </>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
