'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { ownerCancelBooking } from '@/app/dashboard/[slug]/bookings/actions'

interface Props {
  bookingId: string
  slug: string
}

export function OwnerCancelButton({ bookingId, slug }: Props) {
  const [cancelling, setCancelling] = useState(false)

  async function handleCancel() {
    if (!confirm('Cancel this booking?')) return
    setCancelling(true)
    await ownerCancelBooking(bookingId, slug)
    setCancelling(false)
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      disabled={cancelling}
      onClick={handleCancel}
      className="font-mono text-xs text-destructive hover:text-destructive"
    >
      {cancelling ? '...' : 'Cancel'}
    </Button>
  )
}
