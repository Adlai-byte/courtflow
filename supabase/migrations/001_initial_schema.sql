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

create policy "Tenants are publicly viewable"
  on public.tenants for select
  using (true);

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

create policy "Active courts are publicly viewable"
  on public.courts for select
  using (is_active = true);

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

create policy "Owners can view all their courts"
  on public.courts for select
  using (
    tenant_id in (select id from public.tenants where owner_id = auth.uid())
  );

-- ============================================
-- MEMBERSHIP TIERS (must be before member_subscriptions)
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

create policy "Active tiers are publicly viewable"
  on public.membership_tiers for select
  using (is_active = true);

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

create policy "Customers can view their subscriptions"
  on public.member_subscriptions for select
  using (auth.uid() = customer_id);

create policy "Owners can manage subscriptions"
  on public.member_subscriptions for all
  using (
    tenant_id in (select id from public.tenants where owner_id = auth.uid())
  );

-- ============================================
-- BOOKINGS (after member_subscriptions so FK works)
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
  created_at timestamptz default now() not null
);

alter table public.bookings enable row level security;

create policy "Customers can view their bookings"
  on public.bookings for select
  using (auth.uid() = customer_id);

create policy "Owners can view tenant bookings"
  on public.bookings for select
  using (
    tenant_id in (select id from public.tenants where owner_id = auth.uid())
  );

create policy "Authenticated users can view court availability"
  on public.bookings for select
  using (auth.uid() is not null);

create policy "Authenticated users can book"
  on public.bookings for insert
  with check (auth.uid() = customer_id);

create policy "Customers can cancel their bookings"
  on public.bookings for update
  using (auth.uid() = customer_id);

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

create policy "Customers can view their waitlist entries"
  on public.waitlist_entries for select
  using (auth.uid() = customer_id);

create policy "Owners can view tenant waitlist"
  on public.waitlist_entries for select
  using (
    tenant_id in (select id from public.tenants where owner_id = auth.uid())
  );

create policy "Authenticated users can join waitlist"
  on public.waitlist_entries for insert
  with check (auth.uid() = customer_id);

create policy "Customers can update their waitlist entries"
  on public.waitlist_entries for update
  using (auth.uid() = customer_id);

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
