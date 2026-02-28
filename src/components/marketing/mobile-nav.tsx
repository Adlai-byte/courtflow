'use client'

import Link from 'next/link'
import { useState } from 'react'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Menu, LogOut, BookOpen, User, CalendarDays, CreditCard, Clock } from 'lucide-react'
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { VisuallyHidden } from '@radix-ui/react-visually-hidden'

export function MobileMarketingNav({
  isLoggedIn,
  isOwner,
  isAdmin,
  dashboardHref,
  customerSlug,
  signOutAction,
}: {
  isLoggedIn: boolean
  isOwner: boolean
  isAdmin?: boolean
  dashboardHref: string
  customerSlug?: string | null
  signOutAction?: () => void
}) {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()
  const isCustomer = isLoggedIn && !isOwner && !isAdmin

  function isActive(href: string) {
    if (href.startsWith('#')) return false
    return pathname === href
  }

  const linkClass = (href: string, base: string) =>
    cn(base, isActive(href) && 'text-foreground')

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="lg:hidden">
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-64 p-6">
        <VisuallyHidden><SheetTitle>Navigation</SheetTitle></VisuallyHidden>
        <nav className="flex flex-col gap-4 mt-8" onClick={() => setOpen(false)}>
          {isCustomer ? (
            <>
              <Link href="/explore" className={linkClass('/explore', 'flex items-center gap-2 font-mono text-sm uppercase tracking-wider text-muted-foreground hover:text-foreground')}>
                <CalendarDays className="h-4 w-4" />
                Book Courts
              </Link>
              <Link href={customerSlug ? `/${customerSlug}/my-bookings` : '/explore'} className={linkClass(customerSlug ? `/${customerSlug}/my-bookings` : '/explore', 'flex items-center gap-2 font-mono text-sm uppercase tracking-wider text-muted-foreground hover:text-foreground')}>
                <BookOpen className="h-4 w-4" />
                My Bookings
              </Link>
              <Link href={customerSlug ? `/${customerSlug}/my-membership` : '/explore'} className={linkClass(customerSlug ? `/${customerSlug}/my-membership` : '/explore', 'flex items-center gap-2 font-mono text-sm uppercase tracking-wider text-muted-foreground hover:text-foreground')}>
                <CreditCard className="h-4 w-4" />
                My Membership
              </Link>
              <Link href={customerSlug ? `/${customerSlug}/my-waitlist` : '/explore'} className={linkClass(customerSlug ? `/${customerSlug}/my-waitlist` : '/explore', 'flex items-center gap-2 font-mono text-sm uppercase tracking-wider text-muted-foreground hover:text-foreground')}>
                <Clock className="h-4 w-4" />
                My Waitlist
              </Link>
              <Link href={customerSlug ? `/${customerSlug}/profile` : '/explore'} className={linkClass(customerSlug ? `/${customerSlug}/profile` : '/explore', 'flex items-center gap-2 font-mono text-sm uppercase tracking-wider text-muted-foreground hover:text-foreground')}>
                <User className="h-4 w-4" />
                Profile
              </Link>
              <hr className="border-border" />
              {signOutAction && (
                <form action={signOutAction}>
                  <button
                    type="submit"
                    className="flex w-full items-center gap-2 font-mono text-sm uppercase tracking-wider text-muted-foreground hover:text-destructive"
                  >
                    <LogOut className="h-4 w-4" />
                    Sign out
                  </button>
                </form>
              )}
            </>
          ) : (
            <>
              <Link href="#features" className="font-mono text-sm uppercase tracking-wider text-muted-foreground hover:text-foreground">
                Features
              </Link>
              <Link href="/explore" className={linkClass('/explore', 'font-mono text-sm uppercase tracking-wider text-muted-foreground hover:text-foreground')}>
                Explore
              </Link>
              <Link href="#how-it-works" className="font-mono text-sm uppercase tracking-wider text-muted-foreground hover:text-foreground">
                How it works
              </Link>
              <hr className="border-border" />
              {!isLoggedIn ? (
                <>
                  <Link href="/login" className="font-mono text-sm uppercase tracking-wider text-muted-foreground hover:text-foreground">
                    Sign in
                  </Link>
                  <Link href="/signup" className="cta-button rounded-none px-5 py-2.5 text-xs justify-center">
                    Get started
                  </Link>
                </>
              ) : (
                <>
                  {(isOwner || isAdmin) && (
                    <Link href={dashboardHref} className="cta-button rounded-none px-5 py-2.5 text-xs justify-center">
                      Dashboard
                    </Link>
                  )}
                  {signOutAction && (
                    <form action={signOutAction}>
                      <button
                        type="submit"
                        className="flex w-full items-center gap-2 font-mono text-sm uppercase tracking-wider text-muted-foreground hover:text-destructive"
                      >
                        <LogOut className="h-4 w-4" />
                        Sign out
                      </button>
                    </form>
                  )}
                </>
              )}
            </>
          )}
        </nav>
      </SheetContent>
    </Sheet>
  )
}
