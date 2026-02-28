import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import type { Tenant, Profile } from '@/lib/types'

export const getTenantBySlug = cache(async (slug: string): Promise<Tenant> => {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('tenants')
    .select('*')
    .eq('slug', slug)
    .single()

  if (error || !data) {
    notFound()
  }

  return data as Tenant
})

export async function requireTenantOwner(slug: string): Promise<{ tenant: Tenant; profile: Profile }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const tenant = await getTenantBySlug(slug)

  // Allow tenant owner and platform admins
  const userRole = user.user_metadata?.role
  if (tenant.owner_id !== user.id && userRole !== 'platform_admin') {
    redirect('/')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle()

  return { tenant, profile: profile as Profile }
}
