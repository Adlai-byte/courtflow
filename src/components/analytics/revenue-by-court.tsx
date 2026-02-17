'use client'

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { Card, CardContent } from '@/components/ui/card'

interface RevenueByCourtProps {
  data: { court: string; revenue: number }[]
}

export function RevenueByCourtChart({ data }: RevenueByCourtProps) {
  return (
    <Card>
      <CardContent className="p-4 md:p-6">
        <span className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
          Revenue by Court
        </span>
        <div className="mt-4 h-[300px]">
          {data.length === 0 ? (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              No data yet.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} layout="vertical" margin={{ top: 5, right: 5, bottom: 5, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                <XAxis
                  type="number"
                  tick={{ fontSize: 11, fontFamily: 'var(--font-mono)', fill: 'var(--muted-foreground)' }}
                  tickFormatter={(v) => `$${v}`}
                  axisLine={{ stroke: 'var(--border)' }}
                  tickLine={false}
                />
                <YAxis
                  type="category"
                  dataKey="court"
                  tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
                  tickLine={false}
                  axisLine={false}
                  width={100}
                />
                <Tooltip
                  contentStyle={{
                    background: 'var(--card)',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '12px',
                  }}
                  formatter={(value) => [`$${Number(value).toFixed(2)}`, 'Revenue']}
                />
                <Bar dataKey="revenue" fill="var(--chart-2)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
