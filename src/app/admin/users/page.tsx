import { createAdminClient } from '@/lib/supabase/admin'
import { Card, CardContent } from '@/components/ui/card'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import type { UserRole } from '@/lib/types'

const ROLE_FILTERS = [
  { label: 'All', value: 'all' },
  { label: 'Admins', value: 'platform_admin' },
  { label: 'Owners', value: 'business_owner' },
  { label: 'Customers', value: 'customer' },
] as const

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ role?: string }>
}) {
  const { role: roleFilter } = await searchParams
  const activeFilter = roleFilter || 'all'
  const supabase = createAdminClient()

  let query = supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false })

  if (activeFilter !== 'all') {
    query = query.eq('role', activeFilter)
  }

  const { data: profiles } = await query

  // Get emails from auth for all users
  const { data: authData } = await supabase.auth.admin.listUsers({ perPage: 1000 })
  const emailMap = new Map<string, string>()
  for (const u of authData?.users ?? []) {
    emailMap.set(u.id, u.email ?? '')
  }

  return (
    <div className="space-y-8">
      <div>
        <span className="section-label mb-2 block">[ USERS ]</span>
        <h1 className="text-2xl font-bold tracking-tight">All Users</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {profiles?.length ?? 0} {(profiles?.length ?? 0) === 1 ? 'user' : 'users'}
          {activeFilter !== 'all' && ` (${ROLE_FILTERS.find(r => r.value === activeFilter)?.label})`}
        </p>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 rounded-lg border bg-card p-1 w-fit">
        {ROLE_FILTERS.map((r) => (
          <Link
            key={r.value}
            href={r.value === 'all' ? '/admin/users' : `/admin/users?role=${r.value}`}
            className={cn(
              'rounded-md px-3 py-1.5 font-mono text-xs transition-colors',
              activeFilter === r.value
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {r.label}
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
                  <th className="px-4 py-3 font-mono text-xs uppercase tracking-wider text-muted-foreground">Name</th>
                  <th className="px-4 py-3 font-mono text-xs uppercase tracking-wider text-muted-foreground">Email</th>
                  <th className="px-4 py-3 font-mono text-xs uppercase tracking-wider text-muted-foreground">Role</th>
                  <th className="px-4 py-3 font-mono text-xs uppercase tracking-wider text-muted-foreground">Joined</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {(profiles ?? []).map((p: any) => (
                  <tr key={p.id} className="border-b last:border-0">
                    <td className="px-4 py-3 text-sm font-medium">{p.full_name ?? '—'}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{emailMap.get(p.id) ?? '—'}</td>
                    <td className="px-4 py-3">
                      <RoleBadge role={p.role} />
                    </td>
                    <td className="px-4 py-3 text-sm font-mono text-muted-foreground">
                      {new Date(p.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/users/${p.id}`}
                        className="font-mono text-xs text-primary transition-colors hover:text-primary/80"
                      >
                        Manage
                      </Link>
                    </td>
                  </tr>
                ))}
                {(profiles ?? []).length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-sm text-muted-foreground">
                      No users found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="divide-y md:hidden">
            {(profiles ?? []).map((p: any) => (
              <div key={p.id} className="px-4 py-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">{p.full_name ?? '—'}</p>
                  <div className="flex items-center gap-2">
                    <RoleBadge role={p.role} />
                    <Link
                      href={`/admin/users/${p.id}`}
                      className="font-mono text-xs text-primary transition-colors hover:text-primary/80"
                    >
                      Manage
                    </Link>
                  </div>
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">{emailMap.get(p.id) ?? '—'}</p>
                <p className="mt-0.5 font-mono text-xs text-muted-foreground">
                  Joined {new Date(p.created_at).toLocaleDateString()}
                </p>
              </div>
            ))}
            {(profiles ?? []).length === 0 && (
              <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                No users found
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function RoleBadge({ role }: { role: UserRole }) {
  const styles: Record<string, string> = {
    platform_admin: 'bg-primary/10 text-primary',
    business_owner: 'bg-chart-3/10 text-chart-3',
    customer: 'bg-muted text-muted-foreground',
  }

  const labels: Record<string, string> = {
    platform_admin: 'Admin',
    business_owner: 'Owner',
    customer: 'Customer',
  }

  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider ${styles[role] ?? styles.customer}`}>
      {labels[role] ?? role}
    </span>
  )
}
