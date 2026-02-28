import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function DashboardIndexPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Check if user is a business owner with a tenant
  const { data: tenant } = await supabase
    .from('tenants')
    .select('slug')
    .eq('owner_id', user.id)
    .limit(1)
    .maybeSingle()

  if (tenant) {
    redirect(`/dashboard/${tenant.slug}`)
  }

  // Check user role from profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()

  // Platform admins go to admin dashboard
  if (profile?.role === 'platform_admin') {
    redirect('/admin')
  }

  // Customers go back to home — they browse public tenant pages, not a dashboard
  if (profile?.role === 'customer') {
    redirect('/')
  }

  // Business owners without a tenant go to onboarding
  redirect('/onboarding')
}
