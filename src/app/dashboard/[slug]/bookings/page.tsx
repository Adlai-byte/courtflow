import { requireTenantOwner } from '@/lib/tenant'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent } from '@/components/ui/card'
import { OwnerCancelButton } from '@/components/dashboard/owner-cancel-button'

const statusColors: Record<string, string> = {
  confirmed: 'bg-green/10 text-green border-green/20',
  completed: 'bg-muted text-muted-foreground border-border',
  cancelled: 'bg-destructive/10 text-destructive border-destructive/20',
  no_show: 'bg-amber-100 text-amber-700 border-amber-200',
}

export default async function BookingsPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const { tenant } = await requireTenantOwner(slug)

  const supabase = await createClient()
  const { data: bookings } = await supabase
    .from('bookings')
    .select('*, courts ( name ), profiles:customer_id ( full_name )')
    .eq('tenant_id', tenant.id)
    .order('date', { ascending: false })
    .order('start_time', { ascending: true })
    .limit(50)

  return (
    <div className="space-y-6">
      <span className="section-label block">[ BOOKINGS ]</span>
      <h1 className="text-2xl font-bold tracking-tight">Bookings</h1>

      <Card>
        <CardContent className="p-0">
          {(!bookings || bookings.length === 0) ? (
            <div className="flex items-center justify-center py-12">
              <p className="text-sm text-muted-foreground">No bookings yet.</p>
            </div>
          ) : (
            <>
              <div className="hidden md:block">
                <table className="w-full">
                  <thead>
                    <tr className="border-b text-left">
                      <th className="p-4 font-mono text-xs uppercase tracking-wider text-muted-foreground font-medium">Date</th>
                      <th className="p-4 font-mono text-xs uppercase tracking-wider text-muted-foreground font-medium">Time</th>
                      <th className="p-4 font-mono text-xs uppercase tracking-wider text-muted-foreground font-medium">Court</th>
                      <th className="p-4 font-mono text-xs uppercase tracking-wider text-muted-foreground font-medium">Customer</th>
                      <th className="p-4 font-mono text-xs uppercase tracking-wider text-muted-foreground font-medium">Status</th>
                      <th className="p-4 font-mono text-xs uppercase tracking-wider text-muted-foreground font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bookings.map((booking: any, i: number) => (
                      <tr key={booking.id} className={i % 2 === 1 ? 'bg-muted/30' : ''}>
                        <td className="p-4 font-mono text-sm">{booking.date}</td>
                        <td className="p-4 font-mono text-sm">{booking.start_time}–{booking.end_time}</td>
                        <td className="p-4 text-sm">{booking.courts?.name}</td>
                        <td className="p-4 text-sm">{booking.profiles?.full_name || 'Unknown'}</td>
                        <td className="p-4">
                          <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium ${statusColors[booking.status] || ''}`}>
                            {booking.status}
                          </span>
                          {booking.recurring_series_id && (
                            <span className="ml-1 inline-flex rounded-full border border-primary/20 bg-primary/5 px-2 py-0.5 text-xs font-medium text-primary">
                              recurring
                            </span>
                          )}
                        </td>
                        <td className="p-4">
                          {booking.status === 'confirmed' && (
                            <OwnerCancelButton bookingId={booking.id} slug={slug} />
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="space-y-2 p-3 md:hidden">
                {bookings.map((booking: any) => (
                  <div key={booking.id} className="rounded-lg border bg-card p-3 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{booking.profiles?.full_name || 'Unknown'}</span>
                      <div className="flex items-center gap-1">
                        <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${statusColors[booking.status] || ''}`}>
                          {booking.status}
                        </span>
                        {booking.recurring_series_id && (
                          <span className="inline-flex rounded-full border border-primary/20 bg-primary/5 px-2 py-0.5 text-xs font-medium text-primary">
                            recurring
                          </span>
                        )}
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">{booking.courts?.name}</p>
                    <p className="font-mono text-xs text-muted-foreground">{booking.date} · {booking.start_time}–{booking.end_time}</p>
                    {booking.status === 'confirmed' && (
                      <OwnerCancelButton bookingId={booking.id} slug={slug} />
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
