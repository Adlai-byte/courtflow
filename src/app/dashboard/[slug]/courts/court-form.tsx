'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { CourtImageUpload } from '@/components/dashboard/court-image-upload'
import { createCourt, updateCourt } from './actions'
import type { Court, CourtAmenities, CourtFeature } from '@/lib/types'

const sportTypes = [
  { value: 'basketball', label: 'Basketball' },
  { value: 'pickleball', label: 'Pickleball' },
  { value: 'volleyball', label: 'Volleyball' },
  { value: 'tennis', label: 'Tennis' },
  { value: 'badminton', label: 'Badminton' },
  { value: 'other', label: 'Other' },
]

const venueTypes = [
  { value: 'indoor', label: 'Indoor' },
  { value: 'outdoor', label: 'Outdoor' },
  { value: 'covered', label: 'Covered' },
]

const floorTypes = [
  { value: 'hardwood', label: 'Hardwood' },
  { value: 'concrete', label: 'Concrete' },
  { value: 'synthetic', label: 'Synthetic' },
  { value: 'rubber', label: 'Rubber' },
  { value: 'grass', label: 'Grass' },
  { value: 'clay', label: 'Clay' },
  { value: 'turf', label: 'Turf' },
]

const featureOptions: { value: CourtFeature; label: string }[] = [
  { value: 'air_conditioned', label: 'Air Conditioned' },
  { value: 'restroom', label: 'Restroom' },
  { value: 'free_water', label: 'Free Water' },
  { value: 'parking', label: 'Parking' },
  { value: 'wifi', label: 'Wi-Fi' },
  { value: 'lighting', label: 'Lighting' },
  { value: 'seating', label: 'Seating' },
  { value: 'locker_room', label: 'Locker Room' },
  { value: 'scoreboard', label: 'Scoreboard' },
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
  const [imageUrl, setImageUrl] = useState<string | null>(court?.image_url || null)

  const existingAmenities: CourtAmenities = court?.amenities || {}
  const [venueType, setVenueType] = useState(existingAmenities.venue_type || '')
  const [floorType, setFloorType] = useState(existingAmenities.floor_type || '')
  const [features, setFeatures] = useState<CourtFeature[]>(existingAmenities.features || [])

  function toggleFeature(f: CourtFeature) {
    setFeatures((prev) => prev.includes(f) ? prev.filter((x) => x !== f) : [...prev, f])
  }

  function buildAmenities(): string {
    const obj: CourtAmenities = {}
    if (venueType) obj.venue_type = venueType as CourtAmenities['venue_type']
    if (floorType) obj.floor_type = floorType as CourtAmenities['floor_type']
    if (features.length > 0) obj.features = features
    return JSON.stringify(obj)
  }

  async function handleSubmit(formData: FormData) {
    formData.set('amenities', buildAmenities())
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
      <CourtImageUpload
        tenantId={tenantId}
        courtId={court?.id}
        currentImageUrl={court?.image_url}
        onImageUrlChange={setImageUrl}
      />
      <input type="hidden" name="image_url" value={imageUrl || ''} />

      {/* Amenities */}
      <div className="space-y-3 rounded-lg border border-border p-3">
        <span className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Amenities</span>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Venue Type</Label>
            <Select value={venueType} onValueChange={setVenueType}>
              <SelectTrigger>
                <SelectValue placeholder="Select..." />
              </SelectTrigger>
              <SelectContent>
                {venueTypes.map((v) => (
                  <SelectItem key={v.value} value={v.value}>{v.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Floor Type</Label>
            <Select value={floorType} onValueChange={setFloorType}>
              <SelectTrigger>
                <SelectValue placeholder="Select..." />
              </SelectTrigger>
              <SelectContent>
                {floorTypes.map((f) => (
                  <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="space-y-2">
          <Label>Features</Label>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {featureOptions.map((f) => (
              <label key={f.value} className="flex items-center gap-2 cursor-pointer text-sm">
                <input
                  type="checkbox"
                  checked={features.includes(f.value)}
                  onChange={() => toggleFeature(f.value)}
                  className="rounded"
                />
                {f.label}
              </label>
            ))}
          </div>
        </div>
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
      <div className="space-y-2">
        <Label htmlFor="price_per_hour">Price per hour (₱)</Label>
        <Input
          id="price_per_hour"
          name="price_per_hour"
          type="number"
          min="0"
          step="0.01"
          defaultValue={court?.price_per_hour || 0}
          className="w-40 font-mono"
        />
      </div>
      {court && <input type="hidden" name="is_active" value={String(court.is_active)} />}
      <Button type="submit" className="w-full">
        {court ? 'Update Court' : 'Add Court'}
      </Button>
    </form>
  )
}
