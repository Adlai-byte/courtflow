import { createAdminClient } from '@/lib/supabase/admin'
import { Card, CardContent } from '@/components/ui/card'
import Link from 'next/link'
import { ExternalLink } from 'lucide-react'

export default async function AdminTenantsPage() {
  const supabase = createAdminClient()

  const { data: tenants } = await supabase
    .from('tenants')
    .select('*, profiles:owner_id ( full_name )')
    .order('created_at', { ascending: false })

  // Fetch aggregate counts per tenant
  const tenantIds = (tenants ?? []).map((t: any) => t.id)

  const [
    { data: courtCounts },
    { data: bookingCounts },
    { data: memberCounts },
  ] = await Promise.all([
    supabase
      .from('courts')
      .select('tenant_id')
      .in('tenant_id', tenantIds),
    supabase
      .from('bookings')
      .select('tenant_id')
      .in('tenant_id', tenantIds)
      .in('status', ['confirmed', 'completed']),
    supabase
      .from('member_subscriptions')
      .select('tenant_id')
      .in('tenant_id', tenantIds)
      .eq('status', 'active'),
  ])

  const courtMap = countByTenant(courtCounts)
  const bookingMap = countByTenant(bookingCounts)
  const memberMap = countByTenant(memberCounts)

  return (
    <div className="space-y-8">
      <div>
        <span className="section-label mb-2 block">[ TENANTS ]</span>
        <h1 className="text-2xl font-bold tracking-tight">All Tenants</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {tenants?.length ?? 0} registered {(tenants?.length ?? 0) === 1 ? 'facility' : 'facilities'}
        </p>
      </div>

      <Card>
        <CardContent className="p-0">
          {/* Desktop table */}
          <div className="hidden md:block">
            <table className="w-full">
              <thead>
                <tr className="border-b text-left">
                  <th className="px-4 py-3 font-mono text-xs uppercase tracking-wider text-muted-foreground">Name</th>
                  <th className="px-4 py-3 font-mono text-xs uppercase tracking-wider text-muted-foreground">Owner</th>
                  <th className="px-4 py-3 font-mono text-xs uppercase tracking-wider text-muted-foreground text-right">Courts</th>
                  <th className="px-4 py-3 font-mono text-xs uppercase tracking-wider text-muted-foreground text-right">Bookings</th>
                  <th className="px-4 py-3 font-mono text-xs uppercase tracking-wider text-muted-foreground text-right">Members</th>
                  <th className="px-4 py-3 font-mono text-xs uppercase tracking-wider text-muted-foreground">Created</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {(tenants ?? []).map((t: any) => (
                  <tr key={t.id} className="border-b last:border-0">
                    <td className="px-4 py-3">
                      <div>
                        <p className="text-sm font-medium">{t.name}</p>
                        <p className="font-mono text-xs text-muted-foreground">/{t.slug}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm">{t.profiles?.full_name ?? '—'}</td>
                    <td className="px-4 py-3 text-sm text-right font-mono">{courtMap.get(t.id) ?? 0}</td>
                    <td className="px-4 py-3 text-sm text-right font-mono">{bookingMap.get(t.id) ?? 0}</td>
                    <td className="px-4 py-3 text-sm text-right font-mono">{memberMap.get(t.id) ?? 0}</td>
                    <td className="px-4 py-3 text-sm font-mono text-muted-foreground">
                      {new Date(t.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Link
                          href={`/admin/tenants/${t.id}`}
                          className="font-mono text-xs text-primary transition-colors hover:text-primary/80"
                        >
                          Manage
                        </Link>
                        <Link
                          href={`/${t.slug}`}
                          className="inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
                        >
                          View <ExternalLink className="h-3 w-3" />
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
                {(tenants ?? []).length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-sm text-muted-foreground">
                      No tenants yet
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="divide-y md:hidden">
            {(tenants ?? []).map((t: any) => (
              <div key={t.id} className="px-4 py-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{t.name}</p>
                    <p className="font-mono text-xs text-muted-foreground">/{t.slug}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Link
                      href={`/admin/tenants/${t.id}`}
                      className="font-mono text-xs text-primary transition-colors hover:text-primary/80"
                    >
                      Manage
                    </Link>
                    <Link
                      href={`/${t.slug}`}
                      className="inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
                    >
                      View <ExternalLink className="h-3 w-3" />
                    </Link>
                  </div>
                </div>
                <div className="mt-2 flex gap-4 font-mono text-xs text-muted-foreground">
                  <span>{courtMap.get(t.id) ?? 0} courts</span>
                  <span>{bookingMap.get(t.id) ?? 0} bookings</span>
                  <span>{memberMap.get(t.id) ?? 0} members</span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Owner: {t.profiles?.full_name ?? '—'} &middot; {new Date(t.created_at).toLocaleDateString()}
                </p>
              </div>
            ))}
            {(tenants ?? []).length === 0 && (
              <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                No tenants yet
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function countByTenant(rows: any[] | null): Map<string, number> {
  const map = new Map<string, number>()
  for (const row of rows ?? []) {
    map.set(row.tenant_id, (map.get(row.tenant_id) ?? 0) + 1)
  }
  return map
}
