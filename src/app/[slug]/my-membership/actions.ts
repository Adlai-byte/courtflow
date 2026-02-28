'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function cancelMembership(subscriptionId: string, slug: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { error } = await supabase
    .from('member_subscriptions')
    .update({ status: 'cancelled', end_date: new Date().toISOString().split('T')[0] })
    .eq('id', subscriptionId)
    .eq('customer_id', user.id)

  if (error) return { error: error.message }

  revalidatePath(`/${slug}/my-membership`)
  return { error: null }
}
