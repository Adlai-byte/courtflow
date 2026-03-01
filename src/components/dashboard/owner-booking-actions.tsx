'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { approveBooking, rejectBooking } from '@/app/dashboard/[slug]/bookings/actions'
import { OwnerCancelButton } from './owner-cancel-button'

interface Props {
  bookingId: string
  slug: string
  status: string
}

export function OwnerBookingActions({ bookingId, slug, status }: Props) {
  const [loading, setLoading] = useState<'approve' | 'reject' | null>(null)

  async function handleApprove() {
    if (!confirm('Approve this booking?')) return
    setLoading('approve')
    const result = await approveBooking(bookingId, slug)
    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success('Booking approved')
    }
    setLoading(null)
  }

  async function handleReject() {
    const reason = prompt('Reason for rejection (optional):')
    if (reason === null) return // user clicked Cancel
    setLoading('reject')
    const result = await rejectBooking(bookingId, slug, reason || undefined)
    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success('Booking rejected')
    }
    setLoading(null)
  }

  if (status === 'pending') {
    return (
      <div className="flex items-center gap-1">
        <Button
          size="sm"
          disabled={loading !== null}
          onClick={handleApprove}
          className="h-7 bg-green text-white font-mono text-xs hover:bg-green/90"
        >
          {loading === 'approve' ? '...' : 'Approve'}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          disabled={loading !== null}
          onClick={handleReject}
          className="h-7 font-mono text-xs text-destructive hover:text-destructive"
        >
          {loading === 'reject' ? '...' : 'Reject'}
        </Button>
      </div>
    )
  }

  if (status === 'confirmed') {
    return <OwnerCancelButton bookingId={bookingId} slug={slug} />
  }

  return null
}
