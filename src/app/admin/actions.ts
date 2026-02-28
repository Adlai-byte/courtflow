'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import { requirePlatformAdmin } from '@/lib/admin'
import { sendEmail } from '@/lib/email'
import { bookingCancelledEmail, waitlistPromotionEmail } from '@/lib/email-templates'
import type { UserRole } from '@/lib/types'

// ── Tenant Actions ──

export async function updateTenantAdmin(tenantId: string, formData: FormData) {
  await requirePlatformAdmin()
  const supabase = createAdminClient()

  const cancellationHours = parseInt(formData.get('cancellation_hours') as string, 10)

  const { error } = await supabase
    .from('tenants')
    .update({
      name: formData.get('name') as string,
      description: (formData.get('description') as string) || null,
      cancellation_hours: isNaN(cancellationHours) ? 24 : cancellationHours,
    })
    .eq('id', tenantId)

  if (error) return { error: error.message }

  revalidatePath(`/admin/tenants/${tenantId}`)
  revalidatePath('/admin/tenants')
  return { error: null }
}

export async function deleteTenantAdmin(tenantId: string) {
  await requirePlatformAdmin()
  const supabase = createAdminClient()

  const { error } = await supabase
    .from('tenants')
    .delete()
    .eq('id', tenantId)

  if (error) return { error: error.message }

  revalidatePath('/admin/tenants')
  redirect('/admin/tenants')
}

// ── User Actions ──

export async function updateUserRole(userId: string, newRole: UserRole) {
  await requirePlatformAdmin()
  const supabase = createAdminClient()

  const { error } = await supabase
    .from('profiles')
    .update({ role: newRole })
    .eq('id', userId)

  if (error) return { error: error.message }

  // Also update auth user metadata
  await supabase.auth.admin.updateUserById(userId, {
    user_metadata: { role: newRole },
  })

  revalidatePath(`/admin/users/${userId}`)
  revalidatePath('/admin/users')
  return { error: null }
}

export async function deleteUser(userId: string) {
  await requirePlatformAdmin()
  const supabase = createAdminClient()

  const { error } = await supabase.auth.admin.deleteUser(userId)

  if (error) return { error: error.message }

  revalidatePath('/admin/users')
  redirect('/admin/users')
}

// ── Booking Actions ──

export async function adminCancelBooking(bookingId: string) {
  await requirePlatformAdmin()
  const supabase = createAdminClient()

  const { data: booking } = await supabase
    .from('bookings')
    .select('court_id, customer_id, tenant_id, date, start_time, end_time, courts ( name ), tenants ( slug )')
    .eq('id', bookingId)
    .in('status', ['confirmed', 'pending'])
    .single()

  if (!booking) return { error: 'Booking not found' }

  const { error } = await supabase
    .from('bookings')
    .update({ status: 'cancelled' })
    .eq('id', bookingId)

  if (error) return { error: error.message }

  const courtName = (booking.courts as any)?.name || 'Court'
  const slug = (booking.tenants as any)?.slug || ''

  // Send cancellation email
  const { data: userData } = await supabase.auth.admin.getUserById(booking.customer_id)
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

    const { data: waitlistUser } = await supabase.auth.admin.getUserById(nextWaitlist.customer_id)
    if (waitlistUser?.user?.email) {
      const bookingUrl = `${process.env.NEXT_PUBLIC_APP_URL || ''}/${slug}/courts/${booking.court_id}`
      const { subject, html } = waitlistPromotionEmail(courtName, booking.date, booking.start_time, booking.end_time, bookingUrl)
      await sendEmail(waitlistUser.user.email, subject, html)
    }
  }

  revalidatePath('/admin/bookings')
  return { error: null }
}

// ── Court Actions ──

export async function toggleCourtActive(courtId: string, isActive: boolean) {
  await requirePlatformAdmin()
  const supabase = createAdminClient()

  const { error } = await supabase
    .from('courts')
    .update({ is_active: isActive })
    .eq('id', courtId)

  if (error) return { error: error.message }

  revalidatePath('/admin/courts')
  return { error: null }
}
