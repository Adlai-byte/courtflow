# CourtFLOW Phase 3: Operating Hours, Cancellation & Public Page Redesign

**Date:** 2026-02-17
**Status:** Approved

---

## 1. Court Operating Hours Management

**Location:** Dashboard court detail page `/dashboard/[slug]/courts/[id]`

### Hours Editor

Per-day rows (Mon-Sun), each with:
- Toggle switch (enabled/disabled — disabled = closed that day)
- Open time picker (e.g. 06:00)
- Close time picker (e.g. 22:00)

Pre-filled from the court's existing `operating_hours` JSONB. Save via server action that updates the court record.

### Holiday/Closure Dates

Separate card below the hours editor:
- Date picker + optional reason text input + "Add Closure" button
- List of existing closures with date, reason, and delete button
- Stored in a new `court_closures` table

### Database Changes

New table:
```sql
CREATE TABLE court_closures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  court_id UUID NOT NULL REFERENCES courts(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(court_id, date)
);
```
With RLS: tenant owners can manage closures for their courts.

### Booking Calendar Integration

`getTimeSlots()` in `booking-calendar.tsx` already reads `operating_hours[dayOfWeek]`. Add a check: if the selected date exists in `court_closures`, return empty slots and show "Court closed" message.

### Files to create/modify
- `src/app/dashboard/[slug]/courts/[id]/page.tsx` — Add hours editor + closures UI
- `src/app/dashboard/[slug]/courts/[id]/actions.ts` — Server actions for saving hours + managing closures
- `src/components/booking/booking-calendar.tsx` — Check closures, show "closed" state
- `supabase/migrations/004_court_closures.sql` — New table + RLS

---

## 2. Booking Cancellation

### Cancellation Policy

New field on `tenants` table: `cancellation_hours INTEGER DEFAULT 24` — minimum hours before booking start that self-cancellation is allowed.

Configurable in Settings page (`/dashboard/[slug]/settings`) as a number input.

### Customer Self-Cancellation

On "My Bookings" page (`/[slug]/my-bookings`):
- "Cancel" button on each future confirmed booking
- Button disabled with "Cancellation deadline passed" tooltip if within the window
- Confirmation dialog before cancelling
- Server action: checks deadline, updates status to `cancelled`, promotes next waitlist entry

### Owner Cancellation

On dashboard bookings page (`/dashboard/[slug]/bookings`):
- "Cancel" button on each confirmed booking (no deadline restriction)
- Same server action but skips deadline check for owners

### Waitlist Promotion

When a booking is cancelled:
1. Query `waitlist_entries` for that court + date + time slot with status `waiting`, ordered by position
2. Update the first entry's status to `notified`
3. The notified user can then book the slot (existing flow handles this)

### Database Changes

```sql
ALTER TABLE tenants ADD COLUMN cancellation_hours INTEGER DEFAULT 24;
```

### Files to create/modify
- `src/app/[slug]/my-bookings/page.tsx` — Add cancel button + confirmation
- `src/app/[slug]/my-bookings/actions.ts` — Cancel booking server action with deadline check + waitlist promotion
- `src/app/dashboard/[slug]/bookings/page.tsx` — Add cancel button for owners
- `src/app/dashboard/[slug]/bookings/actions.ts` — Owner cancel action (no deadline)
- `src/app/dashboard/[slug]/settings/page.tsx` — Add cancellation_hours field
- `supabase/migrations/004_court_closures.sql` — Also includes ALTER TABLE for cancellation_hours

---

## 3. Public Booking Pages — Greptile Style Matching

Apply the existing cream/green design system (DM Sans + JetBrains Mono, bracket labels, monospace accents) to all public-facing pages.

### Layout (`/[slug]/layout.tsx`)
- Cream `bg-background`, `border-b border-border` header
- Monospace tenant name with font-mono styling
- Green accent on active nav state
- Proper avatar with initials styling

### Tenant Page (`/[slug]/page.tsx`)
- `[ AVAILABLE COURTS ]` section label
- White `bg-card` court cards on cream background with `border border-border`
- Sport type + slot duration as monospace badges
- Hover effect with `hover:border-primary/30`

### Court Booking Page (`/[slug]/courts/[id]/page.tsx`)
- `[ BOOK A SLOT ]` bracket label on calendar card
- Monospace (`font-mono text-sm`) time slot buttons
- Green hover on available slots (`hover:bg-primary hover:text-primary-foreground`)
- Muted styling for booked slots
- Show operating hours for selected day above slots

### My Bookings Page (`/[slug]/my-bookings/page.tsx`)
- `[ MY BOOKINGS ]` bracket label
- Styled table with alternating row tints (`odd:bg-muted/30`)
- Monospace dates/times
- Status color coding: green (confirmed), red (cancelled), muted (completed/no-show)
- Mobile responsive card layout

### Files to modify
- `src/app/[slug]/layout.tsx` — Greptile header styling
- `src/app/[slug]/page.tsx` — Styled court cards
- `src/app/[slug]/courts/[id]/page.tsx` — Styled court detail + calendar wrapper
- `src/app/[slug]/my-bookings/page.tsx` — Styled bookings table + cancel button
- `src/components/booking/booking-calendar.tsx` — Monospace slots, green hover, legend styling
- `src/components/booking/waitlist-button.tsx` — Match Greptile styling

---

## Tech Decisions

- **Server actions** for all mutations (hours save, closure CRUD, booking cancel)
- **No new auth changes** — existing `requireTenantOwner()` for dashboard, `getUser()` for customer actions
- **Single migration file** (`004_court_closures.sql`) covers both `court_closures` table and `cancellation_hours` column
- **Waitlist promotion** is fire-and-forget on cancel — no email notification yet (that's a future feature)
- **No refund logic** — status change only (payments not implemented)
