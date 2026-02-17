-- Recurring booking series
create table public.recurring_series (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  court_id uuid not null references public.courts(id) on delete cascade,
  customer_id uuid not null references auth.users(id) on delete cascade,
  day_of_week integer not null check (day_of_week >= 0 and day_of_week <= 6),
  start_time time not null,
  end_time time not null,
  total_weeks integer not null check (total_weeks >= 2 and total_weeks <= 52),
  created_at timestamptz default now() not null
);

alter table public.recurring_series enable row level security;

create policy "Customers can view own recurring series"
  on public.recurring_series for select
  using (customer_id = auth.uid());

create policy "Customers can create recurring series"
  on public.recurring_series for insert
  with check (customer_id = auth.uid());

create policy "Owners can view tenant recurring series"
  on public.recurring_series for select
  using (tenant_id in (select id from public.tenants where owner_id = auth.uid()));

-- Link bookings to recurring series
alter table public.bookings
  add column recurring_series_id uuid references public.recurring_series(id) on delete set null;

-- Link waitlist entries to recurring series
alter table public.waitlist_entries
  add column recurring_series_id uuid references public.recurring_series(id) on delete set null;

-- Membership requests (references existing membership_tiers)
create table public.membership_requests (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  tier_id uuid not null references public.membership_tiers(id) on delete cascade,
  customer_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  owner_notes text,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

alter table public.membership_requests enable row level security;

create policy "Customers can view own membership requests"
  on public.membership_requests for select
  using (customer_id = auth.uid());

create policy "Customers can create membership requests"
  on public.membership_requests for insert
  with check (customer_id = auth.uid());

create policy "Owners can manage tenant membership requests"
  on public.membership_requests for all
  using (tenant_id in (select id from public.tenants where owner_id = auth.uid()))
  with check (tenant_id in (select id from public.tenants where owner_id = auth.uid()));

-- Prevent duplicate pending requests for same tier
create unique index idx_membership_requests_pending
  on public.membership_requests (customer_id, tier_id)
  where status = 'pending';

-- Link subscriptions to the request that created them
alter table public.member_subscriptions
  add column request_id uuid references public.membership_requests(id) on delete set null;
