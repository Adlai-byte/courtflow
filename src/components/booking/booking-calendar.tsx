'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { Court, Booking } from '@/lib/types'
import { WaitlistButton } from './waitlist-button'

interface BookingCalendarProps {
  court: Court
  tenantId: string
  slug: string
  closureDates?: string[]
}

function getTimeSlots(
  court: Court,
  dayOfWeek: string,
  existingBookings: Booking[]
): { start: string; end: string; available: boolean }[] {
  const hours = court.operating_hours[dayOfWeek]
  if (!hours) return []

  const slots: { start: string; end: string; available: boolean }[] = []
  const [openH, openM] = hours.open.split(':').map(Number)
  const [closeH, closeM] = hours.close.split(':').map(Number)

  const duration = court.booking_mode === 'fixed_slot'
    ? court.slot_duration_minutes
    : court.min_duration_minutes

  let currentMinutes = openH * 60 + openM
  const endMinutes = closeH * 60 + closeM

  while (currentMinutes + duration <= endMinutes) {
    const startH = Math.floor(currentMinutes / 60)
    const startM = currentMinutes % 60
    const endSlotMinutes = currentMinutes + duration
    const endSlotH = Math.floor(endSlotMinutes / 60)
    const endSlotM = endSlotMinutes % 60

    const start = `${String(startH).padStart(2, '0')}:${String(startM).padStart(2, '0')}`
    const end = `${String(endSlotH).padStart(2, '0')}:${String(endSlotM).padStart(2, '0')}`

    const isBooked = existingBookings.some(
      (b) => b.status === 'confirmed' && b.start_time < end + ':00' && b.end_time > start + ':00'
    )

    slots.push({ start, end, available: !isBooked })
    currentMinutes += duration
  }

  return slots
}

const dayNames = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']

export function BookingCalendar({ court, tenantId, slug, closureDates }: BookingCalendarProps) {
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [bookings, setBookings] = useState<Booking[]>([])
  const [booking, setBooking] = useState(false)

  const dateStr = selectedDate.toISOString().split('T')[0]
  const dayOfWeek = dayNames[selectedDate.getDay()]

  useEffect(() => {
    async function fetchBookings() {
      const supabase = createClient()
      const { data } = await supabase
        .from('bookings')
        .select('*')
        .eq('court_id', court.id)
        .eq('date', dateStr)
        .eq('status', 'confirmed')

      setBookings((data || []) as Booking[])
    }
    fetchBookings()
  }, [court.id, dateStr])

  const isClosed = closureDates?.includes(dateStr) ?? false
  const slots = getTimeSlots(court, dayOfWeek, bookings)

  async function handleBook(start: string, end: string) {
    setBooking(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      window.location.href = `/login?redirect=/${slug}/courts/${court.id}`
      return
    }

    const { error } = await supabase.from('bookings').insert({
      tenant_id: tenantId,
      court_id: court.id,
      customer_id: user.id,
      date: dateStr,
      start_time: start,
      end_time: end,
    })

    if (error) {
      alert(error.message.includes('overlaps')
        ? 'Sorry, this slot was just booked. Please try another.'
        : error.message
      )
    } else {
      const { data } = await supabase
        .from('bookings')
        .select('*')
        .eq('court_id', court.id)
        .eq('date', dateStr)
        .eq('status', 'confirmed')
      setBookings((data || []) as Booking[])
    }
    setBooking(false)
  }

  function navigateDay(offset: number) {
    const newDate = new Date(selectedDate)
    newDate.setDate(newDate.getDate() + offset)
    if (newDate >= new Date(new Date().toDateString())) {
      setSelectedDate(newDate)
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <span className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
            Book a Slot
          </span>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={() => navigateDay(-1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="min-w-[140px] text-center font-mono text-sm font-medium">
              {selectedDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
            </span>
            <Button variant="outline" size="icon" onClick={() => navigateDay(1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isClosed ? (
          <p className="text-sm text-muted-foreground">Court is closed on this date.</p>
        ) : slots.length === 0 ? (
          <p className="text-sm text-muted-foreground">No slots available for this day.</p>
        ) : (
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6">
            {slots.map((slot) =>
              slot.available ? (
                <Button
                  key={slot.start}
                  variant="outline"
                  size="sm"
                  disabled={booking}
                  className="font-mono text-sm hover:bg-primary hover:text-primary-foreground"
                  onClick={() => handleBook(slot.start, slot.end)}
                >
                  {slot.start}
                </Button>
              ) : (
                <WaitlistButton
                  key={slot.start}
                  courtId={court.id}
                  tenantId={tenantId}
                  date={dateStr}
                  startTime={slot.start}
                  endTime={slot.end}
                  slug={slug}
                />
              )
            )}
          </div>
        )}
        <div className="mt-4 flex items-center gap-4 font-mono text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <div className="h-3 w-3 rounded border border-border" /> Available
          </span>
          <span className="flex items-center gap-1">
            <div className="h-3 w-3 rounded bg-muted" /> Booked
          </span>
        </div>
      </CardContent>
    </Card>
  )
}
