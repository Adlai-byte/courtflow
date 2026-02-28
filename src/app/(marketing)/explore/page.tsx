import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { ExploreList } from '@/components/explore/explore-list'
import type { TenantCard } from '@/components/explore/explore-list'
import type { SportType, VenueType, CourtAmenities } from '@/lib/types'

export const metadata = {
  title: 'Explore Facilities',
  description: 'Browse basketball, pickleball, tennis, volleyball, and badminton courts available to book.',
}

export default async function ExplorePage() {
  const supabase = await createClient()

  const { data: tenants } = await supabase
    .from('tenants')
    .select('*, courts(sport_type, is_active, amenities)')
    .order('name')

  const cards: TenantCard[] = (tenants ?? []).map((t) => {
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
      courtCount: activeCourts.length,
      sportTypes,
      venueTypes,
    }
  })

  return (
    <main className="mx-auto max-w-7xl px-6 py-16">
      <Link
        href="/"
        className="group mb-8 inline-flex items-center gap-1.5 font-mono text-xs text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5" />
        Back to home
      </Link>
      <div className="mb-12">
        <span className="section-label">[ EXPLORE ]</span>
      </div>
      <h1 className="mb-4 text-3xl font-bold tracking-tight sm:text-4xl">
        Browse Facilities
      </h1>
      <p className="mb-10 max-w-xl text-muted-foreground">
        Find courts for basketball, pickleball, tennis, volleyball, and more. Pick a facility and book your next game.
      </p>
      <ExploreList tenants={cards} />
    </main>
  )
}
