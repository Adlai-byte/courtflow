import { requirePlatformAdmin } from '@/lib/admin'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { AdminSidebar } from '@/components/admin/sidebar'
import { AdminTopbar } from '@/components/admin/topbar'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { profile } = await requirePlatformAdmin()

  async function signOut() {
    'use server'
    const supabase = await createClient()
    await supabase.auth.signOut()
    redirect('/login')
  }

  return (
    <div className="flex h-screen">
      <a href="#main-content" className="skip-to-content">
        Skip to main content
      </a>
      <AdminSidebar signOutAction={signOut} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <AdminTopbar profile={profile} signOutAction={signOut} />
        <main id="main-content" className="flex-1 overflow-y-auto bg-background p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
