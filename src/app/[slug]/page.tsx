import { getTenantBySlug } from '@/lib/tenant'
import { createClient } from '@/lib/supabase/server'
import type { Court } from '@/lib/types'
import { MembershipRequestButton } from '@/components/booking/membership-request-button'
import { ScheduleGridWrapper } from '@/components/schedule/schedule-grid-wrapper'

export default async function BusinessPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const tenant = await getTenantBySlug(slug)

  const supabase = await createClient()
  const { data: courts } = await supabase
    .from('courts')
    .select('*')
    .eq('tenant_id', tenant.id)
    .eq('is_active', true)
    .order('name')

  const typedCourts = (courts || []) as Court[]
  const courtIds = typedCourts.map((c) => c.id)

  // Fetch court closures for ALL courts in one query
  const { data: allClosures } = courtIds.length > 0
    ? await supabase
        .from('court_closures')
        .select('court_id, date')
        .in('court_id', courtIds)
    : { data: [] }

  const closureDatesMap: Record<string, string[]> = {}
  for (const c of (allClosures || []) as { court_id: string; date: string }[]) {
    if (!closureDatesMap[c.court_id]) closureDatesMap[c.court_id] = []
    closureDatesMap[c.court_id].push(c.date)
  }

  // Fetch active membership tiers
  const { data: tiers } = await supabase
    .from('membership_tiers')
    .select('*')
    .eq('tenant_id', tenant.id)
    .eq('is_active', true)
    .order('price')

  // Check user's membership status
  const { data: { user } } = await supabase.auth.getUser()
  let pendingRequests: string[] = []
  let activeSubscriptions: string[] = []

  if (user && tiers && tiers.length > 0) {
    const { data: requests } = await supabase
      .from('membership_requests')
      .select('tier_id')
      .eq('customer_id', user.id)
      .eq('tenant_id', tenant.id)
      .eq('status', 'pending')
    pendingRequests = (requests || []).map((r: { tier_id: string }) => r.tier_id)

    const { data: subs } = await supabase
      .from('member_subscriptions')
      .select('tier_id')
      .eq('customer_id', user.id)
      .eq('tenant_id', tenant.id)
      .eq('status', 'active')
    activeSubscriptions = (subs || []).map((s: { tier_id: string }) => s.tier_id)
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{tenant.name}</h1>
        {tenant.description && (
          <p className="mt-2 text-muted-foreground">{tenant.description}</p>
        )}
      </div>

      <div>
        <span className="section-label block">[ SCHEDULE ]</span>
        <div className="mt-4">
          <ScheduleGridWrapper
            courts={typedCourts}
            tenantId={tenant.id}
            slug={slug}
            closureDatesMap={closureDatesMap}
            currentUserId={user?.id}
          />
        </div>
      </div>

      {tiers && tiers.length > 0 && (
        <div>
          <span className="section-label block">[ MEMBERSHIP PLANS ]</span>
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            {(tiers as any[]).map((tier) => (
              <div key={tier.id} className="rounded-lg border border-border bg-card p-4 space-y-3">
                <div>
                  <h3 className="font-medium">{tier.name}</h3>
                  <p className="font-mono text-lg font-bold text-primary">
                    {tier.price > 0 ? `$${tier.price}` : 'Free'}
                  </p>
                </div>
                {tier.description && (
                  <p className="text-sm text-muted-foreground">{tier.description}</p>
                )}
                {tier.perks && (
                  <ul className="space-y-1">
                    {tier.perks.priority_booking && <li className="font-mono text-xs text-muted-foreground">+ Priority booking</li>}
                    {tier.perks.discount_pct > 0 && <li className="font-mono text-xs text-muted-foreground">+ {tier.perks.discount_pct}% discount</li>}
                    {tier.perks.free_hours > 0 && <li className="font-mono text-xs text-muted-foreground">+ {tier.perks.free_hours} free hours/month</li>}
                    {tier.perks.waitlist_priority && <li className="font-mono text-xs text-muted-foreground">+ Waitlist priority</li>}
                  </ul>
                )}
                <MembershipRequestButton
                  tierId={tier.id}
                  slug={slug}
                  hasPendingRequest={pendingRequests.includes(tier.id)}
                  hasActiveSubscription={activeSubscriptions.includes(tier.id)}
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
