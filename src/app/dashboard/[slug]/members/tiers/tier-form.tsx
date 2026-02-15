'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { createTier } from './actions'

interface TierFormProps {
  tenantId: string
  slug: string
  onSuccess?: () => void
}

export function TierForm({ tenantId, slug, onSuccess }: TierFormProps) {
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(formData: FormData) {
    const result = await createTier(tenantId, slug, formData)
    if (result.error) {
      setError(result.error)
    } else {
      onSuccess?.()
    }
  }

  return (
    <form action={handleSubmit} className="space-y-4">
      {error && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
      )}
      <div className="space-y-2">
        <Label htmlFor="name">Tier Name</Label>
        <Input id="name" name="name" required placeholder="Gold Member" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea id="description" name="description" placeholder="Premium access with exclusive perks..." rows={2} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="price">Monthly Price ($)</Label>
        <Input id="price" name="price" type="number" step="0.01" min="0" defaultValue="0" />
      </div>
      <div className="space-y-3">
        <Label className="text-base font-semibold">Perks</Label>
        <div className="space-y-2">
          <label className="flex items-center gap-2">
            <input type="checkbox" name="priority_booking" value="true" className="accent-primary" />
            <span className="text-sm">Priority Booking</span>
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" name="waitlist_priority" value="true" className="accent-primary" />
            <span className="text-sm">Waitlist Priority</span>
          </label>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="discount_pct">Discount %</Label>
            <Input id="discount_pct" name="discount_pct" type="number" min="0" max="100" defaultValue="0" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="free_hours">Free Hours/Month</Label>
            <Input id="free_hours" name="free_hours" type="number" min="0" defaultValue="0" />
          </div>
        </div>
      </div>
      <Button type="submit" className="w-full">Create Tier</Button>
    </form>
  )
}
