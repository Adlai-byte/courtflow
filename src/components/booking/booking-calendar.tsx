'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { ChevronLeft, ChevronRight, Star, ShoppingCart } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { Court, Booking } from '@/lib/types'
import { WaitlistButton } from './waitlist-button'
import { useBookingCart } from '@/contexts/booking-cart-context'
import { toSlotLabel } from '@/lib/time-format'
import { toast } from 'sonner'

type SlotState = 'available' | 'booked_by_others' | 'booked_by_you' | 'past' | 'in_cart'

interface TimeSlot {
  start: string
  end: string
  state: SlotState
}

interface BookingCalendarProps {
  court: Court
  tenantId: string
  slug: string
  closureDates?: string[]
  currentUserId?: string
}

function getTimeSlots(
  court: Court,
  dayOfWeek: string,
  existingBookings: Booking[],
  currentUserId: string | undefined,
  dateStr: string,
  isInCart: (courtId: string, date: string, startTime: string) => boolean
): TimeSlot[] {
  const hours = court.operating_hours[dayOfWeek]
  if (!hours) return []

  const slots: TimeSlot[] = []
  const [openH, openM] = hours.open.split(':').map(Number)
  const [closeH, closeM] = hours.close.split(':').map(Number)

  const duration = court.booking_mode === 'fixed_slot'
    ? court.slot_duration_minutes
    : court.min_duration_minutes

  let currentMinutes = openH * 60 + openM
  const endMinutes = closeH * 60 + closeM

  const now = new Date()
  const today = now.toISOString().split('T')[0]

  while (currentMinutes + duration <= endMinutes) {
    const startH = Math.floor(currentMinutes / 60)
    const startM = currentMinutes % 60
    const endSlotMinutes = currentMinutes + duration
    const endSlotH = Math.floor(endSlotMinutes / 60)
    const endSlotM = endSlotMinutes % 60

    const start = `${String(startH).padStart(2, '0')}:${String(startM).padStart(2, '0')}`
    const end = `${String(endSlotH).padStart(2, '0')}:${String(endSlotM).padStart(2, '0')}`

    // Check if slot is in the past
    if (dateStr < today) {
      slots.push({ start, end, state: 'past' })
      currentMinutes += duration
      continue
    }

    if (dateStr === today) {
      const slotEnd = new Date(`${dateStr}T${end}:00`)
      if (slotEnd <= now) {
        slots.push({ start, end, state: 'past' })
        currentMinutes += duration
        continue
      }
    }

    // Check bookings
    const overlapping = existingBookings.find(
      (b) => b.status === 'confirmed' && b.start_time < end + ':00' && b.end_time > start + ':00'
    )

    if (overlapping) {
      if (currentUserId && overlapping.customer_id === currentUserId) {
        slots.push({ start, end, state: 'booked_by_you' })
      } else {
        slots.push({ start, end, state: 'booked_by_others' })
      }
    } else if (isInCart(court.id, dateStr, start)) {
      slots.push({ start, end, state: 'in_cart' })
    } else {
      slots.push({ start, end, state: 'available' })
    }

    currentMinutes += duration
  }

  return slots
}

const dayNames = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']

export function BookingCalendar({ court, tenantId, slug, closureDates, currentUserId }: BookingCalendarProps) {
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [bookings, setBookings] = useState<Booking[]>([])
  const [waitlistCountMap, setWaitlistCountMap] = useState<Record<string, number>>({})
  const [recurring, setRecurring] = useState(false)
  const [totalWeeks, setTotalWeeks] = useState(4)

  const { addItem, removeItem, isInCart, items } = useBookingCart()

  const dateStr = selectedDate.toISOString().split('T')[0]
  const dayOfWeek = dayNames[selectedDate.getDay()]

  useEffect(() => {
    async function fetchBookings() {
      const supabase = createClient()
      const [{ data: bookingData }, { data: waitlistData }] = await Promise.all([
        supabase
          .from('bookings')
          .select('*')
          .eq('court_id', court.id)
          .eq('date', dateStr)
          .eq('status', 'confirmed'),
        supabase
          .from('waitlist_entries')
          .select('start_time, end_time')
          .eq('court_id', court.id)
          .eq('date', dateStr)
          .eq('status', 'waiting'),
      ])

      setBookings((bookingData || []) as Booking[])

      // Build waitlist count map keyed by start_time
      const countMap: Record<string, number> = {}
      for (const entry of waitlistData || []) {
        const key = (entry as { start_time: string }).start_time.slice(0, 5)
        countMap[key] = (countMap[key] || 0) + 1
      }
      setWaitlistCountMap(countMap)
    }
    fetchBookings()
  }, [court.id, dateStr])

  const isClosed = closureDates?.includes(dateStr) ?? false
  const slots = getTimeSlots(court, dayOfWeek, bookings, currentUserId, dateStr, isInCart)

  function handleAddToCart(start: string, end: string) {
    const label = toSlotLabel(start, end)
    addItem({
      courtId: court.id,
      courtName: court.name,
      date: dateStr,
      startTime: start,
      endTime: end,
      recurring,
      totalWeeks: recurring ? totalWeeks : undefined,
    })
    toast.success(
      `Added to cart: ${label}${recurring ? ` (weekly for ${totalWeeks} weeks)` : ''}`
    )
  }

  function handleRemoveFromCart(start: string) {
    const cartItem = items.find(
      (i) => i.courtId === court.id && i.date === dateStr && i.startTime === start
    )
    if (cartItem) {
      removeItem(cartItem.id)
      toast.info(`Removed from cart: ${toSlotLabel(start, cartItem.endTime)}`)
    }
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
            <Button variant="outline" size="icon" aria-label="Previous day" onClick={() => navigateDay(-1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="min-w-[140px] text-center font-mono text-sm font-medium">
              {selectedDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
            </span>
            <Button variant="outline" size="icon" aria-label="Next day" onClick={() => navigateDay(1)}>
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
            {slots.map((slot) => {
              const label = toSlotLabel(slot.start, slot.end)

              if (slot.state === 'available') {
                return (
                  <Button
                    key={slot.start}
                    variant="outline"
                    size="sm"
                    className="border-emerald-400 bg-emerald-50 font-mono text-xs text-emerald-800 hover:bg-emerald-500 hover:text-white hover:border-emerald-500"
                    onClick={() => handleAddToCart(slot.start, slot.end)}
                  >
                    {label}
                  </Button>
                )
              }

              if (slot.state === 'in_cart') {
                return (
                  <Button
                    key={slot.start}
                    variant="outline"
                    size="sm"
                    className="border-primary bg-primary/10 font-mono text-xs text-primary hover:bg-primary/20"
                    onClick={() => handleRemoveFromCart(slot.start)}
                  >
                    <ShoppingCart className="mr-1 h-3 w-3" />
                    {label}
                  </Button>
                )
              }

              if (slot.state === 'booked_by_you') {
                return (
                  <Button
                    key={slot.start}
                    variant="outline"
                    size="sm"
                    disabled
                    className="border-primary bg-primary/15 font-mono text-xs text-primary font-semibold"
                  >
                    <Star className="mr-1 h-3 w-3 fill-current" />
                    {label}
                  </Button>
                )
              }

              if (slot.state === 'past') {
                return (
                  <Button
                    key={slot.start}
                    variant="outline"
                    size="sm"
                    disabled
                    className="bg-muted font-mono text-xs text-muted-foreground/60 border-border line-through"
                  >
                    {label}
                  </Button>
                )
              }

              // booked_by_others
              return (
                <WaitlistButton
                  key={slot.start}
                  courtId={court.id}
                  tenantId={tenantId}
                  date={dateStr}
                  startTime={slot.start}
                  endTime={slot.end}
                  slug={slug}
                  waitlistCount={waitlistCountMap[slot.start]}
                />
              )
            })}
          </div>
        )}
        {!isClosed && slots.length > 0 && (
          <div className="mt-4 flex items-center gap-4 rounded-lg border border-border bg-muted/30 p-3">
            <label className="flex items-center gap-2 font-mono text-xs uppercase tracking-wider text-muted-foreground cursor-pointer">
              <input
                type="checkbox"
                checked={recurring}
                onChange={(e) => setRecurring(e.target.checked)}
                className="rounded"
              />
              Repeat weekly
            </label>
            {recurring && (
              <label className="flex items-center gap-2 font-mono text-xs text-muted-foreground">
                for
                <input
                  type="number"
                  min={2}
                  max={52}
                  value={totalWeeks}
                  onChange={(e) => setTotalWeeks(Number(e.target.value))}
                  className="w-16 rounded border border-border bg-background px-2 py-1 text-center font-mono text-sm"
                />
                weeks
              </label>
            )}
          </div>
        )}

        <div className="mt-4 flex flex-wrap items-center gap-4 font-mono text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <div className="h-3 w-3 rounded border border-emerald-400 bg-emerald-50" /> Available
          </span>
          <span className="flex items-center gap-1">
            <div className="h-3 w-3 rounded border border-primary bg-primary/10" /> In Cart
          </span>
          <span className="flex items-center gap-1">
            <div className="h-3 w-3 rounded border border-primary bg-primary/15" /> Your Booking
          </span>
          <span className="flex items-center gap-1">
            <div className="h-3 w-3 rounded bg-muted" /> Booked
          </span>
          <span className="flex items-center gap-1">
            <div className="h-3 w-3 rounded bg-muted border border-border" /> Past
          </span>
        </div>
      </CardContent>
    </Card>
  )
}
