'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { leaveWaitlist } from '@/app/[slug]/my-waitlist/actions'

interface Props {
  entryId: string
  slug: string
}

export function LeaveWaitlistButton({ entryId, slug }: Props) {
  const [leaving, setLeaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleLeave() {
    if (!confirm('Are you sure you want to leave this waitlist?')) return
    setLeaving(true)
    setError(null)
    const result = await leaveWaitlist(entryId, slug)
    if (result.error) {
      setError(result.error)
    }
    setLeaving(false)
  }

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="ghost"
        size="sm"
        disabled={leaving}
        onClick={handleLeave}
        className="font-mono text-xs text-destructive hover:text-destructive"
      >
        {leaving ? 'Leaving...' : 'Leave'}
      </Button>
      {error && <span className="text-xs text-destructive">{error}</span>}
    </div>
  )
}
