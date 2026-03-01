import { redirect } from 'next/navigation'
import { getTenantBySlug } from '@/lib/tenant'
import { createClient } from '@/lib/supabase/server'
import { LeaveWaitlistButton } from '@/components/booking/leave-waitlist-button'
import { to12Hr } from '@/lib/time-format'
import Link from 'next/link'

const statusColors: Record<string, string> = {
  waiting: 'bg-amber-100 text-amber-700 border-amber-200',
  notified: 'bg-primary/10 text-primary border-primary/20',
  confirmed: 'bg-green/10 text-green border-green/20',
  expired: 'bg-muted text-muted-foreground border-border',
}

export default async function MyWaitlistPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const tenant = await getTenantBySlug(slug)

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect(`/login?redirect=/${slug}/my-waitlist`)
  }

  const { data: entries } = await supabase
    .from('waitlist_entries')
    .select('*, courts ( name )')
    .eq('tenant_id', tenant.id)
    .eq('customer_id', user.id)
    .order('date', { ascending: false })
    .order('start_time', { ascending: true })

  return (
    <div className="space-y-6">
      <span className="section-label block">[ MY WAITLIST ]</span>
      <h1 className="text-2xl font-bold tracking-tight">My Waitlist</h1>

      <div className="rounded-lg border border-border bg-card">
        {(!entries || entries.length === 0) ? (
          <div className="flex flex-col items-center justify-center gap-3 py-12">
            <p className="text-sm text-muted-foreground">You are not on any waitlists.</p>
            <Link href={`/${slug}`} className="font-mono text-xs text-primary underline underline-offset-4 hover:text-primary/80">
              Browse available courts
            </Link>
          </div>
        ) : (
          <>
            <div className="hidden md:block">
              <table className="w-full">
                <thead>
                  <tr className="border-b text-left">
                    <th className="p-4 font-mono text-xs uppercase tracking-wider text-muted-foreground font-medium">Date</th>
                    <th className="p-4 font-mono text-xs uppercase tracking-wider text-muted-foreground font-medium">Time</th>
                    <th className="p-4 font-mono text-xs uppercase tracking-wider text-muted-foreground font-medium">Court</th>
                    <th className="p-4 font-mono text-xs uppercase tracking-wider text-muted-foreground font-medium">Position</th>
                    <th className="p-4 font-mono text-xs uppercase tracking-wider text-muted-foreground font-medium">Status</th>
                    <th className="p-4 font-mono text-xs uppercase tracking-wider text-muted-foreground font-medium"></th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((entry: any, i: number) => (
                    <tr key={entry.id} className={i % 2 === 1 ? 'bg-muted/30' : ''}>
                      <td className="p-4 font-mono text-sm">{entry.date}</td>
                      <td className="p-4 font-mono text-sm">{to12Hr(entry.start_time)}–{to12Hr(entry.end_time)}</td>
                      <td className="p-4 text-sm">{entry.courts?.name}</td>
                      <td className="p-4 font-mono text-sm">#{entry.position}</td>
                      <td className="p-4">
                        <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium ${statusColors[entry.status] || ''}`}>
                          {entry.status}
                        </span>
                      </td>
                      <td className="p-4">
                        {(entry.status === 'waiting' || entry.status === 'notified') && (
                          <LeaveWaitlistButton entryId={entry.id} slug={slug} />
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="space-y-2 p-3 md:hidden">
              {entries.map((entry: any) => (
                <div key={entry.id} className="rounded-lg border bg-card p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{entry.courts?.name}</span>
                    <div className="flex items-center gap-1">
                      <span className="font-mono text-xs text-muted-foreground">#{entry.position}</span>
                      <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${statusColors[entry.status] || ''}`}>
                        {entry.status}
                      </span>
                    </div>
                  </div>
                  <p className="font-mono text-xs text-muted-foreground">
                    {entry.date} · {to12Hr(entry.start_time)}–{to12Hr(entry.end_time)}
                  </p>
                  {(entry.status === 'waiting' || entry.status === 'notified') && (
                    <LeaveWaitlistButton entryId={entry.id} slug={slug} />
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
