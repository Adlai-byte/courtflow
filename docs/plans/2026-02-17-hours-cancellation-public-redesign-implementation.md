# Phase 3: Operating Hours, Cancellation & Public Redesign — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add court operating hours management, booking cancellation with configurable deadlines, and apply the Greptile design system to all public booking pages.

**Architecture:** Server actions handle all mutations. A new `court_closures` table stores holiday dates. The `tenants` table gains a `cancellation_hours` column. Public pages get the existing cream/green/monospace design system applied.

**Tech Stack:** Next.js 16 App Router, Supabase (RLS, server actions), TypeScript, Tailwind CSS, shadcn/ui

---

### Task 1: Database migration — court_closures table + cancellation_hours column

**Files:**
- Create: `supabase/migrations/004_court_closures_and_cancellation.sql`
- Modify: `src/lib/types/database.ts`

**Step 1: Create the migration file**

Create `supabase/migrations/004_court_closures_and_cancellation.sql`:

```sql
-- Court closure dates (holidays, maintenance, etc.)
CREATE TABLE court_closures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  court_id UUID NOT NULL REFERENCES courts(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(court_id, date)
);

CREATE INDEX idx_court_closures_court_date ON court_closures(court_id, date);

ALTER TABLE court_closures ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant owners can manage court closures"
  ON court_closures FOR ALL
  USING (
    court_id IN (
      SELECT c.id FROM courts c
      JOIN tenants t ON t.id = c.tenant_id
      WHERE t.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    court_id IN (
      SELECT c.id FROM courts c
      JOIN tenants t ON t.id = c.tenant_id
      WHERE t.owner_id = auth.uid()
    )
  );

-- Anyone can read closures (needed for public booking calendar)
CREATE POLICY "Anyone can view court closures"
  ON court_closures FOR SELECT
  USING (true);

-- Cancellation policy on tenants
ALTER TABLE tenants ADD COLUMN cancellation_hours INTEGER DEFAULT 24;
```

**Step 2: Run the migration**

```bash
docker exec -i supabase_db_Mikasa-V3 psql -U postgres -d postgres -f -
```
Pipe the SQL file contents. Or run via `supabase db push` if available.

**Step 3: Add TypeScript types**

Add to `src/lib/types/database.ts`:

```typescript
export interface CourtClosure {
  id: string
  court_id: string
  date: string
  reason: string | null
  created_at: string
}
```

Also add `cancellation_hours` to the `Tenant` interface:

```typescript
export interface Tenant {
  id: string
  name: string
  slug: string
  logo_url: string | null
  description: string | null
  owner_id: string
  cancellation_hours: number
  created_at: string
}
```

**Step 4: Commit**

```bash
git add supabase/migrations/004_court_closures_and_cancellation.sql src/lib/types/database.ts
git commit -m "feat: add court_closures table and cancellation_hours column"
```

---

### Task 2: Operating hours editor — server actions

**Files:**
- Create: `src/app/dashboard/[slug]/courts/[id]/actions.ts`

**Step 1: Create server actions file**

Create `src/app/dashboard/[slug]/courts/[id]/actions.ts`:

```typescript
'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { requireTenantOwner } from '@/lib/tenant'
import type { OperatingHours } from '@/lib/types'

export async function updateOperatingHours(
  courtId: string,
  slug: string,
  hours: OperatingHours
) {
  await requireTenantOwner(slug)
  const supabase = await createClient()

  const { error } = await supabase
    .from('courts')
    .update({ operating_hours: hours })
    .eq('id', courtId)

  if (error) {
    return { error: error.message }
  }

  revalidatePath(`/dashboard/${slug}/courts/${courtId}`)
  return { error: null }
}

export async function addClosure(
  courtId: string,
  slug: string,
  date: string,
  reason: string | null
) {
  await requireTenantOwner(slug)
  const supabase = await createClient()

  const { error } = await supabase
    .from('court_closures')
    .insert({ court_id: courtId, date, reason })

  if (error) {
    return { error: error.message.includes('duplicate') ? 'This date is already closed.' : error.message }
  }

  revalidatePath(`/dashboard/${slug}/courts/${courtId}`)
  return { error: null }
}

export async function removeClosure(
  closureId: string,
  courtId: string,
  slug: string
) {
  await requireTenantOwner(slug)
  const supabase = await createClient()

  const { error } = await supabase
    .from('court_closures')
    .delete()
    .eq('id', closureId)

  if (error) {
    return { error: error.message }
  }

  revalidatePath(`/dashboard/${slug}/courts/${courtId}`)
  return { error: null }
}
```

**Step 2: Commit**

```bash
git add src/app/dashboard/[slug]/courts/[id]/actions.ts
git commit -m "feat: add server actions for operating hours and closures"
```

---

### Task 3: Operating hours editor — dashboard UI

**Files:**
- Modify: `src/app/dashboard/[slug]/courts/[id]/page.tsx` (full rewrite)

**Step 1: Rewrite the court detail page**

Replace the entire content of `src/app/dashboard/[slug]/courts/[id]/page.tsx` with:

```tsx
import { requireTenantOwner } from '@/lib/tenant'
import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import type { Court, CourtClosure } from '@/lib/types'
import { OperatingHoursEditor } from '@/components/dashboard/operating-hours-editor'
import { ClosuresEditor } from '@/components/dashboard/closures-editor'

export default async function CourtDetailPage({
  params,
}: {
  params: Promise<{ slug: string; id: string }>
}) {
  const { slug, id } = await params
  await requireTenantOwner(slug)

  const supabase = await createClient()
  const { data: court } = await supabase
    .from('courts')
    .select('*')
    .eq('id', id)
    .single()

  if (!court) {
    notFound()
  }

  const typedCourt = court as Court

  const { data: closures } = await supabase
    .from('court_closures')
    .select('*')
    .eq('court_id', id)
    .order('date', { ascending: true })

  return (
    <div className="space-y-6">
      <div>
        <span className="section-label block">[ COURT SETTINGS ]</span>
        <h1 className="mt-2 text-2xl font-bold tracking-tight">{typedCourt.name}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {typedCourt.sport_type} · {typedCourt.booking_mode === 'fixed_slot' ? `${typedCourt.slot_duration_minutes}min slots` : 'Flexible duration'}
        </p>
      </div>

      <Card>
        <CardContent className="p-4 md:p-6">
          <span className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
            Operating Hours
          </span>
          <div className="mt-4">
            <OperatingHoursEditor
              courtId={typedCourt.id}
              slug={slug}
              initialHours={typedCourt.operating_hours}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4 md:p-6">
          <span className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
            Closure Dates
          </span>
          <div className="mt-4">
            <ClosuresEditor
              courtId={typedCourt.id}
              slug={slug}
              initialClosures={(closures || []) as CourtClosure[]}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
```

**Step 2: Create OperatingHoursEditor component**

Create `src/components/dashboard/operating-hours-editor.tsx`:

```tsx
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { updateOperatingHours } from '@/app/dashboard/[slug]/courts/[id]/actions'
import type { OperatingHours } from '@/lib/types'

const DAYS = [
  { key: 'mon', label: 'Monday' },
  { key: 'tue', label: 'Tuesday' },
  { key: 'wed', label: 'Wednesday' },
  { key: 'thu', label: 'Thursday' },
  { key: 'fri', label: 'Friday' },
  { key: 'sat', label: 'Saturday' },
  { key: 'sun', label: 'Sunday' },
]

interface Props {
  courtId: string
  slug: string
  initialHours: OperatingHours
}

export function OperatingHoursEditor({ courtId, slug, initialHours }: Props) {
  const [hours, setHours] = useState<OperatingHours>(initialHours)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  function toggleDay(day: string) {
    setHours((prev) => {
      const next = { ...prev }
      if (next[day]) {
        delete next[day]
      } else {
        next[day] = { open: '06:00', close: '22:00' }
      }
      return next
    })
  }

  function updateTime(day: string, field: 'open' | 'close', value: string) {
    setHours((prev) => ({
      ...prev,
      [day]: { ...prev[day], [field]: value },
    }))
  }

  async function handleSave() {
    setSaving(true)
    setMessage(null)
    const result = await updateOperatingHours(courtId, slug, hours)
    if (result.error) {
      setMessage(result.error)
    } else {
      setMessage('Saved!')
      setTimeout(() => setMessage(null), 2000)
    }
    setSaving(false)
  }

  return (
    <div className="space-y-3">
      {DAYS.map(({ key, label }) => {
        const enabled = !!hours[key]
        return (
          <div key={key} className="flex items-center gap-4">
            <Switch checked={enabled} onCheckedChange={() => toggleDay(key)} />
            <span className="w-24 font-mono text-sm">{label}</span>
            {enabled ? (
              <div className="flex items-center gap-2">
                <Input
                  type="time"
                  value={hours[key].open}
                  onChange={(e) => updateTime(key, 'open', e.target.value)}
                  className="w-32 font-mono text-sm"
                />
                <span className="text-xs text-muted-foreground">to</span>
                <Input
                  type="time"
                  value={hours[key].close}
                  onChange={(e) => updateTime(key, 'close', e.target.value)}
                  className="w-32 font-mono text-sm"
                />
              </div>
            ) : (
              <span className="text-sm text-muted-foreground">Closed</span>
            )}
          </div>
        )
      })}
      <div className="flex items-center gap-3 pt-2">
        <Button onClick={handleSave} disabled={saving} size="sm">
          <span className="font-mono text-xs uppercase tracking-wider">
            {saving ? 'Saving...' : 'Save Hours'}
          </span>
        </Button>
        {message && (
          <span className={`text-sm ${message === 'Saved!' ? 'text-primary' : 'text-destructive'}`}>
            {message}
          </span>
        )}
      </div>
    </div>
  )
}
```

**Step 3: Create ClosuresEditor component**

Create `src/components/dashboard/closures-editor.tsx`:

```tsx
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { X } from 'lucide-react'
import { addClosure, removeClosure } from '@/app/dashboard/[slug]/courts/[id]/actions'
import type { CourtClosure } from '@/lib/types'

interface Props {
  courtId: string
  slug: string
  initialClosures: CourtClosure[]
}

export function ClosuresEditor({ courtId, slug, initialClosures }: Props) {
  const [closures, setClosures] = useState<CourtClosure[]>(initialClosures)
  const [date, setDate] = useState('')
  const [reason, setReason] = useState('')
  const [adding, setAdding] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleAdd() {
    if (!date) return
    setAdding(true)
    setError(null)
    const result = await addClosure(courtId, slug, date, reason || null)
    if (result.error) {
      setError(result.error)
    } else {
      setClosures((prev) => [...prev, {
        id: crypto.randomUUID(),
        court_id: courtId,
        date,
        reason: reason || null,
        created_at: new Date().toISOString(),
      }].sort((a, b) => a.date.localeCompare(b.date)))
      setDate('')
      setReason('')
    }
    setAdding(false)
  }

  async function handleRemove(closureId: string) {
    const result = await removeClosure(closureId, courtId, slug)
    if (!result.error) {
      setClosures((prev) => prev.filter((c) => c.id !== closureId))
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-2">
        <div>
          <label className="mb-1 block text-xs text-muted-foreground">Date</label>
          <Input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-40 font-mono text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-muted-foreground">Reason (optional)</label>
          <Input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Holiday, maintenance..."
            className="w-56 text-sm"
          />
        </div>
        <Button onClick={handleAdd} disabled={adding || !date} size="sm">
          <span className="font-mono text-xs uppercase tracking-wider">Add Closure</span>
        </Button>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}

      {closures.length === 0 ? (
        <p className="text-sm text-muted-foreground">No closure dates set.</p>
      ) : (
        <div className="space-y-1">
          {closures.map((closure) => (
            <div key={closure.id} className="flex items-center justify-between rounded border px-3 py-2">
              <div className="flex items-center gap-3">
                <span className="font-mono text-sm">{closure.date}</span>
                {closure.reason && (
                  <span className="text-sm text-muted-foreground">{closure.reason}</span>
                )}
              </div>
              <button onClick={() => handleRemove(closure.id)} className="text-muted-foreground hover:text-destructive">
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
```

**Step 4: Verify build**

```bash
npx next build
```
Expected: Build succeeds.

**Step 5: Commit**

```bash
git add src/app/dashboard/[slug]/courts/[id]/page.tsx src/components/dashboard/operating-hours-editor.tsx src/components/dashboard/closures-editor.tsx
git commit -m "feat: add operating hours editor and closures management UI"
```

---

### Task 4: Booking calendar — closure date support

**Files:**
- Modify: `src/components/booking/booking-calendar.tsx`

**Step 1: Update BookingCalendar to check for closures**

The component needs a new prop `closureDates` (array of date strings). The parent page will fetch closures server-side and pass them down.

In `src/components/booking/booking-calendar.tsx`:

1. Add `closureDates?: string[]` to `BookingCalendarProps`
2. Before rendering slots, check if `dateStr` is in `closureDates`
3. If closed, show "Court closed on this date" instead of slots

Update the interface:
```typescript
interface BookingCalendarProps {
  court: Court
  tenantId: string
  slug: string
  closureDates?: string[]
}
```

Update the component body — after `const slots = getTimeSlots(...)`, add:
```typescript
const isClosed = closureDates?.includes(dateStr) ?? false
```

Update the CardContent to check `isClosed` first:
```tsx
<CardContent>
  {isClosed ? (
    <p className="text-sm text-muted-foreground">Court is closed on this date.</p>
  ) : slots.length === 0 ? (
    <p className="text-sm text-muted-foreground">No slots available for this day.</p>
  ) : (
    // ... existing slots grid
  )}
  // ... existing legend
</CardContent>
```

**Step 2: Update public court booking page to pass closures**

In `src/app/[slug]/courts/[id]/page.tsx`, after fetching the court, fetch closures:

```typescript
const { data: closures } = await supabase
  .from('court_closures')
  .select('date')
  .eq('court_id', id)

const closureDates = (closures || []).map((c: any) => c.date)
```

Pass to the calendar:
```tsx
<BookingCalendar court={typedCourt} tenantId={tenant.id} slug={slug} closureDates={closureDates} />
```

**Step 3: Commit**

```bash
git add src/components/booking/booking-calendar.tsx src/app/[slug]/courts/[id]/page.tsx
git commit -m "feat: support court closure dates in booking calendar"
```

---

### Task 5: Cancellation — settings page update

**Files:**
- Modify: `src/app/dashboard/[slug]/settings/page.tsx`
- Modify: `src/app/dashboard/[slug]/settings/actions.ts`

**Step 1: Add cancellation_hours to settings form**

In `src/app/dashboard/[slug]/settings/page.tsx`, add a new field after the Description textarea:

```tsx
<div className="space-y-2">
  <Label htmlFor="cancellation_hours">Cancellation Window (hours)</Label>
  <p className="text-xs text-muted-foreground">
    Customers can cancel bookings up to this many hours before the start time.
  </p>
  <Input
    id="cancellation_hours"
    name="cancellation_hours"
    type="number"
    min="0"
    max="168"
    defaultValue={tenant.cancellation_hours ?? 24}
    className="w-32 font-mono"
  />
</div>
```

**Step 2: Update the server action**

In `src/app/dashboard/[slug]/settings/actions.ts`, add `cancellation_hours` to the update:

```typescript
const cancellationHours = parseInt(formData.get('cancellation_hours') as string, 10)

const { error } = await supabase
  .from('tenants')
  .update({
    name: formData.get('name') as string,
    description: formData.get('description') as string || null,
    cancellation_hours: isNaN(cancellationHours) ? 24 : cancellationHours,
  })
  .eq('id', tenantId)
```

**Step 3: Commit**

```bash
git add src/app/dashboard/[slug]/settings/page.tsx src/app/dashboard/[slug]/settings/actions.ts
git commit -m "feat: add cancellation window setting to tenant settings"
```

---

### Task 6: Cancellation — customer self-cancel on My Bookings

**Files:**
- Create: `src/app/[slug]/my-bookings/actions.ts`
- Modify: `src/app/[slug]/my-bookings/page.tsx` (full rewrite)

**Step 1: Create cancel booking server action**

Create `src/app/[slug]/my-bookings/actions.ts`:

```typescript
'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function cancelBooking(bookingId: string, slug: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  // Fetch booking + tenant cancellation policy
  const { data: booking } = await supabase
    .from('bookings')
    .select('*, tenants:tenant_id ( cancellation_hours )')
    .eq('id', bookingId)
    .eq('customer_id', user.id)
    .eq('status', 'confirmed')
    .single()

  if (!booking) return { error: 'Booking not found' }

  // Check cancellation deadline
  const cancellationHours = (booking.tenants as any)?.cancellation_hours ?? 24
  const bookingStart = new Date(`${booking.date}T${booking.start_time}`)
  const deadline = new Date(bookingStart.getTime() - cancellationHours * 60 * 60 * 1000)

  if (new Date() > deadline) {
    return { error: `Cancellation deadline has passed (${cancellationHours}h before start)` }
  }

  // Cancel the booking
  const { error } = await supabase
    .from('bookings')
    .update({ status: 'cancelled' })
    .eq('id', bookingId)

  if (error) return { error: error.message }

  // Promote next waitlist entry
  const { data: nextWaitlist } = await supabase
    .from('waitlist_entries')
    .select('id')
    .eq('court_id', booking.court_id)
    .eq('date', booking.date)
    .eq('start_time', booking.start_time)
    .eq('status', 'waiting')
    .order('position', { ascending: true })
    .limit(1)
    .single()

  if (nextWaitlist) {
    await supabase
      .from('waitlist_entries')
      .update({ status: 'notified', notified_at: new Date().toISOString() })
      .eq('id', nextWaitlist.id)
  }

  revalidatePath(`/${slug}/my-bookings`)
  return { error: null }
}
```

**Step 2: Rewrite My Bookings page with cancel button**

This is combined with Task 9 (Greptile styling). For now, add the cancel functionality. The full styled version will be written in Task 9. Just add the import and cancel button logic — the Greptile styling is applied in Task 9.

Add to `src/app/[slug]/my-bookings/page.tsx` after existing imports:
```typescript
import { CancelBookingButton } from '@/components/booking/cancel-booking-button'
```

**Step 3: Create CancelBookingButton component**

Create `src/components/booking/cancel-booking-button.tsx`:

```tsx
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { cancelBooking } from '@/app/[slug]/my-bookings/actions'

interface Props {
  bookingId: string
  slug: string
  bookingDate: string
  bookingStartTime: string
  cancellationHours: number
}

export function CancelBookingButton({ bookingId, slug, bookingDate, bookingStartTime, cancellationHours }: Props) {
  const [cancelling, setCancelling] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const bookingStart = new Date(`${bookingDate}T${bookingStartTime}`)
  const deadline = new Date(bookingStart.getTime() - cancellationHours * 60 * 60 * 1000)
  const isPastDeadline = new Date() > deadline
  const isPast = bookingStart < new Date()

  if (isPast) return null

  async function handleCancel() {
    if (!confirm('Are you sure you want to cancel this booking?')) return
    setCancelling(true)
    setError(null)
    const result = await cancelBooking(bookingId, slug)
    if (result.error) {
      setError(result.error)
    }
    setCancelling(false)
  }

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="ghost"
        size="sm"
        disabled={isPastDeadline || cancelling}
        onClick={handleCancel}
        className="font-mono text-xs text-destructive hover:text-destructive"
        title={isPastDeadline ? `Cancellation deadline passed (${cancellationHours}h before start)` : undefined}
      >
        {cancelling ? 'Cancelling...' : 'Cancel'}
      </Button>
      {error && <span className="text-xs text-destructive">{error}</span>}
    </div>
  )
}
```

**Step 4: Commit**

```bash
git add src/app/[slug]/my-bookings/actions.ts src/components/booking/cancel-booking-button.tsx
git commit -m "feat: add customer self-cancellation with deadline check and waitlist promotion"
```

---

### Task 7: Cancellation — owner cancel on dashboard bookings

**Files:**
- Create: `src/app/dashboard/[slug]/bookings/actions.ts`
- Modify: `src/app/dashboard/[slug]/bookings/page.tsx`

**Step 1: Create owner cancel server action**

Create `src/app/dashboard/[slug]/bookings/actions.ts`:

```typescript
'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { requireTenantOwner } from '@/lib/tenant'

export async function ownerCancelBooking(bookingId: string, slug: string) {
  await requireTenantOwner(slug)
  const supabase = await createClient()

  // Fetch booking for waitlist promotion
  const { data: booking } = await supabase
    .from('bookings')
    .select('court_id, date, start_time')
    .eq('id', bookingId)
    .eq('status', 'confirmed')
    .single()

  if (!booking) return { error: 'Booking not found' }

  const { error } = await supabase
    .from('bookings')
    .update({ status: 'cancelled' })
    .eq('id', bookingId)

  if (error) return { error: error.message }

  // Promote next waitlist entry
  const { data: nextWaitlist } = await supabase
    .from('waitlist_entries')
    .select('id')
    .eq('court_id', booking.court_id)
    .eq('date', booking.date)
    .eq('start_time', booking.start_time)
    .eq('status', 'waiting')
    .order('position', { ascending: true })
    .limit(1)
    .single()

  if (nextWaitlist) {
    await supabase
      .from('waitlist_entries')
      .update({ status: 'notified', notified_at: new Date().toISOString() })
      .eq('id', nextWaitlist.id)
  }

  revalidatePath(`/dashboard/${slug}/bookings`)
  return { error: null }
}
```

**Step 2: Create OwnerCancelButton component**

Create `src/components/dashboard/owner-cancel-button.tsx`:

```tsx
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { ownerCancelBooking } from '@/app/dashboard/[slug]/bookings/actions'

interface Props {
  bookingId: string
  slug: string
}

export function OwnerCancelButton({ bookingId, slug }: Props) {
  const [cancelling, setCancelling] = useState(false)

  async function handleCancel() {
    if (!confirm('Cancel this booking?')) return
    setCancelling(true)
    await ownerCancelBooking(bookingId, slug)
    setCancelling(false)
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      disabled={cancelling}
      onClick={handleCancel}
      className="font-mono text-xs text-destructive hover:text-destructive"
    >
      {cancelling ? '...' : 'Cancel'}
    </Button>
  )
}
```

**Step 3: Add cancel button to dashboard bookings page**

In `src/app/dashboard/[slug]/bookings/page.tsx`:

Add import at top:
```typescript
import { OwnerCancelButton } from '@/components/dashboard/owner-cancel-button'
```

Add a new column header "Actions" after Status in the desktop table `<thead>`:
```tsx
<th className="p-4 font-mono text-xs uppercase tracking-wider text-muted-foreground font-medium">Actions</th>
```

Add a new cell after the status cell in each row (only for confirmed bookings):
```tsx
<td className="p-4">
  {booking.status === 'confirmed' && (
    <OwnerCancelButton bookingId={booking.id} slug={slug} />
  )}
</td>
```

Similarly in the mobile card layout, add the cancel button for confirmed bookings.

**Step 4: Commit**

```bash
git add src/app/dashboard/[slug]/bookings/actions.ts src/components/dashboard/owner-cancel-button.tsx src/app/dashboard/[slug]/bookings/page.tsx
git commit -m "feat: add owner booking cancellation from dashboard"
```

---

### Task 8: Greptile redesign — public layout

**Files:**
- Modify: `src/app/[slug]/layout.tsx`

**Step 1: Restyle the public booking layout**

Replace the entire content of `src/app/[slug]/layout.tsx`:

```tsx
import Link from 'next/link'
import { getTenantBySlug } from '@/lib/tenant'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'

export default async function BookingLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const tenant = await getTenantBySlug(slug)
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let initials = 'U'
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', user.id)
      .single()
    if (profile?.full_name) {
      initials = profile.full_name
        .split(' ')
        .map((n: string) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
          <Link href={`/${slug}`} className="font-mono text-sm font-medium tracking-tight">
            {tenant.name}
          </Link>
          <div className="flex items-center gap-3">
            {user ? (
              <>
                <Link href={`/${slug}/my-bookings`}>
                  <Button variant="ghost" size="sm" className="font-mono text-xs uppercase tracking-wider">
                    My Bookings
                  </Button>
                </Link>
                <Avatar className="h-8 w-8 border border-border">
                  <AvatarFallback className="bg-primary/10 font-mono text-xs text-primary">
                    {initials}
                  </AvatarFallback>
                </Avatar>
              </>
            ) : (
              <Link href={`/login?redirect=/${slug}`}>
                <Button size="sm" className="font-mono text-xs uppercase tracking-wider">
                  Sign in
                </Button>
              </Link>
            )}
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-8">
        {children}
      </main>
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add src/app/[slug]/layout.tsx
git commit -m "feat: apply Greptile design to public booking layout"
```

---

### Task 9: Greptile redesign — tenant page + court cards

**Files:**
- Modify: `src/app/[slug]/page.tsx`

**Step 1: Restyle the tenant page**

Replace the entire content of `src/app/[slug]/page.tsx`:

```tsx
import { getTenantBySlug } from '@/lib/tenant'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import type { Court } from '@/lib/types'

export default async function BusinessPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const tenant = await getTenantBySlug(slug)

  const supabase = await createClient()
  const { data: courts } = await supabase
    .from('courts')
    .select('*')
    .eq('tenant_id', tenant.id)
    .eq('is_active', true)
    .order('name')

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{tenant.name}</h1>
        {tenant.description && (
          <p className="mt-2 text-muted-foreground">{tenant.description}</p>
        )}
      </div>

      <div>
        <span className="section-label block">[ AVAILABLE COURTS ]</span>
        {(!courts || courts.length === 0) ? (
          <p className="mt-4 text-sm text-muted-foreground">No courts available at this time.</p>
        ) : (
          <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {(courts as Court[]).map((court) => (
              <Link key={court.id} href={`/${slug}/courts/${court.id}`}>
                <div className="rounded-lg border border-border bg-card p-4 transition-colors hover:border-primary/30">
                  <h3 className="font-semibold tracking-tight">{court.name}</h3>
                  <div className="mt-2 flex items-center gap-2">
                    <span className="inline-flex rounded border border-border px-2 py-0.5 font-mono text-xs text-muted-foreground">
                      {court.sport_type}
                    </span>
                    <span className="inline-flex rounded border border-border px-2 py-0.5 font-mono text-xs text-muted-foreground">
                      {court.booking_mode === 'fixed_slot'
                        ? `${court.slot_duration_minutes}min slots`
                        : `${court.min_duration_minutes}-${court.max_duration_minutes}min`}
                    </span>
                  </div>
                  {court.description && (
                    <p className="mt-2 text-sm text-muted-foreground line-clamp-2">
                      {court.description}
                    </p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add src/app/[slug]/page.tsx
git commit -m "feat: apply Greptile design to public tenant page"
```

---

### Task 10: Greptile redesign — court booking page

**Files:**
- Modify: `src/app/[slug]/courts/[id]/page.tsx`

**Step 1: Restyle the court booking page**

Replace the entire content of `src/app/[slug]/courts/[id]/page.tsx`:

```tsx
import { getTenantBySlug } from '@/lib/tenant'
import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { BookingCalendar } from '@/components/booking/booking-calendar'
import type { Court } from '@/lib/types'

export default async function CourtBookingPage({
  params,
}: {
  params: Promise<{ slug: string; id: string }>
}) {
  const { slug, id } = await params
  const tenant = await getTenantBySlug(slug)

  const supabase = await createClient()
  const { data: court } = await supabase
    .from('courts')
    .select('*')
    .eq('id', id)
    .eq('is_active', true)
    .single()

  if (!court) {
    notFound()
  }

  const typedCourt = court as Court

  const { data: closures } = await supabase
    .from('court_closures')
    .select('date')
    .eq('court_id', id)

  const closureDates = (closures || []).map((c: any) => c.date)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{typedCourt.name}</h1>
        <div className="mt-2 flex items-center gap-2">
          <span className="inline-flex rounded border border-border px-2 py-0.5 font-mono text-xs text-muted-foreground">
            {typedCourt.sport_type}
          </span>
          <span className="inline-flex rounded border border-border px-2 py-0.5 font-mono text-xs text-muted-foreground">
            {typedCourt.booking_mode === 'fixed_slot'
              ? `${typedCourt.slot_duration_minutes}min slots`
              : `${typedCourt.min_duration_minutes}-${typedCourt.max_duration_minutes}min`}
          </span>
        </div>
        {typedCourt.description && (
          <p className="mt-2 text-sm text-muted-foreground">{typedCourt.description}</p>
        )}
      </div>

      <BookingCalendar court={typedCourt} tenantId={tenant.id} slug={slug} closureDates={closureDates} />
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add src/app/[slug]/courts/[id]/page.tsx
git commit -m "feat: apply Greptile design to court booking page with closure support"
```

---

### Task 11: Greptile redesign — booking calendar + waitlist button styling

**Files:**
- Modify: `src/components/booking/booking-calendar.tsx`
- Modify: `src/components/booking/waitlist-button.tsx`

**Step 1: Apply Greptile styling to booking calendar**

In `src/components/booking/booking-calendar.tsx`, update:

1. CardHeader title: change `"Book a Slot"` to include bracket label styling
2. Date display: add `font-mono` class
3. Slot buttons: add `font-mono text-sm` class
4. Legend: add monospace styling

Replace the CardHeader content:
```tsx
<CardHeader>
  <div className="flex items-center justify-between">
    <span className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
      Book a Slot
    </span>
    <div className="flex items-center gap-2">
      <Button variant="outline" size="icon" onClick={() => navigateDay(-1)}>
        <ChevronLeft className="h-4 w-4" />
      </Button>
      <span className="min-w-[140px] text-center font-mono text-sm font-medium">
        {selectedDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
      </span>
      <Button variant="outline" size="icon" onClick={() => navigateDay(1)}>
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  </div>
</CardHeader>
```

Update slot buttons to include `font-mono`:
```tsx
<Button
  key={slot.start}
  variant="outline"
  size="sm"
  disabled={booking}
  className="font-mono text-sm hover:bg-primary hover:text-primary-foreground"
  onClick={() => handleBook(slot.start, slot.end)}
>
  {slot.start}
</Button>
```

Update legend with font-mono:
```tsx
<div className="mt-4 flex items-center gap-4 font-mono text-xs text-muted-foreground">
  <span className="flex items-center gap-1">
    <div className="h-3 w-3 rounded border border-border" /> Available
  </span>
  <span className="flex items-center gap-1">
    <div className="h-3 w-3 rounded bg-muted" /> Booked
  </span>
</div>
```

**Step 2: Apply Greptile styling to waitlist button**

In `src/components/booking/waitlist-button.tsx`, update both buttons to use `font-mono`:

"On Waitlist" button:
```tsx
<Button variant="secondary" size="sm" disabled className="font-mono text-xs">
  On Waitlist
</Button>
```

"Waitlist" button:
```tsx
<Button
  variant="ghost"
  size="sm"
  disabled={joining}
  onClick={handleJoinWaitlist}
  className="font-mono text-xs opacity-60 hover:opacity-100"
>
  Waitlist
</Button>
```

**Step 3: Commit**

```bash
git add src/components/booking/booking-calendar.tsx src/components/booking/waitlist-button.tsx
git commit -m "feat: apply Greptile monospace styling to booking calendar and waitlist"
```

---

### Task 12: Greptile redesign — My Bookings page with cancel button

**Files:**
- Modify: `src/app/[slug]/my-bookings/page.tsx` (full rewrite)

**Step 1: Rewrite My Bookings with Greptile styling + cancel button**

Replace the entire content of `src/app/[slug]/my-bookings/page.tsx`:

```tsx
import { redirect } from 'next/navigation'
import { getTenantBySlug } from '@/lib/tenant'
import { createClient } from '@/lib/supabase/server'
import { CancelBookingButton } from '@/components/booking/cancel-booking-button'

const statusColors: Record<string, string> = {
  confirmed: 'bg-green/10 text-green border-green/20',
  completed: 'bg-muted text-muted-foreground border-border',
  cancelled: 'bg-destructive/10 text-destructive border-destructive/20',
  no_show: 'bg-amber-100 text-amber-700 border-amber-200',
}

export default async function MyBookingsPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const tenant = await getTenantBySlug(slug)

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect(`/login?redirect=/${slug}/my-bookings`)
  }

  const { data: bookings } = await supabase
    .from('bookings')
    .select('*, courts ( name )')
    .eq('tenant_id', tenant.id)
    .eq('customer_id', user.id)
    .order('date', { ascending: false })
    .order('start_time', { ascending: true })

  const cancellationHours = tenant.cancellation_hours ?? 24

  return (
    <div className="space-y-6">
      <span className="section-label block">[ MY BOOKINGS ]</span>
      <h1 className="text-2xl font-bold tracking-tight">My Bookings</h1>

      <div className="rounded-lg border border-border bg-card">
        {(!bookings || bookings.length === 0) ? (
          <div className="flex items-center justify-center py-12">
            <p className="text-sm text-muted-foreground">You have no bookings yet.</p>
          </div>
        ) : (
          <>
            <div className="hidden md:block">
              <table className="w-full">
                <thead>
                  <tr className="border-b text-left">
                    <th className="p-4 font-mono text-xs uppercase tracking-wider text-muted-foreground font-medium">Date</th>
                    <th className="p-4 font-mono text-xs uppercase tracking-wider text-muted-foreground font-medium">Time</th>
                    <th className="p-4 font-mono text-xs uppercase tracking-wider text-muted-foreground font-medium">Court</th>
                    <th className="p-4 font-mono text-xs uppercase tracking-wider text-muted-foreground font-medium">Status</th>
                    <th className="p-4 font-mono text-xs uppercase tracking-wider text-muted-foreground font-medium"></th>
                  </tr>
                </thead>
                <tbody>
                  {bookings.map((booking: any, i: number) => (
                    <tr key={booking.id} className={i % 2 === 1 ? 'bg-muted/30' : ''}>
                      <td className="p-4 font-mono text-sm">{booking.date}</td>
                      <td className="p-4 font-mono text-sm">{booking.start_time}–{booking.end_time}</td>
                      <td className="p-4 text-sm">{booking.courts?.name}</td>
                      <td className="p-4">
                        <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium ${statusColors[booking.status] || ''}`}>
                          {booking.status}
                        </span>
                      </td>
                      <td className="p-4">
                        {booking.status === 'confirmed' && (
                          <CancelBookingButton
                            bookingId={booking.id}
                            slug={slug}
                            bookingDate={booking.date}
                            bookingStartTime={booking.start_time}
                            cancellationHours={cancellationHours}
                          />
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="space-y-2 p-3 md:hidden">
              {bookings.map((booking: any) => (
                <div key={booking.id} className="rounded-lg border bg-card p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{booking.courts?.name}</span>
                    <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${statusColors[booking.status] || ''}`}>
                      {booking.status}
                    </span>
                  </div>
                  <p className="font-mono text-xs text-muted-foreground">
                    {booking.date} · {booking.start_time}–{booking.end_time}
                  </p>
                  {booking.status === 'confirmed' && (
                    <CancelBookingButton
                      bookingId={booking.id}
                      slug={slug}
                      bookingDate={booking.date}
                      bookingStartTime={booking.start_time}
                      cancellationHours={cancellationHours}
                    />
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add src/app/[slug]/my-bookings/page.tsx
git commit -m "feat: restyle My Bookings with Greptile design and cancel button"
```

---

### Task 13: Build verification

**Step 1: Run the build**

```bash
npx next build
```

Expected: Build succeeds with no errors.

**Step 2: If build fails, fix any TypeScript or import errors**

Common issues:
- Missing imports
- Type mismatches with `cancellation_hours` on Tenant
- Server action import paths

**Step 3: Commit any fixes**

```bash
git add -A
git commit -m "fix: resolve build errors"
```

---
