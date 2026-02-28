import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ArrowRight, LogOut, BookOpen, User, CalendarDays, CreditCard, Clock } from 'lucide-react'
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
      .single()

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
        .single()
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
        .single()

      if (lastBooking?.tenants) {
        customerSlug = (lastBooking.tenants as unknown as { slug: string }).slug
      } else {
        const { data: lastMembership } = await supabase
          .from('member_subscriptions')
          .select('tenants(slug)')
          .eq('customer_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single()

        if (lastMembership?.tenants) {
          customerSlug = (lastMembership.tenants as unknown as { slug: string }).slug
        }
      }
    }
  }

  return (
    <div className="relative min-h-screen bg-background">
      {/* Nav */}
      <header className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        <Link href="/" className="font-mono text-sm font-medium tracking-tight">
          CourtFLOW
        </Link>
        {/* Desktop nav: customer links for logged-in customers, marketing links otherwise */}
        {user && !isOwner && !isAdmin ? (
          <nav className="hidden items-center gap-6 md:flex">
            <Link href="/explore" className="flex items-center gap-1.5 font-mono text-xs uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground">
              <CalendarDays className="h-3.5 w-3.5" />
              Book Courts
            </Link>
            {customerSlug && (
              <>
                <Link href={`/${customerSlug}/my-bookings`} className="flex items-center gap-1.5 font-mono text-xs uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground">
                  <BookOpen className="h-3.5 w-3.5" />
                  My Bookings
                </Link>
                <Link href={`/${customerSlug}/my-membership`} className="flex items-center gap-1.5 font-mono text-xs uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground">
                  <CreditCard className="h-3.5 w-3.5" />
                  My Membership
                </Link>
                <Link href={`/${customerSlug}/my-waitlist`} className="flex items-center gap-1.5 font-mono text-xs uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground">
                  <Clock className="h-3.5 w-3.5" />
                  My Waitlist
                </Link>
                <Link href={`/${customerSlug}/profile`} className="flex items-center gap-1.5 font-mono text-xs uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground">
                  <User className="h-3.5 w-3.5" />
                  Profile
                </Link>
              </>
            )}
          </nav>
        ) : (
          <nav className="hidden items-center gap-8 md:flex">
            <Link href="#features" className="font-mono text-xs uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground">
              Features
            </Link>
            <Link href="/explore" className="font-mono text-xs uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground">
              Explore
            </Link>
            <Link href="#how-it-works" className="font-mono text-xs uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground">
              How it works
            </Link>
          </nav>
        )}
        <div className="flex items-center gap-4">
          <MobileMarketingNav isLoggedIn={!!user} isOwner={isOwner} isAdmin={isAdmin} dashboardHref={dashboardHref} customerSlug={customerSlug} signOutAction={user ? signOut : undefined} />
          {!user ? (
            <>
              <Link href="/login" className="hidden font-mono text-xs uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground md:inline">
                Sign in
              </Link>
              <Link
                href="/signup"
                className="cta-button hidden rounded-none px-5 py-2.5 text-xs md:flex"
              >
                Get started <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </>
          ) : (
            <>
              {(isOwner || isAdmin) && (
                <Link href={dashboardHref} className="cta-button hidden rounded-none px-5 py-2.5 text-xs md:flex">
                  Dashboard <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              )}
              <form action={signOut}>
                <button
                  type="submit"
                  className="hidden items-center gap-1.5 font-mono text-xs uppercase tracking-wider text-muted-foreground transition-colors hover:text-destructive md:flex"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  Sign out
                </button>
              </form>
            </>
          )}
        </div>
      </header>

      {children}
    </div>
  )
}
