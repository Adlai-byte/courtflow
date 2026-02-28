import { requireTenantOwner } from '@/lib/tenant'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { CalendarDays, MapPin, Users, Clock, Hourglass, CheckCircle2, Circle, ArrowRight } from 'lucide-react'
import Link from 'next/link'

const statusColors: Record<string, string> = {
  pending: 'bg-amber-50 text-amber-700 border-amber-200',
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

  const [courtsRes, todayBookingsRes, membersRes, waitlistRes, pendingRes, recentBookingsRes, tiersRes] = await Promise.all([
    supabase.from('courts').select('id', { count: 'exact', head: true }).eq('tenant_id', tenant.id),
    supabase.from('bookings').select('id', { count: 'exact', head: true }).eq('tenant_id', tenant.id).eq('date', today).eq('status', 'confirmed'),
    supabase.from('member_subscriptions').select('id', { count: 'exact', head: true }).eq('tenant_id', tenant.id).eq('status', 'active'),
    supabase.from('waitlist_entries').select('id', { count: 'exact', head: true }).eq('tenant_id', tenant.id).eq('status', 'waiting'),
    supabase.from('bookings').select('id', { count: 'exact', head: true }).eq('tenant_id', tenant.id).eq('status', 'pending'),
    supabase.from('bookings').select('*, courts ( name ), profiles:customer_id ( full_name )').eq('tenant_id', tenant.id).order('created_at', { ascending: false }).limit(5),
    supabase.from('membership_tiers').select('id', { count: 'exact', head: true }).eq('tenant_id', tenant.id).eq('is_active', true),
  ])

  const stats = [
    { label: 'Pending Approval', value: pendingRes.count || 0, icon: Hourglass, color: 'text-amber-600' },
    { label: "Today's Bookings", value: todayBookingsRes.count || 0, icon: CalendarDays, color: 'text-chart-3' },
    { label: 'Total Courts', value: courtsRes.count || 0, icon: MapPin, color: 'text-primary' },
    { label: 'Active Members', value: membersRes.count || 0, icon: Users, color: 'text-chart-2' },
  ]

  const recentBookings = recentBookingsRes.data || []

  return (
    <div className="space-y-8">
      <div>
        <h1 className="sr-only">Dashboard Overview</h1>
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

      {((courtsRes.count || 0) === 0 || (tiersRes.count || 0) === 0) && (
        <div>
          <span className="section-label mb-4 block">[ GETTING STARTED ]</span>
          <Card>
            <CardContent className="p-6">
              <p className="mb-4 text-sm text-muted-foreground">
                Complete these steps to start accepting bookings.
              </p>
              <div className="space-y-3">
                {[
                  {
                    done: (courtsRes.count || 0) > 0,
                    label: 'Add your first court',
                    description: 'Set up a court with operating hours and booking rules.',
                    href: `/dashboard/${slug}/courts`,
                  },
                  {
                    done: (tiersRes.count || 0) > 0,
                    label: 'Create membership tiers',
                    description: 'Define pricing tiers so customers can subscribe.',
                    href: `/dashboard/${slug}/members/tiers`,
                  },
                  {
                    done: false,
                    label: 'Share your booking page',
                    description: `Your public URL: courtflow.com/${slug}`,
                    href: `/${slug}`,
                    external: true,
                  },
                ].map((step) => (
                  <Link
                    key={step.label}
                    href={step.href}
                    {...(step.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                    className="flex items-center gap-4 rounded-lg border p-4 transition-colors hover:bg-accent"
                  >
                    {step.done ? (
                      <CheckCircle2 className="h-5 w-5 shrink-0 text-green" />
                    ) : (
                      <Circle className="h-5 w-5 shrink-0 text-muted-foreground" />
                    )}
                    <div className="flex-1">
                      <p className={cn('text-sm font-medium', step.done && 'line-through text-muted-foreground')}>
                        {step.label}
                      </p>
                      <p className="text-xs text-muted-foreground">{step.description}</p>
                    </div>
                    <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

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
