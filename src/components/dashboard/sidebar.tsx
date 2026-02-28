'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  MapPin,
  CalendarDays,
  Users,
  UserCheck,
  Crown,
  ClipboardList,
  Settings,
  BarChart3,
  Menu,
  ExternalLink,
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
  { label: 'Overview', href: '', icon: LayoutDashboard },
  { label: 'Courts', href: '/courts', icon: MapPin },
  { label: 'Bookings', href: '/bookings', icon: CalendarDays },
  { label: 'Customers', href: '/customers', icon: Users },
  { label: 'Members', href: '/members', icon: UserCheck, exact: true },
  { label: 'Tiers', href: '/members/tiers', icon: Crown },
  { label: 'Requests', href: '/members/requests', icon: ClipboardList },
  { label: 'Analytics', href: '/analytics', icon: BarChart3 },
  { label: 'Settings', href: '/settings', icon: Settings },
]

interface NavContentProps {
  slug: string
  pathname: string
  signOutAction?: () => void
  onNavigate?: () => void
}

function NavContent({ slug, pathname, signOutAction, onNavigate }: NavContentProps) {
  const basePath = `/dashboard/${slug}`

  return (
    <div className="flex flex-1 flex-col">
      <nav className="flex-1 space-y-1 p-3">
        {navItems.map((item) => {
          const href = `${basePath}${item.href}`
          const isActive = item.href === ''
            ? pathname === basePath
            : item.exact
              ? pathname === href
              : pathname.startsWith(href)

          return (
            <Link
              key={item.href}
              href={href}
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

      <div className="border-t border-border p-3">
        <a
          href={`/${slug}`}
          target="_blank"
          rel="noopener noreferrer"
          onClick={onNavigate}
          className="flex items-center gap-3 rounded-lg px-3 py-2 font-mono text-xs uppercase tracking-wider text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <ExternalLink className="h-4 w-4" />
          View Public Page
        </a>
      </div>

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

interface SidebarProps {
  slug: string
  tenantName: string
  signOutAction?: () => void
}

export function Sidebar({ slug, tenantName, signOutAction }: SidebarProps) {
  const pathname = usePathname()

  return (
    <aside className="hidden h-full w-64 flex-col border-r bg-card md:flex">
      <div className="flex h-14 items-center border-b px-4">
        <Link href={`/dashboard/${slug}`} className="font-mono text-sm font-medium tracking-tight">
          {tenantName}
        </Link>
      </div>
      <NavContent slug={slug} pathname={pathname} signOutAction={signOutAction} />
    </aside>
  )
}

export function MobileSidebar({ slug, tenantName, signOutAction }: SidebarProps) {
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
            {tenantName}
          </SheetTitle>
        </SheetHeader>
        <NavContent
          slug={slug}
          pathname={pathname}
          signOutAction={signOutAction}
          onNavigate={() => setOpen(false)}
        />
      </SheetContent>
    </Sheet>
  )
}
