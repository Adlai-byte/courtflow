'use client'

import { Card, CardContent } from '@/components/ui/card'

interface PeakHoursHeatmapProps {
  data: { day: string; hour: number; count: number }[]
  maxCount: number
}

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const HOURS = Array.from({ length: 16 }, (_, i) => i + 6)

function getOpacity(count: number, max: number): number {
  if (max === 0 || count === 0) return 0
  return 0.15 + (count / max) * 0.85
}

export function PeakHoursHeatmap({ data, maxCount }: PeakHoursHeatmapProps) {
  const lookup = new Map<string, number>()
  for (const d of data) {
    lookup.set(`${d.day}-${d.hour}`, d.count)
  }

  return (
    <Card>
      <CardContent className="p-4 md:p-6">
        <span className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
          Peak Hours
        </span>
        <div className="mt-4 overflow-x-auto">
          <div className="min-w-[500px]">
            <div className="flex">
              <div className="w-10 shrink-0" />
              {HOURS.map((h) => (
                <div key={h} className="flex-1 text-center font-mono text-[10px] text-muted-foreground">
                  {h}:00
                </div>
              ))}
            </div>
            {DAYS.map((day) => (
              <div key={day} className="flex items-center gap-0">
                <div className="w-10 shrink-0 font-mono text-xs text-muted-foreground">
                  {day}
                </div>
                {HOURS.map((hour) => {
                  const count = lookup.get(`${day}-${hour}`) || 0
                  return (
                    <div
                      key={hour}
                      className="flex-1 aspect-square m-0.5 rounded-sm"
                      style={{
                        backgroundColor: count > 0 ? 'var(--chart-1)' : 'var(--muted)',
                        opacity: count > 0 ? getOpacity(count, maxCount) : 0.3,
                      }}
                      title={`${day} ${hour}:00 — ${count} booking${count !== 1 ? 's' : ''}`}
                    />
                  )
                })}
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
