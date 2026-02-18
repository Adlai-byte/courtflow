import { notFound } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import { Card, CardContent } from '@/components/ui/card'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { UserRoleChanger } from './user-role-changer'
import { UserDeleteButton } from './user-delete-button'
import type { UserRole } from '@/lib/types'

export default async function AdminUserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = createAdminClient()

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', id)
    .single()

  if (!profile) notFound()

  const { data: authData } = await supabase.auth.admin.getUserById(id)
  const email = authData?.user?.email ?? '—'

  // Fetch contextual data based on role
  let tenant = null
  let recentBookings: any[] = []
  let memberships: any[] = []

  if (profile.role === 'business_owner') {
    const { data } = await supabase
      .from('tenants')
      .select('id, name, slug, created_at')
      .eq('owner_id', id)
      .limit(1)
      .single()
    tenant = data
  }

  if (profile.role === 'customer') {
    const [bookingsRes, membershipsRes] = await Promise.all([
      supabase
        .from('bookings')
        .select('id, date, start_time, end_time, status, courts ( name ), tenants:tenant_id ( name )')
        .eq('customer_id', id)
        .order('created_at', { ascending: false })
        .limit(10),
      supabase
        .from('member_subscriptions')
        .select('id, status, start_date, end_date, membership_tiers:tier_id ( name ), tenants:tenant_id ( name )')
        .eq('customer_id', id)
        .order('created_at', { ascending: false }),
    ])
    recentBookings = bookingsRes.data ?? []
    memberships = membershipsRes.data ?? []
  }

  return (
    <div className="space-y-8">
      {/* Back link + header */}
      <div>
        <Link
          href="/admin/users"
          className="mb-4 inline-flex items-center gap-1 font-mono text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-3 w-3" /> Back to Users
        </Link>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <span className="section-label mb-2 block">[ USER DETAIL ]</span>
            <h1 className="text-2xl font-bold tracking-tight">{profile.full_name ?? 'Unnamed User'}</h1>
            <p className="mt-1 font-mono text-sm text-muted-foreground">
              {email} &middot; Joined {new Date(profile.created_at).toLocaleDateString()}
            </p>
          </div>
          <UserDeleteButton userId={profile.id} userName={profile.full_name ?? email} />
        </div>
      </div>

      {/* Role management */}
      <div>
        <span className="section-label mb-4 block">[ ROLE ]</span>
        <Card>
          <CardContent className="p-6">
            <UserRoleChanger userId={profile.id} currentRole={profile.role as UserRole} />
          </CardContent>
        </Card>
      </div>

      {/* Business owner: show tenant */}
      {profile.role === 'business_owner' && (
        <div>
          <span className="section-label mb-4 block">[ TENANT ]</span>
          <Card>
            <CardContent className="p-6">
              {tenant ? (
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{tenant.name}</p>
                    <p className="font-mono text-xs text-muted-foreground">/{tenant.slug} &middot; Created {new Date(tenant.created_at).toLocaleDateString()}</p>
                  </div>
                  <Link
                    href={`/admin/tenants/${tenant.id}`}
                    className="font-mono text-xs text-primary transition-colors hover:text-primary/80"
                  >
                    Manage
                  </Link>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No tenant associated with this user.</p>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Customer: show memberships */}
      {profile.role === 'customer' && memberships.length > 0 && (
        <div>
          <span className="section-label mb-4 block">[ MEMBERSHIPS ]</span>
          <Card>
            <CardContent className="p-0">
              <div className="divide-y">
                {memberships.map((m: any) => (
                  <div key={m.id} className="flex items-center justify-between px-4 py-3">
                    <div>
                      <p className="text-sm font-medium">{(m.membership_tiers as any)?.name ?? '—'}</p>
                      <p className="font-mono text-xs text-muted-foreground">
                        {(m.tenants as any)?.name ?? '—'} &middot; {m.start_date}{m.end_date ? ` → ${m.end_date}` : ''}
                      </p>
                    </div>
                    <SubscriptionBadge status={m.status} />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Customer: show recent bookings */}
      {profile.role === 'customer' && (
        <div>
          <span className="section-label mb-4 block">[ RECENT BOOKINGS ]</span>
          <Card>
            <CardContent className="p-0">
              <div className="hidden md:block">
                <table className="w-full">
                  <thead>
                    <tr className="border-b text-left">
                      <th className="px-4 py-3 font-mono text-xs uppercase tracking-wider text-muted-foreground">Tenant</th>
                      <th className="px-4 py-3 font-mono text-xs uppercase tracking-wider text-muted-foreground">Court</th>
                      <th className="px-4 py-3 font-mono text-xs uppercase tracking-wider text-muted-foreground">Date</th>
                      <th className="px-4 py-3 font-mono text-xs uppercase tracking-wider text-muted-foreground">Time</th>
                      <th className="px-4 py-3 font-mono text-xs uppercase tracking-wider text-muted-foreground">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentBookings.map((b: any) => (
                      <tr key={b.id} className="border-b last:border-0">
                        <td className="px-4 py-3 text-sm">{(b.tenants as any)?.name ?? '—'}</td>
                        <td className="px-4 py-3 text-sm">{(b.courts as any)?.name ?? '—'}</td>
                        <td className="px-4 py-3 text-sm font-mono">{b.date}</td>
                        <td className="px-4 py-3 text-sm font-mono">{b.start_time?.slice(0, 5)}–{b.end_time?.slice(0, 5)}</td>
                        <td className="px-4 py-3">
                          <StatusBadge status={b.status} />
                        </td>
                      </tr>
                    ))}
                    {recentBookings.length === 0 && (
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
                {recentBookings.map((b: any) => (
                  <div key={b.id} className="flex items-center justify-between px-4 py-3">
                    <div>
                      <p className="text-sm font-medium">{(b.courts as any)?.name ?? '—'}</p>
                      <p className="text-xs text-muted-foreground">{(b.tenants as any)?.name ?? '—'}</p>
                      <p className="font-mono text-xs text-muted-foreground">{b.date} {b.start_time?.slice(0, 5)}–{b.end_time?.slice(0, 5)}</p>
                    </div>
                    <StatusBadge status={b.status} />
                  </div>
                ))}
                {recentBookings.length === 0 && (
                  <div className="px-4 py-8 text-center text-sm text-muted-foreground">No bookings</div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
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

function SubscriptionBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    active: 'bg-green/10 text-green',
    expired: 'bg-muted text-muted-foreground',
    cancelled: 'bg-destructive/10 text-destructive',
  }

  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider ${styles[status] ?? styles.expired}`}>
      {status}
    </span>
  )
}
