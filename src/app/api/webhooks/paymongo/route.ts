import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendEmail } from '@/lib/email'
import { sendSMS } from '@/lib/sms'
import { batchBookingConfirmedEmail, batchBookingPendingEmail } from '@/lib/email-templates'

export async function POST(req: NextRequest) {
  const body = await req.text()

  // Verify webhook (basic check -- enhance with HMAC in production)
  const webhookSecret = process.env.PAYMONGO_WEBHOOK_SECRET
  if (!webhookSecret) {
    console.error('[PAYMONGO WEBHOOK] No webhook secret configured')
    return NextResponse.json({ error: 'Not configured' }, { status: 500 })
  }

  let event: any
  try {
    event = JSON.parse(body)
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const eventType = event?.data?.attributes?.type
  if (eventType !== 'checkout_session.payment.paid') {
    return NextResponse.json({ received: true })
  }

  const checkoutData = event.data.attributes.data
  const metadata = checkoutData?.attributes?.metadata
  if (!metadata?.booking_ids) {
    return NextResponse.json({ received: true })
  }

  const bookingIds = metadata.booking_ids.split(',')
  const tenantId = metadata.tenant_id
  const userId = metadata.user_id

  const supabase = createAdminClient()

  // Get tenant for auto_approve setting
  const { data: tenant } = await supabase
    .from('tenants')
    .select('auto_approve, name, contact_phone')
    .eq('id', tenantId)
    .single()

  const newStatus = tenant?.auto_approve ? 'confirmed' : 'pending'

  // Update bookings
  const paymentId = checkoutData?.attributes?.payments?.[0]?.id || checkoutData?.id
  await supabase.from('bookings')
    .update({
      payment_status: 'paid',
      payment_id: paymentId || null,
      status: newStatus,
    })
    .in('id', bookingIds)

  // Create payment record
  const totalAmount = checkoutData?.attributes?.line_items?.reduce(
    (sum: number, li: any) => sum + (li.amount / 100), 0
  ) || 0

  await supabase.from('payments').insert({
    tenant_id: tenantId,
    booking_id: bookingIds[0],
    amount: totalAmount,
    currency: 'PHP',
    status: 'paid',
    provider: 'paymongo',
    provider_payment_id: paymentId,
    provider_checkout_id: checkoutData?.id,
    paid_at: new Date().toISOString(),
  })

  // Send confirmation email + SMS to customer
  const { data: userData } = await supabase.auth.admin.getUserById(userId)
  if (userData?.user?.email) {
    const { data: bookings } = await supabase
      .from('bookings')
      .select('*, courts(name)')
      .in('id', bookingIds)

    if (bookings && bookings.length > 0) {
      const results = bookings.map((b: any) => ({
        courtName: b.courts?.name || 'Court',
        date: b.date,
        startTime: b.start_time,
        endTime: b.end_time,
        success: true,
      }))

      // Use batch confirmed email if auto_approve, otherwise pending
      const emailFn = tenant?.auto_approve ? batchBookingConfirmedEmail : batchBookingPendingEmail
      const { subject, html } = emailFn(results)
      await sendEmail(userData.user.email, subject, html)
    }
  }

  // SMS to customer
  const { data: profile } = await supabase
    .from('profiles')
    .select('phone')
    .eq('id', userId)
    .single()
  if (profile?.phone) {
    const statusLabel = tenant?.auto_approve ? 'confirmed' : 'paid - awaiting approval'
    await sendSMS(
      profile.phone,
      `CourtFLOW: Payment received! Your ${bookingIds.length} booking(s) at ${tenant?.name} ${statusLabel === 'confirmed' ? 'are confirmed' : 'are ' + statusLabel}.`
    )
  }

  return NextResponse.json({ received: true })
}
