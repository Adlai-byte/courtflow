import { Building2, Sun, Tent, Snowflake, Droplets, Car, Wifi, Lightbulb, Armchair, DoorOpen, Trophy } from 'lucide-react'
import type { CourtAmenities, CourtFeature } from '@/lib/types'

const venueIcons: Record<string, typeof Building2> = {
  indoor: Building2,
  outdoor: Sun,
  covered: Tent,
}

const venueLabels: Record<string, string> = {
  indoor: 'Indoor',
  outdoor: 'Outdoor',
  covered: 'Covered',
}

const floorLabels: Record<string, string> = {
  hardwood: 'Hardwood',
  concrete: 'Concrete',
  synthetic: 'Synthetic',
  rubber: 'Rubber',
  grass: 'Grass',
  clay: 'Clay',
  turf: 'Turf',
}

const featureConfig: Record<CourtFeature, { label: string; icon: typeof Snowflake }> = {
  air_conditioned: { label: 'AC', icon: Snowflake },
  restroom: { label: 'Restroom', icon: DoorOpen },
  free_water: { label: 'Free Water', icon: Droplets },
  parking: { label: 'Parking', icon: Car },
  wifi: { label: 'Wi-Fi', icon: Wifi },
  lighting: { label: 'Lighting', icon: Lightbulb },
  seating: { label: 'Seating', icon: Armchair },
  locker_room: { label: 'Locker Room', icon: DoorOpen },
  scoreboard: { label: 'Scoreboard', icon: Trophy },
}

interface AmenityChipsProps {
  amenities?: CourtAmenities
  compact?: boolean
}

export function AmenityChips({ amenities, compact }: AmenityChipsProps) {
  if (!amenities) return null

  const chips: { label: string; icon?: typeof Building2 }[] = []

  if (amenities.venue_type) {
    chips.push({
      label: venueLabels[amenities.venue_type] || amenities.venue_type,
      icon: venueIcons[amenities.venue_type],
    })
  }

  if (amenities.floor_type) {
    chips.push({
      label: floorLabels[amenities.floor_type] || amenities.floor_type,
    })
  }

  if (amenities.features) {
    for (const f of amenities.features) {
      const cfg = featureConfig[f]
      if (cfg) {
        chips.push({ label: cfg.label, icon: cfg.icon })
      }
    }
  }

  if (chips.length === 0) return null

  const maxVisible = compact ? 3 : chips.length
  const visible = chips.slice(0, maxVisible)
  const overflow = chips.length - maxVisible

  return (
    <>
      {visible.map((chip) => {
        const Icon = chip.icon
        return (
          <span
            key={chip.label}
            className="inline-flex items-center gap-1 rounded border border-primary/20 bg-primary/5 px-2 py-0.5 font-mono text-xs text-primary"
          >
            {Icon && <Icon className="h-3 w-3" />}
            {chip.label}
          </span>
        )
      })}
      {overflow > 0 && (
        <span className="inline-flex rounded border border-border px-2 py-0.5 font-mono text-xs text-muted-foreground">
          +{overflow} more
        </span>
      )}
    </>
  )
}
