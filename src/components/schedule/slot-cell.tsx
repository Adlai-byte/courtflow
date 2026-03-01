'use client'

import { ShoppingCart, Star, Clock, Hourglass } from 'lucide-react'
import { toSlotLabel } from '@/lib/time-format'
import type { GridSlot } from '@/lib/schedule-utils'

interface SlotCellProps {
  slot: GridSlot
  onAddToCart: (courtId: string, start: string, end: string) => void
  onRemoveFromCart: (courtId: string, start: string) => void
}

export function SlotCell({ slot, onAddToCart, onRemoveFromCart }: SlotCellProps) {
  const label = toSlotLabel(slot.start, slot.end)

  if (slot.state === 'closed') {
    return (
      <div className="flex h-full w-full items-center justify-center bg-muted/30 font-mono text-[10px] text-muted-foreground/40" />
    )
  }

  if (slot.state === 'past') {
    return (
      <button
        disabled
        aria-label={`${label} — Past`}
        className="flex h-full w-full items-center justify-center border-r border-border bg-muted/40 font-mono text-[10px] text-muted-foreground/40 line-through"
      >
        {label}
      </button>
    )
  }

  if (slot.state === 'booked_by_you') {
    return (
      <button
        disabled
        aria-label={`${label} — Your booking`}
        className="flex h-full w-full items-center justify-center gap-0.5 border-r border-primary/20 bg-primary/15 font-mono text-[10px] font-semibold text-primary"
      >
        <Star className="h-2.5 w-2.5 fill-current" />
        <span className="hidden sm:inline">{label}</span>
      </button>
    )
  }

  if (slot.state === 'pending_by_you') {
    return (
      <button
        disabled
        className="flex h-full w-full items-center justify-center gap-0.5 border-r border-amber-300 bg-amber-50 font-mono text-[10px] font-semibold text-amber-600"
        title={`${label} — Pending approval`}
      >
        <Hourglass className="h-2.5 w-2.5" />
        <span className="hidden sm:inline">{label}</span>
      </button>
    )
  }

  if (slot.state === 'booked_by_others') {
    return (
      <button
        disabled
        className="flex h-full w-full items-center justify-center gap-0.5 border-r border-border bg-muted font-mono text-[10px] text-muted-foreground"
        title={`${label} — Booked`}
      >
        <Clock className="h-2.5 w-2.5" />
        <span className="hidden sm:inline">{label}</span>
      </button>
    )
  }

  if (slot.state === 'in_cart') {
    return (
      <button
        aria-label={`${label} — In cart, click to remove`}
        className="flex h-full w-full items-center justify-center gap-0.5 border-r border-primary bg-primary/10 font-mono text-[10px] text-primary transition-colors hover:bg-primary/20 active:scale-95"
        onClick={() => onRemoveFromCart(slot.courtId, slot.start)}
        title={`${label} — In cart (click to remove)`}
      >
        <ShoppingCart className="h-2.5 w-2.5" />
        <span className="hidden sm:inline">{label}</span>
      </button>
    )
  }

  // available
  return (
    <button
      aria-label={`${label} — Available, click to add to cart`}
      className="flex h-full w-full items-center justify-center border-r border-emerald-200 bg-emerald-50 font-mono text-[10px] text-emerald-700 transition-colors hover:bg-emerald-500 hover:text-white active:scale-95"
      onClick={() => onAddToCart(slot.courtId, slot.start, slot.end)}
      title={`${label} — Available`}
    >
      {label}
    </button>
  )
}
