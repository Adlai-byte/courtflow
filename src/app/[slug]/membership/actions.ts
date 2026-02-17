'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getTenantBySlug } from '@/lib/tenant'
import { sendEmail } from '@/lib/email'
import { membershipRequestEmail } from '@/lib/email-templates'

export async function requestMembership(tierId: string, slug: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Not authenticated' }
  }

  const tenant = await getTenantBySlug(slug)

  // Get tier info
  const { data: tier } = await supabase
    .from('membership_tiers')
    .select('name')
    .eq('id', tierId)
    .single()

  if (!tier) {
    return { error: 'Membership tier not found' }
  }

  // Create request (unique index prevents duplicate pending requests)
  const { error } = await supabase.from('membership_requests').insert({
    tenant_id: tenant.id,
    tier_id: tierId,
    customer_id: user.id,
  })

  if (error) {
    if (error.message.includes('duplicate') || error.message.includes('unique')) {
      return { error: 'You already have a pending request for this tier' }
    }
    return { error: error.message }
  }

  // Send notification email to owner
  const adminClient = createAdminClient()
  const { data: ownerData } = await adminClient.auth.admin.getUserById(tenant.owner_id)
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', user.id)
    .single()

  if (ownerData?.user?.email) {
    const { subject, html } = membershipRequestEmail(
      profile?.full_name || user.email || 'A player',
      tier.name,
      tenant.name
    )
    await sendEmail(ownerData.user.email, subject, html)
  }

  return { error: null }
}
