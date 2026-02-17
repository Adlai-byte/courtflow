'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { requireTenantOwner } from '@/lib/tenant'
import type { OperatingHours } from '@/lib/types'

export async function updateOperatingHours(
  courtId: string,
  slug: string,
  hours: OperatingHours
) {
  await requireTenantOwner(slug)
  const supabase = await createClient()

  const { error } = await supabase
    .from('courts')
    .update({ operating_hours: hours })
    .eq('id', courtId)

  if (error) {
    return { error: error.message }
  }

  revalidatePath(`/dashboard/${slug}/courts/${courtId}`)
  return { error: null }
}

export async function addClosure(
  courtId: string,
  slug: string,
  date: string,
  reason: string | null
) {
  await requireTenantOwner(slug)
  const supabase = await createClient()

  const { error } = await supabase
    .from('court_closures')
    .insert({ court_id: courtId, date, reason })

  if (error) {
    return { error: error.message.includes('duplicate') ? 'This date is already closed.' : error.message }
  }

  revalidatePath(`/dashboard/${slug}/courts/${courtId}`)
  return { error: null }
}

export async function removeClosure(
  closureId: string,
  courtId: string,
  slug: string
) {
  await requireTenantOwner(slug)
  const supabase = await createClient()

  const { error } = await supabase
    .from('court_closures')
    .delete()
    .eq('id', closureId)

  if (error) {
    return { error: error.message }
  }

  revalidatePath(`/dashboard/${slug}/courts/${courtId}`)
  return { error: null }
}
