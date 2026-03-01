'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  CalendarDays,
  BookOpen,
  CreditCard,
  Clock,
  User,
  LogOut,
  Menu,
  Compass,
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
  { label: 'Book Court', href: '', icon: CalendarDays },
  { label: 'Booking History', href: '/my-bookings', icon: BookOpen },
  { label: 'My Membership', href: '/my-membership', icon: CreditCard },
  { label: 'My Waitlist', href: '/my-waitlist', icon: Clock },
  { label: 'Profile', href: '/profile', icon: User },
]

interface NavContentProps {
  slug: string
  pathname: string
  isAuthenticated: boolean
  signOutAction?: () => void
  onNavigate?: () => void
}

function NavContent({ slug, pathname, isAuthenticated, signOutAction, onNavigate }: NavContentProps) {
  const basePath = `/${slug}`
  const visibleItems = isAuthenticated ? navItems : navItems.slice(0, 1)

  return (
    <div className="flex flex-1 flex-col">
      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        <Link
          href="/explore"
          onClick={onNavigate}
          className="flex items-center gap-3 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 font-mono text-xs uppercase tracking-wider text-primary transition-colors hover:bg-primary/10"
        >
          <Compass className="h-4 w-4" />
          Explore Facilities
        </Link>
        <div className="my-2 border-t border-border" />
        {visibleItems.map((item) => {
          const href = `${basePath}${item.href}`
          const isActive = item.href === ''
            ? pathname === basePath
            : pathname.startsWith(href)

          return (
            <Link
              key={item.label}
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

      {!isAuthenticated && (
        <div className="border-t border-border p-3">
          <Link href={`/login?redirect=/${slug}`} onClick={onNavigate}>
            <Button className="w-full font-mono text-xs uppercase tracking-wider" size="sm">
              Sign In
            </Button>
          </Link>
        </div>
      )}

      {isAuthenticated && signOutAction && (
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
  isAuthenticated: boolean
  signOutAction?: () => void
}

export function CustomerSidebar({ slug, tenantName, isAuthenticated, signOutAction }: SidebarProps) {
  const pathname = usePathname()

  return (
    <aside className="hidden h-full w-64 flex-col border-r bg-card md:flex">
      <div className="flex h-14 items-center border-b px-4">
        <Link href={`/${slug}`} className="font-mono text-sm font-medium tracking-tight">
          {tenantName}
        </Link>
      </div>
      <NavContent
        slug={slug}
        pathname={pathname}
        isAuthenticated={isAuthenticated}
        signOutAction={signOutAction}
      />
    </aside>
  )
}

export function CustomerMobileSidebar({ slug, tenantName, isAuthenticated, signOutAction }: SidebarProps) {
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
          isAuthenticated={isAuthenticated}
          signOutAction={signOutAction}
          onNavigate={() => setOpen(false)}
        />
      </SheetContent>
    </Sheet>
  )
}
