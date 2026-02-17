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
  cancellation_hours: number
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

export interface CourtClosure {
  id: string
  court_id: string
  date: string
  reason: string | null
  created_at: string
}

export interface CustomerNote {
  id: string
  tenant_id: string
  profile_id: string
  note: string
  created_at: string
  created_by: string
}
