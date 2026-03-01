import Link from 'next/link'
import Image from 'next/image'
import { ArrowRight, CalendarDays, MapPin, Users, Clock, Shield, Zap } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { TenantCardGrid } from '@/components/explore/explore-list'
import { PartnersCarousel } from '@/components/marketing/partners-carousel'
import type { TenantCard } from '@/components/explore/explore-list'
import type { SportType, VenueType, CourtAmenities } from '@/lib/types'

const features = [
  {
    icon: MapPin,
    title: 'Find Courts Near You',
    description: 'Browse basketball, pickleball, volleyball, and tennis courts — all available to book in seconds.',
  },
  {
    icon: CalendarDays,
    title: 'Book in Seconds',
    description: 'Pick your court, choose a time slot, and confirm your reservation. No phone calls, no waiting.',
  },
  {
    icon: Users,
    title: 'Membership Perks',
    description: 'Join a membership plan for priority booking, discounted rates, and exclusive access to your favorite courts.',
  },
  {
    icon: Clock,
    title: 'Recurring Reservations',
    description: 'Set up weekly recurring bookings so your regular court time is always locked in.',
  },
  {
    icon: Shield,
    title: 'Guaranteed Slots',
    description: 'Real-time availability means no double bookings. Your reserved slot is yours — guaranteed.',
  },
  {
    icon: Zap,
    title: 'Instant Confirmation',
    description: 'Get booking confirmations and reminders straight to your inbox. Never miss a game.',
  },
]

const steps = [
  {
    number: '01',
    title: 'Find your court',
    description: 'Browse available facilities and pick the court that fits your sport, location, and schedule.',
  },
  {
    number: '02',
    title: 'Pick your time',
    description: 'See real-time availability, choose a slot that works, and set up recurring bookings if you want.',
  },
  {
    number: '03',
    title: 'Play',
    description: 'Show up and enjoy. Your court is reserved and waiting for you — no hassle, no conflicts.',
  },
]

export default async function HomePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let ctaHref = '/signup'
  let ctaLabel = 'Book your court'
  let isOwner = false

  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role === 'business_owner') {
      isOwner = true
      const { data: tenant } = await supabase
        .from('tenants')
        .select('slug')
        .eq('owner_id', user.id)
        .limit(1)
        .single()
      ctaHref = tenant ? `/dashboard/${tenant.slug}` : '/onboarding'
      ctaLabel = 'Go to Dashboard'
    } else {
      ctaHref = '/explore'
      ctaLabel = 'Browse facilities'
    }
  }

  // Fetch up to 6 tenants for the browse preview
  const { data: previewTenants } = await supabase
    .from('tenants')
    .select('*, courts(sport_type, is_active, amenities)')
    .order('name')
    .limit(6)

  const tenantCards: TenantCard[] = (previewTenants ?? []).map((t) => {
    const activeCourts = (t.courts ?? []).filter((c: { is_active: boolean }) => c.is_active)
    const sportTypes = [...new Set(activeCourts.map((c: { sport_type: SportType }) => c.sport_type))] as SportType[]
    const venueTypes = [
      ...new Set(
        activeCourts
          .map((c: { amenities: CourtAmenities }) => (c.amenities as CourtAmenities)?.venue_type)
          .filter(Boolean) as VenueType[]
      ),
    ]
    return {
      id: t.id,
      name: t.name,
      slug: t.slug,
      logo_url: t.logo_url,
      description: t.description,
      city: t.city || null,
      courtCount: activeCourts.length,
      sportTypes,
      venueTypes,
    }
  })

  return (
    <main>
      {/* Hero */}
      <section className="relative mx-auto max-w-7xl overflow-hidden px-6 pb-24 pt-20">
        <div className="relative z-10 max-w-xl">
          <div className="mb-8">
            <span className="section-label">[ BOOK YOUR COURT ]</span>
          </div>
          <h1 className="text-5xl font-bold leading-[1.08] tracking-tight sm:text-7xl">
            Your court is waiting.
            <br />
            <span className="text-primary">Book it now.</span>
          </h1>
          <p className="mt-8 text-lg leading-relaxed text-muted-foreground">
            Find available courts, reserve your spot in seconds, and never miss a game.
            Basketball, pickleball, tennis, volleyball — all in one place.
          </p>
          <div className="mt-10 flex items-center gap-5">
            <Link
              href={ctaHref}
              className="cta-button rounded-none"
            >
              {ctaLabel} <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="#how-it-works"
              className="font-mono text-sm text-muted-foreground underline decoration-border underline-offset-4 transition-colors hover:text-foreground"
            >
              See how it works
            </Link>
          </div>
        </div>
        <div className="pointer-events-none absolute -right-4 bottom-0 top-10 hidden w-[58%] items-center justify-end lg:flex">
          <Image
            src="/images/Hero.png"
            alt="Athletes playing various court sports"
            width={900}
            height={560}
            className="object-contain object-right"
            priority
          />
        </div>
      </section>

      {/* Divider */}
      <div className="mx-auto max-w-7xl px-6">
        <div className="h-px bg-border" />
      </div>

      {/* Partners Carousel */}
      <PartnersCarousel />

      {/* Divider */}
      <div className="mx-auto max-w-7xl px-6">
        <div className="h-px bg-border" />
      </div>

      {/* Features */}
      <section id="features" className="mx-auto max-w-7xl px-6 py-24">
        <div className="mb-12">
          <span className="section-label">[ WHY COURTFLOW ]</span>
        </div>
        <h2 className="mb-16 max-w-3xl text-3xl font-bold tracking-tight sm:text-4xl">
          Booking a court should be as easy as showing up to play.
        </h2>
        <div className="grid gap-x-8 gap-y-12 md:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <div key={feature.title} className="group">
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-md border border-border bg-card transition-colors group-hover:border-primary/30 group-hover:bg-primary/5">
                <feature.icon className="h-5 w-5 text-primary" />
              </div>
              <h3 className="mb-2 text-base font-semibold tracking-tight">
                {feature.title}
              </h3>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Divider */}
      <div className="mx-auto max-w-7xl px-6">
        <div className="h-px bg-border" />
      </div>

      {/* How It Works */}
      <section id="how-it-works" className="mx-auto max-w-7xl px-6 py-24">
        <div className="mb-12">
          <span className="section-label">[ HOW IT WORKS ]</span>
        </div>
        <h2 className="mb-16 max-w-2xl text-3xl font-bold tracking-tight sm:text-4xl">
          Three steps to game time.
        </h2>
        <div className="grid gap-12 md:grid-cols-3">
          {steps.map((step) => (
            <div key={step.number}>
              <span className="mb-4 block font-mono text-4xl font-bold text-primary/20">
                {step.number}
              </span>
              <h3 className="mb-3 text-lg font-semibold tracking-tight">
                {step.title}
              </h3>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {step.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Divider */}
      <div className="mx-auto max-w-7xl px-6">
        <div className="h-px bg-border" />
      </div>

      {/* Browse Facilities */}
      {tenantCards.length > 0 && (
        <>
          <section className="mx-auto max-w-7xl px-6 py-24">
            <div className="mb-12">
              <span className="section-label">[ BROWSE FACILITIES ]</span>
            </div>
            <h2 className="mb-4 max-w-2xl text-3xl font-bold tracking-tight sm:text-4xl">
              Find a court near you.
            </h2>
            <p className="mb-10 max-w-xl text-muted-foreground">
              Explore facilities offering basketball, pickleball, tennis, volleyball, and more.
            </p>
            <TenantCardGrid tenants={tenantCards} />
            <div className="mt-10 text-center">
              <Link
                href="/explore"
                className="inline-flex items-center gap-2 font-mono text-sm font-medium text-primary transition-colors hover:text-primary/80"
              >
                View all facilities <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </section>

          {/* Divider */}
          <div className="mx-auto max-w-7xl px-6">
            <div className="h-px bg-border" />
          </div>
        </>
      )}

      {/* CTA */}
      <section className="mx-auto max-w-7xl px-6 py-24">
        <div className="flex flex-col items-start gap-8 md:flex-row md:items-center md:justify-between">
          <div>
            <span className="section-label mb-4 block">[ GET STARTED ]</span>
            <h2 className="max-w-lg text-3xl font-bold tracking-tight sm:text-4xl">
              Ready to reserve your next court?
            </h2>
            <p className="mt-4 max-w-md text-muted-foreground">
              Join players who book their courts in seconds — no phone calls, no hassle.
            </p>
          </div>
          <Link
            href={ctaHref}
            className="cta-button shrink-0 rounded-none"
          >
            {ctaLabel} <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-6">
          <span className="font-mono text-xs text-muted-foreground">
            &copy; {new Date().getFullYear()} CourtFLOW
          </span>
          <div className="flex gap-6">
            {isOwner ? (
              <Link href={ctaHref} className="font-mono text-xs text-muted-foreground transition-colors hover:text-foreground">
                Dashboard
              </Link>
            ) : !user ? (
              <>
                <Link href="/login" className="font-mono text-xs text-muted-foreground transition-colors hover:text-foreground">
                  Sign in
                </Link>
                <Link href="/signup" className="font-mono text-xs text-muted-foreground transition-colors hover:text-foreground">
                  Sign up
                </Link>
              </>
            ) : null}
          </div>
        </div>
      </footer>
    </main>
  )
}
