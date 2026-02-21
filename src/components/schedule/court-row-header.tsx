'use client'

import { Info } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { AmenityChips } from '@/components/booking/amenity-chips'
import type { Court } from '@/lib/types'

interface CourtRowHeaderProps {
  court: Court
}

const sportLabels: Record<string, string> = {
  basketball: 'Basketball',
  pickleball: 'Pickleball',
  volleyball: 'Volleyball',
  tennis: 'Tennis',
  badminton: 'Badminton',
  other: 'Other',
}

export function CourtRowHeader({ court }: CourtRowHeaderProps) {
  const duration =
    court.booking_mode === 'fixed_slot'
      ? `${court.slot_duration_minutes}min`
      : `${court.min_duration_minutes}-${court.max_duration_minutes}min`

  return (
    <div className="flex items-center gap-2 border-r border-border bg-background px-3 py-2">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold tracking-tight">{court.name}</p>
        <div className="flex items-center gap-1.5 mt-0.5">
          <span className="font-mono text-[10px] text-muted-foreground">
            {sportLabels[court.sport_type] || court.sport_type}
          </span>
          <span className="text-muted-foreground/30">·</span>
          <span className="font-mono text-[10px] text-muted-foreground">{duration}</span>
        </div>
      </div>
      <Dialog>
        <DialogTrigger asChild>
          <Button variant="ghost" size="icon-xs" className="shrink-0">
            <Info className="h-3.5 w-3.5" />
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{court.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {court.image_url && (
              <div className="aspect-video w-full overflow-hidden rounded-lg border border-border">
                <img src={court.image_url} alt={court.name} className="h-full w-full object-cover" />
              </div>
            )}
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex rounded border border-border px-2 py-0.5 font-mono text-xs text-muted-foreground">
                {sportLabels[court.sport_type] || court.sport_type}
              </span>
              <span className="inline-flex rounded border border-border px-2 py-0.5 font-mono text-xs text-muted-foreground">
                {duration}
              </span>
            </div>
            {court.description && (
              <p className="text-sm text-muted-foreground">{court.description}</p>
            )}
            {court.amenities && Object.keys(court.amenities).length > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                <AmenityChips amenities={court.amenities} />
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
