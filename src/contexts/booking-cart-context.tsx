'use client'

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react'

export interface CartItem {
  id: string
  courtId: string
  courtName: string
  date: string       // YYYY-MM-DD
  startTime: string  // HH:MM
  endTime: string    // HH:MM
  recurring: boolean
  totalWeeks?: number
}

interface BookingCartContextValue {
  items: CartItem[]
  addItem: (item: Omit<CartItem, 'id'>) => void
  removeItem: (id: string) => void
  clearCart: () => void
  isInCart: (courtId: string, date: string, startTime: string) => boolean
  itemCount: number
}

const BookingCartContext = createContext<BookingCartContextValue | null>(null)

export function BookingCartProvider({ slug, children }: { slug?: string; children: ReactNode }) {
  const storageKey = slug ? `booking-cart-${slug}` : null
  const [items, setItems] = useState<CartItem[]>([])
  const [hydrated, setHydrated] = useState(false)

  // Restore cart from localStorage after hydration
  useEffect(() => {
    if (!storageKey) return
    try {
      const stored = localStorage.getItem(storageKey)
      if (stored) {
        setItems(JSON.parse(stored))
      }
    } catch {}
    setHydrated(true)
  }, [storageKey])

  // Persist cart to localStorage on changes (only after initial hydration)
  useEffect(() => {
    if (!storageKey || !hydrated) return
    try {
      if (items.length > 0) {
        localStorage.setItem(storageKey, JSON.stringify(items))
      } else {
        localStorage.removeItem(storageKey)
      }
    } catch {}
  }, [items, storageKey, hydrated])

  const addItem = useCallback((item: Omit<CartItem, 'id'>) => {
    setItems((prev) => {
      // Deduplicate by courtId+date+startTime
      const exists = prev.some(
        (i) => i.courtId === item.courtId && i.date === item.date && i.startTime === item.startTime
      )
      if (exists) return prev
      return [...prev, { ...item, id: crypto.randomUUID() }]
    })
  }, [])

  const removeItem = useCallback((id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id))
  }, [])

  const clearCart = useCallback(() => {
    setItems([])
  }, [])

  const isInCart = useCallback(
    (courtId: string, date: string, startTime: string) => {
      return items.some(
        (i) => i.courtId === courtId && i.date === date && i.startTime === startTime
      )
    },
    [items]
  )

  return (
    <BookingCartContext.Provider
      value={{ items, addItem, removeItem, clearCart, isInCart, itemCount: items.length }}
    >
      {children}
    </BookingCartContext.Provider>
  )
}

export function useBookingCart() {
  const ctx = useContext(BookingCartContext)
  if (!ctx) {
    throw new Error('useBookingCart must be used within a BookingCartProvider')
  }
  return ctx
}
