import { requireTenantOwner } from '@/lib/tenant'
import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { Court } from '@/lib/types'

export default async function CourtDetailPage({
  params,
}: {
  params: Promise<{ slug: string; id: string }>
}) {
  const { slug, id } = await params
  await requireTenantOwner(slug)

  const supabase = await createClient()
  const { data: court } = await supabase
    .from('courts')
    .select('*')
    .eq('id', id)
    .single()

  if (!court) {
    notFound()
  }

  const typedCourt = court as Court

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">{typedCourt.name}</h1>
        <Badge variant={typedCourt.is_active ? 'default' : 'secondary'}>
          {typedCourt.is_active ? 'Active' : 'Inactive'}
        </Badge>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p><span className="font-medium">Sport:</span> {typedCourt.sport_type}</p>
            <p><span className="font-medium">Booking Mode:</span> {typedCourt.booking_mode === 'fixed_slot' ? 'Fixed Slots' : 'Flexible Duration'}</p>
            {typedCourt.booking_mode === 'fixed_slot' ? (
              <p><span className="font-medium">Slot Duration:</span> {typedCourt.slot_duration_minutes} minutes</p>
            ) : (
              <p><span className="font-medium">Duration Range:</span> {typedCourt.min_duration_minutes}-{typedCourt.max_duration_minutes} minutes</p>
            )}
            {typedCourt.description && <p>{typedCourt.description}</p>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Today&apos;s Schedule</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Booking schedule will be displayed here.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
