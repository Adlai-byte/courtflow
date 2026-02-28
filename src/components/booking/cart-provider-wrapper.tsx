'use client'

import { BookingCartProvider } from '@/contexts/booking-cart-context'
import { CartDrawer } from './cart-drawer'

interface CartProviderWrapperProps {
  slug: string
  children: React.ReactNode
}

export function CartProviderWrapper({ slug, children }: CartProviderWrapperProps) {
  return (
    <BookingCartProvider slug={slug}>
      {children}
      <CartDrawer slug={slug} />
    </BookingCartProvider>
  )
}
