import Link from 'next/link'
import { ArrowRight, CalendarDays, MapPin, Users, Clock, Shield, Zap } from 'lucide-react'

const features = [
  {
    icon: MapPin,
    title: 'Multi-Court Management',
    description: 'Basketball, pickleball, volleyball, tennis — manage every court type from one unified dashboard.',
  },
  {
    icon: CalendarDays,
    title: 'Smart Booking',
    description: 'Fixed time slots or flexible duration. Configure each court to match how your facility actually operates.',
  },
  {
    icon: Users,
    title: 'Membership Tiers',
    description: 'Create membership levels with perks like priority booking, discounts, and complimentary hours.',
  },
  {
    icon: Clock,
    title: 'Automatic Waitlist',
    description: 'When slots fill up, customers join a waitlist and get notified the moment a spot opens.',
  },
  {
    icon: Shield,
    title: 'Conflict-Free',
    description: 'Server-side validation prevents double bookings. No more scheduling headaches or manual conflict resolution.',
  },
  {
    icon: Zap,
    title: 'Instant Setup',
    description: 'Create your business, add courts, set operating hours, and start accepting bookings in minutes.',
  },
]

const steps = [
  {
    number: '01',
    title: 'Create your business',
    description: 'Sign up and set up your facility profile with a unique URL your customers will use to book.',
  },
  {
    number: '02',
    title: 'Add your courts',
    description: 'Define court types, operating hours, pricing, and booking rules for each court you manage.',
  },
  {
    number: '03',
    title: 'Accept bookings',
    description: 'Share your booking page. Customers pick a court, choose a time, and reserve — all conflict-free.',
  },
]

export default function HomePage() {
  return (
    <main>
      {/* Hero */}
      <section className="mx-auto max-w-7xl px-6 pb-24 pt-20">
        <div className="mb-8">
          <span className="section-label">[ COURT MANAGEMENT ]</span>
        </div>
        <h1 className="max-w-4xl text-5xl font-bold leading-[1.08] tracking-tight sm:text-7xl">
          Stop juggling spreadsheets.
          <br />
          <span className="text-primary">Start booking courts.</span>
        </h1>
        <p className="mt-8 max-w-xl text-lg leading-relaxed text-muted-foreground">
          The all-in-one platform for court facility owners. Manage your courts,
          accept bookings, build a loyal membership base — all from one place.
        </p>
        <div className="mt-10 flex items-center gap-5">
          <Link
            href="/signup"
            className="cta-button rounded-none"
          >
            Get started for free <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="#how-it-works"
            className="font-mono text-sm text-muted-foreground underline decoration-border underline-offset-4 transition-colors hover:text-foreground"
          >
            See how it works
          </Link>
        </div>
      </section>

      {/* Divider */}
      <div className="mx-auto max-w-7xl px-6">
        <div className="h-px bg-border" />
      </div>

      {/* Features */}
      <section id="features" className="mx-auto max-w-7xl px-6 py-24">
        <div className="mb-12">
          <span className="section-label">[ FEATURES ]</span>
        </div>
        <h2 className="mb-16 max-w-3xl text-3xl font-bold tracking-tight sm:text-4xl">
          Everything you need to run a court facility. Nothing you don&apos;t.
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
          Up and running in three steps.
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

      {/* CTA */}
      <section className="mx-auto max-w-7xl px-6 py-24">
        <div className="flex flex-col items-start gap-8 md:flex-row md:items-center md:justify-between">
          <div>
            <span className="section-label mb-4 block">[ GET STARTED ]</span>
            <h2 className="max-w-lg text-3xl font-bold tracking-tight sm:text-4xl">
              Ready to streamline your court bookings?
            </h2>
            <p className="mt-4 max-w-md text-muted-foreground">
              Join court facility owners who are saving hours every week.
            </p>
          </div>
          <Link
            href="/signup"
            className="cta-button shrink-0 rounded-none"
          >
            Start for free <ArrowRight className="h-4 w-4" />
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
            <Link href="/login" className="font-mono text-xs text-muted-foreground transition-colors hover:text-foreground">
              Sign in
            </Link>
            <Link href="/signup" className="font-mono text-xs text-muted-foreground transition-colors hover:text-foreground">
              Sign up
            </Link>
          </div>
        </div>
      </footer>
    </main>
  )
}
