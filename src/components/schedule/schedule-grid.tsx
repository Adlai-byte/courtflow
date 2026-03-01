'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Court, Booking } from '@/lib/types'
import { useBookingCart } from '@/contexts/booking-cart-context'
import { toSlotLabel } from '@/lib/time-format'
import { toast } from 'sonner'
import {
  computeBaseInterval,
  generateTimeColumns,
  generateCourtSlots,
  getDayName,
} from '@/lib/schedule-utils'
import { CourtRowHeader } from './court-row-header'
import { SlotCell } from './slot-cell'

interface ScheduleGridProps {
  courts: Court[]
  selectedDate: Date
  tenantId: string
  slug: string
  closureDatesMap: Record<string, string[]>
  currentUserId?: string
  recurring: boolean
  totalWeeks: number
}

export function ScheduleGrid({
  courts,
  selectedDate,
  tenantId,
  slug,
  closureDatesMap,
  currentUserId,
  recurring,
  totalWeeks,
}: ScheduleGridProps) {
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const { addItem, removeItem, isInCart, items } = useBookingCart()

  const dateStr = selectedDate.toISOString().split('T')[0]
  const dayOfWeek = getDayName(selectedDate)

  // Stable key for courts array to prevent unnecessary re-fetches
  const courtsKey = courts.map((c) => c.id).join(',')

  const fetchBookings = useCallback(async () => {
    if (courts.length === 0) return
    setLoading(true)
    const supabase = createClient()
    const courtIds = courts.map((c) => c.id)

    const { data } = await supabase
      .from('bookings')
      .select('*')
      .in('court_id', courtIds)
      .eq('date', dateStr)
      .in('status', ['confirmed', 'pending'])

    setBookings((data || []) as Booking[])
    setLoading(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courtsKey, dateStr])

  // Initial fetch + Realtime subscription with polling fallback
  useEffect(() => {
    fetchBookings()

    let pollTimer: ReturnType<typeof setInterval> | null = null
    const supabase = createClient()
    const channel = supabase
      .channel(`bookings:${tenantId}:${dateStr}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bookings',
          filter: `tenant_id=eq.${tenantId}`,
        },
        (payload) => {
          const row = payload.new as Booking | undefined
          const oldRow = payload.old as Booking | undefined
          // Only refetch if the change is for the current date
          if (
            (row && row.date === dateStr) ||
            (oldRow && (oldRow as any).date === dateStr)
          ) {
            fetchBookings()
          }
        }
      )
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          // Realtime unavailable — fall back to polling every 30s
          if (!pollTimer) {
            pollTimer = setInterval(fetchBookings, 30_000)
          }
        }
        if (status === 'SUBSCRIBED' && pollTimer) {
          clearInterval(pollTimer)
          pollTimer = null
        }
      })

    return () => {
      if (pollTimer) clearInterval(pollTimer)
      supabase.removeChannel(channel)
    }
  }, [fetchBookings, tenantId, dateStr])

  const baseInterval = useMemo(() => computeBaseInterval(courts), [courts])
  const timeColumns = useMemo(
    () => generateTimeColumns(courts, dayOfWeek, baseInterval),
    [courts, dayOfWeek, baseInterval]
  )

  // Generate slots for each court
  const courtSlots = useMemo(() => {
    return courts.map((court) => ({
      court,
      slots: generateCourtSlots(
        court,
        dayOfWeek,
        baseInterval,
        timeColumns,
        bookings,
        currentUserId,
        dateStr,
        isInCart,
        closureDatesMap[court.id] || []
      ),
    }))
  }, [courts, dayOfWeek, baseInterval, timeColumns, bookings, currentUserId, dateStr, isInCart, closureDatesMap])

  function handleAddToCart(courtId: string, start: string, end: string) {
    const court = courts.find((c) => c.id === courtId)
    if (!court) return
    const label = toSlotLabel(start, end)
    addItem({
      courtId,
      courtName: court.name,
      date: dateStr,
      startTime: start,
      endTime: end,
      recurring,
      totalWeeks: recurring ? totalWeeks : undefined,
    })
    toast.success(
      `Added to cart: ${court.name} ${label}${recurring ? ` (weekly for ${totalWeeks} weeks)` : ''}`
    )
  }

  function handleRemoveFromCart(courtId: string, start: string) {
    const cartItem = items.find(
      (i) => i.courtId === courtId && i.date === dateStr && i.startTime === start
    )
    if (cartItem) {
      removeItem(cartItem.id)
      toast.info(`Removed from cart`)
    }
  }

  if (courts.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        No courts match your filters.
      </p>
    )
  }

  if (timeColumns.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        No courts are open on this day.
      </p>
    )
  }

  return (
    <div className="rounded-lg border border-border overflow-hidden">
      <div
        className="overflow-x-auto"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        <div
          className="grid min-w-[600px]"
          style={{
            gridTemplateColumns: `minmax(140px, 200px) repeat(${timeColumns.length}, minmax(56px, 1fr))`,
          }}
        >
          {/* Corner cell */}
          <div className="sticky left-0 z-30 border-b border-r border-border bg-background" />

          {/* Time header row */}
          {timeColumns.map((col, i) => (
            <div
              key={col.time}
              className={`sticky top-0 z-20 flex items-center justify-center border-b border-border bg-muted/50 px-1 py-2 font-mono text-[10px] text-muted-foreground ${
                i < timeColumns.length - 1 ? 'border-r' : ''
              }`}
            >
              {col.label}
            </div>
          ))}

          {/* Court rows */}
          {courtSlots.map(({ court, slots }, rowIdx) => (
            <div
              key={court.id}
              className="contents"
              role="row"
            >
              {/* Court name — sticky left */}
              <div
                className={`sticky left-0 z-10 ${
                  rowIdx < courtSlots.length - 1 ? 'border-b' : ''
                } border-border`}
              >
                <CourtRowHeader court={court} />
              </div>

              {/* Slot cells */}
              {slots.map((slot, i) => (
                <div
                  key={`${slot.courtId}-${slot.start}-${i}`}
                  className={`${rowIdx < courtSlots.length - 1 ? 'border-b' : ''} border-border min-h-[44px]`}
                  style={{ gridColumn: `span ${slot.colSpan}` }}
                >
                  <SlotCell
                    slot={slot}
                    onAddToCart={handleAddToCart}
                    onRemoveFromCart={handleRemoveFromCart}
                  />
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Loading overlay */}
      {loading && (
        <div className="flex items-center justify-center py-2 text-xs text-muted-foreground">
          Loading availability...
        </div>
      )}
    </div>
  )
}
