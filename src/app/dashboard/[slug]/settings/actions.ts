'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { requireTenantOwner } from '@/lib/tenant'

export async function updateTenant(tenantId: string, slug: string, formData: FormData) {
  await requireTenantOwner(slug)
  const supabase = await createClient()

  const cancellationHours = parseInt(formData.get('cancellation_hours') as string, 10)

  const { error } = await supabase
    .from('tenants')
    .update({
      name: formData.get('name') as string,
      description: formData.get('description') as string || null,
      cancellation_hours: isNaN(cancellationHours) ? 24 : cancellationHours,
      auto_approve: formData.get('auto_approve') === 'true',
      require_payment: formData.get('require_payment') === 'true',
      city: formData.get('city') as string || null,
      address: formData.get('address') as string || null,
      contact_phone: formData.get('contact_phone') as string || null,
    })
    .eq('id', tenantId)

  if (error) {
    return { error: error.message }
  }

  revalidatePath(`/dashboard/${slug}/settings`)
  revalidatePath(`/dashboard/${slug}`, 'layout')
  revalidatePath(`/${slug}`)
  revalidatePath('/explore')
  return { error: null }
}
