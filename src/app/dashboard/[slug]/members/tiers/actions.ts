'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { requireTenantOwner } from '@/lib/tenant'

export async function createTier(tenantId: string, slug: string, formData: FormData) {
  const { tenant } = await requireTenantOwner(slug)
  const supabase = await createClient()

  const perks = {
    priority_booking: formData.get('priority_booking') === 'true',
    discount_pct: parseInt(formData.get('discount_pct') as string) || 0,
    free_hours: parseInt(formData.get('free_hours') as string) || 0,
    waitlist_priority: formData.get('waitlist_priority') === 'true',
  }

  const { error } = await supabase.from('membership_tiers').insert({
    tenant_id: tenant.id,
    name: formData.get('name') as string,
    description: formData.get('description') as string || null,
    price: parseFloat(formData.get('price') as string) || 0,
    perks,
  })

  if (error) {
    return { error: error.message }
  }

  revalidatePath(`/dashboard/${slug}/members/tiers`)
  return { error: null }
}

export async function deleteTier(tierId: string, slug: string) {
  const { tenant } = await requireTenantOwner(slug)
  const supabase = await createClient()

  const { error } = await supabase
    .from('membership_tiers')
    .delete()
    .eq('id', tierId)
    .eq('tenant_id', tenant.id)

  if (error) {
    return { error: error.message }
  }

  revalidatePath(`/dashboard/${slug}/members/tiers`)
  return { error: null }
}
