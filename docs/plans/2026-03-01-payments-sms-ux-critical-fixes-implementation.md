# Payments, SMS, Pricing & UX Critical Fixes — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add PayMongo payment integration (GCash/Maya), Semaphore SMS, court pricing, auto-approve, ₱ currency, grid auto-scroll, WebSocket fix, city search, and enhanced settings.

**Architecture:** Hybrid payment model — owners toggle `require_payment` per facility. Platform-wide PayMongo keys. Semaphore SMS alongside existing Resend email. Auto-approve as default booking behavior.

**Tech Stack:** PayMongo REST API, Semaphore REST API, Supabase (migrations + RLS), Next.js server actions, React context

---

## Task 1: Database Migration — Schema Changes

**Files:**
- Create: `supabase/migrations/012_payments_pricing_settings.sql`
- Modify: `src/lib/types/database.ts`

**Step 1: Write and apply the migration**

```sql
-- Courts: add pricing
ALTER TABLE courts ADD COLUMN price_per_hour DECIMAL(10,2) DEFAULT 0;

-- Bookings: add payment tracking
ALTER TABLE bookings ADD COLUMN amount DECIMAL(10,2) DEFAULT 0;
ALTER TABLE bookings ADD COLUMN payment_status TEXT DEFAULT 'unpaid';
ALTER TABLE bookings ADD COLUMN payment_id TEXT;

-- Tenants: add config fields
ALTER TABLE tenants ADD COLUMN require_payment BOOLEAN DEFAULT false;
ALTER TABLE tenants ADD COLUMN auto_approve BOOLEAN DEFAULT true;
ALTER TABLE tenants ADD COLUMN city TEXT;
ALTER TABLE tenants ADD COLUMN address TEXT;
ALTER TABLE tenants ADD COLUMN contact_phone TEXT;

-- Profiles: add phone
ALTER TABLE profiles ADD COLUMN phone TEXT;

-- Payments table
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
  amount DECIMAL(10,2) NOT NULL,
  currency TEXT DEFAULT 'PHP',
  status TEXT DEFAULT 'pending',
  provider TEXT DEFAULT 'paymongo',
  provider_payment_id TEXT,
  provider_checkout_id TEXT,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS for payments
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner can view own tenant payments"
  ON payments FOR SELECT
  USING (tenant_id IN (SELECT id FROM tenants WHERE owner_id = auth.uid()));

CREATE POLICY "Service role can insert payments"
  ON payments FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Service role can update payments"
  ON payments FOR UPDATE
  USING (true);

-- Indexes
CREATE INDEX idx_payments_tenant ON payments(tenant_id);
CREATE INDEX idx_payments_booking ON payments(booking_id);
CREATE INDEX idx_bookings_payment_status ON bookings(payment_status);
```

Apply via: `mcp__supabase__apply_migration` with name `payments_pricing_settings`

**Step 2: Update TypeScript types in `src/lib/types/database.ts`**

Add to `Court` interface:
```ts
price_per_hour: number
```

Add to `Booking` interface:
```ts
amount: number
payment_status: 'unpaid' | 'paid' | 'refunded'
payment_id: string | null
```

Add to `Tenant` interface:
```ts
require_payment: boolean
auto_approve: boolean
city: string | null
address: string | null
contact_phone: string | null
```

Add to `Profile` interface:
```ts
phone: string | null
```

Add new `Payment` interface:
```ts
export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded'

export interface Payment {
  id: string
  tenant_id: string
  booking_id: string | null
  amount: number
  currency: string
  status: PaymentStatus
  provider: string
  provider_payment_id: string | null
  provider_checkout_id: string | null
  paid_at: string | null
  created_at: string
}
```

**Step 3: Commit**
```
feat: add payments, pricing, and settings schema migration
```

---

## Task 2: Currency Change ($ → ₱)

**Files:**
- Modify: `src/app/[slug]/page.tsx` — membership tier price display
- Modify: `src/app/[slug]/my-membership/page.tsx` — membership price
- Modify: `src/app/dashboard/[slug]/members/tiers/page.tsx` — tier price
- Modify: `src/app/dashboard/[slug]/members/tiers/tier-form.tsx` — form label
- Modify: `src/components/analytics/revenue-chart.tsx` — chart axis/tooltip
- Modify: `src/components/analytics/revenue-by-court.tsx` — chart axis

**Step 1: Replace all `$` currency prefixes with `₱` in each file**

Search for patterns: `` `$${`` and `` `$` `` and `"Monthly Price ($)"` and replace with ₱ equivalents.

Specific replacements:
- `src/app/[slug]/page.tsx`: `` `$${tier.price}` `` → `` `₱${tier.price}` ``
- `src/app/[slug]/my-membership/page.tsx`: `` `$${tier.price}` `` → `` `₱${tier.price}` ``
- `src/app/dashboard/[slug]/members/tiers/page.tsx`: `` `$${tier.price}` `` → `` `₱${tier.price}` ``
- `src/app/dashboard/[slug]/members/tiers/tier-form.tsx`: `"Monthly Price ($)"` → `"Monthly Price (₱)"`
- `src/components/analytics/revenue-chart.tsx`: `` `$${v}` `` → `` `₱${v}` `` (2 occurrences)
- `src/components/analytics/revenue-by-court.tsx`: `` `$${v}` `` → `` `₱${v}` ``

**Step 2: Commit**
```
fix: change currency from USD ($) to PHP (₱) across all displays
```

---

## Task 3: PayMongo API Client

**Files:**
- Create: `src/lib/paymongo.ts`

**Step 1: Create PayMongo client**

```ts
const PAYMONGO_SECRET = process.env.PAYMONGO_SECRET_KEY || ''
const PAYMONGO_BASE = 'https://api.paymongo.com/v1'

function headers() {
  return {
    Authorization: `Basic ${Buffer.from(PAYMONGO_SECRET + ':').toString('base64')}`,
    'Content-Type': 'application/json',
    Accept: 'application/json',
  }
}

export async function createCheckoutSession(opts: {
  amount: number         // in PHP (e.g., 150.00)
  description: string
  metadata: Record<string, string>
  successUrl: string
  cancelUrl: string
}): Promise<{ checkoutUrl: string; checkoutId: string }> {
  // PayMongo amounts are in centavos
  const amountInCentavos = Math.round(opts.amount * 100)

  const res = await fetch(`${PAYMONGO_BASE}/checkout_sessions`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({
      data: {
        attributes: {
          send_email_receipt: false,
          show_description: true,
          show_line_items: true,
          description: opts.description,
          line_items: [{
            currency: 'PHP',
            amount: amountInCentavos,
            name: opts.description,
            quantity: 1,
          }],
          payment_method_types: ['gcash', 'paymaya'],
          success_url: opts.successUrl,
          cancel_url: opts.cancelUrl,
          metadata: opts.metadata,
        },
      },
    }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => null)
    throw new Error(`PayMongo error: ${err?.errors?.[0]?.detail || res.statusText}`)
  }

  const json = await res.json()
  return {
    checkoutUrl: json.data.attributes.checkout_url,
    checkoutId: json.data.id,
  }
}

export async function createRefund(paymentId: string, amount: number, reason: string) {
  const amountInCentavos = Math.round(amount * 100)

  const res = await fetch(`${PAYMONGO_BASE}/refunds`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({
      data: {
        attributes: {
          amount: amountInCentavos,
          payment_id: paymentId,
          reason: 'requested_by_customer',
          notes: reason,
        },
      },
    }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => null)
    throw new Error(`PayMongo refund error: ${err?.errors?.[0]?.detail || res.statusText}`)
  }

  return await res.json()
}

export function verifyWebhookSignature(payload: string, sigHeader: string, webhookSecret: string): boolean {
  // PayMongo sends signature as: t=<timestamp>,te=,li=<signature>
  // For now, basic validation — enhance with HMAC in production
  if (!sigHeader || !webhookSecret) return false
  // In production: compute HMAC-SHA256 of `${timestamp}.${payload}` with webhookSecret
  // and compare with the li= value
  return true
}
```

**Step 2: Commit**
```
feat: add PayMongo API client for GCash/Maya checkout and refunds
```

---

## Task 4: Semaphore SMS Client

**Files:**
- Create: `src/lib/sms.ts`

**Step 1: Create SMS client**

```ts
const SEMAPHORE_API_KEY = process.env.SEMAPHORE_API_KEY || ''
const SEMAPHORE_SENDER = process.env.SEMAPHORE_SENDER_NAME || 'CourtFLOW'

export async function sendSMS(to: string, message: string) {
  if (!SEMAPHORE_API_KEY) {
    console.log(`[SMS SKIP] No SEMAPHORE_API_KEY. Would send to ${to}: ${message}`)
    return
  }

  // Normalize PH number: 09xx → +639xx
  const normalized = to.replace(/^0/, '+63').replace(/^\+?63/, '+63')

  try {
    const res = await fetch('https://api.semaphore.co/api/v4/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        apikey: SEMAPHORE_API_KEY,
        number: normalized,
        message,
        sendername: SEMAPHORE_SENDER,
      }),
    })

    if (!res.ok) {
      console.error('[SMS ERROR]', await res.text())
    }
  } catch (error) {
    console.error('[SMS ERROR]', error)
  }
}
```

**Step 2: Commit**
```
feat: add Semaphore SMS client for Philippine notifications
```

---

## Task 5: Auto-Approve Logic + Payment-Aware Booking Flow

**Files:**
- Modify: `src/app/[slug]/courts/[id]/batch-actions.ts` — main checkout flow
- Modify: `src/lib/email-templates.ts` — add confirmed email variant
- Create: `src/app/[slug]/checkout/actions.ts` — PayMongo checkout session creation
- Create: `src/app/api/webhooks/paymongo/route.ts` — webhook handler
- Create: `src/app/[slug]/booking-success/page.tsx` — success page

**Step 1: Modify `batch-actions.ts` to respect auto_approve**

In `createBatchBooking`, after `const tenant = await getTenantBySlug(slug)`:
- Fetch tenant's `auto_approve` and `require_payment` flags
- If `require_payment === true`: return early with `{ requiresPayment: true, items }` so the client can redirect to PayMongo
- If `require_payment === false`: create bookings with `status = tenant.auto_approve ? 'confirmed' : 'pending'`
- Compute `amount` from `court.price_per_hour * duration_hours` and store on each booking
- Send appropriate email template (confirmed vs pending)
- Add SMS notification calls alongside email

Key changes to the insert calls:
```ts
// Replace hardcoded 'pending' with:
status: tenant.auto_approve ? 'confirmed' : 'pending',
amount: computeAmount(court, item.startTime, item.endTime),
payment_status: 'unpaid',
```

Add helper:
```ts
function computeAmount(court: { price_per_hour: number }, start: string, end: string): number {
  const [sh, sm] = start.split(':').map(Number)
  const [eh, em] = end.split(':').map(Number)
  const hours = (eh * 60 + em - sh * 60 - sm) / 60
  return Math.round(court.price_per_hour * hours * 100) / 100
}
```

**Step 2: Create checkout action `src/app/[slug]/checkout/actions.ts`**

Server action that:
1. Authenticates user
2. Fetches tenant (checks `require_payment`)
3. Fetches court prices for all items
4. Computes total amount
5. Stores pending bookings in DB (status='pending', payment_status='pending')
6. Creates PayMongo checkout session with metadata: `{ tenant_id, booking_ids, user_id }`
7. Returns `{ checkoutUrl }` for client redirect

**Step 3: Create webhook handler `src/app/api/webhooks/paymongo/route.ts`**

POST handler that:
1. Reads raw body, verifies signature via `PAYMONGO_WEBHOOK_SECRET`
2. On `checkout_session.payment.paid`:
   - Extracts metadata (booking IDs)
   - Updates bookings: `payment_status = 'paid'`, `payment_id = paymentId`
   - If tenant `auto_approve`: also set `status = 'confirmed'`
   - Creates `payments` record
   - Sends confirmation email + SMS to customer
   - Sends notification email + SMS to owner
3. Returns 200

**Step 4: Create success page `src/app/[slug]/booking-success/page.tsx`**

Simple server component that:
1. Reads `searchParams.session_id`
2. Queries bookings by payment_id matching the session
3. Displays confirmation with booking details
4. Link back to "View my bookings"

**Step 5: Commit**
```
feat: add auto-approve booking logic and PayMongo payment flow
```

---

## Task 6: Cart Pricing — Context + Drawer Updates

**Files:**
- Modify: `src/contexts/booking-cart-context.tsx` — add `price` field to CartItem
- Modify: `src/components/booking/cart-drawer.tsx` — show prices and total, handle payment redirect
- Modify: `src/components/schedule/schedule-grid.tsx` — pass price when adding to cart

**Step 1: Update CartItem in `booking-cart-context.tsx`**

Add to `CartItem` interface:
```ts
price: number  // total price for this slot in PHP
```

Update `addItem` signature: callers now include `price`.

**Step 2: Update `schedule-grid.tsx` `handleAddToCart`**

```ts
function handleAddToCart(courtId: string, start: string, end: string) {
  const court = courts.find((c) => c.id === courtId)
  if (!court) return
  const label = toSlotLabel(start, end)
  const [sh, sm] = start.split(':').map(Number)
  const [eh, em] = end.split(':').map(Number)
  const hours = (eh * 60 + em - sh * 60 - sm) / 60
  const price = Math.round(court.price_per_hour * hours * 100) / 100

  addItem({
    courtId,
    courtName: court.name,
    date: dateStr,
    startTime: start,
    endTime: end,
    recurring,
    totalWeeks: recurring ? totalWeeks : undefined,
    price,
  })
  // ...toast
}
```

**Step 3: Update `cart-drawer.tsx`**

- Show `₱{item.price.toFixed(2)}` next to each item time
- Show total at bottom: `₱{items.reduce((s, i) => s + i.price, 0).toFixed(2)}`
- In `handleConfirm`: if result returns `{ requiresPayment, checkoutUrl }`, redirect to PayMongo instead of showing success toast

**Step 4: Commit**
```
feat: add pricing display to cart items and checkout total
```

---

## Task 7: Court Form — Price Per Hour Field

**Files:**
- Modify: `src/app/dashboard/[slug]/courts/court-form.tsx` — add price input
- Modify: `src/app/dashboard/[slug]/courts/actions.ts` — handle price in create/update

**Step 1: Add price input to court form**

After the booking mode fields, add:
```tsx
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
```

**Step 2: Handle price in actions.ts create/update**

Add `price_per_hour: parseFloat(formData.get('price_per_hour') as string) || 0` to both `createCourt` and `updateCourt` insert/update objects.

**Step 3: Commit**
```
feat: add price per hour field to court form
```

---

## Task 8: Slot Cell — Show Price on Available Slots

**Files:**
- Modify: `src/components/schedule/slot-cell.tsx` — show price
- Modify: `src/lib/schedule-utils.ts` — add price to GridSlot

**Step 1: Add `pricePerHour` to GridSlot interface in `schedule-utils.ts`**

Add `pricePerHour: number` to the GridSlot interface.

In `generateCourtSlots`, pass `court.price_per_hour` into each slot.

**Step 2: Show price in available slot cell**

In the `available` return of `SlotCell`, show price below the time label:
```tsx
<button ...>
  {label}
  {slot.pricePerHour > 0 && (
    <span className="block text-[8px] opacity-70">₱{Math.round(slot.pricePerHour * durationHours)}</span>
  )}
</button>
```

Compute `durationHours` from `slot.start` and `slot.end`.

**Step 3: Commit**
```
feat: show slot price on available cells in schedule grid
```

---

## Task 9: Grid Auto-Scroll to Current Time (H1)

**Files:**
- Modify: `src/components/schedule/schedule-grid.tsx` — add auto-scroll useEffect

**Step 1: Add ref and auto-scroll**

Add `useRef` to the scroll container:
```tsx
const scrollRef = useRef<HTMLDivElement>(null)
```

Add the ref to the `overflow-x-auto` div:
```tsx
<div ref={scrollRef} className="overflow-x-auto" ...>
```

Add `useEffect` after `courtSlots` useMemo:
```tsx
useEffect(() => {
  if (!scrollRef.current || timeColumns.length === 0) return
  const now = new Date()
  const currentMinutes = now.getHours() * 60 + now.getMinutes()
  // Find the index of the first column that hasn't passed yet
  const targetIdx = timeColumns.findIndex((col) => {
    const [h, m] = col.time.split(':').map(Number)
    return h * 60 + m >= currentMinutes
  })
  if (targetIdx > 0) {
    // Scroll to show ~2 columns before current time
    const scrollTarget = Math.max(0, targetIdx - 2)
    const gridEl = scrollRef.current.firstElementChild as HTMLElement
    if (gridEl) {
      const cols = gridEl.children
      // +1 for the court header column
      const targetCol = cols[scrollTarget + 1] as HTMLElement
      if (targetCol) {
        scrollRef.current.scrollLeft = targetCol.offsetLeft - 130 // account for sticky court column
      }
    }
  }
}, [timeColumns])
```

**Step 2: Commit**
```
fix: auto-scroll schedule grid to current time on load
```

---

## Task 10: WebSocket Error Fix (H4)

**Files:**
- Modify: `src/components/schedule/schedule-grid.tsx` — conditional Realtime subscription

**Step 1: Only subscribe to Realtime when authenticated**

Change the Realtime subscription in the `useEffect` (lines 68-112):

```tsx
useEffect(() => {
  fetchBookings()

  let pollTimer: ReturnType<typeof setInterval> | null = null

  // Only attempt Realtime if user is authenticated
  // Anonymous users get polling fallback directly
  if (currentUserId) {
    const supabase = createClient()
    const channel = supabase
      .channel(`bookings:${tenantId}:${dateStr}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'bookings', filter: `tenant_id=eq.${tenantId}` },
        (payload) => {
          const row = payload.new as Booking | undefined
          const oldRow = payload.old as Booking | undefined
          if ((row && row.date === dateStr) || (oldRow && (oldRow as any).date === dateStr)) {
            fetchBookings()
          }
        }
      )
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          if (!pollTimer) pollTimer = setInterval(fetchBookings, 30_000)
        }
        if (status === 'SUBSCRIBED' && pollTimer) {
          clearInterval(pollTimer)
          pollTimer = null
        }
      })

    return () => {
      if (pollTimer) clearInterval(pollTimer)
      supabase.removeChannel(channel)
    }
  } else {
    // Anonymous: polling only
    pollTimer = setInterval(fetchBookings, 30_000)
    return () => { if (pollTimer) clearInterval(pollTimer) }
  }
}, [fetchBookings, tenantId, dateStr, currentUserId])
```

**Step 2: Commit**
```
fix: suppress WebSocket errors for anonymous users, use polling fallback
```

---

## Task 11: Settings Page Enhancement (H5)

**Files:**
- Modify: `src/app/dashboard/[slug]/settings/page.tsx` — add new form fields
- Modify: `src/app/dashboard/[slug]/settings/actions.ts` — handle new fields

**Step 1: Add new fields to settings page**

After the cancellation_hours field, add a new Card section "Booking & Payment":

```tsx
<Card className="max-w-2xl">
  <CardHeader>
    <CardTitle>Booking & Payment</CardTitle>
  </CardHeader>
  <CardContent>
    <form action={handleUpdate} className="space-y-4">
      {/* Auto-approve toggle */}
      <div className="flex items-center justify-between rounded-lg border p-4">
        <div>
          <Label htmlFor="auto_approve">Auto-approve bookings</Label>
          <p className="text-xs text-muted-foreground">
            When enabled, bookings are instantly confirmed without manual approval.
          </p>
        </div>
        <input type="hidden" name="auto_approve" value="false" />
        <input
          type="checkbox"
          id="auto_approve"
          name="auto_approve"
          value="true"
          defaultChecked={tenant.auto_approve ?? true}
          className="h-4 w-4 rounded border-gray-300"
        />
      </div>

      {/* Require payment toggle */}
      <div className="flex items-center justify-between rounded-lg border p-4">
        <div>
          <Label htmlFor="require_payment">Require online payment</Label>
          <p className="text-xs text-muted-foreground">
            Customers must pay via GCash/Maya when booking. Disable for pay-at-venue.
          </p>
        </div>
        <input type="hidden" name="require_payment" value="false" />
        <input
          type="checkbox"
          id="require_payment"
          name="require_payment"
          value="true"
          defaultChecked={tenant.require_payment ?? false}
          className="h-4 w-4 rounded border-gray-300"
        />
      </div>

      {/* City */}
      <div className="space-y-2">
        <Label htmlFor="city">City</Label>
        <Input id="city" name="city" defaultValue={tenant.city || ''} placeholder="e.g. Cebu City" />
      </div>

      {/* Address */}
      <div className="space-y-2">
        <Label htmlFor="address">Address</Label>
        <Input id="address" name="address" defaultValue={tenant.address || ''} placeholder="Full address" />
      </div>

      {/* Contact phone */}
      <div className="space-y-2">
        <Label htmlFor="contact_phone">Contact Phone</Label>
        <Input id="contact_phone" name="contact_phone" defaultValue={tenant.contact_phone || ''} placeholder="09XX XXX XXXX" />
      </div>

      <SubmitButton pendingText="Saving...">
        <span className="font-mono text-xs uppercase tracking-wider">Save Changes</span>
      </SubmitButton>
    </form>
  </CardContent>
</Card>
```

**Step 2: Update `actions.ts` to handle new fields**

```ts
export async function updateTenant(tenantId: string, slug: string, formData: FormData) {
  await requireTenantOwner(slug)
  const supabase = await createClient()

  const cancellationHours = parseInt(formData.get('cancellation_hours') as string, 10)

  const { error } = await supabase
    .from('tenants')
    .update({
      name: formData.get('name') as string,
      description: formData.get('description') as string || null,
      cancellation_hours: isNaN(cancellationHours) ? 24 : cancellationHours,
      auto_approve: formData.get('auto_approve') === 'true',
      require_payment: formData.get('require_payment') === 'true',
      city: formData.get('city') as string || null,
      address: formData.get('address') as string || null,
      contact_phone: formData.get('contact_phone') as string || null,
    })
    .eq('id', tenantId)

  if (error) return { error: error.message }

  revalidatePath(`/dashboard/${slug}/settings`)
  revalidatePath(`/dashboard/${slug}`, 'layout')
  revalidatePath(`/${slug}`)
  return { error: null }
}
```

**Step 3: Commit**
```
feat: enhanced settings with auto-approve, payment toggle, city, phone
```

---

## Task 12: City-Based Location Search on Explore Page (H2)

**Files:**
- Modify: `src/app/(marketing)/explore/page.tsx` — pass city data
- Modify: `src/components/explore/explore-list.tsx` — add city filter dropdown

**Step 1: Update explore page to include city**

In the query, add `city` to the select (it's on the tenants table, already fetched with `*`).

Add `city` to the `TenantCard` type and mapping:
```ts
city: t.city || null,
```

**Step 2: Add city filter to ExploreList**

Add a dropdown at the top of ExploreList:
```tsx
const cities = [...new Set(tenants.map(t => t.city).filter(Boolean))]
const [selectedCity, setSelectedCity] = useState<string | null>(null)
const filtered = selectedCity ? tenants.filter(t => t.city === selectedCity) : tenants
```

Render a filter row:
```tsx
{cities.length > 1 && (
  <div className="mb-6 flex gap-2">
    <button onClick={() => setSelectedCity(null)}
      className={cn('rounded-full border px-3 py-1 text-xs', !selectedCity && 'bg-primary text-primary-foreground')}>
      All Cities
    </button>
    {cities.map(city => (
      <button key={city} onClick={() => setSelectedCity(city)}
        className={cn('rounded-full border px-3 py-1 text-xs', selectedCity === city && 'bg-primary text-primary-foreground')}>
        {city}
      </button>
    ))}
  </div>
)}
```

**Step 3: Commit**
```
feat: add city-based filter to explore facilities page
```

---

## Task 13: SMS Notification Integration Points

**Files:**
- Modify: `src/app/[slug]/courts/[id]/batch-actions.ts` — add SMS on booking
- Modify: `src/app/dashboard/[slug]/bookings/actions.ts` — add SMS on approve/reject/cancel

**Step 1: Add SMS to batch-actions.ts**

After the email send block for customer confirmation:
```ts
import { sendSMS } from '@/lib/sms'

// After sending email...
const profile = await supabase.from('profiles').select('phone').eq('id', user.id).single()
if (profile.data?.phone) {
  const status = tenant.auto_approve ? 'confirmed' : 'pending approval'
  await sendSMS(profile.data.phone,
    `CourtFLOW: Your booking at ${tenant.name} is ${status}. ${successfulResults.length} slot(s) on ${successfulResults[0].date}.`
  )
}
```

After the owner notification email:
```ts
if (tenant.contact_phone) {
  await sendSMS(tenant.contact_phone,
    `CourtFLOW: New booking request from ${customerName} — ${summary}.`
  )
}
```

**Step 2: Add SMS to owner booking actions**

In `approveBooking`, `rejectBooking`, `ownerCancelBooking` — after sending email to customer, also send SMS if phone exists:
```ts
const { data: profile } = await supabase.from('profiles').select('phone').eq('id', booking.customer_id).single()
if (profile?.phone) {
  await sendSMS(profile.phone, `CourtFLOW: Your booking at ${courtName} on ${booking.date} has been [approved/rejected/cancelled].`)
}
```

**Step 3: Commit**
```
feat: add SMS notifications for booking confirmations and owner actions
```

---

## Task 14: Owner Cancel — PayMongo Refund

**Files:**
- Modify: `src/app/dashboard/[slug]/bookings/actions.ts` — refund on cancel paid booking

**Step 1: Add refund logic to `ownerCancelBooking`**

After the status update to 'cancelled', add:
```ts
import { createRefund } from '@/lib/paymongo'

// If booking was paid, process refund
if (booking.payment_status === 'paid' && booking.payment_id) {
  try {
    await createRefund(booking.payment_id, booking.amount, 'Owner cancelled booking')
    await supabase.from('bookings')
      .update({ payment_status: 'refunded' })
      .eq('id', bookingId)
    await supabase.from('payments')
      .update({ status: 'refunded' })
      .eq('booking_id', bookingId)
  } catch (err) {
    console.error('[REFUND ERROR]', err)
    // Don't block cancellation if refund fails — log for manual resolution
  }
}
```

Update the select query to also fetch `amount, payment_status, payment_id`.

**Step 2: Commit**
```
feat: auto-refund via PayMongo when owner cancels paid booking
```

---

## Task 15: Build Verification and Final Commit

**Step 1: Run build**
```
npx next build
```
Expected: Build succeeds with no errors.

**Step 2: Run advisors check**
Check Supabase advisors for security issues on new tables (RLS policies).

**Step 3: Final integration commit if needed**
```
chore: verify build passes with all payment and UX fixes
```

---

## Summary of All Commits (15 tasks)

1. `feat: add payments, pricing, and settings schema migration`
2. `fix: change currency from USD ($) to PHP (₱) across all displays`
3. `feat: add PayMongo API client for GCash/Maya checkout and refunds`
4. `feat: add Semaphore SMS client for Philippine notifications`
5. `feat: add auto-approve booking logic and PayMongo payment flow`
6. `feat: add pricing display to cart items and checkout total`
7. `feat: add price per hour field to court form`
8. `feat: show slot price on available cells in schedule grid`
9. `fix: auto-scroll schedule grid to current time on load`
10. `fix: suppress WebSocket errors for anonymous users, use polling fallback`
11. `feat: enhanced settings with auto-approve, payment toggle, city, phone`
12. `feat: add city-based filter to explore facilities page`
13. `feat: add SMS notifications for booking confirmations and owner actions`
14. `feat: auto-refund via PayMongo when owner cancels paid booking`
15. `chore: verify build passes with all payment and UX fixes`

## Environment Variables Required

```
PAYMONGO_SECRET_KEY=sk_test_...
PAYMONGO_WEBHOOK_SECRET=whsec_...
SEMAPHORE_API_KEY=...
SEMAPHORE_SENDER_NAME=CourtFLOW
```
