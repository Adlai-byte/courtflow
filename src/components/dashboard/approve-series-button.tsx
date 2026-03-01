'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { approveRecurringSeries } from '@/app/dashboard/[slug]/bookings/actions'

interface Props {
  seriesId: string
  slug: string
}

export function ApproveSeriesButton({ seriesId, slug }: Props) {
  const [loading, setLoading] = useState(false)

  async function handleApproveSeries() {
    if (!confirm('Approve all pending bookings in this recurring series?')) return
    setLoading(true)
    const result = await approveRecurringSeries(seriesId, slug)
    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success(`Approved ${result.count} bookings in series`)
    }
    setLoading(false)
  }

  return (
    <Button
      size="sm"
      variant="outline"
      disabled={loading}
      onClick={handleApproveSeries}
      className="h-7 font-mono text-xs border-primary/30 text-primary hover:bg-primary/10"
    >
      {loading ? '...' : 'Approve Series'}
    </Button>
  )
}
