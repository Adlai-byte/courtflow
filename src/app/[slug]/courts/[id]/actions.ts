'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getTenantBySlug } from '@/lib/tenant'
import { sendEmail } from '@/lib/email'
import { bookingPendingEmail, batchBookingPendingEmail, newBookingRequestEmail } from '@/lib/email-templates'

export async function createSingleBooking(
  courtId: string,
  slug: string,
  date: string,
  startTime: string,
  endTime: string
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Not authenticated' }
  }

  const tenant = await getTenantBySlug(slug)

  const { data: court } = await supabase
    .from('courts')
    .select('name')
    .eq('id', courtId)
    .single()

  if (!court) {
    return { error: 'Court not found' }
  }

  const { error } = await supabase.from('bookings').insert({
    tenant_id: tenant.id,
    court_id: courtId,
    customer_id: user.id,
    date,
    start_time: startTime,
    end_time: endTime,
    status: 'pending',
  })

  if (error) {
    return {
      error: error.message.includes('overlaps')
        ? 'Sorry, this slot was just booked. Please try another.'
        : error.message,
    }
  }

  // Send pending email to customer
  const adminClient = createAdminClient()
  const { data: userData } = await adminClient.auth.admin.getUserById(user.id)
  if (userData?.user?.email) {
    const { subject, html } = bookingPendingEmail(court.name, date, startTime, endTime)
    await sendEmail(userData.user.email, subject, html)
  }

  // Send new booking request email to owner
  if (tenant.owner_id) {
    const { data: ownerUser } = await adminClient.auth.admin.getUserById(tenant.owner_id)
    if (ownerUser?.user?.email) {
      const customerName = userData?.user?.user_metadata?.full_name || userData?.user?.email || 'A customer'
      const { subject, html } = newBookingRequestEmail(customerName, court.name, date, startTime, endTime, tenant.name)
      await sendEmail(ownerUser.user.email, subject, html)
    }
  }

  return { error: null }
}

export async function createRecurringBooking(
  courtId: string,
  slug: string,
  date: string,
  startTime: string,
  endTime: string,
  totalWeeks: number
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Not authenticated', booked: 0, waitlisted: 0 }
  }

  const tenant = await getTenantBySlug(slug)

  const { data: court } = await supabase
    .from('courts')
    .select('name')
    .eq('id', courtId)
    .single()

  if (!court) {
    return { error: 'Court not found', booked: 0, waitlisted: 0 }
  }

  // Calculate day of week from first date
  const firstDate = new Date(date + 'T00:00:00')
  const dayOfWeek = firstDate.getDay()

  // Create the recurring series
  const { data: series, error: seriesError } = await supabase
    .from('recurring_series')
    .insert({
      tenant_id: tenant.id,
      court_id: courtId,
      customer_id: user.id,
      day_of_week: dayOfWeek,
      start_time: startTime,
      end_time: endTime,
      total_weeks: totalWeeks,
    })
    .select()
    .single()

  if (seriesError) {
    return { error: seriesError.message, booked: 0, waitlisted: 0 }
  }

  let booked = 0
  let waitlisted = 0

  for (let i = 0; i < totalWeeks; i++) {
    const weekDate = new Date(firstDate)
    weekDate.setDate(weekDate.getDate() + i * 7)
    const dateStr = weekDate.toISOString().split('T')[0]

    // Check if slot is available
    const { data: existing } = await supabase
      .from('bookings')
      .select('id')
      .eq('court_id', courtId)
      .eq('date', dateStr)
      .in('status', ['confirmed', 'pending'])
      .lt('start_time', endTime + ':00')
      .gt('end_time', startTime + ':00')
      .limit(1)

    if (existing && existing.length > 0) {
      // Slot taken — join waitlist
      const { count } = await supabase
        .from('waitlist_entries')
        .select('*', { count: 'exact', head: true })
        .eq('court_id', courtId)
        .eq('date', dateStr)
        .eq('start_time', startTime)

      await supabase.from('waitlist_entries').insert({
        tenant_id: tenant.id,
        court_id: courtId,
        customer_id: user.id,
        date: dateStr,
        start_time: startTime,
        end_time: endTime,
        recurring_series_id: series.id,
        position: (count || 0) + 1,
      })
      waitlisted++
    } else {
      // Slot available — book it
      const { error: bookError } = await supabase.from('bookings').insert({
        tenant_id: tenant.id,
        court_id: courtId,
        customer_id: user.id,
        date: dateStr,
        start_time: startTime,
        end_time: endTime,
        recurring_series_id: series.id,
        status: 'pending',
      })

      if (!bookError) {
        booked++
      }
    }
  }

  // Send pending email for the series using batch template
  const adminClient = createAdminClient()
  const { data: userData } = await adminClient.auth.admin.getUserById(user.id)
  if (userData?.user?.email) {
    const bookingItems = []
    for (let i = 0; i < totalWeeks; i++) {
      const weekDate = new Date(firstDate)
      weekDate.setDate(weekDate.getDate() + i * 7)
      bookingItems.push({
        courtName: court.name,
        date: weekDate.toISOString().split('T')[0],
        startTime,
        endTime,
        recurring: true,
      })
    }
    const { subject, html } = batchBookingPendingEmail(bookingItems)
    await sendEmail(userData.user.email, subject, html)
  }

  // Notify tenant owner about new recurring booking request
  const { data: ownerData } = await supabase
    .from('tenants')
    .select('owner_id')
    .eq('id', tenant.id)
    .single()
  if (ownerData) {
    const { data: ownerUser } = await adminClient.auth.admin.getUserById(ownerData.owner_id)
    if (ownerUser?.user?.email) {
      const customerName = userData?.user?.user_metadata?.full_name || userData?.user?.email || 'A customer'
      const { subject, html } = newBookingRequestEmail(customerName, court.name, date, startTime, endTime, tenant.name)
      await sendEmail(ownerUser.user.email, subject, html)
    }
  }

  return { error: null, booked, waitlisted }
}
