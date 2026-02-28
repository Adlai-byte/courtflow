'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { cancelMembership } from './actions'

interface Props {
  subscriptionId: string
  slug: string
}

export function CancelMembershipButton({ subscriptionId, slug }: Props) {
  const [cancelling, setCancelling] = useState(false)

  async function handleCancel() {
    if (!confirm('Are you sure you want to cancel your membership?')) return
    setCancelling(true)
    await cancelMembership(subscriptionId, slug)
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
      {cancelling ? 'Cancelling...' : 'Cancel Membership'}
    </Button>
  )
}
