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
  Handshake,
  Menu,
  LogOut,
} from 'lucide-react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
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
  { label: 'Partners', href: '/admin/partners', icon: Handshake },
  { label: 'Analytics', href: '/admin/analytics', icon: BarChart3 },
]

interface NavContentProps {
  pathname: string
  signOutAction?: () => void
  onNavigate?: () => void
}

function NavContent({ pathname, signOutAction, onNavigate }: NavContentProps) {
  return (
    <div className="flex flex-1 flex-col">
      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {navItems.map((item) => {
          const isActive = item.href === '/admin'
            ? pathname === '/admin'
            : pathname.startsWith(item.href)

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
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

      {signOutAction && (
        <div className="border-t border-border p-3">
          <form action={signOutAction}>
            <button
              type="submit"
              onClick={onNavigate}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2 font-mono text-xs uppercase tracking-wider text-destructive transition-colors hover:bg-accent"
            >
              <LogOut className="h-4 w-4" />
              Sign Out
            </button>
          </form>
        </div>
      )}
    </div>
  )
}

interface AdminSidebarProps {
  signOutAction?: () => void
}

export function AdminSidebar({ signOutAction }: AdminSidebarProps) {
  const pathname = usePathname()

  return (
    <aside className="hidden h-full w-64 flex-col border-r bg-card md:flex">
      <div className="flex h-14 items-center border-b px-4">
        <Link href="/admin" className="font-mono text-sm font-medium tracking-tight">
          CourtFLOW Admin
        </Link>
      </div>
      <NavContent pathname={pathname} signOutAction={signOutAction} />
    </aside>
  )
}

export function AdminMobileSidebar({ signOutAction }: AdminSidebarProps) {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden">
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-64 p-0" aria-describedby={undefined}>
        <SheetHeader className="flex h-14 flex-row items-center border-b px-4 space-y-0">
          <SheetTitle className="font-mono text-sm font-medium tracking-tight">
            CourtFLOW Admin
          </SheetTitle>
        </SheetHeader>
        <NavContent
          pathname={pathname}
          signOutAction={signOutAction}
          onNavigate={() => setOpen(false)}
        />
      </SheetContent>
    </Sheet>
  )
}
