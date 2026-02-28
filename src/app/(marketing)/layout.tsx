import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ArrowRight, LogOut, BookOpen, User, CalendarDays, CreditCard, Clock } from 'lucide-react'
import { ActiveNavLink } from '@/components/marketing/active-nav-link'
import { MobileMarketingNav } from '@/components/marketing/mobile-nav'
import { createClient } from '@/lib/supabase/server'

export default async function MarketingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  async function signOut() {
    'use server'
    const supabase = await createClient()
    await supabase.auth.signOut()
    redirect('/login')
  }

  let isOwner = false
  let isAdmin = false
  let dashboardHref = '/dashboard'
  let customerSlug: string | null = null
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle()

    if (profile?.role === 'platform_admin') {
      isAdmin = true
      dashboardHref = '/admin'
    } else if (profile?.role === 'business_owner') {
      isOwner = true
      const { data: tenant } = await supabase
        .from('tenants')
        .select('slug')
        .eq('owner_id', user.id)
        .limit(1)
        .maybeSingle()
      if (tenant) {
        dashboardHref = `/dashboard/${tenant.slug}`
      }
    } else {
      // customer — find last-used facility for nav links
      const { data: lastBooking } = await supabase
        .from('bookings')
        .select('tenants(slug)')
        .eq('customer_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (lastBooking?.tenants) {
        customerSlug = (lastBooking.tenants as unknown as { slug: string }).slug
      } else {
        const { data: lastMembership } = await supabase
          .from('member_subscriptions')
          .select('tenants(slug)')
          .eq('customer_id', user.id)
          .eq('status', 'active')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()

        if (lastMembership?.tenants) {
          customerSlug = (lastMembership.tenants as unknown as { slug: string }).slug
        }
      }
    }
  }

  return (
    <div className="relative min-h-screen bg-background">
      <a href="#main-content" className="skip-to-content">
        Skip to main content
      </a>
      {/* Nav */}
      <header className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        <Link href="/" className="font-mono text-sm font-medium tracking-tight">
          CourtFLOW
        </Link>
        {/* Desktop nav: customer links for logged-in customers, marketing links otherwise */}
        {user && !isOwner && !isAdmin ? (
          <nav className="hidden items-center gap-6 lg:flex">
            <ActiveNavLink href="/explore" className="flex items-center gap-1.5 font-mono text-xs uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground">
              <CalendarDays className="h-3.5 w-3.5" />
              Book Courts
            </ActiveNavLink>
            <ActiveNavLink href={customerSlug ? `/${customerSlug}/my-bookings` : '/explore'} className="flex items-center gap-1.5 font-mono text-xs uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground">
              <BookOpen className="h-3.5 w-3.5" />
              My Bookings
            </ActiveNavLink>
            <ActiveNavLink href={customerSlug ? `/${customerSlug}/my-membership` : '/explore'} className="flex items-center gap-1.5 font-mono text-xs uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground">
              <CreditCard className="h-3.5 w-3.5" />
              My Membership
            </ActiveNavLink>
            <ActiveNavLink href={customerSlug ? `/${customerSlug}/my-waitlist` : '/explore'} className="flex items-center gap-1.5 font-mono text-xs uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground">
              <Clock className="h-3.5 w-3.5" />
              My Waitlist
            </ActiveNavLink>
            <ActiveNavLink href={customerSlug ? `/${customerSlug}/profile` : '/explore'} className="flex items-center gap-1.5 font-mono text-xs uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground">
              <User className="h-3.5 w-3.5" />
              Profile
            </ActiveNavLink>
          </nav>
        ) : (
          <nav className="hidden items-center gap-8 lg:flex">
            <ActiveNavLink href="#features" className="font-mono text-xs uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground">
              Features
            </ActiveNavLink>
            <ActiveNavLink href="/explore" className="font-mono text-xs uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground">
              Explore
            </ActiveNavLink>
            <ActiveNavLink href="#how-it-works" className="font-mono text-xs uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground">
              How it works
            </ActiveNavLink>
          </nav>
        )}
        <div className="flex items-center gap-4">
          <MobileMarketingNav isLoggedIn={!!user} isOwner={isOwner} isAdmin={isAdmin} dashboardHref={dashboardHref} customerSlug={customerSlug} signOutAction={user ? signOut : undefined} />
          {!user ? (
            <>
              <Link href="/login" className="hidden font-mono text-xs uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground lg:inline">
                Sign in
              </Link>
              <Link
                href="/signup"
                className="cta-button hidden rounded-none px-5 py-2.5 text-xs lg:flex"
              >
                Get started <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </>
          ) : (
            <>
              {(isOwner || isAdmin) && (
                <Link href={dashboardHref} className="cta-button hidden rounded-none px-5 py-2.5 text-xs lg:flex">
                  Dashboard <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              )}
              <form action={signOut}>
                <button
                  type="submit"
                  className="hidden items-center gap-1.5 font-mono text-xs uppercase tracking-wider text-muted-foreground transition-colors hover:text-destructive lg:flex"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  Sign out
                </button>
              </form>
            </>
          )}
        </div>
      </header>

      <main id="main-content">{children}</main>
    </div>
  )
}
