'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getTenantBySlug } from '@/lib/tenant'
import { sendEmail } from '@/lib/email'
import { bookingConfirmedEmail } from '@/lib/email-templates'

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
  })

  if (error) {
    return {
      error: error.message.includes('overlaps')
        ? 'Sorry, this slot was just booked. Please try another.'
        : error.message,
    }
  }

  // Send confirmation email
  const adminClient = createAdminClient()
  const { data: userData } = await adminClient.auth.admin.getUserById(user.id)
  if (userData?.user?.email) {
    const { subject, html } = bookingConfirmedEmail(court.name, date, startTime, endTime)
    await sendEmail(userData.user.email, subject, html)
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
      .eq('status', 'confirmed')
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
      })

      if (!bookError) {
        booked++
      }
    }
  }

  // Send confirmation email for the series
  const adminClient = createAdminClient()
  const { data: userData } = await adminClient.auth.admin.getUserById(user.id)
  if (userData?.user?.email) {
    const { subject, html } = bookingConfirmedEmail(
      court.name,
      `${date} (weekly for ${totalWeeks} weeks)`,
      startTime,
      endTime
    )
    await sendEmail(userData.user.email, subject, html)
  }

  return { error: null, booked, waitlisted }
}
