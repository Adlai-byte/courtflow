'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

interface WaitlistButtonProps {
  courtId: string
  tenantId: string
  date: string
  startTime: string
  endTime: string
  slug: string
  waitlistCount?: number
}

export function WaitlistButton({ courtId, tenantId, date, startTime, endTime, slug, waitlistCount }: WaitlistButtonProps) {
  const [joining, setJoining] = useState(false)
  const [joined, setJoined] = useState(false)

  async function handleJoinWaitlist() {
    setJoining(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      window.location.href = `/login?redirect=/${slug}/courts/${courtId}`
      return
    }

    const { error } = await supabase.from('waitlist_entries').insert({
      tenant_id: tenantId,
      court_id: courtId,
      customer_id: user.id,
      date,
      start_time: startTime,
      end_time: endTime,
    })

    if (error) {
      toast.error(error.message)
    } else {
      setJoined(true)
      toast.success('Added to waitlist')
    }
    setJoining(false)
  }

  if (joined) {
    return (
      <Button variant="secondary" size="sm" disabled className="font-mono text-xs">
        On Waitlist
      </Button>
    )
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      disabled={joining}
      onClick={handleJoinWaitlist}
      className="font-mono text-xs opacity-60 hover:opacity-100"
    >
      Waitlist
      {typeof waitlistCount === 'number' && waitlistCount > 0 && (
        <span className="ml-1 text-amber-600 font-medium">&middot; {waitlistCount}</span>
      )}
    </Button>
  )
}
