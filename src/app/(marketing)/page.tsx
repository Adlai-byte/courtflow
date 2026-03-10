import Link from 'next/link'
import { ArrowRight, MapPin, CalendarCheck, Wallet, Repeat, ShieldCheck, BellRing } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { TenantCardGrid } from '@/components/explore/explore-list'
import { PartnersCarousel } from '@/components/marketing/partners-carousel'
import type { TenantCard } from '@/components/explore/explore-list'
import type { SportType, VenueType, CourtAmenities } from '@/lib/types'

const features = [
  { icon: MapPin, title: 'Find Courts Near You', description: 'Browse basketball, volleyball, badminton, and tennis courts by city and sport type.', iconBg: 'bg-amber-50', iconColor: 'text-amber-600' },
  { icon: CalendarCheck, title: 'Book in Seconds', description: 'See real-time availability. Pick your slot, confirm, done — no phone calls needed.', iconBg: 'bg-blue-50', iconColor: 'text-blue-600' },
  { icon: Wallet, title: 'Pay with GCash & Maya', description: 'Secure online payment via GCash or Maya. Some facilities also offer pay-at-venue.', iconBg: 'bg-green-50', iconColor: 'text-green-600' },
  { icon: Repeat, title: 'Recurring Reservations', description: 'Set up weekly games with one booking. Your regular slot, automatically reserved.', iconBg: 'bg-pink-50', iconColor: 'text-pink-600' },
  { icon: ShieldCheck, title: 'Guaranteed Slots', description: 'Real-time sync means no double bookings. Your slot is locked the moment you confirm.', iconBg: 'bg-indigo-50', iconColor: 'text-indigo-600' },
  { icon: BellRing, title: 'Instant Confirmation', description: 'Get booking confirmation via email and SMS. Never miss your game time.', iconBg: 'bg-yellow-50', iconColor: 'text-yellow-600' },
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

const testimonials = [
  { quote: 'Booking courts used to take 5 phone calls. Now it takes 5 seconds. Literal game changer for our weekly basketball sessions.', name: 'Juan Dela Cruz', role: 'Basketball Player · Manila', initial: 'J', color: 'bg-primary' },
  { quote: 'I manage 5 courts and CourtFLOW handles all my bookings. Auto-approve and GCash payments saved me hours every week.', name: 'Maria Santos', role: 'Facility Owner · Cebu', initial: 'M', color: 'bg-orange-500' },
  { quote: 'The recurring booking feature is perfect. I set up our weekly volleyball game for the whole month in one go. So convenient.', name: 'Kyle Reyes', role: 'Volleyball Player · Davao', initial: 'K', color: 'bg-amber-600' },
]

const faqs = [
  { question: 'Is CourtFLOW free for players?', answer: 'Yes! Signing up and browsing are completely free. You only pay when you book a court at facilities that require online payment.' },
  { question: 'What payment methods are accepted?', answer: 'We accept GCash and Maya for online payments. Some facilities also offer pay-at-venue options.' },
  { question: 'How do I list my facility on CourtFLOW?', answer: "Sign up as a facility owner, complete onboarding, and add your courts. You'll have your own booking page within minutes." },
  { question: 'Can I set up recurring bookings?', answer: 'Absolutely! You can book the same time slot across multiple weeks with a single booking. Perfect for regular games.' },
  { question: "What's the cancellation policy?", answer: 'Each facility sets their own cancellation window. You can cancel free of charge within that window from your bookings page.' },
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
      <section className="dot-grid relative mx-auto max-w-7xl overflow-hidden px-6 pb-24 pt-24">
        <div className="relative z-10 mx-auto max-w-3xl text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-1.5 text-sm text-muted-foreground shadow-sm">
            <span className="h-2 w-2 rounded-full bg-green-500" />
            Trusted by 2,400+ players
          </div>
          <h1 className="font-heading text-5xl font-extrabold leading-[1.08] tracking-tight sm:text-6xl md:text-7xl">
            Your Court Is Waiting.
            <br />
            <span className="text-primary">Book It Now.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground">
            Browse facilities near you, pick your slot, and play — no phone calls, no hassle.
          </p>
          <div className="mt-10 flex items-center justify-center gap-3">
            <Link href={ctaHref} className="btn-primary px-6 py-3 text-sm">
              {ctaLabel} <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="#how-it-works" className="btn-ghost px-6 py-3 text-sm">
              See How It Works
            </Link>
          </div>
          <div className="mt-12 flex items-end justify-center gap-4">
            <div className="animate-fade-in-up rounded-xl border border-border bg-card p-4 shadow-lg" style={{ animationDelay: '0.2s', transform: 'rotate(-1.5deg)' }}>
              <p className="text-sm font-semibold">Metro Hoops 🏀</p>
              <p className="text-xs text-muted-foreground">3 courts available</p>
            </div>
            <div className="animate-fade-in-up -translate-y-2 rounded-xl border border-border bg-card p-4 shadow-2xl" style={{ animationDelay: '0.4s' }}>
              <p className="text-sm font-semibold text-green-600">Booking Confirmed ✓</p>
              <p className="text-xs text-muted-foreground">Court A · Today 3:00 PM</p>
            </div>
            <div className="animate-fade-in-up rounded-xl border border-border bg-card p-4 shadow-lg" style={{ animationDelay: '0.6s', transform: 'rotate(1.5deg)' }}>
              <p className="text-sm font-semibold text-primary">₱500/hr</p>
              <p className="text-xs text-muted-foreground">GCash · Maya</p>
            </div>
          </div>
        </div>
      </section>

      {/* Partners Carousel */}
      <PartnersCarousel />

      {/* Features */}
      <section id="features" className="dot-grid relative mx-auto max-w-7xl px-6 py-24">
        <div className="relative z-10">
          <div className="mb-16 text-center">
            <span className="section-label mb-3 block">WHY COURTFLOW</span>
            <h2 className="font-heading text-3xl font-extrabold tracking-tight sm:text-4xl md:text-5xl">
              Everything you need to book and play.
            </h2>
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => (
              <div key={feature.title} className="group rounded-xl border border-border bg-card p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-primary/20 hover:shadow-lg">
                <div className={`mb-4 flex h-11 w-11 items-center justify-center rounded-xl ${feature.iconBg}`}>
                  <feature.icon className={`h-5 w-5 ${feature.iconColor}`} />
                </div>
                <h3 className="mb-2 text-base font-semibold tracking-tight">{feature.title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="bg-muted/50 py-24">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mb-16 text-center">
            <span className="section-label mb-3 block">HOW IT WORKS</span>
            <h2 className="font-heading text-3xl font-extrabold tracking-tight sm:text-4xl md:text-5xl">
              Three steps to game time.
            </h2>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {steps.map((step) => (
              <div key={step.number} className="rounded-xl border border-border bg-card p-8 text-center shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
                <span className="mb-4 block font-heading text-5xl font-extrabold text-primary/15">{step.number}</span>
                <h3 className="mb-3 text-lg font-semibold tracking-tight">{step.title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Browse Facilities */}
      {tenantCards.length > 0 && (
        <section className="mx-auto max-w-7xl px-6 py-24">
          <div className="mb-16 text-center">
            <span className="section-label mb-3 block">BROWSE FACILITIES</span>
            <h2 className="font-heading text-3xl font-extrabold tracking-tight sm:text-4xl md:text-5xl">
              Find a court near you.
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
              Explore facilities offering basketball, pickleball, tennis, volleyball, and more.
            </p>
          </div>
          <TenantCardGrid tenants={tenantCards} />
          <div className="mt-10 text-center">
            <Link href="/explore" className="inline-flex items-center gap-2 text-sm font-medium text-primary transition-colors hover:text-primary/80">
              View all facilities <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>
      )}

      {/* Testimonials */}
      <section className="dot-grid relative py-24">
        <div className="relative z-10 mx-auto max-w-7xl px-6">
          <div className="mb-16 text-center">
            <span className="section-label mb-3 block">WHAT PLAYERS SAY</span>
            <h2 className="font-heading text-3xl font-extrabold tracking-tight sm:text-4xl md:text-5xl">
              Loved by players and facility owners.
            </h2>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {testimonials.map((t, i) => (
              <div key={t.name} className="rounded-xl border border-border bg-card p-6 shadow-sm transition-all duration-300 hover:shadow-lg" style={{ transform: i === 0 ? 'rotate(-0.5deg)' : i === 2 ? 'rotate(0.5deg)' : 'translateY(-6px)', boxShadow: i === 1 ? '0 8px 24px rgba(0,0,0,0.08)' : undefined }}>
                <div className="mb-3 text-sm text-amber-400">★★★★★</div>
                <p className="mb-4 text-sm italic leading-relaxed text-muted-foreground">&ldquo;{t.quote}&rdquo;</p>
                <div className="flex items-center gap-3">
                  <div className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold text-white ${t.color}`}>{t.initial}</div>
                  <div>
                    <p className="text-sm font-semibold">{t.name}</p>
                    <p className="text-xs text-muted-foreground">{t.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="bg-muted/50 py-24">
        <div className="mx-auto max-w-2xl px-6">
          <div className="mb-16 text-center">
            <span className="section-label mb-3 block">FAQ</span>
            <h2 className="font-heading text-3xl font-extrabold tracking-tight sm:text-4xl">
              Frequently Asked Questions
            </h2>
          </div>
          <div className="space-y-3">
            {faqs.map((faq) => (
              <details key={faq.question} className="group rounded-lg border border-border bg-card shadow-sm [&_summary::-webkit-details-marker]:hidden">
                <summary className="flex cursor-pointer items-center justify-between px-5 py-4">
                  <span className="text-sm font-semibold">{faq.question}</span>
                  <span className="ml-4 shrink-0 text-muted-foreground transition-transform duration-200 group-open:rotate-45">+</span>
                </summary>
                <div className="border-t border-border px-5 py-4">
                  <p className="text-sm leading-relaxed text-muted-foreground">{faq.answer}</p>
                </div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="dot-grid-dark relative overflow-hidden bg-[#1a1a1a] py-24">
        <div className="relative z-10 mx-auto max-w-7xl px-6 text-center">
          <h2 className="font-heading text-3xl font-extrabold tracking-tight text-[#f5f0e8] sm:text-4xl md:text-5xl">
            Ready to Book Your Next Game?
          </h2>
          <p className="mx-auto mt-4 max-w-md text-base text-[#f5f0e8]/60">
            Join players who book in seconds — no phone calls, no hassle.
          </p>
          <div className="mt-8 flex items-center justify-center gap-3">
            <Link href={ctaHref} className="btn-primary px-6 py-3 text-sm">
              Get Started Free <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="#features" className="inline-flex items-center gap-2 rounded-md border border-white/15 bg-white/10 px-6 py-3 text-sm font-medium text-[#f5f0e8]/80 backdrop-blur-sm transition-all hover:bg-white/20">
              Learn More
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-6">
          <span className="text-xs text-muted-foreground">
            &copy; {new Date().getFullYear()} CourtFLOW
          </span>
          <div className="flex gap-6">
            {isOwner ? (
              <Link href={ctaHref} className="text-xs text-muted-foreground transition-colors hover:text-foreground">Dashboard</Link>
            ) : !user ? (
              <>
                <Link href="/login" className="text-xs text-muted-foreground transition-colors hover:text-foreground">Sign in</Link>
                <Link href="/signup" className="text-xs text-muted-foreground transition-colors hover:text-foreground">Sign up</Link>
              </>
            ) : null}
          </div>
        </div>
      </footer>
    </main>
  )
}
