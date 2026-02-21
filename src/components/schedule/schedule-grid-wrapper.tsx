'use client'

import { useState, useMemo } from 'react'
import type { Court, SportType, VenueType, CourtFeature } from '@/lib/types'
import { CourtFilters } from './court-filters'
import { DateNavigation } from './date-navigation'
import { ScheduleGrid } from './schedule-grid'

interface ScheduleGridWrapperProps {
  courts: Court[]
  tenantId: string
  slug: string
  closureDatesMap: Record<string, string[]>
  currentUserId?: string
}

export function ScheduleGridWrapper({
  courts,
  tenantId,
  slug,
  closureDatesMap,
  currentUserId,
}: ScheduleGridWrapperProps) {
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [searchQuery, setSearchQuery] = useState('')
  const [sportFilter, setSportFilter] = useState<SportType | 'all'>('all')
  const [venueFilter, setVenueFilter] = useState<VenueType | ''>('')
  const [featureFilters, setFeatureFilters] = useState<CourtFeature[]>([])
  const [recurring, setRecurring] = useState(false)
  const [totalWeeks, setTotalWeeks] = useState(4)

  function handleFeatureToggle(feature: CourtFeature) {
    setFeatureFilters((prev) =>
      prev.includes(feature) ? prev.filter((f) => f !== feature) : [...prev, feature]
    )
  }

  const filteredCourts = useMemo(() => {
    return courts.filter((court) => {
      // Search by name or description
      if (searchQuery) {
        const q = searchQuery.toLowerCase()
        const matchesName = court.name.toLowerCase().includes(q)
        const matchesDesc = court.description?.toLowerCase().includes(q) ?? false
        if (!matchesName && !matchesDesc) return false
      }
      // Sport type
      if (sportFilter !== 'all' && court.sport_type !== sportFilter) return false
      // Venue type
      if (venueFilter && court.amenities?.venue_type !== venueFilter) return false
      // Features (AND: court must have ALL selected)
      if (featureFilters.length > 0) {
        const courtFeatures = court.amenities?.features || []
        if (!featureFilters.every((f) => courtFeatures.includes(f))) return false
      }
      return true
    })
  }, [courts, searchQuery, sportFilter, venueFilter, featureFilters])

  return (
    <div className="space-y-4">
      <CourtFilters
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        sportFilter={sportFilter}
        onSportChange={setSportFilter}
        venueFilter={venueFilter}
        onVenueChange={setVenueFilter}
        featureFilters={featureFilters}
        onFeatureToggle={handleFeatureToggle}
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <DateNavigation selectedDate={selectedDate} onDateChange={setSelectedDate} />

        {/* Recurring toggle */}
        <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/30 px-3 py-1.5">
          <label className="flex items-center gap-2 font-mono text-xs uppercase tracking-wider text-muted-foreground cursor-pointer">
            <input
              type="checkbox"
              checked={recurring}
              onChange={(e) => setRecurring(e.target.checked)}
              className="rounded"
            />
            Repeat weekly
          </label>
          {recurring && (
            <label className="flex items-center gap-2 font-mono text-xs text-muted-foreground">
              for
              <input
                type="number"
                min={2}
                max={52}
                value={totalWeeks}
                onChange={(e) => setTotalWeeks(Number(e.target.value))}
                className="w-14 rounded border border-border bg-background px-2 py-0.5 text-center font-mono text-xs"
              />
              weeks
            </label>
          )}
        </div>
      </div>

      <ScheduleGrid
        courts={filteredCourts}
        selectedDate={selectedDate}
        tenantId={tenantId}
        slug={slug}
        closureDatesMap={closureDatesMap}
        currentUserId={currentUserId}
        recurring={recurring}
        totalWeeks={totalWeeks}
      />

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 font-mono text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <div className="h-3 w-3 rounded border border-emerald-400 bg-emerald-50" /> Available
        </span>
        <span className="flex items-center gap-1">
          <div className="h-3 w-3 rounded border border-primary bg-primary/10" /> In Cart
        </span>
        <span className="flex items-center gap-1">
          <div className="h-3 w-3 rounded border border-primary bg-primary/15" /> Your Booking
        </span>
        <span className="flex items-center gap-1">
          <div className="h-3 w-3 rounded border border-amber-300 bg-amber-50" /> Pending
        </span>
        <span className="flex items-center gap-1">
          <div className="h-3 w-3 rounded bg-muted" /> Booked
        </span>
        <span className="flex items-center gap-1">
          <div className="h-3 w-3 rounded bg-muted border border-border" /> Past
        </span>
      </div>
    </div>
  )
}
