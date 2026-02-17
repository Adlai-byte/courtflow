'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function cancelBooking(bookingId: string, slug: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  // Fetch booking + tenant cancellation policy
  const { data: booking } = await supabase
    .from('bookings')
    .select('*, tenants:tenant_id ( cancellation_hours )')
    .eq('id', bookingId)
    .eq('customer_id', user.id)
    .eq('status', 'confirmed')
    .single()

  if (!booking) return { error: 'Booking not found' }

  // Check cancellation deadline
  const cancellationHours = (booking.tenants as any)?.cancellation_hours ?? 24
  const bookingStart = new Date(`${booking.date}T${booking.start_time}`)
  const deadline = new Date(bookingStart.getTime() - cancellationHours * 60 * 60 * 1000)

  if (new Date() > deadline) {
    return { error: `Cancellation deadline has passed (${cancellationHours}h before start)` }
  }

  // Cancel the booking
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

  revalidatePath(`/${slug}/my-bookings`)
  return { error: null }
}
