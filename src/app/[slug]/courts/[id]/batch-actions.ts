'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getTenantBySlug } from '@/lib/tenant'
import { sendEmail } from '@/lib/email'
import { batchBookingPendingEmail, newBookingRequestEmail } from '@/lib/email-templates'

interface BatchItem {
  courtId: string
  courtName: string
  date: string
  startTime: string
  endTime: string
  recurring: boolean
  totalWeeks?: number
}

interface BatchResult {
  courtId: string
  courtName: string
  date: string
  startTime: string
  endTime: string
  success: boolean
  error?: string
  recurring?: boolean
}

export async function createBatchBooking(
  slug: string,
  items: BatchItem[]
): Promise<{
  results: BatchResult[]
  totalBooked: number
  totalFailed: number
  totalWaitlisted: number
  error?: string
}> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return {
      results: [],
      totalBooked: 0,
      totalFailed: 0,
      totalWaitlisted: 0,
      error: 'Not authenticated. Please sign in and try again.',
    }
  }

  const tenant = await getTenantBySlug(slug)

  const results: BatchResult[] = []
  let totalBooked = 0
  let totalFailed = 0
  let totalWaitlisted = 0

  for (const item of items) {
    if (item.recurring && item.totalWeeks) {
      // --- Recurring booking ---
      const firstDate = new Date(item.date + 'T00:00:00')
      const dayOfWeek = firstDate.getDay()

      const { data: series, error: seriesError } = await supabase
        .from('recurring_series')
        .insert({
          tenant_id: tenant.id,
          court_id: item.courtId,
          customer_id: user.id,
          day_of_week: dayOfWeek,
          start_time: item.startTime,
          end_time: item.endTime,
          total_weeks: item.totalWeeks,
        })
        .select()
        .single()

      if (seriesError) {
        results.push({
          courtId: item.courtId,
          courtName: item.courtName,
          date: item.date,
          startTime: item.startTime,
          endTime: item.endTime,
          success: false,
          error: seriesError.message,
          recurring: true,
        })
        totalFailed++
        continue
      }

      let weekBooked = 0
      let weekWaitlisted = 0

      for (let i = 0; i < item.totalWeeks; i++) {
        const weekDate = new Date(firstDate)
        weekDate.setDate(weekDate.getDate() + i * 7)
        const dateStr = weekDate.toISOString().split('T')[0]

        // Check if slot is available
        const { data: existing } = await supabase
          .from('bookings')
          .select('id')
          .eq('court_id', item.courtId)
          .eq('date', dateStr)
          .in('status', ['confirmed', 'pending'])
          .lt('start_time', item.endTime + ':00')
          .gt('end_time', item.startTime + ':00')
          .limit(1)

        if (existing && existing.length > 0) {
          // Slot taken — join waitlist
          const { count } = await supabase
            .from('waitlist_entries')
            .select('*', { count: 'exact', head: true })
            .eq('court_id', item.courtId)
            .eq('date', dateStr)
            .eq('start_time', item.startTime)

          await supabase.from('waitlist_entries').insert({
            tenant_id: tenant.id,
            court_id: item.courtId,
            customer_id: user.id,
            date: dateStr,
            start_time: item.startTime,
            end_time: item.endTime,
            recurring_series_id: series.id,
            position: (count || 0) + 1,
          })
          weekWaitlisted++
        } else {
          const { error: bookError } = await supabase.from('bookings').insert({
            tenant_id: tenant.id,
            court_id: item.courtId,
            customer_id: user.id,
            date: dateStr,
            start_time: item.startTime,
            end_time: item.endTime,
            recurring_series_id: series.id,
            status: 'pending',
          })

          if (!bookError) {
            weekBooked++
          }
        }
      }

      totalBooked += weekBooked
      totalWaitlisted += weekWaitlisted

      results.push({
        courtId: item.courtId,
        courtName: item.courtName,
        date: item.date,
        startTime: item.startTime,
        endTime: item.endTime,
        success: true,
        recurring: true,
      })
    } else {
      // --- Single booking ---
      const { error } = await supabase.from('bookings').insert({
        tenant_id: tenant.id,
        court_id: item.courtId,
        customer_id: user.id,
        date: item.date,
        start_time: item.startTime,
        end_time: item.endTime,
        status: 'pending',
      })

      if (error) {
        results.push({
          courtId: item.courtId,
          courtName: item.courtName,
          date: item.date,
          startTime: item.startTime,
          endTime: item.endTime,
          success: false,
          error: error.message.includes('overlaps')
            ? 'Slot was just booked by someone else'
            : error.message,
        })
        totalFailed++
      } else {
        results.push({
          courtId: item.courtId,
          courtName: item.courtName,
          date: item.date,
          startTime: item.startTime,
          endTime: item.endTime,
          success: true,
        })
        totalBooked++
      }
    }
  }

  // Send one consolidated confirmation email for successful bookings
  const successfulResults = results.filter((r) => r.success)
  if (successfulResults.length > 0) {
    const adminClient = createAdminClient()
    const { data: userData } = await adminClient.auth.admin.getUserById(user.id)
    if (userData?.user?.email) {
      const { subject, html } = batchBookingPendingEmail(successfulResults)
      await sendEmail(userData.user.email, subject, html)
    }

    // Notify tenant owner about new booking requests
    const { data: ownerData } = await supabase
      .from('tenants')
      .select('owner_id')
      .eq('id', tenant.id)
      .single()
    if (ownerData) {
      const { data: ownerUser } = await adminClient.auth.admin.getUserById(ownerData.owner_id)
      if (ownerUser?.user?.email) {
        const customerName = userData?.user?.user_metadata?.full_name || userData?.user?.email || 'A customer'
        const first = successfulResults[0]
        const summary = successfulResults.length === 1
          ? `${first.courtName} on ${first.date}`
          : `${successfulResults.length} bookings`
        const { subject, html } = newBookingRequestEmail(customerName, summary, first.date, first.startTime, first.endTime, tenant.name)
        await sendEmail(ownerUser.user.email, subject, html)
      }
    }
  }

  return { results, totalBooked, totalFailed, totalWaitlisted }
}
