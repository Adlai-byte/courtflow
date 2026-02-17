import { requireTenantOwner } from '@/lib/tenant'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { notFound } from 'next/navigation'
import { addCustomerNote } from './actions'
import { CalendarDays, DollarSign, AlertTriangle, MapPin } from 'lucide-react'

const statusColors: Record<string, string> = {
  confirmed: 'bg-green/10 text-green border-green/20',
  completed: 'bg-muted text-muted-foreground border-border',
  cancelled: 'bg-destructive/10 text-destructive border-destructive/20',
  no_show: 'bg-amber-100 text-amber-700 border-amber-200',
}

export default async function CustomerDetailPage({
  params,
}: {
  params: Promise<{ slug: string; id: string }>
}) {
  const { slug, id } = await params
  const { tenant } = await requireTenantOwner(slug)

  const supabase = await createClient()

  const { data: customer } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', id)
    .single()

  if (!customer) notFound()

  const [bookingsRes, subscriptionRes, notesRes] = await Promise.all([
    supabase
      .from('bookings')
      .select('*, courts ( name )')
      .eq('tenant_id', tenant.id)
      .eq('customer_id', id)
      .order('date', { ascending: false })
      .limit(20),
    supabase
      .from('member_subscriptions')
      .select('*, membership_tiers:tier_id ( name, perks )')
      .eq('tenant_id', tenant.id)
      .eq('customer_id', id)
      .eq('status', 'active')
      .maybeSingle(),
    supabase
      .from('customer_notes')
      .select('*, creator:created_by ( full_name )')
      .eq('tenant_id', tenant.id)
      .eq('profile_id', id)
      .order('created_at', { ascending: false }),
  ])

  const bookings = bookingsRes.data || []
  const subscription = subscriptionRes.data
  const notes = notesRes.data || []

  const totalBookings = bookings.length
  const noShows = bookings.filter((b: any) => b.status === 'no_show').length
  const noShowRate = totalBookings > 0 ? Math.round((noShows / totalBookings) * 100) : 0

  const courtCounts = new Map<string, number>()
  for (const b of bookings as any[]) {
    const name = b.courts?.name || 'Unknown'
    courtCounts.set(name, (courtCounts.get(name) || 0) + 1)
  }
  const favoriteCourt = courtCounts.size > 0
    ? Array.from(courtCounts.entries()).sort((a, b) => b[1] - a[1])[0][0]
    : '—'

  const initials = (customer.full_name || 'U')
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  async function handleAddNote(formData: FormData) {
    'use server'
    await addCustomerNote(slug, id, formData)
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-6">
        <Avatar className="h-16 w-16">
          <AvatarFallback className="bg-primary/10 text-primary font-mono text-xl">
            {initials}
          </AvatarFallback>
        </Avatar>
        <div>
          <span className="section-label mb-1 block">[ CUSTOMER ]</span>
          <h1 className="text-2xl font-bold tracking-tight">{customer.full_name || 'Unknown'}</h1>
          <div className="mt-1 flex flex-wrap gap-3 text-sm text-muted-foreground">
            {customer.phone && <span className="font-mono">{customer.phone}</span>}
            <span className="font-mono">Since {new Date(customer.created_at).toLocaleDateString()}</span>
          </div>
          {subscription && (
            <span className="mt-2 inline-flex rounded-full border border-green/20 bg-green/10 px-3 py-0.5 text-xs font-medium text-green">
              {(subscription.membership_tiers as any)?.name} Member
            </span>
          )}
        </div>
      </div>

      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'Total Bookings', value: totalBookings, icon: CalendarDays },
          { label: 'No-Show Rate', value: `${noShowRate}%`, icon: AlertTriangle },
          { label: 'Favorite Court', value: favoriteCourt, icon: MapPin },
          { label: 'Free Hours Left', value: subscription?.free_hours_remaining ?? '—', icon: DollarSign },
        ].map((stat) => (
          <Card key={stat.label}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs uppercase tracking-wider text-muted-foreground">{stat.label}</span>
                <stat.icon className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="mt-2 text-2xl font-bold tracking-tight">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div>
        <span className="section-label mb-4 block">[ BOOKING HISTORY ]</span>
        <Card>
          <CardContent className="p-0">
            {bookings.length === 0 ? (
              <div className="flex items-center justify-center py-8">
                <p className="text-sm text-muted-foreground">No bookings found.</p>
              </div>
            ) : (
              <>
                <div className="hidden md:block">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b text-left">
                        <th className="p-4 font-mono text-xs uppercase tracking-wider text-muted-foreground font-medium">Date</th>
                        <th className="p-4 font-mono text-xs uppercase tracking-wider text-muted-foreground font-medium">Court</th>
                        <th className="p-4 font-mono text-xs uppercase tracking-wider text-muted-foreground font-medium">Time</th>
                        <th className="p-4 font-mono text-xs uppercase tracking-wider text-muted-foreground font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(bookings as any[]).map((booking, i) => (
                        <tr key={booking.id} className={i % 2 === 1 ? 'bg-muted/30' : ''}>
                          <td className="p-4 font-mono text-sm">{booking.date}</td>
                          <td className="p-4 text-sm">{booking.courts?.name}</td>
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
                  {(bookings as any[]).map((booking) => (
                    <div key={booking.id} className="rounded-lg border p-3 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">{booking.courts?.name}</span>
                        <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${statusColors[booking.status] || ''}`}>
                          {booking.status}
                        </span>
                      </div>
                      <p className="font-mono text-xs text-muted-foreground">{booking.date} · {booking.start_time}–{booking.end_time}</p>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <div>
        <span className="section-label mb-4 block">[ NOTES ]</span>
        <Card>
          <CardContent className="p-4 space-y-4">
            <form action={handleAddNote} className="flex gap-3">
              <Textarea
                name="note"
                placeholder="Add a note about this customer..."
                className="min-h-[60px] flex-1 resize-none"
                required
              />
              <Button type="submit" className="self-end font-mono text-xs uppercase tracking-wider">
                Add
              </Button>
            </form>
            {notes.length > 0 && (
              <div className="space-y-3 border-t pt-4">
                {(notes as any[]).map((note) => (
                  <div key={note.id} className="space-y-1">
                    <p className="text-sm">{note.note}</p>
                    <p className="font-mono text-xs text-muted-foreground">
                      {note.creator?.full_name || 'Unknown'} · {new Date(note.created_at).toLocaleDateString()}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
