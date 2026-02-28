'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireTenantOwner } from '@/lib/tenant'
import { sendEmail } from '@/lib/email'
import { membershipApprovedEmail, membershipRejectedEmail } from '@/lib/email-templates'

export async function approveMembershipRequest(requestId: string, slug: string) {
  const { tenant } = await requireTenantOwner(slug)
  const supabase = await createClient()

  // Get request with tier info
  const { data: request } = await supabase
    .from('membership_requests')
    .select('*, membership_tiers ( name )')
    .eq('id', requestId)
    .eq('tenant_id', tenant.id)
    .eq('status', 'pending')
    .maybeSingle()

  if (!request) {
    return { error: 'Request not found or already processed' }
  }

  // Update request status
  const { error: updateError } = await supabase
    .from('membership_requests')
    .update({ status: 'approved', updated_at: new Date().toISOString() })
    .eq('id', requestId)

  if (updateError) {
    return { error: updateError.message }
  }

  // Create subscription
  const { error: subError } = await supabase.from('member_subscriptions').insert({
    tenant_id: tenant.id,
    customer_id: request.customer_id,
    tier_id: request.tier_id,
    status: 'active',
    start_date: new Date().toISOString().split('T')[0],
    request_id: requestId,
  })

  if (subError) {
    return { error: subError.message }
  }

  // Send approval email
  const adminClient = createAdminClient()
  const { data: userData } = await adminClient.auth.admin.getUserById(request.customer_id)
  if (userData?.user?.email) {
    const tierName = (request as any).membership_tiers?.name || 'Membership'
    const { subject, html } = membershipApprovedEmail(tierName, tenant.name)
    await sendEmail(userData.user.email, subject, html)
  }

  revalidatePath(`/dashboard/${slug}/members`)
  revalidatePath(`/dashboard/${slug}`)
  return { error: null }
}

export async function rejectMembershipRequest(requestId: string, slug: string, notes?: string) {
  const { tenant } = await requireTenantOwner(slug)
  const supabase = await createClient()

  // Get request with tier info
  const { data: request } = await supabase
    .from('membership_requests')
    .select('*, membership_tiers ( name )')
    .eq('id', requestId)
    .eq('tenant_id', tenant.id)
    .eq('status', 'pending')
    .maybeSingle()

  if (!request) {
    return { error: 'Request not found or already processed' }
  }

  const { error } = await supabase
    .from('membership_requests')
    .update({
      status: 'rejected',
      owner_notes: notes || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', requestId)

  if (error) {
    return { error: error.message }
  }

  // Send rejection email
  const adminClient = createAdminClient()
  const { data: userData } = await adminClient.auth.admin.getUserById(request.customer_id)
  if (userData?.user?.email) {
    const tierName = (request as any).membership_tiers?.name || 'Membership'
    const { subject, html } = membershipRejectedEmail(tierName, tenant.name, notes || null)
    await sendEmail(userData.user.email, subject, html)
  }

  revalidatePath(`/dashboard/${slug}/members`)
  revalidatePath(`/dashboard/${slug}`)
  return { error: null }
}
