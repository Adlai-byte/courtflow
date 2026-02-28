import { getTenantBySlug } from '@/lib/tenant'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { CartProviderWrapper } from '@/components/booking/cart-provider-wrapper'
import { Toaster } from '@/components/ui/sonner'
import { CustomerSidebar } from '@/components/customer/sidebar'
import { CustomerTopbar } from '@/components/customer/topbar'

export default async function BookingLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const tenant = await getTenantBySlug(slug)
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let profile: { full_name: string; avatar_url?: string | null; role?: string | null } | null = null
  if (user) {
    const { data } = await supabase
      .from('profiles')
      .select('full_name, avatar_url, role')
      .eq('id', user.id)
      .maybeSingle()
    profile = data
  }

  async function signOut() {
    'use server'
    const supabase = await createClient()
    await supabase.auth.signOut()
    redirect(`/login?redirect=/${slug}`)
  }

  return (
    <div className="flex h-screen">
      <CustomerSidebar
        slug={slug}
        tenantName={tenant.name}
        isAuthenticated={!!user}
        signOutAction={signOut}
      />
      <div className="flex flex-1 flex-col overflow-hidden">
        <CustomerTopbar
          slug={slug}
          tenantName={tenant.name}
          isAuthenticated={!!user}
          profile={profile}
          signOutAction={signOut}
        />
        <main className="flex-1 overflow-y-auto bg-background p-4 md:p-6">
          <div className="mx-auto max-w-7xl">
            <CartProviderWrapper slug={slug}>{children}</CartProviderWrapper>
          </div>
        </main>
        <Toaster />
      </div>
    </div>
  )
}
