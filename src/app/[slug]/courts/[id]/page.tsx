import { getTenantBySlug } from '@/lib/tenant'
import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { AmenityChips } from '@/components/booking/amenity-chips'
import type { Court } from '@/lib/types'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowLeft, CalendarDays } from 'lucide-react'

const dayLabels = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const dayKeys = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']

export default async function CourtInfoPage({
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

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Link
        href={`/${slug}`}
        className="inline-flex items-center gap-1 font-mono text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-3 w-3" />
        Back to {tenant.name}
      </Link>

      {typedCourt.image_url && (
        <div className="aspect-video w-full overflow-hidden rounded-lg border border-border">
          <img src={typedCourt.image_url} alt={typedCourt.name} className="h-full w-full object-cover" />
        </div>
      )}

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
          <p className="mt-3 text-sm text-muted-foreground">{typedCourt.description}</p>
        )}
        {typedCourt.amenities && Object.keys(typedCourt.amenities).length > 0 && (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <AmenityChips amenities={typedCourt.amenities} />
          </div>
        )}
      </div>

      {/* Operating hours */}
      <div>
        <span className="section-label block">[ OPERATING HOURS ]</span>
        <div className="mt-3 rounded-lg border border-border overflow-hidden">
          {dayKeys.map((key, idx) => {
            const hours = typedCourt.operating_hours[key]
            return (
              <div
                key={key}
                className={`flex items-center justify-between px-4 py-2 font-mono text-sm ${
                  idx < dayKeys.length - 1 ? 'border-b border-border' : ''
                }`}
              >
                <span className="text-muted-foreground">{dayLabels[idx]}</span>
                <span>
                  {hours ? `${hours.open} – ${hours.close}` : (
                    <span className="text-muted-foreground/50">Closed</span>
                  )}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      <Link href={`/${slug}`}>
        <Button className="w-full font-mono text-xs uppercase tracking-wider">
          <CalendarDays className="mr-2 h-4 w-4" />
          View Schedule & Book
        </Button>
      </Link>
    </div>
  )
}
