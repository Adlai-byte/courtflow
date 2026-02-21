import { createAdminClient } from '@/lib/supabase/admin'
import { KpiCard } from '@/components/analytics/kpi-card'
import { Building2, Users, CalendarDays, Crown } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'

export default async function AdminOverviewPage() {
  const supabase = createAdminClient()

  const [
    { count: tenantCount },
    { count: userCount },
    { count: bookingCount },
    { count: memberCount },
    { data: recentBookings },
  ] = await Promise.all([
    supabase.from('tenants').select('id', { count: 'exact', head: true }),
    supabase.from('profiles').select('id', { count: 'exact', head: true }),
    supabase.from('bookings').select('id', { count: 'exact', head: true }).in('status', ['pending', 'confirmed', 'completed']),
    supabase.from('member_subscriptions').select('id', { count: 'exact', head: true }).eq('status', 'active'),
    supabase
      .from('bookings')
      .select('id, date, start_time, end_time, status, courts ( name ), profiles:customer_id ( full_name ), tenants:tenant_id ( name )')
      .order('created_at', { ascending: false })
      .limit(10),
  ])

  return (
    <div className="space-y-8">
      <div>
        <span className="section-label mb-2 block">[ PLATFORM OVERVIEW ]</span>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Tenants" value={tenantCount ?? 0} icon={Building2} />
        <KpiCard label="Users" value={userCount ?? 0} icon={Users} />
        <KpiCard label="Bookings" value={bookingCount ?? 0} icon={CalendarDays} />
        <KpiCard label="Active Members" value={memberCount ?? 0} icon={Crown} />
      </div>

      {/* Recent Bookings */}
      <div>
        <span className="section-label mb-4 block">[ RECENT BOOKINGS ]</span>
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
                  </tr>
                </thead>
                <tbody>
                  {(recentBookings ?? []).map((b: any) => (
                    <tr key={b.id} className="border-b last:border-0">
                      <td className="px-4 py-3 text-sm">{b.tenants?.name ?? '—'}</td>
                      <td className="px-4 py-3 text-sm">{b.profiles?.full_name ?? '—'}</td>
                      <td className="px-4 py-3 text-sm">{b.courts?.name ?? '—'}</td>
                      <td className="px-4 py-3 text-sm font-mono">{b.date}</td>
                      <td className="px-4 py-3 text-sm font-mono">{b.start_time?.slice(0, 5)}–{b.end_time?.slice(0, 5)}</td>
                      <td className="px-4 py-3">
                        <StatusBadge status={b.status} />
                      </td>
                    </tr>
                  ))}
                  {(recentBookings ?? []).length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-sm text-muted-foreground">
                        No bookings yet
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="divide-y md:hidden">
              {(recentBookings ?? []).map((b: any) => (
                <div key={b.id} className="flex items-center justify-between px-4 py-3">
                  <div>
                    <p className="text-sm font-medium">{b.courts?.name ?? '—'}</p>
                    <p className="text-xs text-muted-foreground">
                      {b.tenants?.name} &middot; {b.profiles?.full_name ?? '—'}
                    </p>
                    <p className="font-mono text-xs text-muted-foreground">
                      {b.date} {b.start_time?.slice(0, 5)}–{b.end_time?.slice(0, 5)}
                    </p>
                  </div>
                  <StatusBadge status={b.status} />
                </div>
              ))}
              {(recentBookings ?? []).length === 0 && (
                <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                  No bookings yet
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    pending: 'bg-amber-50 text-amber-700',
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
