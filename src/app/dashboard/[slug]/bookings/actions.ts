'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { requireTenantOwner } from '@/lib/tenant'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendEmail } from '@/lib/email'
import { bookingCancelledEmail, waitlistPromotionEmail, bookingApprovedEmail, bookingRejectedEmail } from '@/lib/email-templates'

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

  revalidatePath(`/dashboard/${slug}/bookings`)
  revalidatePath(`/dashboard/${slug}`)
  return { error: null }
}

export async function rejectBooking(bookingId: string, slug: string) {
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
    .update({ status: 'cancelled' })
    .eq('id', bookingId)

  if (error) return { error: error.message }

  const adminClient = createAdminClient()
  const courtName = (booking.courts as any)?.name || 'Court'

  // Send rejected email to customer
  const { data: userData } = await adminClient.auth.admin.getUserById(booking.customer_id)
  if (userData?.user?.email) {
    const { subject, html } = bookingRejectedEmail(courtName, booking.date, booking.start_time, booking.end_time)
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

export async function ownerCancelBooking(bookingId: string, slug: string) {
  const { tenant } = await requireTenantOwner(slug)
  const supabase = await createClient()

  // Fetch booking with court name and customer
  const { data: booking } = await supabase
    .from('bookings')
    .select('court_id, customer_id, date, start_time, end_time, courts ( name )')
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
