'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { ArrowRight, Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import type { SportType, VenueType } from '@/lib/types'

const sportOptions: { value: SportType | 'all'; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'basketball', label: 'Basketball' },
  { value: 'pickleball', label: 'Pickleball' },
  { value: 'volleyball', label: 'Volleyball' },
  { value: 'tennis', label: 'Tennis' },
  { value: 'badminton', label: 'Badminton' },
]

const sportEmoji: Record<SportType, string> = {
  basketball: '🏀',
  pickleball: '🏓',
  volleyball: '🏐',
  tennis: '🎾',
  badminton: '🏸',
  other: '🏟️',
}

export interface TenantCard {
  id: string
  name: string
  slug: string
  logo_url: string | null
  description: string | null
  courtCount: number
  sportTypes: SportType[]
  venueTypes: VenueType[]
}

export function ExploreList({ tenants }: { tenants: TenantCard[] }) {
  const [searchQuery, setSearchQuery] = useState('')
  const [sportFilter, setSportFilter] = useState<SportType | 'all'>('all')

  const filtered = useMemo(() => {
    return tenants.filter((t) => {
      if (sportFilter !== 'all' && !t.sportTypes.includes(sportFilter)) return false
      if (searchQuery) {
        const q = searchQuery.toLowerCase()
        if (
          !t.name.toLowerCase().includes(q) &&
          !(t.description?.toLowerCase().includes(q))
        )
          return false
      }
      return true
    })
  }, [tenants, searchQuery, sportFilter])

  return (
    <div>
      {/* Search + filters */}
      <div className="mb-8 space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search facilities..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 font-mono text-sm"
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {sportOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setSportFilter(opt.value)}
              className={`rounded-md border px-3 py-1.5 font-mono text-xs transition-colors ${
                sportFilter === opt.value
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-border bg-background text-muted-foreground hover:border-primary/30 hover:text-foreground'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Card grid */}
      {filtered.length === 0 ? (
        <p className="py-12 text-center font-mono text-sm text-muted-foreground">
          No facilities found.
        </p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((tenant) => (
            <TenantCardItem key={tenant.id} tenant={tenant} />
          ))}
        </div>
      )}
    </div>
  )
}

function TenantCardItem({ tenant }: { tenant: TenantCard }) {
  return (
    <Link
      href={`/${tenant.slug}`}
      className="group flex flex-col rounded-lg border border-border bg-card p-5 transition-colors hover:border-primary/30"
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          {tenant.logo_url ? (
            <Image
              src={tenant.logo_url}
              alt={tenant.name}
              width={40}
              height={40}
              className="rounded-md object-cover"
            />
          ) : (
            <div className="flex h-10 w-10 items-center justify-center rounded-md border border-border bg-muted font-mono text-sm font-semibold text-muted-foreground">
              {tenant.name.charAt(0).toUpperCase()}
            </div>
          )}
          <h3 className="text-base font-semibold tracking-tight">{tenant.name}</h3>
        </div>
        <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-colors group-hover:text-primary" />
      </div>

      {tenant.description && (
        <p className="mb-4 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
          {tenant.description}
        </p>
      )}

      {/* Sport badges */}
      {tenant.sportTypes.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-1.5">
          {tenant.sportTypes.map((sport) => (
            <span
              key={sport}
              className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-0.5 font-mono text-xs text-muted-foreground"
            >
              {sportEmoji[sport]} {sport.charAt(0).toUpperCase() + sport.slice(1)}
            </span>
          ))}
        </div>
      )}

      {/* Court count + venue pills */}
      <div className="mt-auto flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <span className="font-mono">
          {tenant.courtCount} {tenant.courtCount === 1 ? 'court' : 'courts'}
        </span>
        {tenant.venueTypes.map((v) => (
          <span
            key={v}
            className="rounded-md border border-border px-2 py-0.5 font-mono capitalize"
          >
            {v}
          </span>
        ))}
      </div>
    </Link>
  )
}

/** Reusable card grid for landing page preview (no filters) */
export function TenantCardGrid({ tenants }: { tenants: TenantCard[] }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {tenants.map((tenant) => (
        <TenantCardItem key={tenant.id} tenant={tenant} />
      ))}
    </div>
  )
}
