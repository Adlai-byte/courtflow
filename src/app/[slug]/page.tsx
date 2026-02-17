import { getTenantBySlug } from '@/lib/tenant'
import { createClient } from '@/lib/supabase/server'
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
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{tenant.name}</h1>
        {tenant.description && (
          <p className="mt-2 text-muted-foreground">{tenant.description}</p>
        )}
      </div>

      <div>
        <span className="section-label block">[ AVAILABLE COURTS ]</span>
        {(!courts || courts.length === 0) ? (
          <p className="mt-4 text-sm text-muted-foreground">No courts available at this time.</p>
        ) : (
          <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {(courts as Court[]).map((court) => (
              <Link key={court.id} href={`/${slug}/courts/${court.id}`}>
                <div className="rounded-lg border border-border bg-card p-4 transition-colors hover:border-primary/30">
                  <h3 className="font-semibold tracking-tight">{court.name}</h3>
                  <div className="mt-2 flex items-center gap-2">
                    <span className="inline-flex rounded border border-border px-2 py-0.5 font-mono text-xs text-muted-foreground">
                      {court.sport_type}
                    </span>
                    <span className="inline-flex rounded border border-border px-2 py-0.5 font-mono text-xs text-muted-foreground">
                      {court.booking_mode === 'fixed_slot'
                        ? `${court.slot_duration_minutes}min slots`
                        : `${court.min_duration_minutes}-${court.max_duration_minutes}min`}
                    </span>
                  </div>
                  {court.description && (
                    <p className="mt-2 text-sm text-muted-foreground line-clamp-2">
                      {court.description}
                    </p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
