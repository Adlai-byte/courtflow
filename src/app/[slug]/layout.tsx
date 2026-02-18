import { getTenantBySlug } from '@/lib/tenant'
import { createClient } from '@/lib/supabase/server'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
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

  let initials = 'U'
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', user.id)
      .single()
    if (profile?.full_name) {
      initials = profile.full_name
        .split(' ')
        .map((n: string) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    }
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
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="focus:outline-none">
                  <Avatar className="h-8 w-8 border border-border cursor-pointer transition-colors hover:border-primary/50">
                    <AvatarFallback className="bg-primary/10 font-mono text-xs text-primary">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem asChild>
                  <form action={signOut} className="w-full">
                    <button type="submit" className="flex w-full items-center gap-2 cursor-pointer text-destructive">
                      <LogOut className="h-4 w-4" />
                      <span className="font-mono text-xs">Sign Out</span>
                    </button>
                  </form>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
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
