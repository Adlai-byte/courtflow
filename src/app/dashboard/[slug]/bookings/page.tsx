import { requireTenantOwner } from '@/lib/tenant'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent } from '@/components/ui/card'
import { OwnerBookingActions } from '@/components/dashboard/owner-booking-actions'
import { ApproveSeriesButton } from '@/components/dashboard/approve-series-button'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { toSlotLabel, formatDate } from '@/lib/time-format'

const statusColors: Record<string, string> = {
  pending: 'bg-amber-50 text-amber-700 border-amber-200',
  confirmed: 'bg-green/10 text-green border-green/20',
  completed: 'bg-muted text-muted-foreground border-border',
  cancelled: 'bg-destructive/10 text-destructive border-destructive/20',
  no_show: 'bg-amber-100 text-amber-700 border-amber-200',
}

const STATUS_FILTERS = [
  { label: 'All', value: 'all' },
  { label: 'Pending', value: 'pending' },
  { label: 'Confirmed', value: 'confirmed' },
  { label: 'Cancelled', value: 'cancelled' },
] as const

export default async function BookingsPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ status?: string }>
}) {
  const { slug } = await params
  const { status: statusFilter } = await searchParams
  const activeFilter = statusFilter || 'all'
  const { tenant } = await requireTenantOwner(slug)

  const supabase = await createClient()
  let query = supabase
    .from('bookings')
    .select('*, courts ( name ), profiles:customer_id ( full_name )')
    .eq('tenant_id', tenant.id)
    .order('date', { ascending: false })
    .order('start_time', { ascending: true })
    .limit(50)

  if (activeFilter !== 'all') {
    query = query.eq('status', activeFilter)
  }

  const { data: bookings } = await query

  return (
    <div className="space-y-6">
      <span className="section-label block">[ BOOKINGS ]</span>
      <h1 className="text-2xl font-bold tracking-tight">Bookings</h1>

      {/* Filter tabs */}
      <div className="flex gap-1 rounded-lg border bg-card p-1 w-fit">
        {STATUS_FILTERS.map((f) => {
          const href = f.value === 'all'
            ? `/dashboard/${slug}/bookings`
            : `/dashboard/${slug}/bookings?status=${f.value}`
          return (
            <Link
              key={f.value}
              href={href}
              className={cn(
                'rounded-md px-3 py-1.5 font-mono text-xs transition-colors',
                activeFilter === f.value
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {f.label}
            </Link>
          )
        })}
      </div>

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
                        <td className="p-4 font-mono text-sm">{formatDate(booking.date)}</td>
                        <td className="p-4 font-mono text-sm">{toSlotLabel(booking.start_time, booking.end_time)}</td>
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
                          <div className="flex items-center gap-1">
                            <OwnerBookingActions bookingId={booking.id} slug={slug} status={booking.status} />
                            {booking.status === 'pending' && booking.recurring_series_id && (
                              <ApproveSeriesButton seriesId={booking.recurring_series_id} slug={slug} />
                            )}
                          </div>
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
                    <p className="font-mono text-xs text-muted-foreground">{formatDate(booking.date)} · {toSlotLabel(booking.start_time, booking.end_time)}</p>
                    <div className="flex items-center gap-1">
                      <OwnerBookingActions bookingId={booking.id} slug={slug} status={booking.status} />
                      {booking.status === 'pending' && booking.recurring_series_id && (
                        <ApproveSeriesButton seriesId={booking.recurring_series_id} slug={slug} />
                      )}
                    </div>
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
