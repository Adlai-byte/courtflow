import { createAdminClient } from '@/lib/supabase/admin'
import { Card, CardContent } from '@/components/ui/card'
import Link from 'next/link'
import { ToggleCourtButton } from './toggle-court-button'

export default async function AdminCourtsPage() {
  const supabase = createAdminClient()

  const { data: courts } = await supabase
    .from('courts')
    .select('id, name, sport_type, booking_mode, is_active, tenant_id, tenants:tenant_id ( name, slug, id )')
    .order('created_at', { ascending: false })

  return (
    <div className="space-y-8">
      <div>
        <span className="section-label mb-2 block">[ COURTS ]</span>
        <h1 className="text-2xl font-bold tracking-tight">All Courts</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {courts?.length ?? 0} {(courts?.length ?? 0) === 1 ? 'court' : 'courts'} across all tenants
        </p>
      </div>

      <Card>
        <CardContent className="p-0">
          {/* Desktop table */}
          <div className="hidden md:block">
            <table className="w-full">
              <thead>
                <tr className="border-b text-left">
                  <th className="px-4 py-3 font-mono text-xs uppercase tracking-wider text-muted-foreground">Court</th>
                  <th className="px-4 py-3 font-mono text-xs uppercase tracking-wider text-muted-foreground">Tenant</th>
                  <th className="px-4 py-3 font-mono text-xs uppercase tracking-wider text-muted-foreground">Sport</th>
                  <th className="px-4 py-3 font-mono text-xs uppercase tracking-wider text-muted-foreground">Mode</th>
                  <th className="px-4 py-3 font-mono text-xs uppercase tracking-wider text-muted-foreground">Status</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {(courts ?? []).map((c: any) => (
                  <tr key={c.id} className="border-b last:border-0">
                    <td className="px-4 py-3 text-sm font-medium">{c.name}</td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/tenants/${(c.tenants as any)?.id}`}
                        className="text-sm text-primary transition-colors hover:text-primary/80"
                      >
                        {(c.tenants as any)?.name ?? '—'}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-sm capitalize">{c.sport_type}</td>
                    <td className="px-4 py-3 font-mono text-xs">{c.booking_mode}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider ${c.is_active ? 'bg-green/10 text-green' : 'bg-destructive/10 text-destructive'}`}>
                        {c.is_active ? 'active' : 'inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <ToggleCourtButton courtId={c.id} isActive={c.is_active} />
                    </td>
                  </tr>
                ))}
                {(courts ?? []).length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-sm text-muted-foreground">
                      No courts found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="divide-y md:hidden">
            {(courts ?? []).map((c: any) => (
              <div key={c.id} className="px-4 py-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{c.name}</p>
                    <p className="text-xs text-muted-foreground capitalize">
                      {(c.tenants as any)?.name ?? '—'} &middot; {c.sport_type} &middot; {c.booking_mode}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex rounded-full px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider ${c.is_active ? 'bg-green/10 text-green' : 'bg-destructive/10 text-destructive'}`}>
                      {c.is_active ? 'active' : 'inactive'}
                    </span>
                    <ToggleCourtButton courtId={c.id} isActive={c.is_active} />
                  </div>
                </div>
              </div>
            ))}
            {(courts ?? []).length === 0 && (
              <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                No courts found
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
