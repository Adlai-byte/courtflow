import { notFound } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import { KpiCard } from '@/components/analytics/kpi-card'
import { Card, CardContent } from '@/components/ui/card'
import Link from 'next/link'
import { ArrowLeft, CalendarDays, Crown, Landmark } from 'lucide-react'
import { TenantEditForm } from './tenant-edit-form'
import { TenantDeleteButton } from './tenant-delete-button'

export default async function AdminTenantDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = createAdminClient()

  const { data: tenant } = await supabase
    .from('tenants')
    .select('*, profiles:owner_id ( full_name )')
    .eq('id', id)
    .single()

  if (!tenant) notFound()

  const [
    { data: courts },
    { count: bookingCount },
    { count: memberCount },
    { data: recentBookings },
  ] = await Promise.all([
    supabase
      .from('courts')
      .select('id, name, sport_type, booking_mode, is_active')
      .eq('tenant_id', id)
      .order('created_at', { ascending: false }),
    supabase
      .from('bookings')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', id)
      .in('status', ['confirmed', 'completed']),
    supabase
      .from('member_subscriptions')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', id)
      .eq('status', 'active'),
    supabase
      .from('bookings')
      .select('id, date, start_time, end_time, status, courts ( name ), profiles:customer_id ( full_name )')
      .eq('tenant_id', id)
      .order('created_at', { ascending: false })
      .limit(10),
  ])

  return (
    <div className="space-y-8">
      {/* Back link + header */}
      <div>
        <Link
          href="/admin/tenants"
          className="mb-4 inline-flex items-center gap-1 font-mono text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-3 w-3" /> Back to Tenants
        </Link>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <span className="section-label mb-2 block">[ TENANT DETAIL ]</span>
            <h1 className="text-2xl font-bold tracking-tight">{tenant.name}</h1>
            <p className="mt-1 font-mono text-sm text-muted-foreground">
              /{tenant.slug} &middot; Owner: {(tenant.profiles as any)?.full_name ?? '—'} &middot; Created {new Date(tenant.created_at).toLocaleDateString()}
            </p>
          </div>
          <TenantDeleteButton tenantId={tenant.id} tenantName={tenant.name} />
        </div>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 grid-cols-3">
        <KpiCard label="Courts" value={courts?.length ?? 0} icon={Landmark} />
        <KpiCard label="Bookings" value={bookingCount ?? 0} icon={CalendarDays} />
        <KpiCard label="Active Members" value={memberCount ?? 0} icon={Crown} />
      </div>

      {/* Edit form */}
      <div>
        <span className="section-label mb-4 block">[ EDIT TENANT ]</span>
        <Card>
          <CardContent className="p-6">
            <TenantEditForm tenant={tenant} />
          </CardContent>
        </Card>
      </div>

      {/* Courts list */}
      <div>
        <span className="section-label mb-4 block">[ COURTS ]</span>
        <Card>
          <CardContent className="p-0">
            <div className="hidden md:block">
              <table className="w-full">
                <thead>
                  <tr className="border-b text-left">
                    <th className="px-4 py-3 font-mono text-xs uppercase tracking-wider text-muted-foreground">Name</th>
                    <th className="px-4 py-3 font-mono text-xs uppercase tracking-wider text-muted-foreground">Sport</th>
                    <th className="px-4 py-3 font-mono text-xs uppercase tracking-wider text-muted-foreground">Mode</th>
                    <th className="px-4 py-3 font-mono text-xs uppercase tracking-wider text-muted-foreground">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {(courts ?? []).map((c: any) => (
                    <tr key={c.id} className="border-b last:border-0">
                      <td className="px-4 py-3 text-sm font-medium">{c.name}</td>
                      <td className="px-4 py-3 text-sm capitalize">{c.sport_type}</td>
                      <td className="px-4 py-3 font-mono text-xs">{c.booking_mode}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex rounded-full px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider ${c.is_active ? 'bg-green/10 text-green' : 'bg-destructive/10 text-destructive'}`}>
                          {c.is_active ? 'active' : 'inactive'}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {(courts ?? []).length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-4 py-8 text-center text-sm text-muted-foreground">
                        No courts
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="divide-y md:hidden">
              {(courts ?? []).map((c: any) => (
                <div key={c.id} className="flex items-center justify-between px-4 py-3">
                  <div>
                    <p className="text-sm font-medium">{c.name}</p>
                    <p className="font-mono text-xs text-muted-foreground capitalize">{c.sport_type} &middot; {c.booking_mode}</p>
                  </div>
                  <span className={`inline-flex rounded-full px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider ${c.is_active ? 'bg-green/10 text-green' : 'bg-destructive/10 text-destructive'}`}>
                    {c.is_active ? 'active' : 'inactive'}
                  </span>
                </div>
              ))}
              {(courts ?? []).length === 0 && (
                <div className="px-4 py-8 text-center text-sm text-muted-foreground">No courts</div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent bookings */}
      <div>
        <span className="section-label mb-4 block">[ RECENT BOOKINGS ]</span>
        <Card>
          <CardContent className="p-0">
            <div className="hidden md:block">
              <table className="w-full">
                <thead>
                  <tr className="border-b text-left">
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
                      <td colSpan={5} className="px-4 py-8 text-center text-sm text-muted-foreground">
                        No bookings
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="divide-y md:hidden">
              {(recentBookings ?? []).map((b: any) => (
                <div key={b.id} className="flex items-center justify-between px-4 py-3">
                  <div>
                    <p className="text-sm font-medium">{b.courts?.name ?? '—'}</p>
                    <p className="text-xs text-muted-foreground">{b.profiles?.full_name ?? '—'}</p>
                    <p className="font-mono text-xs text-muted-foreground">{b.date} {b.start_time?.slice(0, 5)}–{b.end_time?.slice(0, 5)}</p>
                  </div>
                  <StatusBadge status={b.status} />
                </div>
              ))}
              {(recentBookings ?? []).length === 0 && (
                <div className="px-4 py-8 text-center text-sm text-muted-foreground">No bookings</div>
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
