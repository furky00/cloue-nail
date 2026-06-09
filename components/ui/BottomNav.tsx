'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { CalendarDays, PlusCircle, BarChart2, Settings } from 'lucide-react'
import { cn } from '@/lib/utils'

interface BottomNavProps {
  isAdmin: boolean
}

export function BottomNav({ isAdmin }: BottomNavProps) {
  const pathname = usePathname()

  const links = [
    { href: '/dashboard', label: 'Takvim', icon: CalendarDays },
    { href: '/appointments/new', label: 'Randevu', icon: PlusCircle },
    ...(isAdmin ? [{ href: '/reports', label: 'Rapor', icon: BarChart2 }] : []),
    ...(isAdmin ? [{ href: '/admin/services', label: 'Ayarlar', icon: Settings }] : []),
  ]

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50">
      <div className="flex justify-around items-center h-16">
        {links.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex flex-col items-center gap-1 px-4 py-2 text-xs',
              pathname === href ? 'text-[#E8185A]' : 'text-gray-500'
            )}
          >
            <Icon size={22} />
            {label}
          </Link>
        ))}
      </div>
    </nav>
  )
}
