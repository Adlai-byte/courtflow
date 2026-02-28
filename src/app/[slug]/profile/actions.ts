'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function updateProfile(slug: string, formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { error } = await supabase
    .from('profiles')
    .update({
      full_name: formData.get('full_name') as string || null,
      phone: formData.get('phone') as string || null,
    })
    .eq('id', user.id)

  if (error) return { error: error.message }

  revalidatePath(`/${slug}/profile`)
  return { error: null }
}

export async function updateAvatarUrl(slug: string, avatarUrl: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { error } = await supabase
    .from('profiles')
    .update({ avatar_url: avatarUrl })
    .eq('id', user.id)

  if (error) return { error: error.message }

  revalidatePath(`/${slug}`, 'layout')
  revalidatePath(`/${slug}/profile`)
  return { error: null }
}
