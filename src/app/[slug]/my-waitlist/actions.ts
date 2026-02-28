'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function leaveWaitlist(entryId: string, slug: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { error } = await supabase
    .from('waitlist_entries')
    .update({ status: 'expired' })
    .eq('id', entryId)
    .eq('customer_id', user.id)
    .in('status', ['waiting', 'notified'])

  if (error) return { error: error.message }

  revalidatePath(`/${slug}/my-waitlist`)
  return { error: null }
}
