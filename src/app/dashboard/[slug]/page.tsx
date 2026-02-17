import { requireTenantOwner } from '@/lib/tenant'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { CalendarDays, MapPin, Users, Clock } from 'lucide-react'

const statusColors: Record<string, string> = {
  confirmed: 'bg-green/10 text-green border-green/20',
  completed: 'bg-muted text-muted-foreground border-border',
  cancelled: 'bg-destructive/10 text-destructive border-destructive/20',
  no_show: 'bg-amber-100 text-amber-700 border-amber-200',
}

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const { tenant } = await requireTenantOwner(slug)

  const supabase = await createClient()
  const today = new Date().toISOString().split('T')[0]

  const [courtsRes, todayBookingsRes, membersRes, waitlistRes, recentBookingsRes] = await Promise.all([
    supabase.from('courts').select('id', { count: 'exact', head: true }).eq('tenant_id', tenant.id),
    supabase.from('bookings').select('id', { count: 'exact', head: true }).eq('tenant_id', tenant.id).eq('date', today).eq('status', 'confirmed'),
    supabase.from('member_subscriptions').select('id', { count: 'exact', head: true }).eq('tenant_id', tenant.id).eq('status', 'active'),
    supabase.from('waitlist_entries').select('id', { count: 'exact', head: true }).eq('tenant_id', tenant.id).eq('status', 'waiting'),
    supabase.from('bookings').select('*, courts ( name ), profiles:customer_id ( full_name )').eq('tenant_id', tenant.id).order('created_at', { ascending: false }).limit(5),
  ])

  const stats = [
    { label: 'Total Courts', value: courtsRes.count || 0, icon: MapPin, color: 'text-primary' },
    { label: "Today's Bookings", value: todayBookingsRes.count || 0, icon: CalendarDays, color: 'text-chart-3' },
    { label: 'Active Members', value: membersRes.count || 0, icon: Users, color: 'text-chart-2' },
    { label: 'Waitlisted', value: waitlistRes.count || 0, icon: Clock, color: 'text-chart-4' },
  ]

  const recentBookings = recentBookingsRes.data || []

  return (
    <div className="space-y-8">
      <div>
        <span className="section-label mb-4 block">[ OVERVIEW ]</span>
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => (
            <Card key={stat.label}>
              <CardContent className="p-4 md:p-6">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
                    {stat.label}
                  </span>
                  <stat.icon className={cn('h-4 w-4', stat.color)} />
                </div>
                <div className="mt-2 text-3xl font-bold tracking-tight">
                  {stat.value}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <div>
        <span className="section-label mb-4 block">[ RECENT BOOKINGS ]</span>
        <Card>
          <CardContent className="p-0">
            {recentBookings.length === 0 ? (
              <div className="flex items-center justify-center py-12">
                <p className="text-sm text-muted-foreground">No bookings yet.</p>
              </div>
            ) : (
              <>
                <div className="hidden md:block">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b text-left">
                        <th className="p-4 font-mono text-xs uppercase tracking-wider text-muted-foreground font-medium">Customer</th>
                        <th className="p-4 font-mono text-xs uppercase tracking-wider text-muted-foreground font-medium">Court</th>
                        <th className="p-4 font-mono text-xs uppercase tracking-wider text-muted-foreground font-medium">Date</th>
                        <th className="p-4 font-mono text-xs uppercase tracking-wider text-muted-foreground font-medium">Time</th>
                        <th className="p-4 font-mono text-xs uppercase tracking-wider text-muted-foreground font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentBookings.map((booking: any, i: number) => (
                        <tr key={booking.id} className={i % 2 === 1 ? 'bg-muted/30' : ''}>
                          <td className="p-4 text-sm">{booking.profiles?.full_name || 'Unknown'}</td>
                          <td className="p-4 text-sm">{booking.courts?.name}</td>
                          <td className="p-4 font-mono text-sm">{booking.date}</td>
                          <td className="p-4 font-mono text-sm">{booking.start_time}–{booking.end_time}</td>
                          <td className="p-4">
                            <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium ${statusColors[booking.status] || ''}`}>
                              {booking.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="space-y-2 p-3 md:hidden">
                  {recentBookings.map((booking: any) => (
                    <div key={booking.id} className="rounded-lg border bg-card p-3 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">{booking.profiles?.full_name || 'Unknown'}</span>
                        <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${statusColors[booking.status] || ''}`}>
                          {booking.status}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">{booking.courts?.name}</p>
                      <p className="font-mono text-xs text-muted-foreground">{booking.date} · {booking.start_time}–{booking.end_time}</p>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
