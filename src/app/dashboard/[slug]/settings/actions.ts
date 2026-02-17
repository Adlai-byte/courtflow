'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function updateTenant(tenantId: string, slug: string, formData: FormData) {
  const supabase = await createClient()

  const cancellationHours = parseInt(formData.get('cancellation_hours') as string, 10)

  const { error } = await supabase
    .from('tenants')
    .update({
      name: formData.get('name') as string,
      description: formData.get('description') as string || null,
      cancellation_hours: isNaN(cancellationHours) ? 24 : cancellationHours,
    })
    .eq('id', tenantId)

  if (error) {
    return { error: error.message }
  }

  revalidatePath(`/dashboard/${slug}/settings`)
  return { error: null }
}
