'use client'

import { Input } from '@/components/ui/input'
import { Search } from 'lucide-react'
import type { SportType, VenueType, CourtFeature } from '@/lib/types'

const sportOptions: { value: SportType | 'all'; label: string }[] = [
  { value: 'all', label: 'All Sports' },
  { value: 'basketball', label: 'Basketball' },
  { value: 'pickleball', label: 'Pickleball' },
  { value: 'volleyball', label: 'Volleyball' },
  { value: 'tennis', label: 'Tennis' },
  { value: 'badminton', label: 'Badminton' },
  { value: 'other', label: 'Other' },
]

const venueOptions: { value: VenueType; label: string }[] = [
  { value: 'indoor', label: 'Indoor' },
  { value: 'outdoor', label: 'Outdoor' },
  { value: 'covered', label: 'Covered' },
]

const featureOptions: { value: CourtFeature; label: string }[] = [
  { value: 'air_conditioned', label: 'AC' },
  { value: 'parking', label: 'Parking' },
  { value: 'wifi', label: 'Wi-Fi' },
  { value: 'lighting', label: 'Lighting' },
  { value: 'restroom', label: 'Restroom' },
  { value: 'seating', label: 'Seating' },
]

interface CourtFiltersProps {
  searchQuery: string
  onSearchChange: (query: string) => void
  sportFilter: SportType | 'all'
  onSportChange: (sport: SportType | 'all') => void
  venueFilter: VenueType | ''
  onVenueChange: (venue: VenueType | '') => void
  featureFilters: CourtFeature[]
  onFeatureToggle: (feature: CourtFeature) => void
}

export function CourtFilters({
  searchQuery,
  onSearchChange,
  sportFilter,
  onSportChange,
  venueFilter,
  onVenueChange,
  featureFilters,
  onFeatureToggle,
}: CourtFiltersProps) {
  return (
    <div className="space-y-3">
      {/* Row 1: Search + Sport filter */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search courts..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9 font-mono text-sm"
          />
        </div>
        <div className="flex flex-wrap gap-1">
          {sportOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() => onSportChange(opt.value)}
              className={`rounded-md border px-2.5 py-1 font-mono text-xs transition-colors ${
                sportFilter === opt.value
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-border bg-background text-muted-foreground hover:border-primary/30 hover:text-foreground'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Row 2: Venue type + features */}
      <div className="flex flex-wrap items-center gap-1.5">
        {venueOptions.map((opt) => (
          <button
            key={opt.value}
            onClick={() => onVenueChange(venueFilter === opt.value ? '' : opt.value)}
            className={`rounded-md border px-2 py-0.5 font-mono text-xs transition-colors ${
              venueFilter === opt.value
                ? 'border-primary/50 bg-primary/10 text-primary'
                : 'border-border text-muted-foreground hover:border-primary/20 hover:text-foreground'
            }`}
          >
            {opt.label}
          </button>
        ))}
        <span className="mx-1 h-4 w-px bg-border" />
        {featureOptions.map((opt) => (
          <button
            key={opt.value}
            onClick={() => onFeatureToggle(opt.value)}
            className={`rounded-md border px-2 py-0.5 font-mono text-xs transition-colors ${
              featureFilters.includes(opt.value)
                ? 'border-primary/50 bg-primary/10 text-primary'
                : 'border-border text-muted-foreground hover:border-primary/20 hover:text-foreground'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  )
}
