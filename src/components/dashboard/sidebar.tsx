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
  BarChart3,
  Menu,
} from 'lucide-react'
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { useState } from 'react'

const navItems = [
  { label: 'Overview', href: '', icon: LayoutDashboard },
  { label: 'Courts', href: '/courts', icon: MapPin },
  { label: 'Bookings', href: '/bookings', icon: CalendarDays },
  { label: 'Customers', href: '/customers', icon: Users },
  { label: 'Tiers', href: '/members/tiers', icon: Crown },
  { label: 'Analytics', href: '/analytics', icon: BarChart3 },
  { label: 'Settings', href: '/settings', icon: Settings },
]

function NavContent({ slug, pathname }: { slug: string; pathname: string }) {
  const basePath = `/dashboard/${slug}`

  return (
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
              'flex items-center gap-3 rounded-lg px-3 py-2 font-mono text-xs uppercase tracking-wider transition-colors',
              isActive
                ? 'bg-primary/10 text-primary font-medium'
                : 'text-muted-foreground hover:bg-accent hover:text-foreground'
            )}
          >
            <item.icon className="h-4 w-4" />
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}

export function Sidebar({ slug, tenantName }: { slug: string; tenantName: string }) {
  const pathname = usePathname()

  return (
    <aside className="hidden h-full w-64 flex-col border-r bg-card md:flex">
      <div className="flex h-14 items-center border-b px-4">
        <Link href={`/dashboard/${slug}`} className="font-mono text-sm font-medium tracking-tight">
          {tenantName}
        </Link>
      </div>
      <NavContent slug={slug} pathname={pathname} />
    </aside>
  )
}

export function MobileSidebar({ slug, tenantName }: { slug: string; tenantName: string }) {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden">
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-64 p-0">
        <div className="flex h-14 items-center border-b px-4">
          <span className="font-mono text-sm font-medium tracking-tight">
            {tenantName}
          </span>
        </div>
        <div onClick={() => setOpen(false)}>
          <NavContent slug={slug} pathname={pathname} />
        </div>
      </SheetContent>
    </Sheet>
  )
}
