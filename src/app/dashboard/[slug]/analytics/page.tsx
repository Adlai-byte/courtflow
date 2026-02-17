import { requireTenantOwner } from '@/lib/tenant'
import { createClient } from '@/lib/supabase/server'
import { KpiCard } from '@/components/analytics/kpi-card'
import { RevenueChart } from '@/components/analytics/revenue-chart'
import { RevenueByCourtChart } from '@/components/analytics/revenue-by-court'
import { UtilizationChart } from '@/components/analytics/utilization-chart'
import { PeakHoursHeatmap } from '@/components/analytics/peak-hours-heatmap'
import { DollarSign, TrendingUp, Users, Clock, CalendarDays, BarChart3 } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'

const RANGES = [
  { label: '7 days', value: '7' },
  { label: '30 days', value: '30' },
  { label: '90 days', value: '90' },
]

export default async function AnalyticsPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ range?: string }>
}) {
  const { slug } = await params
  const { range } = await searchParams
  const { tenant } = await requireTenantOwner(slug)
  const days = parseInt(range || '30', 10)

  const supabase = await createClient()
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - days)
  const startStr = startDate.toISOString().split('T')[0]

  const { data: bookings } = await supabase
    .from('bookings')
    .select('*, courts ( name, operating_hours, slot_duration_minutes )')
    .eq('tenant_id', tenant.id)
    .gte('date', startStr)
    .order('date', { ascending: true })

  const { data: courts } = await supabase
    .from('courts')
    .select('id, name, operating_hours, slot_duration_minutes')
    .eq('tenant_id', tenant.id)

  const { data: subscriptions } = await supabase
    .from('member_subscriptions')
    .select('*, membership_tiers:tier_id ( price )')
    .eq('tenant_id', tenant.id)
    .eq('status', 'active')

  const allBookings = bookings || []
  const confirmedBookings = allBookings.filter((b: any) => b.status === 'confirmed' || b.status === 'completed')

  // Revenue Over Time
  const revenueByDate = new Map<string, number>()
  for (const b of confirmedBookings as any[]) {
    const existing = revenueByDate.get(b.date) || 0
    const hours = (new Date(`2000-01-01T${b.end_time}Z`).getTime() - new Date(`2000-01-01T${b.start_time}Z`).getTime()) / 3600000
    revenueByDate.set(b.date, existing + hours * 25)
  }
  const revenueChartData = Array.from(revenueByDate.entries())
    .map(([date, revenue]) => ({ date, revenue: Math.round(revenue * 100) / 100 }))
    .sort((a, b) => a.date.localeCompare(b.date))

  // Revenue by Court
  const revByCourt = new Map<string, number>()
  for (const b of confirmedBookings as any[]) {
    const name = b.courts?.name || 'Unknown'
    const hours = (new Date(`2000-01-01T${b.end_time}Z`).getTime() - new Date(`2000-01-01T${b.start_time}Z`).getTime()) / 3600000
    revByCourt.set(name, (revByCourt.get(name) || 0) + hours * 25)
  }
  const revenueByCourtData = Array.from(revByCourt.entries())
    .map(([court, revenue]) => ({ court, revenue: Math.round(revenue * 100) / 100 }))
    .sort((a, b) => b.revenue - a.revenue)

  // KPIs
  const totalRevenue = revenueChartData.reduce((sum, d) => sum + d.revenue, 0)
  const avgBookingValue = confirmedBookings.length > 0 ? totalRevenue / confirmedBookings.length : 0
  const membershipRevenue = (subscriptions || []).reduce((sum: number, s: any) => sum + ((s.membership_tiers as any)?.price || 0), 0)

  // Utilization
  const utilizationData = (courts || []).map((court: any) => {
    const courtBookings = confirmedBookings.filter((b: any) => b.court_id === court.id)
    const totalSlots = days * 10
    const utilization = totalSlots > 0 ? Math.min(100, (courtBookings.length / totalSlots) * 100) : 0
    return { court: court.name, utilization: Math.round(utilization * 10) / 10 }
  })

  const overallFillRate = utilizationData.length > 0
    ? Math.round(utilizationData.reduce((sum, d) => sum + d.utilization, 0) / utilizationData.length * 10) / 10
    : 0

  // Peak Hours Heatmap
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const heatmapCounts = new Map<string, number>()
  let maxHeatmapCount = 0
  for (const b of confirmedBookings as any[]) {
    const d = new Date(b.date)
    const dayName = dayNames[d.getDay()]
    const hour = parseInt(b.start_time.split(':')[0], 10)
    const key = `${dayName}-${hour}`
    const count = (heatmapCounts.get(key) || 0) + 1
    heatmapCounts.set(key, count)
    if (count > maxHeatmapCount) maxHeatmapCount = count
  }
  const heatmapData = Array.from(heatmapCounts.entries()).map(([key, count]) => {
    const [day, hourStr] = key.split('-')
    return { day, hour: parseInt(hourStr, 10), count }
  })

  const dayTotals = new Map<string, number>()
  for (const b of confirmedBookings as any[]) {
    const d = new Date(b.date)
    const dayName = dayNames[d.getDay()]
    dayTotals.set(dayName, (dayTotals.get(dayName) || 0) + 1)
  }
  const busiestDay = dayTotals.size > 0
    ? Array.from(dayTotals.entries()).sort((a, b) => b[1] - a[1])[0][0]
    : '—'

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <span className="section-label mb-2 block">[ ANALYTICS ]</span>
          <h1 className="text-2xl font-bold tracking-tight">Analytics</h1>
        </div>
        <div className="flex gap-1 rounded-lg border bg-card p-1">
          {RANGES.map((r) => (
            <Link
              key={r.value}
              href={`/dashboard/${slug}/analytics?range=${r.value}`}
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

      <div>
        <span className="section-label mb-4 block">[ REVENUE ]</span>
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-3 mb-4">
          <KpiCard label="Total Revenue" value={`$${totalRevenue.toFixed(0)}`} icon={DollarSign} />
          <KpiCard label="Avg Booking Value" value={`$${avgBookingValue.toFixed(2)}`} icon={TrendingUp} />
          <KpiCard label="Membership Revenue" value={`$${membershipRevenue.toFixed(0)}/mo`} icon={Users} />
        </div>
        <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
          <RevenueChart data={revenueChartData} />
          <RevenueByCourtChart data={revenueByCourtData} />
        </div>
      </div>

      <div>
        <span className="section-label mb-4 block">[ UTILIZATION ]</span>
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-3 mb-4">
          <KpiCard label="Fill Rate" value={`${overallFillRate}%`} icon={BarChart3} />
          <KpiCard label="Busiest Day" value={busiestDay} icon={CalendarDays} />
          <KpiCard label="Courts Tracked" value={(courts || []).length} icon={Clock} />
        </div>
        <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
          <UtilizationChart data={utilizationData} />
          <PeakHoursHeatmap data={heatmapData} maxCount={maxHeatmapCount} />
        </div>
      </div>
    </div>
  )
}
