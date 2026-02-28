'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import type { BookingMode, SportType } from '@/lib/types'

export async function createCourt(tenantId: string, slug: string, formData: FormData) {
  const supabase = await createClient()

  const amenitiesRaw = formData.get('amenities') as string
  const amenities = amenitiesRaw ? JSON.parse(amenitiesRaw) : {}

  const { error } = await supabase.from('courts').insert({
    tenant_id: tenantId,
    name: formData.get('name') as string,
    sport_type: formData.get('sport_type') as SportType,
    description: formData.get('description') as string || null,
    image_url: formData.get('image_url') as string || null,
    booking_mode: formData.get('booking_mode') as BookingMode,
    slot_duration_minutes: parseInt(formData.get('slot_duration_minutes') as string) || 60,
    min_duration_minutes: parseInt(formData.get('min_duration_minutes') as string) || 30,
    max_duration_minutes: parseInt(formData.get('max_duration_minutes') as string) || 180,
    amenities,
  })

  if (error) {
    return { error: error.message }
  }

  revalidatePath(`/dashboard/${slug}/courts`)
  return { error: null }
}

export async function updateCourt(courtId: string, slug: string, formData: FormData) {
  const supabase = await createClient()

  const amenitiesRaw = formData.get('amenities') as string
  const amenities = amenitiesRaw ? JSON.parse(amenitiesRaw) : {}

  const { error } = await supabase
    .from('courts')
    .update({
      name: formData.get('name') as string,
      sport_type: formData.get('sport_type') as SportType,
      description: formData.get('description') as string || null,
      image_url: formData.get('image_url') as string || null,
      booking_mode: formData.get('booking_mode') as BookingMode,
      slot_duration_minutes: parseInt(formData.get('slot_duration_minutes') as string) || 60,
      min_duration_minutes: parseInt(formData.get('min_duration_minutes') as string) || 30,
      max_duration_minutes: parseInt(formData.get('max_duration_minutes') as string) || 180,
      is_active: formData.get('is_active') === 'true',
      amenities,
    })
    .eq('id', courtId)

  if (error) {
    return { error: error.message }
  }

  revalidatePath(`/dashboard/${slug}/courts`)
  return { error: null }
}

export async function deleteCourt(courtId: string, slug: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('courts')
    .delete()
    .eq('id', courtId)

  if (error) {
    return { error: error.message }
  }

  revalidatePath(`/dashboard/${slug}/courts`)
  return { error: null }
}
