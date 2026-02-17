import { requireTenantOwner } from '@/lib/tenant'
import { Sidebar } from '@/components/dashboard/sidebar'
import { Topbar } from '@/components/dashboard/topbar'

export default async function DashboardLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const { tenant, profile } = await requireTenantOwner(slug)

  return (
    <div className="flex h-screen">
      <Sidebar slug={slug} tenantName={tenant.name} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Topbar profile={profile} tenant={tenant} slug={slug} />
        <main className="flex-1 overflow-y-auto bg-background p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
