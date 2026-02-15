import { requireTenantOwner } from '@/lib/tenant'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Plus } from 'lucide-react'
import { TierForm } from './tier-form'
import type { MembershipTier } from '@/lib/types'

export default async function TiersPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const { tenant } = await requireTenantOwner(slug)

  const supabase = await createClient()
  const { data: tiers } = await supabase
    .from('membership_tiers')
    .select('*')
    .eq('tenant_id', tenant.id)
    .order('price', { ascending: true })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Membership Tiers</h1>
        <Dialog>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Create Tier
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create a membership tier</DialogTitle>
            </DialogHeader>
            <TierForm tenantId={tenant.id} slug={slug} />
          </DialogContent>
        </Dialog>
      </div>

      {(!tiers || tiers.length === 0) ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground">No membership tiers yet.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {(tiers as MembershipTier[]).map((tier) => (
            <Card key={tier.id}>
              <CardHeader>
                <CardTitle className="text-lg">{tier.name}</CardTitle>
                <p className="text-2xl font-bold">${tier.price}<span className="text-sm font-normal text-muted-foreground">/month</span></p>
              </CardHeader>
              <CardContent className="space-y-2">
                {tier.description && <p className="text-sm text-muted-foreground">{tier.description}</p>}
                <div className="flex flex-wrap gap-1">
                  {tier.perks.priority_booking && <Badge>Priority Booking</Badge>}
                  {tier.perks.waitlist_priority && <Badge>Waitlist Priority</Badge>}
                  {tier.perks.discount_pct ? <Badge variant="outline">{tier.perks.discount_pct}% Discount</Badge> : null}
                  {tier.perks.free_hours ? <Badge variant="outline">{tier.perks.free_hours} Free Hrs</Badge> : null}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
