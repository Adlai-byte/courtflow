'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { requireTenantOwner } from '@/lib/tenant'

export async function ownerCancelBooking(bookingId: string, slug: string) {
  await requireTenantOwner(slug)
  const supabase = await createClient()

  // Fetch booking for waitlist promotion
  const { data: booking } = await supabase
    .from('bookings')
    .select('court_id, date, start_time')
    .eq('id', bookingId)
    .eq('status', 'confirmed')
    .single()

  if (!booking) return { error: 'Booking not found' }

  const { error } = await supabase
    .from('bookings')
    .update({ status: 'cancelled' })
    .eq('id', bookingId)

  if (error) return { error: error.message }

  // Promote next waitlist entry
  const { data: nextWaitlist } = await supabase
    .from('waitlist_entries')
    .select('id')
    .eq('court_id', booking.court_id)
    .eq('date', booking.date)
    .eq('start_time', booking.start_time)
    .eq('status', 'waiting')
    .order('position', { ascending: true })
    .limit(1)
    .single()

  if (nextWaitlist) {
    await supabase
      .from('waitlist_entries')
      .update({ status: 'notified', notified_at: new Date().toISOString() })
      .eq('id', nextWaitlist.id)
  }

  revalidatePath(`/dashboard/${slug}/bookings`)
  return { error: null }
}
