'use client'

import { useState } from 'react'
import { ShoppingCart, X, Repeat, AlertCircle, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from '@/components/ui/sheet'
import { useBookingCart, type CartItem } from '@/contexts/booking-cart-context'
import { createBatchBooking } from '@/app/[slug]/courts/[id]/batch-actions'
import { toSlotLabel } from '@/lib/time-format'

interface CartDrawerProps {
  slug: string
}

export function CartDrawer({ slug }: CartDrawerProps) {
  const { items, removeItem, clearCart, itemCount } = useBookingCart()
  const [open, setOpen] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [failedIds, setFailedIds] = useState<Record<string, string>>({})

  // Group items by courtName
  const grouped = items.reduce<Record<string, CartItem[]>>((acc, item) => {
    if (!acc[item.courtName]) acc[item.courtName] = []
    acc[item.courtName].push(item)
    return acc
  }, {})

  async function handleConfirm() {
    setConfirming(true)
    setFailedIds({})

    try {
      const result = await createBatchBooking(
        slug,
        items.map((i) => ({
          courtId: i.courtId,
          courtName: i.courtName,
          date: i.date,
          startTime: i.startTime,
          endTime: i.endTime,
          recurring: i.recurring,
          totalWeeks: i.totalWeeks,
        }))
      )

      if (result.error) {
        toast.error(result.error)
        setConfirming(false)
        return
      }

      // Track failures
      const newFailedIds: Record<string, string> = {}
      const successCartIds: string[] = []

      for (const r of result.results) {
        // Match result back to cart item
        const cartItem = items.find(
          (i) =>
            i.courtId === r.courtId &&
            i.date === r.date &&
            i.startTime === r.startTime
        )
        if (!cartItem) continue

        if (r.success) {
          successCartIds.push(cartItem.id)
        } else {
          newFailedIds[cartItem.id] = r.error || 'Booking failed'
        }
      }

      // Remove successful items
      for (const id of successCartIds) {
        removeItem(id)
      }

      if (result.totalFailed > 0) {
        setFailedIds(newFailedIds)
        toast.warning(
          `${result.totalBooked} booked, ${result.totalFailed} failed — check your cart`
        )
      } else {
        toast.success(
          `${result.totalBooked} booking${result.totalBooked !== 1 ? 's' : ''} confirmed!`
        )
        setOpen(false)
      }
    } catch {
      toast.error('Something went wrong. Please try again.')
    } finally {
      setConfirming(false)
    }
  }

  if (itemCount === 0 && !open) return null

  return (
    <>
      {/* Floating trigger button */}
      {itemCount > 0 && (
        <button
          onClick={() => setOpen(true)}
          aria-label={`Open cart (${itemCount} items)`}
          className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform hover:scale-105 active:scale-95"
        >
          <ShoppingCart className="h-6 w-6" />
          <span className="absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1 text-[11px] font-bold text-white">
            {itemCount}
          </span>
        </button>
      )}

      {/* Sheet / Drawer */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="flex flex-col">
          <SheetHeader>
            <SheetTitle className="font-mono text-sm uppercase tracking-wider">
              Your Cart
            </SheetTitle>
            <SheetDescription>
              {itemCount} item{itemCount !== 1 ? 's' : ''}
            </SheetDescription>
          </SheetHeader>

          {/* Body — scrollable */}
          <div className="flex-1 overflow-y-auto px-4" aria-live="polite">
            {Object.entries(grouped).map(([courtName, courtItems]) => (
              <div key={courtName} className="mb-4">
                <h3 className="mb-2 font-mono text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {courtName}
                </h3>
                <div className="space-y-2">
                  {courtItems.map((item) => {
                    const failed = failedIds[item.id]
                    return (
                      <div
                        key={item.id}
                        className={`flex items-center justify-between rounded-lg border p-2 ${
                          failed
                            ? 'border-destructive/50 bg-destructive/5'
                            : 'border-border bg-muted/30'
                        }`}
                      >
                        <div className="flex-1 min-w-0">
                          <p className="font-mono text-sm">
                            {toSlotLabel(item.startTime, item.endTime)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(item.date + 'T00:00:00').toLocaleDateString('en-US', {
                              weekday: 'short',
                              month: 'short',
                              day: 'numeric',
                            })}
                          </p>
                          <div className="flex items-center gap-1 mt-0.5">
                            {item.recurring && (
                              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                                <Repeat className="h-2.5 w-2.5" />
                                x{item.totalWeeks}w
                              </Badge>
                            )}
                            {failed && (
                              <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                                <AlertCircle className="h-2.5 w-2.5" />
                                {failed}
                              </Badge>
                            )}
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          aria-label={`Remove ${item.courtName} booking`}
                          onClick={() => {
                            removeItem(item.id)
                            setFailedIds((prev) => {
                              const next = { ...prev }
                              delete next[item.id]
                              return next
                            })
                          }}
                        >
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Footer */}
          <SheetFooter className="border-t border-border">
            <Button
              variant="ghost"
              size="sm"
              className="text-destructive hover:text-destructive"
              onClick={() => {
                clearCart()
                setFailedIds({})
                setOpen(false)
              }}
            >
              Clear All
            </Button>
            <Button
              className="w-full font-mono text-xs uppercase tracking-wider"
              disabled={confirming || itemCount === 0}
              onClick={handleConfirm}
            >
              {confirming ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Booking...
                </>
              ) : (
                `Confirm All Bookings (${itemCount})`
              )}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </>
  )
}
