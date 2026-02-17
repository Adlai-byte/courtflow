import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendEmail } from '@/lib/email'
import { bookingReminderEmail } from '@/lib/email-templates'

export async function GET(request: Request) {
  // Verify cron secret to prevent unauthorized access
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const adminClient = createAdminClient()

  // Get tomorrow's date
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  const tomorrowStr = tomorrow.toISOString().split('T')[0]

  // Fetch all confirmed bookings for tomorrow
  const { data: bookings, error } = await adminClient
    .from('bookings')
    .select('*, courts ( name )')
    .eq('date', tomorrowStr)
    .eq('status', 'confirmed')

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  let sent = 0

  for (const booking of bookings || []) {
    const { data: userData } = await adminClient.auth.admin.getUserById(booking.customer_id)
    if (userData?.user?.email) {
      const { subject, html } = bookingReminderEmail(
        (booking.courts as any)?.name || 'Court',
        booking.date,
        booking.start_time,
        booking.end_time
      )
      await sendEmail(userData.user.email, subject, html)
      sent++
    }
  }

  return NextResponse.json({ sent, date: tomorrowStr })
}
