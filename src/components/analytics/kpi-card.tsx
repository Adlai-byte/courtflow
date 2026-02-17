import { Card, CardContent } from '@/components/ui/card'
import { TrendingUp, TrendingDown } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

interface KpiCardProps {
  label: string
  value: string | number
  icon: LucideIcon
  trend?: { value: number; label: string }
}

export function KpiCard({ label, value, icon: Icon, trend }: KpiCardProps) {
  return (
    <Card>
      <CardContent className="p-4 md:p-6">
        <div className="flex items-center justify-between">
          <span className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
            {label}
          </span>
          <Icon className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className="mt-2 text-3xl font-bold tracking-tight">{value}</div>
        {trend && (
          <div className="mt-1 flex items-center gap-1 text-xs">
            {trend.value >= 0 ? (
              <TrendingUp className="h-3 w-3 text-green" />
            ) : (
              <TrendingDown className="h-3 w-3 text-destructive" />
            )}
            <span className={trend.value >= 0 ? 'text-green' : 'text-destructive'}>
              {trend.value >= 0 ? '+' : ''}{trend.value}%
            </span>
            <span className="text-muted-foreground">{trend.label}</span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
