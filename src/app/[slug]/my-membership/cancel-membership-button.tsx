'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { cancelMembership } from './actions'

interface Props {
  subscriptionId: string
  slug: string
}

export function CancelMembershipButton({ subscriptionId, slug }: Props) {
  const [cancelling, setCancelling] = useState(false)
  const router = useRouter()

  async function handleCancel() {
    if (!confirm('Are you sure you want to cancel your membership?')) return
    setCancelling(true)
    const result = await cancelMembership(subscriptionId, slug)
    if (result?.error) {
      alert(`Failed to cancel: ${result.error}`)
    }
    setCancelling(false)
    router.refresh()
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
