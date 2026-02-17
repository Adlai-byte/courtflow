'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { approveMembershipRequest, rejectMembershipRequest } from '@/app/dashboard/[slug]/members/requests/actions'

interface MembershipRequestActionsProps {
  requestId: string
  slug: string
}

export function MembershipRequestActions({ requestId, slug }: MembershipRequestActionsProps) {
  const [processing, setProcessing] = useState(false)
  const [done, setDone] = useState<'approved' | 'rejected' | null>(null)

  async function handleApprove() {
    setProcessing(true)
    const result = await approveMembershipRequest(requestId, slug)
    if (result.error) {
      alert(result.error)
    } else {
      setDone('approved')
    }
    setProcessing(false)
  }

  async function handleReject() {
    const notes = prompt('Rejection notes (optional):')
    if (notes === null) return
    setProcessing(true)
    const result = await rejectMembershipRequest(requestId, slug, notes || undefined)
    if (result.error) {
      alert(result.error)
    } else {
      setDone('rejected')
    }
    setProcessing(false)
  }

  if (done) {
    return (
      <span className={`font-mono text-xs ${done === 'approved' ? 'text-green' : 'text-destructive'}`}>
        {done}
      </span>
    )
  }

  return (
    <div className="flex gap-2">
      <Button
        variant="outline"
        size="sm"
        disabled={processing}
        onClick={handleApprove}
        className="font-mono text-xs text-green hover:bg-green/10"
      >
        Approve
      </Button>
      <Button
        variant="ghost"
        size="sm"
        disabled={processing}
        onClick={handleReject}
        className="font-mono text-xs text-destructive hover:bg-destructive/10"
      >
        Reject
      </Button>
    </div>
  )
}
