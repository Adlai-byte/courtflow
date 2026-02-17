import { requireTenantOwner } from '@/lib/tenant'
import { createClient } from '@/lib/supabase/server'
import { MembershipRequestActions } from '@/components/dashboard/membership-request-actions'

const statusColors: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700 border-amber-200',
  approved: 'bg-green/10 text-green border-green/20',
  rejected: 'bg-destructive/10 text-destructive border-destructive/20',
}

export default async function MembershipRequestsPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const { tenant } = await requireTenantOwner(slug)

  const supabase = await createClient()
  const { data: requests } = await supabase
    .from('membership_requests')
    .select('*, membership_tiers ( name ), profiles:customer_id ( full_name )')
    .eq('tenant_id', tenant.id)
    .order('created_at', { ascending: false })

  return (
    <div className="space-y-6">
      <div>
        <span className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
          Members / Requests
        </span>
        <h1 className="text-2xl font-bold tracking-tight">Membership Requests</h1>
      </div>

      <div className="rounded-lg border border-border bg-card">
        {(!requests || requests.length === 0) ? (
          <div className="flex items-center justify-center py-12">
            <p className="text-sm text-muted-foreground">No membership requests yet.</p>
          </div>
        ) : (
          <>
            <div className="hidden md:block">
              <table className="w-full">
                <thead>
                  <tr className="border-b text-left">
                    <th className="p-4 font-mono text-xs uppercase tracking-wider text-muted-foreground font-medium">Player</th>
                    <th className="p-4 font-mono text-xs uppercase tracking-wider text-muted-foreground font-medium">Tier</th>
                    <th className="p-4 font-mono text-xs uppercase tracking-wider text-muted-foreground font-medium">Date</th>
                    <th className="p-4 font-mono text-xs uppercase tracking-wider text-muted-foreground font-medium">Status</th>
                    <th className="p-4 font-mono text-xs uppercase tracking-wider text-muted-foreground font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {requests.map((req: any, i: number) => (
                    <tr key={req.id} className={i % 2 === 1 ? 'bg-muted/30' : ''}>
                      <td className="p-4 text-sm">{req.profiles?.full_name || 'Unknown'}</td>
                      <td className="p-4 text-sm">{req.membership_tiers?.name || '—'}</td>
                      <td className="p-4 font-mono text-sm">{new Date(req.created_at).toLocaleDateString()}</td>
                      <td className="p-4">
                        <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium ${statusColors[req.status] || ''}`}>
                          {req.status}
                        </span>
                      </td>
                      <td className="p-4">
                        {req.status === 'pending' && (
                          <MembershipRequestActions requestId={req.id} slug={slug} />
                        )}
                        {req.owner_notes && (
                          <span className="text-xs text-muted-foreground ml-2">{req.owner_notes}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="space-y-2 p-3 md:hidden">
              {requests.map((req: any) => (
                <div key={req.id} className="rounded-lg border bg-card p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{req.profiles?.full_name || 'Unknown'}</span>
                    <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${statusColors[req.status] || ''}`}>
                      {req.status}
                    </span>
                  </div>
                  <p className="font-mono text-xs text-muted-foreground">
                    {req.membership_tiers?.name || '—'} · {new Date(req.created_at).toLocaleDateString()}
                  </p>
                  {req.status === 'pending' && (
                    <MembershipRequestActions requestId={req.id} slug={slug} />
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
