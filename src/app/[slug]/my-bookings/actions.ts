'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendEmail } from '@/lib/email'
import { bookingCancelledEmail, waitlistPromotionEmail } from '@/lib/email-templates'

export async function cancelBooking(bookingId: string, slug: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  // Fetch booking + tenant cancellation policy + court name
  const { data: booking } = await supabase
    .from('bookings')
    .select('*, tenants:tenant_id ( cancellation_hours ), courts ( name )')
    .eq('id', bookingId)
    .eq('customer_id', user.id)
    .in('status', ['confirmed', 'pending'])
    .single()

  if (!booking) return { error: 'Booking not found' }

  // Only enforce cancellation deadline for confirmed bookings — pending can be freely withdrawn
  if (booking.status === 'confirmed') {
    const cancellationHours = (booking.tenants as any)?.cancellation_hours ?? 24
    const bookingStart = new Date(`${booking.date}T${booking.start_time}`)
    const deadline = new Date(bookingStart.getTime() - cancellationHours * 60 * 60 * 1000)

    if (new Date() > deadline) {
      return { error: `Cancellation deadline has passed (${cancellationHours}h before start)` }
    }
  }

  // Cancel the booking
  const { error } = await supabase
    .from('bookings')
    .update({ status: 'cancelled' })
    .eq('id', bookingId)

  if (error) return { error: error.message }

  const adminClient = createAdminClient()
  const courtName = (booking.courts as any)?.name || 'Court'

  // Send cancellation email to customer
  const { data: userData } = await adminClient.auth.admin.getUserById(booking.customer_id)
  if (userData?.user?.email) {
    const { subject, html } = bookingCancelledEmail(courtName, booking.date, booking.start_time, booking.end_time)
    await sendEmail(userData.user.email, subject, html)
  }

  // Promote next waitlist entry
  const { data: nextWaitlist } = await supabase
    .from('waitlist_entries')
    .select('id, customer_id')
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

    // Send waitlist promotion email
    const { data: waitlistUser } = await adminClient.auth.admin.getUserById(nextWaitlist.customer_id)
    if (waitlistUser?.user?.email) {
      const bookingUrl = `${process.env.NEXT_PUBLIC_APP_URL || ''}/${slug}/courts/${booking.court_id}`
      const { subject, html } = waitlistPromotionEmail(courtName, booking.date, booking.start_time, booking.end_time, bookingUrl)
      await sendEmail(waitlistUser.user.email, subject, html)
    }
  }

  revalidatePath(`/${slug}/my-bookings`)
  return { error: null }
}
