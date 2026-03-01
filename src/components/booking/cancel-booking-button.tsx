'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { cancelBooking } from '@/app/[slug]/my-bookings/actions'

interface Props {
  bookingId: string
  slug: string
  bookingDate: string
  bookingStartTime: string
  cancellationHours: number
  bookingStatus: string
}

export function CancelBookingButton({ bookingId, slug, bookingDate, bookingStartTime, cancellationHours, bookingStatus }: Props) {
  const [cancelling, setCancelling] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const bookingStart = new Date(`${bookingDate}T${bookingStartTime}`)
  const deadline = new Date(bookingStart.getTime() - cancellationHours * 60 * 60 * 1000)
  const isPastDeadline = bookingStatus === 'confirmed' && new Date() > deadline
  const isPast = bookingStart < new Date()

  if (isPast) return null

  async function handleCancel() {
    if (!confirm('Are you sure you want to cancel this booking?')) return
    setCancelling(true)
    setError(null)
    const result = await cancelBooking(bookingId, slug)
    if (result.error) {
      setError(result.error)
    }
    setCancelling(false)
  }

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="ghost"
        size="sm"
        disabled={isPastDeadline || cancelling}
        onClick={handleCancel}
        className="font-mono text-xs text-destructive hover:text-destructive"
        title={isPastDeadline ? `Cancellation deadline passed (${cancellationHours}h before start)` : undefined}
      >
        {cancelling ? 'Cancelling...' : 'Cancel'}
      </Button>
      {error && <span className="text-xs text-destructive">{error}</span>}
    </div>
  )
}
