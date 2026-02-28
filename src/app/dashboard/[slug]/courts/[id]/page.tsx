import { requireTenantOwner } from '@/lib/tenant'
import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import type { Court, CourtClosure } from '@/lib/types'
import { OperatingHoursEditor } from '@/components/dashboard/operating-hours-editor'
import { ClosuresEditor } from '@/components/dashboard/closures-editor'

export default async function CourtDetailPage({
  params,
}: {
  params: Promise<{ slug: string; id: string }>
}) {
  const { slug, id } = await params
  const { tenant } = await requireTenantOwner(slug)

  const supabase = await createClient()
  const { data: court } = await supabase
    .from('courts')
    .select('*')
    .eq('id', id)
    .eq('tenant_id', tenant.id)
    .single()

  if (!court) {
    notFound()
  }

  const typedCourt = court as Court

  const { data: closures } = await supabase
    .from('court_closures')
    .select('*')
    .eq('court_id', id)
    .order('date', { ascending: true })

  return (
    <div className="space-y-6">
      <div>
        <span className="section-label block">[ COURT SETTINGS ]</span>
        <h1 className="mt-2 text-2xl font-bold tracking-tight">{typedCourt.name}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {typedCourt.sport_type} · {typedCourt.booking_mode === 'fixed_slot' ? `${typedCourt.slot_duration_minutes}min slots` : 'Flexible duration'}
        </p>
      </div>

      <Card>
        <CardContent className="p-4 md:p-6">
          <span className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
            Operating Hours
          </span>
          <div className="mt-4">
            <OperatingHoursEditor
              courtId={typedCourt.id}
              slug={slug}
              initialHours={typedCourt.operating_hours}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4 md:p-6">
          <span className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
            Closure Dates
          </span>
          <div className="mt-4">
            <ClosuresEditor
              courtId={typedCourt.id}
              slug={slug}
              initialClosures={(closures || []) as CourtClosure[]}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
