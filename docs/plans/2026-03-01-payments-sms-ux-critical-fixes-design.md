# Critical & High-Priority Fixes — Design Document

**Date:** 2026-03-01
**Scope:** Payment integration, SMS notifications, auto-approve, pricing, currency, grid UX, location search, settings enhancement

---

## Problem Statement

CourtFLOW is a technically solid booking platform but lacks the essential features to operate as a real business: no payment processing, no SMS notifications, no visible pricing, manual-only booking approval, and USD currency in a Philippine market.

## Decisions

- **Payment gateway:** PayMongo (supports GCash + Maya natively)
- **Payment model:** Hybrid — owner toggles per-facility (pay-on-book vs pay-at-venue)
- **PayMongo keys:** Platform-wide (single account, settle with owners later)
- **SMS provider:** Semaphore (Philippine SMS gateway, ~₱0.35/SMS)
- **Currency:** PHP (₱) everywhere, stored as decimals
- **Booking default:** Auto-approve (instant confirmation), owner can opt into manual approval

---

## 1. Schema Changes

### New columns on `courts`
- `price_per_hour DECIMAL(10,2) DEFAULT 0` — base hourly rate in PHP

### New columns on `bookings`
- `amount DECIMAL(10,2) DEFAULT 0` — total price at booking time
- `payment_status TEXT DEFAULT 'unpaid'` — unpaid | paid | refunded
- `payment_id TEXT` — PayMongo checkout/payment reference

### New columns on `tenants`
- `require_payment BOOLEAN DEFAULT false` — true = online payment required
- `auto_approve BOOLEAN DEFAULT true` — true = instant confirm, false = pending
- `city TEXT` — for location search
- `address TEXT` — display address
- `contact_phone TEXT` — owner phone for notifications

### New columns on `profiles`
- `phone TEXT` — customer phone for SMS notifications

### New table: `payments`
```
id UUID PK
tenant_id UUID FK → tenants
booking_id UUID FK → bookings (nullable, for membership payments later)
amount DECIMAL(10,2)
currency TEXT DEFAULT 'PHP'
status TEXT DEFAULT 'pending' — pending | paid | failed | refunded
provider TEXT DEFAULT 'paymongo'
provider_payment_id TEXT
provider_checkout_id TEXT
paid_at TIMESTAMPTZ
created_at TIMESTAMPTZ DEFAULT now()
```

RLS: owner can read own tenant's payments, customer can read own payments.

---

## 2. Payment Flow (PayMongo)

### Pay-on-book flow (require_payment = true)
1. Customer clicks "Confirm All Bookings" in cart
2. Server action `createCheckoutSession`:
   - Computes total from cart items × court prices
   - Creates PayMongo Checkout Session via REST API
   - Payment methods: `gcash`, `paymaya` (+ `card` optionally)
   - Success URL: `/{slug}/booking-success?session_id={id}`
   - Redirects customer to PayMongo checkout page
3. Customer pays via GCash/Maya on PayMongo's hosted page
4. PayMongo redirects to success URL
5. Webhook `/api/webhooks/paymongo`:
   - Verifies webhook signature
   - On `checkout_session.payment.paid`:
     - Creates booking records with `payment_status = 'paid'`
     - Sets `status = 'confirmed'` (if auto_approve) or `'pending'`
     - Creates `payments` record
     - Sends confirmation email + SMS
6. Success page shows booking confirmation

### Pay-at-venue flow (require_payment = false)
- Current flow unchanged
- Bookings created directly with `payment_status = 'unpaid'`
- Status follows `auto_approve` setting

### Refund flow
- Owner cancels a `paid` booking → calls PayMongo Refund API → updates `payment_status = 'refunded'`

---

## 3. Pricing Display

- **Court form:** New "Price per hour (₱)" field
- **Schedule grid:** Slot cells show price on hover/tap (e.g., "₱150")
- **Cart drawer:** Each item shows price, total at bottom
- **Cart item model:** Add `price` field computed from `court.price_per_hour × duration`

---

## 4. Auto-Approve (C3)

- Default `auto_approve = true` on tenants
- `createBatchBooking` checks `tenant.auto_approve`:
  - true → `status = 'confirmed'`, email says "confirmed"
  - false → `status = 'pending'`, email says "awaiting approval"
- Owner toggles this in Settings

---

## 5. Currency Change ($ → ₱)

Replace `$` with `₱` in:
- `src/app/[slug]/page.tsx`
- `src/app/[slug]/my-membership/page.tsx`
- `src/app/dashboard/[slug]/members/tiers/page.tsx`
- `src/app/dashboard/[slug]/members/tiers/tier-form.tsx`
- `src/components/analytics/revenue-chart.tsx`
- `src/components/analytics/revenue-by-court.tsx`

---

## 6. SMS Notifications (Semaphore)

### `src/lib/sms.ts`
```ts
sendSMS(to: string, message: string): Promise<void>
```
Uses `SEMAPHORE_API_KEY` and `SEMAPHORE_SENDER_NAME` env vars. Skips silently if not configured.

### Triggers (alongside existing email)
- Booking confirmed → SMS to customer
- Booking cancelled → SMS to customer
- Waitlist promotion → SMS to customer
- New booking request → SMS to owner

### Phone collection
- Add optional phone field to profile/settings
- SMS only sent if phone number exists

---

## 7. Grid UX Fixes

### H1: Auto-scroll to current time
- `useEffect` in `schedule-grid.tsx` after render
- Find the column element for the current hour
- `scrollIntoView({ inline: 'start', behavior: 'smooth' })`

### H4: WebSocket errors
- Only subscribe to Supabase Realtime when user is authenticated
- Anonymous users use polling only (already implemented as fallback)
- Wrap Realtime subscription in try/catch to suppress console errors

---

## 8. Location Search (H2)

- Add `city` field to tenants table + Settings form
- Explore page: city filter dropdown populated from distinct tenant cities
- Filter facilities by selected city

---

## 9. Settings Enhancement (H5)

Settings page adds:
- Auto-approve toggle
- Require payment toggle
- City / Address fields
- Contact phone
- (Court pricing is on the Courts page, not Settings)

---

## Files Affected (estimated)

**New files:**
- `src/lib/paymongo.ts` — PayMongo API client
- `src/lib/sms.ts` — Semaphore SMS client
- `src/app/api/webhooks/paymongo/route.ts` — webhook handler
- `src/app/[slug]/booking-success/page.tsx` — post-payment success page
- `supabase/migrations/012_payments_pricing_settings.sql` — schema migration

**Modified files (~20):**
- Cart context, cart drawer, batch-actions (payment flow)
- Schedule grid, slot cell (auto-scroll, pricing display)
- Court form (price field)
- Settings page + actions (new fields)
- Explore page (city filter)
- 6 currency files ($ → ₱)
- Email templates (add SMS triggers)
- Booking actions (auto-approve logic)
- Owner booking actions (refund on cancel)
