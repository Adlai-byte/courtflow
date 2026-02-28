import { getTenantBySlug } from '@/lib/tenant'
import { createClient } from '@/lib/supabase/server'
import { LogOut } from 'lucide-react'
import { redirect } from 'next/navigation'
import { CartProviderWrapper } from '@/components/booking/cart-provider-wrapper'
import { Toaster } from '@/components/ui/sonner'
import { CustomerSidebar, CustomerMobileSidebar } from '@/components/customer/sidebar'

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
        <header className="flex h-14 items-center justify-between border-b bg-card px-4">
          <div className="flex items-center gap-3">
            <CustomerMobileSidebar
              slug={slug}
              tenantName={tenant.name}
              isAuthenticated={!!user}
              signOutAction={signOut}
            />
            <span className="font-mono text-sm font-medium tracking-tight md:hidden">
              {tenant.name}
            </span>
          </div>
          {user && (
            <form action={signOut}>
              <button
                type="submit"
                className="flex items-center gap-2 rounded-md px-3 py-1.5 font-mono text-xs text-muted-foreground transition-colors hover:text-destructive"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">Sign Out</span>
              </button>
            </form>
          )}
        </header>
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
