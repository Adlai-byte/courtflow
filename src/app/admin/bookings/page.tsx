import { createAdminClient } from '@/lib/supabase/admin'
import { Card, CardContent } from '@/components/ui/card'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { CancelBookingButton } from './cancel-booking-button'

const STATUS_FILTERS = [
  { label: 'All', value: 'all' },
  { label: 'Confirmed', value: 'confirmed' },
  { label: 'Completed', value: 'completed' },
  { label: 'Cancelled', value: 'cancelled' },
] as const

export default async function AdminBookingsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>
}) {
  const { status: statusFilter } = await searchParams
  const activeFilter = statusFilter || 'all'
  const supabase = createAdminClient()

  let query = supabase
    .from('bookings')
    .select('id, date, start_time, end_time, status, courts ( name ), profiles:customer_id ( full_name ), tenants:tenant_id ( name, slug )')
    .order('created_at', { ascending: false })
    .limit(100)

  if (activeFilter !== 'all') {
    query = query.eq('status', activeFilter)
  }

  const { data: bookings } = await query

  return (
    <div className="space-y-8">
      <div>
        <span className="section-label mb-2 block">[ BOOKINGS ]</span>
        <h1 className="text-2xl font-bold tracking-tight">All Bookings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {bookings?.length ?? 0} {(bookings?.length ?? 0) === 1 ? 'booking' : 'bookings'}
          {activeFilter !== 'all' && ` (${STATUS_FILTERS.find(f => f.value === activeFilter)?.label})`}
        </p>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 rounded-lg border bg-card p-1 w-fit">
        {STATUS_FILTERS.map((f) => (
          <Link
            key={f.value}
            href={f.value === 'all' ? '/admin/bookings' : `/admin/bookings?status=${f.value}`}
            className={cn(
              'rounded-md px-3 py-1.5 font-mono text-xs transition-colors',
              activeFilter === f.value
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {f.label}
          </Link>
        ))}
      </div>

      <Card>
        <CardContent className="p-0">
          {/* Desktop table */}
          <div className="hidden md:block">
            <table className="w-full">
              <thead>
                <tr className="border-b text-left">
                  <th className="px-4 py-3 font-mono text-xs uppercase tracking-wider text-muted-foreground">Tenant</th>
                  <th className="px-4 py-3 font-mono text-xs uppercase tracking-wider text-muted-foreground">Customer</th>
                  <th className="px-4 py-3 font-mono text-xs uppercase tracking-wider text-muted-foreground">Court</th>
                  <th className="px-4 py-3 font-mono text-xs uppercase tracking-wider text-muted-foreground">Date</th>
                  <th className="px-4 py-3 font-mono text-xs uppercase tracking-wider text-muted-foreground">Time</th>
                  <th className="px-4 py-3 font-mono text-xs uppercase tracking-wider text-muted-foreground">Status</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {(bookings ?? []).map((b: any) => (
                  <tr key={b.id} className="border-b last:border-0">
                    <td className="px-4 py-3 text-sm">{b.tenants?.name ?? '—'}</td>
                    <td className="px-4 py-3 text-sm">{b.profiles?.full_name ?? '—'}</td>
                    <td className="px-4 py-3 text-sm">{b.courts?.name ?? '—'}</td>
                    <td className="px-4 py-3 text-sm font-mono">{b.date}</td>
                    <td className="px-4 py-3 text-sm font-mono">{b.start_time?.slice(0, 5)}–{b.end_time?.slice(0, 5)}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={b.status} />
                    </td>
                    <td className="px-4 py-3">
                      {b.status === 'confirmed' && (
                        <CancelBookingButton bookingId={b.id} />
                      )}
                    </td>
                  </tr>
                ))}
                {(bookings ?? []).length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-sm text-muted-foreground">
                      No bookings found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="divide-y md:hidden">
            {(bookings ?? []).map((b: any) => (
              <div key={b.id} className="px-4 py-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{b.courts?.name ?? '—'}</p>
                    <p className="text-xs text-muted-foreground">
                      {b.tenants?.name} &middot; {b.profiles?.full_name ?? '—'}
                    </p>
                    <p className="font-mono text-xs text-muted-foreground">
                      {b.date} {b.start_time?.slice(0, 5)}–{b.end_time?.slice(0, 5)}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <StatusBadge status={b.status} />
                    {b.status === 'confirmed' && (
                      <CancelBookingButton bookingId={b.id} />
                    )}
                  </div>
                </div>
              </div>
            ))}
            {(bookings ?? []).length === 0 && (
              <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                No bookings found
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    confirmed: 'bg-green/10 text-green',
    completed: 'bg-primary/10 text-primary',
    cancelled: 'bg-destructive/10 text-destructive',
    no_show: 'bg-muted text-muted-foreground',
  }

  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider ${styles[status] ?? styles.no_show}`}>
      {status}
    </span>
  )
}
