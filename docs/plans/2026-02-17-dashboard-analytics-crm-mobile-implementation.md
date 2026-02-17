# CourtFLOW Phase 2 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Redesign the dashboard with Greptile-inspired aesthetics, add analytics with Recharts, build CRM customer profiles with notes, and make everything mobile-responsive.

**Architecture:** Server components fetch data via Supabase, chart components are client-side Recharts wrappers. Mobile sidebar uses Sheet component. New `customer_notes` table with RLS. All behind existing `requireTenantOwner()` auth guard.

**Tech Stack:** Next.js (App Router), Supabase, shadcn/ui, Tailwind CSS v4, Recharts, TypeScript

**Design Doc:** `docs/plans/2026-02-17-dashboard-analytics-crm-mobile-design.md`

---

## Task 1: Install Recharts

**Files:**
- Modify: `package.json`

**Step 1: Install recharts**

Run:
```bash
cd C:/Users/THEJORJ/Desktop/Saas/CourtFLOW
npm install recharts
```

**Step 2: Verify install**

Run:
```bash
npx next build
```

Expected: Build succeeds with no errors.

**Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: install recharts for analytics charts"
```

---

## Task 2: Database Migration — customer_notes table

**Files:**
- Create: `supabase/migrations/002_customer_notes.sql`

**Step 1: Write migration SQL**

Create `supabase/migrations/002_customer_notes.sql`:

```sql
-- Customer notes for CRM
CREATE TABLE customer_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  note TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID NOT NULL REFERENCES profiles(id)
);

-- Index for fast lookups
CREATE INDEX idx_customer_notes_tenant_profile ON customer_notes(tenant_id, profile_id);

-- RLS
ALTER TABLE customer_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant owners can manage their customer notes"
  ON customer_notes FOR ALL
  USING (
    tenant_id IN (
      SELECT id FROM tenants WHERE owner_id = auth.uid()
    )
  )
  WITH CHECK (
    tenant_id IN (
      SELECT id FROM tenants WHERE owner_id = auth.uid()
    )
  );
```

**Step 2: Run migration against local Supabase**

Run:
```bash
docker exec -i -e PGPASSWORD=postgres supabase_db_Mikasa-V3 psql -U postgres -d postgres < supabase/migrations/002_customer_notes.sql
```

Expected: `CREATE TABLE`, `CREATE INDEX`, `ALTER TABLE`, `CREATE POLICY` messages.

**Step 3: Add TypeScript type**

In `src/lib/types/database.ts`, add after `WaitlistEntry`:

```typescript
export interface CustomerNote {
  id: string
  tenant_id: string
  profile_id: string
  note: string
  created_at: string
  created_by: string
}
```

**Step 4: Commit**

```bash
git add supabase/migrations/002_customer_notes.sql src/lib/types/database.ts
git commit -m "feat: add customer_notes table for CRM"
```

---

## Task 3: Redesign Dashboard Sidebar (+ Mobile Collapse)

**Files:**
- Rewrite: `src/components/dashboard/sidebar.tsx`
- Modify: `src/app/dashboard/[slug]/layout.tsx`

**Step 1: Rewrite sidebar with mobile Sheet support**

Rewrite `src/components/dashboard/sidebar.tsx`:

```tsx
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
  BarChart3,
  Menu,
} from 'lucide-react'
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { useState } from 'react'

const navItems = [
  { label: 'Overview', href: '', icon: LayoutDashboard },
  { label: 'Courts', href: '/courts', icon: MapPin },
  { label: 'Bookings', href: '/bookings', icon: CalendarDays },
  { label: 'Customers', href: '/customers', icon: Users },
  { label: 'Tiers', href: '/members/tiers', icon: Crown },
  { label: 'Analytics', href: '/analytics', icon: BarChart3 },
  { label: 'Settings', href: '/settings', icon: Settings },
]

function NavContent({ slug, pathname }: { slug: string; pathname: string }) {
  const basePath = `/dashboard/${slug}`

  return (
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
              'flex items-center gap-3 rounded-lg px-3 py-2 font-mono text-xs uppercase tracking-wider transition-colors',
              isActive
                ? 'bg-primary/10 text-primary font-medium'
                : 'text-muted-foreground hover:bg-accent hover:text-foreground'
            )}
          >
            <item.icon className="h-4 w-4" />
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}

export function Sidebar({ slug, tenantName }: { slug: string; tenantName: string }) {
  const pathname = usePathname()

  return (
    <aside className="hidden h-full w-64 flex-col border-r bg-card md:flex">
      <div className="flex h-14 items-center border-b px-4">
        <Link href={`/dashboard/${slug}`} className="font-mono text-sm font-medium tracking-tight">
          {tenantName}
        </Link>
      </div>
      <NavContent slug={slug} pathname={pathname} />
    </aside>
  )
}

export function MobileSidebar({ slug, tenantName }: { slug: string; tenantName: string }) {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden">
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-64 p-0">
        <div className="flex h-14 items-center border-b px-4">
          <span className="font-mono text-sm font-medium tracking-tight">
            {tenantName}
          </span>
        </div>
        <div onClick={() => setOpen(false)}>
          <NavContent slug={slug} pathname={pathname} />
        </div>
      </SheetContent>
    </Sheet>
  )
}
```

**Step 2: Update dashboard layout to pass tenantName and include MobileSidebar**

Rewrite `src/app/dashboard/[slug]/layout.tsx`:

```tsx
import { requireTenantOwner } from '@/lib/tenant'
import { Sidebar, MobileSidebar } from '@/components/dashboard/sidebar'
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
      <Sidebar slug={slug} tenantName={tenant.name} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Topbar profile={profile} tenant={tenant} slug={slug} />
        <main className="flex-1 overflow-y-auto bg-background p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
```

**Step 3: Commit**

```bash
git add src/components/dashboard/sidebar.tsx src/app/dashboard/[slug]/layout.tsx
git commit -m "feat: redesign sidebar with monospace labels and mobile collapse"
```

---

## Task 4: Redesign Topbar (+ Mobile Hamburger + Breadcrumbs)

**Files:**
- Rewrite: `src/components/dashboard/topbar.tsx`

**Step 1: Rewrite topbar**

Rewrite `src/components/dashboard/topbar.tsx`:

```tsx
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
import { MobileSidebar } from '@/components/dashboard/sidebar'
import type { Profile, Tenant } from '@/lib/types'

export function Topbar({ profile, tenant, slug }: { profile: Profile; tenant: Tenant; slug: string }) {
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
    <header className="flex h-14 items-center justify-between border-b bg-card px-4 md:px-6">
      <div className="flex items-center gap-3">
        <MobileSidebar slug={slug} tenantName={tenant.name} />
        <span className="section-label hidden sm:inline">{tenant.name}</span>
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="relative h-8 w-8 rounded-full">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="bg-primary/10 text-primary text-xs font-mono">
                {initials}
              </AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem className="text-xs text-muted-foreground font-mono">
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

**Step 2: Verify build**

Run:
```bash
npx next build
```

Expected: Build succeeds.

**Step 3: Commit**

```bash
git add src/components/dashboard/topbar.tsx
git commit -m "feat: redesign topbar with mobile hamburger and monospace styling"
```

---

## Task 5: Redesign Dashboard Overview Page

**Files:**
- Rewrite: `src/app/dashboard/[slug]/page.tsx`

**Step 1: Rewrite overview with bracket labels, styled stats, recent bookings**

Rewrite `src/app/dashboard/[slug]/page.tsx`:

```tsx
import { requireTenantOwner } from '@/lib/tenant'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CalendarDays, MapPin, Users, Clock, TrendingUp, TrendingDown } from 'lucide-react'

const statusColors: Record<string, string> = {
  confirmed: 'bg-green/10 text-green border-green/20',
  completed: 'bg-muted text-muted-foreground border-border',
  cancelled: 'bg-destructive/10 text-destructive border-destructive/20',
  no_show: 'bg-amber-100 text-amber-700 border-amber-200',
}

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const { tenant } = await requireTenantOwner(slug)

  const supabase = await createClient()
  const today = new Date().toISOString().split('T')[0]

  const [courtsRes, todayBookingsRes, membersRes, waitlistRes, recentBookingsRes] = await Promise.all([
    supabase.from('courts').select('id', { count: 'exact', head: true }).eq('tenant_id', tenant.id),
    supabase.from('bookings').select('id', { count: 'exact', head: true }).eq('tenant_id', tenant.id).eq('date', today).eq('status', 'confirmed'),
    supabase.from('member_subscriptions').select('id', { count: 'exact', head: true }).eq('tenant_id', tenant.id).eq('status', 'active'),
    supabase.from('waitlist_entries').select('id', { count: 'exact', head: true }).eq('tenant_id', tenant.id).eq('status', 'waiting'),
    supabase.from('bookings').select(`*, courts ( name ), profiles:customer_id ( full_name )`).eq('tenant_id', tenant.id).order('created_at', { ascending: false }).limit(5),
  ])

  const stats = [
    { label: 'Total Courts', value: courtsRes.count || 0, icon: MapPin, color: 'text-primary' },
    { label: "Today's Bookings", value: todayBookingsRes.count || 0, icon: CalendarDays, color: 'text-chart-3' },
    { label: 'Active Members', value: membersRes.count || 0, icon: Users, color: 'text-chart-2' },
    { label: 'Waitlisted', value: waitlistRes.count || 0, icon: Clock, color: 'text-chart-4' },
  ]

  const recentBookings = recentBookingsRes.data || []

  return (
    <div className="space-y-8">
      {/* Stats */}
      <div>
        <span className="section-label mb-4 block">[ OVERVIEW ]</span>
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => (
            <Card key={stat.label}>
              <CardContent className="p-4 md:p-6">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
                    {stat.label}
                  </span>
                  <stat.icon className={cn('h-4 w-4', stat.color)} />
                </div>
                <div className="mt-2 text-3xl font-bold tracking-tight">
                  {stat.value}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Recent Bookings */}
      <div>
        <span className="section-label mb-4 block">[ RECENT BOOKINGS ]</span>
        <Card>
          <CardContent className="p-0">
            {recentBookings.length === 0 ? (
              <div className="flex items-center justify-center py-12">
                <p className="text-sm text-muted-foreground">No bookings yet.</p>
              </div>
            ) : (
              <>
                {/* Desktop table */}
                <div className="hidden md:block">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b text-left">
                        <th className="p-4 font-mono text-xs uppercase tracking-wider text-muted-foreground font-medium">Customer</th>
                        <th className="p-4 font-mono text-xs uppercase tracking-wider text-muted-foreground font-medium">Court</th>
                        <th className="p-4 font-mono text-xs uppercase tracking-wider text-muted-foreground font-medium">Date</th>
                        <th className="p-4 font-mono text-xs uppercase tracking-wider text-muted-foreground font-medium">Time</th>
                        <th className="p-4 font-mono text-xs uppercase tracking-wider text-muted-foreground font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentBookings.map((booking: any, i: number) => (
                        <tr key={booking.id} className={i % 2 === 1 ? 'bg-muted/30' : ''}>
                          <td className="p-4 text-sm">{booking.profiles?.full_name || 'Unknown'}</td>
                          <td className="p-4 text-sm">{booking.courts?.name}</td>
                          <td className="p-4 font-mono text-sm">{booking.date}</td>
                          <td className="p-4 font-mono text-sm">{booking.start_time}–{booking.end_time}</td>
                          <td className="p-4">
                            <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium ${statusColors[booking.status] || ''}`}>
                              {booking.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile cards */}
                <div className="space-y-2 p-3 md:hidden">
                  {recentBookings.map((booking: any) => (
                    <div key={booking.id} className="rounded-lg border bg-card p-3 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">{booking.profiles?.full_name || 'Unknown'}</span>
                        <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${statusColors[booking.status] || ''}`}>
                          {booking.status}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">{booking.courts?.name}</p>
                      <p className="font-mono text-xs text-muted-foreground">{booking.date} · {booking.start_time}–{booking.end_time}</p>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
```

**Note:** This file uses `cn()` — add the import at the top: `import { cn } from '@/lib/utils'`

**Step 2: Verify build**

Run:
```bash
npx next build
```

**Step 3: Commit**

```bash
git add src/app/dashboard/[slug]/page.tsx
git commit -m "feat: redesign dashboard overview with bracket labels and responsive tables"
```

---

## Task 6: Redesign Bookings Page

**Files:**
- Rewrite: `src/app/dashboard/[slug]/bookings/page.tsx`

**Step 1: Rewrite bookings with styled table + mobile cards**

Rewrite `src/app/dashboard/[slug]/bookings/page.tsx`:

```tsx
import { requireTenantOwner } from '@/lib/tenant'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent } from '@/components/ui/card'

const statusColors: Record<string, string> = {
  confirmed: 'bg-green/10 text-green border-green/20',
  completed: 'bg-muted text-muted-foreground border-border',
  cancelled: 'bg-destructive/10 text-destructive border-destructive/20',
  no_show: 'bg-amber-100 text-amber-700 border-amber-200',
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
      <span className="section-label block">[ BOOKINGS ]</span>
      <h1 className="text-2xl font-bold tracking-tight">Bookings</h1>

      <Card>
        <CardContent className="p-0">
          {(!bookings || bookings.length === 0) ? (
            <div className="flex items-center justify-center py-12">
              <p className="text-sm text-muted-foreground">No bookings yet.</p>
            </div>
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden md:block">
                <table className="w-full">
                  <thead>
                    <tr className="border-b text-left">
                      <th className="p-4 font-mono text-xs uppercase tracking-wider text-muted-foreground font-medium">Date</th>
                      <th className="p-4 font-mono text-xs uppercase tracking-wider text-muted-foreground font-medium">Time</th>
                      <th className="p-4 font-mono text-xs uppercase tracking-wider text-muted-foreground font-medium">Court</th>
                      <th className="p-4 font-mono text-xs uppercase tracking-wider text-muted-foreground font-medium">Customer</th>
                      <th className="p-4 font-mono text-xs uppercase tracking-wider text-muted-foreground font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bookings.map((booking: any, i: number) => (
                      <tr key={booking.id} className={i % 2 === 1 ? 'bg-muted/30' : ''}>
                        <td className="p-4 font-mono text-sm">{booking.date}</td>
                        <td className="p-4 font-mono text-sm">{booking.start_time}–{booking.end_time}</td>
                        <td className="p-4 text-sm">{booking.courts?.name}</td>
                        <td className="p-4 text-sm">{booking.profiles?.full_name || 'Unknown'}</td>
                        <td className="p-4">
                          <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium ${statusColors[booking.status] || ''}`}>
                            {booking.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile cards */}
              <div className="space-y-2 p-3 md:hidden">
                {bookings.map((booking: any) => (
                  <div key={booking.id} className="rounded-lg border bg-card p-3 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{booking.profiles?.full_name || 'Unknown'}</span>
                      <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${statusColors[booking.status] || ''}`}>
                        {booking.status}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">{booking.courts?.name}</p>
                    <p className="font-mono text-xs text-muted-foreground">{booking.date} · {booking.start_time}–{booking.end_time}</p>
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add src/app/dashboard/[slug]/bookings/page.tsx
git commit -m "feat: redesign bookings page with styled tables and mobile cards"
```

---

## Task 7: Redesign Courts Page

**Files:**
- Modify: `src/app/dashboard/[slug]/courts/page.tsx`

**Step 1: Update courts page with bracket labels and refined cards**

Rewrite `src/app/dashboard/[slug]/courts/page.tsx`:

```tsx
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
        <div>
          <span className="section-label mb-2 block">[ COURTS ]</span>
          <h1 className="text-2xl font-bold tracking-tight">Courts</h1>
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button className="font-mono text-xs uppercase tracking-wider">
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
            <p className="text-sm text-muted-foreground">No courts yet. Add your first court to get started.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {(courts as Court[]).map((court) => (
            <Link key={court.id} href={`/dashboard/${slug}/courts/${court.id}`}>
              <Card className="cursor-pointer transition-all hover:shadow-md hover:border-primary/20">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base font-semibold">{court.name}</CardTitle>
                    <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${court.is_active ? 'bg-green/10 text-green border-green/20' : 'bg-muted text-muted-foreground border-border'}`}>
                      {court.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex items-center gap-2 text-xs">
                    <Badge variant="outline" className="font-mono text-xs">{court.sport_type}</Badge>
                    <Badge variant="outline" className="font-mono text-xs">
                      {court.booking_mode === 'fixed_slot'
                        ? `${court.slot_duration_minutes}min`
                        : `${court.min_duration_minutes}-${court.max_duration_minutes}min`}
                    </Badge>
                  </div>
                  {court.description && (
                    <p className="mt-2 text-sm text-muted-foreground line-clamp-2">{court.description}</p>
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

**Step 2: Commit**

```bash
git add src/app/dashboard/[slug]/courts/page.tsx
git commit -m "feat: redesign courts page with bracket labels and refined cards"
```

---

## Task 8: Redesign Tiers & Settings Pages

**Files:**
- Modify: `src/app/dashboard/[slug]/members/tiers/page.tsx`
- Modify: `src/app/dashboard/[slug]/settings/page.tsx`

**Step 1: Update tiers page**

Rewrite `src/app/dashboard/[slug]/members/tiers/page.tsx` — add `[ MEMBERSHIP TIERS ]` bracket label, update heading to `text-2xl`, add `font-mono text-xs uppercase tracking-wider` to the button text, update grid to `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`.

**Step 2: Update settings page**

Rewrite `src/app/dashboard/[slug]/settings/page.tsx` — add `[ SETTINGS ]` bracket label, update heading to `text-2xl`, add `font-mono text-xs uppercase tracking-wider` to the save button text.

**Step 3: Commit**

```bash
git add src/app/dashboard/[slug]/members/tiers/page.tsx src/app/dashboard/[slug]/settings/page.tsx
git commit -m "feat: redesign tiers and settings pages with bracket labels"
```

---

## Task 9: CRM — Customers List Page

**Files:**
- Create: `src/app/dashboard/[slug]/customers/page.tsx`
- Delete old members page (keep redirect or remove)

**Step 1: Create customers list page**

Create `src/app/dashboard/[slug]/customers/page.tsx`:

```tsx
import { requireTenantOwner } from '@/lib/tenant'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent } from '@/components/ui/card'
import Link from 'next/link'

export default async function CustomersPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const { tenant } = await requireTenantOwner(slug)

  const supabase = await createClient()

  // Get all unique customers who have booked at this tenant
  const { data: bookingCustomers } = await supabase
    .from('bookings')
    .select('customer_id, profiles:customer_id ( id, full_name, phone, created_at )')
    .eq('tenant_id', tenant.id)

  // Deduplicate and aggregate
  const customerMap = new Map<string, {
    id: string
    full_name: string | null
    phone: string | null
    created_at: string
    total_bookings: number
    last_booking: string | null
  }>()

  for (const b of bookingCustomers || []) {
    const profile = b.profiles as any
    if (!profile?.id) continue
    const existing = customerMap.get(profile.id)
    if (existing) {
      existing.total_bookings++
    } else {
      customerMap.set(profile.id, {
        id: profile.id,
        full_name: profile.full_name,
        phone: profile.phone,
        created_at: profile.created_at,
        total_bookings: 1,
        last_booking: null,
      })
    }
  }

  // Get membership info for each customer
  const customerIds = Array.from(customerMap.keys())
  const { data: subscriptions } = customerIds.length > 0
    ? await supabase
        .from('member_subscriptions')
        .select('customer_id, membership_tiers:tier_id ( name ), status')
        .eq('tenant_id', tenant.id)
        .in('customer_id', customerIds)
        .eq('status', 'active')
    : { data: [] }

  const tierMap = new Map<string, string>()
  for (const sub of subscriptions || []) {
    tierMap.set(sub.customer_id, (sub.membership_tiers as any)?.name || 'Unknown')
  }

  const customers = Array.from(customerMap.values()).sort((a, b) => b.total_bookings - a.total_bookings)

  return (
    <div className="space-y-6">
      <span className="section-label block">[ CUSTOMERS ]</span>
      <h1 className="text-2xl font-bold tracking-tight">Customers</h1>

      <Card>
        <CardContent className="p-0">
          {customers.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <p className="text-sm text-muted-foreground">No customers yet. Customers appear once they make a booking.</p>
            </div>
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden md:block">
                <table className="w-full">
                  <thead>
                    <tr className="border-b text-left">
                      <th className="p-4 font-mono text-xs uppercase tracking-wider text-muted-foreground font-medium">Name</th>
                      <th className="p-4 font-mono text-xs uppercase tracking-wider text-muted-foreground font-medium">Phone</th>
                      <th className="p-4 font-mono text-xs uppercase tracking-wider text-muted-foreground font-medium">Bookings</th>
                      <th className="p-4 font-mono text-xs uppercase tracking-wider text-muted-foreground font-medium">Tier</th>
                    </tr>
                  </thead>
                  <tbody>
                    {customers.map((customer, i) => (
                      <tr key={customer.id} className={`cursor-pointer transition-colors hover:bg-muted/50 ${i % 2 === 1 ? 'bg-muted/30' : ''}`}>
                        <td className="p-4">
                          <Link href={`/dashboard/${slug}/customers/${customer.id}`} className="text-sm font-medium hover:underline">
                            {customer.full_name || 'Unknown'}
                          </Link>
                        </td>
                        <td className="p-4 font-mono text-sm text-muted-foreground">{customer.phone || '—'}</td>
                        <td className="p-4 font-mono text-sm">{customer.total_bookings}</td>
                        <td className="p-4">
                          {tierMap.has(customer.id) ? (
                            <span className="inline-flex rounded-full border border-green/20 bg-green/10 px-2.5 py-0.5 text-xs font-medium text-green">
                              {tierMap.get(customer.id)}
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile cards */}
              <div className="space-y-2 p-3 md:hidden">
                {customers.map((customer) => (
                  <Link key={customer.id} href={`/dashboard/${slug}/customers/${customer.id}`}>
                    <div className="rounded-lg border bg-card p-3 space-y-1 transition-colors hover:bg-muted/30">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">{customer.full_name || 'Unknown'}</span>
                        <span className="font-mono text-xs text-muted-foreground">{customer.total_bookings} bookings</span>
                      </div>
                      <p className="font-mono text-xs text-muted-foreground">{customer.phone || 'No phone'}</p>
                      {tierMap.has(customer.id) && (
                        <span className="inline-flex rounded-full border border-green/20 bg-green/10 px-2 py-0.5 text-xs font-medium text-green">
                          {tierMap.get(customer.id)}
                        </span>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add src/app/dashboard/[slug]/customers/page.tsx
git commit -m "feat: add customers list page for CRM"
```

---

## Task 10: CRM — Customer Detail Page

**Files:**
- Create: `src/app/dashboard/[slug]/customers/[id]/page.tsx`
- Create: `src/app/dashboard/[slug]/customers/[id]/actions.ts`

**Step 1: Create add-note server action**

Create `src/app/dashboard/[slug]/customers/[id]/actions.ts`:

```typescript
'use server'

import { createClient } from '@/lib/supabase/server'
import { requireTenantOwner } from '@/lib/tenant'
import { revalidatePath } from 'next/cache'

export async function addCustomerNote(
  tenantSlug: string,
  profileId: string,
  formData: FormData
) {
  const { tenant, profile: ownerProfile } = await requireTenantOwner(tenantSlug)
  const note = formData.get('note') as string

  if (!note?.trim()) return

  const supabase = await createClient()
  await supabase.from('customer_notes').insert({
    tenant_id: tenant.id,
    profile_id: profileId,
    note: note.trim(),
    created_by: ownerProfile.id,
  })

  revalidatePath(`/dashboard/${tenantSlug}/customers/${profileId}`)
}
```

**Step 2: Create customer detail page**

Create `src/app/dashboard/[slug]/customers/[id]/page.tsx`:

```tsx
import { requireTenantOwner } from '@/lib/tenant'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { notFound } from 'next/navigation'
import { addCustomerNote } from './actions'
import { CalendarDays, DollarSign, AlertTriangle, MapPin } from 'lucide-react'

const statusColors: Record<string, string> = {
  confirmed: 'bg-green/10 text-green border-green/20',
  completed: 'bg-muted text-muted-foreground border-border',
  cancelled: 'bg-destructive/10 text-destructive border-destructive/20',
  no_show: 'bg-amber-100 text-amber-700 border-amber-200',
}

export default async function CustomerDetailPage({
  params,
}: {
  params: Promise<{ slug: string; id: string }>
}) {
  const { slug, id } = await params
  const { tenant } = await requireTenantOwner(slug)

  const supabase = await createClient()

  // Fetch customer profile
  const { data: customer } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', id)
    .single()

  if (!customer) notFound()

  // Fetch bookings, subscription, and notes in parallel
  const [bookingsRes, subscriptionRes, notesRes] = await Promise.all([
    supabase
      .from('bookings')
      .select('*, courts ( name )')
      .eq('tenant_id', tenant.id)
      .eq('customer_id', id)
      .order('date', { ascending: false })
      .limit(20),
    supabase
      .from('member_subscriptions')
      .select('*, membership_tiers:tier_id ( name, perks )')
      .eq('tenant_id', tenant.id)
      .eq('customer_id', id)
      .eq('status', 'active')
      .maybeSingle(),
    supabase
      .from('customer_notes')
      .select('*, creator:created_by ( full_name )')
      .eq('tenant_id', tenant.id)
      .eq('profile_id', id)
      .order('created_at', { ascending: false }),
  ])

  const bookings = bookingsRes.data || []
  const subscription = subscriptionRes.data
  const notes = notesRes.data || []

  // Compute stats
  const totalBookings = bookings.length
  const noShows = bookings.filter((b: any) => b.status === 'no_show').length
  const noShowRate = totalBookings > 0 ? Math.round((noShows / totalBookings) * 100) : 0

  // Favorite court
  const courtCounts = new Map<string, number>()
  for (const b of bookings as any[]) {
    const name = b.courts?.name || 'Unknown'
    courtCounts.set(name, (courtCounts.get(name) || 0) + 1)
  }
  const favoriteCourt = courtCounts.size > 0
    ? Array.from(courtCounts.entries()).sort((a, b) => b[1] - a[1])[0][0]
    : '—'

  const initials = (customer.full_name || 'U')
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  async function handleAddNote(formData: FormData) {
    'use server'
    await addCustomerNote(slug, id, formData)
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-6">
        <Avatar className="h-16 w-16">
          <AvatarFallback className="bg-primary/10 text-primary font-mono text-xl">
            {initials}
          </AvatarFallback>
        </Avatar>
        <div>
          <span className="section-label mb-1 block">[ CUSTOMER ]</span>
          <h1 className="text-2xl font-bold tracking-tight">{customer.full_name || 'Unknown'}</h1>
          <div className="mt-1 flex flex-wrap gap-3 text-sm text-muted-foreground">
            {customer.phone && <span className="font-mono">{customer.phone}</span>}
            <span className="font-mono">Since {new Date(customer.created_at).toLocaleDateString()}</span>
          </div>
          {subscription && (
            <span className="mt-2 inline-flex rounded-full border border-green/20 bg-green/10 px-3 py-0.5 text-xs font-medium text-green">
              {(subscription.membership_tiers as any)?.name} Member
            </span>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'Total Bookings', value: totalBookings, icon: CalendarDays },
          { label: 'No-Show Rate', value: `${noShowRate}%`, icon: AlertTriangle },
          { label: 'Favorite Court', value: favoriteCourt, icon: MapPin },
          { label: 'Free Hours Left', value: subscription?.free_hours_remaining ?? '—', icon: DollarSign },
        ].map((stat) => (
          <Card key={stat.label}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs uppercase tracking-wider text-muted-foreground">{stat.label}</span>
                <stat.icon className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="mt-2 text-2xl font-bold tracking-tight">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Booking History */}
      <div>
        <span className="section-label mb-4 block">[ BOOKING HISTORY ]</span>
        <Card>
          <CardContent className="p-0">
            {bookings.length === 0 ? (
              <div className="flex items-center justify-center py-8">
                <p className="text-sm text-muted-foreground">No bookings found.</p>
              </div>
            ) : (
              <>
                <div className="hidden md:block">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b text-left">
                        <th className="p-4 font-mono text-xs uppercase tracking-wider text-muted-foreground font-medium">Date</th>
                        <th className="p-4 font-mono text-xs uppercase tracking-wider text-muted-foreground font-medium">Court</th>
                        <th className="p-4 font-mono text-xs uppercase tracking-wider text-muted-foreground font-medium">Time</th>
                        <th className="p-4 font-mono text-xs uppercase tracking-wider text-muted-foreground font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(bookings as any[]).map((booking, i) => (
                        <tr key={booking.id} className={i % 2 === 1 ? 'bg-muted/30' : ''}>
                          <td className="p-4 font-mono text-sm">{booking.date}</td>
                          <td className="p-4 text-sm">{booking.courts?.name}</td>
                          <td className="p-4 font-mono text-sm">{booking.start_time}–{booking.end_time}</td>
                          <td className="p-4">
                            <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium ${statusColors[booking.status] || ''}`}>
                              {booking.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="space-y-2 p-3 md:hidden">
                  {(bookings as any[]).map((booking) => (
                    <div key={booking.id} className="rounded-lg border p-3 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">{booking.courts?.name}</span>
                        <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${statusColors[booking.status] || ''}`}>
                          {booking.status}
                        </span>
                      </div>
                      <p className="font-mono text-xs text-muted-foreground">{booking.date} · {booking.start_time}–{booking.end_time}</p>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Notes */}
      <div>
        <span className="section-label mb-4 block">[ NOTES ]</span>
        <Card>
          <CardContent className="p-4 space-y-4">
            <form action={handleAddNote} className="flex gap-3">
              <Textarea
                name="note"
                placeholder="Add a note about this customer..."
                className="min-h-[60px] flex-1 resize-none"
                required
              />
              <Button type="submit" className="self-end font-mono text-xs uppercase tracking-wider">
                Add
              </Button>
            </form>
            {notes.length > 0 && (
              <div className="space-y-3 border-t pt-4">
                {(notes as any[]).map((note) => (
                  <div key={note.id} className="space-y-1">
                    <p className="text-sm">{note.note}</p>
                    <p className="font-mono text-xs text-muted-foreground">
                      {note.creator?.full_name || 'Unknown'} · {new Date(note.created_at).toLocaleDateString()}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
```

**Step 3: Commit**

```bash
git add src/app/dashboard/[slug]/customers/[id]/page.tsx src/app/dashboard/[slug]/customers/[id]/actions.ts
git commit -m "feat: add customer detail page with booking history and notes"
```

---

## Task 11: Analytics — KPI Card Component

**Files:**
- Create: `src/components/analytics/kpi-card.tsx`

**Step 1: Create reusable KPI card**

Create `src/components/analytics/kpi-card.tsx`:

```tsx
import { Card, CardContent } from '@/components/ui/card'
import { TrendingUp, TrendingDown } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

interface KpiCardProps {
  label: string
  value: string | number
  icon: LucideIcon
  trend?: { value: number; label: string }
}

export function KpiCard({ label, value, icon: Icon, trend }: KpiCardProps) {
  return (
    <Card>
      <CardContent className="p-4 md:p-6">
        <div className="flex items-center justify-between">
          <span className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
            {label}
          </span>
          <Icon className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className="mt-2 text-3xl font-bold tracking-tight">{value}</div>
        {trend && (
          <div className="mt-1 flex items-center gap-1 text-xs">
            {trend.value >= 0 ? (
              <TrendingUp className="h-3 w-3 text-green" />
            ) : (
              <TrendingDown className="h-3 w-3 text-destructive" />
            )}
            <span className={trend.value >= 0 ? 'text-green' : 'text-destructive'}>
              {trend.value >= 0 ? '+' : ''}{trend.value}%
            </span>
            <span className="text-muted-foreground">{trend.label}</span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
```

**Step 2: Commit**

```bash
git add src/components/analytics/kpi-card.tsx
git commit -m "feat: add reusable KPI card component for analytics"
```

---

## Task 12: Analytics — Revenue Charts

**Files:**
- Create: `src/components/analytics/revenue-chart.tsx`
- Create: `src/components/analytics/revenue-by-court.tsx`

**Step 1: Create revenue over time area chart**

Create `src/components/analytics/revenue-chart.tsx`:

```tsx
'use client'

import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { Card, CardContent } from '@/components/ui/card'

interface RevenueChartProps {
  data: { date: string; revenue: number }[]
}

export function RevenueChart({ data }: RevenueChartProps) {
  return (
    <Card>
      <CardContent className="p-4 md:p-6">
        <span className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
          Revenue Over Time
        </span>
        <div className="mt-4 h-[300px]">
          {data.length === 0 ? (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              No revenue data yet.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data} margin={{ top: 5, right: 5, bottom: 5, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11, fontFamily: 'var(--font-mono)', fill: 'var(--muted-foreground)' }}
                  tickLine={false}
                  axisLine={{ stroke: 'var(--border)' }}
                />
                <YAxis
                  tick={{ fontSize: 11, fontFamily: 'var(--font-mono)', fill: 'var(--muted-foreground)' }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => `$${v}`}
                />
                <Tooltip
                  contentStyle={{
                    background: 'var(--card)',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '12px',
                  }}
                  formatter={(value: number) => [`$${value.toFixed(2)}`, 'Revenue']}
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="var(--chart-1)"
                  fill="var(--chart-1)"
                  fillOpacity={0.1}
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
```

**Step 2: Create revenue by court bar chart**

Create `src/components/analytics/revenue-by-court.tsx`:

```tsx
'use client'

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { Card, CardContent } from '@/components/ui/card'

interface RevenueByCourtProps {
  data: { court: string; revenue: number }[]
}

export function RevenueByCourtChart({ data }: RevenueByCourtProps) {
  return (
    <Card>
      <CardContent className="p-4 md:p-6">
        <span className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
          Revenue by Court
        </span>
        <div className="mt-4 h-[300px]">
          {data.length === 0 ? (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              No data yet.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} layout="vertical" margin={{ top: 5, right: 5, bottom: 5, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                <XAxis
                  type="number"
                  tick={{ fontSize: 11, fontFamily: 'var(--font-mono)', fill: 'var(--muted-foreground)' }}
                  tickFormatter={(v) => `$${v}`}
                  axisLine={{ stroke: 'var(--border)' }}
                  tickLine={false}
                />
                <YAxis
                  type="category"
                  dataKey="court"
                  tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
                  tickLine={false}
                  axisLine={false}
                  width={100}
                />
                <Tooltip
                  contentStyle={{
                    background: 'var(--card)',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '12px',
                  }}
                  formatter={(value: number) => [`$${value.toFixed(2)}`, 'Revenue']}
                />
                <Bar dataKey="revenue" fill="var(--chart-2)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
```

**Step 3: Commit**

```bash
git add src/components/analytics/revenue-chart.tsx src/components/analytics/revenue-by-court.tsx
git commit -m "feat: add revenue area chart and revenue by court bar chart"
```

---

## Task 13: Analytics — Utilization Chart + Peak Hours Heatmap

**Files:**
- Create: `src/components/analytics/utilization-chart.tsx`
- Create: `src/components/analytics/peak-hours-heatmap.tsx`

**Step 1: Create utilization bar chart**

Create `src/components/analytics/utilization-chart.tsx`:

```tsx
'use client'

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { Card, CardContent } from '@/components/ui/card'

interface UtilizationChartProps {
  data: { court: string; utilization: number }[]
}

export function UtilizationChart({ data }: UtilizationChartProps) {
  return (
    <Card>
      <CardContent className="p-4 md:p-6">
        <span className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
          Court Utilization
        </span>
        <div className="mt-4 h-[300px]">
          {data.length === 0 ? (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              No data yet.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} margin={{ top: 5, right: 5, bottom: 5, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis
                  dataKey="court"
                  tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
                  tickLine={false}
                  axisLine={{ stroke: 'var(--border)' }}
                />
                <YAxis
                  tick={{ fontSize: 11, fontFamily: 'var(--font-mono)', fill: 'var(--muted-foreground)' }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => `${v}%`}
                  domain={[0, 100]}
                />
                <Tooltip
                  contentStyle={{
                    background: 'var(--card)',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '12px',
                  }}
                  formatter={(value: number) => [`${value.toFixed(1)}%`, 'Utilization']}
                />
                <Bar dataKey="utilization" fill="var(--chart-1)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
```

**Step 2: Create peak hours heatmap**

Create `src/components/analytics/peak-hours-heatmap.tsx`:

```tsx
'use client'

import { Card, CardContent } from '@/components/ui/card'

interface PeakHoursHeatmapProps {
  data: { day: string; hour: number; count: number }[]
  maxCount: number
}

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const HOURS = Array.from({ length: 16 }, (_, i) => i + 6) // 6am to 9pm

function getOpacity(count: number, max: number): number {
  if (max === 0 || count === 0) return 0
  return 0.15 + (count / max) * 0.85
}

export function PeakHoursHeatmap({ data, maxCount }: PeakHoursHeatmapProps) {
  const lookup = new Map<string, number>()
  for (const d of data) {
    lookup.set(`${d.day}-${d.hour}`, d.count)
  }

  return (
    <Card>
      <CardContent className="p-4 md:p-6">
        <span className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
          Peak Hours
        </span>
        <div className="mt-4 overflow-x-auto">
          <div className="min-w-[500px]">
            {/* Hour labels */}
            <div className="flex">
              <div className="w-10 shrink-0" />
              {HOURS.map((h) => (
                <div key={h} className="flex-1 text-center font-mono text-[10px] text-muted-foreground">
                  {h}:00
                </div>
              ))}
            </div>
            {/* Grid */}
            {DAYS.map((day) => (
              <div key={day} className="flex items-center gap-0">
                <div className="w-10 shrink-0 font-mono text-xs text-muted-foreground">
                  {day}
                </div>
                {HOURS.map((hour) => {
                  const count = lookup.get(`${day}-${hour}`) || 0
                  return (
                    <div
                      key={hour}
                      className="flex-1 aspect-square m-0.5 rounded-sm"
                      style={{
                        backgroundColor: count > 0 ? `var(--chart-1)` : 'var(--muted)',
                        opacity: count > 0 ? getOpacity(count, maxCount) : 0.3,
                      }}
                      title={`${day} ${hour}:00 — ${count} booking${count !== 1 ? 's' : ''}`}
                    />
                  )
                })}
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
```

**Step 3: Commit**

```bash
git add src/components/analytics/utilization-chart.tsx src/components/analytics/peak-hours-heatmap.tsx
git commit -m "feat: add utilization bar chart and peak hours heatmap"
```

---

## Task 14: Analytics — Main Page with Server-Side Data

**Files:**
- Create: `src/app/dashboard/[slug]/analytics/page.tsx`

**Step 1: Create analytics page with data aggregation**

Create `src/app/dashboard/[slug]/analytics/page.tsx`:

```tsx
import { requireTenantOwner } from '@/lib/tenant'
import { createClient } from '@/lib/supabase/server'
import { KpiCard } from '@/components/analytics/kpi-card'
import { RevenueChart } from '@/components/analytics/revenue-chart'
import { RevenueByCourtChart } from '@/components/analytics/revenue-by-court'
import { UtilizationChart } from '@/components/analytics/utilization-chart'
import { PeakHoursHeatmap } from '@/components/analytics/peak-hours-heatmap'
import { DollarSign, TrendingUp, Users, Clock, CalendarDays, BarChart3 } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'

const RANGES = [
  { label: '7 days', value: '7' },
  { label: '30 days', value: '30' },
  { label: '90 days', value: '90' },
]

export default async function AnalyticsPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ range?: string }>
}) {
  const { slug } = await params
  const { range } = await searchParams
  const { tenant } = await requireTenantOwner(slug)
  const days = parseInt(range || '30', 10)

  const supabase = await createClient()
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - days)
  const startStr = startDate.toISOString().split('T')[0]

  // Fetch bookings for the period
  const { data: bookings } = await supabase
    .from('bookings')
    .select('*, courts ( name, operating_hours, slot_duration_minutes )')
    .eq('tenant_id', tenant.id)
    .gte('date', startStr)
    .order('date', { ascending: true })

  // Fetch all courts for utilization calculation
  const { data: courts } = await supabase
    .from('courts')
    .select('id, name, operating_hours, slot_duration_minutes')
    .eq('tenant_id', tenant.id)

  // Fetch membership revenue
  const { data: subscriptions } = await supabase
    .from('member_subscriptions')
    .select('*, membership_tiers:tier_id ( price )')
    .eq('tenant_id', tenant.id)
    .eq('status', 'active')

  const allBookings = bookings || []
  const confirmedBookings = allBookings.filter((b: any) => b.status === 'confirmed' || b.status === 'completed')

  // --- Revenue Over Time ---
  const revenueByDate = new Map<string, number>()
  for (const b of confirmedBookings as any[]) {
    const existing = revenueByDate.get(b.date) || 0
    // Placeholder: assume $25/hour base rate
    const hours = (new Date(`2000-01-01T${b.end_time}Z`).getTime() - new Date(`2000-01-01T${b.start_time}Z`).getTime()) / 3600000
    revenueByDate.set(b.date, existing + hours * 25)
  }
  const revenueChartData = Array.from(revenueByDate.entries())
    .map(([date, revenue]) => ({ date, revenue: Math.round(revenue * 100) / 100 }))
    .sort((a, b) => a.date.localeCompare(b.date))

  // --- Revenue by Court ---
  const revByCourt = new Map<string, number>()
  for (const b of confirmedBookings as any[]) {
    const name = b.courts?.name || 'Unknown'
    const hours = (new Date(`2000-01-01T${b.end_time}Z`).getTime() - new Date(`2000-01-01T${b.start_time}Z`).getTime()) / 3600000
    revByCourt.set(name, (revByCourt.get(name) || 0) + hours * 25)
  }
  const revenueByCourtData = Array.from(revByCourt.entries())
    .map(([court, revenue]) => ({ court, revenue: Math.round(revenue * 100) / 100 }))
    .sort((a, b) => b.revenue - a.revenue)

  // --- KPIs ---
  const totalRevenue = revenueChartData.reduce((sum, d) => sum + d.revenue, 0)
  const avgBookingValue = confirmedBookings.length > 0 ? totalRevenue / confirmedBookings.length : 0
  const membershipRevenue = (subscriptions || []).reduce((sum: number, s: any) => sum + ((s.membership_tiers as any)?.price || 0), 0)

  // --- Utilization ---
  const utilizationData = (courts || []).map((court: any) => {
    const courtBookings = confirmedBookings.filter((b: any) => b.court_id === court.id)
    // Estimate total available slots in period
    const totalSlots = days * 10 // rough: 10 slots/day
    const utilization = totalSlots > 0 ? Math.min(100, (courtBookings.length / totalSlots) * 100) : 0
    return { court: court.name, utilization: Math.round(utilization * 10) / 10 }
  })

  const overallFillRate = utilizationData.length > 0
    ? Math.round(utilizationData.reduce((sum, d) => sum + d.utilization, 0) / utilizationData.length * 10) / 10
    : 0

  // --- Peak Hours Heatmap ---
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const heatmapCounts = new Map<string, number>()
  let maxHeatmapCount = 0
  for (const b of confirmedBookings as any[]) {
    const d = new Date(b.date)
    const dayName = dayNames[d.getDay()]
    const hour = parseInt(b.start_time.split(':')[0], 10)
    const key = `${dayName}-${hour}`
    const count = (heatmapCounts.get(key) || 0) + 1
    heatmapCounts.set(key, count)
    if (count > maxHeatmapCount) maxHeatmapCount = count
  }
  const heatmapData = Array.from(heatmapCounts.entries()).map(([key, count]) => {
    const [day, hourStr] = key.split('-')
    return { day, hour: parseInt(hourStr, 10), count }
  })

  // Busiest day
  const dayTotals = new Map<string, number>()
  for (const b of confirmedBookings as any[]) {
    const d = new Date(b.date)
    const dayName = dayNames[d.getDay()]
    dayTotals.set(dayName, (dayTotals.get(dayName) || 0) + 1)
  }
  const busiestDay = dayTotals.size > 0
    ? Array.from(dayTotals.entries()).sort((a, b) => b[1] - a[1])[0][0]
    : '—'

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <span className="section-label mb-2 block">[ ANALYTICS ]</span>
          <h1 className="text-2xl font-bold tracking-tight">Analytics</h1>
        </div>
        <div className="flex gap-1 rounded-lg border bg-card p-1">
          {RANGES.map((r) => (
            <Link
              key={r.value}
              href={`/dashboard/${slug}/analytics?range=${r.value}`}
              className={cn(
                'rounded-md px-3 py-1.5 font-mono text-xs transition-colors',
                (range || '30') === r.value
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {r.label}
            </Link>
          ))}
        </div>
      </div>

      {/* Revenue Section */}
      <div>
        <span className="section-label mb-4 block">[ REVENUE ]</span>
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-3 mb-4">
          <KpiCard label="Total Revenue" value={`$${totalRevenue.toFixed(0)}`} icon={DollarSign} />
          <KpiCard label="Avg Booking Value" value={`$${avgBookingValue.toFixed(2)}`} icon={TrendingUp} />
          <KpiCard label="Membership Revenue" value={`$${membershipRevenue.toFixed(0)}/mo`} icon={Users} />
        </div>
        <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
          <RevenueChart data={revenueChartData} />
          <RevenueByCourtChart data={revenueByCourtData} />
        </div>
      </div>

      {/* Utilization Section */}
      <div>
        <span className="section-label mb-4 block">[ UTILIZATION ]</span>
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-3 mb-4">
          <KpiCard label="Fill Rate" value={`${overallFillRate}%`} icon={BarChart3} />
          <KpiCard label="Busiest Day" value={busiestDay} icon={CalendarDays} />
          <KpiCard label="Courts Tracked" value={(courts || []).length} icon={Clock} />
        </div>
        <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
          <UtilizationChart data={utilizationData} />
          <PeakHoursHeatmap data={heatmapData} maxCount={maxHeatmapCount} />
        </div>
      </div>
    </div>
  )
}
```

**Step 2: Verify build**

Run:
```bash
npx next build
```

Expected: Build succeeds.

**Step 3: Commit**

```bash
git add src/app/dashboard/[slug]/analytics/page.tsx
git commit -m "feat: add analytics page with revenue and utilization dashboards"
```

---

## Task 15: Mobile Marketing Nav

**Files:**
- Modify: `src/app/(marketing)/layout.tsx`

**Step 1: Add mobile hamburger menu to marketing layout**

Rewrite `src/app/(marketing)/layout.tsx` to add a Sheet-based mobile nav alongside the existing desktop nav. Add a client component `MobileMarketingNav` inline or extract it. The key addition: on mobile (`md:hidden`), show a hamburger button that opens a Sheet with nav links.

Since Sheet requires `'use client'`, create a small wrapper:

Create `src/components/marketing/mobile-nav.tsx`:

```tsx
'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Menu } from 'lucide-react'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'

export function MobileMarketingNav() {
  const [open, setOpen] = useState(false)

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden">
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-64 p-6">
        <nav className="flex flex-col gap-4 mt-8" onClick={() => setOpen(false)}>
          <Link href="#features" className="font-mono text-sm uppercase tracking-wider text-muted-foreground hover:text-foreground">
            Features
          </Link>
          <Link href="#how-it-works" className="font-mono text-sm uppercase tracking-wider text-muted-foreground hover:text-foreground">
            How it works
          </Link>
          <hr className="border-border" />
          <Link href="/login" className="font-mono text-sm uppercase tracking-wider text-muted-foreground hover:text-foreground">
            Sign in
          </Link>
          <Link href="/signup" className="cta-button rounded-none px-5 py-2.5 text-xs justify-center">
            Get started
          </Link>
        </nav>
      </SheetContent>
    </Sheet>
  )
}
```

Then update `src/app/(marketing)/layout.tsx` to import and add `<MobileMarketingNav />` next to the sign-in link area.

**Step 2: Commit**

```bash
git add src/components/marketing/mobile-nav.tsx src/app/\(marketing\)/layout.tsx
git commit -m "feat: add mobile hamburger nav for marketing pages"
```

---

## Task 16: Final Build Verification & Smoke Test

**Step 1: Run full build**

Run:
```bash
cd C:/Users/THEJORJ/Desktop/Saas/CourtFLOW
npx next build
```

Expected: All routes build successfully.

**Step 2: Start dev server and visually verify**

Run:
```bash
npx next dev -p 3001
```

Test pages:
- `http://localhost:3001` — Landing page (check mobile nav hamburger)
- `http://localhost:3001/login` — Login
- `http://localhost:3001/signup` — Signup
- Dashboard pages (requires auth):
  - Overview — bracket labels, styled stat cards, recent bookings table
  - Courts — refined cards
  - Bookings — styled table with status colors
  - Customers — customer list with tier badges
  - Customers/[id] — detail page with stats, history, notes
  - Analytics — charts, KPIs, time range toggle
  - Tiers — bracket labels
  - Settings — bracket labels
- Test mobile by resizing browser:
  - Sidebar collapses to hamburger
  - Tables switch to card layout
  - Marketing nav shows mobile menu

**Step 3: Commit everything and final commit**

```bash
git add -A
git commit -m "feat: complete phase 2 - dashboard refresh, analytics, CRM, mobile responsive"
```
