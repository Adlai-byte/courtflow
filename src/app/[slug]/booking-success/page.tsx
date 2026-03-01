import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent } from '@/components/ui/card'
import { CheckCircle } from 'lucide-react'
import { toSlotLabel, formatDate } from '@/lib/time-format'

export default async function BookingSuccessPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ booking_ids?: string }>
}) {
  const { slug } = await params
  const { booking_ids } = await searchParams

  const supabase = await createClient()
  let bookings: any[] = []

  if (booking_ids) {
    const ids = booking_ids.split(',')
    const { data } = await supabase
      .from('bookings')
      .select('*, courts(name)')
      .in('id', ids)
      .order('date')
      .order('start_time')
    bookings = data || []
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-16">
      <div className="mb-8 text-center">
        <CheckCircle className="mx-auto mb-4 h-16 w-16 text-green-500" />
        <h1 className="mb-2 text-2xl font-bold">Booking Confirmed!</h1>
        <p className="text-muted-foreground">
          {bookings.length > 0
            ? `Your ${bookings.length} booking(s) have been processed.`
            : 'Your payment has been received.'}
        </p>
      </div>

      {bookings.length > 0 && (
        <Card className="mb-6">
          <CardContent className="p-4 space-y-3">
            {bookings.map((b: any) => (
              <div key={b.id} className="flex items-center justify-between border-b last:border-0 pb-2 last:pb-0">
                <div>
                  <p className="text-sm font-medium">{b.courts?.name}</p>
                  <p className="font-mono text-xs text-muted-foreground">
                    {formatDate(b.date)} &middot; {toSlotLabel(b.start_time, b.end_time)}
                  </p>
                </div>
                <div className="text-right">
                  <span className="font-mono text-sm">{'\u20B1'}{b.amount}</span>
                  <p className="text-[10px] text-muted-foreground">{b.payment_status}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <div className="flex gap-3">
        <Link
          href={`/${slug}/my-bookings`}
          className="flex-1 rounded-lg bg-primary px-4 py-2.5 text-center font-mono text-xs uppercase tracking-wider text-primary-foreground"
        >
          View My Bookings
        </Link>
        <Link
          href={`/${slug}`}
          className="flex-1 rounded-lg border px-4 py-2.5 text-center font-mono text-xs uppercase tracking-wider"
        >
          Book More
        </Link>
      </div>
    </div>
  )
}
