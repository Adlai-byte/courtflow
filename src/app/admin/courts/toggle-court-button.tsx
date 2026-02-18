'use client'

import { useTransition } from 'react'
import { toggleCourtActive } from '@/app/admin/actions'
import { Button } from '@/components/ui/button'
import { Loader2, Power } from 'lucide-react'

export function ToggleCourtButton({ courtId, isActive }: { courtId: string; isActive: boolean }) {
  const [isPending, startTransition] = useTransition()

  function handleToggle() {
    startTransition(async () => {
      await toggleCourtActive(courtId, !isActive)
    })
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleToggle}
      disabled={isPending}
      className="h-7 gap-1 text-xs"
    >
      {isPending ? (
        <Loader2 className="h-3 w-3 animate-spin" />
      ) : (
        <Power className="h-3 w-3" />
      )}
      {isActive ? 'Disable' : 'Enable'}
    </Button>
  )
}
