# CourtFLOW - SaaS Platform Design

## Overview

CourtFLOW is a multi-tenant SaaS platform where court facility owners can list their courts (basketball, pickleball, volleyball, etc.) and customers can browse and book them. Includes a membership tier system with perks for regulars.

## Tech Stack

- **Framework:** Next.js (App Router)
- **Database & Auth:** Supabase (PostgreSQL + Auth + RLS)
- **UI:** shadcn/ui + Tailwind CSS (Greptile-inspired aesthetic: clean, modern, bold typography)
- **Deployment:** Vercel
- **Multitenancy:** Shared database with `tenant_id` column + Supabase Row-Level Security

## Architecture

Monolithic Next.js app with route groups for separation. Single deployment.

### User Roles

| Role | Description | Access |
|------|-------------|--------|
| Platform Admin | CourtFLOW operator | Global admin panel, manage all tenants |
| Business Owner | Court facility operator | Own dashboard: courts, bookings, members |
| Customer | Player/booker | Browse courts, book slots, manage bookings |

### Auth Flow

- Supabase Auth: email/password + Google OAuth
- Signup with role selection ("List my courts" vs "Book courts")
- Business owners go through onboarding: business name -> slug -> court setup
- Customers can book across multiple businesses with one account

## Data Model

### tenants

| Column | Type | Notes |
|--------|------|-------|
| id | uuid (PK) | |
| name | text | Business name |
| slug | text (unique) | URL-safe identifier |
| logo_url | text | |
| description | text | |
| owner_id | uuid (FK profiles) | |
| created_at | timestamptz | |

### courts

| Column | Type | Notes |
|--------|------|-------|
| id | uuid (PK) | |
| tenant_id | uuid (FK tenants) | RLS enforced |
| name | text | |
| sport_type | text | basketball, pickleball, volleyball, tennis, badminton, other |
| description | text | |
| image_url | text | |
| booking_mode | text | 'fixed_slot' or 'flexible' |
| slot_duration_minutes | int | For fixed_slot mode |
| min_duration_minutes | int | For flexible mode |
| max_duration_minutes | int | For flexible mode |
| operating_hours | jsonb | {mon: {open: "06:00", close: "22:00"}, ...} |
| is_active | boolean | Default true |
| created_at | timestamptz | |

### bookings

| Column | Type | Notes |
|--------|------|-------|
| id | uuid (PK) | |
| tenant_id | uuid (FK tenants) | RLS enforced |
| court_id | uuid (FK courts) | |
| customer_id | uuid (FK profiles) | |
| date | date | |
| start_time | time | |
| end_time | time | |
| status | text | confirmed, cancelled, completed, no_show |
| membership_id | uuid (FK member_subscriptions) | Nullable |
| created_at | timestamptz | |

### waitlist_entries

| Column | Type | Notes |
|--------|------|-------|
| id | uuid (PK) | |
| tenant_id | uuid (FK tenants) | RLS enforced |
| court_id | uuid (FK courts) | |
| customer_id | uuid (FK profiles) | |
| date | date | |
| start_time | time | |
| end_time | time | |
| position | int | Queue order |
| status | text | waiting, notified, confirmed, expired |
| notified_at | timestamptz | |
| expires_at | timestamptz | |
| created_at | timestamptz | |

### membership_tiers

| Column | Type | Notes |
|--------|------|-------|
| id | uuid (PK) | |
| tenant_id | uuid (FK tenants) | RLS enforced |
| name | text | e.g., "Gold Member" |
| description | text | |
| price | decimal | Monthly price (tracked, not charged in MVP) |
| perks | jsonb | {priority_booking, discount_pct, free_hours, waitlist_priority, custom: [...]} |
| is_active | boolean | Default true |
| created_at | timestamptz | |

### member_subscriptions

| Column | Type | Notes |
|--------|------|-------|
| id | uuid (PK) | |
| tenant_id | uuid (FK tenants) | RLS enforced |
| customer_id | uuid (FK profiles) | |
| tier_id | uuid (FK membership_tiers) | |
| status | text | active, expired, cancelled |
| start_date | date | |
| end_date | date | Nullable for ongoing |
| free_hours_remaining | decimal | Tracked balance |
| created_at | timestamptz | |

### profiles

| Column | Type | Notes |
|--------|------|-------|
| id | uuid (PK, FK auth.users) | |
| full_name | text | |
| avatar_url | text | |
| phone | text | |
| role | text | platform_admin, business_owner, customer |
| created_at | timestamptz | |

## Page Structure & Routing

```
app/
├── (marketing)/
│   ├── page.tsx                    -> Landing page
│   ├── pricing/page.tsx            -> SaaS pricing tiers
│   └── about/page.tsx              -> About CourtFLOW
│
├── (auth)/
│   ├── login/page.tsx              -> Login (email + Google)
│   ├── signup/page.tsx             -> Signup with role selection
│   └── onboarding/page.tsx         -> Business setup wizard
│
├── (dashboard)/[slug]/
│   ├── layout.tsx                  -> Dashboard shell (sidebar, topbar)
│   ├── page.tsx                    -> Overview/analytics
│   ├── courts/page.tsx             -> Manage courts (CRUD)
│   ├── courts/[id]/page.tsx        -> Court details & schedule
│   ├── bookings/page.tsx           -> All bookings list + filters
│   ├── members/page.tsx            -> Member list & tiers
│   ├── members/tiers/page.tsx      -> Manage membership tiers
│   └── settings/page.tsx           -> Business settings, profile
│
├── (booking)/[slug]/
│   ├── layout.tsx                  -> Public booking layout (business branding)
│   ├── page.tsx                    -> Business landing (courts list)
│   ├── courts/[id]/page.tsx        -> Court detail + booking calendar
│   └── my-bookings/page.tsx        -> Customer's bookings for this venue
│
└── (admin)/                        -> Platform admin (future phase)
```

## Booking Flow

### Business owner configures a court:
1. Add court: name, sport type, image
2. Set booking mode (fixed slots or flexible duration)
3. Set operating hours per day of the week
4. Court goes live on public page

### Customer books a court:
1. Visits courtflow.com/[slug] -> sees all available courts
2. Clicks a court -> sees weekly calendar view
3. Available slots shown in green, booked in gray
4. Fixed slots: click green slot -> confirm
5. Flexible: click start time -> pick duration -> confirm
6. Logged in -> booking confirmed instantly
7. Not logged in -> prompted to sign up/login -> then confirmed

### Conflict prevention:
- Optimistic UI with server-side validation
- Supabase transaction checks for overlapping bookings before confirming
- Race condition handling: "Sorry, this slot was just booked" with refresh

### Waitlist:
- Full slots show "Join Waitlist" button
- On cancellation, first waitlisted person gets notified
- Configurable confirmation window (e.g., 30 min)
- If no one confirms, slot opens to public
- Members with waitlist_priority perk jump ahead in queue

## Membership Tiers

### Business owner creates tiers:
- Name, description, monthly price (tracked, not charged in MVP)
- Configurable perks: priority booking, discount %, free hours/month, waitlist priority, custom text perks

### Member assignment (MVP):
- Business owner manually adds customers to tiers
- Sets start/end date or ongoing
- Member sees active membership on booking page

### Member experience:
- Perks displayed at booking time
- Waitlist priority automatic when perk enabled
- Free hours balance shown and decremented on booking

## Multitenancy

- Shared PostgreSQL database with `tenant_id` on all tenant-scoped tables
- Supabase Row-Level Security (RLS) policies enforce data isolation
- Path-based routing: courtflow.com/[slug]
- Middleware validates slug and loads tenant context

## Design Aesthetic

Inspired by Greptile.com:
- Clean, modern SaaS look
- Bold sans-serif typography
- Generous whitespace
- Card-based layouts with subtle borders/shadows
- Dark mode capable
- Subtle gradients and accent colors
- shadcn/ui components as the foundation

## Future Phases (Not in MVP)

- Online payments (Stripe integration)
- Recurring bookings
- Full CRM (visit history, spending analytics, automated communications)
- Multi-location support
- Custom domains (e.g., book.joescourts.com)
- Platform admin panel
- Self-service membership purchase
- Email/SMS notifications for waitlist and booking reminders
- Mobile app
