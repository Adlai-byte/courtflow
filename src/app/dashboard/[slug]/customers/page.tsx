import { requireTenantOwner } from '@/lib/tenant'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent } from '@/components/ui/card'
import Link from 'next/link'
import { Search } from 'lucide-react'

export default async function CustomersPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ q?: string }>
}) {
  const { slug } = await params
  const { q } = await searchParams
  const searchQuery = q?.trim() || ''
  const { tenant } = await requireTenantOwner(slug)

  const supabase = await createClient()

  const { data: bookingCustomers } = await supabase
    .from('bookings')
    .select('customer_id, profiles:customer_id ( id, full_name, phone, created_at )')
    .eq('tenant_id', tenant.id)

  const customerMap = new Map<string, {
    id: string
    full_name: string | null
    phone: string | null
    created_at: string
    total_bookings: number
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
      })
    }
  }

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

  let customers = Array.from(customerMap.values()).sort((a, b) => b.total_bookings - a.total_bookings)

  // Filter by search query
  if (searchQuery) {
    const lq = searchQuery.toLowerCase()
    customers = customers.filter(
      (c) =>
        (c.full_name ?? '').toLowerCase().includes(lq) ||
        (c.phone ?? '').toLowerCase().includes(lq)
    )
  }

  return (
    <div className="space-y-6">
      <span className="section-label block">[ CUSTOMERS ]</span>
      <h1 className="text-2xl font-bold tracking-tight">Customers</h1>

      {/* Search */}
      <form className="max-w-sm">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            name="q"
            type="text"
            placeholder="Search by name or phone..."
            defaultValue={searchQuery}
            className="h-9 w-full rounded-md border border-input bg-background pl-9 pr-3 font-mono text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
      </form>

      <Card>
        <CardContent className="p-0">
          {customers.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <p className="text-sm text-muted-foreground">
                {searchQuery ? 'No customers match your search.' : 'No customers yet. Customers appear once they make a booking.'}
              </p>
            </div>
          ) : (
            <>
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
