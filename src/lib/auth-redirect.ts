import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Resolves the appropriate dashboard URL for a user based on their role.
 * - platform_admin → /admin
 * - business_owner → /dashboard/{slug} (or /onboarding if no tenant)
 * - customer → /explore
 */
export async function getDashboardUrl(supabase: SupabaseClient, userId: string): Promise<string> {
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .single()

  if (!profile) return '/explore'

  if (profile.role === 'platform_admin') {
    return '/admin'
  }

  if (profile.role === 'business_owner') {
    const { data: tenant } = await supabase
      .from('tenants')
      .select('slug')
      .eq('owner_id', userId)
      .limit(1)
      .single()

    return tenant ? `/dashboard/${tenant.slug}` : '/onboarding'
  }

  // customer — always go to explore page
  return '/explore'
}
