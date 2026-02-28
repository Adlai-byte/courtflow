'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import { requirePlatformAdmin } from '@/lib/admin'

export async function createPartner(formData: FormData) {
  await requirePlatformAdmin()
  const supabase = createAdminClient()

  const logoUrl = formData.get('logo_url') as string
  if (!logoUrl) return { error: 'Logo is required' }

  const { error } = await supabase.from('partners').insert({
    name: formData.get('name') as string,
    logo_url: logoUrl,
    website_url: (formData.get('website_url') as string) || null,
    sort_order: parseInt(formData.get('sort_order') as string, 10) || 0,
    is_active: formData.get('is_active') === 'true',
  })

  if (error) return { error: error.message }

  revalidatePath('/admin/partners')
  revalidatePath('/')
  redirect('/admin/partners')
}

export async function updatePartner(id: string, formData: FormData) {
  await requirePlatformAdmin()
  const supabase = createAdminClient()

  const logoUrl = formData.get('logo_url') as string
  if (!logoUrl) return { error: 'Logo is required' }

  const { error } = await supabase
    .from('partners')
    .update({
      name: formData.get('name') as string,
      logo_url: logoUrl,
      website_url: (formData.get('website_url') as string) || null,
      sort_order: parseInt(formData.get('sort_order') as string, 10) || 0,
      is_active: formData.get('is_active') === 'true',
    })
    .eq('id', id)

  if (error) return { error: error.message }

  revalidatePath('/admin/partners')
  revalidatePath(`/admin/partners/${id}`)
  revalidatePath('/')
  return { error: null }
}

export async function deletePartner(id: string) {
  await requirePlatformAdmin()
  const supabase = createAdminClient()

  // Get logo URL to clean up storage
  const { data: partner } = await supabase
    .from('partners')
    .select('logo_url')
    .eq('id', id)
    .single()

  if (partner?.logo_url) {
    // Extract path from public URL
    const url = new URL(partner.logo_url)
    const pathMatch = url.pathname.match(/\/partner-logos\/(.+)$/)
    if (pathMatch) {
      await supabase.storage.from('partner-logos').remove([pathMatch[1]])
    }
  }

  const { error } = await supabase.from('partners').delete().eq('id', id)

  if (error) return { error: error.message }

  revalidatePath('/admin/partners')
  revalidatePath('/')
  redirect('/admin/partners')
}

export async function togglePartnerActive(id: string, isActive: boolean) {
  await requirePlatformAdmin()
  const supabase = createAdminClient()

  const { error } = await supabase
    .from('partners')
    .update({ is_active: isActive })
    .eq('id', id)

  if (error) return { error: error.message }

  revalidatePath('/admin/partners')
  revalidatePath('/')
  return { error: null }
}

export async function uploadPartnerLogo(formData: FormData) {
  await requirePlatformAdmin()
  const supabase = createAdminClient()

  const file = formData.get('file') as File
  if (!file) return { error: 'No file provided', url: null }

  const ext = file.name.split('.').pop()
  const path = `${Date.now()}.${ext}`

  const { error: uploadError } = await supabase.storage
    .from('partner-logos')
    .upload(path, file, { upsert: true })

  if (uploadError) return { error: uploadError.message, url: null }

  const { data: { publicUrl } } = supabase.storage
    .from('partner-logos')
    .getPublicUrl(path)

  return { error: null, url: publicUrl }
}
