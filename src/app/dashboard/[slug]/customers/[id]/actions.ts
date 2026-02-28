'use server'

import { createClient } from '@/lib/supabase/server'
import { requireTenantOwner } from '@/lib/tenant'
import { revalidatePath } from 'next/cache'

export async function addCustomerNote(
  tenantSlug: string,
  profileId: string,
  formData: FormData
) {
  const { tenant, profile: ownerProfile } = await requireTenantOwner(tenantSlug)
  const note = formData.get('note') as string

  if (!note?.trim()) return { error: 'Note cannot be empty' }

  const supabase = await createClient()
  const { error } = await supabase.from('customer_notes').insert({
    tenant_id: tenant.id,
    profile_id: profileId,
    note: note.trim(),
    created_by: ownerProfile.id,
  })

  if (error) return { error: error.message }

  revalidatePath(`/dashboard/${tenantSlug}/customers/${profileId}`)
  return { error: null }
}
