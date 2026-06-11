'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { CalendarDays, PlusCircle, Users, BarChart2, Settings } from 'lucide-react'
import { cn } from '@/lib/utils'

interface BottomNavProps {
  isAdmin: boolean
}

export function BottomNav({ isAdmin }: BottomNavProps) {
  const pathname = usePathname()

  const links = [
    { href: '/dashboard', label: 'Takvim', icon: CalendarDays },
    { href: '/appointments/new', label: 'Randevu', icon: PlusCircle },
    { href: '/customers', label: 'Müşteriler', icon: Users },
    ...(isAdmin ? [{ href: '/reports', label: 'Raporlar', icon: BarChart2 }] : []),
    ...(isAdmin ? [{ href: '/admin/services', label: 'Ayarlar', icon: Settings }] : []),
  ]

  const isActive = (href: string) =>
    href === '/dashboard' ? pathname === href : pathname.startsWith(href)

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-gray-100 z-50 pb-safe">
      <div className="flex justify-around items-center h-16">
        {links.map(({ href, label, icon: Icon }) => {
          const active = isActive(href)
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl transition-all min-w-[56px]',
                active ? 'text-[#C9547A]' : 'text-gray-400'
              )}
            >
              <div className={cn(
                'p-1.5 rounded-xl transition-colors',
                active ? 'bg-[#FDE8EF]' : ''
              )}>
                <Icon size={20} strokeWidth={active ? 2.2 : 1.8} />
              </div>
              <span className={cn('text-[10px] font-medium', active ? 'text-[#C9547A]' : 'text-gray-400')}>
                {label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
