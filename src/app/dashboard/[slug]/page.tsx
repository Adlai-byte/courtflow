import { requireTenantOwner } from '@/lib/tenant'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CalendarDays, MapPin, Users, Clock } from 'lucide-react'

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const { tenant } = await requireTenantOwner(slug)

  const supabase = await createClient()
  const today = new Date().toISOString().split('T')[0]

  const [courtsRes, todayBookingsRes, membersRes, waitlistRes] = await Promise.all([
    supabase.from('courts').select('id', { count: 'exact', head: true }).eq('tenant_id', tenant.id),
    supabase.from('bookings').select('id', { count: 'exact', head: true }).eq('tenant_id', tenant.id).eq('date', today).eq('status', 'confirmed'),
    supabase.from('member_subscriptions').select('id', { count: 'exact', head: true }).eq('tenant_id', tenant.id).eq('status', 'active'),
    supabase.from('waitlist_entries').select('id', { count: 'exact', head: true }).eq('tenant_id', tenant.id).eq('status', 'waiting'),
  ])

  const stats = [
    { label: 'Total Courts', value: courtsRes.count || 0, icon: MapPin },
    { label: "Today's Bookings", value: todayBookingsRes.count || 0, icon: CalendarDays },
    { label: 'Active Members', value: membersRes.count || 0, icon: Users },
    { label: 'Waitlisted', value: waitlistRes.count || 0, icon: Clock },
  ]

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">{stat.label}</CardTitle>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
