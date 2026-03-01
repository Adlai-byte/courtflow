import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getTenantBySlug } from '@/lib/tenant'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { CancelMembershipButton } from './cancel-membership-button'

const statusColors: Record<string, string> = {
  active: 'bg-green/10 text-green border-green/20',
  expired: 'bg-muted text-muted-foreground border-border',
  cancelled: 'bg-destructive/10 text-destructive border-destructive/20',
}

const requestStatusColors: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700 border-amber-200',
  approved: 'bg-green/10 text-green border-green/20',
  rejected: 'bg-destructive/10 text-destructive border-destructive/20',
}

export default async function MyMembershipPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const tenant = await getTenantBySlug(slug)

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect(`/login?redirect=/${slug}/my-membership`)
  }

  // Active subscriptions with tier info
  const { data: subscriptions } = await supabase
    .from('member_subscriptions')
    .select('*, membership_tiers ( name, price, perks, description )')
    .eq('tenant_id', tenant.id)
    .eq('customer_id', user.id)
    .order('created_at', { ascending: false })

  // Pending requests
  const { data: requests } = await supabase
    .from('membership_requests')
    .select('*, membership_tiers ( name )')
    .eq('tenant_id', tenant.id)
    .eq('customer_id', user.id)
    .order('created_at', { ascending: false })

  const activeSubscriptions = (subscriptions || []).filter((s: any) => s.status === 'active')
  const pastSubscriptions = (subscriptions || []).filter((s: any) => s.status !== 'active')

  return (
    <div className="space-y-6">
      <span className="section-label block">[ MY MEMBERSHIP ]</span>
      <h1 className="text-2xl font-bold tracking-tight">My Membership</h1>

      {/* Active Subscriptions */}
      {activeSubscriptions.length > 0 && (
        <div className="space-y-4">
          {activeSubscriptions.map((sub: any) => {
            const tier = sub.membership_tiers
            return (
              <div key={sub.id} className="rounded-lg border border-border bg-card p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium">{tier?.name}</h3>
                    <p className="font-mono text-lg font-bold text-primary">
                      {tier?.price > 0 ? `₱${tier.price}` : 'Free'}
                    </p>
                  </div>
                  <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium ${statusColors[sub.status] || ''}`}>
                    {sub.status}
                  </span>
                </div>
                {tier?.perks && (
                  <ul className="space-y-1">
                    {tier.perks.priority_booking && <li className="font-mono text-xs text-muted-foreground">+ Priority booking</li>}
                    {tier.perks.discount_pct > 0 && <li className="font-mono text-xs text-muted-foreground">+ {tier.perks.discount_pct}% discount</li>}
                    {tier.perks.free_hours > 0 && <li className="font-mono text-xs text-muted-foreground">+ {tier.perks.free_hours} free hours/month</li>}
                    {tier.perks.waitlist_priority && <li className="font-mono text-xs text-muted-foreground">+ Waitlist priority</li>}
                  </ul>
                )}
                {sub.free_hours_remaining > 0 && (
                  <p className="font-mono text-xs text-primary">
                    {sub.free_hours_remaining} free hours remaining
                  </p>
                )}
                <CancelMembershipButton subscriptionId={sub.id} slug={slug} />
              </div>
            )
          })}
        </div>
      )}

      {/* Pending Requests */}
      {requests && requests.length > 0 && (
        <div>
          <span className="section-label block mb-3">[ REQUESTS ]</span>
          <div className="rounded-lg border border-border bg-card">
            <div className="hidden md:block">
              <table className="w-full">
                <thead>
                  <tr className="border-b text-left">
                    <th className="p-4 font-mono text-xs uppercase tracking-wider text-muted-foreground font-medium">Tier</th>
                    <th className="p-4 font-mono text-xs uppercase tracking-wider text-muted-foreground font-medium">Status</th>
                    <th className="p-4 font-mono text-xs uppercase tracking-wider text-muted-foreground font-medium">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {requests.map((req: any, i: number) => (
                    <tr key={req.id} className={i % 2 === 1 ? 'bg-muted/30' : ''}>
                      <td className="p-4 text-sm">{req.membership_tiers?.name}</td>
                      <td className="p-4">
                        <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium ${requestStatusColors[req.status] || ''}`}>
                          {req.status}
                        </span>
                      </td>
                      <td className="p-4 font-mono text-sm">{req.created_at?.split('T')[0]}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="space-y-2 p-3 md:hidden">
              {requests.map((req: any) => (
                <div key={req.id} className="rounded-lg border bg-card p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{req.membership_tiers?.name}</span>
                    <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${requestStatusColors[req.status] || ''}`}>
                      {req.status}
                    </span>
                  </div>
                  <p className="font-mono text-xs text-muted-foreground">{req.created_at?.split('T')[0]}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Past Subscriptions */}
      {pastSubscriptions.length > 0 && (
        <div>
          <span className="section-label block mb-3">[ PAST MEMBERSHIPS ]</span>
          <div className="rounded-lg border border-border bg-card">
            <div className="hidden md:block">
              <table className="w-full">
                <thead>
                  <tr className="border-b text-left">
                    <th className="p-4 font-mono text-xs uppercase tracking-wider text-muted-foreground font-medium">Tier</th>
                    <th className="p-4 font-mono text-xs uppercase tracking-wider text-muted-foreground font-medium">Status</th>
                    <th className="p-4 font-mono text-xs uppercase tracking-wider text-muted-foreground font-medium">Started</th>
                  </tr>
                </thead>
                <tbody>
                  {pastSubscriptions.map((sub: any, i: number) => (
                    <tr key={sub.id} className={i % 2 === 1 ? 'bg-muted/30' : ''}>
                      <td className="p-4 text-sm">{sub.membership_tiers?.name}</td>
                      <td className="p-4">
                        <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium ${statusColors[sub.status] || ''}`}>
                          {sub.status}
                        </span>
                      </td>
                      <td className="p-4 font-mono text-sm">{sub.start_date}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="space-y-2 p-3 md:hidden">
              {pastSubscriptions.map((sub: any) => (
                <div key={sub.id} className="rounded-lg border bg-card p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{sub.membership_tiers?.name}</span>
                    <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${statusColors[sub.status] || ''}`}>
                      {sub.status}
                    </span>
                  </div>
                  <p className="font-mono text-xs text-muted-foreground">Started {sub.start_date}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {activeSubscriptions.length === 0 && (!requests || requests.length === 0) && pastSubscriptions.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-lg border border-border bg-card py-12">
          <p className="text-sm text-muted-foreground">You don&apos;t have any memberships yet.</p>
          <Link href={`/${slug}`} className="mt-3">
            <Button variant="outline" size="sm" className="font-mono text-xs">
              Browse Plans
            </Button>
          </Link>
        </div>
      )}
    </div>
  )
}
