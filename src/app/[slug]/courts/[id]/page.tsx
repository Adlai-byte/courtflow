import { getTenantBySlug } from '@/lib/tenant'
import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { BookingCalendar } from '@/components/booking/booking-calendar'
import type { Court } from '@/lib/types'

export default async function CourtBookingPage({
  params,
}: {
  params: Promise<{ slug: string; id: string }>
}) {
  const { slug, id } = await params
  const tenant = await getTenantBySlug(slug)

  const supabase = await createClient()
  const { data: court } = await supabase
    .from('courts')
    .select('*')
    .eq('id', id)
    .eq('is_active', true)
    .single()

  if (!court) {
    notFound()
  }

  const typedCourt = court as Court

  const { data: closures } = await supabase
    .from('court_closures')
    .select('date')
    .eq('court_id', id)

  const closureDates = (closures || []).map((c: { date: string }) => c.date)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{typedCourt.name}</h1>
        <div className="mt-2 flex items-center gap-2">
          <span className="inline-flex rounded border border-border px-2 py-0.5 font-mono text-xs text-muted-foreground">
            {typedCourt.sport_type}
          </span>
          <span className="inline-flex rounded border border-border px-2 py-0.5 font-mono text-xs text-muted-foreground">
            {typedCourt.booking_mode === 'fixed_slot'
              ? `${typedCourt.slot_duration_minutes}min slots`
              : `${typedCourt.min_duration_minutes}-${typedCourt.max_duration_minutes}min`}
          </span>
        </div>
        {typedCourt.description && (
          <p className="mt-2 text-sm text-muted-foreground">{typedCourt.description}</p>
        )}
      </div>

      <BookingCalendar court={typedCourt} tenantId={tenant.id} slug={slug} closureDates={closureDates} />
    </div>
  )
}
