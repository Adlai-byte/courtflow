'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  Building2,
  Users,
  CalendarDays,
  Landmark,
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
  { label: 'Overview', href: '/admin', icon: LayoutDashboard },
  { label: 'Tenants', href: '/admin/tenants', icon: Building2 },
  { label: 'Users', href: '/admin/users', icon: Users },
  { label: 'Bookings', href: '/admin/bookings', icon: CalendarDays },
  { label: 'Courts', href: '/admin/courts', icon: Landmark },
  { label: 'Analytics', href: '/admin/analytics', icon: BarChart3 },
]

function NavContent({ pathname }: { pathname: string }) {
  return (
    <nav className="flex-1 space-y-1 p-3">
      {navItems.map((item) => {
        const isActive = item.href === '/admin'
          ? pathname === '/admin'
          : pathname.startsWith(item.href)

        return (
          <Link
            key={item.href}
            href={item.href}
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

export function AdminSidebar() {
  const pathname = usePathname()

  return (
    <aside className="hidden h-full w-64 flex-col border-r bg-card md:flex">
      <div className="flex h-14 items-center border-b px-4">
        <Link href="/admin" className="font-mono text-sm font-medium tracking-tight">
          CourtFLOW Admin
        </Link>
      </div>
      <NavContent pathname={pathname} />
    </aside>
  )
}

export function AdminMobileSidebar() {
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
            CourtFLOW Admin
          </span>
        </div>
        <div onClick={() => setOpen(false)}>
          <NavContent pathname={pathname} />
        </div>
      </SheetContent>
    </Sheet>
  )
}
