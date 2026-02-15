'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { createCourt, updateCourt } from './actions'
import type { Court } from '@/lib/types'

const sportTypes = [
  { value: 'basketball', label: 'Basketball' },
  { value: 'pickleball', label: 'Pickleball' },
  { value: 'volleyball', label: 'Volleyball' },
  { value: 'tennis', label: 'Tennis' },
  { value: 'badminton', label: 'Badminton' },
  { value: 'other', label: 'Other' },
]

interface CourtFormProps {
  tenantId: string
  slug: string
  court?: Court
  onSuccess?: () => void
}

export function CourtForm({ tenantId, slug, court, onSuccess }: CourtFormProps) {
  const [error, setError] = useState<string | null>(null)
  const [bookingMode, setBookingMode] = useState<string>(court?.booking_mode || 'fixed_slot')

  async function handleSubmit(formData: FormData) {
    const result = court
      ? await updateCourt(court.id, slug, formData)
      : await createCourt(tenantId, slug, formData)

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
        <Label htmlFor="name">Court Name</Label>
        <Input id="name" name="name" required defaultValue={court?.name} placeholder="Court 1" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="sport_type">Sport Type</Label>
        <Select name="sport_type" defaultValue={court?.sport_type || 'basketball'}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {sportTypes.map((sport) => (
              <SelectItem key={sport.value} value={sport.value}>
                {sport.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea id="description" name="description" defaultValue={court?.description || ''} placeholder="Indoor full-size court..." rows={2} />
      </div>
      <div className="space-y-2">
        <Label>Booking Mode</Label>
        <Select name="booking_mode" defaultValue={bookingMode} onValueChange={setBookingMode}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="fixed_slot">Fixed Time Slots</SelectItem>
            <SelectItem value="flexible">Flexible Duration</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {bookingMode === 'fixed_slot' ? (
        <div className="space-y-2">
          <Label htmlFor="slot_duration_minutes">Slot Duration (minutes)</Label>
          <Input id="slot_duration_minutes" name="slot_duration_minutes" type="number" defaultValue={court?.slot_duration_minutes || 60} min={15} max={240} step={15} />
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="min_duration_minutes">Min Duration (min)</Label>
            <Input id="min_duration_minutes" name="min_duration_minutes" type="number" defaultValue={court?.min_duration_minutes || 30} min={15} max={240} step={15} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="max_duration_minutes">Max Duration (min)</Label>
            <Input id="max_duration_minutes" name="max_duration_minutes" type="number" defaultValue={court?.max_duration_minutes || 180} min={30} max={480} step={15} />
          </div>
        </div>
      )}
      {court && <input type="hidden" name="is_active" value={String(court.is_active)} />}
      <Button type="submit" className="w-full">
        {court ? 'Update Court' : 'Add Court'}
      </Button>
    </form>
  )
}
