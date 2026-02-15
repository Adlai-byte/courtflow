'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function updateBookingStatus(
  bookingId: string,
  status: string,
  slug: string
) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('bookings')
    .update({ status })
    .eq('id', bookingId)

  if (error) {
    return { error: error.message }
  }

  revalidatePath(`/dashboard/${slug}/bookings`)
  return { error: null }
}
