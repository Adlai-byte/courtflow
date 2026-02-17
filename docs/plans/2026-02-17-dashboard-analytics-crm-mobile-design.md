# CourtFLOW Phase 2: Dashboard Refresh, Analytics, CRM & Mobile

**Date:** 2026-02-17
**Status:** Approved

---

## 1. Dashboard Design Refresh

**Approach:** Greptile-inspired but functional — keep cream/green palette and DM Sans + JetBrains Mono fonts, but use a conventional data-dense dashboard layout.

### Changes

- **Sidebar** — Collapsible on mobile via Sheet component. Monospace nav labels, green active state indicator, tenant logo/name at top. Fixed on desktop (264px).
- **Topbar** — Breadcrumbs with monospace styling, profile dropdown. On mobile: hamburger menu button on the left.
- **Cards** — White cards on cream background with subtle border. `[ BRACKET ]` section labels for card groups (e.g. `[ OVERVIEW ]`, `[ RECENT BOOKINGS ]`).
- **Stats cards** — Icon + metric value + trend indicator (up/down arrow with percentage change).
- **Tables** — Alternating row tints, green status badges, monospace dates/times.
- **Status color coding:**
  - Green: confirmed / active
  - Amber: pending
  - Red: cancelled
  - Muted: expired / inactive

### Files to modify
- `src/components/dashboard/sidebar.tsx` — Collapsible, monospace labels, active indicator
- `src/components/dashboard/topbar.tsx` — Breadcrumbs, mobile hamburger
- `src/app/dashboard/[slug]/page.tsx` — Redesigned overview with bracket labels, styled stats
- `src/app/dashboard/[slug]/courts/page.tsx` — Styled court cards
- `src/app/dashboard/[slug]/bookings/page.tsx` — Styled table
- `src/app/dashboard/[slug]/members/tiers/page.tsx` — Styled tier cards
- `src/app/dashboard/[slug]/settings/page.tsx` — Styled form

---

## 2. Analytics & Reporting

**New page:** `/dashboard/[slug]/analytics`
**Charting library:** Recharts

### Layout

**Time range selector** — Tabs at top: "7 days", "30 days", "90 days" via URL search params.

**Revenue row:**
- Revenue over time (area chart) — daily revenue for selected period
- Revenue by court (horizontal bar chart) — total revenue per court
- KPI cards: Total revenue, avg booking value, membership revenue

**Utilization row:**
- Court utilization rate (bar chart) — % of available slots booked per court
- Peak hours heatmap (grid) — 7-day x hours grid showing booking density
- KPI cards: Overall fill rate, busiest day, idle court hours

**Data source:** Server-side SQL aggregations from `bookings` and `member_subscriptions` tables. No new database tables needed.

### Files to create
- `src/app/dashboard/[slug]/analytics/page.tsx` — Main analytics page
- `src/components/analytics/revenue-chart.tsx` — Area chart (client component)
- `src/components/analytics/revenue-by-court.tsx` — Bar chart (client component)
- `src/components/analytics/utilization-chart.tsx` — Bar chart (client component)
- `src/components/analytics/peak-hours-heatmap.tsx` — Grid heatmap (client component)
- `src/components/analytics/kpi-card.tsx` — Reusable KPI stat card

---

## 3. CRM — Customer Profiles & History

### Customers list page

Rename "Members" nav to "Customers". Show ALL customers who've booked at this tenant, not just subscribers.

**Table columns:** Name, Email, Phone, Total Bookings, Membership Tier (or "None"), Last Visit, Status badge.

### Customer detail page

**New page:** `/dashboard/[slug]/customers/[id]`

**Sections:**
- **Header** — Name, email, phone, avatar, membership badge, "Member since" date
- **Stats row** — Total bookings, total spent, no-show rate, favorite court
- **Booking history table** — Date, court, duration, status, amount
- **Membership info** — Current tier, perks, free hours remaining
- **Notes** — Chronological list of private notes with add form

### Database changes

New table: `customer_notes`
```sql
CREATE TABLE customer_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  note TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID NOT NULL REFERENCES profiles(id)
);
```
With RLS policy: tenant owners can read/write notes for their tenant.

### Files to create/modify
- `src/app/dashboard/[slug]/customers/page.tsx` — Customer list (replaces members page)
- `src/app/dashboard/[slug]/customers/[id]/page.tsx` — Customer detail
- `src/app/dashboard/[slug]/customers/[id]/actions.ts` — Server actions (add note)
- `supabase/migrations/002_customer_notes.sql` — New table + RLS
- Modify sidebar nav: "Members" → "Customers"

---

## 4. Mobile Responsiveness

### Dashboard sidebar
- On screens < 768px (md breakpoint): hide sidebar, show hamburger menu in topbar
- Hamburger opens sidebar as a Sheet (slide-in drawer)
- Desktop: sidebar remains fixed

### Dashboard tables
- On mobile: tables switch to stacked card layout
- Each row becomes a card showing key info vertically
- Implement via responsive utility classes or a ResponsiveTable wrapper

### Stats & charts
- Stats cards: single column on mobile (already partially handled)
- Analytics charts: full-width, stacked vertically
- Heatmap: horizontal scroll on small screens

### Booking calendar
- Already responsive (`grid-cols-3 sm:grid-cols-4 md:grid-cols-6`)
- Verify touch targets are adequate

### Marketing nav
- Already hides nav links on mobile (`hidden md:flex`)
- Add hamburger menu with Sheet for mobile nav

---

## Tech Decisions

- **Recharts** for all charts (area, bar, heatmap grid)
- **Server-side data aggregation** — SQL queries compute analytics, no client-side processing of raw data
- **Search params** for time range selection (server component compatible)
- **Sheet component** (already installed) for mobile sidebar/nav drawers
- **No new auth changes** — all pages use existing `requireTenantOwner()` guard
