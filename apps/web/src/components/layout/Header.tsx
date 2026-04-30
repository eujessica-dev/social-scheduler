'use client'

import { usePathname } from 'next/navigation'
import { Bell } from 'lucide-react'

const titles: Record<string, string> = {
  '/dashboard':                'Dashboard',
  '/calendar':                 'Calendário',
  '/media':                    'Biblioteca de Mídia',
  '/metrics':                  'Métricas',
  '/posts/new':                'Novo Post',
  '/settings':                 'Configurações',
  '/settings/social-accounts': 'Contas Sociais',
  '/billing':                  'Planos e Assinatura',
}

export function Header() {
  const pathname = usePathname()
  const title = titles[pathname] ?? 'Social Scheduler'

  return (
    <header className="h-16 border-b border-gray-100 bg-white flex items-center justify-between px-6 sticky top-0 z-10">
      <h1 className="text-gray-900 font-semibold text-base">{title}</h1>
      <div className="flex items-center gap-3">
        <button className="relative text-gray-400 hover:text-gray-700 transition-colors">
          <Bell className="w-5 h-5" />
        </button>
      </div>
    </header>
  )
}
