'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { requestMembership } from '@/app/[slug]/membership/actions'

interface MembershipRequestButtonProps {
  tierId: string
  slug: string
  hasPendingRequest: boolean
  hasActiveSubscription: boolean
}

export function MembershipRequestButton({
  tierId,
  slug,
  hasPendingRequest,
  hasActiveSubscription,
}: MembershipRequestButtonProps) {
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(hasPendingRequest)

  if (hasActiveSubscription) {
    return (
      <Button variant="secondary" size="sm" disabled className="font-mono text-xs">
        Active Member
      </Button>
    )
  }

  if (submitted) {
    return (
      <Button variant="secondary" size="sm" disabled className="font-mono text-xs">
        Request Pending
      </Button>
    )
  }

  async function handleRequest() {
    setSubmitting(true)
    const result = await requestMembership(tierId, slug)
    if (result.error) {
      alert(result.error)
    } else {
      setSubmitted(true)
    }
    setSubmitting(false)
  }

  return (
    <Button
      variant="outline"
      size="sm"
      disabled={submitting}
      onClick={handleRequest}
      className="font-mono text-xs hover:bg-primary hover:text-primary-foreground"
    >
      {submitting ? 'Requesting...' : 'Request Membership'}
    </Button>
  )
}
