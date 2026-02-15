'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  MapPin,
  CalendarDays,
  Users,
  Crown,
  Settings,
} from 'lucide-react'

const navItems = [
  { label: 'Overview', href: '', icon: LayoutDashboard },
  { label: 'Courts', href: '/courts', icon: MapPin },
  { label: 'Bookings', href: '/bookings', icon: CalendarDays },
  { label: 'Members', href: '/members', icon: Users },
  { label: 'Membership Tiers', href: '/members/tiers', icon: Crown },
  { label: 'Settings', href: '/settings', icon: Settings },
]

export function Sidebar({ slug }: { slug: string }) {
  const pathname = usePathname()
  const basePath = `/dashboard/${slug}`

  return (
    <aside className="flex h-full w-64 flex-col border-r bg-card">
      <div className="flex h-14 items-center border-b px-4">
        <Link href={basePath} className="text-lg font-bold tracking-tight">
          CourtFLOW
        </Link>
      </div>
      <nav className="flex-1 space-y-1 p-3">
        {navItems.map((item) => {
          const href = `${basePath}${item.href}`
          const isActive = item.href === ''
            ? pathname === basePath
            : pathname.startsWith(href)

          return (
            <Link
              key={item.href}
              href={href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}
