'use client'

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { Card, CardContent } from '@/components/ui/card'

interface UtilizationChartProps {
  data: { court: string; utilization: number }[]
}

export function UtilizationChart({ data }: UtilizationChartProps) {
  return (
    <Card>
      <CardContent className="p-4 md:p-6">
        <span className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
          Court Utilization
        </span>
        <div className="mt-4 h-[300px]">
          {data.length === 0 ? (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              No data yet.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} margin={{ top: 5, right: 5, bottom: 5, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis
                  dataKey="court"
                  tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
                  tickLine={false}
                  axisLine={{ stroke: 'var(--border)' }}
                />
                <YAxis
                  tick={{ fontSize: 11, fontFamily: 'var(--font-mono)', fill: 'var(--muted-foreground)' }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => `${v}%`}
                  domain={[0, 100]}
                />
                <Tooltip
                  contentStyle={{
                    background: 'var(--card)',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '12px',
                  }}
                  formatter={(value) => [`${Number(value).toFixed(1)}%`, 'Utilization']}
                />
                <Bar dataKey="utilization" fill="var(--chart-1)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
