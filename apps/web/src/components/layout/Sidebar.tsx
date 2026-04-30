'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, Calendar, Image, Share2,
  Settings, LogOut, PlusCircle, BarChart2, CreditCard,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/store/auth.store'

const nav = [
  { href: '/dashboard',                label: 'Dashboard',      icon: LayoutDashboard },
  { href: '/calendar',                 label: 'Calendário',     icon: Calendar },
  { href: '/media',                    label: 'Biblioteca',     icon: Image },
  { href: '/metrics',                  label: 'Métricas',       icon: BarChart2 },
  { href: '/settings/social-accounts', label: 'Contas Sociais', icon: Share2 },
  { href: '/settings',                 label: 'Configurações',  icon: Settings },
  { href: '/billing',                  label: 'Planos',         icon: CreditCard },
]

export function Sidebar() {
  const pathname = usePathname()
  const { user, logout } = useAuthStore()

  return (
    <aside className="w-60 min-h-screen bg-gray-950 flex flex-col fixed left-0 top-0 bottom-0">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-5 h-16 border-b border-gray-800">
        <div className="w-8 h-8 rounded-lg bg-violet-600 flex items-center justify-center text-white font-bold text-sm">
          S
        </div>
        <span className="text-white font-semibold text-sm">Social Scheduler</span>
      </div>

      {/* Novo post */}
      <div className="px-4 pt-5 pb-2">
        <Link
          href="/posts/new"
          className="flex items-center justify-center gap-2 w-full bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium py-2 px-3 rounded-lg transition-colors"
        >
          <PlusCircle className="w-4 h-4" />
          Novo post
        </Link>
      </div>

      {/* Navegação */}
      <nav className="flex-1 px-3 py-2 space-y-0.5">
        {nav.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors',
              pathname === href || pathname.startsWith(href + '/')
                ? 'bg-gray-800 text-white'
                : 'text-gray-400 hover:text-white hover:bg-gray-800/60',
            )}
          >
            <Icon className="w-4 h-4 flex-shrink-0" />
            {label}
          </Link>
        ))}
      </nav>

      {/* Usuário */}
      <div className="px-3 pb-4 border-t border-gray-800 pt-3">
        <div className="flex items-center gap-3 px-3 py-2 rounded-lg">
          <div className="w-7 h-7 rounded-full bg-violet-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
            {user?.email?.charAt(0).toUpperCase()}
          </div>
          <span className="text-gray-300 text-xs truncate flex-1">{user?.email}</span>
          <button
            onClick={logout}
            title="Sair"
            className="text-gray-500 hover:text-gray-200 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </aside>
  )
}
