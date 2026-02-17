import { getTenantBySlug } from '@/lib/tenant'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import type { Court } from '@/lib/types'
import { MembershipRequestButton } from '@/components/booking/membership-request-button'

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
        <span className="section-label block">[ AVAILABLE COURTS ]</span>
        {(!courts || courts.length === 0) ? (
          <p className="mt-4 text-sm text-muted-foreground">No courts available at this time.</p>
        ) : (
          <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {(courts as Court[]).map((court) => (
              <Link key={court.id} href={`/${slug}/courts/${court.id}`}>
                <div className="rounded-lg border border-border bg-card p-4 transition-colors hover:border-primary/30">
                  <h3 className="font-semibold tracking-tight">{court.name}</h3>
                  <div className="mt-2 flex items-center gap-2">
                    <span className="inline-flex rounded border border-border px-2 py-0.5 font-mono text-xs text-muted-foreground">
                      {court.sport_type}
                    </span>
                    <span className="inline-flex rounded border border-border px-2 py-0.5 font-mono text-xs text-muted-foreground">
                      {court.booking_mode === 'fixed_slot'
                        ? `${court.slot_duration_minutes}min slots`
                        : `${court.min_duration_minutes}-${court.max_duration_minutes}min`}
                    </span>
                  </div>
                  {court.description && (
                    <p className="mt-2 text-sm text-muted-foreground line-clamp-2">
                      {court.description}
                    </p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
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
