import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CalendarDays, MapPin, Users, Clock, Shield, Zap } from 'lucide-react'

const features = [
  {
    icon: MapPin,
    title: 'Multi-Court Management',
    description: 'Add and manage basketball, pickleball, volleyball, tennis courts and more from one dashboard.',
  },
  {
    icon: CalendarDays,
    title: 'Smart Booking',
    description: 'Fixed time slots or flexible duration — configure each court to match how your facility operates.',
  },
  {
    icon: Users,
    title: 'Membership Tiers',
    description: 'Create membership levels with perks like priority booking, discounts, and free hours.',
  },
  {
    icon: Clock,
    title: 'Waitlist',
    description: 'When slots fill up, customers can join a waitlist and get notified when a spot opens.',
  },
  {
    icon: Shield,
    title: 'Conflict-Free Booking',
    description: 'Server-side validation prevents double bookings. No more scheduling headaches.',
  },
  {
    icon: Zap,
    title: 'Instant Setup',
    description: 'Create your business, add courts, and start accepting bookings in minutes.',
  },
]

export default function HomePage() {
  return (
    <main>
      {/* Hero */}
      <section className="mx-auto max-w-6xl px-4 py-24 text-center">
        <h1 className="text-5xl font-bold tracking-tight sm:text-6xl">
          Court booking,
          <br />
          <span className="text-primary">simplified.</span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
          The all-in-one platform for court facility owners. Manage your courts, accept bookings, and build a loyal membership base — all from one place.
        </p>
        <div className="mt-8 flex items-center justify-center gap-4">
          <Link href="/signup">
            <Button size="lg" className="text-base">
              Start for free
            </Button>
          </Link>
          <Link href="/signup">
            <Button size="lg" variant="outline" className="text-base">
              See how it works
            </Button>
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-6xl px-4 pb-24">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <Card key={feature.title}>
              <CardHeader>
                <feature.icon className="h-8 w-8 text-primary" />
                <CardTitle className="mt-2">{feature.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{feature.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="border-t bg-muted/30">
        <div className="mx-auto max-w-6xl px-4 py-16 text-center">
          <h2 className="text-3xl font-bold tracking-tight">Ready to streamline your court bookings?</h2>
          <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
            Join court facility owners who are saving hours every week with CourtFLOW.
          </p>
          <Link href="/signup">
            <Button size="lg" className="mt-6">
              Get started — it&apos;s free
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8">
        <div className="mx-auto max-w-6xl px-4 text-center text-sm text-muted-foreground">
          &copy; {new Date().getFullYear()} CourtFLOW. All rights reserved.
        </div>
      </footer>
    </main>
  )
}
