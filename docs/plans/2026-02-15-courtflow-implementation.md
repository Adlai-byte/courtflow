# CourtFLOW Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a multi-tenant SaaS court booking platform where business owners list courts and customers book them, with membership tiers and waitlist support.

**Architecture:** Monolithic Next.js App Router app with route groups for marketing, auth, dashboard (business owner), and booking (customer). Supabase handles auth, Postgres DB, and Row-Level Security for tenant isolation. Path-based routing (`/[slug]/...`) for multitenancy.

**Tech Stack:** Next.js 15 (App Router), Supabase (Auth + PostgreSQL + RLS), shadcn/ui, Tailwind CSS v4, TypeScript

**Design Doc:** `docs/plans/2026-02-15-courtflow-design.md`

---

## Task 1: Project Scaffolding

**Files:**
- Create: `package.json`, `next.config.ts`, `tsconfig.json`, `app/layout.tsx`, `app/globals.css`, `components.json`, `.env.local.example`, `.gitignore`

**Step 1: Create Next.js project**

Run:
```bash
cd C:/Users/THEJORJ/Desktop/Saas/CourtFLOW
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --turbopack
```

When prompted about overwriting, accept. This creates the base Next.js project with App Router + Tailwind + TypeScript.

**Step 2: Initialize shadcn/ui**

Run:
```bash
npx shadcn@latest init
```

Select:
- Style: New York
- Base color: Neutral
- CSS variables: Yes

This creates `components.json` and configures path aliases.

**Step 3: Install core shadcn/ui components**

Run:
```bash
npx shadcn@latest add button card input label dialog dropdown-menu separator sheet avatar badge calendar form select tabs table textarea toast sonner
```

**Step 4: Install Supabase packages**

Run:
```bash
npm install @supabase/supabase-js @supabase/ssr
```

**Step 5: Create environment file template**

Create `.env.local.example`:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

**Step 6: Update .gitignore**

Ensure `.env.local` is in `.gitignore` (should be by default from create-next-app).

**Step 7: Verify it runs**

Run:
```bash
npm run dev
```

Expected: App runs at `http://localhost:3000` with default Next.js page.

**Step 8: Commit**

```bash
git add -A
git commit -m "feat: scaffold Next.js project with shadcn/ui and Supabase deps"
```

---

## Task 2: Supabase Project Setup & Database Schema

**Files:**
- Create: `src/lib/supabase/client.ts`, `src/lib/supabase/server.ts`, `src/lib/supabase/middleware.ts`, `supabase/migrations/001_initial_schema.sql`

**Step 1: Create Supabase project**

Go to https://supabase.com/dashboard and create a new project called "courtflow". Copy the URL and anon key into `.env.local`.

**Step 2: Create Supabase browser client utility**

Create `src/lib/supabase/client.ts`:
```typescript
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

**Step 3: Create Supabase server client utility**

Create `src/lib/supabase/server.ts`:
```typescript
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // The `setAll` method is called from a Server Component.
            // This can be ignored if you have middleware refreshing sessions.
          }
        },
      },
    }
  )
}
```

**Step 4: Create Supabase middleware helper**

Create `src/lib/supabase/middleware.ts`:
```typescript
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Refresh session if expired
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return { supabaseResponse, user }
}
```

**Step 5: Write the database migration**

Create `supabase/migrations/001_initial_schema.sql`:
```sql
-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ============================================
-- PROFILES (extends auth.users)
-- ============================================
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  full_name text,
  avatar_url text,
  phone text,
  role text not null default 'customer' check (role in ('platform_admin', 'business_owner', 'customer')),
  created_at timestamptz default now() not null
);

alter table public.profiles enable row level security;

create policy "Users can view their own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, avatar_url, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    coalesce(new.raw_user_meta_data ->> 'avatar_url', ''),
    coalesce(new.raw_user_meta_data ->> 'role', 'customer')
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================
-- TENANTS (businesses)
-- ============================================
create table public.tenants (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  slug text unique not null,
  logo_url text,
  description text,
  owner_id uuid references public.profiles(id) on delete cascade not null,
  created_at timestamptz default now() not null
);

alter table public.tenants enable row level security;

-- Anyone can view tenant public info (for booking pages)
create policy "Tenants are publicly viewable"
  on public.tenants for select
  using (true);

-- Only the owner can insert/update their tenant
create policy "Owners can insert their tenant"
  on public.tenants for insert
  with check (auth.uid() = owner_id);

create policy "Owners can update their tenant"
  on public.tenants for update
  using (auth.uid() = owner_id);

-- ============================================
-- COURTS
-- ============================================
create table public.courts (
  id uuid default uuid_generate_v4() primary key,
  tenant_id uuid references public.tenants(id) on delete cascade not null,
  name text not null,
  sport_type text not null check (sport_type in ('basketball', 'pickleball', 'volleyball', 'tennis', 'badminton', 'other')),
  description text,
  image_url text,
  booking_mode text not null default 'fixed_slot' check (booking_mode in ('fixed_slot', 'flexible')),
  slot_duration_minutes int default 60,
  min_duration_minutes int default 30,
  max_duration_minutes int default 180,
  operating_hours jsonb default '{"mon":{"open":"06:00","close":"22:00"},"tue":{"open":"06:00","close":"22:00"},"wed":{"open":"06:00","close":"22:00"},"thu":{"open":"06:00","close":"22:00"},"fri":{"open":"06:00","close":"22:00"},"sat":{"open":"08:00","close":"22:00"},"sun":{"open":"08:00","close":"20:00"}}'::jsonb,
  is_active boolean default true,
  created_at timestamptz default now() not null
);

alter table public.courts enable row level security;

-- Public can view active courts (for booking pages)
create policy "Active courts are publicly viewable"
  on public.courts for select
  using (is_active = true);

-- Tenant owners can manage their courts
create policy "Owners can insert courts"
  on public.courts for insert
  with check (
    tenant_id in (select id from public.tenants where owner_id = auth.uid())
  );

create policy "Owners can update courts"
  on public.courts for update
  using (
    tenant_id in (select id from public.tenants where owner_id = auth.uid())
  );

create policy "Owners can delete courts"
  on public.courts for delete
  using (
    tenant_id in (select id from public.tenants where owner_id = auth.uid())
  );

-- Owners can also view inactive courts
create policy "Owners can view all their courts"
  on public.courts for select
  using (
    tenant_id in (select id from public.tenants where owner_id = auth.uid())
  );

-- ============================================
-- BOOKINGS
-- ============================================
create table public.bookings (
  id uuid default uuid_generate_v4() primary key,
  tenant_id uuid references public.tenants(id) on delete cascade not null,
  court_id uuid references public.courts(id) on delete cascade not null,
  customer_id uuid references public.profiles(id) on delete cascade not null,
  date date not null,
  start_time time not null,
  end_time time not null,
  status text not null default 'confirmed' check (status in ('confirmed', 'cancelled', 'completed', 'no_show')),
  membership_id uuid references public.member_subscriptions(id) on delete set null,
  created_at timestamptz default now() not null,
  -- Prevent overlapping bookings on same court
  constraint no_past_bookings check (date >= current_date)
);

alter table public.bookings enable row level security;

-- Customers can view their own bookings
create policy "Customers can view their bookings"
  on public.bookings for select
  using (auth.uid() = customer_id);

-- Tenant owners can view all bookings for their tenant
create policy "Owners can view tenant bookings"
  on public.bookings for select
  using (
    tenant_id in (select id from public.tenants where owner_id = auth.uid())
  );

-- Anyone authenticated can view bookings for a court (to see availability)
create policy "Authenticated users can view court availability"
  on public.bookings for select
  using (auth.uid() is not null);

-- Authenticated users can create bookings
create policy "Authenticated users can book"
  on public.bookings for insert
  with check (auth.uid() = customer_id);

-- Customers can cancel their own bookings
create policy "Customers can cancel their bookings"
  on public.bookings for update
  using (auth.uid() = customer_id);

-- Owners can update booking status
create policy "Owners can update booking status"
  on public.bookings for update
  using (
    tenant_id in (select id from public.tenants where owner_id = auth.uid())
  );

-- Prevent overlapping bookings function
create or replace function public.check_booking_overlap()
returns trigger as $$
begin
  if exists (
    select 1 from public.bookings
    where court_id = new.court_id
      and date = new.date
      and status = 'confirmed'
      and id != coalesce(new.id, uuid_generate_v4())
      and (new.start_time, new.end_time) overlaps (start_time, end_time)
  ) then
    raise exception 'This time slot overlaps with an existing booking';
  end if;
  return new;
end;
$$ language plpgsql;

create trigger check_booking_overlap_trigger
  before insert or update on public.bookings
  for each row execute function public.check_booking_overlap();

-- ============================================
-- MEMBERSHIP TIERS
-- ============================================
create table public.membership_tiers (
  id uuid default uuid_generate_v4() primary key,
  tenant_id uuid references public.tenants(id) on delete cascade not null,
  name text not null,
  description text,
  price decimal(10,2) default 0,
  perks jsonb default '{}'::jsonb,
  is_active boolean default true,
  created_at timestamptz default now() not null
);

alter table public.membership_tiers enable row level security;

-- Public can view active tiers
create policy "Active tiers are publicly viewable"
  on public.membership_tiers for select
  using (is_active = true);

-- Owners can manage tiers
create policy "Owners can manage tiers"
  on public.membership_tiers for all
  using (
    tenant_id in (select id from public.tenants where owner_id = auth.uid())
  );

-- ============================================
-- MEMBER SUBSCRIPTIONS
-- ============================================
create table public.member_subscriptions (
  id uuid default uuid_generate_v4() primary key,
  tenant_id uuid references public.tenants(id) on delete cascade not null,
  customer_id uuid references public.profiles(id) on delete cascade not null,
  tier_id uuid references public.membership_tiers(id) on delete cascade not null,
  status text not null default 'active' check (status in ('active', 'expired', 'cancelled')),
  start_date date not null default current_date,
  end_date date,
  free_hours_remaining decimal(5,2) default 0,
  created_at timestamptz default now() not null
);

alter table public.member_subscriptions enable row level security;

-- Customers can view their own subscriptions
create policy "Customers can view their subscriptions"
  on public.member_subscriptions for select
  using (auth.uid() = customer_id);

-- Owners can manage subscriptions for their tenant
create policy "Owners can manage subscriptions"
  on public.member_subscriptions for all
  using (
    tenant_id in (select id from public.tenants where owner_id = auth.uid())
  );

-- ============================================
-- WAITLIST ENTRIES
-- ============================================
create table public.waitlist_entries (
  id uuid default uuid_generate_v4() primary key,
  tenant_id uuid references public.tenants(id) on delete cascade not null,
  court_id uuid references public.courts(id) on delete cascade not null,
  customer_id uuid references public.profiles(id) on delete cascade not null,
  date date not null,
  start_time time not null,
  end_time time not null,
  position int not null default 0,
  status text not null default 'waiting' check (status in ('waiting', 'notified', 'confirmed', 'expired')),
  notified_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz default now() not null
);

alter table public.waitlist_entries enable row level security;

-- Customers can view their own waitlist entries
create policy "Customers can view their waitlist entries"
  on public.waitlist_entries for select
  using (auth.uid() = customer_id);

-- Owners can view waitlist for their tenant
create policy "Owners can view tenant waitlist"
  on public.waitlist_entries for select
  using (
    tenant_id in (select id from public.tenants where owner_id = auth.uid())
  );

-- Authenticated users can join waitlist
create policy "Authenticated users can join waitlist"
  on public.waitlist_entries for insert
  with check (auth.uid() = customer_id);

-- Customers can update their waitlist entries
create policy "Customers can update their waitlist entries"
  on public.waitlist_entries for update
  using (auth.uid() = customer_id);

-- Owners can update waitlist entries
create policy "Owners can update waitlist entries"
  on public.waitlist_entries for update
  using (
    tenant_id in (select id from public.tenants where owner_id = auth.uid())
  );

-- Auto-assign waitlist position
create or replace function public.assign_waitlist_position()
returns trigger as $$
begin
  new.position := coalesce(
    (select max(position) + 1 from public.waitlist_entries
     where court_id = new.court_id
       and date = new.date
       and start_time = new.start_time
       and status = 'waiting'),
    1
  );
  return new;
end;
$$ language plpgsql;

create trigger assign_waitlist_position_trigger
  before insert on public.waitlist_entries
  for each row execute function public.assign_waitlist_position();
```

**Step 6: Run the migration**

Run this SQL in the Supabase SQL Editor (Dashboard > SQL Editor > New Query), paste the contents of `001_initial_schema.sql`, and execute.

**Step 7: Verify tables exist**

In Supabase Dashboard > Table Editor, confirm all 6 tables exist: profiles, tenants, courts, bookings, membership_tiers, member_subscriptions, waitlist_entries.

**Step 8: Commit**

```bash
git add -A
git commit -m "feat: add Supabase client utilities and initial database schema"
```

---

## Task 3: Middleware & Auth Protection

**Files:**
- Create: `src/middleware.ts`
- Modify: `src/lib/supabase/middleware.ts`

**Step 1: Create the Next.js middleware**

Create `src/middleware.ts`:
```typescript
import { type NextRequest, NextResponse } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

export async function middleware(request: NextRequest) {
  const { supabaseResponse, user } = await updateSession(request)
  const { pathname } = request.nextUrl

  // Protected routes: dashboard requires auth + business_owner role
  if (pathname.includes('/dashboard')) {
    if (!user) {
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      url.searchParams.set('redirect', pathname)
      return NextResponse.redirect(url)
    }
  }

  // Protect booking actions (my-bookings) - require auth
  if (pathname.includes('/my-bookings')) {
    if (!user) {
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      url.searchParams.set('redirect', pathname)
      return NextResponse.redirect(url)
    }
  }

  // Redirect logged-in users away from auth pages
  if ((pathname === '/login' || pathname === '/signup') && user) {
    const url = request.nextUrl.clone()
    url.pathname = '/'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
```

**Step 2: Verify middleware works**

Run: `npm run dev`
Navigate to any `/dashboard` route — should redirect to `/login`.

**Step 3: Commit**

```bash
git add src/middleware.ts
git commit -m "feat: add auth middleware with route protection"
```

---

## Task 4: Database Types & Helpers

**Files:**
- Create: `src/lib/types/database.ts`, `src/lib/types/index.ts`

**Step 1: Create TypeScript types for the database**

Create `src/lib/types/database.ts`:
```typescript
export type UserRole = 'platform_admin' | 'business_owner' | 'customer'
export type SportType = 'basketball' | 'pickleball' | 'volleyball' | 'tennis' | 'badminton' | 'other'
export type BookingMode = 'fixed_slot' | 'flexible'
export type BookingStatus = 'confirmed' | 'cancelled' | 'completed' | 'no_show'
export type SubscriptionStatus = 'active' | 'expired' | 'cancelled'
export type WaitlistStatus = 'waiting' | 'notified' | 'confirmed' | 'expired'

export interface Profile {
  id: string
  full_name: string | null
  avatar_url: string | null
  phone: string | null
  role: UserRole
  created_at: string
}

export interface Tenant {
  id: string
  name: string
  slug: string
  logo_url: string | null
  description: string | null
  owner_id: string
  created_at: string
}

export interface OperatingHours {
  [day: string]: { open: string; close: string }
}

export interface Court {
  id: string
  tenant_id: string
  name: string
  sport_type: SportType
  description: string | null
  image_url: string | null
  booking_mode: BookingMode
  slot_duration_minutes: number
  min_duration_minutes: number
  max_duration_minutes: number
  operating_hours: OperatingHours
  is_active: boolean
  created_at: string
}

export interface Booking {
  id: string
  tenant_id: string
  court_id: string
  customer_id: string
  date: string
  start_time: string
  end_time: string
  status: BookingStatus
  membership_id: string | null
  created_at: string
}

export interface MembershipPerks {
  priority_booking?: boolean
  discount_pct?: number
  free_hours?: number
  waitlist_priority?: boolean
  custom?: string[]
}

export interface MembershipTier {
  id: string
  tenant_id: string
  name: string
  description: string | null
  price: number
  perks: MembershipPerks
  is_active: boolean
  created_at: string
}

export interface MemberSubscription {
  id: string
  tenant_id: string
  customer_id: string
  tier_id: string
  status: SubscriptionStatus
  start_date: string
  end_date: string | null
  free_hours_remaining: number
  created_at: string
}

export interface WaitlistEntry {
  id: string
  tenant_id: string
  court_id: string
  customer_id: string
  date: string
  start_time: string
  end_time: string
  position: number
  status: WaitlistStatus
  notified_at: string | null
  expires_at: string | null
  created_at: string
}
```

**Step 2: Create barrel export**

Create `src/lib/types/index.ts`:
```typescript
export * from './database'
```

**Step 3: Commit**

```bash
git add src/lib/types/
git commit -m "feat: add TypeScript types for database entities"
```

---

## Task 5: Auth Pages (Login & Signup)

**Files:**
- Create: `src/app/(auth)/login/page.tsx`, `src/app/(auth)/signup/page.tsx`, `src/app/(auth)/layout.tsx`, `src/app/(auth)/auth-form.tsx`
- Create: `src/app/auth/callback/route.ts` (OAuth callback)

**Step 1: Create the auth layout**

Create `src/app/(auth)/layout.tsx`:
```typescript
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="w-full max-w-md px-4">
        {children}
      </div>
    </div>
  )
}
```

**Step 2: Create the login page**

Create `src/app/(auth)/login/page.tsx`:
```typescript
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string; error?: string }>
}) {
  const params = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    redirect(params.redirect || '/')
  }

  async function login(formData: FormData) {
    'use server'

    const email = formData.get('email') as string
    const password = formData.get('password') as string
    const supabase = await createClient()

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      redirect(`/login?error=${encodeURIComponent(error.message)}`)
    }

    redirect(params.redirect || '/')
  }

  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle className="text-2xl font-bold">Welcome back</CardTitle>
        <CardDescription>Sign in to your CourtFLOW account</CardDescription>
      </CardHeader>
      <CardContent>
        {params.error && (
          <div className="mb-4 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            {params.error}
          </div>
        )}
        <form action={login} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" required placeholder="you@example.com" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input id="password" name="password" type="password" required placeholder="••••••••" />
          </div>
          <Button type="submit" className="w-full">Sign in</Button>
        </form>
        <p className="mt-4 text-center text-sm text-muted-foreground">
          Don&apos;t have an account?{' '}
          <Link href="/signup" className="text-primary underline-offset-4 hover:underline">
            Sign up
          </Link>
        </p>
      </CardContent>
    </Card>
  )
}
```

**Step 3: Create the signup page**

Create `src/app/(auth)/signup/page.tsx`:
```typescript
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const params = await searchParams

  async function signup(formData: FormData) {
    'use server'

    const email = formData.get('email') as string
    const password = formData.get('password') as string
    const fullName = formData.get('full_name') as string
    const role = formData.get('role') as string
    const supabase = await createClient()

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          role: role,
        },
      },
    })

    if (error) {
      redirect(`/signup?error=${encodeURIComponent(error.message)}`)
    }

    // If business owner, redirect to onboarding
    if (role === 'business_owner') {
      redirect('/onboarding')
    }

    redirect('/')
  }

  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle className="text-2xl font-bold">Create an account</CardTitle>
        <CardDescription>Get started with CourtFLOW</CardDescription>
      </CardHeader>
      <CardContent>
        {params.error && (
          <div className="mb-4 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            {params.error}
          </div>
        )}
        <form action={signup} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="full_name">Full Name</Label>
            <Input id="full_name" name="full_name" type="text" required placeholder="John Doe" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" required placeholder="you@example.com" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input id="password" name="password" type="password" required minLength={6} placeholder="••••••••" />
          </div>
          <div className="space-y-2">
            <Label>I want to...</Label>
            <div className="grid grid-cols-2 gap-3">
              <label className="flex cursor-pointer items-center gap-2 rounded-lg border p-3 hover:bg-accent">
                <input type="radio" name="role" value="business_owner" required className="accent-primary" />
                <span className="text-sm font-medium">List my courts</span>
              </label>
              <label className="flex cursor-pointer items-center gap-2 rounded-lg border p-3 hover:bg-accent">
                <input type="radio" name="role" value="customer" required className="accent-primary" />
                <span className="text-sm font-medium">Book courts</span>
              </label>
            </div>
          </div>
          <Button type="submit" className="w-full">Create account</Button>
        </form>
        <p className="mt-4 text-center text-sm text-muted-foreground">
          Already have an account?{' '}
          <Link href="/login" className="text-primary underline-offset-4 hover:underline">
            Sign in
          </Link>
        </p>
      </CardContent>
    </Card>
  )
}
```

**Step 4: Create OAuth callback route**

Create `src/app/auth/callback/route.ts`:
```typescript
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  return NextResponse.redirect(`${origin}/login?error=Could+not+authenticate`)
}
```

**Step 5: Verify auth pages render**

Run: `npm run dev`
Navigate to `/login` and `/signup` — both pages should render with forms.

**Step 6: Commit**

```bash
git add src/app/(auth)/ src/app/auth/
git commit -m "feat: add login, signup, and OAuth callback pages"
```

---

## Task 6: Business Onboarding Flow

**Files:**
- Create: `src/app/(auth)/onboarding/page.tsx`, `src/app/(auth)/onboarding/actions.ts`

**Step 1: Create onboarding server actions**

Create `src/app/(auth)/onboarding/actions.ts`:
```typescript
'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function createBusiness(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const name = formData.get('name') as string
  const slug = (formData.get('slug') as string)
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')

  const description = formData.get('description') as string

  // Check if slug is taken
  const { data: existing } = await supabase
    .from('tenants')
    .select('id')
    .eq('slug', slug)
    .single()

  if (existing) {
    redirect(`/onboarding?error=${encodeURIComponent('This URL is already taken. Choose another.')}`)
  }

  const { error } = await supabase.from('tenants').insert({
    name,
    slug,
    description,
    owner_id: user.id,
  })

  if (error) {
    redirect(`/onboarding?error=${encodeURIComponent(error.message)}`)
  }

  redirect(`/dashboard/${slug}`)
}
```

**Step 2: Create onboarding page**

Create `src/app/(auth)/onboarding/page.tsx`:
```typescript
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { createBusiness } from './actions'

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const params = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // If user already has a tenant, redirect to dashboard
  const { data: tenant } = await supabase
    .from('tenants')
    .select('slug')
    .eq('owner_id', user.id)
    .single()

  if (tenant) {
    redirect(`/dashboard/${tenant.slug}`)
  }

  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle className="text-2xl font-bold">Set up your business</CardTitle>
        <CardDescription>Tell us about your court facility</CardDescription>
      </CardHeader>
      <CardContent>
        {params.error && (
          <div className="mb-4 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            {params.error}
          </div>
        )}
        <form action={createBusiness} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Business Name</Label>
            <Input id="name" name="name" required placeholder="Joe's Courts" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="slug">Your URL</Label>
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <span>courtflow.com/</span>
              <Input
                id="slug"
                name="slug"
                required
                placeholder="joes-courts"
                pattern="[a-z0-9-]+"
                className="flex-1"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description (optional)</Label>
            <Textarea
              id="description"
              name="description"
              placeholder="Premium indoor courts for basketball and pickleball..."
              rows={3}
            />
          </div>
          <Button type="submit" className="w-full">Create Business</Button>
        </form>
      </CardContent>
    </Card>
  )
}
```

**Step 3: Commit**

```bash
git add src/app/(auth)/onboarding/
git commit -m "feat: add business onboarding flow"
```

---

## Task 7: Dashboard Layout & Navigation

**Files:**
- Create: `src/app/(dashboard)/[slug]/layout.tsx`, `src/app/(dashboard)/[slug]/page.tsx`
- Create: `src/components/dashboard/sidebar.tsx`, `src/components/dashboard/topbar.tsx`
- Create: `src/lib/tenant.ts`

**Step 1: Create tenant context helper**

Create `src/lib/tenant.ts`:
```typescript
import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import type { Tenant, Profile } from '@/lib/types'

export async function getTenantBySlug(slug: string): Promise<Tenant> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('tenants')
    .select('*')
    .eq('slug', slug)
    .single()

  if (error || !data) {
    notFound()
  }

  return data as Tenant
}

export async function requireTenantOwner(slug: string): Promise<{ tenant: Tenant; profile: Profile }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const tenant = await getTenantBySlug(slug)

  if (tenant.owner_id !== user.id) {
    redirect('/')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  return { tenant, profile: profile as Profile }
}
```

**Step 2: Create sidebar component**

Create `src/components/dashboard/sidebar.tsx`:
```typescript
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  MapPin,
  CalendarDays,
  Users,
  Crown,
  Settings,
} from 'lucide-react'

const navItems = [
  { label: 'Overview', href: '', icon: LayoutDashboard },
  { label: 'Courts', href: '/courts', icon: MapPin },
  { label: 'Bookings', href: '/bookings', icon: CalendarDays },
  { label: 'Members', href: '/members', icon: Users },
  { label: 'Membership Tiers', href: '/members/tiers', icon: Crown },
  { label: 'Settings', href: '/settings', icon: Settings },
]

export function Sidebar({ slug }: { slug: string }) {
  const pathname = usePathname()
  const basePath = `/dashboard/${slug}`

  return (
    <aside className="flex h-full w-64 flex-col border-r bg-card">
      <div className="flex h-14 items-center border-b px-4">
        <Link href={basePath} className="text-lg font-bold tracking-tight">
          CourtFLOW
        </Link>
      </div>
      <nav className="flex-1 space-y-1 p-3">
        {navItems.map((item) => {
          const href = `${basePath}${item.href}`
          const isActive = item.href === ''
            ? pathname === basePath
            : pathname.startsWith(href)

          return (
            <Link
              key={item.href}
              href={href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}
```

**Step 3: Create topbar component**

Create `src/components/dashboard/topbar.tsx`:
```typescript
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { Profile, Tenant } from '@/lib/types'

export function Topbar({ profile, tenant }: { profile: Profile; tenant: Tenant }) {
  async function signOut() {
    'use server'
    const supabase = await createClient()
    await supabase.auth.signOut()
    redirect('/login')
  }

  const initials = (profile.full_name || 'U')
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  return (
    <header className="flex h-14 items-center justify-between border-b bg-card px-6">
      <h2 className="text-sm font-medium text-muted-foreground">{tenant.name}</h2>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="relative h-8 w-8 rounded-full">
            <Avatar className="h-8 w-8">
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem className="text-xs text-muted-foreground">
            {profile.full_name}
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <form action={signOut}>
              <button type="submit" className="w-full text-left">
                Sign out
              </button>
            </form>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  )
}
```

**Step 4: Create dashboard layout**

Create `src/app/(dashboard)/[slug]/layout.tsx`:
```typescript
import { requireTenantOwner } from '@/lib/tenant'
import { Sidebar } from '@/components/dashboard/sidebar'
import { Topbar } from '@/components/dashboard/topbar'

export default async function DashboardLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const { tenant, profile } = await requireTenantOwner(slug)

  return (
    <div className="flex h-screen">
      <Sidebar slug={slug} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Topbar profile={profile} tenant={tenant} />
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
```

**Step 5: Create dashboard overview page (placeholder)**

Create `src/app/(dashboard)/[slug]/page.tsx`:
```typescript
import { requireTenantOwner } from '@/lib/tenant'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CalendarDays, MapPin, Users } from 'lucide-react'

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const { tenant } = await requireTenantOwner(slug)

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Courts</CardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Today&apos;s Bookings</CardTitle>
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Active Members</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
```

**Step 6: Install lucide-react**

Run: `npm install lucide-react` (may already be installed via shadcn)

**Step 7: Commit**

```bash
git add src/app/(dashboard)/ src/components/dashboard/ src/lib/tenant.ts
git commit -m "feat: add dashboard layout with sidebar, topbar, and overview page"
```

---

## Task 8: Court Management (CRUD)

**Files:**
- Create: `src/app/(dashboard)/[slug]/courts/page.tsx`, `src/app/(dashboard)/[slug]/courts/actions.ts`, `src/app/(dashboard)/[slug]/courts/court-form.tsx`, `src/app/(dashboard)/[slug]/courts/[id]/page.tsx`

**Step 1: Create court server actions**

Create `src/app/(dashboard)/[slug]/courts/actions.ts`:
```typescript
'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import type { BookingMode, SportType } from '@/lib/types'

export async function createCourt(tenantId: string, slug: string, formData: FormData) {
  const supabase = await createClient()

  const { error } = await supabase.from('courts').insert({
    tenant_id: tenantId,
    name: formData.get('name') as string,
    sport_type: formData.get('sport_type') as SportType,
    description: formData.get('description') as string || null,
    booking_mode: formData.get('booking_mode') as BookingMode,
    slot_duration_minutes: parseInt(formData.get('slot_duration_minutes') as string) || 60,
    min_duration_minutes: parseInt(formData.get('min_duration_minutes') as string) || 30,
    max_duration_minutes: parseInt(formData.get('max_duration_minutes') as string) || 180,
  })

  if (error) {
    return { error: error.message }
  }

  revalidatePath(`/dashboard/${slug}/courts`)
  return { error: null }
}

export async function updateCourt(courtId: string, slug: string, formData: FormData) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('courts')
    .update({
      name: formData.get('name') as string,
      sport_type: formData.get('sport_type') as SportType,
      description: formData.get('description') as string || null,
      booking_mode: formData.get('booking_mode') as BookingMode,
      slot_duration_minutes: parseInt(formData.get('slot_duration_minutes') as string) || 60,
      min_duration_minutes: parseInt(formData.get('min_duration_minutes') as string) || 30,
      max_duration_minutes: parseInt(formData.get('max_duration_minutes') as string) || 180,
      is_active: formData.get('is_active') === 'true',
    })
    .eq('id', courtId)

  if (error) {
    return { error: error.message }
  }

  revalidatePath(`/dashboard/${slug}/courts`)
  return { error: null }
}

export async function deleteCourt(courtId: string, slug: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('courts')
    .delete()
    .eq('id', courtId)

  if (error) {
    return { error: error.message }
  }

  revalidatePath(`/dashboard/${slug}/courts`)
  return { error: null }
}
```

**Step 2: Create court form component**

Create `src/app/(dashboard)/[slug]/courts/court-form.tsx`:
```typescript
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { createCourt, updateCourt } from './actions'
import type { Court } from '@/lib/types'

const sportTypes = [
  { value: 'basketball', label: 'Basketball' },
  { value: 'pickleball', label: 'Pickleball' },
  { value: 'volleyball', label: 'Volleyball' },
  { value: 'tennis', label: 'Tennis' },
  { value: 'badminton', label: 'Badminton' },
  { value: 'other', label: 'Other' },
]

interface CourtFormProps {
  tenantId: string
  slug: string
  court?: Court
  onSuccess?: () => void
}

export function CourtForm({ tenantId, slug, court, onSuccess }: CourtFormProps) {
  const [error, setError] = useState<string | null>(null)
  const [bookingMode, setBookingMode] = useState(court?.booking_mode || 'fixed_slot')

  async function handleSubmit(formData: FormData) {
    const result = court
      ? await updateCourt(court.id, slug, formData)
      : await createCourt(tenantId, slug, formData)

    if (result.error) {
      setError(result.error)
    } else {
      onSuccess?.()
    }
  }

  return (
    <form action={handleSubmit} className="space-y-4">
      {error && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
      )}
      <div className="space-y-2">
        <Label htmlFor="name">Court Name</Label>
        <Input id="name" name="name" required defaultValue={court?.name} placeholder="Court 1" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="sport_type">Sport Type</Label>
        <Select name="sport_type" defaultValue={court?.sport_type || 'basketball'}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {sportTypes.map((sport) => (
              <SelectItem key={sport.value} value={sport.value}>
                {sport.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea id="description" name="description" defaultValue={court?.description || ''} placeholder="Indoor full-size court..." rows={2} />
      </div>
      <div className="space-y-2">
        <Label>Booking Mode</Label>
        <Select name="booking_mode" defaultValue={bookingMode} onValueChange={setBookingMode}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="fixed_slot">Fixed Time Slots</SelectItem>
            <SelectItem value="flexible">Flexible Duration</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {bookingMode === 'fixed_slot' ? (
        <div className="space-y-2">
          <Label htmlFor="slot_duration_minutes">Slot Duration (minutes)</Label>
          <Input id="slot_duration_minutes" name="slot_duration_minutes" type="number" defaultValue={court?.slot_duration_minutes || 60} min={15} max={240} step={15} />
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="min_duration_minutes">Min Duration (min)</Label>
            <Input id="min_duration_minutes" name="min_duration_minutes" type="number" defaultValue={court?.min_duration_minutes || 30} min={15} max={240} step={15} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="max_duration_minutes">Max Duration (min)</Label>
            <Input id="max_duration_minutes" name="max_duration_minutes" type="number" defaultValue={court?.max_duration_minutes || 180} min={30} max={480} step={15} />
          </div>
        </div>
      )}
      {court && <input type="hidden" name="is_active" value={String(court.is_active)} />}
      <Button type="submit" className="w-full">
        {court ? 'Update Court' : 'Add Court'}
      </Button>
    </form>
  )
}
```

**Step 3: Create courts list page**

Create `src/app/(dashboard)/[slug]/courts/page.tsx`:
```typescript
import { requireTenantOwner } from '@/lib/tenant'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Plus } from 'lucide-react'
import { CourtForm } from './court-form'
import type { Court } from '@/lib/types'
import Link from 'next/link'

export default async function CourtsPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const { tenant } = await requireTenantOwner(slug)

  const supabase = await createClient()
  const { data: courts } = await supabase
    .from('courts')
    .select('*')
    .eq('tenant_id', tenant.id)
    .order('created_at', { ascending: true })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Courts</h1>
        <Dialog>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Court
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add a new court</DialogTitle>
            </DialogHeader>
            <CourtForm tenantId={tenant.id} slug={slug} />
          </DialogContent>
        </Dialog>
      </div>

      {(!courts || courts.length === 0) ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground">No courts yet. Add your first court to get started.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {(courts as Court[]).map((court) => (
            <Link key={court.id} href={`/dashboard/${slug}/courts/${court.id}`}>
              <Card className="cursor-pointer transition-shadow hover:shadow-md">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{court.name}</CardTitle>
                    <Badge variant={court.is_active ? 'default' : 'secondary'}>
                      {court.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Badge variant="outline">{court.sport_type}</Badge>
                    <Badge variant="outline">
                      {court.booking_mode === 'fixed_slot'
                        ? `${court.slot_duration_minutes}min slots`
                        : `${court.min_duration_minutes}-${court.max_duration_minutes}min`}
                    </Badge>
                  </div>
                  {court.description && (
                    <p className="mt-2 text-sm text-muted-foreground line-clamp-2">
                      {court.description}
                    </p>
                  )}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
```

**Step 4: Create court detail page (placeholder for schedule view)**

Create `src/app/(dashboard)/[slug]/courts/[id]/page.tsx`:
```typescript
import { requireTenantOwner } from '@/lib/tenant'
import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { Court } from '@/lib/types'

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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">{typedCourt.name}</h1>
        <Badge variant={typedCourt.is_active ? 'default' : 'secondary'}>
          {typedCourt.is_active ? 'Active' : 'Inactive'}
        </Badge>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p><span className="font-medium">Sport:</span> {typedCourt.sport_type}</p>
            <p><span className="font-medium">Booking Mode:</span> {typedCourt.booking_mode === 'fixed_slot' ? 'Fixed Slots' : 'Flexible Duration'}</p>
            {typedCourt.booking_mode === 'fixed_slot' ? (
              <p><span className="font-medium">Slot Duration:</span> {typedCourt.slot_duration_minutes} minutes</p>
            ) : (
              <p><span className="font-medium">Duration Range:</span> {typedCourt.min_duration_minutes}-{typedCourt.max_duration_minutes} minutes</p>
            )}
            {typedCourt.description && <p>{typedCourt.description}</p>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Today&apos;s Schedule</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Booking schedule will be displayed here.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
```

**Step 5: Commit**

```bash
git add src/app/(dashboard)/[slug]/courts/
git commit -m "feat: add court management CRUD with form and detail view"
```

---

## Task 9: Bookings Management (Dashboard)

**Files:**
- Create: `src/app/(dashboard)/[slug]/bookings/page.tsx`, `src/app/(dashboard)/[slug]/bookings/actions.ts`

**Step 1: Create booking server actions**

Create `src/app/(dashboard)/[slug]/bookings/actions.ts`:
```typescript
'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function updateBookingStatus(
  bookingId: string,
  status: string,
  slug: string
) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('bookings')
    .update({ status })
    .eq('id', bookingId)

  if (error) {
    return { error: error.message }
  }

  revalidatePath(`/dashboard/${slug}/bookings`)
  return { error: null }
}
```

**Step 2: Create bookings list page**

Create `src/app/(dashboard)/[slug]/bookings/page.tsx`:
```typescript
import { requireTenantOwner } from '@/lib/tenant'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { Booking } from '@/lib/types'

const statusColors: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  confirmed: 'default',
  completed: 'secondary',
  cancelled: 'destructive',
  no_show: 'outline',
}

export default async function BookingsPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const { tenant } = await requireTenantOwner(slug)

  const supabase = await createClient()
  const { data: bookings } = await supabase
    .from('bookings')
    .select(`
      *,
      courts ( name ),
      profiles:customer_id ( full_name )
    `)
    .eq('tenant_id', tenant.id)
    .order('date', { ascending: false })
    .order('start_time', { ascending: true })
    .limit(50)

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Bookings</h1>

      <Card>
        <CardContent className="p-0">
          {(!bookings || bookings.length === 0) ? (
            <div className="flex items-center justify-center py-12">
              <p className="text-muted-foreground">No bookings yet.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead>Court</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bookings.map((booking: any) => (
                  <TableRow key={booking.id}>
                    <TableCell>{booking.date}</TableCell>
                    <TableCell>{booking.start_time} - {booking.end_time}</TableCell>
                    <TableCell>{booking.courts?.name}</TableCell>
                    <TableCell>{booking.profiles?.full_name || 'Unknown'}</TableCell>
                    <TableCell>
                      <Badge variant={statusColors[booking.status] || 'outline'}>
                        {booking.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
```

**Step 3: Commit**

```bash
git add src/app/(dashboard)/[slug]/bookings/
git commit -m "feat: add bookings list page for dashboard"
```

---

## Task 10: Membership Tiers Management (Dashboard)

**Files:**
- Create: `src/app/(dashboard)/[slug]/members/page.tsx`, `src/app/(dashboard)/[slug]/members/tiers/page.tsx`, `src/app/(dashboard)/[slug]/members/tiers/actions.ts`, `src/app/(dashboard)/[slug]/members/tiers/tier-form.tsx`

**Step 1: Create tier server actions**

Create `src/app/(dashboard)/[slug]/members/tiers/actions.ts`:
```typescript
'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function createTier(tenantId: string, slug: string, formData: FormData) {
  const supabase = await createClient()

  const perks = {
    priority_booking: formData.get('priority_booking') === 'true',
    discount_pct: parseInt(formData.get('discount_pct') as string) || 0,
    free_hours: parseInt(formData.get('free_hours') as string) || 0,
    waitlist_priority: formData.get('waitlist_priority') === 'true',
  }

  const { error } = await supabase.from('membership_tiers').insert({
    tenant_id: tenantId,
    name: formData.get('name') as string,
    description: formData.get('description') as string || null,
    price: parseFloat(formData.get('price') as string) || 0,
    perks,
  })

  if (error) {
    return { error: error.message }
  }

  revalidatePath(`/dashboard/${slug}/members/tiers`)
  return { error: null }
}

export async function deleteTier(tierId: string, slug: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('membership_tiers')
    .delete()
    .eq('id', tierId)

  if (error) {
    return { error: error.message }
  }

  revalidatePath(`/dashboard/${slug}/members/tiers`)
  return { error: null }
}
```

**Step 2: Create tier form component**

Create `src/app/(dashboard)/[slug]/members/tiers/tier-form.tsx`:
```typescript
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { createTier } from './actions'

interface TierFormProps {
  tenantId: string
  slug: string
  onSuccess?: () => void
}

export function TierForm({ tenantId, slug, onSuccess }: TierFormProps) {
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(formData: FormData) {
    const result = await createTier(tenantId, slug, formData)
    if (result.error) {
      setError(result.error)
    } else {
      onSuccess?.()
    }
  }

  return (
    <form action={handleSubmit} className="space-y-4">
      {error && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
      )}
      <div className="space-y-2">
        <Label htmlFor="name">Tier Name</Label>
        <Input id="name" name="name" required placeholder="Gold Member" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea id="description" name="description" placeholder="Premium access with exclusive perks..." rows={2} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="price">Monthly Price ($)</Label>
        <Input id="price" name="price" type="number" step="0.01" min="0" defaultValue="0" />
      </div>
      <div className="space-y-3">
        <Label className="text-base font-semibold">Perks</Label>
        <div className="space-y-2">
          <label className="flex items-center gap-2">
            <input type="checkbox" name="priority_booking" value="true" className="accent-primary" />
            <span className="text-sm">Priority Booking</span>
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" name="waitlist_priority" value="true" className="accent-primary" />
            <span className="text-sm">Waitlist Priority</span>
          </label>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="discount_pct">Discount %</Label>
            <Input id="discount_pct" name="discount_pct" type="number" min="0" max="100" defaultValue="0" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="free_hours">Free Hours/Month</Label>
            <Input id="free_hours" name="free_hours" type="number" min="0" defaultValue="0" />
          </div>
        </div>
      </div>
      <Button type="submit" className="w-full">Create Tier</Button>
    </form>
  )
}
```

**Step 3: Create tiers management page**

Create `src/app/(dashboard)/[slug]/members/tiers/page.tsx`:
```typescript
import { requireTenantOwner } from '@/lib/tenant'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Plus } from 'lucide-react'
import { TierForm } from './tier-form'
import type { MembershipTier } from '@/lib/types'

export default async function TiersPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const { tenant } = await requireTenantOwner(slug)

  const supabase = await createClient()
  const { data: tiers } = await supabase
    .from('membership_tiers')
    .select('*')
    .eq('tenant_id', tenant.id)
    .order('price', { ascending: true })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Membership Tiers</h1>
        <Dialog>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Create Tier
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create a membership tier</DialogTitle>
            </DialogHeader>
            <TierForm tenantId={tenant.id} slug={slug} />
          </DialogContent>
        </Dialog>
      </div>

      {(!tiers || tiers.length === 0) ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground">No membership tiers yet.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {(tiers as MembershipTier[]).map((tier) => (
            <Card key={tier.id}>
              <CardHeader>
                <CardTitle className="text-lg">{tier.name}</CardTitle>
                <p className="text-2xl font-bold">${tier.price}<span className="text-sm font-normal text-muted-foreground">/month</span></p>
              </CardHeader>
              <CardContent className="space-y-2">
                {tier.description && <p className="text-sm text-muted-foreground">{tier.description}</p>}
                <div className="flex flex-wrap gap-1">
                  {tier.perks.priority_booking && <Badge>Priority Booking</Badge>}
                  {tier.perks.waitlist_priority && <Badge>Waitlist Priority</Badge>}
                  {tier.perks.discount_pct ? <Badge variant="outline">{tier.perks.discount_pct}% Discount</Badge> : null}
                  {tier.perks.free_hours ? <Badge variant="outline">{tier.perks.free_hours} Free Hrs</Badge> : null}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
```

**Step 4: Create members list page**

Create `src/app/(dashboard)/[slug]/members/page.tsx`:
```typescript
import { requireTenantOwner } from '@/lib/tenant'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

export default async function MembersPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const { tenant } = await requireTenantOwner(slug)

  const supabase = await createClient()
  const { data: subscriptions } = await supabase
    .from('member_subscriptions')
    .select(`
      *,
      profiles:customer_id ( full_name, phone ),
      membership_tiers:tier_id ( name )
    `)
    .eq('tenant_id', tenant.id)
    .order('created_at', { ascending: false })

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Members</h1>

      <Card>
        <CardContent className="p-0">
          {(!subscriptions || subscriptions.length === 0) ? (
            <div className="flex items-center justify-center py-12">
              <p className="text-muted-foreground">No members yet. Assign customers to membership tiers to see them here.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Tier</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Start Date</TableHead>
                  <TableHead>Free Hours Left</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {subscriptions.map((sub: any) => (
                  <TableRow key={sub.id}>
                    <TableCell>{sub.profiles?.full_name || 'Unknown'}</TableCell>
                    <TableCell>{sub.membership_tiers?.name}</TableCell>
                    <TableCell>
                      <Badge variant={sub.status === 'active' ? 'default' : 'secondary'}>
                        {sub.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{sub.start_date}</TableCell>
                    <TableCell>{sub.free_hours_remaining}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
```

**Step 5: Commit**

```bash
git add src/app/(dashboard)/[slug]/members/
git commit -m "feat: add membership tiers management and members list"
```

---

## Task 11: Public Booking Pages

**Files:**
- Create: `src/app/(booking)/[slug]/layout.tsx`, `src/app/(booking)/[slug]/page.tsx`, `src/app/(booking)/[slug]/courts/[id]/page.tsx`, `src/app/(booking)/[slug]/my-bookings/page.tsx`
- Create: `src/components/booking/booking-calendar.tsx`, `src/components/booking/slot-picker.tsx`

**Step 1: Create public booking layout**

Create `src/app/(booking)/[slug]/layout.tsx`:
```typescript
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

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
          <Link href={`/${slug}`} className="text-lg font-bold tracking-tight">
            {tenant.name}
          </Link>
          <div className="flex items-center gap-3">
            {user ? (
              <>
                <Link href={`/${slug}/my-bookings`}>
                  <Button variant="ghost" size="sm">My Bookings</Button>
                </Link>
                <Avatar className="h-8 w-8">
                  <AvatarFallback>U</AvatarFallback>
                </Avatar>
              </>
            ) : (
              <Link href={`/login?redirect=/${slug}`}>
                <Button size="sm">Sign in</Button>
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

**Step 2: Create business public landing page (courts list)**

Create `src/app/(booking)/[slug]/page.tsx`:
```typescript
import { getTenantBySlug } from '@/lib/tenant'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
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
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{tenant.name}</h1>
        {tenant.description && (
          <p className="mt-2 text-muted-foreground">{tenant.description}</p>
        )}
      </div>

      <h2 className="text-xl font-semibold">Available Courts</h2>

      {(!courts || courts.length === 0) ? (
        <p className="text-muted-foreground">No courts available at this time.</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {(courts as Court[]).map((court) => (
            <Link key={court.id} href={`/${slug}/courts/${court.id}`}>
              <Card className="cursor-pointer transition-shadow hover:shadow-md">
                <CardHeader>
                  <CardTitle className="text-lg">{court.name}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{court.sport_type}</Badge>
                    <Badge variant="outline">
                      {court.booking_mode === 'fixed_slot'
                        ? `${court.slot_duration_minutes}min slots`
                        : `${court.min_duration_minutes}-${court.max_duration_minutes}min`}
                    </Badge>
                  </div>
                  {court.description && (
                    <p className="mt-2 text-sm text-muted-foreground line-clamp-2">
                      {court.description}
                    </p>
                  )}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
```

**Step 3: Create booking calendar component**

Create `src/components/booking/booking-calendar.tsx`:
```typescript
'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { Court, Booking, OperatingHours } from '@/lib/types'

interface BookingCalendarProps {
  court: Court
  tenantId: string
  slug: string
}

function getTimeSlots(
  court: Court,
  dayOfWeek: string,
  existingBookings: Booking[]
): { start: string; end: string; available: boolean }[] {
  const hours = court.operating_hours[dayOfWeek]
  if (!hours) return []

  const slots: { start: string; end: string; available: boolean }[] = []
  const [openH, openM] = hours.open.split(':').map(Number)
  const [closeH, closeM] = hours.close.split(':').map(Number)

  const duration = court.booking_mode === 'fixed_slot'
    ? court.slot_duration_minutes
    : court.min_duration_minutes

  let currentMinutes = openH * 60 + openM
  const endMinutes = closeH * 60 + closeM

  while (currentMinutes + duration <= endMinutes) {
    const startH = Math.floor(currentMinutes / 60)
    const startM = currentMinutes % 60
    const endSlotMinutes = currentMinutes + duration
    const endSlotH = Math.floor(endSlotMinutes / 60)
    const endSlotM = endSlotMinutes % 60

    const start = `${String(startH).padStart(2, '0')}:${String(startM).padStart(2, '0')}`
    const end = `${String(endSlotH).padStart(2, '0')}:${String(endSlotM).padStart(2, '0')}`

    const isBooked = existingBookings.some(
      (b) => b.status === 'confirmed' && b.start_time < end + ':00' && b.end_time > start + ':00'
    )

    slots.push({ start, end, available: !isBooked })
    currentMinutes += duration
  }

  return slots
}

const dayNames = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']
const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export function BookingCalendar({ court, tenantId, slug }: BookingCalendarProps) {
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [bookings, setBookings] = useState<Booking[]>([])
  const [booking, setBooking] = useState(false)

  const dateStr = selectedDate.toISOString().split('T')[0]
  const dayOfWeek = dayNames[selectedDate.getDay()]

  useEffect(() => {
    async function fetchBookings() {
      const supabase = createClient()
      const { data } = await supabase
        .from('bookings')
        .select('*')
        .eq('court_id', court.id)
        .eq('date', dateStr)
        .eq('status', 'confirmed')

      setBookings((data || []) as Booking[])
    }
    fetchBookings()
  }, [court.id, dateStr])

  const slots = getTimeSlots(court, dayOfWeek, bookings)

  async function handleBook(start: string, end: string) {
    setBooking(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      window.location.href = `/login?redirect=/${slug}/courts/${court.id}`
      return
    }

    const { error } = await supabase.from('bookings').insert({
      tenant_id: tenantId,
      court_id: court.id,
      customer_id: user.id,
      date: dateStr,
      start_time: start,
      end_time: end,
    })

    if (error) {
      alert(error.message.includes('overlaps')
        ? 'Sorry, this slot was just booked. Please try another.'
        : error.message
      )
    } else {
      // Refresh bookings
      const { data } = await supabase
        .from('bookings')
        .select('*')
        .eq('court_id', court.id)
        .eq('date', dateStr)
        .eq('status', 'confirmed')
      setBookings((data || []) as Booking[])
    }
    setBooking(false)
  }

  function navigateDay(offset: number) {
    const newDate = new Date(selectedDate)
    newDate.setDate(newDate.getDate() + offset)
    if (newDate >= new Date(new Date().toDateString())) {
      setSelectedDate(newDate)
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Book a Slot</CardTitle>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={() => navigateDay(-1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="min-w-[140px] text-center text-sm font-medium">
              {selectedDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
            </span>
            <Button variant="outline" size="icon" onClick={() => navigateDay(1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {slots.length === 0 ? (
          <p className="text-sm text-muted-foreground">No slots available for this day.</p>
        ) : (
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6">
            {slots.map((slot) => (
              <Button
                key={slot.start}
                variant={slot.available ? 'outline' : 'ghost'}
                size="sm"
                disabled={!slot.available || booking}
                className={slot.available ? 'hover:bg-primary hover:text-primary-foreground' : 'opacity-40 line-through'}
                onClick={() => handleBook(slot.start, slot.end)}
              >
                {slot.start}
              </Button>
            ))}
          </div>
        )}
        <div className="mt-4 flex items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <div className="h-3 w-3 rounded border" /> Available
          </span>
          <span className="flex items-center gap-1">
            <div className="h-3 w-3 rounded bg-muted" /> Booked
          </span>
        </div>
      </CardContent>
    </Card>
  )
}
```

**Step 4: Create court booking page**

Create `src/app/(booking)/[slug]/courts/[id]/page.tsx`:
```typescript
import { getTenantBySlug } from '@/lib/tenant'
import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{typedCourt.name}</h1>
        <div className="mt-2 flex items-center gap-2">
          <Badge variant="outline">{typedCourt.sport_type}</Badge>
          <Badge variant="outline">
            {typedCourt.booking_mode === 'fixed_slot'
              ? `${typedCourt.slot_duration_minutes}min slots`
              : `${typedCourt.min_duration_minutes}-${typedCourt.max_duration_minutes}min`}
          </Badge>
        </div>
        {typedCourt.description && (
          <p className="mt-2 text-muted-foreground">{typedCourt.description}</p>
        )}
      </div>

      <BookingCalendar court={typedCourt} tenantId={tenant.id} slug={slug} />
    </div>
  )
}
```

**Step 5: Create my-bookings page**

Create `src/app/(booking)/[slug]/my-bookings/page.tsx`:
```typescript
import { redirect } from 'next/navigation'
import { getTenantBySlug } from '@/lib/tenant'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

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
    .select(`
      *,
      courts ( name )
    `)
    .eq('tenant_id', tenant.id)
    .eq('customer_id', user.id)
    .order('date', { ascending: false })
    .order('start_time', { ascending: true })

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">My Bookings</h1>

      <Card>
        <CardContent className="p-0">
          {(!bookings || bookings.length === 0) ? (
            <div className="flex items-center justify-center py-12">
              <p className="text-muted-foreground">You have no bookings yet.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead>Court</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bookings.map((booking: any) => (
                  <TableRow key={booking.id}>
                    <TableCell>{booking.date}</TableCell>
                    <TableCell>{booking.start_time} - {booking.end_time}</TableCell>
                    <TableCell>{booking.courts?.name}</TableCell>
                    <TableCell>
                      <Badge variant={booking.status === 'confirmed' ? 'default' : 'secondary'}>
                        {booking.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
```

**Step 6: Commit**

```bash
git add src/app/(booking)/ src/components/booking/
git commit -m "feat: add public booking pages with calendar and slot picker"
```

---

## Task 12: Waitlist System

**Files:**
- Create: `src/components/booking/waitlist-button.tsx`
- Modify: `src/components/booking/booking-calendar.tsx` (add waitlist integration)
- Create: `src/app/api/waitlist/notify/route.ts`

**Step 1: Create waitlist button component**

Create `src/components/booking/waitlist-button.tsx`:
```typescript
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'

interface WaitlistButtonProps {
  courtId: string
  tenantId: string
  date: string
  startTime: string
  endTime: string
  slug: string
}

export function WaitlistButton({ courtId, tenantId, date, startTime, endTime, slug }: WaitlistButtonProps) {
  const [joining, setJoining] = useState(false)
  const [joined, setJoined] = useState(false)

  async function handleJoinWaitlist() {
    setJoining(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      window.location.href = `/login?redirect=/${slug}/courts/${courtId}`
      return
    }

    const { error } = await supabase.from('waitlist_entries').insert({
      tenant_id: tenantId,
      court_id: courtId,
      customer_id: user.id,
      date,
      start_time: startTime,
      end_time: endTime,
    })

    if (error) {
      alert(error.message)
    } else {
      setJoined(true)
    }
    setJoining(false)
  }

  if (joined) {
    return (
      <Button variant="secondary" size="sm" disabled className="text-xs">
        On Waitlist
      </Button>
    )
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      disabled={joining}
      onClick={handleJoinWaitlist}
      className="text-xs opacity-60 hover:opacity-100"
    >
      Waitlist
    </Button>
  )
}
```

**Step 2: Update booking calendar to show waitlist option for booked slots**

In `src/components/booking/booking-calendar.tsx`, update the slot rendering to include the WaitlistButton for booked slots. Replace the slots grid section with:

```typescript
// Add import at top:
import { WaitlistButton } from './waitlist-button'

// Replace the slots grid in the return:
<div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6">
  {slots.map((slot) =>
    slot.available ? (
      <Button
        key={slot.start}
        variant="outline"
        size="sm"
        disabled={booking}
        className="hover:bg-primary hover:text-primary-foreground"
        onClick={() => handleBook(slot.start, slot.end)}
      >
        {slot.start}
      </Button>
    ) : (
      <WaitlistButton
        key={slot.start}
        courtId={court.id}
        tenantId={tenantId}
        date={dateStr}
        startTime={slot.start}
        endTime={slot.end}
        slug={slug}
      />
    )
  )}
</div>
```

**Step 3: Commit**

```bash
git add src/components/booking/
git commit -m "feat: add waitlist system for booked slots"
```

---

## Task 13: Landing Page

**Files:**
- Create: `src/app/(marketing)/page.tsx`, `src/app/(marketing)/layout.tsx`

**Step 1: Create marketing layout**

Create `src/app/(marketing)/layout.tsx`:
```typescript
import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <Link href="/" className="text-xl font-bold tracking-tight">
            CourtFLOW
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/login">
              <Button variant="ghost" size="sm">Sign in</Button>
            </Link>
            <Link href="/signup">
              <Button size="sm">Get Started</Button>
            </Link>
          </div>
        </div>
      </header>
      {children}
    </div>
  )
}
```

**Step 2: Create landing page**

Create `src/app/(marketing)/page.tsx`:
```typescript
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CalendarDays, MapPin, Users, Clock, Shield, Zap } from 'lucide-react'

const features = [
  {
    icon: MapPin,
    title: 'Multi-Court Management',
    description: 'Add and manage basketball, pickleball, volleyball, tennis courts and more from one dashboard.',
  },
  {
    icon: CalendarDays,
    title: 'Smart Booking',
    description: 'Fixed time slots or flexible duration — configure each court to match how your facility operates.',
  },
  {
    icon: Users,
    title: 'Membership Tiers',
    description: 'Create membership levels with perks like priority booking, discounts, and free hours.',
  },
  {
    icon: Clock,
    title: 'Waitlist',
    description: 'When slots fill up, customers can join a waitlist and get notified when a spot opens.',
  },
  {
    icon: Shield,
    title: 'Conflict-Free Booking',
    description: 'Server-side validation prevents double bookings. No more scheduling headaches.',
  },
  {
    icon: Zap,
    title: 'Instant Setup',
    description: 'Create your business, add courts, and start accepting bookings in minutes.',
  },
]

export default function HomePage() {
  return (
    <main>
      {/* Hero */}
      <section className="mx-auto max-w-6xl px-4 py-24 text-center">
        <h1 className="text-5xl font-bold tracking-tight sm:text-6xl">
          Court booking,
          <br />
          <span className="text-primary">simplified.</span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
          The all-in-one platform for court facility owners. Manage your courts, accept bookings, and build a loyal membership base — all from one place.
        </p>
        <div className="mt-8 flex items-center justify-center gap-4">
          <Link href="/signup">
            <Button size="lg" className="text-base">
              Start for free
            </Button>
          </Link>
          <Link href="/signup">
            <Button size="lg" variant="outline" className="text-base">
              See how it works
            </Button>
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-6xl px-4 pb-24">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <Card key={feature.title}>
              <CardHeader>
                <feature.icon className="h-8 w-8 text-primary" />
                <CardTitle className="mt-2">{feature.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{feature.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="border-t bg-muted/30">
        <div className="mx-auto max-w-6xl px-4 py-16 text-center">
          <h2 className="text-3xl font-bold tracking-tight">Ready to streamline your court bookings?</h2>
          <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
            Join court facility owners who are saving hours every week with CourtFLOW.
          </p>
          <Link href="/signup">
            <Button size="lg" className="mt-6">
              Get started — it&apos;s free
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8">
        <div className="mx-auto max-w-6xl px-4 text-center text-sm text-muted-foreground">
          &copy; {new Date().getFullYear()} CourtFLOW. All rights reserved.
        </div>
      </footer>
    </main>
  )
}
```

**Step 3: Update root layout**

Ensure `src/app/layout.tsx` has proper metadata and the Toaster for notifications. Update the metadata:

```typescript
export const metadata: Metadata = {
  title: 'CourtFLOW - Court Booking Made Simple',
  description: 'The all-in-one platform for court facility owners to manage bookings and memberships.',
}
```

**Step 4: Commit**

```bash
git add src/app/(marketing)/
git commit -m "feat: add marketing landing page with features and CTA"
```

---

## Task 14: Dashboard Settings Page

**Files:**
- Create: `src/app/(dashboard)/[slug]/settings/page.tsx`, `src/app/(dashboard)/[slug]/settings/actions.ts`

**Step 1: Create settings actions**

Create `src/app/(dashboard)/[slug]/settings/actions.ts`:
```typescript
'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function updateTenant(tenantId: string, slug: string, formData: FormData) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('tenants')
    .update({
      name: formData.get('name') as string,
      description: formData.get('description') as string || null,
    })
    .eq('id', tenantId)

  if (error) {
    return { error: error.message }
  }

  revalidatePath(`/dashboard/${slug}/settings`)
  return { error: null }
}
```

**Step 2: Create settings page**

Create `src/app/(dashboard)/[slug]/settings/page.tsx`:
```typescript
import { requireTenantOwner } from '@/lib/tenant'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { updateTenant } from './actions'

export default async function SettingsPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const { tenant } = await requireTenantOwner(slug)

  async function handleUpdate(formData: FormData) {
    'use server'
    await updateTenant(tenant.id, slug, formData)
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Settings</h1>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Business Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={handleUpdate} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Business Name</Label>
              <Input id="name" name="name" defaultValue={tenant.name} required />
            </div>
            <div className="space-y-2">
              <Label>URL</Label>
              <p className="text-sm text-muted-foreground">courtflow.com/{tenant.slug}</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" name="description" defaultValue={tenant.description || ''} rows={3} />
            </div>
            <Button type="submit">Save Changes</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
```

**Step 3: Commit**

```bash
git add src/app/(dashboard)/[slug]/settings/
git commit -m "feat: add business settings page"
```

---

## Task 15: Dashboard Overview with Real Data

**Files:**
- Modify: `src/app/(dashboard)/[slug]/page.tsx`

**Step 1: Update dashboard overview with real counts**

Replace the dashboard overview page to fetch actual counts from the database:

```typescript
import { requireTenantOwner } from '@/lib/tenant'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CalendarDays, MapPin, Users, Clock } from 'lucide-react'

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const { tenant } = await requireTenantOwner(slug)

  const supabase = await createClient()
  const today = new Date().toISOString().split('T')[0]

  const [courtsRes, todayBookingsRes, membersRes, waitlistRes] = await Promise.all([
    supabase.from('courts').select('id', { count: 'exact', head: true }).eq('tenant_id', tenant.id),
    supabase.from('bookings').select('id', { count: 'exact', head: true }).eq('tenant_id', tenant.id).eq('date', today).eq('status', 'confirmed'),
    supabase.from('member_subscriptions').select('id', { count: 'exact', head: true }).eq('tenant_id', tenant.id).eq('status', 'active'),
    supabase.from('waitlist_entries').select('id', { count: 'exact', head: true }).eq('tenant_id', tenant.id).eq('status', 'waiting'),
  ])

  const stats = [
    { label: 'Total Courts', value: courtsRes.count || 0, icon: MapPin },
    { label: "Today's Bookings", value: todayBookingsRes.count || 0, icon: CalendarDays },
    { label: 'Active Members', value: membersRes.count || 0, icon: Users },
    { label: 'Waitlisted', value: waitlistRes.count || 0, icon: Clock },
  ]

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">{stat.label}</CardTitle>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add src/app/(dashboard)/[slug]/page.tsx
git commit -m "feat: add real-time stats to dashboard overview"
```

---

## Task 16: Final Wiring & Smoke Test

**Step 1: Ensure route group structure is correct**

Verify the following directory structure exists:
```
src/app/
├── (marketing)/      → Landing page
├── (auth)/           → Login, Signup, Onboarding
├── (dashboard)/      → Business owner area
├── (booking)/        → Public customer booking
├── auth/callback/    → OAuth callback
├── layout.tsx        → Root layout
└── globals.css       → Tailwind styles
```

**Step 2: Fix any route conflicts**

Next.js route groups `(marketing)`, `(auth)`, `(dashboard)`, and `(booking)` all have pages at the root. Ensure no route conflicts:
- `(marketing)/page.tsx` → `/`
- `(auth)/login/page.tsx` → `/login`
- `(auth)/signup/page.tsx` → `/signup`
- `(dashboard)/[slug]/page.tsx` → `/dashboard/[slug]`
- `(booking)/[slug]/page.tsx` → `/[slug]`

Note: `(dashboard)/[slug]` and `(booking)/[slug]` could conflict. Fix by using explicit `/dashboard/` prefix for dashboard routes (already done) and `/` prefix for booking routes (already done since booking is just `/[slug]`).

**Step 3: Run the dev server and test**

Run: `npm run dev`

Test flow:
1. Visit `/` → Landing page renders
2. Click "Get Started" → `/signup` renders
3. Sign up as business owner → Redirects to `/onboarding`
4. Complete onboarding → Redirects to `/dashboard/[slug]`
5. Add a court → Court appears in courts list
6. Visit `/[slug]` → Public booking page shows courts
7. Click a court → Booking calendar shows slots
8. Book a slot → Booking appears in dashboard bookings

**Step 4: Final commit**

```bash
git add -A
git commit -m "feat: complete CourtFLOW MVP with booking, membership, and waitlist"
```

---

## Summary

| Task | Description | Key Files |
|------|-------------|-----------|
| 1 | Project scaffolding | Next.js + shadcn + Supabase setup |
| 2 | Database schema & Supabase clients | Migration SQL, client/server utilities |
| 3 | Middleware & auth protection | Route protection, session refresh |
| 4 | TypeScript types | Database entity types |
| 5 | Auth pages | Login, signup, OAuth callback |
| 6 | Business onboarding | Tenant creation wizard |
| 7 | Dashboard layout | Sidebar, topbar, overview |
| 8 | Court management | CRUD for courts |
| 9 | Bookings management | Bookings list for dashboard |
| 10 | Membership tiers | Tier creation + members list |
| 11 | Public booking pages | Customer-facing booking with calendar |
| 12 | Waitlist system | Join waitlist for booked slots |
| 13 | Landing page | Marketing page with features |
| 14 | Settings page | Business details editor |
| 15 | Dashboard real data | Live stats on overview |
| 16 | Final wiring & smoke test | Integration testing |
