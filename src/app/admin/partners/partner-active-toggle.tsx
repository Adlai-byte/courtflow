'use client'

import { useTransition } from 'react'
import { Switch } from '@/components/ui/switch'
import { togglePartnerActive } from './actions'

export function PartnerActiveToggle({ id, isActive }: { id: string; isActive: boolean }) {
  const [isPending, startTransition] = useTransition()

  function handleToggle(checked: boolean) {
    startTransition(async () => {
      await togglePartnerActive(id, checked)
    })
  }

  return (
    <Switch
      checked={isActive}
      onCheckedChange={handleToggle}
      disabled={isPending}
      aria-label="Toggle active"
    />
  )
}
