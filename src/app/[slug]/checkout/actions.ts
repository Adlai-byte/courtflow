'use server'

import { createClient } from '@/lib/supabase/server'
import { getTenantBySlug } from '@/lib/tenant'
import { createCheckoutSession } from '@/lib/paymongo'

interface CheckoutItem {
  courtId: string
  courtName: string
  date: string
  startTime: string
  endTime: string
  recurring: boolean
  totalWeeks?: number
  price: number
}

export async function createPaymentCheckout(
  slug: string,
  items: CheckoutItem[]
): Promise<{ checkoutUrl?: string; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Not authenticated. Please sign in.' }
  }

  const tenant = await getTenantBySlug(slug)
  if (!tenant.require_payment) {
    return { error: 'This facility does not require online payment.' }
  }

  const totalAmount = items.reduce((sum, i) => sum + i.price, 0)
  if (totalAmount <= 0) {
    return { error: 'Invalid booking amount.' }
  }

  // Create pending bookings first
  const bookingIds: string[] = []
  for (const item of items) {
    const { data: booking, error } = await supabase.from('bookings').insert({
      tenant_id: tenant.id,
      court_id: item.courtId,
      customer_id: user.id,
      date: item.date,
      start_time: item.startTime,
      end_time: item.endTime,
      status: 'pending',
      amount: item.price,
      payment_status: 'pending',
    }).select('id').single()

    if (error) {
      // Clean up any already-created bookings
      if (bookingIds.length > 0) {
        await supabase.from('bookings').delete().in('id', bookingIds)
      }
      return { error: `Failed to create booking: ${error.message}` }
    }
    bookingIds.push(booking.id)
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://courtflow-app.vercel.app'
  const description = `${items.length} court booking(s) at ${tenant.name}`

  try {
    const { checkoutUrl, checkoutId } = await createCheckoutSession({
      amount: totalAmount,
      description,
      metadata: {
        tenant_id: tenant.id,
        booking_ids: bookingIds.join(','),
        user_id: user.id,
        slug,
      },
      successUrl: `${appUrl}/${slug}/booking-success?booking_ids=${bookingIds.join(',')}`,
      cancelUrl: `${appUrl}/${slug}`,
    })

    // Store the checkout ID on bookings
    await supabase.from('bookings')
      .update({ payment_id: checkoutId })
      .in('id', bookingIds)

    return { checkoutUrl }
  } catch (err: any) {
    // Clean up pending bookings on payment failure
    await supabase.from('bookings').delete().in('id', bookingIds)
    return { error: err.message || 'Payment setup failed.' }
  }
}
