'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { requireTenantOwner } from '@/lib/tenant'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendEmail } from '@/lib/email'
import { bookingCancelledEmail, waitlistPromotionEmail, bookingApprovedEmail, bookingRejectedEmail } from '@/lib/email-templates'
import { sendSMS } from '@/lib/sms'
import { createRefund } from '@/lib/paymongo'

export async function approveBooking(bookingId: string, slug: string) {
  const { tenant } = await requireTenantOwner(slug)
  const supabase = await createClient()

  const { data: booking } = await supabase
    .from('bookings')
    .select('customer_id, date, start_time, end_time, courts ( name )')
    .eq('id', bookingId)
    .eq('tenant_id', tenant.id)
    .eq('status', 'pending')
    .single()

  if (!booking) return { error: 'Booking not found or not pending' }

  const { error } = await supabase
    .from('bookings')
    .update({ status: 'confirmed' })
    .eq('id', bookingId)

  if (error) return { error: error.message }

  // Send approved email to customer
  const adminClient = createAdminClient()
  const courtName = (booking.courts as any)?.name || 'Court'
  const { data: userData } = await adminClient.auth.admin.getUserById(booking.customer_id)
  if (userData?.user?.email) {
    const { subject, html } = bookingApprovedEmail(courtName, booking.date, booking.start_time, booking.end_time)
    await sendEmail(userData.user.email, subject, html)
  }

  // Send SMS notification to customer
  const { data: approveProfile } = await supabase.from('profiles').select('phone').eq('id', booking.customer_id).single()
  if (approveProfile?.phone) {
    await sendSMS(approveProfile.phone, `CourtFLOW: Your booking at ${courtName} on ${booking.date} has been approved!`)
  }

  revalidatePath(`/dashboard/${slug}/bookings`)
  revalidatePath(`/dashboard/${slug}`)
  return { error: null }
}

export async function rejectBooking(bookingId: string, slug: string, reason?: string) {
  const { tenant } = await requireTenantOwner(slug)
  const supabase = await createClient()

  const { data: booking } = await supabase
    .from('bookings')
    .select('court_id, customer_id, date, start_time, end_time, courts ( name )')
    .eq('id', bookingId)
    .eq('tenant_id', tenant.id)
    .eq('status', 'pending')
    .single()

  if (!booking) return { error: 'Booking not found or not pending' }

  const { error } = await supabase
    .from('bookings')
    .update({ status: 'cancelled', rejection_reason: reason || null })
    .eq('id', bookingId)

  if (error) return { error: error.message }

  const adminClient = createAdminClient()
  const courtName = (booking.courts as any)?.name || 'Court'

  // Send rejected email to customer
  const { data: userData } = await adminClient.auth.admin.getUserById(booking.customer_id)
  if (userData?.user?.email) {
    const { subject, html } = bookingRejectedEmail(courtName, booking.date, booking.start_time, booking.end_time, reason)
    await sendEmail(userData.user.email, subject, html)
  }

  // Send SMS notification to customer
  const { data: rejectProfile } = await supabase.from('profiles').select('phone').eq('id', booking.customer_id).single()
  if (rejectProfile?.phone) {
    await sendSMS(rejectProfile.phone, `CourtFLOW: Your booking at ${courtName} on ${booking.date} was not approved. Contact the facility for details.`)
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
    .maybeSingle()

  if (nextWaitlist) {
    await supabase
      .from('waitlist_entries')
      .update({ status: 'notified', notified_at: new Date().toISOString() })
      .eq('id', nextWaitlist.id)

    const { data: waitlistUser } = await adminClient.auth.admin.getUserById(nextWaitlist.customer_id)
    if (waitlistUser?.user?.email) {
      const bookingUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://courtflow-app.vercel.app'}/${slug}/courts/${booking.court_id}`
      const { subject, html } = waitlistPromotionEmail(courtName, booking.date, booking.start_time, booking.end_time, bookingUrl)
      await sendEmail(waitlistUser.user.email, subject, html)
    }
  }

  revalidatePath(`/dashboard/${slug}/bookings`)
  revalidatePath(`/dashboard/${slug}`)
  return { error: null }
}

export async function approveRecurringSeries(seriesId: string, slug: string) {
  const { tenant } = await requireTenantOwner(slug)
  const supabase = await createClient()

  const { data: pendingBookings } = await supabase
    .from('bookings')
    .select('id, customer_id, date, start_time, end_time, courts ( name )')
    .eq('tenant_id', tenant.id)
    .eq('recurring_series_id', seriesId)
    .eq('status', 'pending')

  if (!pendingBookings || pendingBookings.length === 0) {
    return { error: 'No pending bookings found for this series', count: 0 }
  }

  const ids = pendingBookings.map((b: any) => b.id)
  const { error } = await supabase
    .from('bookings')
    .update({ status: 'confirmed' })
    .in('id', ids)

  if (error) return { error: error.message, count: 0 }

  // Send one confirmation email to the customer
  const first = pendingBookings[0] as any
  const adminClient = createAdminClient()
  const { data: userData } = await adminClient.auth.admin.getUserById(first.customer_id)
  if (userData?.user?.email) {
    const courtName = first.courts?.name || 'Court'
    const { subject, html } = bookingApprovedEmail(
      courtName,
      `${pendingBookings.length} bookings in recurring series`,
      first.start_time,
      first.end_time
    )
    await sendEmail(userData.user.email, subject, html)
  }

  // Send SMS notification to customer
  const { data: recurringProfile } = await supabase.from('profiles').select('phone').eq('id', first.customer_id).single()
  if (recurringProfile?.phone) {
    await sendSMS(recurringProfile.phone, `CourtFLOW: All ${pendingBookings.length} bookings in your recurring series have been approved!`)
  }

  revalidatePath(`/dashboard/${slug}/bookings`)
  revalidatePath(`/dashboard/${slug}`)
  return { error: null, count: pendingBookings.length }
}

export async function ownerCancelBooking(bookingId: string, slug: string) {
  const { tenant } = await requireTenantOwner(slug)
  const supabase = await createClient()

  // Fetch booking with court name and customer
  const { data: booking } = await supabase
    .from('bookings')
    .select('court_id, customer_id, date, start_time, end_time, amount, payment_status, payment_id, courts ( name )')
    .eq('id', bookingId)
    .eq('tenant_id', tenant.id)
    .in('status', ['confirmed', 'pending'])
    .single()

  if (!booking) return { error: 'Booking not found' }

  const { error } = await supabase
    .from('bookings')
    .update({ status: 'cancelled' })
    .eq('id', bookingId)

  if (error) return { error: error.message }

  // If booking was paid, process refund
  if ((booking as any).payment_status === 'paid' && (booking as any).payment_id) {
    try {
      await createRefund((booking as any).payment_id, (booking as any).amount, 'Owner cancelled booking')
      await supabase.from('bookings')
        .update({ payment_status: 'refunded' })
        .eq('id', bookingId)
      await supabase.from('payments')
        .update({ status: 'refunded' })
        .eq('booking_id', bookingId)
    } catch (err) {
      console.error('[REFUND ERROR]', err)
      // Don't block cancellation if refund fails — log for manual resolution
    }
  }

  const adminClient = createAdminClient()
  const courtName = (booking.courts as any)?.name || 'Court'

  // Send cancellation email to customer
  const { data: userData } = await adminClient.auth.admin.getUserById(booking.customer_id)
  if (userData?.user?.email) {
    const { subject, html } = bookingCancelledEmail(courtName, booking.date, booking.start_time, booking.end_time)
    await sendEmail(userData.user.email, subject, html)
  }

  // Send SMS notification to customer
  const { data: cancelProfile } = await supabase.from('profiles').select('phone').eq('id', booking.customer_id).single()
  if (cancelProfile?.phone) {
    await sendSMS(cancelProfile.phone, `CourtFLOW: Your booking at ${courtName} on ${booking.date} has been cancelled by the facility.`)
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
    .maybeSingle()

  if (nextWaitlist) {
    await supabase
      .from('waitlist_entries')
      .update({ status: 'notified', notified_at: new Date().toISOString() })
      .eq('id', nextWaitlist.id)

    // Send waitlist promotion email
    const { data: waitlistUser } = await adminClient.auth.admin.getUserById(nextWaitlist.customer_id)
    if (waitlistUser?.user?.email) {
      const bookingUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://courtflow-app.vercel.app'}/${slug}/courts/${booking.court_id}`
      const { subject, html } = waitlistPromotionEmail(courtName, booking.date, booking.start_time, booking.end_time, bookingUrl)
      await sendEmail(waitlistUser.user.email, subject, html)
    }
  }

  revalidatePath(`/dashboard/${slug}/bookings`)
  revalidatePath(`/dashboard/${slug}`)
  return { error: null }
}
