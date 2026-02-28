'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function createBusiness(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const name = formData.get('name') as string
  const slug = (formData.get('slug') as string)
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')

  const description = formData.get('description') as string

  // Check if slug is taken
  const { data: existing } = await supabase
    .from('tenants')
    .select('id')
    .eq('slug', slug)
    .maybeSingle()

  if (existing) {
    redirect(`/onboarding?error=${encodeURIComponent('This URL is already taken. Choose another.')}`)
  }

  const { error } = await supabase.from('tenants').insert({
    name,
    slug,
    description,
    owner_id: user.id,
  })

  if (error) {
    redirect(`/onboarding?error=${encodeURIComponent(error.message)}`)
  }

  redirect(`/dashboard/${slug}`)
}
