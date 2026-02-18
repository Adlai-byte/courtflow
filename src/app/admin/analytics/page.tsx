import { createAdminClient } from '@/lib/supabase/admin'
import { KpiCard } from '@/components/analytics/kpi-card'
import { RevenueChart } from '@/components/analytics/revenue-chart'
import { DollarSign, CalendarDays, Crown, BarChart3 } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'

const RANGES = [
  { label: '7 days', value: '7' },
  { label: '30 days', value: '30' },
  { label: '90 days', value: '90' },
]

export default async function AdminAnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>
}) {
  const { range } = await searchParams
  const days = parseInt(range || '30', 10)
  const supabase = createAdminClient()

  const startDate = new Date()
  startDate.setDate(startDate.getDate() - days)
  const startStr = startDate.toISOString().split('T')[0]

  const [
    { data: bookings },
    { data: courts },
    { data: subscriptions },
  ] = await Promise.all([
    supabase
      .from('bookings')
      .select('id, date, start_time, end_time, status, court_id')
      .gte('date', startStr)
      .order('date', { ascending: true }),
    supabase
      .from('courts')
      .select('id, name, operating_hours, slot_duration_minutes'),
    supabase
      .from('member_subscriptions')
      .select('*, membership_tiers:tier_id ( price )')
      .eq('status', 'active'),
  ])

  const allBookings = bookings ?? []
  const confirmedBookings = allBookings.filter((b: any) => b.status === 'confirmed' || b.status === 'completed')

  // Revenue over time
  const revenueByDate = new Map<string, number>()
  for (const b of confirmedBookings as any[]) {
    const existing = revenueByDate.get(b.date) || 0
    const hours = (new Date(`2000-01-01T${b.end_time}Z`).getTime() - new Date(`2000-01-01T${b.start_time}Z`).getTime()) / 3600000
    revenueByDate.set(b.date, existing + hours * 25)
  }
  const revenueChartData = Array.from(revenueByDate.entries())
    .map(([date, revenue]) => ({ date, revenue: Math.round(revenue * 100) / 100 }))
    .sort((a, b) => a.date.localeCompare(b.date))

  // KPIs
  const totalRevenue = revenueChartData.reduce((sum, d) => sum + d.revenue, 0)
  const membershipRevenue = (subscriptions ?? []).reduce((sum: number, s: any) => sum + ((s.membership_tiers as any)?.price || 0), 0)

  // Fill rate
  const utilizationData = (courts ?? []).map((court: any) => {
    const courtBookings = confirmedBookings.filter((b: any) => b.court_id === court.id)
    const totalSlots = days * 10
    return totalSlots > 0 ? Math.min(100, (courtBookings.length / totalSlots) * 100) : 0
  })
  const overallFillRate = utilizationData.length > 0
    ? Math.round(utilizationData.reduce((sum, u) => sum + u, 0) / utilizationData.length * 10) / 10
    : 0

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <span className="section-label mb-2 block">[ PLATFORM ANALYTICS ]</span>
          <h1 className="text-2xl font-bold tracking-tight">Analytics</h1>
        </div>
        <div className="flex gap-1 rounded-lg border bg-card p-1">
          {RANGES.map((r) => (
            <Link
              key={r.value}
              href={`/admin/analytics?range=${r.value}`}
              className={cn(
                'rounded-md px-3 py-1.5 font-mono text-xs transition-colors',
                (range || '30') === r.value
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {r.label}
            </Link>
          ))}
        </div>
      </div>

      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Booking Revenue" value={`$${totalRevenue.toFixed(0)}`} icon={DollarSign} />
        <KpiCard label="Total Bookings" value={confirmedBookings.length} icon={CalendarDays} />
        <KpiCard label="Active Members" value={subscriptions?.length ?? 0} icon={Crown} />
        <KpiCard label="Fill Rate" value={`${overallFillRate}%`} icon={BarChart3} />
      </div>

      <div>
        <span className="section-label mb-4 block">[ REVENUE OVER TIME ]</span>
        <RevenueChart data={revenueChartData} />
      </div>
    </div>
  )
}
